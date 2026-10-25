// Monta o icone final 24x24 (pixels puros, sem DOM): moldura do elemento + simbolo da
// forma (magia) ou arma + selo da manobra (tecnica). Deterministico: mesma entrada,
// mesmos pixels.
import { N, blank, stamp, outline, composite, toRGBA, autoShade } from './pixels.js';
import { paletteOf } from './palette.js';
import { ramp, hexToRgb } from '../avatar/palette.js';
import { frameLayer } from './frames.js';
import { symbolGrid } from './symbols.js';
import { weaponGrid, MANEUVER_BADGES, MANEUVER_COLORS } from './weapons.js';
import { classifyPower, iconKey } from './classify.js';
import { schoolPalette } from './schools.js';

export { N as ICON_SIZE };

const interior = (x, y) => Math.min(x, y, N - 1 - x, N - 1 - y) >= 3;

export function styleOf(info) {
  return info.element || (info.kind === 'tecnica' ? 'arma' : 'arcano');
}

function badgeLayer(maneuver, P) {
  const glyph = MANEUVER_BADGES[maneuver] || MANEUVER_BADGES.golpe;
  const tone = { ...P, magic: ramp(MANEUVER_COLORS[maneuver] || MANEUVER_COLORS.golpe).map(hexToRgb) };
  const L = blank();
  // sem medalhao: o selo contornado ja le sobre o fundo e cobre menos a arma
  const cx = 17, cy = 17;
  stamp(L, autoShade(glyph), cx - 3, cy - 3, tone);
  return outline(L, (x, y) => x < N - 1 && y < N - 1);
}

// Pixels de um icone a partir da classificacao (ou de um registro bruto).
export function renderIconLayer(infoOrPower) {
  const info = infoOrPower && infoOrPower.kind ? infoOrPower : classifyPower(infoOrPower);
  const P = paletteOf(styleOf(info));
  const base = frameLayer(P.id);
  const fg = blank();
  if (info.kind === 'tecnica') {
    stamp(fg, weaponGrid(info.weapon), 4, 4, P);
    outline(fg, interior);
    composite(base, fg);
    composite(base, badgeLayer(info.maneuver || info.form, P));
  } else {
    const S = info.school ? schoolPalette(info.school) : null;
    const nth = S ? info.nth || 0 : 0;
    let grid = symbolGrid(info.form, info.variant);
    // irmas (mesma escola, nivel, forma e elemento) espelham o simbolo
    if (nth % 2 === 1) grid = grid.map((r) => r.split('').reverse().join(''));
    if (S) recolorFrame(base, P, S);
    stamp(fg, grid, 4, 4, P);
    if (S && nth >= 2) stamp(fg, ACCENTS[(Math.floor(nth / 2) - 1) % ACCENTS.length].grid, ...ACCENTS[(Math.floor(nth / 2) - 1) % ACCENTS.length].at, P);
    outline(fg, interior);
    composite(base, fg);
    if (S) {
      tierPips(base, info.tier || 1);
      emblem(base, S);
    }
  }
  return base;
}

// ---- grimorio: escola, nivel e irmas (so quando info.school existe) ----
const LAST = N - 1;
const ringOf = (x, y) => Math.min(x, y, LAST - x, LAST - y);
const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

// Troca o material da moldura do elemento pelo da escola (o resto da decoracao fica).
function recolorFrame(L, P, S) {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const k = ringOf(x, y);
    if (k > 2) continue;
    const c = L.px[y * N + x];
    if (!c) continue;
    if (same(c, P.outline)) { L.px[y * N + x] = S.outline; continue; }
    const i = P.frame.findIndex((f) => same(f, c));
    if (i >= 0) L.px[y * N + x] = S.frame[i];
  }
}

// Nivel 1-4: pinos dourados centrados na base da moldura.
const PIN = [[255, 226, 120], [176, 120, 40]];
function tierPips(L, tier) {
  const n = Math.max(1, Math.min(4, tier));
  const x0 = Math.round(12 - n * 1.5);
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 3;
    L.px[(LAST - 2) * N + x] = PIN[0];
    L.px[(LAST - 2) * N + x + 1] = PIN[1];
    L.px[(LAST - 1) * N + x] = PIN[1];
    L.px[(LAST - 1) * N + x + 1] = PIN[1];
  }
}

// Brasao 5x5 da escola num medalhao 7x7 no canto de cima a direita.
function emblem(L, S) {
  const ox = N - 8;
  const oy = 0;
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
    const edge = x === 0 || y === 0 || x === 6 || y === 6;
    const corner = (x === 0 || x === 6) && (y === 0 || y === 6);
    if (corner) continue;
    L.px[(oy + y) * N + ox + x] = edge ? S.outline : S.frame[1];
  }
  S.glyph.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    L.px[(oy + 1 + y) * N + ox + 1 + x] = ch === '#' ? S.frame[4] : S.frame[2];
  }));
}

// Faisca/gota de apoio para a 3a, 5a... irma (cantos livres do miolo).
const ACCENTS = [
  { grid: ['.B.', 'BWB', '.B.'], at: [4, 16] },
  { grid: ['.B.', 'BWB', '.B.'], at: [4, 4] },
  { grid: ['B.B', '.W.', 'B.B'], at: [16, 16] },
  { grid: ['.W.', 'WBW', '.W.'], at: [4, 16] }
];

export function renderIconPixels(infoOrPower) {
  const info = infoOrPower && infoOrPower.kind ? infoOrPower : classifyPower(infoOrPower);
  return { width: N, height: N, data: toRGBA(renderIconLayer(info)), key: iconKey(info), info };
}
