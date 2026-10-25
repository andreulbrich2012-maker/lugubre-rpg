// Escolha do golpe: qual familia de movimento, qual arma (ferramenta) e qual golpe.
//
//   1. campo animation do poder: { family, move } (family pode ser a familia de
//      movimento, o id da arma ou uma familia antiga como 'corte');
//   2. palavras do nome ("giratório", "estocada dupla", "salto"...);
//   3. sem pista: sorteio deterministico pela semente (rollId) entre os golpes
//      base da arma, para ataques repetidos variarem igual em todos os clientes.
import { WEAPON_FAMILIES, WEAPONS, FAMILY_OF, WEAPON_OF } from './catalog.js';
import { weaponIdFor } from '../../icons/weapons.js';
import { normalize, hasWord } from '../text.js';
import { hashSeed } from '../rng.js';

// Familia antiga (families.js) -> familia de movimento e ferramenta padrao.
export const LEGACY_TO_FAMILY = {
  corte: ['leves', 'espada-longa'],
  estocada: ['leves', 'rapieira', 'estocada'],
  esmagamento: ['uma-mao', 'maca'],
  giratorio: ['leves', 'espada-longa', 'giro'],
  chicotada: ['correntes', 'chicote'],
  soco: ['desarmado', 'manoplas'],
  garra: ['desarmado', 'garras-de-ferro'],
  escudo: ['escudo', 'escudo'],
  'corte-duplo': ['adagas', 'adaga', 'corte-cruzado'],
  montante: ['pesadas', 'montante'],
  haste: ['haste', 'lanca'],
  flecha: ['arco', 'arco-curto'],
  virote: ['besta', 'besta'],
  arremesso: ['arremesso', 'dardos'],
  funda: ['arremesso', 'funda']
};

// Nomes de arma que nao podem puxar golpe ("Besta pesada" nao e "Disparo pesado").
const WEAPON_PHRASES = [
  'besta pesada', 'besta leve', 'besta de mao', 'arco longo', 'arco curto', 'espada longa', 'espada curta', 'espada bastarda',
  'espada de duas maos', 'machado grande', 'machado de guerra', 'machado de mao', 'machado pequeno', 'martelo de guerra',
  'faca de caca', 'garras de ferro', 'luvas de combate', 'dardo de arremesso', 'facas de arremesso', 'machadinha de arremesso',
  'faca de arremesso'
];

export function movesOf(weaponOrFamily) {
  const w = WEAPON_OF[weaponOrFamily];
  const fam = w ? FAMILY_OF[w.fam] : FAMILY_OF[weaponOrFamily];
  if (!fam) return [];
  return [...fam.moves, ...(w?.extra || [])];
}

export function weaponsOf(famId) {
  return WEAPONS.filter((w) => w.fam === famId);
}

function keysOf(move) {
  if (!move._keys) {
    move._keys = [normalize(move.name), normalize(move.id.replace(/-/g, ' ')), ...(move.kw || []).map(normalize)].filter(Boolean);
  }
  return move._keys;
}

// Golpe citado no texto (o mais especifico vence: "estocada dupla" > "estocada").
export function moveByText(list, text) {
  let t = ` ${normalize(text)} `;
  for (const p of WEAPON_PHRASES) t = t.replace(` ${p} `, ' ');
  t = t.trim();
  if (!t) return null;
  let best = null;
  let top = 0;
  for (const m of list) {
    for (const k of keysOf(m)) {
      if (k.length > top && hasWord(t, k)) { best = m; top = k.length; }
    }
  }
  return best;
}

export function findMove(list, id) {
  if (!id) return null;
  const n = normalize(String(id)).replace(/ /g, '-');
  return list.find((m) => m.id === n || m.id === id) || moveByText(list, id);
}

// Golpes que podem sair no sorteio: sem montaria/dupla (cavalo ou aliado do nada
// confunde a mesa) e, para armas de distancia longe do alvo, sem os de corpo a corpo.
export function autoPool(list, { cells = 1, ranged = false } = {}) {
  const pool = list.filter((m) => !(m.tags || []).some((t) => t === 'montaria' || t === 'dupla'));
  if (ranged && cells > 2.5) return pool.filter((m) => !(m.body && m.body.go >= 0.7));
  return pool;
}

export function pickMove(list, seed, opts) {
  const pool = autoPool(list, opts);
  if (!pool.length) return list[0] || null;
  return pool[hashSeed(`${seed}|golpe`) % pool.length];
}

// Classificacao: devolve { weaponFamily, weapon, move } ou null.
// fields: textos normalizados do poder; legacy: familia antiga ja escolhida.
export function weaponInfo(p = {}, legacy = null, group = null) {
  const anim = p.animation && typeof p.animation === 'object' ? p.animation : null;
  const animFam = anim?.family ? normalize(anim.family).replace(/ /g, '-') : null;
  let weapon = null;
  let fam = null;
  let hint = null;
  if (animFam && WEAPON_OF[animFam]) weapon = WEAPON_OF[animFam];
  else if (animFam && FAMILY_OF[animFam]) fam = FAMILY_OF[animFam];
  if (anim?.weapon && WEAPON_OF[normalize(anim.weapon).replace(/ /g, '-')]) weapon = WEAPON_OF[normalize(anim.weapon).replace(/ /g, '-')];
  const name = p.name || p.label || p.powerName || '';
  if (!weapon && !fam) {
    const id = weaponIdFor(name) || weaponIdFor([p.weapon, p.requirement].filter(Boolean).join(' '));
    if (id && WEAPON_OF[id]) weapon = WEAPON_OF[id];
    // "Machadinha de arremesso" luta como arremesso, nao como machado de mao.
    if (weapon?.id === 'machadinha' && hasWord(normalize(name), 'arremess')) weapon = WEAPON_OF['machadinha-arremesso'];
  }
  const legacyId = animFam && LEGACY_TO_FAMILY[animFam] ? animFam : legacy;
  if (!weapon && !fam && legacyId && LEGACY_TO_FAMILY[legacyId] && (!group || group === 'corpo' || group === 'distancia' || group === 'monstro')) {
    const [f, w, h] = LEGACY_TO_FAMILY[legacyId];
    fam = FAMILY_OF[f];
    weapon = WEAPON_OF[w];
    hint = h || null;
  }
  if (weapon && !fam) fam = FAMILY_OF[weapon.fam];
  if (!fam) return null;
  if (weapon && weapon.fam !== fam.id) weapon = null;
  if (!weapon) weapon = WEAPON_OF[fam.tool] || null;
  const list = movesOf(weapon ? weapon.id : fam.id);
  let move = null;
  if (anim?.move) move = findMove(list, anim.move);
  if (!move) move = moveByText(list, name);
  if (!move && hint) move = findMove(list, hint);
  return { weaponFamily: fam.id, weapon: weapon?.id || null, move: move?.id || null };
}

export function resolveSpec({ weaponFamily, weapon, move }) {
  const w = WEAPON_OF[weapon] || null;
  const fam = FAMILY_OF[weaponFamily] || (w ? FAMILY_OF[w.fam] : null);
  if (!fam) return null;
  const tool = w && w.fam === fam.id ? w : WEAPON_OF[fam.tool];
  const list = movesOf(tool ? tool.id : fam.id);
  const m = typeof move === 'object' && move ? move : findMove(list, move);
  return { fam, weapon: tool, list, move: m };
}

export { WEAPON_FAMILIES, WEAPONS, FAMILY_OF, WEAPON_OF };
