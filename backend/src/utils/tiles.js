// Validacao do mapa em tiles (o editor do front conserta; aqui so aceita o que esta certo).
// Formato: {cols, rows, layers:{ground, objects}, items?, buildings?, light?, decor?, style?} — ver docs/API-v2.md.
// Item recipiente: {container: true, locked?, contents: [itens sem x/y, max 30, sem recipiente dentro]}.
import { z } from 'zod';
import { httpError } from './http.js';

// ASCII imprimivel + Latin-1: os blocos novos usam letras acentuadas como codigo.
const PRINTABLE = /^[\x20-\x7E\u00A1-\u00FF]*$/;
const MAX_LAYERS = 2;
export const ITEM_CATEGORIES = ['Achados', 'Armas', 'Armaduras', 'Poções', 'Tesouro', 'Livros', 'Ingredientes', 'Outros'];
const id = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, 'Id inválido.');
export const MAX_TILES_SIZE = 1000;
export const MAX_TILES_ITEMS = 2000;
export const MAX_TILES_BUILDINGS = 3000;
const cell = z.number().int().min(0).max(MAX_TILES_SIZE - 1);

export const MAX_CONTENTS = 30;
const baseItem = {
  id,
  name: z.string().trim().min(1).max(60),
  description: z.string().max(200).optional().default(''),
  quantity: z.number().int().min(1).max(999).optional().default(1),
  weight: z.number().min(0).max(1000).optional().default(0),
  category: z.enum(ITEM_CATEGORIES).optional().default('Achados'),
  dracmas: z.number().int().min(0).max(100000).optional(),
  // nota secreta do mestre e icone pixel art
  note: z.string().max(300).optional(),
  icon: z.string().regex(/^[a-z0-9_-]{1,60}$/).optional()
};
// item dentro de um recipiente (mochila, bau, saco): sem posicao e sem outro recipiente dentro (1 nivel)
export const contentSchema = z.object(baseItem);
export const itemSchema = z.object({
  ...baseItem,
  x: cell,
  y: cell,
  // configuracao do mestre: pegavel e escondido dos jogadores
  pickable: z.boolean().optional(),
  hidden: z.boolean().optional(),
  // recipiente: os jogadores perto abrem e tiram itens (ou levam tudo); trancado ninguem abre
  container: z.boolean().optional(),
  locked: z.boolean().optional(),
  contents: z.array(contentSchema).max(MAX_CONTENTS, `No máximo ${MAX_CONTENTS} itens dentro de um recipiente.`).optional()
}).transform((item) => (item.contents?.length && !item.container ? { ...item, container: true } : item));
// projeto do catalogo (frontend/src/lib/buildings/designs.js) e trocas do mestre: material principal,
// estilo do telhado e cores (hex). Sem projeto, a construcao usa a casa generica.
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const buildingLook = {
  design: z.string().regex(/^[a-z0-9-]{1,60}$/).optional(),
  material: z.enum(['tabuas', 'verticais', 'troncos', 'pedra', 'tijolo', 'reboco', 'vidro']).optional(),
  roofStyle: z.enum(['escama', 'ardosia', 'palha', 'vidro', 'tabuinhas']).optional(),
  facing: z.enum(['sul', 'norte', 'leste', 'oeste']).optional(),
  colors: z.object({ roof: hex, wall: hex, trim: hex, wood: hex, stone: hex, window: hex, accent: hex }).partial().optional()
};
const buildingSchema = z.object({
  ...buildingLook,
  id,
  x: cell,
  y: cell,
  w: z.number().int().min(3).max(200),
  h: z.number().int().min(3).max(200),
  name: z.string().trim().max(60).optional().default(''),
  roof: z.enum(['telha', 'telha-azul', 'palha', 'palha-escura', 'ardosia', 'ardosia-verde', 'madeira', 'madeira-escura']).optional().default('telha'),
  // fachada 3D (material da parede), porta trancada e o mapa do interior (outra cena)
  wall: z.enum(['madeira', 'pedra', 'tijolo', 'enxaimel']).optional(),
  locked: z.boolean().optional(),
  interior: z.string().uuid().optional().nullable(),
  door: z.object({ x: cell, y: cell }).optional()
});
export const MAP_STYLES = ['padrao', 'obscuro', 'arco-iris', 'outono', 'inverno', 'primavera', 'verao-tropical', 'sepia', 'noturno-azul', 'pastel', 'neon', 'gotico', 'vitral', 'cinzas', 'sangue', 'gelo', 'floresta-encantada', 'deserto', 'pantano', 'aquarela'];
const extrasSchema = z.object({
  items: z.array(itemSchema).max(MAX_TILES_ITEMS, `No máximo ${MAX_TILES_ITEMS} itens no mapa.`).optional().default([]),
  buildings: z.array(buildingSchema).max(MAX_TILES_BUILDINGS, `No máximo ${MAX_TILES_BUILDINGS} construções no mapa.`).optional().default([]),
  light: z.enum(['dia', 'entardecer', 'noite']).optional(),
  decor: z.enum(['nenhuma', 'pouca', 'normal', 'muita']).optional(),
  // estilo global de cor do mapa (frontend/src/lib/tiles/styles.js: mesma lista de ids)
  style: z.enum(MAP_STYLES).optional(),
  // pontos principais (legenda numerada do mapa-item); hidden = so o mestre ve
  pois: z.array(z.object({
    id,
    x: cell,
    y: cell,
    name: z.string().trim().min(1).max(60),
    note: z.string().max(300).optional(),
    hidden: z.boolean().optional()
  })).max(99, 'No máximo 99 pontos principais no mapa.').optional()
});

// Valida o formato {cols, rows, layers:{nome:[linhas]}} com 1 caractere ASCII por celula,
// mais os itens pegaveis e as construcoes (dentro do mapa, ids unicos).
// O que o jogador recebe do mapa: sem itens escondidos e sem a nota secreta do mestre.
// Recipiente trancado: o jogador ve o bau, mas nao o que tem dentro.
export function playerItem({ note, ...item }) {
  if (!Array.isArray(item.contents)) return item;
  return { ...item, contents: item.locked ? [] : item.contents.map(({ note: _note, ...content }) => content) };
}
export function playerTiles(tiles) {
  if (!tiles || typeof tiles !== 'object') return tiles;
  const items = Array.isArray(tiles.items) ? tiles.items.filter((item) => !item.hidden).map(playerItem) : tiles.items;
  const pois = Array.isArray(tiles.pois) ? tiles.pois.filter((p) => !p.hidden) : tiles.pois;
  return { ...tiles, items, ...(pois ? { pois } : {}) };
}

// Porta de uma construcao: a declarada, senao a primeira porta (D, X, (, ?, ]) no contorno,
// senao o meio da parede de baixo (fachada 3D sempre tem porta embaixo).
const DOOR_CODES = new Set(['D', 'X', '(', '?', ']']);
export function buildingDoor(tiles, b) {
  if (b.door) return b.door;
  const g = tiles?.layers?.ground || [];
  for (let x = b.x; x < b.x + b.w; x++) if (DOOR_CODES.has(g[b.y + b.h - 1]?.[x])) return { x, y: b.y + b.h - 1 };
  for (let y = b.y; y < b.y + b.h; y++) for (const x of [b.x, b.x + b.w - 1]) if (DOOR_CODES.has(g[y]?.[x])) return { x, y };
  for (let x = b.x; x < b.x + b.w; x++) if (DOOR_CODES.has(g[b.y]?.[x])) return { x, y: b.y };
  return { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 };
}

export function validateTiles(tiles) {
  if (!tiles || typeof tiles !== 'object') throw httpError('Mapa em tiles inválido.');
  const { cols, rows, layers } = tiles;
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 4 || cols > MAX_TILES_SIZE || rows < 4 || rows > MAX_TILES_SIZE) {
    throw httpError(`O mapa em tiles deve ter entre 4 e ${MAX_TILES_SIZE} colunas e linhas.`);
  }
  if (!layers || typeof layers !== 'object' || Array.isArray(layers)) throw httpError('O mapa precisa de camadas (layers).');
  const names = Object.keys(layers);
  if (!names.length || names.length > MAX_LAYERS) throw httpError('O mapa deve ter 1 ou 2 camadas.');
  for (const name of names) {
    const lines = layers[name];
    if (!/^[a-z_]{1,20}$/.test(name)) throw httpError('Nome de camada inválido.');
    if (!Array.isArray(lines) || lines.length !== rows) throw httpError(`A camada "${name}" deve ter ${rows} linhas.`);
    for (const line of lines) {
      if (typeof line !== 'string' || line.length !== cols || !PRINTABLE.test(line)) {
        throw httpError(`Cada linha da camada "${name}" deve ter exatamente ${cols} caracteres (ASCII ou letras acentuadas).`);
      }
    }
  }
  const parsed = extrasSchema.safeParse(tiles);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw httpError(`Mapa: ${issue.path.join('.')} — ${issue.message}`);
  }
  const { items, buildings, light, decor, style, pois } = parsed.data;
  for (const list of [items, buildings]) {
    if (new Set(list.map((entry) => entry.id)).size !== list.length) throw httpError('Mapa: ids repetidos em itens ou construções.');
  }
  for (const item of items) {
    const inner = item.contents || [];
    if (new Set(inner.map((entry) => entry.id)).size !== inner.length) throw httpError(`Mapa: ids repetidos dentro de "${item.name}".`);
  }
  if (items.some((item) => item.x >= cols || item.y >= rows)) throw httpError('Mapa: item fora do mapa.');
  if (buildings.some((b) => b.x + b.w > cols || b.y + b.h > rows)) throw httpError('Mapa: construção fora do mapa.');
  if ((pois || []).some((p) => p.x >= cols || p.y >= rows)) throw httpError('Mapa: ponto principal fora do mapa.');
  return {
    cols, rows, layers: Object.fromEntries(names.map((name) => [name, [...layers[name]]])),
    items, buildings, ...(light ? { light } : {}), ...(decor ? { decor } : {}), ...(style && style !== 'padrao' ? { style } : {}), ...(pois?.length ? { pois } : {})
  };
}

// Dracmas em moedas (maior moeda primeiro): 1 bronze, 10 prata, 100 platina, 500 ouro.
export function dracmasToCoins(total) {
  let rest = Math.max(0, Math.floor(total));
  const coins = {};
  for (const [coin, value] of [['gold', 500], ['platinum', 100], ['silver', 10], ['bronze', 1]]) {
    coins[coin] = Math.floor(rest / value);
    rest -= coins[coin] * value;
  }
  return coins;
}
