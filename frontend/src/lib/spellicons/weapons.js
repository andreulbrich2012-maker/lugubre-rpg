// Silhuetas 16x16 das 29 armas e os selos das manobras.
// As armas de haste/lamina sao rasterizadas na diagonal (cabo embaixo-esquerda, ponta
// em cima-direita, como os icones classicos de inventario) a partir de duas coordenadas:
//   s = posicao ao longo da arma (0 = canto de baixo, 15 = canto de cima)
//   v = distancia perpendicular (negativo = lado de cima/esquerda, o lado da luz)
// Mascaras: Z = metal, H = madeira/couro, G = ouro/latao, X = gema na cor do elemento.
// O sombreamento sai do autoShade, entao toda arma recebe a mesma luz.
import { autoShade, gridFrom, overlay } from './pixels.js';

const S = 16;

// Converte (x, y) em (s, v) e chama a funcao de forma.
function diag(fn) {
  return gridFrom(S, S, (x, y) => fn((x - y + 15) / 2, x + y - 15, x, y));
}

const seg = (s, v, a, b, hw) => s >= a && s <= b && Math.abs(v) <= hw;
// Lamina com ponta afinando nos ultimos `tip` passos.
const blade = (s, v, a, b, hw, tip = 1.5) => {
  if (s < a || s > b) return false;
  const w = s > b - tip ? hw * ((b - s) / tip) : hw;
  return Math.abs(v) <= w + 0.01;
};
// Distancia em pixels entre (s, v) e um centro (sc, vc).
const dist = (s, v, sc, vc) => Math.sqrt(2 * (s - sc) ** 2 + ((v - vc) ** 2) / 2);

// Espadas e afins: pomo, empunhadura, guarda, lamina.
function sword({ pommel, grip, guard, guardW, bladeTo, hw = 1, tip = 1.5, glint = true }) {
  return diag((s, v) => {
    if (blade(s, v, guard + 1, bladeTo, hw, tip)) return glint && s === bladeTo - 3 && v === -hw ? 'W' : 'Z';
    if (seg(s, v, guard, guard + 0.5, guardW)) return 'G';
    if (seg(s, v, pommel + 1, guard - 0.5, 1)) return 'H';
    if (seg(s, v, pommel, pommel + 0.5, 1.5)) return 'G';
    return null;
  });
}

const W = {};

W['adaga'] = () => sword({ pommel: 3, guard: 6.5, guardW: 3, bladeTo: 12.5, tip: 2 });

W['faca-de-caca'] = () => diag((s, v) => {
  // lamina de um fio so, barriga para baixo-direita e ponta recortada
  if (s >= 7.5 && s <= 13) {
    const up = s > 11.5 ? 1 - (s - 11.5) * 0.9 : 1;
    const down = s > 10 ? 2.5 * (13 - s) / 3 : 2.5;
    if (v >= -up && v <= down) return s === 9.5 && v === -1 ? 'W' : 'Z';
  }
  if (seg(s, v, 7, 7, 2)) return 'G';
  if (seg(s, v, 2.5, 6.5, 1)) return Math.round(s * 2) % 3 === 0 ? 'n' : 'H';
  if (seg(s, v, 2, 2, 1.5)) return 'G';
  return null;
});

W['espada-curta'] = () => sword({ pommel: 1.5, guard: 5, guardW: 3, bladeTo: 13.5 });
W['espada-longa'] = () => sword({ pommel: 0.5, guard: 4, guardW: 4, bladeTo: 15, tip: 2 });
W['montante'] = () => diag((s, v) => {
  if (blade(s, v, 5.5, 15, 2, 2.5)) return s === 11 && v === -2 ? 'W' : s > 6 && s < 12 && v === 0 ? 'c' : 'Z';
  if (seg(s, v, 4.5, 5, 5) || (seg(s, v, 5.5, 5.5, 5) && Math.abs(v) >= 4)) return 'G';
  if (seg(s, v, 1, 4, 1)) return Math.round(s * 2) % 2 ? 'n' : 'H';
  if (seg(s, v, 0, 0.5, 2)) return 'G';
  return null;
});

W['sabre'] = () => diag((s, v) => {
  const c = s > 5.5 ? 0.075 * (s - 5.5) ** 2 : 0;
  if (blade(s, v - c, 5.5, 15, 1, 2)) return 'Z';
  if (seg(s, v, 4.5, 5, 3)) return 'G';
  if (v >= 2.5 && v <= 3.5 && s >= 1 && s <= 4.5) return 'G'; // guarda-mao em arco
  if (seg(s, v, 1.5, 4, 1)) return 'H';
  if (seg(s, v, 0.5, 1, 1.5)) return 'G';
  return null;
});

W['rapieira'] = () => diag((s, v) => {
  if (seg(s, v, 6.5, 15, 0.5)) return s === 11 ? 'W' : 'Z';
  if (dist(s, v, 5, 0) <= 2.6) return dist(s, v, 5, 0) <= 1.2 ? 'u' : 'G'; // copo da guarda
  if (seg(s, v, 5, 5, 5)) return 'G';
  if (seg(s, v, 1.5, 3.5, 1)) return 'H';
  if (seg(s, v, 0.5, 1, 1.5)) return 'G';
  return null;
});

// Machados: lamina larga do lado da luz, mais larga no gume.
const axeHead = (s, v, sc, depth, flare) => {
  if (v > -1 || v < -depth) return false;
  const w = 1 + (Math.abs(v) - 1) * flare;
  return s >= sc - w && s <= sc + 1 + w;
};

W['machadinha'] = () => diag((s, v) => {
  if (axeHead(s, v, 10, 6, 0.32)) return v <= -5 ? 'W' : 'Z';
  if (seg(s, v, 10, 11, 2)) return 'Z';
  if (seg(s, v, 2, 11.5, 1)) return 'H';
  return null;
});

W['machado-de-guerra'] = () => diag((s, v) => {
  if (axeHead(s, v, 10.5, 8, 0.42)) return v <= -7 ? 'W' : 'Z';
  if (v >= 1 && v <= 4 && s >= 10.5 + (v - 1) * 0.3 && s <= 11.5 - (v - 1) * 0.0) return 'Z'; // esporao
  if (seg(s, v, 10, 12.5, 1.5)) return 'Z';
  if (seg(s, v, 0, 13.5, 1)) return s >= 3 && s <= 4.5 ? 'G' : 'H';
  return null;
});

W['maca'] = () => diag((s, v) => {
  const d = dist(s, v, 12, 0);
  if (d <= 3.1) return d < 1.2 && v < 0 ? 'W' : 'Z';
  // flanges nas quatro direcoes
  if (d <= 4.6 && (Math.abs(v) <= 0.5 || Math.abs(s - 12) <= 0.25)) return 'Z';
  if (seg(s, v, 1.5, 9.5, 1)) return s >= 2 && s <= 4 ? 'n' : 'H';
  if (seg(s, v, 0.5, 1, 1.5)) return 'G';
  return null;
});

W['martelo-de-guerra'] = () => diag((s, v) => {
  if (seg(s, v, 10.5, 13.5, 4.5) && v <= 4) return v === -4 && s === 11 ? 'W' : 'Z';
  if (v > 4 && v <= 8 && s >= 11.5 && s <= 12.5 - (v - 4) * 0.12) return 'Z'; // bico de tras
  if (seg(s, v, 13.5, 15, 0.5)) return 'Z';
  if (seg(s, v, 0.5, 10.5, 1)) return s >= 1.5 && s <= 3.5 ? 'n' : 'H';
  return null;
});

W['mangual'] = () => diag((s, v) => {
  const d = dist(s, v, 12, -3);
  if (d <= 2.4) return d < 1 ? 'W' : 'Z';
  if (d <= 3.6 && (Math.abs(s - 12) <= 0.25 || Math.abs(v + 3) <= 0.5)) return 'Z'; // cravos
  // corrente: elos alternados entre o cabo e a bola
  if (s >= 7.5 && s <= 10.5 && Math.abs(v - (s - 7.5) * -0.7) <= 0.6) return Math.round(s * 2) % 2 ? 'b' : 'd';
  if (seg(s, v, 6.5, 7, 1.5)) return 'G';
  if (seg(s, v, 1, 6, 1)) return 'H';
  if (seg(s, v, 0.5, 0.5, 1.5)) return 'G';
  return null;
});

W['lanca'] = () => diag((s, v) => {
  if (s >= 11 && s <= 15) {
    const w = s < 12.5 ? 1 + (s - 11) * 0.8 : 2.2 * (15 - s) / 2.5;
    if (Math.abs(v) <= w + 0.01) return s === 12.5 && v === -2 ? 'W' : 'Z';
  }
  if (seg(s, v, 10, 10.5, 1.5)) return 'G';
  if (seg(s, v, 0, 10, 1)) return 'H';
  return null;
});

W['alabarda'] = () => diag((s, v) => {
  if (blade(s, v, 12.5, 15, 1, 2)) return 'Z';
  if (axeHead(s, v, 9.5, 6, 0.35)) return v <= -5 ? 'W' : 'Z';
  if (v >= 1 && v <= 4 && s >= 10 && s <= 11 - (v - 1) * 0.25) return 'Z'; // gancho
  if (seg(s, v, 9, 12, 1.5)) return 'Z';
  if (seg(s, v, 0, 12.5, 1)) return 'H';
  return null;
});

W['cajado'] = () => diag((s, v) => {
  const d = dist(s, v, 13.2, 0);
  if (d <= 1.9) return d < 0.8 ? 'W' : 'X';
  if (s >= 11.5 && s <= 14.5 && Math.abs(v) >= 1.5 && Math.abs(v) <= 3 && dist(s, v, 13.2, 0) <= 3.2) return 'G'; // garras que prendem a gema
  if (seg(s, v, 11, 11.5, 2)) return 'G';
  // cabo nodoso: engrossa em dois nos
  const knot = Math.abs(s - 4) < 0.6 || Math.abs(s - 8) < 0.6;
  if (seg(s, v, 0, 11, knot ? 1.5 : 1)) return 'H';
  return null;
});

W['bordao'] = () => diag((s, v) => {
  if (seg(s, v, 0, 1.5, 1.5) || seg(s, v, 13.5, 15, 1.5)) return 'G';
  if (seg(s, v, 6.5, 8.5, 1.5)) return Math.round(s * 2) % 2 ? 'n' : 'o';
  if (seg(s, v, 0, 15, 1)) return 'H';
  return null;
});

W['azagaia'] = () => diag((s, v) => {
  if (blade(s, v, 11.5, 15, 1, 2.5)) return s === 12 && v === -1 ? 'W' : 'Z';
  if (seg(s, v, 11, 11, 1)) return 'G';
  if (seg(s, v, 5.5, 7.5, 1)) return 'n';
  if (seg(s, v, 0.5, 11, 0.5)) return 'H';
  return null;
});

// Arcos: hastes curvas para o lado da luz e corda reta.
function bow(L, D, recurve = false) {
  return diag((s, v) => {
    const t = (s - 7.5) / L;
    if (Math.abs(t) > 1) return null;
    let c = -D * (1 - t * t);
    if (recurve && Math.abs(t) > 0.82) c += (Math.abs(t) - 0.82) * 10;
    if (Math.abs(v - c) <= 0.85) return Math.abs(t) < 0.18 ? 'n' : 'H';
    if (v === 1 && Math.abs(t) < 0.97) return 'e';
    return null;
  });
}
W['arco-curto'] = () => bow(5.6, 4.6, true);
W['arco-longo'] = () => bow(7.4, 5.4);

function crossbow(span, metalProd) {
  return diag((s, v) => {
    // arco atravessado (perpendicular a coronha), pontas recuando
    if (Math.abs(v) <= span) {
      const c = 11 - (v / span) ** 2 * 1.6;
      if (Math.abs(s - c) <= 0.5) return metalProd ? 'Z' : 'H';
      // corda das pontas ate a noz
      const cs = 11 - 1.6 - (1 - Math.abs(v) / span) * 2.4;
      if (Math.abs(v) >= 1 && Math.abs(s - cs) <= 0.25) return 'e';
    }
    if (seg(s, v, 7.5, 13.5, 0) ) return 'b'; // virote
    if (seg(s, v, 13.5, 14.5, 0.5)) return 'Z';
    if (seg(s, v, 1, 11, 1)) return s >= 4 && s <= 5 && v >= 0 ? 'G' : 'H';
    if (seg(s, v, 0, 1, 1.5)) return 'H';
    return null;
  });
}
W['besta-leve'] = () => crossbow(4.6, false);
W['besta'] = () => crossbow(6.6, true);

// ---- armas desenhadas a mao (forma nao e uma haste) ----
W['foice'] = () => [
  '......ZZZZ......',
  '....ZZZWZZZZ....',
  '...ZZ.....ZZZ...',
  '..ZZ.......ZZ...',
  '..Z.........ZZ..',
  '............ZZ..',
  '...........ZZ...',
  '..........ZZ....',
  '.........GG.....',
  '........HH......',
  '.......HHH......',
  '......HHH.......',
  '.....HHH........',
  '....HHH.........',
  '...HHH..........',
  '...GG...........'
];

W['gadanha'] = () => overlay(diag((s, v) => (seg(s, v, 0, 13.5, 1) ? 'H' : seg(s, v, 5, 5.5, 1.5) ? 'G' : null)), [
  '................',
  '...ZZZZZZZZZZZ..',
  '.ZZZZWZZZZZZ....',
  'ZZ..............',
  'Z...............'
], 0, 0);

W['chicote'] = () => [
  '................',
  '......HHHH......',
  '....HH....HH....',
  '...H........H...',
  '..H..........H..',
  '..H...........H.',
  '..H....HHH....H.',
  '...H..H...H...H.',
  '....HH.....H.H..',
  '...........HH...',
  '..........HH....',
  '.........GG.....',
  '........HH......',
  '.......HH.......',
  '......HH........',
  '.....GG.........'
];

W['manoplas'] = () => [
  '................',
  '...ZZ.ZZ.ZZ.ZZ..',
  '..ZZZZZZZZZZZZZ.',
  '..ZZZbZZbZZbZZZ.',
  '..ZZZbZZbZZbZZZ.',
  '..ZZZbZZbZZbZZZ.',
  '..ZZZZZZZZZZZZZ.',
  '..aaaaaaaZZZZZZ.',
  '..ZZZZZZZaZZZZZ.',
  '...ZZZZZZaZZZZ..',
  '....ZZZZZZZZZ...',
  '.....GGGGGGG....',
  '....HHHHHHHHH...',
  '....HHHHHHHHH...',
  '....GGGGGGGGG...',
  '................'
];

W['garras-de-ferro'] = () => [
  '..Z....Z....Z...',
  '..ZZ...ZZ...ZZ..',
  '...ZZ...ZZ...ZZ.',
  '...ZZ...ZZ...ZZ.',
  '...ZZ...ZZ...ZZ.',
  '...ZZ...ZZ...ZZ.',
  '..ZZZ..ZZZ..ZZZ.',
  '..GGGGGGGGGGGGG.',
  '..HHHHHHHHHHHHH.',
  '..HHHHHHHHHHHHH.',
  '..HHHHHHHHHHHHH.',
  '...HHHHHHHHHHH..',
  '....GGGGGGGGG...',
  '....HHHHHHHHH...',
  '................',
  '................'
];

W['escudo'] = () => gridFrom(S, S, (x, y) => {
  const r = Math.hypot(x - 7.5, y - 7.5);
  if (r > 7.6) return null;
  if (r > 6.2) return 'Z';
  if (r < 1.6) return r < 0.9 ? 'W' : 'Z';
  if (r < 2.4) return 'G';
  return (x + 1) % 4 === 0 ? 'm' : 'H'; // tabuas
});

W['funda'] = () => [
  '................',
  '..........ZZZ...',
  '.........ZWZZZ..',
  '........HZZZZZH.',
  '.......H.HZZZH.H',
  '......H...HHH..H',
  '.....H.........H',
  '....H.........H.',
  '...H.........H..',
  '..H.........H...',
  '.H.........H....',
  'GG.......HH.....',
  'GG.....HH.......',
  '.HHHHHH.........',
  '................',
  '................'
];

W['dardos'] = () => [
  '................',
  '...........ZZ...',
  '..........ZWZ.Z.',
  '.........ZZ..ZZ.',
  '.....Z..HH..ZWZ.',
  '....ZZ.HH..ZZ...',
  '....ZWHH..HH....',
  '.....HH..HH.....',
  '....HH..HH......',
  '...EH..EH.......',
  '..EEE.EEE.......',
  '..EE..EE........',
  '................',
  '................',
  '................',
  '................'
];

const memo = new Map();
export function weaponGrid(id) {
  if (!memo.has(id)) {
    const build = W[id] || W['espada-longa'];
    memo.set(id, autoShade(build()));
  }
  return memo.get(id);
}

export const WEAPON_GRIDS = Object.keys(W);

// ---- selos de manobra 7x7 (canto de baixo-direita do icone) ----
export const MANEUVER_BADGES = {
  golpe: [
    'XXX....',
    '..XXX..',
    '....XX.',
    '.....XX',
    '....XX.',
    '..XXX..',
    'XXX....'
  ],
  investida: [
    'X..X...',
    'XX.XX..',
    '.XX.XX.',
    '..XX.XX',
    '.XX.XX.',
    'XX.XX..',
    'X..X...'
  ],
  defesa: [
    'XXXXXXX',
    'XXXWXXX',
    'XXWWWXX',
    'XXXWXXX',
    '.XXXXX.',
    '..XXX..',
    '...X...'
  ],
  giro: [
    '..XXX.X',
    '.X...XX',
    'X...XXX',
    'X......',
    'X.....X',
    '.X...X.',
    '..XXX..'
  ],
  perfuracao: [
    'X..X..X',
    '.X.X.X.',
    '..XXX..',
    'XXXWXXX',
    '..XXX..',
    '.X.X.X.',
    'X..X..X'
  ],
  arremesso: [
    '...XXXX',
    '....XXX',
    '...XXXX',
    '..XXX.X',
    '.XXX...',
    'XXX....',
    'XX.....'
  ],
  tiro: [
    '..XXX..',
    '.X...X.',
    'X..W..X',
    'X.WWW.X',
    'X..W..X',
    '.X...X.',
    '..XXX..'
  ]
};

// Cor propria de cada manobra no selo (leitura rapida mesmo sem ler o nome).
export const MANEUVER_COLORS = {
  golpe: '#f06a3a',
  investida: '#f4c040',
  defesa: '#6aa8f0',
  giro: '#c07af0',
  perfuracao: '#f4f0e0',
  arremesso: '#7ad46a',
  tiro: '#f4d070'
};
