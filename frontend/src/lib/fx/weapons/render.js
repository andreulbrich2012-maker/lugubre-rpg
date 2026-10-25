// Desenho dos golpes de arma: rastro (fita de pixels com variacao de matiz),
// sprite da arma na mao, corda/corrente, projeteis, cavalo, aliado e os detalhes
// de impacto proprios dos golpes (onda no chao, estrelas de tontura, arma do alvo
// voando). Tudo e funcao pura de T (relogio da animacao).
import { drawWeapon, spritePoint, stringEnds } from './sprite.js';
import { weaponGeom, attackerPos, projAt, poseAt, worldAngle, TRAIL_STEEL, SPARKS } from './move.js';
import { rect, dot, line, disc, ring, glyph, star4, setAlpha, ease, clamp01, lerp } from '../draw.js';
import { PALETTES } from '../elements.js';
import { noise } from '../rng.js';

const WHITE = '#ffffff';

function rampOf(eff) {
  return eff.elKey !== 'fisico' ? eff.el.ramp : TRAIL_STEEL;
}

function tintOf(eff) {
  return eff.elKey !== 'fisico' ? eff.el.ramp : null;
}

// ------------------------------------------------------------ rastro
// sample(Tk) -> { tip, inner, on } ; a fita liga as amostras recentes, da ponta
// (clara, quase branca) para dentro (tom escuro), afinando na cauda com pontilhado.
function drawRibbon(ctx, sample, T, { ms, ramp, crit = false, dt = 8, offsets = [0], thin = 1 } = {}) {
  const N = Math.max(2, Math.ceil(ms / dt));
  const S = [];
  for (let k = 0; k <= N; k++) {
    const Tk = T - k * dt;
    if (Tk < 0) break;
    S.push(sample(Tk));
  }
  const pix = new Map();
  const put = (x, y, v) => {
    const X = Math.round(x);
    const Y = Math.round(y);
    const key = X * 4096 + Y;
    const cur = pix.get(key);
    if (cur === undefined || v > cur) pix.set(key, v);
  };
  for (const o of offsets) {
    for (let k = 0; k < S.length - 1; k++) {
      const a = S[k];
      const b = S[k + 1];
      if (!a?.on || !b?.on) continue;
      const nx = -(a.tip.y - a.inner.y);
      const ny = a.tip.x - a.inner.x;
      const nl = Math.hypot(nx, ny) || 1;
      const ox = (nx / nl) * o;
      const oy = (ny / nl) * o;
      const d = Math.max(Math.hypot(a.tip.x - b.tip.x, a.tip.y - b.tip.y), Math.hypot(a.inner.x - b.inner.x, a.inner.y - b.inner.y));
      if (d > 60) continue; // salto de pose: nao liga
      const steps = Math.ceil(d * 1.4) + 1;
      for (let j = 0; j < steps; j++) {
        const f = j / steps;
        const age = (k + f) / N;
        const tx = lerp(a.tip.x, b.tip.x, f) + ox;
        const ty = lerp(a.tip.y, b.tip.y, f) + oy;
        const ix = lerp(a.inner.x, b.inner.x, f) + ox;
        const iy = lerp(a.inner.y, b.inner.y, f) + oy;
        const w = Math.max(0.12, (1 - age) ** 0.7) * thin;
        const ex = lerp(tx, ix, w);
        const ey = lerp(ty, iy, w);
        const L = Math.hypot(ex - tx, ey - ty);
        const n = Math.max(1, Math.ceil(L * 1.3));
        for (let r = 0; r <= n; r++) {
          const rr = r / n;
          let v = 4.35 - rr * 2.7 - age * 2.3 + (crit ? 0.35 : 0);
          if (v < 0.55) continue;
          const x = lerp(tx, ex, rr);
          const y = lerp(ty, ey, rr);
          if (age > 0.62 && (Math.round(x) + Math.round(y)) & 1) continue;
          put(x, y, v);
        }
      }
    }
  }
  for (const [key, v] of pix) {
    const x = Math.floor(key / 4096);
    const y = key - x * 4096;
    const i = Math.max(0, Math.min(4, Math.round(v)));
    rect(ctx, x, y, 1, 1, i >= 4 ? WHITE : ramp[i]);
  }
}

function weaponSample(eff) {
  return (Tk) => {
    const g = weaponGeom(eff, Tk);
    return { tip: g.tip, inner: g.inner, on: g.pose.trail && g.pose.show };
  };
}

// ------------------------------------------------------------ cavalo e aliado
const HORSE = [
  '.............kk...',
  '............kmHk..',
  '...........kmHHHk.',
  '..........kmHHkHHk',
  '.kk.kkkkkkmHHk.kk.',
  'kmmkHHssssHHHk....',
  'km.kHhssssHhHk....',
  'k..kHHHHHHHHHk....',
  '...kHkkkkkkkHk....'
];
const LEGS = [
  ['...kHk.....kHk....', '...kHk.....kHk....', '...kkk.....kkk....'],
  ['..kHk.......kHk...', '.kHk.........kHk..', '.kk...........kk..'],
  ['....kHk...kHk.....', '....kHk...kHk.....', '....kkk...kkk.....']
];
const HORSE_COLORS = { k: '#2a1810', H: '#8a5a32', h: '#b47e48', m: '#3a2418', s: '#6e1f34' };

function drawHorse(ctx, eff, T) {
  const mv = eff.mv;
  const end = mv.T.impactAt + mv.follow + mv.recover;
  if (T > end + 120) return;
  const at = attackerPos(eff, T);
  const a = clamp01(T / 90) * (1 - clamp01((T - end) / 120));
  const moving = T > mv.T.windup * 0.5 && T < end;
  const fr = moving ? 1 + (Math.floor(T / 70) % 2) : 0;
  const flip = eff.side < 0;
  const x = Math.round(at.x - 9);
  const y = Math.round(at.y + at.up + eff.C * 0.42 - 12 - (moving && fr === 1 ? 1 : 0));
  setAlpha(ctx, 0.35 * a);
  disc(ctx, at.x, at.y + at.up + eff.C * 0.42, 6, '#10180c');
  setAlpha(ctx, a);
  glyph(ctx, x, y, [...HORSE, ...LEGS[fr]], HORSE_COLORS, flip);
  setAlpha(ctx, 1);
}

const ALLY = [
  '...kkkk...',
  '..kggggk..',
  '.kggGggGk.',
  '.kssssssk.',
  '.kskssksk.',
  '..kssssk..',
  '.kkttttkk.',
  'ksttTtttsk',
  'kkttttttkk',
  '.kbbbbbbk.',
  '.kttkkttk.',
  '.kbbk.kbbk',
  '.kkk..kkk.'
];
const ALLY_COLORS = { k: '#1a1622', g: '#3a7a3a', G: '#5aa04a', s: '#e8c09a', t: '#6a4a8a', T: '#9a7ac0', b: '#4a3424' };

function allyPos(eff) {
  return { x: eff.to.x + eff.dir.x * eff.C * 1.0, y: eff.to.y + eff.dir.y * eff.C * 1.0 };
}

function drawAlly(ctx, eff, T) {
  const mv = eff.mv;
  const C = eff.C;
  const { windup, impactAt } = mv.T;
  const end = impactAt + 420;
  if (T > end + 160) return;
  const p0 = allyPos(eff);
  const a = clamp01(T / Math.max(60, windup * 0.8)) * (1 - clamp01((T - end) / 160));
  const swingT0 = impactAt - 110;
  const lunge = T > swingT0 ? Math.sin(Math.PI * clamp01((T - swingT0) / 360)) * C * 0.18 : 0;
  const x = p0.x - eff.dir.x * lunge;
  const y = p0.y - eff.dir.y * lunge;
  setAlpha(ctx, 0.35 * a);
  disc(ctx, x, y + 6, 4, '#10180c');
  setAlpha(ctx, a);
  glyph(ctx, Math.round(x - 5), Math.round(y - 8), ALLY, ALLY_COLORS, eff.side > 0);
  setAlpha(ctx, 1);
  // Golpe do aliado: corte espelhado vindo do outro lado.
  const base = Math.atan2(-eff.dir.y, -eff.dir.x);
  const sideA = -eff.side;
  const angAt = (Tk) => {
    const p = clamp01((Tk - swingT0) / 160);
    const rel = Tk < swingT0 ? lerp(40, -120, clamp01(Tk / Math.max(1, swingT0))) : lerp(-120, 70, ease.outCubic(p));
    return base + rel * (Math.PI / 180) * sideA;
  };
  const hand = (Tk) => {
    const l = Tk > swingT0 ? Math.sin(Math.PI * clamp01((Tk - swingT0) / 360)) * C * 0.18 : 0;
    return { x: p0.x - eff.dir.x * (l + C * 0.28), y: p0.y - eff.dir.y * (l + C * 0.28) - C * 0.05 };
  };
  const L = 12;
  drawRibbon(ctx, (Tk) => {
    const th = angAt(Tk);
    const h = hand(Tk);
    return { tip: { x: h.x + Math.cos(th) * L, y: h.y + Math.sin(th) * L }, inner: { x: h.x + Math.cos(th) * L * 0.4, y: h.y + Math.sin(th) * L * 0.4 }, on: Tk > swingT0 + 10 && Tk < swingT0 + 200 };
  }, T, { ms: 90, ramp: ['#1e3a2a', '#2f7a4a', '#7ad68a', '#d6ffd0', WHITE] });
  const h = hand(T);
  drawWeapon(ctx, 'espada-longa', h.x, h.y, angAt(T), { mirror: eff.side > 0, alpha: a });
}

// ------------------------------------------------------------ corda e corrente
function ropePath(eff, T, g) {
  const mv = eff.mv;
  const C = eff.C;
  const pose = g.pose;
  const s = pose.seg;
  const handTip = { x: g.pivot.x + Math.cos(g.th) * 3, y: g.pivot.y + Math.sin(g.th) * 3 };
  const pts = [];
  const isLash = s && s.k === 'lash';
  const isTug = s && s.k === 'hold' && s.tug;
  if (isLash || isTug) {
    const p = pose.p;
    const target = s.low ? { x: eff.hit.x, y: eff.ground - 1 } : { x: eff.hit.x, y: eff.hit.y };
    let e = isTug ? 1 : ease.outCubic(clamp01(p / 0.7));
    if (!isTug && p > 0.88 && !s.wrap) e = lerp(1, 0.25, (p - 0.88) / 0.12);
    const end = { x: lerp(handTip.x, target.x, e), y: lerp(handTip.y, target.y, e) };
    const n = Math.max(4, Math.ceil(Math.hypot(end.x - handTip.x, end.y - handTip.y)));
    const amp = isTug ? 0 : (s.amp ?? 0.4) * C * (1 - e * 0.65);
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      let x = lerp(handTip.x, end.x, u);
      let y = lerp(handTip.y, end.y, u);
      const w = s.straight ? 0 : Math.sin(u * Math.PI) * Math.sin(u * Math.PI * 2.3 - p * 10) * amp;
      x += eff.perp.x * w;
      y += eff.perp.y * w;
      if (s.over && !isTug) y -= Math.sin(u * Math.PI) * C * 1.1 * (1 - e * 0.8);
      if (s.low && !isTug) y += Math.sin(u * Math.PI) * C * 0.15;
      pts.push({ x, y });
    }
    return { pts, tip: end, lash: true };
  }
  // Fora da chicotada: pendurada (ou esticada pelo giro).
  const spinning = s && s.k === 'spin';
  const L = spinning ? mv.len : (mv.rope === 'chain' ? C * 0.45 : C * 0.55);
  const tip = spinning ? g.tip : { x: handTip.x + Math.cos(g.th) * L * 0.4, y: handTip.y + L * 0.9 };
  const n = Math.max(4, Math.ceil(Math.hypot(tip.x - handTip.x, tip.y - handTip.y)));
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const sag = spinning ? 0 : Math.sin(u * Math.PI) * 2;
    pts.push({ x: lerp(handTip.x, tip.x, u), y: lerp(handTip.y, tip.y, u) + sag });
  }
  return { pts, tip, lash: false };
}

const BALL = ['.k.k.', 'kmmmk', 'mMmmm', 'kmmmk', '.k.k.'];

function drawRope(ctx, eff, T, g) {
  const mv = eff.mv;
  const path = ropePath(eff, T, g);
  const chain = mv.rope === 'chain';
  const tint = tintOf(eff);
  // cabo
  line(ctx, g.pivot.x - Math.cos(g.th) * 2, g.pivot.y - Math.sin(g.th) * 2, g.pivot.x + Math.cos(g.th) * 3, g.pivot.y + Math.sin(g.th) * 3, chain ? '#4f3424' : '#5a3a20', 2);
  path.pts.forEach((q, i) => {
    if (chain) {
      dot(ctx, q.x, q.y + 1, '#2a2a38', 1);
      dot(ctx, q.x, q.y, i % 2 ? '#a4aabc' : '#5e6274', 1);
    } else {
      const u = i / path.pts.length;
      dot(ctx, q.x, q.y + 1, '#2a1810', 1);
      dot(ctx, q.x, q.y, tint && u > 0.4 ? tint[3] : u > 0.85 ? '#d09a50' : '#8a5a2e', 1);
    }
  });
  if (chain) glyph(ctx, Math.round(path.tip.x) - 2, Math.round(path.tip.y) - 2, BALL, { k: '#2a2a38', m: tint ? tint[2] : '#7e8494', M: WHITE });
  else if (tint) dot(ctx, path.tip.x, path.tip.y, tint[4], 2);
  return path;
}

function drawWrap(ctx, eff, k) {
  const C = eff.C;
  const pal = rampOf(eff);
  for (const [dy, rx] of [[0.12, 0.34], [-0.18, 0.3]]) {
    const n = 18;
    for (let i = 0; i < n * k; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = eff.to.x + Math.cos(a) * C * rx;
      const y = eff.to.y + C * dy + Math.sin(a) * C * 0.1;
      const front = Math.sin(a) > 0;
      dot(ctx, x, y, front ? (eff.mv.rope === 'chain' ? '#a4aabc' : '#a0682e') : '#3a220e', 1);
      if (front && i % 4 === 0) dot(ctx, x, y - 1, pal[3], 1);
    }
  }
}

// ------------------------------------------------------------ projeteis
function drawProjectileSprite(ctx, eff, kind, q, big) {
  const c = Math.cos(q.ang);
  const s = Math.sin(q.ang);
  const at = (d, o = 0) => ({ x: q.x + c * d - s * o, y: q.y + s * d + c * o });
  const tint = tintOf(eff);
  if (kind === 'stone') {
    const r = big ? 2 : 1.5;
    disc(ctx, q.x, q.y, r, '#26222a');
    disc(ctx, q.x, q.y, r - 0.6, tint ? tint[2] : PALETTES.stone[2]);
    dot(ctx, q.x - 1, q.y - 1, tint ? tint[4] : PALETTES.stone[4], 1);
    return;
  }
  if (kind === 'pebble') { dot(ctx, q.x, q.y, PALETTES.stone[3], 1); return; }
  const len = kind === 'bolt' ? 7 : kind === 'dart' ? 5 : 10;
  const w = big || kind === 'bolt' ? 2 : 1;
  for (let d = -len + 1; d <= -1; d++) { const p = at(d); dot(ctx, p.x, p.y, d % 3 ? '#a0682e' : '#6e4220', w); }
  const h0 = at(0);
  const h1 = at(1);
  const h2 = at(2);
  dot(ctx, h0.x, h0.y, tint ? tint[3] : '#a4aabc', w + 1);
  dot(ctx, h1.x, h1.y, tint ? tint[4] : '#e6eaf2', w);
  if (kind !== 'dart') dot(ctx, h2.x, h2.y, WHITE, 1);
  const f = kind === 'dart' ? '#d84a3a' : '#d84a3a';
  const tail = -len + 1;
  for (const o of [-1, 1]) { const p = at(tail, o); dot(ctx, p.x, p.y, o > 0 ? f : '#f2e6c8', 1); const p2 = at(tail + 1, o); dot(ctx, p2.x, p2.y, f, 1); }
}

function drawProjectiles(ctx, eff, T) {
  const mv = eff.mv;
  const ramp = rampOf(eff);
  for (const pr of mv.projectiles) {
    const s = mv.segs[pr.seg];
    const q = projAt(eff, pr, T);
    if (!q) continue;
    const self = s.self || mv.proj === 'self';
    const kind = s.small ? 'pebble' : mv.proj;
    // Rastro do projetil.
    if (!q.stuck) {
      if (self) {
        const L = mv.len;
        drawRibbon(ctx, (Tk) => {
          const r = projAt(eff, pr, Tk);
          if (!r || r.stuck) return { on: false };
          const c = { x: r.x - Math.cos(r.ang) * L * 0.45, y: r.y - Math.sin(r.ang) * L * 0.45 };
          return { tip: { x: c.x + Math.cos(r.ang) * L, y: c.y + Math.sin(r.ang) * L }, inner: { x: c.x + Math.cos(r.ang) * L * 0.4, y: c.y + Math.sin(r.ang) * L * 0.4 }, on: true };
        }, T, { ms: 60, ramp, crit: eff.result === 'crit' });
      } else {
        for (let i = 5; i >= 1; i--) {
          const r = projAt(eff, pr, T - i * 14);
          if (!r || r.stuck) continue;
          setAlpha(ctx, (0.25 + 0.6 * (1 - i / 5)) * (q.fade ?? 1));
          const big = s.big || eff.elKey !== 'fisico';
          dot(ctx, r.x, r.y, eff.elKey !== 'fisico' ? ramp[i > 3 ? 1 : i > 1 ? 2 : 3] : (i > 2 ? PALETTES.puff[1] : PALETTES.puff[3]), big && i < 4 ? 2 : 1);
        }
        setAlpha(ctx, 1);
      }
    }
    if (s.rope && !q.stuck && q.start) {
      const h = weaponGeom(eff, T).pivot;
      line(ctx, h.x, h.y, q.x, q.y, '#c8b080', 1);
    }
    setAlpha(ctx, q.fade ?? 1);
    if (self) {
      const L = mv.len;
      drawWeapon(ctx, mv.held, q.x - Math.cos(q.ang) * L * 0.45, q.y - Math.sin(q.ang) * L * 0.45, q.ang, { mirror: eff.side < 0, tint: tintOf(eff), alpha: q.fade ?? 1 });
    } else if (kind === 'javelin') {
      drawWeapon(ctx, mv.held, q.x - Math.cos(q.ang) * 9, q.y - Math.sin(q.ang) * 9, q.ang, { mirror: eff.side < 0, tint: tintOf(eff), alpha: q.fade ?? 1 });
    } else {
      if (s.big && !q.stuck) disc(ctx, q.x, q.y, 2, ramp[2]);
      drawProjectileSprite(ctx, eff, kind, q, s.big);
    }
    // Critico: a flecha cravada brilha.
    if (q.inTarget && eff.result === 'crit') {
      const tw = Math.floor(T / 60) % 2;
      star4(ctx, q.x - Math.cos(q.ang) * 4, q.y - Math.sin(q.ang) * 4, 1 + tw, PALETTES.gold[3 + tw]);
    }
    setAlpha(ctx, 1);
  }
}

// ------------------------------------------------------------ chao
function drawFissure(ctx, eff, s, T) {
  const C = eff.C;
  const p = clamp01((T - s.t0) / s.ms);
  const fade = T > s.t1 ? 1 - clamp01((T - s.t1) / 420) : 1;
  if (fade <= 0) return;
  const a = { x: eff.from.x + eff.dir.x * C * 0.5, y: eff.fromGround };
  const b = { x: eff.hit.x, y: eff.ground };
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(2, Math.ceil(L * p));
  setAlpha(ctx, fade);
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const u = i / Math.max(1, L);
    const q = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) + Math.round(noise(i >> 1, 3) * 1.3) };
    line(ctx, prev.x, prev.y, q.x, q.y, '#1a1410', 1);
    if (i % 2) dot(ctx, q.x, q.y + 1, '#4e3a28', 1);
    prev = q;
  }
  // Frente da fenda: pedras/espinhos subindo.
  const front = { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p) };
  if (p < 1) {
    const h = 3 + Math.round(noise(7, Math.floor(T / 40)) * 1.5);
    const pal = s.spikes ? ['#3a2a1a', '#6e5640', '#a08462', '#d4bc94'] : PALETTES.stone;
    rect(ctx, front.x - 1, front.y - h, 3, h, pal[1]);
    rect(ctx, front.x - 1, front.y - h, 1, h, pal[3]);
  }
  if (s.spikes && T > s.t0) {
    for (let i = 1; i <= 5; i++) {
      const u = i / 6;
      const k = clamp01((p - u) * 4) * (1 - clamp01((T - s.t1 - 200) / 220));
      const H = Math.round(C * 0.35 * ease.back(k) * (i === 5 ? 1.6 : 1));
      if (H <= 0) continue;
      const x = Math.round(lerp(a.x, b.x, u));
      const y = Math.round(lerp(a.y, b.y, u));
      for (let j = 0; j < H; j++) {
        const w = Math.max(1, Math.round(3 * (1 - j / H)));
        rect(ctx, x - Math.floor(w / 2), y - j, w, 1, j > H - 2 ? '#d4bc94' : '#7e6a52');
        rect(ctx, x - Math.floor(w / 2), y - j, 1, 1, '#a08462');
      }
    }
  }
  setAlpha(ctx, 1);
}

function groundShock(ctx, eff, ia) {
  const C = eff.C;
  const x = eff.hit.x;
  const y = eff.ground;
  for (const [delay, R, col] of [[0, 1.2, PALETTES.dust[3]], [70, 0.8, PALETTES.dust[4]]]) {
    const k = (ia - delay) / 300;
    if (k < 0 || k > 1) continue;
    setAlpha(ctx, 1 - k * 0.8);
    ring(ctx, x, y, Math.max(1, C * R * eff.scale * ease.outCubic(k)), col, k < 0.4 ? 2 : 1, 0.32);
  }
  if (ia < 640) {
    setAlpha(ctx, ia > 420 ? 1 - (ia - 420) / 220 : 1);
    const k = clamp01(ia / 80);
    for (let i = 0; i < 5; i++) {
      const dirx = i % 2 ? 1 : -1;
      let px = x;
      let py = y;
      const steps = Math.round(C * 0.5 * k / 2) + (i === 2 ? 2 : 0);
      for (let j = 0; j < steps; j++) {
        const nx = px + dirx * (1.6 + (i >> 1) * 0.4) + noise(i, j) * 0.8;
        const ny = py + (i - 2) * 0.35 + noise(i + 9, j) * 0.6;
        line(ctx, px, py, nx, ny, '#1a1410', 1);
        px = nx; py = ny;
      }
    }
  }
  setAlpha(ctx, 1);
}

const DAZE = ['.y.', 'yYy', '.y.'];

function dazeStars(ctx, eff, ia) {
  if (ia < 60 || ia > 900) return;
  const C = eff.C;
  setAlpha(ctx, ia > 720 ? 1 - (ia - 720) / 180 : 1);
  for (let i = 0; i < 3; i++) {
    const a = ia * 0.011 + (i / 3) * Math.PI * 2;
    glyph(ctx, Math.round(eff.to.x + Math.cos(a) * C * 0.32) - 1, Math.round(eff.to.y - C * 0.66 + Math.sin(a) * C * 0.1) - 1, DAZE, { y: '#ffd84a', Y: '#fffbe0' });
  }
  setAlpha(ctx, 1);
}

// Arma (do alvo ou do atacante) voando e caindo no chao.
function flyingWeapon(ctx, eff, held, from, to, ia, dur, mirror) {
  const C = eff.C;
  const k = clamp01(ia / dur);
  const x = lerp(from.x, to.x, k);
  const y = lerp(from.y, to.y, k) - Math.sin(Math.PI * k) * C * 1.1;
  const ang = k < 1 ? ia * 0.03 : Math.PI * 0.1;
  const fade = ia > dur + 300 ? 1 - clamp01((ia - dur - 300) / 200) : 1;
  if (fade <= 0) return;
  if (k >= 1) { setAlpha(ctx, 0.35 * fade); rect(ctx, to.x - 4, to.y + 1, 9, 1, '#10180c'); }
  drawWeapon(ctx, held, x, y, ang, { mirror, alpha: fade });
}

// ------------------------------------------------------------ desenho principal
export function drawMove(ctx, eff, T) {
  const mv = eff.mv;
  const C = eff.C;
  const ramp = rampOf(eff);
  const tint = tintOf(eff);
  const crit = eff.result === 'crit';
  const { windup, impactAt } = mv.T;
  const ia = T - impactAt;
  const post = eff.phase !== 'attack';
  // Impacto que chegou atrasado (sem o ataque em voo): so os detalhes do impacto.
  const bodyless = eff.phase === 'impact' && !eff.linked;

  if (!bodyless) drawActorSide(ctx, eff, T);
  drawAfter(ctx, eff, T, ia, post);
}

function drawActorSide(ctx, eff, T) {
  const mv = eff.mv;
  const C = eff.C;
  const ramp = rampOf(eff);
  const tint = tintOf(eff);
  const crit = eff.result === 'crit';
  const { windup, impactAt } = mv.T;
  if (mv.move.mount) drawHorse(ctx, eff, T);
  if (mv.move.ally && eff.result !== 'fumble') drawAlly(ctx, eff, T);
  for (const s of mv.segs) if (s.k === 'ground' && T >= s.t0) drawFissure(ctx, eff, s, T);

  const g = weaponGeom(eff, T);
  const pose = g.pose;

  // Vulto do corpo atravessando (linhas de velocidade).
  if (mv.body.ghost && T > windup && T < impactAt + 60) {
    const at = g.at;
    for (let i = 0; i < 4; i++) {
      const o = (i - 1.5) * 3;
      const L2 = C * (0.6 + (i % 2) * 0.3);
      const bx = at.x - eff.dir.x * C * 0.4 + eff.perp.x * o;
      const by = at.y - eff.dir.y * C * 0.4 + eff.perp.y * o;
      line(ctx, bx - eff.dir.x * L2, by - eff.dir.y * L2, bx, by, i % 2 ? ramp[2] : ramp[3], 1);
    }
  }

  // Rastro.
  if (!mv.rope) {
    const multi = mv.trailStyle.multi || (pose.seg && pose.seg.multi);
    drawRibbon(ctx, weaponSample(eff), T, { ms: mv.trailStyle.ms * (crit ? 1.25 : 1), ramp, crit, offsets: multi ? [-3, 0, 3] : [0], thin: multi ? 0.6 : 1 });
  } else if (pose.seg && pose.seg.k === 'spin') {
    drawRibbon(ctx, weaponSample(eff), T, { ms: 110, ramp, crit, thin: 0.5 });
  }

  // Estocada: cunha de velocidade atras da ponta.
  if (pose.thrust && !mv.rope) {
    const th = pose.mAng != null ? worldAngle(eff, pose.mAng) : g.th;
    const dx = Math.cos(th);
    const dy = Math.sin(th);
    const tip = pose.mAng != null && pose.seg?.rev ? { x: g.pivot.x - Math.cos(g.th) * 2, y: g.pivot.y - Math.sin(g.th) * 2 } : g.tip;
    const L = C * 0.9 * (1 - pose.p) * (pose.seg?.pierce ? 1.5 : 1);
    if (L > 2) {
      const nx = -dy;
      const ny = dx;
      for (const o of [-3, 3]) line(ctx, tip.x - dx * L * 0.9 + nx * o, tip.y - dy * L * 0.9 + ny * o, tip.x - dx * 4 + nx * o, tip.y - dy * 4 + ny * o, ramp[1], 1);
      for (const o of [-1, 1]) line(ctx, tip.x - dx * L + nx * o, tip.y - dy * L + ny * o, tip.x - dx * 2 + nx * o, tip.y - dy * 2 + ny * o, ramp[2], 1);
      line(ctx, tip.x - dx * L * 0.6, tip.y - dy * L * 0.6, tip.x, tip.y, ramp[3], 1);
      if (pose.p > 0.35 && pose.p < 0.62) { star4(ctx, tip.x + dx * 2, tip.y + dy * 2, 2 * eff.scale, WHITE); }
    }
  }

  // Fantasmas da arma (golpes muito rapidos).
  const ghost = pose.seg?.ghost;
  if (ghost && !mv.rope) {
    for (let k = 3; k >= 1; k--) {
      const gk = weaponGeom(eff, T - k * 26);
      if (!gk.pose.show) continue;
      drawWeapon(ctx, mv.held, gk.pivot.x, gk.pivot.y, gk.th, { mirror: eff.side < 0, solid: ramp[k === 1 ? 3 : 2], alpha: 0.55 - k * 0.13 });
    }
  }

  // Arma na mao.
  let path = null;
  if (pose.show) {
    const alpha = pose.alpha ?? 1;
    if (mv.rope) { setAlpha(ctx, alpha); path = drawRope(ctx, eff, T, g); setAlpha(ctx, 1); }
    else if (mv.proj === 'arrow' && (!pose.seg || pose.seg.k === 'shot' || pose.seg.k === 'hold')) drawBow(ctx, eff, T, g);
    else if (mv.weapon?.sling && slingActive(eff, T)) drawSling(ctx, eff, T, g);
    else {
      const th = g.th;
      const glowing = pose.seg?.glow && tint == null ? PALETTES.gold : tint;
      drawWeapon(ctx, mv.held, g.pivot.x, g.pivot.y, th, { mirror: eff.side < 0, tint: glowing, alpha });
      if (pose.seg?.crank) {
        // Manivela girando ao lado da besta.
        const a = T * 0.03;
        const cx = g.pivot.x - Math.cos(th) * 2;
        const cy = g.pivot.y - Math.sin(th) * 2 + 2;
        line(ctx, cx, cy, cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, '#5e6274', 1);
        dot(ctx, cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, '#e6eaf2', 1);
      }
    }
  }

  // Brilho no fim da antecipacao ("ting").
  if (T < windup && pose.wind > 0.6) {
    const s = Math.round((1 - Math.abs(pose.wind - 0.85) / 0.25) * 2 * eff.scale);
    if (s > 0) star4(ctx, g.tip.x, g.tip.y, s, crit ? PALETTES.gold[3] : WHITE);
  }

  // Tinido de aparar e brilho de carga.
  for (const s of mv.segs) {
    if (s.k === 'hold' && s.tink) {
      const Tc = s.t0 + s.ms * 0.45;
      const d = T - Tc;
      if (d >= 0 && d < 110) {
        const gk = weaponGeom(eff, Tc);
        const mx = (gk.pivot.x + gk.tip.x) / 2;
        const my = (gk.pivot.y + gk.tip.y) / 2;
        star4(ctx, mx, my, Math.round((4 - d / 30) * eff.scale), WHITE, d < 40 ? 2 : 1);
        if (d < 70) ring(ctx, mx, my, 2 + d / 12, SPARKS.faisca[3], 1);
      }
    }
    if (s.k === 'hold' && s.glow && T >= s.t0 && T < s.t1) {
      const p = (T - s.t0) / s.ms;
      const pal = tint || PALETTES.gold;
      const r = 1 + p * 2.5 * eff.scale + (Math.floor(T / 50) % 2);
      setAlpha(ctx, 0.6);
      disc(ctx, g.tip.x, g.tip.y, r + 1, pal[2]);
      setAlpha(ctx, 1);
      disc(ctx, g.tip.x, g.tip.y, Math.max(0, r - 1), pal[4]);
    }
  }

  // Chicotada: estalo na ponta e voltas no alvo.
  for (const s of mv.segs) {
    if (s.k === 'lash' && s.crack) {
      const d = T - s.hitT;
      if (d >= 0 && d < 120 && path) star4(ctx, path.tip.x, path.tip.y, Math.round((5 - d / 30) * eff.scale), WHITE, d < 50 ? 2 : 1);
    }
    if (s.k === 'lash' && s.wrap && eff.result !== 'miss' && eff.result !== 'fumble') {
      const start = s.t0 + s.ms * 0.68;
      const stop = (mv.segs[s.i + 1]?.tug ? mv.segs[s.i + 1].t1 : s.t1) + 120;
      if (T >= start && T < stop) drawWrap(ctx, eff, clamp01((T - start) / 80));
    }
  }

  drawProjectiles(ctx, eff, T);
}

function drawAfter(ctx, eff, T, ia, post) {
  const mv = eff.mv;
  const C = eff.C;
  const ramp = rampOf(eff);
  const { impactAt } = mv.T;
  // Flash dos acertos intermediarios.
  const lands = eff.result === 'hit' || eff.result === 'crit';
  for (const h of mv.hits) {
    const d = T - h.t;
    if (d < 0 || d > 90) continue;
    const x = eff.hit.x + eff.perp.x * h.off;
    const y = eff.hit.y + eff.perp.y * h.off;
    if (lands && h.on) {
      if (d < 35) disc(ctx, x, y, 2 * eff.scale, WHITE);
      star4(ctx, x, y, Math.round(C * 0.4 * eff.scale * (1 - d / 90)), d < 45 ? WHITE : ramp[3]);
    } else if (d < 80) {
      setAlpha(ctx, 1 - d / 80);
      for (const o of [-2, 2]) line(ctx, x - eff.dir.x * C * 0.4 + eff.perp.x * o, y - eff.dir.y * C * 0.4 + eff.perp.y * o, x + eff.perp.x * o, y + eff.perp.y * o, PALETTES.puff[3], 1);
      setAlpha(ctx, 1);
    }
  }

  // Depois do contato.
  if (ia >= 0) {
    if (eff.result === 'fumble') {
      const hand = weaponGeom(eff, impactAt).pivot;
      const land = { x: eff.from.x - eff.dir.x * C * 0.9, y: eff.fromGround - 1 };
      if (!mv.rope && mv.proj !== 'arrow') flyingWeapon(ctx, eff, mv.held, hand, land, ia, 380, eff.side < 0);
    } else if (post && lands) {
      if (mv.quake || mv.segs.some((s) => s.quake && s.hit)) groundShock(ctx, eff, ia);
      if (mv.react === 'daze') dazeStars(ctx, eff, ia);
      if (mv.react === 'disarm') flyingWeapon(ctx, eff, 'adaga', { x: eff.to.x, y: eff.to.y }, { x: eff.to.x + eff.dir.x * C * 1.1, y: eff.ground - 1 }, ia, 420, eff.side > 0);
    }
  }
}

// Arco: corpo do arco girado perpendicular a mira, corda desenhada a parte (puxada
// ate a orelha na antecipacao, vibrando depois do disparo) e a flecha encaixada.
function bowPull(eff, T, g) {
  const mv = eff.mv;
  const s = g.pose.seg;
  if (g.pose.rec != null) return { pull: 0, nocked: false, twang: 0 };
  if (!s) return { pull: ease.inOut(clamp01((T / Math.max(1, mv.T.windup) - 0.2) / 0.8)), nocked: true, twang: 0 };
  if (s.k === 'hold') return { pull: 1, nocked: true, twang: 0 };
  if (s.k !== 'shot') return { pull: 0, nocked: false, twang: 0 };
  const mine = mv.projectiles.filter((p) => p.seg === s.i);
  const next = mine.find((p) => p.launch > T);
  const prev = [...mine].reverse().find((p) => p.launch <= T);
  const twang = prev ? clamp01(1 - (T - prev.launch) / 160) : 0;
  if (!next) return { pull: 0, nocked: false, twang };
  const gap = prev ? next.launch - prev.launch : next.launch - s.t0 + 60;
  const k = clamp01(1 - (next.launch - T) / Math.max(40, gap * 0.8));
  return { pull: ease.inOut(k), nocked: k > 0.15, twang };
}

function drawBow(ctx, eff, T, g) {
  const mv = eff.mv;
  const aim = g.th;
  const tint = tintOf(eff);
  const mirror = eff.side < 0;
  const bowTh = aim - (Math.PI / 2) * (mirror ? -1 : 1);
  const { pull, nocked, twang } = bowPull(eff, T, g);
  // O arco fica um pouco a frente do corpo (braco esticado).
  g = { ...g, pivot: { x: g.pivot.x + Math.cos(aim) * 3, y: g.pivot.y + Math.sin(aim) * 3 } };
  drawWeapon(ctx, mv.held, g.pivot.x, g.pivot.y, bowTh, { mirror: !mirror, tint, skipChan: 'a' });
  const ends = stringEnds(mv.held);
  if (!ends) return;
  const e0 = spritePoint(bowTh, !mirror, ends[0][0], ends[0][1]);
  const e1 = spritePoint(bowTh, !mirror, ends[1][0], ends[1][1]);
  const a = { x: g.pivot.x + e0.x, y: g.pivot.y + e0.y };
  const b = { x: g.pivot.x + e1.x, y: g.pivot.y + e1.y };
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const back = pull * 4 + Math.sin(T * 0.9) * twang * 1.5;
  const nock = { x: mid.x - Math.cos(aim) * back, y: mid.y - Math.sin(aim) * back };
  const cord = '#ece4d0';
  line(ctx, a.x, a.y, nock.x, nock.y, cord, 1);
  line(ctx, nock.x, nock.y, b.x, b.y, cord, 1);
  if (nocked) {
    const s = g.pose.seg;
    const q = { x: nock.x + Math.cos(aim) * 9, y: nock.y + Math.sin(aim) * 9, ang: aim };
    drawProjectileSprite(ctx, eff, 'arrow', q, s?.big || mv.segs.some((x) => x.k === 'shot' && x.big));
    if (s?.glow) star4(ctx, q.x + Math.cos(aim) * 2, q.y + Math.sin(aim) * 2, 1 + (Math.floor(T / 60) % 2), (tint || PALETTES.gold)[4]);
  }
}

// Funda: a pedra gira acima da cabeca ate o disparo.
function slingActive(eff, T) {
  const mv = eff.mv;
  const s = mv.segs.find((x) => x.k === 'shot');
  if (!s) return false;
  const first = mv.projectiles.find((p) => p.seg === s.i);
  return T < (first ? first.launch : s.t0);
}

function drawSling(ctx, eff, T, g) {
  const C = eff.C;
  const head = { x: g.at.x, y: g.at.y - C * 0.62 };
  const speed = 0.012 + 0.02 * clamp01(T / Math.max(1, eff.mv.T.windup));
  const a = T * speed * Math.PI;
  const R = C * 0.45;
  const st = { x: head.x + Math.cos(a) * R, y: head.y + Math.sin(a) * R * 0.35 };
  const ramp = rampOf(eff);
  for (let k = 1; k <= 6; k++) {
    const b = a - k * 0.35;
    setAlpha(ctx, 0.7 - k * 0.1);
    dot(ctx, head.x + Math.cos(b) * R, head.y + Math.sin(b) * R * 0.35, k < 3 ? ramp[3] : ramp[2], 1);
  }
  setAlpha(ctx, 1);
  line(ctx, g.pivot.x, g.pivot.y, head.x, head.y + 1, '#7a4e2e', 1);
  line(ctx, head.x, head.y + 1, st.x, st.y, '#a8794a', 1);
  drawProjectileSprite(ctx, eff, 'stone', { x: st.x, y: st.y, ang: 0 }, false);
}

export { poseAt };
