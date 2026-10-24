// Validacao do mapa em tiles (o editor do front conserta; aqui so aceita o que esta certo).
// Formato: {cols, rows, layers:{ground, objects}, items?, buildings?, light?, decor?} — ver docs/API-v2.md.
import { z } from 'zod';
import { httpError } from './http.js';

// ASCII imprimivel + Latin-1: os blocos novos usam letras acentuadas como codigo.
const PRINTABLE = /^[\x20-\x7E\u00A1-\u00FF]*$/;
const MAX_LAYERS = 2;
export const ITEM_CATEGORIES = ['Achados', 'Armas', 'Armaduras', 'Poções', 'Tesouro', 'Livros', 'Ingredientes', 'Outros'];
const id = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, 'Id inválido.');
const cell = z.number().int().min(0).max(79);

const itemSchema = z.object({
  id,
  x: cell,
  y: cell,
  name: z.string().trim().min(1).max(60),
  description: z.string().max(200).optional().default(''),
  quantity: z.number().int().min(1).max(999).optional().default(1),
  weight: z.number().min(0).max(1000).optional().default(0),
  category: z.enum(ITEM_CATEGORIES).optional().default('Achados'),
  dracmas: z.number().int().min(0).max(100000).optional()
});
const buildingSchema = z.object({
  id,
  x: cell,
  y: cell,
  w: z.number().int().min(3).max(80),
  h: z.number().int().min(3).max(80),
  name: z.string().trim().max(60).optional().default(''),
  roof: z.enum(['telha', 'palha', 'ardosia', 'madeira']).optional().default('telha')
});
const extrasSchema = z.object({
  items: z.array(itemSchema).max(60, 'No máximo 60 itens no mapa.').optional().default([]),
  buildings: z.array(buildingSchema).max(30, 'No máximo 30 construções no mapa.').optional().default([]),
  light: z.enum(['dia', 'entardecer', 'noite']).optional(),
  decor: z.enum(['nenhuma', 'pouca', 'normal', 'muita']).optional()
});

// Valida o formato {cols, rows, layers:{nome:[linhas]}} com 1 caractere ASCII por celula,
// mais os itens pegaveis e as construcoes (dentro do mapa, ids unicos).
export function validateTiles(tiles) {
  if (!tiles || typeof tiles !== 'object') throw httpError('Mapa em tiles inválido.');
  const { cols, rows, layers } = tiles;
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 4 || cols > 80 || rows < 4 || rows > 80) {
    throw httpError('O mapa em tiles deve ter entre 4 e 80 colunas e linhas.');
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
  const { items, buildings, light, decor } = parsed.data;
  for (const list of [items, buildings]) {
    if (new Set(list.map((entry) => entry.id)).size !== list.length) throw httpError('Mapa: ids repetidos em itens ou construções.');
  }
  if (items.some((item) => item.x >= cols || item.y >= rows)) throw httpError('Mapa: item fora do mapa.');
  if (buildings.some((b) => b.x + b.w > cols || b.y + b.h > rows)) throw httpError('Mapa: construção fora do mapa.');
  return {
    cols, rows, layers: Object.fromEntries(names.map((name) => [name, [...layers[name]]])),
    items, buildings, ...(light ? { light } : {}), ...(decor ? { decor } : {})
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
