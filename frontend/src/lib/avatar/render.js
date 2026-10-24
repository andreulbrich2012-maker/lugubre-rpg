// Ponte entre os pixels puros (compose.js) e o navegador: folha de sprites em canvas
// (com cache por aparencia), quadro avulso e retrato em dataURL para listas e chat.
import { renderPixels, renderSheetPixels, SHEET_LAYOUT, sheetFrameIndex } from './compose.js';
import { repairAppearance, stable } from './appearance.js';
import { W, H, DIRECTIONS } from './skeleton.js';

export { composeFrame } from './compose.js';

// Cache pequeno (LRU simples): a mesa pode ter varios tokens, mas montar a folha custa ~24 quadros.
const MAX_CACHE = 64;
const sheetCache = new Map();

export const appearanceKey = (appearance) => stable(repairAppearance(appearance));

// Folha completa (6 colunas x 4 direcoes) num canvas; mesma aparencia = mesmo canvas.
export function buildSpriteSheet(appearance) {
  const key = appearanceKey(appearance);
  const hit = sheetCache.get(key);
  if (hit) {
    sheetCache.delete(key);
    sheetCache.set(key, hit);
    return hit;
  }
  const { width, height, data } = renderSheetPixels(appearance);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(data, width, height), 0, 0);
  const sheet = { canvas, key, w: W, h: H };
  sheetCache.set(key, sheet);
  if (sheetCache.size > MAX_CACHE) sheetCache.delete(sheetCache.keys().next().value);
  return sheet;
}

// Retangulo de origem de um quadro dentro da folha.
export function frameRect(dir = 'down', anim = 'idle', f = 0) {
  const row = Math.max(0, DIRECTIONS.indexOf(dir));
  return { sx: sheetFrameIndex(anim, f) * W, sy: row * H, sw: W, sh: H };
}

// Desenha um quadro num contexto 2D (sempre pixel nitido).
export function drawFrame(ctx, appearance, { dir = 'down', anim = 'idle', f = 0, x = 0, y = 0, scale = 1 } = {}) {
  const sheet = buildSpriteSheet(appearance);
  const r = frameRect(dir, anim, f);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet.canvas, r.sx, r.sy, r.sw, r.sh, x, y, W * scale, H * scale);
}

const portraitCache = new Map();

// Retrato (busto, de frente, parado) em dataURL; recorta a cabeca e os ombros.
export function portraitDataUrl(appearance, size = 64) {
  const key = `${appearanceKey(appearance)}:${size}`;
  if (portraitCache.has(key)) return portraitCache.get(key);
  const px = renderPixels(appearance, 'down', 'idle', 0, { shadow: false });
  const src = document.createElement('canvas');
  src.width = W;
  src.height = H;
  src.getContext('2d').putImageData(new ImageData(px, W, H), 0, 0);
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  // quadrado 20x20 a partir do alto da cabeca (cabe chifre e aureola)
  ctx.drawImage(src, 2, 0, 20, 20, 0, 0, size, size);
  const url = out.toDataURL();
  portraitCache.set(key, url);
  if (portraitCache.size > MAX_CACHE) portraitCache.delete(portraitCache.keys().next().value);
  return url;
}

export { SHEET_LAYOUT, W as FRAME_W, H as FRAME_H };

const thumbCache = new Map();

// Miniatura de um quadro (para os botoes do criador). Cache curto: muda a cada escolha.
export function frameDataUrl(appearance, { dir = 'down', scale = 2, crop = null } = {}) {
  const key = `${appearanceKey(appearance)}:${dir}:${scale}:${crop ? crop.join(',') : ''}`;
  if (thumbCache.has(key)) return thumbCache.get(key);
  const px = renderPixels(appearance, dir, 'idle', 0, { shadow: false });
  const src = document.createElement('canvas');
  src.width = W;
  src.height = H;
  src.getContext('2d').putImageData(new ImageData(px, W, H), 0, 0);
  const [cx, cy, cw, ch] = crop || [0, 0, W, H];
  const out = document.createElement('canvas');
  out.width = cw * scale;
  out.height = ch * scale;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, cx, cy, cw, ch, 0, 0, cw * scale, ch * scale);
  const url = out.toDataURL();
  thumbCache.set(key, url);
  if (thumbCache.size > 600) thumbCache.delete(thumbCache.keys().next().value);
  return url;
}
