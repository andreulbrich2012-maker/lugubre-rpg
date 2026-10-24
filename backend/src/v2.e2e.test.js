import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { pool } from './db/pool.js';
import { parseRulebook, seedRules } from './db/seedRules.js';
import { dracmasToCoins, playerTiles, validateTiles } from './utils/tiles.js';
import { inventoryLimits, normalizeRules } from './utils/tableRules.js';

const app = createApp();
const hasDb = Boolean(process.env.DATABASE_URL);
const bookPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/livro/livro-0.5-beta-v2.md');

const as = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url, body = {}) => request(app).post(url).set('Authorization', `Bearer ${token}`).send(body),
  put: (url, body = {}) => request(app).put(url).set('Authorization', `Bearer ${token}`).send(body),
  patch: (url, body = {}) => request(app).patch(url).set('Authorization', `Bearer ${token}`).send(body),
  del: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`)
});

async function register(label) {
  const email = `v2-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@lugubre.local`;
  const { body } = await request(app).post('/api/auth/register').send({ name: `V2 ${label}`, email, password: 'Teste123!' }).expect(201);
  return { token: body.token, user: body.user, api: as(body.token) };
}

async function createCharacter(api, name) {
  const [races, classes, origins] = await Promise.all(['races', 'classes', 'origins'].map((type) => request(app).get(`/api/catalog/${type}`)));
  const { body } = await api.post('/api/characters', {
    playerName: 'Jogador', characterName: name, raceId: races.body[0].id, classId: classes.body[0].id, originId: origins.body[0].id,
    lifeCurrent: 30, lifeMax: 30, sanityCurrent: 20, sanityMax: 20, mana: 10, manaMax: 10, defense: 10, inventory: []
  }).expect(201);
  return body;
}

let master;
let player;
let other;
let campaign;
let playerCharacter;
const base = () => `/api/campaigns/${campaign.id}`;

async function eventsAfter(api, cursor) {
  const { body } = await api.get(`${base()}/events?after=${cursor}`).expect(200);
  return body.events;
}

describe('utilitarios v2 (sem banco)', () => {
  it('valida itens e construcoes do mapa e troca dracmas em moedas', () => {
    const base4 = { cols: 4, rows: 4, layers: { ground: ['....', '....', '....', '....'] } };
    const ok = validateTiles({ ...base4, items: [{ id: 'a', x: 3, y: 3, name: 'Chave' }], buildings: [{ id: 'b', x: 0, y: 0, w: 4, h: 4, roof: 'palha' }], light: 'noite' });
    expect(ok.items[0]).toMatchObject({ quantity: 1, weight: 0, category: 'Achados' });
    expect(ok.light).toBe('noite');
    expect(() => validateTiles({ ...base4, items: [{ id: 'a', x: 4, y: 0, name: 'Fora' }] })).toThrow(/fora do mapa/);
    expect(() => validateTiles({ ...base4, items: [{ id: 'a', x: 0, y: 0, name: 'A' }, { id: 'a', x: 1, y: 0, name: 'B' }] })).toThrow(/repetidos/);
    expect(() => validateTiles({ ...base4, buildings: [{ id: 'b', x: 2, y: 0, w: 3, h: 3 }] })).toThrow(/fora do mapa/);
    expect(() => validateTiles({ ...base4, items: [{ id: 'a', x: 0, y: 0, name: 'A', quantity: 0 }] })).toThrow(/quantity/);
    expect(dracmasToCoins(623)).toEqual({ gold: 1, platinum: 1, silver: 2, bronze: 3 });
  });

  it('recipientes no mapa, regras de inventario e o peso espelhado do front', async () => {
    const base4 = { cols: 4, rows: 4, layers: { ground: ['....', '....', '....', '....'] } };
    const bau = { id: 'bau', x: 1, y: 1, name: 'Baú', locked: true, contents: [{ id: 'c1', name: 'Anel', note: 'x', contents: [{ id: 'z', name: 'Nada' }] }] };
    const ok = validateTiles({ ...base4, items: [bau] });
    expect(ok.items[0]).toMatchObject({ container: true, locked: true });
    expect(ok.items[0].contents[0]).not.toHaveProperty('contents'); // 1 nivel so
    expect(playerTiles(ok).items[0].contents).toEqual([]); // trancado: jogador nao ve o que tem dentro
    expect(playerTiles({ items: [{ ...ok.items[0], locked: false }] }).items[0].contents[0]).not.toHaveProperty('note');
    const many = Array.from({ length: 31 }, (_, i) => ({ id: `c${i}`, name: 'Moeda' }));
    expect(() => validateTiles({ ...base4, items: [{ ...bau, contents: many }] })).toThrow(/30 itens/);
    expect(() => validateTiles({ ...base4, items: [{ ...bau, contents: [{ id: 'a', name: 'A' }, { id: 'a', name: 'B' }] }] })).toThrow(/repetidos/);
    const rules = normalizeRules({ inventory: { maxWeight: 32 }, players: { 'e1c8d6a2-0000-4000-8000-000000000000': { inventory: { maxItems: 3 } } } });
    expect(inventoryLimits(rules, 'e1c8d6a2-0000-4000-8000-000000000000')).toEqual({ maxWeight: 32, maxItems: 3 });
    const here = path.dirname(fileURLToPath(import.meta.url));
    const [back, front] = await Promise.all([
      fs.readFile(path.join(here, 'utils/itemWeight.js'), 'utf8'),
      fs.readFile(path.resolve(here, '../../frontend/src/lib/itemWeight.js'), 'utf8')
    ]);
    expect(back).toBe(front);
  });

  it('separa o livro em secoes com slugs sem acento e desambigua so os repetidos', async () => {
    const sections = parseRulebook(await fs.readFile(bookPath, 'utf8'));
    const slugs = sections.map((section) => section.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of ['sobre-esta-edicao', 'bem-vindo-a-lugubre', 'o-mundo-de-lugubre', 'criacao-de-personagem', 'regras-do-sistema', 'magias-e-poderes', 'equipamentos', 'criaturas', 'guia-do-mestre', 'referencia-e-desenvolvimento', 'caos', 'gaia', 'ponto', 'erebo', 'nix', 'tartaro', 'eter', 'ananque', 'elementos-caos']) {
      expect(slugs).toContain(slug);
    }
    const root = sections[0];
    expect(root.slug).toBe('sobre-esta-edicao');
    expect(root.body_md).toContain('Este documento reorganiza');
    // capitulares juntas ao paragrafo (nada de "E" sozinho numa linha)
    expect(sections.some((section) => /\n[A-ZÁÉÍÓÚÂÊÔÃÕ]\n/.test(`\n${section.body_md}\n`))).toBe(false);
  });
});

describe.skipIf(!hasDb)('API v2 com Postgres', () => {
  beforeAll(async () => {
    [master, player, other] = await Promise.all([register('mestre'), register('jogador'), register('outro')]);
    ({ body: campaign } = await master.api.post('/api/campaigns', { name: 'Mesa V2', description: 'teste' }).expect(201));
    playerCharacter = await createCharacter(player.api, 'Heroína V2');
    await player.api.post('/api/campaigns/join', { inviteCode: campaign.invite_code, characterId: playerCharacter.id }).expect(200);
    await other.api.post('/api/campaigns/join', { inviteCode: campaign.invite_code }).expect(200);
  });

  it('feed: cursor, mensagens, rolagem secreta so para o mestre e ids invalidos', async () => {
    const { body: start } = await player.api.get(`${base()}/events`).expect(200);
    expect(typeof start.cursor).toBe('number');

    const { body: message } = await player.api.post(`${base()}/messages`, { content: 'Olá mesa' }).expect(201);
    await master.api.post(`${base()}/rolls`, { formula: '1d20+2', label: 'Furtividade do vilão', secret: true }).expect(201);
    await player.api.post(`${base()}/rolls`, { formula: '1d6', secret: true }).expect(403);
    await player.api.put(`${base()}/messages/${message.id}`, { content: 'Olá mesa!' }).expect(200);

    const playerEvents = await eventsAfter(player.api, start.cursor);
    expect(playerEvents.map((event) => event.type)).toEqual(expect.arrayContaining(['message:created', 'message:updated']));
    expect(playerEvents.some((event) => event.type === 'roll')).toBe(false);
    const masterEvents = await eventsAfter(master.api, start.cursor);
    expect(masterEvents.find((event) => event.type === 'roll').payload.label).toBe('Furtividade do vilão');

    const { body: light } = await player.api.get(`${base()}?light=1`).expect(200);
    expect(light.messages).toBeUndefined();
    expect(light.members.length).toBe(3);
    const { body: newer } = await player.api.get(`${base()}/messages?after=${encodeURIComponent(new Date(Date.now() - 60_000).toISOString())}`).expect(200);
    expect(newer.some((item) => item.id === message.id)).toBe(true);

    await master.api.get('/api/campaigns/nao-e-uuid').expect(404);
    await master.api.get('/api/campaigns/nao-e-uuid/events').expect(404);
    await request(app).get(`${base()}/events`).expect(401);
  });

  it('notas: privada, do mestre e do grupo com permissoes certas', async () => {
    const { body: privateNote } = await player.api.post(`${base()}/notes`, { title: 'Segredo', body: 'só meu', scope: 'private' }).expect(201);
    const { body: masterNote } = await player.api.post(`${base()}/notes`, { title: 'Para o mestre', scope: 'master' }).expect(201);
    const { body: partyNote } = await player.api.post(`${base()}/notes`, { title: 'Grupo', scope: 'party', pinned: 'true' }).expect(201);
    expect(partyNote.pinned).toBe(true);

    const masterSees = (await master.api.get(`${base()}/notes`).expect(200)).body.map((note) => note.id);
    expect(masterSees).toEqual(expect.arrayContaining([masterNote.id, partyNote.id]));
    expect(masterSees).not.toContain(privateNote.id);
    const otherSees = (await other.api.get(`${base()}/notes`).expect(200)).body.map((note) => note.id);
    expect(otherSees).toEqual([partyNote.id]);

    await other.api.patch(`${base()}/notes/${partyNote.id}`, { title: 'invadido' }).expect(403);
    await other.api.del(`${base()}/notes/${partyNote.id}`).expect(403);
    await master.api.del(`${base()}/notes/${privateNote.id}`).expect(404);
    await player.api.patch(`${base()}/notes/${privateNote.id}`, { body: 'x'.repeat(20001) }).expect(400);
    await master.api.del(`${base()}/notes/${partyNote.id}`).expect(204);
  });

  it('mestre ve a ficha completa compartilhada e ajusta vida limitando ao maximo', async () => {
    const { body: sheet } = await master.api.get(`${base()}/characters/${playerCharacter.id}`).expect(200);
    expect(sheet.character_name).toBe('Heroína V2');
    expect(Array.isArray(sheet.skills_catalog)).toBe(true);
    expect(sheet.dodge).toBeTypeOf('number');
    await other.api.get(`${base()}/characters/${playerCharacter.id}`).expect(403);

    const { body: vitals } = await master.api.patch(`${base()}/characters/${playerCharacter.id}/vitals`, { life_current: 999, sanity_current: -5 }).expect(200);
    expect(vitals.life_current).toBe(vitals.life_max);
    expect(vitals.sanity_current).toBe(0);
    await other.api.patch(`${base()}/characters/${playerCharacter.id}/vitals`, { life_current: 1 }).expect(403);

    const { body: shared } = await player.api.put(`${base()}/members/me/character`, { characterId: playerCharacter.id }).expect(200);
    expect(shared.notice).toBe('Personagem compartilhado com o mestre.');
  });

  it('mesa: cenas, tokens ocultos, PV escondido, acerto e combate por turnos', async () => {
    const { body: scene } = await master.api.post(`${base()}/scenes`, { name: 'Cripta', grid_size: 70, movement_per_turn: 6 }).expect(201);
    expect(scene.move_mode).toBe('free');
    expect(scene.show_grid).toBe(false);
    await master.api.post(`${base()}/scenes`, { name: 'Rascunho' }).expect(201);
    await master.api.post(`${base()}/scenes/${scene.id}/activate`).expect(200);
    const playerScenes = (await player.api.get(`${base()}/scenes`).expect(200)).body;
    expect(playerScenes.map((item) => item.id)).toEqual([scene.id]);
    await player.api.post(`${base()}/scenes`, { name: 'x' }).expect(403);

    await master.api.patch(`${base()}/scenes/${scene.id}`, { map_kind: 'tiles', tiles: { cols: 4, rows: 4, layers: { ground: ['....', '....', '....', '...'] } } }).expect(400);
    await master.api.patch(`${base()}/scenes/${scene.id}`, { map_kind: 'tiles', tiles: { cols: 4, rows: 4, layers: { ground: ['....', '.##.', '.##.', '....'] } } }).expect(200);

    const monster = (await master.api.get('/api/monsters').expect(200)).body[0];
    const { body: npc } = await master.api.post(`${base()}/npcs/from-monster/${monster.id}`).expect(201);
    expect(npc.hp_max).toBe(monster.base_health);
    await player.api.get(`${base()}/npcs`).expect(403);

    const { body: visibleMonster } = await master.api.post(`${base()}/scenes/${scene.id}/tokens`, { kind: 'monster', npcId: npc.id, x: 0, y: 0 }).expect(201);
    await master.api.post(`${base()}/scenes/${scene.id}/tokens`, { kind: 'monster', npcId: npc.id, hidden: true, x: 70, y: 0 }).expect(201);
    const { body: playerToken } = await player.api.post(`${base()}/scenes/${scene.id}/tokens`, { kind: 'character', x: 140, y: 140 }).expect(201);
    expect(playerToken.hp_max).toBe(30);
    await player.api.post(`${base()}/scenes/${scene.id}/tokens`, { kind: 'character' }).expect(409);
    await player.api.post(`${base()}/scenes/${scene.id}/tokens`, { kind: 'marker' }).expect(403);

    const playerTokens = (await player.api.get(`${base()}/scenes/${scene.id}/tokens`).expect(200)).body;
    expect(playerTokens).toHaveLength(2);
    expect(playerTokens.find((token) => token.id === visibleMonster.id).hp_current).toBeNull();
    expect((await other.api.get(`${base()}/scenes/${scene.id}/tokens`).expect(200)).body.find((token) => token.id === playerToken.id).hp_current).toBeNull();
    expect((await master.api.get(`${base()}/scenes/${scene.id}/tokens`).expect(200)).body).toHaveLength(3);

    // modo preparacao: so o mestre move
    await player.api.patch(`${base()}/tokens/${playerToken.id}`, { x: 210 }).expect(409);
    await player.api.patch(`${base()}/tokens/${playerToken.id}`, { name: 'Outro' }).expect(403);
    await master.api.patch(`${base()}/scenes/${scene.id}`, { mode: 'exploration' }).expect(200);
    await player.api.patch(`${base()}/tokens/${playerToken.id}`, { x: 210, y: 140 }).expect(200);
    await player.api.patch(`${base()}/tokens/${visibleMonster.id}`, { x: 1 }).expect(404);

    // acerto: jogadores nao veem dano nem PV; mestre e dono veem
    const { body: cursor } = await player.api.get(`${base()}/events`).expect(200);
    await master.api.post(`${base()}/tokens/${visibleMonster.id}/hit`, { amount: 3, outcome: 'hit' }).expect(200);
    await master.api.post(`${base()}/tokens/${playerToken.id}/hit`, { amount: 5, outcome: 'hit' }).expect(200);
    await player.api.post(`${base()}/tokens/${playerToken.id}/hit`, { amount: 5, outcome: 'hit' }).expect(403);
    const otherHits = (await eventsAfter(other.api, cursor.cursor)).filter((event) => event.type === 'token:hit');
    expect(otherHits).toHaveLength(2);
    for (const event of otherHits) {
      expect(event.payload.amount).toBeUndefined();
      expect(event.payload.hp_current).toBeUndefined();
    }
    const ownerHit = (await eventsAfter(player.api, cursor.cursor)).find((event) => event.type === 'token:hit' && event.payload.view === 'owner');
    expect(ownerHit.payload).toMatchObject({ amount: 5, life_current: 25 });
    const masterHit = (await eventsAfter(master.api, cursor.cursor)).find((event) => event.type === 'token:hit' && event.payload.view === 'master' && event.payload.tokenId === visibleMonster.id);
    expect(masterHit.payload.hp_current).toBe(monster.base_health - 3);

    // combate: monstro primeiro, depois o jogador
    await master.api.post(`${base()}/scenes/${scene.id}/combat/start`, {
      initiative: [{ tokenId: playerToken.id, value: 5 }, { tokenId: visibleMonster.id, value: 18 }]
    }).expect(200);
    await player.api.patch(`${base()}/tokens/${playerToken.id}`, { x: 280 }).expect(409);
    await player.api.post(`${base()}/rolls`, { formula: '1d20+1', kind: 'attack' }).expect(409);
    await player.api.post(`${base()}/scenes/${scene.id}/combat/end-turn`).expect(409);
    await player.api.post(`${base()}/rolls`, { formula: '1d4', kind: 'free' }).expect(201);

    const { body: turn } = await master.api.post(`${base()}/scenes/${scene.id}/combat/next`).expect(200);
    expect(turn.turn_state.tokenId).toBe(playerToken.id);
    await player.api.patch(`${base()}/tokens/${playerToken.id}`, { x: 210 + 140, y: 140 }).expect(200); // 2 passos
    await player.api.patch(`${base()}/tokens/${playerToken.id}`, { x: 350, y: 140 + 210 }).expect(200); // +3 = 5
    await player.api.patch(`${base()}/tokens/${playerToken.id}`, { x: 350 + 140, y: 350 }).expect(409); // 7 > 6
    await player.api.post(`${base()}/rolls`, { formula: '1d6', kind: 'damage' }).expect(409);
    await player.api.post(`${base()}/rolls`, { kind: 'skill', characterId: playerCharacter.id, skill: 'Luta' }).expect(201)
      .then(({ body }) => expect(body.formula).toMatch(/^1d20\+\d+$/));
    await player.api.post(`${base()}/rolls`, { formula: '1d20', kind: 'attack' }).expect(409);

    const { body: wrapped } = await player.api.post(`${base()}/scenes/${scene.id}/combat/end-turn`).expect(200);
    expect(wrapped.round).toBe(2);
    expect(wrapped.turn_index).toBe(0);
    const { body: again } = await master.api.post(`${base()}/scenes/${scene.id}/combat/next`).expect(200);
    expect(again.turn_state).toMatchObject({ tokenId: playerToken.id, moved: 0, action_used: false });
    await player.api.post(`${base()}/rolls`, { formula: '1d20+2', kind: 'attack', targetTokenId: visibleMonster.id }).expect(201)
      .then(({ body }) => expect(body.targetName).toBe(npc.name));
    await player.api.post(`${base()}/rolls`, { formula: '1d8', kind: 'damage' }).expect(201);
    await player.api.post(`${base()}/rolls`, { formula: '1d8', kind: 'damage' }).expect(409);

    const combatEvents = (await eventsAfter(other.api, cursor.cursor)).filter((event) => event.type === 'combat');
    expect(combatEvents.length).toBeGreaterThan(0);
    expect(combatEvents.at(-1).payload.initiative.every((entry) => entry.tokenId !== undefined)).toBe(true);
    const { body: ended } = await master.api.post(`${base()}/scenes/${scene.id}/combat/end`).expect(200);
    expect(ended.mode).toBe('exploration');

    const messages = (await player.api.get(`${base()}/messages`).expect(200)).body;
    expect(messages.some((item) => item.message_type === 'roll' && item.meta?.kind === 'damage')).toBe(true);
    await master.api.post(`${base()}/ping`, { x: 10, y: 20, sceneId: scene.id }).expect(201);
  });

  it('itens do mapa: pegar, longe, duas pessoas ao mesmo tempo, preparacao e combate', async () => {
    const { body: scene } = await master.api.post(`${base()}/scenes`, { name: 'Armazém', grid_size: 70 }).expect(201);
    await master.api.post(`${base()}/scenes/${scene.id}/activate`).expect(200);
    const ground = ['......', '......', '......', '......', '......', '......'];
    const items = [
      { id: 'pocao', x: 1, y: 1, name: 'Poção de cura', quantity: 2, weight: 0.5, category: 'Poções' },
      { id: 'longe', x: 5, y: 5, name: 'Adaga enferrujada', category: 'Armas' },
      { id: 'bolsa', x: 1, y: 0, name: 'Bolsa de moedas', dracmas: 523 },
      { id: 'erva', x: 2, y: 1, name: 'Erva-de-sangue', category: 'Ingredientes' },
      { id: 'osso', x: 0, y: 1, name: 'Osso entalhado' }
    ];
    await master.api.patch(`${base()}/scenes/${scene.id}`, { map_kind: 'tiles', tiles: { cols: 6, rows: 6, layers: { ground }, items: [{ id: 'x', x: 9, y: 0, name: 'Fora' }] } }).expect(400);
    await master.api.patch(`${base()}/scenes/${scene.id}`, { map_kind: 'tiles', tiles: { cols: 6, rows: 6, layers: { ground }, items } }).expect(200);
    const { body: token } = await player.api.post(`${base()}/scenes/${scene.id}/tokens`, { kind: 'character', x: 0, y: 0 }).expect(201);
    const pickup = (api, itemId, extra = {}) => api.post(`${base()}/scenes/${scene.id}/pickup`, { itemId, ...extra });

    expect((await pickup(player.api, 'pocao').expect(409)).body.message).toBe('A mesa está em preparação.');
    await master.api.patch(`${base()}/scenes/${scene.id}`, { mode: 'exploration' }).expect(200);
    expect((await pickup(player.api, 'longe').expect(409)).body.message).toBe('Chegue mais perto para pegar.');
    await other.api.post(`${base()}/scenes/${scene.id}/pickup`, { itemId: 'pocao' }).expect(409); // sem personagem no mapa

    const { body: cursor } = await player.api.get(`${base()}/events`).expect(200);
    const both = await Promise.all([pickup(player.api, 'pocao'), pickup(player.api, 'pocao')]);
    expect(both.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(both.find((r) => r.status === 409).body.message).toBe('Já pegaram esse item.');
    const got = both.find((r) => r.status === 201).body;
    expect(got.character.inventory.filter((entry) => entry.name === 'Poção de cura')).toHaveLength(1);
    expect(got.character.inventory.at(-1)).toMatchObject({ quantity: 2, weight: 0.5, category: 'Poções', defenseBonus: 0 });

    const { body: money } = await pickup(player.api, 'bolsa').expect(201);
    expect(money.received).toMatchObject({ kind: 'dracmas', dracmas: 523 });
    expect(money.character.wallet).toMatchObject({ gold: 1, silver: 2, bronze: 3 });
    const sheet = (await player.api.get(`${base()}/characters/${playerCharacter.id}`).expect(200)).body;
    expect(sheet.inventory.some((entry) => entry.name === 'Poção de cura')).toBe(true);
    expect(sheet.wallet_total_dracmas).toBeGreaterThanOrEqual(523);

    const sceneNow = (await player.api.get(`${base()}/scenes/${scene.id}`).expect(200)).body;
    expect(sceneNow.tiles.items.map((entry) => entry.id)).toEqual(['longe', 'erva', 'osso']);
    const events = await eventsAfter(other.api, cursor.cursor);
    expect(events.filter((event) => event.type === 'scene:updated' && event.payload.changed?.includes('items')).at(-1).payload.items).toHaveLength(3);
    expect(events.some((event) => event.type === 'message:created' && event.payload.message.content === 'Heroína V2 pegou Poção de cura ×2')).toBe(true);
    expect(events.some((event) => event.type === 'character:updated')).toBe(true);

    // combate: so no proprio turno e gasta a acao
    await player.api.patch(`${base()}/tokens/${token.id}`, { x: 70, y: 0 }).expect(200);
    const { body: rat } = await master.api.post(`${base()}/npcs`, { name: 'Rato', kind: 'monster', hp_max: 3 }).expect(201);
    const { body: ratToken } = await master.api.post(`${base()}/scenes/${scene.id}/tokens`, { kind: 'monster', npcId: rat.id, x: 280, y: 280 }).expect(201);
    await master.api.post(`${base()}/scenes/${scene.id}/combat/start`, { initiative: [{ tokenId: ratToken.id, value: 20 }, { tokenId: token.id, value: 5 }] }).expect(200);
    expect((await pickup(player.api, 'erva').expect(409)).body.message).toBe('Não é o seu turno.');
    await master.api.post(`${base()}/scenes/${scene.id}/combat/next`).expect(200);
    await pickup(player.api, 'erva').expect(201);
    const combatScene = (await master.api.get(`${base()}/scenes/${scene.id}`).expect(200)).body;
    expect(combatScene.turn_state.action_used).toBe(true);
    expect((await pickup(player.api, 'osso').expect(409)).body.message).toBe('Você já usou sua ação neste turno.');

    // mestre entrega em nome do personagem (sem conferir distancia)
    await pickup(master.api, 'longe').expect(400);
    await pickup(master.api, 'longe', { characterId: playerCharacter.id }).expect(201);
    await master.api.post(`${base()}/scenes/${scene.id}/combat/end`).expect(200);
  });

  it('inventario limitado pelo mestre e recipientes (mochila, bau) no mapa', async () => {
    const { body: scene } = await master.api.post(`${base()}/scenes`, { name: 'Cripta', grid_size: 70 }).expect(201);
    await master.api.post(`${base()}/scenes/${scene.id}/activate`).expect(200);
    const ground = ['......', '......', '......', '......', '......', '......'];
    const items = [
      { id: 'mochila', x: 1, y: 1, name: 'Mochila', weight: 1, container: true, contents: [
        { id: 'pao', name: 'Pão', quantity: 2 }, { id: 'moedas', name: 'Moedas', dracmas: 12 }, { id: 'corda', name: 'Corda', weight: 1 }
      ] },
      { id: 'bau', x: 1, y: 1, name: 'Baú de ferro', pickable: false, locked: true, contents: [{ id: 'anel', name: 'Anel de prata', note: 'amaldiçoado' }] },
      { id: 'escondida', x: 1, y: 1, name: 'Bolsa oculta', hidden: true, container: true, contents: [{ id: 'gema', name: 'Rubi' }] },
      { id: 'placas', x: 0, y: 1, name: 'Armadura de placas' }
    ];
    await master.api.patch(`${base()}/scenes/${scene.id}`, { map_kind: 'tiles', tiles: { cols: 6, rows: 6, layers: { ground }, items }, mode: 'exploration' }).expect(200);
    const seen = (await player.api.get(`${base()}/scenes/${scene.id}`).expect(200)).body.tiles.items;
    expect(seen.map((it) => it.id)).toEqual(['mochila', 'bau', 'placas']);
    expect(seen.find((it) => it.id === 'bau').contents).toEqual([]);
    const { body: tok } = await player.api.post(`${base()}/scenes/${scene.id}/tokens`, { kind: 'character', x: 70, y: 70 }).expect(201);
    const pick = (body) => player.api.post(`${base()}/scenes/${scene.id}/pickup`, body);
    const sheet = async () => (await player.api.get(`${base()}/characters/${playerCharacter.id}`).expect(200)).body;
    const startCount = (await sheet()).inventory.length;

    // trancado e escondido: nada feito
    expect((await pick({ itemId: 'bau', contentId: 'anel' }).expect(409)).body.message).toBe('Está trancado.');
    expect((await pick({ itemId: 'escondida', contentId: 'gema' }).expect(409)).body.message).toBe('Já pegaram esse item.');

    // limites do mestre: peso (armadura de placas pesa 20 kg) e quantidade de itens
    const startWeight = (await sheet()).inventory.reduce((sum, it) => sum + Number(it.weight || 0) * Number(it.quantity ?? 1), 0);
    await master.api.put(`${base()}/rules`, { inventory: { maxWeight: Math.floor(startWeight) + 5, maxItems: null } }).expect(200);
    expect((await player.api.get(`${base()}/rules`).expect(200)).body.inventory).toEqual({ maxWeight: Math.floor(startWeight) + 5, maxItems: null });
    expect((await pick({ itemId: 'placas' }).expect(409)).body.message).toBe(`Mochila cheia: passa do peso máximo (${Math.floor(startWeight) + 5} kg) que o mestre definiu.`);
    await master.api.put(`${base()}/rules`, { inventory: { maxItems: startCount, maxWeight: null }, players: { [player.user.id]: { inventory: { maxWeight: 1000 } } } }).expect(200);
    expect((await pick({ itemId: 'placas' }).expect(409)).body.message).toBe(`Mochila cheia: passa do máximo de ${startCount} itens que o mestre definiu.`);
    // dinheiro de dentro da mochila nao ocupa espaco: vai para a bolsa
    const { body: coins } = await pick({ itemId: 'mochila', contentId: 'moedas' }).expect(201);
    expect(coins.received).toMatchObject({ kind: 'dracmas', dracmas: 12 });
    // excecao do jogador: sem limite de itens so para ele
    await master.api.put(`${base()}/rules`, { inventory: { maxItems: startCount, maxWeight: null }, players: { [player.user.id]: { inventory: { maxItems: null } } } }).expect(200);
    const { body: armor } = await pick({ itemId: 'placas' }).expect(201);
    expect(armor.received).toMatchObject({ kind: 'item', name: 'Armadura de placas', weight: 20 });

    // tira um item de dentro: a mochila fica no mapa sem ele
    const { body: bread } = await pick({ itemId: 'mochila', contentId: 'pao' }).expect(201);
    expect(bread.received).toMatchObject({ name: 'Pão', quantity: 2, weight: 0.4 });
    expect((await pick({ itemId: 'mochila', contentId: 'pao' }).expect(409)).body.message).toBe('Já tiraram esse item daí.');
    const left = (await player.api.get(`${base()}/scenes/${scene.id}`).expect(200)).body.tiles.items.find((it) => it.id === 'mochila');
    expect(left.contents.map((c) => c.id)).toEqual(['corda']);

    // leva a mochila inteira: vira item da ficha com o que tem dentro
    const { body: bag } = await pick({ itemId: 'mochila' }).expect(201);
    expect(bag.received).toMatchObject({ kind: 'item', name: 'Mochila', weight: 1, container: true });
    expect(bag.received.contents.map((c) => c.name)).toEqual(['Corda']);
    const after = await sheet();
    expect(after.inventory.find((it) => it.container)?.contents).toHaveLength(1);
    // a ficha salva de novo mantem a mochila com o conteudo
    const { body: saved } = await player.api.patch(`/api/characters/${playerCharacter.id}/play`, { inventory: after.inventory }).expect(200);
    expect(saved.inventory.find((it) => it.container)?.contents[0]).toMatchObject({ name: 'Corda', weight: 1 });

    // bau nao pegavel: o mestre destranca e o jogador tira o anel (sem a nota do mestre)
    expect((await pick({ itemId: 'bau' }).expect(409)).body.message).toBe('Este item não pode ser pego.');
    await master.api.patch(`${base()}/scenes/${scene.id}/items/bau`, { locked: false }).expect(200);
    const { body: ring } = await pick({ itemId: 'bau', contentId: 'anel' }).expect(201);
    expect(ring.item).not.toHaveProperty('note');
    expect(ring.received).toMatchObject({ name: 'Anel de prata', weight: 0.02 });
    // o mestre poe itens num recipiente pelo popover
    await master.api.patch(`${base()}/scenes/${scene.id}/items/bau`, { contents: [{ id: 'adaga', name: 'Adaga' }] }).expect(200);
    const bauNow = (await master.api.get(`${base()}/scenes/${scene.id}`).expect(200)).body.tiles.items.find((it) => it.id === 'bau');
    expect(bauNow).toMatchObject({ container: true, contents: [{ id: 'adaga', name: 'Adaga' }] });
    await player.api.patch(`${base()}/tokens/${tok.id}`, { x: 350, y: 350 }).expect(200);
    expect((await pick({ itemId: 'bau', contentId: 'adaga' }).expect(409)).body.message).toBe('Chegue mais perto para pegar.');
    await master.api.put(`${base()}/rules`, {}).expect(200);
  });

  it('casas com interior, portas trancadas, regras do mestre e itens configuraveis', async () => {
    const { body: vila } = await master.api.post(`${base()}/scenes`, { name: 'Vila', grid_size: 70 }).expect(201);
    await master.api.post(`${base()}/scenes/${vila.id}/activate`).expect(200);
    const ground = ['........', '........', '........', '........', '........', '........', '........', '........'];
    const tiles = {
      cols: 8, rows: 8, layers: { ground },
      buildings: [{ id: 'casa', x: 2, y: 1, w: 4, h: 3, name: 'Casa', roof: 'telha', wall: 'madeira', locked: true }],
      items: [
        { id: 'secreto', x: 1, y: 6, name: 'Anel escondido', hidden: true, note: 'só o mestre sabe' },
        { id: 'pesado', x: 1, y: 6, name: 'Bigorna', pickable: false },
        { id: 'pao', x: 1, y: 6, name: 'Pão', note: 'nota secreta' }
      ]
    };
    await master.api.patch(`${base()}/scenes/${vila.id}`, { map_kind: 'tiles', tiles, mode: 'exploration' }).expect(200);
    // jogador nao recebe item escondido nem nota do mestre
    const seen = (await player.api.get(`${base()}/scenes/${vila.id}`).expect(200)).body.tiles.items;
    expect(seen.map((it) => it.id)).toEqual(['pesado', 'pao']);
    expect(seen.some((it) => 'note' in it)).toBe(false);
    expect((await master.api.get(`${base()}/scenes/${vila.id}`).expect(200)).body.tiles.items).toHaveLength(3);

    // token do jogador na frente da porta (porta = meio da parede de baixo: x 4, y 3)
    const { body: tok } = await player.api.post(`${base()}/scenes/${vila.id}/tokens`, { kind: 'character', x: 4 * 70, y: 4 * 70 }).expect(201);
    const enter = () => player.api.post(`${base()}/scenes/${vila.id}/buildings/casa/enter`, {});
    expect((await enter().expect(409)).body.message).toBe('A porta está trancada.');
    await master.api.patch(`${base()}/scenes/${vila.id}/buildings/casa`, { locked: false }).expect(200);
    expect((await enter().expect(409)).body.message).toBe('Esta construção ainda não tem interior.');
    const { body: interior } = await master.api.post(`${base()}/scenes/${vila.id}/buildings/casa/interior`).expect(201);
    expect(interior.parent_scene_id).toBe(vila.id);
    expect(interior.tiles.layers.ground.at(-1)).toContain('D');

    // regras: movimento travado so para este jogador
    await master.api.put(`${base()}/rules`, { players: { [player.user.id]: { move: false } } }).expect(200);
    expect((await enter().expect(403)).body.message).toBe('O mestre travou o movimento agora.');
    await player.api.patch(`${base()}/tokens/${tok.id}`, { x: 4 * 70 + 5 }).expect(403);
    await master.api.put(`${base()}/rules`, {}).expect(200);

    const cursor = (await player.api.get(`${base()}/events`).expect(200)).body.cursor;
    const { body: inside } = await enter().expect(200);
    expect(inside.sceneId).toBe(interior.id);
    const moved = await eventsAfter(player.api, cursor);
    expect(moved.some((event) => event.type === 'token:scene' && event.payload.to === interior.id)).toBe(true);
    // o jogador ve e anda no interior (nao e a cena no ar)
    await player.api.get(`${base()}/scenes/${interior.id}`).expect(200);
    const scenesForPlayer = (await player.api.get(`${base()}/scenes`).expect(200)).body.map((x) => x.id);
    expect(scenesForPlayer).toEqual(expect.arrayContaining([vila.id, interior.id]));
    await player.api.patch(`${base()}/tokens/${tok.id}`, { x: inside.token.x + 10 }).expect(200);
    // longe da porta de dentro nao sai; perto sai e volta para a frente da casa
    await player.api.patch(`${base()}/tokens/${tok.id}`, { x: 70, y: 70 }).expect(200);
    expect((await player.api.post(`${base()}/scenes/${interior.id}/exit`, {}).expect(409)).body.message).toBe('Chegue mais perto da porta.');
    const doorX = Math.floor(interior.tiles.cols / 2);
    await player.api.patch(`${base()}/tokens/${tok.id}`, { x: doorX * 70, y: (interior.tiles.rows - 2) * 70 }).expect(200);
    const { body: out } = await player.api.post(`${base()}/scenes/${interior.id}/exit`, {}).expect(200);
    expect(out.sceneId).toBe(vila.id);
    expect(out.token.y).toBe(4 * 70);

    // pegar: escondido e nao pegavel recusados; regra de pegar travada para todos
    const pick = (itemId) => player.api.post(`${base()}/scenes/${vila.id}/pickup`, { itemId });
    await player.api.patch(`${base()}/tokens/${tok.id}`, { x: 1 * 70, y: 6 * 70 }).expect(200);
    expect((await pick('secreto').expect(409)).body.message).toBe('Já pegaram esse item.');
    expect((await pick('pesado').expect(409)).body.message).toBe('Este item não pode ser pego.');
    await master.api.put(`${base()}/rules`, { pickup: false }).expect(200);
    expect((await pick('pao').expect(403)).body.message).toBe('O mestre não liberou pegar itens agora.');
    await master.api.put(`${base()}/rules`, {}).expect(200);
    await master.api.patch(`${base()}/scenes/${vila.id}/items/secreto`, { hidden: false }).expect(200);
    await pick('secreto').expect(201);

    // vez de alguem fora do combate e poderes travados
    const { body: npc } = await master.api.post(`${base()}/scenes/${vila.id}/tokens`, { kind: 'npc', name: 'Guarda', x: 0, y: 0 }).expect(201);
    await master.api.put(`${base()}/rules`, { turn: npc.id }).expect(200);
    expect((await player.api.patch(`${base()}/tokens/${tok.id}`, { x: 70 }).expect(409)).body.message).toBe('Agora é a vez de outro personagem.');
    await master.api.put(`${base()}/rules`, { turn: tok.id, powers: false }).expect(200);
    await player.api.patch(`${base()}/tokens/${tok.id}`, { x: 70 }).expect(200);
    expect((await player.api.post(`${base()}/rolls`, { formula: '1d20', kind: 'attack', characterId: playerCharacter.id }).expect(403)).body.message).toBe('O mestre travou poderes e ataques agora.');
    await player.api.post(`${base()}/rolls`, { formula: '1d20', kind: 'free' }).expect(201);
    expect((await player.api.get(`${base()}/rules`).expect(200)).body.actions.attack).toBe('travado');
    await master.api.put(`${base()}/rules`, {}).expect(200);
  });

  it('correcoes: compra sem personagem, booleanos, diario e erros sem vazar SQL', async () => {
    const { body: shop } = await master.api.post(`${base()}/shops`, { name: 'Oculta', category: 'Taverna', visibleToPlayers: 'false' }).expect(201);
    expect(shop.visible_to_players).toBe(false);
    const { body: openShop } = await master.api.post(`${base()}/shops`, { name: 'Aberta', category: 'Taverna' }).expect(201);
    const { body: item } = await master.api.post(`${base()}/shops/${openShop.id}/items`, { name: 'Pão', priceDracmas: 2, stock: 3, available: 'true' }).expect(201);
    await master.api.post(`${base()}/shops/${openShop.id}/items`, { name: 'Meio pão', stock: 1.5 }).expect(400);
    const noCharacter = await player.api.post(`${base()}/purchase-requests`, { itemId: item.id, quantity: 1 }).expect(400);
    expect(noCharacter.body.message).toBe('Escolha um personagem para comprar.');

    const { body: entry } = await player.api.post(`${base()}/diary`, { title: 'Dia 1', content: 'Chegamos', characterId: playerCharacter.id }).expect(201);
    const { body: edited } = await player.api.put(`${base()}/diary/${entry.id}`, { title: 'Dia 1!', content: 'Chegamos.' }).expect(200);
    expect(edited.character_id).toBe(playerCharacter.id);
    await other.api.del(`${base()}/diary/${entry.id}`).expect(404);
    await master.api.del(`${base()}/diary/${entry.id}`).expect(204);

    const bad = await master.api.put(`${base()}/shops/${openShop.id}`, { name: 'x' }).expect(400);
    expect(bad.body.message).toBe('Verifique os campos enviados.');
  });

  it('livro de regras: seed idempotente, leitura publica, busca sem acento e edicao protegida', async () => {
    const markdown = await fs.readFile(bookPath, 'utf8');
    await seedRules(pool, markdown);
    const second = await seedRules(pool, markdown);
    expect(second.inserted).toBe(0);

    const { body: index } = await request(app).get('/api/rules').expect(200);
    expect(index.meta.version).toBe('0.5 Beta');
    expect(index.sections[0].slug).toBe('sobre-esta-edicao');
    expect(index.sections.length).toBeGreaterThan(150);

    const { body: caos } = await request(app).get('/api/rules/caos').expect(200);
    expect(caos.body_md.length).toBeGreaterThan(20);
    expect(caos.prev.slug).toBe('os-oito-primordiais');
    expect(caos.next.slug).toBe('gaia');
    const { body: chapter } = await request(app).get('/api/rules/o-mundo-de-lugubre').expect(200);
    expect(chapter.children.length).toBeGreaterThan(5);
    await request(app).get('/api/rules/nao-existe').expect(404);

    const { body: search } = await request(app).get('/api/rules/search?q=erebo').expect(200);
    expect(search.results.some((result) => result.slug === 'erebo')).toBe(true);
    expect(search.results[0].snippet.length).toBeLessThanOrEqual(162);

    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'adm@lugubre.local', password: 'adm123' }).expect(200);
    const admin = as(adminLogin.body.token);
    await player.api.put(`/api/admin/rules/${caos.id}`, { title: 'x' }).expect(403);
    const { body: updated } = await admin.put(`/api/admin/rules/${caos.id}`, { title: caos.title, body_md: `${caos.body_md}\n\nNota do admin.` }).expect(200);
    expect(updated.section.body_md).toContain('Nota do admin.');
    expect((await seedRules(pool, markdown)).protected).toBeGreaterThanOrEqual(1);
    expect((await request(app).get('/api/rules/caos')).body.body_md).toContain('Nota do admin.');
    await seedRules(pool, markdown, { force: true });
    expect((await request(app).get('/api/rules/caos')).body.body_md).not.toContain('Nota do admin.');
    await admin.put('/api/admin/rules-meta', { version: '0.5 Beta' }).expect(200);
  });
  it('mestre edita a ficha compartilhada: vitais, atributos, inventario, mochila e permissoes', async () => {
    const url = `${base()}/master/characters/${playerCharacter.id}`;
    const { body: overview } = await master.api.get(`${base()}/master/characters`).expect(200);
    expect(overview.find((c) => c.id === playerCharacter.id)).toMatchObject({ character_name: 'Heroína V2', life_max: 30 });
    await player.api.get(`${base()}/master/characters`).expect(403);

    const { body: start } = await player.api.get(`${base()}/events`).expect(200);
    const { body: edited } = await master.api.patch(url, { lifeMax: 40, lifeCurrent: 35, attributes: { forca: 5, inventado: 9 }, level: 3, conditions: ['Envenenado'], notes: 'Deve 10 dracmas', wallet: { gold: 2 } }).expect(200);
    expect(edited.character).toMatchObject({ life_max: 40, life_current: 35, level: 3, conditions: ['Envenenado'], notes: 'Deve 10 dracmas', wallet_total_dracmas: 1000 });
    expect(edited.character.attributes.forca).toBe(5);
    expect(edited.character.attributes).not.toHaveProperty('inventado');
    expect((await master.api.patch(url, { lifeCurrent: 999 }).expect(200)).body.character.life_current).toBe(40);
    const playerEvents = await eventsAfter(player.api, start.cursor);
    expect(playerEvents.some((ev) => ev.type === 'character:updated' && ev.payload.characterId === playerCharacter.id)).toBe(true);
    expect(playerEvents.find((ev) => ev.type === 'character:master-edit').payload.summary).toMatch(/vida/);
    const { body: own } = await player.api.get(`/api/characters/${playerCharacter.id}`).expect(200);
    expect(own.life_max).toBe(40);

    // inventario: dar, guardar na mochila, tirar, editar, remover parte e tudo
    const { body: bag } = await master.api.post(`${url}/inventory`, { name: 'Mochila de couro', container: true, weight: 1 }).expect(201);
    const { body: rope } = await master.api.post(`${url}/inventory`, { name: 'Corda', quantity: 3 }).expect(201);
    expect(rope.item.weight).toBeGreaterThan(0); // peso sugerido pelo nome
    let { body: moved } = await master.api.post(`${url}/inventory/${rope.item.id}/move`, { containerId: bag.item.id }).expect(200);
    let inv = moved.character.inventory;
    expect(inv.find((it) => it.id === bag.item.id).contents.map((it) => it.id)).toEqual([rope.item.id]);
    expect(inv.some((it) => it.id === rope.item.id)).toBe(false);
    await master.api.post(`${url}/inventory/${bag.item.id}/move`, { containerId: bag.item.id }).expect(409);
    const { body: put } = await master.api.put(`${url}/inventory/${rope.item.id}`, { quantity: 5 }).expect(200);
    expect(put.character.inventory.find((it) => it.id === bag.item.id).contents[0]).toMatchObject({ name: 'Corda', quantity: 5 });
    ({ body: moved } = await master.api.post(`${url}/inventory/${rope.item.id}/move`, { containerId: null }).expect(200));
    inv = moved.character.inventory;
    expect(inv.find((it) => it.id === bag.item.id).contents).toEqual([]);
    expect(inv.find((it) => it.id === rope.item.id).quantity).toBe(5);
    expect((await master.api.del(`${url}/inventory/${rope.item.id}?quantity=2`).expect(200)).body.character.inventory.find((it) => it.id === rope.item.id).quantity).toBe(3);
    const { body: removed } = await master.api.del(`${url}/inventory/${rope.item.id}`).expect(200);
    expect(removed.character.inventory.some((it) => it.id === rope.item.id)).toBe(false);
    await master.api.del(`${url}/inventory/nao-existe`).expect(404);

    // limite da mesa: o mestre passa por cima, mas recebe aviso
    await master.api.put(`${base()}/rules`, { inventory: { maxItems: 1 } }).expect(200);
    const { body: over } = await master.api.post(`${url}/inventory`, { name: 'Tocha' }).expect(201);
    expect(over.warning).toMatch(/acima do limite/);
    await master.api.put(`${base()}/rules`, {}).expect(200);
    await master.api.del(`${url}/inventory/${over.item.id}`).expect(200);
    await master.api.del(`${url}/inventory/${bag.item.id}`).expect(200);

    // ataques
    const { body: withAttack } = await master.api.post(`${url}/powers`, { type: 'attacks', name: 'Mordida', damage: '1d6' }).expect(201);
    const attack = withAttack.character.attacks.find((p) => p.name === 'Mordida');
    expect((await master.api.put(`${url}/powers/attacks/${attack.id}`, { damage: '2d6' }).expect(200)).body.character.attacks.find((p) => p.id === attack.id).damage).toBe('2d6');
    await master.api.del(`${url}/powers/attacks/${attack.id}`).expect(200);

    // pontos rapidos (varios de uma vez, delta relativo e limitado ao maximo)
    const { body: points } = await master.api.post(`${base()}/master/points`, { characterIds: [playerCharacter.id], vital: 'life', delta: -5 }).expect(200);
    expect(points[0].life_current).toBe(35);
    expect((await master.api.post(`${base()}/master/points`, { characterIds: [playerCharacter.id], vital: 'mana', delta: 999 }).expect(200)).body[0].mana).toBe(10);
    await player.api.post(`${base()}/master/points`, { characterIds: [playerCharacter.id], vital: 'life', delta: 1 }).expect(403);

    // regra da mesa: com 'mestre' (padrao) o dono nao mexe em vitais nem poderes da ficha compartilhada
    expect((await player.api.get(`${base()}/rules`).expect(200)).body.sheet).toEqual({ stats: 'mestre', powers: 'mestre' });
    expect((await player.api.patch(`/api/characters/${playerCharacter.id}/play`, { lifeCurrent: 1 }).expect(403)).body.message).toBe('Só o mestre mexe na vida, mana e sanidade nesta campanha.');
    await player.api.patch(`${base()}/characters/${playerCharacter.id}/vitals`, { life_current: 1 }).expect(403);
    await player.api.post(`/api/characters/${playerCharacter.id}/powers`, { type: 'attacks', name: 'Soco', damage: '1d4' }).expect(403);
    // lancar uma magia na mesa ainda gasta a mana dela
    await master.api.post(`${url}/powers`, { type: 'spells', name: 'Faísca', damage: '1d4', manaCost: 2 }).expect(201);
    expect((await player.api.patch(`${base()}/characters/${playerCharacter.id}/vitals`, { mana_current: 8, spell: 'Faísca' }).expect(200)).body.mana_current).toBe(8);
    await player.api.patch(`${base()}/characters/${playerCharacter.id}/vitals`, { mana_current: 7, spell: 'Faísca' }).expect(403);
    await player.api.patch(`/api/characters/${playerCharacter.id}/play`, { wallet: { bronze: 3 } }).expect(200); // o resto continua livre
    // tirar o personagem da campanha nao destrava a ficha (a trava fica presa enquanto ele e membro)
    await player.api.put(`${base()}/members/me/character`, { characterId: null }).expect(200);
    await player.api.patch(`/api/characters/${playerCharacter.id}/play`, { lifeCurrent: 1 }).expect(403);
    await player.api.put(`${base()}/members/me/character`, { characterId: playerCharacter.id }).expect(200);
    await master.api.put(`${base()}/rules`, { sheet: { stats: 'jogador', powers: 'jogador' } }).expect(200);
    expect((await player.api.patch(`/api/characters/${playerCharacter.id}/play`, { lifeCurrent: 20 }).expect(200)).body.life_current).toBe(20);
    const { body: punched } = await player.api.post(`/api/characters/${playerCharacter.id}/powers`, { type: 'attacks', name: 'Soco', damage: '1d4' }).expect(201);
    await player.api.del(`/api/characters/${playerCharacter.id}/powers/attacks/${punched.attacks.find((p) => p.name === 'Soco').id}`).expect(200);
    await master.api.put(`${base()}/rules`, {}).expect(200);
    expect((await master.api.get(`${base()}/rules`).expect(200)).body.inventory).toEqual({ maxWeight: 30, maxItems: 9 });

    // historico do mestre
    const { body: log } = await master.api.get(`${url}/log`).expect(200);
    expect(log.length).toBeGreaterThan(5);

    // proibido: quem nao e mestre (nem o dono por esta rota) e ficha nao compartilhada
    await other.api.patch(url, { lifeCurrent: 1 }).expect(403);
    await player.api.patch(url, { lifeCurrent: 1 }).expect(403);
    await other.api.post(`${url}/inventory`, { name: 'Pedra' }).expect(403);
    const hidden = await createCharacter(player.api, 'Ficha escondida');
    await master.api.patch(`${base()}/master/characters/${hidden.id}`, { lifeCurrent: 1 }).expect(403);
    await master.api.post(`${base()}/master/characters/${hidden.id}/inventory`, { name: 'Pedra' }).expect(403);
    expect((await player.api.get(`/api/characters/${hidden.id}`).expect(200)).body.life_current).toBe(30);
    await master.api.patch(url, { lifeMax: 30, lifeCurrent: 30, level: 1, conditions: [], notes: '', wallet: {} }).expect(200);
  });
});
