// Familias de animacao. Cada arma/magia/ataque de monstro cai em UMA familia;
// a familia define o "verbo" do golpe (como o golpe viaja e como ele bate),
// e o elemento define a cor/forma/movimento das particulas.
//
// Campos da receita:
//   action  -> desenho da fase de acao (rastro): slash, thrust, smash, spin, dash, whip,
//              punch, claw, shield, xslash, heavy, pole, arrow, bolt, throw, stone,
//              orb, beam, lob, touch, rise, ripple, wisp, blink, bite, breath, sting
//   impact  -> desenho do impacto: cut, pierce, crush, pow, claw, bash, burst, blast,
//              heal, terrain, bind, curse, arrive, bite, poison
//   windup  -> ms de antecipacao; actionMs -> ms da acao (ou speed em celulas/s
//              para projeteis); lunge -> quanto o atacante avanca, em celulas;
//   shake   -> tremor base em pixels do efeito; hitstop -> congela ~60 ms no impacto.
//   keywords-> palavras (sem acento) que puxam esta familia na classificacao.

const melee = (id, label, extra) => ({ id, label, group: 'corpo', intent: 'ataque', hitstop: true, shake: 1, lunge: 0.35, windup: 110, actionMs: 110, ...extra });
const ranged = (id, label, extra) => ({ id, label, group: 'distancia', intent: 'ataque', hitstop: true, shake: 1, lunge: -0.08, windup: 160, speed: 14, ...extra });
const magic = (id, label, extra) => ({ id, label, group: 'magia', intent: 'ataque', hitstop: true, shake: 1, lunge: 0.05, windup: 220, speed: 9, ...extra });
const beast = (id, label, extra) => ({ id, label, group: 'monstro', intent: 'ataque', hitstop: true, shake: 1, lunge: 0.4, windup: 140, actionMs: 120, palette: 'beast', ...extra });

export const FAMILIES = [
  // --- corpo a corpo (12) ---
  melee('corte', 'Corte', { action: 'slash', impact: 'cut', keywords: ['espada', 'sabre', 'cimitarra', 'adaga', 'faca', 'machado', 'machadinha', 'foice', 'katana', 'lamina', 'corte', 'cortar', 'talho', 'fatia', 'gume', 'cutelo'] }),
  melee('estocada', 'Estocada', { action: 'thrust', impact: 'pierce', actionMs: 80, lunge: 0.45, keywords: ['estocada', 'rapieira', 'florete', 'estoque', 'perfur', 'punhal', 'estocar', 'furar', 'espetar', 'investida certeira'] }),
  melee('esmagamento', 'Esmagamento', { action: 'smash', impact: 'crush', windup: 160, shake: 2, keywords: ['maca', 'martelo', 'clava', 'porrete', 'mangual', 'cajado', 'bordao', 'esmag', 'marreta', 'tacape', 'malho', 'cacete'] }),
  melee('giratorio', 'Golpe giratório', { action: 'spin', impact: 'cut', windup: 140, actionMs: 200, lunge: 0.1, keywords: ['girat', 'redemoinho', 'rodopio', 'giro', 'turbilhao', 'circular', 'ciclone', 'varredura'] }),
  melee('investida', 'Investida', { action: 'dash', impact: 'crush', windup: 150, actionMs: 140, lunge: 1, shake: 2, keywords: ['investida', 'carga', 'avanco', 'arremetida', 'atropel', 'encontrao', 'trombada', 'ombrada'] }),
  melee('chicotada', 'Chicotada', { action: 'whip', impact: 'cut', windup: 130, actionMs: 170, lunge: 0.1, keywords: ['chicote', 'acoite', 'chicotada', 'laco', 'corrente', 'mangual de corrente', 'flagelo'] }),
  melee('soco', 'Soco / manopla', { action: 'punch', impact: 'pow', windup: 90, actionMs: 70, lunge: 0.5, keywords: ['soco', 'punho', 'manopla', 'socar', 'murro', 'chute', 'joelhada', 'cotovelada', 'desarmad', 'briga', 'cabecada'] }),
  melee('garra', 'Garra', { action: 'claw', impact: 'claw', windup: 100, actionMs: 120, keywords: ['garra', 'unha', 'arranh', 'luva de garras'] }),
  melee('escudo', 'Escudo', { intent: 'defesa', action: 'shield', impact: 'bash', windup: 140, actionMs: 110, lunge: 0.3, shake: 2, keywords: ['escudo', 'bloque', 'guard', 'defes', 'aparar', 'broquel', 'egide', 'proteg', 'contra ataque'] }),
  melee('corte-duplo', 'Corte duplo', { action: 'xslash', impact: 'cut', windup: 100, actionMs: 190, keywords: ['duplo', 'dupla', 'duas armas', 'ambidest', 'gemea', 'par de', 'rajada', 'cruzado', 'x$'] }),
  melee('montante', 'Golpe pesado / montante', { action: 'heavy', impact: 'crush', windup: 260, actionMs: 130, lunge: 0.3, shake: 3, keywords: ['montante', 'espadao', 'espada grande', 'machado grande', 'grande', 'pesad', 'duas maos', 'executor', 'decapit', 'bastarda', 'colossal', 'brutal'] }),
  melee('haste', 'Arma de haste', { action: 'pole', impact: 'pierce', windup: 150, actionMs: 110, lunge: 0.2, keywords: ['lanca', 'alabarda', 'tridente', 'pique', 'glaive', 'haste', 'arpao', 'bisarma', 'partasana', 'naginata'] }),

  // --- distancia (4) ---
  ranged('flecha', 'Flecha de arco', { action: 'arrow', impact: 'pierce', speed: 16, keywords: ['arco', 'flecha', 'arqueir', 'disparo de arco'] }),
  ranged('virote', 'Virote de besta', { action: 'bolt', impact: 'pierce', windup: 120, speed: 22, shake: 2, keywords: ['besta', 'virote', 'balestra', 'arbalest'] }),
  ranged('arremesso', 'Arremesso / dardo / azagaia', { action: 'throw', impact: 'pierce', speed: 11, keywords: ['dardo', 'azagaia', 'arremess', 'javelin', 'shuriken', 'pilum', 'faca de arremesso', 'machadinha de arremesso', 'lancar'] }),
  ranged('funda', 'Pedra de funda', { action: 'stone', impact: 'crush', speed: 12, keywords: ['funda', 'pedra', 'seixo', 'estilingue', 'bodoque', 'pedregulho'] }),

  // --- formas de magia (9) ---
  magic('projetil', 'Projétil', { action: 'orb', impact: 'burst', keywords: ['missil', 'dardo', 'seta', 'bola', 'orbe', 'esfera', 'projetil', 'disparo', 'tiro', 'estilhaco', 'lanca', 'flecha', 'bala', 'cometa'] }),
  magic('raio', 'Raio', { action: 'beam', impact: 'burst', actionMs: 90, keywords: ['raio', 'feixe', 'relampago', 'trovao', 'jato', 'descarga', 'faisca', 'laser', 'corisco'] }),
  magic('area', 'Área', { action: 'lob', impact: 'blast', speed: 7, shake: 3, keywords: ['explosao', 'bola de fogo', 'chuva', 'onda', 'tempestade', 'nevasca', 'circulo', 'area', 'todos', 'erupcao', 'nuvem', 'cone', 'detona', 'impacto'] }),
  magic('toque', 'Toque', { action: 'touch', impact: 'burst', windup: 180, actionMs: 110, lunge: 0.4, keywords: ['toque', 'tocar', 'mao', 'palma', 'agarr', 'segurar', 'beijo'] }),
  magic('bencao', 'Bênção / cura', { intent: 'suporte', action: 'rise', impact: 'heal', hitstop: false, shake: 0, actionMs: 260, lunge: 0, keywords: ['bencao', 'benca', 'cura', 'curar', 'sagrad', 'prece', 'oracao', 'abencoa', 'restaur', 'regenera', 'ferida', 'protecao', 'aura', 'inspira', 'vigor', 'alivio', 'graca'] }),
  magic('terreno', 'Terreno', { intent: 'controle', action: 'ripple', impact: 'terrain', actionMs: 260, shake: 2, keywords: ['vinha', 'raiz', 'raizes', 'espinho', 'terreno', 'chao', 'solo', 'muralha', 'parede', 'pantano', 'lama', 'brota', 'estaca', 'areia movedica', 'terremoto', 'fenda'] }),
  magic('controle', 'Controle', { intent: 'controle', action: 'orb', impact: 'bind', shake: 0, keywords: ['prend', 'paralis', 'enraiz', 'atordo', 'sono', 'dormir', 'corrente', 'amarra', 'imobiliz', 'congela', 'lentid', 'medo', 'charme', 'encant', 'silenci', 'cegar', 'prisao', 'grilh'] }),
  magic('maldicao', 'Maldição', { intent: 'controle', action: 'wisp', impact: 'curse', speed: 6, shake: 1, keywords: ['maldic', 'maldi', 'amaldi', 'praga', 'abraco', 'drena', 'definha', 'condena', 'agouro', 'sina', 'pacto', 'apodrec', 'murcha', 'vazio'] }),
  magic('movimento', 'Movimento', { intent: 'movimento', action: 'blink', impact: 'arrive', hitstop: false, shake: 0, actionMs: 180, lunge: 0, keywords: ['teleport', 'salto', 'passo', 'piscar', 'blink', 'voo', 'voar', 'desloca', 'caminhante', 'correr', 'velocidade', 'esquiva', 'recua', 'atravess', 'portal'] }),

  // --- ataques de monstro (7) ---
  beast('mordida', 'Mordida', { action: 'bite', impact: 'bite', windup: 160, actionMs: 110, keywords: ['mordida', 'morde', 'presa', 'dentada', 'abocanha', 'mandibula', 'mastig', 'bicada'] }),
  beast('garra-fera', 'Garra (monstro)', { action: 'claw', impact: 'claw', keywords: ['garra', 'arranh', 'unha', 'rasg', 'dilacer'] }),
  beast('investida-fera', 'Investida (monstro)', { action: 'dash', impact: 'crush', windup: 180, actionMs: 150, lunge: 1, shake: 3, keywords: ['investida', 'chifr', 'carga', 'atropel', 'marrada', 'galope', 'avanco', 'chifrada', 'trombada'] }),
  beast('sopro', 'Sopro', { action: 'breath', impact: 'burst', windup: 220, actionMs: 380, lunge: 0.05, shake: 2, palette: null, defaultElement: 'tartaro', keywords: ['sopro', 'bafo', 'baforada', 'halito', 'cusp', 'jato', 'explosao', 'onda', 'rugido', 'grito', 'uivo'] }),
  beast('ferrao', 'Ferrão', { action: 'sting', impact: 'poison', windup: 150, actionMs: 90, lunge: 0.5, palette: 'poison', keywords: ['ferrao', 'picada', 'ferroa', 'cauda', 'veneno', 'agulha', 'espinho', 'peconha', 'toxin'] }),
  beast('pancada', 'Pancada', { action: 'smash', impact: 'crush', windup: 180, shake: 2, palette: null, keywords: ['pancada', 'soco', 'punho', 'clava', 'esmag', 'pisao', 'pisote', 'tapa', 'golpe', 'martelo', 'pata', 'cauda pesada'] }),
  beast('magia-fera', 'Magia (monstro)', { action: 'orb', impact: 'burst', windup: 240, speed: 8, lunge: 0.05, palette: null, defaultElement: 'caos', keywords: ['magia', 'feitic', 'raio', 'maldic', 'sombra', 'energia', 'encant', 'conjur', 'olhar', 'grito sombrio'] })
];

export const FAMILY_BY_ID = Object.fromEntries(FAMILIES.map((f) => [f.id, f]));

export const GROUPS = [
  { id: 'corpo', label: 'Corpo a corpo' },
  { id: 'distancia', label: 'Distância' },
  { id: 'magia', label: 'Magia' },
  { id: 'monstro', label: 'Monstro' }
];

export function familiesOf(group) {
  return FAMILIES.filter((f) => f.group === group);
}

export function getFamily(id) {
  return FAMILY_BY_ID[id] || FAMILY_BY_ID.corte;
}

export const RESULTS = [
  { id: 'hit', label: 'Acerto' },
  { id: 'crit', label: 'Crítico' },
  { id: 'miss', label: 'Erro' },
  { id: 'fumble', label: 'Falha (1 natural)' },
  { id: 'downed', label: 'Caído' }
];
