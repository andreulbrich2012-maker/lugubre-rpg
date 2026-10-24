// Plano VOADOR (morcego, corvo, coruja, mariposa, fada, fenix, querubim).
// Paira acima do chao: a sombra fica fixa e menor (ancora 'float') e o bater
// de asas e a animacao principal (parado tambem bate, mais devagar).
import { GROUND } from '../raster.js';
import { wing, ear, mouth } from '../kit.js';

export function flyer(C, P, p) {
  const kind = P.kind || 'bat';
  const r = P.body ?? 5.2;
  const alt = P.alt ?? 9; // altura do corpo acima do chao
  const hover = p.moving ? (p.f % 2 ? -1 : 0) : (p.bob ? 1 : 0);
  const cy = GROUND - alt - r * 0.4 + hover * C.u;
  const view = p.view;
  const wk = P.wings || (kind === 'bat' ? 'membrane' : kind === 'moth' || kind === 'fairy' ? 'insect' : 'feather');
  const span = P.span ?? 8;
  const flap = p.atk ? 0.95 : p.flap;
  const wm = P.wingMat || 'c';
  C.anchor('float', { x: 16, w: r * 1.1 });

  if (view === 'side') {
    const cx = 17;
    if (P.tailFeathers) C.poly([[cx + r * 0.6, cy + r * 0.2], [cx + r * 2.2, cy + r * 1.3], [cx + r * 1.5, cy + r * 1.5], [cx + r * 0.4, cy + r * 0.8]], P.tailMat || wm, {});
    if (P.flameTail) C.curve([[cx + r * 0.6, cy + r * 0.2], [cx + r * 1.8, cy + r * 0.6], [cx + r * 2.6, cy + r * 0.2 - hover]], r * 0.7, 0.8, 'g', { glow: true, shade: 'vgrad', tone: 4 });
    wing(C, cx + 1, cy - r * 0.3, 1, span * 0.9, wm, { kind: wk, flap, ds: -1, glow: P.wingGlow });
    if (kind === 'cherub') C.circ(cx - 0.5, cy, r * 1.05, 'a', {});
    else C.ell(cx, cy, r * (P.long ?? 1.1), r * 0.9, 'a', {});
    if (P.belly) C.ell(cx - r * 0.25, cy + r * 0.35, r * 0.7, r * 0.5, 'b', { over: true, edge: false });
    // cabeca: pequena a frente (passaros) ou o proprio corpo (morcego, coruja)
    let hx = cx - r * 0.55, hy = cy - r * 0.25;
    if (kind === 'bird' || kind === 'phoenix') {
      hx = cx - r * 0.95; hy = cy - r * 0.75;
      C.circ(hx, hy, r * 0.62, 'a', {});
      C.tri(hx - r * 0.5, hy - 0.3, hx - r * 0.5, hy + 1.3, hx - r * 0.5 - 2.4, hy + 0.6, P.beakMat || 'h', {});
      if (P.crest) C.tri(hx, hy - r * 0.5, hx + 2, hy - r * 0.4, hx + 2.4, hy - r * 0.5 - 2.6, P.crestMat || wm, {});
      C.eye(hx - r * 0.2, hy - 0.4, { glow: P.eyeGlow, m: P.eyeMat });
    } else if (kind === 'owl') {
      for (const s of [-1, 1]) if (s > 0) C.tri(hx + 1.4, hy - r * 0.6, hx + 3, hy - r * 0.6, hx + 2.6, hy - r * 0.6 - 2.4, 'a', {});
      C.ell(hx - r * 0.15, hy, r * 0.45, r * 0.55, 'b', { edge: false });
      C.eye(hx - r * 0.25, hy - 0.2, { glow: P.eyeGlow, m: P.eyeMat, n: C.S >= 24 ? 2 : 1 });
      C.tri(hx - r * 0.55, hy + 0.6, hx - r * 0.55, hy + 1.8, hx - r * 0.55 - 1.3, hy + 1.4, P.beakMat || 'h', {});
    } else if (kind === 'bat') {
      ear(C, hx + r * 0.3, hy - r * 0.6, 'long', P.earSize ?? 2.8, 'a', { side: 1, inner: 'b' });
      C.eye(hx - r * 0.35, hy, { glow: P.eyeGlow, m: P.eyeMat });
      if (p.atk) C.dot(hx - r * 0.6, hy + r * 0.4, 'm', 0, { n: 2, h: 1 });
      else C.dot(hx - r * 0.55, hy + r * 0.45, 'w', 3, {});
    } else if (kind === 'moth' || kind === 'fairy') {
      hx = cx - r * 0.9; hy = cy - r * 0.6;
      C.circ(hx, hy, r * 0.6, kind === 'fairy' ? 'b' : 'a', {});
      if (kind === 'fairy' && P.hair) C.ell(hx + r * 0.25, hy - r * 0.3, r * 0.6, r * 0.45, P.hair, {});
      C.curve([[hx, hy - r * 0.5], [hx - 0.8, hy - r * 0.5 - 1.6], [hx - 2, hy - r * 0.5 - 2.6]], C.u, C.u, kind === 'fairy' ? 'g' : 'h', { thin: true, glow: kind === 'fairy' });
      C.eye(hx - r * 0.3, hy, { glow: P.eyeGlow, m: P.eyeMat, small: true });
    } else if (kind === 'cherub') {
      C.eye(hx - r * 0.4, hy, { glow: P.eyeGlow, m: P.eyeMat });
      if (P.hair) C.ell(cx, cy - r * 0.55, r * 0.95, r * 0.55, P.hair, { clip: (x, y) => y < cy - r * 0.15 });
    }
    if (P.halo) C.ring(hx + 0.5, cy - r * 1.4, r * 0.7, Math.max(C.u, r * 0.25), C.u * 1.1, 'g', { glow: true, tone: 4 });
    if (P.feet) C.line(cx + 0.5, cy + r * 0.8, cx, cy + r * 1.4, C.u * 1.2, 'h', { edge: false });
    wing(C, cx - 0.5, cy - r * 0.2, 1, span, wm, { kind: wk, flap: Math.min(1, flap + 0.15), glow: P.wingGlow });
    C.anchor('head', { x: hx, y: hy, r: r * 0.7 });
    C.anchor('body', { x: cx, y: cy, rx: r, ry: r * 0.9 });
    C.anchor('back', { x: cx, y: cy - r * 0.9, w: r * 1.4 });
    C.anchor('front', { x: cx - r * 1.6, y: cy });
    return;
  }

  const front = view === 'down';
  const cx = 16;
  if (front && P.flameTail) C.curve([[cx, cy + r * 0.5], [cx + 1.5, cy + r * 1.5], [cx + 0.5, cy + r * 2.3]], r * 0.8, 1, 'g', { glow: true, shade: 'vgrad', tone: 4 });
  if (front && P.tailFeathers) C.poly([[cx - r * 0.6, cy + r * 0.4], [cx + r * 0.6, cy + r * 0.4], [cx + r * 0.9, cy + r * 1.6], [cx - r * 0.9, cy + r * 1.6]], P.tailMat || wm, {});
  const wings = () => { for (const s of [-1, 1]) wing(C, cx + s * r * 0.55, cy - r * 0.25, s, span, wm, { kind: wk, flap, glow: P.wingGlow }); };
  if (front) wings();
  if (kind === 'cherub') C.circ(cx, cy, r * 1.05, 'a', {});
  else C.ell(cx, cy, r * (kind === 'owl' ? 1.0 : 0.95), r, 'a', {});
  if (P.belly && front) C.ell(cx, cy + r * 0.35, r * 0.6, r * 0.55, 'b', { over: true, edge: false });
  if (!front && P.flameTail) C.curve([[cx, cy + r * 0.5], [cx + 1.5, cy + r * 1.5], [cx + 0.5, cy + r * 2.3]], r * 0.8, 1, 'g', { glow: true, shade: 'vgrad', tone: 4 });
  let hx = cx, hy = cy - r * 0.2;
  if (kind === 'bird' || kind === 'phoenix' || kind === 'moth' || kind === 'fairy') {
    hy = cy - r * 1.0;
    C.circ(hx, hy, r * 0.62, kind === 'fairy' ? 'b' : 'a', {});
    if (kind === 'fairy' && P.hair) C.ell(hx, hy - r * 0.3, r * 0.68, r * 0.42, P.hair, {});
    if (P.crest) C.tri(hx - 1, hy - r * 0.5, hx + 1, hy - r * 0.5, hx + 0.5, hy - r * 0.5 - 2.8, P.crestMat || wm, {});
    if (kind === 'moth' || kind === 'fairy') for (const s of [-1, 1]) C.curve([[hx + s * 0.8, hy - r * 0.5], [hx + s * 1.6, hy - r * 0.5 - 1.6], [hx + s * 2.6, hy - r * 0.5 - 2.4]], C.u, C.u, kind === 'fairy' ? 'g' : 'h', { thin: true, glow: kind === 'fairy' });
    if (front) {
      C.eyePair(hx, hy - 0.2, r * 0.3, { glow: P.eyeGlow, m: P.eyeMat, small: kind !== 'bird' && kind !== 'phoenix' });
      if (kind === 'bird' || kind === 'phoenix') C.tri(hx - 1, hy + 0.8, hx + 1, hy + 0.8, hx, hy + 2.8, P.beakMat || 'h', {});
    }
  } else if (kind === 'owl') {
    for (const s of [-1, 1]) C.tri(hx + s * r * 0.4, hy - r * 0.55, hx + s * r * 0.95, hy - r * 0.5, hx + s * r * 0.85, hy - r * 0.5 - 2.6, 'a', {});
    if (front) {
      for (const s of [-1, 1]) C.circ(hx + s * r * 0.4, hy, r * 0.42, 'b', { edge: false });
      C.eyePair(hx, hy, r * 0.4, { glow: P.eyeGlow, m: P.eyeMat, n: C.S >= 24 ? 2 : 1 });
      C.tri(hx - 0.8, hy + 1, hx + 0.8, hy + 1, hx, hy + 2.6, P.beakMat || 'h', {});
    }
  } else if (kind === 'bat') {
    for (const s of [-1, 1]) ear(C, hx + s * r * 0.5, hy - r * 0.62, 'long', P.earSize ?? 2.8, 'a', { side: s, inner: front ? 'b' : null });
    if (front) {
      C.eyePair(hx, hy - 0.2, r * 0.38, { glow: P.eyeGlow, m: P.eyeMat });
      mouth(C, hx, hy + r * 0.45, r * 0.5, { open: p.atk, teeth: p.atk, fangs: !p.atk });
    }
  } else if (kind === 'cherub') {
    if (P.hair) C.ell(cx, cy - r * 0.5, r * 1.05, r * 0.6, P.hair, { clip: (x, y) => y < cy - r * (front ? 0.2 : -0.6) });
    if (front) { C.eyePair(hx, hy + r * 0.15, r * 0.4, { glow: P.eyeGlow, m: P.eyeMat }); mouth(C, hx, hy + r * 0.6, r * 0.3, { open: p.atk }); }
  }
  if (P.halo) C.ring(hx, (kind === 'cherub' || kind === 'bat' || kind === 'owl' ? cy - r : hy - r * 0.6) - r * 0.45, r * 0.75, Math.max(C.u, r * 0.25), C.u * 1.1, 'g', { glow: true, tone: 4 });
  if (P.feet && front) for (const s of [-1, 1]) C.line(cx + s * 1.2, cy + r * 0.85, cx + s * 1.4, cy + r * 1.35, C.u * 1.2, 'h', { edge: false });
  if (!front) wings();
  C.anchor('head', { x: hx, y: hy, r: r * 0.7 });
  C.anchor('body', { x: cx, y: cy, rx: r, ry: r });
  C.anchor('back', { x: cx, y: cy - r, w: r * 1.4 });
  C.anchor('front', { x: cx, y: cy + r * 0.5 });
}
