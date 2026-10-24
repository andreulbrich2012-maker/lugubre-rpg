// Economia da campanha: mercadores NPC (loja ligada a um NPC no mapa), precos por lugar,
// comprar / vender / alugar com dracmas, alugueis com prazo e o livro-caixa do mestre.
// Tabela de precos e modelos de mercador: utils/economy/prices.js e merchants.js (espelhados no
// frontend). Registrada no mesmo router de campaign.routes.js.
import crypto from 'crypto';
import { z } from 'zod';
import { pool, query } from '../db/pool.js';
import { assertCampaignMaster, requireCampaignMember } from '../utils/campaignAccess.js';
import { emitEvent } from '../utils/events.js';
import { boolish, httpError, parseJson, requireDatabase } from '../utils/http.js';
import { assertRight, inventoryLimits, playerRights } from '../utils/tableRules.js';
import { AskMaster, createRequest } from '../utils/actionRequests.js';
import { inventoryLimitError, roundKg, unitWeight } from '../utils/itemWeight.js';
import { BOAT_TYPES as BOAT_LABEL, CATALOG_BY_ID, CATEGORIES, scaled } from '../utils/economy/prices.js';
import { ARCHETYPE_BY_ID, ARCHETYPES, archetypeStock } from '../utils/economy/merchants.js';
import {
  areaAt, catalogCategory, cleanMult, finalPrice, inventoryCategory, matchCatalog, MAX_RENT_DAYS, MULT_MAX, MULT_MIN,
  rentalEnd, sellOffer, totalMult, walletFromTotal, walletTotal
} from '../utils/economy/pricing.js';
import { cleanWander, wanderPos } from '../utils/economy/wander.js';
import { closeRental, expireRentals } from '../utils/economy/rentals.js';
import { dockCell, nearestPort } from '../utils/boats.js';
import { loadRules, tokenView, TOKEN_SELECT } from './campaign.v2.js';

export const MERCHANT_RANGE = 2.5; // celulas entre o centro do personagem e o do mercador
const uuid = z.string().uuid();
const mult = z.coerce.number().min(MULT_MIN).max(MULT_MAX);
const CAT_IDS = Object.keys(CATEGORIES);
const LABEL_TO_CAT = Object.fromEntries(Object.entries(CATEGORIES).map(([id, c]) => [c.label, id]));
const KINDS = ['item', 'montaria', 'barco', 'servico'];

// nomes sorteados quando o mestre nao escolhe (pt-BR, clima sombrio)
const NAMES = ['Brom', 'Oswin', 'Marta Cinza', 'Tibério', 'Ilsa', 'Gaspar', 'Velha Nádia', 'Corvino', 'Edda', 'Faustino', 'Hilde', 'Ruan Torto',
  'Selma', 'Dario Ferrugem', 'Odete', 'Lázaro', 'Benedita', 'Quirino', 'Zelda Mão-Leve', 'Anselmo'];

const areaSchema = z.object({ id: z.string().max(40).optional(), name: z.string().trim().max(60).optional().default('Área'), x: z.number(), y: z.number(), w: z.number().min(1).max(1000), h: z.number().min(1).max(1000), mult });
const wanderSchema = z.object({
  mode: z.enum(['parado', 'area', 'rota']),
  area: z.object({ type: z.enum(['rect', 'poly']), x: z.number().optional(), y: z.number().optional(), w: z.number().optional(), h: z.number().optional(), points: z.array(z.array(z.number()).length(2)).max(40).optional() }).optional(),
  route: z.array(z.array(z.number()).length(2)).max(40).optional(),
  loop: z.boolean().optional(),
  speed: z.number().min(0.2).max(6).optional(),
  pause: z.number().min(0).max(60).optional()
});
const merchantCreateSchema = z.object({
  archetype: z.string().refine((v) => ARCHETYPE_BY_ID[v], 'Modelo de mercador desconhecido.'),
  sceneId: uuid,
  name: z.string().trim().min(1).max(60).optional(),
  shopName: z.string().trim().min(2).max(120).optional(),
  x: z.number().min(0).max(999).optional(),
  y: z.number().min(0).max(999).optional(),
  appearance: z.record(z.any()).nullable().optional(),
  wander: wanderSchema.optional(),
  hidden: z.boolean().optional()
});
const shopPatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  greeting: z.string().max(300).optional(),
  priceMult: mult.optional(),
  buys: boolish.optional(),
  buyRate: z.coerce.number().min(0).max(1).optional(),
  buyCategories: z.array(z.enum(CAT_IDS)).max(CAT_IDS.length).optional(),
  visibleToPlayers: boolish.optional(),
  archetype: z.string().max(40).optional()
});
const itemFields = {
  name: z.string().trim().min(1).max(140),
  description: z.string().max(500),
  priceDracmas: z.coerce.number().int().min(0).max(10_000_000),
  rentPerDay: z.coerce.number().int().min(0).max(1_000_000).nullable(),
  rentOnly: boolish,
  stock: z.coerce.number().int().min(0).max(100000),
  baseStock: z.coerce.number().int().min(0).max(100000).nullable(),
  unlimited: boolish,
  available: boolish,
  weight: z.coerce.number().min(0).max(100000),
  category: z.enum(CAT_IDS),
  kind: z.enum(KINDS)
};
const itemCreateSchema = z.object({ catalogId: z.string().max(60).optional(), ...Object.fromEntries(Object.entries(itemFields).map(([k, v]) => [k, v.optional()])) });
const itemPatchSchema = z.object(itemFields).partial();
const tradeSchema = z.object({
  op: z.enum(['buy', 'sell', 'rent']),
  merchantTokenId: uuid,
  itemId: uuid.optional(),
  inventoryItemId: z.string().max(80).optional(),
  quantity: z.coerce.number().int().min(1).max(99).optional().default(1),
  days: z.coerce.number().int().min(1).max(MAX_RENT_DAYS).optional().default(1)
});

const num = (v, d = 0) => (v == null || Number.isNaN(Number(v)) ? d : Number(v));

// ---------- leitura e formato ----------
function itemCat(row) {
  return CATALOG_BY_ID[row.catalog_id]?.cat || LABEL_TO_CAT[row.category] || (CAT_IDS.includes(row.category) ? row.category : 'aventura');
}

// item da loja: o jogador ve so o preco final; o mestre ve base e final
function itemView(row, m, master) {
  const price = row.rent_only ? null : finalPrice(row.price_dracmas, m);
  const rent = row.rent_per_day > 0 ? finalPrice(row.rent_per_day, m) : null;
  const view = {
    id: row.id, name: row.name, description: row.description || '', category: itemCat(row), kind: row.kind || 'item',
    icon: row.icon || CATALOG_BY_ID[row.catalog_id]?.icon || null, catalogId: row.catalog_id || null,
    weight: Number(row.weight || 0) > 0 ? Number(row.weight) : roundKg(unitWeight({ name: row.name, description: row.description, category: inventoryCategory(itemCat(row)) })),
    stock: row.unlimited ? null : row.stock, price, rent, rentOnly: Boolean(row.rent_only), available: row.available !== false
  };
  if (master) Object.assign(view, { base: row.price_dracmas, rentBase: row.rent_per_day, baseStock: row.base_stock, unlimited: Boolean(row.unlimited), boatType: row.boat_type || null });
  return view;
}

function shopView(row) {
  return {
    id: row.id, name: row.name, description: row.description || '', category: row.category, archetype: row.archetype || null,
    npcId: row.npc_id || null, greeting: row.greeting || '', priceMult: num(row.price_mult, 1), buys: Boolean(row.buys),
    buyRate: num(row.buy_rate, 0.5), buyCategories: parseJson(row.buy_categories, []), visibleToPlayers: row.visible_to_players !== false
  };
}

async function loadShop(campaignId, shopId, db = { query }) {
  if (!uuid.safeParse(shopId).success) throw httpError('Mercador não encontrado.', 404);
  const shop = (await db.query('select * from campaign_shops where id = $1 and campaign_id = $2', [shopId, campaignId])).rows[0];
  if (!shop) throw httpError('Mercador não encontrado.', 404);
  return shop;
}

// multiplicadores do lugar onde o mercador fica (area pela celula de casa do token)
function placeMults(campaign, scene, shop, homeCell) {
  const area = scene && homeCell ? areaAt(parseJson(scene.price_areas, []), homeCell.x, homeCell.y) : null;
  return {
    campaign: cleanMult(campaign?.price_mult), scene: cleanMult(scene?.price_mult), area: cleanMult(area?.mult),
    merchant: cleanMult(shop?.price_mult), areaName: area?.name || null
  };
}
const homeCellOf = (token, scene) => {
  const g = scene?.grid_size || 70;
  return { x: Math.floor((Number(token.x) + (Number(token.size || 1) * g) / 2) / g), y: Math.floor((Number(token.y) + (Number(token.size || 1) * g) / 2) / g) };
};

async function emitTokens(campaignId, npcId, userId) {
  const rows = (await query(`${TOKEN_SELECT} where t.npc_id = $1 and t.campaign_id = $2`, [npcId, campaignId])).rows;
  for (const t of rows) {
    const playerView = t.hidden ? { tokenId: t.id, sceneId: t.scene_id, removed: true } : { token: tokenView(t), view: 'player' };
    await emitEvent(campaignId, 'token:updated', playerView, 'all', userId);
    await emitEvent(campaignId, 'token:updated', { token: tokenView(t, { master: true }), view: 'master' }, 'master', userId);
  }
}

// item do catalogo -> colunas da loja
function catalogRow(cid, qty) {
  const c = CATALOG_BY_ID[cid];
  return {
    name: c.name, description: c.desc || '', price_dracmas: scaled(c.price), stock: qty, category: CATEGORIES[c.cat].label, weight: c.weight || 0,
    catalog_id: c.id, kind: c.kind || 'item', rent_per_day: c.rent ? scaled(c.rent) : null, rent_only: Boolean(c.rentOnly), unlimited: qty === 0,
    base_stock: qty, icon: c.icon || null, boat_type: c.boatType || null
  };
}
async function insertShopItem(db, shopId, r) {
  return (await db.query(
    `insert into campaign_shop_items (shop_id, name, description, price_dracmas, stock, category, weight, available, catalog_id, kind, rent_per_day, rent_only, unlimited, base_stock, icon, boat_type)
     values ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,$11,$12,$13,$14,$15) returning *`,
    [shopId, r.name, r.description, r.price_dracmas, r.stock, r.category, r.weight, r.catalog_id, r.kind, r.rent_per_day, r.rent_only, r.unlimited, r.base_stock, r.icon, r.boat_type]
  )).rows[0];
}

const logTrade = (db, t) => db.query(
  `insert into campaign_trades (campaign_id, shop_id, user_id, character_id, kind, item_name, quantity, unit_price, total, meta)
   values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
  [t.campaignId, t.shopId, t.userId, t.characterId, t.kind, t.name, t.quantity || 1, t.unit || 0, t.total || 0, JSON.stringify(t.meta || {})]
);

// ---------- comprar / vender / alugar (tambem refeito quando o mestre aprova o pedido) ----------
export async function doTrade(req, rawBody, approved = false) {
  const campaignId = req.params.id;
  const body = tradeSchema.parse(rawBody || {});
  const { master, campaign } = await requireCampaignMember(campaignId, req.user);
  if (master) throw httpError('O mestre não negocia pela loja: use o painel da economia.', 403);
  await expireRentals(campaignId);
  const client = await pool.connect();
  let out;
  let characterId;
  let shop;
  try {
    await client.query('begin');
    const merchant = (await client.query(`${TOKEN_SELECT} where t.id = $1 and t.campaign_id = $2`, [body.merchantTokenId, campaignId])).rows[0];
    if (!merchant || merchant.hidden || !merchant.shop_id || !merchant.shop_visible) throw httpError('Esse mercador não está aqui.', 404);
    shop = (await client.query('select * from campaign_shops where id = $1 for update', [merchant.shop_id])).rows[0];
    const scene = (await client.query('select * from campaign_scenes where id = $1', [merchant.scene_id])).rows[0];
    if (scene.mode === 'prep') throw httpError('A mesa está em preparação.', 409);
    if (scene.mode === 'combat') throw httpError('Ninguém negocia no meio de um combate.', 409);
    const grid = scene.grid_size || 70;
    const mine = (await client.query(
      `${TOKEN_SELECT} where t.scene_id = $1 and t.kind = 'character' and (ch.owner_id = $2 or t.controlled_by = $2)`,
      [scene.id, req.user.id]
    )).rows;
    if (!mine.length) throw httpError('Coloque seu personagem no mapa, perto do mercador.', 409);
    const mPos = wanderPos({ id: merchant.id, wander: parseJson(merchant.wander, null) }, grid) || { x: Number(merchant.x), y: Number(merchant.y) };
    const center = (p, size) => ({ x: (Number(p.x) + (Number(size || 1) * grid) / 2) / grid, y: (Number(p.y) + (Number(size || 1) * grid) / 2) / grid });
    const mc = center(mPos, merchant.size);
    const dist = (t) => { const c = center(t, t.size); return Math.hypot(c.x - mc.x, c.y - mc.y); };
    const token = mine.sort((a, b) => dist(a) - dist(b))[0];
    if (dist(token) > MERCHANT_RANGE + 1e-6) throw httpError('Chegue mais perto do mercador.', 409);
    const rules = await loadRules(campaignId);
    const mode = assertRight(rules, req.user.id, 'trade', { turnTokenIds: [token.id] });

    const character = (await client.query('select * from characters where id = $1 for update', [token.character_id])).rows[0];
    if (!character) throw httpError('Personagem não encontrado.', 404);
    characterId = character.id;
    const m = placeMults(campaign, scene, shop, homeCellOf(merchant, scene));
    const wallet = walletTotal(parseJson(character.wallet, {}));
    const inventory = parseJson(character.inventory, []);
    const limits = inventoryLimits(rules, req.user.id);
    const who = token.name || character.character_name;
    const seller = merchant.name || shop.name;
    const ask = (summary) => {
      if (mode === 'pedir' && !approved) {
        throw new AskMaster({ kind: 'trade', sceneId: scene.id, tokenId: token.id, characterId: character.id, payload: body, summary });
      }
    };
    const meta = { mults: m, merchantTokenId: merchant.id };

    if (body.op === 'sell') {
      if (!shop.buys) throw httpError(`${seller} não compra nada.`, 409);
      const idx = inventory.findIndex((it) => it?.id === body.inventoryItemId);
      const item = inventory[idx];
      if (!item) throw httpError('Esse item não está mais no seu inventário.', 409);
      if (item.rentalId) throw httpError('Item alugado não se vende: devolva ao dono.', 409);
      if (item.contents?.length) throw httpError('Esvazie o recipiente antes de vender.', 409);
      const qty = Math.min(body.quantity, Math.max(1, Math.floor(num(item.quantity, 1))));
      const offer = sellOffer(item, { buys: true, buyRate: num(shop.buy_rate, 0.5), buyCategories: parseJson(shop.buy_categories, []) }, m);
      if (!offer) throw httpError(`${seller} não quer isso.`, 409);
      const total = offer * qty;
      ask(`${who} quer vender ${qty > 1 ? `${qty}× ` : ''}${item.name} para ${seller} por ${total} dracmas`);
      const left = num(item.quantity, 1) - qty;
      if (left > 0) inventory[idx] = { ...item, quantity: left }; else inventory.splice(idx, 1);
      await client.query('update characters set wallet = $1, inventory = $2, updated_at = now() where id = $3', [JSON.stringify(walletFromTotal(wallet + total)), JSON.stringify(inventory), character.id]);
      // o mercador revende: soma no estoque (ou entra na loja como item do catalogo)
      const hit = matchCatalog(item);
      if (hit) {
        const stocked = await client.query('update campaign_shop_items set stock = stock + $1, updated_at = now() where shop_id = $2 and catalog_id = $3 and unlimited = false returning id', [qty, shop.id, hit.id]);
        const exists = stocked.rowCount || (await client.query('select 1 from campaign_shop_items where shop_id = $1 and catalog_id = $2', [shop.id, hit.id])).rowCount;
        if (!exists && hit.kind !== 'barco') await insertShopItem(client, shop.id, { ...catalogRow(hit.id, qty), base_stock: 0 });
        // escritura de barco vendida: o barco deixa de ser do personagem
        if (hit.kind === 'barco') {
          await client.query(
            `update campaign_boats set owner_character_id = null where id = (select id from campaign_boats where campaign_id = $1 and owner_character_id = $2 and type = $3 and rented_until is null order by created_at limit 1)`,
            [campaignId, character.id, hit.boatType]
          );
        }
      }
      await logTrade(client, { campaignId, shopId: shop.id, userId: req.user.id, characterId: character.id, kind: 'venda', name: item.name, quantity: qty, unit: offer, total, meta });
      out = { op: 'sell', total, wallet: wallet + total, name: item.name, quantity: qty, message: `Vendeu ${qty > 1 ? `${qty}× ` : ''}${item.name} por ${total} dracmas.` };
    } else {
      if (!body.itemId) throw httpError('Escolha um item.');
      const row = (await client.query('select * from campaign_shop_items where id = $1 and shop_id = $2 for update', [body.itemId, shop.id])).rows[0];
      if (!row || row.available === false) throw httpError('Esse item não está à venda agora.', 409);
      const c = CATALOG_BY_ID[row.catalog_id];
      const kind = row.kind || 'item';
      const unitWeightKg = num(row.weight, 0) > 0 ? num(row.weight) : roundKg(unitWeight({ name: row.name, description: row.description, category: inventoryCategory(itemCat(row)) }));
      const rent = body.op === 'rent';
      if (rent && !(row.rent_per_day > 0)) throw httpError('Esse item não se aluga.', 409);
      if (!rent && row.rent_only) throw httpError('Esse só se aluga.', 409);
      const qty = rent || kind === 'barco' ? 1 : body.quantity;
      if (!row.unlimited && row.stock < qty) throw httpError(row.stock ? `Só tem ${row.stock} em estoque.` : 'Acabou o estoque.', 409);
      const unit = rent ? finalPrice(row.rent_per_day, m) : finalPrice(row.price_dracmas, m);
      const total = unit * (rent ? body.days : qty);
      if (total > wallet) throw httpError(`Dracmas insuficientes: custa ${total} e você tem ${wallet}.`, 409);
      ask(rent
        ? `${who} quer alugar ${row.name} de ${seller} por ${body.days} ${body.days === 1 ? 'dia' : 'dias'} (${total} dracmas)`
        : `${who} quer comprar ${qty > 1 ? `${qty}× ` : ''}${row.name} de ${seller} por ${total} dracmas`);

      // o que vai para o inventario (servico comprado nao vira item)
      let entry = null;
      let boat = null;
      let rental = null;
      let stacked = false;
      if (kind === 'barco') {
        const tiles = parseJson(scene.tiles, null);
        const at = homeCellOf(merchant, scene);
        let cell = at;
        if (tiles?.layers) {
          const port = nearestPort(tiles, at);
          cell = dockCell(tiles, port || at);
        }
        const type = row.boat_type || c?.boatType || 'bote';
        const boatName = `${BOAT_LABEL[type] || row.name} de ${character.character_name}`.slice(0, 60);
        const end = rent ? rentalEnd({ days: body.days, clockOn: rules.clock.on, worldMinutes: campaign.world_minutes, realHoursPerDay: num(campaign.rent_hours_per_day, 2) }) : null;
        // aluguel pelo relogio do mundo: rented_until e so uma estimativa (o prazo de verdade e o do aluguel)
        const until = rent ? end.endsAt || new Date(Date.now() + body.days * 24 * 3600_000).toISOString() : null;
        boat = (await client.query(
          `insert into campaign_boats (campaign_id, name, type, owner_character_id, home_scene_id, x, y, rented_until) values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
          [campaignId, boatName, type, character.id, scene.id, cell.x, cell.y, until]
        )).rows[0];
        entry = { name: `${rent ? 'Contrato de aluguel' : 'Escritura'}: ${boatName}`, weight: 0.01, category: 'Outros', icon: 'pergaminho', description: `${row.name} atracado em ${scene.name}.` };
      } else if (kind !== 'servico' || rent) {
        entry = {
          name: rent ? `${row.name} (alugado)` : row.name,
          weight: kind === 'item' ? unitWeightKg : 0.01,
          category: inventoryCategory(itemCat(row)),
          icon: row.icon || c?.icon || undefined,
          description: row.description || ''
        };
      }
      if (rent) {
        const end = rentalEnd({ days: body.days, clockOn: rules.clock.on, worldMinutes: campaign.world_minutes, realHoursPerDay: num(campaign.rent_hours_per_day, 2) });
        rental = { id: crypto.randomUUID(), ...end };
      }
      if (entry) {
        const full = { id: crypto.randomUUID(), quantity: qty, defenseBonus: 0, ...entry, ...(row.catalog_id ? { catalogId: row.catalog_id } : {}), ...(rental ? { rentalId: rental.id } : {}) };
        if (!full.icon) delete full.icon;
        // mesma coisa comprada de novo empilha (nao ocupa outro espaco da mochila)
        const same = !rental && kind === 'item' ? inventory.findIndex((it) => it && !it.rentalId && !it.contents?.length && ((row.catalog_id && it.catalogId === row.catalog_id) || it.name === row.name)) : -1;
        stacked = same >= 0;
        const fullErr = inventoryLimitError(inventory, [full], stacked ? { ...limits, maxItems: null } : limits);
        if (fullErr) throw httpError(fullErr, 409);
        if (stacked) inventory[same] = { ...inventory[same], quantity: num(inventory[same].quantity, 1) + qty };
        else inventory.push(full);
        entry = full;
      }
      await client.query('update characters set wallet = $1, inventory = $2, updated_at = now() where id = $3', [JSON.stringify(walletFromTotal(wallet - total)), JSON.stringify(inventory), character.id]);
      if (!row.unlimited) await client.query('update campaign_shop_items set stock = stock - $1, updated_at = now() where id = $2', [qty, row.id]);
      if (rental) {
        await client.query(
          `insert into campaign_rentals (id, campaign_id, shop_id, item_id, user_id, character_id, inventory_item_id, boat_id, name, kind, days, price, ends_at, ends_world_minutes)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [rental.id, campaignId, shop.id, row.unlimited ? null : row.id, req.user.id, character.id, entry?.id || null, boat?.id || null, row.name, kind, body.days, total, rental.endsAt, rental.endsWorldMinutes]
        );
      }
      await logTrade(client, { campaignId, shopId: shop.id, userId: req.user.id, characterId: character.id, kind: rent ? 'aluguel' : 'compra', name: row.name, quantity: rent ? body.days : qty, unit, total, meta: { ...meta, ...(boat ? { boatId: boat.id } : {}) } });
      const what = `${qty > 1 ? `${qty}× ` : ''}${row.name}`;
      out = {
        op: body.op, total, wallet: wallet - total, name: row.name, quantity: qty, days: rent ? body.days : undefined, boatId: boat?.id, rentalId: rental?.id,
        message: rent ? `Alugou ${row.name} por ${body.days} ${body.days === 1 ? 'dia' : 'dias'} (${total} dracmas).`
          : kind === 'servico' ? `Pagou ${total} dracmas: ${row.name}.`
            : kind === 'barco' ? `Comprou ${row.name} por ${total} dracmas: está atracado em ${scene.name}.`
              : `Comprou ${what} por ${total} dracmas.`
      };
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
  await emitEvent(campaignId, 'character:updated', { characterId }, 'all', req.user.id);
  await emitEvent(campaignId, 'economy:updated', { shopId: shop.id }, 'all', req.user.id);
  await emitEvent(campaignId, 'economy:trade', { shopId: shop.id, characterId, userId: req.user.id, ...out }, 'master', req.user.id);
  if (out.boatId) await emitEvent(campaignId, 'voyage:updated', { boatId: out.boatId }, 'all', req.user.id);
  return { ...out, received: { kind: 'trade', name: out.name, message: out.message } };
}

export function registerCampaignEconomyRoutes(router) {
  router.use('/:id', (req, res, next) => {
    if (/^\/economy(\/|$)/.test(req.path)) requireDatabase();
    next();
  });

  // ===== visao geral: mestre recebe tudo; jogador, so os proprios alugueis =====
  router.get('/:id/economy', async (req, res) => {
    const { master, campaign } = await requireCampaignMember(req.params.id, req.user);
    await expireRentals(req.params.id);
    const fresh = (await query('select price_mult, rent_hours_per_day, world_minutes, table_rules from campaigns where id = $1', [req.params.id])).rows[0];
    const rules = await loadRules(req.params.id);
    const settings = { priceMult: num(fresh.price_mult, 1), rentHoursPerDay: num(fresh.rent_hours_per_day, 2), worldMinutes: num(fresh.world_minutes), clockOn: rules.clock.on };
    const rentals = (await query(
      `select r.*, c.character_name, s.name as shop_name from campaign_rentals r left join characters c on c.id = r.character_id left join campaign_shops s on s.id = r.shop_id
       where r.campaign_id = $1 and r.status = 'active' ${master ? '' : 'and r.user_id = $2'} order by r.created_at desc`,
      master ? [req.params.id] : [req.params.id, req.user.id]
    )).rows.map((r) => ({
      id: r.id, name: r.name, kind: r.kind, days: r.days, price: r.price, characterId: r.character_id, characterName: r.character_name, shopName: r.shop_name,
      endsAt: r.ends_at, endsWorldMinutes: r.ends_world_minutes == null ? null : Number(r.ends_world_minutes), createdAt: r.created_at, boatId: r.boat_id
    }));
    if (!master) return res.json({ settings, rentals });
    const scenes = (await query('select id, name, price_mult, price_areas, parent_scene_id, grid_size from campaign_scenes where campaign_id = $1 order by position, created_at', [req.params.id])).rows
      .map((s) => ({ id: s.id, name: s.name, parentSceneId: s.parent_scene_id, priceMult: num(s.price_mult, 1), priceAreas: parseJson(s.price_areas, []) }));
    const shops = (await query('select * from campaign_shops where campaign_id = $1 order by created_at', [req.params.id])).rows;
    const items = shops.length ? (await query('select * from campaign_shop_items where shop_id = any($1::uuid[]) order by name', [shops.map((s) => s.id)])).rows : [];
    const npcIds = shops.map((s) => s.npc_id).filter(Boolean);
    const npcs = npcIds.length ? (await query('select id, name, appearance from campaign_npcs where id = any($1::uuid[])', [npcIds])).rows : [];
    const tokens = npcIds.length ? (await query('select t.id, t.npc_id, t.scene_id, t.x, t.y, t.size, t.hidden, t.wander, s.grid_size, s.price_mult, s.price_areas from campaign_tokens t join campaign_scenes s on s.id = t.scene_id where t.npc_id = any($1::uuid[])', [npcIds])).rows : [];
    res.json({
      settings,
      rentals,
      scenes,
      archetypes: ARCHETYPES.map(({ stock, ...a }) => a),
      shops: shops.map((s) => {
        const toks = tokens.filter((t) => t.npc_id && t.npc_id === s.npc_id);
        const first = toks[0];
        const m = placeMults(campaign && { price_mult: settings.priceMult }, first && { price_mult: first.price_mult, price_areas: first.price_areas }, s, first && homeCellOf(first, { grid_size: first.grid_size }));
        const npc = npcs.find((n) => n.id === s.npc_id);
        return {
          ...shopView(s),
          mults: m,
          npc: npc ? { id: npc.id, name: npc.name, appearance: parseJson(npc.appearance, null) } : null,
          tokens: toks.map((t) => ({ id: t.id, sceneId: t.scene_id, x: Number(t.x), y: Number(t.y), hidden: t.hidden, wander: parseJson(t.wander, null) || { mode: 'parado' } })),
          items: items.filter((i) => i.shop_id === s.id).map((i) => itemView(i, m, true))
        };
      })
    });
  });

  // ===== multiplicadores: campanha e cena (cidade/mapa) com areas =====
  router.patch('/:id/economy/settings', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const body = z.object({ priceMult: mult.optional(), rentHoursPerDay: z.coerce.number().min(0.1).max(240).optional() }).parse(req.body || {});
    const row = (await query(
      `update campaigns set price_mult = coalesce($1, price_mult), rent_hours_per_day = coalesce($2, rent_hours_per_day) where id = $3 returning price_mult, rent_hours_per_day`,
      [body.priceMult != null ? cleanMult(body.priceMult) : null, body.rentHoursPerDay ?? null, req.params.id]
    )).rows[0];
    await emitEvent(req.params.id, 'economy:updated', { settings: true }, 'all', req.user.id);
    res.json({ priceMult: num(row.price_mult, 1), rentHoursPerDay: num(row.rent_hours_per_day, 2) });
  });

  router.patch('/:id/economy/scenes/:sceneId', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const body = z.object({ priceMult: mult.optional(), priceAreas: z.array(areaSchema).max(50).optional() }).parse(req.body || {});
    const areas = body.priceAreas?.map((a, i) => ({ id: a.id || `a${Date.now().toString(36)}${i}`, name: a.name || 'Área', x: Math.floor(a.x), y: Math.floor(a.y), w: Math.floor(a.w), h: Math.floor(a.h), mult: cleanMult(a.mult) }));
    const row = (await query(
      `update campaign_scenes set price_mult = coalesce($1, price_mult), price_areas = coalesce($2::jsonb, price_areas) where id = $3 and campaign_id = $4 returning id, price_mult, price_areas`,
      [body.priceMult != null ? cleanMult(body.priceMult) : null, areas ? JSON.stringify(areas) : null, req.params.sceneId, req.params.id]
    )).rows[0];
    if (!row) throw httpError('Cena não encontrada.', 404);
    await emitEvent(req.params.id, 'economy:updated', { sceneId: row.id }, 'all', req.user.id);
    res.json({ id: row.id, priceMult: num(row.price_mult, 1), priceAreas: parseJson(row.price_areas, []) });
  });

  // ===== mercador a partir de um modelo (NPC + loja + estoque + token no mapa) =====
  router.post('/:id/economy/merchants', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const body = merchantCreateSchema.parse(req.body || {});
    const a = ARCHETYPE_BY_ID[body.archetype];
    const scene = (await query('select * from campaign_scenes where id = $1 and campaign_id = $2', [body.sceneId, req.params.id])).rows[0];
    if (!scene) throw httpError('Cena não encontrada.', 404);
    const tiles = parseJson(scene.tiles, null);
    const grid = scene.grid_size || 70;
    const cols = tiles?.cols || Math.floor((scene.width || grid * 24) / grid);
    const rows = tiles?.rows || Math.floor((scene.height || grid * 16) / grid);
    const cx = Math.max(0, Math.min(cols - 1, Math.floor(body.x ?? cols / 2)));
    const cy = Math.max(0, Math.min(rows - 1, Math.floor(body.y ?? rows / 2)));
    const name = body.name || NAMES[Math.floor(Math.random() * NAMES.length)];
    const client = await pool.connect();
    let shop;
    let tokenId;
    try {
      await client.query('begin');
      const npc = (await client.query(
        `insert into campaign_npcs (campaign_id, name, kind, hp_max, notes, appearance) values ($1,$2,'npc',10,$3,$4) returning *`,
        [req.params.id, name, `${a.title}. ${a.greeting}`, body.appearance ? JSON.stringify(body.appearance) : null]
      )).rows[0];
      shop = (await client.query(
        `insert into campaign_shops (campaign_id, name, description, category, visible_to_players, archetype, npc_id, greeting, price_mult, buys, buy_rate, buy_categories)
         values ($1,$2,$3,$4,true,$5,$6,$7,1,$8,$9,$10) returning *`,
        [req.params.id, (body.shopName || `${a.name} ${name}`).slice(0, 120), a.title, a.shopCategory, a.id, npc.id, a.greeting, a.buys, a.buyRate, JSON.stringify(a.buyCategories)]
      )).rows[0];
      for (const [cid, qty] of archetypeStock(a.id)) await insertShopItem(client, shop.id, catalogRow(cid, qty));
      const wander = body.wander ? cleanWander(body.wander) : null;
      tokenId = (await client.query(
        `insert into campaign_tokens (scene_id, campaign_id, kind, npc_id, name, x, y, size, hidden, wander) values ($1,$2,'npc',$3,$4,$5,$6,1,$7,$8) returning id`,
        [scene.id, req.params.id, npc.id, name, cx * grid, cy * grid, Boolean(body.hidden), wander && wander.mode !== 'parado' ? JSON.stringify(wander) : null]
      )).rows[0].id;
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
    await emitTokens(req.params.id, shop.npc_id, req.user.id);
    await emitEvent(req.params.id, 'economy:updated', { shopId: shop.id }, 'master', req.user.id);
    res.status(201).json({ shop: shopView(shop), tokenId });
  });

  router.patch('/:id/economy/shops/:shopId', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const shop = await loadShop(req.params.id, req.params.shopId);
    const b = shopPatchSchema.parse(req.body || {});
    const row = (await query(
      `update campaign_shops set name = coalesce($1, name), greeting = coalesce($2, greeting), price_mult = coalesce($3, price_mult), buys = coalesce($4, buys),
         buy_rate = coalesce($5, buy_rate), buy_categories = coalesce($6::jsonb, buy_categories), visible_to_players = coalesce($7, visible_to_players),
         archetype = coalesce($8, archetype), updated_at = now()
       where id = $9 returning *`,
      [b.name ?? null, b.greeting ?? null, b.priceMult != null ? cleanMult(b.priceMult) : null, b.buys ?? null, b.buyRate ?? null,
        b.buyCategories ? JSON.stringify(b.buyCategories) : null, b.visibleToPlayers ?? null, b.archetype ?? null, shop.id]
    )).rows[0];
    if (b.visibleToPlayers !== undefined && row.npc_id) await emitTokens(req.params.id, row.npc_id, req.user.id);
    await emitEvent(req.params.id, 'economy:updated', { shopId: row.id }, 'all', req.user.id);
    res.json(shopView(row));
  });

  router.delete('/:id/economy/shops/:shopId', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const shop = await loadShop(req.params.id, req.params.shopId);
    const keepNpc = req.query.keepNpc === '1';
    await query('delete from campaign_shops where id = $1', [shop.id]);
    if (shop.npc_id && !keepNpc) {
      const gone = (await query('delete from campaign_tokens where npc_id = $1 and campaign_id = $2 returning id, scene_id', [shop.npc_id, req.params.id])).rows;
      for (const t of gone) await emitEvent(req.params.id, 'token:removed', { tokenId: t.id, sceneId: t.scene_id }, 'all', req.user.id);
      await query('delete from campaign_npcs where id = $1 and campaign_id = $2', [shop.npc_id, req.params.id]);
    } else if (shop.npc_id) await emitTokens(req.params.id, shop.npc_id, req.user.id);
    await emitEvent(req.params.id, 'economy:updated', { shopId: shop.id, removed: true }, 'all', req.user.id);
    res.status(204).end();
  });

  // aparencia / nome do NPC (o token muda junto)
  router.patch('/:id/economy/npcs/:npcId', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const b = z.object({ name: z.string().trim().min(1).max(60).optional(), appearance: z.record(z.any()).nullable().optional() }).parse(req.body || {});
    const npc = (await query(
      `update campaign_npcs set name = coalesce($1, name), appearance = case when $2::boolean then $3::jsonb else appearance end, updated_at = now()
       where id = $4 and campaign_id = $5 returning *`,
      [b.name ?? null, b.appearance !== undefined, b.appearance ? JSON.stringify(b.appearance) : null, req.params.npcId, req.params.id]
    )).rows[0];
    if (!npc) throw httpError('NPC não encontrado.', 404);
    if (b.name) await query('update campaign_tokens set name = $1, updated_at = now() where npc_id = $2', [b.name, npc.id]);
    await emitTokens(req.params.id, npc.id, req.user.id);
    res.json({ id: npc.id, name: npc.name, appearance: parseJson(npc.appearance, null) });
  });

  // movimento de um token de NPC (qualquer NPC/monstro, nao so mercador)
  router.put('/:id/economy/tokens/:tokenId/wander', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const w = cleanWander(wanderSchema.parse(req.body || {}));
    const row = (await query(
      `update campaign_tokens set wander = $1, updated_at = now() where id = $2 and campaign_id = $3 and kind in ('npc', 'monster') returning id, npc_id, hidden, scene_id`,
      [w.mode === 'parado' ? null : JSON.stringify(w), req.params.tokenId, req.params.id]
    )).rows[0];
    if (!row) throw httpError('Token de NPC não encontrado.', 404);
    const t = (await query(`${TOKEN_SELECT} where t.id = $1`, [row.id])).rows[0];
    if (!t.hidden) await emitEvent(req.params.id, 'token:updated', { token: tokenView(t), view: 'player' }, 'all', req.user.id);
    await emitEvent(req.params.id, 'token:updated', { token: tokenView(t, { master: true }), view: 'master' }, 'master', req.user.id);
    res.json({ tokenId: row.id, wander: w });
  });

  // ===== estoque =====
  router.post('/:id/economy/shops/:shopId/items', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const shop = await loadShop(req.params.id, req.params.shopId);
    const b = itemCreateSchema.parse(req.body || {});
    let r;
    if (b.catalogId) {
      if (!CATALOG_BY_ID[b.catalogId]) throw httpError('Item do catálogo não encontrado.', 404);
      r = catalogRow(b.catalogId, b.stock ?? 5);
      if (b.unlimited != null) r.unlimited = b.unlimited;
    } else {
      if (!b.name) throw httpError('Dê um nome ao item.');
      const cat = b.category || 'aventura';
      r = {
        name: b.name, description: b.description || '', price_dracmas: b.priceDracmas ?? 1, stock: b.stock ?? 1, category: CATEGORIES[cat].label, weight: b.weight ?? 0,
        catalog_id: null, kind: b.kind || 'item', rent_per_day: b.rentPerDay || null, rent_only: Boolean(b.rentOnly), unlimited: Boolean(b.unlimited), base_stock: b.stock ?? 1, icon: null, boat_type: null
      };
    }
    const row = await insertShopItem({ query }, shop.id, r);
    await emitEvent(req.params.id, 'economy:updated', { shopId: shop.id }, 'all', req.user.id);
    res.status(201).json(itemView(row, { merchant: shop.price_mult }, true));
  });

  router.patch('/:id/economy/items/:itemId', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const b = itemPatchSchema.parse(req.body || {});
    const map = { name: 'name', description: 'description', priceDracmas: 'price_dracmas', rentPerDay: 'rent_per_day', rentOnly: 'rent_only', stock: 'stock', baseStock: 'base_stock', unlimited: 'unlimited', available: 'available', weight: 'weight', kind: 'kind' };
    const keys = Object.keys(map).filter((k) => b[k] !== undefined);
    const values = keys.map((k) => (k === 'rentPerDay' && !b[k] ? null : b[k]));
    if (b.category) { keys.push('category'); values.push(CATEGORIES[b.category].label); map.category = 'category'; }
    if (!keys.length) throw httpError('Nada para atualizar.');
    const row = (await query(
      `update campaign_shop_items i set ${keys.map((k, n) => `${map[k]} = $${n + 1}`).join(', ')}, updated_at = now()
       from campaign_shops s where i.shop_id = s.id and s.campaign_id = $${keys.length + 1} and i.id = $${keys.length + 2} returning i.*, s.price_mult as shop_mult`,
      [...values, req.params.id, req.params.itemId]
    )).rows[0];
    if (!row) throw httpError('Item não encontrado.', 404);
    await emitEvent(req.params.id, 'economy:updated', { shopId: row.shop_id }, 'all', req.user.id);
    res.json(itemView(row, { merchant: row.shop_mult }, true));
  });

  router.delete('/:id/economy/items/:itemId', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const row = (await query(`delete from campaign_shop_items i using campaign_shops s where i.shop_id = s.id and s.campaign_id = $1 and i.id = $2 returning i.shop_id`, [req.params.id, req.params.itemId])).rows[0];
    if (!row) throw httpError('Item não encontrado.', 404);
    await emitEvent(req.params.id, 'economy:updated', { shopId: row.shop_id }, 'all', req.user.id);
    res.status(204).end();
  });

  // repor estoque (volta ao estoque base) e/ou puxar os precos atuais do catalogo
  router.post('/:id/economy/shops/:shopId/restock', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const shop = await loadShop(req.params.id, req.params.shopId);
    const { prices = false } = z.object({ prices: boolish.optional() }).parse(req.body || {});
    const done = await query(`update campaign_shop_items set stock = greatest(stock, base_stock), updated_at = now() where shop_id = $1 and base_stock is not null and unlimited = false returning id`, [shop.id]);
    if (prices) {
      const items = (await query('select id, catalog_id from campaign_shop_items where shop_id = $1 and catalog_id is not null', [shop.id])).rows;
      for (const it of items) {
        const c = CATALOG_BY_ID[it.catalog_id];
        if (c) await query('update campaign_shop_items set price_dracmas = $1, rent_per_day = $2 where id = $3', [scaled(c.price), c.rent ? scaled(c.rent) : null, it.id]);
      }
    }
    await logTrade({ query }, { campaignId: req.params.id, shopId: shop.id, userId: req.user.id, characterId: null, kind: 'reposicao', name: prices ? 'Estoque e preços do catálogo' : 'Estoque', quantity: done.rowCount });
    await emitEvent(req.params.id, 'economy:updated', { shopId: shop.id }, 'all', req.user.id);
    res.json({ restocked: done.rowCount });
  });

  // livro-caixa: de uma loja ou da campanha toda
  router.get('/:id/economy/log', async (req, res) => {
    await assertCampaignMaster(req.params.id, req.user);
    const shopId = uuid.safeParse(req.query.shopId).success ? req.query.shopId : null;
    const rows = (await query(
      `select t.*, c.character_name, s.name as shop_name from campaign_trades t left join characters c on c.id = t.character_id left join campaign_shops s on s.id = t.shop_id
       where t.campaign_id = $1 ${shopId ? 'and t.shop_id = $2' : ''} order by t.created_at desc limit 100`,
      shopId ? [req.params.id, shopId] : [req.params.id]
    )).rows;
    res.json(rows.map((r) => ({ id: r.id, kind: r.kind, name: r.item_name, quantity: r.quantity, unit: r.unit_price, total: r.total, characterName: r.character_name, shopName: r.shop_name, createdAt: r.created_at })));
  });

  // ===== janela da loja (jogador perto do mercador; o mestre ve igual, para conferir) =====
  router.get('/:id/economy/merchant/:tokenId', async (req, res) => {
    const { master, campaign } = await requireCampaignMember(req.params.id, req.user);
    await expireRentals(req.params.id);
    const merchant = (await query(`${TOKEN_SELECT} where t.id = $1 and t.campaign_id = $2`, [req.params.tokenId, req.params.id])).rows[0];
    if (!merchant || !merchant.shop_id || (!master && (merchant.hidden || !merchant.shop_visible))) throw httpError('Esse mercador não está aqui.', 404);
    const shop = (await query('select * from campaign_shops where id = $1', [merchant.shop_id])).rows[0];
    const scene = (await query('select * from campaign_scenes where id = $1', [merchant.scene_id])).rows[0];
    const m = placeMults(campaign, scene, shop, homeCellOf(merchant, scene));
    const items = (await query('select * from campaign_shop_items where shop_id = $1 order by name', [shop.id])).rows.filter((i) => master || i.available !== false);
    const rules = await loadRules(req.params.id);
    const out = {
      merchant: { tokenId: merchant.id, name: merchant.name, appearance: parseJson(merchant.npc_appearance, null) },
      shop: { id: shop.id, name: shop.name, archetype: shop.archetype, greeting: shop.greeting || '', buys: Boolean(shop.buys), buyCategories: parseJson(shop.buy_categories, []) },
      items: items.map((i) => itemView(i, m, master)),
      mode: master ? 'livre' : playerRights(rules, req.user.id).trade,
      paused: !rules.act,
      clockOn: rules.clock.on,
      rentHoursPerDay: num(campaign.rent_hours_per_day, 2),
      ...(master ? { mults: m, total: totalMult(m) } : {})
    };
    // personagem do jogador nesta cena: carteira, mochila com a oferta de cada item e limites
    const member = master ? null : (await query('select coalesce(shared_character_id, character_id) as cid from campaign_members where campaign_id = $1 and user_id = $2', [req.params.id, req.user.id])).rows[0];
    const character = member?.cid ? (await query('select id, character_name, wallet, inventory from characters where id = $1', [member.cid])).rows[0] : null;
    if (character) {
      const inv = parseJson(character.inventory, []);
      const shopRule = { buys: Boolean(shop.buys), buyRate: num(shop.buy_rate, 0.5), buyCategories: parseJson(shop.buy_categories, []) };
      out.character = {
        id: character.id, name: character.character_name, wallet: walletTotal(parseJson(character.wallet, {})),
        limits: inventoryLimits(rules, req.user.id),
        inventory: inv.map((it) => ({ id: it.id, name: it.name, quantity: num(it.quantity, 1), weight: num(it.weight, 0), category: it.category, icon: it.icon, catalogId: it.catalogId, rentalId: it.rentalId, contents: it.contents?.length || 0, offer: sellOffer(it, shopRule, m), cat: catalogCategory(it) }))
      };
    }
    res.json(out);
  });

  router.post('/:id/economy/trade', async (req, res) => {
    let out;
    try {
      out = await doTrade(req, req.body);
    } catch (error) {
      if (!error.askMaster) throw error;
      const request = await createRequest(req.params.id, req.user.id, error.askMaster);
      return res.status(202).json({ requested: true, request, message: 'Pedido enviado ao mestre…' });
    }
    res.status(201).json(out);
  });

  // ===== alugueis =====
  router.post('/:id/economy/rentals/:rentalId/end', async (req, res) => {
    const { master } = await requireCampaignMember(req.params.id, req.user);
    if (!uuid.safeParse(req.params.rentalId).success) throw httpError('Aluguel não encontrado.', 404);
    const rental = (await query(`select * from campaign_rentals where id = $1 and campaign_id = $2 and status = 'active'`, [req.params.rentalId, req.params.id])).rows[0];
    if (!rental || (!master && rental.user_id !== req.user.id)) throw httpError('Aluguel não encontrado.', 404);
    await closeRental(rental.id, master ? 'ended' : 'returned', req.user.id);
    res.json({ ok: true });
  });
}
