// Esqueleto unico do personagem: TODA camada (corpo, roupa, cabelo, item) se
// posiciona pelas partes que o pose() devolve. Assim qualquer combinacao anima
// igual: a animacao mora aqui, uma vez so, e as pecas so "vestem" as partes.
// Quadro 24x32, visao 3/4 de cima. A visao 'side' e desenhada olhando para a
// ESQUERDA; 'right' e o espelho dela (feito no render).

export const W = 24;
export const H = 32;
export const DIRECTIONS = ['down', 'left', 'right', 'up'];
export const ANIMS = { idle: 2, walk: 4 };
export const FRAME_MS = { idle: 520, walk: 150 };

export const BUILDS = [
  { id: 'esbelto', name: 'Esbelto' },
  { id: 'medio', name: 'Médio' },
  { id: 'forte', name: 'Forte' }
];
export const HEIGHTS = [
  { id: 'normal', name: 'Normal' },
  { id: 'baixa', name: 'Baixa' }
];

// Cabeca grande (estilo chibi): 12x11, ~42% da altura do corpo.
const HEAD_FRONT = [
  '...######...',
  '..########..',
  '.##########.',
  '.##########.',
  '############',
  '############',
  '############',
  '############',
  '.##########.',
  '..########..',
  '...######...'
];
// Perfil olhando para a esquerda: nariz na coluna 0, nuca arredondada a direita.
const HEAD_SIDE = [
  '...######...',
  '..########..',
  '.##########.',
  '.##########.',
  '.###########',
  '.###########',
  '############',
  '.###########',
  '.##########.',
  '..#########.',
  '...######...'
];

export const idx = (x, y) => y * W + x;

function makePart(name, spans, tag = 'main', extra = {}) {
  const cells = new Set();
  const rows = new Map();
  for (const [y, x0, x1] of spans) {
    if (x1 < x0) continue;
    rows.set(y, [x0, x1]);
    for (let x = x0; x <= x1; x++) if (x >= 0 && x < W && y >= 0 && y < H) cells.add(idx(x, y));
  }
  const ys = [...rows.keys()];
  return { name, tag, cells, rows, top: Math.min(...ys), bottom: Math.max(...ys), ...extra };
}

function fromTemplate(name, tpl, ox, oy) {
  const spans = [];
  tpl.forEach((row, y) => {
    const a = row.indexOf('#'), b = row.lastIndexOf('#');
    if (a >= 0) spans.push([oy + y, ox + a, ox + b]);
  });
  return makePart(name, spans);
}

// Meia-largura do tronco por porte e visao.
const TORSO_HW = { down: { esbelto: 4, medio: 5, forte: 6 }, side: { esbelto: 2.5, medio: 3, forte: 4 } };

export function pose(dir = 'down', anim = 'idle', f = 0, build = 'medio', height = 'normal') {
  const view = dir === 'up' ? 'up' : dir === 'down' ? 'down' : 'side';
  const n = ANIMS[anim] || 1;
  f = ((f % n) + n) % n;
  const walk = anim === 'walk';
  const short = height === 'baixa' ? 2 : 0;
  const ground = 30; // ultima linha do pe em repouso (a 31 e para o pe "a frente" e a sombra)

  // bob: corpo de cima sobe 1px no quadro de passagem; no idle, a cabeca respira.
  const bob = walk ? [0, -1, 0, -1][f] : 0;
  const breath = !walk && f === 1 ? 1 : 0;
  const torsoY = 16 + short + bob;
  const headY = 5 + short + bob + breath;
  // tronco de 7 linhas (auditoria 24/10): a perna ganha espaco para calca/saia/joelheira se lerem
  const TORSO_ROWS = 7;
  const hipY = torsoY + TORSO_ROWS;

  const P = { view, dir, anim, f, build, height, walk, ground, bob, hip: hipY };
  P.head = { x: 6, y: headY, w: 12, h: 11 };
  P.headPart = fromTemplate('head', view === 'side' ? HEAD_SIDE : HEAD_FRONT, 6, headY);

  if (view === 'side') {
    P.face = { eyes: [{ x: 8, y: headY + 6 }], mouth: { x: 7, y: headY + 9 }, nose: { x: 6, y: headY + 6 }, brow: headY + 5 };
    P.ears = [{ x: 13, y: headY + 6, side: 'b' }];
  } else {
    P.face = view === 'down'
      ? { eyes: [{ x: 8, y: headY + 6 }, { x: 14, y: headY + 6 }], mouth: { x: 11, y: headY + 9 }, brow: headY + 5 }
      : null;
    P.ears = [{ x: 5, y: headY + 6, side: 'l' }, { x: 18, y: headY + 6, side: 'r' }];
  }

  // ---- tronco ----
  const hw = TORSO_HW[view === 'side' ? 'side' : 'down'][build] ?? 5;
  let tx0, tx1;
  if (view === 'side') { tx0 = Math.round(12 - hw) - (build === 'forte' ? 0 : 0); tx1 = Math.round(11 + hw); }
  else { tx0 = 12 - hw; tx1 = 11 + hw; }
  const tspans = [];
  for (let r = 0; r < TORSO_ROWS; r++) {
    const inset = view === 'side' ? (r === 0 ? 1 : 0) : (r === 0 || r >= TORSO_ROWS - 2 ? 1 : 0);
    tspans.push([torsoY + r, tx0 + inset, tx1 - (view === 'side' && r >= TORSO_ROWS - 2 ? 1 : inset)]);
  }
  P.torso = makePart('torso', tspans, 'main', { x0: tx0, x1: tx1 });
  P.neck = { x: view === 'side' ? 10 : 11, y: torsoY - 1 };

  // ---- pernas e bracos (fase do passo) ----
  // f0: perna esquerda (da tela) a frente; f2: a direita. Braco oposto a perna.
  const phase = walk ? [1, 0, -1, 0][f] : 0;
  P.phase = phase;
  P.arms = [];
  P.legs = [];
  const legW = build === 'esbelto' ? 3 : 4;
  if (view === 'side') {
    const lx = 10;
    for (const [k, front] of [[0, false], [1, true]]) {
      const sign = front ? 1 : -1;
      const swing = phase * sign; // +1 = perna da frente avancando (para a esquerda)
      const lift = walk && phase === 0 ? ((f === 1) === front ? 1 : 0) : 0;
      const foot = ground - lift;
      const spans = [];
      const len = foot - hipY + 1;
      for (let i = 0; i < len; i++) {
        const t = len > 1 ? i / (len - 1) : 0;
        const dx = -Math.round(swing * 2 * t) + (front ? 0 : 1);
        spans.push([hipY + i, lx + dx, lx + dx + 2]);
      }
      const last = spans[spans.length - 1];
      const footBox = { x: last[1] - 1, y: foot - 1, w: 4, h: 2 };
      P.legs.push(makePart(front ? 'legF' : 'legB', spans, 'main', { front, back: !front, foot: footBox, side: front ? 'f' : 'b' }));
    }
    for (const [front] of [[false], [true]]) {
      const swing = -phase * (front ? 1 : -1);
      const ax = 11;
      const spans = [];
      for (let i = 0; i < 6; i++) {
        const dx = -Math.round(swing * 2 * (i / 5));
        spans.push([torsoY + 1 + i, ax + dx, ax + dx + 1]);
      }
      const last = spans[spans.length - 1];
      const hand = { x: last[1], y: torsoY + 7, w: 2, h: 2 };
      P.arms.push(makePart(front ? 'armF' : 'armB', spans, front ? 'arm' : 'main', { front, back: !front, hand, side: front ? 'f' : 'b' }));
    }
  } else {
    const gap = 0;
    const lx = [12 - legW - gap, 12 + gap];
    for (const k of [0, 1]) {
      // na visao de frente a perna "a frente" desce 1px; a de tras sobe 1px.
      let foot = ground;
      if (walk && phase !== 0) {
        const forward = (k === 0) === (phase > 0);
        foot = forward ? ground + 1 : ground - 1;
      }
      if (view === 'up' && walk && phase !== 0) foot = ground * 2 - foot; // de costas inverte
      const spans = [];
      for (let y = hipY; y <= foot; y++) spans.push([y, lx[k], lx[k] + legW - 1]);
      const footBox = { x: lx[k], y: foot - 1, w: legW, h: 2 };
      P.legs.push(makePart(k ? 'legR' : 'legL', spans, 'main', { front: true, foot: footBox, side: k ? 'r' : 'l' }));
    }
    const ax = [tx0 - 2, tx1 + 1];
    for (const k of [0, 1]) {
      let len = 6;
      if (walk && phase !== 0) {
        const forward = (k === 1) === (phase > 0); // braco oposto a perna
        len += (forward ? 1 : -1) * (view === 'up' ? -1 : 1);
      }
      const spans = [];
      for (let i = 0; i < len; i++) spans.push([torsoY + 1 + i, ax[k], ax[k] + 1]);
      const hand = { x: ax[k], y: torsoY + 1 + len, w: 2, h: 2 };
      P.arms.push(makePart(k ? 'armR' : 'armL', spans, 'arm', { front: true, hand, side: k ? 'r' : 'l' }));
    }
  }
  // Partes da mao (para luvas/aneis) seguem a caixa da mao.
  for (const a of P.arms) {
    const { x, y, w, h } = a.hand;
    const spans = [];
    for (let yy = y; yy < y + h; yy++) spans.push([yy, x, x + w - 1]);
    a.handPart = makePart(a.name + 'Hand', spans, a.tag, { back: a.back });
  }
  for (const l of P.legs) {
    const { x, y, w, h } = l.foot;
    const spans = [];
    for (let yy = y; yy < y + h; yy++) spans.push([yy, x, x + w - 1]);
    l.footPart = makePart(l.name + 'Foot', spans, 'main', { back: l.back });
  }
  // Mao que segura o item: direita do personagem (esquerda da tela) de frente.
  P.holdArm = view === 'side' ? P.arms[1] : view === 'down' ? P.arms[0] : P.arms[1];
  return P;
}
