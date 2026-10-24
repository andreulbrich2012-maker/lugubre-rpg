// Viagens pelo mar: barcos (convés e porão), embarcar/desembarcar, viagem do porto ao destino,
// permissoes e pedido ao mestre para subir no barco.
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { BOAT_TYPE_IDS, deckMap, holdMap, landingCells, voyageProgress, dockCell, vesselSpawns } from './utils/boats.js';

const app = createApp();
const hasDb = Boolean(process.env.DATABASE_URL);

const as = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url, body = {}) => request(app).post(url).set('Authorization', `Bearer ${token}`).send(body),
  put: (url, body = {}) => request(app).put(url).set('Authorization', `Bearer ${token}`).send(body),
  patch: (url, body = {}) => request(app).patch(url).set('Authorization', `Bearer ${token}`).send(body),
  delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`)
});

async function register(label) {
  const email = `sea-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@lugubre.local`;
  const { body } = await request(app).post('/api/auth/register').send({ name: `Mar ${label}`, email, password: 'Teste123!' }).expect(201);
  return { token: body.token, user: body.user, api: as(body.token) };
}

// porto: terra a esquerda, cais em (5,4), agua a direita
const PORT = {
  cols: 12, rows: 8,
  layers: { ground: Array.from({ length: 8 }, () => '......~~óóóó') },
  ports: [{ id: 'cais', x: 5, y: 4, name: 'Cais do Corvo' }]
};
const ISLAND = {
  cols: 10, rows: 8,
  layers: { ground: Array.from({ length: 8 }, () => 'óóó~~.....') },
  ports: [{ id: 'praia', x: 5, y: 3, name: 'Praia' }]
};
const SEA = { cols: 30, rows: 12, layers: { ground: Array.from({ length: 12 }, () => 'ó'.repeat(30)) }, sea: true };

describe('barcos (sem banco)', () => {
  it('convés e porão de todos os tipos: casco com tábuas, amurada e lugar para ficar em pé', () => {
    for (const type of BOAT_TYPE_IDS) {
      const deck = deckMap(type);
      expect(deck.layers.ground).toHaveLength(deck.rows);
      expect(deck.layers.ground.every((row) => row.length === deck.cols)).toBe(true);
      expect(deck.vessel).toMatchObject({ type, part: 'deck' });
      expect(vesselSpawns(deck).length).toBeGreaterThan(2);
      const hold = holdMap(type);
      expect(hold.vessel.part).toBe('hold');
      expect(hold.layers.ground[hold.vessel.ladder.y][hold.vessel.ladder.x]).toBe('<');
    }
    expect(deckMap('navio').vessel.masts).toHaveLength(3);
    expect(deckMap('bote').vessel.masts).toHaveLength(0);
  });

  it('desce em terra (nao na agua) e atraca na agua perto do porto', () => {
    const cells = landingCells(PORT, { x: 5, y: 4 }, 3);
    expect(cells).toHaveLength(3);
    expect(cells.every((c) => PORT.layers.ground[c.y][c.x] === '.')).toBe(true);
    expect(PORT.layers.ground[4][dockCell(PORT, { x: 5, y: 4 }).x]).toBe('~');
  });

  it('progresso anda so navegando e para em 1', () => {
    const route = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    const at = new Date(1_000_000).toISOString();
    expect(voyageProgress({ status: 'sailing', progress: 0, speed: 2, route, progress_at: at }, 1_000_000 + 2500)).toBeCloseTo(0.5);
    expect(voyageProgress({ status: 'paused', progress: 0.2, speed: 2, route, progress_at: at }, 1_000_000 + 9000)).toBe(0.2);
    expect(voyageProgress({ status: 'sailing', progress: 0.9, speed: 2, route, progress_at: at }, 1_000_000 + 9000)).toBe(1);
  });
});

describe.skipIf(!hasDb)('viagens pelo mar com Postgres', () => {
  let master; let player; let other; let campaign; let port; let island; let sea; let tok; let boat;
  const base = () => `/api/campaigns/${campaign.id}`;
  const tokenScene = async () => {
    for (const s of [port, island, { id: boat.deck_scene_id }, { id: boat.hold_scene_id }]) {
      const list = (await master.api.get(`${base()}/scenes/${s.id}/tokens`).expect(200)).body;
      const found = list.find((t) => t.id === tok.id);
      if (found) return { sceneId: s.id, x: found.x / 70, y: found.y / 70 };
    }
    return null;
  };

  beforeAll(async () => {
    [master, player, other] = await Promise.all([register('mestre'), register('jogador'), register('outro')]);
    ({ body: campaign } = await master.api.post('/api/campaigns', { name: 'Mesa do mar', description: 'teste' }).expect(201));
    const [races, classes, origins] = await Promise.all(['races', 'classes', 'origins'].map((type) => request(app).get(`/api/catalog/${type}`)));
    const { body: character } = await player.api.post('/api/characters', {
      playerName: 'Jogador', characterName: 'Maré', raceId: races.body[0].id, classId: classes.body[0].id, originId: origins.body[0].id,
      lifeCurrent: 30, lifeMax: 30, sanityCurrent: 20, sanityMax: 20, mana: 10, manaMax: 10, defense: 10, inventory: []
    }).expect(201);
    await player.api.post('/api/campaigns/join', { inviteCode: campaign.invite_code, characterId: character.id }).expect(200);
    await other.api.post('/api/campaigns/join', { inviteCode: campaign.invite_code }).expect(200);
    ({ body: port } = await master.api.post(`${base()}/scenes`, { name: 'Porto', grid_size: 70, tiles: PORT, mode: 'exploration' }).expect(201));
    ({ body: island } = await master.api.post(`${base()}/scenes`, { name: 'Ilha', grid_size: 70, tiles: ISLAND, mode: 'exploration' }).expect(201));
    ({ body: sea } = await master.api.post(`${base()}/scenes`, { name: 'Mar aberto', grid_size: 70, tiles: SEA }).expect(201));
    await master.api.post(`${base()}/scenes/${port.id}/activate`).expect(200);
    ({ body: tok } = await player.api.post(`${base()}/scenes/${port.id}/tokens`, { kind: 'character', x: 5 * 70, y: 4 * 70 }).expect(201));
  });

  it('portos ficam no mapa; so o mestre cria barco; convés e porão viram cenas', async () => {
    expect((await master.api.get(`${base()}/scenes/${port.id}`).expect(200)).body.tiles.ports[0].name).toBe('Cais do Corvo');
    await player.api.post(`${base()}/boats`, { name: 'Pirata', type: 'bote', sceneId: port.id, portId: 'cais' }).expect(403);
    await master.api.post(`${base()}/boats`, { name: 'X', type: 'submarino', sceneId: port.id }).expect(400);
    ({ body: boat } = await master.api.post(`${base()}/boats`, { name: 'Gaivota', type: 'veleiro', sceneId: port.id, portId: 'cais' }).expect(201));
    expect(boat).toMatchObject({ type: 'veleiro', home_scene_id: port.id, y: 4 });
    expect(PORT.layers.ground[4][boat.x]).toBe('~');
    const deck = (await master.api.get(`${base()}/scenes/${boat.deck_scene_id}`).expect(200)).body;
    expect(deck).toMatchObject({ parent_scene_id: port.id, map_kind: 'tiles' });
    expect(deck.tiles.vessel).toMatchObject({ type: 'veleiro', part: 'deck' });
    const hold = (await master.api.get(`${base()}/scenes/${boat.hold_scene_id}`).expect(200)).body;
    expect(hold.parent_scene_id).toBe(boat.deck_scene_id);
    // jogador ve o barco e o convés (interior da cena no ar)
    expect((await player.api.get(`${base()}/boats`).expect(200)).body.boats.map((b) => b.id)).toContain(boat.id);
    expect((await player.api.get(`${base()}/scenes`).expect(200)).body.map((s) => s.id)).toContain(boat.deck_scene_id);
  });

  it('jogador sobe perto do barco; mestre desembarca e embarca todos; porão e convés', async () => {
    await player.api.patch(`${base()}/tokens/${tok.id}`, { x: 0, y: 0 }).expect(200);
    expect((await player.api.post(`${base()}/boats/${boat.id}/board`).expect(409)).body.message).toBe('Chegue mais perto do barco.');
    await player.api.patch(`${base()}/tokens/${tok.id}`, { x: 5 * 70, y: 4 * 70 }).expect(200);
    const { body: boarded } = await player.api.post(`${base()}/boats/${boat.id}/board`).expect(200);
    expect(boarded.sceneId).toBe(boat.deck_scene_id);
    expect((await tokenScene()).sceneId).toBe(boat.deck_scene_id);
    // so o mestre embarca outros e escolhe quem desce
    await other.api.post(`${base()}/boats/${boat.id}/embark`).expect(403);
    const { body: down } = await master.api.post(`${base()}/boats/${boat.id}/disembark`).expect(200);
    expect(down.sceneId).toBe(port.id);
    const landed = await tokenScene();
    expect(landed.sceneId).toBe(port.id);
    expect(PORT.layers.ground[landed.y][landed.x]).toBe('.');
    const { body: up } = await master.api.post(`${base()}/boats/${boat.id}/embark`).expect(200);
    expect(up.tokens.map((t) => t.id)).toEqual([tok.id]);
    await player.api.post(`${base()}/boats/${boat.id}/below`).expect(200);
    expect((await tokenScene()).sceneId).toBe(boat.hold_scene_id);
    await player.api.post(`${base()}/boats/${boat.id}/above`).expect(200);
    expect((await tokenScene()).sceneId).toBe(boat.deck_scene_id);
  });

  it('viagem: zarpa para o mar, anda, pausa, e ao chegar todos descem no porto do destino', async () => {
    const route = [{ x: 1, y: 6 }, { x: 15, y: 3 }, { x: 28, y: 6 }];
    await player.api.post(`${base()}/boats/${boat.id}/voyage`, { seaSceneId: sea.id, toSceneId: island.id }).expect(403);
    await master.api.post(`${base()}/boats/${boat.id}/voyage`, { seaSceneId: sea.id, toSceneId: island.id, toPortId: 'nada' }).expect(404);
    const { body: started } = await master.api.post(`${base()}/boats/${boat.id}/voyage`, { seaSceneId: sea.id, toSceneId: island.id, toPortId: 'praia', route, speed: 20 }).expect(201);
    expect(started.boat).toMatchObject({ home_scene_id: sea.id, x: 1, y: 6 });
    expect(started.voyage).toMatchObject({ status: 'sailing', from_scene_id: port.id, from_port: 'cais', to_port: 'praia' });
    await master.api.post(`${base()}/boats/${boat.id}/voyage`, { seaSceneId: sea.id, toSceneId: island.id }).expect(409);
    // no mar: o jogador ve o mar e o convés; ninguem desce nem sobe
    const scenes = (await player.api.get(`${base()}/scenes`).expect(200)).body.map((s) => s.id);
    expect(scenes).toEqual(expect.arrayContaining([sea.id, boat.deck_scene_id, boat.hold_scene_id]));
    expect((await player.api.get(`${base()}/scenes/mine`).expect(200)).body.sceneId).toBe(boat.deck_scene_id);
    expect((await master.api.post(`${base()}/boats/${boat.id}/disembark`).expect(409)).body.message).toMatch(/no mar/);
    expect((await player.api.post(`${base()}/boats/${boat.id}/disembark`).expect(409)).body.message).toBe('O barco está no mar.');
    await new Promise((r) => setTimeout(r, 250));
    const { body: paused } = await master.api.patch(`${base()}/voyages/${started.voyage.id}`, { status: 'paused' }).expect(200);
    expect(paused.progress).toBeGreaterThan(0.05);
    expect(paused.progress).toBeLessThan(1);
    await new Promise((r) => setTimeout(r, 150));
    const listed = (await player.api.get(`${base()}/boats`).expect(200)).body.voyages.find((v) => v.id === started.voyage.id);
    expect(listed.progress).toBeCloseTo(paused.progress, 5);
    await player.api.patch(`${base()}/voyages/${started.voyage.id}`, { status: 'sailing' }).expect(403);

    const { body: arrived } = await master.api.post(`${base()}/voyages/${started.voyage.id}/arrive`).expect(200);
    expect(arrived).toMatchObject({ sceneId: island.id, landed: 1 });
    expect(arrived.boat.home_scene_id).toBe(island.id);
    expect(ISLAND.layers.ground[arrived.boat.y][arrived.boat.x]).toMatch(/[~ó]/);
    const where = await tokenScene();
    expect(where.sceneId).toBe(island.id);
    expect(ISLAND.layers.ground[where.y][where.x]).toBe('.');
    expect((await player.api.get(`${base()}/scenes`).expect(200)).body.find((s) => s.is_active).id).toBe(island.id);
    expect((await player.api.get(`${base()}/boats`).expect(200)).body.voyages).toEqual([]);
    await master.api.post(`${base()}/voyages/${started.voyage.id}/arrive`).expect(409);
  });

  it('modo pedir: subir no barco vira pedido; aprovado, o servidor embarca', async () => {
    await master.api.put(`${base()}/rules`, { actions: { doors: 'pedir' } }).expect(200);
    const near = (await master.api.get(`${base()}/boats`).expect(200)).body.boats.find((b) => b.id === boat.id);
    await master.api.patch(`${base()}/tokens/${tok.id}`, { x: (near.x - 1) * 70, y: near.y * 70 }).expect(200);
    const { body: asked } = await player.api.post(`${base()}/boats/${boat.id}/board`).expect(202);
    expect(asked.request.summary).toBe('Maré quer subir no barco Gaivota');
    expect((await tokenScene()).sceneId).toBe(island.id);
    const { body: done } = await master.api.post(`${base()}/action-requests/${asked.request.id}`, { decision: 'approve' }).expect(200);
    expect(done.result.sceneId).toBe(boat.deck_scene_id);
    expect((await tokenScene()).sceneId).toBe(boat.deck_scene_id);
    // voltar ao porto de origem: o barco volta para o cais com a gente a bordo
    const { body: v } = await master.api.post(`${base()}/boats/${boat.id}/voyage`, { seaSceneId: sea.id, toSceneId: port.id, paused: true }).expect(201);
    const { body: back } = await master.api.post(`${base()}/voyages/${v.voyage.id}/return`).expect(200);
    expect(back.boat.home_scene_id).toBe(island.id);
    expect((await tokenScene()).sceneId).toBe(boat.deck_scene_id);
    expect((await master.api.delete(`${base()}/boats/${boat.id}`).expect(409)).body.message).toMatch(/a bordo/);
    await master.api.post(`${base()}/boats/${boat.id}/disembark`).expect(200);
    await master.api.delete(`${base()}/boats/${boat.id}`).expect(204);
    await master.api.get(`${base()}/scenes/${boat.deck_scene_id}`).expect(404);
  });
});
