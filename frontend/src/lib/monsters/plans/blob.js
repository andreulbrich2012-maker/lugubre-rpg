// Plano GOTA (slime, elemental de fogo, sombra rastejante, nevoa, magma).
// Sem pernas: anda "quicando" (achata e estica); o rosto vai para a esquerda
// na vista lateral e some de costas.
import { GROUND } from '../raster.js';
import { mouth } from '../kit.js';

export function blob(C, P, p) {
  const kind = P.kind || 'slime';
  let rx = P.w ?? 8.5, ry = P.h ?? 7.5;
  // achata/estica (squash & stretch)
  let sq = 0;
  if (p.moving) sq = [0.12, -0.1, 0.12, -0.1][p.f % 4];
  else if (p.atk) sq = -0.22;
  else sq = p.bob ? 0.07 : 0;
  rx *= 1 + sq * 0.8; ry *= 1 - sq;
  const hop = p.moving && p.f % 2 ? 1.2 : 0;
  const cy = GROUND - ry * (kind === 'flame' ? 0.75 : 0.62) - hop;
  const cx = 16;
  const view = p.view;
  const fx = view === 'side' ? -rx * 0.28 : 0;
  const m = 'a';
  if (kind === 'chest') {
    // mimico: bau de madeira com tampa que abre em boca dentada e lingua
    const w = (P.w ?? 9) * (1 + sq * 0.3), h = 6.5, base = GROUND - 0.4 - hop;
    const open = p.atk ? 4 : p.moving ? (p.f % 2 ? 2.2 : 1.2) : p.bob ? 1.8 : 1.2;
    const lidY = base - h - open;
    const sx = view === 'side' ? 0.75 : 1;
    C.rect(cx - w * sx, base - h, w * 2 * sx, h, 'a', { base: 2 });
    C.rect(cx - w * sx, base - h + 1.2, w * 2 * sx, 1.1, 'h', { over: true, shade: 'flat', tone: 2, edge: false });
    for (const s of [-1, 1]) C.rect(cx + s * w * sx * 0.75 - 0.6, base - h, 1.2, h, 'h', { over: true, shade: 'flat', tone: 3, edge: false });
    if (view !== 'up' && open > 0.5) {
      C.rect(cx - w * sx + 0.8, base - h - open, (w * sx - 0.8) * 2, open + 0.4, 'm', { shade: 'flat', tone: 1, edge: false });
      for (let k = 0; k < 4; k++) C.tri(cx - w * sx + 1.5 + k * (w * sx * 0.5), base - h - 0.2, cx - w * sx + 3 + k * (w * sx * 0.5), base - h - 0.2, cx - w * sx + 2.2 + k * (w * sx * 0.5), base - h - 1.6, 'w', { shade: 'flat', tone: 4, edge: false });
      if (p.atk) C.curve([[cx, base - h], [cx - 2 * sx, base - h + 2.5], [cx - 4 * sx - (view === 'side' ? 3 : 0), base - h + 2]], 1.8, 1.2, 'b', {});
    }
    C.poly([[cx - w * sx - 0.4, lidY], [cx + w * sx + 0.4, lidY], [cx + w * sx, lidY - 3], [cx - w * sx, lidY - 3]], 'a', { base: 2.5 });
    C.rect(cx - w * sx, lidY - 3.4, w * 2 * sx, 1, 'a', { shade: 'flat', tone: 3, edge: false, over: true });
    if (view !== 'up') {
      C.rect(cx - 1 + (view === 'side' ? -w * 0.4 : 0), lidY - 1.4, 2, 2.2, 'h', { shade: 'flat', tone: 4 });
      if (open > 1) { const ey = base - h - open * 0.5; if (view === 'side') C.eye(cx - w * 0.4, ey, { m: 'g', glow: true }); else C.eyePair(cx, ey, w * 0.45, { m: 'g', glow: true, small: true }); }
    }
    C.anchor('head', { x: cx, y: lidY, r: w * 0.6 });
    C.anchor('body', { x: cx, y: base - h / 2, rx: w, ry: h / 2 });
    C.anchor('back', { x: cx, y: lidY - 3, w: w * 1.6 });
    C.anchor('front', { x: cx, y: base - h });
    return;
  }
  if (kind === 'octopus') {
    // polvo: cabeca-manto erguida e 6 tentaculos que se enrolam alternados
    const hcy = GROUND - 12 - hop + (p.bob ? 0.6 : 0);
    const k2 = p.moving ? (p.f % 2 ? 1 : -1) : p.bob ? 0.5 : -0.5;
    for (let k = 0; k < 6; k++) {
      const t = (k - 2.5) / 2.5;
      const bx = cx + t * 4.5, ex = cx + t * 10;
      const curl = (k % 2 ? 1 : -1) * k2;
      C.curve([[bx, hcy + 4], [cx + t * 7, GROUND - 3 + curl], [ex, GROUND - 1.2], [ex + Math.sign(t || 1) * 1.2, GROUND - 3 - curl]], 2.6, 0.9, m, { ds: Math.abs(t) > 0.7 ? 0 : -1 });
    }
    C.ell(cx, hcy - (p.atk ? 1 : 0), rx * 0.82, ry * (p.atk ? 1.1 : 0.95), m, {});
    C.ell(cx, hcy + ry * 0.55, rx * 0.6, ry * 0.3, m, { base: 1.5, edge: false });
    if (P.spots) for (const [dx, dy] of [[-0.4, -0.5], [0.3, -0.7], [0.5, -0.2]]) C.circ(cx + dx * rx * 0.8, hcy + dy * ry, 0.9, 'b', { over: true, shade: 'flat', tone: 3, edge: false });
    if (view !== 'up') {
      if (view === 'side') C.eye(cx - rx * 0.45, hcy + ry * 0.2, { glow: P.eyeGlow, m: P.eyeMat });
      else C.eyePair(cx, hcy + ry * 0.2, rx * 0.36, { glow: P.eyeGlow, m: P.eyeMat });
    }
    C.anchor('head', { x: cx, y: hcy, r: rx * 0.8 });
    C.anchor('body', { x: cx, y: hcy, rx: rx * 0.8, ry });
    C.anchor('back', { x: cx, y: hcy - ry, w: rx * 1.4 });
    C.anchor('front', { x: cx, y: hcy + ry });
    return;
  }
  if (kind === 'flame') {
    // lingua de fogo: gota invertida + chamas que tremulam por quadro
    const flick = [0, 1, -1, 0.5][(p.f + (p.atk ? 2 : 0)) % 4];
    C.ell(cx, cy + ry * 0.15, rx * 0.95, ry * 0.75, m, { glow: true, base: 3 });
    C.tri(cx - rx * 0.85, cy, cx + rx * 0.85, cy, cx + flick * 0.8, cy - ry * 1.5, m, { glow: true, shade: 'flat', tone: 3 });
    C.tri(cx - rx * 0.95, cy + 0.5, cx - rx * 0.1, cy - 0.5, cx - rx * 0.75 - flick * 0.5, cy - ry * 0.95, m, { glow: true, shade: 'flat', tone: 2 });
    C.tri(cx + rx * 0.1, cy - 0.5, cx + rx * 0.95, cy + 0.5, cx + rx * 0.8 + flick * 0.5, cy - ry * 0.9, m, { glow: true, shade: 'flat', tone: 2 });
    C.ell(cx, cy + ry * 0.25, rx * 0.55, ry * 0.5, 'g', { glow: true, shade: 'flat', tone: 4 });
    C.tri(cx - rx * 0.45, cy + ry * 0.1, cx + rx * 0.45, cy + ry * 0.1, cx - flick * 0.5, cy - ry * 0.75, 'g', { glow: true, shade: 'flat', tone: 3 });
    if (view !== 'up') {
      if (view === 'side') C.eye(cx - rx * 0.45, cy + ry * 0.1, { m: 'd', t: 0, tones: [0, 0, 0, 0] });
      else C.eyePair(cx, cy + ry * 0.1, rx * 0.32, { m: 'd', tones: [0, 0, 0, 0], t: 0 });
      if (p.atk) C.ell(cx + fx, cy + ry * 0.5, rx * 0.3, ry * 0.15, 'd', { shade: 'flat', tone: 0, edge: false });
    }
  } else {
    // corpo em domo com base achatada
    const ground = GROUND - 0.3 - hop;
    C.ell(cx, cy, rx, ry, m, { clip: (x, y) => y < ground, light: P.light ?? 0 });
    if (kind === 'shadow' || kind === 'mist') {
      // fumaca/fiapos no topo e na base
      const k = p.f % 2 ? 1 : -1;
      for (const s of [-1, 0, 1]) C.tri(cx + s * rx * 0.5 - 1.4, cy - ry * 0.55, cx + s * rx * 0.5 + 1.4, cy - ry * 0.55, cx + s * rx * 0.5 + k * s * 0.8 + (s ? 0 : k), cy - ry * 1.15 - (s ? 0 : 1), m, { base: 3 });
      for (const s of [-1, 1]) C.ell(cx + s * rx * 0.95, ground - 1, rx * 0.35, 1.3, m, { base: 1 });
    }
    if (kind === 'magma') for (const [dx, dy] of [[-0.4, -0.2], [0.3, 0.1], [0, -0.55], [0.55, -0.35]]) C.circ(cx + dx * rx, cy + dy * ry, rx * 0.13, 'g', { glow: true, over: true, shade: 'flat', tone: 4 });
    if (kind === 'slime' || kind === 'ooze') {
      // interior translucido: nucleo mais claro e brilho de gelatina
      if (P.core) C.circ(cx + rx * 0.15, cy + ry * 0.15, rx * 0.28, P.core, { over: true, edge: false });
      C.ell(cx - rx * 0.45, cy - ry * 0.45, rx * 0.22, ry * 0.14, 'w', { over: true, shade: 'flat', tone: 4, rot: -0.5, edge: false });
      C.dot(cx - rx * 0.62, cy - ry * 0.12, 'w', 4, {});
      if (P.drips) for (const s of [-1, 1]) C.ell(cx + s * rx * 0.7, ground - 0.4, 1.1, 1.0, m, { base: 1 });
    }
    if (P.crown) for (let k = -1; k <= 1; k++) C.tri(cx + k * rx * 0.4 - 1.2, cy - ry * 0.8, cx + k * rx * 0.4 + 1.2, cy - ry * 0.8, cx + k * rx * 0.4, cy - ry * 0.8 - 2.8 + Math.abs(k), P.crownMat || 'h', {});
    if (view !== 'up') {
      const ey = cy + ry * (P.eyeY ?? -0.05);
      if (kind === 'ooze') {
        // aberracao: varios olhos espalhados de tamanhos diferentes
        const spots = [[-0.45, -0.15, 1], [0.35, -0.3, 1], [0.05, 0.2, 0], [-0.1, -0.55, 0], [0.6, 0.15, 0]];
        for (const [dx, dy, big] of spots) {
          const x = cx + (view === 'side' ? dx * 0.7 - 0.25 : dx) * rx, y = cy + dy * ry;
          C.circ(x, y, big ? 1.5 : 1.0, 'w', { shade: 'flat', tone: 4, edge: false });
          C.eye(x, y, { m: 'e', small: true, t: 1 });
        }
      } else if (view === 'side') C.eye(cx - rx * 0.55, ey, { glow: P.eyeGlow, m: P.eyeMat });
      else C.eyePair(cx, ey, rx * 0.34, { glow: P.eyeGlow, m: P.eyeMat });
      if (kind !== 'ooze' || p.atk) mouth(C, cx + fx * 1.4, cy + ry * 0.3, rx * (view === 'side' ? 0.3 : 0.4), { open: p.atk, teeth: P.teeth || p.atk, smile: P.smile ? C.u : 0 });
    }
  }
  C.anchor('head', { x: cx + fx, y: cy - ry * 0.3, r: rx * 0.6 });
  C.anchor('body', { x: cx, y: cy, rx, ry });
  C.anchor('back', { x: cx, y: cy - ry * 0.9, w: rx * 1.3 });
  C.anchor('front', { x: cx + fx, y: cy });
}
