// Ponte entre os pixels puros (compose.js) e o navegador: folha de sprites em
// canvas (com cache por descritor), quadro avulso e retrato em dataURL.
import { renderMonsterPixels, renderSheetPixels, SHEET_LAYOUT, sheetFrameIndex, DIRECTIONS } from './compose.js';
import { monsterLook } from './classify.js';

export { ANIMS, FRAME_MS, DIRECTIONS, SHEET_LAYOUT } from './compose.js';

// Aceita o registro do monstro OU um descritor ja pronto de monsterLook().
export function toLook(monsterOrLook) {
  if (monsterOrLook && monsterOrLook.plan && monsterOrLook.palette && monsterOrLook.size) return monsterOrLook;
  return monsterLook(monsterOrLook || {});
}

const MAX_CACHE = 96;
const sheetCache = new Map();

function lru(map, key, make, max = MAX_CACHE) {
  const hit = map.get(key);
  if (hit) { map.delete(key); map.set(key, hit); return hit; }
  const v = make();
  map.set(key, v);
  if (map.size > max) map.delete(map.keys().next().value);
  return v;
}

function pixelsToCanvas(data, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
  return canvas;
}

// Folha completa (7 colunas: idle 2 + andar 4 + ataque 1; 4 linhas de direcao).
export function buildMonsterSheet(monsterOrLook) {
  const look = toLook(monsterOrLook);
  return lru(sheetCache, look.key, () => {
    const { width, height, data } = renderSheetPixels(look);
    return { canvas: pixelsToCanvas(data, width, height), key: look.key, w: look.size, h: look.size, look };
  });
}

export function monsterFrameRect(size, dir = 'down', anim = 'idle', f = 0) {
  const row = Math.max(0, DIRECTIONS.indexOf(dir));
  return { sx: sheetFrameIndex(anim, f) * size, sy: row * size, sw: size, sh: size };
}

// Desenha um quadro num contexto 2D (pixel nitido). scale multiplica o tamanho do quadro.
export function drawMonsterFrame(ctx, monsterOrLook, { dir = 'down', anim = 'idle', f = 0, x = 0, y = 0, scale = 1 } = {}) {
  const sheet = buildMonsterSheet(monsterOrLook);
  const r = monsterFrameRect(sheet.w, dir, anim, f);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet.canvas, r.sx, r.sy, r.sw, r.sh, x, y, sheet.w * scale, sheet.h * scale);
}

const portraitCache = new Map();

// Retrato: quadro de frente, parado, sem sombra, recortado na criatura e ampliado
// (sempre em multiplos inteiros para manter o pixel nitido).
export function monsterPortraitDataUrl(monsterOrLook, size = 96) {
  const look = toLook(monsterOrLook);
  return lru(portraitCache, `${look.key}:${size}`, () => {
    const S = look.size;
    const px = renderMonsterPixels(look, 'down', 'idle', 0, { shadow: false });
    let x0 = S, y0 = S, x1 = -1, y1 = -1;
    for (let i = 0; i < S * S; i++) {
      if (!px[i * 4 + 3]) continue;
      const x = i % S, y = (i / S) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 < 0) { x0 = 0; y0 = 0; x1 = S - 1; y1 = S - 1; }
    const side = Math.max(x1 - x0 + 1, y1 - y0 + 1) + 2;
    const k = Math.max(1, Math.floor(size / side));
    const out = document.createElement('canvas');
    out.width = size;
    out.height = size;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const w = (x1 - x0 + 1) * k, h = (y1 - y0 + 1) * k;
    ctx.drawImage(pixelsToCanvas(px, S, S), x0, y0, x1 - x0 + 1, y1 - y0 + 1, Math.floor((size - w) / 2), Math.floor((size - h) / 2), w, h);
    return out.toDataURL();
  }, 200);
}

export { SHEET_LAYOUT as MONSTER_SHEET_LAYOUT };
