// Regras da mesa que o mestre controla (campaigns.table_rules):
// { act: false = pausa geral (jogadores nao agem: mover, atacar, pegar, portas);
//   actions: { move, attack, pickup, doors }: 'livre' | 'pedir' (o mestre aprova cada vez) | 'travado'
//     (mover so tem livre/travado; mover travado tambem trava portas);
//   formato antigo ainda aceito: move/powers/pickup booleanos (true = livre, false = travado);
//   turn: tokenId da vez fora do combate (null = livre);
//   inventory: { maxWeight (kg), maxItems } limites do inventario (null = sem limite);
//   players: { [userId]: { actions?, inventory? } } excecoes por jogador (o modo do jogador troca o
//     geral so para ele; campo ausente = vale o geral),
//   sheet: { stats, powers }: 'mestre' (padrao) = so o mestre mexe em vida/mana/sanidade (stats) ou
//   em ataques/magias (powers) das fichas compartilhadas nesta campanha; 'jogador' = o dono tambem,
//   clock: { on, minutes }: hora do mundo (0..1425, de 15 em 15); com on, a luz das cenas de fora segue a hora }
import { z } from 'zod';
import { httpError } from './http.js';

export const ACTIONS = ['move', 'attack', 'pickup', 'doors', 'trade'];
// chave antiga (booleano) de cada acao
const LEGACY = { move: 'move', attack: 'powers', pickup: 'pickup' };
const ASKABLE = { move: false, attack: true, pickup: true, doors: true, trade: true };
const modeSchema = z.enum(['livre', 'pedir', 'travado']);
const actionsSchema = z.object({
  move: z.enum(['livre', 'travado']).nullable().optional(),
  attack: modeSchema.nullable().optional(),
  pickup: modeSchema.nullable().optional(),
  doors: modeSchema.nullable().optional(),
  trade: modeSchema.nullable().optional() // comprar, vender e alugar com os mercadores
});
const flags = { move: z.boolean().optional(), powers: z.boolean().optional(), pickup: z.boolean().optional() };
const limit = (max) => z.coerce.number().min(0).max(max).nullable().optional();
const inventorySchema = z.object({ maxWeight: limit(100000), maxItems: limit(10000) });
const sheetOwner = z.enum(['mestre', 'jogador']).optional();
export const tableRulesSchema = z.object({
  ...flags,
  act: z.boolean().optional(),
  actions: actionsSchema.optional(),
  sheet: z.object({ stats: sheetOwner, powers: sheetOwner }).optional(),
  turn: z.string().uuid().nullable().optional(),
  clock: z.object({ on: z.boolean().optional(), minutes: z.coerce.number().int().min(0).max(1439).optional() }).optional(),
  // alcance da visao dos jogadores: 0 (bem curta) .. 9 (sem limite)
  vision: z.coerce.number().int().min(0).max(9).optional(),
  inventory: inventorySchema.optional(),
  players: z.record(z.string().uuid(), z.object({ ...flags, actions: actionsSchema.optional(), inventory: inventorySchema.optional() })).optional()
});

// true/false do formato antigo viram livre/travado; 'pedir' so onde da para pedir
function cleanMode(action, value) {
  if (value === true || value === 'livre') return 'livre';
  if (value === false || value === 'travado') return 'travado';
  if (value === 'pedir') return ASKABLE[action] ? 'pedir' : 'livre';
  return undefined;
}
// geral: sempre os 4 modos (padrao livre); a nova chave actions ganha da antiga
function generalActions(r) {
  return Object.fromEntries(ACTIONS.map((a) => [a, cleanMode(a, r.actions?.[a]) ?? cleanMode(a, r[LEGACY[a]]) ?? 'livre']));
}
// do jogador: so o que ele tem de diferente; o antigo "false" vira travado, o antigo "true" nao muda nada
function ownActions(own) {
  const out = {};
  for (const a of ACTIONS) {
    const mode = cleanMode(a, own.actions?.[a]) ?? (own[LEGACY[a]] === false ? 'travado' : undefined);
    if (mode) out[a] = mode;
  }
  return out;
}

// null/ausente = sem limite; peso com 2 casas, itens inteiros.
const cleanLimit = (value, int = false) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return int ? Math.floor(n) : Math.round(n * 100) / 100;
};
// Limite padrao de uma mesa nova (o mestre muda ou tira; null salvo = sem limite).
// 30 kg cabe arma + armadura leve + mochila com o basico; 9 itens = os 9 espacos da barra do jogador.
export const DEFAULT_INVENTORY = { maxWeight: 30, maxItems: 9 };
function normalizeInventory(raw, keepMissing = false) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const [key, int] of [['maxWeight', false], ['maxItems', true]]) {
    if (!(key in r)) {
      if (!keepMissing) out[key] = DEFAULT_INVENTORY[key];
      continue;
    }
    out[key] = cleanLimit(r[key], int);
  }
  return out;
}
const sheetRule = (value) => (value === 'jogador' ? 'jogador' : 'mestre');

// hora do mundo em minutos (0..1425, de 15 em 15); sem valor = meio-dia
export const clockMinutes = (v) => { const n = Number(v); return Number.isFinite(n) && v !== null && v !== '' ? ((Math.round(Math.max(0, Math.min(1439, n)) / 15) * 15) % 1440) : 720; };

export function normalizeRules(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    act: r.act !== false,
    actions: generalActions(r),
    turn: r.turn || null,
    inventory: normalizeInventory(r.inventory),
    sheet: { stats: sheetRule(r.sheet?.stats), powers: sheetRule(r.sheet?.powers) },
    clock: { on: r.clock?.on === true, minutes: clockMinutes(r.clock?.minutes) },
    vision: Number.isInteger(Number(r.vision)) && r.vision !== null && r.vision !== '' ? Math.max(0, Math.min(9, Number(r.vision))) : 9,
    players: r.players && typeof r.players === 'object'
      ? Object.fromEntries(Object.entries(r.players).map(([id, own]) => {
        const o = own && typeof own === 'object' ? own : {};
        const entry = {};
        const actions = ownActions(o);
        if (Object.keys(actions).length) entry.actions = actions;
        const inv = normalizeInventory(o.inventory, true);
        if (Object.keys(inv).length) entry.inventory = inv;
        return [id, entry];
      }).filter(([, entry]) => Object.keys(entry).length))
      : {}
  };
}

// Limites do inventario de um jogador: a excecao dele (se tiver) ou o limite geral da mesa.
export function inventoryLimits(rules, userId) {
  const r = normalizeRules(rules);
  const own = r.players[userId]?.inventory || {};
  return {
    maxWeight: 'maxWeight' in own ? own.maxWeight : r.inventory.maxWeight,
    maxItems: 'maxItems' in own ? own.maxItems : r.inventory.maxItems
  };
}

// O que um jogador pode fazer agora (o mestre sempre pode tudo): modo de cada acao ja com a
// pausa geral e a excecao dele aplicadas.
export function playerRights(rules, userId) {
  const r = normalizeRules(rules);
  const own = r.players[userId]?.actions || {};
  const mode = (a) => (r.act ? own[a] ?? r.actions[a] : 'travado');
  const move = mode('move');
  return {
    paused: !r.act,
    move,
    attack: mode('attack'),
    pickup: mode('pickup'),
    // passar pela porta tambem e andar: movimento travado trava as portas
    doors: move === 'travado' ? 'travado' : mode('doors'),
    trade: mode('trade'),
    turn: r.turn
  };
}

export const RIGHT_MESSAGES = {
  paused: 'O mestre pausou a mesa: espere ele liberar.',
  move: 'O mestre travou o movimento agora.',
  attack: 'O mestre travou poderes e ataques agora.',
  pickup: 'O mestre não liberou pegar itens agora.',
  doors: 'O mestre não liberou passar por portas agora.',
  trade: 'O mestre não liberou o comércio agora.'
};

// Lanca erro em pt-BR se o jogador nao pode; devolve o modo ('livre' ou 'pedir').
// turnTokenIds = tokens do jogador envolvidos na acao. 'powers' e o nome antigo de 'attack'.
export function assertRight(rules, userId, right, { turnTokenIds = [], inCombat = false } = {}) {
  const rights = playerRights(rules, userId);
  const key = right === 'powers' ? 'attack' : right;
  if (key && rights[key] === 'travado') {
    const why = rights.paused ? 'paused' : key === 'doors' && rights.move === 'travado' ? 'move' : key;
    throw httpError(RIGHT_MESSAGES[why], 403);
  }
  if (!inCombat && rights.turn && !turnTokenIds.includes(rights.turn)) throw httpError('Agora é a vez de outro personagem.', 409);
  return key ? rights[key] : 'livre';
}
