// Folha de conferencia dos golpes de arma (sem dependencias). Renderiza quadros-
// chave de cada golpe num contexto falso, grava PPM e monta PNG com o ImageMagick.
// Uso:
//   node src/lib/fx/weapons/preview.mjs <pasta> tudo                 (folha geral)
//   node src/lib/fx/weapons/preview.mjs <pasta> familia <familia>    (uma familia)
//   node src/lib/fx/weapons/preview.mjs <pasta> golpe <arma> <golpe> [resultado] [elemento] [quadros]
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createEffect } from '../effect.js';
import { renderEffect } from '../render.js';
import { drawGrass, drawActor } from '../stage.js';
import { createFakeContext } from '../fakeCanvas.js';
import { WEAPON_FAMILIES, WEAPONS, FAMILY_OF } from './catalog.js';
import { movesOf, weaponsOf } from './select.js';

const out = process.argv[2] || '.';
const mode = process.argv[3] || 'tudo';
mkdirSync(out, { recursive: true });

const W = 100;
const H = 52;
const CELL = 16;

function stage(ranged) {
  return ranged ? { A: { x: 16, y: 32 }, B: { x: 82, y: 32 } } : { A: { x: 30, y: 32 }, B: { x: 64, y: 32 } };
}

function keyTimes4(eff) {
  const { windup, impactAt, hitstop } = eff.T;
  return [windup * 0.85, windup + (impactAt - windup) * 0.55, impactAt + 4, impactAt + hitstop + 150];
}

function keyTimes(eff) {
  const { windup, impactAt, hitstop } = eff.T;
  return [windup * 0.85, windup + (impactAt - windup) * 0.45, windup + (impactAt - windup) * 0.85, impactAt + 4, impactAt + hitstop + 90, impactAt + hitstop + 240];
}

function evenTimes(eff, n) {
  return Array.from({ length: n }, (_, i) => (eff.T.total * i) / (n - 1) * 0.92);
}

function strip(opts, ranged, timesFn) {
  const { A, B } = stage(ranged);
  const eff = createEffect({ unit: 1, cell: CELL, from: A, to: B, seed: `prev-${opts.weapon}-${opts.move}`, ...opts });
  const ts = timesFn(eff);
  const ctx = createFakeContext(W * ts.length + (ts.length - 1), H, { record: false });
  ts.forEach((t, i) => {
    const ox = i * (W + 1);
    const sub = {
      get fillStyle() { return ctx.fillStyle; },
      set fillStyle(v) { ctx.fillStyle = v; },
      get globalAlpha() { return ctx.globalAlpha; },
      set globalAlpha(v) { ctx.globalAlpha = v; },
      fillRect(x, y, w, h) {
        const x0 = Math.max(0, x);
        const x1 = Math.min(W, x + w);
        if (x1 > x0) ctx.fillRect(ox + x0, y, x1 - x0, h);
      },
      clearRect() {}
    };
    drawGrass(sub, W, H, 'preview');
    const nop = { fillRect() {}, clearRect() {}, fillStyle: '', globalAlpha: 1 };
    const fr = renderEffect(nop, eff, t);
    drawActor(sub, 'hero', A.x + fr.attacker.x, A.y + fr.attacker.y, {});
    drawActor(sub, 'dummy', B.x + fr.target.x, B.y + fr.target.y, { flash: fr.target.flash, down: eff.down && t > eff.T.impactAt + 200 });
    renderEffect(sub, eff, t);
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

function labeled(ctx, name, label, scale = 2) {
  const ppm = join(out, `${name}.ppm`);
  writePPM(ppm, ctx);
  const png = join(out, `${name}.png`);
  execFileSync('convert', [ppm, '-scale', `${scale * 100}%`, '(', '-size', `230x${H * scale}`, 'xc:#13101a', '-fill', '#ece4d2', '-pointsize', '15', '-annotate', `+8+${Math.round(H * scale / 2) + 5}`, label, ')', '+swap', '+append', png]);
  return png;
}

function familySheet(fam, scale = 2, times = keyTimes) {
  const pngs = [];
  const ranged = Boolean(fam.ranged);
  const tool = fam.tool;
  for (const m of fam.moves) {
    pngs.push(labeled(strip({ weapon: tool, weaponFamily: fam.id, move: m.id, result: 'hit' }, ranged, times), `${fam.id}-${m.id}`, m.name, scale));
  }
  for (const w of weaponsOf(fam.id)) {
    for (const m of w.extra || []) pngs.push(labeled(strip({ weapon: w.id, move: m.id, result: 'hit' }, ranged, times), `${fam.id}-${w.id}-${m.id}`, `${w.name}: ${m.name}`, scale));
  }
  const head = join(out, `${fam.id}-titulo.png`);
  const nf = times === keyTimes4 ? 4 : 6;
  const width = 230 + (W * nf + nf - 1) * scale;
  execFileSync('convert', ['-size', `${width}x40`, 'xc:#2a1f30', '-fill', '#ffd27a', '-pointsize', '24', '-annotate', '+10+29', `${fam.label} (${fam.moves.length} golpes base)`, head]);
  const sheet = join(out, `folha-${fam.id}.png`);
  execFileSync('convert', [head, ...pngs, '+repage', '-background', '#08070b', '-splice', '0x2', '-append', '+repage', sheet]);
  return sheet;
}

if (mode === 'golpe') {
  const [weapon, move, result = 'hit', element = '', frames = '12'] = process.argv.slice(4);
  const w = WEAPONS.find((x) => x.id === weapon);
  const fam = FAMILY_OF[w ? w.fam : weapon];
  const ctx = strip({ weapon: w ? w.id : undefined, weaponFamily: fam.id, move, result, element: element || null }, Boolean(fam.ranged), (eff) => evenTimes(eff, Number(frames)));
  const ppm = join(out, `golpe-${weapon}-${move}-${result}.ppm`);
  writePPM(ppm, ctx);
  const png = ppm.replace('.ppm', '.png');
  execFileSync('convert', [ppm, '-scale', '300%', png]);
  console.log(png);
} else if (mode === 'familia') {
  console.log(familySheet(FAMILY_OF[process.argv[4]]));
} else {
  // Folha geral: 4 quadros por golpe (antecipacao, acao, contato, impacto) e as
  // familias distribuidas em 3 colunas de altura parecida.
  const sheets = WEAPON_FAMILIES.map((f) => ({ f, png: familySheet(f, 2, keyTimes4), h: f.moves.length + WEAPONS.filter((w) => w.fam === f.id).reduce((n, w) => n + (w.extra || []).length, 0) }));
  const cols = [[], [], []];
  const hs = [0, 0, 0];
  for (const s of [...sheets].sort((a, b) => b.h - a.h)) { const i = hs.indexOf(Math.min(...hs)); cols[i].push(s.png); hs[i] += s.h; }
  const colPngs = cols.map((c, i) => { const p = join(out, `coluna-${i}.png`); execFileSync('convert', [...c, '+repage', '-background', '#08070b', '-splice', '0x8', '-append', '+repage', p]); return p; });
  const all = join(out, 'animacoes-armas.png');
  execFileSync('convert', [...colPngs, '+repage', '-background', '#08070b', '-splice', '8x0', '+append', '+repage', '-depth', '8', all]);
  console.log(all);
}
void movesOf;
