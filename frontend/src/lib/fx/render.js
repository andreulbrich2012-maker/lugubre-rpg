// Renderizador: desenha um efeito no instante t (ms desde o inicio) em um contexto
// 2D cujas coordenadas sao "pixels de efeito". So usa fillRect/globalAlpha (via
// draw.js), entao roda igual no navegador e no contexto falso dos testes/preview.
import { animTime, bodies, shakeAt, pathPoint, phaseAt, span } from './effect.js';
import { PALETTES, ELEMENTS } from './elements.js';
import { drawParticles } from './particles.js';
import { rect, dot, line, disc, ring, arc, glyph, star4, setAlpha, ease, clamp01, lerp } from './draw.js';
import { noise } from './rng.js';

const WHITE = '#ffffff';

export function renderEffect(ctx, eff, t) {
  const frame = { phase: phaseAt(eff, t), shake: shakeAt(eff, t), ...bodies(eff, t), done: t >= eff.T.total };
  if (frame.done) return frame;
  setAlpha(ctx, 1);
  if (eff.reduced) { drawReduced(ctx, eff, t); return frame; }
  const T = animTime(eff, t);
  const { windup, impactAt } = eff.T;
  if (eff.phase !== 'impact' || t < impactAt) {
    if (T < windup) drawAnticipation(ctx, eff, T);
    drawAction(ctx, eff, T);
    drawParticles(ctx, eff.action, T);
  }
  if (eff.phase !== 'attack' && t >= impactAt) {
    drawImpact(ctx, eff, T, t - impactAt);
    drawParticles(ctx, eff.particles, T);
    drawFlash(ctx, eff, t - impactAt);
  }
  setAlpha(ctx, 1);
  return frame;
}

// prefers-reduced-motion: so um clarao curto no alvo, sem voo, tremor ou particulas.
function drawReduced(ctx, eff, t) {
  const k = clamp01(t / eff.T.total);
  const pal = eff.trail;
  setAlpha(ctx, 1 - k);
  disc(ctx, eff.to.x, eff.to.y, eff.C * 0.45, pal[pal.length - 2]);
  disc(ctx, eff.to.x, eff.to.y, eff.C * 0.25, WHITE);
  setAlpha(ctx, 1);
}

// ------------------------------------------------------------ antecipacao
function drawAnticipation(ctx, eff, T) {
  const { from, dir, C, family, el, result } = eff;
  const k = clamp01(T / Math.max(1, eff.T.windup));
  const hand = { x: from.x + dir.x * C * 0.4, y: from.y + dir.y * C * 0.4 - C * 0.12 };
  if (family.group === 'magia' || family.action === 'orb' || family.action === 'breath') {
    // Brilho crescendo na mao.
    const pal = eff.trail;
    disc(ctx, hand.x, hand.y, 1 + k * 2.2 * eff.scale, pal[2]);
    disc(ctx, hand.x, hand.y, k * 1.4 * eff.scale, pal[4] || WHITE);
    return;
  }
  // "Ting" de brilho na arma no fim da preparacao (bem Stardew).
  if (k > 0.55) {
    const s = Math.round((1 - Math.abs(k - 0.8) / 0.25) * 2 * eff.scale);
    const gx = hand.x - dir.x * C * 0.2;
    const gy = hand.y - C * 0.25;
    if (s > 0) star4(ctx, gx, gy, s, result === 'crit' ? PALETTES.gold[3] : WHITE);
  }
  if (family.action === 'shield') drawShield(ctx, eff, hand.x - 3, hand.y - 4, k);
  void el;
}

// ------------------------------------------------------------ acao
function drawAction(ctx, eff, T) {
  const { windup, action, impactAt } = eff.T;
  const p = (T - windup) / Math.max(1, action);
  const linger = (T - impactAt) / 120; // 0..1 depois do contato
  if (p < 0 || linger > 1.6) return;
  const pc = clamp01(p);
  const f = eff.family.action;
  switch (f) {
    case 'slash': return slash(ctx, eff, pc, linger, 1);
    case 'xslash':
      slashArc(ctx, eff, clamp01(pc * 2), linger + (pc >= 1 ? 0.3 : 0), { flip: false, offset: -0.12 });
      if (pc > 0.5) slashArc(ctx, eff, clamp01(pc * 2 - 1), linger, { flip: true, offset: 0.12 });
      return undefined;
    case 'heavy': return slash(ctx, eff, pc, linger, 1.4, true);
    case 'smash': return slash(ctx, eff, pc, linger, 1.1, true);
    case 'spin': return spin(ctx, eff, pc, linger);
    case 'thrust': case 'sting': return thrust(ctx, eff, pc, linger, f === 'sting');
    case 'pole': return pole(ctx, eff, pc, linger);
    case 'dash': return dash(ctx, eff, pc, linger);
    case 'whip': return whip(ctx, eff, pc, linger);
    case 'punch': case 'touch': return punch(ctx, eff, pc, linger, f === 'touch');
    case 'claw': return claw(ctx, eff, pc, linger);
    case 'shield': return shieldBash(ctx, eff, pc, linger);
    case 'arrow': case 'bolt': case 'throw': case 'stone': return missile(ctx, eff, pc, linger);
    case 'orb': case 'lob': case 'wisp': return orb(ctx, eff, pc, linger);
    case 'beam': return T < impactAt ? beam(ctx, eff, T) : undefined; // depois do contato quem desenha e o impacto
    case 'rise': return riseMotes(ctx, eff, pc, linger);
    case 'ripple': return ripple(ctx, eff, pc, linger);
    case 'blink': return blink(ctx, eff, pc, linger);
    case 'bite': return bite(ctx, eff, pc, linger);
    case 'breath': return undefined; // so particulas
    default: return undefined;
  }
}

// Cor da trilha: u=0 cauda (escura) -> u=1 cabeca (branca).
function trailColor(pal, u, edge) {
  if (edge) return u > 0.55 ? WHITE : pal[Math.min(pal.length - 1, 3)];
  if (u > 0.75) return pal[Math.min(pal.length - 1, 3)];
  if (u > 0.4) return pal[2];
  return pal[1];
}

function slash(ctx, eff, p, linger, size, overhead = false) {
  slashArc(ctx, eff, p, linger, { size, overhead });
}

// Meia-lua do golpe: pivo entre atacante e alvo, varre de cima para baixo pelo alvo.
function slashArc(ctx, eff, p, linger, { size = 1, overhead = false, flip = false, offset = 0 } = {}) {
  const { hit, dir, C, side, trail } = eff;
  const s = size * eff.scale;
  const R = C * 0.85 * s;
  const base = Math.atan2(dir.y, dir.x);
  const cx = hit.x - dir.x * C * 0.55 * s + eff.perp.x * offset * C;
  const cy = hit.y - dir.y * C * 0.55 * s + eff.perp.y * offset * C - (overhead ? C * 0.15 : 0);
  let a0 = base - (overhead ? 1.6 : 1.05) * side;
  let a1 = base + (overhead ? 0.55 : 0.95) * side;
  if (flip) { const tmp = a0; a0 = a1; a1 = tmp; }
  const head = a0 + (a1 - a0) * ease.outCubic(p);
  const len = 1.5;
  let tail = a0 + (a1 - a0) * Math.max(0, ease.outCubic(p) - len / Math.abs(a1 - a0));
  if (linger > 0) {
    const k = clamp01(linger);
    tail = tail + (head - tail) * k;
  }
  if (Math.abs(head - tail) < 0.02) return;
  const wmax = (overhead ? 3 : 2) * s + (linger > 0 ? -1 : 0);
  arc(ctx, cx, cy, R, tail, head,
    (u, k) => trailColor(trail, u, k === 0),
    (u) => 1 + (wmax - 1) * u);
  // Cabeca do golpe: ponto branco grosso.
  if (linger <= 0) dot(ctx, cx + Math.cos(head) * (R - 1), cy + Math.sin(head) * (R - 1), WHITE, Math.max(2, Math.round(wmax)));
}

function spin(ctx, eff, p, linger) {
  const { from, C, trail } = eff;
  const R = C * 0.95 * eff.scale;
  const start = Math.atan2(eff.dir.y, eff.dir.x) - Math.PI * 1.2;
  const head = start + Math.PI * 2.2 * ease.outCubic(p);
  let tail = Math.max(start, head - 2.6);
  if (linger > 0) tail += (head - tail) * clamp01(linger);
  if (head - tail < 0.02) return;
  arc(ctx, from.x, from.y - C * 0.05, R, tail, head, (u, k) => trailColor(trail, u, k === 0), (u) => 1 + 2 * u);
  arc(ctx, from.x, from.y - C * 0.05, R * 0.62, tail + 0.4, head, (u) => trailColor(trail, u * 0.7, false), () => 1);
}

function thrust(ctx, eff, p, linger, poison) {
  const { hit, dir, perp, C, trail } = eff;
  const s = eff.scale;
  const back = { x: hit.x - dir.x * C * 1.1, y: hit.y - dir.y * C * 1.1 };
  const tipEnd = { x: hit.x + dir.x * C * 0.25, y: hit.y + dir.y * C * 0.25 };
  const e = ease.outCubic(p);
  const tip = { x: lerp(back.x, tipEnd.x, e), y: lerp(back.y, tipEnd.y, e) };
  let L = C * 0.9 * e;
  if (linger > 0) L *= 1 - clamp01(linger);
  if (L < 1) return;
  const tail = { x: tip.x - dir.x * L, y: tip.y - dir.y * L };
  const pal = poison ? PALETTES.poison : trail;
  for (const o of [-3, 3]) {
    const sl = 0.55;
    line(ctx, tail.x + perp.x * o + dir.x * L * (1 - sl), tail.y + perp.y * o + dir.y * L * (1 - sl), tip.x + perp.x * o - dir.x * 3, tip.y + perp.y * o - dir.y * 3, pal[1], 1);
  }
  line(ctx, tail.x, tail.y, tip.x, tip.y, pal[2], Math.round(2 * s));
  line(ctx, tail.x + dir.x * L * 0.4, tail.y + dir.y * L * 0.4, tip.x, tip.y, pal[3], 1);
  dot(ctx, tip.x, tip.y, WHITE, Math.round(2 * s));
}

function pole(ctx, eff, p, linger) {
  const { from, hit, dir, C } = eff;
  const e = ease.outCubic(p);
  const start = { x: from.x + dir.x * C * 0.2, y: from.y + dir.y * C * 0.2 - 1 };
  const end = { x: hit.x + dir.x * C * 0.25, y: hit.y + dir.y * C * 0.25 };
  const reach = linger > 0 ? 1 - clamp01(linger) * 0.6 : e;
  const tip = { x: lerp(start.x - dir.x * C * 0.3, end.x, reach), y: lerp(start.y - dir.y * C * 0.3, end.y, reach) };
  setAlpha(ctx, linger > 0 ? 1 - clamp01(linger) : 1);
  line(ctx, start.x, start.y, tip.x - dir.x * 3, tip.y - dir.y * 3, PALETTES.wood[2], 1);
  line(ctx, start.x + 1, start.y + 1, tip.x - dir.x * 3 + 1, tip.y - dir.y * 3 + 1, PALETTES.wood[0], 1);
  line(ctx, tip.x - dir.x * 3, tip.y - dir.y * 3, tip.x, tip.y, PALETTES.steel[3], 2);
  dot(ctx, tip.x + dir.x, tip.y + dir.y, WHITE, 1);
  setAlpha(ctx, 1);
  if (linger <= 0) {
    for (const o of [-2, 2]) line(ctx, tip.x - dir.x * C * 0.8 + eff.perp.x * o, tip.y - dir.y * C * 0.8 + eff.perp.y * o, tip.x - dir.x * C * 0.3 + eff.perp.x * o, tip.y - dir.y * C * 0.3 + eff.perp.y * o, eff.trail[2], 1);
  }
}

function dash(ctx, eff, p, linger) {
  const { from, dir, perp, C } = eff;
  if (linger > 0) return;
  const reach = Math.max(0, Math.min(eff.family.lunge * C, eff.dist - C * 0.75));
  const head = { x: from.x + dir.x * reach * ease.outCubic(p), y: from.y + dir.y * reach * ease.outCubic(p) };
  for (let i = 0; i < 4; i++) {
    const o = (i - 1.5) * C * 0.22;
    const L = C * (0.5 + (i % 2) * 0.3);
    const bx = head.x - dir.x * C * 0.5 + perp.x * o;
    const by = head.y - dir.y * C * 0.5 + perp.y * o;
    line(ctx, bx - dir.x * L, by - dir.y * L, bx, by, i % 2 ? PALETTES.puff[3] : WHITE, 1);
  }
}

function whip(ctx, eff, p, linger) {
  const { from, hit, dir, perp, C } = eff;
  const start = { x: from.x + dir.x * C * 0.35, y: from.y + dir.y * C * 0.35 - C * 0.1 };
  const L = Math.hypot(hit.x - start.x, hit.y - start.y);
  const shown = L * (linger > 0 ? 1 : ease.outCubic(p));
  const fade = linger > 0 ? 1 - clamp01(linger) : 1;
  if (fade <= 0) return;
  setAlpha(ctx, fade);
  const n = Math.max(2, Math.round(shown));
  let last = null;
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * shown;
    const u = s / Math.max(1, L);
    const amp = C * 0.35 * Math.sin(u * Math.PI) * (1 - p * 0.7);
    const w = Math.sin(u * Math.PI * 2.5 - p * 9) * amp;
    const x = start.x + dir.x * s + perp.x * w;
    const y = start.y + dir.y * s + perp.y * w;
    dot(ctx, x, y + 1, PALETTES.wood[0], 1);
    dot(ctx, x, y, u > 0.85 ? eff.trail[3] : PALETTES.wood[2], 1);
    last = { x, y };
  }
  if (last && p >= 0.95 && linger < 0.5) star4(ctx, last.x, last.y, 2, WHITE);
  setAlpha(ctx, 1);
}

function punch(ctx, eff, p, linger, glow) {
  const { hit, dir, perp, C, trail } = eff;
  const e = ease.outCubic(p);
  const back = { x: hit.x - dir.x * C * 0.8, y: hit.y - dir.y * C * 0.8 };
  const tip = { x: lerp(back.x, hit.x, e), y: lerp(back.y, hit.y, e) };
  const L = C * 0.6 * (linger > 0 ? 1 - clamp01(linger) : e);
  if (L < 1) return;
  const pal = glow ? trail : PALETTES.puff;
  for (const o of [-3, 0, 3]) {
    line(ctx, tip.x - dir.x * L + perp.x * o, tip.y - dir.y * L + perp.y * o, tip.x - dir.x * 4 + perp.x * o, tip.y - dir.y * 4 + perp.y * o, o === 0 ? pal[3] : pal[2], 1);
  }
  if (linger <= 0) {
    disc(ctx, tip.x, tip.y, 2 * eff.scale, glow ? trail[3] : PALETTES.steel[2]);
    disc(ctx, tip.x - 1, tip.y - 1, 1, WHITE);
  }
}

function claw(ctx, eff, p, linger) {
  const { hit, dir, C } = eff;
  const pal = eff.trail;
  const a = Math.atan2(dir.y, dir.x) + (eff.side > 0 ? 1.1 : -1.1);
  const d = { x: Math.cos(a), y: Math.sin(a) };
  const n = { x: -d.y, y: d.x };
  const half = C * 0.5 * eff.scale;
  const fade = linger > 0 ? clamp01(1 - (linger - 0.6)) : 1;
  if (fade <= 0) return;
  setAlpha(ctx, fade);
  for (let i = 0; i < 3; i++) {
    const k = clamp01(p * 1.6 - i * 0.3);
    if (k <= 0) continue;
    const off = (i - 1) * 3.5 * eff.scale;
    const s0 = { x: hit.x - d.x * half + n.x * off, y: hit.y - d.y * half + n.y * off };
    const e = ease.outCubic(k);
    const s1 = { x: s0.x + d.x * half * 2 * e, y: s0.y + d.y * half * 2 * e };
    line(ctx, s0.x + 1, s0.y + 1, s1.x + 1, s1.y + 1, pal[0], 1);
    line(ctx, s0.x, s0.y, s1.x, s1.y, linger > 0 ? pal[2] : pal[3], 1);
    if (k < 1) dot(ctx, s1.x, s1.y, WHITE, 2);
  }
  setAlpha(ctx, 1);
}

const SHIELD = [
  'kkkkkkk',
  'kllmmmk',
  'klmeemk',
  'kmeeemk',
  'kmmemmk',
  '.kmmmk.',
  '.kkmkk.',
  '..kkk..'
];

function drawShield(ctx, eff, x, y, k) {
  setAlpha(ctx, clamp01(k * 2));
  glyph(ctx, x, y, SHIELD, { k: '#1a1622', m: PALETTES.steel[2], l: WHITE, e: '#e0a63a' });
  setAlpha(ctx, 1);
}

function shieldBash(ctx, eff, p, linger) {
  const { from, hit, dir, C } = eff;
  const e = ease.outCubic(p);
  const reach = Math.max(0, Math.min(eff.dist - C * 0.9, C * 0.6));
  const sx = from.x + dir.x * (C * 0.4 + reach * e);
  const sy = from.y + dir.y * (C * 0.4 + reach * e) - C * 0.12;
  if (linger < 0.8) drawShield(ctx, eff, sx - 3, sy - 4, 1);
  // Onda de choque achatada empurrando o alvo.
  if (p > 0.4) {
    const k = clamp01((p - 0.4) / 0.6 + Math.max(0, linger) * 0.5);
    const base = Math.atan2(dir.y, dir.x);
    setAlpha(ctx, 1 - clamp01(linger));
    arc(ctx, lerp(sx, hit.x, k * 0.8), lerp(sy, hit.y, k * 0.8), C * (0.35 + 0.25 * k), base - 0.9, base + 0.9, (u) => (Math.abs(u - 0.5) < 0.25 ? ELEMENTS.eter.ramp[4] : ELEMENTS.eter.ramp[3]), () => 2);
    setAlpha(ctx, 1);
  }
}

function drawMissileSprite(ctx, kind, x, y, ang, scale) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const at = (d, o = 0) => ({ x: x + c * d - s * o, y: y + s * d + c * o });
  if (kind === 'stone') {
    rect(ctx, Math.round(x) - 1, Math.round(y) - 1, 2 + (scale > 1 ? 1 : 0), 2 + (scale > 1 ? 1 : 0), PALETTES.stone[2]);
    dot(ctx, x - 1, y - 1, PALETTES.stone[4], 1);
    return;
  }
  const len = kind === 'bolt' ? 6 : kind === 'throw' ? 8 : 10;
  for (let d = -len + 2; d <= 0; d++) { const q = at(d - 1); dot(ctx, q.x, q.y, PALETTES.wood[2], kind === 'bolt' ? 2 : 1); }
  const h1 = at(1);
  const h2 = at(0);
  dot(ctx, h2.x, h2.y, PALETTES.steel[3], kind === 'bolt' ? 2 : 1);
  dot(ctx, h1.x, h1.y, WHITE, 1);
  if (kind === 'arrow' || kind === 'bolt') {
    const f1 = at(-len + 1, 1);
    const f2 = at(-len + 1, -1);
    const f3 = at(-len + 2, 1);
    dot(ctx, f1.x, f1.y, '#d84a3a', 1);
    dot(ctx, f2.x, f2.y, '#f2e6c8', 1);
    if (kind === 'arrow') dot(ctx, f3.x, f3.y, '#d84a3a', 1);
  }
}

function missile(ctx, eff, p, linger) {
  const f = eff.family.action;
  if (linger > 0) {
    // Erro: a flecha fica fincada no chao; acerto: some no alvo.
    if (eff.result === 'miss' || eff.result === 'fumble') {
      const q = pathPoint(eff, 1);
      const ang = Math.atan2(1, eff.dir.x >= 0 ? 0.6 : -0.6);
      setAlpha(ctx, 1 - clamp01(linger - 0.9));
      drawMissileSprite(ctx, f === 'throw' ? 'arrow' : f, q.x, q.y, ang, 1);
      setAlpha(ctx, 1);
    }
    return;
  }
  const q = pathPoint(eff, p);
  const q2 = pathPoint(eff, Math.min(1, p + 0.02));
  let ang = Math.atan2(q2.y - q.y, q2.x - q.x);
  if (f === 'throw') ang += p * Math.PI * 5 * eff.side;
  // Rastro: posicoes anteriores, do escuro ao claro.
  const steps = f === 'bolt' ? 6 : 4;
  for (let i = steps; i >= 1; i--) {
    const u = p - i * 0.035;
    if (u < 0) continue;
    const r = pathPoint(eff, u);
    setAlpha(ctx, 0.25 + 0.5 * (1 - i / steps));
    dot(ctx, r.x, r.y, i > steps / 2 ? PALETTES.puff[1] : PALETTES.puff[3], 1);
  }
  setAlpha(ctx, 1);
  drawMissileSprite(ctx, f, q.x, q.y, ang, eff.scale);
}

function orb(ctx, eff, p, linger) {
  if (linger > 0) return;
  const pal = eff.trail;
  const q = pathPoint(eff, p);
  for (let i = 5; i >= 1; i--) {
    const u = p - i * 0.03;
    if (u < 0) continue;
    const r = pathPoint(eff, u);
    disc(ctx, r.x, r.y, Math.max(0, 2 - i * 0.4) * eff.scale, pal[Math.max(0, 3 - Math.ceil(i / 2))]);
  }
  const flick = noise(1, Math.floor(p * 40)) > 0 ? 1 : 0;
  const R = (eff.family.action === 'lob' ? 3 : 2.4) * eff.scale;
  disc(ctx, q.x, q.y, R + flick * 0.5, pal[1]);
  disc(ctx, q.x, q.y, R - 0.8, pal[3]);
  disc(ctx, q.x - 1, q.y - 1, Math.max(0, R - 2), pal[4] || WHITE);
  if (eff.family.action === 'wisp') dot(ctx, q.x + eff.dir.x, q.y, pal[4], 1);
}

// Raio: estende do conjurador ao alvo e segura um instante tremulando.
function beam(ctx, eff, T) {
  const { windup, action, impactAt } = eff.T;
  const pal = eff.trail;
  const hold = 240;
  const p = clamp01((T - windup) / Math.max(1, action));
  const after = T - impactAt;
  if (after > hold) return;
  const start = { x: eff.from.x + eff.dir.x * eff.C * 0.4, y: eff.from.y + eff.dir.y * eff.C * 0.4 - eff.C * 0.1 };
  const end = { x: lerp(start.x, eff.hit.x, ease.out(p)), y: lerp(start.y, eff.hit.y, ease.out(p)) };
  const L = Math.hypot(end.x - start.x, end.y - start.y);
  const thin = after > 0 ? clamp01(after / hold) : 0;
  const w = Math.max(0, Math.round((3 - thin * 2.5) * eff.scale));
  const zig = eff.el.motion === 'jitter' || eff.elKey === 'ponto' || eff.elKey === 'caos';
  const frame = Math.floor(T / 40);
  const n = Math.max(1, Math.round(L));
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    let o = 0;
    if (zig) o = Math.round(noise(Math.floor(i / 3), frame) * 1.6);
    else o = Math.round(Math.sin(u * 14 - T * 0.03) * 0.6);
    const x = start.x + (end.x - start.x) * u + eff.perp.x * o;
    const y = start.y + (end.y - start.y) * u + eff.perp.y * o;
    if (w >= 2) dot(ctx, x, y, pal[2], w + 2);
    if (w >= 1) dot(ctx, x, y, pal[3], Math.max(1, w));
    dot(ctx, x, y, w >= 2 ? WHITE : pal[4], 1);
  }
  disc(ctx, start.x, start.y, 2 + (1 - thin) * 1.5, pal[3]);
  disc(ctx, start.x, start.y, 1, WHITE);
}

function riseMotes(ctx, eff, p, linger) {
  if (linger > 0 || eff.dist < eff.C * 0.5) return;
  const pal = eff.trail;
  for (let i = 0; i < 3; i++) {
    const u = clamp01(p * 1.2 - i * 0.1);
    if (u <= 0 || u >= 1) continue;
    const q = pathPoint(eff, u);
    dot(ctx, q.x, q.y - i * 2, pal[4], 1);
    dot(ctx, q.x - 1, q.y - i * 2, pal[3], 1);
    dot(ctx, q.x + 1, q.y - i * 2, pal[3], 1);
    dot(ctx, q.x, q.y - i * 2 - 1, pal[3], 1);
    dot(ctx, q.x, q.y - i * 2 + 1, pal[3], 1);
  }
}

// Terreno: o chao "ondula" do conjurador ate o alvo.
function ripple(ctx, eff, p, linger) {
  if (linger > 0.5) return;
  const pal = eff.elKey === 'gaia' ? PALETTES.dust : eff.trail;
  const a = { x: eff.from.x, y: eff.fromGround };
  const b = { x: eff.hit.x, y: eff.ground };
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  const front = L * ease.out(p);
  for (let s = 0; s <= front; s += 3) {
    const h = Math.max(0, Math.round(3 * (1 - (front - s) / (eff.C * 0.9))));
    if (h <= 0) continue;
    const u = s / Math.max(1, L);
    const x = lerp(a.x, b.x, u);
    const y = lerp(a.y, b.y, u);
    rect(ctx, x - 1, y - h, 3, h, pal[1]);
    rect(ctx, x - 1, y - h, 2, 1, pal[3]);
  }
}

function blink(ctx, eff, p, linger) {
  if (linger > 0) return;
  const pal = eff.trail;
  const { from, hit, C } = eff;
  for (let i = 0; i < 4; i++) {
    const u = clamp01(p - i * 0.12);
    if (u <= 0) continue;
    const x = lerp(from.x, hit.x, ease.inOut(u));
    const y = lerp(from.y, hit.y, ease.inOut(u));
    setAlpha(ctx, 0.75 - i * 0.17);
    const w = Math.round(C * 0.4);
    const h = Math.round(C * 0.7);
    rect(ctx, x - w / 2, y - h / 2, w, 1, pal[3]);
    rect(ctx, x - w / 2, y + h / 2, w, 1, pal[2]);
    rect(ctx, x - w / 2, y - h / 2, 1, h, pal[3]);
    rect(ctx, x + w / 2, y - h / 2, 1, h + 1, pal[2]);
  }
  setAlpha(ctx, 1);
}

// Mordida: duas fileiras de dentes que fecham no alvo.
function bite(ctx, eff, p, linger) {
  const { hit, C } = eff;
  const fade = linger > 0 ? 1 - clamp01(linger - 0.4) : 1;
  if (fade <= 0) return;
  const gap = Math.round(C * 0.55 * (1 - ease.in(p))) + 1;
  const w = Math.round(C * 0.9 * eff.scale);
  const x0 = Math.round(hit.x - w / 2);
  const y = Math.round(hit.y);
  setAlpha(ctx, fade);
  const gum = PALETTES.beast[1];
  const tooth = '#f6eedc';
  const toothShade = '#c8bca4';
  rect(ctx, x0, y - gap - 2, w, 2, gum);
  rect(ctx, x0, y + gap + 1, w, 2, gum);
  for (let x = 0; x + 3 <= w; x += 4) {
    rect(ctx, x0 + x, y - gap, 3, 1, tooth);
    rect(ctx, x0 + x + 1, y - gap + 1, 1, 1, toothShade);
    rect(ctx, x0 + x + 2, y + gap, 3, 1, tooth);
    rect(ctx, x0 + x + 3, y + gap - 1, 1, 1, toothShade);
  }
  setAlpha(ctx, 1);
}

// ------------------------------------------------------------ impacto
function drawImpact(ctx, eff, T, rt) {
  const ia = T - eff.T.impactAt; // relogio de animacao (para durante o hit-stop)
  const { hit, C, result, family } = eff;
  const pal = eff.trail;
  if (result === 'fumble') return stumble(ctx, eff, ia);
  if (result === 'miss') return whiff(ctx, eff, ia);
  const s = eff.scale;
  switch (family.impact) {
    case 'cut': case 'pierce': case 'claw': case 'bite': case 'poison': {
      if (family.impact === 'cut' && ia < 140) {
        // Risco branco atravessando o alvo.
        const k = 1 - ia / 140;
        const a = Math.atan2(eff.dir.y, eff.dir.x) + 0.9 * eff.side;
        const L = C * 0.55 * s * k;
        line(ctx, hit.x - Math.cos(a) * L, hit.y - Math.sin(a) * L, hit.x + Math.cos(a) * L, hit.y + Math.sin(a) * L, WHITE, 1);
      }
      ringPulse(ctx, hit.x, hit.y, ia, 160, C * 0.45 * s, eff.elKey === 'fisico' ? PALETTES.impact[3] : pal[3]);
      break;
    }
    case 'crush': case 'bash': {
      ringPulse(ctx, hit.x, eff.ground, ia, 260, C * 0.85 * s, PALETTES.dust[3], 0.35, 2);
      if (family.action === 'heavy' || result === 'crit') cracks(ctx, eff, ia);
      ringPulse(ctx, hit.x, hit.y, ia, 140, C * 0.4 * s, PALETTES.impact[3]);
      break;
    }
    case 'pow': {
      if (ia < 200) {
        const k = ia / 200;
        const r = C * (0.2 + 0.45 * ease.out(k)) * s;
        setAlpha(ctx, 1 - k);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + 0.2;
          const r0 = r * 0.6;
          line(ctx, hit.x + Math.cos(a) * r0, hit.y + Math.sin(a) * r0, hit.x + Math.cos(a) * r, hit.y + Math.sin(a) * r, i % 2 ? PALETTES.impact[3] : WHITE, 1);
        }
        setAlpha(ctx, 1);
      }
      break;
    }
    case 'burst': case 'arrive':
      ringPulse(ctx, hit.x, hit.y, ia, 220, C * 0.7 * s, pal[3], 1, 2);
      if (family.impact === 'arrive') ringPulse(ctx, hit.x, eff.ground, ia, 300, C * 0.6, pal[2], 0.35, 1);
      if (family.action === 'beam') beam(ctx, eff, T);
      break;
    case 'blast': {
      if (ia < 520) {
        const k = ia / 520;
        setAlpha(ctx, 0.45 * (1 - k));
        disc(ctx, hit.x, eff.ground, C * 1.1 * s * (0.5 + 0.5 * ease.out(Math.min(1, k * 3))), pal[0]);
        setAlpha(ctx, 1);
      }
      if (ia < 100) disc(ctx, hit.x, hit.y, C * (0.25 + ia / 500) * s, pal[4] || WHITE);
      ringPulse(ctx, hit.x, hit.y, ia, 280, C * 1.5 * s, pal[3], 1, 2);
      ringPulse(ctx, hit.x, hit.y, ia - 70, 260, C * 1.0 * s, pal[2], 1, 1);
      break;
    }
    case 'heal': healColumn(ctx, eff, ia); break;
    case 'terrain': spikes(ctx, eff, ia); break;
    case 'bind': bindRing(ctx, eff, ia); break;
    case 'curse': rune(ctx, eff, ia); break;
    default: break;
  }
  if (result === 'crit') ringPulse(ctx, hit.x, hit.y, ia - 40, 260, C * 1.1, PALETTES.gold[3], 1, 1);
  void rt;
}

function ringPulse(ctx, x, y, ia, dur, R, color, sy = 1, thick = 1) {
  if (ia < 0 || ia > dur) return;
  const k = ia / dur;
  setAlpha(ctx, 1 - k * 0.7);
  ring(ctx, x, y, Math.max(1, R * ease.outCubic(k)), color, k < 0.5 ? thick + 1 : thick, sy);
  setAlpha(ctx, 1);
}

function cracks(ctx, eff, ia) {
  if (ia > 620) return;
  const { hit, C } = eff;
  const k = clamp01(ia / 90);
  setAlpha(ctx, ia > 420 ? 1 - (ia - 420) / 200 : 1);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * (0.05 + i * 0.3) + (eff.side > 0 ? 0 : 0.1);
    let x = hit.x;
    let y = eff.ground;
    const steps = Math.round(C * 0.55 * k / 2);
    for (let j = 0; j < steps; j++) {
      const nx = x + Math.cos(a) * 2 * (i < 2 ? -1 : 1) + noise(i, j) * 1;
      const ny = y + Math.abs(Math.sin(a)) * 0.6 + noise(i + 9, j) * 0.6;
      line(ctx, x, y, nx, ny, '#1a1410', 1);
      x = nx; y = ny;
    }
  }
  setAlpha(ctx, 1);
}

function healColumn(ctx, eff, ia) {
  const { hit, C } = eff;
  const pal = eff.trail;
  if (ia > 620) return;
  const k = ia / 620;
  const grow = ease.out(clamp01(ia / 160));
  setAlpha(ctx, 0.85 * (1 - k));
  const H = C * 1.3 * grow;
  for (let i = -3; i <= 3; i++) {
    const x = hit.x + i * 2;
    const h = H * (1 - Math.abs(i) / 4.5) * (0.8 + 0.2 * Math.sin(ia * 0.02 + i));
    rect(ctx, x, eff.ground - h, 1, h, Math.abs(i) <= 1 ? pal[4] : pal[3]);
  }
  setAlpha(ctx, 1);
  ringPulse(ctx, hit.x, eff.ground, ia, 420, C * 0.6, pal[3], 0.35, 1);
}

function spikes(ctx, eff, ia) {
  const { hit, C } = eff;
  const gaia = eff.elKey === 'gaia';
  const pal = eff.trail;
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    const bx = Math.round(hit.x + Math.cos(a) * C * 0.55);
    const by = Math.round(eff.ground + Math.sin(a) * C * 0.22);
    const delay = i * 25;
    const grow = ease.back(clamp01((ia - delay) / 150));
    const shrink = clamp01((ia - 560) / 220);
    const H = Math.round(C * (0.5 + (i % 3) * 0.15) * eff.scale * Math.max(0, grow) * (1 - shrink));
    if (H <= 0) continue;
    if (gaia) {
      for (let y = 0; y < H; y++) {
        const x = bx + Math.round(Math.sin(y * 0.5 + i) * 1.2);
        rect(ctx, x, by - y, 1, 1, PALETTES.poison[1]);
        rect(ctx, x + 1, by - y, 1, 1, pal[2]);
        if (y % 4 === 2) rect(ctx, x + ((y >> 2) % 2 ? 2 : -1), by - y, 1, 1, pal[3]);
      }
      rect(ctx, bx, by - H - 1, 2, 1, pal[4]);
    } else {
      for (let y = 0; y < H; y++) {
        const w = Math.max(1, Math.round(2.5 * (1 - y / H)));
        rect(ctx, bx - Math.floor(w / 2), by - y, w, 1, pal[2]);
        rect(ctx, bx - Math.floor(w / 2), by - y, 1, 1, pal[4]);
      }
    }
  }
}

function bindRing(ctx, eff, ia) {
  const { hit, C } = eff;
  const pal = eff.trail;
  if (ia > 780) return;
  const close = ease.outCubic(clamp01(ia / 260));
  const R = C * (1.1 - 0.55 * close);
  const fade = ia > 600 ? 1 - (ia - 600) / 180 : 1;
  setAlpha(ctx, fade);
  // Duas voltas de corrente (cintura e peito), elos alternando claro/escuro.
  for (const [dy, rr] of [[0.15, 1], [-0.25, 0.8]]) {
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ia * 0.004 * (dy > 0 ? 1 : -1);
      const x = hit.x + Math.cos(a) * R * rr;
      const y = hit.y + Math.sin(a) * R * rr * 0.4 + C * dy;
      const front = Math.sin(a) > 0;
      rect(ctx, Math.round(x) - 1, Math.round(y) - 1, 2, 2, front ? (i % 2 ? pal[3] : pal[4]) : pal[1]);
      if (front) dot(ctx, x - 1, y + 1, pal[0], 1);
    }
  }
  setAlpha(ctx, 1);
}

const RUNE = [
  '..x.x..',
  '.xxxxx.',
  'x.x.x.x',
  'xxx.xxx',
  '.x...x.',
  '..xxx..',
  '.x.x.x.'
];

function rune(ctx, eff, ia) {
  const { hit, C } = eff;
  const pal = eff.trail;
  if (ia > 780) return;
  const appear = clamp01(ia / 140);
  const fade = ia > 560 ? 1 - (ia - 560) / 220 : 1;
  const bob = Math.round(Math.sin(ia * 0.012) * 1);
  setAlpha(ctx, appear * fade);
  const x = Math.round(hit.x - 3);
  const y = Math.round(hit.y - C * 0.95) + bob;
  glyph(ctx, x + 1, y + 1, RUNE, { x: pal[0] });
  glyph(ctx, x, y, RUNE, { x: Math.floor(ia / 90) % 2 ? pal[4] : pal[3] });
  setAlpha(ctx, 1);
}

// Erro: "fuuu" de vento passando + poeira no chao.
function whiff(ctx, eff, ia) {
  if (ia > 260) return;
  const { hit, dir, perp, C } = eff;
  const k = ia / 260;
  setAlpha(ctx, 1 - k);
  for (let i = 0; i < 3; i++) {
    const o = (i - 1) * 3;
    const L = C * (0.5 - i * 0.08);
    const sx = hit.x + dir.x * C * k * 0.8 + perp.x * o;
    const sy = hit.y + dir.y * C * k * 0.8 + perp.y * o;
    line(ctx, sx - dir.x * L, sy - dir.y * L, sx, sy, i === 1 ? WHITE : PALETTES.puff[2], 1);
  }
  setAlpha(ctx, 1);
}

const STARS = ['.y.', 'yYy', '.y.'];

// Falha (1 natural): nuvenzinha comica + estrelinhas girando na cabeca.
function stumble(ctx, eff, ia) {
  const { from, C } = eff;
  if (ia > 820) return;
  const fade = ia > 640 ? 1 - (ia - 640) / 180 : 1;
  setAlpha(ctx, fade);
  for (let i = 0; i < 3; i++) {
    const a = ia * 0.012 + (i / 3) * Math.PI * 2;
    const x = from.x + Math.cos(a) * C * 0.35;
    const y = from.y - C * 0.62 + Math.sin(a) * C * 0.12;
    glyph(ctx, Math.round(x) - 1, Math.round(y) - 1, STARS, { y: '#ffd84a', Y: '#fffbe0' });
  }
  setAlpha(ctx, 1);
}

// Flash branco no ponto de impacto (dura o hit-stop + 2 quadros).
function drawFlash(ctx, eff, rt) {
  if (eff.result === 'miss' || eff.result === 'fumble') return;
  const lim = eff.T.hitstop + 60;
  if (rt < 0 || rt > lim) return;
  const { hit, C, family } = eff;
  const soft = family.impact === 'heal' || family.impact === 'arrive';
  const k = rt / lim;
  const arm = C * (soft ? 0.35 : 0.6) * eff.scale * (1 - k * 0.5);
  const color = soft ? eff.trail[4] || WHITE : WHITE;
  if (rt < 45 && !soft) disc(ctx, hit.x, hit.y, 3 * eff.scale, WHITE);
  star4(ctx, hit.x, hit.y, arm, color, rt < 45 ? 2 : 1);
  if (eff.result === 'crit') {
    const g = arm * 0.6;
    line(ctx, hit.x - g, hit.y - g, hit.x + g, hit.y + g, PALETTES.gold[3], 1);
    line(ctx, hit.x - g, hit.y + g, hit.x + g, hit.y - g, PALETTES.gold[3], 1);
  }
}

export { span };
