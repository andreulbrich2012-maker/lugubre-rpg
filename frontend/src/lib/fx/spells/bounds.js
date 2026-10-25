// Caixa que uma magia ocupa na tela (para o palco pequeno do grimorio caber colunas,
// olhos gigantes, dragoes e meteoros sem cortar o topo). Toca a magia num contexto
// falso que so anota os retangulos e devolve a uniao deles, em px do mapa.
import { createSpellEffect, renderSpell } from './engine.js';

const SKY = new Set(['weather', 'bolt', 'rain', 'tint']);

// opts: os mesmos de createSpellEffect (spell, from, to, unit, cell, result, seed...)
// frames: quantos instantes amostrar ao longo da magia.
// Conta so o que fica na tela: uma linha (ou coluna) so entra na caixa se aparece em
// pelo menos `keep` dos quadros. Assim meteoro caindo de longe ou faisca voando nao
// esticam a caixa, mas coluna de luz, olho gigante e dragao invocado esticam.
export function spellBounds(opts, frames = 40, keep = 0.12) {
  const e = createSpellEffect(opts);
  if (!e) return null;
  const unit = e.unit || opts.unit || 4;
  // clima (ceu escuro), chuva de coisas e raio caindo do ceu sao fundo: vem de fora da tela
  // de proposito, como na mesa. Para medir, viram passos vazios (mesmas janelas).
  e.steps = e.steps.map((s) => (SKY.has(s.prim) ? { ...s, prim: '-' } : s));
  // tinta de tela e clarao cobrem tudo de proposito: nao contam para a caixa
  const huge = e.C * 8;
  const rows = new Map();
  const cols = new Map();
  let fr = null;
  const ctx = {
    fillStyle: '#000',
    globalAlpha: 1,
    imageSmoothingEnabled: false,
    save() {},
    restore() {},
    setTransform() {},
    clearRect() {},
    fillRect(x, y, w, h) {
      if (ctx.globalAlpha < 0.08 || !(w > 0 && h > 0)) return;
      if (w >= huge && h >= huge) return;
      for (let j = Math.floor(y); j < y + h; j++) fr.r.add(j);
      for (let i = Math.floor(x); i < x + w; i++) fr.c.add(i);
    }
  };
  for (let i = 0; i <= frames; i++) {
    ctx.globalAlpha = 1;
    fr = { r: new Set(), c: new Set() };
    renderSpell(ctx, e, (e.T.total * i) / (frames + 0.5));
    for (const j of fr.r) rows.set(j, (rows.get(j) || 0) + 1);
    for (const j of fr.c) cols.set(j, (cols.get(j) || 0) + 1);
  }
  const need = Math.max(2, Math.round((frames + 1) * keep));
  const span = (m) => {
    let a = Infinity;
    let b = -Infinity;
    for (const [k, n] of m) if (n >= need) { if (k < a) a = k; if (k + 1 > b) b = k + 1; }
    return Number.isFinite(a) ? [a, b] : null;
  };
  const ry = span(rows);
  const rx = span(cols);
  if (!ry || !rx) return null;
  return { x0: rx[0] * unit, y0: ry[0] * unit, x1: rx[1] * unit, y1: ry[1] * unit };
}

// Quanto o palco (w x h) precisa crescer para caber a caixa b (px do mapa). Primeiro
// estica o palco para cima (g: altura mostrada vira h*g, ate gMax; pixels continuam
// inteiros), depois "afasta a camera" (f: o mundo virtual fica w*f x h*g*f, mostrado
// em w x h*g). (ox, oy) e o deslocamento do palco original dentro do mundo virtual:
// centrado na horizontal e com a sobra vertical em cima (ceu), chao embaixo.
// So o eixo vertical decide (chuva e area larga podem sair pelos lados, como na mesa).
export function fitStage(w, h, b, { pad = 6, gMax = 2, fMax = 2.5, step = 0.125 } = {}) {
  const none = { f: 1, g: 1, ox: 0, oy: 0 };
  if (!b) return none;
  const top = Math.max(0, pad - b.y0);
  const bottom = Math.max(0, b.y1 - h + pad);
  const need = (h + top + bottom) / h;
  if (need <= 1) return none;
  const up = (v) => Math.ceil(v / step - 1e-9) * step;
  const g = Math.min(gMax, up(need));
  const f = Math.min(fMax, Math.max(1, up(need / g)));
  const vw = w * f;
  const vh = h * g * f;
  const ox = Math.round((vw - w) / 2);
  const oy = Math.round(vh - h - Math.min(bottom, vh - h));
  return { f, g, ox: Math.max(0, ox), oy: Math.max(0, oy) };
}
