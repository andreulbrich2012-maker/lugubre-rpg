// Folha de conferencia dos personagens, sem dependencias: escreve PPM e o ffmpeg vira PNG.
// Uso: node src/lib/avatar/preview.mjs <pasta> [modo]
//   modo 'races' (padrao): uma linha por raca com as 4 direcoes (idle) + o passo de frente
//   modo 'walk': ciclo de andar nas 4 direcoes para 4 personagens
//   modo 'slot:<id>': amostras de todas as pecas de um encaixe (vestidas num modelo)
// Depois: ffmpeg -y -i x.ppm -vf scale=iw*4:ih*4:flags=neighbor x.png
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderPixels } from './compose.js';
import { RACES, defaultAppearance, applyRace, randomAppearance } from './appearance.js';
import { ITEMS, HAIRS } from './catalog.js';
import { W, H } from './skeleton.js';

const out = process.argv[2] || '.';
const mode = process.argv[3] || 'races';
const BG = [54, 66, 44]; // verde de grama apagado: confere a leitura sobre o mapa

function canvas(w, h) {
  const px = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) px.set(((i % w) >> 3) % 2 === ((i / w / 8) | 0) % 2 ? BG : [62, 74, 50], i * 3);
  return { w, h, px };
}
function blit(c, rgba, ox, oy) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, a = rgba[i + 3] / 255;
    if (!a) continue;
    const o = ((oy + y) * c.w + ox + x) * 3;
    for (let k = 0; k < 3; k++) c.px[o + k] = Math.round(c.px[o + k] * (1 - a) + rgba[i + k] * a);
  }
}
function save(c, name) {
  writeFileSync(join(out, name), Buffer.concat([Buffer.from(`P6\n${c.w} ${c.h}\n255\n`), Buffer.from(c.px)]));
}
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

if (mode === 'races') {
  const c = canvas(10 * (W + 2), RACES.length * (H + 2));
  RACES.forEach((r, row) => {
    const app = applyRace(defaultAppearance(r.id), r.id);
    ['down', 'left', 'right', 'up'].forEach((d, k) => blit(c, renderPixels(app, d, 'idle', 0), k * (W + 2), row * (H + 2)));
    for (let f = 0; f < 4; f++) blit(c, renderPixels(app, 'down', 'walk', f), (4 + f) * (W + 2), row * (H + 2));
    blit(c, renderPixels(app, 'left', 'walk', 0), 8 * (W + 2), row * (H + 2));
    blit(c, renderPixels(app, 'left', 'walk', 2), 9 * (W + 2), row * (H + 2));
  });
  save(c, 'avatars-races.ppm');
} else if (mode === 'walk' || mode === 'random') {
  const apps = Array.from({ length: mode === 'random' ? 8 : 4 }, () => randomAppearance(rand));
  const c = canvas(16 * (W + 1), apps.length * (H + 2));
  apps.forEach((app, row) => ['down', 'left', 'right', 'up'].forEach((d, k) => {
    for (let f = 0; f < 4; f++) blit(c, renderPixels(app, d, 'walk', f), (k * 4 + f) * (W + 1), row * (H + 2));
  }));
  save(c, `avatars-${mode}.ppm`);
} else if (mode.startsWith('slot:')) {
  const slot = mode.slice(5);
  const list = slot === 'hair' ? HAIRS : ITEMS[slot];
  const per = 12;
  const c = canvas(per * 3 * (W + 1), Math.ceil(list.length / per) * (H + 2));
  list.forEach((it, n) => {
    const app = defaultAppearance('humano');
    if (slot === 'hair') app.hair = { style: it.id, color: ['castanho', 'loiro', 'ruivo', 'preto', 'grisalho', 'roxo'][n % 6] };
    else app.layers[slot] = { id: it.id };
    if (slot === 'torso' || slot === 'legs') app.hair.style = 'curto';
    const ox = (n % per) * 3 * (W + 1), oy = Math.floor(n / per) * (H + 2);
    ['down', 'left', 'up'].forEach((d, k) => blit(c, renderPixels(app, d, 'idle', 0), ox + k * (W + 1) - (k ? 0 : 0), oy));
  });
  save(c, `avatars-slot-${slot}.ppm`);
}
