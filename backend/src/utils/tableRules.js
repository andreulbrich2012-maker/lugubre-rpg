// Regras da mesa que o mestre controla (campaigns.table_rules):
// { move, powers, pickup: liga/desliga para todos; turn: tokenId da vez fora do combate (null = livre);
//   inventory: { maxWeight (kg), maxItems } limites do inventario (null = sem limite);
//   players: { [userId]: { move?, powers?, pickup?, inventory? } } excecoes por jogador (false trava so ele;
//   inventory do jogador troca o limite geral so para ele, campo ausente = vale o geral),
//   sheet: { stats, powers }: 'mestre' (padrao) = so o mestre mexe em vida/mana/sanidade (stats) ou
//   em ataques/magias (powers) das fichas compartilhadas nesta campanha; 'jogador' = o dono tambem }
import { z } from 'zod';
import { httpError } from './http.js';

const flags = { move: z.boolean().optional(), powers: z.boolean().optional(), pickup: z.boolean().optional() };
const limit = (max) => z.coerce.number().min(0).max(max).nullable().optional();
const inventorySchema = z.object({ maxWeight: limit(100000), maxItems: limit(10000) });
const sheetOwner = z.enum(['mestre', 'jogador']).optional();
export const tableRulesSchema = z.object({
  ...flags,
  sheet: z.object({ stats: sheetOwner, powers: sheetOwner }).optional(),
  turn: z.string().uuid().nullable().optional(),
  inventory: inventorySchema.optional(),
  players: z.record(z.string().uuid(), z.object({ ...flags, inventory: inventorySchema.optional() })).optional()
});

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

export function normalizeRules(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    move: r.move !== false,
    powers: r.powers !== false,
    pickup: r.pickup !== false,
    turn: r.turn || null,
    inventory: normalizeInventory(r.inventory),
    sheet: { stats: sheetRule(r.sheet?.stats), powers: sheetRule(r.sheet?.powers) },
    players: r.players && typeof r.players === 'object'
      ? Object.fromEntries(Object.entries(r.players).map(([id, own]) => {
        const { inventory, ...rest } = own && typeof own === 'object' ? own : {};
        const inv = normalizeInventory(inventory, true);
        return [id, Object.keys(inv).length ? { ...rest, inventory: inv } : rest];
      }))
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

// O que um jogador pode fazer agora (o mestre sempre pode tudo).
export function playerRights(rules, userId) {
  const r = normalizeRules(rules);
  const own = r.players[userId] || {};
  return {
    move: r.move && own.move !== false,
    powers: r.powers && own.powers !== false,
    pickup: r.pickup && own.pickup !== false,
    turn: r.turn
  };
}

const MESSAGES = {
  move: 'O mestre travou o movimento agora.',
  powers: 'O mestre travou poderes e ataques agora.',
  pickup: 'O mestre não liberou pegar itens agora.'
};

// Lanca erro em pt-BR se o jogador nao pode. turnTokenIds = tokens do jogador envolvidos na acao.
export function assertRight(rules, userId, right, { turnTokenIds = [], inCombat = false } = {}) {
  const rights = playerRights(rules, userId);
  if (right && !rights[right]) throw httpError(MESSAGES[right], 403);
  if (!inCombat && rights.turn && !turnTokenIds.includes(rights.turn)) throw httpError('Agora é a vez de outro personagem.', 409);
}
