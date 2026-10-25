// classify(power) -> { family, group, form, element, label }
//
// Recebe qualquer coisa que o jogo chama de ataque: poder/magia da biblioteca
// ({ name, type, element, range, damage_formula, description, requirement }), ataque
// da ficha ({ name, damage, range }), ataque de monstro ({ name, description } com
// monster: true) ou so um rotulo de rolagem ("Ataque: Arco longo").
// Assim armas e magias novas ganham animacao sem cadastro extra. Se o item tiver
// o campo "animation" (id de familia, ou { family, element }), ele manda.
import { FAMILIES, FAMILY_BY_ID } from './families.js';
import { ELEMENTS, elementKey, guessElement } from './elements.js';
import { normalize, hasWord } from './text.js';
import { weaponInfo } from './weapons/select.js';

const MAGIC_TYPES = ['magia', 'magias', 'spell', 'spells', 'magic', 'feitico'];
const MONSTER_KINDS = ['monster', 'monstro', 'npc', 'criatura', 'fera'];

// Prefixos de rotulo que nao dizem nada sobre o golpe.
const LABEL_PREFIX = /^(ataque|dano|attack|damage|golpe de|uso de)\s*:?\s*/;

function textOf(value) {
  return normalize(value).replace(LABEL_PREFIX, '');
}

// Nome vale mais que descricao: "Raio Sombrio" e um raio mesmo que a descricao
// fale de "explosao de sombras".
function score(family, fields) {
  let s = 0;
  for (const w of family.keywords) {
    // Frase ("bola de fogo") e mais especifica que palavra solta ("bola").
    if (hasWord(fields.name, w)) s += w.includes(' ') ? 4 : 3;
    if (hasWord(fields.desc, w)) s += 1;
    if (hasWord(fields.extra, w)) s += 1;
  }
  return s;
}

function best(list, fields) {
  let pick = null;
  let top = 0;
  for (const f of list) {
    const s = score(f, fields);
    if (s > top) { pick = f; top = s; }
  }
  return pick;
}

function rangeKind(range) {
  const r = normalize(range);
  if (!r) return null;
  if (hasWord(r, 'toque') || hasWord(r, 'corpo') || hasWord(r, 'adjacente')) return 'touch';
  if (hasWord(r, 'pessoal') || hasWord(r, 'si mesmo') || hasWord(r, 'proprio')) return 'self';
  const meters = Number((r.match(/(\d+)/) || [])[1]);
  if (Number.isFinite(meters) && meters > 0) return meters <= 1.5 ? 'touch' : 'far';
  if (hasWord(r, 'curto') || hasWord(r, 'medio') || hasWord(r, 'longo') || hasWord(r, 'distancia') || hasWord(r, 'visao')) return 'far';
  return null;
}

function pack(family, elementK) {
  const el = elementK && elementK !== 'fisico' ? ELEMENTS[elementK].name : null;
  return { family: family.id, group: family.group, form: family.intent, element: el, label: family.label };
}

function fromOverride(animation, fallbackElement) {
  if (!animation) return null;
  const spec = typeof animation === 'string' ? { family: animation } : animation;
  const family = FAMILY_BY_ID[normalize(spec.family).replace(/ /g, '-')] || FAMILY_BY_ID[spec.family];
  if (!family) return null;
  const el = elementKey(spec.element) || fallbackElement || (family.defaultElement || null);
  return pack(family, el);
}

function classifyBase(power = {}, options = {}) {
  const p = typeof power === 'string' ? { name: power } : (power || {});
  const fields = {
    name: textOf(p.name || p.label || p.powerName || ''),
    desc: normalize(p.description || p.desc || ''),
    extra: normalize([p.requirement, p.weapon, p.damage_type, p.tags].filter(Boolean).join(' '))
  };
  const all = `${fields.name} ${fields.desc} ${fields.extra}`;
  const explicitEl = elementKey(p.element);
  const textEl = guessElement(fields.name, all);

  const override = fromOverride(p.animation, explicitEl);
  if (override) return override;

  const type = normalize(p.type || p.kind);
  const isMonster = options.monster === true || p.monster === true || MONSTER_KINDS.includes(type) || MONSTER_KINDS.includes(normalize(p.source));
  const isMagic = MAGIC_TYPES.includes(type);
  const rk = rangeKind(p.range);
  const melee = FAMILIES.filter((f) => f.group === 'corpo');
  const ranged = FAMILIES.filter((f) => f.group === 'distancia');
  const forms = FAMILIES.filter((f) => f.group === 'magia');
  const beasts = FAMILIES.filter((f) => f.group === 'monstro');

  // Monstro: primeiro o verbo de fera pelo nome do ataque; se ele empunha arma
  // ("Espada enferrujada"), cai nas familias de arma normalmente.
  if (isMonster) {
    const weapon = best([...ranged, ...melee], { ...fields, desc: '' });
    const fera = best(beasts, fields);
    if (fera && (!weapon || score(fera, fields) >= score(weapon, { ...fields, desc: '' }))) {
      return pack(fera, explicitEl || textEl || fera.defaultElement || null);
    }
    if (weapon) return pack(weapon, explicitEl || null);
    if (explicitEl || textEl) return pack(FAMILY_BY_ID['magia-fera'], explicitEl || textEl);
    return pack(FAMILY_BY_ID.pancada, null);
  }

  // Magia (ou poder com elemento e sem cara de arma): escolhe a forma.
  const weapon = best([...ranged, ...melee], fields);
  if (isMagic || ((explicitEl || textEl) && !weapon)) {
    let form = best(forms, fields);
    if (!form) {
      if (rk === 'touch') form = FAMILY_BY_ID.toque;
      else if (rk === 'self') form = FAMILY_BY_ID.bencao;
      else form = FAMILY_BY_ID.projetil;
    }
    // Toque declarado no alcance vence projetil generico ("Toque Vampirico" ja vence pelo nome).
    if (form.id === 'projetil' && rk === 'touch') form = FAMILY_BY_ID.toque;
    const el = explicitEl || textEl || (form.id === 'bencao' ? 'eter' : 'caos');
    return pack(form, el);
  }

  if (weapon) return pack(weapon, explicitEl);

  // Sem pista nenhuma: alcance decide entre arremesso e corte.
  if (rk === 'far') return pack(FAMILY_BY_ID.arremesso, explicitEl);
  return pack(FAMILY_BY_ID.corte, explicitEl);
}

// Elemento final como chave interna ("Érebo" -> "erebo"); null vira "fisico".
export function elementOf(cls) {
  return elementKey(cls?.element) || 'fisico';
}

// Familia antiga equivalente a cada familia de movimento (quando o poder manda
// { animation: { family: 'pesadas', move: '...' } }).
const MOVE_FAMILY_LEGACY = {
  leves: 'corte', pesadas: 'montante', 'uma-mao': 'esmagamento', haste: 'haste', adagas: 'corte', correntes: 'chicotada',
  desarmado: 'soco', escudo: 'escudo', arco: 'flecha', besta: 'virote', arremesso: 'arremesso'
};

// Classificacao completa: a familia antiga (forma do efeito) e, para armas, a
// familia de movimento, a arma (ferramenta desenhada) e o golpe, quando o nome
// ou o campo animation dizem qual. Sem golpe nomeado, move fica null e o efeito
// sorteia um pela semente (rollId).
export function classify(power = {}, options = {}) {
  const base = classifyBase(power, options);
  const p = typeof power === 'string' ? { name: power } : (power || {});
  const anim = p.animation && typeof p.animation === 'object' ? p.animation : null;
  const forced = Boolean(anim && (anim.move || anim.weapon));
  if (base.group === 'magia' && !forced) return base;
  const info = weaponInfo(p, base.family, base.group);
  if (!info) return base;
  const animFam = anim?.family ? normalize(anim.family).replace(/ /g, '-') : null;
  if (animFam && !FAMILY_BY_ID[animFam] && MOVE_FAMILY_LEGACY[info.weaponFamily]) {
    const fam = FAMILY_BY_ID[MOVE_FAMILY_LEGACY[info.weaponFamily]];
    return { ...pack(fam, elementKey(anim.element) || elementKey(p.element)), ...info };
  }
  return { ...base, ...info };
}
