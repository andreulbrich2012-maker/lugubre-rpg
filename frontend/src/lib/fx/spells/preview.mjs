// Folha de conferencia do grimorio: quadros-chave de cada magia (ou de um filtro)
// num contexto falso, gravados em PPM e montados em PNG com o ImageMagick.
// Uso: node src/lib/fx/spells/preview.mjs <pasta> [ids|escola|"amostra"|"tudo"] [resultado]
//   ex.: node src/lib/fx/spells/preview.mjs /tmp/x fogo
//        node src/lib/fx/spells/preview.mjs /tmp/x bola-de-fogo,meteoro crit
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { SPELLS, SCHOOL_BY_ID, tierLabel } from './catalog.js';
import { createSpellEffect, renderSpell } from './engine.js';
import { drawGrass, drawActor } from '../stage.js';
import { createFakeContext } from '../fakeCanvas.js';

const out = process.argv[2] || '.';
const pick = process.argv[3] || 'amostra';
const result = process.argv[4] || 'hit';
const sheetName = process.argv[5] || `grimorio-${pick.replace(/[^a-z0-9-]/g, '_').slice(0, 40)}-${result}.png`;
mkdirSync(out, { recursive: true });

const W = 104;
const H = 56;
const A = { x: 22, y: 34 };
const B = { x: 80, y: 34 };

function chosen() {
  if (pick === 'tudo') return SPELLS;
  if (pick === 'folha') {
    // uma por nivel em cada escola (a primeira de cada nivel)
    return Object.keys(SCHOOL_BY_ID).flatMap((sc) => [1, 2, 3, 4].map((t) => SPELLS.find((s) => s.school === sc && s.tier === t)).filter(Boolean));
  }
  if (pick === 'amostra') {
    // dois por escola: a primeira intermediaria e a primeira lendaria
    return Object.keys(SCHOOL_BY_ID).flatMap((sc) => {
      const l = SPELLS.filter((s) => s.school === sc);
      return [l.find((s) => s.tier === 2), l.find((s) => s.tier === 4)].filter(Boolean);
    });
  }
  if (SCHOOL_BY_ID[pick]) return SPELLS.filter((s) => s.school === pick);
  const ids = pick.split(',');
  return SPELLS.filter((s) => ids.includes(s.id));
}

const COMPACT = process.env.QUADROS === '3';
const SCALE = process.env.ESCALA || '300%';

function times(e) {
  const { windup, impactAt, hitstop, impact } = e.T;
  const after = impactAt + hitstop;
  if (COMPACT) return [(windup + impactAt) / 2, after + impact * 0.2, after + impact * 0.5];
  return [windup * 0.6, (windup + impactAt) / 2, impactAt + 20, after + impact * 0.18, after + impact * 0.38, after + impact * 0.6, after + impact * 0.85];
}

function strip(spell) {
  const e = createSpellEffect({ spell: spell.id, unit: 1, cell: 16, from: A, to: B, result, seed: `folha-${spell.id}` });
  const ts = times(e);
  const ctx = createFakeContext(W * ts.length + ts.length - 1, H, { record: false });
  ts.forEach((t, i) => {
    const ox = i * (W + 1);
    let sx = 0;
    let sy = 0;
    const sub = {
      get fillStyle() { return ctx.fillStyle; },
      set fillStyle(v) { ctx.fillStyle = v; },
      get globalAlpha() { return ctx.globalAlpha; },
      set globalAlpha(v) { ctx.globalAlpha = v; },
      fillRect(x, y, w, h) {
        const x0 = Math.max(0, x + sx);
        const x1 = Math.min(W, x + sx + w);
        if (x1 > x0) ctx.fillRect(ox + x0, y + sy, x1 - x0, h);
      },
      clearRect() {}
    };
    const nop = { fillRect() {}, clearRect() {}, fillStyle: '', globalAlpha: 1 };
    const fr = renderSpell(nop, e, t);
    sx = Math.round(fr.shake.x);
    sy = Math.round(fr.shake.y);
    drawGrass(sub, W, H, 'grimorio');
    sub.globalAlpha = fr.attacker.alpha ?? 1;
    drawActor(sub, 'hero', A.x + fr.attacker.x, A.y + fr.attacker.y, { flash: fr.attacker.flash });
    sub.globalAlpha = fr.target.alpha ?? 1;
    drawActor(sub, 'dummy', B.x + fr.target.x, B.y + fr.target.y, { flash: fr.target.flash, down: e.down && t > e.T.impactAt + 300 });
    sub.globalAlpha = 1;
    renderSpell(sub, e, t);
    sx = 0; sy = 0;
    if (i < ts.length - 1) { ctx.fillStyle = '#08070b'; ctx.globalAlpha = 1; ctx.fillRect(ox + W, 0, 1, H); }
  });
  return ctx;
}

function writePPM(path, ctx) {
  const { width, height, pixels } = ctx;
  const head = Buffer.from(`P6\n${width} ${height}\n255\n`);
  const body = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    body[i * 3] = pixels[i * 4];
    body[i * 3 + 1] = pixels[i * 4 + 1];
    body[i * 3 + 2] = pixels[i * 4 + 2];
  }
  writeFileSync(path, Buffer.concat([head, body]));
}

const list = chosen();
const pngs = [];
for (const s of list) {
  const ctx = strip(s);
  const ppm = join(out, `${s.id}-${result}.ppm`);
  writePPM(ppm, ctx);
  try {
    const png = join(out, `${s.id}-${result}.png`);
    const label = `${s.name}\n${SCHOOL_BY_ID[s.school].label} · ${tierLabel(s.tier)}`;
    const lh = Math.round((H * parseInt(SCALE, 10)) / 100);
    execFileSync('convert', [ppm, '-scale', SCALE, '(', '-size', `${COMPACT ? 190 : 250}x${lh}`, 'xc:#13101a', '-fill', '#ece4d2', '-pointsize', COMPACT ? '14' : '17', '-annotate', `+8+${Math.round(lh / 2) - 6}`, label, ')', '+swap', '+append', png]);
    pngs.push(png);
  } catch {
    // sem ImageMagick: fica o PPM
  }
}
if (pngs.length) {
  const sheet = join(out, sheetName);
  if (COMPACT) execFileSync('montage', [...pngs, '-tile', '3x', '-geometry', '+2+2', '-background', '#08070b', sheet]);
  else execFileSync('convert', [...pngs, '-background', '#08070b', '-splice', '0x3', '-append', sheet]);
  console.log(`folha: ${sheet}`);
}
console.log(`${list.length} magias em ${out}`);
