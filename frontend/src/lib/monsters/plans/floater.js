// Plano PAIRANTE (olho flutuante, fantasma, cristal, relogio vivo, ampulheta,
// agua-viva, fogo-fatuo, serafim, fenda, boca voraz, nuvem de tempestade...).
// Flutua 1px para cima e para baixo; a sombra fica no chao, menor e fixa.
import { GROUND } from '../raster.js';
import { mouth, wing } from '../kit.js';

export function floater(C, P, p) {
  const kind = P.kind || 'ghost';
  const r = P.r ?? 6.5;
  const alt = P.alt ?? 7;
  const hover = p.moving ? [0, -1, 0, 1][p.f % 4] : p.bob ? -1 : 0;
  const cx = 16, cy = GROUND - alt - r + hover * C.u;
  const view = p.view, side = view === 'side', front = view === 'down';
  const fx = side ? -r * 0.35 : 0;
  const m = 'a';
  const glow = !!P.glowBody;
  C.anchor('float', { x: 16, w: r * (P.shadowW ?? 0.9) });
  const wav = p.f % 2;

  const facePair = (y, gap, o = {}) => {
    if (view === 'up') return;
    if (side) C.eye(cx + fx - gap * 0.3, y, o);
    else C.eyePair(cx, y, gap, o);
  };

  switch (kind) {
    case 'eye': {
      // tentaculos (atras), globo, iris que segue a direcao, palpebra
      if (P.tentacles) for (let k = -1; k <= 1; k++) C.curve([[cx + k * r * 0.5, cy + r * 0.6], [cx + k * r * 0.7 + (wav ? 1 : -1), cy + r * 1.2], [cx + k * r * 0.6 - (wav ? 1 : -1), cy + r * 1.8]], 1.6, 0.8, 'c', {});
      C.circ(cx, cy, r, m, { glow });
      if (view !== 'up') {
        const ix = cx + (side ? -r * 0.45 : 0), iy = cy + (p.atk ? 0 : r * 0.05);
        C.ell(ix, iy, r * (side ? 0.42 : 0.6), r * 0.6, 'w', { edge: false });
        C.ell(ix + (side ? -r * 0.12 : 0), iy, r * (side ? 0.25 : 0.33), r * 0.36, 'e', { glow: P.eyeGlow, edge: false });
        C.circ(ix + (side ? -r * 0.18 : 0), iy, r * (p.atk ? 0.08 : 0.15), 'd', { shade: 'flat', tone: 0, edge: false });
        C.dot(ix - r * 0.25, iy - r * 0.28, 'w', 4, {});
        // palpebra que pisca no quadro de respiracao
        if (p.bob && !p.moving) C.ell(ix, iy - r * 0.25, r * 0.62, r * 0.42, m, { clip: (x, y) => y < iy, edge: false });
      }
      if (P.spikes) for (let k = -1; k <= 1; k++) C.tri(cx + k * r * 0.55 - 1, cy - r * 0.8, cx + k * r * 0.55 + 1, cy - r * 0.8, cx + k * r * 0.7, cy - r * 1.35 + Math.abs(k) * 0.4, 'c', {});
      break;
    }
    case 'ghost': {
      // lencol com barra ondulada; bracinhos; rosto escuro de buracos
      const bot = cy + r * 1.05;
      C.ell(cx, cy - r * 0.1, r * 0.92, r * 0.95, m, { glow, clip: (x, y) => y < cy + r * 0.2 });
      const pts = [[cx - r * 0.92, cy - r * 0.1], [cx + r * 0.92, cy - r * 0.1]];
      const n = 5;
      for (let k = n; k >= 0; k--) pts.push([cx - r * 1.05 + (2.1 * r * k) / n + (k === n ? -(wav ? 1 : 0) : 0), bot - ((k + wav) % 2 ? 1.6 : 0)]);
      C.poly(pts, m, { glow, base: 2, as: undefined });
      C.ell(cx, cy + r * 0.3, r * 0.9, r * 0.5, m, { glow, shade: 'flat', tone: 2, edge: false });
      for (const s of [-1, 1]) if (!side || s > 0) C.ell(cx + s * r * 1.0, cy + r * 0.25 + (p.atk ? -r * 0.6 : 0), r * 0.32, r * 0.22, m, { glow, rot: s * 0.5 });
      if (view !== 'up') {
        if (side) C.ell(cx - r * 0.45, cy - r * 0.05, r * 0.15, r * 0.22, 'd', { shade: 'flat', tone: 0, edge: false });
        else for (const s of [-1, 1]) C.ell(cx + s * r * 0.35, cy - r * 0.05, r * 0.16, r * 0.24, 'd', { shade: 'flat', tone: 0, edge: false });
        if (P.eyeGlow) facePair(cy - r * 0.05, r * 0.35, { m: 'g', glow: true, small: true });
        C.ell(cx + fx, cy + r * 0.42, r * (p.atk ? 0.28 : 0.14), r * (p.atk ? 0.26 : 0.12), 'd', { shade: 'flat', tone: 0, edge: false });
      }
      break;
    }
    case 'crystal': {
      // cristal central + estilhacos orbitando (a orbita gira com o quadro)
      const t = (p.f + (p.moving ? 0 : p.bob)) % 4;
      const orbit = [[-1, 0.2], [0, -0.3], [1, 0.2], [0, 0.5]];
      const back = (k) => orbit[(t + k) % 4][1] < 0;
      const shard = (k) => {
        const [ox, oy] = orbit[(t + k) % 4];
        const sx = cx + ox * r * 1.25, sy = cy + oy * r * 0.8 + r * 0.2;
        C.poly([[sx, sy - 2.2], [sx + 1.2, sy], [sx, sy + 2], [sx - 1.2, sy]], P.shardMat || m, { glow, base: 3 });
      };
      for (const k of [0, 2]) if (back(k)) shard(k);
      C.poly([[cx, cy - r * 1.35], [cx + r * 0.7, cy - r * 0.2], [cx + r * 0.45, cy + r * 1.0], [cx, cy + r * 1.3], [cx - r * 0.45, cy + r * 1.0], [cx - r * 0.7, cy - r * 0.2]], m, { glow, base: 2 });
      // faceta clara a esquerda, escura a direita
      C.poly([[cx, cy - r * 1.3], [cx - r * 0.66, cy - r * 0.2], [cx - r * 0.42, cy + r * 0.95], [cx - r * 0.05, cy + r * 0.2]], m, { over: true, shade: 'flat', tone: 3, edge: false });
      C.poly([[cx, cy - r * 1.3], [cx + r * 0.66, cy - r * 0.2], [cx + r * 0.42, cy + r * 0.95], [cx + r * 0.1, cy + r * 0.25]], m, { over: true, shade: 'flat', tone: 1, edge: false });
      C.line(cx - r * 0.3, cy - r * 0.7, cx - r * 0.45, cy - r * 0.15, C.u, 'w', { shade: 'flat', tone: 4, over: true, thin: true });
      if (view !== 'up' && P.eyes !== 'none') facePair(cy + r * 0.05, r * 0.25, { m: 'g', glow: true, small: true });
      for (const k of [0, 2]) if (!back(k)) shard(k);
      break;
    }
    case 'clock': case 'mask': case 'orb': case 'star': case 'skull': {
      if (P.wings) for (const s of [-1, 1]) if (!side || s > 0) wing(C, cx + s * r * 0.7, cy - r * 0.1, side ? 1 : s, P.span ?? 6, P.wingMat || 'c', { kind: P.wings, flap: p.flap, glow: P.wingGlow, ds: side ? -1 : 0 });
      if (kind === 'star') {
        const pts = [];
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5 + (wav ? 0.08 : 0); const rr = k % 2 ? r * 0.5 : r * 1.15; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
        C.poly(pts, m, { glow: true, base: 3 });
        C.circ(cx, cy, r * 0.45, 'g', { glow: true, shade: 'flat', tone: 4 });
      } else if (kind === 'skull') {
        // caveira em chamas
        const fl = wav ? 1 : -1;
        for (let k = -1; k <= 1; k++) C.tri(cx + k * r * 0.55 - r * 0.4, cy - r * 0.2, cx + k * r * 0.55 + r * 0.4, cy - r * 0.2, cx + k * r * 0.6 + fl * 0.6, cy - r * 1.6 + Math.abs(k) * 1.4, 'g', { glow: true, shade: 'vgrad', tone: 4 });
        C.ell(cx, cy, r * 0.85, r * 0.78, m, {});
        C.ell(cx + fx * 0.5, cy + r * 0.55, r * 0.5, r * 0.35, m, { base: 1.6, edge: false });
        if (view !== 'up') {
          if (side) C.circ(cx - r * 0.35, cy, r * 0.22, 'd', { shade: 'flat', tone: 0, edge: false });
          else for (const s of [-1, 1]) C.circ(cx + s * r * 0.35, cy, r * 0.24, 'd', { shade: 'flat', tone: 0, edge: false });
          facePair(cy, r * 0.35, { m: 'g', glow: true, small: true });
        }
      } else {
        C.circ(cx, cy, r, kind === 'orb' ? m : (P.rimMat || 'c'), { glow: kind === 'orb' || glow });
        if (kind !== 'orb') C.circ(cx, cy, r * 0.78, m, { glow, edge: false });
        if (kind === 'orb') C.circ(cx - r * 0.2, cy - r * 0.2, r * 0.5, 'g', { glow: true, shade: 'flat', tone: 4 });
        if (kind === 'clock' && view !== 'up') {
          for (let k = 0; k < 12; k += 3) { const a = (k / 12) * Math.PI * 2; C.dot(cx + Math.sin(a) * r * 0.6, cy - Math.cos(a) * r * 0.6, 'd', 1, {}); }
          // ponteiros: giram a cada quadro (o tempo passa)
          const a = ((p.f + (p.atk ? 2 : 0)) / 4) * Math.PI * 2;
          C.line(cx, cy, cx + Math.sin(a) * r * 0.55, cy - Math.cos(a) * r * 0.55, C.u, 'd', { thin: true, shade: 'flat', tone: 1 });
          C.line(cx, cy, cx + r * 0.35, cy + r * 0.1, C.u, 'd', { thin: true, shade: 'flat', tone: 1 });
          C.dot(cx, cy, 'g', 4, { glow: true });
          if (P.eyes !== 'none') facePair(cy - r * 0.35, r * 0.3, { m: 'g', glow: true, small: true });
        }
        if (kind === 'mask' && view !== 'up') {
          for (const s of [-1, 1]) if (!side || s < 0) C.ell(cx + s * r * 0.35 + (side ? 0 : 0), cy - r * 0.1, r * 0.2, r * 0.13, 'd', { shade: 'flat', tone: 0, edge: false, rot: s * 0.3 });
          facePair(cy - r * 0.1, r * 0.35, { m: 'g', glow: true, small: true });
          C.line(cx - r * 0.3 + fx, cy + r * 0.45, cx + r * 0.3 + fx, cy + r * 0.4, C.u, 'd', { thin: true, shade: 'flat', tone: 0 });
        }
        if (kind === 'orb' && P.runes) C.ring(cx, cy + r * 0.1, r * 1.45, r * 0.5, C.u * 1.2, 'c', { glow: true, tone: 3, clip: (x, y) => y > cy + r * 0.1 || Math.abs(x - cx) > r * 0.95 });
        if (kind === 'orb' && view !== 'up' && P.eyes !== 'none') facePair(cy + r * 0.05, r * 0.3, { m: 'd', t: 1, small: true });
      }
      break;
    }
    case 'hourglass': {
      const w = r * 0.85, h = r * 1.2;
      C.rect(cx - w - 0.6, cy - h - 1.2, (w + 0.6) * 2, 1.6, 'c', {});
      C.rect(cx - w - 0.6, cy + h - 0.4, (w + 0.6) * 2, 1.6, 'c', {});
      C.poly([[cx - w, cy - h], [cx + w, cy - h], [cx + 0.6, cy], [cx + w, cy + h], [cx - w, cy + h], [cx - 0.6, cy]], 'w', { base: 3 });
      const sand = (p.f % 4) / 4;
      C.poly([[cx - w * (0.6 - sand * 0.4), cy - h * (0.4 - sand * 0.4)], [cx + w * (0.6 - sand * 0.4), cy - h * (0.4 - sand * 0.4)], [cx, cy]], 'g', { glow: true, shade: 'flat', tone: 3 });
      C.poly([[cx - w * 0.85, cy + h * 0.95], [cx + w * 0.85, cy + h * 0.95], [cx, cy + h * (0.75 - sand * 0.4)]], 'g', { glow: true, shade: 'flat', tone: 3 });
      C.line(cx, cy, cx, cy + h * 0.8, C.u * 0.8, 'g', { glow: true, thin: true, shade: 'flat', tone: 4 });
      for (const s of [-1, 1]) C.line(cx + s * (w + 0.2), cy - h, cx + s * (w + 0.2), cy + h, C.u * 1.1, 'c', { shade: 'flat', tone: 2 });
      if (view !== 'up') facePair(cy - h * 0.55, w * 0.35, { m: 'd', small: true, t: 0 });
      break;
    }
    case 'jelly': {
      // agua-viva: sino translucido + tentaculos que ondulam
      for (let k = -2; k <= 2; k++) C.curve([[cx + k * r * 0.35, cy + r * 0.3], [cx + k * r * 0.4 + (wav ? 0.8 : -0.8), cy + r * 1.1], [cx + k * r * 0.35 - (wav ? 0.8 : -0.8), cy + r * 1.8]], 1.1, 0.6, k % 2 ? 'c' : 'b', { glow: true });
      C.ell(cx, cy, r * 1.05, r * 0.85, m, { glow: true, clip: (x, y) => y < cy + r * 0.4 });
      C.ell(cx, cy + r * 0.3, r * 1.0, r * 0.2, 'b', { glow: true, shade: 'flat', tone: 2 });
      C.ell(cx, cy - r * 0.1, r * 0.45, r * 0.35, 'g', { glow: true, over: true, shade: 'flat', tone: 4 });
      if (view !== 'up') facePair(cy + r * 0.05, r * 0.4, { m: 'd', small: true, t: 0 });
      break;
    }
    case 'wisp': {
      const fl = wav ? 1 : -1;
      C.tri(cx - r * 0.75, cy, cx + r * 0.75, cy, cx + fl * 0.8, cy - r * 1.9, m, { glow: true, shade: 'flat', tone: 2 });
      C.circ(cx, cy, r * 0.8, m, { glow: true, base: 3 });
      C.circ(cx - r * 0.1, cy + r * 0.05, r * 0.48, 'g', { glow: true, shade: 'flat', tone: 4 });
      C.tri(cx - r * 0.4, cy, cx + r * 0.4, cy, cx + fl * 0.4, cy - r * 1.1, 'g', { glow: true, shade: 'flat', tone: 4 });
      if (view !== 'up') facePair(cy + r * 0.05, r * 0.28, { m: 'd', small: true, t: 1 });
      // fagulhas soltas
      C.dot(cx + r * 1.1, cy - r * (wav ? 0.8 : 0.4), 'g', 4, { glow: true });
      C.dot(cx - r * 1.2, cy + r * (wav ? 0.1 : 0.5), 'g', 3, { glow: true });
      break;
    }
    case 'seraph': {
      // olho entre aneis e asas de penas (anjo "biblicamente correto")
      for (const s of [-1, 1]) wing(C, cx + s * r * 0.6, cy - r * 0.2, s, P.span ?? 8, P.wingMat || 'c', { kind: 'feather', flap: p.flap, glow: P.wingGlow });
      C.ring(cx, cy, r * 1.25, r * 0.45, C.u * 1.3, 'h', { tone: 3, glow: true, clip: (x, y) => y > cy || Math.abs(x - cx) > r * 0.6 });
      C.circ(cx, cy, r * 0.8, m, {});
      if (view !== 'up') {
        C.ell(cx + fx * 0.6, cy, r * 0.5, r * 0.42, 'w', { edge: false });
        C.circ(cx + fx * 0.8, cy, r * 0.25, 'e', { glow: true, edge: false });
        C.dot(cx + fx * 0.8, cy, 'd', 0, {});
      }
      C.ring(cx, cy, r * 1.25, r * 0.45, C.u * 1.3, 'h', { tone: 4, glow: true, clip: (x, y) => y > cy });
      break;
    }
    case 'rift': {
      // fenda viva: oval vertical com borda brilhante e vazio estrelado
      const w = r * 0.7 * (p.atk ? 1.3 : 1), h = r * 1.35;
      C.ell(cx, cy, w + 1.4, h + 1.2, 'c', { glow: true, shade: 'flat', tone: 3 });
      C.ell(cx, cy, w, h, 'd', { shade: 'flat', tone: 0, edge: false });
      for (const [dx, dy] of [[-0.3, -0.5], [0.25, 0.1], [-0.1, 0.55], [0.3, -0.75]]) C.dot(cx + dx * w * (wav ? 1 : 0.8), cy + dy * h, 'g', 4, { glow: true });
      if (view !== 'up') C.eye(cx + fx * 0.3, cy, { m: 'g', glow: true });
      for (const s of [-1, 1]) C.tri(cx + s * (w + 1), cy - 1, cx + s * (w + 1), cy + 1, cx + s * (w + 3.2 + (wav ? 0.6 : 0)), cy + s * 1.5, 'c', { glow: true, shade: 'flat', tone: 2 });
      break;
    }
    case 'maw': {
      // devorador: esfera que e quase so boca, dentes em serra
      C.circ(cx, cy, r, m, { glow });
      if (view !== 'up') {
        const open = p.atk ? 0.6 : 0.35;
        C.ell(cx + fx, cy + r * 0.2, r * (side ? 0.55 : 0.78), r * open, 'm', { shade: 'flat', tone: 1, edge: false });
        const n = side ? 3 : 5;
        for (let k = 0; k < n; k++) {
          const x = cx + fx - r * (side ? 0.45 : 0.68) + (k + 0.5) * (r * (side ? 0.9 : 1.36) / n);
          C.tri(x - 0.8, cy + r * 0.2 - r * open + 0.2, x + 0.8, cy + r * 0.2 - r * open + 0.2, x, cy + r * 0.2 - r * open + 2, 'w', { shade: 'flat', tone: 4, edge: false });
          C.tri(x - 0.8, cy + r * 0.2 + r * open - 0.2, x + 0.8, cy + r * 0.2 + r * open - 0.2, x, cy + r * 0.2 + r * open - 2, 'w', { shade: 'flat', tone: 3, edge: false });
        }
        facePair(cy - r * 0.5, r * 0.35, { glow: P.eyeGlow, m: P.eyeMat || 'g' });
      }
      for (const s of [-1, 1]) C.tri(cx + s * r * 0.5, cy - r * 0.7, cx + s * r * 0.9, cy - r * 0.4, cx + s * r * 1.0, cy - r * 1.3, 'h', {});
      break;
    }
    case 'cloud': {
      // nuvem de tempestade: tres bolotas e um raio que pisca
      if ((p.f % 2 === 0 && p.moving) || p.atk || p.bob) C.poly([[cx + 0.5, cy + r * 0.4], [cx - 1.6, cy + r * 1.3], [cx + 0.2, cy + r * 1.3], [cx - 1.2, cy + r * 2.2], [cx + 2.2, cy + r * 1.0], [cx + 0.4, cy + r * 1.0], [cx + 1.8, cy + r * 0.4]], 'g', { glow: true, shade: 'flat', tone: 4 });
      for (const [dx, dy, rr] of [[-0.6, 0.15, 0.6], [0.6, 0.15, 0.62], [0, -0.2, 0.8]]) C.circ(cx + dx * r, cy + dy * r, r * rr, m, { glow });
      C.ell(cx, cy + r * 0.35, r * 1.1, r * 0.35, m, { base: 1, edge: false });
      if (view !== 'up') { facePair(cy, r * 0.35, { glow: P.eyeGlow, m: P.eyeMat || 'g' }); if (p.atk) mouth(C, cx + fx, cy + r * 0.35, r * 0.4, { open: true }); }
      break;
    }
    default: break;
  }
  C.anchor('head', { x: cx + fx, y: cy - r * 0.2, r: r * 0.8 });
  C.anchor('body', { x: cx, y: cy, rx: r, ry: r });
  C.anchor('back', { x: cx, y: cy - r, w: r * 1.2 });
  C.anchor('front', { x: cx + fx, y: cy });
}
