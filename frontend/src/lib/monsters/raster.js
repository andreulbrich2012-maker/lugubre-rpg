// Pintor vetorial-para-pixel dos monstros (puro, sem DOM: roda no navegador e no node).
// Os desenhos sao feitos num espaco de projeto fixo de 32x32 "unidades" (chao em y=30)
// e rasterizados no tamanho real do quadro (16, 24, 32 ou 40 px). Assim a MESMA
// criatura ganha mais detalhe quando cresce de nivel, sem redesenhar nada.
// Cada forma pinta MATERIAL (chave da paleta) + TOM 0..4 da rampa; a cor so e
// resolvida no fim, entao recolorir uma variante nao muda o desenho.
import { ramp, hexToRgb, outlineOf } from '../avatar/palette.js';

export const DESIGN = 32;
export const GROUND = 30;

// Luz do alto-esquerda (mesma convencao dos personagens e do mapa).
const LX = -0.52, LY = -0.62, LZ = 0.59;

function sphereTone(nx, ny, bias = 0) {
  const d2 = nx * nx + ny * ny;
  const nz = Math.sqrt(Math.max(0, 1 - d2));
  const b = LX * nx + LY * ny + LZ * nz + bias;
  if (b > 0.8) return 4;
  if (b > 0.42) return 3;
  if (b > -0.12) return 2;
  return 1;
}

export function createCanvas(S, opts = {}) {
  // zoom: aproxima a criatura em volta do centro do chao (16,30) para ela encher o
  // quadro; o desenho continua no mesmo espaco de projeto.
  const zoom = opts.zoom || 1;
  const u = DESIGN / (S * zoom); // unidades de projeto por pixel
  const ax = 16 * (1 - 1 / zoom), ay = GROUND * (1 - 1 / zoom);
  const N = S * S;
  const mat = new Array(N).fill(null);
  const tone = new Int8Array(N);
  const part = new Int32Array(N).fill(-1);
  const parts = []; // { edge, glow }
  const anchors = {};
  let ox = 0, oy = 0; // deslocamento (em unidades) aplicado as proximas formas
  const inB = (x, y) => x >= 0 && y >= 0 && x < S && y < S;
  const clampT = (t) => Math.max(0, Math.min(4, t));

  // Pinta um conjunto de pixels { i, t } ja calculado como uma "parte".
  function commit(cells, m, o) {
    if (!cells.length && o.keep !== false && o.cx != null) {
      // garante pelo menos 1 pixel: detalhes pequenos nao somem no quadro de 16px
      const x = Math.floor((o.cx + ox - ax) / u), y = Math.floor((o.cy + oy - ay) / u);
      if (inB(x, y)) cells.push({ i: y * S + x, t: o.tone ?? 2 });
    }
    if (!cells.length) return null;
    const id = o.as != null ? o.as : parts.length;
    if (o.as == null) parts.push({ edge: (o.edge ?? cells.length >= (o.minEdge ?? Math.max(5, S / 3))) && !o.glow && !o.over, glow: !!o.glow, m });
    for (const { i, t } of cells) {
      if (o.over && mat[i] == null) continue;
      if (o.under && mat[i] != null) continue;
      if (o.only && !o.only.includes(mat[i])) continue;
      mat[i] = m;
      tone[i] = clampT(t + (o.ds || 0));
      part[i] = id;
    }
    return id;
  }

  // Coleta pixels cujo centro passa no teste (coordenadas de projeto).
  function scan(test, bx0, by0, bx1, by1) {
    const out = [];
    const x0 = Math.max(0, Math.floor((bx0 + ox - ax) / u) - 1), x1 = Math.min(S - 1, Math.ceil((bx1 + ox - ax) / u) + 1);
    const y0 = Math.max(0, Math.floor((by0 + oy - ay) / u) - 1), y1 = Math.min(S - 1, Math.ceil((by1 + oy - ay) / u) + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const r = test((x + 0.5) * u + ax - ox, (y + 0.5) * u + ay - oy);
      if (r !== null && r !== false) out.push({ i: y * S + x, x, y, r });
    }
    return out;
  }

  // Relevo por vizinhanca (formas sem volume esferico: poligonos, linhas).
  function reliefTones(cells, o) {
    const set = new Set(cells.map((c) => c.i));
    const has = (x, y) => inB(x, y) && set.has(y * S + x);
    return cells.map(({ i, x, y }) => {
      let t = 2;
      if (!has(x + 1, y) || !has(x, y + 1)) t = 1;
      else if (!has(x - 1, y) || !has(x, y - 1)) t = 3;
      if (o.base != null) t += o.base - 2;
      return { i, t };
    });
  }

  function toneCells(cells, o, sphereOf) {
    const shade = o.shade || (sphereOf ? 'sphere' : 'relief');
    if (shade === 'flat') return cells.map(({ i }) => ({ i, t: o.tone ?? 2 }));
    if (shade === 'relief') return reliefTones(cells, o);
    if (shade === 'vgrad') {
      // gradiente vertical: topo claro, base escura (troncos, cortinas, mantos)
      const ys = cells.map((c) => c.y); const a = Math.min(...ys), b = Math.max(...ys);
      return cells.map(({ i, y }) => ({ i, t: (o.tone ?? 3) - Math.round(((y - a) / Math.max(1, b - a)) * (o.span ?? 2)) }));
    }
    // esfera: usa a posicao normalizada dentro da forma
    return cells.map(({ i, r }) => ({ i, t: sphereTone(r[0], r[1], o.light || 0) + (o.base != null ? o.base - 2 : 0) }));
  }

  const C = {
    S, u, N, anchors,
    get ox() { return ox; }, get oy() { return oy; },
    // desloca as proximas formas (unidades de projeto); px() converte pixels
    shift(dx, dy) { ox += dx; oy += dy; },
    at(dx, dy, fn) { ox += dx; oy += dy; try { fn(); } finally { ox -= dx; oy -= dy; } },
    px: (n) => n * u,
    zoom,
    // posicao em pixel (fracionaria) de um ponto de projeto, sem deslocamento
    toPxF(x, y) { return [(x - ax) / u, (y - ay) / u]; },
    anchor(name, v) { anchors[name] = v; },

    ell(cx, cy, rx, ry, m, o = {}) {
      rx = Math.max(rx, u * 0.5); ry = Math.max(ry, u * 0.5);
      const rot = o.rot || 0, cs = Math.cos(rot), sn = Math.sin(rot);
      const R = Math.max(rx, ry);
      const cells = scan((x, y) => {
        let dx = x - cx, dy = y - cy;
        if (rot) { const tx = dx * cs + dy * sn; dy = -dx * sn + dy * cs; dx = tx; }
        const nx = dx / rx, ny = dy / ry;
        if (nx * nx + ny * ny > 1) return null;
        if (o.clip && !o.clip(x, y)) return null;
        // a luz nao gira com a forma: usa o deslocamento real para o volume
        return [(x - cx) / R * (R / rx), (y - cy) / R * (R / ry)];
      }, cx - R, cy - R, cx + R, cy + R);
      return commit(toneCells(cells, o, true), m, { cx, cy, ...o });
    },
    circ(cx, cy, r, m, o) { return C.ell(cx, cy, r, r, m, o); },
    // Anel eliptico (aureola, aneis de serafim, borda de fenda).
    ring(cx, cy, rx, ry, th, m, o = {}) {
      const irx = Math.max(0, rx - th), iry = Math.max(0, ry - th * (ry / rx));
      return C.ell(cx, cy, rx, ry, m, { shade: 'flat', tone: 3, ...o, clip: (x, y) => ((x - cx) / irx) ** 2 + ((y - cy) / iry) ** 2 > 1 && (!o.clip || o.clip(x, y)) });
    },

    poly(pts, m, o = {}) {
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const cells = scan((x, y) => {
        let inside = false;
        for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
          const [xa, ya] = pts[a], [xb, yb] = pts[b];
          if ((ya > y) !== (yb > y) && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside;
        }
        if (inside && o.clip && !o.clip(x, y)) return null;
        return inside ? [0, 0] : null;
      }, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
      const cx = xs.reduce((s, v) => s + v, 0) / xs.length, cy = ys.reduce((s, v) => s + v, 0) / ys.length;
      return commit(toneCells(cells, { shade: 'relief', ...o }, false), m, { cx, cy, ...o });
    },
    tri(x0, y0, x1, y1, x2, y2, m, o) { return C.poly([[x0, y0], [x1, y1], [x2, y2]], m, o); },
    rect(x, y, w, h, m, o) { return C.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], m, o); },

    // Capsula (segmento grosso). w0 -> w1 afina a ponta (chifres, caudas, garras).
    line(x0, y0, x1, y1, w0, m, o = {}) {
      const w1 = o.w1 ?? w0;
      const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1e-6;
      const R = Math.max(w0, w1) / 2 + u * 0.5;
      const minW = o.thin ? 0 : u * 0.55;
      const cells = scan((x, y) => {
        const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / L2));
        const px = x0 + dx * t, py = y0 + dy * t;
        const w = Math.max(minW, (w0 + (w1 - w0) * t) / 2);
        const d = Math.hypot(x - px, y - py);
        if (d > w) return null;
        if (o.clip && !o.clip(x, y)) return null;
        return [(x - px) / Math.max(w, 1e-6), (y - py) / Math.max(w, 1e-6)];
      }, Math.min(x0, x1) - R, Math.min(y0, y1) - R, Math.max(x0, x1) + R, Math.max(y0, y1) + R);
      return commit(toneCells(cells, { shade: 'relief', ...o }, true), m, { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, ...o });
    },
    // Varios segmentos encadeados com largura interpolada do primeiro ao ultimo ponto.
    curve(pts, w0, w1, m, o = {}) {
      const n = pts.length - 1;
      let first = null;
      for (let k = 0; k < n; k++) {
        const a = w0 + (w1 - w0) * (k / n), b = w0 + (w1 - w0) * ((k + 1) / n);
        const id = C.line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], a, m, { ...o, w1: b, as: first ?? undefined });
        if (first == null) first = id;
      }
      return first;
    },
    // Um pixel exato (olhos, brilhos, narinas). n = tamanho em pixels.
    dot(x, y, m, t = 2, o = {}) {
      const n = o.n || 1;
      return C.dotPx(Math.floor((x + ox - ax) / u - (n - 1) / 2), Math.floor((y + oy - ay) / u), m, t, o);
    },
    // Mesmo que dot, mas em coordenada de pixel (ja somado o deslocamento atual).
    dotPx(X, Y, m, t = 2, o = {}) {
      const n = o.n || 1, h = o.h || n;
      const cells = [];
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < n; xx++) {
        const PX = X + xx, PY = Y + yy;
        if (inB(PX, PY)) cells.push({ i: PY * S + PX, t: (o.tones ? o.tones[yy * n + xx] ?? t : t) });
      }
      return commit(cells, m, { edge: false, ...o, keep: false });
    },
    // Pixel da coordenada de projeto (inteiro), ja com deslocamento.
    toPx(x, y) { return [Math.floor((x + ox - ax) / u), Math.floor((y + oy - ay) / u)]; },
    // Olho legivel em qualquer tamanho: 1px no quadro pequeno, 2px (com brilho) no grande.
    eye(x, y, o = {}) {
      const m = o.m || 'e';
      const n = o.n ?? (S >= 32 && !o.small ? 2 : 1);
      const X = o.X ?? Math.floor((x + ox - ax) / u - (n - 1) / 2), Y = Math.floor((y + oy - ay) / u - (n - 1) / 2);
      if (n >= 2) return C.dotPx(X, Y, m, 3, { n, h: o.h || n, tones: o.tones || [4, 3, 2, 2], glow: o.glow });
      return C.dotPx(X, Y, m, o.t ?? 4, { glow: o.glow });
    },
    // Par de olhos espelhado no eixo x (pixel exato, simetrico em qualquer tamanho).
    eyePair(cx, y, gap, o = {}) {
      const n = o.n ?? (S >= 32 && !o.small ? 2 : 1);
      const axis = Math.round((cx + ox - ax) / u * 2) / 2; // eixo em meio-pixel
      const L = Math.round(axis - gap / u - n / 2);
      const R = Math.round(2 * axis - L - n);
      C.eye(0, y, { ...o, n, X: L });
      C.eye(0, y, { ...o, n, X: R, tones: o.tonesR || o.tones });
      anchors.eyes = [[(L + n / 2) * u + ax - ox, y], [(R + n / 2) * u + ax - ox, y]];
    },
    // Apaga pixels (bocas abertas, buracos de mascara).
    cut(test) {
      for (let i = 0; i < N; i++) {
        if (mat[i] == null) continue;
        const x = i % S, y = (i / S) | 0;
        if (test((x + 0.5) * u + ax - ox, (y + 0.5) * u + ay - oy)) { mat[i] = null; part[i] = -1; }
      }
    },
    has(x, y) { const X = Math.floor((x + ox - ax) / u), Y = Math.floor((y + oy - ay) / u); return inB(X, Y) && mat[Y * S + X] != null; },
    matAt(x, y) { const X = Math.floor((x + ox - ax) / u), Y = Math.floor((y + oy - ay) / u); return inB(X, Y) ? mat[Y * S + X] : null; },
    // Recolore pixels ja pintados (escurece a pata de tras, pinta manchas).
    tint(test, fn) {
      for (let i = 0; i < N; i++) {
        if (mat[i] == null) continue;
        const x = i % S, y = (i / S) | 0;
        const X = (x + 0.5) * u + ax - ox, Y = (y + 0.5) * u + ay - oy;
        if (test(X, Y, mat[i])) { const r = fn(mat[i], tone[i], X, Y); if (r) { if (r[0] != null) mat[i] = r[0]; if (r[1] != null) tone[i] = clampT(r[1]); } }
      }
    },
    _state() { return { mat, tone, part, parts }; }
  };
  return C;
}

// ---- composicao final: tons -> cores, linha interna, contorno, aura e sombra ----

function mix(a, b, t) { return [0, 1, 2].map((k) => Math.round(a[k] * (1 - t) + b[k] * t)); }

const rgbCache = new Map();
function toneRgb(hex, t) {
  const k = hex + t;
  let v = rgbCache.get(k);
  if (!v) { v = hexToRgb(ramp(hex)[t]); rgbCache.set(k, v); }
  return v;
}

// palette: { material: '#hex' }. opts: { shadow:{cx,w,h,cy}|false, aura:'#hex', flip, outline }
export function finish(C, palette, opts = {}) {
  const { S, N } = C;
  const { mat, tone, part, parts } = C._state();
  const rgb = new Array(N).fill(null);
  for (let i = 0; i < N; i++) {
    if (mat[i] == null) continue;
    const hex = palette[mat[i]] || (mat[i][0] === '#' ? mat[i] : '#ff00ff');
    rgb[i] = toneRgb(hex, tone[i]);
  }
  // Linha interna: a parte da frente escurece o que esta logo ao lado/abaixo dela
  // (cabeca sobre corpo, pata da frente sobre a de tras), como nos personagens.
  if (opts.inner !== false) {
    const dark = new Set();
    for (let i = 0; i < N; i++) {
      const a = part[i];
      if (a < 0 || !parts[a].edge) continue;
      const x = i % S, y = (i / S) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue;
        const j = ny * S + nx, b = part[j];
        if (b < 0 || b >= a || parts[b].glow) continue;
        dark.add(j);
      }
    }
    for (const j of dark) rgb[j] = mix(rgb[j], outlineOf(rgb[j]), 0.6);
  }
  const out = new Uint8ClampedArray(N * 4);
  for (let i = 0; i < N; i++) if (rgb[i]) out.set([...rgb[i], 255], i * 4);
  // Contorno colorido em volta da silhueta (cor vizinha bem escura, nunca preto puro).
  if (opts.outline !== false) {
    const add = [];
    for (let i = 0; i < N; i++) {
      if (rgb[i]) continue;
      const x = i % S, y = (i / S) | 0;
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue;
        const j = ny * S + nx;
        if (rgb[j]) {
          const g = part[j] >= 0 && parts[part[j]].glow;
          add.push([i, g ? mix(rgb[j], outlineOf(rgb[j]), 0.55) : outlineOf(rgb[j])]);
          break;
        }
      }
    }
    for (const [i, o] of add) out.set([...o, 255], i * 4);
  }
  // Aura: halo translucido 1-2px fora do contorno (variantes espectrais/sagradas).
  if (opts.aura) {
    const a = hexToRgb(opts.aura);
    const solid = (i) => out[i * 4 + 3] === 255;
    const ring = (src) => {
      const res = [];
      for (let i = 0; i < N; i++) {
        if (out[i * 4 + 3]) continue;
        const x = i % S, y = (i / S) | 0;
        if ([[0, -1], [-1, 0], [1, 0], [0, 1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < S && ny < S && src(ny * S + nx); })) res.push(i);
      }
      return res;
    };
    const r1 = ring(solid);
    for (const i of r1) out.set([...a, opts.auraPulse ? 150 : 120], i * 4);
    if (S >= 24) {
      const s1 = new Set(r1);
      for (const i of ring((j) => s1.has(j))) out.set([...a, 55], i * 4);
    }
  }
  // Sombra eliptica suave no chao, so onde esta vazio.
  if (opts.shadow) {
    const { cx, cy, w, h } = opts.shadow;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = (x + 0.5 - cx) / w, dy = (y + 0.5 - cy) / h;
      const d = dx * dx + dy * dy;
      const i = (y * S + x) * 4;
      if (d <= 1 && !out[i + 3]) out.set([30, 16, 36, d < 0.4 ? 115 : 72], i);
    }
  }
  if (opts.flip) {
    const m = new Uint8ClampedArray(N * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const a = (y * S + x) * 4, b = (y * S + (S - 1 - x)) * 4;
      for (let k = 0; k < 4; k++) m[b + k] = out[a + k];
    }
    return m;
  }
  return out;
}

// Caixa ocupada pelos pixels pintados (em pixels), antes do contorno.
export function bbox(C) {
  const { mat } = C._state();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < C.N; i++) {
    if (mat[i] == null) continue;
    const x = i % C.S, y = (i / C.S) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x0 === Infinity ? null : { x0, y0, x1, y1 };
}
