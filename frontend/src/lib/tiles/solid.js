// Primitivas de volume em projecao 3/4 (estilo Stardew como referencia, nunca copiado):
// todo objeto do mapa mostra o TAMPO (face de cima, mais clara) e a FRENTE (mais escura),
// luz do alto-esquerda, rampas quentes (tone) e contorno sepia (c.outline do pintor).
// Desenha em cima dos canvases de paint.js (cores hex).
import { tone } from './paint.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const T = (hex, t) => tone(hex, clamp(t, 0, 4));

// Caixa: (x, y) = canto de cima-esquerda do tampo; w largura; d linhas do tampo; h altura da
// frente. tex(face, lx, ly) devolve um ajuste de tom (veios, tabuas, pedras) ou null.
// Opcoes: top/front (cores proprias de cada face), lip (quina da frente do tampo brilha),
// round (quinas do tampo cortadas), skip(face, lx, ly) para furar (pernas, vaos).
export function box(c, x, y, w, d, h, col, o = {}) {
  const top = o.top || col; const front = o.front || col;
  const tex = o.tex || (() => 0);
  const skip = o.skip || (() => false);
  for (let ly = 0; ly < d; ly++) {
    for (let lx = 0; lx < w; lx++) {
      if (o.round && (ly === 0) && (lx === 0 || lx === w - 1)) continue;
      if (skip('top', lx, ly)) continue;
      let t = 3;
      if (ly === 0 || lx === 0) t = 3.4;
      if (lx === w - 1) t = 2.6;
      if (o.lip !== false && ly === d - 1 && d > 1) t = lx === w - 1 ? 3 : 4;
      c.set(x + lx, y + ly, T(top, Math.round(t + (tex('top', lx, ly) || 0))));
    }
  }
  for (let ly = 0; ly < h; ly++) {
    for (let lx = 0; lx < w; lx++) {
      if (skip('front', lx, ly)) continue;
      let t = 2;
      if (lx === 0) t = 2.4;
      if (lx >= w - 1) t = 1;
      if (ly === h - 1 && h > 2) t -= 0.6;
      if (ly === 0 && o.lipShadow !== false && h > 2) t -= 0.5;
      c.set(x + lx, y + d + ly, T(front, Math.round(t + (tex('front', lx, ly) || 0))));
    }
  }
}

// Cilindro de pe: tampa eliptica (cx, y = topo da tampa, rx, ry) e corpo de altura h.
// Corpo iluminado na esquerda e escuro na direita; base curva. Opcoes: top (cor da tampa),
// hole (cor do buraco: poco, caldeirao, vaso), rim (espessura da borda do buraco),
// band(ly) devolve ajuste de tom por linha do corpo (aros do barril).
export function cyl(c, cx, y, rx, ry, h, col, o = {}) {
  const top = o.top || col;
  const cy = y + ry;
  const x0 = Math.floor(cx - rx); const x1 = Math.ceil(cx + rx);
  for (let x = x0; x <= x1; x++) {
    const nx = (x + 0.5 - cx) / rx;
    if (Math.abs(nx) > 1) continue;
    const e = ry * Math.sqrt(1 - nx * nx);
    const yb = Math.round(cy + h + e - 0.5);
    for (let py = Math.round(cy); py <= yb; py++) {
      let t = 2.2 - nx * 1.5;
      if (nx > 0.75) t -= 0.4;
      if (py >= yb - 1) t -= 0.6;
      if (o.band) t += o.band(py - Math.round(cy), nx) || 0;
      const over = o.paint ? o.paint(py - Math.round(cy), nx) : null;
      c.set(x, py, T(over || col, Math.round(t)));
    }
  }
  for (let py = Math.floor(cy - ry); py <= Math.ceil(cy + ry); py++) {
    for (let x = x0; x <= x1; x++) {
      const nx = (x + 0.5 - cx) / rx; const ny = (py + 0.5 - cy) / ry;
      const dd = nx * nx + ny * ny;
      if (dd > 1) continue;
      if (o.hole) {
        const r = 1 - (o.rim || 0.32);
        const ix = nx / r; const iy = (py + 0.5 - cy - 0.4) / (ry * r);
        if (ix * ix + iy * iy <= 1) {
          // dentro: sombra da borda de cima-esquerda cai no fundo
          const t = iy < -0.2 ? 0 : ix > 0.3 ? 1 : 1.6;
          c.set(x, py, T(o.hole, Math.round(t + (o.holeLift || 0))));
          continue;
        }
        const t = ny > 0.3 ? 4 : nx < -0.4 ? 3.6 : ny < -0.4 ? 2.4 : 3;
        c.set(x, py, T(top, Math.round(t)));
        continue;
      }
      let t = 3 - nx * 0.5 - ny * 0.3;
      if (ny > 0.55) t = 3.8;
      c.set(x, py, T(top, Math.round(t)));
    }
  }
}

// Bolha/pedra/arbusto: volume arredondado com topo claro, base escura e brilho no alto-esquerda.
export function blob(c, cx, cy, rx, ry, col, o = {}) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx; const ny = (y + 0.5 - cy) / ry;
      const d = nx * nx + ny * ny;
      if (d > 1) continue;
      if (o.flatBottom && ny > o.flatBottom) continue;
      let t = 2.1 - nx * 0.9 - ny * 1.5;
      if (d > 0.7 && ny > 0) t -= 0.5;
      if (o.spec !== false && nx > -0.62 && nx < -0.12 && ny > -0.78 && ny < -0.35) t = 4;
      if (o.noise) t += o.noise(x, y) || 0;
      c.set(x, y, T(col, Math.round(t)));
    }
  }
}

// Cone/piramide de pe (tenda, espinho, telhadinho): vertice em (cx, y0), base em y1 com meia
// largura hw; lado esquerdo claro, direito escuro (a frente olha para nos).
export function cone(c, cx, y0, y1, hw, col, o = {}) {
  for (let y = y0; y <= y1; y++) {
    const k = (y - y0 + 1) / (y1 - y0 + 1);
    const half = hw * k;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const nx = (x + 0.5 - cx) / Math.max(half, 0.5);
      if (Math.abs(nx) > 1.02) continue;
      let t = nx < -0.45 ? 3 : nx < 0.25 ? 2.4 : 1.4;
      if (y === y1) t -= 0.6;
      if (o.tex) t += o.tex(x, y, nx) || 0;
      c.set(x, y, T(col, Math.round(t)));
    }
  }
}

// Haste (perna, poste, estaca) 2 px: esquerda clara, direita escura.
export function post(c, x, y0, y1, col, w = 2) {
  for (let y = y0; y <= y1; y++) for (let k = 0; k < w; k++) {
    const t = k === 0 ? 3 : k === w - 1 ? 1 : 2;
    c.set(x + k, y, T(col, y === y1 ? t - 1 : t));
  }
}

// Extrusao de uma silhueta (lapide, cruz, placa): a mesma forma repetida d px acima com tom de
// tampo vira a espessura vista de cima; a frente fica com o relevo normal do pintor.
export function extrude(c, inside, d, col, o = {}) {
  const top = o.top || col;
  for (let k = d; k >= 1; k--) {
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      if (!inside(x, y + k)) continue;
      const edge = !inside(x + 1, y + k);
      c.set(x, y, T(top, k === d ? (edge ? 3 : 4) : edge ? 2 : 3));
    }
  }
  c.shape(inside, o.front || col, { bias: o.bias || 0 });
}
