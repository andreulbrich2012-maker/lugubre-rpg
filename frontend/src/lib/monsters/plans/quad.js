// Plano QUADRUPEDE (rato, javali, lobo, urso, cao infernal, cervo, esfinge...).
// Vista lateral olha para a ESQUERDA (a direita e espelhada no compose).
// Proporcao "chibi": cabeca grande e corpo curto para ler bem em 16px.
import { GROUND } from '../raster.js';
import { leg, ear, horn, tail, mouth, wing } from '../kit.js';

function hornSet(C, P, hx, hy, hr, side, view) {
  const k = P.horns;
  if (!k) return;
  const s = P.hornSize ?? 1;
  if (k === 'antler') {
    const bx = hx + side * hr * 0.35, by = hy - hr * 0.8;
    C.curve([[bx, by], [bx + side * 1.4 * s, by - 3 * s], [bx + side * 3.2 * s, by - 5.5 * s]], 1.3, 0.8, 'h', { shade: 'relief' });
    C.line(bx + side * 1.6 * s, by - 3.2 * s, bx + side * 0.6 * s, by - 6 * s, 1.1, 'h', { w1: 0.7 });
    C.line(bx + side * 2.6 * s, by - 4.6 * s, bx + side * 4.6 * s, by - 5 * s, 1.0, 'h', { w1: 0.7 });
  } else if (k === 'goat') {
    horn(C, hx + side * hr * 0.3, hy - hr * 0.75, side * 2.2 * s, -3.4 * s, 2.0 * s, 'h', { bx: side * 2.2 * s, by: -0.4 });
  } else if (k === 'bull') {
    horn(C, hx + side * hr * 0.7, hy - hr * 0.5, side * 3.2 * s, -2.8 * s, 2.0 * s, 'h', { bx: side * 1.2 * s, by: 0.8 });
  } else if (k === 'nub') {
    C.tri(hx + side * hr * 0.45 - 1, hy - hr * 0.7, hx + side * hr * 0.45 + 1, hy - hr * 0.7, hx + side * hr * 0.55, hy - hr * 0.7 - 2.2 * s, 'h');
  } else if (k === 'unicorn' && view !== 'up') {
    C.line(hx + side * hr * 0.1, hy - hr * 0.7, hx + side * hr * 0.25, hy - hr * 0.7 - 4.5 * s, 1.6, 'h', { w1: 0.6, glow: P.hornGlow });
  }
}

function tailOf(C, P, x, y, dir, wag, view) {
  const t = P.tail || 'thin';
  const s = P.tailSize ?? 1;
  if (t === 'none') return;
  if (t === 'stub') { C.circ(x + dir * 0.6, y, 1.5 * s, P.tailMat || 'a', {}); return; }
  if (t === 'bushy') {
    C.ell(x + dir * 2.8 * s, y - 1.5 * s + wag * 0.4, 3.2 * s, 2.1 * s, P.tailMat || 'a', { rot: dir * -0.6 });
    if (P.tailTip) C.circ(x + dir * 5 * s, y - 3 * s + wag * 0.4, 1.3 * s, P.tailTip, {});
    return;
  }
  if (t === 'flame') {
    C.curve([[x, y], [x + dir * 2 * s, y - 2 * s], [x + dir * 3 * s + wag * 0.5, y - 5 * s]], 2.4 * s, 0.8, 'g', { glow: true, shade: 'vgrad', tone: 4, span: 2 });
    return;
  }
  if (t === 'snake') { // quimera: cauda de serpente com cabeca
    const tx = x + dir * 4 * s, ty = y - 4.5 * s + wag * 0.3;
    C.curve([[x, y], [x + dir * 3 * s, y - 0.5], [tx, ty]], 1.6, 1.3, P.tailMat || 'c', {});
    C.ell(tx + dir * 0.6, ty - 0.6, 1.6, 1.2, P.tailMat || 'c', {});
    if (view !== 'up') C.dot(tx + dir * 1, ty - 0.9, 'g', 4, { glow: true });
    return;
  }
  if (t === 'long') { // salamandra/lagarto: grossa e longa, rente ao chao
    C.curve([[x, y], [x + dir * 3.5 * s, y + 1.8], [x + dir * 6.5 * s, y + 2.4 + wag * 0.3]], 3.0 * s, 0.9, P.tailMat || 'a', {});
    return;
  }
  if (view === 'up' && (t === 'thin' || t === 'long')) { // de costas: cauda cai do quadril para o lado
    C.curve([[x, y], [x + 1.6 * s, y + 1.8], [x + 3.4 * s, y + 1.2 + wag * 0.4]], t === 'long' ? 2.4 : 1.3, 0.8, P.tailMat || (t === 'long' ? 'a' : 'b'), {});
    if (P.tailTip) C.circ(x + 3.4 * s, y + 1.2 + wag * 0.4, 1.2, P.tailTip, {});
    return;
  }
  // fina e curvada (rato, cao)
  C.curve([[x, y], [x + dir * 2.5 * s, y - 1 + wag * 0.3], [x + dir * 4 * s, y - 3.5 * s + wag * 0.6]], 1.3 * s, 0.7, P.tailMat || 'b', { shade: 'relief' });
  if (P.tailTip) C.circ(x + dir * 4 * s, y - 3.5 * s + wag * 0.6, 1.2, P.tailTip, {});
}

export function quad(C, P, p) {
  const bl = P.len ?? 7.5, bh = P.h ?? 5, ll = P.leg ?? 4.5, lw = P.legW ?? 2.6, hr = P.head ?? 5.2;
  const sn = P.snout ?? 2.6, snr = P.snoutR ?? 2.2, snoutMat = P.snoutMat || 'b';
  const foot = P.hoof ? 'h' : P.paw || null;
  const bob = p.bobU;
  const by = GROUND - ll - bh * 0.5 + (P.lift ?? 0);
  const sw = p.swing; // -1..1 por par diagonal
  const earK = P.ear || 'point', earS = P.earSize ?? 2.6;
  const wag = p.f % 2 ? 1 : -1;

  if (p.view === 'side') {
    const cx = 17.5 + (P.cx ?? 0);
    const fX = cx - bl * 0.58, rX = cx + bl * 0.55;
    const legTop = by + bh * 0.25 + bob;
    // pernas do lado de la (mais escuras)
    leg(C, fX + 1.4, legTop, lw * 0.9, 'a', { swing: -sw, ds: -1, foot, stride: P.stride });
    leg(C, rX + 1.4, legTop, lw * 0.95, 'a', { swing: sw, ds: -1, foot, stride: P.stride });
    if (P.wings) wing(C, cx + 1, by - bh * 0.6 + bob, 1, P.wingSpan ?? 7, P.wingMat || 'c', { kind: P.wings, flap: p.flap, ds: -1 });
    tailOf(C, P, cx + bl * 0.9, by - bh * 0.25 + bob, 1, wag * (p.moving ? 1 : 0.5), 'side');
    C.ell(cx, by + bob, bl, bh, 'a', {});
    C.anchor('body', { x: cx, y: by + bob, rx: bl, ry: bh });
    if (P.belly) C.ell(cx - 0.5, by + bh * 0.62 + bob, bl * 0.82, bh * 0.45, 'b', { over: true, edge: false, shade: 'flat', tone: 2 });
    if (P.stripes) for (let k = -1; k <= 1; k++) C.line(cx + k * bl * 0.45, by - bh * 0.95 + bob, cx + k * bl * 0.45 + 0.8, by + bh * 0.1 + bob, 1.1, 'c', { over: true, edge: false, shade: 'flat', tone: 1 });
    if (P.spots) for (const [dx, dy] of [[-0.3, -0.4], [0.35, -0.2], [0.05, 0.15]]) C.circ(cx + dx * bl, by + dy * bh + bob, 0.95, 'c', { over: true, edge: false, shade: 'flat', tone: 3 });
    if (P.mane) C.ell(cx - bl * 0.55, by - bh * 0.2 + bob, bl * 0.5, bh * 1.02, 'c', { rot: -0.3 });
    if (P.spikes) for (let k = 0; k < 3; k++) {
      const x = cx - bl * 0.25 + k * bl * 0.33, y = by - bh * 0.88 + bob + Math.abs(k - 1) * 0.6;
      C.tri(x - 1.2, y + 1, x + 1.2, y + 1, x + 0.6, y - 2.3 * (P.spikeSize ?? 1), P.spikeMat || 'c');
    }
    C.anchor('back', { x: cx, y: by - bh + bob, w: bl * 1.4 });
    leg(C, fX, legTop, lw, 'a', { swing: sw, foot, stride: P.stride });
    leg(C, rX, legTop, lw * 1.05, 'a', { swing: -sw, foot, stride: P.stride });
    if (P.wings) wing(C, cx - 0.5, by - bh * 0.5 + bob, 1, (P.wingSpan ?? 7) * 0.95, P.wingMat || 'c', { kind: P.wings, flap: p.flap });
    // cabeca
    const lunge = p.atk ? -1.8 : 0;
    const hx = cx - bl * 0.92 + (P.hx ?? 0) + lunge, hy = by - bh * 0.55 + (P.hy ?? 0) + bob + (p.atk ? 0.8 : 0);
    if (P.neck) C.line(cx - bl * 0.5, by - bh * 0.2 + bob, hx + 1, hy + 0.5, P.neck, 'a', {});
    if (P.mane && P.maneHead) C.circ(hx + hr * 0.45, hy, hr * 1.25, 'c', {});
    ear(C, hx + hr * 0.45, hy - hr * 0.6, earK, earS * 0.9, 'a', { side: 1, ds: -1 });
    hornSet(C, P, hx + 0.6, hy, hr, 1, 'side');
    C.ell(hx, hy, hr, hr * (P.headSq ?? 0.9), P.headMat || 'a', {});
    C.anchor('head', { x: hx, y: hy, r: hr });
    const sx = hx - hr * 0.7 - sn * 0.35, sy = hy + hr * 0.32;
    if (sn > 0) {
      C.ell(sx, sy, sn, snr, snoutMat, {});
      C.dot(sx - sn * 0.8, sy - snr * 0.35, 'd', 1, {});
      if (P.tusks) C.line(sx + 0.2, sy + snr * 0.5, sx - 1.0, sy - snr * 0.9, 1.1, 'w', { w1: 0.6, edge: false });
      if (p.atk) C.ell(sx + 0.2, sy + snr * 0.8, sn * 0.75, 1.1, 'm', { shade: 'flat', tone: 1, edge: false });
      else C.line(sx - sn * 0.6, sy + snr * 0.55, sx + sn * 0.25, sy + snr * 0.65, C.u * 0.8, 'm', { shade: 'flat', tone: 1, edge: false, thin: true, over: true });
    }
    if (P.face === 'human') C.ell(hx - hr * 0.35, hy + hr * 0.15, hr * 0.62, hr * 0.7, 'b', { over: true, edge: false });
    C.eye(hx - hr * 0.42, hy - hr * (P.eyeY ?? 0.12), { glow: P.eyeGlow, m: P.eyeMat });
    if (P.wideMouth) C.line(hx - hr, hy + hr * 0.35, hx - hr * 0.1, hy + hr * 0.45, C.u * 0.9, 'm', { shade: 'flat', tone: 1, edge: false, thin: true, over: true });
    C.anchor('eyes', [[hx - hr * 0.42, hy - hr * 0.12]]);
    ear(C, hx + hr * 0.2, hy - hr * 0.68, earK, earS, 'a', { side: 1, inner: P.earInner || 'b', lean: 0.6 });
    hornSet(C, P, hx, hy, hr, 1, 'side');
    if (P.crest) C.tri(hx - 1, hy - hr * 0.9, hx + 2.5, hy - hr * 0.9, hx + 2.8, hy - hr * 0.9 - 3, 'c');
    C.anchor('front', { x: hx - hr - sn, y: hy });
    return;
  }

  // vistas de frente e de costas
  const cx = 16;
  const front = p.view === 'down';
  const bw = P.bodyW ?? bh * 1.0;
  const lift = (k) => (p.moving && ((k === 0 && p.f === 0) || (k === 1 && p.f === 2)) ? -C.u : 0);
  const hx = cx, hy = by - bh * 0.5 + (P.hy ?? 0) + bob + (front ? 0 : -1.4) + (p.atk ? 1 : 0);
  const legTop = by + bh * 0.3 + bob;
  const gapF = P.legGap ?? bw * 0.52, gapR = gapF + 1;

  const drawHead = () => {
    if (P.mane && P.maneHead) C.circ(hx, hy + 0.5, hr * 1.32, 'c', {});
    for (const s of [-1, 1]) ear(C, hx + s * hr * 0.72, hy - hr * 0.62, earK, earS, 'a', { side: s, inner: front ? (P.earInner || 'b') : null });
    for (const s of [-1, 1]) hornSet(C, P, hx, hy, hr, s, p.view);
    C.ell(hx, hy, hr * 1.06, hr * (P.headSq ?? 0.92), P.headMat || 'a', {});
    C.anchor('head', { x: hx, y: hy, r: hr });
    if (!front) {
      if (P.crest) C.tri(hx - 1.2, hy - hr * 0.85, hx + 1.2, hy - hr * 0.85, hx, hy - hr * 0.85 - 3, 'c');
      return;
    }
    if (P.face === 'human') C.ell(hx, hy + hr * 0.12, hr * 0.7, hr * 0.72, 'b', { over: true, edge: false });
    if (sn > 0) {
      const sy = hy + hr * 0.42;
      C.ell(hx, sy, snr * 1.3, snr * 0.95, snoutMat, {});
      C.dotPx(...(() => { const [X, Y] = C.toPx(hx, sy - snr * 0.5); return [X - 1, Y]; })(), 'd', 1, { n: 2, h: 1 });
      if (P.tusks) for (const s of [-1, 1]) C.line(hx + s * snr * 1.1, sy + 0.4, hx + s * snr * 1.5, sy - snr * 1.1, 1.1, 'w', { w1: 0.6, edge: false });
      mouth(C, hx, sy + snr * 0.55, snr * 1.1, { open: p.atk, teeth: p.atk, fangs: P.fangs && !p.atk });
    }
    C.eyePair(hx, hy - hr * (P.eyeY ?? (sn > 0 ? 0.12 : 0)), hr * (P.eyeGap ?? 0.46), { glow: P.eyeGlow, m: P.eyeMat });
    if (P.wideMouth) mouth(C, hx, hy + hr * 0.35, hr * 1.1, { open: p.atk, smile: C.u });
    if (P.moonMark) C.ring(hx, hy - hr * 0.62, hr * 0.32, hr * 0.32, C.u * 0.9, 'g', { glow: true, tone: 4, clip: (x) => x < hx + hr * 0.05 });
    if (P.crest) C.tri(hx - 1.2, hy - hr * 0.85, hx + 1.2, hy - hr * 0.85, hx, hy - hr * 0.85 - 3, 'c');
    C.anchor('front', { x: hx, y: hy + hr });
  };

  if (front) {
    // patas de tras espiando atras do corpo
    for (const s of [-1, 1]) leg(C, cx + s * gapR, legTop - 1, lw * 0.9, 'a', { swing: 0, ds: -1, foot, ground: GROUND - 0.8 + lift(s < 0 ? 1 : 0) / 1 });
    if (P.wings) for (const s of [-1, 1]) wing(C, cx + s * bw * 0.5, by - bh * 0.6 + bob, s, P.wingSpan ?? 7, P.wingMat || 'c', { kind: P.wings, flap: p.flap });
    if (P.tail === 'flame' || P.tail === 'bushy' || P.tail === 'snake') tailOf(C, P, cx + 2, by - bh * 0.6 + bob, 1, wag * 0.5, 'down');
    C.ell(cx, by + bob, bw, bh * 0.98, 'a', {});
    C.anchor('body', { x: cx, y: by + bob, rx: bw, ry: bh });
    if (P.belly) C.ell(cx, by + bh * 0.5 + bob, bw * 0.55, bh * 0.5, 'b', { over: true, edge: false, shade: 'flat', tone: 2 });
    if (P.mane && !P.maneHead) C.ell(cx, by - bh * 0.45 + bob, bw * 0.95, bh * 0.75, 'c', {});
    for (const s of [-1, 1]) leg(C, cx + s * gapF, legTop, lw, 'a', { swing: 0, foot, ground: GROUND + lift(s < 0 ? 0 : 1) });
    C.anchor('back', { x: cx, y: by - bh + bob, w: bw * 1.6 });
    drawHead();
  } else {
    drawHead();
    if (P.wings) for (const s of [-1, 1]) wing(C, cx + s * bw * 0.4, by - bh * 0.4 + bob, s, P.wingSpan ?? 7, P.wingMat || 'c', { kind: P.wings, flap: p.flap });
    for (const s of [-1, 1]) leg(C, cx + s * gapR, legTop - 1, lw * 0.9, 'a', { swing: 0, ds: -1, foot, ground: GROUND - 0.8 });
    C.ell(cx, by + bob + 0.4, bw, bh * 0.98, 'a', {});
    C.anchor('body', { x: cx, y: by + bob, rx: bw, ry: bh });
    if (P.mane && !P.maneHead) C.ell(cx, by - bh * 0.4 + bob, bw * 0.9, bh * 0.6, 'c', {});
    if (P.spikes) for (let k = -1; k <= 1; k++) C.tri(cx + k * 2.6 - 1.1, by - bh * 0.6 + bob, cx + k * 2.6 + 1.1, by - bh * 0.6 + bob, cx + k * 2.6, by - bh * 0.6 - 2.4 + bob, P.spikeMat || 'c');
    for (const s of [-1, 1]) leg(C, cx + s * gapF, legTop + 0.6, lw, 'a', { swing: 0, foot, ground: GROUND + lift(s < 0 ? 0 : 1) });
    tailOf(C, P, cx, by + bh * 0.45 + bob, 0.4, wag, 'up');
    C.anchor('back', { x: cx, y: by - bh + bob, w: bw * 1.6 });
  }
}
