// Formato da aparencia (JSON versionado), padroes por raca, sorteio e conserto.
// O conserto (repair) e o que torna o formato robusto: qualquer JSON velho,
// parcial ou com peca que nao existe mais volta valido, sem quebrar a ficha.
import { SKINS, HAIR_COLORS, EYE_COLORS, COLORS } from './palette.js';
import { BUILDS, HEIGHTS } from './skeleton.js';
import { EYE_STYLES, BEARDS } from './body.js';
import { TRAIT_GROUPS } from './traits.js';
import { SLOTS, ITEMS, HAIRS, getItem, HAIR_BY_ID } from './catalog.js';

export const APPEARANCE_VERSION = 1;

// Tracos visuais tirados do livro (docs/livro): so os padroes, tudo e editavel.
export const RACES = [
  { id: 'humano', name: 'Humano', skins: ['clara', 'pessego', 'oliva', 'bronze', 'canela', 'castanha', 'ebano', 'porcelana'], traits: {} },
  { id: 'abissiano', name: 'Abissiano', skins: ['rubro-abissal', 'carmim', 'lilas-noite', 'cinza-cinza'], eyes: 'sem-pupila', traits: { horns: 'curvos', hornColor: 'carvao', tail: 'abissal', ears: 'pontuda' } },
  { id: 'celestiano', name: 'Celestiano', skins: ['porcelana', 'clara', 'dourada', 'bronze'], eyes: 'luminoso', eyeColor: 'dourado', traits: { marks: 'douradas', markColor: 'ouro', halo: 'aureola' } },
  { id: 'centauro', name: 'Centauro', skins: ['bronze', 'oliva', 'canela', 'clara'], traits: { legs: 'cavalo', coat: 'castanho', tail: 'equina' } },
  { id: 'durkar', name: 'Durkar', skins: ['pessego', 'clara', 'oliva', 'canela'], height: 'baixa', body: 'forte', beard: 'ana', traits: {} },
  { id: 'gorak', name: 'Gorak', skins: ['verde-gorak', 'musgo', 'cinza-cinza', 'pedra'], body: 'forte', traits: { face: 'presas', ears: 'curta-pontuda' } },
  { id: 'kenku', name: 'Kenku', skins: ['pena-negra', 'pena-parda', 'cinza-cinza'], hair: 'careca', eyeColor: 'ambar', traits: { face: 'bico', crest: 'penas', ears: 'nenhuma', legs: 'garras', tail: 'penas', hornColor: 'ocre' } },
  { id: 'lumerin', name: 'Lumerin', skins: ['porcelana', 'clara', 'pessego', 'azul-palido'], height: 'baixa', body: 'esbelto', eyes: 'luminoso', eyeColor: 'lunar', traits: { marks: 'sardas-luz', markColor: 'prata', ears: 'pontuda' } },
  { id: 'minotauro', name: 'Minotauro', skins: ['pelagem', 'castanha', 'ebano', 'pedra'], body: 'forte', traits: { horns: 'bovinos', hornColor: 'osso', face: 'focinho', ears: 'bovina', tail: 'bovina' } },
  { id: 'nocthar', name: 'Nocthar', skins: ['lilas-noite', 'azul-profundo', 'cinza-cinza', 'ebano'], eyes: 'luminoso', eyeColor: 'lunar', traits: { ears: 'longa', marks: 'sombras', markColor: 'ameixa' } },
  { id: 'primordiano', name: 'Primordiano', skins: ['pedra', 'cinza-cinza', 'bronze', 'azul-profundo'], traits: { marks: 'brasas', markColor: 'abobora' } },
  { id: 'sylvar', name: 'Sylvar', skins: ['porcelana', 'clara', 'oliva', 'bronze'], body: 'esbelto', traits: { ears: 'longa' } },
  { id: 'satiro', name: 'Sátiro', skins: ['pessego', 'oliva', 'canela', 'bronze'], traits: { horns: 'carneiro', hornColor: 'camurca', legs: 'cascos', coat: 'castanho', ears: 'caprina', tail: 'caprina' } },
  { id: 'tritao', name: 'Tritão', skins: ['marinha', 'azul-palido', 'azul-profundo', 'jade'], eyeColor: 'azul', traits: { ears: 'barbatana', face: 'guelras', marks: 'escamas', markColor: 'petroleo', crest: 'barbatana', hornColor: 'jade' } }
];
export const RACE_BY_ID = Object.fromEntries(RACES.map((r) => [r.id, r]));

// "Sátiro" / "satiro" / "Tritão" -> id
export function raceIdFromName(name) {
  const key = String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return RACE_BY_ID[key] ? key : RACES.find((r) => key.startsWith(r.id))?.id || 'humano';
}

const SKIN_IDS = new Set(SKINS.map((s) => s.id));
const HAIRC_IDS = new Set(HAIR_COLORS.map((s) => s.id));
const EYEC_IDS = new Set(EYE_COLORS.map((s) => s.id));
const COLOR_IDS = new Set(COLORS.map((c) => c.id));
const EYE_IDS = new Set(EYE_STYLES.map((s) => s.id));
const BEARD_IDS = new Set(BEARDS.map((s) => s.id));

const STARTER = {
  torso: { id: 'tunica-simples' },
  legs: { id: 'calca-simples' },
  feet: { id: 'botas-viagem' }
};

export function defaultAppearance(raceId = 'humano') {
  const race = RACE_BY_ID[raceId] || RACES[0];
  const app = {
    v: APPEARANCE_VERSION,
    race: race.id,
    body: race.body || 'medio',
    height: race.height || 'normal',
    skin: race.skins[0],
    hair: { style: race.hair || 'curto', color: 'castanho-escuro' },
    beard: { style: race.beard || 'nenhuma', color: 'castanho-escuro' },
    eyes: { style: race.eyes || 'atento', color: race.eyeColor || 'castanho' },
    layers: {},
    traits: defaultTraits(race.id)
  };
  for (const [slot, sel] of Object.entries(STARTER)) if (getItem(slot, sel.id)) app.layers[slot] = { id: sel.id, colors: defaultColors(getItem(slot, sel.id)) };
  return app;
}

export function defaultTraits(raceId) {
  const race = RACE_BY_ID[raceId] || RACES[0];
  const t = {};
  for (const g of TRAIT_GROUPS) t[g.id] = race.traits[g.id] ?? g.options[0].id;
  t.hornColor = race.traits.hornColor || 'osso';
  t.markColor = race.traits.markColor || 'ouro';
  t.coat = race.traits.coat || 'castanho';
  return t;
}

export function defaultColors(item) {
  return (item?.channels || []).map((c) => c.def);
}

// Troca de raca: aplica os tracos e o corpo padrao dela, mantendo roupa e cabelo.
export function applyRace(app, raceId) {
  const race = RACE_BY_ID[raceId] || RACES[0];
  const cur = repairAppearance(app);
  const next = {
    ...cur,
    race: race.id,
    body: race.body || cur.body,
    height: race.height || 'normal',
    skin: race.skins.includes(cur.skin) ? cur.skin : race.skins[0],
    traits: defaultTraits(race.id),
    eyes: { style: race.eyes || cur.eyes.style, color: race.eyeColor || cur.eyes.color }
  };
  if (race.hair) next.hair = { ...cur.hair, style: race.hair };
  if (race.beard) next.beard = { ...cur.beard, style: race.beard };
  return repairAppearance(next);
}

function pick(set, v, fallback) { return set.has(v) ? v : fallback; }
function obj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }

// Devolve SEMPRE uma aparencia valida (nunca lanca).
export function repairAppearance(input) {
  const src = obj(input);
  const raceId = RACE_BY_ID[src.race] ? src.race : 'humano';
  const race = RACE_BY_ID[raceId];
  const hair = obj(src.hair), beard = obj(src.beard), eyes = obj(src.eyes);
  const out = {
    v: APPEARANCE_VERSION,
    race: raceId,
    body: BUILDS.some((b) => b.id === src.body) ? src.body : race.body || 'medio',
    height: HEIGHTS.some((b) => b.id === src.height) ? src.height : race.height || 'normal',
    skin: pick(SKIN_IDS, src.skin, race.skins[0]),
    hair: { style: HAIR_BY_ID[hair.style] ? hair.style : (race.hair || 'curto'), color: pick(HAIRC_IDS, hair.color, 'castanho-escuro') },
    beard: { style: pick(BEARD_IDS, beard.style, 'nenhuma'), color: pick(HAIRC_IDS, beard.color, pick(HAIRC_IDS, hair.color, 'castanho-escuro')) },
    eyes: { style: pick(EYE_IDS, typeof src.eyes === 'string' ? src.eyes : eyes.style, 'atento'), color: pick(EYEC_IDS, eyes.color, 'castanho') },
    layers: {},
    traits: {}
  };
  const layers = obj(src.layers);
  for (const { id: slot } of SLOTS) {
    const sel = obj(layers[slot]);
    const item = getItem(slot, sel.id);
    if (!item) continue;
    const given = Array.isArray(sel.colors) ? sel.colors : [];
    out.layers[slot] = { id: item.id, colors: item.channels.map((c, k) => (COLOR_IDS.has(given[k]) ? given[k] : c.def)) };
  }
  const tr = obj(src.traits);
  const def = defaultTraits(raceId);
  for (const g of TRAIT_GROUPS) out.traits[g.id] = g.options.some((o) => o.id === tr[g.id]) ? tr[g.id] : def[g.id];
  for (const k of ['hornColor', 'markColor']) out.traits[k] = COLOR_IDS.has(tr[k]) ? tr[k] : def[k];
  out.traits.coat = HAIRC_IDS.has(tr.coat) || COLOR_IDS.has(tr.coat) ? tr.coat : def.coat;
  return out;
}

// Valida sem consertar: true quando o JSON ja esta no formato canonico.
export function isValidAppearance(input) {
  try { return stable(repairAppearance(input)) === stable(input); } catch { return false; }
}

// JSON com chaves ordenadas: o jsonb do Postgres reordena as chaves.
export function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}

// Sorteio com bom gosto: 2 ou 3 cores de uma mesma "familia" e chance de cada acessorio.
const PALETTES = [
  ['couro', 'linho', 'ferro'], ['vinho', 'carvao', 'ouro'], ['floresta', 'couro-escuro', 'bronze'], ['azul-noite', 'prata', 'osso'],
  ['ameixa', 'carvao', 'prata'], ['ferrugem', 'linho', 'couro-escuro'], ['petroleo', 'osso', 'cobre'], ['carvao', 'sangue', 'aco'],
  ['oliva', 'camurca', 'ferro'], ['ocre', 'couro', 'ouro'], ['chumbo', 'carmesim', 'ferro-negro'], ['jade', 'linho', 'bronze']
];
const CHANCE = { torso: 1, legs: 1, feet: 0.95, head: 0.45, face: 0.15, ears: 0.25, neck: 0.3, back: 0.35, waist: 0.6, arms: 0.3, hands: 0.35, knees: 0.15, held: 0.6 };

export function randomAppearance(rand = Math.random, raceId) {
  const r = (n) => Math.floor(rand() * n);
  const any = (list) => list[r(list.length)];
  const race = RACE_BY_ID[raceId] || any(RACES);
  let app = applyRace(defaultAppearance(race.id), race.id);
  app.body = race.body || any(BUILDS).id;
  app.skin = rand() < 0.8 ? any(race.skins) : any(SKINS).id;
  const hc = any(HAIR_COLORS).id;
  app.hair = { style: race.hair && rand() < 0.7 ? race.hair : any(HAIRS).id, color: hc };
  app.beard = { style: race.beard || (rand() < 0.35 ? any(BEARDS).id : 'nenhuma'), color: hc };
  app.eyes = { style: race.eyes && rand() < 0.6 ? race.eyes : any(EYE_STYLES).id, color: race.eyeColor || any(EYE_COLORS).id };
  const pal = any(PALETTES);
  app.layers = {};
  for (const { id: slot } of SLOTS) {
    if (rand() > (CHANCE[slot] ?? 0.3) || !ITEMS[slot].length) continue;
    const item = any(ITEMS[slot]);
    app.layers[slot] = { id: item.id, colors: item.channels.map((c, k) => (rand() < 0.75 ? pal[(k + r(2)) % 3] : any(COLORS).id)) };
  }
  return repairAppearance(app);
}
