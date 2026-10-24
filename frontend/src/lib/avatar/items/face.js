// Rosto: oculos, mascaras, pinturas, cicatrizes e piercings.
// Coordenadas relativas a caixa da cabeca (P.head 12x11): de frente os olhos
// ficam nas colunas 2-3 e 8-9 (linhas 6-7), a sobrancelha na linha 5 e a boca
// na linha 9. De perfil (olhando para a esquerda) o olho fica nas colunas 2-3,
// o nariz na coluna 0 e a orelha na coluna 7. De costas quase tudo some: so
// sobra a tira/no que prende a peca (de costas a arte e espelhada).
// No perfil aparece o lado ESQUERDO do personagem, que de frente fica na
// metade direita da tela: por isso cicatrizes/tapa-olho "do lado visivel"
// ficam nas colunas 6-11 da arte de frente.
// Canais: a = corpo da peca (armacao, mascara, tinta), b = detalhe (lente,
// faixa, pena), c = metal/gema. Legenda: '0'-'4' canal a, 'a'-'e' canal b,
// 'A'-'E' canal c, 'k' = furo escuro, 'w/W' = brilho branco, 's/S' = pele.
const LG = {
  w: ['w', 4], W: ['w', 3], z: ['w', 2],
  k: ['#3a2a3a', 0], K: ['#5a3a4a', 1],
  s: ['skin', 3], S: ['skin', 1], t: ['skin', 0]
};
for (let i = 0; i < 5; i++) { LG[i] = ['a', i]; LG['abcde'[i]] = ['b', i]; LG['ABCDE'[i]] = ['c', i]; }

const X = (P, c) => P.head.x + (P.view === 'up' ? 11 - c : c);
const Y = (P, r) => P.head.y + r;
const V = (P, d, s, u = null) => (P.view === 'side' ? s : P.view === 'up' ? u : d);

function art(L, P, c, r, rows) {
  if (!rows) return;
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
    const v = LG[ch];
    if (v) L.px(X(P, c + dx), Y(P, r + dy), v[0], v[1]);
  }));
}
// Desenha a variante de cada visao: [col, linha, arte] ou null.
function views(L, P, d, s, u) {
  const v = V(P, d, s, u);
  if (v) art(L, P, v[0], v[1], v[2]);
}

// Placa macica com relevo (mascaras): mesma luz do alto-esquerda do resto.
function plate(L, P, r0, rows, ch = 'a', holes = []) {
  const cells = new Set();
  const key = (x, y) => y * 64 + x;
  rows.forEach((sp, i) => { if (sp) for (let c = sp[0]; c <= sp[1]; c++) cells.add(key(X(P, c), Y(P, r0 + i))); });
  for (const [c, r] of holes) cells.delete(key(X(P, c), Y(P, r)));
  let minX = 99, maxX = -99;
  for (const k of cells) { minX = Math.min(minX, k % 64); maxX = Math.max(maxX, k % 64); }
  const w = Math.max(1, maxX - minX);
  const has = (x, y) => cells.has(key(x, y));
  for (const k of cells) {
    const x = k % 64, y = (k / 64) | 0;
    const T = !has(x, y - 1), B = !has(x, y + 1), Lf = !has(x - 1, y), R = !has(x + 1, y);
    let t;
    if (T && B) t = Lf ? 3 : R ? 1 : 2;
    else if (R || B) t = 1;
    else if (T || Lf) t = 3;
    else { const f = (x - minX) / w; t = f < 0.3 ? 3 : f > 0.72 ? 1 : 2; }
    L.px(x, y, ch, t);
  }
}
// furos dos olhos de frente (2x2 cada) e de perfil
const EYES_D = [[2, 6], [3, 6], [2, 7], [3, 7], [8, 6], [9, 6], [8, 7], [9, 7]];
const EYES_S = [[2, 6], [3, 6], [2, 7], [3, 7]];

// Tira que passa pela nuca (de costas) na linha r.
function strap(L, P, r, ch = 'a', s = 1) { for (let c = -1; c <= 12; c++) L.px(X(P, c), Y(P, r), ch, c < 3 ? s + 1 : s); }

const ch3 = (a, la, b, lb, c, lc) => [{ label: la, def: a }, { label: lb, def: b }, { label: lc, def: c }];
function mk(id, name, sub, channels, draw) { return { id, name, sub, channels, draw }; }

// Oculos genericos: arte de frente + perfil; as hastes vao ate a orelha.
function glasses(front, side, back = null) {
  return (L, P) => views(L, P, [0, 4, front], [0, 4, side], back && [0, 5, back]);
}

export const FACE_ACC = [
  // ================= Oculos =================
  mk('oculos-redondos', 'Óculos redondos', 'Óculos', ch3('bronze', 'Armação', 'azul-aco', 'Lente', 'ouro', 'Detalhe'), glasses(
    ['............', '..DD....DD..', 'DD..DCCD..DC', '.C..C..C..C.', '..CB....CB..'],
    ['............', '.DD.', 'D..CCCB', 'C..C', '.CB.'])),
  mk('oculos-quadrados', 'Óculos quadrados', 'Óculos', ch3('carvao', 'Armação', 'azul-aco', 'Lente', 'prata', 'Detalhe'), (L, P) => {
    // armacao grossa de canal a (tons do relevo), cantos retos
    views(L, P, [0, 5, ['.3333..3333.', '33..3223..31', '.3..2..2..1.', '.2221..2111.']], [0, 5, ['3333', '3..3222', '2..2', '2221']]);
  }),
  mk('oculos-meia-lua', 'Óculos de meia-lua', 'Óculos', ch3('ouro', 'Armação', 'azul-aco', 'Lente', 'ouro', 'Corrente'), (L, P) => {
    // so a metade de baixo da lente: oculos de leitura na ponta do nariz
    views(L, P, [0, 7, ['DD.DCCCCD.DC', '.CBB....BBC.']], [0, 7, ['DCCCCB', 'CB']]);
    if (P.view === 'down') art(L, P, 11, 8, ['C', 'B', 'C']);
  }),
  mk('monoculo', 'Monóculo', 'Óculos', ch3('ouro', 'Aro', 'azul-aco', 'Lente', 'ouro', 'Corrente'), (L, P) => {
    // um aro so, no olho do lado visivel do perfil, com corrente caindo
    views(L, P, [7, 5, ['.DD.', 'D..C', 'C..C', '.CB.', '...C', '...B', '..C.']], [1, 5, ['.DD.', 'D..C', 'C..C', '.CB.', '..C.', '...B']]);
    if (P.view === 'down') { L.px(X(P, 9), Y(P, 6), 'w', 4); }
  }),
  mk('oculos-escuros', 'Óculos escuros', 'Óculos', ch3('carvao', 'Armação', 'ameixa', 'Lente', 'ouro', 'Detalhe'), (L, P) => {
    // lentes opacas escondem os olhos; brilho no canto de cima
    views(L, P, [0, 5, ['.2222..2222.', '22wc2112wc21', '.2cb2..2cb2.', '..22....21..']], [0, 5, ['2222', 'wcc2111', 'cbb2', '.21.']]);
  }),
  mk('oculos-protecao', 'Óculos de proteção', 'Óculos', ch3('couro', 'Tira', 'bronze', 'Aros', 'jade', 'Lente'), (L, P) => {
    // aros grossos de bronze, lente colorida, tira de couro em volta da cabeca
    views(L, P,
      [-1, 5, ['.bbbb..bbbb..', '1bwDcbbbwDcb1', '1bCCcb.bCCcb1', '.cbbc..cbbc..']],
      [0, 5, ['bbbb', 'bwDc22222222', 'bCCc11111111', 'cbbc']],
      [-1, 6, ['22222222222211', '11111111111111']]);
  }),
  mk('lentes-alquimista', 'Lentes de alquimista', 'Óculos', ch3('couro-escuro', 'Tira', 'cobre', 'Aros', 'sangue', 'Lente extra'), (L, P) => {
    // oculos de protecao com uma lupa extra virada para cima num dos lados
    views(L, P,
      [-1, 3, ['.......bb.....', '......bCDb....', '.bbbb.bbbbbb..', '1bwBabbbwBab1.', '1bBBab.bBBab1.', '.abba..abba...']],
      [0, 3, ['bb..', 'CDb.', 'bbbb', 'bwBa22222222', 'bBBa11111111', 'abba']],
      [-1, 6, ['22222222222211', '11111111111111']]);
  }),
  mk('pince-nez', 'Pincenê', 'Óculos', ch3('prata', 'Aro', 'azul-aco', 'Lente', 'prata', 'Corrente'), (L, P) => {
    // lentes pequenas presas so no nariz, sem hastes; cordao pendendo
    views(L, P, [1, 6, ['D..DCD..D.', 'C..CBC..C', '..........', '.........C', '........B.']], [1, 6, ['DCD', 'C.C', '.C.', '..B']]);
  }),
  mk('oculos-neve', 'Óculos de neve', 'Óculos', ch3('osso', 'Osso', 'couro', 'Tira', 'ferro', 'Detalhe'), (L, P) => {
    // placa de osso com frestas finas (contra o brilho da neve)
    plate(L, P, 5, V(P, [[0, 11], [0, 11], [1, 10]], [[-1, 4], [-1, 4], [0, 3]], [[-1, 12]]) || [[-1, 12]]);
    if (P.view === 'down') art(L, P, 0, 6, ['b.kk.33.kk.b']);
    if (P.view === 'side') art(L, P, -1, 6, ['..kk.bbbbbbb']);
    if (P.view === 'up') strap(L, P, 6, 'b', 2);
  }),

  // ================= Mascaras =================
  mk('tapa-olho-direito', 'Tapa-olho direito', 'Máscaras', ch3('couro-escuro', 'Couro', 'couro', 'Tira', 'bronze', 'Rebite'), (L, P) => {
    views(L, P,
      [0, 2, ['..........b.', '.........b..', '......bb....', '.333b.......', '.3221.......', '.2211.......', '..11........']],
      [2, 3, ['....bbbbbb', '..bb']],
      [0, 3, ['.bb.........', '...bbb......', '......bbb...', '.........bb.']]);
  }),
  mk('tapa-olho-esquerdo', 'Tapa-olho esquerdo', 'Máscaras', ch3('carvao', 'Tecido', 'couro-escuro', 'Tira', 'ouro', 'Bordado'), (L, P) => {
    // do lado visivel no perfil: aparece inteiro de lado tambem
    views(L, P,
      [0, 2, ['.b..........', '..b.........', '....bb......', '.......b333.', '.......3C21.', '.......2211.', '........11..']],
      [0, 4, ['.....bbbbbbb', '.333b', '.3C2', '.221', '..1']],
      [0, 3, ['.........bb.', '......bbb...', '...bbb......', '.bb.........']]);
  }),
  mk('mascara-baile', 'Máscara de baile', 'Máscaras', ch3('ameixa', 'Máscara', 'mostarda', 'Plumas', 'ouro', 'Enfeites'), (L, P) => {
    if (P.view === 'up') { strap(L, P, 6, 'a', 1); art(L, P, 4, 5, ['3..3', '2332', '1..1']); return; }
    if (P.view === 'side') {
      plate(L, P, 5, [[-1, 5], [0, 5], [1, 4]], 'a', EYES_S);
      art(L, P, 4, 1, ['...e', '..ed', '.dc.', 'Dc..']);
      art(L, P, 5, 6, ['1111111']);
      return;
    }
    // asas viradas para cima nas pontas, gema no meio e plumas de um lado
    plate(L, P, 4, [[-1, -1], [-1, 12], [0, 11], [1, 10]], 'a', EYES_D);
    L.px(X(P, 12), Y(P, 4), 'a', 1);
    art(L, P, 5, 5, ['DC']);
    art(L, P, 10, 0, ['..e', '.ed', 'edc', 'dcC']);
    art(L, P, 1, 6, ['C......C']);
  }),
  mk('mascara-couro', 'Meia-máscara de couro', 'Máscaras', ch3('couro-escuro', 'Couro', 'couro', 'Costura', 'bronze', 'Rebites'), (L, P) => {
    if (P.view === 'up') { strap(L, P, 6, 'b', 1); art(L, P, 5, 6, ['bb']); return; }
    if (P.view === 'side') { plate(L, P, 5, [[0, 4], [0, 4], [1, 3]], 'a', EYES_S); art(L, P, 5, 6, ['bbbbbbb']); return; }
    plate(L, P, 5, [[1, 10], [0, 11], [1, 10]], 'a', EYES_D);
    art(L, P, 4, 5, ['b..b']);
    art(L, P, 0, 7, ['C..........C']);
  }),
  mk('mascara-bico', 'Máscara de bico', 'Máscaras', ch3('carvao', 'Couro', 'couro', 'Tiras', 'ouro', 'Lentes'), (L, P) => {
    if (P.view === 'up') { strap(L, P, 5, 'a', 2); strap(L, P, 8, 'a', 1); return; }
    if (P.view === 'side') {
      // o bico sai bem para a frente e curva para baixo
      plate(L, P, 4, [[-1, 6], [-1, 6], [-1, 6], [-1, 6], [0, 6], [0, 5], [1, 4]], 'a');
      plate(L, P, 7, [[-4, -2], [-5, -2], [-5, -3], [-5, -5]], 'a');
      art(L, P, 1, 5, ['.DC', 'DwC', 'CCB']);
      art(L, P, 5, 6, ['b', 'b']);
      return;
    }
    plate(L, P, 4, [[0, 11], [-1, 12], [-1, 12], [-1, 12], [0, 11], [0, 11], [1, 10]], 'a');
    // bico visto de frente: cone que desce do nariz, claro em cima
    plate(L, P, 7, [[4, 7], [4, 7], [4, 7], [5, 6], [5, 6]], 'a');
    L.px(X(P, 5), Y(P, 8), 'a', 4);
    art(L, P, 1, 5, ['.DD....DD.', 'DwCB..DwCB', '.CB....CB.']);
    art(L, P, 0, 4, ['b..........b']);
  }),
  mk('mascara-caveira', 'Máscara de caveira', 'Máscaras', ch3('osso', 'Osso', 'carvao', 'Sombra', 'sangue', 'Detalhe'), (L, P) => {
    if (P.view === 'up') { strap(L, P, 6, 'b', 1); return; }
    if (P.view === 'side') {
      plate(L, P, 3, [[0, 6], [0, 6], [0, 6], [-1, 6], [0, 6], [0, 5], [0, 5], [1, 4]], 'a');
      art(L, P, 1, 5, ['bbb', 'bkb', '.b.', '', 'S4S4']);
      L.px(X(P, 0), Y(P, 7), 'b', 1);
      return;
    }
    plate(L, P, 3, [[1, 10], [0, 11], [0, 11], [0, 11], [0, 11], [1, 10], [2, 9], [3, 8]], 'a');
    // orbitas fundas, nariz em coracao invertido, dentes
    art(L, P, 1, 5, ['.bbb..bbb.', '.bkb..bkb.', '..b.bb.b..', '....b.....', '..4343434', '..2.2.2.']);
    art(L, P, 5, 3, ['C']);
  }),
  mk('mascara-raposa', 'Máscara de raposa', 'Máscaras', ch3('abobora', 'Pelo', 'branco-gasto', 'Focinho', 'carvao', 'Pintura'), (L, P) => {
    if (P.view === 'up') { strap(L, P, 6, 'c', 1); art(L, P, 1, 2, ['3........3']); return; }
    if (P.view === 'side') {
      plate(L, P, 2, [[4, 5], [3, 6], [1, 6], [0, 6], [-1, 6], [-2, 5], [-2, 4]], 'a', EYES_S.filter(([, r]) => r === 6));
      art(L, P, -2, 6, ['C...', 'dcc.', '.bb.']);
      art(L, P, 4, 3, ['C']);
      return;
    }
    // orelhas pontudas, rosto alaranjado, bochechas e focinho claros
    plate(L, P, 1, [[1, 1], [1, 2], [1, 10], [0, 11], [0, 11], [0, 11], [0, 11], [1, 10], [3, 8]], 'a', EYES_D);
    L.px(X(P, 10), Y(P, 1), 'a', 2); L.px(X(P, 9), Y(P, 2), 'a', 2); L.px(X(P, 10), Y(P, 2), 'a', 1);
    art(L, P, 1, 2, ['C........C']);
    art(L, P, 0, 7, ['dc........cb', '.dcc....ccb.', '...dc..cb...', '....dccb....']);
    art(L, P, 5, 8, ['CC']);
    art(L, P, 1, 5, ['CC......CC']);
  }),
  mk('mascara-ferro', 'Máscara de ferro', 'Máscaras', ch3('ferro', 'Ferro', 'ferro-negro', 'Grade', 'bronze', 'Rebites'), (L, P) => {
    if (P.view === 'up') { strap(L, P, 5, 'b', 1); strap(L, P, 8, 'b', 1); return; }
    if (P.view === 'side') {
      plate(L, P, 3, [[0, 5], [0, 5], [0, 5], [-1, 5], [0, 5], [0, 5], [0, 5], [1, 4]], 'a');
      art(L, P, 0, 6, ['kkk', '', '.', 'b.b']);
      art(L, P, 5, 5, ['bbbbbbb', '..C']);
      return;
    }
    plate(L, P, 3, [[1, 10], [0, 11], [0, 11], [0, 11], [0, 11], [0, 11], [0, 11], [1, 10]], 'a');
    // frestas dos olhos, grade da boca, rebites nos cantos, vinco central
    art(L, P, 1, 6, ['kkk....kkk']);
    art(L, P, 3, 9, ['b.b.b.b']);
    for (const [c, r] of [[1, 4], [10, 4], [1, 9], [10, 9]]) L.px(X(P, c), Y(P, r), 'c', 3);
    for (let r = 4; r <= 8; r++) L.px(X(P, 5), Y(P, r), 'a', r < 6 ? 4 : 3);
  }),
  mk('pano-rosto', 'Pano de bandido', 'Máscaras', ch3('carmesim', 'Pano', 'vinho', 'Dobras', 'ouro', 'Detalhe'), (L, P) => {
    if (P.view === 'up') { art(L, P, -1, 8, ['2............1']); art(L, P, 4, 7, ['.33.', '3221', '.2.1', '.1..']); return; }
    if (P.view === 'side') { plate(L, P, 8, [[-1, 7], [-1, 6], [0, 5], [1, 3]], 'a'); art(L, P, 12, 7, ['32', '21', '.1']); art(L, P, 1, 9, ['b.b']); return; }
    // triangulo de pano cobrindo nariz e boca, dobras verticais
    plate(L, P, 8, [[-1, 12], [-1, 12], [0, 11], [2, 9], [4, 7]], 'a');
    art(L, P, 2, 9, ['b..b..b.']);
    art(L, P, 4, 10, ['b..b']);
  }),
  mk('veu-moedas', 'Véu de moedas', 'Máscaras', ch3('rosa-seco', 'Véu', 'vinho', 'Barra', 'ouro', 'Moedas'), (L, P) => {
    if (P.view === 'up') { art(L, P, -1, 7, ['CDCDCDCDCDCDCD']); return; }
    if (P.view === 'side') { art(L, P, -1, 7, ['CDCDCDCDC', '3322', '2211', 'D.D.']); return; }
    // corrente de moedas presa nas orelhas e veu leve com franja de moedas
    art(L, P, -1, 7, ['CDCDCDCDCDCDCD']);
    plate(L, P, 8, [[0, 11], [0, 11], [1, 10]], 'a');
    art(L, P, 0, 10, ['.bbbbbbbbbb']);
    art(L, P, 1, 11, ['D.D.D.D.D.']);
  }),
  mk('venda', 'Venda nos olhos', 'Máscaras', ch3('linho', 'Pano', 'couro', 'Bordado', 'sangue', 'Mancha'), (L, P) => {
    if (P.view === 'up') { strap(L, P, 6, 'a', 2); strap(L, P, 7, 'a', 1); art(L, P, 5, 5, ['33', '21', '2.1', '1..1']); return; }
    if (P.view === 'side') { plate(L, P, 6, [[-1, 12], [-1, 12]], 'a'); art(L, P, 12, 6, ['3', '21', '.1']); return; }
    plate(L, P, 6, [[-1, 12], [-1, 12]], 'a');
    art(L, P, 0, 6, ['.b.b.b.b.b.b']);
    art(L, P, 12, 7, ['3', '2', '1']);
  }),
  mk('mascara-tribal', 'Máscara tribal de madeira', 'Máscaras', ch3('madeira', 'Madeira', 'carmesim', 'Pintura', 'osso', 'Dentes'), (L, P) => {
    if (P.view === 'up') { strap(L, P, 5, 'b', 1); return; }
    if (P.view === 'side') {
      plate(L, P, 2, [[0, 5], [0, 5], [0, 5], [0, 5], [-1, 5], [0, 5], [0, 5], [0, 5], [0, 4], [1, 3]], 'a');
      art(L, P, 1, 6, ['kk', '', 'b', 'Cb', 'b']);
      return;
    }
    // rosto alongado (passa do queixo) com listras pintadas e boca de dentes
    plate(L, P, 2, [[2, 9], [1, 10], [1, 10], [0, 11], [0, 11], [0, 11], [1, 10], [1, 10], [2, 9], [3, 8], [4, 7]], 'a');
    art(L, P, 2, 6, ['kk....kk']);
    art(L, P, 1, 3, ['b........b', 'b.bbbbbb.b']);
    art(L, P, 2, 8, ['bb....bb']);
    art(L, P, 4, 9, ['kCCk', '.kk.']);
  }),
  mk('mascara-oni', 'Máscara de oni', 'Máscaras', ch3('carmesim', 'Rosto', 'ouro', 'Olhos', 'osso', 'Chifres e presas'), (L, P) => {
    if (P.view === 'up') { strap(L, P, 6, 'a', 1); return; }
    if (P.view === 'side') {
      plate(L, P, 3, [[0, 5], [0, 5], [0, 5], [-1, 5], [0, 5], [0, 5], [0, 5], [1, 4]], 'a');
      art(L, P, 2, 1, ['D', 'C']);
      art(L, P, 1, 5, ['1', 'ed', '', 'kk', 'E']);
      return;
    }
    plate(L, P, 3, [[0, 11], [0, 11], [0, 11], [0, 11], [0, 11], [0, 11], [1, 10], [2, 9]], 'a');
    // chifrinhos, sobrancelhas bravas, olhos dourados, bocarra com presas
    art(L, P, 1, 1, ['D........D', 'C........C']);
    art(L, P, 1, 5, ['11....11', '.ed..de.', '........', 'kkkkkkkk', 'E.kkkk.E']);
    art(L, P, 5, 7, ['2']);
  }),

  // ================= Marcas e cicatrizes =================
  mk('pintura-listras', 'Pintura de guerra em listras', 'Marcas e cicatrizes', ch3('anil', 'Tinta', 'anil', 'Detalhe', 'anil', 'Detalhe'), (L, P) => {
    // duas listras de tinta (pastel-de-guerra) em cada bochecha, saindo do nariz
    views(L, P, [0, 8, ['3332....3221', '.221....221.']], [1, 8, ['3332', '.221']]);
  }),
  mk('pintura-mascara', 'Pintura em faixa nos olhos', 'Marcas e cicatrizes', ch3('carvao', 'Tinta', 'carvao', 'Detalhe', 'carvao', 'Detalhe'), (L, P) => {
    // faixa escura de lado a lado: os olhos ficam de fora (parecem brilhar)
    views(L, P, [0, 5, ['221111111122', '21..1111..11', '11..1111..11', '.1........1.']], [0, 5, ['1111111', '1..1111', '1..111', '.1']]);
  }),
  mk('pintura-ritual', 'Pintura ritual', 'Marcas e cicatrizes', ch3('branco-gasto', 'Tinta', 'carmesim', 'Pontos', 'carmesim', 'Detalhe'), (L, P) => {
    // linha na testa e riscos descendo do labio ao queixo; tinta clara no tom 4
    // com borda no tom 1 (branco puro sobre pele clara nao lia)
    views(L, P, [3, 3, ['..43..', '..31..', '......', '......', '......', 'c....c', '......', '.4.3..']], [0, 3, ['43', '31', '', '', '', '.c', '', '4.3']]);
  }),
  mk('pintura-meia-face', 'Pintura de meia-face', 'Marcas e cicatrizes', ch3('azul-aco', 'Tinta', 'azul-aco', 'Detalhe', 'azul-aco', 'Detalhe'), (L, P) => {
    // metade do rosto (o lado visivel no perfil) pintada, contornando o olho
    if (P.view === 'down') art(L, P, 6, 3, ['32222', '322221', '32..21', '32..21', '322221', '32221', '3221', '21']);
    if (P.view === 'side') art(L, P, 0, 3, ['.3222', '33222', '3..22', '3..22', '32222', '3222', '.221', '..21']);
  }),
  // Cicatrizes: tom 0/1 (bem escuro) e 2-3 px seguidos; rosa claro sumia na pele.
  mk('cicatriz-olho', 'Cicatriz no olho', 'Marcas e cicatrizes', ch3('sangue', 'Cicatriz', 'sangue', 'Detalhe', 'sangue', 'Detalhe'), (L, P) => {
    // risco vertical atravessando a sobrancelha e a bochecha
    views(L, P, [8, 3, ['.1', '.0', '0.', '', '', '.0', '01', '.1']], [2, 3, ['.1', '.0', '0.', '', '', '.0', '01', '.1']]);
  }),
  mk('cicatriz-x', 'Cicatriz em X', 'Marcas e cicatrizes', ch3('sangue', 'Cicatriz', 'sangue', 'Detalhe', 'sangue', 'Detalhe'), (L, P) => {
    views(L, P, [8, 8, ['0.1', '.0.', '1.0']], [3, 8, ['0.1', '.0.', '1.0']]);
  }),
  mk('cicatriz-nariz', 'Cicatriz no nariz', 'Marcas e cicatrizes', ch3('sangue', 'Cicatriz', 'sangue', 'Detalhe', 'sangue', 'Detalhe'), (L, P) => {
    // corte atravessado na ponte do nariz, de bochecha a bochecha
    views(L, P, [2, 8, ['1.....', '.0010', '.....01']], [-1, 8, ['0010', '....01']]);
  }),
  mk('cicatriz-garras', 'Marcas de garras', 'Marcas e cicatrizes', ch3('sangue', 'Cicatriz', 'sangue', 'Detalhe', 'sangue', 'Detalhe'), (L, P) => {
    // tres riscos paralelos em diagonal, como de um bicho grande
    views(L, P, [7, 4, ['1.1.1', '.0.0.', '..0.0', '...0.', '....1']], [2, 4, ['1.1.1', '.0.0.0', '..0.0.0', '...0.0.1', '....1']]);
  }),
  mk('sardas', 'Sardas', 'Marcas e cicatrizes', ch3('terra', 'Sardas', 'terra', 'Detalhe', 'terra', 'Detalhe'), (L, P) => {
    views(L, P, [1, 8, ['0.1....1.0', '.1..0....1']], [1, 8, ['0.1', '.1.0']]);
  }),
  mk('pinta', 'Pinta', 'Marcas e cicatrizes', ch3('couro-escuro', 'Pinta', 'couro-escuro', 'Detalhe', 'couro-escuro', 'Detalhe'), (L, P) => {
    views(L, P, [8, 9, ['0']], [2, 9, ['0']]);
  }),
  mk('lagrima-tatuada', 'Lágrima tatuada', 'Marcas e cicatrizes', ch3('anil', 'Tinta', 'anil', 'Detalhe', 'anil', 'Detalhe'), (L, P) => {
    views(L, P, [9, 8, ['2', '0']], [3, 8, ['2', '0']]);
  }),
  mk('runas-testa', 'Runas na testa', 'Marcas e cicatrizes', ch3('arcano', 'Runas', 'arcano', 'Brilho', 'arcano', 'Detalhe'), (L, P) => {
    // runas que brilham (tons altos) logo acima das sobrancelhas
    views(L, P, [2, 3, ['4.43.34.', '2.2..2.2', '.4.44.4.']], [0, 3, ['43.4', '2..2', '.44.']]);
  }),
  // runa que brilha na bochecha: miolo branco, cor fria e saturada em volta
  mk('runa-bochecha', 'Runa brilhante na bochecha', 'Marcas e cicatrizes', ch3('jade', 'Brilho', 'jade', 'Detalhe', 'jade', 'Detalhe'), (L, P) => {
    views(L, P, [8, 7, ['.3.', '3w4', '.1.', '.2.']], [2, 7, ['.3.', '3w4', '.1.', '.2.']]);
  }),
  mk('terceiro-olho', 'Terceiro olho pintado', 'Marcas e cicatrizes', ch3('ouro', 'Tinta', 'jade', 'Íris', 'ouro', 'Detalhe'), (L, P) => {
    views(L, P, [4, 2, ['.11.', '1da1', '.10.']], [0, 2, ['1', 'd', '0']]);
  }),
  mk('pontos-tribais', 'Pontos tribais', 'Marcas e cicatrizes', ch3('carmesim', 'Tinta', 'carmesim', 'Detalhe', 'carmesim', 'Detalhe'), (L, P) => {
    // fileiras de pontos nas macas do rosto e um no queixo
    views(L, P, [0, 8, ['2.2....2.2', '.1......1.', '', '.....1']], [1, 8, ['2.2', '.1.', '', '1']]);
  }),

  // ================= Piercings =================
  // Metal com brilho branco (w) e o tom 0 do metal ao lado: 2+ px que leem na pele.
  mk('argola-nariz', 'Argola no nariz', 'Piercings', ch3('ouro', 'Metal', 'ouro', 'Detalhe', 'ouro', 'Detalhe'), (L, P) => {
    views(L, P, [6, 8, ['w', '20']], [-1, 7, ['w', '20']]);
  }),
  mk('argola-septo', 'Argola no septo', 'Piercings', ch3('prata', 'Metal', 'prata', 'Detalhe', 'prata', 'Detalhe'), (L, P) => {
    views(L, P, [4, 8, ['2..1', '.w0.']], [-1, 8, ['w0']]);
  }),
  // septo ornamentado: argola larga com gema pendurada por cima da boca
  mk('septo-ornado', 'Septo ornamentado', 'Piercings', ch3('ouro', 'Metal', 'carmesim', 'Gema', 'ouro', 'Detalhe'), (L, P) => {
    views(L, P, [4, 8, ['2..1', '3wd0', '.cb.']], [-1, 8, ['w', 'd', 'b']]);
  }),
  mk('piercing-sobrancelha', 'Piercing na sobrancelha', 'Piercings', ch3('prata', 'Metal', 'prata', 'Detalhe', 'prata', 'Detalhe'), (L, P) => {
    views(L, P, [9, 4, ['w', '.', '0']], [3, 4, ['w', '.', '0']]);
  }),
  mk('piercing-labio', 'Piercing no lábio', 'Piercings', ch3('aco', 'Metal', 'aco', 'Detalhe', 'aco', 'Detalhe'), (L, P) => {
    views(L, P, [6, 10, ['w0']], [1, 10, ['w', '0']]);
  }),
  mk('piercing-ponte', 'Piercing na ponte do nariz', 'Piercings', ch3('aco', 'Metal', 'aco', 'Detalhe', 'aco', 'Detalhe'), (L, P) => {
    views(L, P, [5, 6, ['w0']], [0, 5, ['w', '0']]);
  }),
  mk('corrente-nariz', 'Corrente do nariz à orelha', 'Piercings', ch3('ouro', 'Corrente', 'sangue', 'Gema', 'ouro', 'Detalhe'), (L, P) => {
    // brinco no nariz ligado por uma correntinha ate a orelha (alterna claro/escuro)
    views(L, P, [6, 8, ['w....', '.0.3.0', '..3.0.3', '......0']], [-1, 7, ['w', '.0.3.0.3']]);
  }),
  mk('piercing-bochechas', 'Piercings nas bochechas', 'Piercings', ch3('ouro', 'Metal', 'jade', 'Gema', 'ouro', 'Detalhe'), (L, P) => {
    views(L, P, [3, 9, ['e....e', 'a....a']], [3, 9, ['e', 'a']]);
  })
];
