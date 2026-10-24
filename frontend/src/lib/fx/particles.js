// Particulas analiticas: cada particula e sorteada UMA vez (semente = rollId) e a
// posicao em qualquer instante e uma formula fechada do tempo. Sem estado por
// quadro: o mesmo instante sempre desenha a mesma coisa, em qualquer cliente,
// com qualquer taxa de quadros (e da para tirar "fotos" de quadros nos testes).
import { noise } from './rng.js';
import { rect, dot, disc, setAlpha } from './draw.js';

// Cria particulas em rajada. Angulos em radianos, velocidades em px de efeito/s,
// tempos em ms do relogio da animacao.
export function burst(rng, out, o) {
  const n = Math.max(0, Math.round(o.n));
  for (let i = 0; i < n; i++) {
    const ang = (o.angle ?? 0) + rng.range(-(o.spread ?? Math.PI), o.spread ?? Math.PI);
    const sp = rng.range(o.speed?.[0] ?? 20, o.speed?.[1] ?? 60);
    const r0 = rng.range(0, o.radius ?? 0);
    const a0 = rng.range(0, Math.PI * 2);
    out.push({
      t0: (o.t0 ?? 0) + rng.range(0, o.stagger ?? 0),
      x: o.x + Math.cos(a0) * r0 * (o.rx ?? 1),
      y: o.y + Math.sin(a0) * r0 * (o.ry ?? 1),
      vx: Math.cos(ang) * sp + (o.vx ?? 0),
      vy: Math.sin(ang) * sp + (o.vy ?? 0),
      g: o.g ?? 0,
      drag: o.drag ?? 3,
      life: rng.range(o.life?.[0] ?? 250, o.life?.[1] ?? 450),
      size: rng.int(o.size?.[0] ?? 1, o.size?.[1] ?? 2),
      pal: o.pal,
      shape: o.shape || 'square',
      motion: o.motion || 'none',
      ph: rng.range(0, Math.PI * 2),
      floor: o.floor ?? null,
      cx: o.cx ?? o.x,
      cy: o.cy ?? o.y,
      fade: o.fade ?? true,
      id: out.length
    });
  }
}

// Estado de uma particula no instante T (ms). Devolve null se nao esta viva.
export function sample(p, T) {
  const ageMs = T - p.t0;
  if (ageMs < 0 || ageMs > p.life) return null;
  const a = ageMs / 1000;
  const k = ageMs / p.life;
  const f = p.drag > 0 ? (1 - Math.exp(-p.drag * a)) / p.drag : a;
  let g = p.g;
  if (p.motion === 'rise') g = -Math.abs(p.g || 30);
  if (p.motion === 'drift') g = -Math.abs(p.g || 10);
  let x = p.x + p.vx * f;
  let y = p.y + p.vy * f + 0.5 * g * a * a;
  const frame = Math.floor(T / 33);
  switch (p.motion) {
    case 'jitter': x += Math.round(noise(p.id, frame) * 1.6); y += Math.round(noise(p.id + 99, frame) * 1.6); break;
    case 'flutter': x += Math.sin(a * 10 + p.ph) * 2.2; break;
    case 'orbit': {
      const dx = x - p.cx;
      const dy = y - p.cy;
      const ang = a * 7 + p.ph * 0.2;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      x = p.cx + dx * c - dy * s * 0.6;
      y = p.cy + dx * s * 0.6 + dy * c;
      break;
    }
    case 'rise': x += Math.round(noise(p.id, frame >> 1) * 0.8); break;
    default: break;
  }
  if (p.floor != null && y > p.floor) y = p.floor;
  // Stardew: a particula nasce no brilho e morre na sombra.
  const pal = p.pal;
  const idx = p.fade ? Math.max(0, pal.length - 1 - Math.floor(k * pal.length)) : pal.length - 1;
  const speedK = p.drag > 0 ? Math.exp(-p.drag * a) : 1;
  return { x, y, k, color: pal[idx], light: pal[Math.min(pal.length - 1, idx + 1)], dark: pal[Math.max(0, idx - 1)], vx: p.vx * speedK, vy: p.vy * speedK + g * a, frame };
}

export function drawParticle(ctx, p, s) {
  const size = p.shape === 'smoke' || p.shape === 'puff'
    ? Math.max(1, Math.round(p.size * (0.7 + s.k * 0.5)))
    : Math.max(1, Math.round(p.size * (1 - s.k * 0.5)));
  const x = Math.round(s.x);
  const y = Math.round(s.y);
  switch (p.shape) {
    case 'spark':
    case 'ray': {
      const len = Math.hypot(s.vx, s.vy);
      const n = Math.min(p.shape === 'ray' ? 4 : 3, Math.max(1, Math.round(len / 25)));
      const ux = len ? s.vx / len : 0;
      const uy = len ? s.vy / len : 0;
      for (let i = n; i >= 1; i--) dot(ctx, x - ux * i, y - uy * i, s.dark, 1);
      dot(ctx, x, y, s.light, 1);
      break;
    }
    case 'shard':
      dot(ctx, x, y, s.color, 1);
      dot(ctx, x + 1, y - 1, s.light, 1);
      if (size > 1) dot(ctx, x - 1, y + 1, s.dark, 1);
      break;
    case 'leaf':
      rect(ctx, x, y, 2, 1, s.color);
      dot(ctx, x + ((s.frame + p.id) % 2 ? 1 : 0), y - 1, s.light, 1);
      break;
    case 'drop':
      rect(ctx, x, y, 1, 2, s.color);
      dot(ctx, x, y - 1, s.light, 1);
      break;
    case 'smoke':
      setAlpha(ctx, 0.85 * (1 - s.k * 0.6));
      disc(ctx, x, y, size - 1, s.color);
      setAlpha(ctx, 1);
      break;
    case 'puff': {
      // Nuvem de poeira fica sempre nos tons claros da paleta (escuro vira lama).
      const n = p.pal.length;
      const shade = s.k > 0.6 ? 1 : 0;
      setAlpha(ctx, 1 - s.k * s.k);
      disc(ctx, x, y, size, p.pal[Math.max(0, n - 3 - shade)]);
      disc(ctx, x - 1, y - 1, Math.max(0, size - 1), p.pal[Math.max(0, n - 2 - shade)]);
      setAlpha(ctx, 1);
      break;
    }
    case 'star': {
      const on = noise(p.id, s.frame >> 1) > -0.35;
      dot(ctx, x, y, s.light, 1);
      if (on) {
        dot(ctx, x - 1, y, s.color, 1); dot(ctx, x + 1, y, s.color, 1);
        dot(ctx, x, y - 1, s.color, 1); dot(ctx, x, y + 1, s.color, 1);
      }
      break;
    }
    case 'cross':
      dot(ctx, x, y, s.light, 1);
      dot(ctx, x - 1, y, s.color, 1); dot(ctx, x + 1, y, s.color, 1);
      dot(ctx, x, y - 1, s.color, 1); dot(ctx, x, y + 1, s.color, 1);
      break;
    case 'ring':
      rect(ctx, x - 1, y - 1, 3, 1, s.color);
      rect(ctx, x - 1, y + 1, 3, 1, s.dark);
      dot(ctx, x - 1, y, s.color, 1);
      dot(ctx, x + 1, y, s.light, 1);
      break;
    case 'ember': {
      const hot = noise(p.id, s.frame) > 0;
      rect(ctx, x, y, size, size, hot ? s.light : s.color);
      break;
    }
    case 'pebble':
      rect(ctx, x, y, size, size, s.color);
      dot(ctx, x, y, s.light, 1);
      break;
    default:
      rect(ctx, x, y, size, size, s.color);
  }
}

export function drawParticles(ctx, list, T) {
  for (const p of list) {
    const s = sample(p, T);
    if (s) drawParticle(ctx, p, s);
  }
}
