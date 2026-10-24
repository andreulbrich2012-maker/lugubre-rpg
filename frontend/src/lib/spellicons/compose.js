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
    stamp(fg, symbolGrid(info.form, info.variant), 4, 4, P);
    outline(fg, interior);
    composite(base, fg);
  }
  return base;
}

export function renderIconPixels(infoOrPower) {
  const info = infoOrPower && infoOrPower.kind ? infoOrPower : classifyPower(infoOrPower);
  return { width: N, height: N, data: toRGBA(renderIconLayer(info)), key: iconKey(info), info };
}
