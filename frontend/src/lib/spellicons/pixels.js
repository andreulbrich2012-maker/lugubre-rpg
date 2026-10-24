// Ferramentas de pixel puras (sem DOM): grades de texto, sombreamento automatico com luz
// do canto superior esquerdo e contorno escuro colorido, como nas pixel arts do genero.
import { charColor, outlineOf } from './palette.js';

export const N = 24; // icone final 24x24: 16x16 nao comportava arma + manobra legiveis

export const blank = (w = N, h = N) => ({ w, h, px: new Array(w * h).fill(null) });

// Grade de texto a partir de uma funcao (x, y) -> caractere.
export function gridFrom(w, h, fn) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    let r = '';
    for (let x = 0; x < w; x++) r += fn(x, y) || '.';
    rows.push(r);
  }
  return rows;
}

// Sobrepoe grades (a de cima vence onde nao for '.').
export function overlay(base, top, ox = 0, oy = 0) {
  const out = base.map((r) => r.split(''));
  top.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const yy = y + oy, xx = x + ox;
      if (ch !== '.' && out[yy] && xx >= 0 && xx < out[yy].length) out[yy][xx] = ch;
    }
  });
  return out.map((r) => r.join(''));
}

export const flipX = (g) => g.map((r) => r.split('').reverse().join(''));
export const flipY = (g) => [...g].reverse();

// Mascaras: 'X' vira tons da magia (0-4) e 'Y' tons do apoio (A-E), 'Z' metal (a-e),
// 'H' madeira (m-q), 'G' ouro (r-v). Borda de cima/esquerda clareia, de baixo/direita
// escurece, e o miolo faz um degrade diagonal. Caracteres explicitos ficam como estao.
const MASKS = { X: '01234', Y: 'ABCDE', Z: 'abcde', H: 'mnopq', G: 'rstuv' };

export function autoShade(grid) {
  const h = grid.length, w = grid[0].length;
  const at = (x, y) => (y < 0 || y >= h || x < 0 || x >= w ? '.' : grid[y][x]);
  const boxes = {};
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = grid[y][x];
    if (!MASKS[c]) continue;
    const b = boxes[c] || (boxes[c] = { x0: x, y0: y, x1: x, y1: y });
    b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y);
    b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y);
  }
  // o vizinho conta como "mesma peca" se for mascara igual ou um detalhe pintado por cima
  const solid = (c, own) => c === own || (c !== '.' && !MASKS[c]);
  return grid.map((row, y) => row.split('').map((c, x) => {
    const tones = MASKS[c];
    if (!tones) return c;
    const b = boxes[c];
    const lt = !solid(at(x, y - 1), c) || !solid(at(x - 1, y), c);
    const dk = !solid(at(x, y + 1), c) || !solid(at(x + 1, y), c);
    const t = (x - b.x0 + y - b.y0) / Math.max(1, b.x1 - b.x0 + b.y1 - b.y0);
    let lv;
    if (lt && !dk) lv = t < 0.6 ? 4 : 3;
    else if (dk && !lt) lv = t > 0.45 ? 1 : 2;
    else if (lt && dk) lv = t < 0.5 ? 3 : 2;
    else lv = t < 0.42 ? 3 : 2;
    return tones[lv];
  }).join(''));
}

// Pinta uma grade (ja sombreada) numa camada.
export function stamp(layer, grid, ox, oy, P) {
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = charColor(row[x], P);
      const X = ox + x, Y = oy + y;
      if (c && X >= 0 && Y >= 0 && X < layer.w && Y < layer.h) layer.px[Y * layer.w + X] = c;
    }
  });
  return layer;
}

// Contorno de 1px (vizinhanca de 4) com a cor escura do pixel vizinho, nunca preto puro.
// `inside` limita onde o contorno pode nascer (para nao invadir a moldura).
export function outline(layer, inside = () => true) {
  const { w, h, px } = layer;
  const out = px.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (px[y * w + x] || !inside(x, y)) continue;
    let darkest = null;
    let lum = Infinity;
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      const c = px[Y * w + X];
      if (!c) continue;
      const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
      if (l < lum) { lum = l; darkest = c; }
    }
    if (darkest) out[y * w + x] = outlineOf(darkest);
  }
  layer.px = out;
  return layer;
}

export function composite(base, top) {
  top.px.forEach((c, i) => { if (c) base.px[i] = c; });
  return base;
}

export function toRGBA(layer) {
  const data = new Uint8ClampedArray(layer.w * layer.h * 4);
  layer.px.forEach((c, i) => {
    if (!c) return;
    data[i * 4] = c[0];
    data[i * 4 + 1] = c[1];
    data[i * 4 + 2] = c[2];
    data[i * 4 + 3] = 255;
  });
  return data;
}

// Hash deterministico pequeno (decoracoes "irregulares" que nunca mudam entre renders).
export function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
