// Montagem de um efeito: familia + elemento + resultado viram uma linha do tempo
// com quatro fases e uma lista de particulas pre-sorteadas.
//
//   antecipacao -> acao (rastro) -> impacto (hit-stop, flash, particulas, tremor) -> recuperacao
//
// Tudo e funcao pura de (opcoes, tempo): createEffect sorteia uma vez a partir da
// semente (rollId) e o resto so le. Coordenadas internas em "pixels de efeito"
// (unit = px do mapa por pixel de efeito; no mapa de tiles, celula/16).
import { classify, elementOf } from './classify.js';
import { getFamily } from './families.js';
import { ELEMENTS, PALETTES } from './elements.js';
import { makeRng } from './rng.js';
import { burst } from './particles.js';
import { clamp01, ease } from './draw.js';
import { resolveSpec, pickMove } from './weapons/select.js';
import { prepareMove, spawnMove, moveBodies, moveShake } from './weapons/move.js';
import { elementKey } from './elements.js';

const RESULTS = ['hit', 'crit', 'miss', 'fumble'];

export const HITSTOP_MS = 60;
export const CRIT_HITSTOP_MS = 100;

const IMPACT_MS = { heal: 760, terrain: 820, bind: 820, curse: 820, blast: 700, arrive: 520, claw: 520, poison: 640 };

export function normalizeResult(result) {
  const r = String(result || 'hit').toLowerCase();
  if (r === 'downed' || r === 'down' || r === 'caido') return { result: 'hit', down: true };
  if (r === 'heal' || r === 'cura') return { result: 'hit', down: false };
  if (r === 'critical' || r === 'critico') return { result: 'crit', down: false };
  if (r === 'falha') return { result: 'fumble', down: false };
  if (r === 'erro' || r === 'errou') return { result: 'miss', down: false };
  return { result: RESULTS.includes(r) ? r : 'hit', down: false };
}

// Duracoes da linha do tempo (ms). Exportada para testes e para o sync.
export function buildTimeline(family, { result, dist, cell, reduced }) {
  if (reduced) return { windup: 0, action: 0, impactAt: 0, hitstop: 0, impact: 220, total: 220 };
  const crit = result === 'crit';
  const windup = Math.round(family.windup * (crit ? 1.15 : 1));
  let action;
  if (family.speed) {
    const cells = dist / cell;
    action = Math.round(Math.min(560, Math.max(family.action === 'lob' ? 320 : 150, (cells / family.speed) * 1000)));
  } else action = family.actionMs || 120;
  if (result === 'fumble') action = Math.round(action * 0.6);
  const lands = result === 'hit' || result === 'crit';
  const hitstop = family.hitstop && lands ? (crit ? CRIT_HITSTOP_MS : HITSTOP_MS) : 0;
  let impact = IMPACT_MS[family.impact] || 460;
  if (crit) impact += 160;
  if (result === 'fumble') impact = 820;
  if (result === 'miss') impact = 480;
  const impactAt = windup + action;
  return { windup, action, impactAt, hitstop, impact, total: impactAt + hitstop + impact };
}

export function createEffect(opts = {}) {
  const unit = opts.unit || 4;
  const cellPx = opts.cell || unit * 16;
  const C = cellPx / unit;
  const cls = opts.family || opts.kind
    ? { family: opts.family || opts.kind, element: opts.element ?? null }
    : classify(opts.power || {}, { monster: opts.monster });
  const family = getFamily(cls.family);
  const elKeyRaw = opts.element !== undefined && opts.element !== null ? opts.element : cls.element;
  let elKey = elementOf({ element: elKeyRaw });
  if (elKey === 'fisico' && family.defaultElement && (family.group === 'monstro')) elKey = family.defaultElement;
  const el = ELEMENTS[elKey];
  const { result, down: downFromResult } = normalizeResult(opts.result);
  const down = Boolean(opts.down || downFromResult);
  const seed = opts.seed ?? `${family.id}-${elKey}-${result}`;

  const from = { x: (opts.from?.x ?? 0) / unit, y: (opts.from?.y ?? 0) / unit };
  const to = { x: (opts.to?.x ?? opts.from?.x ?? 0) / unit, y: (opts.to?.y ?? opts.from?.y ?? 0) / unit };
  let dx = to.x - from.x;
  let dy = to.y - from.y;
  let dist = Math.hypot(dx, dy);
  if (dist < 0.001) { dx = 1; dy = 0; dist = 0; }
  const dir = { x: dx / (dist || 1), y: dy / (dist || 1) };
  const perp = { x: -dir.y, y: dir.x };
  const side = dir.x >= 0 ? 1 : -1;
  const scale = result === 'crit' ? 1.35 : 1;

  // Golpe de arma (catalogo em weapons/): por campo explicito, pela classificacao
  // do poder ou, sem golpe nomeado, sorteado pela semente entre os golpes da arma.
  let spec = null;
  if (!opts.reduced && opts.moves !== false) {
    const src = opts.move || opts.weapon || opts.weaponFamily
      ? { weaponFamily: opts.weaponFamily, weapon: opts.weapon, move: opts.move }
      : cls.weaponFamily ? { weaponFamily: cls.weaponFamily, weapon: cls.weapon, move: cls.move } : null;
    if (src) {
      spec = resolveSpec(src);
      if (spec && !spec.move) spec.move = pickMove(spec.list, seed, { cells: dist / C, ranged: spec.fam.ranged });
      if (!spec?.move) spec = null;
    }
  }
  if (spec && elKey === 'fisico' && spec.move.el) elKey = elementKey(spec.move.el) || 'fisico';
  const el2 = ELEMENTS[elKey];

  // Trilha: elemento se houver; senao paleta da familia (fera, veneno) ou aco.
  const trail = elKey !== 'fisico' ? el2.ramp : PALETTES[family.palette] || ELEMENTS.fisico.ramp;

  const rngAim = makeRng(seed, 'aim');
  // Onde a acao termina: no alvo, ao lado (erro) ou perto do proprio atacante (falha).
  let hit = { ...to };
  const missSide = rngAim.sign();
  if (result === 'miss') {
    const projectile = Boolean(family.speed);
    hit = {
      x: to.x + perp.x * missSide * C * 0.7 + dir.x * C * (projectile ? 0.8 : 0.2),
      y: to.y + perp.y * missSide * C * 0.7 + dir.y * C * (projectile ? 0.8 : 0.2) + (projectile ? C * 0.3 : 0)
    };
  } else if (result === 'fumble') {
    hit = { x: from.x + dir.x * C * 0.7, y: from.y + C * 0.3 };
  }

  let T = buildTimeline(family, { result, dist, cell: C, reduced: opts.reduced });
  const fam = spec
    ? { ...family, action: 'weapon', impact: spec.move.impact || spec.weapon?.impact || spec.fam.impact || family.impact, shake: spec.move.shake ?? spec.fam.shake ?? 1, hitstop: true, lunge: 0 }
    : family;
  const eff = {
    id: opts.id ?? null,
    seed: String(seed),
    family: fam,
    cls: spec ? { ...cls, family: family.id, weaponFamily: spec.fam.id, weapon: spec.weapon?.id || null, move: spec.move.id } : { ...cls, family: family.id },
    elKey,
    el: el2,
    trail,
    result,
    down,
    from,
    to,
    hit,
    dir,
    perp,
    side,
    missSide,
    dist,
    C,
    unit,
    scale,
    T,
    reduced: Boolean(opts.reduced),
    phase: opts.phase || 'full',
    ground: to.y + C * 0.42,
    fromGround: from.y + C * 0.42,
    particles: [],
    action: [],
    mv: null,
    linked: Boolean(opts.linked)
  };
  if (spec) {
    eff.mv = prepareMove(eff, spec);
    T = eff.mv.T;
    eff.T = T;
  }
  if (!eff.reduced) {
    spawn(eff);
    if (eff.mv) spawnMove(eff);
  }
  return eff;
}

// Relogio da animacao: congela durante o hit-stop.
export function animTime(eff, t) {
  const { impactAt, hitstop } = eff.T;
  if (t < impactAt) return t;
  if (t < impactAt + hitstop) return impactAt;
  return t - hitstop;
}

// Faixa de tempo que este efeito toca de fato, conforme a fase pedida.
export function span(eff) {
  const { impactAt, total } = eff.T;
  if (eff.phase === 'attack') return { start: 0, end: impactAt + (eff.mv ? eff.T.hitstop + eff.mv.follow + eff.mv.recover : 30) };
  if (eff.phase === 'impact') return { start: impactAt, end: total };
  return { start: 0, end: total };
}

export function phaseAt(eff, t) {
  const { windup, impactAt, hitstop, impact, total } = eff.T;
  if (t >= total) return 'fim';
  if (t < windup) return 'antecipacao';
  if (t < impactAt) return 'acao';
  if (t < impactAt + hitstop + impact * 0.55) return 'impacto';
  return 'recuperacao';
}

// Deslocamento dos corpos (atacante e alvo) e "flash" branco do alvo, em px do mapa.
// O Board pode aplicar isso como transform no token; a galeria usa direto.
export function bodies(eff, t) {
  const { C, dir, perp, unit, T, result, family } = eff;
  const att = { x: 0, y: 0, flash: 0 };
  const tgt = { x: 0, y: 0, flash: 0 };
  if (eff.reduced) {
    tgt.flash = t < 120 ? 1 - t / 120 : 0;
    return { attacker: att, target: tgt };
  }
  const reach = Math.max(0, Math.min(family.lunge * C, eff.dist - C * 0.75));
  const back = family.lunge >= 0 ? C * 0.12 : 0;
  if (eff.phase !== 'impact') {
    let off = 0;
    let lift = 0;
    if (t < T.windup) {
      const k = ease.out(clamp01(t / T.windup));
      off = -back * k;
      if (family.action === 'heavy' || family.action === 'smash') lift = -C * 0.1 * k;
    } else if (t < T.impactAt + T.hitstop) {
      const k = ease.outCubic(clamp01((t - T.windup) / Math.max(1, T.action)));
      off = -back + (reach + back) * k;
      if (family.lunge < 0) off = family.lunge * C * k; // recuo do arco/besta
    } else {
      const k = clamp01((t - T.impactAt - T.hitstop) / 240);
      const base = family.lunge < 0 ? family.lunge * C : reach;
      off = base * (1 - ease.out(k));
    }
    att.x = dir.x * off;
    att.y = dir.y * off + lift;
    if (result === 'fumble' && t >= T.impactAt) {
      // Tropeco comico: cai um pouco pra frente e balanca.
      const k = clamp01((t - T.impactAt) / 500);
      att.x = dir.x * reach * (1 - k * 0.5) + Math.sin(k * 18) * C * 0.06 * (1 - k);
      att.y = C * 0.12 * Math.sin(Math.min(1, k * 2) * Math.PI * 0.5) * (1 - k * 0.6);
    }
  }
  const rt = t - T.impactAt;
  if (result === 'hit' || result === 'crit') {
    if (rt >= 0 && family.impact !== 'heal' && family.impact !== 'arrive') {
      tgt.flash = rt < T.hitstop + 50 ? 1 : 0;
      const k = clamp01((rt - T.hitstop) / 260);
      const push = C * 0.16 * eff.scale * (rt < T.hitstop ? 0.4 : Math.sin(Math.PI * Math.min(1, k * 1.2)) * (1 - k));
      tgt.x = dir.x * push;
      tgt.y = dir.y * push;
    } else if (rt >= 0) {
      tgt.flash = rt < 160 ? 0.4 * (1 - rt / 160) : 0; // cura/chegada: brilho suave, nao o branco de dano
    }
    if (eff.down && rt > 120) {
      const k = ease.out(clamp01((rt - 120) / 260));
      tgt.y += C * 0.14 * k;
      tgt.x += dir.x * C * 0.08 * k;
    }
  } else if (result === 'miss') {
    // Esquiva: o alvo desvia para o lado oposto ao golpe e volta.
    const k0 = clamp01((t - (T.impactAt - T.action * 0.6)) / (T.action * 0.6 + 1));
    const k1 = clamp01((t - T.impactAt - 120) / 260);
    const d = C * 0.22 * ease.out(k0) * (1 - ease.inOut(k1));
    tgt.x = -perp.x * eff.missSide * d;
    tgt.y = -perp.y * eff.missSide * d;
  }
  if (eff.mv) moveBodies(eff, t, att, tgt);
  const s = (v) => Math.round(v) * unit; // passo de pixel inteiro: nada de meio pixel
  return {
    attacker: { x: s(att.x), y: s(att.y), flash: att.flash },
    target: { x: s(tgt.x), y: s(tgt.y), flash: tgt.flash }
  };
}

// Tremor de tela (px do mapa). Pequeno e curto; zero em erro/falha/cura.
export function shakeAt(eff, t) {
  const { family, T, result, unit } = eff;
  if (eff.reduced || !(result === 'hit' || result === 'crit')) return { x: 0, y: 0 };
  if (eff.mv) { const ms = moveShake(eff, t); if (ms) return ms; }
  const amp = family.shake * (result === 'crit' ? 2 : 1) * (eff.down ? 1.3 : 1);
  if (!amp) return { x: 0, y: 0 };
  const rt = t - T.impactAt;
  if (rt < 0 || rt > 240) return { x: 0, y: 0 };
  const decay = 1 - rt / 240;
  const ph = (eff.seed.length % 7) * 0.7;
  return {
    x: Math.round(Math.sin(rt * 0.11 + ph) * amp * decay) * unit,
    y: Math.round(Math.cos(rt * 0.083 + ph) * amp * decay * 0.6) * unit
  };
}

// ---------------------------------------------------------------- particulas
function spawn(eff) {
  const { family, el, trail, hit, from, dir, C, T, result, scale } = eff;
  const P = eff.particles;
  const A = eff.action;
  const rng = makeRng(eff.seed, 'impact');
  const rngA = makeRng(eff.seed, 'action');
  const elPal = trail;
  const shape = eff.elKey === 'fisico' ? 'spark' : el.shape;
  const motion = eff.elKey === 'fisico' ? 'none' : el.motion;
  const t0 = T.impactAt;
  const baseAng = Math.atan2(dir.y, dir.x);
  const lands = result === 'hit' || result === 'crit';
  const gy = eff.ground;

  // Acao: rastros que soltam particulas (orbe, sopro, investida, maldicao, terreno).
  const act = family.action;
  if (act === 'weapon') { /* golpe de arma: particulas da acao em spawnMove */ }
  if (act === 'orb' || act === 'lob' || act === 'wisp') {
    const n = Math.round(10 + T.action / 18);
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const pos = pathPoint(eff, u);
      burst(rngA, A, { x: pos.x, y: pos.y, t0: T.windup + u * T.action, n: 1, speed: [6, 22], spread: Math.PI, life: [160, 320], size: [1, 2], pal: elPal, shape: act === 'wisp' ? 'smoke' : el.shape === 'spark' ? 'square' : el.shape, motion: motion === 'none' ? 'drift' : motion, drag: 2 });
    }
  }
  if (act === 'breath') {
    const sp = Math.max(40, (eff.dist / Math.max(1, T.action * 0.75)) * 1000);
    const mouth = { x: from.x + dir.x * C * 0.45, y: from.y + dir.y * C * 0.45 - C * 0.1 };
    const n = Math.round(T.action / 7);
    for (let i = 0; i < n; i++) {
      burst(rngA, A, { x: mouth.x, y: mouth.y, t0: T.windup + (i / n) * T.action * 0.85, n: 1, angle: baseAng, spread: 0.28, speed: [sp * 0.7, sp * 1.05], drag: 0.6, life: [260, 420], size: [2, 3], pal: elPal, shape: eff.elKey === 'fisico' ? 'square' : (el.shape === 'ring' ? 'square' : el.shape), motion: motion === 'none' ? 'jitter' : motion });
    }
  }
  if (act === 'dash') {
    for (let i = 0; i < 6; i++) {
      const u = i / 6;
      burst(rngA, A, { x: from.x + (hit.x - from.x) * u * 0.8, y: eff.fromGround + (gy - eff.fromGround) * u, t0: T.windup + u * T.action, n: 2, angle: -Math.PI / 2 - Math.sign(dir.x || 1) * 0.6, spread: 0.7, speed: [10, 26], g: 20, drag: 3, life: [260, 420], size: [2, 3], pal: PALETTES.dust, shape: 'puff' });
    }
  }
  if (act === 'ripple') {
    for (let i = 0; i < 7; i++) {
      const u = (i + 0.5) / 7;
      burst(rngA, A, { x: from.x + (hit.x - from.x) * u, y: eff.fromGround + (gy - eff.fromGround) * u, t0: T.windup + u * T.action, n: 2, angle: -Math.PI / 2, spread: 0.8, speed: [20, 40], g: 160, drag: 1, life: [200, 320], size: [1, 2], pal: eff.elKey === 'gaia' ? PALETTES.dust : elPal, shape: 'pebble' });
    }
  }
  if (act === 'blink' || (family.group === 'magia' && act !== 'rise')) {
    // Antecipacao de magia: fagulhas convergindo para a mao do conjurador.
    for (let i = 0; i < 10; i++) {
      const a = rngA.range(0, Math.PI * 2);
      const r = rngA.range(C * 0.5, C * 0.9);
      const life = rngA.range(T.windup * 0.6, T.windup * 0.95);
      A.push({ t0: T.windup - life, x: from.x + Math.cos(a) * r, y: from.y + Math.sin(a) * r - C * 0.1, vx: -Math.cos(a) * r * (1000 / life), vy: -Math.sin(a) * r * (1000 / life), g: 0, drag: 0, life, size: 1, pal: elPal, shape: 'square', motion: 'none', ph: 0, floor: null, cx: from.x, cy: from.y, fade: false, id: 500 + i });
    }
  }
  if (act === 'rise') {
    for (let i = 0; i < 8; i++) {
      burst(rngA, A, { x: from.x, y: from.y, radius: C * 0.4, ry: 0.5, t0: rngA.range(0, T.windup + T.action * 0.5), n: 1, angle: -Math.PI / 2, spread: 0.3, speed: [16, 30], drag: 1, life: [300, 520], size: [1, 1], pal: elPal, shape: 'cross', motion: 'radiate' });
    }
  }

  // Impacto.
  if (result === 'fumble') {
    const feet = { x: from.x + dir.x * C * 0.3, y: eff.fromGround };
    burst(rng, P, { x: feet.x, y: feet.y, radius: C * 0.35, ry: 0.3, t0, n: 9, angle: -Math.PI / 2, spread: 1.4, speed: [14, 34], g: -8, drag: 3, life: [420, 700], size: [2, 4], pal: PALETTES.puff, shape: 'puff', stagger: 90 });
    return;
  }
  if (result === 'miss') {
    burst(rng, P, { x: hit.x, y: gy + (hit.y - eff.to.y) * 0.3, radius: C * 0.2, t0, n: 6, angle: -Math.PI / 2, spread: 1.3, speed: [12, 30], g: 12, drag: 3, life: [320, 520], size: [2, 3], pal: PALETTES.dust, shape: 'puff', stagger: 60 });
    if (family.group === 'magia' || family.group === 'monstro' && act === 'orb') burst(rng, P, { x: hit.x, y: hit.y, t0, n: 7, speed: [20, 50], life: [160, 300], pal: elPal, shape: shape === 'spark' ? 'square' : shape, motion });
    return;
  }

  const k = scale;
  const imp = family.impact;
  const isMagic = family.group === 'magia' || act === 'breath' || act === 'orb';
  const sparkPal = eff.elKey !== 'fisico' ? elPal : PALETTES.impact;
  switch (imp) {
    case 'cut':
    case 'pierce':
    case 'bite':
    case 'claw': {
      const cone = imp === 'pierce' ? 0.5 : 1.1;
      burst(rng, P, { x: hit.x, y: hit.y, t0, n: 12 * k, angle: baseAng, spread: cone, speed: [50, 120], drag: 5, g: 60, life: [180, 320], size: [1, 1], pal: sparkPal, shape: eff.elKey !== 'fisico' ? el.shape : 'spark', motion: eff.elKey !== 'fisico' ? motion : 'none' });
      if (family.palette === 'beast' || imp === 'bite') burst(rng, P, { x: hit.x, y: hit.y, t0, n: 6 * k, angle: -Math.PI / 2, spread: 1.2, speed: [30, 60], g: 180, drag: 1, life: [260, 420], size: [1, 2], pal: PALETTES.beast, shape: 'square', floor: gy });
      break;
    }
    case 'crush':
    case 'bash': {
      burst(rng, P, { x: hit.x, y: gy, radius: C * 0.3, rx: 1, ry: 0.3, t0, n: 9 * k, angle: -Math.PI / 2, spread: 1.2, speed: [30, 80], g: 260, drag: 0.5, life: [340, 520], size: [1, 2], pal: PALETTES.stone, shape: 'pebble', floor: gy + 1 });
      burst(rng, P, { x: hit.x, y: gy, radius: C * 0.35, rx: 1, ry: 0.25, t0: t0 + 20, n: 8 * k, angle: -Math.PI / 2, spread: 1.5, speed: [14, 34], g: -6, drag: 3, life: [380, 560], size: [2, 3], pal: PALETTES.dust, shape: 'puff' });
      burst(rng, P, { x: hit.x, y: hit.y, t0, n: 8 * k, angle: baseAng, spread: 1.4, speed: [50, 110], drag: 6, life: [140, 240], pal: sparkPal, shape: 'spark' });
      if (imp === 'bash') burst(rng, P, { x: from.x, y: from.y, radius: C * 0.45, t0: t0 + 40, n: 9, angle: -Math.PI / 2, spread: 0.4, speed: [14, 28], drag: 1.5, life: [420, 620], size: [1, 1], pal: ELEMENTS.eter.ramp, shape: 'cross', motion: 'radiate' });
      break;
    }
    case 'pow':
      burst(rng, P, { x: hit.x, y: hit.y, t0, n: 10 * k, angle: baseAng, spread: Math.PI, speed: [60, 120], drag: 7, life: [160, 260], pal: PALETTES.impact, shape: 'spark' });
      break;
    case 'burst':
    case 'arrive':
      burst(rng, P, { x: hit.x, y: hit.y, t0, n: (isMagic ? 22 : 14) * k, angle: 0, spread: Math.PI, speed: [30, 90], drag: 4, g: motion === 'splash' ? 140 : 0, life: [260, 480], size: [1, 2], pal: elPal, shape: shape === 'spark' ? 'square' : shape, motion, floor: motion === 'splash' ? gy : null });
      break;
    case 'blast':
      burst(rng, P, { x: hit.x, y: hit.y, t0, n: 34 * k, angle: 0, spread: Math.PI, speed: [50, 140], drag: 3.5, g: motion === 'splash' ? 120 : 0, life: [320, 620], size: [1, 3], pal: elPal, shape: shape === 'spark' ? 'square' : shape, motion });
      burst(rng, P, { x: hit.x, y: gy, radius: C * 0.8, rx: 1, ry: 0.3, t0: t0 + 60, n: 12, angle: -Math.PI / 2, spread: 0.6, speed: [8, 20], g: -6, drag: 2, life: [420, 640], size: [2, 3], pal: PALETTES.dust, shape: 'puff' });
      break;
    case 'heal':
      burst(rng, P, { x: hit.x, y: gy - 2, radius: C * 0.45, rx: 1, ry: 0.35, t0, n: 18 * k, angle: -Math.PI / 2, spread: 0.25, speed: [22, 44], drag: 1.2, life: [420, 720], size: [1, 1], pal: elPal, shape: 'cross', motion: 'radiate', stagger: 260 });
      burst(rng, P, { x: hit.x, y: hit.y, radius: C * 0.5, t0: t0 + 80, n: 8, angle: -Math.PI / 2, spread: 0.6, speed: [8, 18], drag: 1, life: [500, 700], size: [1, 1], pal: elPal, shape: 'star', motion: 'twinkle', stagger: 200 });
      break;
    case 'terrain':
      burst(rng, P, { x: hit.x, y: gy, radius: C * 0.6, rx: 1, ry: 0.3, t0, n: 12 * k, angle: -Math.PI / 2, spread: 0.9, speed: [30, 70], g: 200, drag: 0.5, life: [300, 460], size: [1, 2], pal: eff.elKey === 'gaia' ? PALETTES.dust : elPal, shape: 'pebble', floor: gy + 1 });
      if (eff.elKey === 'gaia') burst(rng, P, { x: hit.x, y: hit.y - C * 0.2, radius: C * 0.4, t0: t0 + 120, n: 8, angle: -Math.PI / 2, spread: 1.2, speed: [10, 30], g: 30, drag: 2, life: [500, 700], size: [1, 1], pal: elPal, shape: 'leaf', motion: 'flutter' });
      break;
    case 'bind':
      burst(rng, P, { x: hit.x, y: hit.y, t0, n: 10, angle: 0, spread: Math.PI, speed: [20, 50], drag: 4, life: [240, 400], pal: elPal, shape: shape === 'spark' ? 'square' : shape, motion });
      break;
    case 'curse':
      for (let i = 0; i < 14 * k; i++) {
        const a = rng.range(0, Math.PI * 2);
        const r = rng.range(C * 0.6, C * 1.0);
        const life = rng.range(380, 560);
        P.push({ t0: t0 + rng.range(0, 160), x: hit.x + Math.cos(a) * r, y: hit.y + Math.sin(a) * r * 0.7, vx: -Math.cos(a) * r * 2.2, vy: -Math.sin(a) * r * 1.6, g: 0, drag: 2.2, life, size: 1, pal: elPal, shape: 'square', motion: 'orbit', ph: a, floor: null, cx: hit.x, cy: hit.y, fade: true, id: P.length });
      }
      burst(rng, P, { x: hit.x, y: hit.y + C * 0.1, radius: C * 0.35, t0: t0 + 200, n: 7, angle: Math.PI / 2, spread: 0.2, speed: [4, 10], g: 40, drag: 0, life: [400, 600], size: [1, 1], pal: [elPal[0], elPal[1], elPal[2]], shape: 'drop', fade: false, stagger: 200 });
      burst(rng, P, { x: hit.x, y: hit.y, t0, n: 6, angle: -Math.PI / 2, spread: 1, speed: [8, 18], life: [500, 700], size: [2, 3], pal: elPal, shape: 'smoke', motion: 'drift' });
      break;
    case 'poison':
      burst(rng, P, { x: hit.x, y: hit.y, t0, n: 8, angle: baseAng, spread: 0.6, speed: [50, 100], drag: 5, life: [160, 260], pal: PALETTES.impact, shape: 'spark' });
      burst(rng, P, { x: hit.x, y: hit.y, radius: C * 0.35, t0: t0 + 60, n: 9, angle: -Math.PI / 2, spread: 0.4, speed: [8, 20], drag: 0.8, life: [420, 620], size: [1, 2], pal: PALETTES.poison, shape: 'puff', stagger: 220 });
      burst(rng, P, { x: hit.x, y: hit.y, t0: t0 + 40, n: 6, angle: Math.PI / 2, spread: 0.6, speed: [10, 30], g: 120, drag: 0, life: [300, 460], size: [1, 1], pal: PALETTES.poison, shape: 'drop', floor: gy });
      break;
    default:
      break;
  }
  if (result === 'crit') {
    burst(rng, P, { x: hit.x, y: hit.y, t0: t0 + 20, n: 12, angle: 0, spread: Math.PI, speed: [30, 70], drag: 3, g: -10, life: [500, 760], size: [1, 1], pal: PALETTES.gold, shape: 'star', motion: 'twinkle' });
  }
  if (eff.down && lands) {
    for (const s of [-1, 1]) burst(rng, P, { x: hit.x + s * C * 0.2, y: gy, t0: t0 + 160, n: 5, angle: s > 0 ? -0.25 : Math.PI + 0.25, spread: 0.35, speed: [24, 48], g: -4, drag: 3, life: [460, 680], size: [2, 3], pal: PALETTES.dust, shape: 'puff', stagger: 80 });
  }
}

// Caminho de projeteis (u: 0..1). Usado pela trilha de particulas e pelo desenho.
export function pathPoint(eff, u) {
  const { from, hit, dir, C, family } = eff;
  const start = { x: from.x + dir.x * C * 0.4, y: from.y + dir.y * C * 0.4 - C * 0.1 };
  const x = start.x + (hit.x - start.x) * u;
  let y = start.y + (hit.y - start.y) * u;
  const d = Math.hypot(hit.x - start.x, hit.y - start.y);
  let h = 0;
  switch (family.action) {
    case 'arrow': h = Math.min(C * 0.6, d * 0.1); break;
    case 'throw': h = Math.min(C * 1.1, d * 0.22); break;
    case 'stone': h = Math.min(C * 1.4, d * 0.28); break;
    case 'lob': h = Math.min(C * 2.2, d * 0.4 + C * 0.4); break;
    case 'rise': h = Math.min(C * 1.2, d * 0.3 + C * 0.3); break;
    default: h = 0;
  }
  y -= h * 4 * u * (1 - u);
  if (family.action === 'wisp') {
    const w = Math.sin(u * Math.PI * 3) * C * 0.3 * Math.sin(u * Math.PI);
    return { x: x + eff.perp.x * w, y: y + eff.perp.y * w };
  }
  return { x, y };
}
