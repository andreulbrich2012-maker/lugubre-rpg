// Classificacao automatica de magias e tecnicas a partir do registro da biblioteca
// (power_library) ou de um ataque/magia da ficha. O seed de producao nao vive neste
// repositorio, entao o icone precisa sair so dos campos: nome, tipo, elemento, alcance,
// dano, duracao e descricao. Tudo e comparado sem acento e em minusculas.

// ---- texto ----
export function norm(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Aceita tanto o registro do banco (snake_case) quanto objetos da ficha em pt-BR.
function pick(power, ...keys) {
  if (!power || typeof power !== 'object') return '';
  for (const k of keys) if (power[k] != null && power[k] !== '') return power[k];
  return '';
}

export function fieldsOf(power) {
  const p = typeof power === 'string' ? { name: power } : power || {};
  return {
    name: norm(pick(p, 'name', 'nome', 'custom_name', 'title')),
    type: norm(pick(p, 'type', 'tipo')),
    element: pick(p, 'element', 'elemento'),
    range: norm(pick(p, 'range', 'alcance')),
    damage: norm(pick(p, 'damage_formula', 'damageFormula', 'damage', 'dano', 'custom_damage_formula')),
    duration: norm(pick(p, 'duration', 'duracao')),
    description: norm(pick(p, 'description', 'descricao', 'desc', 'custom_description')),
    klass: norm(pick(p, 'recommended_class', 'recommendedClass', 'classe'))
  };
}

// ---- elementos ----
export const ELEMENT_IDS = ['caos', 'gaia', 'ponto', 'erebo', 'nix', 'tartaro', 'eter', 'ananque', 'hemera'];

export function elementKey(element) {
  const n = norm(element);
  return ELEMENT_IDS.includes(n) ? n : null;
}

// ---- formas de entrega (magias) ----
export const SPELL_FORMS = ['projetil', 'raio', 'area', 'cura', 'escudo', 'controle', 'maldicao', 'movimento', 'invocacao', 'bencao', 'toque', 'terreno'];
// ---- manobras (tecnicas e ataques de arma) ----
export const MANEUVERS = ['golpe', 'investida', 'defesa', 'giro', 'perfuracao', 'arremesso', 'tiro'];

export const FORM_LABELS = {
  projetil: 'Projétil',
  raio: 'Raio',
  area: 'Área',
  cura: 'Cura',
  escudo: 'Proteção',
  controle: 'Controle',
  maldicao: 'Maldição',
  movimento: 'Movimento',
  invocacao: 'Invocação',
  bencao: 'Bênção',
  toque: 'Toque',
  terreno: 'Terreno',
  golpe: 'Golpe',
  investida: 'Investida',
  defesa: 'Defesa',
  giro: 'Giro',
  perfuracao: 'Perfuração',
  arremesso: 'Arremesso',
  tiro: 'Tiro'
};

// Radicais pt-BR (sem acento). Casam no inicio de palavra para pegar as flexoes
// ("imobiliz" -> imobiliza, imobilizado...). A ordem do objeto e o desempate.
const FORM_WORDS = {
  controle: ['corrente', 'grilh', 'raiz', 'raize', 'vinha', 'cipo', 'prende', 'prender', 'prisao', 'imobiliz', 'agarr', 'abraco', 'enred', 'teia', 'paralis', 'congel', 'aprision', 'amarr', 'laco', 'atordo', 'adormec', 'lentid', 'algema', 'tentacul', 'enrosc', 'constring'],
  cura: ['cura', 'curar', 'curat', 'regener', 'restaur', 'sara$', 'sarar', 'cicatriz', 'revigor', 'recupera', 'vitalidade', 'balsamo', 'ressusc', 'reviv', 'remend'],
  escudo: ['escudo', 'barreira', 'protec', 'proteg', 'muralha', 'egide', 'armadura', 'couraca', 'bastiao', 'redoma', 'abrigo', 'resguard', 'pele de', 'blindag', 'refugio', 'baluarte'],
  invocacao: ['invoca', 'convoca', 'evoca', 'servo', 'familiar', 'espirito', 'elemental', 'lacaio', 'golem', 'esqueleto', 'criatura', 'aliado', 'lobo', 'corvo', 'enxame', 'fantasma', 'espectro', 'clone', 'duplic', 'sentinela'],
  movimento: ['teleport', 'passo', 'salto', 'saltar', 'piscar', 'translad', 'translo', 'voo', 'voar', 'levit', 'desloc', 'atravess', 'portal', 'fuga', 'fugir', 'velocid', 'rapidez', 'corrida', 'impulso', 'desliz', 'esquiv', 'evasao', 'empurr', 'recuo', 'pes ligeiros'],
  terreno: ['terreno', 'solo', 'chao', 'pantano', 'lamacal', 'lama', 'fenda', 'terremoto', 'tremor', 'campo', 'zona', 'circulo', 'glifo', 'runa', 'armadilha', 'nevoa', 'neblina', 'pilar', 'estalagm', 'muro de', 'parede de', 'poca$'],
  raio: ['raio', 'relampag', 'feixe', 'descarga', 'trovao', 'trovej', 'faisca', 'eletric', 'fulmin', 'centelha', 'corisco'],
  area: ['explos', 'explod', 'onda', 'tempestade', 'chuva', 'nova$', 'erupc', 'meteoro', 'inferno', 'vortice', 'turbilh', 'furacao', 'tornado', 'nevasca', 'avalanche', 'deton', 'area', 'cone', 'todos os inimigos', 'todos os alvos', 'ao redor', 'em volta'],
  maldicao: ['maldic', 'amaldic', 'praga', 'corromp', 'corrup', 'drena', 'dreno', 'sanguessug', 'pesadelo', 'medo', 'terror', 'pavor', 'veneno', 'envenen', 'apodrec', 'enfraquec', 'murch', 'ruina', 'condena', 'definh', 'agonia', 'vazio', 'macula', 'doenca', 'peste', 'necro', 'morte', 'sina$', 'mau agouro', 'sangra'],
  bencao: ['bencao', 'abenco', 'graca', 'aura', 'inspir', 'fortalec', 'vigor', 'bonus', 'encant', 'consagr', 'sagrad', 'benefic', 'favor', 'prece', 'oracao', 'hino', 'canto', 'aprimor', 'aument', 'foco', 'presci', 'clarivid', 'despert', 'furia', 'bravura', 'coragem'],
  toque: ['toque', 'tocar', 'toca$', 'mao$', 'maos$', 'palma', 'beijo', 'punho', 'garra', 'corpo a corpo', 'contato', 'adjacente'],
  projetil: ['dardo', 'flecha', 'seta', 'bola', 'esfera', 'orbe', 'missil', 'misse', 'lanca', 'estilhac', 'projetil', 'projete', 'disparo', 'dispara', 'cometa', 'lamina', 'espinho', 'bala$', 'arremess', 'agulha', 'tiro', 'bolide']
};

const MANEUVER_WORDS = {
  defesa: ['defes', 'defensiv', 'guarda', 'guardia', 'bloque', 'aparar', 'apara', 'proteg', 'protet', 'escudo', 'contra-ataque', 'contra ataque', 'contragolpe', 'revid', 'firme', 'muralha', 'sentinela'],
  giro: ['giro', 'girat', 'rodopi', 'redemoinho', 'turbilh', 'varred', 'varre', 'ciclone', 'circular', 'em volta', 'ao redor', 'todos os inimigos', 'roda$', 'ceifa'],
  investida: ['investid', 'carga', 'avanc', 'arremetid', 'atropel', 'embest', 'salto', 'mergulh', 'corrida', 'disparada', 'ataque rapido', 'impeto'],
  arremesso: ['arremess', 'lancar', 'lanca a', 'lanca o', 'atira a', 'atira o', 'joga$', 'bumerang', 'ricochet'],
  tiro: ['tiro', 'disparo', 'dispara', 'flecha', 'seta', 'virote', 'rajada', 'salva$', 'mira', 'certeir', 'pedrada', 'atirador'],
  perfuracao: ['perfur', 'estocad', 'transpass', 'empal', 'penetr', 'furar', 'lancad', 'ponto vital', 'pontaria', 'ponta', 'precis', 'trespass'],
  golpe: ['golpe', 'corte', 'cortar', 'talho', 'pancad', 'esmag', 'cutil', 'retalh', 'fend', 'decap', 'ataque', 'pesado', 'brutal']
};

// ---- armas (29 do catalogo) ----
// Ordem importa: nomes compostos antes dos genericos ("besta leve" antes de "besta").
export const WEAPONS = [
  { id: 'faca-de-caca', label: 'Faca de caça', re: /\bfaca\b/, maneuver: 'golpe' },
  { id: 'adaga', label: 'Adaga', re: /\b(adagas?|punhal|punhais)\b/, maneuver: 'golpe' },
  { id: 'espada-curta', label: 'Espada curta', re: /\b(espada curta|gladio)\b/, maneuver: 'golpe' },
  { id: 'montante', label: 'Montante', re: /\b(montante|espadao|espada grande|espada de duas maos|claymore)\b/, maneuver: 'golpe' },
  { id: 'espada-longa', label: 'Espada longa', re: /\b(espada longa|espadas?)\b/, maneuver: 'golpe' },
  { id: 'sabre', label: 'Sabre', re: /\b(sabre|cimitarra|alfanje)\b/, maneuver: 'golpe' },
  { id: 'rapieira', label: 'Rapieira', re: /\b(rapieira|florete|estoque)\b/, maneuver: 'perfuracao' },
  { id: 'machadinha', label: 'Machadinha', re: /\bmachadinhas?\b/, maneuver: 'golpe' },
  { id: 'machado-de-guerra', label: 'Machado de guerra', re: /\bmachados?\b/, maneuver: 'golpe' },
  { id: 'martelo-de-guerra', label: 'Martelo de guerra', re: /\bmartelos?\b/, maneuver: 'golpe' },
  { id: 'mangual', label: 'Mangual', re: /\bmangua(l|is)\b/, maneuver: 'golpe' },
  { id: 'maca', label: 'Maça', re: /\b(maca|macas|clava|porrete|cetro)\b/, maneuver: 'golpe' },
  { id: 'alabarda', label: 'Alabarda', re: /\b(alabarda|archa|glaive)\b/, maneuver: 'golpe' },
  { id: 'azagaia', label: 'Azagaia', re: /\b(azagaias?|dardo de arremesso|javelin)\b/, maneuver: 'arremesso' },
  { id: 'lanca', label: 'Lança', re: /\b(lancas?|tridente|pique)\b/, maneuver: 'perfuracao' },
  { id: 'gadanha', label: 'Gadanha', re: /\bgadanhas?\b/, maneuver: 'giro' },
  { id: 'foice', label: 'Foice', re: /\bfoices?\b/, maneuver: 'golpe' },
  { id: 'chicote', label: 'Chicote', re: /\b(chicotes?|acoite|relho)\b/, maneuver: 'golpe' },
  { id: 'cajado', label: 'Cajado', re: /\bcajados?\b/, maneuver: 'golpe' },
  { id: 'bordao', label: 'Bordão', re: /\b(bordao|bastao)\b/, maneuver: 'golpe' },
  { id: 'garras-de-ferro', label: 'Garras de ferro', re: /\bgarras?\b/, maneuver: 'golpe' },
  { id: 'manoplas', label: 'Manoplas', re: /\b(manoplas?|punhos?|socos?|luvas?|desarmado)\b/, maneuver: 'golpe' },
  { id: 'escudo', label: 'Escudo', re: /\bescudos?\b/, maneuver: 'defesa' },
  { id: 'arco-longo', label: 'Arco longo', re: /\barco longo\b/, maneuver: 'tiro' },
  { id: 'arco-curto', label: 'Arco curto', re: /\b(arco curto|arcos?)\b/, maneuver: 'tiro' },
  { id: 'besta-leve', label: 'Besta leve', re: /\bbesta leve\b/, maneuver: 'tiro' },
  { id: 'besta', label: 'Besta', re: /\b(besta pesada|besta|bestas)\b/, maneuver: 'tiro' },
  { id: 'funda', label: 'Funda', re: /\b(funda|estilingue|atiradeira)\b/, maneuver: 'tiro' },
  { id: 'dardos', label: 'Dardos', re: /\bdardos?\b/, maneuver: 'arremesso' }
];
export const WEAPON_IDS = WEAPONS.map((w) => w.id);

// Arma padrao quando a tecnica nao cita nenhuma: a arma tipica da classe do livro.
const CLASS_WEAPON = [
  [/cavaleir/, 'espada-longa'],
  [/paladin/, 'martelo-de-guerra'],
  [/atirador|arqueir|cacador/, 'arco-longo'],
  [/ladin/, 'adaga'],
  [/mago|feiticeir|bruxo/, 'cajado'],
  [/sacerdot|clerig/, 'maca'],
  [/monge|lutador/, 'manoplas'],
  [/barbar|guerreir/, 'machado-de-guerra']
];

export function findWeapon(text) {
  if (!text) return null;
  for (const w of WEAPONS) if (w.re.test(text)) return w.id;
  return null;
}

// Pontua listas de radicais: nome pesa mais que a descricao.
function scoreWords(table, name, rest) {
  const scores = {};
  for (const [id, words] of Object.entries(table)) {
    let s = 0;
    for (const w of words) {
      // radical terminado em '$' exige palavra inteira ("joga$" nao casa "jogador")
      const whole = w.endsWith('$');
      const stem = (whole ? w.slice(0, -1) : w).replace(/[-]/g, '[- ]?');
      const re = new RegExp(`(^|[^a-z])${stem}${whole ? '([^a-z]|$)' : ''}`);
      if (re.test(name)) s += 3;
      if (re.test(rest)) s += 1;
    }
    scores[id] = s;
  }
  return scores;
}

function best(scores, order, penalty = {}) {
  let top = null;
  let topScore = 0;
  for (const id of order) {
    const s = (scores[id] || 0) - (penalty[id] || 0);
    if (s > topScore) { top = id; topScore = s; }
  }
  return top;
}

const isDice = (s) => /\d*d\d+/.test(s) || /^\d+$/.test(s);
const isInstant = (s) => !s || /instant|imediat|^-$/.test(s);

function classifyManeuver(f, weapon) {
  const rest = `${f.description} ${f.range}`;
  // "raio de 3m" e alcance, nao arremesso; nada a tratar aqui, so o nome manda mais
  const scores = scoreWords(MANEUVER_WORDS, f.name, rest);
  // golpe e o generico: so vence quando nenhuma manobra especifica empatar com ele
  const m = best(scores, ['defesa', 'giro', 'investida', 'perfuracao', 'arremesso', 'tiro', 'golpe'], { golpe: 0.5 });
  if (m) {
    // arcos e bestas nao "golpeiam": a manobra generica vira tiro
    const w = WEAPONS.find((x) => x.id === weapon);
    if (m === 'golpe' && w && w.maneuver === 'tiro') return 'tiro';
    return m;
  }
  return WEAPONS.find((x) => x.id === weapon)?.maneuver || 'golpe';
}

function classifySpell(f) {
  // "raio de 3 metros" e um raio de area, nao um feixe
  const fix = (s) => s.replace(/\braio de (\d|um|uma|dois|duas|tres|quatro|cinco|seis)/g, 'area de $1');
  const name = fix(f.name);
  const rest = fix(`${f.description}`);
  const scores = scoreWords(FORM_WORDS, name, rest);

  // dicas dos campos estruturados
  if (/toque|corpo a corpo|adjacente|contato/.test(f.range)) scores.toque += 2;
  if (/pessoal|proprio|si mesmo|usuario|conjurador/.test(f.range)) { scores.bencao += 1; scores.escudo += 0.5; }
  if (/area|cone|raio de|explos|\bem volta/.test(f.range)) scores.area += 2;
  if (!f.damage && !isInstant(f.duration)) scores.bencao += 0.5;
  if (isDice(f.damage) && /longo|medio|distancia|\d+ ?m/.test(f.range)) scores.projetil += 0.5;

  const order = ['controle', 'cura', 'escudo', 'invocacao', 'movimento', 'terreno', 'raio', 'area', 'maldicao', 'bencao', 'toque', 'projetil'];
  const form = best(scores, order);
  if (form) return form;
  // sem pista nenhuma: dano a distancia vira projetil; dano colado vira toque;
  // efeito sem dano com duracao vira bencao
  if (/toque|corpo a corpo/.test(f.range)) return 'toque';
  if (!f.damage && !isInstant(f.duration)) return 'bencao';
  return 'projetil';
}

// Variantes visuais dentro de uma forma (o simbolo muda, a forma nao).
function variantOf(form, f, element) {
  const all = `${f.name} ${f.description}`;
  if (form === 'controle') return element === 'gaia' || /\b(raiz|raize|vinha|cipo|espinh|hera|galho)/.test(all) ? 'raizes' : 'correntes';
  if (form === 'movimento') return /\b(teleport|portal|piscar|translad|translo|sombra)/.test(all) ? 'portal' : 'seta';
  return '';
}

// Classificacao completa: o que desenhar.
export function classifyPower(power) {
  const f = fieldsOf(power);
  const element = elementKey(f.element);
  const nameWeapon = findWeapon(f.name);
  const isBaseAttack = /^ataque\b/.test(f.name);
  const maneuverInName = Object.values(scoreWords(MANEUVER_WORDS, f.name, '')).some((s) => s > 0);
  // magia que cita arma ("Lanca de Gelo") e arma conjurada: continua magia
  const tecnica =
    isBaseAttack ||
    (!!nameWeapon && f.type !== 'magia') ||
    (!element && f.type === 'poder') ||
    (!element && f.type !== 'magia' && maneuverInName);

  if (tecnica) {
    let weapon = nameWeapon || findWeapon(f.description);
    if (!weapon) weapon = CLASS_WEAPON.find(([re]) => re.test(f.klass))?.[1] || 'espada-longa';
    // o ataque basico ("Ataque: Arco curto") usa a manobra natural da arma
    const maneuver = isBaseAttack && !f.description
      ? WEAPONS.find((w) => w.id === weapon).maneuver
      : classifyManeuver(f, weapon);
    return { kind: 'tecnica', form: maneuver, maneuver, weapon, element, variant: '' };
  }
  const form = classifySpell(f);
  return { kind: 'magia', form, maneuver: null, weapon: null, element, variant: variantOf(form, f, element) };
}

// Forma de entrega (magia) ou manobra (tecnica). Reaproveitavel pela animacao.
export function spellForm(power) {
  return classifyPower(power).form;
}

// Chave estavel para cache: tudo que muda pixels e so isso.
export function iconKey(info) {
  return [info.kind, info.form, info.element || '-', info.weapon || '-', info.variant || '-'].join('|');
}
