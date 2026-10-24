// Economia: tabela de precos espelhada, multiplicadores, mercador NPC, comprar/vender/alugar,
// limites da mochila, modos da mesa (livre/pedir/travado), prazos dos alugueis e permissoes.
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { pool } from './db/pool.js';
import { CATALOG, CATALOG_BY_ID } from './utils/economy/prices.js';
import { ARCHETYPES, archetypeStock } from './utils/economy/merchants.js';
import { finalPrice, matchCatalog, sellOffer } from './utils/economy/pricing.js';
import { cleanWander, wanderCell } from './utils/economy/wander.js';
import { clockDelta } from './utils/economy/rentals.js';

const app = createApp();
const hasDb = Boolean(process.env.DATABASE_URL);
const here = path.dirname(fileURLToPath(import.meta.url));

const as = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url, body = {}) => request(app).post(url).set('Authorization', `Bearer ${token}`).send(body),
  put: (url, body = {}) => request(app).put(url).set('Authorization', `Bearer ${token}`).send(body),
  patch: (url, body = {}) => request(app).patch(url).set('Authorization', `Bearer ${token}`).send(body),
  delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`)
});
async function register(label) {
  const email = `eco-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@lugubre.local`;
  const { body } = await request(app).post('/api/auth/register').send({ name: `Eco ${label}`, email, password: 'Teste123!' }).expect(201);
  return { token: body.token, user: body.user, api: as(body.token) };
}

describe('economia (sem banco)', () => {
  it('arquivos espelhados iguais no front e no back', async () => {
    for (const file of ['prices.js', 'pricing.js', 'merchants.js', 'wander.js']) {
      const [back, front] = await Promise.all([
        fs.readFile(path.join(here, 'utils/economy', file), 'utf8'),
        fs.readFile(path.resolve(here, '../../frontend/src/lib/economy', file), 'utf8')
      ]);
      expect(back, file).toBe(front);
    }
  });

  it('catalogo coerente com o livro e modelos com estoque valido', () => {
    expect(new Set(CATALOG.map((it) => it.id)).size).toBe(CATALOG.length);
    expect(CATALOG_BY_ID['espada-longa'].price).toBe(100);
    expect(CATALOG_BY_ID['armadura-de-placas'].price).toBe(1500);
    expect(CATALOG_BY_ID['pocao-de-cura'].price).toBe(60);
    for (const a of ARCHETYPES) expect(archetypeStock(a.id).length, a.id).toBeGreaterThan(3);
    // barqueiro so vende barco; taberneiro so comida (e cama/banho)
    expect(archetypeStock('barqueiro').every(([id]) => CATALOG_BY_ID[id].cat === 'barcos')).toBe(true);
    expect(archetypeStock('taberneiro').every(([id]) => ['comida', 'servicos'].includes(CATALOG_BY_ID[id].cat))).toBe(true);
  });

  it('preco final, recompra, nomes ambiguos e relogio', () => {
    expect(finalPrice(100, { campaign: 1.5, scene: 2, area: 0.5, merchant: 1.25 })).toBe(188);
    expect(finalPrice(1, { campaign: 0.5 })).toBe(1); // nunca de graca
    const shop = { buys: true, buyRate: 0.5, buyCategories: ['armas'] };
    expect(sellOffer({ name: 'Espada longa' }, shop, { campaign: 2 })).toBe(100);
    expect(sellOffer({ name: 'Espada longa', rentalId: 'x' }, shop)).toBe(0);
    expect(sellOffer({ name: 'Pão' }, shop)).toBe(0);
    expect(matchCatalog({ name: 'Maça' }).cat).toBe('armas');
    expect(matchCatalog({ name: 'Maçã' }).cat).toBe('comida');
    expect(matchCatalog({ name: 'maca' })).toBeNull(); // ambiguo sem acento
    expect(clockDelta(600, 1200)).toBe(600);
    expect(clockDelta(0, 1425)).toBe(-15);
    const w = cleanWander({ mode: 'area', area: { type: 'rect', x: 2, y: 2, w: 3, h: 3 } });
    for (let t = 0; t < 120_000; t += 777) {
      const c = wanderCell(w, 'tok', t);
      expect(c.x).toBeGreaterThanOrEqual(2); expect(c.x).toBeLessThanOrEqual(4);
      expect(c.y).toBeGreaterThanOrEqual(2); expect(c.y).toBeLessThanOrEqual(4);
    }
    expect(wanderCell({ mode: 'parado' }, 'tok')).toBeNull();
  });
});

describe.skipIf(!hasDb)('economia com Postgres', () => {
  let master; let player; let outsider; let campaign; let character; let vila; let tok; let ferreiro; let ferreiroTok;
  const base = () => `/api/campaigns/${campaign.id}`;
  const trade = (body) => player.api.post(`${base()}/economy/trade`, body);
  const sheet = async () => (await player.api.get(`/api/characters/${character.id}`).expect(200)).body;
  const dracmas = async () => { const w = (await sheet()).wallet || {}; return Number(w.bronze || 0) + Number(w.silver || 0) * 10 + Number(w.platinum || 0) * 100 + Number(w.gold || 0) * 500; };
  const setWallet = (total) => pool.query('update characters set wallet = $1 where id = $2', [JSON.stringify({ gold: Math.floor(total / 500), platinum: 0, silver: 0, bronze: total % 500 }), character.id]);
  const placeAt = (x, y) => master.api.patch(`${base()}/tokens/${tok.id}`, { x: x * 70, y: y * 70 }).expect(200);
  const rules = (body) => master.api.put(`${base()}/rules`, body).expect(200);
  const itemOf = async (shopId, catalogId) => (await master.api.get(`${base()}/economy`).expect(200)).body.shops.find((s) => s.id === shopId).items.find((i) => i.catalogId === catalogId);

  beforeAll(async () => {
    [master, player, outsider] = await Promise.all([register('mestre'), register('jogador'), register('fora')]);
    ({ body: campaign } = await master.api.post('/api/campaigns', { name: 'Mesa economia', description: 'teste' }).expect(201));
    const [races, classes, origins] = await Promise.all(['races', 'classes', 'origins'].map((type) => request(app).get(`/api/catalog/${type}`)));
    ({ body: character } = await player.api.post('/api/characters', {
      playerName: 'Jogador', characterName: 'Kael', raceId: races.body[0].id, classId: classes.body[0].id, originId: origins.body[0].id,
      lifeCurrent: 30, lifeMax: 30, sanityCurrent: 20, sanityMax: 20, mana: 10, manaMax: 10, defense: 10, inventory: []
    }).expect(201));
    await player.api.post('/api/campaigns/join', { inviteCode: campaign.invite_code, characterId: character.id }).expect(200);
    ({ body: vila } = await master.api.post(`${base()}/scenes`, { name: 'Porto Velho', grid_size: 70 }).expect(201));
    await master.api.post(`${base()}/scenes/${vila.id}/activate`).expect(200);
    const ground = Array.from({ length: 12 }, (_, y) => (y >= 10 ? '~'.repeat(12) : '.'.repeat(12)));
    await master.api.patch(`${base()}/scenes/${vila.id}`, { map_kind: 'tiles', tiles: { cols: 12, rows: 12, layers: { ground } }, mode: 'exploration' }).expect(200);
    ({ body: tok } = await player.api.post(`${base()}/scenes/${vila.id}/tokens`, { kind: 'character', x: 70, y: 70 }).expect(201));
    await setWallet(2000);
    const { body } = await master.api.post(`${base()}/economy/merchants`, { archetype: 'ferreiro', sceneId: vila.id, x: 5, y: 5, name: 'Brom' }).expect(201);
    ferreiro = body.shop;
    ferreiroTok = body.tokenId;
  });

  it('mestre cria mercador de modelo; jogador ve o token com a loja; permissoes', async () => {
    const { body: eco } = await master.api.get(`${base()}/economy`).expect(200);
    const shop = eco.shops.find((s) => s.id === ferreiro.id);
    expect(shop).toMatchObject({ archetype: 'ferreiro', buys: true, npc: { name: 'Brom' } });
    expect(shop.items.find((i) => i.catalogId === 'espada-longa')).toMatchObject({ base: 100, price: 100, stock: 3 });
    const { body: tokens } = await player.api.get(`${base()}/scenes/${vila.id}/tokens`).expect(200);
    expect(tokens.find((t) => t.id === ferreiroTok)).toMatchObject({ kind: 'npc', shop_id: ferreiro.id, name: 'Brom' });
    // jogador nao mexe em preco nem cria mercador; quem e de fora nao ve nada
    await player.api.patch(`${base()}/economy/settings`, { priceMult: 2 }).expect(403);
    await player.api.post(`${base()}/economy/merchants`, { archetype: 'mago', sceneId: vila.id }).expect(403);
    await player.api.patch(`${base()}/economy/shops/${ferreiro.id}`, { priceMult: 0.1 }).expect(403);
    await outsider.api.get(`${base()}/economy`).expect(403);
    const { body: mine } = await player.api.get(`${base()}/economy`).expect(200);
    expect(mine).not.toHaveProperty('shops');
    // janela do jogador: so preco final, sem a conta do mestre
    const { body: win } = await player.api.get(`${base()}/economy/merchant/${ferreiroTok}`).expect(200);
    expect(win.items[0]).not.toHaveProperty('base');
    expect(win).not.toHaveProperty('mults');
    expect(win.character).toMatchObject({ wallet: 2000, name: 'Kael' });
    // o mestre nao compra pela loja
    await master.api.post(`${base()}/economy/trade`, { op: 'buy', merchantTokenId: ferreiroTok, itemId: win.items[0].id }).expect(403);
  });

  it('comprar: precisa estar perto, paga, recebe, estoque desce, empilha', async () => {
    const espada = await itemOf(ferreiro.id, 'espada-longa');
    await placeAt(1, 1);
    expect((await trade({ op: 'buy', merchantTokenId: ferreiroTok, itemId: espada.id }).expect(409)).body.message).toBe('Chegue mais perto do mercador.');
    await placeAt(4, 5);
    const { body } = await trade({ op: 'buy', merchantTokenId: ferreiroTok, itemId: espada.id }).expect(201);
    expect(body).toMatchObject({ total: 100, wallet: 1900 });
    expect(await dracmas()).toBe(1900);
    const inv = (await sheet()).inventory;
    expect(inv.find((it) => it.name === 'Espada longa')).toMatchObject({ catalogId: 'espada-longa', quantity: 1, category: 'Armas' });
    expect((await itemOf(ferreiro.id, 'espada-longa')).stock).toBe(2);
    await trade({ op: 'buy', merchantTokenId: ferreiroTok, itemId: espada.id }).expect(201);
    expect((await sheet()).inventory.filter((it) => it.name === 'Espada longa')).toHaveLength(1); // empilhou
    expect((await trade({ op: 'buy', merchantTokenId: ferreiroTok, itemId: espada.id, quantity: 5 }).expect(409)).body.message).toBe('Só tem 1 em estoque.');
    const montante = await itemOf(ferreiro.id, 'montante');
    await setWallet(100);
    expect((await trade({ op: 'buy', merchantTokenId: ferreiroTok, itemId: montante.id }).expect(409)).body.message).toMatch(/Dracmas insuficientes/);
    await setWallet(2000);
    const { body: log } = await master.api.get(`${base()}/economy/log?shopId=${ferreiro.id}`).expect(200);
    expect(log.filter((l) => l.kind === 'compra')).toHaveLength(2);
  });

  it('multiplicadores: campanha x cena x area x mercador; venda sem o x do mercador', async () => {
    await master.api.patch(`${base()}/economy/settings`, { priceMult: 1.5 }).expect(200);
    await master.api.patch(`${base()}/economy/scenes/${vila.id}`, { priceMult: 2 }).expect(200);
    await master.api.patch(`${base()}/economy/shops/${ferreiro.id}`, { priceMult: 1.25 }).expect(200);
    const price = async () => (await player.api.get(`${base()}/economy/merchant/${ferreiroTok}`).expect(200)).body.items.find((i) => i.catalogId === 'espada-longa').price;
    expect(await price()).toBe(375);
    await master.api.patch(`${base()}/economy/scenes/${vila.id}`, { priceAreas: [{ name: 'Bairro pobre', x: 4, y: 4, w: 3, h: 3, mult: 0.5 }] }).expect(200);
    expect(await price()).toBe(188);
    const { body: win } = await player.api.get(`${base()}/economy/merchant/${ferreiroTok}`).expect(200);
    const espada = win.character.inventory.find((it) => it.name === 'Espada longa');
    expect(espada.offer).toBe(75); // 100 x 1,5 x 2 x 0,5 x recompra 0,5
    const before = await dracmas();
    await trade({ op: 'sell', merchantTokenId: ferreiroTok, inventoryItemId: espada.id }).expect(201);
    expect(await dracmas()).toBe(before + 75);
    expect((await sheet()).inventory.find((it) => it.name === 'Espada longa').quantity).toBe(1);
    // ferreiro nao compra comida
    await pool.query('update characters set inventory = inventory || $1::jsonb where id = $2', [JSON.stringify([{ id: 'pao1', name: 'Pão', quantity: 1, weight: 0.3, category: 'Comida' }]), character.id]);
    expect((await trade({ op: 'sell', merchantTokenId: ferreiroTok, inventoryItemId: 'pao1' }).expect(409)).body.message).toBe('Brom não quer isso.');
    await master.api.patch(`${base()}/economy/settings`, { priceMult: 1 }).expect(200);
    await master.api.patch(`${base()}/economy/scenes/${vila.id}`, { priceMult: 1, priceAreas: [] }).expect(200);
    await master.api.patch(`${base()}/economy/shops/${ferreiro.id}`, { priceMult: 1 }).expect(200);
  });

  it('limites da mochila e modos da mesa (pedir / travado)', async () => {
    const adaga = await itemOf(ferreiro.id, 'adaga');
    const count = (await sheet()).inventory.length;
    await rules({ inventory: { maxItems: count, maxWeight: null } });
    expect((await trade({ op: 'buy', merchantTokenId: ferreiroTok, itemId: adaga.id }).expect(409)).body.message).toMatch(/Mochila cheia/);
    await rules({ inventory: { maxItems: null, maxWeight: null }, actions: { trade: 'travado' } });
    expect((await trade({ op: 'buy', merchantTokenId: ferreiroTok, itemId: adaga.id }).expect(403)).body.message).toBe('O mestre não liberou o comércio agora.');
    await rules({ inventory: { maxItems: null, maxWeight: null }, actions: { trade: 'pedir' } });
    const { body: asked } = await trade({ op: 'buy', merchantTokenId: ferreiroTok, itemId: adaga.id }).expect(202);
    expect(asked.request.summary).toBe('Kael quer comprar Adaga de Brom por 15 dracmas');
    expect((await sheet()).inventory.some((it) => it.name === 'Adaga')).toBe(false);
    const { body: done } = await master.api.post(`${base()}/action-requests/${asked.request.id}`, { decision: 'approve' }).expect(200);
    expect(done.result.received).toMatchObject({ kind: 'trade', name: 'Adaga' });
    expect((await sheet()).inventory.some((it) => it.name === 'Adaga')).toBe(true);
    await rules({ inventory: { maxItems: null, maxWeight: null }, actions: { trade: 'livre' } });
  });

  it('alugar: item vai com prazo e volta sozinho (horas reais e relogio do mundo)', async () => {
    const { body: cav } = await master.api.post(`${base()}/economy/merchants`, { archetype: 'cavalarico', sceneId: vila.id, x: 3, y: 5 }).expect(201);
    const cavalo = await itemOf(cav.shop.id, 'cavalo');
    const stock = cavalo.stock;
    const before = await dracmas();
    const { body } = await trade({ op: 'rent', merchantTokenId: cav.tokenId, itemId: cavalo.id, days: 2 }).expect(201);
    expect(body.total).toBe(30);
    expect(await dracmas()).toBe(before - 30);
    const rented = (await sheet()).inventory.find((it) => it.rentalId === body.rentalId);
    expect(rented.name).toBe('Cavalo de montaria (alugado)');
    expect((await itemOf(cav.shop.id, 'cavalo')).stock).toBe(stock - 1);
    // alugado nao se vende
    expect((await trade({ op: 'sell', merchantTokenId: cav.tokenId, inventoryItemId: rented.id }).expect(409)).body.message).toMatch(/alugado/);
    const { body: mine } = await player.api.get(`${base()}/economy`).expect(200);
    expect(mine.rentals.map((r) => r.id)).toContain(body.rentalId);
    // vence: o item some da ficha e o estoque volta
    await pool.query(`update campaign_rentals set ends_at = now() - interval '1 minute' where id = $1`, [body.rentalId]);
    await player.api.get(`${base()}/economy`).expect(200);
    expect((await sheet()).inventory.some((it) => it.rentalId === body.rentalId)).toBe(false);
    expect((await itemOf(cav.shop.id, 'cavalo')).stock).toBe(stock);

    // relogio do mundo ligado: 1 dia = 1440 minutos do mundo
    await rules({ clock: { on: true, minutes: 600 } });
    const { body: r2 } = await trade({ op: 'rent', merchantTokenId: cav.tokenId, itemId: cavalo.id, days: 1 }).expect(201);
    await rules({ clock: { on: true, minutes: 1200 } });
    await rules({ clock: { on: true, minutes: 360 } });
    expect((await sheet()).inventory.some((it) => it.rentalId === r2.rentalId)).toBe(true);
    await rules({ clock: { on: true, minutes: 900 } });
    expect((await sheet()).inventory.some((it) => it.rentalId === r2.rentalId)).toBe(false);

    // o mestre encerra antes do prazo
    const { body: r3 } = await trade({ op: 'rent', merchantTokenId: cav.tokenId, itemId: cavalo.id, days: 3 }).expect(201);
    await player.api.post(`${base()}/economy/rentals/${r3.rentalId}/end`).expect(200); // o jogador devolve
    await master.api.post(`${base()}/economy/rentals/${r3.rentalId}/end`).expect(404);
    await rules({ clock: { on: false, minutes: 900 } });
  });

  it('barqueiro: comprar barco cria campaign_boats do personagem; quarto do estalajadeiro', async () => {
    const { body: barq } = await master.api.post(`${base()}/economy/merchants`, { archetype: 'barqueiro', sceneId: vila.id, x: 5, y: 8 }).expect(201);
    await placeAt(5, 7);
    const bote = await itemOf(barq.shop.id, 'bote');
    const { body } = await trade({ op: 'buy', merchantTokenId: barq.tokenId, itemId: bote.id }).expect(201);
    const boat = (await pool.query('select * from campaign_boats where id = $1', [body.boatId])).rows[0];
    expect(boat).toMatchObject({ type: 'bote', owner_character_id: character.id, home_scene_id: vila.id, rented_until: null });
    expect(Number(boat.y)).toBeGreaterThanOrEqual(10); // atracado na agua
    expect((await sheet()).inventory.some((it) => it.name === `Escritura: Bote de Kael`)).toBe(true);
    const { body: est } = await master.api.post(`${base()}/economy/merchants`, { archetype: 'estalajadeiro', sceneId: vila.id, x: 6, y: 7 }).expect(201);
    const quarto = await itemOf(est.shop.id, 'quarto-comum');
    expect((await trade({ op: 'buy', merchantTokenId: est.tokenId, itemId: quarto.id }).expect(409)).body.message).toBe('Esse só se aluga.');
    await trade({ op: 'rent', merchantTokenId: est.tokenId, itemId: quarto.id, days: 1 }).expect(201);
  });

  it('NPC andando: o alcance usa a posicao do relogio; mestre edita estoque e repoe', async () => {
    // o ferreiro passeia longe do jogador: negociar exige chegar perto de onde ele esta agora
    await master.api.put(`${base()}/economy/tokens/${ferreiroTok}/wander`, { mode: 'area', area: { type: 'rect', x: 9, y: 0, w: 2, h: 2 } }).expect(200);
    await placeAt(1, 9);
    const { body: toks } = await player.api.get(`${base()}/scenes/${vila.id}/tokens`).expect(200);
    expect(toks.find((t) => t.id === ferreiroTok).wander).toMatchObject({ mode: 'area' });
    const adaga = await itemOf(ferreiro.id, 'adaga');
    await trade({ op: 'buy', merchantTokenId: ferreiroTok, itemId: adaga.id }).expect(409);
    await master.api.put(`${base()}/economy/tokens/${ferreiroTok}/wander`, { mode: 'parado' }).expect(200);
    // estoque: preco a mao, item proprio, repor
    await master.api.patch(`${base()}/economy/items/${adaga.id}`, { priceDracmas: 22, stock: 0 }).expect(200);
    await placeAt(4, 5);
    expect((await trade({ op: 'buy', merchantTokenId: ferreiroTok, itemId: adaga.id }).expect(409)).body.message).toBe('Acabou o estoque.');
    await master.api.post(`${base()}/economy/shops/${ferreiro.id}/restock`).expect(200);
    expect((await itemOf(ferreiro.id, 'adaga')).stock).toBe(3);
    const { body: custom } = await master.api.post(`${base()}/economy/shops/${ferreiro.id}/items`, { name: 'Lâmina do Corvo', priceDracmas: 999, stock: 1, category: 'armas' }).expect(201);
    expect(custom).toMatchObject({ name: 'Lâmina do Corvo', base: 999 });
    await player.api.patch(`${base()}/economy/items/${custom.id}`, { priceDracmas: 1 }).expect(403);
    // esconder o mercador: some a loja para o jogador
    await master.api.patch(`${base()}/economy/shops/${ferreiro.id}`, { visibleToPlayers: false }).expect(200);
    await player.api.get(`${base()}/economy/merchant/${ferreiroTok}`).expect(404);
  });
});
