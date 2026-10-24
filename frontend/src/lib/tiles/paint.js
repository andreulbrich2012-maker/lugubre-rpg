// Pintor de pixel art para blocos novos (24/10): desenha com formas sombreadas e devolve o
// mesmo formato do catalogo (linhas de caracteres + paleta). Usa as rampas quentes com hue
// shift e o contorno sepia do criador de personagem, para mapa e bonecos combinarem.
import { ramp, outlineOf, hexToRgb, rgbToHex } from '../avatar/palette.js';

export const tone = (hex, t) => ramp(hex)[Math.max(0, Math.min(4, Math.round(t)))];

// Hash periodico (a textura do bloco emenda com o vizinho igual).
export function hash(x, y, s = 0) {
  let h = (((x & 1023) * 374761393) ^ ((y & 1023) * 668265263) ^ (s * 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function canvas(w = 16, h = 16) {
  const c = { w, h, px: new Array(w * h).fill(null) };
  c.set = (x, y, hex) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h && hex) c.px[y * w + x] = hex; };
  c.get = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? c.px[y * w + x] : null);
  // Preenche a area onde inside(x,y) e verdadeiro, com relevo: luz do alto-esquerda.
  c.shape = (inside, hex, { bias = 0, flat = false, hi = true } = {}) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!inside(x, y)) continue;
        let t = 2 + bias;
        if (!flat) {
          const up = inside(x, y - 1); const lf = inside(x - 1, y); const dn = inside(x, y + 1); const rt = inside(x + 1, y);
          if (!dn || !rt) t = 1 + bias;
          else if (!up || !lf) t = (hi ? 3 : 2) + bias;
        }
        c.set(x, y, tone(hex, t));
      }
    }
  };
  // Elipse com volume (iluminada no alto-esquerda, sombra embaixo-direita).
  c.ellipse = (cx, cy, rx, ry, hex, { spec = true, bias = 0 } = {}) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx; const ny = (y + 0.5 - cy) / ry;
        const d = nx * nx + ny * ny;
        if (d > 1) continue;
        const l = -nx * 0.55 - ny * 0.85;
        let t = 2 + l * 1.6 + bias;
        if (d > 0.72) t -= 0.6;
        if (spec && nx < -0.15 && nx > -0.55 && ny < -0.25 && ny > -0.7) t = 4;
        c.set(x, y, tone(hex, t));
      }
    }
  };
  c.rect = (x0, y0, x1, y1, hex, opts) => c.shape((x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1, hex, opts);
  c.line = (x0, y0, x1, y1, hex) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) c.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, hex);
  };
  // Contorno colorido escuro em volta do que foi pintado (nunca preto puro).
  c.outline = () => {
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (c.get(x, y)) continue;
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
        const n = c.get(x + dx, y + dy);
        if (n) { add.push([x, y, rgbToHex(outlineOf(hexToRgb(n)))]); break; }
      }
    }
    for (const [x, y, hex] of add) c.set(x, y, hex);
  };
  return c;
}

// Converte para linhas + paleta. Caracteres seguros (nunca '.' nem espaco: sao transparentes).
const POOL = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-/:;<=>?@[]^_{|}~';
export function toRows(c) {
  const map = new Map();
  const palette = {};
  const rows = [];
  for (let y = 0; y < c.h; y++) {
    let r = '';
    for (let x = 0; x < c.w; x++) {
      const hex = c.px[y * c.w + x];
      if (!hex) { r += '.'; continue; }
      let ch = map.get(hex);
      if (!ch) {
        ch = POOL[map.size];
        if (!ch) throw new Error('cores demais num bloco');
        map.set(hex, ch);
        palette[ch] = hex;
      }
      r += ch;
    }
    rows.push(r);
  }
  return { rows, palette };
}

// Varias imagens (quadros/variantes) com UMA paleta comum (o atlas usa a paleta do bloco).
export function toImages(list) {
  const map = new Map();
  const palette = {};
  const images = list.map((c) => {
    const rows = [];
    for (let y = 0; y < c.h; y++) {
      let r = '';
      for (let x = 0; x < c.w; x++) {
        const hex = c.px[y * c.w + x];
        if (!hex) { r += '.'; continue; }
        let ch = map.get(hex);
        if (!ch) {
          ch = POOL[map.size];
          if (!ch) throw new Error('cores demais num bloco');
          map.set(hex, ch);
          palette[ch] = hex;
        }
        r += ch;
      }
      rows.push(r);
    }
    return rows;
  });
  return { images, palette };
}

// Miniatura 16x16 de um sprite grande (vizinho mais proximo, centralizada): icone do editor.
export function thumbnail(big) {
  const s = Math.max(big.w, big.h) / 16;
  const c = canvas(16, 16);
  const ow = Math.round(big.w / s); const oh = Math.round(big.h / s);
  const ox = Math.floor((16 - ow) / 2); const oy = 16 - oh;
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) c.set(ox + x, oy + y, big.get(Math.floor(x * s), Math.floor(y * s)));
  return c;
}
