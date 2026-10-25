// Sprite da arma usado nos golpes: e o MESMO desenho da arma na mao do avatar
// (lib/avatar/items/held.js), com as cores padrao de cada canal. Aqui ele e girado
// em volta do ponto de pegada (grip) para acompanhar o golpe. A rotacao e por
// vizinho mais proximo com angulo em 32 passos (11,25 graus): fica nitido como
// pixel art e os quadros repetem, entao da para guardar em cache.
import { HELD } from '../../avatar/items/held.js';
import { colorHex, shadeHex } from '../../avatar/palette.js';
import { rect, setAlpha } from '../draw.js';

const HELD_BY_ID = Object.fromEntries(HELD.map((h) => [h.id, h]));

// Cores fixas da legenda do held.js (mesmos tons, sem o compositor do avatar).
const FIXED = {
  w: ['#ece4d2', 4], W: ['#ece4d2', 3], z: ['#ece4d2', 1], k: ['#2e2a35', 1], K: ['#2e2a35', 0],
  y: ['#f6d66a', 3], Y: ['#e8902e', 2], f: ['#fff1b0', 4], r: ['#d8503a', 2], R: ['#9c2a2a', 2],
  g: ['#8fe0ff', 3], G: ['#4aa0d8', 2], v: ['#6faa4a', 3], V: ['#4f8238', 2], p: ['#e07a9a', 3], P: ['#b04a6a', 2]
};
const OUTLINE = '#1e1622';
const STEPS = 32;

// Pixels da arma em pe: { px: [[sx, sy, cor, canal]], len, back } relativos a pegada.
// sy negativo = em direcao a ponta.
const baseCache = new Map();
export function weaponPixels(heldId) {
  if (baseCache.has(heldId)) return baseCache.get(heldId);
  const h = HELD_BY_ID[heldId] || HELD_BY_ID.espada;
  const spec = h.spec || {};
  const rows = typeof spec.rows === 'function' ? spec.rows({ f: 0, view: 'down', walk: false, phase: 0 }) : spec.rows || ['.4.', '.4.', '.c.'];
  const [gc, gr] = spec.grip || [0, rows.length - 1];
  const chans = (h.channels || []).map((c) => colorHex(c.def, '#a4aabc'));
  const px = [];
  let len = 0;
  let back = 0;
  rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      let color = null;
      let chan = '';
      if (ch >= '0' && ch <= '4') { color = shadeHex(chans[0] || '#a4aabc', Number(ch)); chan = 'a'; }
      else if (ch >= 'a' && ch <= 'e') { color = shadeHex(chans[1] || '#7a4e2e', ch.charCodeAt(0) - 97); chan = 'b'; }
      else if (ch >= 'A' && ch <= 'E') { color = shadeHex(chans[2] || '#a0703a', ch.charCodeAt(0) - 65); chan = 'c'; }
      else if (FIXED[ch]) { color = shadeHex(FIXED[ch][0], FIXED[ch][1]); chan = 'f'; }
      if (!color) return;
      const sx = c - gc;
      const sy = r - gr;
      px.push([sx, sy, color, chan, ch]);
      len = Math.max(len, -sy);
      back = Math.max(back, sy);
    });
  });
  const out = { px, len: Math.max(1, len), back, id: h.id };
  baseCache.set(heldId, out);
  return out;
}

export function stepOf(theta) {
  const s = Math.round((theta / (Math.PI * 2)) * STEPS);
  return ((s % STEPS) + STEPS) % STEPS;
}

// Sprite girado: lista de [dx, dy, cor] relativa ao pivo, com contorno escuro.
// tint (rampa de elemento) acende o fio da lamina e troca o contorno por um brilho.
const rotCache = new Map();
export function rotatedWeapon(heldId, theta, mirror = false, tint = null, skipChan = '') {
  const step = stepOf(theta);
  const key = `${heldId}|${step}|${mirror ? 1 : 0}|${tint ? tint[2] : ''}|${skipChan}`;
  const hit = rotCache.get(key);
  if (hit) return hit;
  const base = weaponPixels(heldId);
  const map = new Map();
  for (const p of base.px) if (!skipChan || p[3] !== skipChan) map.set(`${p[0]},${p[1]}`, p);
  const a = (step / STEPS) * Math.PI * 2;
  const t = { x: Math.cos(a), y: Math.sin(a) };
  const n = { x: -t.y, y: t.x };
  const m = mirror ? -1 : 1;
  const R = Math.ceil(Math.max(base.len, base.back) + 3);
  const cells = new Map();
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const sx = Math.round(m * (dx * n.x + dy * n.y));
      const sy = Math.round(-(dx * t.x + dy * t.y));
      const p = map.get(`${sx},${sy}`);
      if (!p) continue;
      let color = p[2];
      if (tint && p[3] === 'a') color = p[4] === '4' || p[4] === '3' ? tint[4] : tint[3];
      cells.set(`${dx},${dy}`, [dx, dy, color]);
    }
  }
  const out = [];
  const edge = tint ? tint[1] : OUTLINE;
  const filled = [...cells.values()];
  for (const c of filled) {
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${c[0] + ox},${c[1] + oy}`;
      if (!cells.has(k)) { cells.set(k, null); out.push([c[0] + ox, c[1] + oy, edge]); }
    }
  }
  for (const c of filled) out.push(c);
  if (rotCache.size > 4000) rotCache.clear();
  rotCache.set(key, out);
  return out;
}

// Desenha a arma com a pegada em (x, y), ponta apontando para theta (radianos).
// solid: pinta tudo de uma cor (fantasma do golpe).
export function drawWeapon(ctx, heldId, x, y, theta, { mirror = false, tint = null, alpha = 1, solid = null, skipChan = '' } = {}) {
  if (alpha <= 0) return;
  const list = rotatedWeapon(heldId, theta, mirror, tint, skipChan);
  const X = Math.round(x);
  const Y = Math.round(y);
  setAlpha(ctx, alpha);
  for (const [dx, dy, c] of list) {
    if (solid && c === OUTLINE) continue;
    rect(ctx, X + dx, Y + dy, 1, 1, solid || c);
  }
  setAlpha(ctx, 1);
}

export function weaponLength(heldId) {
  return weaponPixels(heldId).len;
}

export function hasHeld(id) {
  return Boolean(HELD_BY_ID[id]);
}

// Posicao no mundo (relativa a pegada) de um pixel (sx, sy) do desenho em pe,
// com a mesma rotacao em passos usada no desenho.
export function spritePoint(theta, mirror, sx, sy) {
  const a = (stepOf(theta) / STEPS) * Math.PI * 2;
  const t = { x: Math.cos(a), y: Math.sin(a) };
  const n = { x: -t.y, y: t.x };
  const m = mirror ? -1 : 1;
  return { x: t.x * -sy + n.x * m * sx, y: t.y * -sy + n.y * m * sx };
}

// Pontas da corda de um arco (pixels do canal 'a' mais alto e mais baixo).
export function stringEnds(heldId) {
  const a = weaponPixels(heldId).px.filter((p) => p[3] === 'a');
  if (!a.length) return null;
  let top = a[0];
  let bot = a[0];
  for (const p of a) { if (p[1] < top[1]) top = p; if (p[1] > bot[1]) bot = p; }
  return [top, bot];
}
