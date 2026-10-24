// Folha de conferencia dos barcos (sem dependencias: PNG com zlib do node).
// Uso: node src/lib/sea/preview.mjs <saida.png> [escala]
// Linhas: cada tipo nas 8 direcoes navegando; os 4 quadros da esteira; parados no porto;
// e as pecas do convés (mastro, leme, placa do porto) e o costado de um convés.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { boatFrames, deckHelm, deckMast, deckSkirt, portSign, SPRITE_TYPES } from './boatSprite.js';
import { DIRS } from './route.js';
import { deckMap } from '../../../../backend/src/utils/boats.js';
import { renderRegion } from '../tiles/compose.js';

const out = process.argv[2] || 'barcos.png';
const SCALE = Number(process.argv[3] || 3);
const SEA = [44, 108, 176]; const SEA2 = [58, 146, 204];

function png(w, h, rgb) {
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const items = []; // {x, y, w, h, data}
let cursorY = 6;
function row(list, gap = 10) {
  let x = 6; let hMax = 0;
  for (const it of list) { items.push({ ...it, x, y: cursorY }); x += it.w + gap; hMax = Math.max(hMax, it.h); }
  cursorY += hMax + 12;
  return x;
}
for (const type of Object.keys(SPRITE_TYPES)) row(DIRS.map((d) => { const f = boatFrames(type, d, true); return { w: f.w, h: f.h, data: f.frames[0] }; }));
const anim = boatFrames('gale', 'e', true);
row(anim.frames.map((data) => ({ w: anim.w, h: anim.h, data })));
row(Object.keys(SPRITE_TYPES).map((t) => { const f = boatFrames(t, 'w', false); return { w: f.w, h: f.h, data: f.frames[0] }; }));
const props = [deckMast('square', 64), deckMast('lateen', 46), deckHelm(), portSign()];
const deck = deckMap('veleiro');
const deckImg = renderRegion(deck, 0, 0, deck.cols, deck.rows, {});
const skirt = deckSkirt(deck);
const deckW = deck.cols * 16; const deckH = deck.rows * 16;
const merged = new Uint8ClampedArray(deckW * deckH * 4);
for (let i = 0; i < merged.length; i += 4) {
  const a = skirt.data[i + 3] / 255;
  for (let c = 0; c < 3; c++) merged[i + c] = deckImg.data[i + c] * (1 - a) + skirt.data[i + c] * a;
  merged[i + 3] = 255;
}
const mastP = deckMast('lateen', 46); const helmP = deckHelm();
const place = (img, cx, cy) => {
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const X = cx - img.ax + x; const Y = cy - img.ay + y; const i = (y * img.w + x) * 4;
    if (!img.data[i + 3] || X < 0 || Y < 0 || X >= deckW || Y >= deckH) continue;
    const o = (Y * deckW + X) * 4; merged[o] = img.data[i]; merged[o + 1] = img.data[i + 1]; merged[o + 2] = img.data[i + 2];
  }
};
for (const m of deck.vessel.masts) place(mastP, m.x * 16 + 8, m.y * 16 + 12);
place(helmP, deck.vessel.helm.x * 16 + 8, deck.vessel.helm.y * 16 + 14);
row([...props.map((p) => ({ w: p.w, h: p.h, data: p.data })), { w: deckW, h: deckH, data: merged }]);

const W = Math.max(...items.map((it) => it.x + it.w)) + 6;
const H = cursorY;
const rgb = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = ((x >> 3) + (y >> 3)) % 2 ? SEA : SEA2; rgb[(y * W + x) * 3] = c[0]; rgb[(y * W + x) * 3 + 1] = c[1]; rgb[(y * W + x) * 3 + 2] = c[2]; }
for (const it of items) for (let y = 0; y < it.h; y++) for (let x = 0; x < it.w; x++) {
  const i = (y * it.w + x) * 4; const a = it.data[i + 3] / 255;
  if (!a) continue;
  const o = ((it.y + y) * W + it.x + x) * 3;
  for (let c = 0; c < 3; c++) rgb[o + c] = Math.round(rgb[o + c] * (1 - a) + it.data[i + c] * a);
}
const big = Buffer.alloc(W * SCALE * H * SCALE * 3);
for (let y = 0; y < H * SCALE; y++) for (let x = 0; x < W * SCALE; x++) {
  const s = (Math.floor(y / SCALE) * W + Math.floor(x / SCALE)) * 3; const d = (y * W * SCALE + x) * 3;
  big[d] = rgb[s]; big[d + 1] = rgb[s + 1]; big[d + 2] = rgb[s + 2];
}
writeFileSync(out, png(W * SCALE, H * SCALE, big));
console.log(out, W * SCALE, H * SCALE);
