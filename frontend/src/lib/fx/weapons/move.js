// Motor dos golpes de arma: transforma um golpe do catalogo numa linha do tempo
// (segmentos com instantes absolutos), e responde de forma pura, para qualquer
// instante T do relogio da animacao: onde esta o atacante, onde esta a arma
// (angulo, pegada) e onde esta cada projetil. Nada guarda estado entre quadros,
// entao todos os clientes da mesa veem o mesmo golpe (semente = rollId).
import { weaponLength } from './sprite.js';
import { ease, clamp01, lerp } from '../draw.js';
import { makeRng } from '../rng.js';
import { burst } from '../particles.js';
import { PALETTES, ELEMENTS } from '../elements.js';

const DEG = Math.PI / 180;
const REST = 50; // arma descansando: ponta para baixo e para a frente
export const MOVE_HITSTOP = 0;

export const SPARKS = {
  aco: ['#2c3360', '#5a78c0', '#a8ccf4', '#e8f6ff', '#ffffff'],
  faisca: PALETTES.impact,
  lasca: ['#3a220e', '#6e4220', '#a0682e', '#d09a50', '#f2d8a0'],
  pedra: PALETTES.stone,
  ouro: PALETTES.gold
};

// Rastro fisico: aco com variacao de matiz (sombra roxa, brilho branco-azulado).
export const TRAIL_STEEL = ['#2a2350', '#4b4f9a', '#7f9fe0', '#cfeeff', '#ffffff'];

export const TRAILS = {
  fino: { blade: 0.42, ms: 75 },
  medio: { blade: 0.55, ms: 95 },
  largo: { blade: 0.72, ms: 120 },
  pesado: { blade: 0.88, ms: 150 },
  garra: { blade: 0.35, ms: 80, multi: 3 }
};

const IMPACT_KIND = { cut: 'cut', pierce: 'pierce', crush: 'crush', pow: 'pow', claw: 'claw', bash: 'bash', blast: 'blast' };

// ------------------------------------------------------------ preparacao
export function prepareMove(eff, spec) {
  const { fam, weapon, move } = spec;
  const C = eff.C;
  const held = weapon?.held || 'espada';
  const rope = weapon?.rope || fam.rope ? (weapon?.rope === 'chain' ? 'chain' : 'whip') : null;
  // Corda/corrente: o "comprimento" da arma e o alcance da tira (o giro chega no alvo).
  // Soco (manoplas): durante o golpe o punho vira o sprite grande 'punho' (sprite.js).
  const fist = !rope && held === 'manoplas';
  const len = rope ? (weapon?.reach || fam.reach || 1) * C * 0.85 : weaponLength(fist ? 'punho' : held);
  const ranged = Boolean(fam.ranged);
  const reachCells = weapon?.reach || fam.reach || 1;
  const reachPx = rope ? reachCells * C : Math.max(C * 0.85, C * 0.28 + len * 0.9);
  const body = { pre: 0.15, go: 1, over: 0, up: 0, dip: 0, hold: 0.55, recoil: 0.12, ...(move.body || {}) };
  if (rope && !body.go) { body.go = 1; body.hold = 0.4; }
  const approach = Math.max(0, eff.dist - reachPx) * body.go + (body.over || 0) * C;
  const result = eff.result;
  const crit = result === 'crit';
  const windup = Math.round((move.windup || 150) * (crit ? 1.15 : 1));
  const trailStyle = TRAILS[weapon?.trail] || TRAILS.medio;

  // Segmentos com instantes absolutos.
  let segs = move.segs.map((s) => ({ ...s }));
  if (result === 'fumble') segs = [{ ...segs[0], ms: Math.round((segs[0].ms || 160) * 0.6), hit: false, n: 1 }];
  let t = windup;
  let prevEnd = startAngle(segs[0]);
  const hits = [];
  const projectiles = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    s.i = i;
    if (s.k === 'spin' && s.over) s.hit = false; // giro no alto da cabeca nao toca o alvo
    if (segs[i + 1]?.k === 'ground') s.hit = false; // o golpe no chao so abre a fenda
    s.t0 = t;
    s.prev = prevEnd;
    if (s.k === 'shot') {
      const rel = (s.mode === 'throw' ? 90 : 0) + (s.wait || 0);
      const n = Math.max(1, s.n || 1);
      const stagger = s.stagger || 0;
      const travel = Math.max(C, eff.dist - C * 0.3);
      let flight = (travel / ((s.speed || 14) * C)) * 1000 * (1 + (s.arc || 0) * 0.12);
      if (s.sky) flight = 420;
      if (s.bounce) flight *= 1.25;
      flight = Math.round(Math.min(720, Math.max(130, flight)));
      s.rel = t + rel;
      s.flight = flight;
      s.ms = rel + stagger * (n - 1) + flight;
      const rng = makeRng(eff.seed, `proj${i}`);
      let lastOn = null;
      for (let k = 0; k < n; k++) {
        const off = n > 1 && s.spread ? ((k - (n - 1) / 2) / ((n - 1) / 2)) * s.spread * C : 0;
        const jitter = s.sky ? rng.range(-0.25, 0.25) * C : 0;
        const pr = { seg: i, k, launch: s.rel + k * stagger, arrive: s.rel + k * stagger + flight, off: off + jitter, on: Math.abs(off + jitter) < C * 0.4 };
        projectiles.push(pr);
        if (pr.on) lastOn = pr;
      }
      const list = projectiles.filter((p) => p.seg === i);
      s.hitT = (lastOn || list[list.length - 1]).arrive;
      if (s.hit && result !== 'fumble') {
        for (const p of list) if (p !== (lastOn || list[list.length - 1])) hits.push({ t: p.arrive, off: p.off, on: p.on, seg: i });
      }
    } else {
      s.hitT = t + hitFrac(s) * s.ms;
    }
    s.t1 = t + s.ms;
    prevEnd = endAngle(s);
    t = s.t1;
  }
  let last = null;
  for (const s of segs) if (s.hit) last = s;
  if (!last) last = segs[segs.length - 1];
  const contact = result === 'fumble' ? segs[0].t1 : last.hitT;
  for (const s of segs) {
    if (s.hit && s !== last && s.k !== 'shot' && result !== 'fumble') hits.push({ t: s.hitT, off: 0, on: true, seg: s.i });
  }
  hits.sort((a, b) => a.t - b.t);
  const follow = Math.max(0, segs[segs.length - 1].t1 - contact);
  const fwdEnd = approach;
  const recover = Math.round(260 + Math.min(420, (Math.abs(fwdEnd) / C) * 90) + (move.mount ? 160 : 0));

  const lands = result === 'hit' || result === 'crit';
  const hitstop = lands ? (crit ? 100 : 60) : 0;
  let impact = { cut: 460, pierce: 460, crush: 520, pow: 460, claw: 520, bash: 520, blast: 700 }[eff.family.impact] || 480;
  if (crit) impact += 160;
  if (result === 'fumble') impact = 980;
  if (result === 'miss') impact = 520;
  impact = Math.max(impact, follow + recover + 60);
  for (const s of segs) if (s.k === 'shot' && s.ret) impact = Math.max(impact, s.flight + 200);
  const T = { windup, action: contact - windup, impactAt: contact, hitstop, impact, total: contact + hitstop + impact };

  const el = eff.el;
  const sparks = eff.elKey !== 'fisico' ? el.ramp : SPARKS[weapon?.sparks] || SPARKS.aco;
  return {
    fam, weapon, move, held, len, rope, fist, ranged, body, approach, segs, hits, projectiles, contact, follow, recover,
    trailStyle, sparks, T, quake: Boolean(weapon?.quake), proj: weapon?.proj || fam.proj || null,
    react: result === 'miss' || result === 'fumble' ? 'none' : move.react || 'push'
  };
}

function startAngle(s) {
  switch (s.k) {
    case 'swing': return s.a0;
    case 'thrust': return s.ang;
    case 'spin': return -(s.turns * 360) - 40;
    case 'hold': return s.ang;
    case 'shot': return s.mode === 'throw' ? -130 : (s.sky ? -55 : 0);
    case 'lash': return s.low ? -40 : -120;
    case 'ground': return 80;
    default: return 0;
  }
}

function endAngle(s) {
  switch (s.k) {
    case 'swing': return s.a1;
    case 'thrust': return s.ang;
    case 'spin': return 70;
    case 'hold': return s.ang;
    case 'shot': return s.mode === 'throw' ? 40 : (s.sky ? -55 : 0);
    case 'lash': return 30;
    case 'ground': return 80;
    default: return 0;
  }
}

function swingAngle(s, p) {
  const prep = Math.abs((s.prev ?? s.a0) - s.a0) > 25 ? 0.22 : 0;
  if (p < prep) return lerp(s.prev, s.a0, ease.inOut(p / prep));
  return s.a0 + (s.a1 - s.a0) * ease.outCubic((p - prep) / (1 - prep || 1));
}

function spinAngle(s, p) {
  const a0 = -(s.turns * 360) - 40;
  return a0 + (70 - a0) * ease.inOut(p);
}

// Fracao do segmento em que a arma passa pelo alvo (o "contato").
function hitFrac(s) {
  if (s.k === 'swing' || s.k === 'spin') {
    const f = s.k === 'swing' ? swingAngle : spinAngle;
    const aim = s.low ? 30 : 0;
    let best = -1;
    let prev = f(s, 0) - aim;
    for (let i = 1; i <= 80; i++) {
      const p = i / 80;
      const a = f(s, p) - aim;
      if ((prev <= 0 && a >= 0) || (prev >= 0 && a <= 0)) best = p; // ultimo cruzamento
      prev = a;
    }
    if (best < 0) best = 0.5;
    return Math.min(0.95, Math.max(0.15, best));
  }
  if (s.k === 'thrust') return 0.55;
  if (s.k === 'lash') return 0.7;
  if (s.k === 'hold') return 0.6;
  return 1;
}

// ------------------------------------------------------------ corpo
// Deslocamento do atacante no instante T (relogio da animacao), em pixels de efeito:
// fwd ao longo da direcao do alvo e up para cima.
export function bodyAt(eff, T) {
  const mv = eff.mv;
  const { body, approach } = mv;
  const C = eff.C;
  const { windup, impactAt } = mv.T;
  const mountUp = mv.move.mount ? C * 0.28 : 0;
  let fwd = 0;
  let up = 0;
  if (T < windup) {
    const k = ease.out(clamp01(T / Math.max(1, windup)));
    fwd = -body.pre * C * k;
    up = -(body.dip || 0) * C * k;
  } else if (T < impactAt) {
    const a = clamp01((T - windup) / Math.max(1, impactAt - windup));
    const k = ease.outCubic(clamp01(a / Math.max(0.05, body.hold || 0.55)));
    fwd = lerp(-body.pre * C, approach, k);
    up = -(body.dip || 0) * C * (1 - k) + (body.up || 0) * C * Math.sin(Math.PI * a);
  } else {
    const r = clamp01((T - impactAt) / mv.recover);
    fwd = approach * (1 - ease.inOut(r)) - (body.recoil ?? 0.12) * C * Math.sin(Math.PI * Math.min(1, r * 1.6));
    up = 0;
  }
  if (mv.move.mount) up += mountUp * (T < impactAt + mv.recover ? 1 : 0);
  return { fwd, up };
}

export function attackerPos(eff, T) {
  const b = bodyAt(eff, T);
  return { x: eff.from.x + eff.dir.x * b.fwd, y: eff.from.y + eff.dir.y * b.fwd - b.up, up: b.up };
}

// ------------------------------------------------------------ pose da arma
// { ang (graus, relativo), ext (celulas ao longo de mAng), pivot, trail, show, seg, p }
export function poseAt(eff, T) {
  const mv = eff.mv;
  const segs = mv.segs;
  const { windup } = mv.T;
  if (T < windup) {
    const s0 = segs[0];
    const k = ease.outCubic(clamp01(T / Math.max(1, windup)));
    const target = startAngle(s0);
    // Antecipacao marcada: passa um pouco do ponto de partida, para tras do golpe.
    const dirSign = s0.k === 'swing' ? Math.sign(s0.a1 - s0.a0) || 1 : 1;
    const over = s0.k === 'swing' ? -14 * dirSign * Math.sin(Math.PI * k) : 0;
    const ext = s0.k === 'thrust' ? -(s0.back || 0.3) * k : 0;
    return { ang: lerp(REST, target, k) + over, ext, mAng: s0.k === 'thrust' && s0.rev ? s0.ang - 180 : null, pivot: s0.k === 'spin' && s0.over ? 'head' : 'hand', trail: false, show: true, seg: null, p: k, wind: k };
  }
  let s = null;
  for (const x of segs) if (T >= x.t0 && T < x.t1) { s = x; break; }
  if (!s) {
    const lastSeg = segs[segs.length - 1];
    const r = clamp01((T - lastSeg.t1) / mv.recover);
    const endA = endAngle(lastSeg);
    const hide = lastSeg.k === 'shot' && lastSeg.mode === 'throw' && (lastSeg.self || mv.proj === 'self') && !lastSeg.ret;
    return { ang: lerp(endA, REST, ease.inOut(r)), ext: 0, pivot: 'hand', trail: false, show: !hide && eff.result !== 'fumble', alpha: 1 - clamp01((r - 0.55) / 0.45), seg: null, p: r, rec: r };
  }
  const p = clamp01((T - s.t0) / Math.max(1, s.ms));
  switch (s.k) {
    case 'swing':
      return { ang: swingAngle(s, p), ext: 0, pivot: 'hand', trail: p > 0.02, show: true, seg: s, p, lift: s.lift, low: s.low, r: s.r };
    case 'thrust': {
      const back = s.back ?? 0.35;
      const len = s.len ?? 0.25;
      let ext;
      if (p < 0.55) ext = lerp(-back, len, ease.outCubic(p / 0.55));
      else if (p < 0.8) ext = len;
      else ext = lerp(len, 0, ease.inOut((p - 0.8) / 0.2));
      return { ang: s.ang, mAng: s.rev ? s.ang - 180 : s.ang, ext, pivot: 'hand', trail: false, thrust: p < 0.62, show: true, seg: s, p };
    }
    case 'spin':
      return { ang: spinAngle(s, p), ext: 0, pivot: s.over ? 'head' : s.front ? 'front' : 'center', trail: true, show: true, seg: s, p, low: s.low, r: s.r };
    case 'hold': {
      const tremble = s.tremble || s.glow ? Math.sin(T * 0.25) * (s.tremble ? 3 : 1.2) : 0;
      return { ang: s.ang + tremble, ext: s.tug ? -0.15 * ease.out(p) : 0, pivot: 'hand', trail: false, show: true, seg: s, p };
    }
    case 'shot': {
      if (s.mode === 'throw') {
        const k = clamp01((T - s.t0) / 90);
        const ang = lerp(-130, 40, ease.in(k));
        const gone = (s.self || mv.proj === 'self') && T >= s.rel;
        return { ang, ext: 0, pivot: 'hand', trail: !gone && k > 0.1 && k < 1, show: !gone || Boolean(s.ret && T > s.hitT + s.flight), seg: s, p };
      }
      return { ang: s.sky ? -55 : 0, ext: 0, pivot: 'hand', trail: false, show: true, seg: s, p, aim: true };
    }
    case 'lash':
      return { ang: lerp(-120, 30, ease.outCubic(clamp01(p / 0.7))), ext: 0, pivot: 'hand', trail: false, show: true, seg: s, p };
    case 'ground':
      return { ang: 80, ext: 0, pivot: 'hand', trail: false, show: true, seg: s, p };
    default:
      return { ang: REST, ext: 0, pivot: 'hand', trail: false, show: true, seg: s, p };
  }
}

// Angulo relativo (graus) -> angulo no mundo (radianos), espelhando para quem olha a esquerda.
export function worldAngle(eff, rel) {
  return Math.atan2(eff.dir.y, eff.dir.x) + rel * DEG * eff.side;
}

// Pega (onde a mao segura), ponta e ponto interno do rastro no instante T.
export function weaponGeom(eff, T) {
  const mv = eff.mv;
  const pose = poseAt(eff, T);
  const C = eff.C;
  const at = attackerPos(eff, T);
  let px;
  let py;
  if (pose.pivot === 'center') { px = at.x; py = at.y - C * 0.05 + (pose.low ? C * 0.25 : 0); }
  else if (pose.pivot === 'head') { px = at.x; py = at.y - C * 0.6; }
  else if (pose.pivot === 'front') { px = at.x + eff.dir.x * C * 0.4; py = at.y + eff.dir.y * C * 0.4 - C * 0.05; }
  else {
    px = at.x + eff.dir.x * C * 0.28;
    py = at.y + eff.dir.y * C * 0.28 - C * 0.05 + (pose.low ? C * 0.28 : 0) - (pose.lift || 0) * C;
  }
  const th = worldAngle(eff, pose.ang);
  const mth = pose.mAng != null ? worldAngle(eff, pose.mAng) : th;
  if (pose.ext) { px += Math.cos(mth) * pose.ext * C; py += Math.sin(mth) * pose.ext * C; }
  if (pose.pivot === 'center' || pose.pivot === 'head') { px += Math.cos(th) * C * 0.25; py += Math.sin(th) * C * 0.25 * (pose.pivot === 'head' ? 0.4 : 1); }
  const L = mv.len * (pose.r || 1);
  const tip = { x: px + Math.cos(th) * L, y: py + Math.sin(th) * L };
  const inner = { x: px + Math.cos(th) * L * (1 - mv.trailStyle.blade), y: py + Math.sin(th) * L * (1 - mv.trailStyle.blade) };
  return { pose, pivot: { x: px, y: py }, th, tip, inner, at };
}

// Ponto de chegada do projetil k (com o deslocamento do leque).
export function projTarget(eff, pr) {
  return { x: eff.hit.x + eff.perp.x * pr.off, y: eff.hit.y + eff.perp.y * pr.off };
}

// Posicao do projetil no instante T; null se nao esta no ar.
export function projAt(eff, pr, T) {
  const mv = eff.mv;
  const s = mv.segs[pr.seg];
  const C = eff.C;
  const end = projTarget(eff, pr);
  const hand = weaponGeom(eff, Math.min(T, pr.launch)).pivot;
  const start = s.sky ? { x: end.x - eff.dir.x * C * 1.2, y: end.y - C * 5 } : { x: hand.x + eff.dir.x * C * 0.2, y: hand.y + (s.low ? C * 0.3 : 0) };
  let u = (T - pr.launch) / (pr.arrive - pr.launch);
  if (u < 0) return null;
  let fade = 1;
  if (u > 1) {
    if (s.ret && pr.k === 0 && eff.result !== 'fumble') {
      const r = (T - pr.arrive) / s.flight;
      if (r > 1) return null;
      const back = weaponGeom(eff, T).pivot;
      const q = { x: lerp(end.x, back.x, ease.inOut(r)), y: lerp(end.y, back.y, ease.inOut(r)) - Math.sin(Math.PI * r) * C * 0.5 };
      return { ...q, ang: worldAngle(eff, 0) + (T - pr.launch) * 0.00628 * (s.spin || 3) * eff.side, u: 1 + r, ret: true, fade: 1 };
    }
    const sticks = !s.self && !s.small && mv.proj !== 'self' && mv.proj !== 'stone';
    if (sticks && !s.pierce && pr.on && (eff.result === 'hit' || eff.result === 'crit')) {
      // Crava no alvo e fica um instante (balancando no primeiro quadro).
      const dtm = T - pr.arrive;
      if (dtm > 620) return null;
      const q = pathPt(eff, s, start, end, 1);
      const q0 = pathPt(eff, s, start, end, 0.97);
      const ang = Math.atan2(q.y - q0.y, q.x - q0.x) + (dtm < 90 ? Math.sin(dtm * 0.25) * 0.15 : 0);
      return { x: q.x - Math.cos(ang) * 2, y: q.y - Math.sin(ang) * 2, ang, u, stuck: true, inTarget: true, fade: 1 - clamp01((dtm - 460) / 160) };
    }
    if (s.pierce && eff.result !== 'miss') {
      if (u > 1.6) return null;
      fade = 1 - (u - 1) / 0.6;
    } else if (eff.result === 'miss' || eff.result === 'fumble') {
      if (u > 3.5) return null; // fica fincado no chao
      return { ...pathPt(eff, s, start, end, 1), stuck: true, fade: 1 - clamp01((u - 2.5)), ang: Math.atan2(1, eff.dir.x >= 0 ? 0.6 : -0.6), u };
    } else return null;
  }
  const q = pathPt(eff, s, start, end, u);
  const q2 = pathPt(eff, s, start, end, Math.min(u + 0.02, 1.6));
  let ang = Math.atan2(q2.y - q.y, q2.x - q.x);
  if (s.spin || s.self || mv.proj === 'self') ang = worldAngle(eff, 0) + (T - pr.launch) * 0.00628 * (s.spin || 4) * eff.side;
  return { x: q.x, y: q.y, ang, u, fade, start, end };
}

function pathPt(eff, s, a, b, u) {
  const C = eff.C;
  const x = lerp(a.x, b.x, u);
  let y = lerp(a.y, b.y, u);
  if (s.sky) return { x, y: lerp(a.y, b.y, ease.in(Math.min(1, u))) };
  if (s.bounce) {
    // Quica no chao na metade do caminho e sobe no alvo.
    const g = lerp(eff.fromGround, eff.ground, 0.5);
    if (u < 0.5) { const k = u / 0.5; y = lerp(a.y, g, k * k); }
    else { const k = (u - 0.5) / 0.5; y = lerp(g, b.y, k) - Math.sin(Math.PI * k) * C * 0.6; }
    return { x, y };
  }
  const h = (s.arc || 0) * C;
  y -= h * 4 * u * (1 - u);
  if (s.curve) {
    const c = Math.sin(Math.PI * Math.min(1, u)) * s.curve * C;
    return { x: x + eff.perp.x * c, y: y + eff.perp.y * c };
  }
  return { x, y };
}

// ------------------------------------------------------------ alvo e tremor
export function moveBodies(eff, t, att, tgt) {
  const mv = eff.mv;
  const T = animTimeMv(eff, t);
  const C = eff.C;
  if (eff.phase !== 'impact' || eff.linked) {
    const at = attackerPos(eff, T);
    att.x = at.x - eff.from.x;
    att.y = at.y - eff.from.y;
  }
  if (eff.result === 'fumble' && T >= mv.T.impactAt) {
    const k = clamp01((T - mv.T.impactAt) / 520);
    att.x += Math.sin(k * 18) * C * 0.06 * (1 - k);
    att.y += C * 0.1 * Math.sin(Math.min(1, k * 2) * Math.PI * 0.5) * (1 - k);
  }
  const lands = eff.result === 'hit' || eff.result === 'crit';
  if (lands) {
    for (const h of mv.hits) {
      if (!h.on) continue;
      const d = T - h.t;
      if (d >= 0 && d < 70) {
        tgt.flash = Math.max(tgt.flash, d < 45 ? 1 : 0);
        const k = Math.sin(Math.PI * d / 70);
        tgt.x += eff.dir.x * C * 0.07 * k;
        tgt.y += eff.dir.y * C * 0.07 * k;
      }
    }
  }
  const rt = T - mv.T.impactAt;
  if (!lands || rt < 0) return;
  const k = clamp01(rt / 420);
  switch (mv.react) {
    case 'knock': {
      const push = C * 0.45 * Math.sin(Math.PI * Math.min(1, k * 1.1)) * (1 - k * 0.3);
      tgt.x += eff.dir.x * push; tgt.y += eff.dir.y * push; break;
    }
    case 'launch': tgt.y -= C * 0.55 * Math.sin(Math.PI * clamp01(rt / 380)); break;
    case 'pull': {
      const pull = C * 0.4 * Math.sin(Math.PI * clamp01(rt / 460));
      tgt.x -= eff.dir.x * pull; tgt.y -= eff.dir.y * pull; break;
    }
    case 'trip': tgt.y += C * 0.12 * Math.sin(Math.PI * clamp01(rt / 520)); break;
    case 'stagger': tgt.x += Math.sin(rt * 0.05) * C * 0.08 * (1 - k); break;
    case 'slam': {
      const r = rt / 300;
      if (r < 1) tgt.y -= C * 0.7 * Math.sin(Math.PI * r) * (r < 0.5 ? 1 : 1);
      break;
    }
    default: break;
  }
}

export function animTimeMv(eff, t) {
  const { impactAt, hitstop } = eff.T;
  if (t < impactAt) return t;
  if (t < impactAt + hitstop) return impactAt;
  return t - hitstop;
}

export function moveShake(eff, t) {
  const mv = eff.mv;
  if (!(eff.result === 'hit' || eff.result === 'crit')) return null;
  const T = animTimeMv(eff, t);
  for (const h of mv.hits) {
    const d = T - h.t;
    if (h.on && d >= 0 && d < 80) return { x: Math.round(Math.sin(d * 0.3) * (1 - d / 80)) * eff.unit, y: 0 };
  }
  if (mv.react === 'slam') {
    const d = T - mv.T.impactAt - 300;
    if (d >= 0 && d < 200) return { x: Math.round(Math.sin(d * 0.2) * 2 * (1 - d / 200)) * eff.unit, y: Math.round(Math.cos(d * 0.17) * 1.5 * (1 - d / 200)) * eff.unit };
  }
  return null;
}

// ------------------------------------------------------------ particulas
export function spawnMove(eff) {
  const mv = eff.mv;
  const C = eff.C;
  const A = eff.action;
  const P = eff.particles;
  const rng = makeRng(eff.seed, 'golpe');
  const lands = eff.result === 'hit' || eff.result === 'crit';
  const el = eff.elKey !== 'fisico' ? ELEMENTS[eff.elKey] : null;
  const sparkPal = mv.sparks;
  const shape = el ? (el.shape === 'ring' ? 'square' : el.shape) : 'spark';
  const motion = el ? el.motion : 'none';
  const gy = eff.ground;
  const baseAng = Math.atan2(eff.dir.y, eff.dir.x);
  const { windup, impactAt } = mv.T;

  // Poeira nos pes: investida, salto (decolagem e pouso), giro rasteiro, montaria.
  const feet = (T) => { const a = attackerPos(eff, T); return { x: a.x, y: a.y + C * 0.42 + (a.up || 0) }; };
  if (mv.body.dust || mv.move.mount) {
    const n = mv.move.mount ? 9 : 6;
    for (let i = 0; i < n; i++) {
      const T = windup + ((impactAt - windup) * i) / n;
      const f = feet(T);
      burst(rng, A, { x: f.x, y: f.y, t0: T, n: 2, angle: -Math.PI / 2 - eff.side * 0.7, spread: 0.6, speed: [10, 28], g: 18, drag: 3, life: [260, 440], size: [2, 3], pal: PALETTES.dust, shape: 'puff' });
    }
  }
  if (mv.body.up >= 0.5) {
    const f0 = feet(windup);
    burst(rng, A, { x: f0.x, y: eff.fromGround, radius: C * 0.2, rx: 1, ry: 0.3, t0: windup, n: 5, angle: -Math.PI / 2, spread: 1.3, speed: [10, 26], g: -6, drag: 3, life: [300, 460], size: [2, 3], pal: PALETTES.dust, shape: 'puff' });
  }
  if (eff.result !== 'miss' && mv.body.up >= 0.5) {
    const f1 = feet(impactAt);
    burst(rng, P, { x: f1.x, y: f1.y, radius: C * 0.25, rx: 1, ry: 0.3, t0: impactAt, n: 6, angle: -Math.PI / 2, spread: 1.4, speed: [12, 30], g: -6, drag: 3, life: [320, 520], size: [2, 3], pal: PALETTES.dust, shape: 'puff' });
  }

  for (const s of mv.segs) {
    // Tinido de aparar: faiscas na metade da lamina.
    if (s.k === 'hold' && s.tink) {
      const Tc = s.t0 + s.ms * 0.45;
      const g = weaponGeom(eff, Tc);
      const mid = { x: (g.pivot.x + g.tip.x) / 2, y: (g.pivot.y + g.tip.y) / 2 };
      burst(rng, A, { x: mid.x, y: mid.y, t0: Tc, n: 9, angle: baseAng + Math.PI, spread: 1.4, speed: [40, 90], drag: 5, g: 60, life: [160, 300], size: [1, 1], pal: SPARKS.faisca, shape: 'spark' });
    }
    // Carga: particulas convergindo para a arma.
    if (s.k === 'hold' && s.glow) {
      const pal = el ? el.ramp : PALETTES.gold;
      for (let i = 0; i < 12; i++) {
        const T0 = s.t0 + rng.range(0, s.ms * 0.7);
        const g = weaponGeom(eff, T0 + 120);
        const a = rng.range(0, Math.PI * 2);
        const r = rng.range(C * 0.5, C * 0.9);
        const life = rng.range(160, 260);
        A.push({ t0: T0, x: g.tip.x + Math.cos(a) * r, y: g.tip.y + Math.sin(a) * r, vx: -Math.cos(a) * r * (1000 / life), vy: -Math.sin(a) * r * (1000 / life), g: 0, drag: 0, life, size: 1, pal, shape: 'square', motion: 'none', ph: 0, floor: null, cx: g.tip.x, cy: g.tip.y, fade: false, id: A.length });
      }
    }
    // Fenda no chao: pedrinhas pulando ao longo do caminho.
    if (s.k === 'ground') {
      for (let i = 0; i < 8; i++) {
        const u = (i + 0.5) / 8;
        const T0 = s.t0 + u * s.ms;
        const x = lerp(eff.from.x + eff.dir.x * C * 0.5, eff.hit.x, u);
        const y = lerp(eff.fromGround, gy, u);
        burst(rng, A, { x, y, t0: T0, n: 3, angle: -Math.PI / 2, spread: 0.7, speed: [26, 50], g: 200, drag: 0.6, life: [220, 360], size: [1, 2], pal: s.spikes ? ELEMENTS.gaia.ramp : PALETTES.stone, shape: 'pebble', floor: y + 1 });
        burst(rng, A, { x, y, t0: T0 + 20, n: 1, angle: -Math.PI / 2, spread: 0.8, speed: [8, 18], g: -6, drag: 3, life: [300, 460], size: [2, 3], pal: PALETTES.dust, shape: 'puff' });
      }
    }
    // Giro rasteiro: anel de poeira.
    if (s.k === 'spin' && s.low) {
      const f = feet(s.t0 + s.ms * 0.5);
      burst(rng, A, { x: f.x, y: f.y, radius: C * 0.6, rx: 1, ry: 0.3, t0: s.t0 + s.ms * 0.3, n: 8, angle: -Math.PI / 2, spread: 1.4, speed: [8, 20], g: -4, drag: 3, life: [300, 460], size: [2, 3], pal: PALETTES.dust, shape: 'puff', stagger: s.ms * 0.5 });
    }
  }

  // Acertos intermediarios: faiscas e poeira (ou vento e poeira no erro).
  for (const h of mv.hits) {
    const x = eff.hit.x + eff.perp.x * h.off;
    const y = eff.hit.y + eff.perp.y * h.off;
    if (lands && h.on) {
      burst(rng, A, { x, y, t0: h.t, n: 7, angle: baseAng, spread: 1.2, speed: [40, 100], drag: 5, g: 60, life: [140, 260], size: [1, 1], pal: sparkPal, shape, motion });
      burst(rng, A, { x, y: gy, radius: C * 0.2, rx: 1, ry: 0.3, t0: h.t, n: 2, angle: -Math.PI / 2, spread: 1.2, speed: [8, 18], g: -4, drag: 3, life: [260, 400], size: [2, 2], pal: PALETTES.dust, shape: 'puff' });
    } else {
      burst(rng, A, { x, y: gy, radius: C * 0.2, rx: 1, ry: 0.3, t0: h.t, n: 3, angle: -Math.PI / 2, spread: 1.3, speed: [10, 24], g: 10, drag: 3, life: [280, 420], size: [2, 3], pal: PALETTES.dust, shape: 'puff' });
    }
  }

  // Contato final: faiscas da arma + poeira nos pes do alvo + onda no chao.
  if (lands) {
    const hx = eff.hit.x;
    const k = eff.scale;
    burst(rng, P, { x: hx, y: eff.hit.y, t0: impactAt, n: 9 * k, angle: baseAng, spread: 1.0, speed: [60, 130], drag: 5.5, g: 80, life: [160, 300], size: [1, 1], pal: sparkPal, shape, motion });
    for (const sgn of [-1, 1]) burst(rng, P, { x: hx + sgn * C * 0.2, y: gy, t0: impactAt + 20, n: 3, angle: sgn > 0 ? -0.3 : Math.PI + 0.3, spread: 0.45, speed: [16, 34], g: -4, drag: 3, life: [340, 520], size: [2, 3], pal: PALETTES.dust, shape: 'puff' });
    const quake = mv.quake || mv.segs.some((s) => s.quake);
    if (quake) {
      burst(rng, P, { x: hx, y: gy, radius: C * 0.4, rx: 1, ry: 0.3, t0: impactAt, n: 10 * k, angle: -Math.PI / 2, spread: 1.1, speed: [36, 80], g: 260, drag: 0.5, life: [340, 520], size: [1, 2], pal: PALETTES.stone, shape: 'pebble', floor: gy + 1 });
      burst(rng, P, { x: hx, y: gy, radius: C * 0.7, rx: 1, ry: 0.25, t0: impactAt + 40, n: 10, angle: -Math.PI / 2, spread: 1.5, speed: [10, 26], g: -5, drag: 3, life: [420, 640], size: [2, 3], pal: PALETTES.dust, shape: 'puff' });
    }
    if (mv.react === 'slam') {
      burst(rng, P, { x: hx, y: gy, radius: C * 0.5, rx: 1, ry: 0.3, t0: impactAt + 300, n: 10, angle: -Math.PI / 2, spread: 1.5, speed: [12, 30], g: -5, drag: 3, life: [380, 560], size: [2, 3], pal: PALETTES.dust, shape: 'puff' });
    }
  }
}

export { IMPACT_KIND, REST, DEG };
