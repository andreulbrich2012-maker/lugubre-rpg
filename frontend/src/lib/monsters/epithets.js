// Epitetos (variantes): cada um tem um "humor" que puxa a paleta (tint/amt),
// 1-2 detalhes pintados por cima de qualquer base e um degrau de poder (tier)
// que soma no nivel. As palavras estao normalizadas (minusculas, sem acento).
// glow/eye: cor do brilho e dos olhos da variante (chamas, gelo, luz...).

export const EPITHETS = [
  { id: 'mato', words: ['do mato', 'da mata', 'da floresta', 'silvestre', 'do bosque', 'musgoso', 'musgosa', 'do pantano', 'do brejo', 'verdejante'], tint: '#5e8a3a', amt: 0.22, tier: 0, details: ['moss'] },
  { id: 'selvagem', words: ['selvagem', 'feroz', 'raivoso', 'raivosa', 'furioso', 'furiosa', 'bravo', 'brava', 'faminto', 'faminta', 'voraz', 'enfurecido', 'cacador', 'cacadora', 'predador'], tint: '#a0502a', amt: 0.14, tier: 1, details: ['scar', 'glowEyes'], glow: '#ffd040' },
  { id: 'montanha', words: ['da montanha', 'da rocha', 'de pedra', 'rochoso', 'rochosa', 'petreo', 'das cavernas', 'da caverna', 'das colinas', 'do penhasco'], tint: '#8a8478', amt: 0.3, tier: 1, details: ['armor', 'moss'], armor: '#8a8478' },
  { id: 'sombrio', words: ['sombrio', 'sombria', 'das sombras', 'da sombra', 'umbral', 'obscuro', 'obscura', 'tenebroso', 'tenebrosa', 'das trevas', 'negro', 'negra', 'escuro', 'escura'], tint: '#3e3060', amt: 0.42, tier: 1, details: ['glowEyes', 'spikes'], glow: '#c8a0ff' },
  { id: 'anciao', words: ['anciao', 'ancia', 'antigo', 'antiga', 'ancestral', 'velho', 'velha', 'veterano', 'veterana', 'milenar', 'primevo', 'primeva', 'decrepito'], tint: '#a89a88', amt: 0.18, tier: 2, details: ['horns', 'scar'] },
  { id: 'alfa', words: ['alfa', 'lider', 'chefe', 'matriarca', 'patriarca', 'rei', 'rainha', 'lorde', 'senhor', 'senhora', 'imperador', 'imperatriz', 'soberano', 'soberana', 'supremo', 'suprema', 'principe', 'princesa', 'mestre', 'general'], tint: '#d0a440', amt: 0.08, tier: 3, details: ['crown', 'glowEyes'], glow: '#ffe070' },
  { id: 'gigante', words: ['gigante', 'colossal', 'grande', 'maior', 'enorme', 'titanico', 'titanica', 'monstruoso', 'monstruosa', 'brutamontes', 'bruto'], tint: '#7a5a4a', amt: 0.08, tier: 2, details: ['armor', 'horns'] },
  { id: 'pequeno', words: ['pequeno', 'pequena', 'filhote', 'jovem', 'menor', 'bebe', 'minusculo', 'minuscula', 'novato', 'aprendiz', 'larval'], tint: '#f0e0c0', amt: 0.1, tier: -1, details: [] },
  { id: 'flamejante', words: ['flamejante', 'igneo', 'ignea', 'em chamas', 'ardente', 'infernal', 'das chamas', 'de fogo', 'em brasa', 'abrasador', 'vulcanico', 'vulcanica', 'das cinzas', 'incandescente', 'do inferno'], tint: '#d8582a', amt: 0.36, tier: 1, details: ['flames', 'glowEyes'], glow: '#ffb040' },
  { id: 'gelido', words: ['gelido', 'gelida', 'invernal', 'glacial', 'congelado', 'congelada', 'da neve', 'do gelo', 'de gelo', 'polar', 'artico', 'artica', 'boreal', 'nevado', 'nevada', 'do inverno'], tint: '#9ad0f0', amt: 0.42, tier: 1, details: ['frost', 'crystals'], glow: '#c8f4ff', crystal: '#a8e0ff' },
  { id: 'sangrento', words: ['sangrento', 'sangrenta', 'sanguinario', 'sanguinaria', 'rubro', 'rubra', 'carmesim', 'de sangue', 'escarlate', 'vampirico', 'vampirica', 'sedento', 'sedenta'], tint: '#b02a3a', amt: 0.36, tier: 1, details: ['scar', 'glowEyes'], glow: '#ff4a4a' },
  { id: 'putrido', words: ['putrido', 'putrida', 'podre', 'pestilento', 'pestilenta', 'corrompido', 'corrompida', 'corrupto', 'corrupta', 'infecto', 'infecta', 'doente', 'toxico', 'toxica', 'venenoso', 'venenosa', 'peconhento', 'peconhenta', 'apodrecido', 'pustulento', 'da praga', 'contaminado'], tint: '#8aa040', amt: 0.36, tier: 1, details: ['drip', 'glowEyes'], glow: '#d0ff50' },
  { id: 'espectral', words: ['espectral', 'fantasmagorico', 'fantasmagorica', 'etereo', 'eterea', 'fantasma', 'assombrado', 'assombrada', 'translucido', 'translucida', 'penado', 'morto', 'morta', 'amaldicoado das almas'], tint: '#a0c0e0', amt: 0.5, tier: 1, details: ['aura', 'glowEyes'], glow: '#c8f8ff', aura: '#a8e8ff' },
  { id: 'sagrado', words: ['sagrado', 'sagrada', 'divino', 'divina', 'celeste', 'radiante', 'luminoso', 'luminosa', 'abencoado', 'abencoada', 'santo', 'santa', 'dourado', 'dourada', 'solar', 'glorioso', 'gloriosa', 'puro', 'pura', 'de hemera', 'diurno'], tint: '#f0d070', amt: 0.3, tier: 2, details: ['halo', 'aura'], glow: '#fff4b0', aura: '#fff0a0' },
  { id: 'abissal', words: ['abissal', 'das profundezas', 'profundo', 'profunda', 'afogado', 'afogada', 'submerso', 'submersa', 'marinho', 'marinha', 'do abismo', 'do mar', 'dos mares', 'oceanico', 'das mares', 'salgado'], tint: '#2a4a8a', amt: 0.4, tier: 1, details: ['glowEyes', 'drip'], glow: '#80fff0', poison: '#4a9ab0' },
  { id: 'tempestuoso', words: ['tempestuoso', 'tempestuosa', 'do trovao', 'trovejante', 'eletrico', 'eletrica', 'da tempestade', 'fulminante', 'dos raios', 'da tormenta', 'relampago'], tint: '#5a6ab0', amt: 0.32, tier: 1, details: ['runes', 'glowEyes'], glow: '#f8f070' },
  { id: 'acorrentado', words: ['acorrentado', 'acorrentada', 'aprisionado', 'aprisionada', 'preso', 'presa', 'cativo', 'cativa', 'amaldicoado', 'amaldicoada', 'maldito', 'maldita', 'condenado', 'condenada', 'banido', 'banida'], tint: '#6a5a6a', amt: 0.2, tier: 1, details: ['chains', 'glowEyes'], glow: '#ff6a3a' },
  { id: 'blindado', words: ['blindado', 'blindada', 'encouracado', 'encouracada', 'de ferro', 'de aco', 'de bronze', 'armado', 'armada', 'protegido', 'couracado', 'escudado', 'de guerra', 'guerreiro', 'guerreira', 'soldado'], tint: '#8a8a9a', amt: 0.12, tier: 1, details: ['armor', 'scar'], armor: '#9aa4b2' },
  { id: 'cristalino', words: ['cristalino', 'cristalina', 'de cristal', 'prismatico', 'prismatica', 'gemado', 'de gema', 'de quartzo', 'de ametista', 'de diamante'], tint: '#a0d8f0', amt: 0.28, tier: 1, details: ['crystals', 'glowEyes'], glow: '#e0faff', crystal: '#b8a0ff' },
  { id: 'arcano', words: ['arcano', 'arcana', 'runico', 'runica', 'mistico', 'mistica', 'magico', 'magica', 'encantado', 'encantada', 'astral', 'conjurado', 'conjurada', 'feiticeiro', 'feiticeira', 'bruxo', 'bruxa'], tint: '#9a4ad0', amt: 0.3, tier: 1, details: ['runes', 'glowEyes'], glow: '#f0b0ff' },
  { id: 'esquecido', words: ['esquecido', 'esquecida', 'silencioso', 'silenciosa', 'perdido', 'perdida', 'sem nome', 'vazio', 'vazia', 'oco', 'oca', 'mudo', 'muda', 'apagado', 'do esquecimento', 'do silencio'], tint: '#7a7a8a', amt: 0.45, tier: 1, details: ['aura', 'blind'], aura: '#9a90b8', desat: 0.45 },
  { id: 'noturno', words: ['noturno', 'noturna', 'lunar', 'da noite', 'da lua', 'crepuscular', 'estrelado', 'estrelada', 'da meia-noite', 'da meia noite', 'do luar'], tint: '#3a4a9a', amt: 0.36, tier: 1, details: ['glowEyes', 'runes'], glow: '#e0f0ff' },
  { id: 'onirico', words: ['onirico', 'onirica', 'dos sonhos', 'sonhador', 'sonhadora', 'do pesadelo', 'dos pesadelos', 'delirante', 'alucinado', 'hipnotico', 'hipnotica', 'adormecido', 'sonambulo'], tint: '#c070d0', amt: 0.32, tier: 1, details: ['aura', 'glowEyes'], glow: '#ffc0f0', aura: '#e0a0ff' },
  { id: 'eterno', words: ['eterno', 'eterna', 'do destino', 'do tempo', 'imortal', 'inevitavel', 'perpetuo', 'perpetua', 'fatidico', 'fatidica', 'atemporal', 'da ordem', 'profetico'], tint: '#c49a2a', amt: 0.26, tier: 2, details: ['runes', 'halo'], glow: '#ffe890' },
  { id: 'caotico', words: ['caotico', 'caotica', 'do caos', 'instavel', 'mutante', 'distorcido', 'distorcida', 'aberrante', 'deformado', 'deformada', 'retorcido', 'retorcida', 'insano', 'insana', 'louco', 'louca'], tint: '#c03a7a', amt: 0.3, tier: 1, details: ['spikes', 'glowEyes'], glow: '#a0ff60' },
  { id: 'cego', words: ['cego', 'cega', 'sem olhos', 'vendado', 'vendada'], tint: '#9a8a8a', amt: 0.1, tier: 0, details: ['blind'] },
  { id: 'errante', words: ['errante', 'vagante', 'andarilho', 'andarilha', 'solitario', 'solitaria', 'nomade', 'peregrino'], tint: '#8a7a6a', amt: 0.1, tier: 0, details: ['scar'] },
  { id: 'ganancioso', words: ['ganancioso', 'gananciosa', 'avarento', 'avarenta', 'do tesouro', 'rico', 'rica', 'de ouro'], tint: '#d0a440', amt: 0.18, tier: 1, details: ['crown'] },
  { id: 'primordial', words: ['primordial', 'original', 'arquetipo', 'primeiro', 'primeira', 'avatar'], tint: '#ffffff', amt: 0, tier: 3, details: ['aura', 'runes', 'glowEyes'] }
];

export const EPITHET_BY_ID = Object.fromEntries(EPITHETS.map((e) => [e.id, e]));

// Humor padrao por elemento, para epitetos desconhecidos (ainda assim varia).
export const ELEMENT_MOOD = {
  Caos: ['caotico', 'arcano', 'selvagem'], Gaia: ['mato', 'selvagem', 'montanha'], Ponto: ['abissal', 'tempestuoso', 'putrido'],
  'Érebo': ['sombrio', 'esquecido', 'espectral'], Nix: ['noturno', 'onirico', 'gelido'], 'Tártaro': ['flamejante', 'acorrentado', 'putrido'],
  'Éter': ['sagrado', 'espectral', 'cristalino'], Ananque: ['eterno', 'blindado', 'cristalino'], Hemera: ['sagrado', 'flamejante', 'cristalino']
};

// Tom de cada Primordial (puxa a paleta da base quando o elemento do cadastro difere).
export const ELEMENT_TINT = {
  Caos: '#c03a6a', Gaia: '#5a8a3a', Ponto: '#2e6aa8', 'Érebo': '#4a3a7a', Nix: '#2e3a8a',
  'Tártaro': '#b8481e', 'Éter': '#7ad0c8', Ananque: '#c49a2a', Hemera: '#f0c040'
};
export const ELEMENT_GLOW = {
  Caos: '#a0ff60', Gaia: '#d0f070', Ponto: '#80fff0', 'Érebo': '#c8a0ff', Nix: '#e0f0ff',
  'Tártaro': '#ffb040', 'Éter': '#fff4b0', Ananque: '#ffe890', Hemera: '#fff0a0'
};
