// Detalhes das variantes (epitetos): pecas pintadas por cima de QUALQUER plano
// usando as ancoras que o plano registrou (cabeca, corpo, dorso, olhos).
// Materiais fixos: x=armadura, k=cristal/geada, v=musgo, f=fogo, y=ouro, p=veneno, s=cicatriz.
import { horn } from './kit.js';

const PAINT = {
  // olhos acesos na cor de brilho do epiteto
  glowEyes(C) {
    C.tint((x, y, m) => m === 'e', (m, t) => ['g', Math.max(3, t)]);
  },
  horns(C, a, p) {
    const h = a.head; if (!h || a.hasHorns) return;
    const sides = p.view === 'side' ? [1] : [-1, 1];
    for (const s of sides) horn(C, h.x + s * h.r * 0.5 + (p.view === 'side' ? 0.8 : 0), h.y - h.r * 0.7, s * 1.6, -3, 1.6, 'h', { bx: s * 1.2, by: 0.3 });
  },
  scar(C, a, p) {
    const b = a.head && p.view !== 'up' ? a.head : a.body; if (!b) return;
    const r = b.r || b.rx;
    const x0 = b.x - r * 0.15, y0 = b.y - (b.r || b.ry) * 0.55;
    C.line(x0, y0, x0 + r * 0.45, y0 + (b.r || b.ry) * 0.75, C.u, 's', { over: true, thin: true, shade: 'flat', tone: 3, edge: false });
  },
  armor(C, a, p) {
    const b = a.body; if (!b) return;
    // placa no dorso com rebites + ombreira/testeira
    C.ell(b.x + (p.view === 'side' ? b.rx * 0.1 : 0), b.y - b.ry * 0.45, b.rx * 0.82, b.ry * 0.5, 'x', { over: true, clip: (x, y) => y < b.y - b.ry * 0.05 });
    C.line(b.x - b.rx * 0.7, b.y - b.ry * 0.05, b.x + b.rx * 0.7, b.y - b.ry * 0.05, C.u, 'x', { over: true, thin: true, shade: 'flat', tone: 1, edge: false });
    for (const s of [-0.4, 0.4]) C.dot(b.x + s * b.rx, b.y - b.ry * 0.45, 'x', 4, {});
    if (a.head && p.view !== 'up') C.ell(a.head.x, a.head.y - a.head.r * 0.65, a.head.r * 0.7, a.head.r * 0.3, 'x', { over: true, clip: (x, y) => y < a.head.y - a.head.r * 0.4 });
  },
  crystals(C, a, p) {
    const b = a.back; if (!b) return;
    const n = 3;
    for (let k = 0; k < n; k++) {
      const t = (k - 1) * b.w * 0.3, h = k === 1 ? 4.2 : 3;
      const x = b.x + t, y = b.y + 0.8 + Math.abs(k - 1) * 0.6;
      C.poly([[x - 1.1, y + 1], [x - 0.9, y - h * 0.6], [x + (p.view === 'side' ? 0.6 : 0), y - h], [x + 1.1, y - h * 0.5], [x + 1.1, y + 1]], 'k', { base: 3 });
      C.line(x - 0.5, y - h * 0.55, x - 0.2, y - h * 0.15, C.u, 'k', { over: true, thin: true, shade: 'flat', tone: 4, edge: false });
    }
  },
  chains(C, a, p) {
    const b = a.body; if (!b) return;
    // corrente atravessada e um pedaco pendurado com elos claro/escuro alternados
    const pts = [];
    const n = Math.max(4, Math.round(b.rx * 1.6 / (C.u * 1.4)));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      pts.push([b.x - b.rx * 0.95 + t * b.rx * 1.9, b.y - b.ry * 0.2 + Math.sin(t * Math.PI) * b.ry * 0.45]);
    }
    pts.forEach(([x, y], k) => C.dot(x, y, 'x', k % 2 ? 1 : 4, { n: C.S >= 32 ? 2 : 1, h: 1 }));
    const [ex, ey] = pts[pts.length - 1];
    for (let k = 1; k <= 3; k++) C.dot(ex + (p.view === 'side' ? 0 : 0.3), ey + k * C.u * 1.1, 'x', k % 2 ? 2 : 4, {});
  },
  moss(C, a) {
    const b = a.back; if (!b) return;
    for (const [dx, r] of [[-0.3, 1.6], [0.1, 2.0], [0.4, 1.4]]) C.ell(b.x + dx * b.w, b.y + 0.6, r, r * 0.65, 'v', { base: 2.5 });
    C.dot(b.x - 0.1 * b.w, b.y - 0.2, 'v', 4, {});
  },
  flames(C, a, p) {
    const b = a.back; if (!b) return;
    const fl = p.f % 2 ? 1 : -1;
    for (let k = -1; k <= 1; k++) {
      const x = b.x + k * b.w * 0.28, y = b.y + 1.4;
      const h = k === 0 ? 4.6 : 3.2;
      C.tri(x - 1.4, y, x + 1.4, y, x + fl * 0.6 * (k === 0 ? 1 : -1), y - h, 'f', { glow: true, shade: 'vgrad', tone: 4, span: 2 });
      C.tri(x - 0.6, y, x + 0.6, y, x, y - h * 0.5, 'g', { glow: true, shade: 'flat', tone: 4 });
    }
  },
  crown(C, a, p) {
    const h = a.head; if (!h) return;
    const y = h.y - h.r * 0.95, w = Math.max(2.4, h.r * 0.7);
    C.rect(h.x - w, y - 0.6, w * 2, 1.8, 'y', { base: 3 });
    const pts = p.view === 'side' ? [-0.6, 0.4] : [-0.85, 0, 0.85];
    for (const t of pts) C.tri(h.x + t * w - 0.9, y - 0.4, h.x + t * w + 0.9, y - 0.4, h.x + t * w, y - 2.8, 'y', { base: 3 });
    if (p.view !== 'up') C.dot(h.x, y + 0.2, 'm', 3, {});
  },
  frost(C) {
    // geada: pixels da borda de cima viram gelo claro
    C.tint((x, y, m) => !C.has(x, y - C.u) && m !== 'g' && m !== 'e', () => ['k', 4]);
  },
  runes(C, a, p) {
    const b = a.body; if (!b) return;
    const pts = [[-0.4, -0.1], [0.05, 0.25], [0.45, -0.15]];
    pts.forEach(([dx, dy], k) => { if ((k + p.f) % 3 !== 2) C.dot(b.x + dx * b.rx, b.y + dy * b.ry, 'g', 4, { glow: true, over: true }); });
  },
  drip(C, a, p) {
    const b = a.body; if (!b) return;
    for (const [dx, dy] of [[-0.45, -0.2], [0.35, 0.05]]) C.circ(b.x + dx * b.rx, b.y + dy * b.ry, Math.max(C.u * 0.8, b.rx * 0.14), 'p', { over: true, shade: 'flat', tone: 3, edge: false });
    const len = (p.f % 2 ? 1 : 0) + 1;
    C.line(b.x + 0.35 * b.rx, b.y + b.ry * 0.7, b.x + 0.35 * b.rx, b.y + b.ry * 0.7 + len * C.u * 1.5, C.u, 'p', { thin: true, shade: 'flat', tone: 2 });
  },
  spikes(C, a, p) {
    const b = a.back; if (!b) return;
    for (let k = -1; k <= 1; k++) {
      const x = b.x + k * b.w * 0.3, y = b.y + 1;
      C.tri(x - 1.1, y + 0.6, x + 1.1, y + 0.6, x + (p.view === 'side' ? 0.8 : 0), y - 2.6 + Math.abs(k) * 0.6, 'h', { base: 3 });
    }
  },
  halo(C, a) {
    const h = a.head; if (!h || a.hasHalo) return;
    C.ring(h.x, h.y - h.r * 1.35, h.r * 0.75, Math.max(C.u, h.r * 0.24), C.u * 1.1, 'y', { glow: true, tone: 4 });
  },
  blind(C, a, p) {
    const e = a.eyes; if (!e || p.view === 'up') return;
    const xs = e.map((q) => q[0]);
    const y = e[0][1];
    C.line(Math.min(...xs) - 1.6, y, Math.max(...xs) + 1.6, y, Math.max(C.u * 1.2, 1.6), 'c', { shade: 'flat', tone: 2, edge: false });
  }
};

export const DETAIL_IDS = Object.keys(PAINT).concat(['aura']);

export function drawDetails(C, look, p) {
  const list = look.details || [];
  if (!list.length) return;
  const a = { ...C.anchors };
  const P = look.params || {};
  a.hasHorns = !!P.horns;
  a.hasHalo = !!P.halo;
  // olhos primeiro pintados normalmente; detalhes por cima; brilho dos olhos por ultimo
  for (const d of list) if (d !== 'glowEyes' && PAINT[d]) PAINT[d](C, a, p, look);
  if (list.includes('glowEyes')) PAINT.glowEyes(C, a, p, look);
}
