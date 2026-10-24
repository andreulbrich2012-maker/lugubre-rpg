// Pintor de camadas e compositor (puro, sem DOM: roda no navegador e no node).
// Cada peca pinta pixels com um CANAL ('a','b','c' = cores escolhidas da peca,
// 'skin','hair','eye','w' ou um '#hex' fixo) e um TOM 0..4 da rampa. A cor real
// so e resolvida na composicao: trocar a cor nao muda o desenho.
import { W, H, idx } from './skeleton.js';
import { ramp, hexToRgb, outlineOf } from './palette.js';

const NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Relevo automatico de uma area: luz do alto-esquerda (borda esquerda/topo clara,
// direita/baixo escura). Devolve Map idx -> tom.
export function relief(cells, { top = true } = {}) {
  const out = new Map();
  for (const i of cells) {
    const x = i % W, y = (i / W) | 0;
    const has = (dx, dy) => cells.has(idx(x + dx, y + dy));
    let s = 2;
    if (!has(1, 0) || !has(0, 1)) s = 1;
    else if (!has(-1, 0) || (top && !has(0, -1))) s = 3;
    out.set(i, s);
  }
  return out;
}

export function createLayer(P, name = '') {
  const pix = new Map(); // idx -> { c, s, t }
  let tag = 'main';
  const inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const clampS = (s) => Math.max(0, Math.min(4, s));
  const L = {
    name,
    P,
    pix,
    get tag() { return tag; },
    // Muda a etiqueta (main/arm) enquanto fn roda: o que for 'arm' e pintado na
    // passada dos bracos (por cima das roupas do tronco).
    withTag(t, fn) { const old = tag; tag = t; try { fn(); } finally { tag = old; } },
    px(x, y, c, s = 2) {
      x = Math.round(x); y = Math.round(y);
      if (!inB(x, y)) return;
      pix.set(idx(x, y), { c, s: clampS(s), t: tag });
    },
    // So pinta onde ja tem pixel desta camada (para estampas e detalhes).
    over(x, y, c, s = 2) {
      const p = pix.get(idx(Math.round(x), Math.round(y)));
      if (p) { p.c = c; p.s = clampS(s); }
    },
    shade(x, y, ds) { const p = pix.get(idx(Math.round(x), Math.round(y))); if (p) p.s = clampS(p.s + ds); },
    has(x, y) { return pix.has(idx(Math.round(x), Math.round(y))); },
    get(x, y) { return pix.get(idx(Math.round(x), Math.round(y))); },
    erase(x, y) { pix.delete(idx(Math.round(x), Math.round(y))); },
    rect(x, y, w, h, c, s = 2) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) L.px(xx, yy, c, s); },
    hline(x0, x1, y, c, s = 2) { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) L.px(x, y, c, s); },
    vline(x, y0, y1, c, s = 2) { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) L.px(x, y, c, s); },
    // Desenho em texto: cada caractere e um pixel. legenda: { ch: [canal, tom] }.
    art(x, y, rows, legend) {
      rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
        const v = legend[ch];
        if (v) L.px(x + dx, y + dy, v[0], v[1] ?? 2);
      }));
    },
    // Preenche uma parte do corpo (ou um Set de idx) com relevo automatico.
    // opts: { y0, y1 } limita as linhas; ds soma no tom; flat ignora o relevo.
    fill(part, c, opts = {}) {
      const cells = part.cells || part;
      const { y0 = -Infinity, y1 = Infinity, ds = 0, flat = false, x0 = -Infinity, x1 = Infinity } = opts;
      const sel = new Set();
      for (const i of cells) {
        const x = i % W, y = (i / W) | 0;
        if (y >= y0 && y <= y1 && x >= x0 && x <= x1) sel.add(i);
      }
      const rel = flat ? null : relief(sel, opts);
      const t = opts.tag || part.tag || tag;
      const back = part.back ? -1 : 0;
      for (const i of sel) {
        const s = flat ? (opts.s ?? 2) : rel.get(i);
        pix.set(i, { c, s: clampS(s + ds + back), t });
      }
      return sel;
    }
  };
  return L;
}

// ---- composicao ----
function resolve(c, s, colors) {
  if (c[0] === '#') return hexToRgb(ramp(c)[s]);
  const hex = colors[c];
  if (!hex) return null;
  return hexToRgb(ramp(hex)[s]);
}

// layers: [{ L, colors, outline }] na ordem de desenho.
// Passada 1 desenha tudo menos os bracos da frente; passada 2 so os bracos, por
// cima: assim a manga, a luva e o item na mao ficam na frente da roupa do tronco.
export function compose(layers, { shadow = true, flip = false, outline = true } = {}) {
  const N = W * H;
  const rgb = new Uint8ClampedArray(N * 3);
  const on = new Uint8Array(N);
  const owner = new Int16Array(N).fill(-1);
  for (const pass of ['main', 'arm']) {
    layers.forEach((layer, li) => {
      const { L, colors } = layer;
      const mine = [];
      for (const [i, p] of L.pix) {
        if ((p.t === 'arm') !== (pass === 'arm')) continue;
        const col = resolve(p.c, p.s, colors);
        if (col) mine.push([i, col]);
      }
      if (!mine.length) return;
      // Linha interna: escurece o que esta logo abaixo/ao lado da peca para ela
      // "descolar" do que ficou por baixo (roupa sobre pele, cabelo sobre testa).
      if (layer.edge) {
        const set = new Set(mine.map(([i]) => i));
        const dirs = layer.edge === 'down' ? [[0, 1]] : [[1, 0], [-1, 0], [0, 1]];
        for (const i of set) {
          const x = i % W, y = (i / W) | 0;
          for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const j = idx(nx, ny);
            if (set.has(j) || !on[j] || owner[j] === li) continue;
            const o = outlineOf([rgb[j * 3], rgb[j * 3 + 1], rgb[j * 3 + 2]]);
            for (let k = 0; k < 3; k++) rgb[j * 3 + k] = Math.round(rgb[j * 3 + k] * 0.45 + o[k] * 0.55);
          }
        }
      }
      for (const [i, col] of mine) {
        rgb.set(col, i * 3);
        on[i] = 1;
        owner[i] = li;
      }
    });
  }
  const out = new Uint8ClampedArray(N * 4);
  for (let i = 0; i < N; i++) if (on[i]) { out.set([rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], 255], i * 4); }
  // Contorno colorido em volta da silhueta (a cor vizinha bem escura, nunca preto).
  if (outline) {
    const add = [];
    for (let i = 0; i < N; i++) {
      if (on[i]) continue;
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = idx(nx, ny);
        if (on[j]) { add.push([i, outlineOf([rgb[j * 3], rgb[j * 3 + 1], rgb[j * 3 + 2]])]); break; }
      }
    }
    for (const [i, o] of add) out.set([...o, 255], i * 4);
  }
  // Sombra eliptica suave no chao (so onde esta vazio).
  if (shadow) {
    for (let y = 28; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - 12) / 6.6, dy = (y + 0.5 - 30.6) / 1.7;
      const d = dx * dx + dy * dy;
      const i = (y * W + x) * 4;
      if (d <= 1 && !out[i + 3]) out.set([28, 16, 34, d < 0.45 ? 110 : 70], i);
    }
  }
  if (flip) {
    const m = new Uint8ClampedArray(N * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const a = (y * W + x) * 4, b = (y * W + (W - 1 - x)) * 4;
      for (let k = 0; k < 4; k++) m[b + k] = out[a + k];
    }
    return m;
  }
  return out;
}

export { NB4 };
