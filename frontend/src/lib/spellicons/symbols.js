// Simbolos 16x16 das formas de entrega das magias. Desenhados como grades de texto
// (mascaras X/Y sombreadas automaticamente) ou gerados por funcao quando a forma e
// geometrica (explosao, estrela, corrente, portal). Todos usam a paleta do elemento:
// 0-4/X = cor da magia, A-E/Y = cor de apoio, W = brilho.
import { autoShade, gridFrom, overlay } from './pixels.js';

const S = 16;

// Cometa/orbe voando para cima-direita com rastro na cor de apoio.
const PROJETIL = [
  '................',
  '................',
  '................',
  '..........3443..',
  '.........34WW43.',
  '........D4WW442.',
  '.......DD344431.',
  '......CDD233321.',
  '.....BCCDC2211..',
  '....ABCCB.......',
  '...ABBC.........',
  '..AAB...........',
  '.AA.............',
  '...B............',
  '................',
  '................'
];

// Relampago em zigue-zague, borda esquerda acesa.
const RAIO = [
  '........4W32....',
  '.......4W32.....',
  '......4W32...C..',
  '.....4W32.......',
  '....4W32........',
  '...4WWW33332....',
  '....2222W32.....',
  '.......4W2......',
  '......4W2.......',
  '.....4W2........',
  '....4W2.........',
  '...4W1....C.....',
  '...42...........',
  '..41............',
  '..3.............',
  '................'
];

// Estrela de explosao com 8 pontas alternando longas e curtas.
function area() {
  return gridFrom(S, S, (x, y) => {
    const dx = x - 7.5, dy = y - 7.5;
    const r = Math.hypot(dx, dy);
    const a = Math.atan2(dy, dx) + Math.PI / 8;
    const spike = Math.pow(Math.max(0, Math.cos(4 * a)), 2);
    const long = Math.cos(2 * a) > 0 ? 4.3 : 2.9;
    const R = 3.9 + spike * long;
    if (r > R) {
      // fagulhas soltas fora da estrela
      if ((x === 1 && y === 3) || (x === 13 && y === 13) || (x === 14 && y === 4) || (x === 2 && y === 12)) return 'C';
      return null;
    }
    const lit = r - (dx + dy < 0 ? 0.5 : 0) ;
    if (lit < 2) return 'W';
    if (lit < 3.2) return '4';
    if (lit < 4.3) return '3';
    if (lit < 5.4) return 'D';
    return dx + dy > 0 ? 'B' : 'C';
  });
}

// Coracao com cruz de cura e um brilho.
const CURA = autoShade([
  '..............E.',
  '.............EWE',
  '..............E.',
  '...XXX...XXX....',
  '..XWWXX.XXXXX...',
  '.XWWXXXWXXXXXX..',
  '.XWXXXXWXXXXXX..',
  '.XXXXWWWWWXXXX..',
  '..XXXXXWXXXXX...',
  '...XXXXWXXXX....',
  '....XXXXXXX.....',
  '.....XXXXX......',
  '......XXX.......',
  '.......X........',
  '................',
  '................'
]);

// Escudo de cavaleiro com aro na cor de apoio e emblema.
const ESCUDO = autoShade([
  '................',
  '..YYYYYYYYYYYY..',
  '..YXXXXXXXXXXY..',
  '..YXXXXWWXXXXY..',
  '..YXXXXWWXXXXY..',
  '..YXXWWWWWWXXY..',
  '..YXXXXWWXXXXY..',
  '..YXXXXWWXXXXY..',
  '..YXXXXWWXXXXY..',
  '...YXXXXXXXXY...',
  '....YXXXXXXY....',
  '.....YXXXXY.....',
  '......YXXY......',
  '.......YY.......',
  '................',
  '................'
]);

// Coordenadas ao longo da diagonal (de baixo-esquerda para cima-direita).
const along = (x, y) => (x - 7.5 - (y - 7.5)) / Math.SQRT2;
const across = (x, y) => (x - 7.5 + (y - 7.5)) / Math.SQRT2;

// Corrente diagonal: elos de frente (aneis) com elos de perfil (barras) passando
// pelos furos; a barra fica por cima de um anel e por baixo do seguinte (entrelacado).
const RING = ['.XXXX.', 'XX..XX', 'X....X', 'X....X', 'XX..XX', '.XXXX.'];
function bar(x0, y0) {
  const g = Array.from({ length: S }, () => '.'.repeat(S));
  const rows = g.map((r) => r.split(''));
  for (let t = 0; t <= 5; t++) { rows[y0 - t][x0 + t] = 'Y'; rows[y0 - t][x0 + t + 1] = 'Y'; }
  return rows.map((r) => r.join(''));
}
function correntes() {
  let g = Array.from({ length: S }, () => '.'.repeat(S));
  g = overlay(g, RING, 0, 10);
  g = overlay(g, bar(2, 12));
  g = overlay(g, RING, 5, 5);
  g = overlay(g, bar(7, 8));
  g = overlay(g, RING, 10, 0);
  return autoShade(g);
}

// Raizes/vinhas retorcidas subindo do chao, com folhas.
const RAIZES = autoShade([
  '.......YY.......',
  '......YYYY......',
  '....XX.YY.XX....',
  '...XXXX..XXXX...',
  '..XX..XXXX..XX..',
  '..XX...XX...XX..',
  '.XX...XXXX...XX.',
  '.XX..XX..XX..XX.',
  '.XX..XX..XX..XX.',
  '.XX...X..X...XX.',
  '..XX........XX..',
  '..XX........XX..',
  '.XXX........XXX.',
  'XX.XX......XX.XX',
  '................',
  '................'
]);

// Caveira com olhos acesos e gotas de maldicao.
const MALDICAO = autoShade([
  '................',
  '.....XXXXXX.....',
  '...XXXXXXXXXX...',
  '..XXXXXXXXXXXX..',
  '..XXXXXXXXXXXX..',
  '..XX00XXXX00XX..',
  '..X000XXXX000X..',
  '..X0E0XXXX0E0X..',
  '...XXXX00XXXX...',
  '....XXXXXXXX....',
  '.....X0X0X0X....',
  '.....XXXXXXX....',
  '......Y...Y.....',
  '......Y.........',
  '..........Y.....',
  '................'
]);

// Seta com rastros de velocidade.
const SETA = autoShade([
  '................',
  '................',
  '........X.......',
  '........XX......',
  '........XXX.....',
  '........XXXX....',
  'YY..XXXXXXXXX...',
  '..YYXXXXXXXXXX..',
  '..YYXXXXXXXXXX..',
  'YY..XXXXXXXXX...',
  '........XXXX....',
  '........XXX.....',
  '........XX......',
  '........X.......',
  '................',
  '................'
]);

// Portal em espiral (teleporte).
function portal() {
  return gridFrom(S, S, (x, y) => {
    const dx = (x - 7.5) / 1.0, dy = (y - 7.5) / 1.15;
    const r = Math.hypot(dx, dy);
    if (r > 7.2) return null;
    const a = Math.atan2(dy, dx);
    // espiral de Arquimedes: braco quando a fase bate
    const ph = (r * 0.95 - a * (2.2 / Math.PI) + 40) % 4.4;
    if (r < 1.3) return 'W';
    if (r > 6.2) return dx + dy < 0 ? '3' : '1';
    if (ph < 1.6) return r < 3.5 ? '4' : '3';
    if (ph < 2.3) return 'C';
    return null;
  });
}

// Espirito subindo de um circulo de invocacao.
const INVOCACAO = autoShade([
  '......XXXX......',
  '.....XXXXXX.....',
  '....XXXXXXXX....',
  '....XX0XX0XX....',
  '....XX0XX0XX....',
  '....XXXXXXXX....',
  '...XXXXXXXXXX...',
  '..XX.XXXXXX.XX..',
  '.....XXXXXX.....',
  '......XXXX......',
  '....YYYXXYYY....',
  '..YY...XX...YY..',
  '.Y.....WW.....Y.',
  '..YY........YY..',
  '....YYYYYYYY....',
  '................'
]);

// Estrela de quatro pontas com brilhos menores.
function bencao() {
  const g = gridFrom(S, S, (x, y) => {
    const dx = Math.abs(x - 7), dy = Math.abs(y - 7);
    if (dx > 7 || dy > 7) return null;
    const v = (dx + 0.5) * (dy + 0.5);
    if (v > 3.4 && !(dx <= 1 && dy <= 1)) return null;
    const d = dx + dy;
    if (d <= 1) return 'W';
    if (d <= 3) return '4';
    if (d <= 5) return x + y < 14 ? '3' : '2';
    return x + y < 14 ? '2' : '1';
  });
  return overlay(overlay(g, ['.D.', 'DWD', '.D.'], 11, 1), ['C'], 2, 12);
}

// Mao aberta com runa acesa na palma.
const TOQUE = autoShade([
  '................',
  '......XX......C.',
  '...XX.XX.XX.....',
  '...XX.XX.XX.....',
  '...XX.XX.XX.XX..',
  '...XX.XX.XX.XX..',
  '...XX.XX.XX.XX..',
  '...XXXXXXXXXXX..',
  'X..XXXXXXXXXXX..',
  'XX.XXXXWWXXXXX..',
  '.XXXXXXWWXXXXX..',
  '..XXXXXXXXXXXX..',
  '...XXXXXXXXXX...',
  '....XXXXXXXXX...',
  '.....XXXXXXX....',
  '.....XXXXXXX....'
]);

// Cristais brotando de uma placa de chao.
const TERRENO = autoShade([
  '................',
  '................',
  '......X.........',
  '......XX........',
  '.....XWX....X...',
  '.....XWX...XX...',
  '..X..XWXX..XX...',
  '..XX.XXXX..XWX..',
  '.XWX.XXXX.XXWX..',
  '.XXX.XXXXXXXXX..',
  'YYYYYYYYYYYYYYYY',
  '.YYYYYYYYYYYYYY.',
  '..YYYYYYYYYYYY..',
  '....YYYYYYYY....',
  '................',
  '................'
]);

const BUILDERS = {
  projetil: () => PROJETIL,
  raio: () => RAIO,
  area,
  cura: () => CURA,
  escudo: () => ESCUDO,
  controle: (variant) => (variant === 'raizes' ? RAIZES : correntes()),
  maldicao: () => MALDICAO,
  movimento: (variant) => (variant === 'portal' ? portal() : SETA),
  invocacao: () => INVOCACAO,
  bencao,
  toque: () => TOQUE,
  terreno: () => TERRENO
};

const memo = new Map();
export function symbolGrid(form, variant = '') {
  const key = `${form}|${variant}`;
  if (!memo.has(key)) memo.set(key, (BUILDERS[form] || BUILDERS.projetil)(variant));
  return memo.get(key);
}

export const SYMBOL_FORMS = Object.keys(BUILDERS);
