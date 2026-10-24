// Cintura: cintos, faixas, bolsas, frascos e coisas presas no quadril.
// Geracao por especificacao: estilo de cinto x fivela x penduricalhos, cada
// combinacao com nome proprio. Canais: a = couro/tecido do cinto, b = penduricalho
// (bolsa, vidro, tecido), c = metal/osso (fivela, rebites).
// Legenda da arte: '0'-'4' = canal a (tons), 'a'-'e' = canal b, 'A'-'E' = canal c.
const LG = { w: ['w', 3], W: ['w', 2], z: ['w', 1], y: ['#f4c85a', 3], Y: ['#e08a2e', 2] };
for (let i = 0; i < 5; i++) { LG[i] = ['a', i]; LG['abcde'[i]] = ['b', i]; LG['ABCDE'[i]] = ['c', i]; }
const art = (L, x, y, rows) => L.art(x, y, rows, LG);

// Penduricalhos: o topo de cada um fica logo abaixo do cinto (linha P.hip).
const SPR = {
  pouch: ['dcc', 'cCb', 'ccb', 'bbb'],
  pouchBig: ['dccc', 'cDcb', 'cccb', 'cccb', 'bbbb'],
  coins: ['.2.', 'dcb', 'ccb', 'cDb'],
  vial: ['.3', 'dc', 'cb', 'bb'],
  vialTall: ['.3', 'Cc', 'dc', 'cb', 'bb'],
  flask: ['.3.', 'dcb', 'ccb', 'cbb', '.bb'],
  dagger: ['.2', 'CD', 'cb', 'cb', 'bb', '.a'],
  keys: ['DDD', 'C.C', 'D.D', '.C.'],
  book: ['dccb', 'cDcb', 'cccb', 'cccb', 'zWWz'],
  hammer: ['CDC', '.2.', '.2.', '.2.'],
  pliers: ['2.2', '2.2', 'C.C', 'D.D'],
  axe: ['.2.', '.2.', '.2.', 'DDC', '.CC'],
  bone: ['DD.', '.D.', '.D.', '.DD'],
  tassel: ['.C.', '.2.', 'bbb', 'b.b'],
  fur: ['dc', 'cc', 'cb', 'b.'],
  coil: ['dcd', 'c.c', 'dcb'],
  amulet: ['.2.', 'CDC', '.C.'],
  skullh: ['DDD', 'ADA', '.D.']
};

function rg(P, y) { return P.torso.rows.get(y) || [P.torso.x0, P.torso.x1]; }
// x de um item de largura w no quadril: l/r/c (de frente e de costas; no perfil, l = frente do corpo)
function slotX(P, where, w) {
  const t = P.torso;
  if (P.view === 'side') return where === 'l' ? t.x0 : where === 'r' ? t.x1 - w + 1 : t.x0 + 1;
  return where === 'l' ? t.x0 + 1 : where === 'r' ? t.x1 - w : 12 - Math.ceil(w / 2);
}
function hang(L, P, kind, where, dy = 0) {
  const s = SPR[kind];
  const w = s[0].length;
  art(L, slotX(P, where, w), P.hip + dy, s);
}

function belt(L, P, st, h) {
  for (let r = 0; r < h; r++) {
    const y = P.hip - h + r;
    const [a, b] = rg(P, y);
    const mid = r > 0 && r < h - 1;
    const tone = h === 1 ? 2 : r === 0 ? 3 : r === h - 1 ? 1 : 2;
    for (let x = a; x <= b; x++) {
      const k = x - a;
      if (st === 'rope') L.px(x, y, 'a', (k + r) % 2 ? 3 : 1);
      else if (st === 'chain') L.px(x, y, 'c', k % 2 ? 3 : 1);
      else if (st === 'sash') L.px(x, y, 'a', r === 0 ? 3 : r === h - 1 ? 1 : (k + r) % 4 === 0 ? 3 : 2);
      else if (st === 'stripe') L.px(x, y, mid ? 'b' : 'a', mid ? 2 : tone);
      else L.px(x, y, 'a', tone);
      if ((st === 'wide' || st === 'plain') && h >= 3 && mid && k % 2 === 0) L.px(x, y, 'a', 4); // pesponto
      if (st === 'stud' && (h === 1 || mid) && k % 3 === 1) L.px(x, y, 'c', 3);
      if (st === 'bone' && mid && k % 3 === 1) L.px(x, y, 'c', 3);
      if (st === 'bone' && r === h - 1 && k % 3 === 1) L.px(x, y, 'c', 2);
      if (st === 'rune' && mid && k % 2 === 1) L.px(x, y, 'b', 3 + (k % 4 === 1 ? 1 : 0) - 1);
      if (st === 'cart' && (h === 1 || mid) && k % 3 === 1) { L.px(x, y, 'b', 2); if (h >= 3) L.px(x, y - 1, 'b', 3); }
    }
  }
}

function buckle(L, P, kind, h) {
  if (!kind || P.view === 'up') return;
  const yb = P.hip - 1;
  const x0 = P.view === 'side' ? P.torso.x0 : 0;
  const put = (w, rows) => art(L, P.view === 'side' ? x0 : 12 - Math.ceil(w / 2), yb - rows.length + 1, rows);
  if (kind === 'sq') put(2, h >= 2 ? ['DD', 'CC'] : ['DC']);
  if (kind === 'ring') put(3, ['DDD', 'D2D', 'DDD']);
  if (kind === 'plate') put(4, ['DDDD', 'DCCB', 'CCBB']);
  if (kind === 'big') put(4, ['EDDD', 'DCCC', 'DCBC', 'CCCB']);
  if (kind === 'skull') put(3, SPR.skullh);
  if (kind === 'clasp') put(2, ['b3', 'Cb']);
  if (kind === 'gem') put(3, ['.D.', 'DbD', '.C.']);
}

// Faixa com nó num dos lados e duas pontas que balancam ao andar.
function knot(L, P, where, long = 4, fringe = false) {
  const sw = P.walk ? P.phase : 0;
  const x = slotX(P, where, 2);
  const y = P.hip - 1;
  L.px(x, y, 'b', 3); L.px(x + 1, y, 'b', 2); L.px(x, y - 1, 'b', 3);
  for (let i = 1; i <= long; i++) {
    L.px(x - (i > 2 ? sw : 0), y + i, 'b', i % 2 ? 2 : 1);
    L.px(x + 1 + (i > 1 ? sw : 0), y + i, 'b', i % 2 ? 1 : 2);
  }
  if (fringe) { L.px(x - sw, y + long + 1, 'b', 3); L.px(x + 1 + sw, y + long + 1, 'b', 3); }
}

// Faixa pendurada na frente (pano de cintura): largura w, comprimento len
function cloth(L, P, w, len, ch = 'b', zig = false) {
  const x = P.view === 'side' ? P.torso.x0 - 1 : 12 - Math.ceil(w / 2);
  const sw = P.walk ? P.phase : 0;
  for (let r = 0; r < len; r++) for (let k = 0; k < w; k++) {
    if (zig && r === len - 1 && k % 2) continue;
    L.px(x + k - (r > 2 ? sw : 0), P.hip + r, ch, k === 0 ? 3 : k === w - 1 ? 1 : 2);
  }
}
function straps(L, P) {
  const lens = [3, 5, 4];
  const x = P.view === 'side' ? P.torso.x0 : 10;
  lens.forEach((n, i) => { for (let r = 0; r < n; r++) L.px(x + i * (P.view === 'side' ? 1 : 2), P.hip + r, 'b', r === n - 1 ? 1 : 2); L.px(x + i * (P.view === 'side' ? 1 : 2), P.hip + n - 1, 'c', 3); });
}
function lantern(L, P, where) {
  const x = slotX(P, where, 3);
  art(L, x, P.hip, ['.C.', 'CyC', 'CYC', '.C.']);
  if (P.f % 2) L.px(x + 1, P.hip + 1, '#ffe9a0', 3);
}

const MAN = { chain: 'c' };

function mk(id, name, sub, channels, spec) {
  const { belt: [st, h] = ['plain', 2], buckle: bk, hang: hg = [], extra, front } = spec;
  return {
    id, name, sub, channels,
    draw(L, P, ctx) {
      for (const [k, w, dy] of hg) if (!front || P.view !== 'up' || k !== 'book') hang(L, P, k, w, dy || 0);
      if (st !== 'none') belt(L, P, st, h);
      buckle(L, P, bk, h);
      extra?.(L, P, ctx);
    }
  };
}
const CB = (b = 'couro') => [{ label: 'Couro', def: 'couro-escuro' }, { label: 'Detalhe', def: b }, { label: 'Metal', def: 'bronze' }];
const ch = (a, b, c) => [{ label: 'Cinto', def: a }, { label: 'Detalhe', def: b }, { label: 'Metal', def: c }];

export const WAIST = [
  // ---- cintos ----
  mk('cinto-fino', 'Cinto fino', 'Cintos', ch('couro-escuro', 'couro', 'bronze'), { belt: ['plain', 1], buckle: 'sq' }),
  mk('cinto-couro', 'Cinto de couro', 'Cintos', ch('couro', 'couro', 'ferro'), { belt: ['plain', 2], buckle: 'sq' }),
  mk('cinto-largo', 'Cinto largo', 'Cintos', ch('couro-escuro', 'couro', 'bronze'), { belt: ['wide', 3], buckle: 'ring' }),
  mk('cinto-rebites', 'Cinto de rebites', 'Cintos', ch('couro-escuro', 'couro', 'aco'), { belt: ['stud', 3], buckle: 'sq' }),
  mk('cinto-corda', 'Cinto de corda', 'Cintos', ch('camurca', 'couro', 'ocre'), { belt: ['rope', 2], extra: (L, P) => { const x = slotX(P, 'l', 2); L.px(x, P.hip, 'a', 2); L.px(x + 1, P.hip + 1, 'a', 1); L.px(x, P.hip + 2, 'a', 3); } }),
  mk('cordao-trancado', 'Cordão trançado', 'Cintos', ch('vinho', 'ouro', 'ouro'), { belt: ['rope', 1], hang: [['tassel', 'l']] }),
  mk('cinto-correntes', 'Cinto de correntes', 'Cintos', ch('couro-escuro', 'couro', 'aco'), { belt: ['chain', 1], extra: (L, P) => { const x = slotX(P, 'r', 1); for (let i = 0; i < 4; i++) L.px(x + (i % 2), P.hip + i, 'c', i % 2 ? 1 : 3); } }),
  mk('cinto-ossos', 'Cinto de ossos', 'Cintos', ch('couro-escuro', 'couro', 'osso'), { belt: ['bone', 3], buckle: 'skull', hang: [['bone', 'r']] }),
  mk('cinturao-fivela-grande', 'Cinturão de fivela grande', 'Cintos', ch('couro', 'couro', 'ouro'), { belt: ['wide', 3], buckle: 'big' }),
  mk('cinto-caveira', 'Cinto de caveira', 'Cintos', ch('carvao', 'couro', 'osso'), { belt: ['plain', 2], buckle: 'skull' }),
  mk('cinto-runas', 'Cinto de runas', 'Cintos', ch('couro-escuro', 'arcano', 'prata'), { belt: ['rune', 3], buckle: 'gem' }),
  mk('cinto-ferro', 'Cinto de placas', 'Cintos', ch('ferro', 'couro', 'aco'), { belt: ['stud', 3], buckle: 'plate' }),
  // ---- faixas ----
  mk('faixa-linho', 'Faixa de linho', 'Faixas', ch('linho', 'linho', 'ouro'), { belt: ['sash', 3], extra: (L, P) => knot(L, P, 'r', 4) }),
  mk('faixa-carmesim', 'Faixa carmesim', 'Faixas', ch('carmesim', 'carmesim', 'ouro'), { belt: ['sash', 3], extra: (L, P) => knot(L, P, 'l', 5, true) }),
  mk('faixa-dupla', 'Faixa dupla', 'Faixas', ch('oliva', 'ocre', 'bronze'), { belt: ['stripe', 3], extra: (L, P) => knot(L, P, 'r', 3) }),
  mk('faixa-larga', 'Faixa larga', 'Faixas', ch('azul-noite', 'mostarda', 'prata'), { belt: ['stripe', 4], extra: (L, P) => knot(L, P, 'l', 4) }),
  mk('faixa-franjas', 'Faixa de franjas', 'Faixas', ch('vinho', 'ouro', 'ouro'), { belt: ['sash', 2], extra: (L, P) => knot(L, P, 'r', 3, true) }),
  mk('pano-frontal', 'Pano frontal', 'Faixas', ch('couro-escuro', 'terra', 'bronze'), { belt: ['plain', 2], buckle: 'sq', extra: (L, P) => cloth(L, P, 4, 6, 'b', true) }),
  mk('tiras-couro', 'Tiras de couro', 'Faixas', ch('couro-escuro', 'couro', 'bronze'), { belt: ['wide', 3], extra: straps }),
  // ---- bolsas ----
  mk('cinto-bolsa', 'Cinto com bolsa', 'Bolsas', ch('couro-escuro', 'couro', 'bronze'), { belt: ['plain', 2], buckle: 'sq', hang: [['pouch', 'r']] }),
  mk('cinto-duas-bolsas', 'Cinto de duas bolsas', 'Bolsas', ch('couro-escuro', 'camurca', 'ferro'), { belt: ['plain', 2], hang: [['pouch', 'l'], ['pouch', 'r']] }),
  mk('bolsa-moedas', 'Bolsa de moedas', 'Bolsas', ch('couro', 'terra', 'ouro'), { belt: ['plain', 2], buckle: 'sq', hang: [['coins', 'r']] }),
  mk('bolsa-grande', 'Bolsa grande de lado', 'Bolsas', ch('couro-escuro', 'madeira', 'bronze'), { belt: ['wide', 3], hang: [['pouchBig', 'r']] }),
  mk('bolsa-ervas', 'Bolsa de ervas', 'Bolsas', ch('couro-escuro', 'musgo', 'bronze'), { belt: ['plain', 2], buckle: 'sq', hang: [['pouch', 'l']], extra: (L, P) => { const x = slotX(P, 'l', 3); L.px(x + 1, P.hip - 2, '#6faa4a', 3); L.px(x + 2, P.hip - 3, '#8cc460', 3); L.px(x, P.hip - 2, '#4f8238', 2); } }),
  mk('cinto-chaves', 'Cinto de chaves', 'Bolsas', ch('couro', 'couro', 'bronze'), { belt: ['plain', 2], buckle: 'sq', hang: [['keys', 'r']] }),
  // ---- frascos ----
  mk('pocao-vermelha', 'Poção vermelha', 'Frascos', ch('couro-escuro', 'sangue', 'bronze'), { belt: ['plain', 2], buckle: 'sq', hang: [['vial', 'r']] }),
  mk('tres-frascos', 'Três frascos', 'Frascos', ch('couro', 'jade', 'ferro'), { belt: ['plain', 2], hang: [['vial', 'l'], ['vialTall', 'c'], ['vial', 'r']] }),
  mk('pocao-azul-verde', 'Poções azul e verde', 'Frascos', ch('couro-escuro', 'azul-aco', 'bronze'), { belt: ['wide', 3], hang: [['vialTall', 'l'], ['vial', 'r']], extra: (L, P) => { const x = slotX(P, 'r', 2); L.px(x, P.hip + 1, '#5fbf6a', 3); L.px(x + 1, P.hip + 2, '#3f8f4a', 2); } }),
  mk('cantil', 'Cantil', 'Frascos', ch('couro', 'oliva', 'ferro'), { belt: ['plain', 2], buckle: 'sq', hang: [['flask', 'r']] }),
  mk('cinto-cartuchos', 'Cinto de cartuchos de ervas', 'Frascos', ch('couro-escuro', 'jade', 'bronze'), { belt: ['cart', 3], buckle: 'sq' }),
  mk('frasco-veneno', 'Frasco de veneno', 'Frascos', ch('carvao', 'floresta', 'osso'), { belt: ['plain', 2], buckle: 'skull', hang: [['vialTall', 'r']] }),
  mk('bandoleira-frascos', 'Bandoleira de frascos', 'Frascos', ch('couro', 'arcano', 'bronze'), { belt: ['plain', 2], buckle: 'sq', extra: (L, P) => {
    if (P.view === 'side') return;
    const y0 = P.torso.top + 1;
    for (let i = 0; i < 7; i++) { const x = P.view === 'up' ? P.torso.x1 - 1 - i : P.torso.x0 + 1 + i; L.px(x, y0 + i, 'a', i % 2 ? 2 : 3); }
    if (P.view === 'down') for (const i of [2, 4, 6]) { L.px(P.torso.x0 + 1 + i, y0 + i + 1, 'b', 3); L.px(P.torso.x0 + 1 + i, y0 + i + 2, 'b', 2); }
  } }),
  // ---- ferramentas e armas ----
  mk('adaga-cinto', 'Adaga no cinto', 'Ferramentas e armas', ch('couro-escuro', 'ferro-negro', 'aco'), { belt: ['plain', 2], buckle: 'sq', hang: [['dagger', 'r']] }),
  mk('duas-adagas', 'Duas adagas', 'Ferramentas e armas', ch('couro', 'couro-escuro', 'prata'), { belt: ['wide', 3], hang: [['dagger', 'l'], ['dagger', 'r']] }),
  mk('cinto-ferramentas', 'Cinto de ferramentas', 'Ferramentas e armas', ch('couro', 'madeira', 'aco'), { belt: ['wide', 3], buckle: 'sq', hang: [['hammer', 'l'], ['pliers', 'r']] }),
  mk('machadinha-cinto', 'Machadinha no cinto', 'Ferramentas e armas', ch('couro-escuro', 'madeira', 'aco'), { belt: ['plain', 2], buckle: 'sq', hang: [['axe', 'r']] }),
  mk('grimorio-preso', 'Grimório preso', 'Ferramentas e armas', ch('couro-escuro', 'vinho', 'ouro'), { belt: ['plain', 2], buckle: 'sq', hang: [['book', 'r']] }),
  mk('lanterna-presa', 'Lanterna presa', 'Ferramentas e armas', ch('couro', 'couro', 'ferro'), { belt: ['plain', 2], buckle: 'sq', extra: (L, P) => lantern(L, P, 'r') }),
  mk('amuletos-cinto', 'Amuletos e ossos', 'Ferramentas e armas', ch('couro-escuro', 'couro', 'osso'), { belt: ['rope', 2], hang: [['bone', 'l'], ['amulet', 'r']] }),
  mk('corda-enrolada', 'Corda enrolada', 'Ferramentas e armas', ch('couro', 'camurca', 'ferro'), { belt: ['plain', 2], buckle: 'sq', hang: [['coil', 'r']] }),
  mk('cinto-cacador', 'Cinto de caçador', 'Ferramentas e armas', ch('couro', 'terra', 'bronze'), { belt: ['wide', 3], buckle: 'sq', hang: [['dagger', 'l'], ['fur', 'r']] }),
  mk('cinto-mago', 'Cinto de mago', 'Ferramentas e armas', ch('azul-noite', 'arcano', 'prata'), { belt: ['sash', 3], hang: [['vial', 'l'], ['book', 'r']], extra: (L, P) => { const x = slotX(P, 'c', 2); L.px(x, P.hip - 2, 'c', 4); L.px(x + 1, P.hip - 2, 'c', 3); } })
];
