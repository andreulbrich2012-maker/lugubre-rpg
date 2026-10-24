// Barcos e viagens pelo mar: tipos de barco, mapa do convés e do porão (gerados), rota da
// viagem na cena de mar e onde descer em terra perto de um porto.
// A mesma tabela de tipos esta em frontend/src/lib/sea/boats.js (o teste do front confere).

// len/beam = tamanho do casco no convés (celulas, proa para o norte); speed = celulas por segundo
// na cena de mar; masts = mastros; hold = tem porão/cabine (cena filha do convés).
export const BOAT_TYPES = {
  bote: { id: 'bote', name: 'Bote a remo', len: 6, beam: 5, speed: 0.8, capacity: 3, masts: 0, hold: false },
  pesca: { id: 'pesca', name: 'Barco de pesca', len: 9, beam: 5, speed: 1.0, capacity: 6, masts: 1, hold: false },
  veleiro: { id: 'veleiro', name: 'Veleiro', len: 11, beam: 5, speed: 1.6, capacity: 10, masts: 1, hold: true },
  gale: { id: 'gale', name: 'Galé', len: 17, beam: 7, speed: 1.3, capacity: 30, masts: 1, hold: true },
  navio: { id: 'navio', name: 'Navio grande', len: 21, beam: 9, speed: 1.4, capacity: 60, masts: 3, hold: true }
};
export const BOAT_TYPE_IDS = Object.keys(BOAT_TYPES);
export const boatType = (id) => BOAT_TYPES[id] || BOAT_TYPES.pesca;

const MARGIN = 2; // mar em volta do casco no mapa do convés
const SEA = 'ó';

// largura do casco em cada linha (0 = proa): afina na proa, popa um pouco arredondada
export function hullWidths(type) {
  const t = boatType(type);
  const bow = Math.max(2, Math.round(t.len * 0.35));
  return Array.from({ length: t.len }, (_, r) => {
    let w = r < bow ? Math.round((t.beam * (r + 1)) / (bow + 1)) : t.beam;
    if (r === t.len - 1 && t.beam > 3) w = t.beam - 2;
    if (w % 2 === 0) w += 1; // impar: casco simetrico em volta do meio
    return Math.max(1, Math.min(t.beam, w));
  });
}

const put = (rows, x, y, ch) => { rows[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1); };

// Convés: tábuas, amurada (cerca) na borda do casco, mastros, leme na popa, caixotes e barris,
// e a escotilha (escada) para o porão. vessel guarda onde ficam mastro/leme (desenhados por cima).
export function deckMap(type) {
  const t = boatType(type);
  const widths = hullWidths(t.id);
  const cols = t.beam + MARGIN * 2;
  const rows = t.len + MARGIN * 2;
  const mid = Math.floor(cols / 2);
  const ground = Array.from({ length: rows }, () => SEA.repeat(cols));
  const objects = Array.from({ length: rows }, () => ' '.repeat(cols));
  const inside = (x, y) => {
    const r = y - MARGIN;
    if (r < 0 || r >= t.len) return false;
    const half = (widths[r] - 1) / 2;
    return Math.abs(x - mid) <= half;
  };
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (inside(x, y)) put(ground, x, y, '=');
  // amurada: celula do casco com vizinho fora do casco
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (!inside(x, y)) continue;
    if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) put(objects, x, y, '+');
  }
  const top = MARGIN; const bottom = MARGIN + t.len - 1;
  const masts = [];
  if (t.masts === 1) masts.push({ x: mid, y: top + Math.round(t.len * 0.45) });
  if (t.masts === 3) [0.3, 0.52, 0.74].forEach((f) => masts.push({ x: mid, y: top + Math.round(t.len * f) }));
  const helm = t.id === 'bote' ? null : { x: mid, y: bottom - 1 };
  const hatch = t.hold ? { x: mid, y: top + Math.round(t.len * (t.masts === 3 ? 0.63 : 0.62)) } : null;
  if (hatch) put(ground, hatch.x, hatch.y, '>');
  // carga junto da amurada (lado de dentro), longe do meio onde se anda
  if (t.beam >= 5) {
    const cargo = ['q', 'u', 'Î', 'q', 'u', 'C'];
    let k = 0;
    for (let y = top + Math.round(t.len * 0.4); y < bottom - 2 && k < Math.min(cargo.length, Math.floor(t.len / 3)); y += 3) {
      const half = (widths[y - MARGIN] - 1) / 2;
      const x = k % 2 ? mid + half - 1 : mid - half + 1;
      if (objects[y][x] === ' ' && ground[y][x] === '=') { put(objects, x, y, cargo[k]); k++; }
    }
  }
  if (t.id === 'bote') put(objects, mid, top + 3, 'h'); // banco do remador
  const map = { cols, rows, layers: { ground, objects }, items: [], buildings: [], vessel: { type: t.id, part: 'deck', masts, ...(helm ? { helm } : {}), ...(hatch ? { hatch } : {}) } };
  return map;
}

// Porão/cabine: sala de madeira com escada para o convés, barris, caixotes e redes (camas).
export function holdMap(type) {
  const t = boatType(type);
  const cols = Math.max(9, Math.min(17, t.beam + 6));
  const rows = Math.max(7, Math.min(11, Math.round(t.len / 2)));
  const ground = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (__, x) => (x === 0 || y === 0 || x === cols - 1 || y === rows - 1 ? 'M' : '=')).join(''));
  const objects = Array.from({ length: rows }, () => ' '.repeat(cols));
  const mid = Math.floor(cols / 2);
  const ladder = { x: mid, y: 1 };
  put(ground, ladder.x, ladder.y, '<');
  const along = ['u', 'q', 'Î', 'u', 'q', 'u', 'Î', 'q'];
  for (let y = 2, k = 0; y < rows - 1; y += 2, k++) { put(objects, 1, y, along[k % along.length]); put(objects, cols - 2, y, along[(k + 3) % along.length]); }
  for (let x = 3; x < cols - 3; x += 3) put(objects, x, rows - 2, 'e');
  put(objects, mid, Math.floor(rows / 2) + 1, 'n');
  put(objects, 2, 1, 'i'); put(objects, cols - 3, 1, 'i');
  return { cols, rows, layers: { ground, objects }, items: [], buildings: [], vessel: { type: t.id, part: 'hold', ladder } };
}

// Celulas livres para gente em pe no convés/porão (tábua sem objeto), do meio para fora.
export function vesselSpawns(map, near = null) {
  const g = map.layers.ground; const o = map.layers.objects || [];
  const c = near || { x: Math.floor(map.cols / 2), y: Math.floor(map.rows / 2) };
  const out = [];
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    if (g[y][x] !== '=' || (o[y]?.[x] && o[y][x] !== ' ')) continue;
    const masts = map.vessel?.masts || [];
    // logo ao norte do mastro a vela recolhida tapa quem esta ali (vista 3/4): evita
    if (masts.some((m) => Math.abs(m.x - x) <= 3 && m.y - y >= 0 && m.y - y <= 3)) continue;
    if (map.vessel?.helm && map.vessel.helm.x === x && map.vessel.helm.y === y) continue;
    out.push({ x, y, d: Math.hypot(x - c.x, y - c.y) });
  }
  return out.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x).map(({ x, y }) => ({ x, y }));
}

// ---- terra e agua num mapa qualquer (o servidor nao tem o catalogo de blocos) ----
const WATER = new Set(['~', 'W', 'ó', '0', 'V', '%', 'ô']);
const BLOCKED = new Set(['#', 'B', 'M', 'X', 'J', 'H', 'Z', ']', '/', 'ç', 'ñ', 'L', '@', 'P', 'V', 'ó', 'W']);
export const isWater = (ch) => WATER.has(ch);

function cellsByDistance(tiles, from, test, limit) {
  const out = [];
  const maxR = Math.max(tiles.cols, tiles.rows);
  const inBuilding = (x, y) => (tiles.buildings || []).some((b) => x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h);
  for (let r = 0; r <= maxR && out.length < limit; r++) {
    const ring = [];
    for (let y = from.y - r; y <= from.y + r; y++) for (let x = from.x - r; x <= from.x + r; x++) {
      if (Math.max(Math.abs(x - from.x), Math.abs(y - from.y)) !== r) continue;
      if (x < 0 || y < 0 || x >= tiles.cols || y >= tiles.rows) continue;
      if (inBuilding(x, y) || !test(x, y)) continue;
      ring.push({ x, y, d: Math.hypot(x - from.x, y - from.y) });
    }
    ring.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x).forEach(({ x, y }) => out.length < limit && out.push({ x, y }));
  }
  return out;
}

// Onde descer: chao firme (nem agua nem parede), sem objeto, mais perto do ponto.
// boat: barco atracado ali perto ({x, y, type}); as velas tapam quem fica logo ao norte dele
const SAIL_CELLS = { bote: [1, 1], pesca: [2, 3], veleiro: [2, 4], gale: [3, 4], navio: [3, 5] };
export function landingCells(tiles, from, count = 1, boat = null) {
  const g = tiles?.layers?.ground || []; const o = tiles?.layers?.objects || [];
  const [half, up] = SAIL_CELLS[boat?.type] || [0, -1];
  const behindBoat = (x, y) => boat && Math.abs(x - boat.x) <= half && boat.y - y >= 0 && boat.y - y <= up;
  const cells = cellsByDistance(tiles, from, (x, y) => {
    const ch = g[y]?.[x];
    return ch && !WATER.has(ch) && !BLOCKED.has(ch) && (!o[y]?.[x] || o[y][x] === ' ') && !behindBoat(x, y);
  }, count);
  while (cells.length < count) cells.push({ x: Math.max(0, Math.min(tiles.cols - 1, from.x)), y: Math.max(0, Math.min(tiles.rows - 1, from.y)) });
  return cells;
}

// Onde atracar: a agua mais perto do porto (o barco fica na agua, a gente desce em terra).
export function dockCell(tiles, from) {
  const g = tiles?.layers?.ground || [];
  return cellsByDistance(tiles, from, (x, y) => WATER.has(g[y]?.[x]), 1)[0] || { x: from.x, y: from.y };
}

// ---- rota e progresso ----
export function routeLength(route) {
  let total = 0;
  for (let i = 1; i < (route?.length || 0); i++) total += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
  return total;
}

// Rota padrao: da esquerda para a direita, no meio do mar.
export function defaultRoute(tiles) {
  const y = Math.floor(tiles.rows / 2);
  return [{ x: 2, y }, { x: tiles.cols - 3, y }];
}

// Progresso (0..1) agora: anda so enquanto 'sailing'; para em 1 esperando o mestre.
export function voyageProgress(v, now = Date.now()) {
  const base = Number(v.progress) || 0;
  if (v.status !== 'sailing') return Math.min(1, base);
  const len = Math.max(1, routeLength(v.route));
  const secs = Math.max(0, (now - new Date(v.progress_at).getTime()) / 1000);
  return Math.min(1, base + (secs * Number(v.speed || 1)) / len);
}

// Porto mais perto de uma celula (ou null se o mapa nao tem porto).
export function nearestPort(tiles, at) {
  const ports = tiles?.ports || [];
  let best = null;
  for (const p of ports) {
    const d = Math.hypot(p.x - at.x, p.y - at.y);
    if (!best || d < best.d) best = { ...p, d };
  }
  return best;
}
