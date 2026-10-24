// Plano SERPENTE (cobra, verme, enguia, serpente do tempo, tentaculos, leviata).
// De frente: espiral empilhada com a cabeca erguida. De lado: corpo em "S"
// rente ao chao que ondula a cada quadro.
import { GROUND } from '../raster.js';
import { mouth } from '../kit.js';

function snakeHead(C, P, p, x, y, w, view) {
  const kind = P.headKind || 'snake';
  const side = view === 'side';
  if (P.hood) {
    if (side) C.ell(x + w * 0.6, y + w * 0.6, w * 0.6, w * 1.2, 'a', {});
    else C.ell(x, y + w * 0.4, w * 1.7, w * 1.25, 'a', {});
    if (!side && view !== 'up') C.ell(x, y + w * 0.6, w * 1.0, w * 0.8, 'b', { over: true, edge: false });
  }
  if (P.fins) for (const s of side ? [1] : [-1, 1]) C.tri(x + s * w * 0.5, y - w * 0.5, x + s * w * 0.6, y + w * 0.5, x + s * w * 1.7, y - w * 0.4, 'c', {});
  if (kind === 'worm') {
    // verme: cabeca redonda que e so boca circular com dentes
    C.circ(x, y, w * 1.05, 'a', {});
    if (view !== 'up') {
      const mx = side ? x - w * 0.55 : x, open = p.atk ? 0.7 : 0.5;
      C.ell(mx, y + w * 0.1, w * (side ? 0.35 : open), w * open, 'm', { shade: 'flat', tone: 1, edge: false });
      for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; C.dot(mx + Math.cos(a) * w * open * (side ? 0.5 : 0.8), y + w * 0.1 + Math.sin(a) * w * open * 0.8, 'w', 4, {}); }
    }
    return;
  }
  // cobra/enguia: cabeca em gota com olhos laterais
  if (side) C.ell(x - w * 0.3, y, w * 1.35, w * 0.85, P.headMat || 'a', {});
  else C.ell(x, y, w * 1.05, w * 1.15, P.headMat || 'a', {});
  if (P.horns) for (const s of side ? [1] : [-1, 1]) C.line(x + s * w * 0.5, y - w * 0.6, x + s * w * 1.0 + (side ? 1.5 : 0), y - w * 1.8, 1.4, 'h', { w1: 0.6 });
  if (view === 'up') return;
  if (side) {
    C.eye(x - w * 0.6, y - w * 0.25, { glow: P.eyeGlow, m: P.eyeMat });
    if (p.atk) { C.ell(x - w * 1.3, y + w * 0.35, w * 0.6, w * 0.4, 'm', { shade: 'flat', tone: 1, edge: false }); C.dot(x - w * 1.4, y, 'w', 4, {}); }
    if (P.tongue && p.bob) C.line(x - w * 1.6, y + w * 0.3, x - w * 2.4, y + w * 0.5, C.u, 'm', { thin: true, edge: false, shade: 'flat', tone: 3 });
  } else {
    C.eyePair(x, y - w * 0.2, w * 0.6, { glow: P.eyeGlow, m: P.eyeMat });
    if (p.atk) mouth(C, x, y + w * 0.55, w * 0.9, { open: true, teeth: true });
    if (P.tongue && p.bob && !p.atk) C.line(x, y + w * 1.0, x + (p.f % 2 ? 0.6 : -0.6), y + w * 1.9, C.u, 'm', { thin: true, edge: false, shade: 'flat', tone: 3 });
  }
}

export function serpent(C, P, p) {
  const w = P.w ?? 2.8; // meia-espessura do corpo
  const view = p.view;
  const wav = p.moving ? [0, 1, 0, -1][p.f % 4] : p.bob ? 0.5 : 0;
  const rise = P.rise ?? 9; // altura da cabeca erguida
  const bodyMat = 'a';

  if (P.kind === 'tentacles') {
    // tentaculos saindo de uma poca escura (horror de tentaculos)
    C.ell(16, GROUND - 1, 11, 2.6, 'd', { shade: 'flat', tone: 1 });
    const n = P.count ?? 5;
    for (let k = 0; k < n; k++) {
      const t = (k - (n - 1) / 2) / ((n - 1) / 2);
      const bx = 16 + t * 8.5, h = rise * (1 - Math.abs(t) * 0.45) + (p.atk && Math.abs(t) < 0.5 ? 4 : 0);
      const sway = ((k % 2 ? 1 : -1) * (wav + 0.5)) * 1.4;
      const pts = [[bx, GROUND - 1.5], [bx + sway * 0.4 - t, GROUND - h * 0.45], [bx + sway + t * 1.5, GROUND - h * 0.8], [bx + sway * 0.6 + t * 3, GROUND - h]];
      C.curve(pts, w * 1.25, 0.8, bodyMat, {});
      if (P.suckers) for (let q = 1; q < 3; q++) C.dot(pts[q][0] + (t < 0 ? 0.6 : -0.6), pts[q][1], 'b', 3, {});
    }
    if (view !== 'up' && P.eyes !== 'none') C.eye(16, GROUND - 1.4, { m: 'g', glow: true });
    C.anchor('head', { x: 16, y: GROUND - rise, r: 3 });
    C.anchor('body', { x: 16, y: GROUND - rise * 0.5, rx: 9, ry: rise * 0.5 });
    C.anchor('back', { x: 16, y: GROUND - rise, w: 14 });
    C.anchor('front', { x: 16, y: GROUND - 3 });
    return;
  }

  if (P.kind === 'ouroboros') {
    // serpente do tempo: anel que morde a propria cauda, girando
    const R = P.R ?? 9, cy = GROUND - R - w - 1 + (p.bob ? C.u : 0);
    C.anchor('float', { x: 16, w: R * 0.8 });
    const rot = (p.f % 4) * (Math.PI / 8);
    const segs = 14;
    const pts = [];
    for (let k = 0; k <= segs; k++) { const a = rot + (k / segs) * Math.PI * 1.85; pts.push([16 + Math.cos(a) * R, cy + Math.sin(a) * R * (view === 'side' ? 0.45 : 1)]); }
    C.curve(pts, w * 1.2, w * 0.7, bodyMat, {});
    for (let k = 1; k < segs; k += 2) C.dot(pts[k][0], pts[k][1] - w * 0.3, 'c', 3, {});
    const [hx, hy] = [16 + Math.cos(rot - 0.05) * R, cy + Math.sin(rot - 0.05) * R * (view === 'side' ? 0.45 : 1)];
    C.circ(hx, hy, w * 1.3, P.headMat || bodyMat, {});
    if (view !== 'up') C.eye(hx - w * 0.3, hy - w * 0.5, { m: P.eyeMat || 'g', glow: true });
    C.circ(16, cy, R * 0.35, 'g', { glow: true, shade: 'flat', tone: 3 });
    C.anchor('head', { x: hx, y: hy, r: w * 1.3 });
    C.anchor('body', { x: 16, y: cy, rx: R, ry: R });
    C.anchor('back', { x: 16, y: cy - R, w: R });
    C.anchor('front', { x: 16, y: cy });
    return;
  }

  if (view === 'side') {
    // corpo em S rente ao chao, cabeca erguida a esquerda
    const y0 = GROUND - w - 0.2;
    const pts = [[27, y0 - 1 - wav * 0.5], [23, y0 - wav], [19, y0 + wav * 0.6 - 0.2], [15, y0 - 1 + wav * 0.3], [11.5, y0 - rise * 0.45], [10.5, y0 - rise * (p.atk ? 0.8 : 0.85)]];
    if (p.atk) { pts[4][0] -= 2; pts[5][0] -= 3.5; }
    C.curve(pts, w * 0.55, w * 1.35, bodyMat, {});
    if (P.belly) C.curve(pts.slice(2, 5).map(([x, y]) => [x - 0.4, y + w * 0.6]), w * 0.45, w * 0.55, 'b', { over: true, edge: false, shade: 'flat', tone: 3 });
    if (P.pattern) for (let k = 0; k < 4; k++) C.dot(pts[k][0], pts[k][1] - w * 0.4, 'c', 2, { n: C.S >= 32 ? 2 : 1 });
    if (P.spikes) for (let k = 1; k < 4; k++) C.tri(pts[k][0] - 1, pts[k][1] - w * 0.8, pts[k][0] + 1, pts[k][1] - w * 0.8, pts[k][0] + 0.6, pts[k][1] - w * 0.8 - 2, 'c', {});
    if (P.rattle) C.ell(28, y0 - 2 - wav, 1.2, 1.6, 'h', {});
    const [hx, hy] = pts[5];
    snakeHead(C, P, p, hx, hy - w * 0.4, w, 'side');
    C.anchor('head', { x: hx, y: hy, r: w * 1.2 });
    C.anchor('body', { x: 19, y: y0, rx: 8, ry: w });
    C.anchor('back', { x: 19, y: y0 - w, w: 12 });
    C.anchor('front', { x: hx - w * 2, y: hy });
    return;
  }
  // frente/costas: espiral (3 aneis empilhados) e pescoco erguido
  const cx = 16;
  const coil = (y, rx, ds) => C.ell(cx, y, rx, w * 1.15, bodyMat, { ds });
  coil(GROUND - w * 1.1, w * 3.4, 0);
  if (view === 'up') {
    coil(GROUND - w * 2.8, w * 2.6, 0);
  } else {
    coil(GROUND - w * 2.8, w * 2.6, 0);
  }
  if (P.pattern) for (const s of [-1, 0, 1]) C.dot(cx + s * w * 2, GROUND - w * 1.2 - (s ? 0 : w * 1.6), 'c', 2, { n: C.S >= 32 ? 2 : 1 });
  const ny = GROUND - w * 2.8 - rise * 0.5;
  const hx = cx + (p.moving ? wav * 0.8 : 0), hy = GROUND - w * 3 - rise * (p.atk ? 0.95 : 0.8);
  C.curve([[cx + 1.5, GROUND - w * 3.2], [cx + 2.2, ny], [hx, hy + w]], w * 1.2, w * 1.0, bodyMat, {});
  if (P.belly && view === 'down') C.curve([[cx + 1.4, GROUND - w * 3.2], [cx + 2, ny], [hx, hy + w]], w * 0.55, w * 0.5, 'b', { over: true, edge: false, shade: 'flat', tone: 3 });
  if (P.spikes && view === 'up') for (const k of [0.3, 0.6]) C.tri(cx + 1.5 - 1, GROUND - w * 3 - rise * k, cx + 1.5 + 1, GROUND - w * 3 - rise * k, cx + 1.5, GROUND - w * 3 - rise * k - 2, 'c', {});
  if (P.rattle) C.ell(cx - w * 3.2, GROUND - w * 2.4, 1.2, 1.6, 'h', {});
  snakeHead(C, P, p, hx, hy, w, view);
  C.anchor('head', { x: hx, y: hy, r: w * 1.2 });
  C.anchor('body', { x: cx, y: GROUND - w * 2, rx: w * 3.4, ry: w * 2 });
  C.anchor('back', { x: cx, y: GROUND - w * 3.6, w: w * 5 });
  C.anchor('front', { x: hx, y: hy + w });
}
