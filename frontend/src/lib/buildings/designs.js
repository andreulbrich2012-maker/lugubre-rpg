// Catalogo de construcoes (projetos) montadas com o kit (kit.js). Cada projeto tem forma
// propria (volumes, telhados, extras); material, estilo de telhado e cores sao configuracoes
// que o mestre troca sem mudar o projeto (o mesmo predio em pedra, madeira, tijolo...).
// Campos: id, name, category, interior (tipo de interior pronto), w/h (pegada em celulas),
// doorCol (coluna da porta na pegada), spec (para o kit), defaults {material, roofStyle, colors}.
import { DEFAULT_COLORS } from './kit.js';

const S = 16;
const PALETTES = [
  { roof: '#b8442e', wall: '#e8d6b0', accent: '#3e6e94' },
  { roof: '#5a6a94', wall: '#c8a070', accent: '#4e8a3e' },
  { roof: '#3e7a5a', wall: '#e0c8a0', accent: '#9a3a3a' },
  { roof: '#7a4a8a', wall: '#d8c8b0', accent: '#d0a440' },
  { roof: '#c47a2e', wall: '#b8906a', accent: '#3e6e94' },
  { roof: '#4a5a6a', wall: '#a8a0b0', accent: '#9a3a3a' },
  { roof: '#9a3a3a', wall: '#f0e6d0', accent: '#4e8a3e' },
  { roof: '#2e6a8a', wall: '#d8b888', accent: '#c47a2e' }
];
const pal = (i) => ({ ...DEFAULT_COLORS, ...PALETTES[i % PALETTES.length] });

export const CATEGORIES = ['Casas', 'Fazenda', 'Comércio', 'Cidade', 'Religião', 'Fantasia e ruínas', 'Castelos e muralhas', 'Porto e água', 'Acampamento'];
export const MATERIALS = [
  ['tabuas', 'Tábuas'], ['troncos', 'Troncos'], ['pedra', 'Pedra'], ['tijolo', 'Tijolo'], ['reboco', 'Reboco e enxaimel'], ['verticais', 'Tábuas verticais'], ['vidro', 'Vidro']
];
export const ROOF_STYLE_OPTIONS = [['escama', 'Telha'], ['ardosia', 'Ardósia'], ['palha', 'Palha'], ['tabuinhas', 'Tabuinhas'], ['vidro', 'Vidro']];

const designs = [];
const STYLE_ROOF_COLOR = { palha: '#c8a050', ardosia: '#4a5070', tabuinhas: '#8a5a3a', vidro: '#a8e0ec' };
const MATERIAL_WALL_COLOR = { tijolo: '#b4563c', troncos: '#9a6436' };
const seen = new Set();
function add(d) {
  const key = JSON.stringify([d.w, d.h, d.spec]);
  if (seen.has(key)) return false;
  seen.add(key);
  // coluna da porta: primeiro volume com porta (o kit centraliza a porta no volume)
  const v = d.spec.volumes?.find((x) => x.door !== false) || d.spec.volumes?.[0];
  const doorPx = v ? v.x + (v.doorAt != null ? v.doorAt : (v.w - 1) / 2) : (d.w * S) / 2;
  // cores naturais quando o material/telhado pede (tijolo avermelhado, troncos marrons, palha dourada)
  const c = { ...d.defaults.colors };
  if (MATERIAL_WALL_COLOR[d.defaults.material] && PALETTES.some((p) => p.wall === c.wall)) c.wall = MATERIAL_WALL_COLOR[d.defaults.material];
  if (STYLE_ROOF_COLOR[d.defaults.roofStyle] && d.defaults.roofStyle !== 'escama' && d.defaults.roofStyle !== 'ardosia' && PALETTES.some((p) => p.roof === c.roof)) c.roof = STYLE_ROOF_COLOR[d.defaults.roofStyle];
  d = { ...d, defaults: { ...d.defaults, colors: c } };
  designs.push({ ...d, doorCol: Math.max(0, Math.min(d.w - 1, Math.floor(doorPx / S))) });
  return true;
}

// ---------------- casas (100) ----------------
const SIZES = [
  ['cabana', 'pequenina', 5, 4], ['pequena', 'pequena', 6, 4], ['media', 'média', 7, 5],
  ['grande', 'grande', 8, 5], ['casarao', 'casarão', 10, 6], ['mansao', 'mansão', 12, 7]
];
const one = 36;
const two = 56;
const HOUSE_TEMPLATES = [
  ['frente', 'de telhado frontal', (W) => [{ x: 0, w: W, wallH: one, roof: 'frente', chimney: true, boxes: true }]],
  ['empena', 'de empena', (W) => [{ x: 0, w: W, wallH: one + 2, roof: 'empena', pitch: 0.7, boxes: true }]],
  ['chale', 'chalé', (W) => [{ x: 0, w: W, wallH: one - 6, roof: 'empena', pitch: 1.25 }]],
  ['ala-dir', 'com ala à direita', (W) => [
    { x: 0, w: Math.round(W * 0.62), wallH: one, roof: 'frente', door: false, setback: 8, chimney: true },
    { x: Math.round(W * 0.55), w: Math.round(W * 0.45), wallH: one + 4, roof: 'empena', pitch: 0.75, boxes: true }]],
  ['ala-esq', 'com ala à esquerda', (W) => [
    { x: Math.round(W * 0.38), w: Math.round(W * 0.62), wallH: one, roof: 'frente', door: false, setback: 8, chimney: true },
    { x: 0, w: Math.round(W * 0.45), wallH: one + 4, roof: 'empena', pitch: 0.75, boxes: true }]],
  ['varanda', 'com varanda', (W) => [{ x: 0, w: W, wallH: one, roof: 'frente', chimney: true, porch: Math.min(48, W - 24) }]],
  ['empena-varanda', 'de empena com varanda', (W) => [{ x: 0, w: W, wallH: one + 4, roof: 'empena', pitch: 0.75, porch: Math.min(40, W - 24) }]],
  ['sobrado', 'sobrado', (W) => [{ x: 0, w: W, wallH: two, floors: 2, roof: 'frente', chimney: true }]],
  ['sobrado-empena', 'sobrado de empena', (W) => [{ x: 0, w: W, wallH: two, floors: 2, roof: 'empena', pitch: 0.7 }]],
  ['sobrado-ala', 'sobrado com ala', (W) => [
    { x: 0, w: Math.round(W * 0.6), wallH: two, floors: 2, roof: 'frente', chimney: true },
    { x: Math.round(W * 0.6) - 4, w: Math.round(W * 0.4) + 4, wallH: one, roof: 'empena', pitch: 0.8, door: false, setback: 6 }]],
  ['duas-empenas', 'de duas empenas', (W) => [
    { x: 0, w: Math.round(W / 2) + 2, wallH: one + 2, roof: 'empena', pitch: 0.75, door: false },
    { x: Math.round(W / 2) - 2, w: Math.round(W / 2) + 2, wallH: one + 2, roof: 'empena', pitch: 0.75, boxes: true }]],
  ['geminada', 'geminada', (W) => [
    { x: 0, w: Math.round(W / 2), wallH: one, roof: 'frente', chimney: true, boxes: true },
    { x: Math.round(W / 2), w: Math.round(W / 2), wallH: one, roof: 'frente', chimney: true }]],
  ['torre', 'com torreão', (W) => [{ x: 0, w: W, wallH: one + 4, roof: 'frente', chimney: true, boxes: true }]],
  ['sobrado-varanda', 'sobrado com varanda', (W) => [{ x: 0, w: W, wallH: two, floors: 2, roof: 'empena', pitch: 0.65, porch: Math.min(44, W - 24) }]],
  ['L', 'em L', (W) => [
    { x: 0, w: W, wallH: one - 2, roof: 'frente', door: false, setback: 10 },
    { x: Math.round(W * 0.15), w: Math.round(W * 0.5), wallH: one + 2, roof: 'empena', pitch: 0.8, boxes: true }]]
];
const HOUSE_MATERIALS = ['tabuas', 'reboco', 'pedra', 'tijolo', 'troncos', 'tabuas', 'reboco'];
const HOUSE_ROOFS = ['escama', 'tabuinhas', 'ardosia', 'escama', 'palha'];
let hi = 0;
outer: for (const [tid, tname, build] of HOUSE_TEMPLATES) {
  for (const [sid, sname, w, h] of SIZES) {
    const W = w * S;
    if (tid === 'cabana' && w > 6) continue;
    if (['sobrado-ala', 'duas-empenas', 'geminada', 'L', 'sobrado-varanda', 'torre'].includes(tid) && w < 7) continue;
    if (tid === 'chale' && w > 8) continue;
    const spec = { w, h, volumes: build(W), seed: hi * 7 + 3 };
    if (tid === 'torre') spec.tower = { x: W - 14, r: 9, h: 62 };
    if (hi % 3 === 0) spec.bushes = [8];
    if (hi % 4 === 1) spec.vines = 5;
    const name = `Casa ${sname} ${tname}`;
    if (add({ id: `casa-${tid.toLowerCase()}-${sid}`, name, category: 'Casas', interior: 'casa', size: sid, w, h, spec, defaults: { material: HOUSE_MATERIALS[hi % HOUSE_MATERIALS.length], roofStyle: HOUSE_ROOFS[hi % HOUSE_ROOFS.length], colors: pal(hi) } })) hi++;
    if (hi >= 100) break outer;
  }
}
// completa ate 100 casas com variacoes de forma (porta deslocada + chamine do outro lado)
for (let k = 0; hi < 100 && k < 200; k++) {
  const [sid, sname, w, h] = SIZES[k % SIZES.length];
  const W = w * S;
  const doorAt = Math.round(W * (k % 2 ? 0.28 : 0.72));
  const spec = { w, h, seed: 900 + k, volumes: [{ x: 0, w: W, wallH: k % 3 === 0 ? two : one, floors: k % 3 === 0 ? 2 : 1, roof: k % 2 ? 'empena' : 'frente', pitch: 0.7, doorAt, chimney: true, boxes: k % 2 === 0 }] };
  if (add({ id: `casa-var${k}-${sid}`, name: `Casa ${sname} de porta ${k % 2 ? 'à esquerda' : 'à direita'} ${k % 3 === 0 ? 'em dois andares' : `nº ${k + 1}`}`, category: 'Casas', interior: 'casa', size: sid, w, h, spec, defaults: { material: HOUSE_MATERIALS[k % HOUSE_MATERIALS.length], roofStyle: HOUSE_ROOFS[k % HOUSE_ROOFS.length], colors: pal(k + 3) } })) hi++;
}

// ---------------- fazenda ----------------
const farm = (id, name, w, h, spec, interior, defaults) => add({ id, name, category: 'Fazenda', interior, w, h, spec: { w, h, ...spec }, defaults });
const BARN = { material: 'verticais', roofStyle: 'tabuinhas', colors: { ...DEFAULT_COLORS, wall: '#b03a2e', roof: '#5c4040', trim: '#f2ecdc' } };
for (const [n, w, h] of [['pequeno', 6, 5], ['médio', 8, 6], ['grande', 10, 7]]) {
  farm(`celeiro-${w}`, `Celeiro ${n}`, w, h, { volumes: [{ x: 0, w: w * S, wallH: 40, roof: 'celeiro', barnDoor: true, windows: 0 }] }, 'celeiro', BARN);
  farm(`celeiro-silo-${w}`, `Celeiro ${n} com silo`, w + 2, h, { volumes: [{ x: 0, w: w * S, wallH: 40, roof: 'celeiro', barnDoor: true, windows: 0 }], silo: { x: w * S + 14, r: 12, h: 64 } }, 'celeiro', BARN);
}
farm('galinheiro-p', 'Galinheiro pequeno', 4, 3, { volumes: [{ x: 0, w: 64, wallH: 26, roof: 'empena', pitch: 0.7, windows: 0 }] }, 'celeiro', { material: 'tabuas', roofStyle: 'tabuinhas', colors: pal(4) });
farm('galinheiro-g', 'Galinheiro grande', 6, 4, { volumes: [{ x: 0, w: 96, wallH: 30, roof: 'frente', windows: 1 }] }, 'celeiro', { material: 'tabuas', roofStyle: 'tabuinhas', colors: pal(5) });
farm('estabulo', 'Estábulo', 9, 5, { volumes: [{ x: 0, w: 144, wallH: 34, roof: 'frente', barnDoor: true, doubleDoor: true, winSpacing: 24 }] }, 'estabulo', BARN);
farm('estabulo-longo', 'Estábulo comprido', 12, 5, { volumes: [{ x: 0, w: 192, wallH: 34, roof: 'frente', barnDoor: true, winSpacing: 22 }] }, 'estabulo', BARN);
farm('silo-alto', 'Silo alto', 2, 2, { volumes: [], silo: { x: 16, r: 13, h: 70 } }, 'armazem', { material: 'verticais', roofStyle: 'tabuinhas', colors: { ...DEFAULT_COLORS, wall: '#c8c0b0', roof: '#5a6a94' } });
farm('silo-baixo', 'Silo baixo', 2, 2, { volumes: [], silo: { x: 16, r: 14, h: 46 } }, 'armazem', { material: 'verticais', roofStyle: 'tabuinhas', colors: { ...DEFAULT_COLORS, wall: '#b03a2e', roof: '#5c4040' } });
farm('estufa-p', 'Estufa pequena', 6, 4, { volumes: [{ x: 0, w: 96, wallH: 30, roof: 'empena', pitch: 0.6, material: 'vidro', roofStyle: 'vidro', windows: 0 }] }, 'armazem', { material: 'vidro', roofStyle: 'vidro', colors: { ...DEFAULT_COLORS, wall: '#9ad0e0', roof: '#a8e0ec' } });
farm('estufa-g', 'Estufa grande', 9, 6, { volumes: [{ x: 0, w: 144, wallH: 34, roof: 'frente', material: 'vidro', roofStyle: 'vidro', windows: 0 }] }, 'armazem', { material: 'vidro', roofStyle: 'vidro', colors: { ...DEFAULT_COLORS, wall: '#9ad0e0', roof: '#a8e0ec' } });
for (const [n, w, h, wh] of [['pequeno', 4, 3, 26], ['médio', 5, 4, 30], ['grande', 7, 4, 32]]) {
  farm(`paiol-${w}`, `Paiol ${n}`, w, h, { volumes: [{ x: 0, w: w * S, wallH: wh, roof: 'frente', windows: 0 }] }, 'armazem', { material: 'verticais', roofStyle: 'tabuinhas', colors: pal(w) });
  farm(`barracao-${w}`, `Barracão ${n}`, w + 1, h, { volumes: [{ x: 0, w: (w + 1) * S, wallH: wh, roof: 'empena', pitch: 0.5, barnDoor: true, windows: 0 }] }, 'armazem', { material: 'tabuas', roofStyle: 'tabuinhas', colors: pal(w + 2) });
  farm(`ferramentas-${w}`, `Casa de ferramentas ${n}`, w, h - 1, { volumes: [{ x: 0, w: w * S, wallH: wh - 4, roof: 'empena', pitch: 0.6, windows: 1 }] }, 'armazem', { material: 'tabuas', roofStyle: 'escama', colors: pal(w + 5) });
}
farm('moinho-p', 'Moinho pequeno', 4, 4, { volumes: [], tower: { x: 32, r: 15, h: 52 } }, 'moinho', { material: 'pedra', roofStyle: 'tabuinhas', colors: pal(2) });
farm('moinho-g', 'Moinho grande', 6, 5, { volumes: [], tower: { x: 48, r: 20, h: 70 } }, 'moinho', { material: 'pedra', roofStyle: 'tabuinhas', colors: pal(6) });

// ---------------- comercio ----------------
const shop = (id, name, w, h, spec, interior, defaults) => add({ id, name, category: 'Comércio', interior, w, h, spec: { w, h, ...spec }, defaults });
const SHOPS = [['loja', 'Loja', 'loja'], ['padaria', 'Padaria', 'loja'], ['acougue', 'Açougue', 'loja'], ['alfaiataria', 'Alfaiataria', 'loja'], ['boticario', 'Boticário', 'alquimista'], ['mercearia', 'Mercearia', 'loja']];
SHOPS.forEach(([id, name, interior], i) => {
  for (const [n, w, h, floors] of [['', 7, 5, 1], [' de dois andares', 8, 5, 2], [' de esquina', 9, 6, 1]]) {
    const W = w * S;
    const vols = floors === 2
      ? [{ x: 0, w: W, wallH: two, floors: 2, roof: 'frente', awning: true, sign: true, chimney: true }]
      : n ? [{ x: 0, w: Math.round(W * 0.6), wallH: one + 4, roof: 'frente', awning: true, sign: true }, { x: Math.round(W * 0.55), w: Math.round(W * 0.45), wallH: one + 2, roof: 'empena', pitch: 0.7, door: false, setback: 6 }]
        : [{ x: 0, w: W, wallH: one + 4, roof: i % 2 ? 'empena' : 'frente', pitch: 0.7, awning: true, sign: true }];
    shop(`${id}-${w}`, `${name}${n}`, w, h, { volumes: vols, bushes: i % 2 ? [8] : [] }, interior, { material: ['tijolo', 'tabuas', 'reboco', 'pedra'][i % 4], roofStyle: ['escama', 'ardosia', 'tabuinhas'][i % 3], colors: pal(i + 1) });
  }
});
for (const [n, w, h] of [['pequena', 8, 5], ['média', 10, 6], ['grande', 12, 7]]) {
  shop(`taverna-${w}`, `Taverna ${n}`, w, h, { volumes: [{ x: 0, w: w * S, wallH: two, floors: 2, roof: 'frente', sign: true, chimney: true, porch: 40 }], vines: 6 }, 'taverna', { material: 'reboco', roofStyle: 'escama', colors: pal(w) });
  shop(`estalagem-${w}`, `Estalagem ${n}`, w + 2, h, { volumes: [{ x: 0, w: (w + 2) * S - 40, wallH: two, floors: 2, roof: 'empena', pitch: 0.6, sign: true }, { x: (w + 2) * S - 48, w: 48, wallH: one, roof: 'frente', door: false, setback: 6 }] }, 'taverna', { material: 'tabuas', roofStyle: 'tabuinhas', colors: pal(w + 1) });
  shop(`ferraria-${w}`, `Ferraria ${n}`, w - 1, h, { volumes: [{ x: 0, w: (w - 1) * S, wallH: one + 4, roof: 'frente', chimney: true, doubleDoor: true, sign: true }] }, 'ferraria', { material: 'pedra', roofStyle: 'ardosia', colors: pal(w + 2) });
}
for (const [n, w, h] of [['pequeno', 6, 4], ['grande', 10, 6]]) shop(`mercado-${w}`, `Mercado coberto ${n}`, w, h, { volumes: [{ x: 0, w: w * S, wallH: 30, roof: 'frente', awning: true, windows: 0, doubleDoor: true }] }, 'loja', { material: 'tabuas', roofStyle: 'tabuinhas', colors: pal(w) });
for (const [n, w] of [['de frutas', 4], ['de tecidos', 5], ['de poções', 4]]) shop(`banca-${n}`, `Banca ${n}`, w, 3, { volumes: [], special: 'tenda' }, 'loja', { material: 'tabuas', roofStyle: 'tabuinhas', colors: pal(w + n.length) });

// ---------------- cidade ----------------
const city = (id, name, w, h, spec, interior, defaults) => add({ id, name, category: 'Cidade', interior, w, h, spec: { w, h, ...spec }, defaults });
for (const [n, w, h] of [['', 10, 6], [' grande', 13, 7]]) {
  city(`prefeitura-${w}`, `Prefeitura${n}`, w, h, { volumes: [{ x: 0, w: w * S, wallH: two, floors: 2, roof: 'frente', windows: 2 }], portico: { x: w * 8, w: 56, h: 40 }, bell: { x: w * 8, w: 18, h: 40, setback: 20 } }, 'prefeitura', { material: 'pedra', roofStyle: 'ardosia', colors: pal(5) });
  city(`biblioteca-${w}`, `Biblioteca${n}`, w, h, { volumes: [{ x: 0, w: w * S, wallH: two - 4, floors: 2, roof: 'empena', pitch: 0.5 }], portico: { x: w * 8, w: 48, h: 36 } }, 'biblioteca', { material: 'tijolo', roofStyle: 'ardosia', colors: pal(3) });
  city(`escola-${w}`, `Escola${n}`, w, h, { volumes: [{ x: 0, w: w * S, wallH: one + 4, roof: 'frente', chimney: true }], bell: { x: w * 4, w: 14, h: 28, setback: 18 } }, 'prefeitura', { material: 'tabuas', roofStyle: 'escama', colors: pal(2) });
  city(`quartel-${w}`, `Quartel${n}`, w, h, { volumes: [{ x: 0, w: w * S, wallH: one + 6, roof: 'plano', battlements: true, doubleDoor: true }] }, 'quartel', { material: 'pedra', roofStyle: 'ardosia', colors: pal(6) });
  city(`correio-${w}`, `Correio${n}`, w - 3, h - 1, { volumes: [{ x: 0, w: (w - 3) * S, wallH: one + 2, roof: 'empena', pitch: 0.7, sign: true, awning: true }] }, 'loja', { material: 'tijolo', roofStyle: 'escama', colors: pal(7) });
}
for (const [n, w, h, th] of [['pequena', 3, 3, 48], ['média', 4, 4, 64], ['alta', 4, 4, 84]]) {
  city(`torre-guarda-${th}`, `Torre de guarda ${n}`, w, h, { volumes: [{ x: 0, w: w * S, wallH: th, roof: 'plano', battlements: true, windows: 1 }] }, 'quartel', { material: 'pedra', roofStyle: 'ardosia', colors: pal(5) });
  city(`farol-${th}`, `Farol ${n}`, w, h, { volumes: [], tower: { x: w * 8, r: w * 4 - 2, h: th + 10 } }, 'torre', { material: 'pedra', roofStyle: 'escama', colors: { ...DEFAULT_COLORS, stone: '#e8e0d0', roof: '#b03a2e' } });
}
for (const [n, w] of [['de madeira', 6], ['de pedra', 8]]) {
  city(`portao-${w}`, `Portão ${n}`, w, 3, { volumes: [{ x: 0, w: w * S, wallH: 52, roof: 'plano', battlements: true, barnDoor: true, windows: 0 }] }, 'quartel', { material: w === 6 ? 'verticais' : 'pedra', roofStyle: 'ardosia', colors: pal(w) });
  city(`muralha-${w}`, `Trecho de muralha ${n}`, w, 2, { volumes: [{ x: 0, w: w * S, wallH: 40, roof: 'plano', battlements: true, door: false, windows: 0 }] }, 'quartel', { material: w === 6 ? 'verticais' : 'pedra', roofStyle: 'ardosia', colors: pal(w + 1) });
  city(`guarita-${w}`, `Guarita ${n}`, 3, 3, { volumes: [{ x: 0, w: 48, wallH: 30, roof: w === 6 ? 'empena' : 'plano', pitch: 0.8, battlements: w !== 6, windows: 0 }] }, 'quartel', { material: w === 6 ? 'tabuas' : 'pedra', roofStyle: 'tabuinhas', colors: pal(w + 2) });
}
city('coreto', 'Coreto', 5, 5, { volumes: [{ x: 8, w: 64, wallH: 10, roof: 'empena', pitch: 0.6, windows: 0, door: false }], portico: { x: 40, w: 64, h: 30 } }, 'prefeitura', { material: 'tabuas', roofStyle: 'escama', colors: pal(6) });
city('banco', 'Banco', 8, 5, { volumes: [{ x: 0, w: 128, wallH: two, floors: 2, roof: 'frente', sign: true }], portico: { x: 64, w: 48, h: 38 } }, 'prefeitura', { material: 'pedra', roofStyle: 'ardosia', colors: pal(4) });
city('torre-relogio', 'Torre do relógio', 4, 4, { volumes: [], bell: { x: 32, w: 30, h: 76 } }, 'torre', { material: 'pedra', roofStyle: 'ardosia', colors: pal(5) });

// ---------------- religiao ----------------
const holy = (id, name, w, h, spec, interior, defaults) => add({ id, name, category: 'Religião', interior, w, h, spec: { w, h, ...spec }, defaults });
for (const [n, w, h] of [['pequena', 6, 6], ['média', 8, 7], ['grande', 10, 8]]) {
  holy(`capela-${w}`, `Capela ${n}`, w, h, { volumes: [{ x: 0, w: w * S, wallH: one + 8, roof: 'empena', pitch: 0.95, windows: 2 }], bell: { x: w * 8, w: 16, h: 30, setback: 22 } }, 'capela', { material: 'pedra', roofStyle: 'ardosia', colors: pal(5) });
  holy(`igreja-${w}`, `Igreja ${n}`, w + 2, h + 1, { volumes: [{ x: 0, w: (w + 2) * S, wallH: two, roof: 'empena', pitch: 0.8, floors: 2 }], bell: { x: 20, w: 22, h: 80 } }, 'capela', { material: 'pedra', roofStyle: 'ardosia', colors: pal(6) });
}
for (const [n, w] of [['menor', 7], ['maior', 10]]) {
  holy(`templo-${w}`, `Templo ${n}`, w, 6, { volumes: [{ x: 0, w: w * S, wallH: one + 10, roof: 'empena', pitch: 0.4, windows: 0 }], portico: { x: w * 8, w: w * S - 24, h: 44 } }, 'capela', { material: 'pedra', roofStyle: 'ardosia', colors: { ...DEFAULT_COLORS, trim: '#ece4d2', roof: '#6a6a8a' } });
  holy(`mausoleu-${w}`, `Mausoléu ${n}`, w - 3, 5, { volumes: [{ x: 0, w: (w - 3) * S, wallH: 32, roof: 'empena', pitch: 0.5, windows: 0, doubleDoor: true }], portico: { x: (w - 3) * 8, w: 40, h: 30 } }, 'cripta', { material: 'pedra', roofStyle: 'ardosia', colors: { ...DEFAULT_COLORS, stone: '#7a7488', roof: '#3a3a4a' } });
  holy(`cripta-${w}`, `Entrada de cripta ${n}`, w - 4, 4, { volumes: [{ x: 0, w: (w - 4) * S, wallH: 26, roof: 'plano', windows: 0, doubleDoor: true }] }, 'cripta', { material: 'pedra', roofStyle: 'ardosia', colors: { ...DEFAULT_COLORS, stone: '#5a5468' } });
  holy(`santuario-${w}`, `Santuário ${n}`, w - 3, 4, { volumes: [{ x: 0, w: (w - 3) * S, wallH: 28, roof: 'empena', pitch: 1, windows: 0 }] }, 'capela', { material: 'reboco', roofStyle: 'escama', colors: pal(w) });
}

// ---------------- fantasia e ruinas ----------------
const fant = (id, name, w, h, spec, interior, defaults) => add({ id, name, category: 'Fantasia e ruínas', interior, w, h, spec: { w, h, ...spec }, defaults });
for (const [n, w, th] of [['pequena', 4, 60], ['alta', 5, 84], ['arcana', 6, 100]]) {
  fant(`torre-mago-${w}`, `Torre de mago ${n}`, w, w, { volumes: [], tower: { x: w * 8, r: w * 6 - 4, h: th } }, 'torre', { material: 'pedra', roofStyle: 'escama', colors: { ...DEFAULT_COLORS, roof: '#4a3a8a', stone: '#8a8aa0' } });
}
for (const [n, w] of [['torta', 5], ['do pântano', 6]]) fant(`cabana-bruxa-${w}`, `Cabana da bruxa ${n}`, w, 4, { volumes: [{ x: 0, w: w * S, wallH: 30, roof: 'empena', pitch: 1.3, windows: 1 }], vines: 4, bushes: [6] }, 'alquimista', { material: 'troncos', roofStyle: 'palha', colors: { ...DEFAULT_COLORS, roof: '#6a5a3a', wall: '#6a4a3a', accent: '#6a3a8a' } });
for (const [n, w, col] of [['vermelha', 4, '#c43a3a'], ['azul', 5, '#3a6ac4'], ['roxa', 6, '#8a4ac4']]) fant(`cogumelo-${w}`, `Casa-cogumelo ${n}`, w, 4, { volumes: [], special: 'cogumelo' }, 'casa', { material: 'reboco', roofStyle: 'escama', colors: { ...DEFAULT_COLORS, roof: col } });
// tent: n deixa a tenda diferente da banca de feira de mesma largura (o catalogo descarta projeto repetido)
for (const [n, w] of [['pequena', 4], ['grande', 6], ['de festa', 5]]) fant(`tenda-${w}-${n.length}`, `Tenda ${n}`, w, 3, { volumes: [], special: 'tenda', tent: n }, 'casa', { material: 'tabuas', roofStyle: 'tabuinhas', colors: { ...DEFAULT_COLORS, accent: ['#9a3a3a', '#3e6e94', '#d0a440'][w % 3], wall: '#ece4d2' } });
for (const [w, acc, wall] of [[3, '#6b5e3e', '#a8996e'], [4, '#5a6040', '#9c9270']]) fant(`barraca-acampamento-${w}`, `Barraca de acampamento ${w === 3 ? 'pequena' : 'grande'}`, w, 3, { volumes: [], special: 'tenda', tent: 'acampamento' }, 'casa', { material: 'tabuas', roofStyle: 'tabuinhas', colors: { ...DEFAULT_COLORS, accent: acc, wall } });
for (const [n, w] of [['pequena', 5], ['grande', 7]]) fant(`pescador-${w}`, `Cabana de pescador ${n}`, w, 4, { volumes: [{ x: 0, w: w * S, wallH: 28, roof: 'frente', windows: 1 }], stilts: 10 }, 'casa', { material: 'tabuas', roofStyle: 'palha', colors: pal(w) });
for (const [n, w, h] of [['pequena', 5, 4], ['média', 7, 5], ['grande', 9, 6], ['de pedra', 8, 5]]) {
  fant(`ruina-${w}-${h}`, `Casa em ruínas ${n}`, w, h, { volumes: [{ x: 0, w: w * S, wallH: one, roof: 'frente', ruin: true }], vines: 5 }, 'casa', { material: n === 'de pedra' ? 'pedra' : 'tabuas', roofStyle: 'tabuinhas', colors: { ...DEFAULT_COLORS, wall: '#8a7a6a', roof: '#5a4a4a' } });
  fant(`abandonada-${w}-${h}`, `Casa abandonada ${n}`, w, h, { volumes: [{ x: 0, w: w * S, wallH: one + 2, roof: 'empena', pitch: 0.8, ruin: true }], vines: 3, bushes: [6, w * S - 6] }, 'casa', { material: 'tabuas', roofStyle: 'tabuinhas', colors: { ...DEFAULT_COLORS, wall: '#7a6a5a', roof: '#4a4048', accent: '#5a5a5a' } });
}
for (const [n, w, h] of [['pequeno', 10, 7], ['grande', 14, 8]]) {
  fant(`castelo-${w}`, `Castelo ${n}`, w, h, { volumes: [{ x: 0, w: w * S, wallH: two + 8, roof: 'plano', battlements: true, doubleDoor: true }], tower: { x: 16, r: 14, h: 90 } }, 'mansao', { material: 'pedra', roofStyle: 'ardosia', colors: pal(5) });
  fant(`forte-${w}`, `Forte ${n}`, w, h - 1, { volumes: [{ x: 0, w: w * S, wallH: two, roof: 'plano', battlements: true, barnDoor: true }] }, 'quartel', { material: 'verticais', roofStyle: 'tabuinhas', colors: pal(4) });
}
fant('mina', 'Entrada de mina', 4, 3, { volumes: [{ x: 0, w: 64, wallH: 26, roof: 'frente', windows: 0, barnDoor: true }] }, 'cripta', { material: 'troncos', roofStyle: 'tabuinhas', colors: pal(4) });
for (const [n, w] of [['pequena', 4], ['grande', 6]]) fant(`iurta-${w}`, `Iurta ${n}`, w, 4, { volumes: [], tower: { x: w * 8, r: w * 8 - 4, h: 22 } }, 'casa', { material: 'reboco', roofStyle: 'palha', colors: { ...DEFAULT_COLORS, stone: '#d8c8a8', roof: '#9a6a3a' } });

// ---------------- completa ate 250 com variacoes de oficios e chales ----------------
const EXTRA = [['oficina', 'Oficina', 'ferraria'], ['carpintaria', 'Carpintaria', 'ferraria'], ['curtume', 'Curtume', 'armazem'], ['armazem', 'Armazém', 'armazem'], ['casa-de-cha', 'Casa de chá', 'taverna'], ['joalheria', 'Joalheria', 'loja'], ['livraria', 'Livraria', 'biblioteca'], ['estalagem-estrada', 'Estalagem de estrada', 'taverna'], ['casa-de-banho', 'Casa de banhos', 'casa'], ['guilda', 'Sede de guilda', 'prefeitura']];
for (let k = 0; designs.length < 250 && k < 400; k++) {
  const [id, name, interior] = EXTRA[k % EXTRA.length];
  const sizeIdx = Math.floor(k / EXTRA.length) % 4;
  const [n, w, h] = [['pequena', 6, 4], ['média', 7, 5], ['grande', 9, 6], ['comprida', 11, 5]][sizeIdx];
  const W = w * S;
  const variant = Math.floor(k / (EXTRA.length * 4));
  const roof = (k + variant) % 3 === 0 ? 'empena' : (k + variant) % 3 === 1 ? 'frente' : 'celeiro';
  const spec = { w, h, seed: 2000 + k, volumes: [{ x: 0, w: W, wallH: variant % 2 ? two : one + 4, floors: variant % 2 ? 2 : 1, roof, pitch: 0.65, sign: k % 2 === 0, awning: k % 3 === 0, chimney: k % 2 === 1, porch: variant === 2 ? 36 : 0 }] };
  add({ id: `${id}-${n}-${variant}`, name: `${name} ${n}${variant ? ` (modelo ${variant + 1})` : ''}`, category: 'Comércio', interior, w, h, spec, defaults: { material: ['tijolo', 'tabuas', 'pedra', 'reboco'][k % 4], roofStyle: ['escama', 'tabuinhas', 'ardosia'][k % 3], colors: pal(k) } });
}

// ---------------- projetos novos (depois do enchimento: nao mudam os ids antigos) ----------------
const novo = (category) => (id, name, w, h, spec, interior, defaults) => add({ id, name, category, interior, w, h, spec: { w, h, ...spec }, defaults });
// igreja/capela em ruinas: telhado quebrado, pedaco da parede caido, mato e musgo, torre sem agulha
const RUINA_IGREJA = { ...DEFAULT_COLORS, stone: '#7a7484', wall: '#8e8898', roof: '#4a4656', trim: '#b4ac9c', window: '#2e3440', accent: '#5a5a5a', wood: '#6a4a34' };
const ruinaIgreja = novo('Fantasia e ruínas');
ruinaIgreja('capela-ruina-6', 'Capela em ruínas', 6, 6, { seed: 41, volumes: [{ x: 0, w: 96, wallH: 44, roof: 'empena', pitch: 0.95, windows: 2, shutters: false, ruin: true, collapse: { at: 0.72, w: 36 } }], bell: { x: 48, w: 16, h: 30, setback: 22, broken: true, seed: 2 }, overgrown: 0.3, vines: 6, bushes: [6, 90] }, 'capela', { material: 'pedra', roofStyle: 'ardosia', colors: RUINA_IGREJA });
ruinaIgreja('igreja-ruina-12', 'Igreja em ruínas grande', 12, 9, { seed: 43, volumes: [{ x: 0, w: 192, wallH: 58, roof: 'empena', pitch: 0.75, lancet: 'vazia', buttress: true, winSpacing: 24, ruin: true, collapse: { at: 0.64, w: 72 } }], bell: { x: 22, w: 26, h: 78, broken: true, seed: 5 }, overgrown: 0.32, vines: 4, bushes: [60, 180] }, 'capela', { material: 'pedra', roofStyle: 'ardosia', colors: RUINA_IGREJA });

// palafitas: casa sobre estacas altas com deque e escada (a fileira da frente e o chao/agua)
const palafita = novo('Porto e água');
palafita('palafita-4', 'Casa de palafita pequena', 4, 5, { seed: 51, stilts: 26, deck: 18, volumes: [{ x: 4, w: 56, wallH: 28, roof: 'empena', pitch: 0.95, setback: 18, windows: 1 }] }, 'casa', { material: 'tabuas', roofStyle: 'palha', colors: { ...pal(4), wood: '#6a4a30' } });
palafita('palafita-6', 'Casa de palafita', 6, 5, { seed: 52, stilts: 24, deck: 16, volumes: [{ x: 0, w: 96, wallH: 30, roof: 'frente', depth: 30, setback: 16, winSpacing: 22 }] }, 'casa', { material: 'tabuas', roofStyle: 'palha', colors: { ...pal(1), wood: '#6a4a30' } });
palafita('palafita-8', 'Casa de palafita grande', 8, 6, { seed: 53, stilts: 28, deck: 18, volumes: [{ x: 0, w: 84, wallH: 32, roof: 'frente', depth: 34, setback: 18, chimney: true }, { x: 76, w: 52, wallH: 28, roof: 'empena', pitch: 0.8, setback: 26, door: false, windows: 1 }] }, 'casa', { material: 'verticais', roofStyle: 'tabuinhas', colors: { ...pal(7), wood: '#6a4a30' } });

// castelo grande com patio e torres de muralha
const castelo = novo('Castelos e muralhas');
const CASTELO = { ...DEFAULT_COLORS, roof: '#4a5a8a', stone: '#8a8498', wall: '#a49eb0', accent: '#9a3a3a', window: '#4a72b0' };
for (const [n, w, h] of [['', 20, 14], [' grande', 26, 16]]) castelo(`castelo-patio-${w}`, `Castelo com pátio${n}`, w, h, { seed: 60 + w, volumes: [], special: 'castelo', rise: h * 16 + 120 }, 'mansao', { material: 'pedra', roofStyle: 'ardosia', colors: CASTELO });
castelo('torre-muralha-3', 'Torre de muralha quadrada', 3, 3, { volumes: [{ x: 0, w: 48, wallH: 58, roof: 'plano', battlements: true, slits: true }] }, 'quartel', { material: 'pedra', roofStyle: 'ardosia', colors: CASTELO });
castelo('torre-muralha-4', 'Torre de muralha quadrada grande', 4, 4, { volumes: [{ x: 0, w: 64, wallH: 68, roof: 'plano', battlements: true, slits: true }] }, 'quartel', { material: 'pedra', roofStyle: 'ardosia', colors: CASTELO });
castelo('torre-muralha-redonda-4', 'Torre de muralha redonda', 4, 4, { volumes: [], tower: { x: 32, r: 26, h: 60, crown: true, door: true } }, 'quartel', { material: 'pedra', roofStyle: 'ardosia', colors: CASTELO });

// tendas variadas (cada uma com forma propria: 'tent' muda o desenho)
const tenda = novo('Acampamento');
const LONA = (wall, accent, roof = accent, wood = '#6a4a30') => ({ ...DEFAULT_COLORS, wall, accent, roof, wood });
tenda('tenda-redonda-4', 'Tenda redonda de feltro', 4, 4, { volumes: [], special: 'tenda', tent: 'redonda', rise: 120 }, 'casa', { material: 'tabuas', roofStyle: 'palha', colors: LONA('#e8dcc0', '#9a3a3a', '#b89a6a') });
tenda('tenda-redonda-5', 'Tenda redonda grande', 5, 4, { volumes: [], special: 'tenda', tent: 'redonda', rise: 120 }, 'casa', { material: 'tabuas', roofStyle: 'palha', colors: LONA('#d8d0c0', '#3e6e94', '#9a8a6a') });
tenda('tenda-canadense-3', 'Barraca canadense', 3, 3, { volumes: [], special: 'tenda', tent: 'canadense', rise: 110 }, 'casa', { material: 'tabuas', roofStyle: 'tabuinhas', colors: LONA('#8a9a6a', '#6a4a3a') });
tenda('tenda-canadense-4', 'Barraca canadense grande', 4, 4, { volumes: [], special: 'tenda', tent: 'canadense', rise: 120 }, 'casa', { material: 'tabuas', roofStyle: 'tabuinhas', colors: LONA('#e0d4b8', '#9a3a3a') });
tenda('tenda-abrigo-3', 'Abrigo de lona', 3, 3, { volumes: [], special: 'tenda', tent: 'abrigo', rise: 100 }, 'casa', { material: 'tabuas', roofStyle: 'tabuinhas', colors: LONA('#a89a7a', '#5a6a8a') });
tenda('tenda-abrigo-4', 'Abrigo de lona comprido', 4, 3, { volumes: [], special: 'tenda', tent: 'abrigo', rise: 100 }, 'casa', { material: 'tabuas', roofStyle: 'tabuinhas', colors: LONA('#8a8a6a', '#9a5a3a') });
tenda('tenda-lider-7', 'Tenda do líder', 7, 5, { volumes: [], special: 'tenda', tent: 'lider', rise: 140 }, 'casa', { material: 'tabuas', roofStyle: 'tabuinhas', colors: LONA('#ece4d2', '#9a3a3a', '#9a3a3a') });
tenda('tenda-lider-9', 'Pavilhão do comandante', 9, 6, { volumes: [], special: 'tenda', tent: 'lider', rise: 150 }, 'casa', { material: 'tabuas', roofStyle: 'tabuinhas', colors: LONA('#ece4d2', '#d0a440', '#2e5a8a') });
tenda('tenda-mercado-5', 'Tenda de mercado', 5, 3, { volumes: [], special: 'tenda', tent: 'mercado', rise: 110 }, 'loja', { material: 'tabuas', roofStyle: 'tabuinhas', colors: LONA('#f0e6d0', '#3e8a5a') });
tenda('tenda-mercado-7', 'Tenda de mercado grande', 7, 4, { volumes: [], special: 'tenda', tent: 'mercado', rise: 120 }, 'loja', { material: 'tabuas', roofStyle: 'tabuinhas', colors: LONA('#f0e6d0', '#c47a2e') });

// porto: armazem do cais, guindaste, casa do capitao, mercado de peixe
const porto = novo('Porto e água');
const CAIS = [{ k: 'caixas', x: 22 }, { k: 'corda', x: 100 }, { k: 'barril', x: 120 }, { k: 'barril', x: 132 }];
porto('armazem-cais-9', 'Armazém do cais', 9, 6, { seed: 71, volumes: [{ x: 0, w: 144, wallH: 56, roof: 'empena', pitch: 0.5, barnDoor: true, hoist: true, winSpacing: 24 }], props: CAIS }, 'armazem', { material: 'verticais', roofStyle: 'tabuinhas', colors: { ...pal(1), wall: '#8a6a4a', roof: '#5a4a4a' } });
porto('armazem-cais-12', 'Armazém do cais grande', 12, 7, { seed: 72, volumes: [{ x: 0, w: 128, wallH: 60, roof: 'empena', pitch: 0.5, barnDoor: true, hoist: true, winSpacing: 24 }, { x: 120, w: 72, wallH: 40, roof: 'frente', setback: 8, door: false, winSpacing: 22 }], props: [{ k: 'caixas', x: 20 }, { k: 'barril', x: 104 }, { k: 'caixa', x: 150 }, { k: 'corda', x: 172 }] }, 'armazem', { material: 'verticais', roofStyle: 'tabuinhas', colors: { ...pal(5), wall: '#7a6a5a', roof: '#4a5a6a' } });
porto('guindaste-4', 'Guindaste de madeira do porto', 4, 3, { volumes: [], special: 'guindaste', rise: 120 }, 'armazem', { material: 'tabuas', roofStyle: 'tabuinhas', colors: { ...DEFAULT_COLORS, wood: '#8a5a34' } });
porto('casa-capitao-7', 'Casa do capitão do porto', 7, 5, { seed: 73, volumes: [{ x: 0, w: 84, wallH: 56, floors: 2, roof: 'frente', chimney: true, sign: true }, { x: 80, w: 32, wallH: 78, roof: 'empena', pitch: 1.1, setback: 4, door: false, windows: 1, flag: true, flagAt: 0.4 }], props: [{ k: 'ancora', x: 98 }] }, 'casa', { material: 'tabuas', roofStyle: 'ardosia', colors: { ...DEFAULT_COLORS, wall: '#e4e0d6', roof: '#2e5a7a', accent: '#2e4a6a', trim: '#f4f0e6' } });
porto('casa-capitao-9', 'Casa do capitão com varanda', 9, 6, { seed: 74, volumes: [{ x: 0, w: 104, wallH: 56, floors: 2, roof: 'empena', pitch: 0.6, porch: 40 }, { x: 100, w: 44, wallH: 82, roof: 'empena', pitch: 1, setback: 6, door: false, windows: 1, flag: true, flagAt: 0.4 }], props: [{ k: 'ancora', x: 128 }, { k: 'corda', x: 12 }] }, 'casa', { material: 'reboco', roofStyle: 'escama', colors: { ...DEFAULT_COLORS, roof: '#2e5a7a', accent: '#2e4a6a' } });
porto('mercado-peixe-6', 'Mercado de peixe', 6, 4, { volumes: [], special: 'telheiro', goods: 'peixe', rise: 110, props: [{ k: 'cesto', x: 10 }, { k: 'barril', x: 88 }] }, 'loja', { material: 'tabuas', roofStyle: 'tabuinhas', colors: { ...pal(7), roof: '#7a5a3a' } });
porto('mercado-peixe-9', 'Mercado de peixe grande', 9, 5, { volumes: [], special: 'telheiro', goods: 'peixe', rise: 120, props: [{ k: 'cesto', x: 10 }, { k: 'barril', x: 134 }, { k: 'cesto', x: 120, fill: 'peixe' }] }, 'loja', { material: 'tabuas', roofStyle: 'escama', colors: { ...pal(0), roof: '#3e6e94' } });

// igreja gotica escura (mapas pintados sombrios) e moinho d'agua
const GOTICO = { ...DEFAULT_COLORS, wall: '#5e5868', stone: '#4a4654', roof: '#2c2a38', trim: '#8a8496', window: '#3a3a6a', wood: '#4a3428', accent: '#7a2a3a' };
const gotica = novo('Religião');
gotica('igreja-gotica-10', 'Igreja gótica escura', 10, 10, { seed: 81, volumes: [{ x: 36, w: 124, wallH: 66, roof: 'empena', pitch: 1.4, lancet: true, buttress: true, rose: true, shutters: false, winSpacing: 22, doubleDoor: true }], bell: { x: 20, w: 28, h: 104, spire: true } }, 'capela', { material: 'pedra', roofStyle: 'ardosia', colors: GOTICO });
gotica('capela-gotica-8', 'Capela gótica escura', 8, 8, { seed: 82, volumes: [{ x: 30, w: 98, wallH: 54, roof: 'empena', pitch: 1.3, lancet: true, buttress: true, rose: true, shutters: false, winSpacing: 22 }], bell: { x: 16, w: 22, h: 72, spire: true } }, 'capela', { material: 'pedra', roofStyle: 'ardosia', colors: GOTICO });
const moinho = novo('Fazenda');
moinho('moinho-agua-8', "Moinho d'água", 8, 5, { seed: 91, volumes: [{ x: 0, w: 88, wallH: 44, roof: 'frente', winSpacing: 22 }], wheel: { x: 108, r: 21, flume: 128 } }, 'moinho', { material: 'pedra', roofStyle: 'tabuinhas', colors: { ...pal(2), wood: '#7a4a2e' } });
moinho('moinho-agua-10', "Moinho d'água grande", 10, 6, { seed: 92, volumes: [{ x: 0, w: 116, wallH: 58, floors: 2, roof: 'empena', pitch: 0.7, chimney: true }], wheel: { x: 136, r: 22, flume: 158 } }, 'moinho', { material: 'reboco', roofStyle: 'escama', colors: { ...pal(0), wood: '#7a4a2e' } });

export const DESIGNS = designs;
export const DESIGN_BY_ID = Object.fromEntries(designs.map((d) => [d.id, d]));
// ids antigos com maiuscula (casa-L-media...) continuam valendo em mapas salvos
for (const d of designs) if (d.id.startsWith('casa-l-')) DESIGN_BY_ID[`casa-L-${d.id.slice(7)}`] = d;

// Construcao do mapa -> especificacao final para o kit: projeto + trocas do mestre
// (material principal, estilo do telhado e cores). Volumes de material fixo (vidro) ficam.
export function buildingSpec(b) {
  const d = DESIGN_BY_ID[b.design];
  if (!d) return null;
  const material = b.material || d.defaults.material;
  const roofStyle = b.roofStyle || d.defaults.roofStyle;
  const colors = { ...d.defaults.colors };
  // trocou o estilo do telhado sem escolher cor: usa a cor natural do novo estilo (palha dourada etc.)
  if (b.roofStyle && b.roofStyle !== d.defaults.roofStyle && STYLE_ROOF_COLOR[b.roofStyle]) colors.roof = STYLE_ROOF_COLOR[b.roofStyle];
  if (b.material && b.material !== d.defaults.material) colors.wall = MATERIAL_WALL_COLOR[b.material] || PALETTES[0].wall;
  Object.assign(colors, b.colors || {});
  return orient({
    ...d.spec,
    w: d.w,
    h: d.h,
    // especiais sem volumes (castelo, tendas, telheiro) tambem obedecem a troca de material/telhado
    material,
    roofStyle,
    colors,
    volumes: (d.spec.volumes || []).map((v, i) => ({ ...v, ...(b.door && i === d.spec.volumes.findIndex((x) => x.door !== false) ? { doorAt: (b.door.x - b.x) * S + 7.5 - v.x } : {}), material: v.material === 'vidro' ? 'vidro' : material, roofStyle: v.roofStyle === 'vidro' ? 'vidro' : roofStyle }))
  }, b.facing);
}

// Para onde a porta da construcao esta virada. A camera e sempre de cima-sul (3/4), entao:
// sul = porta na fachada; norte = fachada sem porta (a porta fica atras); leste/oeste = porta
// no canto da fachada daquele lado e o telhado "gira" (frontal vira empena e vice-versa).
export const FACINGS = [['sul', 'Sul (para baixo)'], ['norte', 'Norte (para cima)'], ['leste', 'Leste (direita)'], ['oeste', 'Oeste (esquerda)']];
export function orient(spec, facing) {
  if (!facing || facing === 'sul' || !spec?.volumes?.length) return spec;
  const di = spec.volumes.findIndex((v) => v.door !== false);
  const volumes = spec.volumes.map((v, i) => {
    const out = { ...v };
    if (facing === 'norte') { out.door = false; out.porch = 0; }
    else if (i === di) { out.doorAt = facing === 'leste' ? v.w - 11 : 10; out.porch = 0; }
    if (facing !== 'norte' && v.w <= 112 && (v.roof === 'frente' || v.roof === 'empena')) {
      out.roof = v.roof === 'frente' ? 'empena' : 'frente';
      if (out.roof === 'empena') out.pitch = out.pitch || 0.7;
    }
    return out;
  });
  return { ...spec, volumes };
}
