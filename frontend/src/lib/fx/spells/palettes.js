// Rampas extras do grimorio (escuro -> claro, com hue shift estilo Stardew: a sombra
// puxa para o frio/roxo e o brilho para o quente). Os 9 elementos continuam vindo de
// ../elements.js; estas sao materiais e "sabores" que nao sao elemento (gelo, acido,
// sangue, osso...). Uma receita escolhe uma rampa com "p=<nome>"; se o poder trouxer
// elemento explicito, a rampa do elemento manda.
import { ELEMENTS, PALETTES, elementKey } from '../elements.js';

export const SPELL_PALETTES = {
  fire: ELEMENTS.tartaro.ramp,
  ice: ['#0e2448', '#2a62a4', '#62aee6', '#bce6ff', '#ffffff'],
  water: ['#0a1c48', '#1a4aa0', '#2a86d8', '#7ad0f4', '#e0fcff'],
  earth: ['#2a1a10', '#5e3c22', '#8e6238', '#c49660', '#ecd2a0'],
  wind: ['#34465a', '#6e90a4', '#a8cad6', '#e0f4f4', '#ffffff'],
  storm: ['#141a52', '#3450d8', '#84acff', '#dcecff', '#ffffff'],
  acid: ['#18280a', '#46760e', '#86ce1e', '#ccfc5a', '#f6ffd0'],
  poison: PALETTES.poison,
  light: ELEMENTS.hemera.ramp,
  dark: ['#06040c', '#1a1228', '#3a2a58', '#6a5498', '#b8a8e0'],
  arcane: ['#1a0a3a', '#4a1a8a', '#8a3ae0', '#c88aff', '#f4e0ff'],
  dream: ELEMENTS.nix.ramp,
  bone: ['#3a3428', '#7a705a', '#bcb090', '#e8e0c8', '#ffffff'],
  necro: ['#0c1410', '#24402e', '#4e8a5a', '#9ad88a', '#e8ffd8'],
  holy: ['#5a4a18', '#c0a040', '#f0dc80', '#fff6c8', '#ffffff'],
  nature: ELEMENTS.gaia.ramp,
  shadow: ['#040308', '#14101e', '#2c2240', '#54467a', '#9888c0'],
  blood: ['#2a0408', '#6a0c18', '#b01a2a', '#e8505a', '#ffc0c0'],
  time: ELEMENTS.ananque.ramp,
  space: ['#0a0620', '#2a1a6a', '#6a3ad0', '#b08aff', '#f0e8ff'],
  rune: ['#2a1a04', '#8a5a10', '#e0a020', '#ffe070', '#fffbe0'],
  alchemy: ['#1a1030', '#3a6a3a', '#5ac08a', '#b0f0c0', '#ffffff'],
  music: ['#3a1440', '#8a3a8a', '#e070b0', '#ffc0e0', '#fff4fa'],
  curse: ['#140814', '#3a1240', '#6a2a6a', '#b05aa0', '#f0b8e0'],
  spirit: ELEMENTS.eter.ramp,
  cosmos: ['#05061e', '#1c2266', '#4a52c0', '#a0a8ff', '#fff8d0'],
  moon: ['#1a1e34', '#4a5478', '#9aa4c4', '#dce2f2', '#ffffff'],
  chaos: ELEMENTS.caos.ramp,
  meta: ['#1a1440', '#3a3ab0', '#5a9ae0', '#a0f0f0', '#ffffff'],
  gold: PALETTES.gold,
  sand: ['#4a3418', '#8a6430', '#c8a060', '#e8d0a0', '#fff4dc'],
  stone: PALETTES.stone,
  wood: ['#2a1808', '#5a3618', '#8a5a2a', '#c08a48', '#e8c080'],
  steel: PALETTES.steel,
  smoke: PALETTES.puff,
  dust: PALETTES.dust,
  mud: ['#1e140a', '#3e2a16', '#664626', '#8e6a40', '#b89464'],
  flesh: ['#2a0e0e', '#6a2a22', '#b0604a', '#e0a07a', '#ffe0c8']
};

// Rampa padrao de cada escola (quando a receita nao escolhe uma).
export const SCHOOL_PALETTE = {
  fogo: 'fire', gelo: 'ice', agua: 'water', terra: 'earth', ar: 'wind', raio: 'storm', acido: 'acid', veneno: 'poison',
  luz: 'light', trevas: 'dark', forca: 'arcane', ilusao: 'dream', encantamento: 'music', necromancia: 'necro',
  conjuracao: 'arcane', abjuracao: 'holy', transmutacao: 'alchemy', adivinhacao: 'time', divina: 'holy',
  natureza: 'nature', sombras: 'shadow', sangue: 'blood', tempo: 'time', espaco: 'space', runas: 'rune',
  alquimia: 'alchemy', musica: 'music', maldicoes: 'curse', xamanismo: 'spirit', cosmos: 'cosmos', caos: 'chaos',
  metamagia: 'meta', utilitarias: 'light', rituais: 'rune'
};

export function paletteFor(name) {
  if (!name) return null;
  if (SPELL_PALETTES[name]) return SPELL_PALETTES[name];
  const k = elementKey(name);
  return k && k !== 'fisico' ? ELEMENTS[k].ramp : null;
}

// Cor "hex" + fator (0..1) em direcao ao branco/preto, para variacoes rapidas.
export function mix(hex, other, k) {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(other.slice(1), 16);
  const ch = (s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}
