// Palco de demonstracao (galeria do Admin e folha de preview): grama e dois
// bonecos de pixel. Nao entra no mapa de verdade; la quem desenha os tokens e o Board.
import { rect, glyph, disc, setAlpha } from './draw.js';
import { makeRng } from './rng.js';

const GRASS = ['#3c7a34', '#4a8c3c', '#5aa046', '#76b852'];

export function drawGrass(ctx, w, h, seed = 'grama') {
  rect(ctx, 0, 0, w, h, GRASS[1]);
  const rng = makeRng(seed, 'grass');
  // Manchas grandes de tom (quebram o chapado) + tufos de 3 pixels.
  for (let i = 0; i < (w * h) / 90; i++) {
    const x = rng.int(0, w);
    const y = rng.int(0, h);
    rect(ctx, x, y, rng.int(2, 5), 1, rng.chance(0.5) ? GRASS[0] : GRASS[2]);
  }
  for (let i = 0; i < (w * h) / 60; i++) {
    const x = rng.int(0, w);
    const y = rng.int(0, h);
    rect(ctx, x, y, 1, 1, GRASS[3]);
    rect(ctx, x - 1, y + 1, 1, 1, GRASS[2]);
    rect(ctx, x + 1, y + 1, 1, 1, GRASS[2]);
    rect(ctx, x, y + 2, 1, 1, GRASS[0]);
  }
  for (let i = 0; i < (w * h) / 900; i++) {
    const x = rng.int(0, w);
    const y = rng.int(0, h);
    rect(ctx, x, y, 1, 1, rng.chance(0.5) ? '#f2e6a0' : '#e88a9a');
  }
}

const HERO = [
  '....kkkk....',
  '...khhhhk...',
  '..khhhhhhk..',
  '..kssssssk..',
  '..kssskssk..',
  '..kssssssk..',
  '...kkkkkk...',
  '..kbbbbbbk..',
  '.kbBbbbbbbk.',
  '.ksbbbbbbsk.',
  '.kkbyyyybkk.',
  '..kbbbbbbk..',
  '..kbk..kbk..',
  '..kbk..kbk..',
  '..kkk..kkk..'
];

const DUMMY = [
  '....kkkk....',
  '...kttTtk...',
  '...ktxtxk...',
  '...kttttk...',
  '....kkkk....',
  '..kkkwwkkk..',
  '.kttTtttttk.',
  'kttrttttrttk',
  '.kttttttttk.',
  '..kttttttk..',
  '....kwwk....',
  '....kwwk....',
  '....kwWk....',
  '...kkwwkk...',
  '..kwwwwwwk..'
];

const COLORS = {
  hero: { k: '#1a1622', h: '#6e3a1e', s: '#f0c8a0', b: '#3a62b8', B: '#6a92e0', y: '#e0a63a' },
  dummy: { k: '#2a1c12', t: '#d8b060', T: '#f2d890', x: '#5a3a1a', r: '#8a4a22', w: '#8a5a2e', W: '#b07a44' }
};

// (x, y) = centro da celula do token, em pixels de efeito.
export function drawActor(ctx, kind, x, y, { flash = 0, flipX = false, down = false } = {}) {
  const rows = kind === 'hero' ? HERO : DUMMY;
  const ox = Math.round(x - 6);
  const oy = Math.round(y - 9);
  setAlpha(ctx, 0.35);
  disc(ctx, x, y + 6, 4, '#10180c');
  setAlpha(ctx, 1);
  const pal = flash > 0.5
    ? Object.fromEntries(Object.keys(COLORS[kind]).map((k) => [k, '#ffffff']))
    : COLORS[kind];
  if (down) setAlpha(ctx, 0.75);
  glyph(ctx, ox, oy, rows, pal, flipX);
  setAlpha(ctx, 1);
}
