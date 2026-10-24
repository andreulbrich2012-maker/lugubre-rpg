// Espelho no navegador das regras da mesa (backend/src/utils/tableRules.js): so para a
// interface explicar o que esta travado; quem decide de verdade e o servidor.
export function normalizeRules(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return { move: r.move !== false, powers: r.powers !== false, pickup: r.pickup !== false, turn: r.turn || null, players: r.players && typeof r.players === 'object' ? r.players : {} };
}

export function playerRights(rules, userId) {
  const r = normalizeRules(rules);
  const own = r.players[userId] || {};
  return { move: r.move && own.move !== false, powers: r.powers && own.powers !== false, pickup: r.pickup && own.pickup !== false, turn: r.turn };
}
