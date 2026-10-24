// Cabeca: chapeus, elmos, capuzes, coroas e enfeites de cabelo.
// Tudo e desenhado em coordenadas RELATIVAS a caixa da cabeca (P.head 12x11):
// coluna 0..11 = largura da cabeca, linha 0 = topo da cabeca. Assim o chapeu
// acompanha o bob do andar e a altura do personagem sem desenho extra.
// De costas ('up') a arte e espelhada: o que pende para a direita de frente
// pende para a esquerda de costas, como um objeto de verdade.
// Canais: a = corpo da peca (feltro, metal, tecido), b = faixa/detalhe,
// c = metal/gema/enfeite. Legenda da arte: '0'-'4' canal a, 'a'-'e' canal b,
// 'A'-'E' canal c (tom 0..4).
const LG = {
  w: ['w', 4], W: ['w', 3], z: ['w', 2], Z: ['w', 1],
  g: ['#6faa4a', 3], G: ['#4f8238', 2], h: ['#3a6a30', 1], // folhas fixas
  r: ['#e05a5a', 3], R: ['#b03a4a', 2], y: ['#f4d06a', 4], Y: ['#e0a03a', 2],
  k: ['#3a2a3a', 0] // furo/fresta escura (nunca preto puro)
};
for (let i = 0; i < 5; i++) { LG[i] = ['a', i]; LG['abcde'[i]] = ['b', i]; LG['ABCDE'[i]] = ['c', i]; }

const up = (P) => P.view === 'up';
const X = (P, c) => P.head.x + (up(P) ? 11 - c : c);
const Y = (P, r) => P.head.y + r;
// escolhe a variante da visao: frente, perfil (olhando para a esquerda), costas
const V = (P, d, s, u = d) => (P.view === 'side' ? s : P.view === 'up' ? u : d);

// Arte em texto relativa a cabeca (espelhada de costas).
function art(L, P, c, r, rows) {
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
    const v = LG[ch];
    if (v) L.px(X(P, c + dx), Y(P, r + dy), v[0], v[1]);
  }));
}
function dot(L, P, c, r, ch, s) { L.px(X(P, c), Y(P, r), ch, s); }

// Forma macica com relevo de luz do alto-esquerda: borda de cima/esquerda clara,
// direita/baixo escura, miolo com gradiente horizontal. rows = [[c0,c1]] por linha.
// Devolve as celulas (para faixas e texturas por cima).
function shape(L, P, r0, rows, ch = 'a', o = {}) {
  const cells = new Set();
  const key = (x, y) => y * 64 + x;
  rows.forEach((sp, i) => {
    if (!sp) return;
    for (let c = sp[0]; c <= sp[1]; c++) cells.add(key(X(P, c), Y(P, r0 + i)));
  });
  let minX = 99, maxX = -99;
  for (const k of cells) { const x = k % 64; minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
  const w = Math.max(1, maxX - minX);
  const has = (x, y) => cells.has(key(x, y));
  for (const k of cells) {
    const x = k % 64, y = (k / 64) | 0;
    const T = !has(x, y - 1), B = !has(x, y + 1), Lf = !has(x - 1, y), R = !has(x + 1, y);
    let t;
    if (T && B) t = Lf ? 3 : R ? 1 : 2; // linha de 1px: fica clara, nao some no contorno
    else if (R || B) t = 1;
    else if (T || Lf) t = 3;
    else { const f = (x - minX) / w; t = f < 0.3 ? 3 : f > 0.72 ? 1 : 2; }
    if (o.shine && T && !Lf && (x - minX) / w < 0.35 && !B) t = 4;
    L.px(x, y, ch, t + (o.ds || 0));
  }
  return cells;
}
// Troca o canal das linhas r0..r1 (faixa do chapeu), mantendo o tom do relevo.
function band(L, P, r0, r1, ch = 'b', ds = 0) {
  for (let r = r0; r <= r1; r++) for (let c = -6; c <= 17; c++) {
    const p = L.get(X(P, c), Y(P, r));
    if (p && p.c === 'a') { p.c = ch; p.s = Math.max(0, Math.min(4, p.s + ds)); }
  }
}
// Textura: escurece 1 tom num padrao (palha, tricot, fios).
function texture(L, P, r0, r1, fn, ds = -1) {
  for (let r = r0; r <= r1; r++) for (let c = -6; c <= 17; c++) {
    if (!fn(c, r)) continue;
    const p = L.get(X(P, c), Y(P, r));
    if (p && p.c === 'a' && p.s > 0 && p.s < 4) p.s += ds;
  }
}
function erase(L, P, r, c0, c1) { for (let c = c0; c <= c1; c++) L.erase(X(P, c), Y(P, r)); }

// Aba: 'thick' = 2 linhas (face de cima clara + beirada escura);
// 'back' = parte de tras da aba aparecendo dos lados da copa (visao 3/4).
function brim(L, P, r, c0, c1, { thick = true, back = false, ch = 'a' } = {}) {
  if (P.view === 'side') { c0 -= 1; c1 -= 1; back = false; }
  if (back) shape(L, P, r - 1, [[c0 + 1, c1 - 1]], ch, { ds: -1 });
  return shape(L, P, r, thick ? [[c0, c1], [c0 + 1, c1 - 1]] : [[c0, c1]], ch);
}

// Fabrica de chapeu: copa (linhas da base para cima terminando em by-1), aba
// e faixa. Os detalhes de cada modelo vem em 'deco'.
function hat({ by = 2, crown, brim: bm, band: bd, deco, pre, crownSide }) {
  return (L, P, ctx) => {
    pre?.(L, P, ctx);
    if (bm && bm.back && P.view !== 'side') shape(L, P, by - 1, [[bm.c0 + 1, bm.c1 - 1]], 'a', { ds: -1 });
    const rows = P.view === 'side' && crownSide ? crownSide : crown;
    shape(L, P, by - rows.length, rows, 'a', { shine: true });
    if (bd) band(L, P, by - bd, by - 1, 'b');
    if (bm) brim(L, P, by, bm.c0, bm.c1, { thick: bm.thick !== false });
    deco?.(L, P, ctx);
  };
}

// Capuz: cobre a cabeca inteira (+1px de folga) e deixa so a abertura do rosto.
const HOOD_FRONT = [[2, 9], [1, 10], [0, 11], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [0, 11]];
const HOOD_SIDE = [[3, 10], [1, 11], [0, 12], [-1, 12], [-1, 13], [-1, 13], [-1, 13], [-1, 13], [-1, 13], [-1, 13], [-1, 13], [0, 13], [2, 13], [3, 12]];
function hood(L, P, { peak = 0, closed = false, drape = true } = {}) {
  const r0 = -1;
  const front = HOOD_FRONT.slice(0, drape ? 14 : 12), side = HOOD_SIDE.slice(0, drape ? 14 : 12);
  const rows = V(P, front, side);
  const extra = [];
  for (let i = peak; i > 0; i--) extra.push(V(P, [5 - Math.floor(i / 2), 6 + Math.floor(i / 2)], [7 + i, 10 + i]));
  if (extra.length) shape(L, P, r0 - extra.length, [...extra, ...rows], 'a', { shine: true });
  else shape(L, P, r0, rows, 'a', { shine: true });
  if (closed || P.view === 'up') return;
  // abertura do rosto, com a borda de dentro sombreada (fundo do capuz)
  const open = V(P, [[3, 8], [2, 9], [1, 10], [1, 10], [1, 10], [1, 10], [2, 9], [3, 8]], [[-1, 2], [-1, 3], [-1, 4], [-1, 4], [-1, 4], [-1, 4], [-1, 3], [-1, 2]]);
  open.forEach(([c0, c1], i) => erase(L, P, 3 + i, c0, c1));
  for (const [c, r] of V(P, [[3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [2, 3], [9, 3], [1, 4], [10, 4]], [[0, 2], [1, 2], [2, 2], [3, 3], [4, 4], [5, 5], [5, 6], [5, 7], [4, 8]])) {
    const p = L.get(X(P, c), Y(P, r));
    if (p) p.s = Math.max(0, p.s - 2);
  }
}

// Elmo: calota de metal ate a testa, com aro (rim) e rebites.
function helmDome(L, P, rim = 3) {
  const rows = V(P,
    [[3, 8], [1, 10], [0, 11], [0, 11], [-1, 12]].slice(0, rim + 2),
    [[3, 9], [1, 11], [0, 12], [0, 12], [-1, 12]].slice(0, rim + 2));
  shape(L, P, -1, rows, 'a', { shine: true });
  band(L, P, rim, rim, 'b');
  for (const c of V(P, [0, 3, 8, 11], [1, 5, 9], [0, 3, 8, 11])) dot(L, P, c, rim, 'c', 3);
}

// Coroa/aro fino na altura da testa, seguindo a curva da cabeca.
function circlet(L, P, r, ch = 'c') {
  const sp = V(P, [-1, 12], [0, 12]);
  const rows = [sp];
  shape(L, P, r, rows, ch);
}

const ch3 = (a, la, b, lb, c, lc) => [{ label: la, def: a }, { label: lb, def: b }, { label: lc, def: c }];

function mk(id, name, sub, channels, draw, extra = {}) {
  return { id, name, sub, channels, draw, ...extra };
}

export const HEADWEAR = [
  // ================= Chapeus =================
  mk('chapeu-palha', 'Chapéu de palha', 'Chapéus', ch3('ocre', 'Palha', 'carmesim', 'Fita', 'ouro', 'Detalhe'), hat({
    crown: [[3, 8], [2, 9], [1, 10], [1, 10]], band: 1, brim: { c0: -3, c1: 14, back: true },
    deco: (L, P) => {
      // trama da palha: diagonais alternadas leem como fibra trancada
      texture(L, P, -2, 3, (c, r) => (c + r * 2) % 4 === 0);
      if (P.view !== 'down') { dot(L, P, V(P, 0, 11, 9), 1, 'b', 3); dot(L, P, V(P, 0, 12, 10), 2, 'b', 2); dot(L, P, V(P, 0, 12, 10), 3, 'b', 1); }
    }
  })),
  mk('chapeu-bruxa', 'Chapéu de bruxa', 'Chapéus', ch3('ameixa', 'Feltro', 'arcano', 'Faixa', 'ouro', 'Fivela'), hat({
    crown: [[9, 11], [7, 9], [5, 9], [4, 9], [2, 10], [1, 10]], band: 1, brim: { c0: -3, c1: 14, back: true },
    crownSide: [[10, 12], [8, 10], [6, 10], [4, 10], [2, 11], [1, 11]],
    deco: (L, P) => {
      if (P.view === 'down') art(L, P, 4, 1, ['BCDC']);
      if (P.view === 'side') art(L, P, 2, 1, ['CDC']);
      // vinco do feltro: a ponta dobrada tem uma sombra
      dot(L, P, V(P, 7, 8), -2, 'a', 1);
    }
  })),
  mk('chapeu-mago', 'Chapéu de mago', 'Chapéus', ch3('azul-noite', 'Feltro', 'anil', 'Aba', 'ouro', 'Estrelas'), hat({
    crown: [[5, 6], [4, 7], [4, 7], [3, 8], [2, 9], [1, 10]], brim: { c0: -1, c1: 12 },
    deco: (L, P) => {
      band(L, P, 2, 3, 'b');
      for (const [c, r] of V(P, [[4, -1], [6, -3], [5, 1], [8, 0], [3, 0]], [[4, -1], [6, -3], [7, 0], [3, 0]], [[5, -2], [7, 0], [3, 1]])) dot(L, P, c, r, 'c', 4);
      dot(L, P, 5, -5, 'c', 4); dot(L, P, 6, -5, 'c', 3);
    }
  })),
  mk('chapeu-aba-larga', 'Chapéu de aba larga', 'Chapéus', ch3('carvao', 'Feltro', 'vinho', 'Faixa', 'prata', 'Fivela'), hat({
    crown: [[2, 9], [1, 10], [1, 10], [1, 10]], band: 2, brim: { c0: -4, c1: 15, back: true },
    deco: (L, P) => {
      dot(L, P, 5, -2, 'a', 1); dot(L, P, 6, -2, 'a', 1); // vinco no topo da copa
      if (P.view === 'down') art(L, P, 7, 0, ['DC', 'CB']);
      if (P.view === 'side') art(L, P, 1, 0, ['DC', 'CB']);
    }
  })),
  mk('chapeu-viajante', 'Chapéu de viajante', 'Chapéus', ch3('couro', 'Couro', 'couro-escuro', 'Faixa', 'osso', 'Detalhe'), hat({
    crown: [[3, 8], [2, 9], [1, 10]], band: 1,
    deco: (L, P) => {
      // aba mole: cai na frente e levanta dos lados
      shape(L, P, 2, V(P, [[-2, 13], [0, 11], [3, 8]], [[-3, 12], [-3, 2]], [[-2, 13], [0, 11]]));
      dot(L, P, -2, 1, 'a', 3); dot(L, P, 13, 1, 'a', 1);
      if (P.view === 'side') { dot(L, P, 12, 1, 'a', 1); }
      // dente de animal pendurado na faixa
      if (P.view !== 'up') art(L, P, V(P, 8, 9), 1, ['C', 'D']);
    }
  })),
  mk('tricorne', 'Tricorne', 'Chapéus', ch3('azul-noite', 'Feltro', 'ouro', 'Galão', 'carmesim', 'Laço'), hat({
    crown: [[3, 8], [2, 9], [1, 10]],
    deco: (L, P) => {
      if (P.view === 'side') {
        shape(L, P, -1, [[11, 12], [10, 12], [-2, 12], [-1, 9]]);
        art(L, P, -2, 1, ['bb']); art(L, P, 11, -1, ['bb']);
        return;
      }
      // tres pontas: as abas viradas para cima formam o triangulo
      shape(L, P, -1, [[-2, -1], [-2, 0], [-2, 13], [-1, 12], [3, 8], [5, 6]]);
      shape(L, P, -1, [[12, 13], [11, 13]]);
      art(L, P, -2, -1, ['b.............b']);
      art(L, P, -2, 1, ['bb..........bb']);
      art(L, P, 3, 3, ['bbbbbb']);
      if (P.view === 'down') art(L, P, 7, 1, ['Cd', 'CC']);
    }
  })),
  mk('boina', 'Boina', 'Chapéus', ch3('vinho', 'Lã', 'couro-escuro', 'Debrum', 'carvao', 'Pino'), (L, P) => {
    // disco caido para um lado: a boina tem volume deslocado
    shape(L, P, -1, V(P, [[2, 10], [0, 12], [-1, 13], [0, 11]], [[3, 11], [1, 13], [0, 13], [0, 11]]), 'a', { shine: true });
    band(L, P, 2, 2, 'b');
    dot(L, P, V(P, 4, 6), -2, 'c', 3);
    dot(L, P, 10, 1, 'a', 0); dot(L, P, 11, 0, 'a', 1);
  }),
  mk('gorro-la', 'Gorro de lã', 'Chapéus', ch3('mostarda', 'Lã', 'carmesim', 'Barra', 'branco-gasto', 'Pompom'), (L, P) => {
    shape(L, P, -2, [[3, 8], [1, 10], [0, 11], [0, 11]], 'a', { shine: true });
    shape(L, P, 2, [[-1, 12], [-1, 12]], 'b');
    // tricot: colunas alternadas; barra canelada
    texture(L, P, -1, 1, (c, r) => c % 2 === 0 && r !== -2);
    for (let c = -1; c <= 12; c += 2) { const p = L.get(X(P, c), Y(P, 3)); if (p) p.s = Math.max(0, p.s - 1); }
    art(L, P, 5, -4, ['DC', 'CB']);
  }),
  mk('gorro-dormir', 'Gorro listrado de dormir', 'Chapéus', ch3('azul-aco', 'Tecido', 'branco-gasto', 'Listras', 'branco-gasto', 'Pompom'), (L, P) => {
    shape(L, P, -1, [[2, 9], [1, 10], [0, 11]], 'a', { shine: true });
    // ponta mole que cai para o lado e balanca ao andar
    const sw = P.walk ? P.phase : 0;
    shape(L, P, -3, [[8, 10], [9, 11], [10, 12], null, null], 'a');
    shape(L, P, -1, [[12, 13], [12 + (sw > 0 ? 1 : 0), 13 + (sw > 0 ? 1 : 0)]], 'a', { ds: -1 });
    art(L, P, 12 + (sw > 0 ? 1 : 0), 1, ['DC', 'CB']);
    band(L, P, 0, 0, 'b'); band(L, P, -2, -2, 'b');
    shape(L, P, 2, [[-1, 12]], 'b');
  }),
  mk('chapeu-cacador', 'Chapéu de caçador', 'Chapéus', ch3('floresta', 'Feltro', 'couro', 'Faixa', 'carmesim', 'Pena'), hat({
    crown: [[4, 7], [3, 9], [2, 10], [1, 10]], band: 1, brim: { c0: -1, c1: 12 },
    crownSide: [[6, 8], [4, 10], [2, 11], [1, 12]],
    deco: (L, P) => {
      // aba com bico na frente e pena comprida
      if (P.view === 'down') art(L, P, 5, 4, ['10']);
      if (P.view === 'side') { dot(L, P, -3, 3, 'a', 2); dot(L, P, 11, 1, 'a', 3); }
      art(L, P, V(P, 9, 9), -4, ['....D', '...dC', '..dc.', '.dc..', 'cB...']);
    }
  })),
  mk('cartola', 'Cartola', 'Chapéus', ch3('carvao', 'Feltro', 'vinho', 'Fita', 'prata', 'Fivela'), hat({
    crown: [[2, 9], [2, 9], [2, 9], [2, 9], [2, 9], [2, 9]], band: 2, brim: { c0: -1, c1: 12 },
    deco: (L, P) => {
      // tampa vista de cima: elipse clara
      shape(L, P, -4, [[3, 8]], 'a', { ds: 1 });
      band(L, P, 1, 1, 'a', 0);
      for (let c = 2; c <= 9; c++) { const p = L.get(X(P, c), Y(P, 1)); if (p && p.c === 'b') p.c = 'a'; }
      if (P.view !== 'side') { dot(L, P, -1, 1, 'a', 3); dot(L, P, 12, 1, 'a', 1); }
      if (P.view === 'down') art(L, P, 7, 0, ['D']);
    }
  })),
  mk('chapeu-coco', 'Chapéu-coco', 'Chapéus', ch3('couro-escuro', 'Feltro', 'carvao', 'Fita', 'bronze', 'Detalhe'), hat({
    crown: [[3, 8], [2, 9], [1, 10], [1, 10]], band: 1, brim: { c0: 0, c1: 11, thick: false },
    deco: (L, P) => { if (P.view !== 'side') { dot(L, P, -1, 1, 'a', 3); dot(L, P, 12, 1, 'a', 1); } else dot(L, P, -2, 1, 'a', 3); }
  })),
  mk('chapeu-cozinheiro', 'Chapéu de cozinheiro', 'Chapéus', ch3('branco-gasto', 'Tecido', 'linho', 'Pregas', 'carmesim', 'Lenço'), (L, P) => {
    // topo fofo de varios gomos, faixa pregueada
    shape(L, P, -6, [[2, 4], [1, 10], [0, 11], [0, 11], [1, 10]], 'a', { shine: true });
    dot(L, P, 7, -6, 'a', 3); dot(L, P, 8, -6, 'a', 2); dot(L, P, 9, -6, 'a', 2);
    for (const c of [3, 7]) dot(L, P, c, -3, 'a', 1);
    shape(L, P, -1, [[1, 10], [1, 10], [1, 10]], 'b');
    for (let c = 2; c <= 9; c += 2) for (let r = -1; r <= 1; r++) { const p = L.get(X(P, c), Y(P, r)); if (p) p.s = Math.max(0, p.s - 1); }
  }),
  mk('capelo', 'Capelo de erudito', 'Chapéus', ch3('carvao', 'Tecido', 'ouro', 'Borla', 'ouro', 'Botão'), (L, P) => {
    shape(L, P, 0, V(P, [[1, 10], [1, 10]], [[1, 11], [1, 11]]), 'a');
    // tabuleiro quadrado visto em 3/4 (losango achatado)
    shape(L, P, -3, V(P, [[2, 9], [-1, 12], [1, 10]], [[0, 12], [-1, 11], [1, 10]]), 'a', { ds: 1, shine: true });
    dot(L, P, 5, -3, 'c', 4);
    art(L, P, 6, -3, V(P, ['bbbbb', '....d', '....c', '....c', '....b'], ['bbbbbb', '.....d', '.....c', '.....c', '.....b'], ['bbbbb', '....d', '....c', '....c', '....b']));
  }),
  mk('chapeu-conico', 'Chapéu cônico de palha', 'Chapéus', ch3('linho', 'Palha', 'couro', 'Tira', 'madeira', 'Ponta'), (L, P) => {
    shape(L, P, -3, [[5, 6], [3, 8], [1, 10], [-1, 12], [-3, 14]], 'a', { shine: true });
    // costelas radiais da palha
    texture(L, P, -2, 1, (c, r) => c === 5 - (r + 3) * 1 || c === 6 + (r + 3) * 1 || c === 5 || (c + r) % 5 === 0);
    dot(L, P, 5, -4, 'c', 3);
    // tira de couro passando por baixo do queixo
    if (P.view !== 'up') for (let r = 2; r <= 9; r++) { dot(L, P, V(P, -1, 6), r, 'b', 1); if (P.view === 'down') dot(L, P, 12, r, 'b', 1); }
  }),
  mk('chapeu-bobo', 'Chapéu de bobo da corte', 'Chapéus', ch3('carmesim', 'Lado 1', 'mostarda', 'Lado 2', 'ouro', 'Guizos'), (L, P) => {
    shape(L, P, -1, [[2, 9], [1, 10], [0, 11], [0, 11]], 'a', { shine: true });
    // metade de cada cor, como o arlequim
    for (let r = -1; r <= 2; r++) for (let c = 6; c <= 11; c++) { const p = L.get(X(P, c), Y(P, r)); if (p) p.c = 'b'; }
    // duas pontas moles caindo dos lados, com guizo na ponta
    if (P.view === 'side') { art(L, P, 8, -3, ['.33.', '2..3', '....2', '....b', '....E']); dot(L, P, 13, 1, 'c', 2); }
    else {
      art(L, P, -3, -3, ['..32', '.3..', '2...', '2...', 'E...', 'C...']);
      art(L, P, 10, -3, ['dc..', '..c.', '...b', '...b', '...E', '...C']);
    }
    art(L, P, -1, 3, V(P, ['ED.DD.DD.DD.DC'], ['ED.DD.DD.DD.D']));
  }),

  // ================= Elmos =================
  mk('elmo-aberto', 'Elmo aberto', 'Elmos', ch3('ferro', 'Metal', 'bronze', 'Aro', 'aco', 'Rebites'), (L, P) => {
    helmDome(L, P);
    // protetor de nariz e de bochechas (de costas: protetor de nuca)
    if (P.view === 'down') { shape(L, P, 4, [[5, 6], [5, 6], [5, 6]], 'a'); shape(L, P, 4, [[-1, 0], [-1, 0], [-1, 0], [0, 0]], 'a'); shape(L, P, 4, [[11, 12], [11, 12], [11, 12], [11, 11]], 'a'); }
    if (P.view === 'side') { shape(L, P, 4, [[-1, 0], [-1, 0]], 'a'); shape(L, P, 4, [[5, 7], [5, 7], [5, 6]], 'a'); shape(L, P, 4, [[10, 12], [10, 12], [11, 12]], 'a'); }
    if (P.view === 'up') shape(L, P, 4, [[-1, 12], [0, 11], [1, 10]], 'a');
  }),
  mk('elmo-fechado', 'Elmo fechado', 'Elmos', ch3('aco', 'Metal', 'carmesim', 'Detalhe', 'bronze', 'Rebites'), (L, P) => {
    shape(L, P, -1, V(P,
      [[3, 8], [1, 10], [0, 11], [0, 11], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [0, 11], [1, 10], [2, 9]],
      [[3, 9], [1, 11], [0, 12], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [0, 12], [1, 11], [2, 10]]), 'a', { shine: true });
    if (P.view === 'down') {
      // fresta da viseira e respiros: o rosto some, so a sombra dos olhos
      art(L, P, 0, 6, ['kkkkk..kkkkk']);
      art(L, P, 2, 8, ['k.k...k.k']);
      for (let r = 0; r <= 9; r++) { dot(L, P, 5, r, 'a', r < 5 ? 4 : 3); }
      for (const [c, r] of [[0, 3], [11, 3], [0, 9], [11, 9]]) dot(L, P, c, r, 'c', 3);
      art(L, P, 1, 10, ['bbbbbbbbbb']);
    } else if (P.view === 'side') {
      art(L, P, -1, 6, ['kkkkkk']);
      art(L, P, 0, 8, ['k.k']);
      for (const [c, r] of [[7, 3], [10, 6], [7, 9]]) dot(L, P, c, r, 'c', 3);
      art(L, P, 0, 10, ['bbbbbbbbbbbbb']);
    } else {
      for (let r = 0; r <= 9; r++) dot(L, P, 5, r, 'a', 3);
      art(L, P, 0, 10, ['bbbbbbbbbbbb']);
    }
  }, { hides: ['hair'] }),
  mk('elmo-chifres', 'Elmo de chifres', 'Elmos', ch3('ferro-negro', 'Metal', 'couro', 'Aro', 'osso', 'Chifres'), (L, P) => {
    helmDome(L, P);
    if (P.view === 'side') { art(L, P, 2, -4, ['DD..', 'C.D.', '..CD', '..BC']); return; }
    // chifres curvos saindo dos lados para cima
    art(L, P, -4, -4, ['D...', 'D...', 'CD..', '.CCD', '..BC']);
    art(L, P, 12, -4, ['...C', '...C', '..CB', 'CCB.', 'BB..']);
  }),
  mk('elmo-alado', 'Elmo alado', 'Elmos', ch3('prata', 'Metal', 'ouro', 'Aro', 'branco-gasto', 'Asas'), (L, P) => {
    helmDome(L, P);
    for (let r = -1; r <= 2; r++) dot(L, P, 5, r, 'b', r < 1 ? 4 : 3);
    if (P.view === 'side') { art(L, P, 9, -3, ['.EDC', 'EDDC', '.DCB', '..CB']); return; }
    // asas de penas: cada fileira mais curta, tons descendo
    art(L, P, -4, -2, ['ED..', 'EDD.', '.DCD', '..CC']);
    art(L, P, 12, -2, ['..DC', '.DCB', 'DCB.', 'CB..']);
  }),
  mk('gorro-couro', 'Gorro de couro', 'Elmos', ch3('couro', 'Couro', 'camurca', 'Costura', 'bronze', 'Fivelas'), (L, P) => {
    shape(L, P, -1, V(P, [[3, 8], [1, 10], [0, 11], [0, 11], [-1, 12]], [[3, 9], [1, 11], [0, 12], [0, 12], [-1, 12]]), 'a', { shine: true });
    // abas das orelhas com costura pontilhada
    if (P.view === 'down') { shape(L, P, 4, [[-1, 0], [-1, 0], [-1, 0], [0, 0]]); shape(L, P, 4, [[11, 12], [11, 12], [11, 12], [11, 11]]); dot(L, P, 0, 7, 'c', 3); dot(L, P, 11, 7, 'c', 2); }
    if (P.view === 'side') { shape(L, P, 4, [[6, 8], [6, 8], [6, 8], [7, 7]]); dot(L, P, 7, 7, 'c', 3); }
    if (P.view === 'up') shape(L, P, 4, [[-1, 12], [0, 11]]);
    for (let r = -1; r <= 2; r += 1) if (r % 2) dot(L, P, V(P, 5, 6), r, 'b', 3);
    art(L, P, -1, 3, V(P, ['b.b.b.b.b.b.b.'], ['.b.b.b.b.b.b.'], ['b.b.b.b.b.b.b.']));
  }),
  mk('elmo-crista', 'Elmo de crista', 'Elmos', ch3('bronze', 'Metal', 'carmesim', 'Crista', 'ouro', 'Rebites'), (L, P) => {
    helmDome(L, P, 2);
    // crista de crina: estreita de frente, um arco comprido de perfil
    if (P.view === 'side') art(L, P, 2, -4, ['..ddcccb...', '.dccccccbb.', 'dc......cbb', 'c.........b']);
    else art(L, P, 4, -4, ['.dc.', 'dccb', 'dccb', '.cb.']);
    if (P.view === 'down') { shape(L, P, 3, [[-1, 0], [-1, 0], [-1, 0], [0, 0]]); shape(L, P, 3, [[11, 12], [11, 12], [11, 12], [11, 11]]); }
  }),

  // ================= Capuzes e panos =================
  mk('capuz', 'Capuz', 'Capuzes e panos', ch3('floresta', 'Tecido', 'couro', 'Forro', 'bronze', 'Broche'), (L, P) => {
    hood(L, P, { peak: 0 });
    if (P.view === 'up') { for (let r = 0; r <= 9; r++) dot(L, P, 5, r, 'a', 1); }
    if (P.view === 'down') art(L, P, 5, 11, ['DC']);
  }, { hides: ['hair'] }),
  mk('capuz-pontudo', 'Capuz pontudo', 'Capuzes e panos', ch3('vinho', 'Tecido', 'carvao', 'Forro', 'ouro', 'Bordado'), (L, P) => {
    hood(L, P, { peak: 3 });
    // bordado na beirada da abertura
    if (P.view === 'down') art(L, P, -1, 12, ['C.C.C.C.C.C.C.']);
    if (P.view === 'side') art(L, P, 3, 12, ['C.C.C.C.C.']);
  }, { hides: ['hair'] }),
  mk('capuz-carrasco', 'Capuz de carrasco', 'Capuzes e panos', ch3('carvao', 'Tecido', 'sangue', 'Manchas', 'couro', 'Cordão'), (L, P) => {
    hood(L, P, { peak: 2, closed: true, drape: false });
    // furos dos olhos: o que se ve e o brilho dos olhos la dentro
    if (P.view === 'down') { art(L, P, 1, 5, ['.kk....kk.', 'kWkk..kWkk', '.kk....kk.']); art(L, P, 3, 9, ['b....b']); }
    if (P.view === 'side') art(L, P, 0, 5, ['kk', 'Wk', 'kk']);
    art(L, P, 0, 11, V(P, ['.CCCCCCCCCC.'], ['..CCCCCCCCCC'], ['.CCCCCCCCCC.']));
  }, { hides: ['hair'] }),
  mk('bandana', 'Bandana de pirata', 'Capuzes e panos', ch3('carmesim', 'Tecido', 'branco-gasto', 'Bolinhas', 'ouro', 'Argola'), (L, P) => {
    shape(L, P, -1, V(P, [[3, 8], [1, 10], [0, 11], [0, 11], [-1, 12]], [[3, 9], [1, 11], [0, 12], [0, 12], [-1, 12]]), 'a', { shine: true });
    for (const [c, r] of [[3, 0], [8, 0], [1, 2], [6, 1], [10, 2], [4, 3]]) { const p = L.get(X(P, c), Y(P, r)); if (p) { p.c = 'b'; p.s = 3; } }
    // no atras e duas pontas caindo
    if (P.view === 'side') art(L, P, 12, 2, ['32', '.21', '.2.']);
    if (P.view === 'up') art(L, P, 4, 3, ['.33.', '3221', '.2.1', '.2..', '.1..']);
    if (P.view === 'down') art(L, P, 12, 4, ['2', '1']);
  }),
  mk('turbante', 'Turbante', 'Capuzes e panos', ch3('branco-gasto', 'Tecido', 'jade', 'Gema', 'ouro', 'Broche'), (L, P) => {
    shape(L, P, -3, V(P, [[3, 8], [1, 10], [0, 11], [-1, 12], [-1, 12], [-1, 12], [0, 11]], [[3, 9], [1, 11], [0, 12], [-1, 13], [-1, 13], [-1, 12], [0, 11]]), 'a', { shine: true });
    // voltas do pano em diagonal
    texture(L, P, -2, 3, (c, r) => (c - r * 2 + 40) % 5 === 0);
    if (P.view === 'down') { art(L, P, 5, -5, ['.b', 'cb', '.c']); art(L, P, 4, 0, ['.D.', 'DbD', '.C.']); }
    if (P.view === 'side') { art(L, P, 0, -5, ['.b', 'cb', '.c']); art(L, P, -1, 0, ['D', 'b', 'C']); }
    if (P.view === 'up') art(L, P, 5, 3, ['21', '21', '1.']);
  }),
  mk('veu-diadema', 'Véu com diadema', 'Capuzes e panos', ch3('branco-gasto', 'Véu', 'anil', 'Pedra', 'ouro', 'Diadema'), (L, P) => {
    // pano liso e comprido: cai ate os ombros, mais leve que o capuz
    const rows = V(P,
      [[2, 9], [0, 11], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [-1, 12], [-2, 13], [-2, 13], [-2, 13], [-2, 13], [-2, 13], [-1, 12]],
      [[2, 10], [0, 12], [-1, 12], [-1, 13], [3, 13], [4, 13], [4, 13], [4, 14], [4, 14], [4, 14], [4, 14], [5, 14], [6, 14], [7, 13]]);
    shape(L, P, -1, rows, 'a', { shine: true });
    if (P.view === 'down') [[3, 8], [1, 10], [1, 10], [1, 10], [1, 10], [2, 9], [2, 9], [3, 8], [3, 8]].forEach(([a, b], i) => erase(L, P, 3 + i, a, b));
    texture(L, P, 4, 12, (c) => c === -1 || c === 12 || c === 6, -1);
    circlet(L, P, 2);
    if (P.view === 'down') art(L, P, 5, 1, ['DD', 'bb']);
    if (P.view === 'side') art(L, P, -1, 1, ['D', 'b']);
  }, { hides: ['hair'] }),
  mk('lenco-camponesa', 'Lenço de camponesa', 'Capuzes e panos', ch3('rosa-seco', 'Tecido', 'branco-gasto', 'Bolinhas', 'linho', 'Barra'), (L, P) => {
    shape(L, P, -1, V(P, [[3, 8], [1, 10], [0, 11], [-1, 12], [-1, 12]], [[3, 9], [1, 11], [0, 12], [-1, 12], [0, 13]]), 'a', { shine: true });
    for (const [c, r] of [[3, 0], [7, 1], [1, 2], [10, 2], [5, 3]]) { const p = L.get(X(P, c), Y(P, r)); if (p) { p.c = 'b'; p.s = 3; } }
    // barra e amarracao embaixo do queixo
    art(L, P, V(P, -1, 0), 3, [V(P, 'CCCCCCCCCCCCCC', 'CCCCCCCCCCCCC')]);
    if (P.view === 'down') { for (let r = 4; r <= 9; r++) { dot(L, P, -1, r, 'a', 2); dot(L, P, 12, r, 'a', 1); } art(L, P, 4, 10, ['3221', '.21.']); }
    if (P.view === 'side') { for (let r = 4; r <= 9; r++) dot(L, P, 6, r, 'a', 2); art(L, P, 12, 4, ['2', '21', '1']); }
    if (P.view === 'up') art(L, P, -1, 4, ['2............1', '2............1']);
  }),

  // ================= Coroas e tiaras =================
  mk('coroa-real', 'Coroa real', 'Coroas e tiaras', ch3('ouro', 'Ouro', 'sangue', 'Rubis', 'jade', 'Esmeralda'), (L, P) => {
    art(L, P, 0, -3, [
      '.4...44...4.',
      '.3..3223..3.',
      '33.332223.21',
      '333322222221',
      '3b33C22b2221',
      '211111111110'
    ]);
    if (P.view === 'up') { dot(L, P, 4, 1, 'a', 2); dot(L, P, 7, 1, 'a', 2); }
  }),
  mk('tiara', 'Tiara', 'Coroas e tiaras', ch3('prata', 'Metal', 'anil', 'Gema', 'branco-gasto', 'Pérolas'), (L, P) => {
    if (P.view === 'side') { art(L, P, 0, 1, ['.4', '43', '3222221']); dot(L, P, 1, 1, 'b', 3); return; }
    art(L, P, 0, 0, V(P, ['.....43.....', '.E..4b31..E.', '33322222211'], null, ['............', '............', '.3322222211.']));
  }, { keepHair: true }),
  mk('diadema-gemas', 'Diadema de gemas', 'Coroas e tiaras', ch3('ouro', 'Ouro', 'jade', 'Gemas', 'sangue', 'Gema central'), (L, P) => {
    if (P.view === 'side') { art(L, P, -1, 1, ['.4.3.', '4b3b32222221', '32222222221']); return; }
    art(L, P, -1, 0, V(P, ['..3...4...2...', '.4b3.3C2.2b2..', '33333222222211', '.2222111111111'], null, ['..............', '..............', '33333222222211', '.2222111111111']));
  }, { keepHair: true }),
  mk('aro-gema', 'Aro com gema', 'Coroas e tiaras', ch3('bronze', 'Metal', 'arcano', 'Gema', 'ouro', 'Engaste'), (L, P) => {
    // aro fino na testa; a gema fica bem no meio, entre as sobrancelhas
    circlet(L, P, 4, 'a');
    if (P.view === 'down') art(L, P, 5, 3, ['DC', 'eb', 'cB']);
    if (P.view === 'side') art(L, P, -1, 3, ['C', 'd']);
  }, { keepHair: true }),
  mk('coroa-flores', 'Coroa de flores', 'Coroas e tiaras', ch3('rosa-seco', 'Flores', 'mostarda', 'Miolo', 'musgo', 'Folhas'), (L, P) => {
    // ramo de folhas com flores de 5 petalas (cruz + miolo)
    art(L, P, -1, 1, V(P, ['CDCBCDCBCDCBCD', 'BCB.BCBCB.BCBB'], ['DCBCDCBCDCBCD', '.BCB.BCBCB.B.']));
    for (const c of V(P, [0, 4, 8, 11], [0, 4, 8, 11], [1, 5, 9])) art(L, P, c - 1, 0, ['.3.', '3e2', '.1.']);
  }, { keepHair: true }),
  mk('coroa-louros', 'Coroa de louros', 'Coroas e tiaras', ch3('ouro', 'Folhas', 'ouro', 'Fita', 'ouro', 'Detalhe'), (L, P) => {
    // folhas em V nos dois lados, abrindo na frente
    if (P.view === 'side') { art(L, P, 0, 0, ['.3.3.3.3.3..', '23232323232b', '.1.1.1.1.1bc']); return; }
    art(L, P, -1, 0, V(P, ['.3.3.3..2.2.2.', '3232.1..1.2121', '.1.1......1.1.'], null, ['..3.3.3.2.2...', '.23232321212..', '..1.1.bb.1.1..']));
  }, { keepHair: true }),
  mk('coroa-ossos', 'Coroa de ossos', 'Coroas e tiaras', ch3('osso', 'Ossos', 'couro-escuro', 'Amarras', 'sangue', 'Olhos'), (L, P) => {
    // pontas de osso de alturas diferentes (mais altas no meio), amarradas
    // por tiras de couro, e uma caveirinha na frente
    const spikes = V(P, [[0, 2], [2, 3], [9, 3], [11, 2]], [[1, 3], [4, 4], [7, 3], [10, 2]], [[0, 2], [3, 3], [5, 4], [8, 3], [11, 2]]);
    for (const [c, h] of spikes) for (let k = 1; k <= h; k++) dot(L, P, c, 1 - k, 'a', k === h ? 4 : c > 6 ? 2 : 3);
    art(L, P, 0, 1, V(P, ['3bb32bb2bb21'], ['3b32b2bb2b21'], ['3bb32bb2bb21']));
    art(L, P, 0, 2, ['322222222221']);
    if (P.view === 'down') art(L, P, 4, -2, ['.43.', '4332', '3kk1', '.21.']);
    if (P.view === 'side') art(L, P, 0, -1, ['43', 'k2']);
  }),
  mk('coroa-espinhos', 'Coroa de espinhos', 'Coroas e tiaras', ch3('madeira', 'Galhos', 'sangue', 'Gotas', 'osso', 'Espinhos'), (L, P) => {
    // galhos torcidos (tons alternados) com espinhos saindo para fora
    art(L, P, -1, 0, V(P, [
      '.C..D...C..D..',
      'C323232323232C',
      '.2.12.21.21.2.',
      '...C...b....C.'
    ], [
      '.C..D...C..D.',
      '3232323232321',
      '.21.2.12.21.C',
      '.b...C....C..'
    ]));
  }, { keepHair: true }),

  // ================= Enfeites =================
  mk('laco-fita', 'Laço de fita', 'Enfeites', ch3('carmesim', 'Fita', 'vinho', 'Nó', 'ouro', 'Detalhe'), (L, P) => {
    // laco grande no alto, um pouco de lado: duas alcas e o no no meio
    if (P.view === 'side') { art(L, P, 5, -2, ['.43.', '32b1', '3b21', '.1.1']); return; }
    art(L, P, 6, -2, ['43...32', '332b321', '22cb211', '.1.c.1.', '...1..1']);
  }, { keepHair: true }),
  mk('flor-cabelo', 'Flor no cabelo', 'Enfeites', ch3('abobora', 'Pétalas', 'mostarda', 'Miolo', 'musgo', 'Folha'), (L, P) => {
    const c = V(P, -1, 8, -1);
    if (P.view === 'up') { art(L, P, 10, 1, ['.3.', '3e2', '.1C']); return; }
    art(L, P, c, 1, ['.43.', '43e2', '.21C', '..CB']);
  }, { keepHair: true }),
  mk('faixa-cabeca', 'Faixa de cabeça', 'Enfeites', ch3('azul-aco', 'Tecido', 'branco-gasto', 'Listra', 'azul-aco', 'Pontas'), (L, P) => {
    shape(L, P, 2, V(P, [[-1, 12], [-1, 12]], [[0, 12], [0, 12]]), 'a');
    texture(L, P, 2, 2, () => false);
    for (let c = -1; c <= 12; c++) { const p = L.get(X(P, c), Y(P, 3)); if (p) p.c = 'b'; }
    // no atras com duas pontas
    if (P.view === 'side') art(L, P, 12, 2, ['32', '.21', '..1']);
    if (P.view === 'up') art(L, P, 5, 2, ['33', '21', '2.1', '1..']);
  }, { keepHair: true }),
  mk('penas-cabelo', 'Penas no cabelo', 'Enfeites', ch3('carmesim', 'Pena 1', 'mostarda', 'Pena 2', 'bronze', 'Contas'), (L, P) => {
    // tres penas presas por um cordao de contas atras da orelha
    const c = V(P, 10, 10, 1);
    art(L, P, c, -4, V(P, ['...4.', '..d3.', '.dc2.', 'dc21.', 'c3C..', '.C...', '.D...'], ['...4.', '..d3.', '.dc2.', 'dc21.', 'c3C..', '.C...', '.D...']));
  }, { keepHair: true }),
  mk('grampo-borboleta', 'Grampo de borboleta', 'Enfeites', ch3('jade', 'Asas', 'ouro', 'Pintas', 'carvao', 'Corpo'), (L, P) => {
    const c = V(P, 7, 8, 7);
    art(L, P, c, 0, ['43.32', '3bCb2', '.2C1.', '21.11']);
  }, { keepHair: true })
];
