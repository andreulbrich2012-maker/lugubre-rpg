// Assinaturas dos Primordiais (e do golpe fisico) para os efeitos.
// Cada rampa vai do escuro ao claro com "hue shift" estilo Stardew: a sombra puxa
// para o frio/roxo e o brilho puxa para o quente/amarelo; isso deixa a particula
// viva mesmo com 2-3 pixels. Indices: 0 sombra, 1 base escura, 2 base, 3 luz, 4 brilho.
import { normalize, hasWord } from './text.js';

export const ELEMENTS = {
  caos: {
    key: 'caos', name: 'Caos',
    ramp: ['#2e0a2c', '#7a1238', '#d0284a', '#ff6a5e', '#ffd0a8'],
    accent: '#ff8ae0',
    shape: 'shard', motion: 'jitter',
    hint: 'Estilhaços magenta que tremem sem rumo.'
  },
  gaia: {
    key: 'gaia', name: 'Gaia',
    ramp: ['#10301e', '#1f6a3f', '#3fa34d', '#94d64a', '#eef7a0'],
    accent: '#e0a03a',
    shape: 'leaf', motion: 'flutter',
    hint: 'Folhas e esporos que balançam caindo.'
  },
  ponto: {
    key: 'ponto', name: 'Ponto',
    ramp: ['#0c1a4a', '#1c3e9e', '#2f86d8', '#62d4f2', '#e0fcff'],
    accent: '#ffffff',
    shape: 'drop', motion: 'splash',
    hint: 'Gotas que espirram e caem com peso.'
  },
  erebo: {
    key: 'erebo', name: 'Érebo',
    ramp: ['#100a1c', '#2c1d4a', '#5a3a8a', '#9a6ad0', '#dcbcff'],
    accent: '#1a0f28',
    shape: 'smoke', motion: 'drift',
    hint: 'Fumaça roxa que sobe devagar e se desfaz.'
  },
  nix: {
    key: 'nix', name: 'Nix',
    ramp: ['#0a0d2a', '#232a6b', '#4a52b8', '#9094f4', '#fff2c0'],
    accent: '#fff2c0',
    shape: 'star', motion: 'twinkle',
    hint: 'Estrelinhas que piscam e flutuam.'
  },
  tartaro: {
    key: 'tartaro', name: 'Tártaro',
    ramp: ['#2a0806', '#8a3a14', '#da6420', '#ffa830', '#fff27a'],
    accent: '#3a1208',
    shape: 'ember', motion: 'rise',
    hint: 'Brasas que sobem tremendo.'
  },
  eter: {
    key: 'eter', name: 'Éter',
    ramp: ['#0e3840', '#2a7c86', '#4ccabe', '#aaf6e4', '#ffffff'],
    accent: '#fff6c8',
    shape: 'cross', motion: 'radiate',
    hint: 'Cruzes de luz que se abrem e flutuam.'
  },
  ananque: {
    key: 'ananque', name: 'Ananque',
    ramp: ['#3a2406', '#a4781a', '#e2b23c', '#ffe27c', '#fffbe0'],
    accent: '#7a5a14',
    shape: 'ring', motion: 'orbit',
    hint: 'Anéis dourados que giram em órbita.'
  },
  hemera: {
    key: 'hemera', name: 'Hemera',
    ramp: ['#5a2a08', '#d07a2a', '#ffbc4a', '#ffeaa0', '#ffffff'],
    accent: '#ffffff',
    shape: 'ray', motion: 'burst',
    hint: 'Raios de sol curtos que explodem para fora.'
  },
  fisico: {
    key: 'fisico', name: 'Físico',
    ramp: ['#24222e', '#5e5c70', '#a8a8bc', '#e4e4ee', '#ffffff'],
    accent: '#ffd25a',
    shape: 'spark', motion: 'sparks',
    hint: 'Faíscas de metal brancas e amarelas.'
  }
};

// Paletas de apoio usadas por varios efeitos.
export const PALETTES = {
  impact: ['#5a2a10', '#d8742a', '#ffc040', '#fff2a0', '#ffffff'],
  gold: ['#6a3e08', '#d89a1e', '#ffd440', '#fff4a8', '#ffffff'],
  dust: ['#3a2c22', '#6e5640', '#a08462', '#d4bc94', '#f2e6c8'],
  puff: ['#5a5868', '#9a98a8', '#cfcdd8', '#eeedf4', '#ffffff'],
  wood: ['#3a220e', '#6e4220', '#a0682e', '#d09a50'],
  steel: ['#2a2a38', '#5e6274', '#a4aabc', '#e6eaf2', '#ffffff'],
  poison: ['#1e2a0c', '#4a6a14', '#7ab82a', '#c4f05a', '#f4ffc0'],
  beast: ['#2a0810', '#6e1420', '#b8283a', '#f0604a', '#ffd0b0'],
  stone: ['#26222a', '#4e4852', '#7e7682', '#b4acb4', '#e6e0e4']
};

export const ELEMENT_KEYS = ['caos', 'gaia', 'ponto', 'erebo', 'nix', 'tartaro', 'eter', 'ananque', 'hemera'];

// Palavras que denunciam o elemento quando o campo "element" vem vazio.
const ELEMENT_WORDS = {
  caos: ['caos', 'caotic', 'entropi', 'arcan', 'distorc', 'ruptura'],
  gaia: ['gaia', 'vinha', 'raiz', 'raizes', 'planta', 'folha', 'espinho', 'natureza', 'floresta', 'terra', 'pedra', 'rocha', 'esporo', 'semente', 'casca'],
  ponto: ['ponto', 'agua', 'mar$', 'mares$', 'oceano', 'onda', 'mare$', 'gelo', 'nevoa', 'tempestade', 'trovao', 'relampago', 'chuva', 'congel', 'geada', 'eletric'],
  erebo: ['erebo', 'sombr', 'escurid', 'trevas', 'vazio', 'silencio', 'oculto', 'breu'],
  nix: ['nix', 'noite', 'sonho', 'pesadelo', 'sono', 'estrela', 'lua$', 'lunar', 'onir'],
  tartaro: ['tartaro', 'fogo', 'chama', 'brasa', 'cinza', 'inferno', 'queima', 'incendi', 'lava', 'corrup', 'abism'],
  eter: ['eter', 'celest', 'divin', 'sagrad', 'cura', 'bencao', 'benca', 'santo$', 'santa$', 'esperanca', 'luz celestial'],
  ananque: ['ananque', 'destino', 'tempo', 'ordem', 'relogio', 'inevit', 'fado', 'ampulheta'],
  hemera: ['hemera', 'sol$', 'solar', 'dia$', 'aurora', 'radiante', 'luz do dia', 'alvorada']
};

// Aceita "Érebo", "erebo", "EREBO" ou a chave; devolve a chave ou null.
export function elementKey(value) {
  const n = normalize(value);
  if (!n) return null;
  if (ELEMENTS[n]) return n;
  for (const key of ELEMENT_KEYS) if (normalize(ELEMENTS[key].name) === n) return key;
  if (n === 'fisico' || n === 'nenhum') return 'fisico';
  return null;
}

// O nome pesa mais: "Explosao de Cinzas ... onda de calor" e Tartaro, nao Ponto.
export function guessElement(name, rest = '') {
  let best = null;
  let score = 0;
  for (const key of ELEMENT_KEYS) {
    const s = ELEMENT_WORDS[key].reduce((acc, w) => acc + (hasWord(name, w) ? 3 : 0) + (hasWord(rest, w) ? 1 : 0), 0);
    if (s > score) { best = key; score = s; }
  }
  return best;
}

export function getElement(value) {
  return ELEMENTS[elementKey(value) || 'fisico'];
}
