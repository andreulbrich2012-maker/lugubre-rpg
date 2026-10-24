// Classificador pt-BR: do cadastro do monstro (nome, categoria, dificuldade,
// descricao) para um descritor visual ESTAVEL: base, epitetos, elemento, nivel,
// tamanho do quadro e paleta. Nada de Math.random: tudo sai do hash do nome,
// entao o mesmo monstro tem sempre a mesma cara (lista, mapa, retrato).
import { BASES, BASE_BY_ID, ELEMENTS, ELEMENT_DEFAULT } from './bases.js';
import { EPITHETS, EPITHET_BY_ID, ELEMENT_MOOD, ELEMENT_TINT, ELEMENT_GLOW } from './epithets.js';
import { recolor, shiftHex } from './color.js';

export function normalize(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// FNV-1a 32 bits: semente deterministica a partir do nome.
export function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

const ELEMENT_BY_NORM = Object.fromEntries([...ELEMENTS, 'Hemera'].map((e) => [normalize(e), e]));
// categorias antigas do banco (mesmo mapeamento da migracao do schema.sql)
const LEGACY = { feras: 'Gaia', 'mortos-vivos': 'Tártaro', 'mortos vivos': 'Tártaro', demonios: 'Tártaro', aberracoes: 'Tártaro', humanoides: 'Ananque', construtos: 'Ananque', espiritos: 'Nix' };

export function detectElement(monster = {}, base = null) {
  const cat = normalize(monster.category || monster.element || monster.elemento);
  if (ELEMENT_BY_NORM[cat]) return ELEMENT_BY_NORM[cat];
  if (LEGACY[cat]) return LEGACY[cat];
  const text = ` ${normalize(monster.name)} ${normalize(monster.description)} `;
  for (const [n, el] of Object.entries(ELEMENT_BY_NORM)) if (text.includes(` ${n} `)) return el;
  return base?.element || 'Caos';
}

// Indice de palavras-chave (as mais longas primeiro: "lobo das sombras" vence "lobo").
const KEYWORDS = BASES.flatMap((b) => b.keywords.map((k) => ({ k: normalize(k), b }))).sort((x, y) => y.k.length - x.k.length);

function findKeyword(text, element) {
  const padded = ` ${text} `;
  let best = null;
  for (const { k, b } of KEYWORDS) {
    const at = padded.indexOf(` ${k} `);
    if (at < 0) continue;
    // em pt-BR o substantivo vem primeiro ("Espectro Acorrentado" e um espectro):
    // vence quem aparece antes; empate -> a chave mais longa; depois o proprio elemento
    const score = -at * 1000 + k.length * 10 + (b.element === element ? 5 : 0);
    if (!best || score > best.score) best = { b, k, at, score };
  }
  return best;
}

const AVATAR_OF = { Caos: 'avatar-caos', Gaia: 'avatar-montanha', Ponto: 'avatar-profundezas', 'Érebo': 'avatar-esquecido', Nix: 'avatar-noite', 'Tártaro': 'avatar-abismo', 'Éter': 'avatar-aurora', Ananque: 'avatar-destino', Hemera: 'avatar-aurora' };

// Nome -> base. Ordem: palavra-chave no nome; "Avatar ..." do elemento; palavra-chave
// na descricao; base padrao do elemento.
export function classifyBase(monster = {}) {
  const name = normalize(monster.name);
  const catEl = detectElement({ category: monster.category });
  const hit = findKeyword(name, catEl);
  if (hit) return { base: hit.b, keyword: hit.k, via: 'nome' };
  const el = detectElement(monster);
  if (/^avatar\b/.test(name)) return { base: BASE_BY_ID[AVATAR_OF[el]], keyword: 'avatar', via: 'avatar' };
  const dHit = findKeyword(normalize(monster.description), el);
  if (dHit) return { base: dHit.b, keyword: null, via: 'descricao' };
  return { base: BASE_BY_ID[ELEMENT_DEFAULT[el]] || BASE_BY_ID.fera, keyword: null, via: 'elemento' };
}

// Epitetos encontrados no resto do nome (sem a palavra da base).
export function findEpithets(rest) {
  const padded = ` ${rest} `;
  const found = [];
  for (const e of EPITHETS) {
    let at = Infinity;
    for (const w of e.words) { const i = padded.indexOf(` ${w} `); if (i >= 0 && i < at) at = i; }
    if (at < Infinity) found.push({ e, at });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.e);
}

const DIFF = { baixa: 3, facil: 3, media: 7, normal: 7, alta: 12, dificil: 12, mortal: 16, lendaria: 19, epica: 17, chefe: 18 };

export function levelOf(monster, base, epithets) {
  const explicit = Number(monster.level ?? monster.nivel);
  if (Number.isFinite(explicit) && explicit > 0) return Math.max(1, Math.min(20, Math.round(explicit)));
  const m = /\b(?:nivel|nv|lvl|level)\.?\s*(\d{1,2})\b/.exec(normalize(monster.description) + ' ' + normalize(monster.name));
  if (m) return Math.max(1, Math.min(20, Number(m[1])));
  const d = DIFF[normalize(monster.difficulty)];
  const tier = epithets.reduce((t, e) => Math.max(t, e.tier), epithets.length ? -1 : 0);
  const baseLvl = base.lvl ?? 5;
  const raw = d != null ? (d + baseLvl) / 2 : baseLvl;
  return Math.max(1, Math.min(20, Math.round(raw + tier * 1.5)));
}

export function sizeOf(level, base, isAvatar) {
  if (isAvatar || base.id.startsWith('avatar')) return 40;
  if (level <= 6) return 16;
  if (level <= 14) return 24;
  return 32;
}

// Cores fixas dos detalhes das variantes (armadura, cristal, musgo, fogo, ouro, veneno, cicatriz).
const DETAIL_COLORS = { x: '#8f97a6', k: '#a8e0ff', v: '#5e9a3a', f: '#f07a2a', y: '#e8b840', p: '#8ac040', s: '#e09a90' };

function buildPalette(base, element, epithets, seed) {
  let pal = { ...base.palette };
  // elemento diferente do da base: puxa a paleta para o tom do Primordial
  if (element !== base.element && ELEMENT_TINT[element]) {
    pal = recolor(pal, ELEMENT_TINT[element], 0.38, ['a', 'b', 'c']);
    pal.g = ELEMENT_GLOW[element] || pal.g;
  }
  let glow = null;
  for (const e of epithets) {
    if (e.amt) pal = recolor(pal, e.tint, e.amt, ['a', 'b', 'c'], e.desat || 0);
    if (e.glow && !glow) glow = e.glow;
  }
  // variacao minima por nome: dois "Rato do Mato" de campanhas diferentes ficam iguais,
  // mas "Rato do Mato" e "Rato do Brejo" nao sao clones perfeitos
  const jit = ((seed % 13) - 6) * 1.2, lit = (((seed >> 4) % 7) - 3) * 0.012;
  for (const k of ['a', 'b', 'c']) if (pal[k]) pal[k] = shiftHex(pal[k], jit, 0, lit);
  if (glow) pal.g = glow;
  const dc = { ...DETAIL_COLORS };
  for (const e of epithets) {
    if (e.armor) dc.x = e.armor;
    if (e.crystal) dc.k = e.crystal;
    if (e.poison) dc.p = e.poison;
  }
  return { ...dc, ...pal };
}

export function lookFromBase(base, size = 32, extra = {}) {
  return {
    key: `${base.id}|-|${base.element || '-'}|${size}`,
    base: base.id, baseName: base.name, element: base.element, plan: base.plan,
    params: base.params, palette: { ...DETAIL_COLORS, ...base.palette }, size, level: base.lvl,
    epithet: null, epithets: [], details: [], aura: null, seed: 0, ...extra
  };
}

// Descritor estavel do visual de um monstro (o mapa usa para montar o token).
export function monsterLook(monster = {}) {
  const { base, keyword, via } = classifyBase(monster);
  const element = detectElement(monster, base);
  const name = normalize(monster.name);
  let rest = keyword ? ` ${name} `.replace(` ${keyword} `, ' ').trim() : name;
  // tira palavras de ligacao soltas que sobram ("de", "da"...)
  rest = rest.replace(/^(de|da|do|das|dos)\s+(?=\S+\s+\S)/, '');
  let epithets = findEpithets(rest);
  const seed = hashString(name || base.id);
  // sobrou palavra que nao conhecemos: usa um humor do proprio elemento (deterministico)
  if (!epithets.length && rest && via === 'nome' && rest.split(' ').some((w) => w.length > 3)) {
    const moods = ELEMENT_MOOD[element] || ELEMENT_MOOD.Caos;
    epithets = [EPITHET_BY_ID[moods[seed % moods.length]]];
  }
  epithets = epithets.slice(0, 2);
  const isAvatar = /^avatar\b/.test(name);
  const level = Math.max(levelOf(monster, base, epithets), isAvatar ? 18 : 1);
  const size = sizeOf(level, base, isAvatar);
  const details = [];
  for (const e of epithets) for (const d of e.details) if (!details.includes(d)) details.push(d);
  if (isAvatar && !details.includes('aura')) details.push('aura');
  const aura = details.includes('aura') ? (epithets.find((e) => e.aura)?.aura || ELEMENT_GLOW[element] || '#fff0a0') : null;
  const palette = buildPalette(base, element, epithets, seed);
  const ids = epithets.map((e) => e.id);
  return {
    key: `${base.id}|${ids.join('+') || '-'}|${element}|${size}|${seed.toString(36)}`,
    name: monster.name || base.name,
    base: base.id, baseName: base.name, via, element, plan: base.plan, params: base.params,
    palette, size, level,
    epithet: epithets[0] ? { id: epithets[0].id, ids, details: details.slice(0, 4) } : null,
    epithets: ids, details: details.slice(0, 4), aura, seed
  };
}
