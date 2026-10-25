// Sprites pequenos do grimorio (criaturas invocadas, simbolos e projeteis que nao
// giram). Desenhos originais, no espirito "Stardew": contorno escuro, 3-4 tons, luz
// de cima. Letras:
//   . vazio   k contorno   0-4 rampa da magia (escuro -> claro)
//   a-e rampa do material (osso, pedra, madeira...)   w branco   r olho vermelho   y olho amarelo
import { rect } from '../draw.js';

export const SPRITES = {
  skeleton: { mat: 'bone', rows: [
    '...kkkk...',
    '..kddddk..',
    '..kdkdkd..',
    '..kddddk..',
    '...kcck...',
    '..k.dd.k..',
    '.kdkddkdk.',
    '.k.kddk.k.',
    '...kddk...',
    '...kccck..',
    '..kd..dk..',
    '..kd..dk..',
    '..kc..ck..',
    '.kkk..kkk.'
  ] },
  wolf: { mat: 'stone', rows: [
    '..........kk..',
    '.........k33k.',
    'k.......k3333k',
    'k3k....k333y3k',
    '.k3kkkk3333333',
    '..k33333333kkk',
    '..k2333332k...',
    '..k22kk22k....',
    '..k2k..k2k....',
    '..kk....kk....'
  ] },
  imp: { mat: 'flesh', rows: [
    '.k.....k.',
    '.kk...kk.',
    '..kcccck.',
    '.kcycyck.',
    '.kccccck.',
    '..kckkck.',
    'kk.kcck.k',
    'kck.cc.kc',
    '..kcccck.',
    '..kc..ck.',
    '..kk..kk.'
  ] },
  golem: { mat: 'stone', rows: [
    '....kkkkkk....',
    '...kccdddck...',
    '...kc3cc3ck...',
    '...kccccccck..',
    '.kkkkbccbkkkk.',
    'kbcdkbccbkdcbk',
    'kbcckccddkccbk',
    'kbbkbcccdbkbbk',
    'kccbkbccbkbcck',
    '.kk.kbbbbk.kk.',
    '....kbkkbk....',
    '...kcck.kcck..',
    '...kbbk.kbbk..',
    '..kkkkk.kkkkk.'
  ] },
  crow: { mat: 'shadow', rows: [
    '.....kkk.',
    '....kbbyk',
    '.k..kbbbkk',
    'kbk.kbbk..',
    'kbbkbbbk..',
    '.kbbbbck..',
    '..kkkkk...'
  ].map((r) => r.padEnd(10, '.')) },
  knight: { mat: 'steel', rows: [
    '....kkk....',
    '...kdddk...',
    '...kd33k...',
    '...kdddk...',
    '..kkcddkk..',
    '.k3kcdcdk..',
    '.k3kdcccdk.',
    '.k3kcdcdkk.',
    '.k3kccccdk.',
    '..kkcccck..',
    '...kbkkbk..',
    '...kbk.kbk.',
    '...kck.kck.',
    '..kkkk.kkkk'
  ] },
  dragon: { mat: 'fire', rows: [
    '....kk..............',
    '...k33k.............',
    '...k223k..kk........',
    '....k22kkk33k.......',
    '...k2333333322kk....',
    '..k23y3333333222kk..',
    '..k2333333333322223k',
    '..k22333333kkkkkk22k',
    '...k2223332kwkwkwkk.',
    '....kk22222k........',
    '......k1222kwkwkk...',
    '.....k12222222222k..',
    '....k1222kkkkkkkk...',
    '...k1222k...........',
    '..k1222k............',
    '.k1222k.............',
    'k1222k..............'
  ] },
  tree: { mat: 'wood', rows: [
    '...kkkkkk...',
    '..k233322k..',
    '.k23433322k.',
    'k2333433322k',
    'k2y32223y22k',
    'k2223322222k',
    '.k22kkkk22k.',
    '..kkcddckk..',
    '...kckkck...',
    '...kcddck...',
    '..kbcddcbk..',
    '.kb.kcck.bk.',
    'kk..kcck..kk',
    '...kbccbk...'
  ] },
  spirit: { mat: 'smoke', rows: [
    '..kkkkk..',
    '.k33333k.',
    'k3344433k',
    'k3k343k3k',
    'k3333333k',
    'k3332333k',
    'k3333333k',
    '.k33333k.',
    '.k32323k.',
    '..k3k3k..',
    '...k.k...'
  ] },
  bear: { mat: 'mud', rows: [
    '.kk....kk.....',
    'kcck..kcck....',
    '.kcckkccckkk..',
    '.kcccccccccck.',
    'kcykccccccccck',
    'kcccccccccccck',
    '.kkkcccccccccck',
    '...kcccbbcccbk',
    '...kcck.kcck.k',
    '...kkkk.kkkk..'
  ].map((r) => r.padEnd(14, '.').slice(0, 14)) },
  horror: { mat: 'curse', rows: [
    '...kkkkkk...',
    '..kccccccck.',
    '.kccwwwwcck.',
    'kccwwkkwwcck',
    'kccwkrrkwcck',
    'kccwwkkwwcck',
    '.kccwwwwcck.',
    '..kccccccck.',
    '.kck.kck.kck',
    'kck..kck..kc',
    'kk...kk...kk'
  ] },
  familiar: { mat: 'shadow', rows: [
    'k...k....',
    'kk.kk....',
    'kccck....',
    'kycyk...k',
    'kccckkkkk',
    '.kcccccck',
    '.kccccck.',
    '.kck.kck.',
    '.kk...kk.'
  ] },
  spider: { mat: 'shadow', rows: [
    'k..kkk..k',
    '.kkcccckk',
    'kkcrcrcck',
    '.kkcccckk',
    'k.kkkkk.k',
    '.k.....k.'
  ] },
  frog: { mat: 'nature', rows: [
    '.kk..kk.',
    'kwkkkkwk',
    'kddddddk',
    'kdcbbcdk',
    '.kddddk.',
    'kdk..kdk'
  ] },
  homunculus: { mat: 'mud', rows: [
    '..kkk..',
    '.kccck.',
    '.kykyk.',
    '.kccck.',
    'kkbcbkk',
    'k.kcck.',
    '..kbbk.',
    '..kckck',
    '..kk.kk'
  ] },
  totem: { mat: 'wood', rows: [
    '.kkkk.',
    'kc33ck',
    'kykkyk',
    'kcddck',
    'k3kk3k',
    'kccddk',
    'kyccyk',
    'kcddck',
    'kbkkbk',
    '.kcdk.',
    '.kcdk.',
    '.kcdk.',
    '.kbbk.',
    'kkkkkk'
  ] },
  leviathan: { mat: 'water', rows: [
    '.........kkkkkk.........',
    '.......kk222222kk.......',
    '.....kk2222222222kk.....',
    '....k222y2222222y22k....',
    '...k2222222222222222k...',
    '..k22kwkwkwkwkwkwk222k..',
    '..k22k............k22k..',
    '.k222kwkwkwkwkwkwkk222k.',
    '.k22222222222222222222k.',
    'k2222222222222222222222k'
  ] },
  bat: { mat: 'shadow', rows: [
    'k.......k',
    'kk.k.k.kk',
    'kbkkkkkbk',
    '.kbkrkbk.',
    '..k...k..'
  ] },
  doll: { mat: 'wood', rows: [
    '.kkkk.',
    'kcccck',
    'kwkkwk',
    'kckkck',
    '.kkkk.',
    'kcrrck',
    'kckkck',
    '.kcck.',
    '.kkkk.',
    '.k..k.'
  ] },
  elemental: { mat: 'stone', rows: [
    '....kkkk....',
    '..kk3443kk..',
    '.k33444433k.',
    '.k3y4334y3k.',
    'k2333333332k',
    'k2k233332k2k',
    'k2.k2332k.2k',
    '.k.k2222k.k.',
    '...k2kk2k...',
    '..k22kk22k..',
    '..kkk..kkk..'
  ] }
};

export const SYMBOLS = {
  skull: ['.kkkkk.', 'kwwwwwk', 'kwkwkwk', 'kwwwwwk', '.kwkwk.', '.kkkkk.'],
  eye: ['..kkkkk..', '.k33333k.', 'k33kkk33k', 'k3kk4kk3k', 'k33kkk33k', '.k33333k.', '..kkkkk..'],
  heart: ['.kk.kk.', 'k33k43k', 'k33333k', '.k333k.', '..k3k..', '...k...'],
  zzz: ['kkkk....', '..k.....', '.k..kkk.', 'kkkk..k.', '.....k..', '....kkk.'],
  question: ['.kkk.', 'k...k', '...k.', '..k..', '.....', '..k..'],
  exclaim: ['k', 'k', 'k', 'k', '.', 'k'],
  hourglass: ['kkkkkkk', 'k33333k', '.k333k.', '..k3k..', '.k.3.k.', 'k..3..k', 'k33333k', 'kkkkkkk'],
  crown: ['k.k.k.k', 'k3k3k3k', 'k33333k', 'k34343k', 'kkkkkkk'],
  note: ['..kk', '..k3', '..k.', '..k.', 'kkk.', 'k3k.', 'kkk.'],
  rune1: ['k...k', 'kk.kk', 'k.k.k', 'k...k', 'k...k'],
  rune2: ['kkkkk', '..k..', '.kkk.', 'k.k.k', '..k..'],
  rune3: ['k.k.k', '.kkk.', '..k..', '.k.k.', 'k...k'],
  rune4: ['.kkk.', 'k...k', 'kkkkk', 'k...k', 'k...k'],
  cross: ['.kkk.', 'kk3kk', 'k333k', 'kk3kk', '.kkk.'],
  key: ['.kk.....', 'k33kkkkk', 'k33k3k3k', '.kk.....'],
  lock: ['.kkk.', 'k...k', 'k...k', 'kkkkk', 'k333k', 'k3k3k', 'k333k', 'kkkkk'],
  moon: ['..kkk.', '.k33k.', 'k33k..', 'k33k..', 'k33k..', '.k33k.', '..kkk.'],
  spiral: ['kkkkk', 'k...k', 'k.k.k', 'k.kkk', 'k....', 'kkkkk'],
  mask: ['.kkkkkkk.', 'k3333333k', 'k3kk3kk3k', 'k3333333k', 'k33k3k33k', '.k33333k.', '..kkkkk..'],
  hand: ['..k.k.k.', '.kkkkkk.', '.k3k3k3k', '.k3k3k3k', 'kk333333', 'k3333333', '.k33333k', '..k333k.', '..kkkkk.'],
  flask: ['..kk..', '..kk..', '.k33k.', 'k3443k', 'k3333k', 'k2222k', '.kkkk.'],
  crowmark: ['k...k', '.k.k.', '..k..', '.k.k.', 'k...k'],
  sun: ['..k.k.k..', '...kkk...', 'k.k333k.k', '.k34443k.', 'kk34443kk', '.k34443k.', 'k.k333k.k', '...kkk...', '..k.k.k..'],
  halo: ['.kkkkk.', 'k33333k', '.kkkkk.'],
  chainlink: ['.kk.', 'k..k', 'k..k', '.kk.'],
  drop: ['..k..', '.k3k.', 'k343k', 'k333k', '.kkk.'],
  bolt: ['...kk', '..k3k', '.k3k.', 'kkkkk', '.k3k.', 'k3k..', 'kk...'],
  sword: ['....k', '...k4', '..k4k', 'kk4k.', '.kk..', 'k.k..'],
  frogface: ['k..k', 'kkkk'],
  berry: ['...kk', '..kd.', '.kkk.', 'k343k', 'k333k', 'k323k', '.kkk.'],
  shield: ['kkkkk', 'k343k', 'k333k', '.k3k.', '..k..']
};

// Monta o mapa de cores a partir das rampas (magia e material).
export function colorMap(pal, mat) {
  const m = mat || pal;
  return {
    k: '#140e18', w: '#ffffff', r: '#e8283a', y: '#ffe060',
    0: pal[0], 1: pal[1], 2: pal[2], 3: pal[3], 4: pal[4],
    a: m[0], b: m[1], c: m[2], d: m[3], e: m[4]
  };
}

// Desenha um sprite centrado em (x, y) (y = base/pes quando anchor='bottom').
// cut (0..1): mostra so a parte de cima (criatura subindo do chao).
export function drawSprite(ctx, rows, colors, x, y, { flipX = false, anchor = 'center', cut = 1, scale = 1, solid = null } = {}) {
  const h = rows.length;
  const w = rows[0].length;
  const s = Math.max(1, Math.round(scale));
  const ox = Math.round(x - (w * s) / 2);
  const oy = Math.round(anchor === 'bottom' ? y - h * s : y - (h * s) / 2);
  const show = Math.ceil(h * Math.max(0, Math.min(1, cut)));
  for (let j = 0; j < show; j++) {
    const row = rows[j];
    for (let i = 0; i < w; i++) {
      const ch = row[flipX ? w - 1 - i : i];
      if (ch === '.' || ch === ' ') continue;
      const c = solid || colors[ch];
      if (c) rect(ctx, ox + i * s, oy + j * s, s, s, c);
    }
  }
}
