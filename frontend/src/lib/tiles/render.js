// Desenho dos mapas em <canvas>. Os sprites viram um atlas uma vez so (por quadro
// nos animados) e cada celula e um drawImage: rapido ate 80x80 a 4 fps.
import { SIZE, TILES, getTile, tileImages } from './catalog.js';
import { roofPixels } from './roofs.js';
import { renderTerrain, renderObjects, terrainFrames, isAnimatedObject, lightSources, LIGHT_TINT } from './compose.js';

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

const roofCache = new Map();

// Telhado de uma construcao num canvas do tamanho nativo (16 px por celula); escalar e com o CSS/drawImage.
export function roofCanvas(b, canvas = document.createElement('canvas')) {
  const { width, height, data } = roofPixels(b);
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(data, width, height), 0, 0);
  return canvas;
}

function toCanvas(img) {
  const c = document.createElement('canvas');
  c.width = img.w;
  c.height = img.h;
  c.getContext('2d').putImageData(new ImageData(img.data, img.w, img.h), 0, 0);
  return c;
}

// Camadas pre-renderizadas por mapa (chave = o objeto layers: pegar item troca so "items" e
// nao refaz o chao). Terreno: um canvas por quadro de agua/lava, feito na primeira vez que precisa.
const layerCache = new WeakMap();
function sceneLayers(map, beautify) {
  const decor = map.decor || 'normal';
  let c = layerCache.get(map.layers);
  if (!c || c.beautify !== beautify || c.decor !== decor || c.cols !== map.cols) {
    const animated = [];
    map.layers.objects.forEach((row, y) => [...row].forEach((ch, x) => {
      const t = getTile(ch);
      if (t && isAnimatedObject(t)) animated.push([x, y, t]);
    }));
    c = { beautify, decor, cols: map.cols, frames: terrainFrames(map), terrain: [], objects: null, animated, lights: lightSources(map) };
    layerCache.set(map.layers, c);
  }
  return c;
}

// light: 'dia' | 'entardecer' | 'noite' (map.light). roofs: desenha todos os telhados (previa do editor).
export function drawMap(ctx, map, { cellSize = 48, time = 0, showGrid = false, roofs = false, beautify = true } = {}) {
  const { canvas: img, index } = getAtlas();
  const { cols, rows } = map;
  const s = cellSize;
  const L = sceneLayers(map, beautify);
  const f = L.frames > 1 ? frameIndex(time, L.frames) : 0;
  if (!L.terrain[f]) L.terrain[f] = toCanvas(renderTerrain(map, { frame: f, beautify, decor: L.decor }));
  if (!L.objects) L.objects = toCanvas(renderObjects(map, { beautify }));
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cols * s, rows * s);
  ctx.drawImage(L.terrain[f], 0, 0, cols * s, rows * s);
  ctx.drawImage(L.objects, 0, 0, cols * s, rows * s);
  // so os objetos animados sao redesenhados a cada quadro (fora de fase entre si)
  for (const [x, y, t] of L.animated) {
    const e = index[t.code];
    ctx.drawImage(img, frameIndex(time, e.count, cellHash(x, y) % 4) * SIZE, e.y, SIZE, SIZE, x * s, y * s, s, s);
  }

  // ciclo de luz: o ceu multiplica a cor; as fontes de luz somam brilho (mais forte a noite)
  const light = map.light || 'dia';
  const tintHex = LIGHT_TINT[light];
  if (tintHex) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = tintHex;
    ctx.fillRect(0, 0, cols * s, rows * s);
    ctx.restore();
  }
  const sources = tintHex ? L.lights : L.lights.filter(([x, y]) => map.layers.ground[y][x] !== 'J');
  if (sources.length) {
    const strength = light === 'noite' ? 1.4 : light === 'entardecer' ? 0.9 : 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, color] of sources) {
      const flick = 0.85 + 0.15 * Math.sin(time / 180 + cellHash(x, y));
      const cx = (x + 0.5) * s;
      const cy = (y + 0.5) * s;
      const r = s * (light === 'noite' ? 2.6 : 1.8);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const [cr, cg, cb] = hexToRgb(color);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},${Math.min(0.9, 0.3 * strength * flick).toFixed(3)})`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  if (roofs) {
    for (const b of map.buildings || []) {
      const key = `${b.w}x${b.h}:${b.roof}`;
      if (!roofCache.has(key)) roofCache.set(key, roofCanvas(b));
      const rc = roofCache.get(key);
      ctx.drawImage(rc, b.x * s, b.y * s, b.w * s, (rc.height / SIZE) * s);
    }
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
