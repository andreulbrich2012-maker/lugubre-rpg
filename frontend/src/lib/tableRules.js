// Espelho no navegador das regras da mesa (backend/src/utils/tableRules.js): so para a
// interface explicar o que esta travado; quem decide de verdade e o servidor.
export const ACTIONS = ['move', 'attack', 'pickup', 'doors', 'trade'];
// modo so caminhar: estas ficam com o mestre (mesmo do servidor)
export const WALK_ONLY_OFF = ['attack', 'pickup', 'trade'];
const LEGACY = { move: 'move', attack: 'powers', pickup: 'pickup' };
const ASKABLE = { move: false, attack: true, pickup: true, doors: true, trade: true };
// rotulos para o painel do mestre (mover nao tem "pedir")
export const ACTION_LABELS = { move: 'Mover', attack: 'Atacar e magias', pickup: 'Pegar itens', doors: 'Portas e construções', trade: 'Comprar e vender' };
export const MODE_LABELS = { livre: 'Livre', pedir: 'Pedir', travado: 'Bloqueado' };
export const modesFor = (action) => (ASKABLE[action] ? ['livre', 'pedir', 'travado'] : ['livre', 'travado']);
function cleanMode(action, value) {
  if (value === true || value === 'livre') return 'livre';
  if (value === false || value === 'travado') return 'travado';
  if (value === 'pedir') return ASKABLE[action] ? 'pedir' : 'livre';
  return undefined;
}
function ownActions(own) {
  const out = {};
  for (const a of ACTIONS) {
    const mode = cleanMode(a, own.actions?.[a]) ?? (own[LEGACY[a]] === false ? 'travado' : undefined);
    if (mode) out[a] = mode;
  }
  return out;
}

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
      const o = own && typeof own === 'object' ? own : {};
      const entry = {};
      const actions = ownActions(o);
      if (Object.keys(actions).length) entry.actions = actions;
      const inv = normalizeInventory(o.inventory, true);
      if (Object.keys(inv).length) entry.inventory = inv;
      return [id, entry];
    }).filter(([, entry]) => Object.keys(entry).length))
    : {};
  const actions = Object.fromEntries(ACTIONS.map((a) => [a, cleanMode(a, r.actions?.[a]) ?? cleanMode(a, r[LEGACY[a]]) ?? 'livre']));
  return { act: r.act !== false, walkOnly: r.walkOnly === true, actions, turn: r.turn || null, inventory: normalizeInventory(r.inventory), sheet: { stats: sheetRule(r.sheet?.stats), powers: sheetRule(r.sheet?.powers) }, clock: { on: r.clock?.on === true, minutes: clockMinutes(r.clock?.minutes) }, vision: Number.isInteger(Number(r.vision)) && r.vision !== null && r.vision !== '' ? Math.max(0, Math.min(9, Number(r.vision))) : 9, players };
}

// Modo de cada acao para um jogador ('livre' | 'pedir' | 'travado'), com pausa e excecao aplicadas.
export function playerRights(rules, userId) {
  const r = normalizeRules(rules);
  const own = r.players[userId]?.actions || {};
  const walk = new Set(r.walkOnly ? WALK_ONLY_OFF : []);
  const mode = (a) => (!r.act || walk.has(a) ? 'travado' : own[a] ?? r.actions[a]);
  const move = mode('move');
  return { paused: !r.act, walkOnly: r.walkOnly, move, attack: mode('attack'), pickup: mode('pickup'), doors: move === 'travado' ? 'travado' : mode('doors'), trade: mode('trade'), turn: r.turn };
}

// Mesmas mensagens do servidor.
export function rightBlock(rights, action) {
  if (rights[action] !== 'travado') return null;
  if (rights.paused) return 'O mestre pausou a mesa: espere ele liberar.';
  if (rights.walkOnly && WALK_ONLY_OFF.includes(action)) return 'O mestre deixou o mapa só para caminhar: peça a ele.';
  if (action === 'move' || (action === 'doors' && rights.move === 'travado')) return 'O mestre travou o movimento agora.';
  return { attack: 'O mestre travou poderes e ataques agora.', pickup: 'O mestre não liberou pegar itens agora.', doors: 'O mestre não liberou passar por portas agora.', trade: 'O mestre não liberou o comércio agora.' }[action];
}

// Troca o modo de uma acao, geral (userId vazio) ou so para um jogador (mode null = volta a valer o geral).
export function withMode(rules, action, mode, userId) {
  const r = normalizeRules(rules);
  if (!userId) return { ...r, actions: { ...r.actions, [action]: mode } };
  const own = r.players[userId] || {};
  const actions = { ...(own.actions || {}) };
  if (mode) actions[action] = mode; else delete actions[action];
  return { ...r, players: { ...r.players, [userId]: { ...own, actions } } };
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
