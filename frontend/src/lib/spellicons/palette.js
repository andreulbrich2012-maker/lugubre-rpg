// Paletas dos icones por elemento. Cada cor base vira rampa de 5 tons com hue shifting
// (mesma funcao do criador de personagem), entao icones, avatares e mapa conversam.
//   bg     = fundo da moldura (medio/escuro, para o simbolo claro saltar)
//   frame  = material da moldura (madeira, basalto, ouro...)
//   magic  = cor principal do simbolo
//   second = cor de apoio (rastro, aro, faiscas)
import { ramp, outlineOf, hexToRgb } from '../avatar/palette.js';

export const STYLES = {
  caos: { name: 'Caos', bg: '#5a1226', frame: '#a8283a', magic: '#ff6a6a', second: '#ffa23c' },
  gaia: { name: 'Gaia', bg: '#24502a', frame: '#8e5c30', magic: '#8ad450', second: '#f0d060' },
  ponto: { name: 'Ponto', bg: '#1a3ea8', frame: '#3458d8', magic: '#4ad8e8', second: '#f0e0a0' },
  erebo: { name: 'Érebo', bg: '#2e1c4a', frame: '#5a4286', magic: '#b888f4', second: '#e070c8' },
  nix: { name: 'Nix', bg: '#141634', frame: '#b4cce8', magic: '#a8d4ff', second: '#f0f8ff' },
  tartaro: { name: 'Tártaro', bg: '#621a0e', frame: '#54302a', magic: '#ff8c30', second: '#ffd452' },
  eter: { name: 'Éter', bg: '#18606a', frame: '#88c4b8', magic: '#8cf4e0', second: '#fff0b0' },
  ananque: { name: 'Ananque', bg: '#46301a', frame: '#d4a032', magic: '#f4c844', second: '#e07a34' },
  hemera: { name: 'Hemera', bg: '#8a3a52', frame: '#f2d488', magic: '#fff2a8', second: '#e8744a' },
  // magia sem elemento conhecido: pedra e lilas arcano
  arcano: { name: 'Arcano', bg: '#2e2e36', frame: '#7c7a80', magic: '#d4ccdc', second: '#9a90b0' },
  // tecnicas sem elemento: couro e ferro, como uma bainha
  arma: { name: 'Arma', bg: '#4e3426', frame: '#828896', magic: '#f0c870', second: '#d05a3a' }
};

// Materiais fixos das armas (nao mudam com o elemento: aco e aco).
const METAL = '#a4aebc';
const WOOD = '#8e5a34';
const GOLD = '#d8a838';
const GEM = '#c83c48';

const toRgb = (r) => r.map(hexToRgb);
const cache = new Map();

export function paletteOf(styleId) {
  const id = STYLES[styleId] ? styleId : 'arcano';
  let p = cache.get(id);
  if (p) return p;
  const st = STYLES[id];
  const mix = (a, b, t) => a.map((v, k) => Math.round(v * (1 - t) + b[k] * t));
  const magic = toRgb(ramp(st.magic));
  p = {
    id,
    bg: toRgb(ramp(st.bg)),
    frame: toRgb(ramp(st.frame)),
    magic,
    second: toRgb(ramp(st.second)),
    white: mix(magic[4], [255, 252, 238], 0.6),
    metal: toRgb(ramp(METAL)),
    wood: toRgb(ramp(WOOD)),
    gold: toRgb(ramp(GOLD)),
    gem: toRgb(ramp(GEM)),
    outline: outlineOf(hexToRgb(st.frame))
  };
  cache.set(id, p);
  return p;
}

// Caracteres das grades de pixel -> cor.
//   0-4 magia, A-E apoio, a-e metal, m-q madeira, r-v ouro, g-k gema,
//   W brilho quase branco, K contorno da moldura, P-T fundo (0-4)
export function charColor(ch, P) {
  if (ch >= '0' && ch <= '4') return P.magic[ch.charCodeAt(0) - 48];
  if (ch >= 'A' && ch <= 'E') return P.second[ch.charCodeAt(0) - 65];
  if (ch >= 'a' && ch <= 'e') return P.metal[ch.charCodeAt(0) - 97];
  if (ch >= 'm' && ch <= 'q') return P.wood[ch.charCodeAt(0) - 109];
  if (ch >= 'r' && ch <= 'v') return P.gold[ch.charCodeAt(0) - 114];
  if (ch >= 'g' && ch <= 'k') return P.gem[ch.charCodeAt(0) - 103];
  if (ch >= 'P' && ch <= 'T') return P.bg[ch.charCodeAt(0) - 80];
  if (ch === 'W') return P.white;
  if (ch === 'K') return P.outline;
  return null;
}

export { outlineOf };
