// Motor dos icones 16x16 (itens e armas). Os desenhos sao "mascaras de material":
// cada caractere aponta para uma cor base e um modo de sombreamento; o volume (rampa de
// 5 tons com hue shifting) e o contorno sepia colorido saem daqui, iguais aos do avatar
// e do mapa. Assim cada icone e desenhado so como silhueta + materiais e o estilo fica coeso.
import { ramp, outlineOf, hexToRgb } from '../avatar/palette.js';
import { ITEM_ICONS } from './items.js';
import { WEAPON_ICONS } from './weapons.js';

export const ICON_SIZE = 16;
const N = ICON_SIZE;

// Entrada da paleta: '#hex' (sombra pela borda), ou [hex, modo, alfa].
// Modos: 'edge' | 'round' (esfera, luz no alto-esquerda) | 'cyl' (cilindro em pe) |
// 'vcyl' (cilindro deitado) | 0..4 (tom fixo da rampa) | 'line' (traco interno no tom do contorno) |
// 'facet' (gema lapidada) | 'raw' (cor exata) | 'glow' (cor exata translucida, sem contorno).
function norm(entry) {
  if (typeof entry === 'string') return { hex: entry, mode: 'edge' };
  const [hex, mode = 'edge', alpha] = entry;
  return { hex, mode, alpha };
}

const isShaded = (c) => c && c.mode !== 'glow' && c.mode !== 'line' && c.mode !== 'raw';

// Tom pela borda: alto/esquerda abertos clareiam, baixo/direita abertos escurecem.
// Em diagonais finas isso da o fio claro da lamina e o dorso escuro, sem desenhar tom a tom.
function edgeTone(same, x, y) {
  const u = !same(x, y - 1), l = !same(x - 1, y), d = !same(x, y + 1), r = !same(x + 1, y);
  let t = 2 + (u ? 1 : 0) + (l ? 1 : 0) - (d ? 1 : 0) - (r ? 1 : 0);
  if (t === 4 && !(u && l)) t = 3;
  return Math.max(0, Math.min(4, t));
}

function roundTone(nx, ny, rim) {
  const v = -(nx * 0.62 + ny * 0.78);
  const hx = nx + 0.38, hy = ny + 0.42;
  if (hx * hx + hy * hy < 0.07) return 4;
  let t = v > 0.42 ? 3 : v > -0.22 ? 2 : v > -0.62 ? 1 : 0;
  if (rim && t > 1) t = 1; // borda de baixo/direita sempre em sombra: separa do contorno
  return t;
}

// Faixa do cilindro: realce perto da esquerda, sombra crescendo para a direita.
function cylTone(i, len) {
  if (len <= 1) return 2;
  if (len === 2) return i === 0 ? 3 : 1;
  if (len === 3) return [3, 2, 1][i];
  const u = i / (len - 1);
  if (u < 0.12) return 3;
  if (u < 0.32) return 4;
  if (u < 0.62) return 2;
  if (u < 0.86) return 1;
  return 0;
}

// Lapidacao em degraus (gemas): aneis concentricos; o lado mais perto da borda decide a luz.
function facetTone(same, x, y) {
  const dist = (dx, dy) => { let k = 0; while (same(x + dx * (k + 1), y + dy * (k + 1))) k++; return k; };
  const d = { u: dist(0, -1), l: dist(-1, 0), d: dist(0, 1), r: dist(1, 0) };
  const ring = Math.min(d.u, d.l, d.d, d.r);
  const side = ['u', 'l', 'r', 'd'].find((k) => d[k] === ring);
  if (ring === 0) return { u: 4, l: 3, r: 1, d: d.r === 0 ? 0 : 1 }[side];
  if (ring === 1) return { u: 3, l: 3, r: 1, d: 2 }[side];
  return 2;
}

// Pinta um spec {rows, pal, aura?, sparkles?} em RGBA 16x16 (puro, sem DOM).
export function paintIcon(spec) {
  const { rows, pal } = spec;
  const cells = new Array(N * N).fill(null);
  for (let y = 0; y < N; y++) {
    const row = rows[y] || '';
    for (let x = 0; x < N; x++) {
      const ch = row[x];
      if (!ch || ch === '.' || ch === ' ') continue;
      const e = pal[ch];
      if (!e) throw new Error(`icone: caractere '${ch}' sem cor`);
      cells[y * N + x] = norm(e);
    }
  }
  const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? null : cells[y * N + x]);
  const solid = (c) => c && c.mode !== 'glow';

  // Regioes = pixels vizinhos com a mesma cor base (detalhes de tom fixo entram na regiao).
  const comp = new Int32Array(N * N).fill(-1);
  const boxes = [];
  for (let i = 0; i < N * N; i++) {
    const c = cells[i];
    if (!isShaded(c) || comp[i] >= 0) continue;
    const id = boxes.length;
    const box = { x0: 99, y0: 99, x1: -1, y1: -1 };
    const stack = [i];
    comp[i] = id;
    while (stack.length) {
      const j = stack.pop();
      const x = j % N, y = (j / N) | 0;
      box.x0 = Math.min(box.x0, x); box.x1 = Math.max(box.x1, x);
      box.y0 = Math.min(box.y0, y); box.y1 = Math.max(box.y1, y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        const n = at(nx, ny);
        const k = ny * N + nx;
        if (isShaded(n) && n.hex === c.hex && comp[k] < 0) { comp[k] = id; stack.push(k); }
      }
    }
    boxes.push(box);
  }

  const out = new Uint8ClampedArray(N * N * 4);
  const put = (i, rgb, a = 255) => { out[i * 4] = rgb[0]; out[i * 4 + 1] = rgb[1]; out[i * 4 + 2] = rgb[2]; out[i * 4 + 3] = a; };

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const c = cells[i];
      if (!c) continue;
      if (c.mode === 'raw') { put(i, hexToRgb(c.hex)); continue; }
      if (c.mode === 'glow') { put(i, hexToRgb(c.hex), c.alpha ?? 140); continue; }
      if (c.mode === 'line') { put(i, outlineOf(hexToRgb(c.hex))); continue; }
      const same = (xx, yy) => { const n = at(xx, yy); return isShaded(n) && n.hex === c.hex; };
      let t;
      if (typeof c.mode === 'number') t = c.mode;
      else if (c.mode === 'round') {
        const b = boxes[comp[i]];
        const rx = (b.x1 - b.x0 + 1) / 2, ry = (b.y1 - b.y0 + 1) / 2;
        const nx = (x + 0.5 - (b.x0 + rx)) / rx, ny = (y + 0.5 - (b.y0 + ry)) / ry;
        t = roundTone(nx, ny, !same(x, y + 1) || !same(x + 1, y));
      } else if (c.mode === 'facet') {
        t = facetTone(same, x, y);
      } else if (c.mode === 'cyl' || c.mode === 'vcyl') {
        const h = c.mode === 'cyl';
        let a = 0, b = 0;
        while (h ? same(x - a - 1, y) : same(x, y - a - 1)) a++;
        while (h ? same(x + b + 1, y) : same(x, y + b + 1)) b++;
        t = cylTone(a, a + b + 1);
      } else t = edgeTone(same, x, y);
      put(i, hexToRgb(ramp(c.hex)[t]));
    }
  }

  // Contorno sepia colorido: o tom escuro puxa a cor do material vizinho (nunca preto puro).
  const outlineFrom = new Array(N * N).fill(null);
  if (spec.outline !== false) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        if (solid(cells[i])) continue;
        let pick = null, lum = 1e9;
        for (const [dx, dy] of [[0, -1], [-1, 0], [0, 1], [1, 0]]) {
          const n = at(x + dx, y + dy);
          if (!solid(n)) continue;
          const rgb = hexToRgb(n.hex);
          const l = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
          if (l < lum) { lum = l; pick = n; }
        }
        if (pick) { put(i, outlineOf(hexToRgb(pick.hex))); outlineFrom[i] = pick.hex; }
      }
    }
  }

  // Aura magica (variante encantada): halo translucido em volta do contorno das partes listadas.
  if (spec.aura) {
    const { hex, alpha = 110, from } = spec.aura;
    const rgb = hexToRgb(hex);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        if (out[i * 4 + 3]) continue;
        for (const [dx, dy] of [[0, -1], [-1, 0], [0, 1], [1, 0]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
          const src = outlineFrom[yy * N + xx];
          if (src && (!from || from.includes(src))) { put(i, rgb, alpha); break; }
        }
      }
    }
  }

  // Brilhos em cruz: centro cheio e bracos translucidos, so em espaco vazio ou de aura.
  for (const [x, y, hex] of spec.sparkles || []) {
    const rgb = hexToRgb(hex);
    const free = (xx, yy) => xx >= 0 && yy >= 0 && xx < N && yy < N && out[(yy * N + xx) * 4 + 3] < 255;
    if (free(x, y)) put(y * N + x, rgb, 255);
    for (const [dx, dy] of [[0, -1], [-1, 0], [0, 1], [1, 0]]) if (free(x + dx, y + dy)) put((y + dy) * N + x + dx, rgb, 150);
  }
  return out;
}

// Assinatura do desenho sem a cor: renomeia os caracteres pela ordem de aparicao.
// Dois icones que so trocam a paleta (recolor) tem a mesma assinatura.
export function shapeSignature(spec) {
  const map = new Map();
  let s = '';
  for (const row of spec.rows) {
    for (const ch of row.padEnd(N, '.')) {
      if (ch === '.' || ch === ' ') { s += '.'; continue; }
      if (!map.has(ch)) map.set(ch, String.fromCharCode(65 + map.size));
      s += map.get(ch);
    }
  }
  return s + JSON.stringify(spec.sparkles || []) + (spec.aura ? 'aura' : '');
}

// ---- ponte com o navegador (dataURL com cache) ----
const pixelCache = new Map();
const urlCache = new Map();

export const iconSpec = (id) => ITEM_ICONS[id] || WEAPON_ICONS[id] || null;

export function iconPixels(id) {
  if (pixelCache.has(id)) return pixelCache.get(id);
  const spec = iconSpec(id);
  if (!spec) return null;
  const px = paintIcon(spec);
  pixelCache.set(id, px);
  return px;
}

export function iconDataUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  if (typeof document === 'undefined') return null;
  const px = iconPixels(id);
  if (!px) return null;
  const canvas = document.createElement('canvas');
  canvas.width = N;
  canvas.height = N;
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(px), N, N), 0, 0);
  const url = canvas.toDataURL('image/png');
  urlCache.set(id, url);
  return url;
}
