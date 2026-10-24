// Folha de conferencia dos sprites, sem dependencias: escreve PPM e o ffmpeg vira PNG.
// Uso: node src/lib/tiles/preview.mjs <pasta-de-saida>
//   -> tiles-sheet.ppm (todos os blocos, quadros e variantes; objetos sobre grama e sobre piso)
//   -> tiles-map.ppm   (mapa de exemplo, para ver o conjunto junto)
// Depois: ffmpeg -y -i tiles-sheet.ppm -vf scale=iw*4:ih*4:flags=neighbor tiles-sheet.png
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TILES, SIZE, getTile, tileImages } from './catalog.js';
import { rasterize, cellHash } from './render.js';

const out = process.argv[2] || '.';
const BG = [18, 16, 22];

function canvas(w, h) {
  const px = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) px.set(BG, i * 3);
  return { w, h, px };
}

function blit(c, rgba, ox, oy, alpha = 1) {
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    if (!rgba[i + 3]) continue;
    const X = ox + x, Y = oy + y;
    if (X < 0 || Y < 0 || X >= c.w || Y >= c.h) continue;
    const o = (Y * c.w + X) * 3;
    for (let k = 0; k < 3; k++) c.px[o + k] = Math.round(c.px[o + k] * (1 - alpha) + rgba[i + k] * alpha);
  }
}

function drawCell(c, groundRows, groundPal, obj, ox, oy, frame = 0) {
  blit(c, rasterize(groundRows, groundPal), ox, oy);
  if (!obj) return;
  const img = tileImages(obj)[frame];
  blit(c, rasterize(img, obj.palette, true), ox + 1, oy + 1, 0.45);
  blit(c, rasterize(img, obj.palette), ox, oy);
}

function save(c, name) {
  const head = Buffer.from(`P6\n${c.w} ${c.h}\n255\n`);
  writeFileSync(join(out, name), Buffer.concat([head, Buffer.from(c.px)]));
}

// ---- folha: cada bloco num espaco de 4 imagens ----
const grass = getTile('.');
const floor = getTile('_');
const SLOT = SIZE * 4 + 6;
const PER_ROW = 6;
const sheet = canvas(PER_ROW * SLOT + 2, Math.ceil(TILES.length / PER_ROW) * (SIZE + 4) + 2);
TILES.forEach((t, n) => {
  const ox = 2 + (n % PER_ROW) * SLOT;
  const oy = 2 + Math.floor(n / PER_ROW) * (SIZE + 4);
  const imgs = tileImages(t);
  if (t.layer === 'ground') {
    imgs.forEach((img, k) => blit(sheet, rasterize(img, t.palette), ox + k * (SIZE + 1), oy));
  } else if (imgs.length > 1) {
    imgs.forEach((_, k) => drawCell(sheet, grass.pixels, grass.palette, t, ox + k * (SIZE + 1), oy, k));
  } else {
    drawCell(sheet, grass.pixels, grass.palette, t, ox, oy);
    drawCell(sheet, floor.pixels, floor.palette, t, ox + SIZE + 1, oy);
  }
});
save(sheet, 'tiles-sheet.ppm');

// ---- mapa de exemplo ----
const ground = [
  '....,,,,..........W~~...',
  '..,,,,,,,.........W~~...',
  '..,,############..W~~...',
  '..,,#__________#..-W-;;;',
  '..,,#__________#..W~~;..',
  '..,,#____>_____#..W~~;..',
  '..,,#__________#..WW~;..',
  '..;;#######D####...~~;..',
  '..;;;;;;;;;;;;;;;;;;;;..',
  '.....:::::.....;........',
  '...::::::::....;..%%%%..',
  '..BBBBBBBBB....;..%%%%..',
  '..B=======B....;.LLL....',
  '..B=======J....;.LLL....',
  '..BBBBDBBBB....;........',
  '***********....;;;;;;;;.'
];
const objects = [
  'TA  T    A     T  w     ',
  ' T  f     b   A         ',
  '     i          A  b    ',
  '     a  K  S            ',
  '     x  r          k    ',
  '     t     C            ',
  '     ^  O  u    f       ',
  '                    m   ',
  '  b         l          T',
  '      F  o         T    ',
  ' d                    o ',
  '                        ',
  '   E nh e               ',
  '   q  u                 ',
  '         p      d       ',
  ' A  A         A    T    '
];
const S = 16;
const map = canvas(ground[0].length * S, ground.length * S);
ground.forEach((row, y) => [...row].forEach((ch, x) => {
  const g = getTile(ch);
  const imgs = tileImages(g);
  const rows = g.frames ? imgs[0] : imgs[cellHash(x, y) % imgs.length];
  drawCell(map, rows, g.palette, getTile(objects[y][x]) || null, x * S, y * S);
}));
save(map, 'tiles-map.ppm');
console.log('ok', TILES.length, 'blocos');
