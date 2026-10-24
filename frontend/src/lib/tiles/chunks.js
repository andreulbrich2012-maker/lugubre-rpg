// Mapa grande (ate 1000x1000 celulas = 16000x16000 px de arte) nao cabe num canvas so: o
// render.js desenha em pedacos de CHUNK x CHUNK celulas, so os que aparecem na tela, com cache
// limitado. Aqui fica a conta pura (sem DOM, testada em chunks.test.js): divisao em pedacos,
// quais aparecem, o que mudou entre duas versoes do mapa e quais pedacos isso suja.
import { TERRAIN_PAD, OBJECT_PAD } from './compose.js';

export const CHUNK = 32; // 32x32 celulas = 512x512 px: ~30-60 ms para renderizar, sem engasgo longo
export const SINGLE_MAX = 96; // mapa ate 96x96: um pedaco so (igual ao desenho antigo do mapa inteiro)
// px de tela por celula abaixo disso: so a "miniatura" (1 px por celula, cor media do bloco)
export const OVERVIEW_BELOW = 6;
// abaixo disso os pedacos sao guardados em 8 px por celula (metade da memoria x4), sem animacao
export const HALF_RES_BELOW = 12;

export function chunkLayout(cols, rows) {
  const single = cols <= SINGLE_MAX && rows <= SINGLE_MAX;
  const cw = single ? cols : CHUNK;
  const ch = single ? rows : CHUNK;
  return { cols, rows, cw, ch, nx: Math.max(1, Math.ceil(cols / cw)), ny: Math.max(1, Math.ceil(rows / ch)), single };
}

// Retangulo (celulas) do pedaco i, j.
export function chunkRect(L, i, j) {
  const x = i * L.cw;
  const y = j * L.ch;
  return { x, y, w: Math.min(L.cw, L.cols - x), h: Math.min(L.ch, L.rows - y) };
}

// Pedacos que cruzam a vista (celulas, fracionario ok), do centro para fora (o do meio aparece primeiro).
export function visibleChunks(L, view) {
  const x0 = Math.max(0, view.x0);
  const y0 = Math.max(0, view.y0);
  const x1 = Math.min(L.cols, view.x1);
  const y1 = Math.min(L.rows, view.y1);
  if (x1 <= x0 || y1 <= y0) return [];
  const i0 = Math.floor(x0 / L.cw);
  const i1 = Math.min(L.nx - 1, Math.ceil(x1 / L.cw) - 1);
  const j0 = Math.floor(y0 / L.ch);
  const j1 = Math.min(L.ny - 1, Math.ceil(y1 / L.ch) - 1);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const out = [];
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const d = Math.hypot((i + 0.5) * L.cw - cx, (j + 0.5) * L.ch - cy);
      out.push([i, j, d]);
    }
  }
  return out.sort((a, b) => a[2] - b[2]).map(([i, j]) => [i, j]);
}

// Nivel de detalhe pelo tamanho da celula na tela: 'overview' | 8 | 16 (px de arte por celula).
export function pickLod(screenCell, single) {
  if (single) return 16;
  if (screenCell < OVERVIEW_BELOW) return 'overview';
  return screenCell < HALF_RES_BELOW ? 8 : 16;
}

// Linhas que mudaram entre duas versoes das camadas: [[y, x0, x1], ...] (x1 inclusivo).
// Linha igual (mesma string) custa uma comparacao; o editor so troca as linhas pintadas.
export function diffLayers(a, b, names = ['ground', 'objects']) {
  const byRow = new Map();
  for (const name of names) {
    const ra = a?.[name] || [];
    const rb = b?.[name] || [];
    if (ra === rb) continue;
    const n = Math.max(ra.length, rb.length);
    for (let y = 0; y < n; y++) {
      const sa = ra[y] || '';
      const sb = rb[y] || '';
      if (sa === sb) continue;
      const len = Math.max(sa.length, sb.length);
      let x0 = 0;
      while (x0 < len && sa.charCodeAt(x0) === sb.charCodeAt(x0)) x0++;
      let x1 = len - 1;
      while (x1 > x0 && sa.charCodeAt(x1) === sb.charCodeAt(x1)) x1--;
      const cur = byRow.get(y);
      byRow.set(y, cur ? [y, Math.min(cur[1], x0), Math.max(cur[2], x1)] : [y, x0, x1]);
    }
  }
  return [...byRow.values()].sort((p, q) => p[0] - q[0]);
}

// Uma celula mudada afeta os pedacos cuja folga (TERRAIN_PAD/OBJECT_PAD) a alcanca:
// copa de arvore e moinho sobem ate 4 celulas, bordas e espuma passam 2 para os lados.
// (calculado na hora: compose.js e render.js se importam em ciclo)
export function dirtyChunks(L, segments) {
  const REACH = {
    left: Math.max(TERRAIN_PAD.right, OBJECT_PAD.right),
    right: Math.max(TERRAIN_PAD.left, OBJECT_PAD.left),
    up: Math.max(TERRAIN_PAD.bottom, OBJECT_PAD.bottom),
    down: Math.max(TERRAIN_PAD.top, OBJECT_PAD.top)
  };
  const out = new Set();
  for (const [y, x0, x1] of segments) {
    const i0 = Math.max(0, Math.floor((x0 - REACH.left) / L.cw));
    const i1 = Math.min(L.nx - 1, Math.floor((x1 + REACH.right) / L.cw));
    const j0 = Math.max(0, Math.floor((y - REACH.up) / L.ch));
    const j1 = Math.min(L.ny - 1, Math.floor((y + REACH.down) / L.ch));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) out.add(`${i}|${j}`);
  }
  return out;
}
