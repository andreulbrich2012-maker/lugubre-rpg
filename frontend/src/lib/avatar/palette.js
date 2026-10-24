// Paletas do criador de personagem. Cada cor base vira uma rampa de 5 tons
// (0 = sombra funda ... 4 = brilho) com "hue shifting": a sombra puxa para
// roxo/azul e a luz para creme, no estilo das pixel arts quentes do genero.
// Assim qualquer cor escolhida pelo jogador ja sai com volume e coesa com o mapa.

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb([h, s, l]) {
  h = ((h % 360) + 360) % 360 / 360;
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

// Gira o matiz na direcao do alvo pelo caminho mais curto (no maximo `amt` graus).
function towards(h, target, amt) {
  let d = ((target - h + 540) % 360) - 180;
  if (Math.abs(d) < amt) return target;
  return h + Math.sign(d) * amt;
}

const COOL = 255; // sombras puxam para azul-violeta
const WARM = 48; // luzes puxam para creme/amarelo

export function shadeHex(hex, level) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  const grey = s < 0.06; // cinzas ganham so um toque de matiz, nunca viram cor forte
  const steps = {
    0: [towards(h, COOL, grey ? 0 : 20), Math.min(1, s * 0.9 + (grey ? 0.08 : 0.02)), l * 0.52],
    1: [towards(h, COOL, grey ? 0 : 9), Math.min(1, s * 0.92 + (grey ? 0.05 : 0)), l * 0.8],
    2: [h, s, l],
    3: [towards(h, WARM, grey ? 0 : 8), s * 0.96, l + (1 - l) * 0.2],
    4: [towards(h, WARM, grey ? 0 : 16), s * 0.85, l + (1 - l) * 0.42]
  };
  let [hh, ss, ll] = steps[level] ?? steps[2];
  if (grey && level !== 2) hh = level < 2 ? COOL : WARM;
  return rgbToHex(hslToRgb([hh, ss, ll]));
}

// Pele (estilo Stardew): a sombra puxa para rosa/vinho quente e a luz para pessego,
// nunca para azul-cinza como nos tecidos; senao o rosto parece doente.
const SKIN_SHADOW = 345;
export function skinShadeHex(hex, level) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  const steps = {
    0: [towards(h, SKIN_SHADOW, 22), Math.min(1, s * 1.05 + 0.08), l * 0.55],
    1: [towards(h, SKIN_SHADOW, 10), Math.min(1, s * 1.02 + 0.05), l * 0.8],
    2: [h, s, l],
    3: [towards(h, 40, 5), s * 0.95, l + (1 - l) * 0.22],
    4: [towards(h, 45, 9), s * 0.85, l + (1 - l) * 0.45]
  };
  return rgbToHex(hslToRgb(steps[level] ?? steps[2]));
}

const rampCache = new Map();
export function ramp(hex) {
  let r = rampCache.get(hex);
  if (!r) {
    const skin = SKIN_HEXES.has(hex);
    r = [0, 1, 2, 3, 4].map((lv) => (skin ? skinShadeHex(hex, lv) : shadeHex(hex, lv)));
    rampCache.set(hex, r);
  }
  return r;
}

// Contorno no estilo Stardew: marrom-sepia quente misturado com um pouco da cor vizinha
// (cabelo azul ganha contorno sepia-azulado, nunca preto puro nem roxo frio).
const SEPIA = [52, 30, 34];
export function outlineOf(rgb) {
  const [h, s, l] = rgbToHsl(rgb);
  const dark = hslToRgb([towards(h, 15, 25), Math.min(1, s * 0.6 + 0.2), Math.min(0.2, l * 0.3 + 0.06)]);
  return dark.map((v, k) => Math.round(v * 0.4 + SEPIA[k] * 0.6));
}

export { hexToRgb, rgbToHex };

// ---- listas curadas (id, nome pt-BR, cor base) ----
export const SKINS = [
  ['porcelana', 'Porcelana', '#f2d3bd'],
  ['clara', 'Clara', '#e8b996'],
  ['pessego', 'Pêssego', '#dfa27a'],
  ['oliva', 'Oliva', '#c08b5c'],
  ['bronze', 'Bronze', '#a8703f'],
  ['canela', 'Canela', '#8c5a35'],
  ['castanha', 'Castanha', '#6e4329'],
  ['ebano', 'Ébano', '#4a2c1f'],
  ['cinza-cinza', 'Cinza de cinzas', '#8f8a93'],
  ['azul-palido', 'Azul pálido', '#9fb4cf'],
  ['azul-profundo', 'Azul profundo', '#4d6b94'],
  ['rubro-abissal', 'Rubro abissal', '#a3383a'],
  ['carmim', 'Carmim escuro', '#6e2230'],
  ['verde-gorak', 'Verde-cinza', '#7d8c5e'],
  ['musgo', 'Musgo', '#5a6e43'],
  ['lilas-noite', 'Lilás da noite', '#8a77a8'],
  ['dourada', 'Dourada', '#d9b46a'],
  ['pedra', 'Pedra', '#7f7a70'],
  ['marinha', 'Marinha', '#5f9a9a'],
  ['pena-negra', 'Penas negras', '#3b3644'],
  ['pena-parda', 'Penas pardas', '#7a5b3e'],
  ['pelagem', 'Pelagem castanha', '#6b4a33']
].map(([id, name, hex]) => ({ id, name, hex }));

export const HAIR_COLORS = [
  ['preto', 'Preto', '#2a2230'],
  ['preto-azulado', 'Preto-azulado', '#252a45'],
  ['castanho-escuro', 'Castanho-escuro', '#4a2f22'],
  ['castanho', 'Castanho', '#6e4428'],
  ['castanho-claro', 'Castanho-claro', '#93633a'],
  ['ruivo-escuro', 'Ruivo-escuro', '#8a3a22'],
  ['ruivo', 'Ruivo', '#b8542a'],
  ['acobreado', 'Acobreado', '#c27a3a'],
  ['loiro-escuro', 'Loiro-escuro', '#b08a4a'],
  ['loiro', 'Loiro', '#dcb460'],
  ['loiro-palido', 'Loiro-pálido', '#e8d49a'],
  ['platinado', 'Platinado', '#e4e0d4'],
  ['grisalho', 'Grisalho', '#9a9498'],
  ['branco', 'Branco', '#ece8e2'],
  ['azul-noite', 'Azul-noite', '#2f4a7a'],
  ['verde-musgo', 'Verde-musgo', '#4f6a3a'],
  ['roxo', 'Roxo', '#5e3a7e'],
  ['vinho', 'Vinho', '#7a2236'],
  ['rosa-antigo', 'Rosa-antigo', '#b86a7e'],
  ['prata-lunar', 'Prata lunar', '#b4bccc']
].map(([id, name, hex]) => ({ id, name, hex }));

export const EYE_COLORS = [
  ['castanho', 'Castanhos', '#5a3a26'],
  ['preto', 'Pretos', '#241c2a'],
  ['verde', 'Verdes', '#3f7a4a'],
  ['azul', 'Azuis', '#3a6aa8'],
  ['cinza', 'Cinzentos', '#7a8494'],
  ['ambar', 'Âmbar', '#c98a2a'],
  ['violeta', 'Violeta', '#7a4aa8'],
  ['vermelho', 'Vermelhos', '#b02a2a'],
  ['dourado', 'Dourados (brilham)', '#f0c850'],
  ['lunar', 'Lunares (brilham)', '#c8e4f0']
].map(([id, name, hex]) => ({ id, name, hex }));

// Cores de roupa/acessorio: tecidos, couros e metais. Quentes e saturadas, mas sem neon.
export const COLORS = [
  ['carvao', 'Carvão', '#2e2a35'],
  ['chumbo', 'Chumbo', '#4a4756'],
  ['pedra', 'Pedra', '#6e6b78'],
  ['cinza-claro', 'Cinza-claro', '#a09ca8'],
  ['osso', 'Osso', '#e0d4b8'],
  ['linho', 'Linho', '#c9b68e'],
  ['branco-gasto', 'Branco gasto', '#ece4d2'],
  ['couro-escuro', 'Couro escuro', '#4f3424'],
  ['couro', 'Couro', '#7a4e2e'],
  ['camurca', 'Camurça', '#a8794a'],
  ['terra', 'Terra', '#8a5a3a'],
  ['vinho', 'Vinho', '#6e1f34'],
  ['sangue', 'Sangue', '#9c2a2a'],
  ['carmesim', 'Carmesim', '#c0403a'],
  ['ferrugem', 'Ferrugem', '#a8502a'],
  ['abobora', 'Abóbora', '#d0782e'],
  ['ocre', 'Ocre', '#c4962e'],
  ['mostarda', 'Mostarda', '#b8a03a'],
  ['oliva', 'Oliva', '#6e7034'],
  ['musgo', 'Musgo', '#4f6a34'],
  ['floresta', 'Floresta', '#2f5a3a'],
  ['jade', 'Jade', '#3a8a6a'],
  ['petroleo', 'Petróleo', '#2a6070'],
  ['azul-aco', 'Azul-aço', '#3e5e86'],
  ['azul-noite', 'Azul-noite', '#2a2f5e'],
  ['anil', 'Anil', '#3a3e9a'],
  ['ameixa', 'Ameixa', '#4e2a52'],
  ['arcano', 'Violeta arcano', '#6e3e9a'],
  ['rosa-seco', 'Rosa seco', '#b0607a'],
  ['ferro', 'Ferro', '#6e7480'],
  ['aco', 'Aço', '#9aa4b2'],
  ['prata', 'Prata', '#c4ccd6'],
  ['ferro-negro', 'Ferro negro', '#3a3c48'],
  ['bronze', 'Bronze', '#a0703a'],
  ['cobre', 'Cobre', '#b86a40'],
  ['ouro', 'Ouro velho', '#d0a440'],
  ['madeira', 'Madeira', '#8a5e3a'],
  ['madeira-escura', 'Madeira escura', '#4f3424']
].map(([id, name, hex]) => ({ id, name, hex }));

// so as peles "de carne" ganham a rampa quente; pedra, penas e escamas ficam com a comum
const SKIN_HEXES = new Set(SKINS.filter((c) => !['cinza-cinza', 'pedra', 'pena-negra', 'pena-parda', 'azul-palido', 'azul-profundo', 'marinha', 'lilas-noite', 'verde-gorak', 'musgo'].includes(c.id)).map((c) => c.hex));

const byId = (list) => Object.fromEntries(list.map((c) => [c.id, c]));
export const SKIN_BY_ID = byId(SKINS);
export const HAIR_BY_ID = byId(HAIR_COLORS);
export const EYE_BY_ID = byId(EYE_COLORS);
export const COLOR_BY_ID = byId(COLORS);

// Resolve um id de cor (de qualquer lista) ou um hex direto.
export function colorHex(id, fallback = '#ff00ff') {
  if (typeof id === 'string' && /^#[0-9a-f]{6}$/i.test(id)) return id.toLowerCase();
  return (COLOR_BY_ID[id] || HAIR_BY_ID[id] || SKIN_BY_ID[id] || EYE_BY_ID[id])?.hex || fallback;
}
