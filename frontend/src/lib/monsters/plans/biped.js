// Plano BIPEDE (goblin, diabrete, demonio, esqueleto, golem, ent, gargula, anjo,
// autômato, tritao, carrasco...). Cabeca grande, tronco curto, bracos que balancam.
// Tronco 'robe' dispensa pernas (espectro, moira, peregrino de manto).
import { GROUND } from '../raster.js';
import { leg, ear, horn, wing, mouth } from '../kit.js';

function weapon(C, P, x, y, p, side, view) {
  const k = P.weapon;
  if (!k || k === 'none' || k === 'claws') return;
  const up = p.atk; // ataque: arma erguida acima da cabeca
  const m = P.weaponMat || 'h';
  const dirX = view === 'side' ? -1 : side;
  if (k === 'club') {
    const tx = up ? x + dirX * 1.5 : x + dirX * 1.2, ty = up ? y - 10 : y + 5.5;
    C.line(x, y, tx, ty, 1.4, 'c', { w1: 2.8 });
    C.circ(tx, ty, 1.8, 'c', {});
  } else if (k === 'axe' || k === 'scythe') {
    const tx = up ? x + dirX * 1 : x, ty = up ? y - 11 : y - 8;
    C.line(x, y + 3, tx, ty, 1.2, 'c', {});
    if (k === 'axe') C.poly([[tx, ty], [tx + dirX * 3.6, ty - 1.2], [tx + dirX * 3.6, ty + 3.2], [tx, ty + 2.4]], m, {});
    else C.curve([[tx, ty], [tx + dirX * 3, ty - 1], [tx + dirX * 6, ty + 2.5]], 1.6, 0.7, m, {});
  } else if (k === 'sword' || k === 'spear' || k === 'staff') {
    const len = k === 'sword' ? 8 : 12;
    const tx = up ? x + dirX * 1.5 : x + dirX * 0.4, ty = up ? y - len : y - len * 0.75;
    C.line(x, y + (k === 'sword' ? 0 : 3), tx, ty, k === 'sword' ? 1.6 : 1.2, k === 'sword' ? m : 'c', { w1: k === 'sword' ? 1.0 : 1.2 });
    if (k === 'sword') C.line(x - 1.6, y - 0.6, x + 1.6, y - 0.6, 1, 'c', { shade: 'flat', tone: 2 });
    if (k === 'spear') C.tri(tx - 1.1, ty + 0.5, tx + 1.1, ty + 0.5, tx, ty - 2.8, m, {});
    if (k === 'staff') C.circ(tx, ty - 0.6, 1.6, 'g', { glow: true, base: 3 });
  } else if (k === 'thread') { // moira: fuso e fio do destino
    C.ell(x, y + 0.5, 1.0, 2.0, 'c', {});
    C.curve([[x, y + 2], [x + dirX * 2, y + 5], [x + dirX * 0.5, y + 8]], C.u * 0.9, C.u * 0.9, 'g', { glow: true, thin: true });
  } else if (k === 'lantern') {
    C.line(x, y, x, y + 2.5, C.u, 'h', { thin: true });
    C.ell(x, y + 4, 1.6, 2.0, 'g', { glow: true, base: 3 });
  } else if (k === 'shield') {
    C.ell(x + dirX * 0.5, y - 1, 3, 3.6, m, {});
    C.circ(x + dirX * 0.5, y - 1, 1, 'c', { shade: 'flat', tone: 3 });
  }
}

function headOf(C, P, p, hx, hy, hr, view) {
  const kind = P.headKind || 'round';
  const front = view === 'down', side = view === 'side';
  const fx = side ? -1 : 0; // deslocamento do rosto na vista lateral
  // atras da cabeca: orelhas, chifres, capuz
  if (P.ears && P.ears !== 'none') {
    if (side) ear(C, hx + hr * 0.4, hy - hr * 0.1, P.ears === 'goblin' ? 'point' : P.ears, P.earSize ?? 3, 'a', { side: 1, lean: 2.2 });
    else for (const s of [-1, 1]) {
      if (P.ears === 'goblin') C.tri(hx + s * hr * 0.8, hy - hr * 0.35, hx + s * hr * 0.8, hy + hr * 0.25, hx + s * (hr + (P.earSize ?? 3.4)), hy - hr * 0.55, 'a', {});
      else ear(C, hx + s * hr * 0.75, hy - hr * 0.55, P.ears, P.earSize ?? 2.6, 'a', { side: s, inner: front ? 'b' : null });
    }
  }
  if (P.horns) {
    const sz = P.hornSize ?? 1;
    const sides = side ? [1] : [-1, 1];
    for (const s of sides) {
      const bx = side ? hx + 0.6 : hx + s * hr * 0.55, byy = hy - hr * 0.6;
      if (P.horns === 'ram') horn(C, bx, byy, s * 3.4 * sz, 2.4 * sz, 2.2 * sz, 'h', { bx: s * 2.6 * sz, by: -2.8 * sz });
      else if (P.horns === 'small') C.tri(bx - 0.9, byy + 0.6, bx + 0.9, byy + 0.6, bx + s * 0.6, byy - 2.6 * sz, 'h', {});
      else horn(C, bx, byy, s * 2.2 * sz, -4.2 * sz, 2.0 * sz, 'h', { bx: s * 1.8 * sz, by: 0.4 });
    }
  }
  if (P.canopy) { // ent: copa de folhas atras e acima da cabeca
    const k = P.canopy;
    for (const [dx, dy, rr] of [[-0.75, -0.55, 0.62], [0.75, -0.55, 0.62], [0, -1.0, 0.75], [side ? 0.6 : 0, -0.2, 0.7]]) C.circ(hx + dx * hr * k, hy + dy * hr * k, hr * rr * k, 'c', {});
  }
  if (kind === 'hood') {
    C.ell(hx, hy - 0.2, hr * 1.08, hr * 1.02, P.hoodMat || 'b', {});
    C.tri(hx - hr * 0.3, hy - hr * 0.8, hx + hr * 0.6, hy - hr * 0.85, hx + (side ? hr * 0.9 : 0), hy - hr * 1.5, P.hoodMat || 'b', {});
    if (!(view === 'up')) {
      // rosto em sombra funda dentro do capuz
      if (P.faceMat) C.ell(hx + fx * hr * 0.3, hy + hr * 0.15, hr * (side ? 0.45 : 0.62), hr * 0.62, P.faceMat, { edge: false, light: 0.1 });
      else C.ell(hx + fx * hr * 0.25, hy + hr * 0.15, hr * (side ? 0.5 : 0.7), hr * 0.62, 'd', { shade: 'flat', tone: 0, edge: false });
      if (P.faceMat && p.atk) C.ell(hx + fx * hr * 0.3, hy + hr * 0.45, hr * 0.22, hr * 0.2, 'd', { shade: 'flat', tone: 0, edge: false });
      if (P.eyes !== 'none') {
        if (side) C.eye(hx - hr * 0.45, hy + hr * 0.05, { m: 'g', glow: true, small: true });
        else C.eyePair(hx, hy + hr * 0.08, hr * 0.32, { m: 'g', glow: true, small: true });
      }
    }
    C.anchor('head', { x: hx, y: hy, r: hr });
    if (P.halo) C.ring(hx, hy - hr * 1.45, hr * 0.8, Math.max(C.u, hr * 0.26), C.u * 1.1, 'g', { glow: true, tone: 4 });
    return;
  }
  if (kind === 'mushroom') { // fungo andante: chapeu largo com pintas
    C.ell(hx, hy + 0.8, hr * 0.8, hr * 0.8, 'b', {});
    if (!side && view !== 'up') { C.eyePair(hx, hy + hr * 0.5, hr * 0.32, {}); mouth(C, hx, hy + hr * 0.95, 1.6, { open: p.atk }); }
    else if (side) C.eye(hx - hr * 0.5, hy + hr * 0.5, {});
    C.ell(hx, hy - hr * 0.35, hr * 1.55, hr * 0.85, 'c', { clip: (x, y) => y < hy + hr * 0.15 });
    for (const [dx, dy] of [[-0.7, -0.6], [0.45, -0.85], [0.95, -0.3], [-0.1, -1.0]]) C.circ(hx + dx * hr, hy + dy * hr * 0.75, hr * 0.17, 'w', { over: true, shade: 'flat', tone: 3 });
    C.anchor('head', { x: hx, y: hy - hr * 0.4, r: hr * 1.3 });
    return;
  }
  if (P.antenna) { // automato: antena com luz na ponta
    C.line(hx + (side ? 0.6 : 0), hy - hr * 0.7, hx + (side ? 1.4 : 0.8), hy - hr * 1.5, C.u, 'h', { thin: true, edge: false });
    C.circ(hx + (side ? 1.4 : 0.8), hy - hr * 1.6, 0.9, 'g', { glow: true, shade: 'flat', tone: 4 });
  }
  const headMat = P.headMat || 'a';
  if (kind === 'block') C.poly([[hx - hr, hy - hr * 0.8], [hx + hr, hy - hr * 0.8], [hx + hr * 0.9, hy + hr * 0.85], [hx - hr * 0.9, hy + hr * 0.85]], headMat, { base: 2.3 });
  else if (kind === 'skull') {
    C.ell(hx, hy - hr * 0.1, hr, hr * 0.88, headMat, {});
    C.ell(hx + fx * hr * 0.2, hy + hr * 0.55, hr * 0.62, hr * 0.42, headMat, { base: 1.6, edge: false });
  } else if (kind === 'beast') { // cabeca com focinho (lobisomem, minotauro, gnoll)
    C.ell(hx, hy, hr, hr * 0.9, headMat, {});
  } else C.ell(hx, hy, hr, hr * (P.headSq ?? 0.92), headMat, {});
  C.anchor('head', { x: hx, y: hy, r: hr });
  if (P.hair) {
    if (view === 'up') C.ell(hx, hy - hr * 0.1, hr * 1.02, hr * 0.92, P.hair, {});
    else C.ell(hx + (side ? hr * 0.3 : 0), hy - hr * 0.55, hr * (side ? 0.85 : 1.04), hr * 0.5, P.hair, { clip: (x, y) => y < hy - hr * 0.05 });
  }
  if (view === 'up') return;
  // rosto
  const eyeY = hy + (P.eyeY ?? 0) * hr;
  if (kind === 'skull') {
    // orbitas fundas (2px) com brilho opcional; nariz em ponto; dentes em linha
    if (side) {
      C.ell(hx - hr * 0.45, eyeY, hr * 0.26, hr * 0.26, 'd', { shade: 'flat', tone: 0, edge: false });
      if (P.eyeGlow) C.eye(hx - hr * 0.45, eyeY, { m: 'g', glow: true, small: true });
      C.line(hx - hr * 0.95, hy + hr * 0.62, hx - hr * 0.3, hy + hr * 0.62, C.u, 'd', { shade: 'flat', tone: 1, thin: true, over: true });
    } else {
      for (const s of [-1, 1]) C.ell(hx + s * hr * 0.42, eyeY, hr * 0.27, hr * 0.27, 'd', { shade: 'flat', tone: 0, edge: false });
      if (P.eyeGlow) C.eyePair(hx, eyeY, hr * 0.42, { m: 'g', glow: true, small: true });
      C.dot(hx, hy + hr * 0.32, 'd', 1, {});
      C.line(hx - hr * 0.4, hy + hr * 0.66, hx + hr * 0.4, hy + hr * 0.66, C.u, 'd', { shade: 'flat', tone: 1, thin: true, over: true });
    }
    return;
  }
  if (P.eyes === 'none') { // sem rosto (peregrino sem face)
    if (p.atk) mouth(C, hx + fx * hr * 0.3, hy + hr * 0.4, hr * 0.7, { open: true });
    return;
  }
  if (P.eyes === 'cyclops' || P.eyes === 'visor') {
    if (P.eyes === 'visor') C.rect(hx - hr * (side ? 1 : 0.75), eyeY - 0.7, hr * (side ? 1.1 : 1.5), 1.6, 'd', { shade: 'flat', tone: 0, edge: false });
    C.eye(hx + fx * hr * 0.45, eyeY, { m: P.eyeMat || 'g', glow: true });
  } else if (side) C.eye(hx - hr * 0.5, eyeY, { glow: P.eyeGlow, m: P.eyeMat });
  else C.eyePair(hx, eyeY, hr * 0.42, { glow: P.eyeGlow, m: P.eyeMat });
  if (kind === 'beast' || P.snout) {
    const sx = hx + (side ? -hr * 0.9 : 0), sy = hy + hr * 0.5;
    C.ell(sx, sy, side ? hr * 0.6 : hr * 0.5, hr * 0.36, P.snoutMat || 'b', {});
    C.dot(sx + (side ? -hr * 0.45 : 0), sy - hr * 0.2, 'd', 1, { n: side ? 1 : 2, center: true });
    if (p.atk) C.ell(sx, sy + hr * 0.35, hr * 0.35, 0.8, 'm', { shade: 'flat', tone: 1, edge: false });
  } else if (P.beak) {
    if (side) C.tri(hx - hr * 0.8, eyeY + 0.4, hx - hr * 0.8, eyeY + 2.4, hx - hr * 1.6, eyeY + 1.6, P.beakMat || 'h', {});
    else C.tri(hx - 1.1, eyeY + 0.8, hx + 1.1, eyeY + 0.8, hx, eyeY + 3, P.beakMat || 'h', {});
  } else if (!P.noMouth) {
    if (side) C.dot(hx - hr * 0.6, hy + hr * 0.45, 'm', p.atk ? 0 : 1, { n: p.atk ? 2 : 1, h: p.atk ? 2 : 1 });
    else mouth(C, hx, hy + hr * 0.45, hr * 0.55, { open: p.atk, teeth: p.atk || P.teeth, fangs: P.fangs });
  }
  if (P.halo) C.ring(hx, hy - hr * 1.2, hr * 0.8, Math.max(C.u, hr * 0.26), C.u * 1.1, 'g', { glow: true, tone: 4 });
  if (P.beard) C.tri(hx - hr * 0.6 + (side ? -1 : 0), hy + hr * 0.55, hx + hr * 0.6 + (side ? -1 : 0), hy + hr * 0.55, hx + (side ? -hr * 0.5 : 0), hy + hr * 1.6, P.beard, {});
}

export function biped(C, P, p) {
  const hr = P.head ?? 5.4, bw = P.bodyW ?? 4.6, bh = P.bodyH ?? 6.4, ll = P.leg ?? 4.6, lw = P.legW ?? 2.4;
  const aw = P.armW ?? 2, al = P.arm ?? 5.4;
  const torso = P.torso || 'round';
  const bob = p.bobU;
  const robe = torso === 'robe';
  const hipY = GROUND - (robe ? 0 : ll) + (P.lift ?? 0);
  const ty = hipY - bh * 0.5 + bob; // centro do tronco
  const shY = ty - bh * 0.32; // ombros
  const hy = shY - hr * (P.neck ?? 0.72) + (P.hunch ? 1.2 : 0);
  const view = p.view;
  const bodyMat = P.bodyMat || 'b';
  const swing = p.swing;
  const lift = (k) => (p.moving && ((k === 0 && p.f === 0) || (k === 1 && p.f === 2)) ? -C.u : 0);

  const drawTorso = (cx) => {
    if (torso === 'block') C.poly([[cx - bw, ty - bh * 0.5], [cx + bw, ty - bh * 0.5], [cx + bw * 0.8, ty + bh * 0.5], [cx - bw * 0.8, ty + bh * 0.5]], bodyMat, { base: 2.2 });
    else if (torso === 'robe') {
      const w0 = bw * 0.8, w1 = bw * 1.25;
      const hem = GROUND - 0.3 + (p.moving ? (p.f % 2 ? -0.5 : 0) : 0);
      const pts = [[cx - w0, shY - 0.6], [cx + w0, shY - 0.6], [cx + w1, hem]];
      // barra irregular (farrapos) para espectros
      const n = P.tatters ? 6 : 1;
      for (let k = n; k >= 0; k--) pts.push([cx - w1 + (2 * w1 * k) / n, hem - (P.tatters && k % 2 ? 1.1 : 0)]);
      C.poly(pts, bodyMat, { base: 2 });
      C.line(cx - w0 * 0.5, shY + 1, cx - w1 * 0.55, hem - 1, C.u, bodyMat, { shade: 'flat', tone: 3, over: true, thin: true });
      C.line(cx + w0 * 0.4, shY + 1, cx + w1 * 0.45, hem - 1, C.u, bodyMat, { shade: 'flat', tone: 1, over: true, thin: true });
    } else if (torso === 'trunk') {
      C.poly([[cx - bw * 0.8, ty - bh * 0.6], [cx + bw * 0.8, ty - bh * 0.6], [cx + bw * 1.05, ty + bh * 0.55], [cx - bw * 1.05, ty + bh * 0.55]], bodyMat, { base: 2 });
      for (const dx of [-0.4, 0.3]) C.line(cx + dx * bw, ty - bh * 0.4, cx + dx * bw * 1.2, ty + bh * 0.4, C.u, bodyMat, { shade: 'flat', tone: 1, over: true, thin: true });
    } else if (torso === 'ribs') {
      C.line(cx, ty - bh * 0.5, cx, ty + bh * 0.5, 1.4, 'a', {});
      for (let k = 0; k < 3; k++) C.ell(cx, ty - bh * 0.3 + k * 1.7, bw * (0.85 - k * 0.12), 0.75, 'a', { shade: 'flat', tone: 3 - (k > 1 ? 1 : 0) });
      C.ell(cx, ty + bh * 0.48, bw * 0.6, 1.1, 'a', {});
    } else C.ell(cx, ty, bw, bh * 0.55, bodyMat, {});
    if (P.cracks) for (const [a, b2, c2, d2] of [[-0.5, -0.3, -0.1, 0.1], [0.2, -0.4, 0.5, 0.0], [-0.1, 0.1, 0.25, 0.4]]) C.line(cx + a * bw, ty + b2 * bh, cx + c2 * bw, ty + d2 * bh, C.u, 'g', { glow: true, thin: true, over: true, shade: 'flat', tone: 4 });
    if (P.chains) { C.line(cx - bw, ty - bh * 0.4, cx + bw, ty + bh * 0.3, C.u * 1.2, 'h', { over: true, shade: 'flat', tone: 3, thin: true }); C.line(cx - bw, ty + bh * 0.1, cx + bw * 0.9, ty - bh * 0.35, C.u * 1.2, 'h', { over: true, shade: 'flat', tone: 2, thin: true }); }
    if (P.belt) C.rect(cx - bw * 0.95, ty + bh * 0.2, bw * 1.9, 1.2, P.belt, { over: true, shade: 'flat', tone: 1, edge: false });
    if (P.chest) C.ell(cx, ty - bh * 0.05, bw * 0.55, bh * 0.28, P.chest, { over: true, edge: false });
    if (P.moss) for (const s of [-1, 1]) C.ell(cx + s * bw * 0.75, shY + 0.2, bw * 0.45, 1.5, P.moss, { clip: (x, y) => y < shY + 1.2 });
  };

  if (view === 'side') {
    const cx = 16 + (P.cx ?? 0);
    const lean = p.atk ? -1 : 0;
    if (P.wings) wing(C, cx + 1.5, shY + 0.5, 1, P.wingSpan ?? 7, P.wingMat || 'c', { kind: P.wings, flap: p.flap, ds: -1 });
    if (P.tail) C.curve([[cx + bw * 0.6, ty + bh * 0.3], [cx + bw + 2, ty + bh * 0.4], [cx + bw + 3.5, ty - 1 + (p.f % 2)]], 1.3, 0.8, P.tailMat || 'a', {});
    if (P.tail === 'devil') C.tri(cx + bw + 2.6, ty - 2 + (p.f % 2), cx + bw + 4.6, ty - 1.6 + (p.f % 2), cx + bw + 3.5, ty - 3.4 + (p.f % 2), P.tailMat || 'a');
    // braco de la
    const farHand = [cx + 1 + swing * 1.4, shY + al];
    if (!P.noArms) C.line(cx + 1, shY + 0.6, ...farHand, aw, P.armMat || 'a', { ds: -1 });
    if (!robe) {
      leg(C, cx + 0.8, hipY - 0.5 + bob, lw, P.legMat || 'a', { swing: -swing, ds: -1, foot: P.foot, stride: 1.6 });
      leg(C, cx - 0.4, hipY - 0.5 + bob, lw, P.legMat || 'a', { swing, foot: P.foot, stride: 1.6 });
    }
    C.at(lean, 0, () => drawTorso(cx));
    C.anchor('body', { x: cx, y: ty, rx: bw, ry: bh * 0.55 });
    C.anchor('back', { x: cx + bw * 0.3, y: shY - 0.5, w: bw * 1.4 });
    // braco de ca + arma (antes da cabeca, senao cobre o rosto; no ataque vem na frente)
    const nearArm = () => {
      const hand = p.atk ? [cx - 3.5, shY - 2] : [cx - 0.5 - swing * 1.4, shY + al];
      weapon(C, P, hand[0], hand[1], p, 1, 'side');
      C.line(cx - 0.2, shY + 0.6, ...hand, aw, P.armMat || 'a', { w1: aw * 1.05 });
      if (P.weapon === 'claws' || P.claws) C.tri(hand[0] - 1, hand[1] + 0.3, hand[0] + 0.6, hand[1] + 0.6, hand[0] - 1.8, hand[1] + 2, 'h', {});
    };
    if (!P.noArms && !p.atk) nearArm();
    C.at(lean, 0, () => headOf(C, P, p, cx - 1.4 + (P.hunch ? -1.4 : 0), hy, hr, 'side'));
    if (!P.noArms && p.atk) nearArm();
    if (P.wings) wing(C, cx + 1, shY + 1, 1, (P.wingSpan ?? 7) * 0.8, P.wingMat || 'c', { kind: P.wings, flap: p.flap });
    C.anchor('front', { x: cx - bw - 2, y: shY });
    return;
  }

  const front = view === 'down';
  const cx = 16;
  const handY = shY + al;
  const armX = bw + aw * 0.35;
  const drawArms = (behind) => {
    if (P.noArms) return;
    for (const s of [-1, 1]) {
      const sw = (s < 0 ? swing : -swing) * 0.8;
      const raised = p.atk && s === 1;
      const hand = raised ? [cx + s * (armX + 1), shY - 4.5] : [cx + s * (armX + 0.6), handY + sw];
      if (front && s === 1 && !behind) weapon(C, P, hand[0], hand[1], p, s, view);
      C.line(cx + s * (bw * 0.85), shY + 0.4, ...hand, aw, P.armMat || 'a', { w1: aw * 1.05, ds: behind ? -1 : 0 });
      if ((P.weapon === 'claws' || P.claws) && !behind) for (const d of [-0.8, 0.8]) C.line(hand[0] + d * 0.6, hand[1] + 0.6, hand[0] + d, hand[1] + 2, 0.8, 'h', { edge: false });
      if (!front && s === 1 && behind === false) weapon(C, P, hand[0], hand[1], p, s, view);
    }
  };
  if (front) {
    if (P.wings) for (const s of [-1, 1]) wing(C, cx + s * bw * 0.5, shY + 0.5, s, P.wingSpan ?? 7, P.wingMat || 'c', { kind: P.wings, flap: p.flap });
    if (P.tail === 'devil' || P.tail === 'thin') C.curve([[cx + 1, ty + bh * 0.4], [cx + bw + 2.5, ty + bh * 0.3], [cx + bw + 3, ty - 1.5]], 1.2, 0.8, P.tailMat || 'a', {});
    if (!robe) for (const s of [-1, 1]) leg(C, cx + s * bw * 0.48, hipY - 0.6 + bob, lw, P.legMat || 'a', { swing: 0, foot: P.foot, ground: GROUND + lift(s < 0 ? 0 : 1) });
    drawTorso(cx);
    drawArms(false);
    headOf(C, P, p, cx, hy, hr, 'down');
  } else {
    if (!robe) for (const s of [-1, 1]) leg(C, cx + s * bw * 0.48, hipY - 0.6 + bob, lw, P.legMat || 'a', { swing: 0, foot: P.foot, ground: GROUND + lift(s < 0 ? 0 : 1) });
    drawArms(true);
    drawTorso(cx);
    if (P.cape) C.poly([[cx - bw * 0.9, shY - 0.4], [cx + bw * 0.9, shY - 0.4], [cx + bw * 1.1, ty + bh * 0.55], [cx - bw * 1.1, ty + bh * 0.55]], P.cape, { base: 2 });
    headOf(C, P, p, cx, hy, hr, 'up');
    if (P.tail) C.curve([[cx, ty + bh * 0.35], [cx + 1.5, ty + bh * 0.6], [cx + 3, ty + bh * 0.2 + (p.f % 2)]], 1.3, 0.8, P.tailMat || 'a', {});
    if (P.wings) for (const s of [-1, 1]) wing(C, cx + s * bw * 0.3, shY + 1, s, P.wingSpan ?? 7, P.wingMat || 'c', { kind: P.wings, flap: p.flap });
  }
  C.anchor('body', { x: cx, y: ty, rx: bw, ry: bh * 0.55 });
  C.anchor('back', { x: cx, y: shY - 0.5, w: bw * 1.8 });
  C.anchor('front', { x: cx, y: hy + hr });
}
