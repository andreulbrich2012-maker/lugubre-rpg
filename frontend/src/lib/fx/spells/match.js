// Liga um poder/magia do jogo a uma magia do grimorio.
//   1) vinculo explicito: power.animation = { spell: '<id>' } ou 'magia:<id>'
//   2) nome igual (sem acento/maiuscula), ou sinonimo
//   3) nome que CONTEM o nome de uma magia ("Bola de Fogo Maior" -> bola-de-fogo),
//      so para nomes de magia com 7+ letras (evita "Luz" pegar "Luz da Manha")
// Sem casamento: null, e o classificador antigo (classify.js) escolhe a familia.
import { SPELLS, SPELL_BY_ID } from './catalog.js';
import { normalize } from '../text.js';

// Sinonimos e nomes classicos (pt e en) para as magias mais conhecidas.
export const SYNONYMS = {
  'bola-de-fogo': ['fireball', 'bola flamejante', 'esfera de fogo'],
  'misseis-magicos': ['missil magico', 'missel magico', 'magic missile', 'dardos arcanos', 'dardo arcano'],
  relampago: ['lightning bolt', 'raio do ceu', 'raio caindo'],
  'relampago-em-cadeia': ['raio em cadeia', 'chain lightning', 'corrente de relampagos'],
  'cone-de-gelo': ['cone de frio', 'cone of cold'],
  'lanca-de-gelo': ['estaca de gelo', 'ice lance'],
  'parede-de-fogo': ['muralha de fogo', 'wall of fire', 'muro de fogo'],
  'muralha-de-gelo': ['parede de gelo', 'muro de gelo', 'wall of ice'],
  'muro-de-pedra': ['parede de pedra', 'muralha de pedra', 'wall of stone'],
  meteoro: ['queda de meteoro', 'meteor'],
  'chuva-de-meteoros': ['enxame de meteoros', 'meteor swarm', 'tempestade de meteoros'],
  cura: ['curar', 'curar ferimentos', 'cure wounds', 'cura leve', 'curar feridas'],
  'cura-em-massa': ['cura em grupo', 'mass heal', 'curar em massa'],
  'palavra-curativa': ['healing word', 'palavra de cura'],
  ressurreicao: ['reviver', 'revivificar', 'raise dead'],
  'ressurreicao-verdadeira': ['true resurrection'],
  'luz-sagrada': ['luz divina', 'holy light'],
  'escudo-arcano': ['escudo magico', 'shield'],
  'armadura-arcana': ['armadura magica', 'mage armor'],
  'prisao-de-forca': ['jaula de forca', 'forcecage'],
  invisibilidade: ['ficar invisivel', 'invisibility'],
  'duplo-ilusorio': ['duplicata ilusoria', 'clone ilusorio'],
  'imagens-espelhadas': ['imagem espelhada', 'mirror image', 'reflexos'],
  'labirinto-ilusorio': ['labirinto', 'maze'],
  teleporte: ['teletransporte', 'teleportar', 'teleport'],
  piscar: ['blink', 'lampejo', 'passo nebuloso', 'misty step'],
  'porta-dimensional': ['dimension door'],
  'parar-o-tempo': ['tempo parado', 'time stop', 'parar tempo'],
  pressa: ['acelerar', 'haste'],
  lentidao: ['lentificar', 'slow'],
  'erguer-mortos': ['animar mortos', 'reanimar mortos', 'animate dead', 'levantar mortos'],
  'drenar-vida': ['dreno de vida', 'roubo de vida', 'sugar vida', 'vampirismo'],
  'toque-necrotico': ['toque da morte', 'toque vampirico'],
  'dedo-da-morte': ['finger of death'],
  'nuvem-pestilenta': ['nuvem fetida', 'stinking cloud', 'nuvem toxica'],
  'nuvem-venenosa': ['nuvem de veneno', 'cloudkill'],
  raizes: ['enraizar', 'emaranhar', 'entangle', 'prender com raizes'],
  'enxame-de-insetos': ['praga de insetos', 'insect plague', 'enxame'],
  terremoto: ['earthquake', 'tremor de terra'],
  desintegrar: ['desintegracao', 'disintegrate'],
  'dissipar-magia': ['dissipar', 'dispel magic', 'anular magia'],
  'contra-magica': ['contramagica', 'counterspell'],
  'detectar-magia': ['detectar magias', 'detect magic'],
  'invocar-familiar': ['familiar', 'find familiar'],
  sono: ['sleep', 'adormecer'],
  'enfeiticar': ['enfeiticar pessoa', 'charm person', 'encantar pessoa'],
  'imobilizar-pessoa': ['paralisar pessoa', 'hold person', 'imobilizar'],
  confusao: ['confusion'],
  medo: ['causar medo', 'fear', 'terror'],
  'mao-arcana': ['mao magica', 'mage hand'],
  luz: ['light', 'iluminar'],
  'prestidigitacao': ['truque', 'prestidigitation'],
  'mensagem': ['message', 'sussurro magico'],
  'teia': ['web', 'teia de aranha'],
  'voo': ['voar', 'fly'],
  'tempestade': ['tempestade de raios', 'call lightning'],
  'nevasca': ['tempestade de neve', 'tempestade de gelo', 'ice storm'],
  'metamorfose': ['polimorfia', 'polymorph', 'transformar em sapo'],
  'petrificar': ['carne em pedra', 'flesh to stone', 'petrificacao'],
  'desejo': ['wish'],
  'milagre': ['miracle'],
  'bencao': ['bless', 'abencoar'],
  'chama-sagrada': ['sacred flame', 'fogo sagrado'],
  'raio-de-geada': ['ray of frost', 'raio gelido'],
  'fagulha': ['fire bolt', 'faisca', 'centelha de fogo'],
  'choque': ['shocking grasp', 'faisca eletrica'],
  'maos-flamejantes': ['burning hands', 'maos em chamas']
};

let index = null;

function buildIndex() {
  const exact = new Map();
  for (const s of SPELLS) exact.set(normalize(s.name), s);
  for (const [id, names] of Object.entries(SYNONYMS)) {
    const s = SPELL_BY_ID[id];
    if (!s) continue;
    for (const n of names) if (!exact.has(normalize(n))) exact.set(normalize(n), s);
  }
  // Para o casamento por "contem": frases mais longas primeiro.
  const phrases = [...exact.entries()]
    .filter(([n]) => n.replace(/ /g, '').length >= 7)
    .sort((a, b) => b[0].length - a[0].length);
  return { exact, phrases };
}

const WEAPON_TYPES = ['poder', 'tecnica', 'arma', 'weapon', 'ataque'];

const PREFIX = /^(magia|feitico|ritual|poder|ataque|dano|spell|uso de)\s*:?\s+/;

export function matchSpellName(name) {
  if (!name) return null;
  index = index || buildIndex();
  const n = normalize(name).replace(PREFIX, '');
  if (!n) return null;
  const hit = index.exact.get(n);
  if (hit) return hit;
  const padded = ` ${n} `;
  for (const [phrase, spell] of index.phrases) {
    if (padded.includes(` ${phrase} `)) return spell;
  }
  return null;
}

// Vinculo explicito no campo "animation" do poder.
export function linkedSpellId(animation) {
  if (!animation) return null;
  if (typeof animation === 'string') {
    const m = animation.match(/^(?:magia|spell|grimorio):(.+)$/);
    return m && SPELL_BY_ID[m[1]] ? m[1] : null;
  }
  const id = animation.spell;
  return id && SPELL_BY_ID[id] ? id : null;
}

/**
 * Magia do grimorio para um poder (objeto da ficha/biblioteca ou so o nome).
 * @returns objeto da magia (catalog.js) ou null
 */
export function findSpell(power) {
  if (!power) return null;
  const p = typeof power === 'string' ? { name: power } : power;
  const linked = linkedSpellId(p.animation);
  if (linked) return SPELL_BY_ID[linked];
  // Animacao de familia forcada ("animation": "corte") vence o nome.
  if (p.animation && !linked) return null;
  // Tecnica de arma ("Rajada" do arqueiro) nao e magia: so pelo vinculo explicito.
  const type = normalize(p.type || p.kind);
  if (WEAPON_TYPES.includes(type) || p.weapon) return null;
  return matchSpellName(p.name || p.label || p.powerName || '');
}

/**
 * Decide se as opcoes de um efeito (player/FxLayer) devem tocar uma magia do grimorio.
 * opts.spell (id) manda; opts.kind/opts.family (familia explicita) desliga; senao,
 * procura pelo poder.
 */
export function spellForOptions(opts = {}) {
  if (opts.spell === false) return null;
  if (opts.spell) return typeof opts.spell === 'string' ? SPELL_BY_ID[opts.spell] || null : opts.spell;
  if (opts.kind || opts.family) return null;
  return findSpell(opts.power);
}
