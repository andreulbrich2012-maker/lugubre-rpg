// Folha de conferencia dos icones, sem dependencias: escreve PPM e o ffmpeg vira PNG.
// Uso: node src/lib/icons/preview.mjs <pasta-de-saida> [itens|armas|todos] [ampliacao]
//   -> icones-itens.ppm (uma linha por categoria) e icones-armas.ppm (arma x material)
// Depois: ffmpeg -y -i icones-itens.ppm -vf scale=iw*4:ih*4:flags=neighbor icones-itens.png
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ITEM_ICONS, itemCategories } from './items.js';
import { WEAPON_ICONS, WEAPON_LIST, WEAPON_MATERIALS, weaponIconId } from './weapons.js';
import { paintIcon, ICON_SIZE as S } from './render.js';

const out = process.argv[2] || '.';
const which = process.argv[3] || 'todos';
// fundo escuro quente (como a ficha) com uma celula clara alternada para checar o contorno
const BG = [30, 24, 32];
const CELL = [[52, 42, 50], [70, 58, 62]];
const GAP = 3;
const STEP = S + GAP * 2;

function canvas(w, h) {
  const px = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) px.set(BG, i * 3);
  return { w, h, px };
}
function rect(c, x0, y0, w, h, rgb) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) c.px.set(rgb, (y * c.w + x) * 3);
}
function blit(c, rgba, ox, oy) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    const a = rgba[i + 3] / 255;
    if (!a) continue;
    const o = ((oy + y) * c.w + ox + x) * 3;
    for (let k = 0; k < 3; k++) c.px[o + k] = Math.round(c.px[o + k] * (1 - a) + rgba[i + k] * a);
  }
}
function save(c, name) {
  writeFileSync(join(out, name), Buffer.concat([Buffer.from(`P6\n${c.w} ${c.h}\n255\n`), Buffer.from(c.px)]));
}
function grid(rows, name) {
  const cols = Math.max(...rows.map((r) => r.length));
  const c = canvas(cols * STEP + GAP * 2, rows.length * STEP + GAP * 2);
  rows.forEach((ids, ry) => ids.forEach((id, rx) => {
    const x = GAP + rx * STEP, y = GAP + ry * STEP;
    rect(c, x, y, STEP - 2, STEP - 2, CELL[(rx + ry) % 2]);
    if (id) blit(c, paintIcon(ITEM_ICONS[id] || id), x + GAP - 1, y + GAP - 1);
  }));
  save(c, name);
}

if (which !== 'armas') {
  const PER = 16;
  const rows = [];
  for (const ids of Object.values(itemCategories())) for (let i = 0; i < ids.length; i += PER) rows.push(ids.slice(i, i + PER));
  grid(rows, 'icones-itens.ppm');
  console.log(`itens: ${Object.keys(ITEM_ICONS).length}`);
}
if (which !== 'itens' && WEAPON_LIST.length) {
  // duas armas por linha: 3 materiais cada, lado a lado
  const rows = [];
  for (let i = 0; i < WEAPON_LIST.length; i += 2) {
    const row = [];
    for (const w of WEAPON_LIST.slice(i, i + 2)) { for (const m of WEAPON_MATERIALS) row.push(weaponSpec(w.id, m)); row.push(null); }
    rows.push(row);
  }
  grid(rows, 'icones-armas.ppm');
  console.log(`armas: ${WEAPON_LIST.length}`);
}
function weaponSpec(w, m) { return WEAPON_ICONS[weaponIconId(w, m)] || null; }
