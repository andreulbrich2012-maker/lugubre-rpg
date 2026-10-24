// Ponte entre as construcoes do mapa e o kit: projeto do catalogo (design) ou casa generica
// (mapas antigos/IA, so com parede e telhado), sempre com as trocas do mestre aplicadas.
import { renderBuilding } from './kit.js';
import { DESIGN_BY_ID, buildingSpec, orient } from './designs.js';
import { generateInterior, interiorTypeFor } from './interiors.js';

export { DESIGNS, DESIGN_BY_ID, CATEGORIES, MATERIALS, ROOF_STYLE_OPTIONS, FACINGS } from './designs.js';

// mapas antigos: parede e telhado por nome -> material, estilo e cor do kit
const WALL_TO_MATERIAL = { enxaimel: 'reboco', madeira: 'tabuas', pedra: 'pedra', tijolo: 'tijolo' };
const ROOF_TO_KIT = {
  telha: ['escama', '#b8442e'], 'telha-azul': ['escama', '#4a6a9a'], palha: ['palha', '#c8a050'], 'palha-escura': ['palha', '#8a6a3a'],
  ardosia: ['ardosia', '#4a5070'], 'ardosia-verde': ['ardosia', '#3e6a5a'], madeira: ['tabuinhas', '#8a5a3a'], 'madeira-escura': ['tabuinhas', '#5c4040']
};

// coluna da porta (0..w-1) dentro da pegada
export function doorCol(b, tiles) {
  if (b.door) return Math.max(0, Math.min(b.w - 1, b.door.x - b.x));
  const d = DESIGN_BY_ID[b.design];
  if (d) return d.doorCol;
  const g = tiles?.layers?.ground || [];
  for (let x = b.x; x < b.x + b.w; x++) if ('DX(?]'.includes(g[b.y + b.h - 1]?.[x])) return x - b.x;
  return Math.floor(b.w / 2);
}

export function genericSpec(b, tiles) {
  const W = b.w * 16;
  const [roofStyle, roofColor] = ROOF_TO_KIT[b.roof] || ROOF_TO_KIT.telha;
  const material = b.material || WALL_TO_MATERIAL[b.wall] || (b.roof?.startsWith('palha') ? 'troncos' : 'tabuas');
  const wide = b.w >= 7;
  const big = b.w >= 10 && b.h >= 6;
  return orient({
    w: b.w,
    h: b.h,
    seed: (b.x * 31 + b.y * 17) % 997,
    colors: { roof: roofColor, ...(b.colors || {}) },
    bushes: b.w >= 5 ? [8] : [],
    volumes: [{ x: 0, w: W, wallH: big ? 56 : 36, floors: big ? 2 : 1, roof: wide ? 'frente' : 'empena', pitch: 0.75, chimney: wide, boxes: true, doorAt: doorCol(b, tiles) * 16 + 7.5, material, roofStyle: b.roofStyle || roofStyle }]
  }, b.facing);
}

// Celula de fora onde se fica para usar a porta (e de onde sai a trilha).
export function doorCell(b, tiles) {
  const col = doorCol(b, tiles);
  const lastCol = b.w - 1;
  switch (b.facing) {
    case 'norte': return { x: b.x + col, y: b.y - 1 };
    // porta no canto da fachada daquele lado (o telhado gira para dar a ideia da casa virada)
    case 'leste': return { x: b.x + lastCol, y: b.y + b.h };
    case 'oeste': return { x: b.x, y: b.y + b.h };
    default: return { x: b.x + col, y: b.y + b.h };
  }
}

// Imagem da construcao (RGBA, 16 px por celula). Mesma assinatura do house3d antigo.
export function buildingPixels(b, tiles, { light = 'dia' } = {}) {
  const spec = (b.design && buildingSpec(b)) || genericSpec(b, tiles);
  // estilo geral do mapa (obscuro, arco-iris...): mesma receita de cor do chao, aplicada antes da luz
  return renderBuilding(spec, { light, locked: Boolean(b.locked), style: tiles?.style });
}

// Interior pronto (outra cena) para a construcao: tipo do projeto, tamanho pela casa e parede
// pelo material da fachada. Semente estavel pelo id: o mesmo predio sempre gera o mesmo interior.
const SIZE_TO_INTERIOR = { cabana: 'cabana', pequena: 'pequena', media: 'media', grande: 'grande', casarao: 'sobrado' };
const MATERIAL_TO_WALL = { tabuas: 'madeira', verticais: 'madeira', troncos: 'madeira', reboco: 'enxaimel', pedra: 'pedra', tijolo: 'tijolo' };
export function interiorFor(b) {
  const d = DESIGN_BY_ID[b.design];
  let type = d?.interior || b.name || 'casa';
  let size = d?.size ? SIZE_TO_INTERIOR[d.size] : undefined;
  if (d?.size === 'mansao') { type = 'mansao'; size = 'mansao'; }
  const material = b.material || d?.defaults.material;
  const seed = [...String(b.id)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return generateInterior({ type: interiorTypeFor(type), w: b.w, h: b.h, size, seed, wall: MATERIAL_TO_WALL[material] || b.wall, name: b.name });
}

// Quantas celulas o desenho sobe acima da pegada (telhado, torre). Medido uma vez por projeto.
const riseCache = new Map();
export function roofRise(designId) {
  if (!riseCache.has(designId)) {
    const d = DESIGN_BY_ID[designId];
    if (!d) return 3;
    const img = renderBuilding(buildingSpec({ design: designId, x: 0, y: 0, w: d.w, h: d.h }), {});
    riseCache.set(designId, Math.max(1, Math.ceil(-img.offsetY / 16)));
  }
  return riseCache.get(designId);
}
