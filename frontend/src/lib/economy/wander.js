// Movimento dos NPCs (o mestre escolhe por NPC e troca quando quiser):
//   parado            -> fica na posicao do token;
//   area              -> passeia dentro de um retangulo ou poligono (celulas do mapa);
//   rota              -> segue pontos em ordem (circuito fechado ou vai-e-volta).
// A posicao sai do RELOGIO, sem servidor mexendo no token: todo mundo calcula igual a partir de
// (configuracao, id do token, hora atual), e o servidor confere o alcance com a mesma conta.
// ARQUIVO ESPELHADO: frontend/src/lib/economy/wander.js e backend/src/utils/economy/wander.js tem
// que ser iguais (o teste do backend confere). Sem imports.
//
// wander = { mode: 'parado'|'area'|'rota', area?: { type: 'rect', x, y, w, h } |
//            { type: 'poly', points: [[x, y], ...] }, route?: [[x, y], ...], loop?: bool,
//            speed?: celulas/s, pause?: s }  (x, y em celulas, podem ter fracao)

export const WANDER_MODES = [['parado', 'Parado'], ['area', 'Anda numa área'], ['rota', 'Segue uma rota']];
export const DEFAULT_SPEED = 1.2;
export const DEFAULT_PAUSE = 3;

// hash 32 bits estavel (FNV-1a) -> [0, 1)
function rand01(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

export function cleanWander(w) {
  if (!w || typeof w !== 'object' || !['area', 'rota'].includes(w.mode)) return { mode: 'parado' };
  const speed = Math.min(6, Math.max(0.2, num(w.speed, DEFAULT_SPEED)));
  const pause = Math.min(60, Math.max(0, num(w.pause, DEFAULT_PAUSE)));
  const pt = (p) => [Math.round(num(p?.[0], 0) * 100) / 100, Math.round(num(p?.[1], 0) * 100) / 100];
  if (w.mode === 'area') {
    const a = w.area || {};
    if (a.type === 'poly' && Array.isArray(a.points) && a.points.length >= 3) return { mode: 'area', area: { type: 'poly', points: a.points.slice(0, 40).map(pt) }, speed, pause };
    const x = num(a.x, 0); const y = num(a.y, 0); const ww = Math.max(1, num(a.w, 1)); const hh = Math.max(1, num(a.h, 1));
    return { mode: 'area', area: { type: 'rect', x, y, w: ww, h: hh }, speed, pause };
  }
  const route = Array.isArray(w.route) ? w.route.slice(0, 40).map(pt) : [];
  if (route.length < 2) return { mode: 'parado' };
  return { mode: 'rota', route, loop: w.loop !== false, speed, pause };
}

function bbox(points) {
  const xs = points.map((p) => p[0]); const ys = points.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

export function insidePoly(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]; const [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ponto k da area (centro de celula onde o NPC para), sempre igual para o mesmo seed/k
function areaPoint(area, seed, k) {
  if (area.type === 'poly') {
    const b = bbox(area.points);
    for (let t = 0; t < 24; t++) {
      const x = b.x + rand01(`${seed}:${k}:x${t}`) * b.w;
      const y = b.y + rand01(`${seed}:${k}:y${t}`) * b.h;
      if (insidePoly(area.points, x, y)) return [x, y];
    }
    // poligono fino demais: centro dos vertices
    return [area.points.reduce((s, p) => s + p[0], 0) / area.points.length, area.points.reduce((s, p) => s + p[1], 0) / area.points.length];
  }
  // retangulo: celula inteira sorteada (x..x+w-1); o NPC ocupa 1 celula
  const cols = Math.max(1, Math.floor(area.w)); const rows = Math.max(1, Math.floor(area.h));
  return [area.x + Math.floor(rand01(`${seed}:${k}:x`) * cols), area.y + Math.floor(rand01(`${seed}:${k}:y`) * rows)];
}

const dirOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');

// Posicao (em celulas, canto do token) agora; null = parado (usa x/y do token).
// seed: id do token (cada NPC anda diferente).
export function wanderCell(wander, seed, nowMs = Date.now()) {
  const w = cleanWander(wander);
  if (w.mode === 'parado') return null;
  const t = nowMs / 1000;
  if (w.mode === 'area') {
    const b = w.area.type === 'poly' ? bbox(w.area.points) : w.area;
    const diag = Math.hypot(b.w, b.h);
    // cada trecho: anda ate o proximo ponto e espera; duracao fixa (conta O(1) a partir da hora)
    const period = Math.min(30, Math.max(4, w.pause + diag / w.speed));
    const k = Math.floor(t / period);
    const into = t - k * period;
    const a = areaPoint(w.area, seed, k);
    const z = areaPoint(w.area, seed, k + 1);
    const dist = Math.hypot(z[0] - a[0], z[1] - a[1]);
    const walk = Math.min(period - 0.5, dist / w.speed);
    if (into >= walk || dist < 1e-6) return { x: z[0], y: z[1], dir: dirOf(z[0] - a[0], z[1] - a[1]), moving: false };
    const f = into / walk;
    return { x: a[0] + (z[0] - a[0]) * f, y: a[1] + (z[1] - a[1]) * f, dir: dirOf(z[0] - a[0], z[1] - a[1]), moving: true };
  }
  // rota: velocidade constante, pausa em cada ponto
  const pts = w.loop ? [...w.route, w.route[0]] : [...w.route, ...w.route.slice(0, -1).reverse()];
  const legs = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    const dur = len / w.speed + w.pause;
    legs.push({ a: pts[i], b: pts[i + 1], len, dur, at: total });
    total += dur;
  }
  if (total <= 0) return { x: pts[0][0], y: pts[0][1], dir: 'down', moving: false };
  const into = ((t + rand01(`${seed}:off`) * total) % total + total) % total;
  const leg = legs.find((l) => into >= l.at && into < l.at + l.dur) || legs[legs.length - 1];
  const walk = leg.len / w.speed;
  const s = into - leg.at;
  const dir = dirOf(leg.b[0] - leg.a[0], leg.b[1] - leg.a[1]);
  if (s >= walk || leg.len < 1e-6) return { x: leg.b[0], y: leg.b[1], dir, moving: false };
  const f = s / walk;
  return { x: leg.a[0] + (leg.b[0] - leg.a[0]) * f, y: leg.a[1] + (leg.b[1] - leg.a[1]) * f, dir, moving: true };
}

// Mesmo calculo em pixels do mapa (canto superior esquerdo do token), para a mesa e o servidor.
export function wanderPos(token, cellPx, nowMs = Date.now()) {
  if (!token?.wander || token.wander.mode === 'parado') return null;
  const c = wanderCell(token.wander, token.id || 'npc', nowMs);
  if (!c) return null;
  return { x: c.x * cellPx, y: c.y * cellPx, dir: c.dir, moving: c.moving };
}

export const hasWander = (token) => Boolean(token?.wander && token.wander.mode && token.wander.mode !== 'parado');
