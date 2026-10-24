// Plano RASTEJANTE de muitas patas (aranha, caranguejo, escorpiao) e PEIXE
// pairante (peixe-abissal, tubarao). Patas finas em zigue-zague que alternam.
import { GROUND } from '../raster.js';
import { mouth } from '../kit.js';

function legs(C, cx, cy, n, span, side, p, m, ds = 0) {
  for (let k = 0; k < n; k++) {
    const t = n > 1 ? k / (n - 1) : 0.5;
    const ph = (k + (side > 0 ? 1 : 0)) % 2 ? 1 : -1;
    const step = p.moving ? ph * [1, 0, -1, 0][p.f % 4] : 0;
    const bx = cx + side * 1.5, by = cy - 1 + t * 2.2;
    const kx = cx + side * (span * 0.6), ky = cy - 4.6 + t * 1.2 + (step > 0 ? -0.8 : 0);
    const fx = cx + side * (span * (0.75 + t * 0.15)) + (t - 0.5) * 3, fy = GROUND - 0.4 - (step > 0 ? C.u : 0);
    C.line(bx, by, kx, ky, 1.3, m, { ds, shade: 'flat', tone: 2, edge: false });
    C.line(kx, ky, fx, fy, 1.15, m, { w1: 0.8, ds, shade: 'flat', tone: 2, edge: false });
    C.dot(kx, ky, m, 3 + ds, {});
  }
}

export function crawler(C, P, p) {
  const kind = P.kind || 'spider';
  const r = P.body ?? 5.5;
  const view = p.view;
  const bob = p.bobU;
  const cy = GROUND - (P.alt ?? 5.5) + bob;
  const front = view === 'down';

  if (view === 'side') {
    const cx = 17;
    if (kind === 'scorpion') {
      // cauda arqueada sobre o dorso com ferrao
      const a = p.atk ? -2.5 : 0;
      C.curve([[cx + r, cy], [cx + r + 3, cy - 3], [cx + r + 2, cy - 8], [cx + r - 1 + a, cy - 10 + (p.atk ? 2 : 0)]], 2.6, 1.6, 'a', {});
      C.tri(cx + r - 2 + a, cy - 10.5 + (p.atk ? 2 : 0), cx + r - 0.2 + a, cy - 9.5 + (p.atk ? 2 : 0), cx + r - 3 + a, cy - 7.5 + (p.atk ? 2 : 0), 'h', {});
    }
    legs(C, cx - 1, cy + 1, kind === 'crab' ? 3 : 4, r * 1.7, 1, p, P.legMat || 'a', -1);
    if (kind === 'spider') C.ell(cx + r * 0.8, cy - 0.5, r * 1.0, r * 0.85, 'a', {});
    C.ell(cx - r * 0.2, cy, r * (kind === 'crab' ? 1.2 : 0.75), r * (kind === 'crab' ? 0.75 : 0.62), kind === 'spider' ? (P.headMat || 'b') : 'a', {});
    if (P.mark && kind === 'spider') C.ell(cx + r * 0.9, cy - r * 0.4, r * 0.35, r * 0.25, P.mark, { over: true, edge: false, shade: 'flat', tone: 3 });
    legs(C, cx - 2, cy + 1.2, kind === 'crab' ? 3 : 4, r * 1.5, -1, p, P.legMat || 'a', 0);
    const hx = cx - r * (kind === 'crab' ? 1.1 : 0.85);
    if (kind === 'crab' || kind === 'scorpion') {
      const cl = p.atk ? -2.5 : 0;
      C.line(hx + 1, cy, hx - 2.5 + cl, cy - 2.5, 1.5, 'a', {});
      C.ell(hx - 3.5 + cl, cy - 3.6, 2.2, 1.6, P.clawMat || 'a', { rot: 0.4 });
      C.cut((x, y) => x < hx - 4 + cl && Math.abs(y - (cy - 3.6)) < C.u * 0.6 && x > hx - 6 + cl);
    }
    if (kind === 'crab') { C.line(hx + 1, cy - 1.5, hx + 0.5, cy - 4, C.u, 'a', { thin: true }); C.eye(hx + 0.5, cy - 4.2, { glow: P.eyeGlow, m: P.eyeMat }); }
    else { C.eye(hx - 0.2, cy - 1, { glow: P.eyeGlow, m: P.eyeMat, small: true }); if (kind === 'spider') C.eye(hx + 0.9, cy - 1.8, { glow: P.eyeGlow, m: P.eyeMat, small: true }); }
    if (kind === 'spider') C.line(hx - 0.5, cy + 0.6, hx - 1.4, cy + 2, 1, 'h', { w1: 0.6, edge: false });
    C.anchor('head', { x: hx, y: cy - 1, r: r * 0.6 });
    C.anchor('body', { x: cx, y: cy, rx: r * 1.2, ry: r * 0.8 });
    C.anchor('back', { x: cx + r * 0.5, y: cy - r * 0.8, w: r * 1.6 });
    C.anchor('front', { x: hx - 2, y: cy });
    return;
  }
  const cx = 16;
  const nL = kind === 'crab' ? 3 : 4;
  if (!front && kind === 'scorpion') C.curve([[cx, cy - 1], [cx + 0.5, cy - 6], [cx, cy - 10]], 2.6, 1.8, 'a', {});
  for (const s of [-1, 1]) legs(C, cx, cy + 0.5, nL, r * 2.0, s, p, P.legMat || 'a', 0);
  if (kind === 'spider' && !front) C.ell(cx, cy - 1, r * 1.05, r * 0.95, 'a', {});
  if (kind === 'spider') C.ell(cx, cy - (front ? 2 : 0) + (front ? 0 : 1), r * 1.0, r * 0.85, front ? 'a' : 'a', {});
  else C.ell(cx, cy, r * 1.25, r * 0.8, 'a', {});
  if (kind === 'spider' && front) C.ell(cx, cy + 0.8, r * 0.7, r * 0.55, P.headMat || 'b', {});
  if (P.mark && !front) C.ell(cx, cy - r * 0.3, r * 0.35, r * 0.3, P.mark, { over: true, edge: false, shade: 'flat', tone: 3 });
  if (kind === 'crab' || kind === 'scorpion') for (const s of [-1, 1]) {
    const lift = p.atk ? -2.5 : 0;
    C.line(cx + s * r, cy, cx + s * (r + 2.4), cy - 2.5 + lift, 1.5, 'a', {});
    C.ell(cx + s * (r + 3), cy - 4 + lift, 1.9, 2.3, P.clawMat || 'a', {});
    C.cut((x, y) => Math.abs(x - (cx + s * (r + 3))) < C.u * 0.6 && y < cy - 4.5 + lift && y > cy - 7 + lift);
  }
  if (front && kind === 'scorpion') C.curve([[cx, cy - 1], [cx + 0.5, cy - 6], [cx, cy - 9.5]], 2.4, 1.6, 'a', { ds: 0 });
  if (front && kind === 'scorpion') C.tri(cx - 1, cy - 9.5, cx + 1, cy - 9.5, cx, cy - 7.5, 'h', {});
  if (front) {
    if (kind === 'spider') {
      // varios olhinhos em duas fileiras
      C.eyePair(cx, cy + 0.2, r * 0.26, { glow: P.eyeGlow, m: P.eyeMat, small: C.S < 24 });
      C.eyePair(cx, cy - 1.1, r * 0.45, { glow: P.eyeGlow, m: P.eyeMat, small: true });
      for (const s of [-1, 1]) C.line(cx + s * 0.9, cy + r * 0.45, cx + s * 0.6, cy + r * 0.9, 1, 'h', { w1: 0.6, edge: false });
    } else if (kind === 'crab') {
      for (const s of [-1, 1]) C.line(cx + s * 1.6, cy - r * 0.5, cx + s * 1.9, cy - r * 0.95, C.u, 'a', { thin: true });
      C.eyePair(cx, cy - r * 0.95, 1.9, { glow: P.eyeGlow, m: P.eyeMat, small: true });
      mouth(C, cx, cy + r * 0.25, 2, { open: p.atk });
    } else C.eyePair(cx, cy - r * 0.2, r * 0.3, { glow: P.eyeGlow, m: P.eyeMat, small: true });
  }
  C.anchor('head', { x: cx, y: cy, r: r * 0.6 });
  C.anchor('body', { x: cx, y: cy, rx: r * 1.2, ry: r * 0.8 });
  C.anchor('back', { x: cx, y: cy - r * 0.8, w: r * 1.6 });
  C.anchor('front', { x: cx, y: cy + r * 0.5 });
}

// Peixe que "nada" no ar a meia altura (peixe-abissal com lanterna, tubarao).
export function fish(C, P, p) {
  const r = P.body ?? 6;
  const view = p.view;
  const hover = p.moving ? [0, -1, 0, 1][p.f % 4] : p.bob ? 1 : 0;
  const cy = GROUND - (P.alt ?? 8) - r * 0.5 + hover * C.u;
  const wag = p.moving ? [1, 0, -1, 0][p.f % 4] : p.bob ? 0.5 : -0.5;
  C.anchor('float', { x: 16, w: r * 0.9 });
  const lure = (x, y) => {
    if (!P.lure) return;
    C.curve([[x, y], [x - 1.5, y - 3], [x - 3.5, y - 3.2]], C.u, C.u, 'c', { thin: true });
    C.circ(x - 3.8, y - 2.4 + (p.bob ? 0.4 : 0), 1.3, 'g', { glow: true, shade: 'flat', tone: 4 });
  };
  if (view === 'side') {
    const cx = 16.5;
    C.tri(cx + r * 0.9, cy, cx + r * 1.9, cy - r * 0.8 + wag, cx + r * 1.9, cy + r * 0.8 + wag, P.finMat || 'c', {});
    if (P.dorsal) C.tri(cx - r * 0.3, cy - r * 0.6, cx + r * 0.6, cy - r * 0.6, cx + r * 0.5, cy - r * 1.65, P.finMat || 'c', {});
    C.ell(cx, cy, r * 1.15, r * 0.8, 'a', {});
    C.ell(cx - r * 0.1, cy + r * 0.4, r * 0.9, r * 0.35, 'b', { over: true, edge: false, shade: 'flat', tone: 3 });
    C.tri(cx, cy + r * 0.2, cx + r * 0.6, cy + r * 0.3, cx + r * 0.4, cy + r * 0.9 + wag * 0.3, P.finMat || 'c', {});
    const mx = cx - r * 1.1;
    const open = p.atk ? r * 0.45 : P.teeth ? r * 0.2 : 0;
    if (open) {
      C.poly([[mx - 0.5, cy - open * 0.2], [mx + r * 0.6, cy + r * 0.1], [mx - 0.5, cy + open]], 'm', { shade: 'flat', tone: 1, edge: false });
      for (let k = 0; k < 2; k++) C.dot(mx + k * 1.4 + 0.2, cy + 0.2, 'w', 4, {});
    }
    C.eye(cx - r * 0.55, cy - r * 0.25, { glow: P.eyeGlow, m: P.eyeMat });
    lure(cx - r * 0.7, cy - r * 0.7);
    C.anchor('head', { x: cx - r * 0.6, y: cy, r: r * 0.6 });
    C.anchor('body', { x: cx, y: cy, rx: r * 1.15, ry: r * 0.8 });
    C.anchor('back', { x: cx, y: cy - r * 0.8, w: r * 1.6 });
    C.anchor('front', { x: cx - r * 1.2, y: cy });
    return;
  }
  const cx = 16;
  const front = view === 'down';
  if (!front) C.tri(cx - 0.5, cy, cx - r * 0.7 + wag, cy + r * 1.3, cx + r * 0.7 + wag, cy + r * 1.3, P.finMat || 'c', {});
  for (const s of [-1, 1]) C.tri(cx + s * r * 0.6, cy + r * 0.1, cx + s * r * 0.75, cy + r * 0.6, cx + s * (r * 1.5), cy + r * 0.55 + wag * s * 0.4, P.finMat || 'c', {});
  if (P.dorsal) C.tri(cx - 1.2, cy - r * 0.6, cx + 1.2, cy - r * 0.6, cx + 0.3, cy - r * 1.6, P.finMat || 'c', {});
  C.ell(cx, cy, r * 0.75, r * 0.85, 'a', {});
  if (front) {
    C.ell(cx, cy + r * 0.35, r * 0.55, r * 0.4, 'b', { over: true, edge: false, shade: 'flat', tone: 3 });
    C.eyePair(cx, cy - r * 0.2, r * 0.45, { glow: P.eyeGlow, m: P.eyeMat });
    mouth(C, cx, cy + r * 0.35, r * 0.7, { open: p.atk || P.teeth, teeth: true, h: p.atk ? r * 0.5 : r * 0.25 });
    lure(cx + 1.8, cy - r * 0.8);
  }
  C.anchor('head', { x: cx, y: cy - r * 0.2, r: r * 0.7 });
  C.anchor('body', { x: cx, y: cy, rx: r * 0.75, ry: r * 0.85 });
  C.anchor('back', { x: cx, y: cy - r * 0.85, w: r * 1.2 });
  C.anchor('front', { x: cx, y: cy + r * 0.3 });
}
