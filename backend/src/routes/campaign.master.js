// Rotas do mestre para mexer nas fichas COMPARTILHADAS na campanha: vitais, atributos, pericias,
// dinheiro, condicoes, anotacoes, inventario (com mochila/bau), ataques, magias e aparencia.
// O mestre e deus: ignora o limite de peso/itens da mesa, mas a resposta avisa quando passou.
// Toda alteracao vira 'character:updated' (a tela do jogador recarrega) e um registro
// 'character:master-edit' (historico do mestre + aviso curto para o dono da ficha).
import { z } from 'zod';
import { pool, query } from '../db/pool.js';
import { assertCampaignMaster } from '../utils/campaignAccess.js';
import { emitEvent } from '../utils/events.js';
import { httpError, requireDatabase } from '../utils/http.js';
import { inventoryLimitError, inventoryLoad } from '../utils/itemWeight.js';
import { ATTRIBUTE_KEYS } from '../utils/rules.js';
import { inventoryLimits } from '../utils/tableRules.js';
import {
  appearanceJson,
  appearanceSchema,
  clampCurrent,
  enrich,
  itemSchema,
  loadCatalogs,
  normalizeItem,
  normalizePower,
  normalizeSkillTraining,
  normalizeWallet,
  parseJsonField,
  powerField,
  powerSchema,
  recordCharacterSave,
  skillKeys,
  toJson,
  walletSchema
} from './character.routes.js';
import { loadRules, sharedInCampaign } from './campaign.v2.js';

const MAX_CONTENTS = 30; // mesmo limite do itemSchema (recipiente com 1 nivel so)
const int = (min, max) => z.coerce.number().int().min(min).max(max);
const itemIdSchema = z.string().min(1).max(80);

const sheetPatchSchema = z.object({
  characterName: z.string().trim().min(1).max(120),
  playerName: z.string().trim().min(1).max(120),
  level: int(1, 20),
  lifeCurrent: int(-100000, 100000),
  lifeMax: int(1, 100000),
  sanityCurrent: int(-100000, 100000),
  sanityMax: int(1, 100000),
  mana: int(-100000, 100000),
  manaMax: int(0, 100000),
  defense: int(0, 1000),
  attributes: z.record(int(-20, 100)),
  skills: z.record(z.coerce.number()),
  skillBonuses: z.record(int(-100, 100)),
  wallet: walletSchema,
  conditions: z.array(z.string().trim().min(1).max(40)).max(20),
  notes: z.string().max(20000),
  inventory: z.array(itemSchema).max(500),
  attacks: z.array(powerSchema).max(100),
  spells: z.array(powerSchema).max(100)
}).partial();

// campo do corpo -> coluna, rotulo (pt-BR) e se e numero simples (mostra "antes -> depois")
const SHEET_FIELDS = {
  characterName: ['character_name', 'nome'],
  playerName: ['player_name', 'nome do jogador'],
  level: ['level', 'nível', true],
  lifeCurrent: ['life_current', 'vida', true],
  lifeMax: ['life_max', 'vida máxima', true],
  sanityCurrent: ['sanity_current', 'sanidade', true],
  sanityMax: ['sanity_max', 'sanidade máxima', true],
  mana: ['mana', 'mana', true],
  manaMax: ['mana_max', 'mana máxima', true],
  defense: ['defense', 'defesa', true],
  attributes: ['attributes', 'atributos'],
  skills: ['skills', 'perícias'],
  skillBonuses: ['skill_bonuses', 'bônus de perícias'],
  wallet: ['wallet', 'dinheiro'],
  conditions: ['conditions', 'condições'],
  notes: ['notes', 'anotações'],
  inventory: ['inventory', 'inventário'],
  attacks: ['attacks', 'ataques'],
  spells: ['spells', 'magias']
};
const JSON_COLUMNS = new Set(['attributes', 'skills', 'skill_bonuses', 'inventory', 'attacks', 'spells', 'wallet', 'conditions']);
// mudancas que apagam coisa da ficha: guarda uma copia de antes (character_saves) para desfazer
const BACKUP_FIELDS = new Set(['characterName', 'playerName', 'level', 'attributes', 'skills', 'skillBonuses', 'inventory', 'attacks', 'spells']);

const label = (item) => `${item.name}${Number(item.quantity ?? 1) !== 1 ? ` ×${item.quantity}` : ''}`;

// Acha um item no inventario: no topo ou dentro de uma mochila/bau.
function locate(inventory, itemId) {
  const top = inventory.findIndex((item) => item.id === itemId);
  if (top !== -1) return { item: inventory[top], index: top, parent: null };
  for (const parent of inventory) {
    const index = (parent.contents || []).findIndex((item) => item.id === itemId);
    if (index !== -1) return { item: parent.contents[index], index, parent };
  }
  return null;
}

// Tira o item de onde estiver (devolve a lista nova sem mexer na antiga).
function withoutItem(inventory, itemId) {
  return inventory
    .filter((item) => item.id !== itemId)
    .map((item) => (item.contents?.some((inner) => inner.id === itemId)
      ? { ...item, contents: item.contents.filter((inner) => inner.id !== itemId) }
      : item));
}

// Item dentro de recipiente nao pode ser recipiente (1 nivel so).
function flat(item) {
  const { contents: _c, container: _k, ...rest } = item;
  return rest;
}

function putInside(inventory, containerId, item) {
  const target = inventory.find((entry) => entry.id === containerId);
  if (!target) throw httpError('Recipiente não encontrado.', 404);
  if (!target.container) throw httpError('Este item não é uma mochila nem um baú.', 409);
  if ((target.contents || []).length >= MAX_CONTENTS) throw httpError(`No máximo ${MAX_CONTENTS} itens dentro de um recipiente.`, 409);
  return { list: inventory.map((entry) => (entry.id === containerId ? { ...entry, contents: [...(entry.contents || []), flat(item)] } : entry)), target };
}

// Aviso (nao bloqueia): o mestre pode passar do limite que ele mesmo definiu.
function limitInfo(inventory, rules, ownerId) {
  const limits = inventoryLimits(rules, ownerId);
  const message = inventoryLimitError([], inventory, limits);
  return {
    load: inventoryLoad(inventory),
    limits,
    warning: message ? message.replace(/^Mochila cheia: passa/, 'Inventário acima do limite: passa') : null
  };
}

async function assertSharedCharacter(campaignId, characterId) {
  if (!z.string().uuid().safeParse(characterId).success) throw httpError('Ficha não encontrada.', 404);
  if (!(await sharedInCampaign(campaignId, characterId))) throw httpError('Esta ficha não está compartilhada nesta campanha.', 403);
}

async function notifyEdit(campaignId, character, summary, userId) {
  await emitEvent(campaignId, 'character:updated', { characterId: character.id }, 'all', userId);
  const payload = { characterId: character.id, characterName: character.character_name, ownerId: character.owner_id, summary };
  await emitEvent(campaignId, 'character:master-edit', payload, 'master', userId);
  if (character.owner_id !== userId) await emitEvent(campaignId, 'character:master-edit', payload, character.owner_id, userId);
}

async function responseFor(campaignId, row, rules = null) {
  const character = await enrich(row);
  return { character, ...limitInfo(character.inventory, rules || await loadRules(campaignId), row.owner_id) };
}

// Edita uma ficha numa transacao (linha travada). mutate(row) devolve { set: {coluna: valor}, summary, backup? }.
async function editCharacter(req, mutate) {
  requireDatabase();
  await assertCampaignMaster(req.params.id, req.user);
  await assertSharedCharacter(req.params.id, req.params.characterId);
  const client = await pool.connect();
  let before;
  let updated;
  let change;
  try {
    await client.query('begin');
    before = (await client.query('select * from characters where id = $1 for update', [req.params.characterId])).rows[0];
    if (!before) throw httpError('Ficha não encontrada.', 404);
    change = await mutate(before);
    const columns = Object.keys(change.set || {});
    if (!columns.length) throw httpError('Nada para alterar.');
    const values = columns.map((column) => {
      const value = change.set[column];
      if (column === 'appearance') return appearanceJson(value);
      return JSON_COLUMNS.has(column) ? toJson(value) : value;
    });
    updated = (await client.query(
      `update characters set ${columns.map((column, index) => `${column} = $${index + 1}`).join(', ')}, updated_at = now()
       where id = $${columns.length + 1} returning *`,
      [...values, before.id]
    )).rows[0];
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
  if (change.backup) await recordCharacterSave(before, `Antes do mestre: ${change.summary}`.slice(0, 120));
  await notifyEdit(req.params.id, updated, change.summary, req.user.id);
  return responseFor(req.params.id, updated);
}

const listOf = (row, column) => parseJsonField(row[column], []);

export function registerCampaignMasterRoutes(router) {
  // ===== visao geral: todas as fichas compartilhadas com vitais e carga =====
  router.get('/:id/master/characters', async (req, res) => {
    requireDatabase();
    await assertCampaignMaster(req.params.id, req.user);
    const { rows } = await query(
      `select c.*, r.name as race_name, cl.name as class_name, o.name as origin_name,
              cm.user_id as member_user_id, u.name as member_name, cm.color as member_color
       from campaign_members cm
       join users u on u.id = cm.user_id
       join characters c on c.id = coalesce(cm.shared_character_id, cm.character_id)
       left join races r on r.id = c.race_id
       left join classes cl on cl.id = c.class_id
       left join origins o on o.id = c.origin_id
       where cm.campaign_id = $1
       order by u.name asc`,
      [req.params.id]
    );
    const [catalogs, rules] = await Promise.all([loadCatalogs(), loadRules(req.params.id)]);
    const list = await Promise.all(rows.map(async (row) => {
      const sheet = await enrich(row, catalogs);
      return {
        id: sheet.id,
        owner_id: sheet.owner_id,
        member: { user_id: row.member_user_id, name: row.member_name, color: row.member_color },
        character_name: sheet.character_name,
        player_name: sheet.player_name,
        photo: sheet.photo,
        level: sheet.level,
        race_name: sheet.race_name,
        class_name: sheet.class_name,
        life_current: sheet.life_current,
        life_max: sheet.life_max,
        sanity_current: sheet.sanity_current,
        sanity_max: sheet.sanity_max,
        mana: sheet.mana,
        mana_max: sheet.mana_max,
        total_defense: sheet.total_defense,
        dodge: sheet.dodge,
        wallet_total_dracmas: sheet.wallet_total_dracmas,
        conditions: parseJsonField(sheet.conditions, []),
        ...limitInfo(sheet.inventory, rules, sheet.owner_id)
      };
    }));
    res.json(list);
  });

  // ===== pontos rapidos: soma/tira vida, sanidade ou mana de um ou varios personagens de uma vez =====
  // delta relativo (nao valor absoluto): dois cliques rapidos nao se atropelam.
  router.post('/:id/master/points', async (req, res) => {
    requireDatabase();
    await assertCampaignMaster(req.params.id, req.user);
    const body = z.object({
      characterIds: z.array(z.string().uuid()).min(1).max(50),
      vital: z.enum(['life', 'sanity', 'mana']),
      delta: int(-100000, 100000).refine((value) => value !== 0, 'Informe um valor diferente de zero.')
    }).parse(req.body || {});
    const ids = [...new Set(body.characterIds)];
    for (const characterId of ids) await assertSharedCharacter(req.params.id, characterId);
    const [current, max] = { life: ['life_current', 'life_max'], sanity: ['sanity_current', 'sanity_max'], mana: ['mana', 'mana_max'] }[body.vital];
    const { rows } = await query(
      `update characters set ${current} = greatest(0, least(${max}, ${current} + $1)), updated_at = now()
       where id = any($2::uuid[]) returning id, owner_id, character_name, life_current, life_max, sanity_current, sanity_max, mana, mana_max`,
      [body.delta, ids]
    );
    const name = { life: 'vida', sanity: 'sanidade', mana: 'mana' }[body.vital];
    const summary = `${body.delta > 0 ? 'deu' : 'tirou'} ${Math.abs(body.delta)} de ${name}`;
    for (const row of rows) await notifyEdit(req.params.id, row, `${summary} (agora ${row[current]}/${row[max]})`, req.user.id);
    res.json(rows);
  });

  // ===== historico das alteracoes do mestre nesta ficha (ultimas 24h, TTL dos eventos) =====
  router.get('/:id/master/characters/:characterId/log', async (req, res) => {
    requireDatabase();
    await assertCampaignMaster(req.params.id, req.user);
    await assertSharedCharacter(req.params.id, req.params.characterId);
    const { rows } = await query(
      `select e.id, e.payload, e.created_at, u.name as by_name
       from campaign_events e
       left join users u on u.id = e.created_by
       where e.campaign_id = $1 and e.type = 'character:master-edit' and e.audience = 'master'
         and e.payload->>'characterId' = $2
       order by e.id desc
       limit 40`,
      [req.params.id, req.params.characterId]
    );
    res.json(rows.map((row) => ({ id: Number(row.id), summary: row.payload?.summary || '', by: row.by_name, created_at: row.created_at })));
  });

  // ===== ficha: qualquer campo de jogo (parcial) =====
  router.patch('/:id/master/characters/:characterId', async (req, res) => {
    const body = sheetPatchSchema.parse(req.body || {});
    const result = await editCharacter(req, async (row) => {
      const set = {};
      const changed = [];
      const keys = Object.keys(SHEET_FIELDS).filter((key) => body[key] !== undefined);
      const lifeMax = body.lifeMax ?? row.life_max;
      const sanityMax = body.sanityMax ?? row.sanity_max;
      const manaMax = body.manaMax ?? row.mana_max;
      for (const key of keys) {
        const [column, name, scalar] = SHEET_FIELDS[key];
        let value = body[key];
        if (key === 'attributes') {
          const current = parseJsonField(row.attributes, {});
          value = { ...current, ...Object.fromEntries(Object.entries(value).filter(([attr]) => ATTRIBUTE_KEYS.includes(attr))) };
        } else if (key === 'skills') {
          value = normalizeSkillTraining({ ...parseJsonField(row.skills, {}), ...value }, await skillKeys());
        } else if (key === 'skillBonuses') {
          value = { ...parseJsonField(row.skill_bonuses, {}), ...value };
        } else if (key === 'wallet') {
          value = normalizeWallet(value);
        } else if (key === 'inventory') {
          value = value.map(normalizeItem);
        } else if (key === 'attacks' || key === 'spells') {
          value = value.map(normalizePower);
        }
        set[column] = value;
        changed.push(scalar && Number(row[column]) !== Number(value) ? `${name} (${row[column]} → ${value})` : name);
      }
      // atual sempre entre 0 e o maximo (o maximo pode ter mudado junto)
      if (body.lifeCurrent !== undefined || body.lifeMax !== undefined) set.life_current = clampCurrent(body.lifeCurrent ?? row.life_current, lifeMax);
      if (body.sanityCurrent !== undefined || body.sanityMax !== undefined) set.sanity_current = clampCurrent(body.sanityCurrent ?? row.sanity_current, sanityMax);
      if (body.mana !== undefined || body.manaMax !== undefined) set.mana = clampCurrent(body.mana ?? row.mana, manaMax);
      return { set, summary: `alterou ${changed.join(', ')}`, backup: keys.some((key) => BACKUP_FIELDS.has(key)) };
    });
    res.json(result);
  });

  router.patch('/:id/master/characters/:characterId/appearance', async (req, res) => {
    const { appearance } = z.object({ appearance: appearanceSchema }).parse(req.body || {});
    res.json(await editCharacter(req, async () => ({ set: { appearance }, summary: 'alterou a aparência' })));
  });

  // ===== inventario =====
  // Adiciona item (dar ao jogador). containerId: ja coloca dentro de uma mochila/bau.
  router.post('/:id/master/characters/:characterId/inventory', async (req, res) => {
    const { containerId } = z.object({ containerId: itemIdSchema.nullable().optional() }).parse(req.body || {});
    const { containerId: _drop, ...raw } = req.body || {};
    const item = normalizeItem(raw);
    const result = await editCharacter(req, async (row) => {
      const inventory = listOf(row, 'inventory');
      if (!containerId) return { set: { inventory: [...inventory, item] }, summary: `deu ${label(item)}` };
      if (item.container) throw httpError('Um recipiente não cabe dentro de outro.', 409);
      const { list, target } = putInside(inventory, containerId, item);
      return { set: { inventory: list }, summary: `deu ${label(item)} (em ${target.name})` };
    });
    res.status(201).json({ ...result, item });
  });

  // Edita item (no topo ou dentro de recipiente). Campos ausentes ficam como estao.
  router.put('/:id/master/characters/:characterId/inventory/:itemId', async (req, res) => {
    const itemId = itemIdSchema.parse(req.params.itemId);
    const result = await editCharacter(req, async (row) => {
      const inventory = listOf(row, 'inventory');
      const found = locate(inventory, itemId);
      if (!found) throw httpError('Item não encontrado.', 404);
      const { containerId: _drop, ...raw } = req.body || {};
      let next = normalizeItem({ ...found.item, ...raw, id: itemId });
      if (found.parent) next = flat(next);
      const list = found.parent
        ? inventory.map((entry) => (entry === found.parent ? { ...entry, contents: entry.contents.map((inner, i) => (i === found.index ? next : inner)) } : entry))
        : inventory.map((entry, i) => (i === found.index ? next : entry));
      const qty = Number(found.item.quantity ?? 1) !== Number(next.quantity) ? ` (quantidade ${found.item.quantity ?? 1} → ${next.quantity})` : '';
      return { set: { inventory: list }, summary: `editou ${next.name}${qty}` };
    });
    res.json(result);
  });

  // Remove item (tirar do jogador). ?quantity=n tira so n unidades; sem ele (ou n >= total) remove tudo.
  router.delete('/:id/master/characters/:characterId/inventory/:itemId', async (req, res) => {
    const itemId = itemIdSchema.parse(req.params.itemId);
    const { quantity } = z.object({ quantity: z.coerce.number().positive().optional() }).parse(req.query || {});
    const result = await editCharacter(req, async (row) => {
      const inventory = listOf(row, 'inventory');
      const found = locate(inventory, itemId);
      if (!found) throw httpError('Item não encontrado.', 404);
      const have = Number(found.item.quantity ?? 1);
      if (quantity && quantity < have) {
        const left = Math.round((have - quantity) * 100) / 100;
        const patch = (entry) => (entry.id === itemId ? { ...entry, quantity: left } : entry);
        const list = inventory.map((entry) => (entry.contents?.length ? { ...patch(entry), contents: entry.contents.map(patch) } : patch(entry)));
        return { set: { inventory: list }, summary: `tirou ${quantity} de ${found.item.name}` };
      }
      const inside = found.item.contents?.length ? ` com ${found.item.contents.length} ${found.item.contents.length === 1 ? 'item' : 'itens'} dentro` : '';
      return { set: { inventory: withoutItem(inventory, itemId) }, summary: `tirou ${label(found.item)}${inside}`, backup: true };
    });
    res.json(result);
  });

  // Guarda numa mochila/bau (containerId) ou tira de dentro (containerId null).
  router.post('/:id/master/characters/:characterId/inventory/:itemId/move', async (req, res) => {
    const itemId = itemIdSchema.parse(req.params.itemId);
    const { containerId } = z.object({ containerId: itemIdSchema.nullable() }).parse(req.body || {});
    const result = await editCharacter(req, async (row) => {
      const inventory = listOf(row, 'inventory');
      const found = locate(inventory, itemId);
      if (!found) throw httpError('Item não encontrado.', 404);
      if ((found.parent?.id ?? null) === containerId) throw httpError('O item já está aí.', 409);
      const rest = withoutItem(inventory, itemId);
      if (!containerId) {
        return { set: { inventory: [...rest, found.item] }, summary: `tirou ${found.item.name} de ${found.parent.name}` };
      }
      if (containerId === itemId || found.item.container) throw httpError('Um recipiente não cabe dentro de outro.', 409);
      const { list, target } = putInside(rest, containerId, found.item);
      return { set: { inventory: list }, summary: `guardou ${found.item.name} em ${target.name}` };
    });
    res.json(result);
  });

  // Passa um item (ou parte da pilha) para outra ficha compartilhada na mesma campanha.
  router.post('/:id/master/characters/:characterId/inventory/:itemId/transfer', async (req, res) => {
    requireDatabase();
    const itemId = itemIdSchema.parse(req.params.itemId);
    const body = z.object({ toCharacterId: z.string().uuid(), quantity: z.coerce.number().positive().optional() }).parse(req.body || {});
    await assertCampaignMaster(req.params.id, req.user);
    await assertSharedCharacter(req.params.id, req.params.characterId);
    await assertSharedCharacter(req.params.id, body.toCharacterId);
    if (body.toCharacterId === req.params.characterId) throw httpError('Escolha outra ficha.');
    const client = await pool.connect();
    let from;
    let to;
    let summary;
    try {
      await client.query('begin');
      // trava as duas fichas sempre na mesma ordem (evita deadlock)
      const locked = (await client.query('select * from characters where id = any($1::uuid[]) order by id for update', [[req.params.characterId, body.toCharacterId]])).rows;
      from = locked.find((row) => row.id === req.params.characterId);
      to = locked.find((row) => row.id === body.toCharacterId);
      if (!from || !to) throw httpError('Ficha não encontrada.', 404);
      const source = listOf(from, 'inventory');
      const found = locate(source, itemId);
      if (!found) throw httpError('Item não encontrado.', 404);
      const have = Number(found.item.quantity ?? 1);
      const moving = body.quantity && body.quantity < have ? body.quantity : have;
      const left = Math.round((have - moving) * 100) / 100;
      const nextSource = left > 0
        ? source.map((entry) => {
          const patch = (it) => (it.id === itemId ? { ...it, quantity: left } : it);
          return entry.contents?.length ? { ...patch(entry), contents: entry.contents.map(patch) } : patch(entry);
        })
        : withoutItem(source, itemId);
      // id novo quando a pilha foi dividida (os dois lados ficam com o item)
      const given = normalizeItem({ ...found.item, id: left > 0 ? undefined : found.item.id, quantity: moving });
      const nextTarget = [...listOf(to, 'inventory'), given];
      await client.query('update characters set inventory = $1, updated_at = now() where id = $2', [toJson(nextSource), from.id]);
      await client.query('update characters set inventory = $1, updated_at = now() where id = $2', [toJson(nextTarget), to.id]);
      from = { ...from, inventory: nextSource };
      to = { ...to, inventory: nextTarget };
      summary = `passou ${label(given)} de ${from.character_name} para ${to.character_name}`;
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
    await notifyEdit(req.params.id, from, summary, req.user.id);
    await notifyEdit(req.params.id, to, summary, req.user.id);
    const rules = await loadRules(req.params.id);
    const target = limitInfo(to.inventory, rules, to.owner_id);
    res.json({ ...(await responseFor(req.params.id, from, rules)), target: { id: to.id, ...target } });
  });

  // ===== ataques e magias =====
  router.post('/:id/master/characters/:characterId/powers', async (req, res) => {
    const { type, ...raw } = z.object({ type: z.string() }).passthrough().parse(req.body || {});
    const field = powerField(type);
    if (!field) throw httpError('Tipo de poder inválido.');
    const power = normalizePower(raw);
    res.status(201).json(await editCharacter(req, async (row) => ({
      set: { [field]: [...listOf(row, field), power] },
      summary: `deu ${field === 'spells' ? 'a magia' : 'o ataque'} ${power.name}`
    })));
  });

  router.put('/:id/master/characters/:characterId/powers/:type/:powerId', async (req, res) => {
    const field = powerField(req.params.type);
    if (!field) throw httpError('Tipo de poder inválido.');
    res.json(await editCharacter(req, async (row) => {
      const list = listOf(row, field);
      const index = list.findIndex((power) => power.id === req.params.powerId);
      if (index === -1) throw httpError('Poder não encontrado.', 404);
      const power = normalizePower({ ...list[index], ...(req.body || {}), id: req.params.powerId });
      list[index] = power;
      return { set: { [field]: list }, summary: `editou ${field === 'spells' ? 'a magia' : 'o ataque'} ${power.name}` };
    }));
  });

  router.delete('/:id/master/characters/:characterId/powers/:type/:powerId', async (req, res) => {
    const field = powerField(req.params.type);
    if (!field) throw httpError('Tipo de poder inválido.');
    res.json(await editCharacter(req, async (row) => {
      const list = listOf(row, field);
      const power = list.find((entry) => entry.id === req.params.powerId);
      if (!power) throw httpError('Poder não encontrado.', 404);
      return {
        set: { [field]: list.filter((entry) => entry.id !== req.params.powerId) },
        summary: `tirou ${field === 'spells' ? 'a magia' : 'o ataque'} ${power.name}`,
        backup: true
      };
    }));
  });
}
