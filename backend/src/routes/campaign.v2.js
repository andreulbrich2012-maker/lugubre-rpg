// Rotas v2 da sala de campanha: feed de eventos, notas, ficha para o mestre,
// mesa virtual (cenas, NPCs, tokens, itens pegaveis), rolagens, acertos e ping.
// Registradas no mesmo router de campaign.routes.js (uma autenticacao por requisicao).
import crypto from 'crypto';
import { z } from 'zod';
import { pool, query } from '../db/pool.js';
import { assertCampaignMaster, requireCampaignMember } from '../utils/campaignAccess.js';
import { emitEvent, emitSplit, latestEventId, listEvents } from '../utils/events.js';
import { boolish, httpError, parseJson, requireDatabase } from '../utils/http.js';
import { dracmasToCoins, validateTiles } from '../utils/tiles.js';
import { parseDiceFormula, rollDiceFormula, SKILL_DEFINITIONS } from '../utils/rules.js';
import { enrich } from './character.routes.js';

const MAX_MAP_URL = 3_500_000;
const mapUrlSchema = z.string().max(MAX_MAP_URL, 'Mapa muito grande (máximo ~3,5 MB).').refine(
  (value) => /^https:\/\/\S+$/i.test(value) || /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value),
  'O mapa deve ser uma URL https ou uma imagem webp/png/jpeg em base64.'
);
const imageUrlSchema = z.string().max(MAX_MAP_URL).refine(
  (value) => value === '' || value.startsWith('/') || /^https:\/\/\S+$/i.test(value) || /^data:image\/(webp|png|jpeg|gif|svg\+xml);base64,/.test(value),
  'Imagem inválida.'
);
const int = (min, max) => z.coerce.number().int().min(min).max(max);
const rectSchema = z.object({ x: z.number(), y: z.number(), w: z.number().min(0), h: z.number().min(0) });
const conditionsSchema = z.array(z.string().trim().min(1).max(40)).max(20);
const attackSchema = z.object({
  name: z.string().trim().min(1).max(80),
  damage_formula: z.string().trim().max(40).refine((value) => { try { parseDiceFormula(value); return true; } catch { return false; } }, 'Fórmula de dano inválida (ex.: 1d8+2).'),
  description: z.string().max(1000).optional().default('')
});

const sceneFields = {
  name: z.string().trim().min(1).max(120),
  map_url: mapUrlSchema.nullable(),
  map_kind: z.enum(['image', 'tiles']),
  tiles: z.any().nullable(),
  grid_size: int(10, 400),
  grid_offset_x: int(-2000, 2000),
  grid_offset_y: int(-2000, 2000),
  width: int(100, 20000),
  height: int(100, 20000),
  show_grid: boolish,
  fog_enabled: boolish,
  fog_reveals: z.array(rectSchema).max(1000),
  move_speed: z.coerce.number().min(0.5).max(30),
  move_mode: z.enum(['free', 'grid']),
  mode: z.enum(['prep', 'exploration']), // combate so por /combat/start
  movement_per_turn: int(1, 100),
  position: int(0, 10000)
};
const sceneCreateSchema = z.object(sceneFields).partial().required({ name: true });
const scenePatchSchema = z.object(sceneFields).partial();
const SCENE_COLUMNS = Object.keys(sceneFields);

const npcFields = {
  name: z.string().trim().min(1).max(120),
  image_url: imageUrlSchema.nullable(),
  kind: z.enum(['npc', 'monster']),
  hp_max: int(0, 100000),
  defense: int(0, 1000),
  dodge: int(0, 1000),
  attacks: z.array(attackSchema).max(30),
  notes: z.string().max(20000)
};
const npcCreateSchema = z.object(npcFields).partial().required({ name: true });
const npcPatchSchema = z.object(npcFields).partial();

const tokenFields = {
  name: z.string().trim().max(120),
  image_url: imageUrlSchema.nullable(),
  x: z.coerce.number().min(-100000).max(100000),
  y: z.coerce.number().min(-100000).max(100000),
  size: z.coerce.number().min(0.25).max(20),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  hidden: boolish,
  hp_current: int(0, 100000).nullable(),
  hp_max: int(0, 100000).nullable(),
  conditions: conditionsSchema,
  controlled_by: z.string().uuid().nullable()
};
const tokenCreateSchema = z.object({
  ...tokenFields,
  kind: z.enum(['character', 'npc', 'monster', 'marker']),
  characterId: z.string().uuid().optional(),
  npcId: z.string().uuid().optional()
}).partial().required({ kind: true });
const tokenPatchSchema = z.object(tokenFields).partial();
const TOKEN_COLUMNS = Object.keys(tokenFields);

const noteSchema = z.object({
  title: z.string().trim().min(1).max(140),
  body: z.string().max(20000).optional().default(''),
  scope: z.enum(['private', 'master', 'party']).optional().default('private'),
  pinned: boolish.optional().default(false),
  characterId: z.string().uuid().nullable().optional()
});
const notePatchSchema = noteSchema.partial();

const rollSchema = z.object({
  formula: z.string().trim().max(40).optional(),
  label: z.string().trim().max(120).optional().default(''),
  kind: z.enum(['attack', 'damage', 'skill', 'free']).optional().default('free'),
  characterId: z.string().uuid().optional().nullable(),
  skill: z.string().trim().max(60).optional(),
  powerName: z.string().trim().max(120).optional(),
  targetTokenId: z.string().uuid().optional().nullable(),
  secret: boolish.optional().default(false)
});
const hitSchema = z.object({
  amount: int(0, 100000).optional().default(0),
  outcome: z.enum(['hit', 'miss', 'heal']),
  rollId: z.string().uuid().optional().nullable()
});
const vitalsSchema = z.object({
  life_current: z.coerce.number().int().optional(),
  sanity_current: z.coerce.number().int().optional(),
  mana_current: z.coerce.number().int().optional()
});
const pickupSchema = z.object({
  itemId: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),
  characterId: z.string().uuid().optional()
});
const PICKUP_RANGE = 1.5; // passos (centro do token ate o centro da celula do item)

const MOVE_TOLERANCE = 0.25;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const stripAccents = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function updateSet(body, columns, jsonColumns = []) {
  const keys = columns.filter((key) => body[key] !== undefined);
  return {
    keys,
    sql: keys.map((key, index) => `${key} = $${index + 1}`).join(', '),
    values: keys.map((key) => (jsonColumns.includes(key) && body[key] !== null ? JSON.stringify(body[key]) : body[key]))
  };
}

// ---------- visibilidade ----------
// Jogador recebe a mesma cena (so a ativa); a nevoa e aplicada no cliente.
function sceneView(scene) {
  return {
    ...scene,
    fog_reveals: parseJson(scene.fog_reveals, []),
    initiative: parseJson(scene.initiative, []),
    tiles: parseJson(scene.tiles, null),
    turn_state: parseJson(scene.turn_state, {})
  };
}

// ---------- combate ----------
const freshTurn = (tokenId) => ({ tokenId: tokenId || null, moved: 0, action_used: false, attacked: false, damage_rolled: false, started_at: new Date().toISOString() });

// Estado completo a cada evento 'combat': o novo substitui os anteriores da mesma cena (coalescido).
async function emitCombat(campaignId, scene, userId) {
  const view = sceneView(scene);
  const hidden = new Set((await query('select id from campaign_tokens where scene_id = $1 and hidden', [scene.id])).rows.map((row) => row.id));
  const full = {
    sceneId: scene.id, mode: scene.mode, initiative: view.initiative, turn_index: scene.turn_index, round: scene.round,
    turn_state: view.turn_state, movement_per_turn: scene.movement_per_turn
  };
  const currentHidden = hidden.has(view.turn_state.tokenId);
  await query(
    `delete from campaign_events where campaign_id = $1 and type = 'combat' and payload->>'sceneId' = $2 and created_at > now() - interval '30 seconds'`,
    [campaignId, scene.id]
  );
  await emitSplit(campaignId, 'combat',
    { ...full, initiative: full.initiative.filter((entry) => !hidden.has(entry.tokenId)), turn_state: currentHidden ? { ...full.turn_state, tokenId: null } : full.turn_state },
    full, userId, { hidden: !scene.is_active });
}

async function saveCombat(campaignId, sceneId, fields) {
  const set = updateSet(fields, Object.keys(fields), ['initiative', 'turn_state']);
  const { rows } = await query(
    `update campaign_scenes set ${set.sql}, updated_at = now() where id = $${set.keys.length + 1} and campaign_id = $${set.keys.length + 2} returning *`,
    [...set.values, sceneId, campaignId]
  );
  if (!rows[0]) throw httpError('Cena não encontrada.', 404);
  return rows[0];
}

function advanceTurn(scene) {
  const initiative = parseJson(scene.initiative, []);
  let turnIndex = scene.turn_index + 1;
  let round = scene.round;
  if (turnIndex >= initiative.length) {
    turnIndex = 0;
    round += 1;
  }
  return { turn_index: turnIndex, round, turn_state: freshTurn(initiative[turnIndex]?.tokenId) };
}

const ownsToken = (token, userId) => token.controlled_by === userId || token.character_owner_id === userId;

// Turno atual do jogador na cena ativa em combate (ou null se nao ha combate).
async function playerCombatTurn(campaignId, userId) {
  const scene = (await query(`select * from campaign_scenes where campaign_id = $1 and is_active and mode = 'combat'`, [campaignId])).rows[0];
  if (!scene) return null;
  const state = parseJson(scene.turn_state, {});
  const token = state.tokenId ? (await query(`${TOKEN_SELECT} where t.id = $1`, [state.tokenId])).rows[0] : null;
  if (!token || !ownsToken(token, userId)) throw httpError('Não é o seu turno.', 409);
  return { scene, state, token };
}

const TOKEN_SELECT = `select t.*, ch.owner_id as character_owner_id, ch.life_current as character_life_current, ch.life_max as character_life_max,
  ch.appearance as character_appearance
  from campaign_tokens t left join characters ch on ch.id = t.character_id`;

// master: tudo; jogador: sem tokens ocultos, sem PV de npc/monstro, PV do proprio personagem.
export function tokenView(token, { master = false, userId = null } = {}) {
  if (!token) return null;
  if (!master && token.hidden) return null;
  const isCharacter = token.kind === 'character';
  const ownCharacter = isCharacter && userId && token.character_owner_id === userId;
  const hp = isCharacter
    ? { hp_current: token.character_life_current ?? null, hp_max: token.character_life_max ?? null }
    : { hp_current: token.hp_current, hp_max: token.hp_max };
  const showHp = master || ownCharacter;
  return {
    id: token.id,
    scene_id: token.scene_id,
    campaign_id: token.campaign_id,
    kind: token.kind,
    character_id: token.character_id,
    npc_id: master ? token.npc_id : undefined,
    owner_id: isCharacter ? token.character_owner_id : null,
    name: token.name,
    image_url: token.image_url,
    x: token.x,
    y: token.y,
    size: token.size,
    color: token.color,
    hidden: master ? token.hidden : undefined,
    hp_current: showHp ? hp.hp_current : null,
    hp_max: showHp ? hp.hp_max : null,
    down: hp.hp_max != null && Number(hp.hp_current) <= 0,
    conditions: parseJson(token.conditions, []),
    controlled_by: token.controlled_by,
    // boneco em pixel art no modo jogo; so vem quando a consulta trouxe a ficha (senao o
    // upsert do cliente apagaria a aparencia que ele ja tem)
    ...('character_appearance' in token ? { appearance: isCharacter ? parseJson(token.character_appearance, null) : null } : {}),
    updated_at: token.updated_at
  };
}

async function loadToken(campaignId, tokenId) {
  const { rows } = await query(`${TOKEN_SELECT} where t.id = $1 and t.campaign_id = $2`, [tokenId, campaignId]);
  if (!rows[0]) throw httpError('Token não encontrado.', 404);
  return rows[0];
}

async function loadScene(campaignId, sceneId, master) {
  const { rows } = await query('select * from campaign_scenes where id = $1 and campaign_id = $2', [sceneId, campaignId]);
  const scene = rows[0];
  if (!scene || (!master && !scene.is_active)) throw httpError('Cena não encontrada.', 404);
  return scene;
}

async function emitTokenUpdated(campaignId, token, userId) {
  const playerView = token.hidden ? { tokenId: token.id, sceneId: token.scene_id, removed: true } : { token: tokenView(token) };
  await emitSplit(campaignId, 'token:updated', playerView, { token: tokenView(token, { master: true }) }, userId);
}

// Movimento chega ~8x/s (WASD): apaga eventos de movimento recentes do mesmo token e grava so o ultimo.
// Quem ja leu o anterior recebe o novo (id maior); quem nao leu recebe so a posicao final.
async function emitTokenMoved(campaignId, token, userId) {
  await query(
    `delete from campaign_events
     where campaign_id = $1 and type = 'token:moved' and payload->>'tokenId' = $2 and created_at > now() - interval '30 seconds'`,
    [campaignId, token.id]
  );
  await emitEvent(campaignId, 'token:moved', { tokenId: token.id, sceneId: token.scene_id, x: token.x, y: token.y }, token.hidden ? 'master' : 'all', userId);
}

// ---------- fichas ----------
async function sharedInCampaign(campaignId, characterId) {
  const { rowCount } = await query(
    'select 1 from campaign_members where campaign_id = $1 and coalesce(shared_character_id, character_id) = $2',
    [campaignId, characterId]
  );
  return rowCount > 0;
}

async function accessibleCharacter(campaignId, characterId, user, master) {
  const { rows } = await query('select * from characters where id = $1', [characterId]);
  const character = rows[0];
  if (!character) throw httpError('Ficha não encontrada.', 404);
  if (character.owner_id === user.id) return character;
  if (master && await sharedInCampaign(campaignId, characterId)) return character;
  throw httpError('Você não pode ver esta ficha.', 403);
}

async function skillAttribute(skill) {
  const wanted = stripAccents(skill);
  const { rows } = await query('select "key", name, attribute from skills where deleted_at is null');
  const found = rows.find((row) => row.key === wanted || stripAccents(row.name) === wanted)
    || SKILL_DEFINITIONS.map(([key, name, attribute]) => ({ key, name, attribute })).find((row) => row.key === wanted || stripAccents(row.name) === wanted);
  if (!found) throw httpError('Perícia não encontrada.');
  return found;
}

export function registerCampaignV2Routes(router) {
  router.param('characterId', (req, res, next, value) => (z.string().uuid().safeParse(value).success ? next() : res.status(404).json({ message: 'Ficha não encontrada.' })));
  for (const param of ['noteId', 'sceneId', 'npcId', 'tokenId', 'monsterId']) {
    router.param(param, (req, res, next, value) => (z.string().uuid().safeParse(value).success ? next() : res.status(404).json({ message: 'Registro não encontrado.' })));
  }
  router.use('/:id', (req, res, next) => {
    // recursos v2 dependem do Postgres
    if (/^\/(events|notes|characters|scenes|npcs|tokens|rolls|ping|maps)(\/|$)/.test(req.path)) requireDatabase();
    next();
  });

  // ===== feed de eventos =====
  router.get('/:id/events', async (req, res) => {
    const { master } = await requireCampaignMember(req.params.id, req.user);
    if (req.query.after === undefined || req.query.after === '') {
      return res.json({ cursor: await latestEventId(req.params.id) });
    }
    const after = Number(req.query.after);
    if (!Number.isSafeInteger(after) || after < 0) throw httpError('Parâmetro after inválido.');
    const events = await listEvents(req.params.id, req.user.id, master, after);
    res.json({ events, cursor: events.length ? events[events.length - 1].id : after });
  });

  router.post('/:id/ping', async (req, res) => {
    const { member } = await requireCampaignMember(req.params.id, req.user);
    const body = z.object({ x: z.coerce.number(), y: z.coerce.number(), sceneId: z.string().uuid().optional() }).parse(req.body);
    const payload = { userId: req.user.id, name: req.user.name, color: member?.color || '#d6a65f', x: body.x, y: body.y, sceneId: body.sceneId || null };
    await emitEvent(req.params.id, 'ping', payload, 'all', req.user.id);
    res.status(201).json(payload);
  });

  // ===== notas =====
  async function emitNotes(campaignId, note, action, userId) {
    const payload = { noteId: note.id, action, scope: note.scope };
    if (note.scope === 'party') return emitEvent(campaignId, 'notes:changed', payload, 'all', userId);
    if (note.scope === 'master') await emitEvent(campaignId, 'notes:changed', payload, 'master', userId);
    return emitEvent(campaignId, 'notes:changed', payload, note.author_id, userId);
  }

  router.get('/:id/notes', async (req, res) => {
    const { master } = await requireCampaignMember(req.params.id, req.user);
    const { rows } = await query(
      `select n.*, u.name as author_name, c.character_name
       from campaign_notes n
       join users u on u.id = n.author_id
       left join characters c on c.id = n.character_id
       where n.campaign_id = $1
         and (n.author_id = $2 or n.scope = 'party' or (n.scope = 'master' and $3))
       order by n.pinned desc, n.updated_at desc`,
      [req.params.id, req.user.id, master]
    );
    res.json(rows);
  });

  router.post('/:id/notes', async (req, res) => {
    await requireCampaignMember(req.params.id, req.user);
    const body = noteSchema.parse(req.body);
    if (body.characterId) {
      const owned = await query('select 1 from characters where id = $1 and owner_id = $2', [body.characterId, req.user.id]);
      if (!owned.rowCount) throw httpError('Este personagem não pertence a você.', 403);
    }
    const { rows } = await query(
      `insert into campaign_notes (campaign_id, author_id, character_id, scope, title, body, pinned)
       values ($1,$2,$3,$4,$5,$6,$7) returning *`,
      [req.params.id, req.user.id, body.characterId || null, body.scope, body.title, body.body, body.pinned]
    );
    await emitNotes(req.params.id, rows[0], 'created', req.user.id);
    res.status(201).json(rows[0]);
  });

  router.patch('/:id/notes/:noteId', async (req, res) => {
    await requireCampaignMember(req.params.id, req.user);
    const body = notePatchSchema.parse(req.body);
    const existing = (await query('select * from campaign_notes where id = $1 and campaign_id = $2', [req.params.noteId, req.params.id])).rows[0];
    if (!existing) throw httpError('Nota não encontrada.', 404);
    if (existing.author_id !== req.user.id) throw httpError('Só o autor pode editar esta nota.', 403);
    const next = { ...existing, ...Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined)) };
    const characterId = body.characterId !== undefined ? body.characterId : existing.character_id;
    const { rows } = await query(
      `update campaign_notes set title=$1, body=$2, scope=$3, pinned=$4, character_id=$5, updated_at=now()
       where id=$6 returning *`,
      [next.title, next.body, next.scope, next.pinned, characterId, existing.id]
    );
    // se o escopo ficou mais restrito, avisa tambem quem via antes
    if (existing.scope !== rows[0].scope) await emitNotes(req.params.id, existing, 'updated', req.user.id);
    await emitNotes(req.params.id, rows[0], 'updated', req.user.id);
    res.json(rows[0]);
  });

  router.delete('/:id/notes/:noteId', async (req, res) => {
    const { master } = await requireCampaignMember(req.params.id, req.user);
    const existing = (await query('select * from campaign_notes where id = $1 and campaign_id = $2', [req.params.noteId, req.params.id])).rows[0];
    // nota privada de outra pessoa nao existe para quem pede (nem para o mestre)
    if (!existing || (existing.author_id !== req.user.id && existing.scope === 'private')) throw httpError('Nota não encontrada.', 404);
    if (existing.author_id !== req.user.id && !master) throw httpError('Só o autor ou o mestre podem excluir esta nota.', 403);
    await query('delete from campaign_notes where id = $1', [existing.id]);
    await emitNotes(req.params.id, existing, 'deleted', req.user.id);
    res.status(204).end();
  });

  // ===== ficha completa para o mestre =====
  router.get('/:id/characters/:characterId', async (req, res) => {
    const { master } = await requireCampaignMember(req.params.id, req.user);
    const character = await accessibleCharacter(req.params.id, req.params.characterId, req.user, master);
    const { rows } = await query(
      `select c.*, r.name as race_name, cl.name as class_name, o.name as origin_name
       from characters c
       left join races r on r.id = c.race_id
       left join classes cl on cl.id = c.class_id
       left join origins o on o.id = c.origin_id
       where c.id = $1`,
      [character.id]
    );
    res.json(await enrich(rows[0]));
  });

  router.patch('/:id/characters/:characterId/vitals', async (req, res) => {
    const { master } = await requireCampaignMember(req.params.id, req.user);
    const character = await accessibleCharacter(req.params.id, req.params.characterId, req.user, master);
    const body = vitalsSchema.parse(req.body);
    const life = clamp(body.life_current ?? character.life_current, 0, Number(character.life_max));
    const sanity = clamp(body.sanity_current ?? character.sanity_current, 0, Number(character.sanity_max));
    const mana = clamp(body.mana_current ?? character.mana, 0, Number(character.mana_max || character.mana));
    const { rows } = await query(
      `update characters set life_current=$1, sanity_current=$2, mana=$3, updated_at=now() where id=$4
       returning id, life_current, life_max, sanity_current, sanity_max, mana as mana_current, mana_max`,
      [life, sanity, mana, character.id]
    );
    await emitEvent(req.params.id, 'character:updated', { characterId: character.id }, 'all', req.user.id);
    res.json(rows[0]);
  });

  // ===== NPCs e monstros da campanha (so mestre) =====
  router.get('/:id/npcs', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const { rows } = await query('select * from campaign_npcs where campaign_id = $1 order by kind, name', [req.params.id]);
    res.json(rows);
  });

  router.post('/:id/npcs', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const body = npcCreateSchema.parse(req.body);
    const { rows } = await query(
      `insert into campaign_npcs (campaign_id, name, image_url, kind, hp_max, defense, dodge, attacks, notes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
      [req.params.id, body.name, body.image_url || null, body.kind || 'npc', body.hp_max ?? 10, body.defense ?? 10, body.dodge ?? 13, JSON.stringify(body.attacks || []), body.notes || '']
    );
    res.status(201).json(rows[0]);
  });

  router.post('/:id/npcs/from-monster/:monsterId', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const monster = (await query('select * from monsters where id = $1 and deleted_at is null', [req.params.monsterId])).rows[0];
    if (!monster) throw httpError('Monstro não encontrado.', 404);
    const attacks = (await query('select name, damage_formula, description from monster_attacks where monster_id = $1 order by name', [monster.id])).rows;
    const { rows } = await query(
      `insert into campaign_npcs (campaign_id, name, image_url, kind, monster_id, hp_max, defense, dodge, attacks, notes)
       values ($1,$2,$3,'monster',$4,$5,$6,$7,$8,$9) returning *`,
      [req.params.id, monster.name, monster.token_url || monster.image_url || null, monster.id, monster.base_health, monster.armor ?? 10, 13,
        JSON.stringify(attacks.map((attack) => ({ ...attack, description: attack.description || '' }))), monster.description || '']
    );
    res.status(201).json(rows[0]);
  });

  router.patch('/:id/npcs/:npcId', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const body = npcPatchSchema.parse(req.body);
    const set = updateSet(body, Object.keys(npcFields), ['attacks']);
    if (!set.keys.length) throw httpError('Nada para atualizar.');
    const { rows } = await query(
      `update campaign_npcs set ${set.sql}, updated_at = now() where id = $${set.keys.length + 1} and campaign_id = $${set.keys.length + 2} returning *`,
      [...set.values, req.params.npcId, req.params.id]
    );
    if (!rows[0]) throw httpError('NPC não encontrado.', 404);
    res.json(rows[0]);
  });

  router.delete('/:id/npcs/:npcId', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const { rowCount } = await query('delete from campaign_npcs where id = $1 and campaign_id = $2', [req.params.npcId, req.params.id]);
    if (!rowCount) throw httpError('NPC não encontrado.', 404);
    res.status(204).end();
  });

  // ===== cenas =====
  function checkSceneBody(body) {
    if (body.tiles) body.tiles = validateTiles(body.tiles);
    if (body.map_kind === 'tiles' && body.tiles === null) throw httpError('Mapa em tiles precisa do campo tiles.');
  }

  function sceneEventPayload(scene) {
    const { map_url: mapUrl, ...rest } = sceneView(scene);
    return { scene: { ...rest, has_map_url: Boolean(mapUrl) } };
  }

  router.get('/:id/scenes', async (req, res) => {
    const { master } = await requireCampaignMember(req.params.id, req.user);
    const { rows } = await query(
      `select * from campaign_scenes where campaign_id = $1 ${master ? '' : 'and is_active'} order by position, created_at`,
      [req.params.id]
    );
    res.json(rows.map((scene) => sceneView(scene)));
  });

  router.get('/:id/scenes/:sceneId', async (req, res) => {
    const { master } = await requireCampaignMember(req.params.id, req.user);
    res.json(sceneView(await loadScene(req.params.id, req.params.sceneId, master)));
  });

  router.post('/:id/scenes', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const body = sceneCreateSchema.parse(req.body);
    checkSceneBody(body);
    if (body.tiles && !body.map_kind) body.map_kind = 'tiles';
    const count = await query('select count(*)::int as total from campaign_scenes where campaign_id = $1', [req.params.id]);
    const set = updateSet({ position: count.rows[0].total, ...body }, SCENE_COLUMNS, ['fog_reveals', 'tiles']);
    const { rows } = await query(
      `insert into campaign_scenes (campaign_id, ${set.keys.join(', ')}, is_active)
       values ($${set.keys.length + 1}, ${set.keys.map((_, index) => `$${index + 1}`).join(', ')}, $${set.keys.length + 2}) returning *`,
      [...set.values, req.params.id, count.rows[0].total === 0]
    );
    await emitEvent(req.params.id, 'scene:updated', sceneEventPayload(rows[0]), rows[0].is_active ? 'all' : 'master', req.user.id);
    res.status(201).json(sceneView(rows[0]));
  });

  router.patch('/:id/scenes/:sceneId', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const body = scenePatchSchema.parse(req.body);
    checkSceneBody(body);
    const set = updateSet(body, SCENE_COLUMNS, ['fog_reveals', 'tiles']);
    if (!set.keys.length) throw httpError('Nada para atualizar.');
    const { rows } = await query(
      `update campaign_scenes set ${set.sql}, updated_at = now() where id = $${set.keys.length + 1} and campaign_id = $${set.keys.length + 2} returning *`,
      [...set.values, req.params.sceneId, req.params.id]
    );
    if (!rows[0]) throw httpError('Cena não encontrada.', 404);
    await emitEvent(req.params.id, 'scene:updated', { ...sceneEventPayload(rows[0]), changed: set.keys, map_changed: set.keys.includes('map_url') }, rows[0].is_active ? 'all' : 'master', req.user.id);
    res.json(sceneView(rows[0]));
  });

  router.delete('/:id/scenes/:sceneId', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const { rows } = await query('delete from campaign_scenes where id = $1 and campaign_id = $2 returning id, is_active', [req.params.sceneId, req.params.id]);
    if (!rows[0]) throw httpError('Cena não encontrada.', 404);
    await emitEvent(req.params.id, 'scene:deleted', { sceneId: rows[0].id }, rows[0].is_active ? 'all' : 'master', req.user.id);
    res.status(204).end();
  });

  router.post('/:id/scenes/:sceneId/activate', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const client = await pool.connect();
    let scene;
    try {
      await client.query('begin');
      await client.query('update campaign_scenes set is_active = false, updated_at = now() where campaign_id = $1 and is_active', [req.params.id]);
      scene = (await client.query('update campaign_scenes set is_active = true, updated_at = now() where id = $1 and campaign_id = $2 returning *', [req.params.sceneId, req.params.id])).rows[0];
      if (!scene) throw httpError('Cena não encontrada.', 404);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
    await emitEvent(req.params.id, 'scene:activated', { sceneId: scene.id }, 'all', req.user.id);
    res.json(sceneView(scene));
  });

  router.put('/:id/scenes/:sceneId/initiative', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const body = z.object({
      initiative: z.array(z.object({ tokenId: z.string().uuid(), value: z.coerce.number() })).max(100),
      turn_index: int(0, 100).optional().default(0),
      round: int(1, 100000).optional().default(1)
    }).parse(req.body);
    const { rows } = await query(
      `update campaign_scenes set initiative = $1, turn_index = $2, round = $3, updated_at = now()
       where id = $4 and campaign_id = $5 returning *`,
      [JSON.stringify(body.initiative), body.turn_index, body.round, req.params.sceneId, req.params.id]
    );
    if (!rows[0]) throw httpError('Cena não encontrada.', 404);
    const hidden = new Set((await query('select id from campaign_tokens where scene_id = $1 and hidden', [rows[0].id])).rows.map((row) => row.id));
    const full = { sceneId: rows[0].id, initiative: body.initiative, turn_index: body.turn_index, round: body.round };
    // jogador nao ve entradas de tokens ocultos; current_token_id diz de quem e a vez (null se oculto)
    const current = body.initiative[body.turn_index]?.tokenId || null;
    await emitSplit(req.params.id, 'initiative',
      { ...full, initiative: body.initiative.filter((entry) => !hidden.has(entry.tokenId)), current_token_id: hidden.has(current) ? null : current },
      { ...full, current_token_id: current },
      req.user.id,
      { hidden: !rows[0].is_active });
    res.json(sceneView(rows[0]));
  });

  // ===== combate por turnos =====
  router.post('/:id/scenes/:sceneId/combat/start', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const body = z.object({
      rollInitiative: boolish.optional().default(true),
      initiative: z.array(z.object({ tokenId: z.string().uuid(), value: z.coerce.number() })).max(100).optional(),
      movement_per_turn: int(1, 100).optional()
    }).parse(req.body || {});
    const existing = await loadScene(req.params.id, req.params.sceneId, true);
    // rollInitiative=false sem lista: reaproveita a iniciativa ja salva na cena
    let initiative = body.initiative || (body.rollInitiative ? null : parseJson(existing.initiative, []));
    if (!initiative) {
      // 1d20 + Agilidade da ficha para personagens; 1d20 para npc/monstro; marcadores ficam fora
      const tokens = (await query(
        `select t.id, t.kind, ch.attributes from campaign_tokens t left join characters ch on ch.id = t.character_id
         where t.scene_id = $1 and t.kind <> 'marker' order by t.created_at`, [req.params.sceneId])).rows;
      initiative = tokens.map((token) => {
        const agility = token.kind === 'character' ? Number(parseJson(token.attributes, {}).agilidade ?? 2) : 0;
        return { tokenId: token.id, value: rollDiceFormula('1d20').total + agility };
      });
    }
    initiative = [...initiative].sort((a, b) => b.value - a.value);
    const scene = await saveCombat(req.params.id, req.params.sceneId, {
      mode: 'combat', initiative, turn_index: 0, round: 1, turn_state: freshTurn(initiative[0]?.tokenId),
      ...(body.movement_per_turn ? { movement_per_turn: body.movement_per_turn } : {})
    });
    await emitCombat(req.params.id, scene, req.user.id);
    res.json(sceneView(scene));
  });

  router.post('/:id/scenes/:sceneId/combat/next', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const current = await loadScene(req.params.id, req.params.sceneId, true);
    if (current.mode !== 'combat') throw httpError('Esta cena não está em combate.', 409);
    const scene = await saveCombat(req.params.id, current.id, advanceTurn(current));
    await emitCombat(req.params.id, scene, req.user.id);
    res.json(sceneView(scene));
  });

  router.post('/:id/scenes/:sceneId/combat/end-turn', async (req, res) => {
    const { master } = await requireCampaignMember(req.params.id, req.user);
    const current = await loadScene(req.params.id, req.params.sceneId, master);
    if (current.mode !== 'combat') throw httpError('Esta cena não está em combate.', 409);
    const state = parseJson(current.turn_state, {});
    if (!master) {
      const token = state.tokenId ? (await query(`${TOKEN_SELECT} where t.id = $1`, [state.tokenId])).rows[0] : null;
      if (!token || !ownsToken(token, req.user.id)) throw httpError('Não é o seu turno.', 409);
    }
    const scene = await saveCombat(req.params.id, current.id, advanceTurn(current));
    await emitCombat(req.params.id, scene, req.user.id);
    res.json(sceneView(scene));
  });

  router.post('/:id/scenes/:sceneId/combat/end', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    await loadScene(req.params.id, req.params.sceneId, true);
    const scene = await saveCombat(req.params.id, req.params.sceneId, { mode: 'exploration', turn_state: {} });
    await emitCombat(req.params.id, scene, req.user.id);
    res.json(sceneView(scene));
  });

  // ===== tokens =====
  router.get('/:id/scenes/:sceneId/tokens', async (req, res) => {
    const { master } = await requireCampaignMember(req.params.id, req.user);
    await loadScene(req.params.id, req.params.sceneId, master);
    const { rows } = await query(`${TOKEN_SELECT} where t.scene_id = $1 order by t.created_at`, [req.params.sceneId]);
    res.json(rows.map((token) => tokenView(token, { master, userId: req.user.id })).filter(Boolean));
  });

  router.post('/:id/scenes/:sceneId/tokens', async (req, res) => {
    const { master, member } = await requireCampaignMember(req.params.id, req.user);
    const scene = await loadScene(req.params.id, req.params.sceneId, master);
    const body = tokenCreateSchema.parse(req.body);
    const token = {
      kind: body.kind, name: body.name || '', image_url: body.image_url || null, x: body.x ?? 0, y: body.y ?? 0, size: body.size ?? 1,
      color: body.color || null, hidden: body.hidden ?? false, hp_current: body.hp_current ?? null, hp_max: body.hp_max ?? null,
      conditions: body.conditions || [], controlled_by: body.controlled_by || null, character_id: null, npc_id: null
    };

    if (!master) {
      // jogador: so o proprio personagem compartilhado, uma vez por cena
      const own = member.shared_character_id || member.character_id;
      if (body.kind !== 'character' || !own || (body.characterId && body.characterId !== own)) {
        throw httpError('Você só pode colocar o seu personagem compartilhado na mesa.', 403);
      }
      body.characterId = own;
      Object.assign(token, { hidden: false, conditions: [], controlled_by: req.user.id, hp_current: null, hp_max: null });
    }
    if (body.kind === 'character') {
      if (!body.characterId) throw httpError('Escolha o personagem do token.');
      if (!await sharedInCampaign(req.params.id, body.characterId)) throw httpError('Este personagem não está compartilhado na campanha.', 403);
      const character = (await query('select id, owner_id, character_name, photo from characters where id = $1', [body.characterId])).rows[0];
      const exists = await query('select 1 from campaign_tokens where scene_id = $1 and character_id = $2', [scene.id, character.id]);
      if (exists.rowCount) throw httpError('Este personagem já está nesta cena.', 409);
      Object.assign(token, {
        character_id: character.id, name: token.name || character.character_name, image_url: token.image_url || character.photo || null,
        controlled_by: token.controlled_by || character.owner_id, hp_current: null, hp_max: null
      });
    } else if (body.npcId) {
      const npc = (await query('select * from campaign_npcs where id = $1 and campaign_id = $2', [body.npcId, req.params.id])).rows[0];
      if (!npc) throw httpError('NPC não encontrado.', 404);
      Object.assign(token, {
        npc_id: npc.id, name: token.name || npc.name, image_url: token.image_url || npc.image_url,
        hp_max: token.hp_max ?? npc.hp_max, hp_current: token.hp_current ?? token.hp_max ?? npc.hp_max
      });
    }
    if (!token.name) token.name = body.kind === 'marker' ? 'Marcador' : 'Token';

    const { rows } = await query(
      `insert into campaign_tokens (scene_id, campaign_id, kind, character_id, npc_id, name, image_url, x, y, size, color, hidden, hp_current, hp_max, conditions, controlled_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning id`,
      [scene.id, req.params.id, token.kind, token.character_id, token.npc_id, token.name, token.image_url, token.x, token.y, token.size, token.color, token.hidden,
        token.hp_current, token.hp_max, JSON.stringify(token.conditions), token.controlled_by]
    );
    const created = await loadToken(req.params.id, rows[0].id);
    await emitTokenUpdated(req.params.id, created, req.user.id);
    res.status(201).json(tokenView(created, { master, userId: req.user.id }));
  });

  router.patch('/:id/tokens/:tokenId', async (req, res) => {
    const { master } = await requireCampaignMember(req.params.id, req.user);
    const token = await loadToken(req.params.id, req.params.tokenId);
    const body = tokenPatchSchema.parse(req.body);
    const keys = Object.keys(body).filter((key) => body[key] !== undefined);
    if (!keys.length) throw httpError('Nada para atualizar.');
    if (!master) {
      const mine = token.controlled_by === req.user.id || token.character_owner_id === req.user.id;
      if (!mine || token.hidden) throw httpError('Token não encontrado.', 404);
      if (keys.some((key) => key !== 'x' && key !== 'y')) throw httpError('Você só pode mover seus tokens.', 403);
      const scene = (await query('select * from campaign_scenes where id = $1', [token.scene_id])).rows[0];
      if (!scene?.is_active || scene.mode === 'prep') throw httpError('A mesa está em preparação: só o mestre move os tokens.', 409);
      if (scene.mode === 'combat') {
        const state = parseJson(scene.turn_state, {});
        if (state.tokenId !== token.id) throw httpError('Não é o seu turno.', 409);
        // movimento livre: soma a distancia euclidiana percorrida, em passos (grid_size px = 1 passo/1 metro)
        const steps = Math.hypot((body.x ?? token.x) - token.x, (body.y ?? token.y) - token.y) / scene.grid_size;
        const moved = Math.round((Number(state.moved || 0) + steps) * 1000) / 1000;
        if (moved > scene.movement_per_turn + MOVE_TOLERANCE) throw httpError('Sem movimento neste turno.', 409);
        req.combatScene = await saveCombat(req.params.id, scene.id, { turn_state: { ...state, moved } });
      }
    }
    const set = updateSet(body, TOKEN_COLUMNS, ['conditions']);
    await query(`update campaign_tokens set ${set.sql}, updated_at = now() where id = $${set.keys.length + 1}`, [...set.values, token.id]);
    const updated = await loadToken(req.params.id, token.id);
    if (keys.every((key) => key === 'x' || key === 'y')) await emitTokenMoved(req.params.id, updated, req.user.id);
    else await emitTokenUpdated(req.params.id, updated, req.user.id);
    if (req.combatScene) await emitCombat(req.params.id, req.combatScene, req.user.id);
    res.json(tokenView(updated, { master, userId: req.user.id }));
  });

  router.delete('/:id/tokens/:tokenId', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const { rows } = await query('delete from campaign_tokens where id = $1 and campaign_id = $2 returning id, scene_id', [req.params.tokenId, req.params.id]);
    if (!rows[0]) throw httpError('Token não encontrado.', 404);
    await emitEvent(req.params.id, 'token:removed', { tokenId: rows[0].id, sceneId: rows[0].scene_id }, 'all', req.user.id);
    res.status(204).end();
  });

  // ===== rolagens =====
  router.post('/:id/rolls', async (req, res) => {
    const { master, member } = await requireCampaignMember(req.params.id, req.user);
    const body = rollSchema.parse(req.body);
    if (body.secret && !master) throw httpError('Só o mestre pode fazer rolagens secretas.', 403);
    // combate: ataque/pericia so no proprio turno e 1 acao; dano so depois de um ataque no turno
    let combat = null;
    if (!master && body.kind !== 'free') {
      combat = await playerCombatTurn(req.params.id, req.user.id);
      if (combat) {
        const { state } = combat;
        if (body.kind === 'damage' && (!state.attacked || state.damage_rolled)) throw httpError('Role o ataque antes do dano neste turno.', 409);
        if (body.kind !== 'damage' && state.action_used) throw httpError('Você já usou sua ação neste turno.', 409);
      }
    }

    let character = null;
    if (body.characterId) character = await accessibleCharacter(req.params.id, body.characterId, req.user, master);

    let formula = body.formula;
    let label = body.label;
    if (body.kind === 'skill' && character && body.skill) {
      // mesma regra da ficha: d20 + atributo + treino + outros bonus
      const skill = await skillAttribute(body.skill);
      const attributes = parseJson(character.attributes, {});
      const bonus = Number(attributes[skill.attribute] ?? 2)
        + Number(parseJson(character.skills, {})[skill.key] || 0)
        + Number(parseJson(character.skill_bonuses, {})[skill.key] || 0);
      formula = `1d20${bonus >= 0 ? '+' : ''}${bonus}`;
      label = label || `${skill.name} (${character.character_name})`;
    }
    if (!formula) throw httpError('Informe a fórmula do dado (ex.: 1d20+3).');
    const parsed = parseDiceFormula(formula);
    const result = rollDiceFormula(formula);

    let target = null;
    if (body.targetTokenId) {
      target = await loadToken(req.params.id, body.targetTokenId);
      if (target.hidden && !master) throw httpError('Token não encontrado.', 404);
    }
    const rollId = crypto.randomUUID();
    const roll = {
      rollId,
      userId: req.user.id,
      userName: req.user.name,
      characterId: character?.id || null,
      characterName: character?.character_name || null,
      label: label || body.powerName || formula,
      powerName: body.powerName || null,
      skill: body.skill || null,
      formula,
      rolls: result.rolls,
      dice: result.rolls.map((value) => ({ sides: parsed.sides, value })),
      bonus: result.bonus,
      total: result.total,
      targetTokenId: target?.id || null,
      targetName: target?.name || null,
      kind: body.kind,
      secret: body.secret,
      color: member?.color || null,
      created_at: new Date().toISOString()
    };
    if (!body.secret) {
      const { rows } = await query(
        `insert into messages (campaign_id, user_id, character_id, content, message_type, meta)
         values ($1,$2,$3,$4,'roll',$5) returning id`,
        [req.params.id, req.user.id, character?.id || member?.shared_character_id || null, `${roll.label}: ${formula} = ${roll.total}`, JSON.stringify(roll)]
      );
      roll.messageId = rows[0].id;
    }
    await emitEvent(req.params.id, 'roll', roll, body.secret ? 'master' : 'all', req.user.id);
    if (combat) {
      const state = body.kind === 'damage'
        ? { ...combat.state, damage_rolled: true }
        : { ...combat.state, action_used: true, attacked: body.kind === 'attack' };
      await emitCombat(req.params.id, await saveCombat(req.params.id, combat.scene.id, { turn_state: state }), req.user.id);
    }
    res.status(201).json(roll);
  });

  // ===== acertos / dano / cura (so mestre) =====
  router.post('/:id/tokens/:tokenId/hit', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const body = hitSchema.parse(req.body);
    const token = await loadToken(req.params.id, req.params.tokenId);
    if (token.kind === 'marker') throw httpError('Marcadores não recebem dano.');
    const delta = body.outcome === 'miss' ? 0 : body.outcome === 'heal' ? body.amount : -body.amount;
    let hpCurrent;
    let hpMax;

    if (token.kind === 'character') {
      const { rows } = await query(
        `update characters set life_current = greatest(0, least(life_max, life_current + $1)), updated_at = now()
         where id = $2 returning life_current, life_max, owner_id`,
        [delta, token.character_id]
      );
      if (!rows[0]) throw httpError('Ficha do token não encontrada.', 404);
      [hpCurrent, hpMax] = [rows[0].life_current, rows[0].life_max];
    } else {
      hpMax = token.hp_max;
      const base = token.hp_current ?? hpMax ?? 0;
      hpCurrent = clamp(base + delta, 0, hpMax ?? Math.max(base + delta, 0));
      await query('update campaign_tokens set hp_current = $1, updated_at = now() where id = $2', [hpCurrent, token.id]);
    }

    const down = hpCurrent <= 0;
    const common = { tokenId: token.id, sceneId: token.scene_id, outcome: body.outcome, down, rollId: body.rollId || null };
    await emitSplit(req.params.id, 'token:hit', common, { ...common, amount: body.amount, hp_current: hpCurrent, hp_max: hpMax }, req.user.id, { hidden: token.hidden });
    if (token.kind === 'character') {
      await emitEvent(req.params.id, 'token:hit', { ...common, view: 'owner', characterId: token.character_id, amount: body.amount, life_current: hpCurrent, life_max: hpMax }, token.character_owner_id, req.user.id);
      await emitEvent(req.params.id, 'character:updated', { characterId: token.character_id }, 'all', req.user.id);
    }
    res.json({ ...common, amount: body.amount, hp_current: hpCurrent, hp_max: hpMax });
  });

  // ===== pegar item do mapa =====
  // Tudo numa transacao com a cena travada (FOR UPDATE): dois jogadores clicando juntos,
  // so o primeiro leva; o segundo ve "Ja pegaram esse item.".
  router.post('/:id/scenes/:sceneId/pickup', async (req, res) => {
    const { master } = await requireCampaignMember(req.params.id, req.user);
    const body = pickupSchema.parse(req.body);
    if (master && !body.characterId) throw httpError('Escolha para qual personagem entregar o item.');
    const client = await pool.connect();
    let result;
    try {
      await client.query('begin');
      const scene = (await client.query('select * from campaign_scenes where id = $1 and campaign_id = $2 for update', [req.params.sceneId, req.params.id])).rows[0];
      if (!scene || (!master && !scene.is_active)) throw httpError('Cena não encontrada.', 404);
      if (scene.mode === 'prep') throw httpError('A mesa está em preparação.', 409);
      const tiles = parseJson(scene.tiles, null);
      const items = Array.isArray(tiles?.items) ? tiles.items : [];
      const item = items.find((entry) => entry.id === body.itemId);
      if (!item) throw httpError('Já pegaram esse item.', 409);

      let characterId = body.characterId;
      let combatState = null;
      if (!master) {
        const mine = (await client.query(
          `${TOKEN_SELECT} where t.scene_id = $1 and t.kind = 'character' and (ch.owner_id = $2 or t.controlled_by = $2)`,
          [scene.id, req.user.id]
        )).rows.filter((token) => !body.characterId || token.character_id === body.characterId);
        if (!mine.length) throw httpError('Coloque seu personagem no mapa para pegar itens.', 409);
        const grid = scene.grid_size || 70;
        const distance = (token) => Math.hypot(
          (Number(token.x) + (Number(token.size || 1) * grid) / 2) / grid - (item.x + 0.5),
          (Number(token.y) + (Number(token.size || 1) * grid) / 2) / grid - (item.y + 0.5)
        );
        const token = mine.sort((a, b) => distance(a) - distance(b))[0];
        if (scene.mode === 'combat') {
          const state = parseJson(scene.turn_state, {});
          if (state.tokenId !== token.id) throw httpError('Não é o seu turno.', 409);
          if (state.action_used) throw httpError('Você já usou sua ação neste turno.', 409);
          combatState = { ...state, action_used: true };
        }
        if (distance(token) > PICKUP_RANGE + 1e-6) throw httpError('Chegue mais perto para pegar.', 409);
        characterId = token.character_id;
      } else if (!(await sharedInCampaign(req.params.id, characterId))) {
        throw httpError('Esse personagem não está nesta campanha.', 404);
      }

      const character = (await client.query('select id, character_name, inventory, wallet from characters where id = $1 for update', [characterId])).rows[0];
      if (!character) throw httpError('Ficha não encontrada.', 404);
      let inventory = parseJson(character.inventory, []);
      const wallet = { bronze: 0, silver: 0, platinum: 0, gold: 0, ...parseJson(character.wallet, {}) };
      let received;
      if (item.dracmas > 0) {
        // dinheiro vai para a bolsa, ja trocado nas moedas maiores
        const coins = dracmasToCoins(item.dracmas);
        for (const [coin, amount] of Object.entries(coins)) wallet[coin] = Number(wallet[coin] || 0) + amount;
        received = { kind: 'dracmas', dracmas: item.dracmas, name: item.name };
      } else {
        // mesmo formato de item da ficha (character.routes.js normalizeItem)
        const entry = {
          id: crypto.randomUUID(), name: item.name, quantity: item.quantity || 1, weight: Number(item.weight || 0),
          category: item.category || 'Achados', description: item.description || '', defenseBonus: 0
        };
        inventory = [...inventory, entry];
        received = { kind: 'item', ...entry };
      }
      await client.query('update characters set inventory = $1, wallet = $2, updated_at = now() where id = $3', [JSON.stringify(inventory), JSON.stringify(wallet), character.id]);
      const nextItems = items.filter((entry) => entry.id !== item.id);
      const sceneFieldsUpdate = combatState ? ', turn_state = $3' : '';
      const updatedScene = (await client.query(
        `update campaign_scenes set tiles = $1${sceneFieldsUpdate}, updated_at = now() where id = $2 returning *`,
        combatState ? [JSON.stringify({ ...tiles, items: nextItems }), scene.id, JSON.stringify(combatState)] : [JSON.stringify({ ...tiles, items: nextItems }), scene.id]
      )).rows[0];
      const what = item.dracmas > 0 ? `${item.dracmas} dracmas (${item.name})` : `${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`;
      const content = `${character.character_name} pegou ${what}`;
      const message = (await client.query(
        `insert into messages (campaign_id, user_id, character_id, content, message_type, meta)
         values ($1,$2,$3,$4,'event',$5) returning id, message_type, meta, campaign_id, user_id, character_id, content, created_at, updated_at`,
        [req.params.id, req.user.id, character.id, content, JSON.stringify({ event: 'pickup', sceneId: scene.id, itemId: item.id })]
      )).rows[0];
      await client.query('commit');
      result = { item, received, character, inventory, wallet, updatedScene, combatState, message };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }

    const { updatedScene } = result;
    // scene:updated leve: so o id da cena e a lista nova de itens (nao manda o mapa inteiro de novo)
    await emitEvent(req.params.id, 'scene:updated', { scene: { id: updatedScene.id }, changed: ['items'], items: parseJson(updatedScene.tiles, {}).items || [] }, updatedScene.is_active ? 'all' : 'master', req.user.id);
    await emitEvent(req.params.id, 'message:created', { message: { ...result.message, account_name: req.user.name, character_name: result.character.character_name } }, 'all', req.user.id);
    await emitEvent(req.params.id, 'character:updated', { characterId: result.character.id }, 'all', req.user.id);
    if (result.combatState) await emitCombat(req.params.id, updatedScene, req.user.id);
    res.status(201).json({
      item: result.item,
      received: result.received,
      character: { id: result.character.id, inventory: result.inventory, wallet: result.wallet }
    });
  });
}
