// Modos das acoes (livre / pedir / travado), pausa geral, excecao por jogador e pedidos ao mestre.
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { pool } from './db/pool.js';
import { assertRight, normalizeRules, playerRights } from './utils/tableRules.js';

const app = createApp();
const hasDb = Boolean(process.env.DATABASE_URL);
const U = 'e1c8d6a2-0000-4000-8000-000000000000';

const as = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url, body = {}) => request(app).post(url).set('Authorization', `Bearer ${token}`).send(body),
  put: (url, body = {}) => request(app).put(url).set('Authorization', `Bearer ${token}`).send(body),
  patch: (url, body = {}) => request(app).patch(url).set('Authorization', `Bearer ${token}`).send(body)
});

async function register(label) {
  const email = `req-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@lugubre.local`;
  const { body } = await request(app).post('/api/auth/register').send({ name: `Req ${label}`, email, password: 'Teste123!' }).expect(201);
  return { token: body.token, user: body.user, api: as(body.token) };
}

describe('regras da mesa: modos (sem banco)', () => {
  it('booleanos antigos viram livre/travado e a excecao do jogador troca o geral', () => {
    const r = normalizeRules({ move: true, powers: false, players: { [U]: { pickup: false, move: true } } });
    expect(r.act).toBe(true);
    expect(r.actions).toEqual({ move: 'livre', attack: 'travado', pickup: 'livre', doors: 'livre', trade: 'livre' });
    // antigo false trava so ele; antigo true nao vira excecao
    expect(r.players[U]).toEqual({ actions: { pickup: 'travado' } });
    expect(playerRights(r, U)).toMatchObject({ move: 'livre', attack: 'travado', pickup: 'travado', doors: 'livre' });
    // nova chave ganha da antiga; mover nao tem "pedir"
    expect(normalizeRules({ pickup: false, actions: { pickup: 'pedir', move: 'pedir' } }).actions).toMatchObject({ pickup: 'pedir', move: 'livre' });
    // excecao mais solta que o geral (permitir sempre)
    expect(playerRights({ actions: { pickup: 'pedir' }, players: { [U]: { actions: { pickup: 'livre' } } } }, U).pickup).toBe('livre');
  });

  it('pausa geral trava tudo; mover travado trava portas; assertRight devolve o modo', () => {
    expect(playerRights({ act: false, players: { [U]: { actions: { pickup: 'livre' } } } }, U)).toMatchObject({ paused: true, move: 'travado', attack: 'travado', pickup: 'travado', doors: 'travado' });
    expect(() => assertRight({ act: false }, U, 'move')).toThrow('O mestre pausou a mesa: espere ele liberar.');
    expect(() => assertRight({ actions: { move: 'travado', doors: 'pedir' } }, U, 'doors')).toThrow('O mestre travou o movimento agora.');
    expect(() => assertRight({ actions: { doors: 'travado' } }, U, 'doors')).toThrow('O mestre não liberou passar por portas agora.');
    expect(assertRight({ actions: { pickup: 'pedir' } }, U, 'pickup')).toBe('pedir');
    expect(assertRight({ powers: false, actions: { attack: 'pedir' } }, U, 'powers')).toBe('pedir');
    expect(assertRight({}, U, null)).toBe('livre');
  });
});

describe.skipIf(!hasDb)('pedidos ao mestre com Postgres', () => {
  let master; let player; let other; let campaign; let character; let vila; let interior; let tok;
  const base = () => `/api/campaigns/${campaign.id}`;
  const rules = (body) => master.api.put(`${base()}/rules`, body).expect(200);
  const pick = (itemId) => player.api.post(`${base()}/scenes/${vila.id}/pickup`, { itemId });
  const items = async () => (await master.api.get(`${base()}/scenes/${vila.id}`).expect(200)).body.tiles.items.map((it) => it.id);
  const inventory = async () => (await player.api.get(`/api/characters/${character.id}`).expect(200)).body.inventory.map((it) => it.name);
  const decide = (id, decision, extra = {}) => master.api.post(`${base()}/action-requests/${id}`, { decision, ...extra });
  const placeAt = (x, y) => master.api.patch(`${base()}/tokens/${tok.id}`, { x: x * 70, y: y * 70 }).expect(200);
  const events = async (api, cursor) => (await api.get(`${base()}/events?after=${cursor}`).expect(200)).body.events;
  const cursorOf = async (api) => (await api.get(`${base()}/events`).expect(200)).body.cursor;

  beforeAll(async () => {
    [master, player, other] = await Promise.all([register('mestre'), register('jogador'), register('outro')]);
    ({ body: campaign } = await master.api.post('/api/campaigns', { name: 'Mesa pedidos', description: 'teste' }).expect(201));
    const [races, classes, origins] = await Promise.all(['races', 'classes', 'origins'].map((type) => request(app).get(`/api/catalog/${type}`)));
    ({ body: character } = await player.api.post('/api/characters', {
      playerName: 'Jogador', characterName: 'Kael', raceId: races.body[0].id, classId: classes.body[0].id, originId: origins.body[0].id,
      lifeCurrent: 30, lifeMax: 30, sanityCurrent: 20, sanityMax: 20, mana: 10, manaMax: 10, defense: 10, inventory: []
    }).expect(201));
    await player.api.post('/api/campaigns/join', { inviteCode: campaign.invite_code, characterId: character.id }).expect(200);
    await other.api.post('/api/campaigns/join', { inviteCode: campaign.invite_code }).expect(200);
    ({ body: vila } = await master.api.post(`${base()}/scenes`, { name: 'Vila', grid_size: 70 }).expect(201));
    await master.api.post(`${base()}/scenes/${vila.id}/activate`).expect(200);
    const tiles = {
      cols: 8, rows: 8, layers: { ground: Array(8).fill('........') },
      buildings: [{ id: 'casa', x: 2, y: 1, w: 4, h: 3, name: 'Taverna', roof: 'telha', wall: 'madeira' }],
      items: ['pocao', 'pao', 'faca', 'corda', 'vela', 'longe'].map((id) => ({ id, x: id === 'longe' ? 7 : 1, y: id === 'longe' ? 0 : 6, name: id === 'pocao' ? 'Poção de cura' : id, quantity: id === 'pocao' ? 2 : 1 }))
    };
    await master.api.patch(`${base()}/scenes/${vila.id}`, { map_kind: 'tiles', tiles, mode: 'exploration' }).expect(200);
    ({ body: interior } = await master.api.post(`${base()}/scenes/${vila.id}/buildings/casa/interior`).expect(201));
    ({ body: tok } = await player.api.post(`${base()}/scenes/${vila.id}/tokens`, { kind: 'character', x: 70, y: 6 * 70 }).expect(201));
  });

  it('pegar: livre direto, pedir cria pedido, mestre aprova e o servidor executa', async () => {
    await pick('pao').expect(201);
    await rules({ actions: { pickup: 'pedir' } });
    const cursor = await cursorOf(master.api);
    const { body: asked } = await pick('pocao').expect(202);
    expect(asked.requested).toBe(true);
    expect(asked.request.summary).toBe('Kael quer pegar Poção de cura (2)');
    expect(await items()).toContain('pocao');
    // mesmo pedido de novo nao duplica
    expect((await pick('pocao').expect(202)).body.request.id).toBe(asked.request.id);
    const masterEvents = await events(master.api, cursor);
    expect(masterEvents.filter((e) => e.type === 'action:request')).toHaveLength(1);
    // so o mestre decide; o jogador ve so os proprios pedidos
    await player.api.post(`${base()}/action-requests/${asked.request.id}`, { decision: 'approve' }).expect(403);
    expect((await master.api.get(`${base()}/action-requests`).expect(200)).body.map((r) => r.id)).toContain(asked.request.id);
    expect((await other.api.get(`${base()}/action-requests`).expect(200)).body).toEqual([]);

    const pc = await cursorOf(player.api);
    const { body: done } = await decide(asked.request.id, 'approve').expect(200);
    expect(done.result.received.name).toBe('Poção de cura');
    expect(await items()).not.toContain('pocao');
    expect(await inventory()).toContain('Poção de cura');
    const decided = (await events(player.api, pc)).find((e) => e.type === 'action:decided');
    expect(decided.payload).toMatchObject({ status: 'approved', kind: 'pickup' });
    expect((await decide(asked.request.id, 'approve').expect(409)).body.message).toBe('Esse pedido já foi decidido.');
  });

  it('negar nao executa; pedido velho expira; aprovar confere o alcance de novo', async () => {
    await rules({ actions: { pickup: 'pedir' } });
    const { body: asked } = await pick('faca').expect(202);
    const pc = await cursorOf(player.api);
    await decide(asked.request.id, 'deny').expect(200);
    expect(await items()).toContain('faca');
    expect(await inventory()).not.toContain('faca');
    const denied = (await events(player.api, pc)).find((e) => e.type === 'action:decided');
    expect(denied.payload).toMatchObject({ status: 'denied', message: 'O mestre não deixou.' });

    // expirado
    const { body: old } = await pick('corda').expect(202);
    await pool.query(`update campaign_action_requests set created_at = now() - interval '10 minutes' where id = $1`, [old.request.id]);
    const pc2 = await cursorOf(player.api);
    expect((await decide(old.request.id, 'approve').expect(410)).body.message).toBe('O pedido expirou.');
    expect(await items()).toContain('corda');
    expect((await events(player.api, pc2)).some((e) => e.type === 'action:decided' && e.payload.status === 'expired')).toBe(true);

    // depois do pedido o personagem se afastou: aprovar nao entrega
    const { body: far } = await pick('vela').expect(202);
    await placeAt(6, 6);
    expect((await decide(far.request.id, 'approve').expect(409)).body.message).toBe('Não deu: Chegue mais perto para pegar.');
    expect(await items()).toContain('vela');
    const { rows } = await pool.query('select status from campaign_action_requests where id = $1', [far.request.id]);
    expect(rows[0].status).toBe('denied');
    await placeAt(1, 6);

    // travado nao cria pedido
    await rules({ actions: { pickup: 'travado' } });
    expect((await pick('vela').expect(403)).body.message).toBe('O mestre não liberou pegar itens agora.');
  });

  it('excecao por jogador e "permitir sempre"', async () => {
    await rules({ actions: { pickup: 'pedir' }, players: { [player.user.id]: { actions: { pickup: 'livre' } } } });
    await pick('vela').expect(201);
    await rules({ actions: { pickup: 'pedir' } });
    const { body: asked } = await pick('corda').expect(202);
    await decide(asked.request.id, 'approve', { always: true }).expect(200);
    const after = (await player.api.get(`${base()}/rules`).expect(200)).body;
    expect(after.players[player.user.id].actions.pickup).toBe('livre');
    expect(after.actions.pickup).toBe('pedir');
    await rules({});
  });

  it('portas: pedir, negar fica fora, aprovar entra no interior', async () => {
    await rules({ actions: { doors: 'pedir' } });
    await placeAt(4, 4);
    const enter = () => player.api.post(`${base()}/scenes/${vila.id}/buildings/casa/enter`, {});
    const { body: asked } = await enter().expect(202);
    expect(asked.request.summary).toBe('Kael quer entrar em Taverna');
    await decide(asked.request.id, 'deny').expect(200);
    expect((await master.api.get(`${base()}/scenes/${vila.id}/tokens`).expect(200)).body.map((t) => t.id)).toContain(tok.id);
    const { body: again } = await enter().expect(202);
    const { body: done } = await decide(again.request.id, 'approve').expect(200);
    expect(done.result.sceneId).toBe(interior.id);
    expect((await master.api.get(`${base()}/scenes/${interior.id}/tokens`).expect(200)).body.map((t) => t.id)).toContain(tok.id);
    // sair tambem pede
    const doorX = Math.floor(interior.tiles.cols / 2);
    await master.api.patch(`${base()}/tokens/${tok.id}`, { x: doorX * 70, y: (interior.tiles.rows - 2) * 70 }).expect(200);
    const { body: out } = await player.api.post(`${base()}/scenes/${interior.id}/exit`, {}).expect(202);
    expect(out.request.kind).toBe('exit');
    expect((await decide(out.request.id, 'approve').expect(200)).body.result.sceneId).toBe(vila.id);
    await rules({});
  });

  it('pausa geral trava tudo, inclusive andar; booleanos antigos ainda valem', async () => {
    await placeAt(1, 6);
    await rules({ act: false });
    expect((await player.api.patch(`${base()}/tokens/${tok.id}`, { x: 80 }).expect(403)).body.message).toBe('O mestre pausou a mesa: espere ele liberar.');
    expect((await pick('faca').expect(403)).body.message).toBe('O mestre pausou a mesa: espere ele liberar.');
    expect((await player.api.post(`${base()}/rolls`, { formula: '1d20', kind: 'attack', characterId: character.id }).expect(403)).body.message).toBe('O mestre pausou a mesa: espere ele liberar.');
    await player.api.post(`${base()}/rolls`, { formula: '1d20', kind: 'free' }).expect(201);
    await rules({ act: true });
    await player.api.patch(`${base()}/tokens/${tok.id}`, { x: 75 }).expect(200);
    // formato antigo
    await rules({ move: false });
    expect((await player.api.patch(`${base()}/tokens/${tok.id}`, { x: 80 }).expect(403)).body.message).toBe('O mestre travou o movimento agora.');
    expect((await master.api.get(`${base()}/rules`).expect(200)).body.actions.move).toBe('travado');
    await rules({ pickup: false });
    expect((await pick('faca').expect(403)).body.message).toBe('O mestre não liberou pegar itens agora.');
    await rules({});
  });

  it('ataque: pedir, mestre aprova e a rolagem sai pelo servidor; dano nao pede de novo', async () => {
    const { body: lobo } = await master.api.post(`${base()}/scenes/${vila.id}/tokens`, { kind: 'monster', name: 'Lobo', x: 140, y: 6 * 70, hp_max: 10, hp_current: 10 }).expect(201);
    await rules({ actions: { attack: 'pedir' } });
    const attack = { formula: '1d20+2', kind: 'attack', characterId: character.id, powerName: 'Espada', label: 'Espada', targetTokenId: lobo.id };
    const { body: asked } = await player.api.post(`${base()}/rolls`, attack).expect(202);
    expect(asked.request.summary).toBe('Kael quer atacar Lobo com Espada');
    const cursor = await cursorOf(master.api);
    const { body: done } = await decide(asked.request.id, 'approve').expect(200);
    expect(done.result.roll).toMatchObject({ kind: 'attack', targetTokenId: lobo.id, userId: player.user.id, powerName: 'Espada' });
    expect((await events(master.api, cursor)).some((e) => e.type === 'roll' && e.payload.rollId === done.result.roll.rollId)).toBe(true);
    await player.api.post(`${base()}/rolls`, { formula: '1d8', kind: 'damage', characterId: character.id, targetTokenId: lobo.id }).expect(201);
    await rules({});
  });
});
