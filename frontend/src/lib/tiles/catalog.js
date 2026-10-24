// Catalogo de blocos do mapa (pixel art 16x16 feita a mao).
// Todos os blocos usam a MESMA paleta mestre (PAL) para o conjunto ficar coeso:
// cada bloco recebe so as cores que usa. '.' e transparente nos objetos.
// Luz vem do alto-esquerda: realce em cima/esquerda, sombra embaixo/direita.

export const SIZE = 16;
export const DEFAULT_GROUND = '.';
export const EMPTY_OBJECT = ' ';

// Paleta mestre (24/10, direcao de arte "beleza de Stardew"): quente e saturada, rampas com
// hue shifting (sombra puxa para azul/roxo, luz para amarelo/creme), contorno colorido escuro
// (nada de preto puro). O clima sombrio do Lugubre vem do ciclo de luz da cena (noite/entardecer).
const PAL = {
  k: '#2a1c2e', K: '#3c2a3e', // contorno (ameixa escura)
  1: '#3b3452', 2: '#524866', 3: '#6d627c', 4: '#8a7f8e', 5: '#ab9f9c', 6: '#d2c4ae', // pedra
  g: '#1d4a3e', h: '#2b6a40', i: '#468c3a', j: '#5fa53f', l: '#88c04a', m: '#bcd96c', // grama
  n: '#3d2230', o: '#5c3328', p: '#7d4a2e', q: '#9e6635', r: '#c08746', s: '#e0ad66', // madeira/terra
  t: '#a07246', u: '#c69a5c', v: '#e2bf7c', w: '#f4dda2', // areia
  x: '#1c2860', y: '#22468c', z: '#2c6cb0', A: '#3a92cc', B: '#5cb8e0', C: '#c4eef2', // agua
  D: '#9fb0d8', E: '#cfdcf2', G: '#f6f9ff', // neve / teia
  H: '#5a1a30', I: '#9c2a26', J: '#d4482c', L: '#f07c2e', M: '#ffb64a', N: '#ffe48a', // fogo/lava
  O: '#263a32', Q: '#3a5034', R: '#56683a', S: '#7a8a4c', // pantano
  T: '#2e1e4c', U: '#4a2e7a', V: '#7048ac', X: '#9c6cd4', Y: '#caa4f2', // arcano
  Z: '#7c4a1c', 7: '#b47c28', 8: '#e4ae3c', 9: '#ffe27c', // ouro
  a: '#4a1a32', b: '#7c2238', c: '#ac3440', d: '#d8584c', // tecido vermelho
  e: '#1e4a62', f: '#2c8098', 0: '#4cbcc6', P: '#bcf6ea', // cristal
  F: '#d8c6a2', W: '#faefd6', // osso
  '+': '#5a8c2c', '*': '#90c642', '^': '#d2ee7c' // acido
};

// Desloca as linhas na horizontal (com volta): usado para a agua/lava "correr".
function shift(rows, n) {
  return rows.map((r) => r.slice(SIZE - n) + r.slice(0, SIZE - n));
}

// Troca cores (quadros da lava: as rachaduras "respiram" sem a crosta andar).
function recolor(rows, map) {
  return rows.map((r) => [...r].map((ch) => map[ch] || ch).join(''));
}

// Monta o bloco e a paleta so com as cores usadas (o teste confere se nenhuma falta).
function tile(def) {
  const images = def.frames || def.variants || [def.pixels];
  const used = new Set(images.join(''));
  const palette = {};
  for (const ch of used) if (ch !== '.' && PAL[ch]) palette[ch] = PAL[ch];
  return { solid: false, ...def, pixels: images[0], palette };
}

const GRASS_A = [
  'iiiiiiijiiiiiiii',
  'iijiiiiiiiihiiii',
  'iiiiiliiiiiiiiji',
  'iiiijhjiiiiiiiii',
  'iiiiiiiiiijiiiii',
  'ijiiiiiiiilhiiii',
  'iiiiiiiiiiiiiiii',
  'iiiiihiiiiiiiiji',
  'iiiiiiiiijiiiiii',
  'iiliiiiiiiiiiiii',
  'iihjiiiiiiiiliii',
  'iiiiiiiijiiihjii',
  'iiiiiiiiiiiiiiii',
  'iiiijiiiiiiiiiii',
  'iiiiiiiiiihiiiji',
  'ijiiiiiiiiiiiiii'
];
const GRASS_B = [
  'iiiiiiiiiiiiiiii',
  'iiiiiiiiiliiiiii',
  'iijiiiiijhjiiiii',
  'iiiiiiiiiiiiiiii',
  'iiiiiiiiiiiiijii',
  'iiiiliiiiiiiiiii',
  'iiijhjiiiiijiiii',
  'iiiiiiiiiiiiiiii',
  'ijiiiiiiiiiiiiii',
  'iiiiiiiijiiiiiii',
  'iiiiiiiiiiiiliii',
  'iiiiiiiiiiiijhji',
  'iiiliiiiiiiiiiii',
  'iijhjiiiijiiiiii',
  'iiiiiiiiiiiiiiii',
  'iiiiiiiiiiiiiiji'
];
const GRASS_C = [
  'iiiiiiiiiiiiiiii',
  'iiiiihhiiiiiijii',
  'iiiihhhhiiiiiiii',
  'iiiiihhiiiiiiiii',
  'iijiiiiiiiimiiii',
  'iiiiiiiiiiljliii',
  'iiiiiiiiiiiiiiii',
  'iiiiiiiijiiiiiii',
  'iiimiiiiiiiiiiii',
  'iiljliiiiiiihhii',
  'iiiiiiiiiiihhhhi',
  'iiiiiiiiiiiihhii',
  'iiiiiiijiiiiiiii',
  'ijiiiiiiiiiiimii',
  'iiiiiiiiiiiiljli',
  'iiiiiiiiiiiiiiii'
];

const FLOOR_A = [
  '4444443144444431',
  '4333332143333321',
  '4333332143323321',
  '4323332143333321',
  '4333332143333321',
  '4333232143333321',
  '3222222132222221',
  '1111111111111111',
  '4431444444314444',
  '3321433333214333',
  '3321433323214333',
  '3321433333214323',
  '3321433333214333',
  '3321433333214333',
  '2221322222213222',
  '1111111111111111'
];
const FLOOR_B = [
  '4444443144444431',
  '4333332143333321',
  '433j332143323321',
  '43ij332143332321',
  '4333332143322321',
  '4333232143333321',
  '3222222132222221',
  '1111111111111111',
  '4431444444314444',
  '3321433333214333',
  '3321433233214333',
  '3321433323214i33',
  '332143332321ij33',
  '3321433333214333',
  '2221322222213222',
  '1111111111111111'
];

const WATER = [
  'BBBBBBBBBBBBBBBB',
  'BBCCBBBBBBBBBBBB',
  'BAAAABBBBBBCCBBB',
  'BBBBBBBBBBAAAABB',
  'BBBBBBBBBBBBBBBB',
  'BBBBBBCCBBBBBBBB',
  'BBBBBAAAABBBBBBB',
  'BBBBBBBBBBBBBBBB',
  'BCCBBBBBBBBBBBBB',
  'AAAABBBBBBBBCCBB',
  'BBBBBBBBBBBAAAAB',
  'BBBBBBBBBBBBBBBB',
  'BBBBBBBBCCBBBBBB',
  'BBBBBBBAAAABBBBB',
  'BBBBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBBBB'
];
const DEEP = [
  'zzzzzzzzzzzzzzzz',
  'zzAAzzzzzzzzzzzz',
  'zyyyyzzzzzzzzzzz',
  'zzzzzzzzzzAAzzzz',
  'zzzzzzzzzyyyyzzz',
  'zzzzzzzzzzzzzzzz',
  'zzzzzBzzzzzzzzzz',
  'zzzzAAAzzzzzzzzz',
  'zzzyyyyyzzzzzAzz',
  'zzzzzzzzzzzzyyyz',
  'zzzzzzzzzzzzzzzz',
  'zAAzzzzzzzzzzzzz',
  'yyyyzzzzzzAAzzzz',
  'zzzzzzzzzyyyyzzz',
  'zzzzzzzzzzzzzzzz',
  'zzzzzzzzzzzzzzzz'
];
const LAVA = [
  'NMLLJIJLLJJJJLMM',
  'MLJIIIILMJJIIIIJ',
  'MJJIIIIJMIIIIIII',
  'MJIIIIIJMJIIIIIJ',
  'NJIIIIIJNJIIIIIJ',
  'MIIIIIIJMJIIIIHJ',
  'MJIIIIJMMMLJIIHL',
  'LNMJJLMLJJLMLLMM',
  'JJJMNMJIIIIJNLMM',
  'JIIIMJIIIIILMJLN',
  'JIIILLIIIIILLJLM',
  'LIIILLIIIIJMJIJL',
  'LJIIJMIIIILLIIIL',
  'MLJHJMJIIJMLIIIJ',
  'MLJJJMJIILNJIIIJ',
  'MNLLMLMLLNMMMLJJ'
];

const DOOR = [
  '6555555555555554',
  '54kkkkkkkkkkkk43',
  '54krqnrqnrqnrk43',
  '54k2222222222k43',
  '54krqnrqnrqnrk43',
  '54krqnrqnrqnrk43',
  '54krqnrqnrqnrk43',
  '54krqnrqnrq9rk43',
  '54krqnrqnrq8rk43',
  '54krqnrqnrqnrk43',
  '54krqnrqnrqnrk43',
  '54krqnrqnrqnrk43',
  '54k2222222222k43',
  '54krqnrqnrqnrk43',
  '54krqnrqnrqnrk43',
  '3333333333333332'
];

const FIRE_BASE = [
  '...IJLMNNMLJI...',
  '..k43kpqqpk34k..',
  '.k43kqpkkpqk34k.',
  '.k332kkkkkk233k.',
  '..kkk......kkk..'
];
const FIRE_A = [
  '................',
  '................',
  '........M.......',
  '.......MM.......',
  '......MLM...M...',
  '......LML..ML...',
  '.....MLNLM.LM...',
  '.....LMNNMLL....',
  '....JLMNNMLJ....',
  '....JLMNNNMLJ...',
  '...IJLMNNMLJI...',
  ...FIRE_BASE
];
const FIRE_B = [
  '................',
  '................',
  '.......M........',
  '......MM........',
  '......MLM.......',
  '.....MLML..M....',
  '.....LMNLM.ML...',
  '.....LMNNMLL....',
  '....JLMNNMLJ....',
  '....JLMNNNMLJ...',
  '...IJLMNNMLJI...',
  ...FIRE_BASE
];
const FIRE_C = [
  '................',
  '..........N.....',
  '................',
  '.........M......',
  '....M...MLM.....',
  '....LM..LML.....',
  '.....LMLNLM.....',
  '.....LMNNMLL....',
  '....JLMNNMLJ....',
  '....JLMNNNMLJ...',
  '...IJLMNNMLJI...',
  ...FIRE_BASE
];

const TORCH_BASE = [
  '......kIJk......',
  '......k32k......',
  '.......kqk......',
  '.......kqk......',
  '......kk3kk.....',
  '.....k44332k....',
  '......kkkkk.....',
  '................',
  '................'
];
const TORCH = [
  [
    '................',
    '.......M........',
    '.......ML.......',
    '......MNL.......',
    '......LNMJ......',
    '......JLMJ......',
    '.......JI.......',
    ...TORCH_BASE
  ],
  [
    '........M.......',
    '.......MM.......',
    '.......NL.......',
    '......MNLM......',
    '......LNMJ......',
    '......JLMJ......',
    '.......JI.......',
    ...TORCH_BASE
  ],
  [
    '................',
    '................',
    '......ML........',
    '......MNM.......',
    '......LNMJ......',
    '......JLLJ......',
    '.......JI.......',
    ...TORCH_BASE
  ]
];

const PORTAL = [
  ['......kkkk......', '....kk5555kk....', '...k555TT544k...', '..k55TUUUTT44k..', '.k55XVUUVVVU43k.', '.k5TXUUVXYXVT3k.', 'k55XVUVYYYYYX22k', 'k5TYXVUYYVVYXT2k', 'k5TXYVVYYUVXYT2k', 'k55XYYYYYVUVX22k', '.k4TVXYXVUUXT2k.', '.k44UVVVUUVX22k.', '..k44TTUUUT22k..', '...k332TT222k...', '....kk2222kk....', '......kkkk......'],
  ['......kkkk......', '....kk5555kk....', '...k555TT544k...', '..k55TUVXXT44k..', '.k55TUVYYYYX43k.', '.k5TUVYYXVXXT3k.', 'k55UUVYXUUUVX22k', 'k5TUUVYYYVUUVT2k', 'k5TVUUVYYYVUUT2k', 'k55XVUUUXYVUU22k', '.k4TXXVXYYVUT2k.', '.k44XYYYYVUT22k.', '..k44TXXVUT22k..', '...k332TT222k...', '....kk2222kk....', '......kkkk......'],
  ['......kkkk......', '....kk5555kk....', '...k555TT544k...', '..k55TXXXVT44k..', '.k55VYXVUUUV43k.', '.k5TXYVUUUUUT3k.', 'k55UXYVUXXVUT22k', 'k5TUXYXYYYYVUT2k', 'k5TUVYYYYXYXUT2k', 'k55TUVXXUVYXU22k', '.k4TUUUUUVYXT2k.', '.k44VUUUVXYV22k.', '..k44TVXXXT22k..', '...k332TT222k...', '....kk2222kk....', '......kkkk......']
];

const BASE_TILES = [
  // ---------- Chao ----------
  tile({ code: '.', name: 'Grama', category: 'Chão', layer: 'ground', variants: [GRASS_A, GRASS_B, GRASS_C] }),
  tile({
    code: ',', name: 'Terra', category: 'Chão', layer: 'ground',
    pixels: [
      'pppppppppppppppp',
      'ppoppppppppqpppp',
      'ppppppppppppppop',
      'pppqrppppppppppp',
      'ppppopppppoppppp',
      'pppppppppppppppp',
      'ppppppppqppppppp',
      'popppppppppppqrp',
      'ppppppppppppppop',
      'pppppopppppppppp',
      'pppppppppppppppp',
      'ppqppppppopppppp',
      'pppopppppppppppp',
      'pppppppppppqrppp',
      'pppppppoppppoppp',
      'pppppppppppppppp'
    ]
  }),
  tile({ code: '_', name: 'Piso de pedra', category: 'Chão', layer: 'ground', variants: [FLOOR_A, FLOOR_B] }),
  tile({
    code: '=', name: 'Assoalho de madeira', category: 'Chão', layer: 'ground',
    pixels: [
      'rrrrrrrrrrnrrrrr',
      'qqqqqqqqqpnqqqqq',
      'qqqpppqqqpnqqqpq',
      'nnnnnnnnnnnnnnnn',
      'rrrrnrrrrrrrrrrr',
      'qqqpnqqqqqqqqqqq',
      'qqqpnqqppppqqqqq',
      'nnnnnnnnnnnnnnnn',
      'rrrrrrrrrrrrrnrr',
      'qqqqqqqqqqqqpnqq',
      'qqppqqqqqqqqpnqq',
      'nnnnnnnnnnnnnnnn',
      'rrrrrrrnrrrrrrrr',
      'qqqqqqpnqqqqqqqq',
      'qqqqqqpnqqqpppqq',
      'nnnnnnnnnnnnnnnn'
    ]
  }),
  tile({
    code: ':', name: 'Areia', category: 'Chão', layer: 'ground',
    pixels: [
      'vvvvvvvvvvvvvvvv',
      'vvvwvvvvvvvvuvvv',
      'vvvvvvvvvvvvvvvv',
      'vvvvvvvwwwvvvvvv',
      'vvuvvvwvvvuvvvvv',
      'vvvvvvvvvvvvvvwv',
      'vvvvvvvvvvvvvvvv',
      'vwvvvvvvvvvvvvvv',
      'vvvvvvvvvuvvvvvv',
      'vvvvvwwwvvvvvvvv',
      'vvvvwvvvuvvvvwvv',
      'vvvvvvvvvvvvvvvv',
      'vvuvvvvvvvvvvvvv',
      'vvvvvvvvvvvwwwvv',
      'vvvvvvwvvvwvvvuv',
      'vvvvvvvvvvvvvvvv'
    ]
  }),
  tile({
    code: '*', name: 'Neve', category: 'Chão', layer: 'ground',
    pixels: [
      'EEEEEEEEEEEEEEEE',
      'EEEGEEEEEEEEEEEE',
      'EEEEEEEEEEDEEEEE',
      'EEEEEEEGGEEEEEEE',
      'EEDEEEGEEDEEEEEE',
      'EEEEEEEEEEEEEEGE',
      'EEEEEEEEEEEEEEEE',
      'EGEEEEEEEEEEEEEE',
      'EEEEEEEEEGGEEEEE',
      'EEEEDEEEGEEDEEEE',
      'EEEEEEEEEEEEEEEE',
      'EEEEEEEEEEEEEEEE',
      'EEEGGEEEEEEEEDEE',
      'EEGEEDEEEEEEEEEE',
      'EEEEEEEEEEEGEEEE',
      'EEEEEEEEEEEEEEEE'
    ]
  }),
  tile({
    code: ';', name: 'Estrada de pedras', category: 'Chão', layer: 'ground',
    pixels: [
      '3542354235523542',
      '5432543254325432',
      '4332433243324332',
      '2222222222222222',
      '4235423542354265',
      '3254325432543254',
      '3243324332433243',
      '2222222222222222',
      '3542356235423542',
      '5432543254325432',
      '4332433243324332',
      '2222222222222222',
      '4235423542354235',
      '3254325432643254',
      '3243324332433243',
      '2222222222222222'
    ]
  }),
  tile({
    code: '-', name: 'Ponte', category: 'Construções', layer: 'ground',
    pixels: [
      'zzAzzzzzzAzzzzzz',
      'kkkkkkkkkkkkkkkk',
      'ssssssssssssssss',
      'qqqqqqqqqqqqqqqq',
      'nnnnnnnnnnnnnnnn',
      'rqqnrqqnrqqnrqqn',
      'roqnrqonrqqnroqn',
      'rqqnrqqnrqpnrqqn',
      'rqpnrqqnrqqnrqqn',
      'rqqnrpqnrqqnrqpn',
      'roqnrqonrqqnroqn',
      'rqqnrqqnrqqnrqqn',
      'ssssssssssssssss',
      'qqqqqqqqqqqqqqqq',
      'kkkkkkkkkkkkkkkk',
      'zzzzzAzzzzzzzAzz'
    ]
  }),

  // ---------- Agua ----------
  tile({ code: '~', name: 'Água rasa', category: 'Água', layer: 'ground', frames: [WATER, shift(WATER, 1), shift(WATER, 2)] }),
  tile({ code: 'W', name: 'Água funda', category: 'Água', layer: 'ground', solid: true, frames: [DEEP, shift(DEEP, 1), shift(DEEP, 2)] }),
  tile({
    code: '%', name: 'Pântano', category: 'Água', layer: 'ground',
    pixels: [
      'RRRRRRRRRRRRRRRR',
      'RRSRRRRRRRRRRRRR',
      'RRSRRRQQQQRRRRRR',
      'RRRRRQOOOOQRRRRR',
      'RRRRRQOOOOOQRRSR',
      'RRRRRRQQOOQRRRSR',
      'RRRRRRRRQQRRRRRR',
      'RRSRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRR',
      'RQQQRRRRRRRSRRRR',
      'QOOOQRRRRRRSRRRR',
      'QOjOQRRRRRRRRRRR',
      'RQQQRRRRRQQQRRRR',
      'RRRRRRRRQOOOQRRR',
      'RRRSRRRRRQQQRRRR',
      'RRRRRRRRRRRRRRRR'
    ]
  }),
  tile({ code: 'L', name: 'Lava', category: 'Especiais', layer: 'ground', solid: true, light: '#eb7a34', frames: [LAVA, recolor(LAVA, { M: 'N', L: 'M' }), recolor(LAVA, { M: 'N', L: 'M', J: 'L' })] }),

  // ---------- Paredes ----------
  tile({
    code: '#', name: 'Parede de pedra', category: 'Paredes', layer: 'ground', solid: true,
    pixels: [
      'kkkkkkkkkkkkkkkk',
      'k66665554k666554',
      'k65555543k655543',
      'k65555443k655443',
      'k55554443k554433',
      'k54444333k544333',
      'k43333332k433332',
      'kkkkkkkkkkkkkkkk',
      '65554k6666655554',
      '55543k6555555543',
      '55443k6555555443',
      '54433k5555544433',
      '44333k5444443333',
      '33332k4333333332',
      '33322k4333333222',
      '22222k3222222222'
    ]
  }),
  tile({
    code: 'B', name: 'Parede de tijolos', category: 'Paredes', layer: 'ground', solid: true,
    pixels: [
      'ddddddc1ddddddc1',
      'dcccccb1dcccccb1',
      'cbbbbbb1cbbbbbb1',
      '1111111111111111',
      'ddc1ddddddc1dddd',
      'ccb1dcccccb1dccc',
      'bbb1cbbbbbb1cbbb',
      '1111111111111111',
      'ddddddc1ccccccb1',
      'dcccccb1cbbbbba1',
      'cbbbbbb1baaaaaa1',
      '1111111111111111',
      'ddc1ddddddc1dddd',
      'ccb1dcccccb1dccc',
      'bbb1cbbbbbb1cbbb',
      '1111111111111111'
    ]
  }),
  tile({
    code: 'M', name: 'Parede de madeira', category: 'Paredes', layer: 'ground', solid: true,
    pixels: [
      'oooooooooooooooo',
      'srqnsrqnsrqnsrqn',
      'srqnsrqnsrpnsrqn',
      'srqnsrqnsrqnsrqn',
      'spqnsrqnsrqnsrqn',
      'srqnsrqnsrqnspqn',
      'kkkkkkkkkkkkkkkk',
      'ssssssssssssssss',
      'qqqqoqqqqqqqoqqq',
      'kkkkkkkkkkkkkkkk',
      'srqnsrqnsrqnsrqn',
      'srqnsrqnsrqnsrqn',
      'srpnsrqnsrqnsrqn',
      'srqnsrqnsrqnsrqn',
      'srqnsrqnsrqnspqn',
      'nnnnnnnnnnnnnnnn'
    ]
  }),
  tile({ code: 'D', name: 'Porta', category: 'Paredes', layer: 'ground', pixels: DOOR }),
  tile({
    code: 'X', name: 'Porta trancada', category: 'Paredes', layer: 'ground', solid: true,
    pixels: [
      DOOR[0], DOOR[1], DOOR[2], DOOR[3], DOOR[4], DOOR[5],
      '54krqnr77rqnrk43',
      '54krqn8998qnrk43',
      '54krqn87k7qnrk43',
      '54krqn7777qnrk43',
      DOOR[10], DOOR[11], DOOR[12], DOOR[13], DOOR[14], DOOR[15]
    ]
  }),
  tile({
    code: 'J', name: 'Janela', category: 'Paredes', layer: 'ground', solid: true,
    pixels: [
      '6555555555555554',
      '5444444444444443',
      '54kkkkkkkkkkkk43',
      '54kNMMLkkMMMLk43',
      '54kMMLLkkMMLLk43',
      '54kMLLJkkMLLJk43',
      '54kLLJJkkLLJJk43',
      '54kkkkkkkkkkkk43',
      '54kMMLLkkMMLLk43',
      '54kMLLJkkMLLJk43',
      '54kLLJJkkLLJJk43',
      '54kLJJIkkLJJIk43',
      '54kkkkkkkkkkkk43',
      '5466666666666643',
      '5433333333333332',
      '3222222222222221'
    ]
  }),
  tile({
    code: '>', name: 'Escada que desce', category: 'Masmorra', layer: 'ground',
    pixels: [
      '4266666666666621',
      '4255555555555521',
      '4233333333333321',
      '4255555555555521',
      '4244444444444421',
      '4222222222222221',
      '4244444444444421',
      '4233333333333321',
      '4211111111111121',
      '4233333333333321',
      '4222222222222221',
      '42kkkkkkkkkkkk21',
      '4211111111111121',
      '42kkkkkkkkkkkk21',
      '42KKKKKKKKKKKK21',
      '42kkkkkkkkkkkk21'
    ]
  }),
  tile({
    code: '<', name: 'Escada que sobe', category: 'Masmorra', layer: 'ground',
    pixels: [
      'posssssssssssson',
      'porrrrrrrrrrrron',
      'ponnnnnnnnnnnnon',
      'posssssssssssson',
      'poqqqqqqqqqqqqon',
      'ponnnnnnnnnnnnon',
      'porrrrrrrrrrrron',
      'poqqqqqqqqqqqqon',
      'ponnnnnnnnnnnnon',
      'porrrrrrrrrrrron',
      'poppppppppppppon',
      'ponnnnnnnnnnnnon',
      'poqqqqqqqqqqqqon',
      'poppppppppppppon',
      'ponnnnnnnnnnnnon',
      'poppppppppppppon'
    ]
  }),

  // ---------- Natureza ----------
  tile({
    code: 'T', name: 'Árvore', category: 'Natureza', layer: 'objects', solid: true,
    pixels: [
      '.....kkkkkk.....',
      '...kkjjlljjkk...',
      '..kjjllmmlljhk..',
      '.kjllmmmllljihk.',
      '.kjlmmllljjjihk.',
      'kjjllllljjjiiihk',
      'kjjlljjjjjiiihhk',
      'kijjjjjjjiiihhhk',
      'kiijjjjiiiihhhgk',
      '.kiiiiiiihhhhgk.',
      '.khiiihhhhhggk..',
      '..kkhhhggggkkk..',
      '....kkkpokkk....',
      '......kqpk......',
      '.....kkqpkk.....',
      '....kpqqppok....'
    ]
  }),
  tile({
    code: 'A', name: 'Pinheiro', category: 'Natureza', layer: 'objects', solid: true,
    pixels: [
      '.......kk.......',
      '......kjlk......',
      '......kjik......',
      '.....kjlihk.....',
      '....kjjliihk....',
      '.....kjlihk.....',
      '....kjlliihk....',
      '...kjjlliihhk...',
      '....kkjliihk....',
      '...kjjllihhhk...',
      '..kjjllliihhhk..',
      '.kjjjlliiihhhgk.',
      '.kkkkkkkkkkkkkk.',
      '.......kpk......',
      '......kqpok.....',
      '.......kk.......'
    ]
  }),
  tile({
    code: 'b', name: 'Arbusto', category: 'Natureza', layer: 'objects',
    pixels: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '......kkkk......',
      '....kkjllmkk....',
      '...kjllmmljhk...',
      '..kjjldlljjihk..',
      '..kjjjljjjiihk..',
      '.kjjjjjjjidihhk.',
      '.kijjjjjiiihhgk.',
      '.khiiiiiihhhggk.',
      '..khhhhhhggggk..',
      '...kkkkkkkkkk...',
      '................'
    ]
  }),
  tile({
    code: 'o', name: 'Rocha', category: 'Natureza', layer: 'objects', solid: true,
    pixels: [
      '................',
      '................',
      '................',
      '................',
      '......kkkkk.....',
      '....kk66554kk...',
      '...k66j5554433k.',
      '..k6jj555544332k',
      '..k65554443322k.',
      '.k655544433222k.',
      '.k555444332221k.',
      '.k54443332221k..',
      '..k433322211k...',
      '...kk2221kkk....',
      '.....kkkk.......',
      '................'
    ]
  }),
  tile({
    code: 'm', name: 'Cogumelos', category: 'Natureza', layer: 'objects',
    pixels: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.....kkkkk......',
      '....kddddck.....',
      '...kdWddWdck....',
      '...kddddcccck...',
      '...kkbbbbbbkk...',
      '.....kFWFk..kkk.',
      '.....kFWFk.kdWdk',
      '.kk..kFWFk.kccck',
      'kdck.kFFFk..kFk.',
      '.kFk..kkk...kk..'
    ]
  }),
  tile({
    code: 'f', name: 'Flores', category: 'Natureza', layer: 'objects',
    pixels: [
      '................',
      '................',
      '...X............',
      '..XYX.......W...',
      '...X.......W9W..',
      '...j........W...',
      '...j....X...j...',
      '.......XYX..j...',
      '...W....X.......',
      '..W9W...j.......',
      '...W....j...Y...',
      '...j.......YXY..',
      '...j........Y...',
      '............j...',
      '................',
      '................'
    ]
  }),
  tile({
    code: 'd', name: 'Árvore morta', category: 'Natureza', layer: 'objects', solid: true,
    pixels: [
      '................',
      '..k.........k...',
      '..kpk....k.kpk..',
      '...kpk..kpkpk...',
      '....kpk.kpqk....',
      '.....kpkpqk..k..',
      '..k...kpqqk.kpk.',
      '.kpkk.kpqqkkpk..',
      '..kppkkpqqqpk...',
      '...kkppqqqkk....',
      '.....kkpqqk.....',
      '......kpqqk.....',
      '......kpqqk.....',
      '.....kopqqok....',
      '....kkopqqpokk..',
      '....kkkkkkkkk...'
    ]
  }),
  tile({
    code: 'l', name: 'Tronco caído', category: 'Natureza', layer: 'objects', solid: true,
    pixels: [
      '................',
      '................',
      '................',
      '................',
      '....kpk.........',
      '.kkkkkkkkkkkkkkk',
      '.krrsjjrrrsrqsqk',
      '.kqqqqqqqqqqsrsk',
      '.kqpqqqqpqqqrprk',
      '.kppppppppppsrsk',
      '.kooooooooooqsqk',
      '.kkkkkkkkkkkkkkk',
      '................',
      '................',
      '................',
      '................'
    ]
  }),

  // ---------- Masmorra ----------
  tile({
    code: '^', name: 'Armadilha', category: 'Masmorra', layer: 'objects',
    pixels: [
      '................',
      '................',
      '..kkkkkkkkkkkk..',
      '..k5444444443k..',
      '..k3623623623k..',
      '..k3423423423k..',
      '..k3333333333k..',
      '..k3623623623k..',
      '..k3423423423k..',
      '..k3333b33333k..',
      '..k3623623623k..',
      '..k3423423423k..',
      '..k3222222221k..',
      '..kkkkkkkkkkkk..',
      '................',
      '................'
    ]
  }),
  tile({
    code: 'w', name: 'Teia', category: 'Masmorra', layer: 'objects',
    pixels: [
      'DDEEEEEEEEEEEEEE',
      'DEDD.D....D...D.',
      'EDE.DD....D...D.',
      'ED.ED.DD.DD...D.',
      'E.DDE...DDD..DD.',
      'EDD..E..DD.DDD..',
      'E..D..E.D...DDD.',
      'E..D...ED...D..D',
      'E...DDDDE..DD...',
      'E..DDD...EDD....',
      'EDDDD....DE.....',
      'E....D..DD.E....',
      'E....DDDD...E...',
      'E...DDD.........',
      'EDDDD.D.........',
      'E......D........'
    ]
  }),
  tile({
    code: 'x', name: 'Ossos', category: 'Masmorra', layer: 'objects',
    pixels: [
      '................',
      '................',
      '................',
      '...kkkk.........',
      '..kWWWFk........',
      '..kkWkFk........',
      '..kWWFtk........',
      '...kFtk.........',
      '....kk.....kk...',
      '..........kWWk..',
      '.........kWk....',
      '........kWk.....',
      '.kWk...kWk......',
      '..kWk.kWFk......',
      '...kk.kkk.......',
      '................'
    ]
  }),
  tile({
    code: 't', name: 'Lápide', category: 'Masmorra', layer: 'objects', solid: true,
    pixels: [
      '................',
      '......kkkk......',
      '....kk6655kk....',
      '...k66655544k...',
      '...k66652444k...',
      '...k65222224k...',
      '...k65552443k...',
      '...k55552433k...',
      '...k54442333k...',
      '...k54443332k...',
      '...k44333322k...',
      '..kkkkkkkkkkkk..',
      '.kpjqrqjqpqqppk.',
      '.koppppoppppook.',
      '..kkkkkkkkkkkk..',
      '................'
    ]
  }),
  tile({
    code: 'a', name: 'Altar', category: 'Masmorra', layer: 'objects', solid: true,
    pixels: [
      '................',
      '...M........M...',
      '..kNk......kNk..',
      '..kWk......kWk..',
      '.kkkkkkkkkkkkkk.',
      '.k6666dddd6665k.',
      '.k5555cccc5544k.',
      '.k4433cccb3322k.',
      '.k4333c99b3322k.',
      '.k4333cc9b3322k.',
      '.k3333cccb3222k.',
      '.k3322cbbb2221k.',
      '.k3222bbbb2211k.',
      '.kkkkkkkkkkkkkk.',
      '................',
      '................'
    ]
  }),

  // ---------- Especiais ----------
  tile({
    code: 'k', name: 'Cristal', category: 'Especiais', layer: 'objects', solid: true, light: '#5fc4c0',
    pixels: [
      '................',
      '.......kk.......',
      '......kP0k......',
      '......kP0fk.....',
      '.....kPP0fk.kk..',
      '.....kP00fekP0k.',
      '..kk.kP00fekP0fk',
      '.kP0kkP00fekP0fk',
      '.kP0fkP00fekP0ek',
      '.kP0fkP00fekf0ek',
      '.kP0fkP0ffekffek',
      '.kf0ekP0ffekee0k',
      '.k5544443333222k',
      '..k44433322221k.',
      '...kkkkkkkkkkk..',
      '................'
    ]
  }),
  tile({ code: 'O', name: 'Portal', category: 'Especiais', layer: 'objects', light: '#9a6bd0', frames: PORTAL }),

  // ---------- Construcoes ----------
  tile({
    code: 'p', name: 'Poço', category: 'Construções', layer: 'objects', solid: true,
    pixels: [
      '....kkkkkkkk....',
      '..kk65555544kk..',
      '.k655544444332k.',
      'k6554kkkkkk4332k',
      'k654kyyyyyyk432k',
      'k54kyAAyyyyyk32k',
      'k54kyAyyyyyyk32k',
      'k54kyyyyyyxyk21k',
      'k54kyyyyyxxxk21k',
      'k43kyyyyxxxxk21k',
      'k432kyxxxxxk221k',
      'k4332kkkkkk2221k',
      '.k433322222211k.',
      '..kk33222211kk..',
      '....kkkkkkkk....',
      '................'
    ]
  }),

  // ---------- Mobilia ----------
  tile({
    code: 'C', name: 'Baú', category: 'Mobília', layer: 'objects', solid: true,
    pixels: [
      '................',
      '................',
      '................',
      '...kkkkkkkkkk...',
      '..ksrrrrrrrrqk..',
      '..krqqqqqqqqpk..',
      '..k9888888887k..',
      '..kkkkkkkkkkkk..',
      '..krqqq98qqqpk..',
      '..kqqqq87qqqpk..',
      '..k8888888887k..',
      '..kpppppppppok..',
      '..koooooooooook.',
      '..kkkkkkkkkkkk..',
      '................',
      '................'
    ]
  }),
  tile({
    code: 'n', name: 'Mesa', category: 'Mobília', layer: 'objects', solid: true,
    pixels: [
      '................',
      '................',
      '.kkkkkkkkkkkkkk.',
      '.kssssssssssssk.',
      '.krrrrrrrrrrrqk.',
      '.krWWFrrrrrrrqk.',
      '.krFFtrrrrbcrqk.',
      '.knnnnnnnnnnnnk.',
      '.krrrrrrrrrrrqk.',
      '.kqqqqqqqqqqqpk.',
      '.kpppppppppppok.',
      '.kkkkkkkkkkkkkk.',
      '..kok......kok..',
      '..kok......kok..',
      '..kkk......kkk..',
      '................'
    ]
  }),
  tile({
    code: 'h', name: 'Cadeira', category: 'Mobília', layer: 'objects',
    pixels: [
      '................',
      '................',
      '................',
      '....kkkkkkkk....',
      '....kssssssk....',
      '....kqqqqqpk....',
      '....kkkkkkkk....',
      '....kok..kok....',
      '...kkkkkkkkkk...',
      '...ksssssssrk...',
      '...krrrrrrrqk...',
      '...krrrrrrrqk...',
      '...kqqqqqqqpk...',
      '...kkkkkkkkkk...',
      '...kok....kok...',
      '...kk......kk...'
    ]
  }),
  tile({
    code: 'e', name: 'Cama', category: 'Mobília', layer: 'objects', solid: true,
    pixels: [
      '..kkkkkkkkkkkk..',
      '..kqrrrrrrrrpk..',
      '..kkkkkkkkkkkk..',
      '..kWWWWWWWWWFk..',
      '..kWWWWWWWWFtk..',
      '..kFFFFFFFFttk..',
      '..kdddddddddck..',
      '..kdcccccccbbk..',
      '..kdcccccccbbk..',
      '..kdccc9ccccbk..',
      '..kdcccccccbbk..',
      '..kdcccccccbbk..',
      '..kcbbbbbbbbak..',
      '..kkkkkkkkkkkk..',
      '..kok......kok..',
      '..kkk......kkk..'
    ]
  }),
  tile({
    code: 'E', name: 'Estante', category: 'Mobília', layer: 'objects', solid: true,
    pixels: [
      '.kkkkkkkkkkkkkk.',
      '.ksrrrrrrrrrrqk.',
      '.krnnnnnnnnnnqk.',
      '.krdB09YdBn09qk.',
      '.krcAf8XcAnf8qk.',
      '.krcAf8XcAnf8qk.',
      '.krbze7Vbzne7qk.',
      '.kssssssssssssk.',
      '.krnnnnnnnnnnqk.',
      '.kr90nnYddB09qk.',
      '.kr8fnnXccAf8qk.',
      '.kr8fnnXccAf8qk.',
      '.kr7ennVbbze7qk.',
      '.kssssssssssssk.',
      '.kpppppppppppok.',
      '.kkkkkkkkkkkkkk.'
    ]
  }),
  tile({
    code: 'u', name: 'Barril', category: 'Mobília', layer: 'objects', solid: true,
    pixels: [
      '................',
      '.....kkkkkk.....',
      '...kkpqqqqpkk...',
      '..kpqrrrrrrqpk..',
      '..kopqqqqqqpok..',
      '..k5666555443k..',
      '..krssrrrqqpok..',
      '..krssrrqqqpok..',
      '.krsssrrrqqppok.',
      '.k566655544332k.',
      '.krsssrrrqqppok.',
      '..krssrrqqqpok..',
      '..krsrrrqqqpok..',
      '..k5666555443k..',
      '...kopppppook...',
      '....kkkkkkkk....'
    ]
  }),
  tile({
    code: 'q', name: 'Caixote', category: 'Mobília', layer: 'objects', solid: true,
    pixels: [
      '................',
      '.kkkkkkkkkkkkkk.',
      '.kssssssssssssk.',
      '.ksrpqqqqqqqrok.',
      '.ksqrpqqqqqrpok.',
      '.ksqqrpqqqrpqok.',
      '.ksqqqrpqrpqqok.',
      '.ksqqqqrrpqqqok.',
      '.ksqqqqrrpqqqok.',
      '.ksqqqrpqrpqqok.',
      '.ksqqrpqqqrpqok.',
      '.ksqrpqqqqqrpok.',
      '.ksrpqqqqqqqrok.',
      '.kooooooooooook.',
      '.kkkkkkkkkkkkkk.',
      '................'
    ]
  }),
  tile({
    code: 'K', name: 'Trono', category: 'Mobília', layer: 'objects', solid: true,
    pixels: [
      '......k99k......',
      '....kk8778kk....',
      '...k8bccccb7k...',
      '...k8cddddc7k...',
      '...k8cdccdc7k...',
      '...k8cdccdc7k...',
      '...k8cdddcc7k...',
      '.kkk8cccccb7kkk.',
      'k98k88888877k87k',
      'k87kdddddddck77k',
      'k87kdccccccbk77k',
      'k87kcbbbbbbak77k',
      'k77kkkkkkkkkk77k',
      '.kk8777777778kk.',
      '.kkkkkkkkkkkkkk.',
      '................'
    ]
  }),

  // ---------- Decoracao ----------
  tile({
    code: 'r', name: 'Tapete', category: 'Decoração', layer: 'objects',
    pixels: [
      '..F.F.F.F.F.F...',
      '.kkkkkkkkkkkkkk.',
      '.k888888888888k.',
      '.k8cccccccccc8k.',
      '.k8cbbbddbbbc8k.',
      '.k8cbbdccdbbc8k.',
      '.k8cbdc99cdbc8k.',
      '.k8cdc9889cdc8k.',
      '.k8cdc9889cdc8k.',
      '.k8cbdc99cdbc8k.',
      '.k8cbbdccdbbc8k.',
      '.k8cbbbddbbbc8k.',
      '.k8cccccccccc8k.',
      '.k888888888888k.',
      '.kkkkkkkkkkkkkk.',
      '..F.F.F.F.F.F...'
    ]
  }),
  tile({ code: 'F', name: 'Fogueira', category: 'Decoração', layer: 'objects', solid: true, light: '#eb9a3c', frames: [FIRE_A, FIRE_B, FIRE_C] }),
  tile({ code: 'i', name: 'Tocha', category: 'Decoração', layer: 'objects', light: '#eb9a3c', frames: TORCH }),
  tile({
    code: 'S', name: 'Estátua', category: 'Decoração', layer: 'objects', solid: true,
    pixels: [
      '.......kk.......',
      '......k65k......',
      '......k54k......',
      '.....kk43kk.....',
      '...kk665544kk...',
      '..k6k654433k4k..',
      '..k5k544332k3k..',
      '..k5k544332k3k..',
      '..kkk544332kkk..',
      '.....k44322k....',
      '.....k43k22k....',
      '.....k43k32k....',
      '...kkkkkkkkkk...',
      '...k66555443k...',
      '...k44333221k...',
      '...kkkkkkkkkk...'
    ]
  })
];

// ---------- Blocos extras (24/10: o Andre pediu mais variedade para montar mapas) ----------

// Desloca na vertical (com volta): agua da cachoeira caindo.
function vshift(rows, n) {
  return n ? [...rows.slice(SIZE - n), ...rows.slice(0, SIZE - n)] : rows;
}
const rot = (s, n) => (n ? s.slice(-n) + s.slice(0, -n) : s);

// Sobrepoe um sprite com transparencia ('.') sobre outro: tocha na parede, pedras no rio.
function overlay(base, top) {
  return base.map((r, y) => [...r].map((ch, x) => (top[y][x] === '.' ? ch : top[y][x])).join(''));
}

const STONE_WALL = BASE_TILES.find((t) => t.code === '#').pixels;

const FALL_TEX = [
  'BCABBGBACBAB', 'BCABBCBABBAB', 'BBABBCBACBAB', 'BBAGBCBACBAB',
  'BBACBBBABBAG', 'BCACBBBABBAC', 'BCABBBGABBAC', 'BCABBBCACBAB',
  'BBABBBCACBAB', 'GBABBGBABBAB', 'CBABBCBABGAB', 'CBACBCBABCAB',
  'BBACBBBABCAB', 'BBABBBBACBAB', 'BGABBGBACBAB', 'BCABBCBABBAB'
];
const FALL_L = ['k4', 'k5', 'k4', 'k3', 'k4', 'k5', 'k4', 'k3', 'k4', 'k5', 'k4', 'k3', 'k4'];
const FALL_R = ['3k', '2k', '3k', '2k', '2k', '3k', '2k', '2k', '3k', '2k', '2k', '3k', '2k'];
const FALL_FOAM = ['EGGEGCGGEGGCGE', 'BEGGEBGEGGEBGB', 'AABEBAABEBAABA'];
function waterfall(f) {
  const body = vshift(FALL_TEX, f * 3);
  const rows = [];
  for (let y = 0; y < 13; y++) rows.push(FALL_L[y] + body[y] + FALL_R[y]);
  for (const r of FALL_FOAM) rows.push('k' + rot(r, f * 2) + 'k');
  return rows;
}

const RIVER_STONES = [
  '................',
  '................',
  '..kkk...........',
  '.k654k..........',
  '.k432k..........',
  '..kkk...........',
  '..........kkkk..',
  '.........k6554k.',
  '.........k5432k.',
  '..........kkkk..',
  '................',
  '....kkk.........',
  '...k654k........',
  '...k432k........',
  '....kkk.........',
  '................'
];

const ACID = [
  '++++S+++++++++++',
  '+++SS++++^*+++++',
  '++++++++++*+++S+',
  '+^*++++++++++SS+',
  '+**+++S+++++++++',
  '++++++SS++++++++',
  '++++++++++^*++++',
  '+++S++++++**++++',
  '++SS++++++++++S+',
  '++++++^*++++++S+',
  '++++++**++++++++',
  '+S+++++++++^*+++',
  '+SS+++++++++*+++',
  '++++++++S+++++++',
  '++^*++++SS++++++',
  '++*+++++++++++++'
];

const CAULDRON = [
  '................',
  '................',
  '.......^........',
  '...kkkkkkkkkk...',
  '..k43^**+**34k..',
  '..k3kkkkkkkk2k..',
  '.k3222222222221k',
  '.k3211111111111k',
  '.k4211111111111k',
  '.k3211111111111k',
  '..k21111111111k.',
  '...kk111111kk...',
  '....kLMNMLk.....',
  '...kJLMLMLJk....',
  '...k3kpqpk3k....',
  '....kk...kk.....'
];

function anvil(r1, r2, r3) {
  return [
    '................', r1, r2, r3,
    '..kkkkkkkkkkk...',
    'k6666LMML6654k..',
    '.k5555555554k...',
    '..kk4444443kk...',
    '....k4443k......',
    '....k4432k......',
    '...kk44332kk....',
    '..k5544433322k..',
    '..k4433222211k..',
    '..kkkkkkkkkkkk..',
    '................',
    '................'
  ];
}

function candelabra(r0, r1) {
  return [
    r0, r1,
    '....W..W..W.....',
    '....W..W..W.....',
    '...k8kk8kk8k....',
    '....k77877k.....',
    '.......87.......',
    '.......87.......',
    '.......87.......',
    '.......87.......',
    '.......87.......',
    '.......87.......',
    '......k887k.....',
    '.....k88777k....',
    '.....kkkkkkk....',
    '................'
  ];
}

function brazier(r2, r3, r4, r5) {
  return [
    '................', '................', r2, r3, r4, r5,
    '.....LMNNML.....',
    '...kJLMNNMLJk...',
    '..k5IJLLLLJI3k..',
    '..k4333333332k..',
    '...k22222221k...',
    '....kkkkkkkk....',
    '....k..kk..k....',
    '...k...kk...k...',
    '..k....kk....k..',
    '................'
  ];
}

const RITUAL = [
  '................', '....XXXYXXXX....', '...XXUUVVUUXX...', '..XYU..VV..UYX..',
  '.XXU..VVVV..UXX.', '.XU..VV..VV..UX.', '.XU..V....V..UX.', '.X..VV.YY.VV..X.',
  '.Y..V..YY..V..Y.', '.XUVV......VVUX.', '.XUVVVVVVVVVVUX.', '.XXU........UXX.',
  '..XYU......UYX..', '...XXUU..UUXX...', '....XXXXYXXX....', '................'
];

const EXTRA_TILES = [
  // ---------- Chao ----------
  tile({
    code: 'c', name: 'Paralelepípedo', category: 'Chão', layer: 'ground',
    pixels: [
      '5441544154415441',
      '4331433143314331',
      '3321332133213321',
      '1111111111111111',
      '4154415441544154',
      '3143314331433143',
      '2133213321332133',
      '1111111111111111',
      '5441uut154415441',
      '4331utt143314331',
      '3321tto133213321',
      '1111111111111111',
      '4154415441544154',
      '3143314331433143',
      '2133213321332133',
      '1111111111111111'
    ]
  }),
  tile({
    code: 'Q', name: 'Piso de templo', category: 'Chão', layer: 'ground',
    pixels: (() => {
      const L = ['G6666665', '66656665', '66665665', '66666565', '65666665', '66566665', '66656665', '55555554'];
      const D = ['33333332', '32222221', '32232221', '32223221', '32222321', '32222231', '32222221', '21111111'];
      return [...L.map((l, i) => l + D[i]), ...D.map((d, i) => d + L[i])];
    })()
  }),
  tile({
    code: 'R', name: 'Carpete vermelho', category: 'Chão', layer: 'ground',
    pixels: (() => {
      const half = ['bccccccbbccccccb', 'cbccccbccbccccbc', 'ccbccbcdccbccbcc', 'cccbbccccccbbccc',
        'cccbbccccccbbccc', 'ccbccbccccbccbcc', 'cbccccbccbccccbc', 'bccdcccbbccdcccb'];
      return [...half, ...half];
    })()
  }),
  tile({
    code: 'g', name: 'Grama alta', category: 'Chão', layer: 'ground',
    pixels: [
      'iiimiiiliiimiiil',
      'iilmiijliiljiilj',
      'ijljiijjiijjijjj',
      'ijjhijjhiijhijhh',
      'hjhhhjhhihhhhhgh',
      'hhmhhhhmhhhlhhhh',
      'hljhhhljhhljhhhm',
      'ijjhhijjhhjjhhlj',
      'ijhhhijhhijhhhjj',
      'hhhghhhhghhhhghh',
      'ilhhhhlhhhhhmhhh',
      'ljhhmhjjhhlhljhh',
      'jjhljhjhhljhjjhh',
      'jhhjjhhhhjjhjhhm',
      'hhhjhhhghjhhhhlj',
      'ghhhhghhhhhghhjj'
    ]
  }),
  tile({
    code: 'v', name: 'Folhas secas', category: 'Chão', layer: 'ground',
    pixels: [
      'ppppprrpppppppsp',
      'pp8ppsqppp7rpppp',
      'p87pppppppprpp8p',
      'pppppcpppppppp87',
      'pprppcdpppsrpppp',
      'prsppppppppqppcp',
      'pppppp78pppppcdp',
      'ppcpppp7pppppppp',
      'pcdpppppprspppp8',
      'ppppsrppppqpp87p',
      'pppppqpppppppppp',
      'p78ppppcdppprppp',
      'pp7pppppcpppsrpp',
      'ppppprspppppppqp',
      'psppppqppp87pppp',
      'pqpppppppp7ppcpp'
    ]
  }),
  tile({
    code: 'z', name: 'Cinzas', category: 'Chão', layer: 'ground',
    pixels: [
      '2K2222K22232222K',
      '22K23222K222K222',
      'K22222J2223222K2',
      '223K2222K222222K',
      '2222K22222K23222',
      'K2422222L222K222',
      '22K222K2222222K2',
      '222223222K22J222',
      '2K222222222K2222',
      '22232K222J222242',
      'K22222222K22K222',
      '22K2L22322222K22',
      '2222222K22232222',
      '2K232K22222K22K2',
      '222222222J222222',
      'K22K22232222K222'
    ]
  }),
  tile({
    code: 'I', name: 'Gelo', category: 'Chão', layer: 'ground',
    pixels: [
      'CCCCCCCCCGCCCCCC',
      'CGGCCCCCCCGCCCCC',
      'CCGGCCCCCCCGCCCB',
      'CCCGGCCCCCCCCCBC',
      'CCCCCCCCCCCCCBCC',
      'CCCCCCBCCCCCBCCC',
      'CCCCCBCBBCCBCCCC',
      'CCCCBCCCCBBCCCCC',
      'CCGCCCCCCCCCCCCC',
      'CCCGGCCCCCCCCGCC',
      'CCCCGGCCCCCCCCGC',
      'BCCCCCCCCCCCCCCC',
      'CBCCCCCCCGCCCCCC',
      'CCBCCCCCCCGGCCCC',
      'CCCBBCCCCCCGGCCC',
      'CCCCCBCCCCCCCCCC'
    ]
  }),
  tile({
    code: 'j', name: 'Lama', category: 'Chão', layer: 'ground',
    pixels: [
      'pppoppppppppoppp',
      'ppppppooppppppqp',
      'pooppoOOoppppppp',
      'ppppoOQQOoppoppp',
      'ppqpoOOOQopppppp',
      'pppppooooppppopp',
      'pppppppppppppppp',
      'popppppqppppoopp',
      'pppppoppppooOOop',
      'ppqppppppoOQQQOo',
      'pppppppppoOOOQOo',
      'pppooppppppooooq',
      'ppppppppqppppppp',
      'pqppopppppppoppp',
      'pppppppopppppppp',
      'ppppqppppppppopp'
    ]
  }),
  tile({
    code: 'U', name: 'Piso de cripta com runa', category: 'Chão', layer: 'ground',
    pixels: [
      '3333333333333332',
      '3222222222222221',
      '3222222222222221',
      '3222222200222221',
      '3222220000222221',
      '3222220022222221',
      '3222222200222221',
      '3222222002222221',
      '3222222002222221',
      '3222220022222221',
      '3222222222222221',
      '3222222222222221',
      '3212222222222221',
      '3222222221222221',
      '3222222222222221',
      '2111111111111111'
    ]
  }),

  // ---------- Agua e terreno ----------
  tile({ code: 'V', name: 'Cachoeira', category: 'Água', layer: 'ground', solid: true, frames: [waterfall(0), waterfall(1), waterfall(2)] }),
  tile({ code: '0', name: 'Rio com pedras', category: 'Água', layer: 'ground', frames: [WATER, shift(WATER, 1), shift(WATER, 2)].map((w) => overlay(w, RIVER_STONES)) }),
  tile({
    code: 'G', name: 'Poça de ácido', category: 'Água', layer: 'ground', light: '#7fa040',
    frames: [ACID, recolor(ACID, { '^': '*', '*': '+' }), recolor(ACID, { '^': '+', '*': '^' })]
  }),
  tile({
    code: '@', name: 'Abismo', category: 'Terreno', layer: 'ground', solid: true,
    pixels: [
      'kkkkKkkkkkkkkKkk',
      'kKkkkkkkTkkkkkkk',
      'kkkkkkKkkkkkkkkk',
      'kkkTkkkkkkkkKkkk',
      'kkkkkkkkkkKkkkkk',
      'KkkkkkkkkkkkkkkT',
      'kkkkkkTkkkkkkkkk',
      'kkkKkkkkkkkKkkkk',
      'kkkkkkkkkkkkkkkk',
      'kkkkkkkkKkkkkTkk',
      'kTkkkkkkkkkkkkkk',
      'kkkkkKkkkkkkkkkK',
      'kkkkkkkkkTkkkkkk',
      'kkKkkkkkkkkkkkkk',
      'kkkkkkkKkkkKkkkk',
      'kkkkTkkkkkkkkkkk'
    ]
  }),
  tile({
    code: 'P', name: 'Penhasco', category: 'Terreno', layer: 'ground', solid: true,
    pixels: [
      'iiiiiiiiiiiiiiii',
      'iijiiiiilijiiiii',
      'llllllllllllllll',
      'kkkkkkkkkkkkkkkk',
      '5655456554565545',
      '4544345443454434',
      '3433234332343323',
      '43k3433343k33433',
      '3332333233323332',
      '2322232223222322',
      '32k2322232k22322',
      '2221222122212221',
      '1211121112111211',
      '1K111K111K111K11',
      'KKKKKKKKKKKKKKKK',
      'kkkkkkkkkkkkkkkk'
    ]
  }),
  tile({
    code: '|', name: 'Ponte de corda', category: 'Terreno', layer: 'ground',
    pixels: [
      'kkukkkkkkkkkkukk',
      'kkvssssssssssvkk',
      'kkvqqqqqqqqqpvkk',
      'kkukkkkkkkkkkukk',
      'kkvsrssssssssvkk',
      'kkvqqqqqpqqqqvkk',
      'kkukkkkkkkkkkukk',
      'kkvssssssrsssvkk',
      'kkvqqqqqqqqqpvkk',
      'kkukkkkkkkkkkukk',
      'kkvssssskkssssvk',
      'kkvqqqqqkkqqpvkk',
      'kkukkkkkkkkkkukk',
      'kkvsssssssssrvkk',
      'kkvqqqqqqqqqqvkk',
      'kkukkkkkkkkkkukk'
    ]
  }),

  // ---------- Paredes ----------
  tile({
    code: 'H', name: 'Parede de caverna', category: 'Paredes', layer: 'ground', solid: true,
    pixels: [
      '45553k4555543k45',
      '54443k5444432k54',
      '44332k4433322k43',
      '3322kk332221kk32',
      'kkkk4554kkkk4555',
      '5543544433k54444',
      '4432443322k44333',
      '33223322kk433222',
      'kk4553kk45543kkk',
      '45544432544432k4',
      '44433322443322k5',
      '33322211332211k4',
      '2211kk1122kkk433',
      'kkk455kkkk455432',
      '4554443345544332',
      '3332221133322211'
    ]
  }),
  tile({
    code: 'Z', name: 'Muralha com ameias', category: 'Paredes', layer: 'ground', solid: true,
    pixels: [
      'k6654k22k6654k22',
      'k6543k12k6543k12',
      'k5433k12k5433k12',
      'k4332k11k4332k11',
      'kkkkkkkkkkkkkkkk',
      '6665554k66655554',
      '6555443k65554433',
      '5544332k55443322',
      '4433222k44332221',
      'kkkkkkkkkkkkkkkk',
      '6554k66655554k66',
      '5443k65554433k65',
      '4332k55443322k54',
      '3221k44332221k43',
      'kkkkkkkkkkkkkkkk',
      '2222222222222222'
    ]
  }),
  tile({
    code: ']', name: 'Portão de ferro', category: 'Paredes', layer: 'ground', solid: true,
    pixels: [
      '6555555555555554',
      '54kkkkkkkkkkkk43',
      '54k5k5k5k5k5kk43',
      '54k5k5k5k5k5kk43',
      '54k5k5k5k5k5kk43',
      '54k6555555554k43',
      '54k5k5k5k5k5kk43',
      '54k5k5k5k5k5kk43',
      '54k5k5k5k5k5kk43',
      '54k5k5k5k5k5kk43',
      '54k6555555554k43',
      '54k5k5k5k5k5kk43',
      '54k5k5k5k5k5kk43',
      '54k5k5k5k5k5kk43',
      '54k3k3k3k3k3kk43',
      '3333333333333332'
    ]
  }),
  tile({ code: '/', name: 'Parede com tocha', category: 'Paredes', layer: 'ground', solid: true, light: '#eb9a3c', frames: TORCH.map((t) => overlay(STONE_WALL, t)) }),
  tile({
    code: '(', name: 'Porta dupla', category: 'Paredes', layer: 'ground',
    pixels: [
      '6555555555555554',
      '54kkkkkkkkkkkk43',
      '54krqnrkkrqnrk43',
      '54k2222kk2222k43',
      '54krqnrkkrqnrk43',
      '54krqnrkkrqnrk43',
      '54krqnrkkrqnrk43',
      '54krqn9kk9qnrk43',
      '54krqn8kk8qnrk43',
      '54krqnrkkrqnrk43',
      '54krqnrkkrqnrk43',
      '54krqnrkkrqnrk43',
      '54k2222kk2222k43',
      '54krqnrkkrqnrk43',
      '54krqnrkkrqnrk43',
      '3333333333333332'
    ]
  }),
  tile({
    code: '?', name: 'Porta secreta', category: 'Paredes', layer: 'ground',
    pixels: overlay(STONE_WALL, [
      '................', '................',
      '....11111111....',
      '....1......1....', '....1......1....', '....1......1....', '....1......1....',
      '....1......1....', '....1......1....',
      '....1....4.1....',
      '....1......1....', '....1......1....', '....1......1....', '....1......1....',
      '....1......1....', '....1......1....'
    ])
  }),
  tile({
    code: ')', name: 'Arco de pedra', category: 'Paredes', layer: 'ground',
    pixels: [
      '6666666666666665',
      '6555555555555554',
      '5444444444444443',
      '5543111111115432',
      '5543222222225432',
      '5443232223225432',
      '5443333233335432',
      '5443333333335432',
      '5443332333335432',
      '5443333332335432',
      '5443333333335432',
      '5443233333335432',
      '5443333333235432',
      '5443333333335432',
      '5443333233335432',
      '4332222222224321'
    ]
  }),
  tile({
    code: '+', name: 'Cerca de madeira', category: 'Paredes', layer: 'objects', solid: true,
    pixels: [
      '................',
      '................',
      '................',
      '..kkk.....kkk...',
      '..ksk.....ksk...',
      'kkkrkkkkkkkrkkkk',
      'sskrkssssskrksss',
      'qqkqkqqqqqkqkqqq',
      'kkkqkkkkkkkqkkkk',
      '..kqk.....kqk...',
      'kkkqkkkkkkkqkkkk',
      'sskqkssssskqksss',
      'qqkpkqqqqqkpkqqq',
      'kkkpkkkkkkkpkkkk',
      '..kkk.....kkk...',
      '................'
    ]
  }),

  // ---------- Objetos ----------
  tile({
    code: '1', name: 'Pilar', category: 'Construções', layer: 'objects', solid: true,
    pixels: [
      '....kkkkkkkk....',
      '...k66666655k...',
      '...k55555544k...',
      '....kkkkkkkk....',
      '.....k65443k....',
      '.....k65443k....',
      '.....k65443k....',
      '.....k65443k....',
      '.....k65443k....',
      '.....k65443k....',
      '.....k65443k....',
      '.....k65443k....',
      '....k6655443k...',
      '...k665544332k..',
      '...kkkkkkkkkkk..',
      '................'
    ]
  }),
  tile({
    code: '2', name: 'Sarcófago', category: 'Masmorra', layer: 'objects', solid: true,
    pixels: [
      '................',
      '....kkkkkkkk....',
      '...k66666665k...',
      '...k655kk554k...',
      '...k65k66k54k...',
      '...k655kk554k...',
      '...k65555554k...',
      '...k65888854k...',
      '...k5556E554k...',
      '...k5556E554k...',
      '...k5556E554k...',
      '...k5556E554k...',
      '...k55546443k...',
      '...k44433332k...',
      '....kkkkkkkk....',
      '................'
    ]
  }),
  tile({
    code: '3', name: 'Caixão', category: 'Masmorra', layer: 'objects', solid: true,
    pixels: [
      '................',
      '.....kkkkkk.....',
      '....ksrrrrqk....',
      '...ksrrrrrrqk...',
      '..ksrrrrrrrrqk..',
      '..krrrr8rrrqpk..',
      '..krrr888rrqpk..',
      '..krrrr8rrrqpk..',
      '..krrrr8rrrqpk..',
      '..krrrr7rrqqpk..',
      '...krrrrrrqpk...',
      '...kqrrrrqqpk...',
      '....kqqqqppk....',
      '....kppppook....',
      '.....kkkkkk.....',
      '................'
    ]
  }),
  tile({
    code: '4', name: 'Mesa de alquimia', category: 'Mobília', layer: 'objects', solid: true,
    pixels: [
      '........kk......',
      '....k...kXk.....',
      '....E...kXk..k..',
      '...kEk..kXk.kdk.',
      '..k^*+k.kVk.kck.',
      '.kk*++kkkVkkkck.',
      '.kssssssssssssk.',
      '.krrrrrrrrrrrqk.',
      '.krWFrrr7rrrrqk.',
      '.kqqqqqqqqqqqpk.',
      '.kpppppppppppok.',
      '.kkkkkkkkkkkkkk.',
      '..kok......kok..',
      '..kok......kok..',
      '..kkk......kkk..',
      '................'
    ]
  }),
  tile({
    code: '5', name: 'Caldeirão', category: 'Especiais', layer: 'objects', solid: true, light: '#7fa040',
    frames: [CAULDRON, recolor(CAULDRON, { '^': '+', '+': '^', M: 'N', N: 'M' }), recolor(CAULDRON, { '*': '^', '^': '*', L: 'M', M: 'L' })]
  }),
  tile({
    code: '6', name: 'Bigorna e forja', category: 'Construções', layer: 'objects', solid: true, light: '#eb7a34',
    frames: [
      anvil('................', '......N.........', '..........M.....'),
      anvil('....M...........', '................', '........N.......'),
      recolor(anvil('................', '................', '................'), { L: 'M', M: 'N' })
    ]
  }),
  tile({
    code: '7', name: 'Prateleira de poções', category: 'Mobília', layer: 'objects', solid: true,
    pixels: [
      '.kkkkkkkkkkkkkk.',
      '.ksrrrrrrrrrrqk.',
      '.krnqnnnqnnqnqk.',
      '.krdccn^*+nCBqk.',
      '.krcbbn*++nBAqk.',
      '.krbaan+SSnAzqk.',
      '.kssssssssssssk.',
      '.krnnqnnnnnqnqk.',
      '.krnYXVnnn987qk.',
      '.krnXVUnnn87Zqk.',
      '.krnXVUnWn87Zqk.',
      '.krnVUTnWn7ZZqk.',
      '.kssssssssssssk.',
      '.kpppppppppppok.',
      '.kkkkkkkkkkkkkk.',
      '................'
    ]
  }),
  tile({
    code: '8', name: 'Livros e pergaminhos', category: 'Decoração', layer: 'objects',
    pixels: [
      '................',
      '................',
      '..kkkkkk.kkkkk..',
      '..kddddck.kBBAk.',
      '..kccccbk.kAAzk.',
      '..kWWWWFk.kkkkk.',
      '..kkkkkk........',
      '..........kkkk..',
      '.........kWWWFk.',
      '.........kFFFtk.',
      '..........kkkk..',
      '...kkkkkkkk.....',
      '..kWWWFkWWWFk...',
      '..kWtWFkWtWFk...',
      '..kFFFtkFFFtk...',
      '...kkkkkkkkkk...'
    ]
  }),
  tile({
    code: '$', name: 'Tesouro', category: 'Decoração', layer: 'objects',
    pixels: [
      '................',
      '................',
      '................',
      '................',
      '.......W........',
      '......kkkk......',
      '.....k9879k.....',
      '....k987987k....',
      '...k98P98798k...',
      '..k9879d987Z7k..',
      '.k98798X879879k.',
      '.k879879879877k.',
      'k9879879879879Zk',
      'kkkkkkkkkkkkkkkk',
      '..k9k......k8k..',
      '................'
    ]
  }),
  tile({
    code: '9', name: 'Armadura no suporte', category: 'Decoração', layer: 'objects', solid: true,
    pixels: [
      '......kkkk......',
      '.....k6655k.....',
      '.....k5kk4k.....',
      '.....k5443k.....',
      '...kkkkkkkkkk...',
      '..k66k6554k43k..',
      '..k54k5443k32k..',
      '...kkk5443kkk...',
      '.....k5cc3k.....',
      '.....k4cb3k.....',
      '.....k4332k.....',
      '.....kkpkk......',
      '.......kpk......',
      '.......kqk......',
      '.....kkqqpkk....',
      '.....kkkkkkk....'
    ]
  }),
  tile({
    code: '&', name: 'Armário de armas', category: 'Mobília', layer: 'objects', solid: true,
    pixels: [
      '.kkkkkkkkkkkkkk.',
      '.kssssssssssssk.',
      '.knGnnGnnnnnGnk.',
      '.knEnnEnn56nEnk.',
      '.knEnnEn5566Enk.',
      '.knEnnqnn56nEnk.',
      '.knEnnqnnnqnEnk.',
      '.k898nqnnnq898k.',
      '.knpnnqnnnqnpnk.',
      '.kn8nnqnnnqn8nk.',
      '.knnnnqnnnqnnnk.',
      '.knnnnqnnnqnnnk.',
      '.kssssssssssssk.',
      '.kqqqqqqqqqqqpk.',
      '.kkkkkkkkkkkkkk.',
      '................'
    ]
  }),
  tile({
    code: '{', name: 'Candelabro', category: 'Decoração', layer: 'objects', solid: true, light: '#eb9a3c',
    frames: [
      candelabra('....M..M..M.....', '....N..N..N.....'),
      candelabra('.....M.M.M......', '....N..N..N.....'),
      candelabra('................', '....M..N..M.....')
    ]
  }),
  tile({
    code: '}', name: 'Braseiro', category: 'Decoração', layer: 'objects', solid: true, light: '#eb9a3c',
    frames: [
      brazier('........M.......', '.......MM.......', '......MLM.M.....', '.....MLNLML.....'),
      brazier('.......M........', '.......MM.......', '.....M.MLM......', '.....LMNLML.....'),
      brazier('................', '........M.......', '......MLM.......', '.....MLNLMM.....')
    ]
  }),
  tile({
    code: '[', name: 'Jaula', category: 'Masmorra', layer: 'objects', solid: true,
    pixels: [
      '................',
      '..kkkkkkkkkkkk..',
      '..k6555555554k..',
      '..kkkkkkkkkkkk..',
      '..k5.5.5.5.5.k..',
      '..k5.5.5.5.5.k..',
      '..k5.5.5.5.5.k..',
      '..k5.5.5.5.5.k..',
      '..k4444444444k..',
      '..k5.5.5.5.5.k..',
      '..k5.5.5.5.5.k..',
      '..k5.5.5.5.5.k..',
      '..k5.5.5.5.5.k..',
      '..k5444444443k..',
      '..kkkkkkkkkkkk..',
      '................'
    ]
  }),
  tile({
    code: '!', name: 'Espinhos', category: 'Masmorra', layer: 'objects',
    pixels: [
      '................',
      '................',
      '...6.......6....',
      '..65k.....65k...',
      '..54k..6..54k...',
      '.5443k65k5443k..',
      '.kkkkk54kkkkk...',
      '......kk........',
      '.6.......6......',
      '65k.....65k.....',
      '54k..6..54k..6..',
      '543k65k5443k65k.',
      'kkkk54kkkkkk54k.',
      '...kkkk.....kkk.',
      '................',
      '................'
    ]
  }),
  tile({
    code: 'N', name: 'Cogumelo luminoso', category: 'Natureza', layer: 'objects', solid: true, light: '#5fc4c0',
    pixels: [
      '................',
      '.....kkkkkk.....',
      '...kkP0000ffkk..',
      '..kP0P000000fk..',
      '.kP00000P0000fek',
      '.k000P000000ffek',
      '.kf00000000fffek',
      '..kkeffffffeekk.',
      '....kkWWWFkk....',
      '......kWFk......',
      '.kP0k.kWFk......',
      '.kffk.kWFk......',
      '..kWkkWWFtk.....',
      '....kkFFFttkk...',
      '................',
      '................'
    ]
  }),
  tile({
    code: 'Y', name: 'Árvore retorcida', category: 'Natureza', layer: 'objects', solid: true,
    pixels: recolor([
      '...k.......kk...',
      '..kpk.....kpk...',
      '..kpk..k.kpk....',
      '...kpk.kpkpk.kk.',
      '....kpkkpqk.kpk.',
      '.kk..kppqk.kpk..',
      'kpok..kpqkkpk...',
      '.kppkkpqqpk.....',
      '..kkppqqpk......',
      '....kpqqk.......',
      '.....kpqqk......',
      '.....kpqqk......',
      '....kpqqk.......',
      '....kpqqpk......',
      '...kopqqpok.....',
      '..kkkkkkkkkk....'
    ], { p: 'U', q: 'V', o: 'T' })
  }),
  tile({
    code: '`', name: 'Círculo ritual', category: 'Especiais', layer: 'objects', light: '#9a6bd0',
    frames: [RITUAL, recolor(RITUAL, { V: 'X' }), recolor(RITUAL, { V: 'X', U: 'V', X: 'Y' })]
  }),
  tile({
    code: 's', name: 'Placa', category: 'Construções', layer: 'objects', solid: true,
    pixels: [
      '................',
      '................',
      '..kkkkkkkkkkkk..',
      '.ksrrrrrrrrrrqk.',
      '.krppprppprppqk.',
      '.krqqqqqqqqqqpk.',
      '.krpprppprpppqk.',
      '.kqppppppppppok.',
      '..kkkkkkkkkkkk..',
      '.......kqk......',
      '.......kqk......',
      '.......kpk......',
      '.......kpk......',
      '......kkpkk.....',
      '......kkkkk.....',
      '................'
    ]
  }),
  tile({
    code: 'y', name: 'Tenda', category: 'Construções', layer: 'objects', solid: true,
    pixels: [
      '.......kk.......',
      '......kwvk......',
      '.....kwvvuk.....',
      '....kwwvvuuk....',
      '...kwwvvvuutk...',
      '..kwwvvvkvuutk..',
      '..kwvvvkkkuutk..',
      '.kwwvvvkKkkuuttk',
      '.kwvvvvkKKkuuttk',
      'kwwvvvkKKKkuuttk',
      'kwvvvvkKKKkuuttk',
      'kvvvvkKKKKKkuttk',
      'kkkkkkkkkkkkkkkk',
      '.q............q.',
      '................',
      '................'
    ]
  }),
  tile({
    code: "'", name: 'Corpo caído', category: 'Masmorra', layer: 'objects',
    pixels: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.kkkk.kkkkkkk...',
      'kTUUTkUUVVUUTkk.',
      'kTUUUkUVVVUUTkok',
      'kTTUTkUUUUUTTkok',
      '.kkkk.kkkkkkk.k.',
      '......b.bb......',
      '................',
      '................',
      '................'
    ]
  })
];

export const TILES = [...BASE_TILES, ...EXTRA_TILES];

// loot: objeto onde faz sentido achar item pegavel (so dica para a IA e o editor; quem decide e a IA/mestre).
const LOOT_CODES = 'C$78&9qukmNfx4' + "52a3'E";
// wall: parede que escolhe o desenho pelo vizinho (topo x face). face: sempre de frente
// (porta, janela, portao, tocha na parede: so fazem sentido vistos de frente).
const WALL_CODES = '#BMHZ?';
const FACE_CODES = 'DXJ()/]';
for (const t of TILES) {
  if (LOOT_CODES.includes(t.code)) t.loot = true;
  if (WALL_CODES.includes(t.code)) t.wall = true;
  if (FACE_CODES.includes(t.code)) { t.wall = true; t.face = true; }
}

export const TILE_BY_CODE = Object.fromEntries(TILES.map((t) => [t.code, t]));

export const CATEGORIES = ['Chão', 'Água', 'Terreno', 'Paredes', 'Natureza', 'Masmorra', 'Construções', 'Mobília', 'Decoração', 'Especiais'];

export function getTile(code) {
  return TILE_BY_CODE[code] || null;
}

// Imagens de um bloco: quadros (animado) ou variantes (natural) ou so a base.
export function tileImages(t) {
  return t.frames || t.variants || [t.pixels];
}
