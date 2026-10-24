// Icones de itens 16x16 (inventario). Desenho = mascara de materiais; o volume e o contorno
// saem do motor (render.js) com as rampas do avatar, para tudo casar com personagens e mapa.
import { weaponIconFor, normalize } from './weapons.js';

// Legenda base (M): cada letra e um material; maiuscula/variante = tom fixo (detalhe, veio, brilho).

// ---- cores base (quentes e saturadas; a rampa cuida da sombra azulada e da luz creme) ----
export const C = {
  wood: '#a86a3c', woodDk: '#74482c', leather: '#9c5832', leatherDk: '#6a3a26',
  iron: '#7e8798', steel: '#b2c0d2', gold: '#e8b03a', silver: '#c6cfdc', bronze: '#c47838',
  copper: '#c8683a', platinum: '#cfe6ea', paper: '#f0dcaa', parch: '#dcb878', bone: '#ecdcb4',
  cloth: '#c0443c', blue: '#3e6ab0', leaf: '#5aa63e', glass: '#cfe6ee', cork: '#c08a52',
  wax: '#c0343c', stone: '#8c8494', coal: '#3e3846', rope: '#c8a064', flesh: '#d88a7a',
  purple: '#7a48b0', teal: '#2f9a9a', orange: '#e07a30', cream: '#fff6da'
};

const M = {
  w: C.wood, W: [C.wood, 1], v: [C.wood, 4], n: C.woodDk, N: [C.woodDk, 0],
  l: C.leather, L: [C.leather, 1], j: C.leatherDk,
  i: C.iron, I: [C.iron, 4], s: C.steel, S: [C.steel, 4], a: C.gold, A: [C.gold, 4], b: C.bronze,
  p: C.paper, P: [C.paper, 1], q: C.parch, e: C.bone, E: [C.bone, 1],
  c: C.cloth, C: [C.cloth, 1], u: C.blue, U: [C.blue, 4], g: C.leaf, G: [C.leaf, 1],
  r: C.rope, R: [C.rope, 1], o: C.stone, O: [C.stone, 1], x: C.coal,
  k: [C.woodDk, 'line'], K: [C.iron, 'line'],
  '#': [C.cream, 'raw'],
  f: ['#f07c2e', 'raw'], F: ['#ffe48a', 'raw'], h: ['#d4482c', 'raw'], H: ['#fffbe8', 'raw']
};

export const ITEM_ICONS = {}; // id -> { rows, pal, label, cat }
const CATS = {};

function add(cat, id, label, rows, pal = {}) {
  if (ITEM_ICONS[id]) throw new Error(`icone duplicado: ${id}`);
  if (rows.length !== 16 || rows.some((r) => r.length !== 16)) throw new Error(`icone ${id}: grade precisa ser 16x16`);
  ITEM_ICONS[id] = { rows, pal: { ...M, ...pal }, label, cat };
  (CATS[cat] ||= []).push(id);
}

// ================= POCOES (gerador: frasco x liquido x tampa x rotulo) =================
// Silhuetas: c = tampa, n = gargalo (vidro), x = corpo. O gerador decide liquido/vidro/brilho.
const FLASKS = {
  redonda_p: { level: 8, rows: [
    '................', '................', '................', '................',
    '......cccc......', '......cccc......', '.......nn.......', '.....xxxxxx.....',
    '....xxxxxxxx....', '....xxxxxxxx....', '....xxxxxxxx....', '....xxxxxxxx....',
    '.....xxxxxx.....', '................', '................', '................'] },
  redonda_m: { level: 7, rows: [
    '................', '................', '......cccc......', '......cccc......',
    '.......nn.......', '.......nn.......', '.....xxxxxx.....', '....xxxxxxxx....',
    '...xxxxxxxxxx...', '...xxxxxxxxxx...', '...xxxxxxxxxx...', '...xxxxxxxxxx...',
    '....xxxxxxxx....', '.....xxxxxx.....', '................', '................'] },
  redonda_g: { level: 7, rows: [
    '................', '......cccc......', '......cccc......', '.......nn.......',
    '.......nn.......', '.....xxxxxx.....', '...xxxxxxxxxx...', '..xxxxxxxxxxxx..',
    '..xxxxxxxxxxxx..', '..xxxxxxxxxxxx..', '..xxxxxxxxxxxx..', '..xxxxxxxxxxxx..',
    '...xxxxxxxxxx...', '....xxxxxxxx....', '......xxxx......', '................'] },
  tubo: { level: 6, liquid: 'cyl', rows: [
    '................', '................', '......cccc......', '......cccc......',
    '.......xx.......', '......xxxx......', '......xxxx......', '......xxxx......',
    '......xxxx......', '......xxxx......', '......xxxx......', '......xxxx......',
    '......xxxx......', '.......xx.......', '................', '................'] },
  cone: { level: 9, rows: [
    '................', '................', '......cccc......', '......cccc......',
    '.......nn.......', '.......nn.......', '.......nn.......', '......xxxx......',
    '......xxxx......', '.....xxxxxx.....', '.....xxxxxx.....', '....xxxxxxxx....',
    '...xxxxxxxxxx...', '...xxxxxxxxxx...', '................', '................'] },
  quadrada: { level: 8, liquid: 'cyl', rows: [
    '................', '................', '......cccc......', '......cccc......',
    '.......nn.......', '.......nn.......', '....xxxxxxxx....', '...xxxxxxxxxx...',
    '...xxxxxxxxxx...', '...xxxxxxxxxx...', '...xxxxxxxxxx...', '...xxxxxxxxxx...',
    '...xxxxxxxxxx...', '...xxxxxxxxxx...', '................', '................'] },
  coracao: { level: 8, rows: [
    '................', '................', '......cccc......', '......cccc......',
    '.......nn.......', '.......nn.......', '...xxxxnnxxxx...', '..xxxxxxxxxxxx..',
    '..xxxxxxxxxxxx..', '..xxxxxxxxxxxx..', '...xxxxxxxxxx...', '....xxxxxxxx....',
    '.....xxxxxx.....', '......xxxx......', '.......xx.......', '................'] },
  cabaca: { level: 9, rows: [
    '................', '.......cc.......', '......cccc......', '.......nn.......',
    '......xxxx......', '.....xxxxxx.....', '.....xxxxxx.....', '......xxxx......',
    '....xxxxxxxx....', '...xxxxxxxxxx...', '...xxxxxxxxxx...', '...xxxxxxxxxx...',
    '...xxxxxxxxxx...', '....xxxxxxxx....', '.....xxxxxx.....', '................'] },
  gota: { level: 9, rows: [
    '................', '................', '.......cc.......', '......cccc......',
    '.......nn.......', '.......xx.......', '......xxxx......', '......xxxx......',
    '.....xxxxxx.....', '....xxxxxxxx....', '....xxxxxxxx....', '....xxxxxxxx....',
    '....xxxxxxxx....', '.....xxxxxx.....', '......xxxx......', '................'] },
  cantil: { level: 8, liquid: 'cyl', rows: [
    '................', '................', '.......cc.......', '......cccc......',
    '.......nn.......', '.......nn.......', '....xxxxxxxx....', '....xxxxxxxx....',
    '...xxxxxxxxxx...', '...xxxxxxxxxx...', '...xxxxxxxxxx...', '...xxxxxxxxxx...',
    '....xxxxxxxx....', '....xxxxxxxx....', '................', '................'] },
  ampola: { level: 7, liquid: 'cyl', rows: [
    '................', '................', '................', '.......cc.......',
    '.......cc.......', '.......nn.......', '......xxxx......', '......xxxx......',
    '......xxxx......', '......xxxx......', '......xxxx......', '.......xx.......',
    '................', '................', '................', '................'] },
  caveira: { level: 7, rows: [
    '................', '................', '......cccc......', '......cccc......',
    '.......nn.......', '....xxxxxxxx....', '...xxxxxxxxxx...', '...xxxxxxxxxx...',
    '...xxyyxxyyxx...', '...xxyyxxyyxx...', '...xxxxxxxxxx...', '....xxxyyxxx....',
    '.....xxxxxx.....', '.....xzxzxx.....', '................', '................'] }
};

export const LIQUIDS = {
  vida: '#d8323c', mana: '#3a72d8', sanidade: '#9a5ad0', veneno: '#62b83a', antidoto: '#e8a838',
  vigor: '#e8d040', fogo: '#ec6a2a', sombra: '#4a3a6a', agua: '#7ac8e0', sangue: '#8a1a2a'
};

function flask(shapeId, liquidHex, { top = 'cork', label = false } = {}) {
  const shape = FLASKS[shapeId];
  const level = shape.level;
  const g = shape.rows.map((r) => [...r]);
  const body = (x, y) => g[y]?.[x] === 'x' || g[y]?.[x] === 'y' || g[y]?.[x] === 'z';
  let firstC = -1;
  for (let y = 0; y < 16; y++) {
    const xs = [];
    for (let x = 0; x < 16; x++) if (shape.rows[y][x] !== '.') xs.push(x);
    if (!xs.length) continue;
    const x0 = xs[0];
    for (const x of xs) {
      const ch = shape.rows[y][x];
      if (ch === 'c') { if (firstC < 0) firstC = y; g[y][x] = top === 'wax' ? 'Q' : 'o'; continue; }
      if (ch === 'n') { g[y][x] = x === x0 ? 'H' : 'Z'; continue; }
      if (ch === 'y') { g[y][x] = 'D'; continue; } // olhos/dentes do frasco-caveira: vidro escuro
      if (ch === 'z') { g[y][x] = 'Z'; continue; }
      const wet = y >= level;
      if (!wet) { g[y][x] = x === x0 || !body(x - 1, y) ? 'H' : 'Z'; continue; }
      g[y][x] = y === level ? 'T' : 'B';
    }
  }
  // cera escorrendo pelo gargalo na tampa lacrada
  if (top === 'wax') {
    for (let y = firstC + 1; y < 16; y++) {
      const x = shape.rows[y].indexOf('n') >= 0 ? shape.rows[y].indexOf('n') : shape.rows[y].indexOf('x');
      if (x >= 0) { g[y][x] = 'Q'; break; }
    }
  }
  // reflexo no vidro (risco creme a esquerda) e uma bolha clara
  for (let y = level + 1, n = 0; y < 16 && n < 2; y++) {
    const x = g[y].findIndex((ch) => ch === 'B');
    if (x >= 0 && g[y][x + 1] === 'B') { g[y][x + 1] = '#'; n++; }
  }
  for (let y = level + 1; y < 16; y++) {
    const x = g[y].lastIndexOf('B');
    if (x > 0 && g[y][x - 1] === 'B' && g[y][x - 2] === 'B') { g[y][x - 1] = 'V'; break; }
  }
  if (label) {
    const ys = [];
    for (let y = level + 2; y < 16; y++) if (g[y].filter((ch) => ch === 'B' || ch === '#' || ch === 'V').length >= 4) ys.push(y);
    const y0 = ys[Math.max(0, Math.floor(ys.length / 2) - 1)];
    for (const y of [y0, y0 + 1]) {
      const xs = g[y].map((ch, x) => (/[BV#]/.test(ch) ? x : -1)).filter((x) => x >= 0);
      xs.slice(1, -1).forEach((x) => { g[y][x] = 'p'; });
      if (y === y0 + 1 && xs.length > 4) g[y][xs[Math.floor(xs.length / 2)]] = 'k';
    }
  }
  return {
    rows: g.map((r) => r.join('')),
    pal: {
      B: [liquidHex, shape.liquid || 'round'], T: [liquidHex, 3], V: [liquidHex, 4],
      H: [C.glass, 4], Z: [C.glass, 2], D: [C.glass, 0],
      o: [C.cork, 'edge'], Q: [C.wax, 'edge']
    }
  };
}

const POTION_SIZES = {
  // cada tipo tem sua familia de silhuetas: da para reconhecer a pocao so pelo frasco
  vida: ['redonda_p', 'redonda_m', 'redonda_g'],
  mana: ['ampola', 'cone', 'quadrada'],
  sanidade: ['tubo', 'gota', 'coracao'],
  veneno: ['gota', 'caveira', 'cabaca'],
  antidoto: ['tubo', 'cantil', 'quadrada']
};
const POTION_NAMES = { vida: 'vida', mana: 'mana', sanidade: 'sanidade', veneno: 'veneno', antidoto: 'antídoto' };
const SIZE_NAMES = ['pequena', 'média', 'grande'];
const SIZE_KEYS = ['p', 'm', 'g'];

for (const [type, shapes] of Object.entries(POTION_SIZES)) {
  shapes.forEach((shape, k) => {
    const top = type === 'veneno' || type === 'sanidade' ? 'wax' : 'cork';
    const f = flask(shape, LIQUIDS[type], { top, label: type === 'antidoto' && k > 0 });
    add('pocoes', `pocao-${type}-${SIZE_KEYS[k]}`, `Poção de ${POTION_NAMES[type]} (${SIZE_NAMES[k]})`, f.rows, f.pal);
  });
}
// Variantes de frasco (formato x tampa x rotulo) para o seletor e para pocoes genericas.
const EXTRA_LIQ = ['vigor', 'fogo', 'sombra', 'agua', 'sangue', 'vida', 'mana', 'antidoto', 'veneno', 'sanidade'];
let li = 0;
for (const shape of Object.keys(FLASKS)) {
  for (const [top, label] of [['cork', false], ['wax', false], ['cork', true]]) {
    const id = `frasco-${shape}-${top === 'wax' ? 'lacre' : 'rolha'}${label ? '-rotulo' : ''}`;
    const f = flask(shape, LIQUIDS[EXTRA_LIQ[li++ % EXTRA_LIQ.length]], { top, label });
    add('pocoes', id, `Frasco ${shape.replace('_', ' ')}`, f.rows, f.pal);
  }
}

// Desenho a mao: grade sem tamanho fixo (linhas com recuo livre); o conteudo e centrado no 16x16.
// Assim cada desenho se preocupa so com a forma, e todos ficam com a mesma margem para o contorno.
function art(cat, id, label, pal, src, extra = {}) {
  const lines = src.split('\n').map((l) => l.trim()).filter(Boolean);
  let x0 = 99, x1 = -1, y0 = 99, y1 = -1;
  lines.forEach((l, y) => [...l].forEach((ch, x) => {
    if (ch === '.') return;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }));
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  if (w > 14 || h > 14) throw new Error(`icone ${id}: ${w}x${h} nao cabe com contorno`);
  const ox = Math.floor((16 - w) / 2) + (extra.dx || 0), oy = Math.floor((16 - h) / 2) + (extra.dy || 0);
  const g = Array.from({ length: 16 }, () => Array(16).fill('.'));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const ch = lines[y][x];
    if (ch && ch !== '.') g[oy + y - y0][ox + x - x0] = ch;
  }
  add(cat, id, label, g.map((r) => r.join('')), pal);
  if (extra.sparkles) ITEM_ICONS[id].sparkles = extra.sparkles;
  if (extra.aura) ITEM_ICONS[id].aura = extra.aura;
}

// ================= COMIDA =================
art('comida', 'pao', 'Pão', { d: ['#c8803c', 'round'], D: ['#f4d48a', 3] }, `
...dddddd....
.dddddddddd..
dddDDddDDdddd
ddddDDddDDddd
ddddddddddddd
.ddddddddddd.
..ddddddddd..
`);
art('comida', 'queijo', 'Queijo', { y: '#f0c040', Y: ['#f0c040', 0], z: '#d88a2a' }, `
.........yy
.......yyyy
.....yyyyyy
...yyyyyyyy
.yyyyyyyyyy
yyyyyyyyyyy
yYyyyyYyyyy
yyyyyyyyYyy
yyYyyyyyyyy
yyyyyYyyyyy
zzzzzzzzzzz
`);
art('comida', 'maca', 'Maçã', { r: ['#d8323c', 'round'], n: C.woodDk, g: C.leaf }, `
.....n.....
....ngg....
..rrnrggr..
.rrrrrrrrr.
rr#rrrrrrrr
r##rrrrrrrr
rrrrrrrrrrr
rrrrrrrrrrr
.rrrrrrrrr.
..rrrrrrr..
...rr.rr...
`);
art('comida', 'coxa', 'Coxa assada', { m: ['#b8602e', 'round'], e: C.bone }, `
..mmmm......
.mmmmmm.....
mmmmmmmm....
mm#mmmmm....
mmmmmmmm....
.mmmmmmm....
..mmmmmm....
....mmee....
......ee....
.......ee.e.
.......eeee.
........ee..
`);
art('comida', 'peixe', 'Peixe', { s: ['#4f86c6', 'round'], B: ['#9ad0ea', 3], f: '#e07a50', o: ['#2a1c2e', 'raw'], O: [C.cream, 'raw'] }, `
....fff.......
..ssssssss..ff
.sOsssssssssff
sooss#sssssff.
sssssssssssff.
.BBBBBBBBBs.ff
..BBBBBBB.....
....ff........
`);
art('comida', 'cenoura', 'Cenoura', { o: '#e8782a', O: ['#e8782a', 1], g: C.leaf }, `
.........g.g.
..........gg.
........oogg.
.......oooog.
......oOooo..
.....ooooo...
....oooOo....
...ooooo.....
..oOoo.......
.ooo.........
oo...........
`);
art('comida', 'torta', 'Torta', { t: '#e0a050', T: ['#e0a050', 4], p: ['#b83a62', 1], d: '#a8aec4' }, `
...tttttttt...
.ttpTpTpTpTtt.
tpTpTpTpTpTpTt
ttTtTtTtTtTttt
tttttttttttttt
.dddddddddddd.
..dddddddddd..
`);
art('comida', 'vinho', 'Garrafa de vinho', { z: C.cork, v: ['#3e7a4a', 'cyl'], p: C.paper, P: ['#9c2a2a', 2] }, `
..zz..
..zz..
..vv..
..vv..
.vvvv.
vvvvvv
vvvvvv
pppppp
pPPPPp
pppppp
vvvvvv
vvvvvv
vvvvvv
`);
art('comida', 'caneca', 'Caneca de cerveja', { f: ['#fff0d0', 'round'], w: [C.wood, 'cyl'], i: C.iron, n: C.woodDk }, `
.ffffffff..
fffffffffff
.wwwwwwww..
.iiiiiiiinn
.wwwwwwww.n
.wwwwwwww.n
.wwwwwwww.n
.iiiiiiiinn
.wwwwwwww..
.wwwwwwww..
`);
const GRAPE = '#8a3ab0';
art('comida', 'uvas', 'Uvas', { 1: [GRAPE, 1], 2: [GRAPE, 2], 3: [GRAPE, 3], 4: [GRAPE, 4], n: C.woodDk, g: C.leaf }, `
.....ngg...
....n.ggg..
.342342342.
.322322322.
.211211211.
..342342...
..322322...
..211211...
...342.....
...322.....
...211.....
`);
art('comida', 'mel', 'Pote de mel', { y: ['#f0b030', 3], o: ['#c87a44', 'round'], p: C.paper, P: ['#f0b030', 1], n: C.woodDk }, `
.......n....
...yyyyyyy..
..ooyoooooo.
...oyoooooo.
..ooooooooo.
.ooooooooooo
.ooopppPoooo
.oooppPpoooo
.ooooooooooo
..ooooooooo.
...ooooooo..
`);
art('comida', 'biscoito', 'Biscoito de viagem', { b: '#c89a5a', B: ['#c89a5a', 0], a: '#e0b878', A: ['#e0b878', 1] }, `
....bbbbbbbbb
....bBbbBbbBb
....bbbbbbbbb
aaaaaaaaabbBb
aAaaAaaAabbbb
aaaaaaaaabbBb
aAaaAaaAabbbb
aaaaaaaaa....
aAaaAaaAa....
aaaaaaaaa....
`);
art('comida', 'ovos', 'Ovos', { e: ['#f4e8d0', 'round'], E: ['#d8a878', 'round'], n: '#b88a4a', N: ['#b88a4a', 0] }, `
...eeee.......
..eeeeee.EEE..
..e#eeeeEEEEE.
..eeeeeeEEEEE.
..eeeeeeEEEEE.
nnnnnnnnnnnnnn
nNnnNnnNnnNnnN
.nnnnnnnnnnnn.
..nnnnnnnnnn..
`);
art('comida', 'linguica', 'Linguiça', { s: ['#b8483a', 'round'], t: ['#d0705a', 'round'], r: C.rope }, `
..sss.........
.sssss........
.s#sss........
.sssss........
..sssr........
.....rtttt....
....tttttt....
....t#tttt....
.....ttttr....
.........rss..
........sssss.
........sssss.
.........sss..
`);

// ================= INGREDIENTES E ERVAS =================
art('ingredientes', 'cogumelo-vermelho', 'Cogumelo vermelho', { r: ['#d83a3a', 'round'], W: [C.cream, 'raw'], E: [C.bone, 1], e: [C.bone, 'cyl'] }, `
....rrrrr....
..rrrrWrrrr..
.rWWrrrrrWrr.
.rWrrrWWrrrr.
rrrrrrWrrrrWr
.EEEEEEEEEEE.
.....eee.....
.....eee.....
....eeeee....
....eeeee....
`);
art('ingredientes', 'cogumelo-palido', 'Cogumelo-pálido', { p: ['#c8c0e0', 'round'], E: ['#a89ac8', 1], e: [C.bone, 'cyl'] }, `
.....pp.....
....pppp....
...pppppp...
..pppppppp..
.pppppppppp.
pppppppppppp
.EEEEEEEEEE.
.....ee.....
.....ee.....
.....ee.....
....eeee....
...eeeeee...
`);
art('ingredientes', 'cogumelos', 'Cogumelos pardos', { m: ['#9a5a34', 'round'], M: ['#b8784a', 'round'], E: [C.bone, 1], e: [C.bone, 'cyl'], g: C.leaf }, `
....mmmm......
...mmmmmm.....
..mmmmmmmm....
..EEEEEEEE.MM.
.....ee...MMMM
.....ee..MMMMMM
.....ee..EEEEEE
....eeee...ee..
.gggeeeeggegeg.
`);
art('ingredientes', 'erva', 'Maço de ervas', { g: C.leaf, G: [C.leaf, 0], m: '#3e6a2a', r: C.rope }, `
.g...g...g.
ggg.ggg.ggg
gGg.gGg.gGg
.gg.gGg.gg.
..gg.g.gg..
...ggggg...
....rrr....
....mmm....
....mmm....
...m.m.m...
..m..m..m..
`);
art('ingredientes', 'folha', 'Folha', { g: '#6ab83e', G: ['#6ab83e', 3], n: '#4a7a2a' }, `
..........gg
........gggg
......gggggg
.....gggggGg
....ggggGggg
...gggGggggg
..ggGgggggg.
..gGggggggg.
.gGggggggg..
.Gggggggg...
nGgggggg....
n...........
`);
art('ingredientes', 'flor', 'Flor', { p: '#e070a0', y: ['#f0c040', 'round'], g: C.leaf, m: '#3e6a2a' }, `
....ppp....
...ppppp...
.pppp.pppp.
ppppyyypppp
ppppyyypppp
.pppyyyppp.
...ppppp...
....ppm....
...gg.m.gg.
..ggg.mggg.
......m....
......m....
`);
art('ingredientes', 'mandragora', 'Raiz de mandrágora', { g: C.leaf, G: [C.leaf, 0], r: ['#d8a878', 'round'], k: ['#d8a878', 'line'] }, `
...g.g.g...
...ggggg...
..gGgGgGg..
....ggg....
...rrrrr...
..rrrrrrr..
..rkrrrkr..
..rrrrrrr..
..rrkkkrr..
...rrrrr...
.rr.rrr.rr.
r...r.r...r
....r...r..
`);
art('ingredientes', 'trevo', 'Trevo de quatro folhas', { g: '#4fa83e', G: ['#4fa83e', 3], n: '#3e6a2a' }, `
.gg.....gg.
gggg...gggg
gGggg.ggGgg
.ggGgggGgg.
..ggggggg..
.ggGgggGgg.
gGggg.ggGgg
gggg.n.gggg
.gg..n..gg.
......n....
.......n...
`);
art('ingredientes', 'bolota', 'Bolota', { w: '#8a5a34', W: ['#8a5a34', 0], o: ['#c88a44', 'round'], n: C.woodDk }, `
....n....
...nn....
.wwwwwww.
wWwWwWwWw
wwwwwwwww
.ooooooo.
.o#ooooo.
.ooooooo.
..ooooo..
...ooo...
....o....
`);
art('ingredientes', 'sal', 'Sal grosso', { h: ['#eef0f8', 'round'], H: ['#c8d0e8', 1], d: '#a86a3c' }, `
.....h.h.....
....hhhhh....
..hhHhhhHhh..
.dhhhhhHhhhd.
dddddddddddddd
.dddddddddddd.
..dddddddddd..
`);
art('ingredientes', 'bagas', 'Bagas', { r: ['#c83a6a', 'round'], n: C.woodDk, g: C.leaf }, `
.....n......
....nn.g....
...n.n.gg...
..rr..rr.ggg
.rrrr.rrrr..
.rrrr.rrrr..
..rr...rr...
.....rr.....
....rrrr....
....rrrr....
.....rr.....
`);
art('ingredientes', 'raiz', 'Raiz', { g: C.leaf, G: [C.leaf, 0], n: '#b88050', N: ['#b88050', 0] }, `
...g.g.g..
..gGgGgGg.
....ggg...
....nnn...
...nnNnn..
...nnnnn..
...nNnnn..
....nnnn..
...nn.nnn.
..n..nn..n
.....n.n..
....n...n.
`);

// ================= PERGAMINHOS =================
art('pergaminhos', 'pergaminho', 'Pergaminho enrolado', { q: ['#e8c888', 'vcyl'], Q: ['#e8c888', 'line'], c: '#c0343c' }, `
.qqqqqqqqqqqq.
qqqqqqqqqqqqqq
QqqqqqcqqqqqqQ
qqqqqqcqqqqqqq
qqqqqqcqqqqqqq
QqqqqqcqqqqqqQ
.qqqqqqqqqqqq.
......cc......
.....c..c.....
`);
art('pergaminhos', 'pergaminho-aberto', 'Pergaminho aberto', { q: ['#d8b070', 'vcyl'], n: C.woodDk, p: C.paper }, `
nqqqqqqqqqqqn
nqqqqqqqqqqqn
.ppppppppppp.
.pkkkk.kkkkp.
.ppppppppppp.
.pkkk.kkkkkp.
.ppppppppppp.
.pkkkkkk.kkp.
.ppppppppppp.
nqqqqqqqqqqqn
nqqqqqqqqqqqn
`);
art('pergaminhos', 'mapa', 'Mapa', { p: '#e8cc90', P: ['#e8cc90', 1], g: ['#6aa84a', 2], u: ['#5a9ad0', 2], c: ['#c0343c', 2] }, `
pppppppppppppp
pPppgggpppppPp
pppgggppppkppp
uuppgpppppkppp
puuppkkkkkpppp
ppuupkpppppPpp
pppupkppppppcp
pPppppkkkppccc
ppppppppppppcp
pppppppppppppp
`);
art('pergaminhos', 'carta', 'Carta lacrada', { p: C.paper, c: ['#c0343c', 'round'] }, `
pppppppppppppp
pkppppppppppkp
ppkppppppppkpp
pppkppppppkppp
ppppkppppkpppp
pppppkcckppppp
ppppppcccppppp
pppppppcpppppp
pppppppppppppp
`);
art('pergaminhos', 'pagina-rasgada', 'Página rasgada', { p: '#ead2a0' }, `
.ppp.pppppp.
pppppppppppp
pkkkkkkk.ppp
pppppppppppp
pkkkk.kkkkpp
pppppppppppp
pkkkkkkkkppp
ppppppppppp.
pkkkk.kkp...
pppppppp....
ppppp.......
.pp.........
`);
art('pergaminhos', 'pergaminho-runa', 'Pergaminho rúnico', { q: ['#d8b070', 'vcyl'], n: C.woodDk, p: C.paper, U: ['#8a4ae0', 'raw'], Y: ['#c8a4ff', 'raw'] }, `
nqqqqqqqqqqn
.pppppppppp.
.ppppUYpppp.
.pppUppYppp.
.ppppUYpppp.
.pppppUpppp.
.pppYUUUppp.
.pppppUpppp.
.pppppppppp.
nqqqqqqqqqqn
`, { sparkles: [[12, 3, '#e0c8ff']] });

// ================= LIVROS =================
const BOOK = (emblem) => `
CCccccccccccc
${emblem.join('\n')}
CCppppppppppp
CCPPPPPPPPPPP
.CCCCCCCCCCCC
`;
art('livros', 'livro', 'Livro', { c: '#a83a34', C: ['#a83a34', 0], a: C.gold, p: C.paper, P: [C.paper, 1] }, BOOK([
  'CCcaccccccacc', 'CCccccccccccc', 'CCcccccaccccc', 'CCccccaaacccc', 'CCcccccaccccc', 'CCccccccccccc', 'CCccccccccccc', 'CCcaccccccacc', 'CCccccccccccc']));
art('livros', 'grimorio', 'Grimório', { c: '#5a3a8a', C: ['#5a3a8a', 0], i: C.iron, w: ['#ecdcb4', 'round'], r: ['#d8283c', 'raw'], p: C.paper, P: [C.paper, 1] }, BOOK([
  'CCiicccccciic', 'CCiccccccccic', 'CCccccccccccc', 'CCcccwwwwcccc', 'CCccwwrrwwccc', 'CCcccwwwwcccc', 'CCccccccccccc', 'CCiccccccccic', 'CCiicccccciic']));
art('livros', 'tomo-caveira', 'Tomo sombrio', { c: '#2f5a4a', C: ['#2f5a4a', 0], e: C.bone, x: ['#2a1c2e', 'raw'], p: C.paper, P: [C.paper, 1] }, BOOK([
  'CCccccccccccc', 'CCcccceeecccc', 'CCccceeeeeccc', 'CCccexeexeccc', 'CCccceeeeeccc', 'CCcccexexcccc', 'CCccccccccccc', 'CCccccccccccc', 'CCccccccccccc']));
art('livros', 'diario', 'Diário', { l: C.leather, L: [C.leather, 0], j: C.leatherDk, a: C.gold, p: C.paper, P: [C.paper, 1] }, `
LLlllllllllll
LLlllllllllll
LLlllllllllll
LLlllllllllll
LLjjjjjjjjjaa
LLjjjjjjjjjaa
LLlllllllllll
LLlllllllllll
LLlllllllllll
LLppppppppppp
LLPPPPPPPPPPP
.LLLLLLLLLLLL
`);
art('livros', 'livro-aberto', 'Livro aberto', { p: C.paper, c: '#a83a34' }, `
.pppp...pppp.
ppppppkpppppp
pkkkppkpkkkpp
ppppppkpppppp
pkkkkpkpkkkkp
ppppppkpppppp
pkkkppkpkkkpp
ppppppkpppppp
cpppppkpppppc
ccccccccccccc
`);
art('livros', 'pilha-livros', 'Pilha de livros', { u: '#3e6ab0', U: [C.gold, 3], c: '#a83a34', a: [C.gold, 3], h: '#2f8a7a', H: [C.gold, 3] }, `
...uuuuuuuuuuu
...uUuuuuuuUuu
...uuuuuuuuuuu
.ccccccccccccc.
.caccccccccacc.
.ccccccccccccc.
..hhhhhhhhhhhh
..hHhhhhhhhhHh
..hhhhhhhhhhhh
`);
art('livros', 'livro-pe', 'Livro em pé', { c: '#7a3a8a', a: [C.gold, 3], p: C.paper, P: [C.paper, 1] }, `
ccccccpp
caaaacpP
ccccccpp
ccccccpP
ccaaccpp
caccacpP
ccaaccpp
ccccccpP
ccccccpp
caaaacpP
cccccc..
`);


// ================= CHAVES =================
art('chaves', 'chave', 'Chave', { i: C.iron }, `
.iiii.........
iiiiii........
ii..iiiiiiiiii
ii..iiiiiiiiii
iiiiii...i.ii.
.iiii....i.ii.
.........i....
`);
art('chaves', 'chave-ornada', 'Chave ornada', { a: C.gold, r: ['#d8283c', 'round'] }, `
..aaa.........
.aaaaa........
aaarraa.......
aarrraaaaaaaaa
aaarraaaaaaaaa
.aaaaa...aa.aa
..aaa....a...a
.........aa.aa
`);
art('chaves', 'chave-enferrujada', 'Chave enferrujada', { i: '#80786e', x: ['#b0582a', 2], X: ['#b0582a', 1] }, `
.iiii.........
ixXiii........
ii..iixiiiiiix
iX..iiiiiXiiii
iiixii...i..i.
.iiii....i....
`);
art('chaves', 'chave-masmorra', 'Chave de masmorra', { i: C.iron }, `
..........ii..
.........iiii.
........iiiii.
.......iii.i..
......iii.....
.....iii......
....iii.......
.iiiii........
ii..ii........
i....i........
ii..ii........
.iiii.........
`);
art('chaves', 'molho-chaves', 'Molho de chaves', { i: C.iron, a: C.gold, b: C.bronze, s: C.steel }, `
....iiiii....
...ii...ii...
...i.....i...
...ii...ii...
....iiiii....
..aa..ss..bb.
..aa..ss..bb.
...a..s...b..
...aa.ss..bb.
...a..s...b..
...aa.ss..bb.
`);
art('chaves', 'cadeado', 'Cadeado', { i: C.iron, a: '#d09a3a', K: ['#d09a3a', 'line'] }, `
...iiiiii...
..ii....ii..
..i......i..
..i......i..
.aaaaaaaaaa.
.aaaaaaaaaa.
.aaaaKKaaaa.
.aaaaKKaaaa.
.aaaaaKaaaa.
.aaaaaaaaaa.
.aaaaaaaaaa.
`);

// ================= MOEDAS (forma x metal; o metal so recolore) =================
export const METALS = { bronze: '#c47838', prata: '#c6cfdc', platina: '#bfe0e8', ouro: '#e8b03a' };
const METAL_NAMES = { bronze: 'bronze', prata: 'prata', platina: 'platina', ouro: 'ouro' };
const coinPal = (hex) => ({ m: [hex, 'round'], 1: [hex, 1], 3: [hex, 3], 4: [hex, 4], c: [hex, 'cyl'], q: [hex, 'line'], e: [hex, 'edge'] });
const COIN_ART = {
  moeda: `
...mmmmm...
.mmmmmmmmm.
.mmm111mmm.
mmm1mmm1mmm
mm1mm4mm1mm
mm1m444m1mm
mm1mm4mm1mm
mmm1mmm1mmm
.mmm111mmm.
.mmmmmmmmm.
...mmmmm...
`,
  pilha: `
...3333333...
..344444443..
..ccccccccc..
..qqqqqqqqq..
...ccccccccc.
...qqqqqqqqq.
..ccccccccc..
..qqqqqqqqq..
.ccccccccc...
.qqqqqqqqq...
..ccccccccc..
`,
  monte: `
....3443.......
...344443......
...q4444q3443..
....qqqq344443.
..3443..q4444q.
.344443..qqqq..
.q4444q3443....
..qqqq344443...
......q4444q...
.......qqqq....
`,
  lingote: `
....44444444..
...4333333334.
..433333333334
..eeeeeeeeeeee
..eeeeeeeeeeee
..eeeeeeeeeeee
`,
  bolsa: `
....r..r......
.....rr.......
....LllL......
...llllll.....
..llllllll....
.lllllllll....
.llllllll3443.
.lllllll344443
.lllllllq4444q
..llllll.qqqq.
`
};
for (const [shape, src] of Object.entries(COIN_ART)) {
  for (const [metal, hex] of Object.entries(METALS)) {
    const label = { moeda: 'Moeda', pilha: 'Pilha de moedas', monte: 'Monte de moedas', lingote: 'Lingote', bolsa: 'Bolsa de moedas' }[shape];
    art('moedas', `${shape}-${metal}`, `${label} de ${METAL_NAMES[metal]}`, { ...coinPal(hex), l: C.leather, L: [C.leather, 1], r: C.rope }, src);
  }
}

// ================= GEMAS E CRISTAIS (lapidacao x pedra; a pedra so recolore) =================
export const STONES = {
  rubi: '#d8283c', safira: '#2f5ad8', esmeralda: '#2aa860', ametista: '#9a48d0', topazio: '#f0b028',
  diamante: '#bfe8f4', onix: '#4a4058', quartzo: '#f08ab8', aguamarinha: '#48c8d0', perola: '#f4ecf0'
};
const gemPal = (hex) => ({ g: [hex, 'facet'], m: [hex, 'round'], y: [hex, 'cyl'], 0: [hex, 0], 1: [hex, 1], 2: [hex, 2], 3: [hex, 3], 4: [hex, 4], o: C.stone });
const GEM_CUTS = {
  brilhante: [`
..33333333..
.3444#44432.
334444443222
222222222111
.2222221111.
..22221111..
...221111...
....2111....
.....11.....
`, { sparkles: [[12, 3, '#ffffff']] }],
  oval: [`
...mmmm...
..mmmmmm..
.mm#mmmmm.
.m##mmmmm.
mmmmmmmmmm
mmmmmmmmmm
mmmmmmmmmm
.mmmmmmmm.
.mmmmmmmm.
..mmmmmm..
...mmmm...
`],
  esmeralda: [`
..gggggggg..
.gggggggggg.
gggggggggggg
ggg#gggggggg
gggggggggggg
gggggggggggg
gggggggggggg
.gggggggggg.
..gggggggg..
`],
  gota: [`
.....gg.....
....gggg....
....gggg....
...gggggg...
..gggggggg..
.gggg#ggggg.
.gggggggggg.
gggggggggggg
gggggggggggg
.gggggggggg.
..gggggggg..
....gggg....
`],
  coracao: [`
.gggg..gggg.
gggggggggggg
ggg#gggggggg
gggggggggggg
gggggggggggg
.gggggggggg.
..gggggggg..
...gggggg...
....gggg....
.....gg.....
`],
  marquise: [`
.....gg.....
....gggg....
...gggggg...
..gggggggg..
.gggg#ggggg.
gggggggggggg
.gggggggggg.
..gggggggg..
...gggggg...
....gggg....
.....gg.....
`],
  trilhao: [`
gggggggggggggg
.gggggggggggg.
.gg#ggggggggg.
..gggggggggg..
...gggggggg...
...gggggggg...
....gggggg....
.....gggg.....
......gg......
`],
  losango: [`
......gg......
.....gggg.....
....gggggg....
...gg#ggggg...
..gggggggggg..
.gggggggggggg.
..gggggggggg..
...gggggggg...
....gggggg....
.....gggg.....
......gg......
`],
  'cristal-ponta': [`
.....yy.....
....yyyy....
...yyyyyy...
...yyyyyy...
...yyyyyy...
...yyyyyy...
...yyyyyy...
...yyyyyy...
...yyyyyy...
..oooooooo..
.oooooooooo.
`, { sparkles: [[11, 2, '#ffffff']] }],
  'cristal-bruto': [`
......yy......
.....yyyy.....
..y..yyyy.....
.yyy.yyyy..yy.
.yyy.yyyy.yyyy
.yyy.yyyy.yyy.
.yyy.yyyy.yyy.
oyyyoyyyyoyyyo
oooooooooooooo
.oooooooooooo.
`],
  perola: [`
...mmmm...
..mmmmmm..
.m##mmmmm.
.m#mmmmmm.
mmmmmmmmmm
mmmmmmmmmm
.mmmmmmmm.
.mmmmmmmm.
..mmmmmm..
...mmmm...
`]
};
const CUT_NAMES = { brilhante: 'lapidada', oval: 'cabochão', esmeralda: 'em degraus', gota: 'em gota', coracao: 'em coração', marquise: 'navete', trilhao: 'trilhão', losango: 'em losango', 'cristal-ponta': 'cristal', 'cristal-bruto': 'drusa', perola: 'pérola' };
// pedra preferida de cada lapidacao (icone padrao) + as gemas com nome proprio
const DEFAULT_STONE = { brilhante: 'diamante', oval: 'onix', esmeralda: 'esmeralda', gota: 'topazio', coracao: 'rubi', marquise: 'safira', trilhao: 'aguamarinha', losango: 'diamante', 'cristal-ponta': 'ametista', 'cristal-bruto': 'quartzo', perola: 'perola' };
export const GEM_OF = { rubi: 'brilhante', safira: 'marquise', esmeralda: 'esmeralda', ametista: 'cristal-ponta', topazio: 'gota', diamante: 'losango', onix: 'oval', quartzo: 'cristal-bruto', aguamarinha: 'trilhao', perola: 'perola' };
for (const [cut, [src, extra]] of Object.entries(GEM_CUTS)) {
  const stones = new Set([DEFAULT_STONE[cut], ...Object.entries(GEM_OF).filter(([, c]) => c === cut).map(([st]) => st)]);
  if (cut === 'brilhante') ['rubi', 'safira', 'esmeralda', 'ametista', 'topazio'].forEach((st) => stones.add(st));
  for (const st of stones) art('gemas', `gema-${cut}-${st}`, `Gema ${CUT_NAMES[cut]} (${st})`, gemPal(STONES[st]), src, extra);
}

// ================= MINERIOS =================
const ROCK = { o: [C.stone, 'round'], O: [C.stone, 0] };
art('minerios', 'pedra', 'Pedra', ROCK, `
.....oooo....
...oooooooo..
..oooooooooo.
.oooooOoooooo
.ooooOooooooo
ooooooOoooooo
oooooooooOooo
.ooooooooooo.
..ooooooooo..
`);
art('minerios', 'minerio-ferro', 'Minério de ferro', { ...ROCK, x: ['#c8683a', 3], X: ['#c8683a', 1], s: ['#dfe6f0', 'raw'] }, `
.....oooo.....
...ooooxxoo...
..ooxXooooxo..
.oooooooxXooo.
.ooxooooooooo.
ooXooosoxooooo
oooooooXooooxo
.ooooxooooXoo.
..oooooooooo..
`);
art('minerios', 'minerio-ouro', 'Minério de ouro', { ...ROCK, a: [C.gold, 'round'] }, `
....oooooo....
..oooooaaooo..
.oooaaoaaaooo.
oooaaaooooooo.
oooooooooaaooo
ooaaoooooaaaoo
oooaaooooooooo
.ooooooaaoooo.
..oooooooooo..
`);
art('minerios', 'minerio-cristal', 'Minério de cristal', { ...ROCK, y: ['#48c8d0', 'cyl'] }, `
.......yy.....
...yy.yyyy....
..yyyy.yyyy...
..yyyy.yyy.yy.
...yyy.yyyyyyy
.oooyyoyyyoyy.
ooooooooooooo.
oooooooooOoooo
.ooOoooooooooo
..oooooooooo..
`);
art('minerios', 'pepita', 'Pepita de ouro', { a: [C.gold, 'round'], A: [C.gold, 1] }, `
...aaaa.....
..aaaaaaa...
.aa#aaaaaa..
.a##aaAaaaa.
aaaaaaaaaaaa
aaaaAaaaaaaa
.aaaaaaaaAa.
..aaaaaaaa..
....aaaa....
`);
art('minerios', 'carvao', 'Carvão', { x: [C.coal, 'round'], X: ['#5a6a9a', 3] }, `
...xxxx.......
..xxXxxx......
.xxxxxxxx.....
.xxxxxxxxxxx..
.xxxxxxxxxXxx.
..xxxXxxxxxxx.
xxxxxxxxxxxxx.
xxXxxxxx.xxx..
xxxxxxx.......
.xxxx.........
`);

// ================= ARMADURAS =================
art('armaduras', 'elmo', 'Elmo', { s: [C.steel, 'round'], S: [C.steel, 4], b: C.bronze }, `
....ssssss....
..ssssssssss..
.ssSssssssSss.
.ssssssssssss.
.ssssssssssss.
.bbbbbbbbbbbb.
.ss...ss...ss.
.ss...ss...ss.
.ss...ss...ss.
.sss..ss..sss.
..ss......ss..
`);
art('armaduras', 'elmo-fechado', 'Elmo fechado', { s: [C.steel, 'round'], K: [C.steel, 'line'], a: C.gold }, `
......aa......
....ssaass....
..ssssaassss..
.sssssaasssss.
.ssssssssssss.
.KKKKKKKKKKKK.
.ssssssKsssss.
.ssssssssssss.
.ssKsKsKsKsss.
.ssssssssssss.
..ssssssssss..
`);
art('armaduras', 'elmo-chifres', 'Elmo com chifres', { e: C.bone, E: [C.bone, 1], i: [C.iron, 'round'], b: C.bronze }, `
ee..........ee
.e..........e.
.ee..iiii..ee.
..eeiiiiiiee..
...iiiiiiii...
..iiiiiiiiii..
..bbbbbbbbbb..
..ii..ii..ii..
..ii..ii..ii..
..iii.ii.iii..
`);
art('armaduras', 'capuz', 'Capuz', { u: '#4f6a34', x: ['#4f6a34', 0], y: ['#ffd84a', 'raw'] }, `
.....uuuu.....
...uuuuuuuu...
..uuuuuuuuuu..
..uuuxxxxuuu..
.uuuxxxxxxuuu.
.uuxxyxxyxxuu.
.uuxxxxxxxxuu.
uuuxxxxxxxxuuu
uuuuxxxxxxuuuu
uuuuuuuuuuuuuu
.uuuuuuuuuuuu.
`);
art('armaduras', 'peitoral', 'Peitoral', { s: [C.steel, 'cyl'], b: C.bronze, K: [C.steel, 'line'] }, `
.sss......sss.
ssssss..ssssss
ssssssssssssss
ssssssKsssssss
.sssssKssssss.
.sssssKssssss.
..ssssKsssss..
..ssssssssss..
..bbbbbbbbbb..
...ssssssss...
`);
art('armaduras', 'cota-malha', 'Cota de malha', { i: C.iron, I: [C.iron, 4], j: [C.iron, 1] }, `
..iiii..iiii..
.iIjIjiiIjIji.
iIjIjIjIjIjIji
ijIjIjIjIjIjIi
iIj.IjIjIj.jIi
ij..jIjIjI..ji
....IjIjIj....
....jIjIjI....
....IjIjIj....
....iiiiii....
`);
art('armaduras', 'gibao', 'Gibão de couro', { l: C.leather, L: [C.leather, 0], r: C.rope, a: C.bronze }, `
.lll....lll.
llll.rr.llll
lllll..lllll
llllLrrLllll
.lllLrrLlll.
.llll..llll.
.lllLrrLlll.
.llll..llll.
.aaaaaaaaaa.
.llllllllll.
`);
art('armaduras', 'botas', 'Botas', { l: C.leather, L: [C.leather, 1], j: C.leatherDk, J: ['#3a2a24', 2] }, `
..jjjjjj......
..jjjjjj......
..jjllllll....
..jjlLLLLl....
..jjllllll....
..jjllllll....
..jjllllll....
..jjlllllll...
..jjllllllll..
..jjllllllllll
..jjllllllllll
..JJJJJJJJJJJJ
`);
art('armaduras', 'grevas', 'Grevas de placas', { s: [C.steel, 'edge'], K: [C.steel, 'line'], b: C.bronze }, `
..ssssss......
..sKKKKs......
..ssssss......
..ssssss......
..sKKKKs......
..ssssss......
..sssssss.....
..ssssssss....
..sssssssssss.
..ssssssssssss
..bbbbbbbbbbbb
`);
art('armaduras', 'luvas', 'Luvas de couro', { l: C.leather, L: [C.leather, 0], j: C.leatherDk }, `
...l.l.l......
..lLlLlLl.....
..llllllll.ll.
..lllllllllll.
..llllllllll..
..lllllllll...
...lllllll....
...jjjjjjj....
...jjjjjjj....
`);
art('armaduras', 'manopla', 'Manopla de placas', { s: [C.steel, 'edge'], K: [C.steel, 'line'], i: C.iron }, `
...s.s.s......
..sKsKsKs.....
..sKsKsKs.ss..
..KKKKKKKsss..
..ssssssssss..
..ssssssssss..
..KKKKKKKs....
...ssssss.....
..iiiiiiii....
..iiiiiiii....
`);
art('armaduras', 'escudo-redondo', 'Escudo redondo', { i: C.iron, w: C.wood, W: [C.wood, 1], s: [C.steel, 'round'] }, `
....iiiiii....
..iiwwwwwwii..
.iwwWwwwwWwwi.
.iwwWwwwwWwwi.
iwwwWwsswWwwwi
iwwwWssssWwwwi
iwwwWssssWwwwi
iwwwWwsswWwwwi
.iwwWwwwwWwwi.
.iwwWwwwwWwwi.
..iiwwwwwwii..
....iiiiii....
`);
art('armaduras', 'escudo-brasao', 'Escudo com brasão', { a: C.gold, c: '#c0343c', u: '#3e6ab0' }, `
aaaaaaaaaaaa
acccccuuuuua
acccccuuuuua
acccccuuuuua
acccccuuuuua
auuuuuccccca
auuuuuccccca
.auuuucccca.
..auuuccca..
...auucca...
....aaaa....
`);
art('armaduras', 'cinto', 'Cinto', { l: C.leather, L: [C.leather, 0], a: C.gold }, `
...llllllll...
.llllllllllll.
lll........lll
ll..........ll
ll...aaaaa..ll
lllllaLLLalll.
.llllaaaaall..
`);
art('armaduras', 'capa', 'Capa', { c: '#9c2a3a', C: ['#9c2a3a', 0], a: C.gold }, `
....aa..aa....
....cccccc....
...cccccccc...
...cCccccCc...
..ccCccccCcc..
..cCcccccCcc..
.ccCccccccCcc.
.cCcccccccCcc.
ccCcccccccCccc
cCccccccccCCcc
cccccccccccccc
`);

// ================= ANEIS E AMULETOS =================
art('joias', 'anel', 'Anel', { a: [C.gold, 'round'] }, `
....aaaaaa....
..aaaaaaaaaa..
.aaa......aaa.
aaa........aaa
aa..........aa
aaa........aaa
.aaaa....aaaa.
..aaaaaaaaaa..
....aaaaaa....
`);
art('joias', 'anel-gema', 'Anel com gema', { a: [C.gold, 'round'], A: C.gold, r: ['#2aa860', 'facet'] }, `
.....rrrr.....
....rrrrrr....
....ArrrrA....
..aaaAAAAaaa..
.aaa......aaa.
aa..........aa
aa..........aa
.aaa......aaa.
..aaaaaaaaaa..
....aaaaaa....
`);
art('joias', 'anel-sinete', 'Anel de sinete', { s: [C.silver, 'round'], S: C.silver, K: [C.silver, 'line'] }, `
....SSSSSS....
....SKSSKS....
....SSKKSS....
....SKSSKS....
..ssSSSSSSss..
.sss......sss.
ss..........ss
ss..........ss
.sss......sss.
..ssssssssss..
`);
art('joias', 'amuleto', 'Amuleto', { i: ['#d8b860', 2], a: [C.gold, 'round'], r: ['#d8283c', 'facet'] }, `
i.........i
.i.......i.
..i.....i..
...i...i...
....iai....
...aaaaa...
..aaaaaaa..
.aaarrraaa.
.aarrrrraa.
.aaarrraaa.
..aaaaaaa..
...aaaaa...
`);
art('joias', 'amuleto-gota', 'Pingente de gota', { i: ['#c6cfdc', 2], s: C.silver, g: ['#2f5ad8', 'facet'] }, `
i.........i
.i.......i.
..i.....i..
...i...i...
....isi....
.....s.....
....sgs....
...sgggs...
..sgggggs..
..sgggggs..
..sgggggs..
...sgggs...
....sss....
`);
art('joias', 'colar-contas', 'Colar de contas', { r: ['#c0343c', 'round'], a: ['#e8b03a', 'round'], i: ['#7a5a3a', 2], t: ['#2f9a9a', 'round'] }, `
rr........rr
.ii......ii.
..aa....aa..
...ii..ii...
....rrrr....
....rrrr....
.....ii.....
....tttt....
....tttt....
....tttt....
.....tt.....
`);
art('joias', 'talisma-dente', 'Talismã de presa', { i: ['#7a5a3a', 2], e: C.bone, E: [C.bone, 1] }, `
i.........i
.i.......i.
..i.....i..
...iiiii...
....eee....
....eeee...
....eeeE...
....eeeE...
.....eeE...
.....eE....
......E....
`);
art('joias', 'coroa', 'Coroa', { a: C.gold, A: [C.gold, 4], r: ['#d8283c', 'round'], u: ['#2f5ad8', 'round'] }, `
.r....r....r.
.a...aaa...a.
.aa..aaa..aa.
.aaa.aaa.aaa.
.aaaaaaaaaaa.
.aaaaaaaaaaa.
.aruaaraauraa
.aaaaaaaaaaa.
.AAAAAAAAAAA.
`);
art('joias', 'broche', 'Broche', { a: C.gold, A: [C.gold, 4], u: ['#9a48d0', 'facet'], i: C.iron }, `
....aaaaaa....
..aaauuuuaaa..
.aauuuuuuuuaa.
.aauuuuuuuuaa.
.aauuuuuuuuaa.
..aaauuuuaaa..
....aaaaaa....
.iiiiiiiiiiii.
`);

// ================= FERRAMENTAS =================
art('ferramentas', 'picareta', 'Picareta', { i: C.iron, w: C.wood }, `
...iiiii......
.iiiiiiiii....
ii.....iiii...
i.....wwiiii..
.....ww..iiii.
....ww....iii.
...ww......ii.
..ww........i.
.ww...........
ww............
`);
art('ferramentas', 'pa', 'Pá', { s: [C.steel, 'edge'], w: C.wood, n: C.woodDk }, `
..........nnnn
...........nn.
..........ww..
.........ww...
........ww....
.......ww.....
..sssssw......
.sssssss......
.ssssss.......
.sssss........
..sss.........
`);
art('ferramentas', 'martelo', 'Martelo', { i: C.iron, w: C.wood }, `
........ii....
.......iiii...
......iiiiii..
.......iiiiii.
......w.iiii..
.....ww..ii...
....ww........
...ww.........
..ww..........
.ww...........
`);
art('ferramentas', 'serra', 'Serra', { n: C.woodDk, s: [C.steel, 'edge'] }, `
.nnnn.........
nnnnnnsssssss.
nn..nnssssssss
nn..nnssssssss
nnnnnnsssssss.
.nnnn.s.s.s.s.
`);
art('ferramentas', 'alicate', 'Tenaz', { i: C.iron, c: '#c0343c' }, `
.ii.......ii..
.iii.....iii..
..iii...iii...
...iii.iii....
....iiiii.....
.....iii......
....ii.ii.....
...cc...cc....
..cc.....cc...
.cc.......cc..
.c.........c..
`);
art('ferramentas', 'lupa', 'Lupa', { b: C.bronze, g: [C.glass, 'round'], H: [C.cream, 'raw'], n: C.woodDk }, `
...bbbbb......
..bgggggb.....
.bgHgggggb....
.bgHgggggb....
.bgggggggb....
.bgggggggb....
..bgggggb.....
...bbbbbn.....
........nn....
.........nn...
..........nn..
...........nn.
`);
art('ferramentas', 'gazuas', 'Gazuas', { l: C.leather, L: [C.leather, 0], s: C.steel }, `
.........s.s.s
........s.s.s.
.......s.s.s..
......s.s.s...
.....s.s.s....
....s.s.s.....
.lllllllll....
.lLlllllLl....
.lllllllll....
.lLlllllLl....
.lllllllll....
`);
art('ferramentas', 'agulha-linha', 'Agulha e linha', { s: C.steel, r: ['#c0343c', 2], w: C.wood }, `
...........s.
..........s.s
.........s.s.
........s.s..
...rr..s.s...
..r..rs.s....
.r...s.r.....
.r..s....rr..
..rs.......r.
...........r.
..wwwwwww..r.
.wrrrrrrrw.r.
.wrrrrrrrwr..
..wwwwwww....
`);
art('ferramentas', 'balde', 'Balde', { i: C.iron, w: [C.wood, 'cyl'] }, `
...iiiiiii...
..i.......i..
.i.........i.
.wwwwwwwwwww.
.iiiiiiiiiii.
.wwwwwwwwwww.
..wwwwwwwww..
..wwwwwwwww..
..iiiiiiiii..
..wwwwwwwww..
...wwwwwww...
`);
art('ferramentas', 'caldeirao', 'Caldeirão', { x: [C.coal, 'round'], X: [C.coal, 3], g: ['#62b83a', 3], G: ['#a8e070', 4] }, `
....GgGg....
..xgggggGgx..
.XxxxxxxxxxX.
xxxxxxxxxxxxx
xxxxxxxxxxxxx
xxxxxxxxxxxxx
.xxxxxxxxxxx.
..xxxxxxxxx..
..x.......x..
`);
art('ferramentas', 'vara-pesca', 'Vara de pesca', { w: C.wood, n: C.woodDk, p: ['#e0e8f0', 2], c: ['#c0343c', 'round'], s: C.steel }, `
...........ww.
..........ww.p
.........ww..p
........ww...p
.......ww....p
......ww.....p
....nnww.....c
...nnnn......s
...nnn.......s
..ww........ss
.ww...........
ww............
`);
art('ferramentas', 'ampulheta', 'Ampulheta', { w: C.wood, g: [C.glass, 2], G: [C.glass, 4], y: ['#e8c060', 'round'] }, `
wwwwwwwwww
.w......w.
.wGgggggw.
.wGyyyyyw.
.w.Gyyy.w.
.w..Gy..w.
.w..gy..w.
.w.ggygg.w
.wGgyyygw.
.wyyyyyyw.
.w......w.
wwwwwwwwww
`);
art('ferramentas', 'bussola', 'Bússola', { b: [C.bronze, 'round'], p: [C.paper, 3], r: ['#d8283c', 3], s: [C.silver, 3], K: [C.woodDk, 'line'] }, `
.....bb.....
....bbbb....
..bbbbbbbb..
.bbppppppbb.
.bpppprpppb.
bbppprrppppb
bbpppKKpppbb
bppppssppppb
.bppsspppbb.
.bbppppppbb.
..bbbbbbbb..
....bbbb....
`);
art('ferramentas', 'luneta', 'Luneta', { b: C.bronze, l: C.leather, g: ['#9ad0ea', 'round'] }, `
.........bbbb.
........bggggb
........bggggb
.......bbggggb
......llbbbbb.
.....llll.....
....bbbb......
...lll........
..lll.........
.bbb..........
`);
art('ferramentas', 'enxada', 'Enxada', { s: [C.steel, 'edge'], w: C.wood }, `
.ssss.........
sssssw........
.sss.ww.......
.......ww.....
........ww....
.........ww...
..........ww..
...........ww.
............ww
`);

// ================= TOCHAS E LANTERNAS =================
const FIRE = { f: ['#f07c2e', 'raw'], F: ['#ffd04a', 'raw'], h: ['#d4482c', 'raw'], H: ['#fff6c8', 'raw'] };
art('luz', 'tocha', 'Tocha', { ...FIRE, l: '#8a6a4a', L: ['#8a6a4a', 0], w: C.wood }, `
.....F......
....FF.F....
....FHFF....
...fFHHFf...
...fFFFFf...
...hffffh...
....hffh....
....llll....
....lLLl....
....llll....
.....ww.....
.....ww.....
.....ww.....
.....ww.....
`, { sparkles: [[11, 2, '#ffd04a']] });
art('luz', 'lanterna', 'Lanterna', { ...FIRE, i: C.iron }, `
.....iii.....
....i...i....
.....iii.....
...iiiiiii...
..iiiiiiiii..
...iFFFFFi...
...iFFHFFi...
...iFfHfFi...
...iffhffi...
..iiiiiiiii..
...iiiiiii...
`);
art('luz', 'vela', 'Vela', { ...FIRE, v: [C.bone, 'cyl'], V: [C.bone, 4], d: C.bronze, x: ['#2a1c2e', 'raw'] }, `
.....F.....
....FHF....
....fFf....
.....x.....
....vvvV...
....vvvv...
...Vvvvv...
...vvvvv...
....vvvv...
....vvvv...
..ddddddd..
.ddddddddd.
`);
art('luz', 'castical', 'Castiçal', { ...FIRE, v: [C.bone, 'cyl'], a: C.gold, x: ['#2a1c2e', 'raw'] }, `
....F........
...FHF.......
...fFf.......
....x........
...vvv.......
...vvv.......
...vvv.......
..aaaaa......
...aaa.aa....
...aaa..a....
.aaaaaaaa....
aaaaaaaaaaa..
`);
art('luz', 'lampiao', 'Lamparina', { ...FIRE, a: [C.gold, 'round'], A: C.gold }, `
...F..........
..FHF.........
..fFf.........
...h..........
...AA.........
...AAaaaaa....
..AAaaaaaaaaA.
.AaaaaaaaaaaAA
..aaaaaaaaa..A
....AAAAA.....
...AAAAAAA....
`);
art('luz', 'pederneira', 'Pederneira', { o: ['#7a7488', 'round'], s: C.steel, F: ['#ffd04a', 'raw'], H: ['#fff6c8', 'raw'] }, `
.......F......
....H.....F...
.....F.H......
..ssssssss....
.ss......ss...
.s...oooo.s...
.ss.oooooos...
..sooooooo....
...ooooooo....
....ooooo.....
`);

// ================= CORDAS E CORRENTES =================
art('cordas', 'corda', 'Rolo de corda', { r: C.rope, R: [C.rope, 0] }, `
....rrrrrr....
..rrRrrRrrrr..
.rRrr....rRrr.
rrr..rrrr..rrr
rRr.rR..rr.rRr
rrr.r....r.rrr
rRr.rr..Rr.rRr
rrr..rrrr..rrr
.rRrr....rRrr.
..rrrRrrRrrr..
....rrrrrr..r.
............rr
`);
art('cordas', 'arpeu', 'Arpéu', { i: C.iron, r: C.rope }, `
.....i....i...
....ii....ii..
...ii..i...ii.
...i...i....i.
...ii..i...ii.
....iiiiiiii..
.......i......
.......i......
.......ii.....
........rr....
........r.....
.......rr.....
......rr......
....rrr.......
`);
art('cordas', 'corrente', 'Corrente', { i: C.iron }, `
..........iii.
.........i..i.
.........i..i.
.......iiiii..
......i.i.....
......i.i.....
....iiiii.....
...i..i.......
...i..i.......
.iiiii........
.i..i.........
.i..i.........
.iii..........
`);
art('cordas', 'algemas', 'Algemas', { i: C.iron, s: [C.steel, 'edge'] }, `
.ssss....ssss.
ss..ss..ss..ss
s....s..s....s
s....siis....s
ss..ss..ss..ss
.ssss....ssss.
`);
art('cordas', 'rede', 'Rede', { r: C.rope, R: [C.rope, 0] }, `
r...r...r...r
.r.r.r.r.r.r.
..R...R...R..
.r.r.r.r.r.r.
r...R...R...r
.r.r.r.r.r.r.
..R...R...R..
.r.r.r.r.r.r.
r...r...r...r
`);

// ================= MOCHILAS E BOLSAS =================
art('bolsas', 'mochila', 'Mochila', { l: C.leather, L: [C.leather, 0], j: C.leatherDk, c: ['#4f6a34', 'vcyl'], a: C.bronze }, `
..cccccccccc..
.cccccccccccc.
..cccccccccc..
...llllllll...
..llllllllll..
.lljjjjjjjjll.
.lljjjjjjjjll.
.llllllaallll.
.llllllllllll.
.llLLLLLLLLll.
.llLlllllllll.
.llLllllllLll.
..llllllllll..
`);
art('bolsas', 'bolsa', 'Bolsa de cinto', { l: C.leather, L: [C.leather, 0], j: C.leatherDk, a: C.gold }, `
..jjjjjjjjjj..
..jjjjjjjjjj..
.llllllllllll.
.ljjjjjjjjjjl.
.ljjjjjjjjjjl.
.llllllalllll.
.llllllllllll.
.llllllllllll.
.llllllllllll.
..llllllllll..
`);
art('bolsas', 'saco', 'Saco', { p: ['#c8a870', 'round'], P: ['#c8a870', 1], r: C.rope }, `
....p..p....
.....pp.....
....rrrr....
....pppp....
...pppppp...
..pppppppp..
.pppppPpppp.
.ppppppPppp.
pppppppppppp
pppppppPpppp
.pppppppppp.
..pppppppp..
`);
art('bolsas', 'bolsa-ombro', 'Bolsa a tiracolo', { l: '#8a6a3a', L: ['#8a6a3a', 0], j: C.leatherDk, a: C.bronze }, `
...jjjjjjjj...
..j........j..
.j..........j.
.j..........j.
.llllllllllll.
llllllllllllll
lLLLLLLLLLLLLl
lllllllaalllll
llllllllllllll
llllllllllllll
.llllllllllll.
`);
art('bolsas', 'aljava', 'Aljava', { l: C.leather, L: [C.leather, 0], w: C.wood, f: ['#e0e0e8', 3], F: ['#c0343c', 2], a: C.bronze }, `
.......f.F.f.
......ff.F.f.
.......wwww..
......lllll..
.....llllll..
....lllLlll..
...llllLll...
..lllLlll....
.lllLlll.....
.llllll......
..llll.......
`);
art('bolsas', 'bau', 'Baú', { w: C.wood, W: [C.wood, 1], i: C.iron, a: C.gold }, `
..wwwwwwwwww..
.wwwwwwwwwwww.
wwwwwwwwwwwwww
iiiiiiiiiiiiii
wwwwwwaawwwwww
wwwwwwaawwwwww
wWwwwwwwwwwWww
wwwwwwwwwwwwww
iiiiiiiiiiiiii
`);
art('bolsas', 'odre', 'Odre', { l: ['#a8703c', 'round'], r: C.rope, n: C.woodDk }, `
.....nn.....
.....nn.....
....rrrr....
.....ll.....
....llll....
...llllll...
..llllllll..
.llllllllll.
lllllllllll.
lllllllllll.
.lllllllll..
..lllllll...
`);

// ================= TROFEUS DE MONSTRO =================
art('trofeus', 'orelha', 'Orelha de monstro', { g: '#7aa84a', G: ['#7aa84a', 0], r: ['#a8303a', 2] }, `
gg..........
.ggg........
.gGggg......
..gGGggg....
..ggGGgggg..
...gggGGggg.
...ggggggggg
....gggggggg
....gggggrr.
.....gggrr..
`);
art('trofeus', 'presa', 'Presa', { e: C.bone, E: [C.bone, 1], r: ['#a8303a', 2] }, `
rrrr.......
eeee.......
.eeee......
.eeeeE.....
..eeeeE....
..eeeeE....
...eeeE....
...eeeE....
....eeE....
....eE.....
.....E.....
`);
art('trofeus', 'couro', 'Couro', { l: '#a8703c', L: ['#a8703c', 1] }, `
l..........l
ll........ll
.llllllllll.
.llllllllll.
..lLLlllLl..
..llllLlll..
..lllLllll..
..lLllllll..
.llllllllll.
ll........ll
l..........l
`);
art('trofeus', 'escama', 'Escama', { g: ['#2aa878', 'facet'], G: ['#2aa878', 4] }, `
gggggggggg
gggggggggg
ggggGggggg
ggggGggggg
ggggGggggg
.gggGgggg.
.gggGgggg.
..ggGggg..
...gGgg...
....gg....
`);
art('trofeus', 'chifre', 'Chifre', { e: '#d8c090', E: ['#d8c090', 1], n: '#6a4a3a' }, `
...........e
..........ee
.........eee
.......eeee.
.....eeEeE..
...eeeEeEe..
..eeeEeEe...
.nnnneEe....
.nnnnnn.....
..nnnn......
`);
art('trofeus', 'olho', 'Olho de monstro', { w: ['#f0e8e0', 'round'], r: ['#c83a3a', 2], y: ['#e8c040', 'round'], x: ['#2a1c2e', 'raw'], H: [C.cream, 'raw'] }, `
...wwwwww...
..wwwrwwww..
.wwwwwrwwrw.
.wrwwyyyywr.
wwwwyyxxyyww
wwwwyxxxxyww
wwwwyxxHxyww
wwwwyyxxyyww
.wwwwyyyywww
.wrwwwwwwww.
..wwwwwrww..
...wwwwww...
`);
art('trofeus', 'garra', 'Garras', { e: '#e8dcc0', E: ['#e8dcc0', 1], l: '#6a4a3a' }, `
...e...e...e
..ee..ee..ee
..eE..eE..eE
.eeE.eeE.eeE
.eE..eE..eE.
.ll..ll..ll.
.llllllllll.
.llllllllll.
..llllllll..
`);
art('trofeus', 'pena', 'Pena', { p: '#e8e0f0', P: ['#9a7ac8', 2], n: '#8a6a4a' }, `
...........pp
.........pppp
........ppppp
.......pPpppp
......pppPpp.
.....pPppPp..
....pppPpp...
...pPpPpp....
...ppPpp.....
..pppnp......
..ppn........
.n...........
n............
`);
art('trofeus', 'cranio', 'Crânio', { e: C.bone, E: [C.bone, 1], x: ['#2a1c2e', 'raw'] }, `
...eeeeee...
..eeeeeeee..
.eeeeeeeeee.
.eeeeeeeeee.
.eexxeexxee.
.exxxeexxxe.
.eexeeeexee.
..eeexxeee..
...eeeeee...
...eEeEeE...
...eeeeee...
`);
art('trofeus', 'osso', 'Osso', { e: C.bone }, `
.ee........ee.
eeee......eeee
.eeeeeeeeeeee.
.eeeeeeeeeeee.
eeee......eeee
.ee........ee.
`);
art('trofeus', 'asa', 'Asa de morcego', { m: '#5a4a6a', M: ['#5a4a6a', 0], n: '#8a6a7a' }, `
nnnnn.........
.nmmmnnnn.....
.nmmmmmmmnnn..
..nmmmmmmmmmn.
..nmmMmmmMmmn.
...nmMmmmMmn..
...nmMmmMmmn..
....nMmmMmn...
....nmmmmn....
.....nmn......
`);
art('trofeus', 'cauda', 'Cauda de lagarto', { g: '#5aa86a', G: ['#5aa86a', 0] }, `
...........gg
..........gg.
.........ggg.
....gggggg...
...gggggg....
..gGgGgG.....
..gggg.......
..gg.........
...gg........
....gg.......
`);
art('trofeus', 'coracao-monstro', 'Coração de monstro', { r: ['#a8243a', 'round'], R: ['#c84a5a', 3], v: ['#5a3a8a', 2] }, `
...vv..vv...
..rrrvvrrrr.
.rrRrrrrrrrr
rrRRrrrrrrrr
rrrrrrrrrrrr
rrrrrrvrrrrr
.rrrrrvrrrr.
..rrrrrvrr..
...rrrrrr...
....rrrr....
.....rr.....
`);
art('trofeus', 'tentaculo', 'Tentáculo', { t: '#9a5ab0', T: ['#e0b0e8', 3] }, `
........ttt.
.......ttttt
.......tt.tt
......ttt..t
......ttT...
.....tttT...
....tttTT...
...tttTT....
..tttTT.....
.tttTT......
tttTT.......
ttTT........
`);
art('trofeus', 'seda', 'Seda de aranha', { w: ['#eceaf4', 'round'], W: ['#bab4d0', 1], p: ['#e8e4f0', 3] }, `
.....p.....
.....p.....
....www....
...wwwww...
..wwWwwww..
..wwwwWww..
.wwWwwwwww.
.wwwwwWwww.
..wwwwwww..
..wwWwwww..
...wwwww...
....www....
`);

// ================= DIVERSOS =================
art('diversos', 'dado', 'Dado', { t: ['#f0ead8', 4], f: '#f0ead8', s: ['#f0ead8', 1], x: ['#c0343c', 'raw'], y: ['#2a1c2e', 'raw'] }, `
....tttttttt
...tttytttts
..ttttttttss
.ffffffffsss
.fyffffyfsys
.ffffffffsss
.ffffxfffsss
.ffffffffsys
.fyffffyfss.
.ffffffffs..
`);
art('diversos', 'carta-baralho', 'Carta de baralho', { p: '#f4ecd8', r: ['#c0343c', 2], K: ['#c0343c', 'line'] }, `
.pppppppp.
pprppppppp
pppppppppp
pppprrpppp
ppprrrrppp
ppprrrrppp
pppprrpppp
pppppppppp
pppppppprp
.pppppppp.
`);
art('diversos', 'alaude', 'Alaúde', { w: ['#c08048', 'round'], n: C.woodDk, x: ['#3a2a2a', 'raw'], p: ['#e8e0c0', 'raw'] }, `
..........nnn
.........nnn.
........nn...
.......nn....
....wwnww....
...wwwpwww...
..wwwwpwwww..
..wwwxpxwww..
..wwwwpwwww..
..wwwwpwww...
...wwwwww....
....www......
`);
art('diversos', 'flauta', 'Flauta', { w: '#c08048', x: ['#3a2a2a', 'raw'] }, `
...........ww
..........www
.........wxw.
........www..
.......wxw...
......www....
.....wxw.....
....www......
...wxw.......
..www........
.www.........
ww...........
`);
art('diversos', 'sino', 'Sino', { a: [C.gold, 'cyl'], w: C.wood, b: C.bronze }, `
.....ww.....
....wwww....
.....aa.....
....aaaa....
...aaaaaa...
...aaaaaa...
...aaaaaa...
..aaaaaaaa..
..aaaaaaaa..
.aaaaaaaaaa.
aaaaaaaaaaaa
.....bb.....
`);
art('diversos', 'espelho', 'Espelho de mão', { a: C.gold, g: ['#a8d8ec', 'round'], H: [C.cream, 'raw'] }, `
...aaaaaa...
..agggggga..
.agHHggggga.
.agHgggggga.
.agggggggga.
.agggggggga.
..agggggga..
...aaaaaa...
.....aa.....
.....aa.....
.....aa.....
....aaaa....
`);
art('diversos', 'idolo', 'Ídolo', { a: [C.gold, 'round'], A: [C.gold, 1], r: ['#2aa860', 'raw'], o: C.stone }, `
....aaaa....
...aaaaaa...
...araara...
...aaaaaa...
....aAAa....
..aaaaaaaa..
.aaaaaaaaaa.
.aa.aaaa.aa.
....aaaa....
...aa..aa...
.oooooooooo.
`);
art('diversos', 'calice', 'Cálice', { a: [C.gold, 'cyl'], r: ['#a8243a', 3], u: ['#2f5ad8', 'round'] }, `
.rrrrrrrrrr.
aaaaaaaaaaaa
aaaaaaaaaaaa
.aaaauuaaaa.
..aaaaaaaa..
...aaaaaa...
.....aa.....
.....aa.....
.....aa.....
...aaaaaa...
..aaaaaaaa..
`);
art('diversos', 'tinteiro', 'Pena e tinteiro', { p: '#f0ecf4', P: ['#c0b8d0', 1], x: ['#2a3a6a', 'round'], g: [C.glass, 'cyl'] }, `
..........pp
.........ppp
........pPpp
.......pPpp.
......pPpp..
.....pPpp...
....pPp.....
...gPgg.....
..gxxxxg....
..gxxxxg....
..gxxxxg....
...gggg.....
`);
art('diversos', 'mascara', 'Máscara', { m: ['#f0e8e0', 'round'], x: ['#2a1c2e', 'raw'], r: ['#c0343c', 2] }, `
.mmmmmmmmmm.
mmmmmmmmmmmm
mmmmmmmmmmmm
mmxxxmmxxxmm
mmmxmmmmxmmm
mmmmmmmmmmmm
.mmmmmmmmmm.
.mmmrrrrmmm.
..mmmrrmmm..
...mmmmmm...
....mmmm....
`);
art('diversos', 'bandagem', 'Bandagens', { w: ['#f0ead8', 'vcyl'], W: ['#f0ead8', 'line'], r: ['#c0343c', 2] }, `
..wwwwwwwwww..
.wwwwwwwwwwww.
wwwWwwwwwWwwww
wwwWwwrwwWwwww
wwwWwrrrwWwwww
wwwWwwrwwWwwww
.wwwwwwwwwwww.
..wwwwwwwwwwww
...........ww.
`);
art('diversos', 'flechas', 'Flechas', { w: C.wood, s: C.steel, f: ['#e0e0e8', 3], F: ['#c0343c', 2] }, `
.s...s...s..
sss.sss.sss.
.w...w...w..
.w...w...w..
.w...w...w..
.w...w...w..
.w...w...w..
.w...w...w..
fwF.fwF.fwF.
fwF.fwF.fwF.
f.F.f.F.f.F.
`);
art('diversos', 'virotes', 'Virotes', { w: C.woodDk, s: C.iron, f: ['#c0a070', 2] }, `
.......ss....
......sss....
.....ww...ss.
....ww...sss.
...ww...ww...
..ww...ww....
.fw...ww.....
.ff..ww......
....fw.......
....ff.......
`);
art('diversos', 'pedra-runica', 'Pedra rúnica', { o: ['#7a7488', 'round'], U: ['#5ae0e0', 'raw'], Y: ['#c8fff8', 'raw'] }, `
....oooo....
..oooooooo..
.ooooUoooooo
.oooUYUooooo
ooooUoUooooo
oooooUoooooo
ooooUYoUoooo
.oooooUooooo
.oooooooooo.
..oooooooo..
`, { sparkles: [[3, 3, '#c8fff8']] });
art('diversos', 'cachimbo', 'Cachimbo', { w: ['#8a5a34', 'round'], n: C.woodDk, x: ['#2a1c2e', 'raw'], f: ['#f07c2e', 'raw'], g: ['#c8c0d0', 'glow', 120] }, `
....g.........
.....g........
....g.........
.wwwwww.......
.wfxxfw.......
.wwwwww.......
.wwwwwwnnnnnnn
..wwwwnnnnnnn.
...www........
`);

export function itemCategories() { return CATS; }

// ================= ESCOLHA AUTOMATICA =================
// Texto normalizado (sem acento, minusculo). Regras em ordem: as mais especificas primeiro
// ("bolsa de moedas" vira moedas antes de cair em "bolsa"). Cada regra: [regex, id ou funcao].
const has = (t, re) => re.test(t);

function potionIcon(t) {
  const type = has(t, /\b(cura|vida|vital|sangue|regenera|saude)/) ? 'vida'
    : has(t, /\b(mana|arcan|magia|magic|eter)/) ? 'mana'
      : has(t, /\b(sanidade|mente|lucidez|calma|razao|sonho)/) ? 'sanidade'
        : has(t, /\b(veneno|toxin|peconha|letal|morte)/) ? 'veneno'
          : has(t, /\b(antidoto|antiveneno|purifica|remedio|cura de veneno)/) ? 'antidoto' : null;
  const size = has(t, /\b(pequen|menor|fraca|minima|frasquinho)/) ? 'p' : has(t, /\b(grande|maior|superior|forte|suprema|potente)/) ? 'g' : 'm';
  if (type) return `pocao-${type}-${size}`;
  return { p: 'frasco-ampola-rolha', m: 'frasco-redonda_m-lacre', g: 'frasco-cabaca-rolha' }[size];
}
function metalOf(t) {
  if (has(t, /\bplatin/)) return 'platina';
  if (has(t, /\b(prata|argent)/)) return 'prata';
  if (has(t, /\b(bronze|cobre)/)) return 'bronze';
  return 'ouro';
}
function coinIcon(t, item) {
  const metal = metalOf(t);
  if (has(t, /\b(bolsa|saco|sacola|algibeira)/)) return `bolsa-${metal}`;
  if (has(t, /\b(lingote|barra)/)) return `lingote-${metal}`;
  if (has(t, /\b(monte|tesouro|pilhagem|fortuna)/)) return `monte-${metal}`;
  if (has(t, /\b(pilha|rolo)/) || Number(item?.quantity) > 1) return `pilha-${metal}`;
  return `moeda-${metal}`;
}
function gemIcon(t) {
  for (const stone of Object.keys(GEM_OF)) if (t.includes(stone)) return `gema-${GEM_OF[stone]}-${stone}`;
  if (has(t, /\bagua.?marinha/)) return 'gema-trilhao-aguamarinha';
  if (has(t, /\b(cristal|quartzo|drusa)/)) return 'gema-cristal-bruto-quartzo';
  if (has(t, /\bperola/)) return 'gema-perola-perola';
  return 'gema-brilhante-diamante';
}

const RULES = [
  [/\b(pocao|pocoes|elixir|tonico|filtro|ampola|frasco|droga|xarope)/, potionIcon],
  [/\b(antidoto|antiveneno)/, () => 'pocao-antidoto-m'],
  [/\b(moeda|moedas|dracma|dracmas|ouro em po|pecas de)/, coinIcon],
  [/\b(lingote|barra de (ouro|prata|platina|bronze))/, coinIcon],
  [/\b(bolsa|saco) de (ouro|prata|platina|bronze)/, coinIcon],
  [/\b(rubi|safira|esmeralda|ametista|topazio|diamante|onix|quartzo|agua.?marinha|perola|gema|joia preciosa|cristal)/, gemIcon],
  // trofeus de monstro (antes das armaduras: "escama de dragao" nao e armadura)
  [/\b(escama|escamas)/, 'escama'], [/\b(orelha|orelhas)/, 'orelha'], [/\b(presa|presas|dente|dentes|canino)/, 'presa'],
  [/\b(chifre|chifres|corno|galhada)/, 'chifre'], [/\b(olho|olhos)\b/, 'olho'], [/\b(garra|garras|unha)/, 'garra'],
  [/\b(pena|penas|pluma)\b/, 'pena'], [/\b(cranio|caveira)/, 'cranio'], [/\b(osso|ossos|femur|costela)/, 'osso'],
  [/\b(asa|asas)\b/, 'asa'], [/\b(cauda|rabo)/, 'cauda'], [/\bcoracao\b/, 'coracao-monstro'], [/\btentacul/, 'tentaculo'],
  [/\b(seda|teia)/, 'seda'], [/\b(couro|pele|pelego|pelagem)\b/, 'couro'],
  // comida
  [/\b(pao|paes|broa)/, 'pao'], [/\bqueijo/, 'queijo'], [/\b(maca|macas|fruta|pera)\b/, 'maca'],
  [/\b(carne|coxa|frango|assado|presunto|charque)/, 'coxa'], [/\b(peixe|salmao|truta|bacalhau)/, 'peixe'],
  [/\b(cenoura|nabo|batata|legume)/, 'cenoura'], [/\b(torta|bolo)/, 'torta'], [/\b(vinho|garrafa|hidromel)/, 'vinho'],
  [/\b(cerveja|caneca|grogue|bebida|aguardente)/, 'caneca'], [/\buva/, 'uvas'], [/\bmel\b/, 'mel'],
  [/\b(biscoito|bolacha|racao|racoes|provisao|provisoes|mantimento)/, 'biscoito'], [/\bovo/, 'ovos'], [/\b(linguica|salsicha|salame)/, 'linguica'],
  // ingredientes e ervas
  [/\bcogumelo.?palido/, 'cogumelo-palido'], [/\b(cogumelo.?vermelho|amanita)/, 'cogumelo-vermelho'], [/\b(cogumelo|fungo)/, 'cogumelos'],
  [/\bmandragora/, 'mandragora'], [/\btrevo/, 'trevo'], [/\b(bolota|noz|semente|sementes|castanha)/, 'bolota'],
  [/\b(sal|po|cinzas|enxofre)\b/, 'sal'], [/\b(baga|bagas|amora|frutinha)/, 'bagas'], [/\b(raiz|raizes|tuberculo|gengibre)/, 'raiz'],
  [/\b(flor|flores|petala|rosa|lirio)/, 'flor'], [/\b(folha|folhas)/, 'folha'], [/\b(erva|ervas|planta|musgo|alga|losna|salvia)/, 'erva'],
  // pergaminhos e livros
  [/\bmapa/, 'mapa'], [/\b(carta|cartas|envelope|bilhete|mensagem|convite)\b/, 'carta'],
  [/\b(pergaminho|rolo).*(magia|runa|feitico|magic)/, 'pergaminho-runa'], [/\b(pagina|folha de diario|anotacao|nota)/, 'pagina-rasgada'],
  [/\b(contrato|decreto|edital)/, 'pergaminho-aberto'], [/\bpergaminho/, 'pergaminho'],
  [/\b(grimorio|livro de feiticos|tomo arcano)/, 'grimorio'], [/\b(necronomic|tomo sombrio|livro proibido|livro maldito)/, 'tomo-caveira'],
  [/\b(diario|caderno)/, 'diario'], [/\b(livros|biblioteca)\b/, 'pilha-livros'], [/\b(livro|tomo|manual|biblia|codice)/, 'livro'],
  // chaves
  [/\bchave.*(enferruj|velha|antiga|torta)/, 'chave-enferrujada'], [/\bchave.*(ouro|dourad|ornad|real)/, 'chave-ornada'],
  [/\bchave.*(masmorra|cela|prisao|ferro)/, 'chave-masmorra'], [/\b(molho de chaves|chaves)\b/, 'molho-chaves'],
  [/\bchave/, 'chave'], [/\b(cadeado|fechadura)/, 'cadeado'],
  // joias
  [/\b(anel|aneis)\b.*\b(sinete|selo|brasao)/, 'anel-sinete'], [/\b(anel|aneis)\b.*\b(gema|pedra|joia)/, 'anel-gema'], [/\b(anel|aneis|alianca)\b/, 'anel'],
  [/\b(colar|rosario|contas)\b/, 'colar-contas'], [/\b(talisma|totem)/, 'talisma-dente'], [/\b(pingente|lagrima)/, 'amuleto-gota'],
  [/\b(amuleto|medalhao|relicario)/, 'amuleto'], [/\b(coroa|tiara|diadema)/, 'coroa'], [/\b(broche|alfinete)/, 'broche'],
  // armaduras e vestes
  [/\b(elmo|capacete)\b.*\b(chifre|viking)/, 'elmo-chifres'], [/\b(elmo fechado|grande elmo|elmo de placas)/, 'elmo-fechado'],
  [/\b(elmo|capacete|chapeu de ferro)/, 'elmo'], [/\b(capuz|mascara de couro)/, 'capuz'], [/\b(cota de malha|malha|loriga)/, 'cota-malha'],
  [/\b(gibao|couro batido|armadura de couro|colete)/, 'gibao'], [/\b(peitoral|couraca|armadura|placas|brunea)/, 'peitoral'],
  [/\b(greva|grevas|sabatons?)/, 'grevas'], [/\b(bota|botas|sapato|sapatos|calcado)/, 'botas'],
  [/\b(manopla de placas|manoplas de placas)/, 'manopla'], [/\b(luva|luvas)/, 'luvas'],
  [/\b(broquel|escudo)\b.*\b(madeira|redondo)/, 'escudo-redondo'], [/\b(escudo|broquel|pavise)/, 'escudo-brasao'],
  [/\b(cinto|cinturao|faixa)/, 'cinto'], [/\b(capa|manto|cobertor|veste|tunica|roupa|robe)/, 'capa'],
  // ferramentas
  [/\bpicareta/, 'picareta'], [/\b(pa|enxada)\b/, 'pa'], [/\b(martelo de ferreiro|ferramentas de ferreiro)/, 'martelo'], [/\bserra\b/, 'serra'],
  [/\b(tenaz|alicate|pinca)/, 'alicate'], [/\b(lupa|lente)/, 'lupa'], [/\b(gazua|gazuas|ferramentas de ladrao|kit de ladrao)/, 'gazuas'],
  [/\b(agulha|linha|costura|kit de costura)/, 'agulha-linha'], [/\bbalde/, 'balde'], [/\b(caldeirao|panela|marmita|kit de cozinha)/, 'caldeirao'],
  [/\b(vara de pesca|anzol|pesca)/, 'vara-pesca'], [/\b(ampulheta|relogio)/, 'ampulheta'], [/\b(bussola|astrolabio)/, 'bussola'],
  [/\b(luneta|telescopio)/, 'luneta'], [/\b(foice de jardim|ancinho|rastelo)/, 'enxada'],
  // luz
  [/\b(tocha|tochas|archote)/, 'tocha'], [/\b(lanterna|lampiao)/, 'lanterna'], [/\b(castical|candelabro)/, 'castical'],
  [/\b(vela|velas)\b/, 'vela'], [/\b(lamparina|oleo|candeia)/, 'lampiao'], [/\b(pederneira|isqueiro|fosforo|acendalha)/, 'pederneira'],
  // cordas
  [/\b(arpeu|gancho)/, 'arpeu'], [/\b(corrente|correntes|grilhao)/, 'corrente'], [/\b(algema|algemas|grilhoes)/, 'algemas'],
  [/\b(rede|redes)\b/, 'rede'], [/\b(corda|cordas|barbante|cipo)/, 'corda'],
  // bolsas e recipientes
  [/\b(mochila|bornal)/, 'mochila'], [/\b(aljava|carcaz)/, 'aljava'], [/\b(bau|caixa|cofre|arca)/, 'bau'],
  [/\b(odre|cantil|agua)\b/, 'odre'], [/\b(tiracolo|alforje|sacola)/, 'bolsa-ombro'], [/\b(saco|saca)\b/, 'saco'], [/\b(bolsa|algibeira)/, 'bolsa'],
  // diversos
  [/\b(dado|dados)\b/, 'dado'], [/\b(baralho|carta de jogo|tarot)/, 'carta-baralho'], [/\b(alaude|bandolim|violao|harpa|instrumento)/, 'alaude'],
  [/\b(flauta|pifano|ocarina)/, 'flauta'], [/\b(sino|sineta|campainha)/, 'sino'], [/\bespelho/, 'espelho'],
  [/\b(idolo|estatueta|estatua|reliquia)/, 'idolo'], [/\b(calice|taca|graal)/, 'calice'], [/\b(tinta|tinteiro|pena de escrever)/, 'tinteiro'],
  [/\bmascara/, 'mascara'], [/\b(bandagem|bandagens|atadura|curativo|kit medico|kit de cura)/, 'bandagem'],
  [/\b(flecha|flechas|seta|setas)/, 'flechas'], [/\b(virote|virotes)/, 'virotes'], [/\b(runa|runas|pedra runica)/, 'pedra-runica'],
  [/\b(cachimbo|fumo|tabaco)/, 'cachimbo'],
  // minerios por ultimo ("pedra" aparece em muita coisa)
  [/\bminerio.*ferro|\bferro bruto/, 'minerio-ferro'], [/\bminerio.*ouro/, 'minerio-ouro'], [/\bminerio.*cristal/, 'minerio-cristal'],
  [/\bpepita/, 'pepita'], [/\b(carvao|hulha)/, 'carvao'], [/\bminerio/, 'minerio-ferro'], [/\b(pedra|rocha|seixo)/, 'pedra']
];

// Categoria do app -> icone quando nenhuma palavra do texto decide
const CATEGORY_ICONS = [
  [/^(pocao|pocoes|alquimia)/, 'pocao-vida-m'], [/^(comida|alimento|racao|provis)/, 'pao'],
  [/^(ingrediente|erva|componente)/, 'erva'], [/^(livro|grimorio)/, 'livro'], [/^(tesouro|riqueza|carteira|dinheiro)/, 'monte-ouro'],
  [/^(armadura|vestimenta|equipamento)/, 'peitoral'], [/^(arma)/, 'arma-espada-longa-ferro'], [/^(achado|saque|loot)/, 'saco'],
  [/^(joia|acessorio)/, 'anel'], [/^(ferramenta|kit)/, 'martelo'], [/^(pergaminho|documento)/, 'pergaminho'],
  [/^(chave)/, 'chave'], [/^(trofeu|parte de monstro)/, 'presa'], [/^(gema|mineral)/, 'gema-brilhante-diamante'], [/^(luz|iluminacao)/, 'tocha']
];
export const FALLBACK_ICON = 'saco';

function match(text, item) {
  const t = ` ${normalize(text).replace(/[^a-z0-9+]+/g, ' ')} `;
  for (const [re, out] of RULES) if (re.test(t)) return typeof out === 'function' ? out(t, item) : out;
  return null;
}

// Icone de um item do inventario. Ordem: icone escolhido a mao (se existir) -> arma pelo nome ->
// palavras do nome -> palavras da descricao -> categoria -> saco generico.
export function iconFor(item = {}) {
  const { name = '', category = '', description = '', icon } = item || {};
  if (icon && (ITEM_ICONS[icon] || String(icon).startsWith('arma-'))) return icon;
  const cat = normalize(category).trim();
  const weapon = weaponIconFor(name);
  // "escudo" e arma e armadura: na categoria Armaduras vira o escudo de armadura
  if (weapon && !(cat.startsWith('armadura') && weapon.includes('escudo'))) return weapon;
  const byName = match(name, item);
  if (byName) return byName;
  if (cat.startsWith('arma')) return weaponIconFor(description) || 'arma-espada-longa-ferro';
  const byDesc = match(description, item);
  if (byDesc) return byDesc;
  for (const [re, id] of CATEGORY_ICONS) if (re.test(cat)) return id;
  return FALLBACK_ICON;
}
