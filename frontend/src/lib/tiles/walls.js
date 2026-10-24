// Paredes com autotile (estilo RPG visto de cima): o desenho depende do vizinho.
// Parede com parede logo abaixo = "topo" (tampa escura vista de cima); com chao abaixo =
// "face" (a frente de pedra/tijolo). Sem isso o mapa vira um tabuleiro de quadrados iguais
// e nao da para ler onde a parede comeca (pedido do Andre, 23/10).
import { SIZE, getTile } from './catalog.js';
import { rasterize } from './render.js';

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

const OUTLINE = [13, 12, 18];

export function isWallCode(code) {
  return Boolean(getTile(code)?.wall);
}

// Bits dos vizinhos que tambem sao parede (porta e janela contam: fazem parte da parede).
export function wallMask(map, x, y) {
  const g = map.layers?.ground || [];
  const at = (cx, cy) => isWallCode(g[cy]?.[cx]);
  return (at(x, y - 1) ? N : 0) | (at(x + 1, y) ? E : 0) | (at(x, y + 1) ? S : 0) | (at(x - 1, y) ? W : 0);
}

// {kind: 'top'|'face', mask} ou null (nao e parede).
export function wallVariant(map, x, y) {
  const t = getTile(map.layers?.ground?.[y]?.[x]);
  if (!t?.wall) return null;
  const mask = wallMask(map, x, y);
  return { kind: !t.face && mask & S ? 'top' : 'face', mask };
}

function put(out, x, y, rgb, alpha = 1) {
  const i = (y * SIZE + x) * 4;
  for (let k = 0; k < 3; k++) out[i + k] = Math.round(out[i + k] * (1 - alpha) + rgb[k] * alpha);
  out[i + 3] = 255;
}
const scale = (out, x, y, f) => {
  const i = (y * SIZE + x) * 4;
  for (let k = 0; k < 3; k++) out[i + k] = Math.min(255, Math.round(out[i + k] * f));
};

// Pura: RGBA 16x16 da variante. rows = imagem do bloco (quadro/variante ja escolhido).
export function wallPixels(tile, rows, kind, mask) {
  const out = rasterize(rows, tile.palette);
  const CAP = kind === 'top' ? SIZE : 4; // a face mostra a borda da tampa em cima
  for (let y = 0; y < CAP; y++) for (let x = 0; x < SIZE; x++) scale(out, x, y, 0.5);
  if (kind === 'face') {
    for (let x = 0; x < SIZE; x++) {
      put(out, x, 4, OUTLINE, 0.7); // sombra sob a beirada da tampa
      scale(out, x, SIZE - 1, 0.6); // pe da parede encostando no chao
    }
  }
  // beiradas abertas: luz vem do alto-esquerda (realce em cima/esquerda)
  const rimTop = !(mask & N);
  const rimLeft = !(mask & W);
  const rimRight = !(mask & E);
  const rimBottom = kind === 'top' && !(mask & S);
  for (let i = 0; i < SIZE; i++) {
    if (rimTop) { put(out, i, 0, OUTLINE); if (i > 0 && i < SIZE - 1) scale(out, i, 1, 1.9); }
    if (rimLeft) { put(out, 0, i, OUTLINE); if (i > 0 && i < CAP) scale(out, 1, i, 1.6); }
    if (rimRight) put(out, SIZE - 1, i, OUTLINE);
    if (rimBottom) put(out, i, SIZE - 1, OUTLINE);
  }
  return out;
}

// Quantos pixels (de 16) da sombra que a face projeta no chao logo abaixo.
export const FACE_SHADOW = 3;
