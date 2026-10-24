// Bracos: ombreiras, bracadeiras, pulseiras, faixas e marcas.
// Cada peca e uma lista de "carimbos" (desenho em texto) presos a uma linha do
// braco: no ombro (a partir de a.top) ou no pulso (a partir de a.bottom). O carimbo
// segue a linha do braco (rows), entao acompanha o balanco do passo de perfil.
// Desenhado para o braco da ESQUERDA da tela (coluna 0 = lado de fora); no braco da
// direita o desenho e espelhado, mas o tom e recalculado pela forma (luz sempre do
// alto-esquerda), entao o volume nao inverte junto.
// Canais: a = material principal, b = detalhe (forro, tecido, pele), c = metal/osso.
//
// Legenda: a/b/c = canal com relevo automatico; A/B/C = brilho (tom 4);
// x/y/z = tom 1 (vinco); X/Y/Z = tom 0 (sombra funda); m/n = b/c no tom 3;
// k = pele; K = pele no tom 1 (cicatriz); w/W = branco 3/4; r = gema vermelha;
// t = gema turquesa; o/O = ouro fixo (filete gravado).

const LG = {
  A: ['a', 4], B: ['b', 4], C: ['c', 4],
  x: ['a', 1], y: ['b', 1], z: ['c', 1],
  X: ['a', 0], Y: ['b', 0], Z: ['c', 0],
  m: ['b', 3], n: ['c', 3], k: ['skin', null], K: ['skin', 1],
  w: ['w', 3], W: ['w', 4],
  r: ['#d6455d', 3], R: ['#f08a8a', 4], t: ['#5ad1c8', 3], o: ['#e8b84a', 3], O: ['#e8b84a', 4],
  a: ['a', null], b: ['b', null], c: ['c', null]
};

// Relevo pela forma do carimbo: borda esquerda/topo clara, direita/baixo escura.
// Faixa de 1 linha so ganha luz pela esquerda (senao ficaria toda escura).
function autoTone(set, x, y, tall) {
  const has = (dx, dy) => set.has(`${x + dx},${y + dy}`);
  let s = 2;
  if (!has(-1, 0)) s += 1;
  if (!has(1, 0)) s -= 1;
  if (tall) {
    if (!has(0, -1)) s += 1;
    if (!has(0, 1)) s -= 1;
  }
  return Math.max(1, Math.min(4, s));
}

function spanOf(a, y) {
  if (a.rows.has(y)) return a.rows.get(y);
  if (a.handPart?.rows.has(y)) return a.handPart.rows.get(y);
  return a.rows.get(y < a.top ? a.top : a.bottom);
}

// Pinta um carimbo no braco `a` a partir da linha y0. ox = colunas para fora do braco.
function stamp(L, P, a, y0, rows, ox = 0) {
  const flip = P.view !== 'side' && a.side === 'r';
  const cells = [];
  rows.forEach((row, k) => {
    const y = y0 + k;
    const sp = spanOf(a, y);
    const str = flip ? [...row].reverse().join('') : row;
    const left = flip ? sp[1] + ox - (row.length - 1) : sp[0] - ox;
    [...str].forEach((ch, i) => { if (LG[ch]) cells.push([left + i, y, ch]); });
  });
  const set = new Set(cells.map(([x, y]) => `${x},${y}`));
  const tall = rows.length > 1;
  const ds = a.back ? -1 : 0;
  L.withTag(a.tag, () => {
    for (const [x, y, ch] of cells) {
      const [c, s] = LG[ch];
      L.px(x, y, c, (s ?? autoTone(set, x, y, tall)) + ds);
    }
  });
}

// Qual braco: 'both', 'L' (braco esquerdo do personagem) ou 'R' (direito, o da
// arma). De frente o esquerdo do personagem fica a direita da tela; de costas, a
// esquerda; de perfil (olhando a esquerda) e o braco da frente. O braco de tras do
// perfil fica escondido pelo tronco, entao nao recebe nada (pintaria por cima dele).
function pick(P, who) {
  const up = P.view === 'up';
  const left = up ? P.arms[0] : P.arms[1];
  const right = up ? P.arms[1] : P.arms[0];
  const list = who === 'L' ? [left] : who === 'R' ? [right] : P.arms;
  return list.filter((a) => !a.back);
}

// part: [onde 't'|'b', dy, rows, ox, who, { side, up }] (side/up trocam o desenho naquela visao)
function draw(parts) {
  return (L, P) => {
    for (const [at, dy, rows, ox = 0, who = 'both', alt = {}] of parts) {
      let r = rows, o = ox;
      if (P.view === 'side' && alt.side) [r, o] = alt.side;
      if (P.view === 'up' && alt.up) [r, o] = alt.up === 'skip' ? [null, 0] : alt.up;
      if (!r) continue;
      for (const a of pick(P, who)) stamp(L, P, a, (at === 't' ? a.top : a.bottom) + dy, r, o);
    }
  };
}

const mk = (id, name, sub, ch, parts) => ({
  id, name, sub,
  channels: [{ label: 'Material', def: ch[0] }, { label: 'Detalhe', def: ch[1] }, { label: 'Metal', def: ch[2] }],
  draw: draw(parts)
});

// ---- desenhos das ombreiras (comecam uma linha acima do ombro) ----
const OMB = {
  placa: ['.aa.', 'aAaa', 'aaCa', 'xxxx'],
  espinho: ['.C..', '.na.', 'aAaa', 'aaaa', 'xCxx'],
  pele: ['.mb.', 'bmbb', 'bbmb', 'b.b.'],
  couro: ['.aa.', 'amaa', 'aama', 'Ca.C'],
  camadas: ['.aa.', 'aCaa', 'xxxx', 'aaCa', 'xxx.'],
  caveira: ['.ccc.', 'cZcZc', 'ccccc', '.n.n.'],
  escamas: ['.aa.', 'AaAa', 'aAaA', 'xaxa'],
  penas: ['.aa.', 'aCaa', 'bmbb', 'b.bm', 'm.b.'],
  presas: ['n..n', 'caac', 'aaaa', 'xaa.'],
  duplaEsp: ['C..C', 'na.n', 'aAaa', 'aaaa', 'x..x'],
  rebites: ['.cc.', 'cncc', 'nCnc', 'zzzz', '.zz.']
};
const SIDE_OMB = {
  // de perfil a ombreira cobre o ombro por cima do tronco: mais larga para a frente
  placa: [['.aa.', 'aAaa', 'aaCa', 'xxxx'], 1]
};

const S1 = 'Ombreiras', S2 = 'Braçadeiras', S3 = 'Pulseiras', S4 = 'Faixas e marcas';

export const ARMS = [
  // ---- Ombreiras ----
  mk('ombreira-placa', 'Ombreira de placa', S1, ['aco', 'couro', 'ouro'], [['t', -1, OMB.placa, 1, 'L', { side: SIDE_OMB.placa }]]),
  mk('ombreiras-placa', 'Ombreiras de placa', S1, ['ferro', 'couro', 'bronze'], [['t', -1, OMB.placa, 1, 'both']]),
  mk('ombreira-espinhos', 'Ombreira com espinhos', S1, ['ferro-negro', 'couro', 'aco'], [['t', -2, OMB.espinho, 1, 'L']]),
  mk('ombreiras-espinhos', 'Ombreiras com espinhos duplos', S1, ['ferro-negro', 'couro', 'prata'], [['t', -2, OMB.duplaEsp, 1, 'both']]),
  mk('ombreira-pele', 'Ombreira de pele', S1, ['couro', 'terra', 'bronze'], [['t', -1, OMB.pele, 1, 'L']]),
  mk('ombreiras-pele', 'Ombreiras de pele de lobo', S1, ['couro', 'cinza-claro', 'ferro'], [['t', -1, OMB.pele, 1, 'both'], ['t', 2, ['.a', 'n.'], 1, 'both']]),
  mk('ombreiras-couro', 'Ombreiras de couro costurado', S1, ['couro-escuro', 'ocre', 'bronze'], [['t', -1, OMB.couro, 1, 'both']]),
  mk('ombreira-camadas', 'Ombreira em camadas', S1, ['aco', 'couro', 'prata'], [['t', -1, OMB.camadas, 1, 'L']]),
  mk('ombreira-caveira', 'Ombreira de caveira', S1, ['couro-escuro', 'couro', 'osso'], [['t', -1, OMB.caveira, 1, 'L', { up: [['.ccc.', 'ccccc', 'zcccz', '.z.z.'], 1] }]]),
  mk('ombreiras-escamas', 'Ombreiras de escamas', S1, ['jade', 'couro', 'ouro'], [['t', -1, OMB.escamas, 1, 'both']]),
  mk('ombreira-penas', 'Ombreira de penas', S1, ['couro-escuro', 'carmesim', 'ouro'], [['t', -1, OMB.penas, 1, 'L']]),
  mk('ombreira-presas', 'Ombreira de presas', S1, ['couro', 'couro', 'osso'], [['t', -1, OMB.presas, 1, 'R']]),
  mk('ombreiras-rebitadas', 'Ombreiras rebitadas', S1, ['couro-escuro', 'couro', 'bronze'], [['t', -1, OMB.rebites, 1, 'both']]),

  // ---- Bracadeiras (do antebraco ao pulso) ----
  // 1px mais largas que o braco (para fora): o braco tem so 2px e a peca colada
  // nele sumia; saltando da silhueta ela ganha contorno proprio e "le" no mapa.
  mk('bracadeiras-couro', 'Braçadeiras de couro', S2, ['couro-escuro', 'ocre', 'bronze'], [['b', -3, ['mmm', 'aaa', 'aaa', 'yyy'], 1, 'both']]),
  mk('bracadeiras-amarradas', 'Braçadeiras amarradas', S2, ['couro-escuro', 'branco-gasto', 'bronze'], [['b', -3, ['aaa', 'mam', 'ama', 'mam'], 1, 'both']]),
  mk('bracadeira-arqueiro', 'Braçadeira de arqueiro', S2, ['couro', 'ocre', 'bronze'], [['b', -4, ['Aaa', 'aam', 'ama', 'aam', '.nn'], 1, 'R']]),
  mk('bracadeiras-cravejadas', 'Braçadeiras cravejadas', S2, ['couro-escuro', 'couro', 'aco'], [['b', -3, ['xxx', 'aCa', 'CaC', 'xxx'], 1, 'both']]),
  mk('bracadeiras-placas', 'Braçadeiras de placas', S2, ['ferro', 'couro', 'aco'], [['b', -3, ['ncc', 'zzz', 'ccc', 'zzz'], 1, 'both']]),
  mk('bracadeiras-gravadas', 'Braçadeiras gravadas', S2, ['couro', 'couro', 'prata'], [['b', -3, ['ccc', 'coc', 'oco', 'zzz'], 1, 'both']]),
  mk('bracadeiras-pele', 'Braçadeiras com pele', S2, ['couro-escuro', 'branco-gasto', 'bronze'], [['b', -4, ['m.m', 'bmb', 'aaa', 'aaa', 'xxx'], 1, 'both']]),
  mk('bracadeiras-espinhos', 'Braçadeiras com espinhos', S2, ['couro-escuro', 'couro', 'aco'], [['b', -3, ['.aaa', 'Caaa', '.aaa', 'Caaa'], 2, 'both']]),
  mk('bracadeiras-escamas', 'Braçadeiras de escamas', S2, ['jade', 'couro', 'ouro'], [['b', -3, ['AaA', 'aAa', 'AaA', 'nnn'], 1, 'both']]),
  mk('bracadeira-gema', 'Braçadeira com gema', S2, ['couro-escuro', 'couro', 'ouro'], [['b', -3, ['nnn', 'ara', 'aaa', 'zzz'], 1, 'L']]),
  mk('manguitos-malha', 'Manguitos de malha', S2, ['couro', 'couro', 'aco'], [['t', 2, ['nzn', 'znz', 'nzn', 'znz'], 1, 'both']]),
  mk('bracadeira-longa', 'Braçadeira longa de couro', S2, ['vinho', 'ocre', 'ouro'], [['b', -4, ['mmm', 'aaa', 'aCa', 'aaa', 'mmm'], 1, 'L']]),

  // ---- Pulseiras e braceletes ----
  mk('pulseira-ouro', 'Pulseira de ouro', S3, ['couro', 'couro', 'ouro'], [['b', 0, ['cCc'], 1, 'L']]),
  mk('pulseiras-contas', 'Pulseiras de contas', S3, ['couro', 'carmesim', 'ouro'], [['b', -1, ['mnm', 'nmn'], 1, 'both']]),
  mk('braceletes-varios', 'Braceletes empilhados', S3, ['couro', 'couro', 'ouro'], [['b', -3, ['.Cc', '...', 'nCc', '.cC'], 1, 'L']]),
  mk('corrente-pulso', 'Corrente no pulso', S3, ['couro', 'couro', 'aco'], [['b', 0, ['ncz', 'n..', 'z..'], 1, 'R']]),
  mk('bracelete-serpente', 'Bracelete de serpente', S3, ['couro', 'couro', 'ouro'], [['t', 2, ['r..', 'cnc', '.zc', 'ncz'], 1, 'L']]),
  mk('argolas-braco', 'Argolas acima do cotovelo', S3, ['couro', 'couro', 'ouro'], [['t', 3, ['cCc', 'zzz'], 1, 'both']]),
  mk('pulseiras-trancadas', 'Pulseiras de couro trançado', S3, ['couro-escuro', 'ocre', 'bronze'], [['b', -1, ['ama', 'mam'], 1, 'both']]),
  mk('pulseira-dentes', 'Pulseira de dentes', S3, ['couro-escuro', 'couro', 'osso'], [['b', -1, ['aaa', 'W.W'], 1, 'L']]),
  mk('bracelete-gemas', 'Bracelete de gemas', S3, ['couro', 'couro', 'prata'], [['t', 3, ['nnn', 'tnr'], 1, 'R']]),

  // ---- Faixas e marcas ----
  mk('bandagens-bracos', 'Bandagens nos braços', S4, ['linho', 'osso', 'ferro'], [['b', -3, ['aa', 'xa', 'ax', 'aa'], 0, 'both']]),
  mk('braco-enfaixado', 'Braço enfaixado', S4, ['branco-gasto', 'sangue', 'ferro'], [['t', 0, ['aa', 'xa', 'aa', 'ax', 'ab', 'xa', 'aa'], 0, 'L']]),
  mk('fita-braco', 'Fita amarrada no braço', S4, ['couro', 'carmesim', 'ouro'], [['t', 3, ['mbb', 'b..', 'm..'], 1, 'L']]),
  mk('grilhoes', 'Grilhões', S4, ['couro', 'couro', 'ferro'], [['b', -1, ['ncc', 'zCz', '.n.'], 1, 'both']]),
  mk('tatuagem-tribal', 'Tatuagem tribal', S4, ['anil', 'anil', 'ferro'], [['t', 3, ['.x', 'xx', 'x.', '.x'], 0, 'L', { up: [['x.', 'xx', '.x', 'x.'], 0] }]]),
  mk('tatuagens-faixas', 'Tatuagens de faixas', S4, ['carvao', 'carvao', 'ferro'], [['t', 3, ['xx', '..', 'xx'], 0, 'both']]),
  mk('runas-brilhantes', 'Runas brilhantes', S4, ['arcano', 'jade', 'ferro'], [['b', -3, ['B.', '.m', 'B.', '.B'], 0, 'L']]),
  mk('fitas-pulsos', 'Fitas nos pulsos', S4, ['couro', 'rosa-seco', 'ouro'], [['b', -1, ['m..', 'bbb'], 1, 'both']]),
  mk('cicatriz-costurada', 'Cicatriz costurada', S4, ['couro', 'couro', 'ferro'], [['b', -3, ['wK', 'Kw', 'wK'], 0, 'R']]),
  mk('marca-sangue', 'Marca de sangue', S4, ['sangue', 'sangue', 'ferro'], [['t', 4, ['xx', 'x.', 'xx'], 0, 'R']])
];
