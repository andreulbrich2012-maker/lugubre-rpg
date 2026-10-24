// Desenho dos mapas em <canvas>. O chao e os objetos sao renderizados (compose.js) em pedacos
// cacheados (chunks.js) e cada quadro so cola os pedacos da vista: mapa de ate 1000x1000
// celulas sem canvas gigante. Objetos animados vem do atlas de sprites a cada quadro.
import { SIZE, TILES, getTile, tileImages } from './catalog.js';
import { roofPixels } from './roofs.js';
import { renderRegion, terrainFrames, isAnimatedObject, LIGHT_TINT, NIGHT_LIGHT } from './compose.js';
import { resolveLight } from './daylight.js';
import { applyStyle, styleHex } from './styles.js';
import { chunkLayout, chunkRect, visibleChunks, pickLod, diffLayers, dirtyChunks } from './chunks.js';

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
const styledAtlas = new Map();

// Atlas: uma linha por bloco, colunas = imagens; objetos ganham uma linha de silhueta (sombra).
// Com estilo de mapa (styles.js): copia do atlas com a cor transformada, feita uma vez por estilo
// (objetos animados - fogo, tocha, portal - sao desenhados dele a cada quadro).
function getAtlas(style) {
  if (style && style !== 'padrao') {
    let a = styledAtlas.get(style);
    if (!a) {
      const base = getAtlas();
      const canvas = document.createElement('canvas');
      canvas.width = base.canvas.width;
      canvas.height = base.canvas.height;
      const ctx = canvas.getContext('2d');
      const img = base.canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      ctx.putImageData(applyStyle(img, style), 0, 0);
      a = { canvas, index: base.index };
      styledAtlas.set(style, a);
    }
    return a;
  }
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
export function roofCanvas(b, canvas = document.createElement('canvas'), style) {
  const { width, height, data } = roofPixels(b);
  applyStyle(data, style);
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(data, width, height), 0, 0);
  return canvas;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function toCanvas(img, style) {
  applyStyle(img, style);
  const c = makeCanvas(img.w, img.h);
  c.getContext('2d').putImageData(new ImageData(img.data, img.w, img.h), 0, 0);
  return c;
}

// ---------- miniatura (1 px por celula) ----------
// Cor media de cada bloco (chao) e do objeto por cima: mapa inteiro de longe sem renderizar nada
// e "tapa-buraco" enquanto os pedacos de perto ainda estao sendo feitos.
const avgCache = new Map();
function avgColor(code) {
  let c = avgCache.get(code);
  if (c === undefined) {
    const t = getTile(code);
    c = null;
    if (t) {
      const px = rasterize(tileImages(t)[0], t.palette);
      let r = 0; let g = 0; let b = 0; let n = 0;
      for (let i = 0; i < px.length; i += 4) if (px[i + 3]) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
      if (n) c = [r / n, g / n, b / n, n / (SIZE * SIZE)];
    }
    avgCache.set(code, c);
  }
  return c;
}
function overviewPixel(data, i, groundCode, objCode) {
  const g = avgColor(groundCode) || [40, 34, 48, 1];
  let r = g[0]; let gg = g[1]; let b = g[2];
  const o = objCode && objCode !== ' ' ? avgColor(objCode) : null;
  if (o && getTile(objCode)?.layer === 'objects') {
    const a = Math.min(0.8, 0.25 + o[3]);
    r += (o[0] - r) * a; gg += (o[1] - gg) * a; b += (o[2] - b) * a;
  }
  data[i] = r; data[i + 1] = gg; data[i + 2] = b; data[i + 3] = 255;
}
function fillOverview(map, x0, y0, w, h, style) {
  const img = { w, h, data: new Uint8ClampedArray(w * h * 4) };
  const G = map.layers.ground;
  const O = map.layers.objects;
  for (let y = 0; y < h; y++) {
    const gr = G[y0 + y] || '';
    const or = O?.[y0 + y] || '';
    for (let x = 0; x < w; x++) overviewPixel(img.data, (y * w + x) * 4, gr[x0 + x], or[x0 + x]);
  }
  return applyStyle(img, style);
}

// ---------- desenho em pedacos (mapa grande) ----------
// Um MapRenderer por <TileMapCanvas>: guarda os pedacos ja feitos (canvas por pedaco, por nivel
// de detalhe e por quadro de agua), refaz so os pedacos que a pintura sujou (diffLayers) e
// joga fora os mais antigos quando passa do limite de memoria (LRU por bytes).
export const DEFAULT_BUDGET_BYTES = 320 * 1024 * 1024;

export class MapRenderer {
  constructor({ budgetBytes = DEFAULT_BUDGET_BYTES } = {}) {
    this.budget = budgetBytes;
    this.reset();
  }

  reset() {
    this.sig = '';
    this.map = null;
    this.L = null;
    this.entries = new Map(); // `${res}|${i}|${j}` -> pedaco (ordem de insercao = LRU)
    this.meta = new Map(); // `${i}|${j}` -> { animTerrain, animated, lights }
    this.bytes = 0;
    this.drawId = 0;
    this.overview = null;
    this.frames = 1;
  }

  dispose() { this.reset(); }

  get stats() {
    let canvases = 0;
    for (const e of this.entries.values()) canvases += e.frames.filter(Boolean).length;
    return { chunks: this.entries.size, canvases, bytes: this.bytes, layout: this.L };
  }

  sync(map, beautify) {
    const style = map.style || 'padrao';
    const decor = map.decor || 'normal';
    const sig = `${map.cols}x${map.rows}|${style}|${decor}|${beautify}`;
    if (sig !== this.sig) {
      this.reset();
      this.sig = sig;
      this.map = map;
      this.style = style;
      this.decor = decor;
      this.beautify = beautify;
      this.L = chunkLayout(map.cols, map.rows);
      this.frames = terrainFrames(map);
      return;
    }
    if (map.layers === this.map.layers) { this.map = map; return; }
    const segs = diffLayers(this.map.layers, map.layers);
    this.map = map;
    if (!segs.length) return;
    // quadros de agua: tile animado novo pode mudar o ciclo (so cresce; sobrar e inofensivo)
    const rowsTouched = { layers: { ground: segs.map(([y]) => map.layers.ground[y] || '') } };
    const f = terrainFrames(rowsTouched);
    if (f > 1) { const gcd = (a, b) => (b ? gcd(b, a % b) : a); this.frames = (this.frames * f) / gcd(this.frames, f); }
    const dirty = dirtyChunks(this.L, segs);
    for (const key of dirty) {
      this.meta.delete(key);
      for (const res of [8, 16]) {
        const e = this.entries.get(`${res}|${key}`);
        if (!e) continue;
        e.stale = true;
        e.frames.forEach((c, k) => { if (c && k) this.bytes -= c.width * c.height * 4; });
        e.frames = [e.frames[0]];
      }
    }
    if (this.overview) {
      const ctx = this.overview.getContext('2d');
      for (const [y, x0, x1] of segs) {
        const w = x1 - x0 + 1;
        const img = fillOverview(map, x0, y, w, 1, this.style);
        ctx.putImageData(new ImageData(img.data, w, 1), x0, y);
      }
    }
  }

  getOverview() {
    if (!this.overview) {
      const { cols, rows } = this.map;
      const img = fillOverview(this.map, 0, 0, cols, rows, this.style);
      const c = makeCanvas(cols, rows);
      c.getContext('2d').putImageData(new ImageData(img.data, cols, rows), 0, 0);
      this.overview = c;
    }
    return this.overview;
  }

  // Dados do pedaco: agua animada (com a folga: espuma do vizinho entra), objetos animados e luzes.
  chunkMeta(i, j) {
    const key = `${i}|${j}`;
    let m = this.meta.get(key);
    if (m) return m;
    const { x, y, w, h } = chunkRect(this.L, i, j);
    const map = this.map;
    const G = map.layers.ground;
    const O = map.layers.objects;
    let animTerrain = false;
    const py0 = Math.max(0, y - 2); const py1 = Math.min(map.rows, y + h + 2);
    const px0 = Math.max(0, x - 2); const px1 = Math.min(map.cols, x + w + 2);
    for (let yy = py0; yy < py1 && !animTerrain; yy++) {
      const row = G[yy] || '';
      for (let xx = px0; xx < px1; xx++) { const t = getTile(row[xx]); if (t?.frames && t.frames.length > 1) { animTerrain = true; break; } }
    }
    const animated = [];
    const lights = [];
    for (let yy = y; yy < y + h; yy++) {
      const grow = G[yy] || '';
      const orow = O?.[yy] || '';
      for (let xx = x; xx < x + w; xx++) {
        const gt = getTile(grow[xx]);
        if (gt?.light) lights.push([xx, yy, gt.light]);
        else if (grow[xx] === 'J') lights.push([xx, yy, NIGHT_LIGHT]);
        const ot = getTile(orow[xx]);
        if (!ot) continue;
        if (ot.light) lights.push([xx, yy, ot.light]);
        if (isAnimatedObject(ot)) animated.push([xx, yy, ot]);
      }
    }
    m = { animTerrain, animated, lights };
    this.meta.set(key, m);
    return m;
  }

  renderChunk(i, j, res, frame) {
    const { x, y, w, h } = chunkRect(this.L, i, j);
    const img = renderRegion(this.map, x, y, w, h, { frame, beautify: this.beautify, decor: this.decor });
    let c = toCanvas(img, this.style);
    if (res < SIZE) {
      const d = makeCanvas(w * res, h * res);
      const dctx = d.getContext('2d');
      dctx.imageSmoothingEnabled = true;
      dctx.imageSmoothingQuality = 'medium';
      dctx.drawImage(c, 0, 0, d.width, d.height);
      c.width = 0; // libera a memoria do canvas grande ja
      c = d;
    }
    return c;
  }

  // Pedaco pronto para desenhar (refaz se sujou e houver tempo). Devolve { canvas, pending }.
  chunkCanvas(i, j, res, frame, canRender) {
    const key = `${res}|${i}|${j}`;
    let e = this.entries.get(key);
    if (e) { this.entries.delete(key); this.entries.set(key, e); } // LRU: usado agora vai para o fim
    let pending = false;
    if (!e || e.stale) {
      if (canRender()) {
        const c = this.renderChunk(i, j, res, 0);
        if (e) e.frames.forEach((old) => { if (old) this.bytes -= old.width * old.height * 4; });
        e = { i, j, res, frames: [c], stale: false };
        this.bytes += c.width * c.height * 4;
        this.entries.set(key, e);
      } else pending = true;
    }
    if (!e) return { canvas: null, pending };
    e.used = this.drawId;
    let canvas = e.frames[0];
    if (frame > 0 && !e.stale) {
      if (!e.frames[frame] && canRender()) {
        const c = this.renderChunk(i, j, res, frame);
        e.frames[frame] = c;
        this.bytes += c.width * c.height * 4;
      }
      if (e.frames[frame]) canvas = e.frames[frame];
      else pending = true;
    }
    return { canvas, pending };
  }

  evict() {
    if (this.bytes <= this.budget) return;
    for (const [key, e] of this.entries) {
      if (this.bytes <= this.budget) break;
      if (e.used === this.drawId) continue;
      for (const c of e.frames) if (c) { this.bytes -= c.width * c.height * 4; c.width = 0; }
      this.entries.delete(key);
    }
    // ainda acima (tudo na tela): solta os quadros de agua alem do primeiro
    if (this.bytes > this.budget) {
      for (const e of this.entries.values()) {
        for (let k = 1; k < e.frames.length; k++) if (e.frames[k]) { this.bytes -= e.frames[k].width * e.frames[k].height * 4; e.frames[k].width = 0; e.frames[k] = null; }
      }
    }
  }
}

// Renderizador "de passagem" para quem chama drawMap sem guardar um (previa pequena): um por
// objeto layers, como o cache antigo.
const looseRenderers = new WeakMap();
function looseRenderer(map) {
  let r = looseRenderers.get(map.layers);
  if (!r) { r = new MapRenderer(); looseRenderers.set(map.layers, r); }
  return r;
}

// Desenha o mapa (ou so a vista) no ctx. cellSize = px do ctx por celula; view = celulas
// {x0, y0, x1, y1} a desenhar (padrao: o mapa todo); offset = px do ctx subtraidos (canvas que
// cobre so a vista). light: 'dia' | 'entardecer' | 'noite' (map.light). roofs: desenha todos os
// telhados (previa do editor). map.style: estilo global aplicado uma vez em cada pedaco.
// budgetMs: tempo maximo renderizando pedacos novos nesta chamada (sempre faz pelo menos um);
// o que faltar aparece na miniatura e volta { pending: true } para chamar de novo logo.
// Devolve { pending, animated } (animated: tem agua/fogo/luz na vista e vale redesenhar a 4 fps).
export function drawMap(ctx, map, {
  cellSize = 48, time = 0, showGrid = false, roofs = false, beautify = true,
  view, offset, renderer, budgetMs = 40, animate = true, buildingBlocks = false
} = {}) {
  const R = renderer || looseRenderer(map);
  R.sync(map, beautify);
  R.drawId++;
  const { cols, rows } = map;
  const L = R.L;
  const s = cellSize;
  const ox = offset?.x || 0;
  const oy = offset?.y || 0;
  const v = view || { x0: 0, y0: 0, x1: cols, y1: rows };
  const vx0 = Math.max(0, Math.floor(v.x0)); const vy0 = Math.max(0, Math.floor(v.y0));
  const vx1 = Math.min(cols, Math.ceil(v.x1)); const vy1 = Math.min(rows, Math.ceil(v.y1));
  // borda de pixel inteira e compartilhada entre vizinhos: sem fresta entre pedacos
  const X = (cx) => Math.round(cx * s) - ox;
  const Y = (cy) => Math.round(cy * s) - oy;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(X(vx0), Y(vy0), X(vx1) - X(vx0), Y(vy1) - Y(vy0));
  const lod = pickLod(s, L.single);
  let pending = false;
  let animated = false;
  const visible = lod === 'overview' ? [] : visibleChunks(L, { x0: vx0, y0: vy0, x1: vx1, y1: vy1 });

  if (lod === 'overview') {
    ctx.drawImage(R.getOverview(), vx0, vy0, vx1 - vx0, vy1 - vy0, X(vx0), Y(vy0), X(vx1) - X(vx0), Y(vy1) - Y(vy0));
    if (buildingBlocks) {
      // de longe as construcoes viram blocos da cor do telhado (o Board nao monta mil casas)
      for (const b of map.buildings || []) {
        if (b.x >= vx1 || b.y >= vy1 || b.x + b.w <= vx0 || b.y + b.h <= vy0) continue;
        ctx.fillStyle = styleHex(b.colors?.roof || '#8a4a3a', R.style);
        ctx.fillRect(X(b.x), Y(b.y), X(b.x + b.w) - X(b.x), Y(b.y + b.h) - Y(b.y));
      }
    }
  } else {
    const res = lod;
    const start = performance.now();
    let made = 0;
    const canRender = () => {
      if (made > 0 && performance.now() - start > budgetMs) return false;
      made++;
      return true;
    };
    const tick = Math.floor(Math.max(0, time) / FRAME_MS);
    const { canvas: atlasImg, index } = getAtlas(R.style);
    for (const [i, j] of visible) {
      const meta = R.chunkMeta(i, j);
      const anim = animate && res === SIZE && meta.animTerrain && R.frames > 1;
      if (anim) animated = true;
      const f = anim ? tick % R.frames : 0;
      const { x, y, w, h } = chunkRect(L, i, j);
      const got = R.chunkCanvas(i, j, res, f, canRender);
      if (got.pending) pending = true;
      if (got.canvas) ctx.drawImage(got.canvas, X(x), Y(y), X(x + w) - X(x), Y(y + h) - Y(y));
      else {
        // ainda nao feito: a miniatura tapa o buraco
        ctx.drawImage(R.getOverview(), x, y, w, h, X(x), Y(y), X(x + w) - X(x), Y(y + h) - Y(y));
      }
    }
    // objetos animados (fogo, tocha, portal) da vista, fora de fase entre si
    for (const [i, j] of visible) {
      for (const [x, y, t] of R.chunkMeta(i, j).animated) {
        const e = index[t.code];
        if (!e) continue;
        if (animate) animated = true;
        ctx.drawImage(atlasImg, frameIndex(animate ? time : 0, e.count, cellHash(x, y) % 4) * SIZE, e.y, SIZE, SIZE, X(x), Y(y), X(x + 1) - X(x), Y(y + 1) - Y(y));
      }
    }
  }

  // ciclo de luz: o ceu multiplica a cor; as fontes de luz somam brilho (mais forte a noite)
  const sky = resolveLight(map.light);
  const tintHex = sky.tintHex;
  if (tintHex) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = tintHex;
    ctx.fillRect(X(vx0), Y(vy0), X(vx1) - X(vx0), Y(vy1) - Y(vy0));
    ctx.restore();
  }
  if (lod !== 'overview') {
    // luzes dos pedacos da vista e dos vizinhos (o brilho passa da borda)
    const reach = 3;
    const near = visibleChunks(L, { x0: vx0 - reach, y0: vy0 - reach, x1: vx1 + reach, y1: vy1 + reach });
    const strength = sky.glow;
    const r = s * sky.radius;
    let saved = false;
    for (const [i, j] of near) {
      for (const [x, y, color] of R.chunkMeta(i, j).lights) {
        if (!tintHex && map.layers.ground[y][x] === 'J') continue;
        if (x < vx0 - reach || y < vy0 - reach || x >= vx1 + reach || y >= vy1 + reach) continue;
        if (!saved) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; saved = true; }
        if (animate) animated = true;
        const flick = 0.85 + 0.15 * Math.sin(time / 180 + cellHash(x, y));
        const cx = (x + 0.5) * s - ox;
        const cy = (y + 0.5) * s - oy;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const [cr, cg, cb] = hexToRgb(color);
        g.addColorStop(0, `rgba(${cr},${cg},${cb},${Math.min(0.9, 0.3 * strength * flick).toFixed(3)})`);
        g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    }
    if (saved) ctx.restore();
  }

  if (roofs) {
    for (const b of map.buildings || []) {
      if (b.x >= vx1 || b.x + b.w <= vx0 || b.y >= vy1 + 6 || b.y + b.h <= vy0) continue;
      const key = `${b.w}x${b.h}:${b.roof}:${R.style}`;
      if (!roofCache.has(key)) roofCache.set(key, roofCanvas(b, undefined, R.style));
      const rc = roofCache.get(key);
      ctx.drawImage(rc, X(b.x), Y(b.y), b.w * s, (rc.height / SIZE) * s);
    }
  }

  if (showGrid && s >= 6) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.max(1, vx0); x <= Math.min(cols - 1, vx1); x++) { ctx.moveTo(X(x) + 0.5, Y(vy0)); ctx.lineTo(X(x) + 0.5, Y(vy1)); }
    for (let y = Math.max(1, vy0); y <= Math.min(rows - 1, vy1); y++) { ctx.moveTo(X(vx0), Y(y) + 0.5); ctx.lineTo(X(vx1), Y(y) + 0.5); }
    ctx.stroke();
  }

  R.evict();
  return { pending, animated, lod };
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
