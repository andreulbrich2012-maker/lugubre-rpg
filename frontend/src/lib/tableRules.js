// Espelho no navegador das regras da mesa (backend/src/utils/tableRules.js): so para a
// interface explicar o que esta travado; quem decide de verdade e o servidor.
const cleanLimit = (value, int = false) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return int ? Math.floor(n) : Math.round(n * 100) / 100;
};
function normalizeInventory(raw, keepMissing = false) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const [key, int] of [['maxWeight', false], ['maxItems', true]]) {
    if (keepMissing && !(key in r)) continue;
    out[key] = cleanLimit(r[key], int);
  }
  return out;
}

export function normalizeRules(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const players = r.players && typeof r.players === 'object'
    ? Object.fromEntries(Object.entries(r.players).map(([id, own]) => {
      const { inventory, ...rest } = own && typeof own === 'object' ? own : {};
      const inv = normalizeInventory(inventory, true);
      return [id, Object.keys(inv).length ? { ...rest, inventory: inv } : rest];
    }))
    : {};
  return { move: r.move !== false, powers: r.powers !== false, pickup: r.pickup !== false, turn: r.turn || null, inventory: normalizeInventory(r.inventory), players };
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
