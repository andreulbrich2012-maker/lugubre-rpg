// Folha de conferencia das animacoes, sem dependencias: renderiza quadros-chave
// de cada familia x resultado num contexto falso e grava PPM; se o ImageMagick
// existir, monta um PNG ampliado (nearest) com os nomes de cada linha.
// Uso: node src/lib/fx/preview.mjs <pasta-de-saida> [familias|resultados|elementos|tudo]
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { FAMILIES, getFamily } from './families.js';
import { ELEMENT_KEYS, ELEMENTS } from './elements.js';
import { createEffect } from './effect.js';
import { renderEffect } from './render.js';
import { drawGrass, drawActor } from './stage.js';
import { createFakeContext } from './fakeCanvas.js';

const out = process.argv[2] || '.';
const mode = process.argv[3] || 'tudo';
mkdirSync(out, { recursive: true });

const W = 84;
const H = 40;
const A = { x: 16, y: 22 };
const B = { x: 66, y: 22 };
const UNIT = 1; // aqui 1 px de efeito = 1 px do mapa; o PNG amplia depois
const CELL = 16;

// Instantes: antecipacao, meio da acao, contato (hit-stop), e o impacto se desfazendo.
function times(eff) {
  const { windup, action, impactAt, hitstop } = eff.T;
  return [windup * 0.7, windup + action * 0.45, windup + action * 0.85, impactAt + 10, impactAt + hitstop + 50, impactAt + hitstop + 140, impactAt + hitstop + 260, impactAt + hitstop + 420];
}

function frameStrip(opts) {
  const eff = createEffect({ unit: UNIT, cell: CELL, from: A, to: B, seed: `preview-${opts.family}`, ...opts });
  const ts = times(eff);
  const ctx = createFakeContext(W * ts.length + (ts.length - 1), H, { record: false });
  ts.forEach((t, i) => {
    const ox = i * (W + 1);
    // Cada quadro num "sub-canvas": desloca as chamadas.
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
    const fr = renderEffectNoDraw(eff, t);
    drawActor(sub, 'hero', A.x + fr.attacker.x, A.y + fr.attacker.y, {});
    drawActor(sub, opts.monsterTarget ? 'hero' : 'dummy', B.x + fr.target.x, B.y + fr.target.y, { flash: fr.target.flash, down: eff.down && t > eff.T.impactAt + 200 });
    renderEffect(sub, eff, t);
    if (i < ts.length - 1) { ctx.fillStyle = '#08070b'; ctx.globalAlpha = 1; ctx.fillRect(ox + W, 0, 1, H); }
  });
  return ctx;
}

// Corpos sao calculados sem desenhar (para posicionar os bonecos antes do efeito).
function renderEffectNoDraw(eff, t) {
  const nop = { fillRect() {}, clearRect() {}, fillStyle: '', globalAlpha: 1 };
  return renderEffect(nop, eff, t);
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

const rows = [];
if (mode === 'familias' || mode === 'tudo') {
  for (const f of FAMILIES) {
    const element = f.group === 'magia' ? (f.id === 'bencao' ? 'Éter' : f.id === 'terreno' ? 'Gaia' : f.id === 'maldicao' ? 'Érebo' : f.id === 'raio' ? 'Ponto' : f.id === 'area' ? 'Tártaro' : f.id === 'controle' ? 'Ananque' : f.id === 'movimento' ? 'Nix' : 'Caos') : null;
    rows.push({ name: `fam-${f.id}`, label: `${f.label}${element ? ` · ${element}` : ''}`, opts: { family: f.id, element, result: 'hit' } });
  }
}
if (mode === 'resultados' || mode === 'tudo') {
  for (const r of ['hit', 'crit', 'miss', 'fumble', 'downed']) rows.push({ name: `res-corte-${r}`, label: `Corte · ${r}`, opts: { family: 'corte', result: r } });
  for (const r of ['crit', 'miss', 'fumble']) rows.push({ name: `res-flecha-${r}`, label: `Flecha · ${r}`, opts: { family: 'flecha', result: r } });
  for (const r of ['crit', 'miss']) rows.push({ name: `res-projetil-${r}`, label: `Projétil Tártaro · ${r}`, opts: { family: 'projetil', element: 'Tártaro', result: r } });
}
if (mode === 'elementos' || mode === 'tudo') {
  for (const k of ELEMENT_KEYS) rows.push({ name: `el-${k}`, label: `Projétil · ${ELEMENTS[k].name}`, opts: { family: 'projetil', element: ELEMENTS[k].name, result: 'hit' } });
}

const pngs = [];
for (const row of rows) {
  getFamily(row.opts.family);
  const ctx = frameStrip(row.opts);
  const ppm = join(out, `${row.name}.ppm`);
  writePPM(ppm, ctx);
  try {
    const png = join(out, `${row.name}.png`);
    execFileSync('convert', [ppm, '-scale', '300%', '(', '-size', `260x${H * 3}`, 'xc:#13101a', '-fill', '#ece4d2', '-pointsize', '17', '-annotate', '+10+66', row.label, ')', '+swap', '+append', png]);
    pngs.push(png);
  } catch {
    // Sem ImageMagick: fica so o PPM.
  }
}
if (pngs.length) {
  const sheet = join(out, `animacoes-${mode}.png`);
  execFileSync('convert', [...pngs, '-background', '#08070b', '-splice', '0x3', '-append', sheet]);
  console.log(`folha: ${sheet}`);
}
console.log(`${rows.length} linhas em ${out}`);
