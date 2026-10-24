// Fora do mapa: textura de mata fechada que emenda sem costura (o mapa nao "acaba" num preto).
// Gera um padrao de 16x16 celulas repetido 3x3, desenha e recorta o meio: arvores que passam da
// borda do recorte sao iguais as do outro lado, entao a textura repete perfeita.
import { renderRegion } from './compose.js';
import { applyStyle } from './styles.js';

const N = 16;
const cache = new Map();

function patternMap() {
  let s = 12345;
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const tile = Array.from({ length: N }, () => Array.from({ length: N }, () => (rnd() < 0.82 ? (rnd() < 0.4 ? 'A' : rnd() < 0.92 ? 'T' : 'b') : ' ')));
  const ground = Array.from({ length: N * 3 }, () => 'g'.repeat(N * 3));
  const objects = Array.from({ length: N * 3 }, (_, y) => Array.from({ length: N * 3 }, (_, x) => tile[y % N][x % N]).join(''));
  return { cols: N * 3, rows: N * 3, layers: { ground, objects }, items: [], buildings: [], decor: 'pouca' };
}

// RGBA da textura (N*16 px de lado) para o estilo do mapa; null sem DOM nao importa (so dados)
export function outsideTexture(style = 'padrao') {
  if (cache.has(style)) return cache.get(style);
  const img = renderRegion(patternMap(), N, N, N, N, {});
  if (style && style !== 'padrao') applyStyle(img, style);
  cache.set(style, img);
  return img;
}

// URL de imagem (navegador) da textura, guardada por estilo
const urls = new Map();
export function outsideTextureUrl(style = 'padrao') {
  if (typeof document === 'undefined') return null;
  if (urls.has(style)) return urls.get(style);
  const img = outsideTexture(style);
  const c = document.createElement('canvas');
  c.width = img.w; c.height = img.h;
  c.getContext('2d').putImageData(new ImageData(img.data, img.w, img.h), 0, 0);
  const url = c.toDataURL('image/png');
  urls.set(style, url);
  return url;
}
export const OUTSIDE_CELLS = N;

// ---- continuacao do proprio mapa (o que a mesa desenha em volta) ----
// Mapa com margem de P celulas: o chao da borda continua para fora (estrada, rio, lago, areia
// seguem reto), as arvores saem com a mesma densidade que o mapa tem perto daquela borda, e
// paredes/pontes viram chao. So visual: a borda de verdade continua sendo a barreira.
export const PAD = 24;
const WALLISH = new Set(['#', 'B', 'M', 'H', 'Z', 'ç', 'ñ', 'J', 'D', 'X', '(', '?', ']', '/', ')', 'P', '@']);
const OPEN = new Set([';', 'c', 'û', ',', '0', '~', 'W', 'ó', ':', '%', 'L', '-', 'â']);
const TREES = new Set(['T', 'A', 'b', 'Y', 'd']);
const h2 = (x, y, k) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h & 0xffff) / 0xffff; };

export function padMap(map, P = PAD) {
  const { cols, rows } = map;
  const g0 = map.layers.ground; const o0 = map.layers.objects;
  const W = cols + P * 2; const H = rows + P * 2;
  // densidade de arvores perto da borda, por trechos de 8 celulas (media de uma faixa de 6)
  const BAND = Math.min(6, cols, rows);
  const dens = (sx, sy) => {
    const x0 = Math.max(0, sx - 4); const x1 = Math.min(cols - 1, sx + 4);
    const y0 = Math.max(0, sy - 4); const y1 = Math.min(rows - 1, sy + 4);
    let t = 0; let n = 0; const kinds = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const near = x < BAND || y < BAND || x >= cols - BAND || y >= rows - BAND;
      if (!near) continue;
      n++;
      const ch = o0[y][x];
      if (TREES.has(ch)) { t++; kinds.push(ch); }
    }
    return { d: n ? t / n : 0, kinds };
  };
  const memo = new Map();
  const ground = []; const objects = [];
  for (let y = 0; y < H; y++) {
    let gr = ''; let ob = '';
    const oy = y - P;
    const inRow = oy >= 0 && oy < rows;
    for (let x = 0; x < W; x++) {
      const ox = x - P;
      if (inRow && ox >= 0 && ox < cols) { gr += g0[oy][ox]; ob += o0[oy][ox]; continue; }
      const sx = Math.max(0, Math.min(cols - 1, ox)); const sy = Math.max(0, Math.min(rows - 1, oy));
      let g = g0[sy][sx];
      if (g === '-') g = ox < 0 || ox >= cols ? (g0[sy][sx - 1] === '0' || g0[sy][sx + 1] === '0' ? '0' : ';') : (g0[sy - 1]?.[sx] === '0' || g0[sy + 1]?.[sx] === '0' ? '0' : ';');
      if (WALLISH.has(g)) g = '.';
      // agua funda esticada vira faixa reta: fora da borda fica rasa
      if (g === 'W') g = '~';
      if (g === '.' && h2(x, y, 1) < 0.08) g = h2(x, y, 2) < 0.5 ? 'á' : 'g';
      let o = ' ';
      if (!OPEN.has(g)) {
        const key = `${Math.floor(sx / 8)},${Math.floor(sy / 8)}`;
        if (!memo.has(key)) memo.set(key, dens(sx, sy));
        const { d, kinds } = memo.get(key);
        const dist = Math.max(ox < 0 ? -ox : ox >= cols ? ox - cols + 1 : 0, oy < 0 ? -oy : oy >= rows ? oy - rows + 1 : 0);
        const p = Math.min(0.75, d * 1.05 + 0.04 + (dist / P) * 0.12);
        if (h2(x, y, 3) < p) o = kinds.length ? kinds[Math.floor(h2(x, y, 4) * kinds.length)] : (h2(x, y, 5) < 0.4 ? 'A' : 'T');
        else if (h2(x, y, 6) < 0.025) o = h2(x, y, 7) < 0.5 ? 'f' : 'b';
      }
      gr += g; ob += o;
    }
    ground.push(gr); objects.push(ob);
  }
  return {
    ...map, cols: W, rows: H, layers: { ...map.layers, ground, objects },
    items: [], buildings: (map.buildings || []).map((b) => ({ ...b, x: b.x + P, y: b.y + P })), pois: undefined
  };
}
