// Primitivas visuais do grimorio. Cada receita de magia (recipes.js) e uma lista de
// passos; cada passo chama uma primitiva daqui com opcoes. Tudo e funcao pura de
// (efeito, passo, instante): o sorteio usa um RNG novo por quadro com a mesma
// semente, entao o mesmo instante desenha sempre os mesmos pixels em qualquer cliente.
//
// Assinatura: draw(ctx, e, o, k)
//   e: efeito (engine.js)   o: opcoes do passo   k: { age, u, dur, T, f, R, P, G, pal, mat, sc, C }
//   k.P = ponto ancora (px de efeito), k.G = linha do chao sob a ancora, k.u = progresso 0..1
import { rect, dot, line, disc, ring, arc, star4, setAlpha, ease, clamp01, lerp } from '../draw.js';
import { noise } from '../rng.js';
import { burst, drawParticles } from '../particles.js';
import { SPRITES, SYMBOLS, colorMap, drawSprite } from './sprites.js';
import { SPELL_PALETTES, mix } from './palettes.js';

const W = '#ffffff';
const INK = '#140e18';
const TAU = Math.PI * 2;

// Envelope de entrada/saida (alpha) no progresso u.
export function env(u, a = 0.12, b = 0.22) {
  if (u <= 0 || u >= 1) return 0;
  return clamp01(Math.min(u / a, (1 - u) / b, 1));
}

function hand(e) {
  return { x: e.from.x + e.dir.x * e.C * 0.35, y: e.from.y - e.C * 0.12 };
}

const mat = (name) => SPELL_PALETTES[name] || SPELL_PALETTES.stone;

// Contorno de elipse (para circulos no chao) como poligono de pontos.
function ellipsePts(cx, cy, R, sy, n, a0 = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * TAU;
    pts.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R * sy });
  }
  return pts;
}

// Raio quebrado (relampago) entre dois pontos; jitter muda a cada 2 quadros.
function zigzag(ctx, x0, y0, x1, y1, f, seed, { amp = 3, seg = 5, color, core, w = 1 } = {}) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const L = Math.hypot(dx, dy) || 1;
  const n = Math.max(2, Math.round(L / seg));
  const px = -dy / L;
  const py = dx / L;
  let lx = x0;
  let ly = y0;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const j = i === n ? 0 : noise(i + seed, f >> 1, seed) * amp;
    const x = x0 + dx * t + px * j;
    const y = y0 + dy * t + py * j;
    line(ctx, lx, ly, x, y, color, w + 1);
    line(ctx, lx, ly, x, y, core || W, w);
    lx = x;
    ly = y;
  }
}

function sparkle(ctx, x, y, size, pal, on) {
  dot(ctx, x, y, W, 1);
  if (on) star4(ctx, x, y, size, pal[3]);
  dot(ctx, x, y, W, 1);
}

function pebble(ctx, x, y, s, m) {
  disc(ctx, x, y, s, m[1]);
  disc(ctx, x - 0.4, y - 0.6, Math.max(0, s - 1), m[2]);
  dot(ctx, x - Math.max(1, s - 1), y - Math.max(1, s - 1), m[3], 1);
}

// Silhueta humana generica (copias ilusorias, estatua, exercito).
const HUMAN = [
  '...kkkk...',
  '..k3333k..',
  '..k3443k..',
  '..k3333k..',
  '...kkkk...',
  '.kk3333kk.',
  'k33333333k',
  'k3k3333k3k',
  'k3k3333k3k',
  '.kk3223kk.',
  '..k3kk3k..',
  '..k3kk3k..',
  '..k2kk2k..',
  '.kkk..kkk.'
];

// ------------------------------------------------------------------ PRIMITIVAS
export const PRIMS = {};
const def = (name, spec) => { PRIMS[name] = spec; };

// Circulo magico no chao (conjuracao).
def('sigil', {
  ph: 'cast', at: 'c', ground: true,
  draw(ctx, e, o, k) {
    const { P, pal, u, T } = k;
    const R = (o.r ?? 0.7) * e.C * k.sc * (0.4 + 0.6 * ease.outCubic(clamp01(u / 0.3)));
    const sy = 0.38;
    const a = env(u, 0.15, 0.25);
    if (a <= 0) return;
    const cy = k.G;
    const spin = (o.rev ? -1 : 1) * T * 0.003;
    setAlpha(ctx, a * 0.35);
    disc(ctx, P.x, cy, R, pal[1]);
    setAlpha(ctx, a);
    ring(ctx, P.x, cy, R, pal[2], 1, sy);
    ring(ctx, P.x, cy, R * 0.72, pal[3], 1, sy);
    const n = o.n ?? (o.style === 'hex' ? 6 : o.style === 'tri' ? 3 : o.style === 'sq' ? 4 : 5);
    const pts = ellipsePts(P.x, cy, R * 0.72, sy, n, spin);
    const step = o.style === 'star' ? 2 : 1;
    if (o.style) {
      for (let i = 0; i < n; i++) {
        const p0 = pts[i];
        const p1 = pts[(i + step) % n];
        line(ctx, p0.x, p0.y, p1.x, p1.y, pal[3], 1);
      }
    }
    const runes = ellipsePts(P.x, cy, R, sy, o.runes ?? 8, -spin * 1.5);
    runes.forEach((p, i) => {
      rect(ctx, p.x - 1, p.y - (i % 2 ? 1 : 0), 2, 1, pal[4]);
    });
    // luz subindo do circulo
    for (let i = 0; i < 6; i++) {
      const ph = ((T / 600 + i / 6) % 1);
      const ang = i * 1.7 + spin;
      dot(ctx, P.x + Math.cos(ang) * R * 0.8, cy + Math.sin(ang) * R * sy * 0.8 - ph * e.C * 0.8, ph < 0.6 ? pal[4] : pal[2], 1);
    }
    setAlpha(ctx, 1);
  }
});

// Energia em espiral se juntando na mao.
def('gather', {
  ph: 'cast', at: 'c',
  draw(ctx, e, o, k) {
    const h = hand(e);
    const n = o.n ?? 10;
    const R = (o.r ?? 1) * e.C;
    for (let i = 0; i < n; i++) {
      const d = (i / n) * 0.35;
      const uu = clamp01((k.u - d) / 0.6);
      if (uu <= 0 || uu >= 1) continue;
      const a = i * 2.4 + uu * 3 * (o.rev ? -1 : 1);
      const r = R * (1 - ease.in(uu));
      const x = h.x + Math.cos(a) * r;
      const y = h.y + Math.sin(a) * r * 0.8;
      dot(ctx, x, y, uu > 0.6 ? k.pal[4] : k.pal[3], uu < 0.3 ? 2 : 1);
    }
    const g = clamp01(k.u * 1.4) * (o.s ?? 2) * k.sc;
    if (g >= 1) {
      disc(ctx, h.x, h.y, g, k.pal[2]);
      disc(ctx, h.x, h.y, Math.max(0, g - 1), k.pal[4]);
    }
  }
});

// Brilho pulsando na mao ou no corpo (preparacao curta).
def('glow', {
  ph: 'cast', at: 'h',
  draw(ctx, e, o, k) {
    const { P, pal } = k;
    const r = (o.s ?? 2) * k.sc * (0.6 + 0.4 * Math.sin(k.age / 50));
    setAlpha(ctx, env(k.u, 0.2, 0.1) * 0.5);
    disc(ctx, P.x, P.y, r + 2, pal[2]);
    setAlpha(ctx, env(k.u, 0.2, 0.1));
    disc(ctx, P.x, P.y, r, pal[3]);
    dot(ctx, P.x, P.y, W, 1);
    setAlpha(ctx, 1);
  }
});

// Caminho de um projetil (u 0..1), com arco, onda e espalhamento do i-esimo.
function pathAt(e, o, u, i, n) {
  const h = hand(e);
  const x0 = h.x;
  const y0 = h.y;
  const x1 = e.hit.x;
  const y1 = e.hit.y;
  const spread = n > 1 ? ((i / (n - 1)) * 2 - 1) * (o.fan ?? 1.2) * e.C : 0;
  const bend = Math.sin(Math.PI * u) * spread;
  const wob = o.wob ? Math.sin(u * 18 + i) * o.wob : 0;
  const lift = Math.sin(Math.PI * u) * (o.arc ?? 0) * e.C;
  return {
    x: lerp(x0, x1, u) + e.perp.x * (bend + wob),
    y: lerp(y0, y1, u) + e.perp.y * (bend + wob) - lift
  };
}

function drawTrail(ctx, e, o, k, i, n, u) {
  const kind = o.trail ?? 'spark';
  if (kind === 'none') return;
  const pal = k.pal;
  const len = o.tl ?? 8;
  for (let j = len; j >= 1; j--) {
    const uj = u - j * 0.03;
    if (uj < 0) continue;
    const p = pathAt(e, o, uj, i, n);
    const fade = 1 - j / (len + 1);
    const jx = noise(j + i * 31, k.f, 7);
    switch (kind) {
      case 'ember':
        rect(ctx, p.x + jx * 1.5, p.y - j * 0.5, 1, 1, j < 3 ? pal[4] : pal[j < 6 ? 3 : 2]);
        if (j % 2) dot(ctx, p.x, p.y, pal[2], 2);
        break;
      case 'smoke':
        setAlpha(ctx, 0.6 * fade);
        disc(ctx, p.x, p.y - j * 0.3, 1 + j * 0.25, j < 3 ? pal[2] : '#6a6878');
        setAlpha(ctx, 1);
        break;
      case 'drip':
        dot(ctx, p.x, p.y + j * j * 0.08, j < 3 ? pal[3] : pal[2], 1);
        break;
      case 'star':
        if ((j + k.f) % 3 === 0) star4(ctx, p.x + jx * 2, p.y + noise(j, k.f, 3) * 2, 1, pal[4]);
        break;
      case 'streak':
        dot(ctx, p.x, p.y, j < 3 ? pal[4] : j < 6 ? pal[3] : pal[1], Math.max(1, Math.round((o.s ?? 2) * fade)));
        break;
      case 'leaf':
        if (j % 2 === 0) rect(ctx, p.x + jx * 2, p.y + Math.sin(j + k.f * 0.5) * 2, 2, 1, pal[j < 4 ? 3 : 2]);
        break;
      case 'ring':
        if (j % 3 === 0) { setAlpha(ctx, fade); ring(ctx, p.x, p.y, 1 + j * 0.3, pal[3], 1); setAlpha(ctx, 1); }
        break;
      case 'blood':
        dot(ctx, p.x, p.y + j * j * 0.12, SPELL_PALETTES.blood[j < 4 ? 3 : 2], 1);
        break;
      default:
        dot(ctx, p.x, p.y, j < 3 ? pal[4] : pal[3], 1);
    }
  }
}

// Cabeca do projetil, por tipo.
function head(ctx, e, o, k, p, ang, i) {
  const pal = k.pal;
  const s = Math.max(1, Math.round((o.s ?? 2) * k.sc));
  const cx = Math.cos(ang);
  const sy = Math.sin(ang);
  switch (o.kind || 'orb') {
    case 'orb':
      disc(ctx, p.x, p.y, s + 1, pal[1]);
      disc(ctx, p.x, p.y, s, pal[3]);
      disc(ctx, p.x - 0.5, p.y - 0.5, Math.max(0, s - 1), pal[4]);
      dot(ctx, p.x - Math.ceil(s / 2), p.y - Math.ceil(s / 2), W, 1);
      break;
    case 'comet':
      disc(ctx, p.x, p.y, s + 2, pal[1]);
      disc(ctx, p.x, p.y, s + 1, pal[2]);
      disc(ctx, p.x, p.y, s, pal[4]);
      break;
    case 'shard': case 'spear': case 'needle': case 'dagger': case 'arrow': case 'bone': case 'thorn': {
      const L = (o.kind === 'spear' ? 7 : o.kind === 'needle' ? 4 : o.kind === 'dagger' ? 4 : 5) * (s / 2 + 0.5);
      const m = o.kind === 'bone' ? mat('bone') : o.kind === 'thorn' ? mat('wood') : pal;
      const w = o.kind === 'shard' ? 2 : 1;
      line(ctx, p.x - cx * L, p.y - sy * L, p.x, p.y, m[1], w + 1);
      line(ctx, p.x - cx * L, p.y - sy * L, p.x, p.y, m[3], w);
      dot(ctx, p.x + cx, p.y + sy, o.kind === 'bone' ? m[4] : pal[4], 1);
      dot(ctx, p.x, p.y, W, 1);
      if (o.kind === 'dagger') line(ctx, p.x - cx * L * 0.7 - sy * 2, p.y - sy * L * 0.7 + cx * 2, p.x - cx * L * 0.7 + sy * 2, p.y - sy * L * 0.7 - cx * 2, pal[1], 1);
      if (o.kind === 'arrow') { dot(ctx, p.x - cx * L - sy, p.y - sy * L + cx, pal[2], 1); dot(ctx, p.x - cx * L + sy, p.y - sy * L - cx, pal[2], 1); }
      break;
    }
    case 'rock':
      pebble(ctx, p.x, p.y, s + 1, mat(o.m || 'stone'));
      break;
    case 'bolt': {
      const L = 6;
      zigzag(ctx, p.x - cx * L, p.y - sy * L, p.x, p.y, k.f, i * 13, { amp: 2, seg: 2, color: pal[2], core: pal[4] });
      break;
    }
    case 'bubble':
      ring(ctx, p.x, p.y, s + 1, pal[3], 1);
      dot(ctx, p.x - 1, p.y - 1, W, 1);
      break;
    case 'crescent': {
      const a0 = ang + Math.PI / 2;
      arc(ctx, p.x, p.y, s + 2, a0, a0 + Math.PI, (uu) => (uu > 0.3 && uu < 0.7 ? pal[4] : pal[3]), () => 2);
      break;
    }
    case 'disc': {
      const r = s + 1;
      const rot = k.T * 0.03;
      disc(ctx, p.x, p.y, r, pal[2]);
      for (let q = 0; q < 4; q++) dot(ctx, p.x + Math.cos(rot + q * 1.57) * (r + 1), p.y + Math.sin(rot + q * 1.57) * (r + 1), pal[4], 1);
      dot(ctx, p.x, p.y, W, 1);
      break;
    }
    case 'blob': {
      disc(ctx, p.x, p.y, s + 1, pal[1]);
      disc(ctx, p.x - 0.5, p.y - 0.5, s, pal[3]);
      dot(ctx, p.x - 1, p.y - 1, pal[4], 1);
      dot(ctx, p.x + 1, p.y + s + 1 + (k.f % 3), pal[2], 1);
      break;
    }
    case 'flask': {
      const flip = Math.floor(k.T / 70) % 2 === 1;
      drawSprite(ctx, SYMBOLS.flask, colorMap(pal), p.x, p.y, { flipX: flip });
      break;
    }
    case 'star':
      star4(ctx, p.x, p.y, s + (k.f % 2), pal[3]);
      dot(ctx, p.x, p.y, W, 1);
      break;
    case 'note':
      drawSprite(ctx, SYMBOLS.note, colorMap(pal), p.x, p.y + Math.sin(k.T / 40) * 1.5);
      break;
    default: {
      const rows = SYMBOLS[o.kind] || (SPRITES[o.kind] && SPRITES[o.kind].rows);
      if (rows) {
        const sp = SPRITES[o.kind];
        drawSprite(ctx, rows, colorMap(pal, sp ? mat(sp.mat) : null), p.x, p.y, { flipX: e.dir.x < 0 });
      } else disc(ctx, p.x, p.y, s, pal[3]);
    }
  }
}

// Projetil(eis) do conjurador ate o alvo, com rastro.
def('orb', {
  ph: 'travel',
  draw(ctx, e, o, k0) {
    const n = o.n ?? 1;
    const k = o.rainbow ? { ...k0, pal: RAINBOW[Math.floor(k0.T / 90) % RAINBOW.length] } : k0;
    for (let i = 0; i < n; i++) {
      const delay = n > 1 ? (o.stag ?? 0.12) * i : 0;
      const u = clamp01((k.u - delay) / (1 - (n > 1 ? (o.stag ?? 0.12) * (n - 1) : 0)));
      if (u <= 0 || (u >= 1 && k.u < 1)) continue;
      const ue = o.ease === 'in' ? ease.in(u) : u;
      const p = pathAt(e, o, ue, i, n);
      const q = pathAt(e, o, Math.max(0, ue - 0.02), i, n);
      const ang = Math.atan2(p.y - q.y, p.x - q.x) || Math.atan2(e.dir.y, e.dir.x);
      drawTrail(ctx, e, o, k, i, n, ue);
      head(ctx, e, o, k, p, ang, i);
    }
  }
});

// Raio continuo do conjurador ao alvo (estende na viagem, segura no impacto).
def('beam', {
  ph: 'span',
  draw(ctx, e, o, k) {
    const h = hand(e);
    const grow = clamp01(k.age / Math.max(1, e.T.action));
    const a = k.u > 0.75 ? clamp01((1 - k.u) / 0.25) : 1;
    const pal = k.pal;
    const targets = [{ x: e.hit.x, y: e.hit.y }];
    const n = o.n ?? 1;
    for (let i = 1; i < n; i++) {
      const ang = (i / n) * TAU + 0.4;
      targets.push({ x: e.hit.x + Math.cos(ang) * e.C * 1.6, y: e.hit.y + Math.sin(ang) * e.C * 0.9 });
    }
    targets.forEach((t, idx) => {
      const pl = o.rainbow ? RAINBOW[idx % RAINBOW.length] : pal;
      const x1 = lerp(h.x, t.x, grow);
      const y1 = lerp(h.y, t.y, grow);
      const w = Math.max(1, Math.round((o.w ?? 2) * k.sc * (0.85 + 0.15 * Math.sin(k.age / 30))));
      setAlpha(ctx, a);
      const style = o.style || 'straight';
      if (style === 'zig') {
        zigzag(ctx, h.x, h.y, x1, y1, k.f, idx * 7, { amp: 3, seg: 4, color: pl[2], core: pl[4], w: Math.max(1, w - 1) });
      } else if (style === 'twin' || style === 'spiral') {
        const L = Math.hypot(x1 - h.x, y1 - h.y);
        const nx = -(y1 - h.y) / (L || 1);
        const ny = (x1 - h.x) / (L || 1);
        const steps = Math.max(2, Math.round(L));
        line(ctx, h.x, h.y, x1, y1, pl[1], 1);
        for (let q = 0; q <= steps; q++) {
          const t = q / steps;
          const ph = t * L * 0.5 - k.age / 40;
          const amp = (o.amp ?? 2.5) * (style === 'spiral' ? 1 : Math.sin(Math.PI * t) + 0.3);
          const bx = lerp(h.x, x1, t);
          const by = lerp(h.y, y1, t);
          dot(ctx, bx + nx * Math.sin(ph) * amp, by + ny * Math.sin(ph) * amp, pl[4], 1);
          dot(ctx, bx - nx * Math.sin(ph) * amp, by - ny * Math.sin(ph) * amp, style === 'spiral' ? pl[2] : pl[3], 1);
        }
      } else {
        line(ctx, h.x, h.y, x1, y1, pl[1], w + 2);
        line(ctx, h.x, h.y, x1, y1, pl[3], w);
        line(ctx, h.x, h.y, x1, y1, pl[4], Math.max(1, w - 1));
        if (style === 'pulse') {
          for (let q = 0; q < 4; q++) {
            const t = (k.age / 260 + q / 4) % 1;
            disc(ctx, lerp(h.x, x1, t), lerp(h.y, y1, t), w, W);
          }
        }
      }
      // brilho nas pontas
      star4(ctx, h.x, h.y, 2 + (k.f % 2), pl[4]);
      if (grow >= 1) star4(ctx, x1, y1, 3 + (k.f % 2), pl[4]);
      setAlpha(ctx, 1);
    });
  }
});

const RAINBOW = [SPELL_PALETTES.fire, SPELL_PALETTES.light, SPELL_PALETTES.acid, SPELL_PALETTES.water, SPELL_PALETTES.space, SPELL_PALETTES.chaos, SPELL_PALETTES.ice];

// Relampago que salta do alvo para outros pontos.
def('chain', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const R = k.R;
    const n = o.n ?? 3;
    let prev = { x: k.P.x, y: k.P.y };
    for (let i = 0; i < n; i++) {
      const ang = R.range(-1.2, 1.2) + (e.dir.x >= 0 ? 0 : Math.PI);
      const d = R.range(1.3, 2.2) * e.C;
      const next = { x: prev.x + Math.cos(ang) * d, y: prev.y + Math.sin(ang) * d * 0.6 };
      const t0 = i * (o.gap ?? 110);
      const age = k.age - t0;
      if (age >= 0 && age < 260 && o.kind === 'hop') {
        const t = clamp01(age / 160);
        const x = lerp(prev.x, next.x, t);
        const y = lerp(prev.y, next.y, t) - Math.sin(Math.PI * t) * e.C * 0.8;
        disc(ctx, x, y, 2, k.pal[3]);
        dot(ctx, x, y, k.pal[4], 1);
        for (let j = 1; j < 5; j++) {
          const tj = clamp01(t - j * 0.06);
          dot(ctx, lerp(prev.x, next.x, tj), lerp(prev.y, next.y, tj) - Math.sin(Math.PI * tj) * e.C * 0.8 - j * 0.5, k.pal[j < 3 ? 3 : 2], 1);
        }
        if (t >= 1) { setAlpha(ctx, 1 - (age - 160) / 100); star4(ctx, next.x, next.y, 3, k.pal[4]); setAlpha(ctx, 1); }
      } else if (age >= 0 && age < 260) {
        setAlpha(ctx, 1 - age / 260);
        zigzag(ctx, prev.x, prev.y, next.x, next.y, k.f, i * 17, { amp: 3, seg: 4, color: k.pal[2], core: k.pal[4] });
        star4(ctx, next.x, next.y, 3, k.pal[4]);
        ring(ctx, next.x, next.y, 2 + age / 40, k.pal[3], 1);
        setAlpha(ctx, 1);
      }
      prev = next;
    }
  }
});

// Cone a partir do conjurador (sopro, leque de chamas, grito).
def('cone', {
  ph: 'span', hold: 0.4,
  draw(ctx, e, o, k) {
    const h = hand(e);
    const base = Math.atan2(e.dir.y, e.dir.x);
    const half = o.ang ?? 0.42;
    const L = Math.max(e.C * 2, e.dist + e.C * 0.6) * (o.len ?? 1);
    const R = k.R;
    const n = o.n ?? 44;
    const kind = o.kind || 'flame';
    const a = k.u > 0.8 ? clamp01((1 - k.u) / 0.2) : 1;
    setAlpha(ctx, a);
    if (kind === 'sound') {
      for (let q = 0; q < 4; q++) {
        const r = ((k.age / 300 + q / 4) % 1) * L;
        arc(ctx, h.x, h.y, Math.max(2, r), base - half, base + half, () => (q % 2 ? k.pal[3] : k.pal[4]), () => 1);
      }
      setAlpha(ctx, 1);
      return;
    }
    for (let i = 0; i < n; i++) {
      const off = R.next();
      const ang = base + R.range(-half, half);
      const life = R.range(260, 420);
      const t = (k.age / life + off) % 1;
      if (k.age < t * life) continue; // ainda nao saiu
      const r = t * L;
      const x = h.x + Math.cos(ang) * r;
      const y = h.y + Math.sin(ang) * r - (kind === 'flame' ? t * t * 4 : 0);
      const sz = 1 + Math.round(t * (kind === 'flame' ? 3 : 2));
      const ci = Math.max(1, 4 - Math.floor(t * 4));
      if (t > 0.92) continue;
      if (kind === 'frost') { rect(ctx, x, y, sz, 1, k.pal[ci]); dot(ctx, x, y, W, 1); }
      else if (kind === 'bile' || kind === 'spore') dot(ctx, x, y + t * t * 6, k.pal[ci], kind === 'spore' ? 1 : sz);
      else if (kind === 'wind') line(ctx, x, y, x - Math.cos(ang) * 3, y - Math.sin(ang) * 3, k.pal[Math.min(4, ci + 1)], 1);
      else if (kind === 'light') line(ctx, x, y, x - Math.cos(ang) * 4, y - Math.sin(ang) * 4, k.pal[Math.min(4, ci + 1)], 1);
      else if (kind === 'fear') { setAlpha(ctx, a * (1 - t)); disc(ctx, x, y, sz, k.pal[1 + (i % 2)]); setAlpha(ctx, a); }
      else rect(ctx, x - sz / 2, y - sz / 2, sz, sz, k.pal[ci]);
    }
    setAlpha(ctx, 1);
  }
});

// Onda pelo chao do conjurador ao alvo (agua, areia, sangue, choque).
def('wave', {
  ph: 'travel',
  draw(ctx, e, o, k) {
    const h = { x: e.from.x, y: e.fromGround };
    const t = { x: e.hit.x + e.dir.x * e.C * 0.6, y: e.ground };
    const front = ease.out(k.u);
    const n = 22;
    const H = (o.h ?? 1) * e.C * k.sc;
    const pal = k.pal;
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * front;
      const x = lerp(h.x, t.x, s);
      const y = lerp(h.y, t.y, s);
      const rel = front - s; // distancia atras da crista
      const hh = Math.max(0, H * (1 - rel * 3.2)) * (0.85 + 0.15 * Math.sin(i + k.age / 60));
      if (hh < 1) { rect(ctx, x, y - 1, 2, 1, pal[1]); continue; }
      rect(ctx, x, y - hh, 2, hh, pal[2]);
      rect(ctx, x, y - hh, 2, Math.max(1, hh * 0.3), pal[3]);
      rect(ctx, x, y - hh - 1, 2, 1, o.kind === 'sand' ? pal[4] : W);
    }
    if (o.kind !== 'shock') {
      for (let i = 0; i < 6; i++) {
        const x = lerp(h.x, t.x, front) + noise(i, k.f, 3) * 3;
        const y = lerp(h.y, t.y, front) - H - 1 - Math.abs(noise(i + 9, k.f, 5)) * 3;
        dot(ctx, x, y, i % 2 ? W : pal[4], 1);
      }
    }
  }
});

// Imagens residuais do conjurador correndo ate o alvo (corpo de luz, investida).
def('streak', {
  ph: 'travel',
  draw(ctx, e, o, k) {
    const h = hand(e);
    for (let j = 0; j < 7; j++) {
      const uj = clamp01(k.u - j * 0.08);
      const x = lerp(e.from.x, e.hit.x - e.dir.x * e.C * 0.8, ease.inOut(uj));
      const y = lerp(e.from.y, e.hit.y, ease.inOut(uj));
      setAlpha(ctx, (1 - j / 7) * 0.8);
      drawSprite(ctx, HUMAN, colorMap(k.pal), x, y, { solid: j === 0 ? k.pal[4] : k.pal[2 + (j % 2)] });
    }
    setAlpha(ctx, 1);
    void h;
  }
});

// Fluxo de particulas do alvo para o conjurador (drenar vida).
def('drain', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const n = o.n ?? 14;
    const a = { x: k.P.x, y: k.P.y };
    const b = o.rev ? k.P : hand(e);
    const src = o.rev ? hand(e) : a;
    for (let i = 0; i < n; i++) {
      const t = ((k.age / 620) + i / n) % 1;
      if (k.age < (i / n) * 300) continue;
      if (k.u > 0.85 && t < 0.2) continue;
      const x = lerp(src.x, b.x, ease.inOut(t)) + e.perp.x * Math.sin(t * 9 + i) * 3;
      const y = lerp(src.y, b.y, ease.inOut(t)) + e.perp.y * Math.sin(t * 9 + i) * 3 - Math.sin(Math.PI * t) * e.C * 0.5;
      dot(ctx, x, y, t > 0.8 ? k.pal[4] : k.pal[2 + (i % 2)], i % 3 === 0 ? 2 : 1);
    }
    if (k.age > 300) star4(ctx, b.x, b.y, 2 + (k.f % 2), k.pal[4]);
  }
});

// Explosao (bola de fogo, frasco, cadaver).
def('blast', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const { P, pal, age } = k;
    const R = (o.r ?? 1.2) * e.C * k.sc;
    const grow = ease.outCubic(clamp01(age / 220));
    const fade = clamp01((age - 160) / 380);
    if (age < 70) disc(ctx, P.x, P.y, R * 0.4 + age / 20, W);
    if (fade < 1) {
      const r = R * grow;
      const R2 = k.R;
      setAlpha(ctx, 1 - fade);
      disc(ctx, P.x, P.y, r, pal[1]);
      for (let i = 0; i < 9; i++) {
        const a = R2.range(0, TAU);
        disc(ctx, P.x + Math.cos(a) * r * 0.8, P.y + Math.sin(a) * r * 0.7, r * R2.range(0.25, 0.45), pal[2]);
      }
      disc(ctx, P.x, P.y, r * 0.7, pal[3]);
      disc(ctx, P.x, P.y - r * 0.1, r * 0.4 * (1 - fade), pal[4]);
      setAlpha(ctx, 1);
    }
    // fumaca subindo
    if (o.smoke !== 0) {
      for (let i = 0; i < 7; i++) {
        const t = clamp01((age - 180 - i * 30) / 600);
        if (t <= 0 || t >= 1) continue;
        setAlpha(ctx, 0.7 * (1 - t));
        disc(ctx, P.x + noise(i, 0, 4) * R * 0.7, P.y - t * e.C * 1.2 - i, 2 + t * 3, i % 2 ? '#5a5868' : '#7a7888');
      }
      setAlpha(ctx, 1);
    }
    // destrocos
    const list = [];
    burst(k.R, list, { x: P.x, y: P.y, n: o.n ?? 14, speed: [40, 110], g: 160, drag: 1.5, life: [300, 600], pal, shape: o.shape || 'ember', floor: k.G, size: [1, 2] });
    drawParticles(ctx, list, age);
    // chao queimado
    setAlpha(ctx, 0.5 * (1 - clamp01((age - 500) / 500)));
    ring(ctx, P.x, k.G, Math.max(1, R * 0.8), pal[0], 2, 0.35);
    setAlpha(ctx, 1);
  }
});

// Rajada de particulas no estilo do elemento.
def('burst', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const list = [];
    burst(k.R, list, { x: k.P.x, y: k.P.y, n: (o.n ?? 16) * k.sc, speed: [o.v ?? 30, (o.v ?? 30) * 2.6], g: o.g ?? 0, drag: 2.5, life: [300, o.life ?? 650], pal: k.pal, shape: o.shape || e.shape, motion: o.motion || e.motion, size: [1, o.sz ?? 2], radius: (o.r ?? 0) * e.C, floor: o.g ? k.G : null });
    drawParticles(ctx, list, k.age);
  }
});

// Aneis que se expandem (no chao, achatados, ou de pe).
def('ring', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const n = o.n ?? 1;
    const R = (o.r ?? 1.5) * e.C * k.sc;
    const dur = o.ms ?? 420;
    const y = o.up ? k.P.y : k.G;
    for (let i = 0; i < n; i++) {
      const age = k.age - i * (o.gap ?? 120);
      if (age < 0 || age > dur) continue;
      const t = age / dur;
      const rr = o.in ? R * (1 - ease.outCubic(t)) : R * ease.outCubic(t);
      setAlpha(ctx, 1 - t * 0.8);
      ring(ctx, k.P.x, y, Math.max(1, rr), i % 2 ? k.pal[2] : k.pal[3], t < 0.4 ? 2 : 1, o.up ? 1 : (o.sy ?? 0.36));
    }
    setAlpha(ctx, 1);
  }
});

// Raios radiais saindo do ponto (nova, clarao, explosao de luz).
def('nova', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const n = o.n ?? 12;
    const R = (o.r ?? 1.6) * e.C * k.sc;
    const t = clamp01(k.age / (o.ms ?? 360));
    if (t >= 1) return;
    const r1 = R * ease.outCubic(t);
    const r0 = r1 * 0.5;
    setAlpha(ctx, 1 - t);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (o.tw ?? 0.2);
      line(ctx, k.P.x + Math.cos(a) * r0, k.P.y + Math.sin(a) * r0, k.P.x + Math.cos(a) * r1, k.P.y + Math.sin(a) * r1, i % 2 ? k.pal[3] : k.pal[4], i % 3 === 0 ? 2 : 1);
    }
    if (t < 0.3) disc(ctx, k.P.x, k.P.y, R * 0.3 * (1 - t), W);
    setAlpha(ctx, 1);
  }
});

// Coluna de luz/fogo/agua descendo do ceu ou subindo do chao.
def('pillar', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const { P, pal, age } = k;
    const w = Math.round((o.w ?? 0.6) * e.C * k.sc);
    const top = k.G - (o.h ?? 5) * e.C;
    const dur = k.dur;
    const inT = clamp01(age / 120);
    const outT = clamp01((age - dur * 0.55) / (dur * 0.45));
    const ww = Math.max(1, Math.round(w * (1 - outT) * (0.85 + 0.15 * Math.sin(age / 35))));
    if (ww <= 0) return;
    const y0 = o.up ? lerp(k.G, top, ease.out(inT)) : top;
    const y1 = o.up ? k.G : lerp(top, k.G, ease.out(inT));
    const h = Math.max(1, y1 - Math.min(y0, y1));
    const yt = Math.min(y0, y1);
    for (let j = 0; j < h; j += 2) {
      const top3 = clamp01(j / Math.max(1, h * 0.3));
      const wj = Math.max(1, Math.round(ww * (0.55 + 0.45 * top3) + noise(j >> 1, k.f, 4) * 1.4));
      setAlpha(ctx, 0.55 + 0.45 * top3);
      rect(ctx, P.x - wj / 2 - 1, yt + j, wj + 2, 2, pal[1]);
      rect(ctx, P.x - wj / 2, yt + j, wj, 2, pal[(j >> 2) % 3 === 0 ? 2 : 3]);
      rect(ctx, P.x - Math.max(1, wj / 4), yt + j, Math.max(1, wj / 2), 2, pal[4]);
    }
    setAlpha(ctx, 1);
    // bordas tremendo
    for (let j = 0; j < h; j += 3) {
      const nx = noise(j, k.f, 2);
      dot(ctx, P.x + (nx > 0 ? ww / 2 + 1 : -ww / 2 - 2), yt + j, pal[2], 1);
    }
    setAlpha(ctx, 0.6 * (1 - outT));
    ring(ctx, P.x, k.G, ww + 3, pal[3], 2, 0.35);
    setAlpha(ctx, 1);
    for (let i = 0; i < 8; i++) {
      const t = ((age / 500) + i / 8) % 1;
      dot(ctx, P.x + noise(i, 1, 9) * ww, k.G - t * (k.G - top), pal[4], 1);
    }
  }
});

// Raio(s) caindo do ceu.
def('bolt', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const n = o.n ?? 1;
    const R = k.R;
    for (let i = 0; i < n; i++) {
      const ox = i === 0 ? 0 : R.range(-1, 1) * (o.r ?? 1.5) * e.C;
      const oy = i === 0 ? 0 : R.range(-0.5, 0.5) * (o.r ?? 1.5) * e.C;
      const t0 = i * (o.gap ?? 90);
      const age = k.age - t0;
      if (age < 0 || age > 240) continue;
      const x = k.P.x + ox;
      const y = k.P.y + oy;
      setAlpha(ctx, age < 140 ? 1 : 1 - (age - 140) / 100);
      zigzag(ctx, x + 6, y - 7 * e.C, x, y, k.f + i, i * 23, { amp: 4, seg: 6, color: k.pal[2], core: k.pal[4], w: o.w ?? 1 });
      if (age < 60) { disc(ctx, x, y, 4, W); star4(ctx, x, y, 7, k.pal[4]); }
      setAlpha(ctx, 1);
      if (age < 200) ring(ctx, x, y + e.C * 0.42, 2 + age / 25, k.pal[3], 1, 0.35);
    }
  }
});

// Queda vinda do ceu (pre-impacto) usada por meteoro e chuva.
function fallItem(ctx, e, k, x, gy, t, o, idx) {
  // t < 0: ainda caindo (t em -1..0); t >= 0: depois de tocar o chao (ms)
  const s = Math.max(1, (o.s ?? 1) * k.sc);
  const side = o.wind ?? 0.6;
  const big = o.kind === 'meteor' || o.kind === 'comet';
  if (t < 0) {
    const u = 1 + t; // 0..1
    const H = (o.fh ?? 7) * e.C;
    const x0 = x - side * H;
    const y0 = gy - H;
    const px = lerp(x0, x, ease.in(u));
    const py = lerp(y0, gy - (big ? s * 2 : 2), ease.in(u));
    // sombra crescendo no chao
    if (big) {
      setAlpha(ctx, 0.35 * u);
      ring(ctx, x, gy, Math.max(1, s * 3 * u), INK, Math.max(1, s * 3 * u), 0.35);
      setAlpha(ctx, 1);
    }
    if (big) {
      for (let j = 9; j >= 1; j--) {
        const uj = Math.max(0, u - j * 0.03);
        const tx = lerp(x0, x, ease.in(uj));
        const ty = lerp(y0, gy, ease.in(uj));
        disc(ctx, tx, ty, Math.max(1, s * 1.6 * (1 - j / 10)), j < 3 ? k.pal[4] : j < 6 ? k.pal[3] : k.pal[1]);
      }
      disc(ctx, px, py, s * 2 + 1, k.pal[2]);
      pebble(ctx, px, py, s * 2, mat(o.m || 'stone'));
      dot(ctx, px + s, py - s, k.pal[4], 1);
      return;
    }
    switch (o.kind) {
      case 'shard': line(ctx, px, py - 3, px, py, k.pal[3], 1); dot(ctx, px, py, W, 1); break;
      case 'ember': rect(ctx, px - side, py - 3, 1, 2, k.pal[2]); rect(ctx, px, py, 2, 2, k.pal[(idx % 2) + 3]); break;
      case 'star': star4(ctx, px, py, 1 + (idx % 2), k.pal[4]); line(ctx, px - side * 3, py - 3, px, py, k.pal[2], 1); break;
      case 'blade': drawSprite(ctx, SYMBOLS.sword, colorMap(SPELL_PALETTES.steel), px, py); break;
      case 'rune': drawSprite(ctx, SYMBOLS[`rune${(idx % 4) + 1}`], colorMap(k.pal), px, py, { solid: k.pal[3 + (idx % 2)] }); break;
      case 'mix': {
        const sym = ['frogface', 'heart', 'drop', 'note', 'crowmark', 'sword'][idx % 6];
        drawSprite(ctx, SYMBOLS[sym], colorMap(RAINBOW[idx % RAINBOW.length]), px, py, { solid: RAINBOW[idx % RAINBOW.length][3] });
        break;
      }
      case 'rock': pebble(ctx, px, py, 2 + (idx % 2), mat('stone')); break;
      case 'petal': rect(ctx, px + Math.sin(u * 10 + idx) * 2, py, 2, 1, k.pal[3 + (idx % 2)]); break;
      default: rect(ctx, px, py - 2, 1, 3, k.pal[3]); dot(ctx, px, py, k.pal[4], 1);
    }
    return;
  }
  // impacto no chao
  if (big) {
    const ia = t;
    if (ia < 80) disc(ctx, x, gy - s, s * 4 + ia / 10, W);
    const k2 = clamp01(ia / 300);
    if (k2 < 1) {
      setAlpha(ctx, 1 - k2);
      disc(ctx, x, gy - s * 2, s * 5 * ease.out(k2) + 2, k.pal[3]);
      disc(ctx, x, gy - s * 2, s * 3 * ease.out(k2), k.pal[4]);
      setAlpha(ctx, 1);
    }
    // cratera
    setAlpha(ctx, 0.85);
    ring(ctx, x, gy, s * 4, mat('earth')[1], s * 4, 0.35);
    ring(ctx, x, gy, s * 4 + 1, mat('earth')[3], 1, 0.35);
    disc(ctx, x, gy, 1, k.pal[3]);
    setAlpha(ctx, 1);
    if (ia < 420) {
      setAlpha(ctx, 1 - ia / 420);
      ring(ctx, x, gy, s * 4 + ia / 12, k.pal[3], 1, 0.35);
      setAlpha(ctx, 1);
    }
    // lava nas rachaduras
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3 + idx;
      const L = s * 4 + 4;
      line(ctx, x + Math.cos(a) * s * 2, gy + Math.sin(a) * s * 0.7, x + Math.cos(a) * L, gy + Math.sin(a) * L * 0.35, (k.f + i) % 4 ? k.pal[2] : k.pal[4], 1);
    }
    return;
  }
  if (t < 180) {
    const kk = t / 180;
    setAlpha(ctx, 1 - kk);
    dot(ctx, x - 1 - kk * 2, gy - kk * 2, k.pal[3], 1);
    dot(ctx, x + 1 + kk * 2, gy - kk * 2, k.pal[3], 1);
    ring(ctx, x, gy, 1 + kk * 2, k.pal[2], 1, 0.4);
    setAlpha(ctx, 1);
  }
}

// Meteoro(s) grande(s) caindo do ceu com cratera.
def('meteor', {
  ph: 'hit', pre: 520,
  draw(ctx, e, o, k) {
    const n = o.n ?? 1;
    const R = k.R;
    const fall = k.pre || 520;
    for (let i = 0; i < n; i++) {
      const ox = i === 0 ? 0 : R.range(-1, 1) * (o.r ?? 2) * e.C;
      const oy = i === 0 ? 0 : R.range(-0.4, 0.4) * (o.r ?? 2) * e.C;
      const t0 = i === 0 ? 0 : R.range(0.05, 0.6) * k.dur * 0.6;
      const land = k.age - fall - t0; // ms depois de tocar o chao
      const t = land < 0 ? Math.max(-1, land / fall) : land;
      if (land < -fall) continue;
      fallItem(ctx, e, k, k.P.x + ox, k.G + oy, t, { ...o, kind: 'meteor', s: (o.s ?? 2) * (i === 0 ? 1 : 0.6) }, i);
    }
  }
});

// Chuva de coisas pequenas na area (gelo, cinzas, laminas, runas...).
def('rain', {
  ph: 'hit', pre: 300,
  draw(ctx, e, o, k) {
    const n = o.n ?? 26;
    const R = k.R;
    const fall = k.pre || 300;
    const span = Math.max(1, k.dur - fall - 200);
    for (let i = 0; i < n; i++) {
      const x = k.P.x + R.range(-1, 1) * (o.r ?? 1.6) * e.C;
      const y = k.G + R.range(-0.5, 0.5) * (o.r ?? 1.6) * e.C * 0.5;
      const t0 = R.range(0, span);
      const land = k.age - fall - t0;
      if (land < -fall || land > 220) continue;
      fallItem(ctx, e, k, x, y, land < 0 ? land / fall : land, o, i);
    }
  }
});

// Muralha perpendicular ao golpe (fogo, gelo, pedra, espinhos, vento, forca).
def('wall', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const n = o.n ?? 7;
    const kind = o.kind || 'fire';
    const H = (o.h ?? 0.8) * e.C * k.sc * 0.75;
    const cx = k.P.x - e.dir.x * e.C * (o.back ?? 0);
    const len = (o.len ?? 2.6) * e.C;
    const out = clamp01((k.u - 0.78) / 0.22);
    const pal = k.pal;
    const segs = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      segs.push({ i, t, x: cx + e.perp.x * t * len * 0.5 + e.dir.x * t * len * 0.22, y: k.G + e.perp.y * t * len * 0.5 * 0.7 });
    }
    segs.sort((a, b) => a.y - b.y);
    for (const s of segs) {
      const rise = ease.back(clamp01((k.age - Math.abs(s.t) * 120) / 220));
      const h = Math.max(0, H * rise * (1 - out));
      if (h < 1) continue;
      const w = 4;
      const x = Math.round(s.x - w / 2);
      const y = Math.round(s.y);
      switch (kind) {
        case 'fire': {
          const fl = h * (0.75 + 0.25 * noise(s.i, k.f, 3));
          rect(ctx, x, y - fl, w, fl, pal[2]);
          rect(ctx, x + 1, y - fl * 0.75, w - 2, fl * 0.75, pal[3]);
          rect(ctx, x + 1, y - fl * 0.35, w - 2, fl * 0.35, pal[4]);
          dot(ctx, x + 1 + (k.f + s.i) % 2, y - fl - 1, pal[3], 1);
          dot(ctx, x + (s.i % 3), y - fl - 3 - (k.f % 3), pal[4], 1);
          break;
        }
        case 'ice': case 'crystal':
          rect(ctx, x - 1, y - h, w + 2, h, pal[1]);
          rect(ctx, x, y - h + 1, w, h - 1, pal[3]);
          rect(ctx, x, y - h + 1, 1, h - 2, W);
          rect(ctx, x + 1, y - h - 1, 2, 1, pal[4]);
          break;
        case 'stone': case 'bone': {
          const m = mat(kind === 'bone' ? 'bone' : 'stone');
          rect(ctx, x - 1, y - h, w + 2, h, m[1]);
          rect(ctx, x, y - h + 1, w, h - 2, m[2]);
          rect(ctx, x, y - h + 1, w, 1, m[3]);
          if (h > 6) dot(ctx, x + 1, y - h * 0.5, m[0], 1);
          break;
        }
        case 'thorn': {
          const m = mat('wood');
          line(ctx, x + 2, y, x + 2 + Math.sin(s.i) * 2, y - h, m[2], 2);
          for (let q = 2; q < h; q += 3) dot(ctx, x + (q % 2 ? 0 : 4), y - q, pal[3], 1);
          dot(ctx, x + 2, y - h, pal[4], 1);
          break;
        }
        case 'wind':
          for (let q = 0; q < h; q += 2) dot(ctx, x + 2 + Math.sin(q * 0.6 + k.age / 50) * 2, y - q, q % 4 ? pal[3] : W, 1);
          break;
        case 'water':
          rect(ctx, x, y - h, w, h, pal[2]);
          rect(ctx, x, y - h, w, 2, W);
          dot(ctx, x + ((k.f + s.i) % 4), y - h - 1, pal[4], 1);
          break;
        default: { // forca / luz / sombra: painel translucido
          setAlpha(ctx, 0.55);
          rect(ctx, x, y - h, w, h, pal[2]);
          setAlpha(ctx, 1);
          rect(ctx, x, y - h, w, 1, pal[4]);
          const sh = (k.age / 8 + s.i * 3) % (h + 6);
          if (sh < h) rect(ctx, x, y - h + sh, w, 1, W);
        }
      }
    }
  }
});

// Espinhos/estacas saindo do chao.
def('spikes', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const n = o.n ?? 6;
    const R = k.R;
    const kind = o.kind || 'stone';
    const m = kind === 'stone' ? mat('stone') : kind === 'bone' ? mat('bone') : kind === 'thorn' ? mat('wood') : k.pal;
    const out = clamp01((k.u - 0.7) / 0.3);
    const list = [];
    for (let i = 0; i < n; i++) {
      list.push({ x: k.P.x + R.range(-1, 1) * (o.r ?? 0.8) * e.C, y: k.G + R.range(-0.25, 0.25) * e.C, h: R.range(0.6, 1.1) * (o.h ?? 1) * e.C * k.sc, d: R.range(0, 120) });
    }
    list.sort((a, b) => a.y - b.y);
    for (const s of list) {
      const rise = ease.back(clamp01((k.age - s.d) / 160));
      const h = s.h * rise * (1 - out);
      if (h < 1) continue;
      for (let q = 0; q < h; q++) {
        const w = Math.max(1, Math.round((1 - q / h) * 3));
        rect(ctx, s.x - w, s.y - q, w, 1, m[1]);
        rect(ctx, s.x, s.y - q, w, 1, m[q > h * 0.6 ? 3 : 2]);
      }
      dot(ctx, s.x, s.y - h, kind === 'ice' || kind === 'crystal' ? W : m[4], 1);
      if (rise < 1) { dot(ctx, s.x - 3, s.y, mat('dust')[3], 1); dot(ctx, s.x + 3, s.y, mat('dust')[3], 1); }
    }
  }
});

// Gavinhas que sobem e enrolam o alvo (raizes, vinhas, correntes, tentaculos, maos).
def('roots', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const kind = o.kind || 'root';
    const n = o.n ?? 4;
    const H = (o.h ?? 0.9) * e.C;
    const grow = ease.out(clamp01(k.age / 320));
    const out = clamp01((k.u - 0.8) / 0.2);
    const m = kind === 'root' ? mat('wood') : kind === 'chain' ? mat('steel') : kind === 'web' ? mat('smoke') : k.pal;
    if (kind === 'hand') {
      for (let i = 0; i < n; i++) {
        const x = k.P.x + (i - (n - 1) / 2) * 5;
        const rise = clamp01((k.age - i * 60) / 260) * (1 - out);
        drawSprite(ctx, SYMBOLS.hand, colorMap(k.pal), x, k.G + 2, { anchor: 'bottom', cut: rise, flipX: i % 2 === 1 });
      }
      return;
    }
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      const x0 = k.P.x + side * (3 + (i >> 1) * 2);
      const len = H * grow * (1 - out * 0.9);
      let px = x0;
      let py = k.G;
      for (let q = 1; q <= len; q++) {
        const t = q / H;
        const x = k.P.x + side * Math.cos(t * 5 + i) * (4 - t * 1.5) + (x0 - k.P.x) * (1 - t);
        const y = k.G - q;
        const front = Math.sin(t * 5 + i) * side > 0;
        if (kind === 'chain') {
          if (q % 3 === 0) { rect(ctx, x - 1, y, 2, 2, front ? m[3] : m[1]); dot(ctx, x, y, m[0], 1); }
        } else {
          line(ctx, px, py, x, y, front ? m[2] : m[1], kind === 'tentacle' ? 2 : 1);
          if (kind === 'vine' && q % 5 === 0) rect(ctx, x + side, y, 2, 1, k.pal[3]);
          if (kind === 'web') dot(ctx, x, y, W, 1);
          if ((kind === 'rune' || kind === 'shadow' || kind === 'blood') && q % 4 === 0) dot(ctx, x, y, k.pal[4], 1);
        }
        px = x;
        py = y;
      }
      if (len > 2) dot(ctx, px, py - 1, kind === 'chain' ? m[4] : k.pal[4], 1);
    }
    if (kind === 'web') {
      setAlpha(ctx, 0.7 * (1 - out));
      for (let q = 0; q < 4; q++) line(ctx, k.P.x - 8, k.G - q * 4 * grow, k.P.x + 8, k.G - (3 - q) * 4 * grow, W, 1);
      setAlpha(ctx, 1);
    }
  }
});

// Redoma, jaula, bolha, bloco de gelo ou casulo de pedra.
def('dome', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const style = o.style || 'dome';
    const R = (o.r ?? 0.85) * e.C * k.sc;
    const inT = ease.back(clamp01(k.age / 200));
    const out = clamp01((k.u - 0.82) / 0.18);
    const a = 1 - out;
    const cx = k.P.x;
    const cy = k.P.y - 1;
    const pal = style === 'stone' ? mat('stone') : k.pal;
    const r = Math.max(1, R * inT);
    if (style === 'box' || style === 'block' || style === 'stone') {
      const w = Math.round(r * 1.6);
      const h = Math.round(r * 2);
      const x = cx - w / 2;
      const y = k.G - h;
      setAlpha(ctx, a * (style === 'box' ? 0.18 : 0.6));
      rect(ctx, x, y, w, h, pal[2]);
      setAlpha(ctx, a);
      if (style === 'box') {
        for (let q = 0; q <= w; q += 3) rect(ctx, x + q, y, 1, h, pal[3]);
        rect(ctx, x, y, w + 1, 1, pal[4]);
        rect(ctx, x, y + h - 1, w + 1, 1, pal[4]);
      } else {
        rect(ctx, x, y, w, 1, pal[4]);
        rect(ctx, x, y, 1, h, pal[3]);
        rect(ctx, x + w - 1, y, 1, h, pal[1]);
        line(ctx, x + 2, y + 2, x + 5, y + 8, W, 1);
        if (style === 'stone') { line(ctx, x + w - 3, y + 3, x + w - 6, y + h * 0.6, pal[0], 1); }
      }
      setAlpha(ctx, 1);
      return;
    }
    const wob = style === 'bubble' ? Math.sin(k.age / 70) * 1.2 : 0;
    setAlpha(ctx, a * 0.22);
    disc(ctx, cx, cy, r, pal[2]);
    setAlpha(ctx, a);
    ring(ctx, cx, cy, r + wob, pal[3], 1, style === 'bubble' ? 1 - wob * 0.02 : 1);
    ring(ctx, cx, k.G, r, pal[2], 1, 0.3);
    // brilho e hexagonos piscando na superficie
    for (let i = 0; i < 6; i++) {
      const ang = -Math.PI * 0.85 + i * 0.35 + Math.sin(k.age / 400) * 0.1;
      const on = noise(i, k.f >> 1, 11) > 0.2;
      if (on) dot(ctx, cx + Math.cos(ang) * r * 0.75, cy + Math.sin(ang) * r * 0.75, pal[4], 1);
    }
    dot(ctx, cx - r * 0.45, cy - r * 0.45, W, 2);
    if (k.age < 160) { setAlpha(ctx, 1 - k.age / 160); ring(ctx, cx, cy, r + 2, W, 1); }
    setAlpha(ctx, 1);
  }
});

// Particulas/objetos orbitando um corpo (aura, laminas girando, pedras, runas).
def('aura', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const n = o.n ?? 8;
    const R = (o.r ?? 0.65) * e.C;
    const a = env(k.u, 0.1, 0.2);
    const kind = o.kind || 'mote';
    const spin = (o.v ?? 1) * k.age / 260;
    setAlpha(ctx, a * 0.25);
    ring(ctx, k.P.x, k.G, R, k.pal[2], 2, 0.35);
    for (let i = 0; i < n; i++) {
      const ang = spin + (i / n) * TAU;
      const x = k.P.x + Math.cos(ang) * R;
      const y = k.P.y + Math.sin(ang) * R * 0.4 + Math.sin(k.age / 150 + i) * 2 - (o.lift ?? 0) * e.C;
      setAlpha(ctx, a * (Math.sin(ang) > 0 ? 1 : 0.6));
      switch (kind) {
        case 'blade': drawSprite(ctx, SYMBOLS.sword, colorMap(SPELL_PALETTES.steel), x, y, { flipX: Math.cos(ang) < 0 }); break;
        case 'rock': pebble(ctx, x, y, 2, mat('stone')); break;
        case 'bone': rect(ctx, x - 2, y, 4, 1, mat('bone')[3]); dot(ctx, x - 2, y - 1, mat('bone')[4], 1); dot(ctx, x + 2, y + 1, mat('bone')[4], 1); break;
        case 'rune': drawSprite(ctx, SYMBOLS[`rune${(i % 4) + 1}`], {}, x, y, { solid: k.pal[3 + (i % 2)] }); break;
        case 'note': drawSprite(ctx, SYMBOLS.note, colorMap(k.pal), x, y); break;
        case 'moon': drawSprite(ctx, SYMBOLS.moon, colorMap(k.pal), x, y, { flipX: i % 2 === 1 }); break;
        case 'spark': zigzag(ctx, x, y, x + Math.cos(ang + 1.5) * 5, y + Math.sin(ang + 1.5) * 3, k.f, i, { amp: 1.5, seg: 2, color: k.pal[2], core: k.pal[4] }); break;
        case 'leaf': rect(ctx, x, y, 2, 1, k.pal[3]); dot(ctx, x + 1, y - 1, k.pal[4], 1); break;
        case 'ember': rect(ctx, x, y, 1, 2, (k.f + i) % 2 ? k.pal[4] : k.pal[3]); break;
        case 'wisp': disc(ctx, x, y, 1, k.pal[3]); dot(ctx, x, y, W, 1); dot(ctx, x - Math.cos(ang + 1.5) * 2, y, k.pal[2], 1); break;
        case 'eye': drawSprite(ctx, SYMBOLS.eye, colorMap(k.pal), x, y); break;
        default: sparkle(ctx, x, y, 1, k.pal, (k.f + i) % 3 === 0);
      }
    }
    setAlpha(ctx, 1);
  }
});

// Escudo frontal (disco ou arco) virado para quem ataca.
def('shield', {
  ph: 'hit', at: 'c',
  draw(ctx, e, o, k) {
    const a = env(k.u, 0.1, 0.25);
    const R = (o.r ?? 0.75) * e.C * k.sc;
    const face = o.at === 't' ? -1 : 1;
    const cx = k.P.x + e.dir.x * face * e.C * 0.45;
    const cy = k.P.y;
    const pal = k.pal;
    setAlpha(ctx, a);
    if (o.style === 'round') {
      setAlpha(ctx, a * 0.35);
      disc(ctx, cx, cy, R * 0.6, pal[2]);
      setAlpha(ctx, a);
      ring(ctx, cx, cy, R * 0.6, pal[4], 1);
      star4(ctx, cx, cy, 2, pal[3]);
    } else {
      const base = Math.atan2(e.dir.y, e.dir.x * face);
      arc(ctx, k.P.x, k.P.y, R, base - 1, base + 1, (u) => (Math.abs(u - 0.5) < 0.15 ? W : pal[3]), (u) => 1 + Math.round(Math.sin(Math.PI * u) * 2));
    }
    const sh = (k.age / 6) % (R * 2 + 8);
    if (sh < R * 2) dot(ctx, cx, cy - R + sh, W, 1);
    setAlpha(ctx, 1);
  }
});

// Cura: motes subindo, cruzes e coluna suave.
def('heal', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const a = env(k.u, 0.1, 0.3);
    const n = o.n ?? 10;
    const pal = k.pal;
    const kind = o.kind || 'cross';
    setAlpha(ctx, a * 0.3);
    rect(ctx, k.P.x - 4, k.P.y - e.C * 1.2, 9, e.C * 1.2 + (k.G - k.P.y), pal[3]);
    setAlpha(ctx, a);
    ring(ctx, k.P.x, k.G, e.C * 0.6, pal[3], 1, 0.35);
    for (let i = 0; i < n; i++) {
      const t = ((k.age / 900) + i / n) % 1;
      const x = k.P.x + noise(i, 0, 5) * e.C * 0.5 + Math.sin(t * 6 + i) * 1.5;
      const y = k.G - t * e.C * 1.5;
      if (kind === 'heart' && i % 3 === 0) drawSprite(ctx, SYMBOLS.heart, colorMap(pal), x, y);
      else if (kind === 'leaf') rect(ctx, x, y, 2, 1, pal[3 + (i % 2)]);
      else if (kind === 'drop') { rect(ctx, x, y, 1, 2, pal[3]); dot(ctx, x, y - 1, W, 1); }
      else if (i % 3 === 0) { dot(ctx, x, y, W, 1); dot(ctx, x - 1, y, pal[3], 1); dot(ctx, x + 1, y, pal[3], 1); dot(ctx, x, y - 1, pal[3], 1); dot(ctx, x, y + 1, pal[3], 1); }
      else dot(ctx, x, y, t < 0.5 ? pal[4] : pal[3], 1);
    }
    setAlpha(ctx, 1);
  }
});

// Simbolo grande sobre o alvo (caveira, olho, coracao, ampulheta, zzz...).
def('glyph', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const rows = SYMBOLS[o.sym || 'skull'] || SYMBOLS.skull;
    const pop = ease.back(clamp01(k.age / 180));
    const a = env(k.u, 0.08, 0.25);
    const y = k.P.y - (o.y ?? 1.0) * e.C - Math.sin(k.age / 200) * 1.5;
    const sc = Math.max(1, Math.round((o.s ?? 1) * (pop > 0.5 ? 1 : 0.5) * k.sc));
    setAlpha(ctx, a);
    drawSprite(ctx, rows, colorMap(k.pal), k.P.x, y, { scale: sc, flipX: o.spin ? Math.floor(k.age / 120) % 2 === 1 : false });
    if (o.drip) {
      for (let i = 0; i < 3; i++) {
        const t = ((k.age / 500) + i / 3) % 1;
        dot(ctx, k.P.x - 2 + i * 2, y + rows.length * sc * 0.5 + t * e.C * 0.6, k.pal[2], 1);
      }
    }
    if (o.rays) {
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * TAU + k.age / 600;
        const r = rows[0].length * sc * 0.7 + 2;
        dot(ctx, k.P.x + Math.cos(ang) * r, y + Math.sin(ang) * r, k.pal[4], 1);
      }
    }
    setAlpha(ctx, 1);
  }
});

// Criatura invocada sai do chao (ou desce do ceu), avanca no alvo e some.
def('summon', {
  ph: 'hit', at: 'n',
  draw(ctx, e, o, k) {
    const sp = SPRITES[o.who] || SPRITES.spirit;
    const colors = colorMap(k.pal, mat(sp.mat === 'fire' ? 'fire' : sp.mat));
    const rise = clamp01(k.u / 0.35);
    const out = clamp01((k.u - 0.82) / 0.18);
    const sc = o.s ?? 1;
    let x = k.P.x;
    let y = k.G + 1;
    // portal no chao
    setAlpha(ctx, 0.8 * (1 - out));
    ring(ctx, x, k.G, (sp.rows[0].length * sc) * 0.6 * Math.min(1, rise * 2), k.pal[3], 2, 0.35);
    setAlpha(ctx, 0.4 * (1 - out));
    ring(ctx, x, k.G, (sp.rows[0].length * sc) * 0.6 * Math.min(1, rise * 2), k.pal[1], (sp.rows[0].length * sc) * 0.5, 0.35);
    setAlpha(ctx, 1);
    if (o.sky) {
      y = lerp(k.G - e.C * 4, k.G + 1, ease.out(rise));
    }
    // ataque: avanca ate o alvo e volta
    if (o.atk && k.u > 0.4 && k.u < 0.8) {
      const t = (k.u - 0.4) / 0.4;
      const lunge = Math.sin(Math.PI * t);
      x = lerp(k.P.x, e.hit.x - e.dir.x * e.C * 0.4, lunge * 0.9);
    }
    setAlpha(ctx, 1 - out);
    const flip = e.dir.x < 0;
    drawSprite(ctx, sp.rows, colors, x, y, { anchor: 'bottom', cut: o.sky ? 1 : rise, scale: sc, flipX: o.face === 'l' ? !flip : flip });
    setAlpha(ctx, 1);
    if (rise < 1 && !o.sky) {
      for (let i = 0; i < 4; i++) dot(ctx, x + noise(i, k.f, 4) * 6, k.G - Math.abs(noise(i + 3, k.f, 2)) * 3, mat('dust')[3], 1);
    }
  }
});

// Copias ilusorias (giram, se espalham ou formam um exercito).
def('copies', {
  ph: 'hit', at: 'c',
  draw(ctx, e, o, k) {
    const n = o.n ?? 3;
    const mode = o.mode || 'side';
    const a = env(k.u, 0.12, 0.25);
    for (let i = 0; i < n; i++) {
      let x = k.P.x;
      let y = k.P.y;
      if (mode === 'orbit') {
        const ang = k.age / 300 + (i / n) * TAU;
        x += Math.cos(ang) * e.C * 0.8;
        y += Math.sin(ang) * e.C * 0.3;
      } else if (mode === 'army') {
        const row = i % 3;
        const col = Math.floor(i / 3);
        x = lerp(k.P.x - e.dir.x * e.C * 3, k.P.x, ease.out(clamp01(k.u * 1.6))) - e.dir.x * col * 9 + (row - 1) * 3;
        y = k.P.y + (row - 1) * 5;
      } else {
        const off = (i - (n - 1) / 2) * e.C * 0.75 * ease.out(clamp01(k.u * 3));
        x += e.perp.x * off + (mode === 'mirror' ? e.dir.x * 2 : 0);
        y += e.perp.y * off;
      }
      const flick = noise(i, k.f >> 1, 3) > -0.6;
      if (!flick) continue;
      setAlpha(ctx, a * 0.7);
      drawSprite(ctx, HUMAN, colorMap(k.pal), x, y, { solid: null, flipX: e.dir.x < 0 && mode !== 'army' });
    }
    setAlpha(ctx, 1);
  }
});

// Nuvem de fumaca rapida (teleporte, invisibilidade, transformacao).
def('puff', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const list = [];
    burst(k.R, list, { x: k.P.x, y: k.P.y + 3, n: o.n ?? 10, speed: [20, 50], drag: 4, life: [300, 520], pal: o.p ? k.pal : SPELL_PALETTES.smoke, shape: 'puff', size: [2, 3], radius: 3 });
    drawParticles(ctx, list, k.age);
    const sp = [];
    burst(k.R, sp, { x: k.P.x, y: k.P.y, n: 6, speed: [30, 70], drag: 3, life: [200, 400], pal: k.pal, shape: 'star' });
    drawParticles(ctx, sp, k.age);
  }
});

// Portal oval de pe.
def('portal', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const open = ease.back(clamp01(k.age / 240));
    const close = clamp01((k.u - 0.8) / 0.2);
    const R = (o.r ?? 0.6) * e.C * open * (1 - close);
    if (R < 1) return;
    const cx = k.P.x;
    const cy = k.G - R * 1.5;
    setAlpha(ctx, 0.7);
    ring(ctx, cx, cy, R, k.pal[1], Math.round(R), 1.5);
    setAlpha(ctx, 1);
    ring(ctx, cx, cy, R, k.pal[3], 2, 1.5);
    for (let i = 0; i < 10; i++) {
      const t = ((k.age / 700) + i / 10) % 1;
      const ang = t * 6 + i;
      dot(ctx, cx + Math.cos(ang) * R * (1 - t), cy + Math.sin(ang) * R * 1.5 * (1 - t), k.pal[4], 1);
    }
    dot(ctx, cx, cy, W, 1);
  }
});

// Vortice/espiral puxando para o centro (buraco negro, redemoinho).
def('vortex', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const R = (o.r ?? 1.4) * e.C * k.sc;
    const a = env(k.u, 0.1, 0.2);
    const sy = o.flat ? 0.4 : 0.8;
    const cy = o.flat ? k.G : k.P.y;
    setAlpha(ctx, a);
    for (let arm = 0; arm < 3; arm++) {
      for (let q = 0; q < 24; q++) {
        const t = q / 24;
        const ang = arm * (TAU / 3) + t * 4 - k.age / 140;
        const r = R * (1 - t);
        dot(ctx, k.P.x + Math.cos(ang) * r, cy + Math.sin(ang) * r * sy, t > 0.7 ? k.pal[4] : t > 0.35 ? k.pal[3] : k.pal[2], t < 0.3 ? 2 : 1);
      }
    }
    if (o.core !== 0) disc(ctx, k.P.x, cy, Math.max(1, R * 0.18), o.light ? W : INK);
    for (let i = 0; i < 10; i++) {
      const t = ((k.age / 500) + i / 10) % 1;
      const ang = i * 2.1 + t * 3;
      const r = R * 1.6 * (1 - t);
      dot(ctx, k.P.x + Math.cos(ang) * r, cy + Math.sin(ang) * r * sy, k.pal[3], 1);
    }
    setAlpha(ctx, 1);
  }
});

// Tornado / funil de vento.
def('tornado', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const a = env(k.u, 0.1, 0.2);
    const H = (o.h ?? 2.6) * e.C * k.sc;
    const grow = ease.out(clamp01(k.age / 300));
    setAlpha(ctx, a);
    for (let q = 0; q < H * grow; q += 2) {
      const t = q / H;
      const r = 2 + t * t * (o.r ?? 1) * e.C;
      const sway = Math.sin(t * 3 + k.age / 120) * 3 * t;
      const ang = k.age / 60 + q * 0.5;
      const x = k.P.x + sway;
      const y = k.G - q;
      ring(ctx, x, y, r, (q >> 1) % 2 ? k.pal[2] : k.pal[3], 1, 0.25);
      dot(ctx, x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.25, W, 1);
    }
    for (let i = 0; i < 6; i++) {
      const ang = k.age / 90 + i;
      const h = ((i * 0.17 + k.age / 900) % 1) * H * grow;
      dot(ctx, k.P.x + Math.cos(ang) * (4 + h * 0.3), k.G - h, mat(o.m || 'dust')[2], 2);
    }
    setAlpha(ctx, 1);
  }
});

// Relogio do tempo: ponteiros girando, parando ou voltando.
def('clock', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const mode = o.mode || 'stop';
    const R = (o.r ?? 0.8) * e.C * k.sc;
    const a = env(k.u, 0.1, 0.25);
    const cx = k.P.x;
    const cy = k.P.y - (o.y ?? 1.1) * e.C;
    setAlpha(ctx, a * 0.55);
    disc(ctx, cx, cy, R, k.pal[1]);
    setAlpha(ctx, a);
    ring(ctx, cx, cy, R, k.pal[3], 1);
    ring(ctx, cx, cy, Math.max(1, R - 3), k.pal[2], 1);
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * TAU;
      dot(ctx, cx + Math.cos(ang) * (R - 2), cy + Math.sin(ang) * (R - 2), i % 3 ? k.pal[2] : k.pal[4], 1);
    }
    const speed = mode === 'fast' ? 0.03 : mode === 'slow' ? 0.003 : mode === 'rewind' ? -0.025 : 0.02;
    const t = mode === 'stop' ? Math.min(k.age, 260) : k.age;
    const hA = -Math.PI / 2 + t * speed;
    const mA = -Math.PI / 2 + t * speed * 12;
    line(ctx, cx, cy, cx + Math.cos(hA) * R * 0.5, cy + Math.sin(hA) * R * 0.5, k.pal[4], 1);
    line(ctx, cx, cy, cx + Math.cos(mA) * R * 0.8, cy + Math.sin(mA) * R * 0.8, W, 1);
    if (mode === 'stop' && k.age > 260 && k.age < 700) {
      const t2 = (k.age - 260) / 440;
      setAlpha(ctx, a * (1 - t2));
      ring(ctx, cx, cy, R + t2 * e.C * 3, k.pal[4], 1);
    }
    if (mode === 'rewind' || mode === 'fast') {
      for (let i = 0; i < 3; i++) {
        const ang = hA * (mode === 'rewind' ? 1 : -1) + i * 2.1;
        dot(ctx, cx + Math.cos(ang) * (R + 3), cy + Math.sin(ang) * (R + 3), k.pal[3], 1);
      }
    }
    setAlpha(ctx, 1);
  }
});

// Nuvem/neblina que fica na area.
def('cloud', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const n = o.n ?? 10;
    const R = (o.r ?? 1.3) * e.C * k.sc;
    const a = env(k.u, 0.15, 0.3);
    const rr = k.R;
    for (let i = 0; i < n; i++) {
      const bx = rr.range(-1, 1) * R;
      const by = rr.range(-0.5, 0.3) * R * 0.6;
      const sz = rr.range(2, 4.5) * k.sc;
      const drift = Math.sin(k.age / 400 + i) * 2;
      setAlpha(ctx, a * 0.75);
      disc(ctx, k.P.x + bx + drift, k.P.y + by - k.u * 2, sz, k.pal[i % 2 ? 1 : 2]);
      setAlpha(ctx, a * 0.5);
      disc(ctx, k.P.x + bx + drift - 1, k.P.y + by - 1 - k.u * 2, Math.max(1, sz - 1.5), k.pal[3]);
    }
    if (o.zz) {
      for (let i = 0; i < 3; i++) {
        const t = ((k.age / 900) + i / 3) % 1;
        setAlpha(ctx, a * (1 - t));
        drawSprite(ctx, ['kkk', '.k.', 'kkk'], {}, k.P.x + i * 4 - 4, k.P.y - e.C * 0.6 - t * e.C, { solid: k.pal[4] });
      }
    }
    setAlpha(ctx, 1);
  }
});

// Enxame em volta do alvo (insetos, morcegos, corvos, notas, borboletas).
def('swarm', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const n = o.n ?? 16;
    const a = env(k.u, 0.08, 0.2);
    const R = (o.r ?? 0.7) * e.C;
    const kind = o.kind || 'insect';
    const fly = clamp01(k.age / 300);
    setAlpha(ctx, a);
    for (let i = 0; i < n; i++) {
      const ang = k.age / (90 + (i % 5) * 20) * (i % 2 ? 1 : -1) + i * 1.3;
      const r = R * (0.4 + 0.6 * Math.abs(Math.sin(i * 3.7 + k.age / 300)));
      const tx = k.P.x + Math.cos(ang) * r;
      const ty = k.P.y + Math.sin(ang * 1.3) * r * 0.6;
      const h = hand(e);
      const x = o.fly ? lerp(h.x, tx, ease.out(fly)) : tx;
      const y = o.fly ? lerp(h.y, ty, ease.out(fly)) : ty;
      switch (kind) {
        case 'bat': drawSprite(ctx, SPRITES.bat.rows, colorMap(k.pal, mat('shadow')), x, y, { cut: (k.f + i) % 2 ? 1 : 0.6 }); break;
        case 'crow': drawSprite(ctx, SPRITES.crow.rows, colorMap(k.pal, mat('shadow')), x, y, { flipX: Math.cos(ang) < 0 }); break;
        case 'note': drawSprite(ctx, SYMBOLS.note, colorMap(k.pal), x, y); break;
        case 'butterfly': rect(ctx, x - 1, y, (k.f + i) % 2 ? 3 : 1, 1, k.pal[3 + (i % 2)]); dot(ctx, x, y + 1, INK, 1); break;
        case 'eye': drawSprite(ctx, SYMBOLS.eye, colorMap(k.pal), x, y); break;
        case 'ghost': drawSprite(ctx, SPRITES.spirit.rows, colorMap(k.pal, mat('smoke')), x, y); break;
        case 'spark': star4(ctx, x, y, 1, k.pal[4]); break;
        default: dot(ctx, x, y, INK, 1); if ((k.f + i) % 2) dot(ctx, x, y - 1, k.pal[4], 1);
      }
    }
    setAlpha(ctx, 1);
  }
});

// Cortes no alvo (laminas de forca, garras, sombras).
def('slash', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const n = o.n ?? 2;
    const R = (o.r ?? 0.7) * e.C * k.sc;
    for (let i = 0; i < n; i++) {
      const age = k.age - i * (o.gap ?? 90);
      if (age < 0 || age > 220) continue;
      const t = age / 220;
      const base = (i % 2 ? 0.8 : -0.8) + (o.tilt ?? 0);
      const sweep = ease.outCubic(clamp01(t * 2));
      const lines = o.kind === 'claw' ? 3 : 1;
      setAlpha(ctx, 1 - t);
      for (let q = 0; q < lines; q++) {
        const off = (q - (lines - 1) / 2) * 3;
        arc(ctx, k.P.x + off, k.P.y + off * 0.5, R, base - 1.2, base - 1.2 + 2.4 * sweep, (u) => (u > 0.8 ? W : u > 0.4 ? k.pal[4] : k.pal[2]), (u) => 1 + Math.round(Math.sin(Math.PI * u) * (lines > 1 ? 0 : 2)));
      }
      setAlpha(ctx, 1);
    }
  }
});

// Rachaduras no chao saindo da ancora (lava opcional).
def('cracks', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const n = o.n ?? 6;
    const R = (o.r ?? 1.6) * e.C * k.sc;
    const grow = ease.out(clamp01(k.age / 260));
    const a = 1 - clamp01((k.u - 0.75) / 0.25);
    const rr = k.R;
    const m = mat(o.m || 'earth');
    setAlpha(ctx, a);
    for (let i = 0; i < n; i++) {
      let x = k.P.x;
      let y = k.G;
      let ang = (i / n) * TAU + rr.range(-0.3, 0.3);
      const segs = 4;
      for (let s = 0; s < segs; s++) {
        const L = (R / segs) * grow;
        ang += rr.range(-0.5, 0.5);
        const nx = x + Math.cos(ang) * L;
        const ny = y + Math.sin(ang) * L * 0.35;
        line(ctx, x, y, nx, ny, m[0], 1);
        if (o.lava) dot(ctx, nx, ny, (k.f + i + s) % 3 ? k.pal[3] : k.pal[4], 1);
        x = nx;
        y = ny;
      }
    }
    setAlpha(ctx, 1);
  }
});

// Mancha no chao (gelo, lava, acido, sangue, lama, flores, sombra...).
def('floor', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const R = (o.r ?? 1.3) * e.C * k.sc;
    const a = env(k.u, 0.12, 0.25);
    const kind = o.kind || 'plain';
    const pal = kind === 'mud' ? mat('mud') : kind === 'blood' ? mat('blood') : k.pal;
    const r = R * ease.out(clamp01(k.age / 260));
    if (r < 1) return;
    const fill = kind === 'ice' ? 3 : kind === 'lava' || kind === 'acid' || kind === 'flowers' || kind === 'water' ? 2 : 1;
    setAlpha(ctx, a * (kind === 'shadow' ? 0.75 : kind === 'lava' || kind === 'acid' ? 0.45 : 0.8));
    ring(ctx, k.P.x, k.G, r, pal[fill], Math.round(r), 0.38);
    setAlpha(ctx, a * 0.9);
    ring(ctx, k.P.x, k.G, r * 0.6, pal[Math.min(4, fill + 1)], 1, 0.38);
    ring(ctx, k.P.x, k.G, r, pal[Math.min(4, fill + 1)], 1, 0.38);
    const rr = k.R;
    for (let i = 0; i < 12; i++) {
      const x = k.P.x + rr.range(-0.8, 0.8) * r;
      const y = k.G + rr.range(-0.3, 0.3) * r;
      switch (kind) {
        case 'ice': rect(ctx, x, y, 3, 1, W); break;
        case 'lava': case 'acid': { const b = (k.f + i) % 6; if (b < 3) ring(ctx, x, y, b === 2 ? 2 : 1, pal[b === 2 ? 4 : 3], 1, 0.6); break; }
        case 'flowers': dot(ctx, x, y, ['#ffffff', '#f2e6a0', '#e88a9a', pal[4]][i % 4], 1); dot(ctx, x, y + 1, pal[2], 1); break;
        case 'grease': rect(ctx, x, y, 2, 1, '#6a6070'); break;
        case 'web': line(ctx, k.P.x, k.G, x, y, '#e6e6ee', 1); break;
        case 'salt': dot(ctx, x, y, W, 1); break;
        case 'water': if ((k.f + i) % 5 === 0) ring(ctx, x, y, 2, pal[4], 1, 0.4); break;
        default: if (i % 3 === 0) dot(ctx, x, y, pal[3], 1);
      }
    }
    setAlpha(ctx, 1);
  }
});

// Clima sobre a cena toda (chuva, neve, cinzas, areia, escuridao, sol, folhas).
def('weather', {
  ph: 'all',
  draw(ctx, e, o, k) {
    const a = env(k.u, 0.12, 0.2) * (o.a ?? 1);
    const kind = o.kind || 'rain';
    const x0 = Math.min(e.from.x, e.hit.x) - e.C * 6;
    const x1 = Math.max(e.from.x, e.hit.x) + e.C * 6;
    // ceu alto (9 celulas): no palco do grimorio esticado a borda de cima nao aparece
    const y0 = Math.min(e.from.y, e.hit.y) - e.C * 9;
    const y1 = Math.max(e.ground, e.fromGround) + e.C * 2;
    const Wd = x1 - x0;
    const Hd = y1 - y0;
    if (kind === 'dark' || kind === 'gray' || kind === 'red' || kind === 'sun') {
      const c = kind === 'dark' ? '#05030a' : kind === 'gray' ? '#8a8a96' : kind === 'red' ? '#6a0c18' : '#ffd060';
      setAlpha(ctx, a * (o.d ?? (kind === 'dark' ? 0.55 : 0.25)));
      rect(ctx, x0, y0, Wd, Hd, c);
      setAlpha(ctx, 1);
      if (kind !== 'sun') return;
    }
    // mesma densidade de antes perto do chao (o ceu cresceu 4 celulas)
    const n = Math.round((o.n ?? 70) * Hd / Math.max(1, Hd - e.C * 4));
    const rr = k.R;
    setAlpha(ctx, a);
    for (let i = 0; i < n; i++) {
      const bx = rr.range(0, Wd);
      const by = rr.range(0, Hd);
      const sp = rr.range(0.7, 1.3);
      const t = k.age * sp;
      switch (kind) {
        case 'rain': case 'blood': {
          const y = (by + t * 0.35) % Hd;
          const x = (bx - t * 0.1 + Wd * 10) % Wd;
          line(ctx, x0 + x, y0 + y, x0 + x - 1, y0 + y + 3, kind === 'blood' ? SPELL_PALETTES.blood[2] : k.pal[3], 1);
          break;
        }
        case 'snow': case 'ash': case 'leaves': case 'petals': case 'stars': {
          const y = (by + t * (kind === 'stars' ? 0 : 0.05)) % Hd;
          const x = (bx + Math.sin(t / 300 + i) * 4 + Wd) % Wd;
          if (kind === 'snow') dot(ctx, x0 + x, y0 + y, i % 3 ? W : k.pal[3], i % 5 ? 1 : 2);
          else if (kind === 'ash') rect(ctx, x0 + x, y0 + y, 1, 1, (Math.floor(k.age / 80) + i) % 3 ? '#6a6070' : k.pal[3]);
          else if (kind === 'stars') { if (noise(i, k.f >> 2, 9) > 0) star4(ctx, x0 + x, y0 + y, 1, k.pal[4]); }
          else rect(ctx, x0 + x, y0 + y, 2, 1, k.pal[2 + (i % 3)]);
          break;
        }
        case 'sand': case 'wind': {
          const x = (bx + t * 0.5) % Wd;
          line(ctx, x0 + x, y0 + by, x0 + x + (kind === 'sand' ? 2 : 6), y0 + by, kind === 'sand' ? mat('sand')[2 + (i % 2)] : k.pal[3 + (i % 2)], 1);
          break;
        }
        case 'sun': {
          if (i % 12) break;
          const x = (bx + t * 0.02) % Wd;
          setAlpha(ctx, a * 0.16);
          line(ctx, x0 + x, y0, x0 + x - Hd * 0.4, y1, k.pal[4], 2);
          setAlpha(ctx, a);
          break;
        }
        default: break;
      }
    }
    setAlpha(ctx, 1);
  }
});

// Tinta de tela (lendarias, tempo parado).
def('tint', {
  ph: 'all',
  draw(ctx, e, o, k) {
    const peak = o.at === 'cast' ? 0.3 : (e.T.impactAt / Math.max(1, e.T.total));
    const u = k.u;
    const env2 = u < peak ? u / Math.max(0.01, peak) : 1 - (u - peak) / Math.max(0.01, 1 - peak);
    const c = o.c === 'gray' ? '#9a9aa8' : o.c === 'white' ? '#ffffff' : o.c === 'black' ? '#000000' : k.pal[o.i ?? 0];
    setAlpha(ctx, clamp01(env2) * (o.a ?? 0.28));
    const S = e.C * 60;
    rect(ctx, e.hit.x - S, e.hit.y - S, S * 2, S * 2, c);
    setAlpha(ctx, 1);
  }
});

// Clarao branco curto.
def('flash', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const t = clamp01(k.age / (o.ms ?? 140));
    if (t >= 1) return;
    setAlpha(ctx, 1 - t);
    disc(ctx, k.P.x, k.P.y, (o.r ?? 0.5) * e.C * (0.6 + t * 0.6) * k.sc, o.c === 'pal' ? k.pal[4] : W);
    star4(ctx, k.P.x, k.P.y, (o.r ?? 0.5) * e.C * 1.6, k.pal[4]);
    setAlpha(ctx, 1);
  }
});

// Marca sobre o alvo (mira fechando, marca a fogo).
def('mark', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const a = env(k.u, 0.1, 0.25);
    const close = ease.outCubic(clamp01(k.age / 300));
    const R = e.C * (1.1 - 0.5 * close);
    setAlpha(ctx, a);
    for (let q = 0; q < 4; q++) {
      const sx = q % 2 ? 1 : -1;
      const sy = q < 2 ? -1 : 1;
      const x = k.P.x + sx * R;
      const y = k.P.y + sy * R;
      rect(ctx, sx > 0 ? x - 3 : x, y, 4, 1, k.pal[4]);
      rect(ctx, x, sy > 0 ? y - 3 : y, 1, 4, k.pal[4]);
    }
    if (close >= 1) { dot(ctx, k.P.x, k.P.y, k.pal[4], 2); }
    setAlpha(ctx, 1);
  }
});

// Paredes do labirinto ilusorio em volta do alvo.
def('maze', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const a = env(k.u, 0.12, 0.2);
    const S = 5;
    const N = 5;
    const rr = k.R;
    const x0 = k.P.x - (N * S) / 2;
    const y0 = k.G - (N * S) / 2 * 0.5 - 2;
    setAlpha(ctx, a);
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const vert = rr.chance(0.5);
        const keep = rr.chance(0.6);
        if (!keep || (i === 2 && j === 2)) continue;
        const rise = clamp01((k.age - (i + j) * 30) / 200);
        const h = Math.round(5 * rise);
        if (h < 1) continue;
        const x = x0 + i * S;
        const y = y0 + j * S * 0.5;
        if (vert) rect(ctx, x, y - h, 1, h + S * 0.5, k.pal[3]);
        else { rect(ctx, x, y - h, S + 1, h, k.pal[2]); rect(ctx, x, y - h, S + 1, 1, k.pal[4]); }
      }
    }
    setAlpha(ctx, 1);
  }
});

// Transformacao do alvo (sapo, estatua, fera, gigante, nevoa).
def('transform', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const to = o.to || 'frog';
    const t = clamp01((k.age - 120) / 200);
    const a = 1 - clamp01((k.u - 0.85) / 0.15);
    setAlpha(ctx, a);
    if (to === 'stone' || to === 'gold' || to === 'glass' || to === 'steel' || to === 'wood') {
      const m = to === 'stone' ? mat('stone') : to === 'gold' ? SPELL_PALETTES.gold : to === 'steel' ? mat('steel') : to === 'wood' ? mat('wood') : SPELL_PALETTES.ice;
      const cut = clamp01(k.age / Math.max(1, k.dur * 0.5));
      const rows = HUMAN.slice(HUMAN.length - Math.ceil(HUMAN.length * cut));
      if (rows.length) drawSprite(ctx, rows, { k: INK, 2: m[1], 3: m[2], 4: m[3] }, k.P.x, k.G - 6, { anchor: 'bottom' });
    } else if (t > 0) {
      if (to === 'giant') {
        drawSprite(ctx, HUMAN, colorMap(k.pal), k.P.x, k.G - 4, { anchor: 'bottom', scale: Math.round(1 + ease.out(t)) });
      } else {
        const sp = SPRITES[to === 'beast' ? 'wolf' : to] || SPRITES.horror;
        drawSprite(ctx, sp.rows, colorMap(k.pal, mat(sp.mat)), k.P.x, k.G - 5, { anchor: 'bottom', flipX: e.dir.x > 0 });
      }
    }
    setAlpha(ctx, 1);
  }
});

// Asas de luz/sombra atras do corpo.
def('wings', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const a = env(k.u, 0.12, 0.25);
    const flap = Math.sin(k.age / 110) * 2;
    const open = ease.out(clamp01(k.age / 300));
    setAlpha(ctx, a);
    for (const sx of [-1, 1]) {
      for (let f = 0; f < 5; f++) {
        const L = (6 + f * 1.5) * open;
        const ang = -Math.PI / 2 + sx * (0.5 + f * 0.25) + sx * flap * 0.05;
        const bx = k.P.x + sx * 2;
        const by = k.P.y - 2;
        line(ctx, bx, by, bx + Math.cos(ang) * L, by + Math.sin(ang) * L * 0.8 + flap * (f / 5), f % 2 ? k.pal[3] : k.pal[4], 1);
      }
    }
    setAlpha(ctx, 1);
  }
});

// Fios dourados do destino (ou fios de marionete) ligando pontos.
def('threads', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const n = o.n ?? 7;
    const a = env(k.u, 0.12, 0.25);
    const rr = k.R;
    const top = o.up;
    setAlpha(ctx, a);
    for (let i = 0; i < n; i++) {
      const ang = rr.range(0, TAU);
      const d = rr.range(1.2, 2.8) * e.C;
      const tx = top ? k.P.x + (i - (n - 1) / 2) * 4 : k.P.x + Math.cos(ang) * d;
      const ty = top ? k.P.y - e.C * 2 : k.P.y + Math.sin(ang) * d * 0.6;
      const grow = clamp01((k.age - i * 40) / 260);
      const ex = lerp(k.P.x, tx, grow);
      const ey = lerp(k.P.y, ty, grow);
      const sag = Math.sin(k.age / 200 + i) * 1.5;
      line(ctx, k.P.x, k.P.y, (k.P.x + ex) / 2, (k.P.y + ey) / 2 + sag, k.pal[2], 1);
      line(ctx, (k.P.x + ex) / 2, (k.P.y + ey) / 2 + sag, ex, ey, k.pal[3], 1);
      if (grow >= 1) dot(ctx, ex, ey, (k.f + i) % 3 ? k.pal[4] : W, 1);
    }
    setAlpha(ctx, 1);
  }
});

// Brilhos que aparecem e somem espalhados (detectar, revelar, poeira estelar).
def('twinkle', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const n = o.n ?? 14;
    const R = (o.r ?? 1.2) * e.C;
    const rr = k.R;
    for (let i = 0; i < n; i++) {
      const x = k.P.x + rr.range(-1, 1) * R;
      const y = k.P.y + rr.range(-1, 0.6) * R * 0.8;
      const t0 = rr.range(0, Math.max(1, k.dur - 300));
      const t = (k.age - t0) / 300;
      if (t < 0 || t > 1) continue;
      const s = Math.round(Math.sin(Math.PI * t) * 2);
      star4(ctx, x, y, Math.max(1, s), k.pal[3 + (i % 2)]);
      dot(ctx, x, y, W, 1);
    }
  }
});

// Linhas de som/ondas concentricas saindo do conjurador (musica, eco).
def('sound', {
  ph: 'hit', at: 'c',
  draw(ctx, e, o, k) {
    const n = o.n ?? 4;
    const R = (o.r ?? 2) * e.C;
    for (let i = 0; i < n; i++) {
      const t = ((k.age / (o.ms ?? 500)) + i / n) % 1;
      if (k.age < (i / n) * (o.ms ?? 500)) continue;
      setAlpha(ctx, (1 - t) * env(k.u, 0.05, 0.2));
      arc(ctx, k.P.x, k.P.y, Math.max(2, R * t), -Math.PI * 0.35, Math.PI * 0.35, () => k.pal[3], () => 1);
      arc(ctx, k.P.x, k.P.y, Math.max(2, R * t), Math.PI * 0.65, Math.PI * 1.35, () => k.pal[3], () => 1);
    }
    setAlpha(ctx, 1);
  }
});

// Sem desenho: controla os corpos (ver engine.bodies). Fica aqui para o parser aceitar.
def('body', { ph: 'hit', draw() {} });
def('shake', { ph: 'hit', draw() {} });
def('calm', { ph: 'all', draw() {} });

// Contragolpe da falha: fumaca e estrelinhas na cabeca do conjurador.
def('backfire', {
  ph: 'hit', at: 'c',
  draw(ctx, e, o, k) {
    PRIMS.puff.draw(ctx, e, { n: 8 }, k);
    const t = k.age / 120;
    for (let i = 0; i < 3; i++) {
      const ang = t + (i / 3) * TAU;
      const x = e.from.x + Math.cos(ang) * 5;
      const y = e.from.y - e.C * 0.75 + Math.sin(ang) * 1.5;
      if (k.u < 0.9) star4(ctx, x, y, 1, i % 2 ? '#ffe070' : '#ffffff');
    }
  }
});

// Brilho dourado extra do critico.
def('critspark', {
  ph: 'hit',
  draw(ctx, e, o, k) {
    const gold = SPELL_PALETTES.gold;
    if (k.age < 300) {
      setAlpha(ctx, 1 - k.age / 300);
      ring(ctx, k.P.x, k.P.y, 2 + ease.outCubic(k.age / 300) * e.C * 1.2, gold[3], 1);
      setAlpha(ctx, 1);
    }
    const list = [];
    burst(k.R, list, { x: k.P.x, y: k.P.y, n: 10, speed: [40, 90], drag: 3, life: [250, 500], pal: gold, shape: 'star' });
    drawParticles(ctx, list, k.age);
  }
});

export { HUMAN, mix };
