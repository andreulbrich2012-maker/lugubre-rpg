// Folha de conferencia dos sprites, sem dependencias: escreve PPM e o ffmpeg vira PNG.
// Uso: node src/lib/tiles/preview.mjs <pasta-de-saida> [mapa.json]
//   -> tiles-sheet.ppm (todos os blocos, quadros e variantes; objetos sobre grama e sobre piso)
//   -> tiles-map.ppm   (mapa de exemplo ou o mapa.json: paredes com autotile, itens e telhados;
//      no exemplo a primeira construcao fica fechada e a segunda aberta)
// Depois: ffmpeg -y -i tiles-sheet.ppm -vf scale=iw*4:ih*4:flags=neighbor tiles-sheet.png
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TILES, SIZE, getTile, tileImages } from './catalog.js';
import { rasterize, cellHash } from './render.js';
import { renderScene, detectBuildings } from './compose.js';
import { roofPixels } from './roofs.js';
import { repairMap } from './format.js';

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
  if (groundRows) blit(c, rasterize(groundRows, groundPal), ox, oy);
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

const S = 16;
// ---- mapa ----
const sample = {
  cols: 26,
  rows: 16,
  layers: {
    ground: [
      '..........................',
      '..BBBBBBBBB.......~~~~....',
      '..B=======B......~~~~~~...',
      '..B=======B......~~~~~....',
      '..B=======J.......~~~.....',
      '..BBBBDBBBB...............',
      '......;;;;;;;;;;;;;;;;....',
      '..............;...........',
      '...#########..;...........',
      '...#_______#..;..,,,,,....',
      '...#_______####..,,,,,....',
      '...#__________D;;;;,,.....',
      '...#_______####...........',
      '...#_______#..............',
      '...####D####..............',
      '..........................'
    ],
    objects: [
      'T   A          T      T   ',
      '            b             ',
      '   E nh  q             A  ',
      '   u  h e                 ',
      '   C                b     ',
      '                          ',
      ' f                       T',
      '                          ',
      '                    T     ',
      '    a   S  i              ',
      '    x               m     ',
      '    7 C  2                ',
      '    $                     ',
      '    8   r   F             ',
      '                     A    ',
      'A     T         T      T  '
    ]
  },
  items: [
    { id: 'i1', x: 3, y: 4, name: 'Poção de cura', quantity: 1, weight: 0.5, category: 'Poções' },
    { id: 'i2', x: 6, y: 11, name: 'Chave enferrujada', quantity: 1, weight: 0.1, category: 'Achados' },
    { id: 'i3', x: 4, y: 12, name: 'Bolsa de moedas', quantity: 1, weight: 0.2, category: 'Tesouro', dracmas: 35 },
    { id: 'i4', x: 20, y: 10, name: 'Cogumelo-pálido', quantity: 3, weight: 0.1, category: 'Ingredientes' }
  ],
  buildings: [
    { id: 'b1', x: 2, y: 1, w: 9, h: 5, name: 'Casa do lenhador', roof: 'telha' },
    { id: 'b2', x: 3, y: 8, w: 9, h: 7, name: 'Capela velha', roof: 'ardosia' }
  ]
};
const input = process.argv[3] ? JSON.parse(readFileSync(process.argv[3], 'utf8')) : sample;
const { map } = repairMap(input);
if (!map.buildings.length) map.buildings = detectBuildings(map);
const closed = map.buildings.filter((_, i) => i % 2 === 0); // alterna: um fechado, um aberto
const toPpm = (img) => {
  const c = canvas(img.w, img.h);
  for (let i = 0; i < img.w * img.h; i++) c.px.set([img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]], i * 3);
  return c;
};
// rascunho cru (sem auto-embelezamento) x final; e o final a noite
save(toPpm(renderScene(map, { beautify: false, decor: 'nenhuma', light: 'dia' })), 'tiles-map-cru.ppm');
const img = toPpm(renderScene(map, { roofs: closed, roofPixels, light: 'dia' }));
save(toPpm(renderScene(map, { roofs: closed, roofPixels, light: 'noite' })), 'tiles-map-noite.ppm');
// brilho dos itens: losango ambar com contorno de chumbo
for (const it of map.items) {
  if (closed.some((b) => it.x >= b.x && it.y >= b.y && it.x < b.x + b.w && it.y < b.y + b.h)) continue;
  const cx = it.x * S + 8, cy = it.y * S + 8;
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
    const d = Math.abs(dx) + Math.abs(dy);
    if (d > 4) continue;
    const o = ((cy + dy) * img.w + cx + dx) * 3;
    img.px.set(d === 4 ? [26, 24, 34] : d >= 3 ? [230, 160, 60] : [255, 226, 150], o);
  }
}
save(img, 'tiles-map.ppm');
console.log('ok', TILES.length, 'blocos;', map.items.length, 'itens;', map.buildings.length, 'construcoes');
