// Utilitarios de cor (HSL) para recolorir paletas das bases: elemento e humor
// do epiteto puxam o matiz pelo caminho mais curto, sem perder o contraste.
import { hexToRgb, rgbToHex } from '../avatar/palette.js';

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb([h, s, l]) {
  h = (((h % 360) + 360) % 360) / 360;
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export function shiftHex(hex, dh = 0, ds = 0, dl = 0) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb([h + dh, clamp(s + ds), clamp(l + dl, 0.04, 0.96)]));
}

// Puxa a cor na direcao do tom alvo (matiz pelo caminho curto, saturacao e luz pela metade).
export function towardHex(hex, target, amt, desat = 0) {
  if (!amt && !desat) return hex;
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  const [th, ts, tl] = rgbToHsl(hexToRgb(target));
  // cinza nao tem matiz: assume o do alvo; alvo cinza so mexe na luz/saturacao
  const d = ts < 0.05 ? 0 : s < 0.05 ? 0 : ((th - h + 540) % 360) - 180;
  const nh = s < 0.05 ? th : h + d * amt;
  let ns = s + (ts - s) * amt * 0.6;
  if (s < 0.05) ns = ts * amt * 0.6;
  ns *= 1 - desat;
  const nl = l + (tl - l) * amt * 0.35;
  return rgbToHex(hslToRgb([nh, clamp(ns), clamp(nl, 0.05, 0.95)]));
}

export function recolor(pal, target, amt, keys, desat = 0) {
  const out = { ...pal };
  for (const k of keys) if (out[k]) out[k] = towardHex(out[k], target, amt, desat);
  return out;
}
