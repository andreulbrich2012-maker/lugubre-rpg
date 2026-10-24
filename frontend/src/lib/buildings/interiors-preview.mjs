// Folha de conferencia dos interiores (sem dependencias): escreve PPM; o ffmpeg vira PNG.
// Uso: node src/lib/buildings/interiors-preview.mjs <pasta-de-saida> [casa]
//   -> interiores.ppm: cada tipo x tamanho x 2 sementes (ou, com "casa", 24 casas variadas)
// Depois: ffmpeg -loglevel error -y -i interiores.ppm -vf scale=iw*2:ih*2:flags=neighbor interiores.png
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderScene } from '../tiles/compose.js';
import { generateInterior, INTERIOR_TYPES } from './interiors.js';

const out = process.argv[2] || '.';
const mode = process.argv[3] || 'todos';
const BG = [18, 16, 22];
const GAP = 12;
const MAX_W = 2400;

const jobs = [];
if (mode === 'casa') {
  const sizes = INTERIOR_TYPES.find((t) => t.id === 'casa').sizes.map((s) => s.id);
  sizes.forEach((size) => { for (let seed = 0; seed < 5; seed++) jobs.push({ type: 'casa', size, seed }); });
} else if (INTERIOR_TYPES.some((t) => t.id === mode)) {
  for (const s of INTERIOR_TYPES.find((t) => t.id === mode).sizes) for (let seed = 0; seed < 4; seed++) jobs.push({ type: mode, size: s.id, seed });
} else {
  for (const t of INTERIOR_TYPES) for (const s of t.sizes) for (const seed of [1, 2]) jobs.push({ type: t.id, size: s.id, seed });
}

// layout em prateleiras (linhas de altura variavel)
const imgs = jobs.map((j) => {
  const res = generateInterior(j);
  return renderScene(res.map);
});
const placed = [];
let x = GAP;
let y = GAP;
let lineH = 0;
let width = 0;
for (const img of imgs) {
  if (x + img.w + GAP > MAX_W && x > GAP) { x = GAP; y += lineH + GAP; lineH = 0; }
  placed.push([img, x, y]);
  x += img.w + GAP;
  lineH = Math.max(lineH, img.h);
  width = Math.max(width, x);
}
const W = width;
const H = y + lineH + GAP;
const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) px.set(BG, i * 3);
for (const [img, ox, oy] of placed) {
  for (let yy = 0; yy < img.h; yy++) for (let xx = 0; xx < img.w; xx++) {
    const i = (yy * img.w + xx) * 4;
    const o = ((oy + yy) * W + ox + xx) * 3;
    px[o] = img.data[i]; px[o + 1] = img.data[i + 1]; px[o + 2] = img.data[i + 2];
  }
}
const name = mode === 'todos' ? 'interiores.ppm' : `interiores-${mode}.ppm`;
writeFileSync(join(out, name), Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), Buffer.from(px)]));
console.log('ok', jobs.length, 'interiores ->', join(out, name));
