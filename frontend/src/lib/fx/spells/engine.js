// Motor de animacao do grimorio. Transforma (magia + resultado + semente) num efeito
// com a mesma "cara" dos efeitos de familia (effect.js): T = { windup, action,
// impactAt, hitstop, impact, total }, phase, seed, result, down. Assim o player e o
// FxLayer tocam magias do grimorio sem mudar nada no Board.
//
// Linha do tempo:  conjuracao (cast) -> viagem (travel) -> impacto (hit) -> fim
// Cada passo da receita roda numa janela dessa linha do tempo (ver windowOf).
import { makeRng } from '../rng.js';
import { ELEMENTS, elementKey } from '../elements.js';
import { normalizeResult } from '../effect.js';
import { clamp01, ease, disc, setAlpha } from '../draw.js';
import { noise } from '../rng.js';
import { getSpell } from './catalog.js';
import { recipeFor, parseRecipe } from './recipes.js';
import { PRIMS } from './prims.js';
import { paletteFor, SCHOOL_PALETTE, SPELL_PALETTES } from './palettes.js';

// Por nivel (1 basica .. 4 lendaria).
const CAST_MS = [0, 280, 400, 540, 760];
const IMPACT_MS = [0, 620, 880, 1180, 1700];
const SHAKE = [0, 0.5, 1, 1.6, 2.6];
const HITSTOP = 60;
const CRIT_HITSTOP = 100;

const SELF_TARGETS = ['si', 'gru'];
const SOFT_TARGETS = ['si', 'gru', 'ali', 'obj', 'cad'];

function resolveSpell(spell) {
  if (!spell) return null;
  if (typeof spell === 'string') return getSpell(spell);
  return spell.id ? (getSpell(spell.id) || spell) : null;
}

export function createSpellEffect(opts = {}) {
  const spell = resolveSpell(opts.spell);
  if (!spell) return null;
  const unit = opts.unit || 4;
  const cellPx = opts.cell || unit * 16;
  const C = cellPx / unit;
  const recipe = parseRecipe(opts.recipe || recipeFor(spell));
  const over = opts.element ? elementKey(opts.element) : null;
  const locked = Boolean(over && over !== 'fisico');
  const elKey = locked ? over : (elementKey(spell.element) || 'caos');
  const el = ELEMENTS[elKey] || ELEMENTS.caos;
  const pal = locked
    ? el.ramp
    : (paletteFor(recipe.pal) || paletteFor(SCHOOL_PALETTE[spell.school]) || el.ramp);
  const { result: r0, down: downFromResult } = normalizeResult(opts.result);
  const tier = Math.min(4, Math.max(1, spell.tier || 1));

  const move = recipe.flags.move;
  const self = !move && SELF_TARGETS.includes(spell.targetKind);
  const harm = !recipe.flags.calm && !move && !SOFT_TARGETS.includes(spell.targetKind);
  // Errar so faz sentido para magia que ataca; em cura/bencao vira acerto.
  const result = !harm && r0 === 'miss' ? 'hit' : r0;
  const down = harm && Boolean(opts.down || downFromResult);
  const seed = String(opts.seed ?? `${spell.id}-${result}`);

  const from = { x: (opts.from?.x ?? 0) / unit, y: (opts.from?.y ?? 0) / unit };
  let to = { x: (opts.to?.x ?? opts.from?.x ?? 0) / unit, y: (opts.to?.y ?? opts.from?.y ?? 0) / unit };
  if (self) to = { ...from };
  let dx = to.x - from.x;
  let dy = to.y - from.y;
  let dist = Math.hypot(dx, dy);
  // Sem alvo (pessoal): a "direcao" e para a direita, como no palco.
  const towards = opts.to ? { x: opts.to.x / unit - from.x, y: opts.to.y / unit - from.y } : { x: 1, y: 0 };
  if (dist < 0.001) { dx = towards.x || 1; dy = towards.y || 0; }
  const L = Math.hypot(dx, dy) || 1;
  const dir = { x: dx / L, y: dy / L };
  const perp = { x: -dir.y, y: dir.x };
  if (dist < 0.001) dist = 0;

  const rngAim = makeRng(seed, 'aim');
  const missSide = rngAim.sign();
  let hit = { ...to };
  if (result === 'miss') {
    hit = { x: to.x + perp.x * missSide * C * 0.8 + dir.x * C * 0.6, y: to.y + perp.y * missSide * C * 0.8 + dir.y * C * 0.6 + C * 0.25 };
  }

  // Passos efetivos conforme o resultado.
  let steps = recipe.steps.map((s) => ({ ...s, o: { ...s.o } }));
  if (result === 'fumble') {
    steps = steps.filter((s) => phaseOf(s) === 'cast');
    steps.push({ prim: 'backfire', o: {} });
  } else {
    if (result === 'crit') steps.push({ prim: 'critspark', o: { at: self ? 'c' : 't' } });
    if (tier === 4 && !steps.some((s) => s.prim === 'tint')) steps.push({ prim: 'tint', o: { a: 0.22 } });
  }

  const hasTravel = steps.some((s) => phaseOf(s) === 'travel');
  const hasSpan = steps.some((s) => phaseOf(s) === 'span');
  const crit = result === 'crit';
  let windup = Math.round(CAST_MS[tier] * (crit ? 1.1 : 1));
  let action;
  if (hasTravel) action = Math.round(Math.min(680, Math.max(220, ((dist / C) / (recipe.speed || 9)) * 1000)));
  else if (hasSpan) action = 200;
  else action = 90;
  if (result === 'fumble') action = 60;
  // Quedas do ceu (meteoro, chuva) comecam antes do impacto: garante tempo.
  const pre = Math.max(0, ...steps.filter((s) => phaseOf(s) === 'hit').map((s) => s.o.pre ?? PRIMS[s.prim]?.pre ?? 0));
  if (windup + action < pre + 80) windup = pre + 80 - action;
  const lands = result === 'hit' || result === 'crit';
  const hitstop = harm && lands ? (crit ? CRIT_HITSTOP : HITSTOP) : 0;
  let impact = IMPACT_MS[tier] + (crit ? 200 : 0);
  if (result === 'fumble') impact = 900;
  if (result === 'miss') impact = Math.round(impact * 0.8);
  const impactAt = windup + action;
  const T = opts.reduced
    ? { windup: 0, action: 0, impactAt: 0, hitstop: 0, impact: 240, total: 240 }
    : { windup, action, impactAt, hitstop, impact, total: impactAt + hitstop + impact };

  const school = spell.school;
  const eff = {
    id: opts.id ?? null,
    isSpell: true,
    spell,
    recipe,
    seed,
    family: { id: 'grimorio', label: spell.name, group: 'magia', impact: 'spell' },
    cls: { family: 'grimorio', element: el.name, spell: spell.id, label: spell.name },
    elKey,
    el,
    shape: el.shape,
    motion: el.motion,
    pal,
    trail: pal,
    locked,
    school,
    tier,
    result,
    down,
    harm,
    self,
    move,
    from,
    to,
    hit,
    dir,
    perp,
    side: dir.x >= 0 ? 1 : -1,
    missSide,
    dist,
    C,
    unit,
    sc: crit ? 1.3 : result === 'miss' ? 0.85 : 1,
    scale: crit ? 1.3 : 1,
    T,
    reduced: Boolean(opts.reduced),
    phase: opts.phase || 'full',
    ground: hit.y + C * 0.42,
    fromGround: from.y + C * 0.42,
    steps
  };
  eff.windows = steps.map((s) => windowOf(eff, s));
  return eff;
}

export function phaseOf(step) {
  return step.o.ph || PRIMS[step.prim]?.ph || 'hit';
}

// Janela [a, b] de um passo, em ms do relogio da animacao (sem o hit-stop).
export function windowOf(e, step) {
  const { windup, impactAt, impact } = e.T;
  const o = step.o;
  const ph = phaseOf(step);
  const d = o.d ?? 0;
  if (ph === 'cast') {
    const end = e.result === 'fumble' ? windup : windup + 60;
    return [d * windup, o.len != null ? d * windup + o.len * windup : end];
  }
  if (ph === 'travel') return [e.T.windup, impactAt];
  if (ph === 'span') {
    const hold = o.hold ?? PRIMS[step.prim]?.hold ?? 0.45;
    return [windup, impactAt + impact * hold];
  }
  if (ph === 'all') return [0, impactAt + impact];
  // hit
  const pre = o.pre ?? PRIMS[step.prim]?.pre ?? 0;
  const a = impactAt + d * impact - pre;
  const dur = o.ms ?? impact * (o.len ?? (1 - d));
  return [a, a + pre + dur];
}

// Ponto de ancora de um passo (px de efeito).
export function anchor(e, at) {
  switch (at) {
    case 'c': return { x: e.from.x, y: e.from.y, g: e.fromGround };
    case 'h': return { x: e.from.x + e.dir.x * e.C * 0.35, y: e.from.y - e.C * 0.12, g: e.fromGround };
    case 'n': return { x: e.hit.x - e.dir.x * e.C * 1.0, y: e.hit.y - e.dir.y * e.C * 1.0, g: e.ground - e.dir.y * e.C };
    case 'b': return { x: e.from.x - e.dir.x * e.C * 0.9, y: e.from.y - e.dir.y * e.C * 0.9, g: e.fromGround - e.dir.y * e.C * 0.9 };
    case 'm': return { x: (e.from.x + e.hit.x) / 2, y: (e.from.y + e.hit.y) / 2, g: (e.fromGround + e.ground) / 2 };
    default: return { x: e.hit.x, y: e.hit.y, g: e.ground };
  }
}

export function animTime(e, t) {
  const { impactAt, hitstop } = e.T;
  if (t < impactAt) return t;
  if (t < impactAt + hitstop) return impactAt;
  return t - hitstop;
}

export function spellSpan(e) {
  const { impactAt, total } = e.T;
  if (e.phase === 'attack') return { start: 0, end: impactAt + 30 };
  if (e.phase === 'impact') return { start: impactAt, end: total };
  return { start: 0, end: total };
}

export function spellPhaseAt(e, t) {
  const { windup, impactAt, hitstop, impact, total } = e.T;
  if (t >= total) return 'fim';
  if (t < windup) return 'antecipacao';
  if (t < impactAt) return 'acao';
  if (t < impactAt + hitstop + impact * 0.55) return 'impacto';
  return 'recuperacao';
}

// ------------------------------------------------------------------ corpos
export function spellBodies(e, t) {
  const att = { x: 0, y: 0, flash: 0, alpha: 1 };
  const tgt = { x: 0, y: 0, flash: 0, alpha: 1 };
  const { C, dir, T, result } = e;
  if (e.reduced) {
    const who = e.self ? att : tgt;
    who.flash = t < 120 ? 0.5 * (1 - t / 120) : 0;
    return pack(e, att, tgt);
  }
  const A = animTime(e, t);
  // pose de conjuracao: sobe um pixel e balanca
  if (A < T.windup && result !== 'fumble') att.y -= Math.round(Math.sin((A / T.windup) * Math.PI) * C * 0.06);
  let freeze = false;
  e.steps.forEach((s, i) => {
    if (s.prim !== 'body') return;
    const [a, b] = e.windows[i];
    const kind = s.o.kind || 'push';
    const who = s.o.who === 'c' || ['lunge', 'blink', 'hop'].includes(kind) && s.o.who !== 't' ? att : tgt;
    const u = clamp01((A - a) / Math.max(1, b - a));
    const started = A >= a;
    const inside = A >= a && A <= b;
    switch (kind) {
      case 'freeze': if (inside || A > b) freeze = true; break;
      case 'lunge': {
        const reach = Math.max(0, e.dist - C * 0.9);
        let k = 0;
        if (inside) k = ease.out(u);
        else if (A > b) k = 1 - ease.inOut(clamp01((A - b) / 280));
        who.x += dir.x * reach * k;
        who.y += dir.y * reach * k;
        break;
      }
      case 'blink': case 'hop': {
        if (!started) break;
        const dest = anchor(e, 'n');
        const k = kind === 'hop' ? ease.inOut(u) : 1;
        who.x += (dest.x - e.from.x) * k;
        who.y += (dest.y - e.from.y) * k - (kind === 'hop' ? Math.sin(Math.PI * u) * C * 1.2 : 0);
        break;
      }
      case 'swap': {
        if (!started) break;
        const k = ease.inOut(u);
        const lift = Math.sin(Math.PI * u) * C * 0.6;
        att.x += (e.to.x - e.from.x) * k; att.y += (e.to.y - e.from.y) * k - lift;
        tgt.x += (e.from.x - e.to.x) * k; tgt.y += (e.from.y - e.to.y) * k - lift;
        break;
      }
      case 'vanish': {
        if (!inside) break;
        const fa = Math.min(clamp01(u / 0.15), clamp01((1 - u) / 0.15));
        who.alpha = Math.min(who.alpha, 1 - fa);
        if (u > 0.98) who.alpha = 1;
        break;
      }
      case 'lift': if (inside) who.y -= C * 0.45 * Math.sin(Math.PI * u) * (u < 0.5 ? 1 : 1); break;
      case 'sink': if (inside || A > b) who.y += C * 0.12 * ease.out(clamp01(u * 2)) * (A > b ? 0 : 1); break;
      case 'tremble': if (inside) who.x += Math.round(noise(i, Math.floor(A / 33), 5) * 1.4); break;
      case 'push': case 'pull': {
        if (!inside) break;
        const sgn = kind === 'pull' ? -1 : 1;
        const k = ease.out(clamp01(u * 3)) * (1 - ease.in(clamp01((u - 0.55) / 0.45)));
        who.x += dir.x * C * 0.6 * k * sgn;
        who.y += dir.y * C * 0.6 * k * sgn;
        break;
      }
      default: break;
    }
  });
  const rt = A - T.impactAt;
  if (result === 'fumble' && rt >= 0) {
    const k = clamp01(rt / 500);
    att.x += Math.sin(k * 18) * C * 0.06 * (1 - k);
    att.y += C * 0.1 * Math.sin(Math.min(1, k * 2) * Math.PI * 0.5) * (1 - k * 0.6);
    att.flash = rt < 90 ? 0.6 : 0;
  }
  if (e.harm && (result === 'hit' || result === 'crit')) {
    const rr = t - T.impactAt;
    if (rr >= 0) {
      tgt.flash = Math.max(tgt.flash, rr < T.hitstop + 50 ? 1 : 0);
      if (!freeze) {
        const k = clamp01((rr - T.hitstop) / 260);
        const push = C * 0.14 * e.sc * (rr < T.hitstop ? 0.4 : Math.sin(Math.PI * Math.min(1, k * 1.2)) * (1 - k));
        tgt.x += dir.x * push;
        tgt.y += dir.y * push;
      }
    }
    if (e.down && rt > 140) {
      const k = ease.out(clamp01((rt - 140) / 300));
      tgt.y += C * 0.14 * k;
      tgt.x += dir.x * C * 0.08 * k;
    }
  } else if (!e.harm && (result === 'hit' || result === 'crit') && rt >= 0 && rt < 200) {
    const who = e.self ? att : tgt;
    who.flash = Math.max(who.flash, 0.4 * (1 - rt / 200));
  } else if (result === 'miss' && e.harm) {
    const k0 = clamp01((A - (T.impactAt - 200)) / 200);
    const k1 = clamp01((A - T.impactAt - 140) / 260);
    const d = C * 0.22 * ease.out(k0) * (1 - ease.inOut(k1));
    tgt.x -= e.perp.x * e.missSide * d;
    tgt.y -= e.perp.y * e.missSide * d;
  }
  return pack(e, att, tgt);
}

function pack(e, att, tgt) {
  const s = (v) => Math.round(v) * e.unit;
  return {
    attacker: { x: s(att.x), y: s(att.y), flash: att.flash, alpha: att.alpha },
    target: { x: s(tgt.x), y: s(tgt.y), flash: tgt.flash, alpha: tgt.alpha }
  };
}

// Tremor de tela: nivel da magia + passos "shake".
export function spellShake(e, t) {
  if (e.reduced) return { x: 0, y: 0 };
  const A = animTime(e, t);
  let amp = 0;
  const lands = e.result === 'hit' || e.result === 'crit';
  if (e.harm && lands) {
    const rt = t - e.T.impactAt;
    const dur = 200 + e.tier * 100;
    if (rt >= 0 && rt < dur) amp = SHAKE[e.tier] * (e.result === 'crit' ? 2 : 1) * (e.down ? 1.3 : 1) * (1 - rt / dur);
  }
  if (e.result !== 'fumble') {
    e.steps.forEach((s, i) => {
      if (s.prim !== 'shake') return;
      const [a, b] = e.windows[i];
      const end = Math.min(b, a + (s.o.ms ?? 700));
      if (A >= a && A <= end) amp = Math.max(amp, (s.o.a ?? 2) * (1 - (A - a) / Math.max(1, end - a)) * (e.result === 'miss' ? 0.4 : 1));
    });
  }
  if (!amp) return { x: 0, y: 0 };
  const ph = (e.seed.length % 7) * 0.7;
  return {
    x: Math.round(Math.sin(t * 0.11 + ph) * amp) * e.unit,
    y: Math.round(Math.cos(t * 0.083 + ph) * amp * 0.6) * e.unit
  };
}

// ------------------------------------------------------------------ desenho
export function renderSpell(ctx, e, t) {
  const frame = { phase: spellPhaseAt(e, t), shake: spellShake(e, t), ...spellBodies(e, t), done: t >= e.T.total };
  if (frame.done) return frame;
  setAlpha(ctx, 1);
  if (e.reduced) {
    const k = clamp01(t / e.T.total);
    const p = e.self ? e.from : e.hit;
    setAlpha(ctx, 1 - k);
    disc(ctx, p.x, p.y, e.C * 0.45, e.pal[3]);
    disc(ctx, p.x, p.y, e.C * 0.25, '#ffffff');
    setAlpha(ctx, 1);
    return frame;
  }
  const { impactAt } = e.T;
  if (e.phase === 'attack' && t >= impactAt) return frame;
  if (e.phase === 'impact' && t < impactAt) return frame;
  const A = animTime(e, t);
  const f = Math.floor(A / 40);
  for (let i = 0; i < e.steps.length; i++) {
    const s = e.steps[i];
    const spec = PRIMS[s.prim];
    if (!spec) continue;
    const [a, b] = e.windows[i];
    if (A < a || A > b) continue;
    const at = s.o.at || spec.at || (phaseOf(s) === 'cast' ? 'c' : 't');
    const P = anchor(e, at);
    const pal = e.locked ? e.pal : (paletteFor(s.o.p) || e.pal);
    const k = {
      i,
      age: A - a,
      dur: Math.max(1, b - a),
      u: clamp01((A - a) / Math.max(1, b - a)),
      T: A,
      f,
      R: makeRng(e.seed, `s${i}-${s.prim}`),
      P,
      G: P.g,
      pal,
      sc: e.sc,
      pre: s.o.pre ?? spec.pre ?? 0
    };
    spec.draw(ctx, e, s.o, k);
    setAlpha(ctx, 1);
  }
  return frame;
}

export { SPELL_PALETTES };
