// Pecas reaproveitadas pelos planos de corpo (pernas, orelhas, chifres, asas,
// caudas, bocas). Tudo em unidades de projeto (32x32, chao em y=30).
import { GROUND } from './raster.js';

// Perna simples: do quadril ate o chao, com balanco do passo e pe/casco.
// swing: -1..1 (positivo = para frente, ou seja, para a ESQUERDA na vista lateral).
export function leg(C, x, yTop, w, m, o = {}) {
  const swing = o.swing || 0;
  const stride = o.stride ?? 1.6;
  const lift = swing > 0.5 ? C.u : 0; // pe que avanca sai do chao 1px
  const fx = x - swing * stride * (o.dir ?? 1);
  const fy = (o.ground ?? GROUND) - 0.4 - lift;
  C.line(x, yTop, fx, fy - (o.foot ? w * 0.3 : 0), w, m, { w1: w * (o.taper ?? 0.85), ds: o.ds || 0, shade: 'flat', tone: o.tone ?? 2, edge: o.edge ?? !o.ds });
  // brilho na borda esquerda da perna (luz do alto-esquerda)
  if (w >= 2.2 * C.u) C.line(x - w * 0.3, yTop + 0.5, fx - w * 0.3, fy - w * 0.4, C.u * 0.6, m, { shade: 'flat', tone: (o.tone ?? 2) + 1 + (o.ds || 0), over: true, edge: false, thin: true, as: undefined });
  if (o.foot) C.ell(fx - (o.toe ?? 0.5) * (o.dir ?? 1), fy - w * 0.25, w * 0.62, w * 0.42, o.foot, { ds: o.ds || 0, edge: false });
  return { x: fx, y: fy };
}

// Orelha triangular/arredondada/longa. side: -1 esquerda, 1 direita (na vista frontal).
export function ear(C, x, y, kind, size, m, o = {}) {
  const s = size, side = o.side || 0, inner = o.inner;
  if (kind === 'none') return;
  if (kind === 'round') {
    C.circ(x, y, s * 0.55, m, { ds: o.ds });
    if (inner) C.circ(x + side * 0.2, y + 0.2, s * 0.3, inner, { shade: 'flat', tone: 2, edge: false });
  } else if (kind === 'long') { // coelho/morcego
    C.line(x, y + s * 0.3, x + side * s * 0.35, y - s * 1.1, s * 0.7, m, { w1: s * 0.45, ds: o.ds });
    if (inner) C.line(x, y + s * 0.1, x + side * s * 0.3, y - s * 0.8, s * 0.3, inner, { shade: 'flat', tone: 2, edge: false });
  } else if (kind === 'droop') { // javali/cao: caida para o lado
    C.line(x, y, x + side * s * 0.9, y + s * 0.4, s * 0.7, m, { w1: s * 0.35, ds: o.ds });
  } else if (kind === 'fin') { // barbatana de peixe/tritao
    C.tri(x, y - s * 0.4, x + side * s * 1.1, y - s * 0.6, x, y + s * 0.6, m, { ds: o.ds });
  } else { // 'point'
    const tip = [x + side * s * 0.35 + (o.lean || 0), y - s * 1.05];
    C.tri(x - s * 0.5, y + s * 0.2, x + s * 0.5, y + s * 0.2, tip[0], tip[1], m, { ds: o.ds });
    if (inner) C.tri(x - s * 0.2, y + s * 0.1, x + s * 0.2, y + s * 0.1, tip[0] * 0.7 + x * 0.3, tip[1] * 0.75 + y * 0.25, inner, { shade: 'flat', tone: 2, edge: false });
  }
}

// Chifre curvo: base -> ponta, curvando para `bend` (unidades) no meio.
export function horn(C, x, y, dx, dy, w, m, o = {}) {
  const bend = o.bend ?? 0;
  const mx = x + dx * 0.5 + (o.bx ?? bend), my = y + dy * 0.5 + (o.by ?? 0);
  C.curve([[x, y], [mx, my], [x + dx, y + dy]], w, Math.max(0.6, w * 0.25), m, { shade: 'relief', ds: o.ds });
}

// Asa membranosa (morcego/demonio) ou de penas. Vista frontal: abre para `side`.
// flap: 0..1 (0 = aberta para cima, 1 = baixada).
export function wing(C, x, y, side, span, m, o = {}) {
  const flap = o.flap ?? 0.3;
  const kind = o.kind || 'membrane';
  const up = (1 - flap) * span * 0.75 - span * 0.15;
  const tipX = x + side * span, tipY = y - up;
  if (kind === 'feather') {
    const pts = [[x, y - span * 0.18], [tipX * 0.55 + x * 0.45, tipY - span * 0.2], [tipX, tipY], [tipX - side * span * 0.12, tipY + span * 0.32],
      [x + side * span * 0.62, y + span * 0.3], [x + side * span * 0.3, y + span * 0.4], [x, y + span * 0.25]];
    C.poly(pts, m, { ds: o.ds });
    // pontas das penas (linha de tom escuro)
    for (let k = 1; k <= 3; k++) {
      const t = k / 4;
      const fx = x + side * span * (0.3 + t * 0.6), fy = y + span * (0.38 - t * 0.12) - up * t * 0.8;
      C.line(fx, fy, fx - side * span * 0.08, fy - span * 0.22, C.u, m, { shade: 'flat', tone: 1, edge: false, over: true });
    }
  } else if (kind === 'insect') {
    C.ell(x + side * span * 0.55, y - up * 0.6, span * 0.55, span * 0.38, m, { rot: side * -0.5, shade: 'flat', tone: 3, glow: o.glow });
    C.ell(x + side * span * 0.42, y + span * 0.28, span * 0.36, span * 0.24, m, { rot: side * 0.4, shade: 'flat', tone: 2, glow: o.glow });
  } else {
    // membrana: dedos (ossos) + pele recortada em arcos
    const pts = [[x, y - span * 0.12], [tipX, tipY], [x + side * span * 0.85, y + span * 0.12 - up * 0.3],
      [x + side * span * 0.62, y + span * 0.02 - up * 0.1], [x + side * span * 0.5, y + span * 0.3 - up * 0.2], [x + side * span * 0.3, y + span * 0.12], [x + side * span * 0.15, y + span * 0.32], [x, y + span * 0.22]];
    C.poly(pts, m, { ds: o.ds, base: 2 });
    C.line(x, y - span * 0.1, tipX, tipY, Math.max(C.u, span * 0.1), o.bone || m, { ds: (o.ds || 0) + 1, edge: false });
  }
}

// Cauda como curva com N pontos; wag desloca a ponta.
export function tail(C, pts, w0, w1, m, o = {}) {
  C.curve(pts, w0, w1, m, { shade: o.shade || 'relief', ds: o.ds, glow: o.glow });
  if (o.tuft) C.circ(pts[pts.length - 1][0], pts[pts.length - 1][1], o.tuftR || w0 * 0.9, o.tuft, {});
}

// Boca aberta/fechada; dentes opcionais. Vista frontal.
export function mouth(C, x, y, w, o = {}) {
  const open = o.open ? (o.h || w * 0.45) : 0;
  if (open) {
    C.ell(x, y + open * 0.35, w / 2, open / 2 + C.u * 0.4, o.m || 'm', { shade: 'flat', tone: 1, edge: false });
    if (o.teeth) {
      C.dot(x - w * 0.28, y, 'w', 3, {});
      C.dot(x + w * 0.22, y, 'w', 3, {});
    }
  } else {
    C.line(x - w / 2, y, x + w / 2, y + (o.smile || 0), C.u * 0.9, o.m || 'm', { shade: 'flat', tone: 1, edge: false, thin: true });
    if (o.fangs) { C.dot(x - w * 0.3, y + C.u, 'w', 3, {}); C.dot(x + w * 0.3 - C.u, y + C.u, 'w', 3, {}); }
  }
}

// Par de olhos na vista frontal (atalho para o espelhamento exato do raster).
export function eyes(C, x, y, gap, o = {}) { C.eyePair(x, y, gap, o); }
