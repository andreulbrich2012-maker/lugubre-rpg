// Cabelos gerados por especificacao: volume no topo x franja x comprimento x extra
// (rabo, coque, trancas, moicano...). Cada combinacao vira uma MASCARA de pixels por
// visao (frente, perfil olhando para a esquerda, costas) e depois e sombreada no estilo
// Stardew: luz do alto-esquerda, faixa de brilho no topo, mechas com vinco escuro e
// pontas mais escuras. drawBack pinta o que fica atras do corpo; drawFront o resto.
// Coordenadas relativas a caixa da cabeca (P.head 12x11).
import { W, H, idx } from '../skeleton.js';

// Linhas ocupadas pela cabeca (mesmos moldes do skeleton.js): dy -> [dxIni, dxFim]
const HEAD_FRONT = [[3, 8], [2, 9], [1, 10], [1, 10], [0, 11], [0, 11], [0, 11], [0, 11], [1, 10], [2, 9], [3, 8]];
const HEAD_SIDE = [[3, 8], [2, 9], [1, 10], [1, 10], [1, 11], [1, 11], [0, 11], [1, 11], [1, 10], [2, 10], [3, 8]];
const inHead = (tpl, dx, dy) => dy >= 0 && dy < 11 && dx >= tpl[dy][0] && dx <= tpl[dy][1];

// Fim das mechas por comprimento (dy relativo ao topo da cabeca; a cabeca acaba em 10).
const LEN_END = [4, 9, 13, 18, 22];

// Altura da franja (ultima linha coberta) por coluna da cabeca, de frente.
function fringeFront(type, dx) {
  switch (type) {
    case 'none': return dx <= 1 || dx >= 10 ? 4 : 1;
    // mechas pontudas: a cada 3-4 colunas uma ponta desce 1 px (franja de Stardew, nunca reta)
    case 'straight': return 3 + (dx % 4 === 1 ? 1 : 0) - (dx % 4 === 3 ? 1 : 0);
    case 'long': return 4 + (dx % 4 === 1 ? 1 : 0) - (dx % 4 === 3 ? 1 : 0);
    case 'part': return Math.round(1 + Math.abs(dx - 5.5) * 0.6) + (dx === 1 || dx === 10 ? 1 : 0);
    case 'side': return dx < 6 ? 4 : Math.max(1, Math.round(4 - (dx - 5) * 0.6));
    case 'spiky': return 3 + (dx % 3 === 1 ? 1 : 0) - (dx % 3 === 2 ? 1 : 0);
    case 'curtain': return Math.abs(dx - 5.5) > 3 ? 6 : Math.abs(dx - 5.5) > 2 ? 3 : 1;
    case 'mop': return dx <= 6 ? 6 : 3;
    default: return 3;
  }
}
// De perfil: dx 0..4 e a testa (rosto a esquerda).
function fringeSide(type, dx) {
  switch (type) {
    case 'none': return 1;
    case 'straight': return 3;
    case 'long': return 4;
    case 'part': return dx <= 2 ? 2 : 3;
    case 'side': return 4;
    case 'spiky': return 3 + (dx % 2);
    case 'curtain': return dx <= 1 ? 6 : 2;
    case 'mop': return 6;
    default: return 3;
  }
}

// ---------- mascaras ----------
// Devolve { front: Map(idx -> info), back: Map } onde info = { dy, lock, tex }:
// lock = mecha abaixo da cabeca (sombreada como fio solto); tex = textura especial.
function buildMasks(P, o, ctx) {
  const front = new Map();
  const back = new Map();
  const hx = P.head.x;
  const hy = P.head.y;
  const view = P.view;
  const capOff = Boolean(ctx?.under && !ctx.under.keepHair);
  const add = (m, dx, dy, info = {}) => {
    const x = hx + dx;
    const y = hy + dy;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    if (capOff && dy < 0) return; // chapeu por cima: some o volume acima da cabeca
    m.set(idx(x, y), { dy, dx, ...info });
  };
  const del = (m, dx, dy) => m.delete(idx(hx + dx, hy + dy));
  const len = o.len ?? 0;
  const end = LEN_END[len];
  const vol = o.vol ?? 1;
  const wav = (dy) => (o.wavy ? Math.round(Math.sin(dy * 0.9)) : 0);

  if (view === 'down') {
    // topo (volume acima da cabeca)
    const caps = [[], [[-1, 3, 8]], [[-1, 1, 10], [-2, 3, 8]], [[-1, 0, 11], [-2, 1, 10], [-3, 3, 8]]][vol] || [];
    for (const [dy, a, b] of caps) for (let dx = a; dx <= b; dx++) add(front, dx, dy);
    // por cima da cabeca ate a franja
    for (let dy = 0; dy < 11; dy++) {
      for (let dx = HEAD_FRONT[dy][0]; dx <= HEAD_FRONT[dy][1]; dx++) {
        const sideCol = dx <= 0 || dx >= 11;
        const sideLim = len === 0 ? 4 : Math.min(end, 10);
        if (dy <= fringeFront(o.fringe, dx) || (sideCol && dy <= sideLim)) add(front, dx, dy);
      }
    }
    // laterais fora da cabeca (cobre a orelha quando passa do queixo)
    const wide = vol >= 2 || len >= 1;
    if (wide) {
      for (let dy = vol >= 3 ? -1 : 1; dy <= (len >= 1 ? Math.min(end, 10) : 4); dy++) { add(front, -1, dy); add(front, 12, dy); }
      if (vol >= 3) for (let dy = 0; dy <= 7; dy++) { add(front, -2, dy); add(front, 13, dy); }
    }
    // mechas que descem pelos ombros (desenhadas por cima dos bracos)
    if (len >= 2) {
      for (let dy = 11; dy <= end; dy++) {
        const taper = dy >= end - 1 ? 1 : 0;
        const w = wav(dy);
        for (const dx of [-1, 0]) if (!(taper && dx === -1)) add(front, dx + w, dy, { lock: true });
        for (const dx of [11, 12]) if (!(taper && dx === 12)) add(front, dx + w, dy, { lock: true });
      }
      // massa atras das costas (aparece entre braco e tronco e embaixo)
      for (let dy = 4; dy <= end - 1; dy++) for (let dx = -1; dx <= 12; dx++) add(back, dx, dy, { lock: dy > 10 });
    }
  } else if (view === 'up') {
    const caps = [[], [[-1, 3, 8]], [[-1, 1, 10], [-2, 3, 8]], [[-1, 0, 11], [-2, 1, 10], [-3, 3, 8]]][vol] || [];
    for (const [dy, a, b] of caps) for (let dx = a; dx <= b; dx++) add(front, dx, dy);
    for (let dy = 0; dy < 11; dy++) {
      for (let dx = HEAD_FRONT[dy][0]; dx <= HEAD_FRONT[dy][1]; dx++) {
        if (len === 0 && dy >= 9 && (dx < 3 || dx > 8)) continue; // nuca curta
        add(front, dx, dy);
      }
    }
    if (vol >= 2 || len >= 1) for (let dy = vol >= 3 ? -1 : 1; dy <= Math.min(end, 10); dy++) { add(front, -1, dy); add(front, 12, dy); }
    if (vol >= 3) for (let dy = 0; dy <= 7; dy++) { add(front, -2, dy); add(front, 13, dy); }
    if (len >= 2) {
      for (let dy = 11; dy <= end; dy++) {
        const k = dy - 11;
        let a = len >= 3 ? 1 : 0;
        let b = 11 - a;
        if (dy >= end - 1) { a += 1; b -= 1; }
        const w = wav(dy);
        for (let dx = a; dx <= b; dx++) add(front, dx + w, dy, { lock: true, k });
      }
    }
  } else {
    // perfil (rosto para a esquerda)
    const caps = [[], [[-1, 3, 9]], [[-1, 1, 10], [-2, 3, 8]], [[-1, 0, 12], [-2, 1, 11], [-3, 3, 9]]][vol] || [];
    for (const [dy, a, b] of caps) for (let dx = a; dx <= b; dx++) add(front, dx, dy);
    for (let dy = 0; dy < 11; dy++) {
      for (let dx = HEAD_SIDE[dy][0]; dx <= HEAD_SIDE[dy][1]; dx++) {
        let lim;
        if (dx <= 4) lim = fringeSide(o.fringe, dx);
        else if (len === 0) lim = dx >= 9 ? 8 : dx >= 7 ? 5 : dx === 6 ? 7 : 4; // deixa a orelha a vista
        else lim = 10;
        if (o.fringe === 'none' && dx <= 4 && dy <= 2) lim = Math.max(lim, 2);
        if (dy <= lim) add(front, dx, dy);
      }
    }
    if (vol >= 2 || len >= 1) for (let dy = 1; dy <= Math.min(end, 9); dy++) add(front, 12, dy);
    if (vol >= 3) for (let dy = -1; dy <= 8; dy++) add(front, 13, dy);
    if (len >= 2) {
      for (let dy = 11; dy <= end; dy++) {
        const w = wav(dy);
        const a = dy >= end - 1 ? 9 : 8;
        for (let dx = a; dx <= 11; dx++) add(front, dx + w, dy, { lock: true });
      }
    }
  }

  // ---------- extras ----------
  const ex = o.extra || [];
  const tie = { tex: 'tie' };
  const has = (e) => ex.includes(e);
  const tail = (m, pts, info = {}) => pts.forEach(([dx, dy]) => add(m, dx, dy, { lock: true, ...info }));

  if (has('ponytail') || has('hightail') || has('braid')) {
    const hi = has('hightail');
    const long = has('braid') ? 19 : hi ? 15 : 12;
    const tex = has('braid') ? 'braid' : undefined;
    if (view === 'down') {
      // de frente so aparece a ponta saindo atras da cabeca
      for (let dy = hi ? 1 : 4; dy <= Math.min(long, 13); dy++) { add(back, 12, dy, { lock: true, tex }); add(back, 13, dy, { lock: true, tex }); }
    } else if (view === 'up') {
      const y0 = hi ? 1 : 4;
      add(front, 5, y0, tie); add(front, 6, y0, tie);
      for (let dy = y0 + 1; dy <= long; dy++) { add(front, 5, dy, { lock: true, tex }); add(front, 6, dy, { lock: true, tex }); if (dy < long - 2 && !tex) add(front, 7, dy, { lock: true }); }
    } else {
      const y0 = hi ? 1 : 4;
      add(front, 12, y0, tie);
      for (let dy = y0; dy <= long; dy++) {
        const dx = 13 + (dy > y0 + 2 && dy < long - 1 ? 1 : 0);
        add(front, dx, dy, { lock: true, tex }); add(front, dx - 1, dy + 1, { lock: true, tex });
      }
    }
  }
  if (has('bun') || has('topknot')) {
    const small = has('topknot');
    const pts = view === 'side'
      ? (small ? [[7, -2], [8, -2], [7, -1], [8, -1]] : [[7, -3], [8, -3], [6, -2], [7, -2], [8, -2], [9, -2], [7, -1], [8, -1], [9, -1]])
      : (small ? [[5, -2], [6, -2], [5, -3], [6, -3]] : [[5, -4], [6, -4], [4, -3], [5, -3], [6, -3], [7, -3], [4, -2], [5, -2], [6, -2], [7, -2]]);
    pts.forEach(([dx, dy]) => add(front, dx, dy, { tex: 'bun' }));
    if (view === 'side') add(front, small ? 7 : 8, 0, tie); else { add(front, 5, -1, tie); add(front, 6, -1, tie); }
  }
  if (has('lowbun')) {
    if (view === 'up') [[4, 8], [5, 8], [6, 8], [7, 8], [4, 9], [5, 9], [6, 9], [7, 9], [5, 10], [6, 10], [5, 11], [6, 11]].forEach(([dx, dy]) => add(front, dx, dy, { tex: 'bun' }));
    else if (view === 'side') [[11, 6], [12, 6], [11, 7], [12, 7], [13, 7], [11, 8], [12, 8], [13, 8], [12, 9]].forEach(([dx, dy]) => add(front, dx, dy, { tex: 'bun' }));
    else [[12, 7], [13, 7], [12, 8], [13, 8]].forEach(([dx, dy]) => add(back, dx, dy, { tex: 'bun' }));
  }
  if (has('halfup')) {
    // meio preso: coquinho pequeno atras do alto da cabeca
    if (view === 'up') [[5, 3], [6, 3], [4, 4], [5, 4], [6, 4], [7, 4]].forEach(([dx, dy]) => add(front, dx, dy, { tex: 'bun' }));
    else if (view === 'side') [[12, 2], [13, 2], [12, 3], [13, 3]].forEach(([dx, dy]) => add(front, dx, dy, { tex: 'bun' }));
  }
  if (has('spacebuns')) {
    for (const cx of [2, 9]) {
      const pts = view === 'side' ? (cx === 2 ? [] : [[8, -3], [9, -3], [8, -2], [9, -2], [10, -2], [9, -1]]) : [[cx, -3], [cx + 1, -3], [cx - 1, -2], [cx, -2], [cx + 1, -2], [cx + 2, -2], [cx, -1], [cx + 1, -1]];
      pts.forEach(([dx, dy]) => add(front, dx, dy, { tex: 'bun' }));
    }
  }
  if (has('pigtails')) {
    const sides = view === 'side' ? [[12, 13]] : [[-3, -2], [13, 14]];
    for (const [a, b] of sides) {
      add(front, view === 'side' ? 12 : a === -3 ? -1 : 12, 3, tie);
      for (let dy = 4; dy <= 12; dy++) {
        const narrow = dy >= 11;
        add(front, a, dy, { lock: true }); if (!narrow) add(front, b, dy, { lock: true });
      }
    }
  }
  if (has('twinbraids')) {
    const cols = view === 'down' ? [[0, 1], [10, 11]] : view === 'up' ? [[1, 2], [9, 10]] : [[5, 6]];
    for (const [a, b] of cols) {
      for (let dy = 8; dy <= 18; dy++) { add(front, a, dy, { lock: true, tex: 'braid' }); add(front, b, dy, { lock: true, tex: 'braid' }); }
      add(front, a, 19, tie); add(front, b, 19, tie);
    }
  }
  if (has('sidebraid')) {
    // tranca jogada por cima do ombro esquerdo (da tela)
    const cols = view === 'down' ? [[0, 1]] : view === 'up' ? [] : [[4, 5]];
    for (const [a, b] of cols) {
      for (let dy = 8; dy <= 19; dy++) { add(front, a, dy, { lock: true, tex: 'braid' }); add(front, b, dy, { lock: true, tex: 'braid' }); }
      add(front, a, 20, tie); add(front, b, 20, tie);
    }
    if (view === 'up') for (let dy = 8; dy <= 12; dy++) add(front, -1, dy, { lock: true, tex: 'braid' });
  }
  if (has('quiff')) {
    // topete: volume puxado para cima e para a frente
    const pts = view === 'side' ? [[0, -1], [1, -1], [2, -1], [3, -1], [1, -2], [2, -2], [3, -2], [2, -3], [-1, 0], [0, 0]] : [[2, -2], [3, -2], [4, -2], [5, -2], [6, -2], [3, -3], [4, -3], [5, -3], [4, -4]];
    pts.forEach(([dx, dy]) => add(front, dx, dy));
  }
  if (has('spikes')) {
    const tips = view === 'side' ? [[2, -2], [3, -3], [5, -2], [6, -3], [8, -2], [9, -3], [11, -1], [12, -1]] : [[1, -2], [2, -3], [4, -2], [5, -3], [7, -2], [8, -3], [10, -2], [11, -2]];
    tips.forEach(([dx, dy]) => add(front, dx, dy));
  }
  if (has('mohawk')) {
    // so a faixa do meio; o resto vira raspado (pontilhado na pele)
    for (const [i, info] of [...front]) {
      const keep = view === 'side' ? true : info.dx >= 4 && info.dx <= 7;
      if (!keep) front.delete(i);
    }
    if (view === 'side') {
      for (const [i, info] of [...front]) if (info.dy > 2 && info.dx < 9) front.delete(i);
      for (let dx = 1; dx <= 11; dx++) { add(front, dx, -1); if (dx >= 3 && dx <= 10) add(front, dx, -2); if (dx >= 5 && dx <= 8) add(front, dx, -3); }
    } else for (let dy = -3; dy <= (view === 'up' ? 10 : 1); dy++) for (let dx = 4; dx <= 7; dx++) if (dy >= -1 || (dx >= 5 && dx <= 6)) add(front, dx, dy);
  }
  if (has('tonsure')) {
    // coroa raspada no alto: so o anel em volta
    for (const [i, info] of [...front]) if (info.dy <= 3 && info.dx >= 2 && info.dx <= 9 && view !== 'side') front.delete(i);
    if (view === 'side') for (const [i, info] of [...front]) if (info.dy <= 2 && info.dx >= 1 && info.dx <= 9) front.delete(i);
  }
  if (has('dreads')) {
    // fios separados: tira colunas alternadas das mechas
    for (const m of [front, back]) for (const [i, info] of [...m]) if (info.lock && ((i % W) + (info.dy > 14 ? 1 : 0)) % 2 === 1 && m === front) m.delete(i);
  }
  if (has('curls')) {
    // borda de cachos: calombos para fora em volta da massa
    const extraCells = [];
    for (const [i, info] of front) {
      if (info.tex) continue;
      const x = i % W;
      const y = (i / W) | 0;
      for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, -1]]) {
        const j = idx(x + ddx, y + ddy);
        if (!front.has(j) && (x + y) % 3 === 0 && !inHead(view === 'side' ? HEAD_SIDE : HEAD_FRONT, info.dx + ddx, info.dy + ddy)) extraCells.push([info.dx + ddx, info.dy + ddy]);
      }
    }
    extraCells.forEach(([dx, dy]) => add(front, dx, dy, { lock: dy > 10 }));
  }
  return { front, back, hx, hy };
}

// Tom de cada pixel do cabelo: relevo pela vizinhanca + brilho + mechas.
function shadeAndPaint(L, P, m, o, opts = {}) {
  const has = (i) => m.has(i);
  const ys = [...m.keys()].map((i) => (i / W) | 0);
  const top = Math.min(...ys);
  const curls = (o.extra || []).includes('curls');
  for (const [i, info] of m) {
    const x = i % W;
    const y = (i / W) | 0;
    let s = 2;
    if (!has(i + 1) || !has(i + W)) s = 1;
    else if (!has(i - 1) || !has(i - W)) s = 3;
    if (info.tex === 'tie') { L.px(x, y, 'hair', 0); continue; }
    if (info.tex === 'braid') {
      // tranca: gomos em zigue-zague
      const k = (y + (x % 2)) % 3;
      s = k === 0 ? 3 : k === 1 ? 2 : 1;
      if (k === 0 && (x + y) % 2 === 0) s = 4;
    } else if (info.tex === 'bun') {
      if ((x + y) % 4 === 0) s = Math.min(4, s + 1);
    } else if (curls) {
      // cachos: degrade do topo (claro) para baixo (escuro) + cachinhos espalhados por hash,
      // cada um com brilho e a sombra logo abaixo (organico, sem padrao de grade)
      const rel = (y - top) / 14;
      s = rel < 0.25 ? 3 : rel < 0.6 ? 2 : 1;
      if (!has(i - 1) || !has(i - W)) s = Math.min(4, s + 1);
      if (!has(i + 1) || !has(i + W)) s = Math.max(0, s - 1);
      const hsh = (x * 73 + y * 151 + ((x * y) % 5)) % 7;
      const above = ((x * 73 + (y - 1) * 151 + ((x * (y - 1)) % 5)) % 7) === 0;
      if (hsh === 0) s = Math.min(4, s + 2);
      else if (above) s = Math.max(0, s - 1);
    } else {
      // faixa de brilho em arco acompanhando a curva da cabeca (mais forte a esquerda: luz do alto-esquerda)
      const band = y - top;
      const cx = x - P.head.x;
      const arc = cx <= 1 || cx >= 7 ? 2 : 1;
      if (band === arc && cx >= 0 && cx <= 8) s = cx >= 2 && cx <= 4 ? 4 : 3;
      else if (band === arc + 1 && cx >= 2 && cx <= 4) s = 3;
      // vinco entre as mechas da franja (separa os tufos)
      if (!info.lock && info.dy >= 1 && info.dy <= 6 && P.view !== 'up' && (cx % 4 === 3) && band > arc + 1) s = Math.max(0, s - 1);
      // mechas: vinco escuro vertical a cada 3-4 colunas nas partes que caem
      if (info.lock && (x + Math.floor(y / 5)) % 4 === 0) s = Math.max(0, s - 1);
      if (info.dy >= 2 && !info.lock && o.fringe !== 'none' && (x * 7) % 5 === 0 && y > top + 3) s = Math.max(1, s - 1);
      // ponta da mecha (ultimo pixel embaixo) mais escura
      if (info.lock && !has(i + W)) s = Math.min(s, 1);
    }
    if (opts.back) s = Math.max(0, s - 1);
    L.px(x, y, 'hair', s);
  }
  // pontas da franja recortadas: um pixel escuro na borda de baixo a cada duas colunas
  if (!opts.back && P.view !== 'up' && o.fringe && o.fringe !== 'none') {
    for (const [i, info] of m) {
      if (info.lock || info.dy < 1 || info.dy > 7) continue;
      const x = i % W;
      if (!has(i + W) && x % 2 === 0) L.px(x, ((i / W) | 0), 'hair', 1);
    }
  }
}

// Raspado/barba por fazer na cabeca: pontilhado escuro sobre a pele.
function stubble(L, P, region) {
  const tpl = P.view === 'side' ? HEAD_SIDE : HEAD_FRONT;
  for (let dy = 0; dy <= 8; dy++) {
    for (let dx = tpl[dy][0]; dx <= tpl[dy][1]; dx++) {
      if (!region(dx, dy)) continue;
      if ((dx + dy) % 2 === 0) L.px(P.head.x + dx, P.head.y + dy, 'hair', dy < 2 ? 2 : 1);
    }
  }
}

function makeHair(id, name, sub, o) {
  return {
    id, name, sub,
    drawBack(L, P, ctx) {
      const { back } = buildMasks(P, o, ctx);
      if (back.size) shadeAndPaint(L, P, back, o, { back: true });
    },
    drawFront(L, P, ctx) {
      const ex = o.extra || [];
      const side = P.view === 'side';
      // raspados primeiro (ficam por baixo da massa)
      if (o.buzz) stubble(L, P, (dx, dy) => (P.view === 'down' ? dy <= 3 || dx <= 0 || dx >= 11 : side ? dx >= 3 || dy <= 2 : true));
      if (ex.includes('mohawk')) stubble(L, P, (dx, dy) => (side ? dy > 2 && dx >= 3 && dx < 9 : (dx < 4 || dx > 7) && (P.view === 'up' || dy <= 4 || dx <= 0 || dx >= 11)));
      if (ex.includes('undercut') || ex.includes('halfshave')) {
        const half = ex.includes('halfshave');
        stubble(L, P, (dx, dy) => {
          if (side) return !half && dx >= 5 && dy >= 4 && dy <= 8;
          if (half) return dx <= 2 && dy >= 2;
          return (dx <= 1 || dx >= 10) && dy >= 3;
        });
      }
      if (o.bald) return;
      const { front } = buildMasks(P, o, ctx);
      if (ex.includes('undercut') && !side) for (const [i, info] of [...front]) if ((info.dx <= 1 || info.dx >= 10) && info.dy >= 3) front.delete(i);
      if (ex.includes('undercut') && side) for (const [i, info] of [...front]) if (info.dx >= 5 && info.dy >= 4) front.delete(i);
      if (ex.includes('halfshave') && P.view !== 'up') {
        for (const [i, info] of [...front]) if ((side ? false : info.dx <= 2) && info.dy >= 2) front.delete(i);
      }
      if (!front.size) return;
      // mechas abaixo da cabeca ficam por cima dos bracos (passada dos bracos)
      const locks = new Map();
      const main = new Map();
      for (const [i, info] of front) ((info.dy > 10 && P.view === 'down') ? locks : main).set(i, info);
      shadeAndPaint(L, P, main, o);
      if (locks.size) L.withTag('arm', () => shadeAndPaint(L, P, locks, o));
    }
  };
}

const C = 'Curtos', M = 'Médios', LG = 'Longos', PR = 'Presos', T = 'Tranças e dreads', E = 'Raspados e ousados';

export const HAIRS = [
  { id: 'careca', name: 'Careca', sub: C },
  makeHair('raspado', 'Raspado', E, { buzz: true, bald: true }),
  makeHair('curto', 'Curto', C, { len: 0, vol: 1, fringe: 'straight' }),
  makeHair('curto-repartido', 'Curto repartido', C, { len: 0, vol: 1, fringe: 'part' }),
  makeHair('curto-lateral', 'Curto de lado', C, { len: 0, vol: 1, fringe: 'side' }),
  makeHair('espetado', 'Espetado', C, { len: 0, vol: 2, fringe: 'spiky', extra: ['spikes'] }),
  makeHair('topete', 'Topete', C, { len: 0, vol: 1, fringe: 'none', extra: ['quiff'] }),
  makeHair('penteado-tras', 'Penteado para trás', C, { len: 0, vol: 1, fringe: 'none' }),
  makeHair('tigela', 'Corte tigela', C, { len: 0, vol: 2, fringe: 'long' }),
  makeHair('desgrenhado', 'Desgrenhado', C, { len: 0, vol: 2, fringe: 'spiky' }),
  makeHair('cacheado-curto', 'Cacheado curto', C, { len: 0, vol: 2, fringe: 'part', extra: ['curls'] }),
  makeHair('crespo-curto', 'Crespo curto', C, { len: 0, vol: 2, fringe: 'straight', extra: ['curls'] }),
  makeHair('curto-rente', 'Curto rente', C, { len: 0, vol: 0, fringe: 'straight' }),
  makeHair('moicano', 'Moicano', E, { len: 0, vol: 1, fringe: 'none', extra: ['mohawk'] }),
  makeHair('undercut', 'Undercut', E, { len: 0, vol: 2, fringe: 'side', extra: ['undercut'] }),
  makeHair('tonsura', 'Tonsura', E, { len: 0, vol: 0, fringe: 'straight', extra: ['tonsure'] }),
  makeHair('coque-samurai', 'Coque samurai', PR, { len: 0, vol: 0, fringe: 'none', extra: ['topknot', 'undercut'] }),
  makeHair('meio-raspado', 'Meio raspado', E, { len: 1, vol: 1, fringe: 'side', extra: ['halfshave'] }),
  makeHair('moicano-espetado', 'Moicano espetado', E, { len: 0, vol: 1, fringe: 'none', extra: ['mohawk', 'spikes'] }),
  makeHair('chanel', 'Chanel', M, { len: 1, vol: 1, fringe: 'straight' }),
  makeHair('chanel-repartido', 'Chanel repartido', M, { len: 1, vol: 1, fringe: 'part' }),
  makeHair('cortina', 'Cortina', M, { len: 1, vol: 1, fringe: 'curtain' }),
  makeHair('franja-no-olho', 'Franja no olho', M, { len: 1, vol: 1, fringe: 'mop' }),
  makeHair('medio-ondulado', 'Médio ondulado', M, { len: 1, vol: 1, fringe: 'side', wavy: true }),
  makeHair('medio-cacheado', 'Médio cacheado', M, { len: 1, vol: 2, fringe: 'part', extra: ['curls'] }),
  makeHair('medio-desgrenhado', 'Médio desgrenhado', M, { len: 1, vol: 2, fringe: 'spiky' }),
  makeHair('franja-lateral', 'Franja lateral', M, { len: 1, vol: 2, fringe: 'side' }),
  makeHair('afro', 'Afro', M, { len: 1, vol: 3, fringe: 'straight', extra: ['curls'] }),
  makeHair('medio-tras', 'Médio para trás', M, { len: 1, vol: 1, fringe: 'none' }),
  makeHair('ombro-liso', 'Liso no ombro', M, { len: 2, vol: 1, fringe: 'straight' }),
  makeHair('ombro-ondulado', 'Ondulado no ombro', M, { len: 2, vol: 1, fringe: 'side', wavy: true }),
  makeHair('ombro-cacheado', 'Cacheado no ombro', M, { len: 2, vol: 2, fringe: 'part', extra: ['curls'] }),
  makeHair('juba', 'Juba', M, { len: 2, vol: 3, fringe: 'spiky', wavy: true }),
  makeHair('longo-liso', 'Longo liso', LG, { len: 3, vol: 1, fringe: 'straight' }),
  makeHair('longo-repartido', 'Longo repartido', LG, { len: 3, vol: 1, fringe: 'part' }),
  makeHair('longo-lateral', 'Longo de lado', LG, { len: 3, vol: 1, fringe: 'side' }),
  makeHair('longo-ondulado', 'Longo ondulado', LG, { len: 3, vol: 1, fringe: 'part', wavy: true }),
  makeHair('longo-cacheado', 'Longo cacheado', LG, { len: 3, vol: 2, fringe: 'part', extra: ['curls'] }),
  makeHair('longo-cortina', 'Longo cortina', LG, { len: 3, vol: 1, fringe: 'curtain' }),
  makeHair('longo-franja-olho', 'Longo com franja no olho', LG, { len: 3, vol: 1, fringe: 'mop' }),
  makeHair('longo-tras', 'Longo para trás', LG, { len: 3, vol: 1, fringe: 'none' }),
  makeHair('longuissimo', 'Longuíssimo', LG, { len: 4, vol: 1, fringe: 'part' }),
  makeHair('longuissimo-franja', 'Longuíssimo com franja', LG, { len: 4, vol: 1, fringe: 'straight' }),
  makeHair('longo-volumoso', 'Longo volumoso', LG, { len: 3, vol: 2, fringe: 'side', wavy: true }),
  makeHair('meio-preso', 'Meio preso', PR, { len: 3, vol: 1, fringe: 'part', extra: ['halfup'] }),
  makeHair('rabo-curto', 'Rabo curto', PR, { len: 0, vol: 1, fringe: 'none', extra: ['ponytail'] }),
  makeHair('rabo-de-cavalo', 'Rabo de cavalo', PR, { len: 0, vol: 1, fringe: 'part', extra: ['hightail'] }),
  makeHair('rabo-com-franja', 'Rabo com franja', PR, { len: 0, vol: 1, fringe: 'straight', extra: ['ponytail'] }),
  makeHair('maria-chiquinha', 'Maria-chiquinha', PR, { len: 0, vol: 1, fringe: 'straight', extra: ['pigtails'] }),
  makeHair('coquinhos', 'Coquinhos', PR, { len: 0, vol: 1, fringe: 'part', extra: ['spacebuns'] }),
  makeHair('coque-alto', 'Coque alto', PR, { len: 0, vol: 1, fringe: 'none', extra: ['bun'] }),
  makeHair('coque-baixo', 'Coque baixo', PR, { len: 0, vol: 1, fringe: 'part', extra: ['lowbun'] }),
  makeHair('coque-com-franja', 'Coque com franja', PR, { len: 0, vol: 1, fringe: 'straight', extra: ['bun'] }),
  makeHair('tranca-unica', 'Trança única', T, { len: 0, vol: 1, fringe: 'part', extra: ['braid'] }),
  makeHair('duas-trancas', 'Duas tranças', T, { len: 0, vol: 1, fringe: 'straight', extra: ['twinbraids'] }),
  makeHair('tranca-lateral', 'Trança de lado', T, { len: 1, vol: 1, fringe: 'side', extra: ['sidebraid'] }),
  makeHair('dreads-medios', 'Dreads médios', T, { len: 2, vol: 2, fringe: 'spiky', extra: ['dreads'] }),
  makeHair('dreads-longos', 'Dreads longos', T, { len: 3, vol: 2, fringe: 'none', extra: ['dreads'] }),
  makeHair('dreads-presos', 'Dreads presos', T, { len: 0, vol: 2, fringe: 'none', extra: ['dreads', 'bun'] })
];
