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
