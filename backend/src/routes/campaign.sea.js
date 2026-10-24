// Viagens pelo mar: barcos da campanha (convés e porão sao cenas), embarcar/desembarcar,
// viagem do porto de origem ao de destino passando por uma cena de mar.
// Registradas por campaign.v2.js (recebe os ajudantes de la: tokens, cenas, pedidos ao mestre).
import { z } from 'zod';
import { pool, query } from '../db/pool.js';
import { assertCampaignMaster, requireCampaignMember } from '../utils/campaignAccess.js';
import { emitEvent } from '../utils/events.js';
import { httpError, parseJson } from '../utils/http.js';
import { assertRight } from '../utils/tableRules.js';
import { AskMaster } from '../utils/actionRequests.js';
import {
  BOAT_TYPE_IDS, boatType, deckMap, defaultRoute, dockCell, holdMap, landingCells, nearestPort, vesselSpawns, voyageProgress
} from '../utils/boats.js';

const BOARD_REACH = 3.5; // celulas do centro do barco ate o token
const ACTIVE = ['sailing', 'paused'];
const uuid = z.string().uuid();
const point = z.object({ x: z.number().min(0).max(999), y: z.number().min(0).max(999) });

const boatCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  type: z.enum(BOAT_TYPE_IDS),
  sceneId: uuid,
  portId: z.string().max(40).optional(),
  x: z.number().min(0).max(999).optional(),
  y: z.number().min(0).max(999).optional(),
  ownerCharacterId: uuid.nullable().optional()
});
const boatPatchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  sceneId: uuid.optional(),
  portId: z.string().max(40).optional(),
  x: z.number().min(0).max(999).optional(),
  y: z.number().min(0).max(999).optional(),
  ownerCharacterId: uuid.nullable().optional()
});
const tokensSchema = z.object({ tokenIds: z.array(uuid).max(60).optional(), tokenId: uuid.optional() });
const voyageSchema = z.object({
  seaSceneId: uuid,
  toSceneId: uuid,
  toPortId: z.string().max(40).optional(),
  route: z.array(point).min(2).max(64).optional(),
  speed: z.number().min(0.05).max(20).optional(),
  paused: z.boolean().optional()
});
const voyagePatchSchema = z.object({ status: z.enum(['sailing', 'paused']).optional(), speed: z.number().min(0.05).max(20).optional() });
const arriveSchema = z.object({ land: z.boolean().optional().default(true), activate: z.boolean().optional().default(true) });

export function boatView(b) {
  return {
    id: b.id, campaign_id: b.campaign_id, name: b.name, type: b.type, owner_character_id: b.owner_character_id,
    home_scene_id: b.home_scene_id, x: Number(b.x), y: Number(b.y), deck_scene_id: b.deck_scene_id, hold_scene_id: b.hold_scene_id,
    rented_until: b.rented_until, created_at: b.created_at
  };
}
export function voyageView(v, now = Date.now()) {
  return {
    id: v.id, boat_id: v.boat_id, sea_scene_id: v.sea_scene_id, from_scene_id: v.from_scene_id, from_port: v.from_port,
    to_scene_id: v.to_scene_id, to_port: v.to_port, route: parseJson(v.route, []), status: v.status,
    progress: voyageProgress({ ...v, route: parseJson(v.route, []) }, now), speed: Number(v.speed),
    progress_at: new Date(now).toISOString(), created_at: v.created_at, ended_at: v.ended_at
  };
}

export function registerCampaignSeaRoutes(router, h) {
  const { loadScene, loadToken, tokenView, moveTokenToScene, emitSceneUpdated, asking, ownsToken, loadRules, TOKEN_SELECT } = h;

  async function loadBoat(campaignId, boatId) {
    if (!uuid.safeParse(boatId).success) throw httpError('Barco não encontrado.', 404);
    const boat = (await query('select * from campaign_boats where id = $1 and campaign_id = $2', [boatId, campaignId])).rows[0];
    if (!boat) throw httpError('Barco não encontrado.', 404);
    return boat;
  }
  const activeVoyage = async (boatId) => (await query(`select * from campaign_voyages where boat_id = $1 and status = any($2) order by created_at desc limit 1`, [boatId, ACTIVE])).rows[0] || null;
  const tilesScene = async (campaignId, sceneId, what) => {
    const scene = (await query('select * from campaign_scenes where id = $1 and campaign_id = $2', [sceneId, campaignId])).rows[0];
    if (!scene) throw httpError(`${what} não encontrado.`, 404);
    const tiles = parseJson(scene.tiles, null);
    if (scene.map_kind !== 'tiles' || !tiles?.layers) throw httpError(`${what} precisa ser um mapa em pixel art.`, 409);
    return { scene, tiles };
  };
  const changed = (campaignId, boatId, userId, extra = {}) => emitEvent(campaignId, 'voyage:updated', { boatId, ...extra }, 'all', userId);

  // Convés (e porão nos barcos maiores) como cenas: criados na hora se o barco veio da loja sem eles.
  async function ensureVessel(campaignId, boat, userId) {
    const t = boatType(boat.type);
    const home = boat.home_scene_id ? (await query('select * from campaign_scenes where id = $1', [boat.home_scene_id])).rows[0] : null;
    const grid = home?.grid_size || 70;
    const mode = home?.mode === 'combat' ? 'exploration' : home?.mode || 'exploration';
    const count = async () => (await query('select count(*)::int as total from campaign_scenes where campaign_id = $1', [campaignId])).rows[0].total;
    const insert = async (name, map, parent) => (await query(
      `insert into campaign_scenes (campaign_id, name, map_kind, tiles, grid_size, width, height, position, mode, move_speed, parent_scene_id, is_active)
       values ($1,$2,'tiles',$3,$4,$5,$6,$7,$8,$9,$10,false) returning *`,
      [campaignId, name, JSON.stringify(map), grid, map.cols * grid, map.rows * grid, await count(), mode, home?.move_speed || 6, parent]
    )).rows[0];
    let next = boat;
    const deckExists = boat.deck_scene_id && (await query('select 1 from campaign_scenes where id = $1', [boat.deck_scene_id])).rowCount;
    if (!deckExists) {
      const deck = await insert(`${boat.name} (convés)`, deckMap(t.id), boat.home_scene_id || null);
      next = (await query('update campaign_boats set deck_scene_id = $1 where id = $2 returning *', [deck.id, boat.id])).rows[0];
      await emitSceneUpdated(campaignId, deck, {}, userId);
    }
    const holdExists = next.hold_scene_id && (await query('select 1 from campaign_scenes where id = $1', [next.hold_scene_id])).rowCount;
    if (t.hold && !holdExists) {
      const hold = await insert(`${boat.name} (${t.id === 'veleiro' ? 'cabine' : 'porão'})`, holdMap(t.id), next.deck_scene_id);
      next = (await query('update campaign_boats set hold_scene_id = $1 where id = $2 returning *', [hold.id, boat.id])).rows[0];
      await emitSceneUpdated(campaignId, hold, {}, userId);
    }
    return next;
  }

  // O convés anda junto com o barco: e "interior" da cena onde o barco esta (porto ou mar).
  async function placeBoat(campaignId, boat, sceneId, cell, userId) {
    const next = (await query('update campaign_boats set home_scene_id = $1, x = $2, y = $3 where id = $4 returning *', [sceneId, cell.x, cell.y, boat.id])).rows[0];
    if (next.deck_scene_id) {
      const deck = (await query('update campaign_scenes set parent_scene_id = $1, updated_at = now() where id = $2 returning *', [sceneId, next.deck_scene_id])).rows[0];
      if (deck) await emitSceneUpdated(campaignId, deck, {}, userId);
    }
    return next;
  }

  async function boatTokens(boat) {
    const ids = [boat.deck_scene_id, boat.hold_scene_id].filter(Boolean);
    if (!ids.length) return [];
    return (await query(`${TOKEN_SELECT} where t.scene_id = any($1) order by t.created_at`, [ids])).rows;
  }

  async function sceneTiles(sceneId) {
    const scene = (await query('select * from campaign_scenes where id = $1', [sceneId])).rows[0];
    return { scene, tiles: parseJson(scene?.tiles, null) };
  }

  // Leva tokens para o convés (celulas livres do meio para fora, sem repetir).
  async function toDeck(campaignId, boat, tokens, userId) {
    const { scene: deck, tiles } = await sceneTiles(boat.deck_scene_id);
    const taken = new Set((await query('select x, y from campaign_tokens where scene_id = $1', [deck.id])).rows.map((r) => `${Math.round(r.x / deck.grid_size)},${Math.round(r.y / deck.grid_size)}`));
    const spots = vesselSpawns(tiles).filter((c) => !taken.has(`${c.x},${c.y}`));
    const moved = [];
    for (const [i, token] of tokens.entries()) {
      if (token.scene_id === deck.id) continue;
      moved.push(await moveTokenToScene(campaignId, token, deck, spots[i % Math.max(1, spots.length)] || { x: 1, y: 1 }, userId));
    }
    return moved;
  }

  // Desce em terra perto do porto (ou do barco) na cena onde o barco esta.
  async function toLand(campaignId, scene, tiles, near, tokens, userId, boat = null) {
    const cells = landingCells(tiles, { x: Math.round(near.x), y: Math.round(near.y) }, tokens.length, boat && { x: Number(boat.x), y: Number(boat.y), type: boat.type });
    const moved = [];
    for (const [i, token] of tokens.entries()) moved.push(await moveTokenToScene(campaignId, token, scene, cells[i], userId));
    return moved;
  }

  const portOf = (tiles, id) => (tiles?.ports || []).find((p) => p.id === id) || null;

  // ===== barcos =====
  router.get('/:id/boats', async (req, res) => {
    await requireCampaignMember(req.params.id, req.user);
    const boats = (await query('select * from campaign_boats where campaign_id = $1 order by created_at', [req.params.id])).rows;
    const voyages = (await query(`select * from campaign_voyages where campaign_id = $1 and status = any($2) order by created_at`, [req.params.id, ACTIVE])).rows;
    const now = Date.now();
    // nomes para a faixa "de X para Y" (o jogador pode nao enxergar as cenas de origem/destino)
    const ids = [...new Set(voyages.flatMap((v) => [v.from_scene_id, v.to_scene_id, v.sea_scene_id]).filter(Boolean))];
    const scenes = ids.length ? (await query('select id, name, tiles from campaign_scenes where id = any($1)', [ids])).rows : [];
    const label = (sceneId, portId) => {
      const scene = scenes.find((s) => s.id === sceneId);
      if (!scene) return null;
      const port = (parseJson(scene.tiles, null)?.ports || []).find((p) => p.id === portId);
      return port ? `${port.name} (${scene.name})` : scene.name;
    };
    res.json({
      now: new Date(now).toISOString(),
      boats: boats.map(boatView),
      voyages: voyages.map((v) => ({ ...voyageView(v, now), from_name: label(v.from_scene_id, v.from_port), to_name: label(v.to_scene_id, v.to_port), sea_name: label(v.sea_scene_id) }))
    });
  });

  router.post('/:id/boats', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const body = boatCreateSchema.parse(req.body || {});
    const { tiles } = await tilesScene(req.params.id, body.sceneId, 'Mapa do porto');
    let cell;
    if (body.portId) {
      const port = portOf(tiles, body.portId);
      if (!port) throw httpError('Porto não encontrado neste mapa.', 404);
      cell = dockCell(tiles, port);
    } else if (body.x != null && body.y != null) {
      if (body.x >= tiles.cols || body.y >= tiles.rows) throw httpError('O barco ficaria fora do mapa.');
      cell = { x: body.x, y: body.y };
    } else {
      const port = (tiles.ports || [])[0];
      if (!port) throw httpError('Marque um porto no mapa ou escolha onde o barco fica.', 409);
      cell = dockCell(tiles, port);
    }
    let boat = (await query(
      `insert into campaign_boats (campaign_id, name, type, owner_character_id, home_scene_id, x, y) values ($1,$2,$3,$4,$5,$6,$7) returning *`,
      [req.params.id, body.name, body.type, body.ownerCharacterId || null, body.sceneId, cell.x, cell.y]
    )).rows[0];
    boat = await ensureVessel(req.params.id, boat, req.user.id);
    await changed(req.params.id, boat.id, req.user.id);
    res.status(201).json(boatView(boat));
  });

  router.patch('/:id/boats/:boatId', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    let boat = await loadBoat(req.params.id, req.params.boatId);
    const body = boatPatchSchema.parse(req.body || {});
    if (body.name) boat = (await query('update campaign_boats set name = $1 where id = $2 returning *', [body.name, boat.id])).rows[0];
    if (body.ownerCharacterId !== undefined) boat = (await query('update campaign_boats set owner_character_id = $1 where id = $2 returning *', [body.ownerCharacterId, boat.id])).rows[0];
    if (body.sceneId || body.portId || body.x != null) {
      if (await activeVoyage(boat.id)) throw httpError('O barco está no mar: chegue ao destino ou volte ao porto antes.', 409);
      const sceneId = body.sceneId || boat.home_scene_id;
      if (!sceneId) throw httpError('Escolha o mapa do porto.');
      const { tiles } = await tilesScene(req.params.id, sceneId, 'Mapa do porto');
      let cell = { x: body.x ?? Number(boat.x), y: body.y ?? Number(boat.y) };
      if (body.portId) {
        const port = portOf(tiles, body.portId);
        if (!port) throw httpError('Porto não encontrado neste mapa.', 404);
        cell = dockCell(tiles, port);
      }
      if (cell.x >= tiles.cols || cell.y >= tiles.rows) throw httpError('O barco ficaria fora do mapa.');
      boat = await placeBoat(req.params.id, boat, sceneId, cell, req.user.id);
    }
    await changed(req.params.id, boat.id, req.user.id);
    res.json(boatView(boat));
  });

  router.delete('/:id/boats/:boatId', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const boat = await loadBoat(req.params.id, req.params.boatId);
    if (await activeVoyage(boat.id)) throw httpError('O barco está no mar: chegue ao destino ou volte ao porto antes.', 409);
    if ((await boatTokens(boat)).some((t) => t.kind === 'character')) throw httpError('Ainda tem gente a bordo: desembarque todos antes.', 409);
    await query('delete from campaign_boats where id = $1', [boat.id]);
    for (const sceneId of [boat.hold_scene_id, boat.deck_scene_id].filter(Boolean)) {
      const gone = (await query('delete from campaign_scenes where id = $1 and campaign_id = $2 returning id', [sceneId, req.params.id])).rows[0];
      if (gone) await emitEvent(req.params.id, 'scene:deleted', { sceneId: gone.id }, 'all', req.user.id);
    }
    await changed(req.params.id, boat.id, req.user.id, { removed: true });
    res.status(204).end();
  });

  // ===== embarcar e desembarcar =====
  // Mestre: os tokens escolhidos (ou todos os personagens no mapa do porto) vao para o convés.
  router.post('/:id/boats/:boatId/embark', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    let boat = await loadBoat(req.params.id, req.params.boatId);
    boat = await ensureVessel(req.params.id, boat, req.user.id);
    const body = tokensSchema.parse(req.body || {});
    const ids = body.tokenIds || (body.tokenId ? [body.tokenId] : null);
    let tokens;
    if (ids) tokens = await Promise.all(ids.map((tid) => loadToken(req.params.id, tid)));
    else {
      if (!boat.home_scene_id) throw httpError('O barco não está em nenhum mapa.', 409);
      tokens = (await query(`${TOKEN_SELECT} where t.scene_id = $1 and t.kind = 'character' order by t.created_at`, [boat.home_scene_id])).rows;
    }
    if (!tokens.length) throw httpError('Ninguém para embarcar: coloque os personagens no mapa do porto.', 409);
    const moved = await toDeck(req.params.id, boat, tokens, req.user.id);
    await changed(req.params.id, boat.id, req.user.id);
    res.json({ sceneId: boat.deck_scene_id, tokens: moved.map((t) => tokenView(t, { master: true })) });
  });

  // Jogador sobe no barco atracado perto dele (regra de portas: livre, pedir ou travado).
  router.post('/:id/boats/:boatId/board', async (req, res) => {
    const { master } = await requireCampaignMember(req.params.id, req.user);
    const body = tokensSchema.parse(req.body || {});
    await asking(res, req.params.id, req.user.id, () => doBoard(req, master, { boatId: req.params.boatId, tokenId: body.tokenId }), (out) => res.json(out));
  });

  async function myToken(req, sceneIds, tokenId, master) {
    if (tokenId) {
      const token = await loadToken(req.params.id, tokenId);
      if (!sceneIds.includes(token.scene_id)) throw httpError('Esse token não está aqui.', 409);
      if (!master && !ownsToken(token, req.user.id)) throw httpError('Token não encontrado.', 404);
      return token;
    }
    const mine = (await query(`${TOKEN_SELECT} where t.scene_id = any($1) and t.kind = 'character' and (ch.owner_id = $2 or t.controlled_by = $2) order by t.updated_at desc`, [sceneIds, req.user.id])).rows;
    if (!mine.length) throw httpError('Seu personagem não está aqui.', 409);
    return mine[0];
  }

  async function doBoard(req, master, payload, approved = false) {
    let boat = await loadBoat(req.params.id, payload.boatId);
    if (!boat.home_scene_id) throw httpError('O barco não está em nenhum mapa.', 409);
    const token = await myToken(req, [boat.home_scene_id], payload.tokenId, master);
    if (!master) {
      if (await activeVoyage(boat.id)) throw httpError('O barco já saiu para o mar.', 409);
      const scene = await loadScene(req.params.id, boat.home_scene_id, false);
      if (scene.mode === 'prep') throw httpError('A mesa está em preparação.', 409);
      const mode = assertRight(await loadRules(req.params.id), req.user.id, 'doors', { turnTokenIds: [token.id], inCombat: scene.mode === 'combat' });
      const grid = scene.grid_size || 70;
      const at = { x: (Number(token.x) + grid / 2) / grid, y: (Number(token.y) + grid / 2) / grid };
      if (Math.hypot(at.x - (Number(boat.x) + 0.5), at.y - (Number(boat.y) + 0.5)) > BOARD_REACH) throw httpError('Chegue mais perto do barco.', 409);
      if (mode === 'pedir' && !approved) {
        throw new AskMaster({ kind: 'enter', sceneId: scene.id, tokenId: token.id, characterId: token.character_id || null, payload: { boatId: boat.id, tokenId: token.id }, summary: `${token.name} quer subir no barco ${boat.name}` });
      }
    }
    boat = await ensureVessel(req.params.id, boat, req.user.id);
    const [moved] = await toDeck(req.params.id, boat, [token], req.user.id);
    await changed(req.params.id, boat.id, req.user.id);
    return { sceneId: boat.deck_scene_id, token: moved ? tokenView(moved, { master, userId: req.user.id }) : null };
  }

  // Mestre: desembarca (todos ou os escolhidos) no porto onde o barco esta atracado.
  router.post('/:id/boats/:boatId/disembark', async (req, res) => {
    const { master } = await requireCampaignMember(req.params.id, req.user);
    const body = tokensSchema.parse(req.body || {});
    if (!master) {
      await asking(res, req.params.id, req.user.id, () => doLeave(req, false, { boatId: req.params.boatId, tokenId: body.tokenId }), (out) => res.json(out));
      return;
    }
    const boat = await loadBoat(req.params.id, req.params.boatId);
    if (await activeVoyage(boat.id)) throw httpError('O barco está no mar: chegue ao destino ou volte ao porto antes.', 409);
    if (!boat.home_scene_id) throw httpError('O barco não está em nenhum mapa.', 409);
    const aboard = await boatTokens(boat);
    const ids = body.tokenIds || (body.tokenId ? [body.tokenId] : null);
    const tokens = ids ? aboard.filter((t) => ids.includes(t.id)) : aboard;
    if (!tokens.length) throw httpError('Ninguém a bordo para descer.', 409);
    const { scene, tiles } = await sceneTiles(boat.home_scene_id);
    const port = nearestPort(tiles, { x: Number(boat.x), y: Number(boat.y) });
    const moved = await toLand(req.params.id, scene, tiles, port && port.d < 8 ? port : { x: Number(boat.x), y: Number(boat.y) }, tokens, req.user.id, boat);
    await changed(req.params.id, boat.id, req.user.id);
    res.json({ sceneId: scene.id, tokens: moved.map((t) => tokenView(t, { master: true })) });
  });

  async function doLeave(req, master, payload, approved = false) {
    const boat = await loadBoat(req.params.id, payload.boatId);
    const token = await myToken(req, [boat.deck_scene_id, boat.hold_scene_id].filter(Boolean), payload.tokenId, master);
    if (await activeVoyage(boat.id)) throw httpError('O barco está no mar.', 409);
    if (!boat.home_scene_id) throw httpError('O barco não está em nenhum mapa.', 409);
    const { scene, tiles } = await sceneTiles(boat.home_scene_id);
    if (!master) {
      const deck = (await query('select * from campaign_scenes where id = $1', [token.scene_id])).rows[0];
      if (deck?.mode === 'prep') throw httpError('A mesa está em preparação.', 409);
      const mode = assertRight(await loadRules(req.params.id), req.user.id, 'doors', { turnTokenIds: [token.id], inCombat: deck?.mode === 'combat' });
      if (mode === 'pedir' && !approved) {
        throw new AskMaster({ kind: 'exit', sceneId: token.scene_id, tokenId: token.id, characterId: token.character_id || null, payload: { boatId: boat.id, tokenId: token.id }, summary: `${token.name} quer descer do barco ${boat.name}` });
      }
    }
    const port = nearestPort(tiles, { x: Number(boat.x), y: Number(boat.y) });
    const [moved] = await toLand(req.params.id, scene, tiles, port && port.d < 8 ? port : { x: Number(boat.x), y: Number(boat.y) }, [token], req.user.id, boat);
    await changed(req.params.id, boat.id, req.user.id);
    return { sceneId: scene.id, token: tokenView(moved, { master, userId: req.user.id }) };
  }

  // Descer ao porão / subir ao convés (o proprio personagem; o mestre escolhe o token).
  for (const [path, down] of [['below', true], ['above', false]]) {
    router.post(`/:id/boats/:boatId/${path}`, async (req, res) => {
      const { master } = await requireCampaignMember(req.params.id, req.user);
      const boat = await loadBoat(req.params.id, req.params.boatId);
      if (!boat.hold_scene_id) throw httpError('Este barco não tem porão.', 409);
      const body = tokensSchema.parse(req.body || {});
      const from = down ? boat.deck_scene_id : boat.hold_scene_id;
      const token = await myToken(req, [from], body.tokenId, master);
      const { scene: target, tiles } = await sceneTiles(down ? boat.hold_scene_id : boat.deck_scene_id);
      if (!master) assertRight(await loadRules(req.params.id), req.user.id, 'move', { turnTokenIds: [token.id] });
      const near = down ? tiles.vessel?.ladder : tiles.vessel?.hatch;
      const cell = vesselSpawns(tiles, near ? { x: near.x, y: near.y + 1 } : null)[0] || { x: 1, y: 1 };
      const moved = await moveTokenToScene(req.params.id, token, target, cell, req.user.id);
      res.json({ sceneId: target.id, token: tokenView(moved, { master, userId: req.user.id }) });
    });
  }

  // ===== viagem =====
  router.post('/:id/boats/:boatId/voyage', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    let boat = await loadBoat(req.params.id, req.params.boatId);
    const body = voyageSchema.parse(req.body || {});
    if (await activeVoyage(boat.id)) throw httpError('Este barco já está numa viagem.', 409);
    const { tiles: sea } = await tilesScene(req.params.id, body.seaSceneId, 'Mar');
    const { tiles: dest } = await tilesScene(req.params.id, body.toSceneId, 'Destino');
    if (body.toSceneId === body.seaSceneId) throw httpError('O destino precisa ser outro mapa.');
    if (body.toPortId && !portOf(dest, body.toPortId)) throw httpError('Porto de destino não encontrado.', 404);
    const route = (body.route || defaultRoute(sea)).map((p) => ({ x: Math.min(sea.cols - 1, p.x), y: Math.min(sea.rows - 1, p.y) }));
    boat = await ensureVessel(req.params.id, boat, req.user.id);
    const fromTiles = boat.home_scene_id ? (await sceneTiles(boat.home_scene_id)).tiles : null;
    const fromPort = fromTiles ? nearestPort(fromTiles, { x: Number(boat.x), y: Number(boat.y) }) : null;
    const toPort = body.toPortId || (dest.ports || [])[0]?.id || null;
    const speed = body.speed ?? boatType(boat.type).speed;
    const voyage = (await query(
      `insert into campaign_voyages (campaign_id, boat_id, sea_scene_id, from_scene_id, from_port, from_x, from_y, to_scene_id, to_port, route, status, speed)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
      [req.params.id, boat.id, body.seaSceneId, boat.home_scene_id, fromPort?.id || null, boat.x, boat.y, body.toSceneId, toPort, JSON.stringify(route), body.paused ? 'paused' : 'sailing', speed]
    )).rows[0];
    boat = await placeBoat(req.params.id, boat, body.seaSceneId, route[0], req.user.id);
    await changed(req.params.id, boat.id, req.user.id, { voyageId: voyage.id });
    res.status(201).json({ boat: boatView(boat), voyage: voyageView(voyage) });
  });

  async function loadVoyage(campaignId, voyageId) {
    if (!uuid.safeParse(voyageId).success) throw httpError('Viagem não encontrada.', 404);
    const v = (await query('select * from campaign_voyages where id = $1 and campaign_id = $2', [voyageId, campaignId])).rows[0];
    if (!v) throw httpError('Viagem não encontrada.', 404);
    if (!ACTIVE.includes(v.status)) throw httpError('Esta viagem já acabou.', 409);
    return v;
  }

  router.patch('/:id/voyages/:voyageId', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const v = await loadVoyage(req.params.id, req.params.voyageId);
    const body = voyagePatchSchema.parse(req.body || {});
    // fecha o progresso ate agora e recomeca a conta com o novo estado
    const now = Date.now();
    const progress = voyageProgress({ ...v, route: parseJson(v.route, []) }, now);
    const next = (await query(
      `update campaign_voyages set status = $1, speed = $2, progress = $3, progress_at = $4, updated_at = now() where id = $5 returning *`,
      [body.status || v.status, body.speed ?? v.speed, progress, new Date(now), v.id]
    )).rows[0];
    await changed(req.params.id, v.boat_id, req.user.id, { voyageId: v.id });
    res.json(voyageView(next, now));
  });

  // Chegar: barco atraca no porto de destino; quem esta a bordo desce perto do porto.
  router.post('/:id/voyages/:voyageId/arrive', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const v = await loadVoyage(req.params.id, req.params.voyageId);
    const body = arriveSchema.parse(req.body || {});
    if (!v.to_scene_id) throw httpError('O mapa de destino foi apagado.', 409);
    const { scene: dest, tiles } = await sceneTiles(v.to_scene_id);
    if (!tiles?.layers) throw httpError('O mapa de destino não tem pixel art.', 409);
    const port = portOf(tiles, v.to_port) || (tiles.ports || [])[0] || { x: Math.floor(tiles.cols / 2), y: Math.floor(tiles.rows / 2) };
    let boat = await loadBoat(req.params.id, v.boat_id);
    // destino no ar antes de mover (o jogador precisa enxergar a cena para onde a tela vai)
    if (body.activate && !dest.is_active) await activate(req.params.id, dest.id, req.user.id);
    boat = await placeBoat(req.params.id, boat, dest.id, dockCell(tiles, port), req.user.id);
    await query(`update campaign_voyages set status = 'arrived', progress = 1, progress_at = now(), ended_at = now(), updated_at = now() where id = $1`, [v.id]);
    let landed = [];
    if (body.land) {
      const aboard = await boatTokens(boat);
      if (aboard.length) landed = await toLand(req.params.id, dest, tiles, port, aboard, req.user.id, boat);
    }
    await changed(req.params.id, boat.id, req.user.id, { voyageId: v.id, arrived: true });
    res.json({ sceneId: dest.id, boat: boatView(boat), landed: landed.length });
  });

  // Voltar ao porto de origem (desiste da viagem): a gente continua a bordo.
  router.post('/:id/voyages/:voyageId/return', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const v = await loadVoyage(req.params.id, req.params.voyageId);
    let boat = await loadBoat(req.params.id, v.boat_id);
    const from = v.from_scene_id ? (await sceneTiles(v.from_scene_id)) : null;
    if (from?.scene) boat = await placeBoat(req.params.id, boat, from.scene.id, { x: Number(v.from_x ?? 0), y: Number(v.from_y ?? 0) }, req.user.id);
    await query(`update campaign_voyages set status = 'returned', ended_at = now(), updated_at = now() where id = $1`, [v.id]);
    await changed(req.params.id, boat.id, req.user.id, { voyageId: v.id });
    res.json({ boat: boatView(boat) });
  });

  async function activate(campaignId, sceneId, userId) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query('update campaign_scenes set is_active = false, updated_at = now() where campaign_id = $1 and is_active', [campaignId]);
      await client.query('update campaign_scenes set is_active = true, updated_at = now() where id = $1 and campaign_id = $2', [sceneId, campaignId]);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
    await emitEvent(campaignId, 'scene:activated', { sceneId }, 'all', userId);
  }

  return { doBoard, doLeave };
}
