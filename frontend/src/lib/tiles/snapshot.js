// "Foto" do mapa inteiro para o mapa-item: desenha por pedacos (mesmo grafico do jogo), reduz cada
// pedaco para poucos px por celula e cola as construcoes por cima. Puro (roda no worker ou em node).
import { renderRegion } from './compose.js';
import { applyStyle } from './styles.js';
import { buildingPixels } from '../buildings/index.js';

const SIZE = 16;
const CHUNK = 32;

// reducao por media de area: src (sw x sh RGBA) -> dst com fator k (dst = src / k), k inteiro
function shrink(src, sw, sh, k) {
  const dw = Math.max(1, Math.floor(sw / k)); const dh = Math.max(1, Math.floor(sh / k));
  const out = new Uint8ClampedArray(dw * dh * 4);
  const n = k * k;
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
    let r = 0; let g = 0; let b = 0; let a = 0;
    for (let yy = 0; yy < k; yy++) for (let xx = 0; xx < k; xx++) {
      const i = ((y * k + yy) * sw + x * k + xx) * 4;
      const al = src[i + 3];
      r += src[i] * al; g += src[i + 1] * al; b += src[i + 2] * al; a += al;
    }
    const o = (y * dw + x) * 4;
    if (a) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; }
    out[o + 3] = a / n;
  }
  return { w: dw, h: dh, data: out };
}

function blend(dst, dw, dh, src, sw, sh, ox, oy) {
  for (let y = 0; y < sh; y++) {
    const Y = oy + y; if (Y < 0 || Y >= dh) continue;
    for (let x = 0; x < sw; x++) {
      const X = ox + x; if (X < 0 || X >= dw) continue;
      const i = (y * sw + x) * 4; const a = src[i + 3] / 255; if (!a) continue;
      const o = (Y * dw + X) * 4;
      dst[o] = dst[o] * (1 - a) + src[i] * a; dst[o + 1] = dst[o + 1] * (1 - a) + src[i + 1] * a; dst[o + 2] = dst[o + 2] * (1 - a) + src[i + 2] * a; dst[o + 3] = 255;
    }
  }
}

// px por celula para caber em maxPx (16, 8, 4, 2 ou 1: divisores de 16, reducao exata)
export function snapshotCell(cols, rows, maxPx = 3200) {
  for (const p of [16, 8, 4, 2]) if (Math.max(cols, rows) * p <= maxPx) return p;
  return 1;
}

export function renderSnapshot(map, { maxPx = 3200, onProgress } = {}) {
  const P = snapshotCell(map.cols, map.rows, maxPx);
  const k = SIZE / P;
  const W = map.cols * P; const H = map.rows * P;
  const out = new Uint8ClampedArray(W * H * 4);
  const day = { ...map, light: 'dia' };
  const total = Math.ceil(map.cols / CHUNK) * Math.ceil(map.rows / CHUNK);
  let done = 0;
  for (let cy = 0; cy < map.rows; cy += CHUNK) {
    for (let cx = 0; cx < map.cols; cx += CHUNK) {
      const w = Math.min(CHUNK, map.cols - cx); const h = Math.min(CHUNK, map.rows - cy);
      const img = renderRegion(day, cx, cy, w, h, {});
      if (map.style) applyStyle(img, map.style);
      const small = k === 1 ? { w: img.w, h: img.h, data: img.data } : shrink(img.data, img.w, img.h, k);
      for (let y = 0; y < small.h; y++) out.set(small.data.subarray(y * small.w * 4, (y + 1) * small.w * 4), ((cy * P + y) * W + cx * P) * 4);
      done++;
      onProgress?.(done / (total + 1));
    }
  }
  // construcoes de tras para frente, reduzidas na mesma escala
  const list = [...(map.buildings || [])].sort((a, b) => a.y + a.h - b.y - b.h);
  for (const b of list) {
    const im = buildingPixels(b, day, { light: 'dia' });
    // completa a borda para multiplo de k (reducao exata)
    const pw = Math.ceil(im.width / k) * k; const ph = Math.ceil(im.height / k) * k;
    let src = im.data;
    if (pw !== im.width || ph !== im.height) {
      src = new Uint8ClampedArray(pw * ph * 4);
      for (let y = 0; y < im.height; y++) src.set(im.data.subarray(y * im.width * 4, (y + 1) * im.width * 4), y * pw * 4);
    }
    const small = k === 1 ? { w: pw, h: ph, data: src } : shrink(src, pw, ph, k);
    blend(out, W, H, small.data, small.w, small.h, Math.round((b.x * SIZE + (im.offsetX || 0)) / k), Math.round((b.y * SIZE + im.offsetY) / k));
  }
  onProgress?.(1);
  return { width: W, height: H, cell: P, data: out };
}

// chave de cache: muda quando o mapa muda (hash rapido do conteudo)
export function snapshotKey(sceneId, map) {
  const s = JSON.stringify([map.cols, map.rows, map.layers, map.buildings, map.style]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `${sceneId}:${(h >>> 0).toString(36)}:${s.length}`;
}
