// Desenho dos mapas em <canvas>. Os sprites viram um atlas uma vez so (por quadro
// nos animados) e cada celula e um drawImage: rapido ate 80x80 a 4 fps.
import { SIZE, TILES, DEFAULT_GROUND, getTile, tileImages } from './catalog.js';

export const FRAME_MS = 250; // ~4 fps: pixel art animada mais rapido que isso parece tremida

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Pura (sem DOM): RGBA 16x16 de um sprite. Usada no atlas e no preview em node.
export function rasterize(rows, palette, silhouette = false) {
  const out = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ' || !palette[ch]) continue;
      const i = (y * SIZE + x) * 4;
      const [r, g, b] = silhouette ? [0, 0, 0] : hexToRgb(palette[ch]);
      out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
    }
  }
  return out;
}

// Variante estavel por celula (hash de x,y): o mapa nao "pisca" ao redesenhar.
export function cellHash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

// Vai-e-volta (0,1,2,1,0...): agua e fogo nao "pulam" do ultimo quadro para o primeiro.
export function frameIndex(time, count, offset = 0) {
  if (count < 2) return 0;
  const step = Math.floor(time / FRAME_MS) + offset;
  const len = count * 2 - 2;
  const i = ((step % len) + len) % len;
  return i < count ? i : len - i;
}

export function isAnimatedCode(code) {
  const t = getTile(code);
  return !!(t && (t.frames || t.light));
}

let atlas = null;

// Atlas: uma linha por bloco, colunas = imagens; objetos ganham uma linha de silhueta (sombra).
function getAtlas() {
  if (atlas) return atlas;
  const cols = Math.max(...TILES.map((t) => tileImages(t).length));
  const canvas = document.createElement('canvas');
  canvas.width = cols * SIZE;
  canvas.height = TILES.length * 2 * SIZE;
  const ctx = canvas.getContext('2d');
  const index = {};
  TILES.forEach((t, row) => {
    const imgs = tileImages(t);
    imgs.forEach((rows, col) => {
      ctx.putImageData(new ImageData(rasterize(rows, t.palette), SIZE, SIZE), col * SIZE, row * 2 * SIZE);
      if (t.layer === 'objects') {
        ctx.putImageData(new ImageData(rasterize(rows, t.palette, true), SIZE, SIZE), col * SIZE, (row * 2 + 1) * SIZE);
      }
    });
    index[t.code] = { y: row * 2 * SIZE, count: imgs.length, animated: !!t.frames };
  });
  atlas = { canvas, index };
  return atlas;
}

function imageCol(entry, x, y, time) {
  if (entry.count < 2) return 0;
  // objetos animados ficam fora de fase entre si (duas tochas nao piscam juntas);
  // agua anda em sincronia para as ondas continuarem de uma celula para outra
  if (entry.animated) return frameIndex(time, entry.count, entry.objects ? cellHash(x, y) % 4 : 0);
  return cellHash(x, y) % entry.count;
}

export function drawMap(ctx, map, { cellSize = 48, time = 0, showGrid = false } = {}) {
  const { canvas: img, index } = getAtlas();
  const { cols, rows } = map;
  const ground = map.layers?.ground || [];
  const objects = map.layers?.objects || [];
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cols * cellSize, rows * cellSize);
  const s = cellSize;
  const lights = [];

  for (let y = 0; y < rows; y++) {
    const row = ground[y] || '';
    for (let x = 0; x < cols; x++) {
      const e = index[row[x]] || index[DEFAULT_GROUND];
      ctx.drawImage(img, imageCol(e, x, y, time) * SIZE, e.y, SIZE, SIZE, x * s, y * s, s, s);
      const t = getTile(row[x]);
      if (t?.light) lights.push([x, y, t.light, 0.35]);
    }
  }

  // sombra projetada para baixo-direita (luz do alto-esquerda), 1 pixel do sprite
  const px = s / SIZE;
  for (let pass = 0; pass < 2; pass++) {
    if (pass === 0) ctx.globalAlpha = 0.45;
    for (let y = 0; y < rows; y++) {
      const row = objects[y] || '';
      for (let x = 0; x < cols; x++) {
        const t = getTile(row[x]);
        if (!t || t.layer !== 'objects') continue;
        const e = { ...index[t.code], objects: true };
        const col = imageCol(e, x, y, time) * SIZE;
        if (pass === 0) ctx.drawImage(img, col, e.y + SIZE, SIZE, SIZE, x * s + px, y * s + px, s, s);
        else {
          ctx.drawImage(img, col, e.y, SIZE, SIZE, x * s, y * s, s, s);
          if (t.light) lights.push([x, y, t.light, 0.55]);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // brilho das fontes de luz (fogo, tocha, portal): soma de cor, oscila um pouco
  if (lights.length) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, color, base] of lights) {
      const flick = 0.85 + 0.15 * Math.sin(time / 180 + cellHash(x, y));
      const cx = (x + 0.5) * s;
      const cy = (y + 0.5) * s;
      const r = s * 1.8;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const [cr, cg, cb] = hexToRgb(color);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},${(base * flick * 0.5).toFixed(3)})`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  if (showGrid) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < cols; x++) { ctx.moveTo(x * s + 0.5, 0); ctx.lineTo(x * s + 0.5, rows * s); }
    for (let y = 1; y < rows; y++) { ctx.moveTo(0, y * s + 0.5); ctx.lineTo(cols * s, y * s + 0.5); }
    ctx.stroke();
  }
}

const previewCache = new Map();

// Miniatura de um bloco para os botoes da paleta (dataURL, cacheada).
export function renderTilePreview(code, size = 32) {
  const key = `${code}:${size}`;
  if (previewCache.has(key)) return previewCache.get(key);
  const t = getTile(code);
  if (!t) return '';
  const { canvas: img, index } = getAtlas();
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, index[code].y, SIZE, SIZE, 0, 0, size, size);
  const url = c.toDataURL();
  previewCache.set(key, url);
  return url;
}
