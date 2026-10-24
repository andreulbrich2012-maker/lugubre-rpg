// Espelho no navegador das regras da mesa (backend/src/utils/tableRules.js): so para a
// interface explicar o que esta travado; quem decide de verdade e o servidor.
const cleanLimit = (value, int = false) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return int ? Math.floor(n) : Math.round(n * 100) / 100;
};
// mesmo padrao do servidor: mesa sem limite salvo usa 30 kg e 9 itens (null salvo = sem limite)
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

// 10 alcances de visao (celulas de raio); o ultimo e sem limite
export const VISION_RADII = [2, 3, 4, 6, 8, 10, 13, 17, 24, null];
export const VISION_LABELS = ['1 · bem curta', '2', '3', '4', '5 · média', '6', '7', '8', '9 · longe', '10 · sem limite'];

export function normalizeRules(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const players = r.players && typeof r.players === 'object'
    ? Object.fromEntries(Object.entries(r.players).map(([id, own]) => {
      const { inventory, ...rest } = own && typeof own === 'object' ? own : {};
      const inv = normalizeInventory(inventory, true);
      return [id, Object.keys(inv).length ? { ...rest, inventory: inv } : rest];
    }))
    : {};
  return { move: r.move !== false, powers: r.powers !== false, pickup: r.pickup !== false, turn: r.turn || null, inventory: normalizeInventory(r.inventory), sheet: { stats: sheetRule(r.sheet?.stats), powers: sheetRule(r.sheet?.powers) }, clock: { on: r.clock?.on === true, minutes: clockMinutes(r.clock?.minutes) }, vision: Number.isInteger(Number(r.vision)) && r.vision !== null && r.vision !== '' ? Math.max(0, Math.min(9, Number(r.vision))) : 9, players };
}

export function playerRights(rules, userId) {
  const r = normalizeRules(rules);
  const own = r.players[userId] || {};
  return { move: r.move && own.move !== false, powers: r.powers && own.powers !== false, pickup: r.pickup && own.pickup !== false, turn: r.turn };
}

// Limites do inventario do jogador: a excecao dele (se tiver) ou o limite geral (null = sem limite).
export function inventoryLimits(rules, userId) {
  const r = normalizeRules(rules);
  const own = r.players[userId]?.inventory || {};
  return {
    maxWeight: 'maxWeight' in own ? own.maxWeight : r.inventory.maxWeight,
    maxItems: 'maxItems' in own ? own.maxItems : r.inventory.maxItems
  };
}

// Quem mexe na ficha compartilhada: { stats, powers } com 'mestre' ou 'jogador'.
export function sheetRights(rules) {
  return normalizeRules(rules).sheet;
}
