// Formato do mapa (o backend valida igual):
// {cols, rows, layers: {ground: [rows de cols chars], objects: [idem]},
//  items: [{id, x, y, name, description, quantity, weight, category, dracmas?}],   (pegaveis, max 60)
//  buildings: [{id, x, y, w, h, name, roof}]}                                      (telhados, max 30)
// Funcoes puras: sempre devolvem um mapa novo (o desfazer guarda as versoes antigas).
import { DEFAULT_GROUND, EMPTY_OBJECT, getTile } from './catalog.js';

export const MIN_SIZE = 4;
export const MAX_SIZE = 80;
export const LAYERS = ['ground', 'objects'];

const emptyCode = (layer) => (layer === 'ground' ? DEFAULT_GROUND : EMPTY_OBJECT);
const clampSize = (n) => Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(Number(n)) || MIN_SIZE));
const PRINTABLE = /^[\x20-\x7e]*$/;

export const MAX_ITEMS = 60;
export const MAX_BUILDINGS = 30;
export const ITEM_CATEGORIES = ['Achados', 'Armas', 'Armaduras', 'Poções', 'Tesouro', 'Livros', 'Ingredientes', 'Outros'];
export const ROOF_TYPES = ['telha', 'palha', 'ardosia', 'madeira'];
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const num = (v, min, max, dflt) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
};
const text = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
export const shortId = () => Math.random().toString(36).slice(2, 10);

// Itens pegaveis vindos da IA/colagem/editor: descarta o que esta fora do mapa ou sem nome,
// limita quantidade/peso/textos e garante id unico. Devolve {items, dropped}.
export function repairItems(list, cols, rows) {
  const items = [];
  const ids = new Set();
  let dropped = 0;
  for (const raw of Array.isArray(list) ? list : []) {
    const x = Math.floor(Number(raw?.x));
    const y = Math.floor(Number(raw?.y));
    const name = text(raw?.name, 60);
    if (!name || !(x >= 0 && y >= 0 && x < cols && y < rows) || items.length >= MAX_ITEMS) { dropped++; continue; }
    let id = ID_RE.test(String(raw.id ?? '')) ? String(raw.id) : shortId();
    while (ids.has(id)) id = shortId();
    ids.add(id);
    const item = {
      id, x, y, name,
      description: text(raw.description, 200),
      quantity: Math.round(num(raw.quantity, 1, 999, 1)),
      weight: Math.round(num(raw.weight, 0, 1000, 0) * 100) / 100,
      category: ITEM_CATEGORIES.find((c) => c.toLowerCase() === String(raw.category ?? '').toLowerCase()) || 'Achados'
    };
    const dracmas = Math.round(num(raw.dracmas, 0, 100000, 0));
    if (dracmas > 0) item.dracmas = dracmas;
    items.push(item);
  }
  return { items, dropped };
}

// Construcoes (telhados): retangulo inteiro dentro do mapa, minimo 3x3. Devolve {buildings, dropped}.
export function repairBuildings(list, cols, rows) {
  const buildings = [];
  const ids = new Set();
  let dropped = 0;
  for (const raw of Array.isArray(list) ? list : []) {
    const [x, y, w, h] = ['x', 'y', 'w', 'h'].map((k) => Math.floor(Number(raw?.[k])));
    const ok = x >= 0 && y >= 0 && w >= 3 && h >= 3 && x + w <= cols && y + h <= rows;
    if (!ok || buildings.length >= MAX_BUILDINGS) { dropped++; continue; }
    let id = ID_RE.test(String(raw.id ?? '')) ? String(raw.id) : shortId();
    while (ids.has(id)) id = shortId();
    ids.add(id);
    const roof = String(raw.roof ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    buildings.push({ id, x, y, w, h, name: text(raw.name, 60) || 'Construção', roof: ROOF_TYPES.includes(roof) ? roof : 'telha' });
  }
  return { buildings, dropped };
}

export const itemAt = (map, x, y) => (map.items || []).find((it) => it.x === x && it.y === y) || null;
export const buildingAt = (map, x, y) => (map.buildings || []).find((b) => x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h) || null;

export function emptyMap(cols = 16, rows = 12) {
  const c = clampSize(cols);
  const r = clampSize(rows);
  return {
    cols: c,
    rows: r,
    layers: {
      ground: Array.from({ length: r }, () => DEFAULT_GROUND.repeat(c)),
      objects: Array.from({ length: r }, () => EMPTY_OBJECT.repeat(c))
    },
    items: [],
    buildings: []
  };
}

export function cloneMap(map) {
  return {
    cols: map.cols, rows: map.rows, layers: { ground: [...map.layers.ground], objects: [...map.layers.objects] },
    items: (map.items || []).map((it) => ({ ...it })), buildings: (map.buildings || []).map((b) => ({ ...b }))
  };
}

export function serializeMap(map) {
  return JSON.stringify({ cols: map.cols, rows: map.rows, layers: map.layers, items: map.items || [], buildings: map.buildings || [] });
}

export function validateMap(map) {
  const errors = [];
  if (!map || typeof map !== 'object') return { ok: false, errors: ['O mapa não é um objeto.'] };
  const { cols, rows } = map;
  if (!Number.isInteger(cols) || cols < MIN_SIZE || cols > MAX_SIZE) errors.push(`Colunas devem ser de ${MIN_SIZE} a ${MAX_SIZE}.`);
  if (!Number.isInteger(rows) || rows < MIN_SIZE || rows > MAX_SIZE) errors.push(`Linhas devem ser de ${MIN_SIZE} a ${MAX_SIZE}.`);
  for (const layer of LAYERS) {
    const data = map.layers?.[layer];
    if (!Array.isArray(data)) { errors.push(`Camada "${layer}" ausente.`); continue; }
    if (data.length !== rows) errors.push(`Camada "${layer}" tem ${data.length} linhas (esperado ${rows}).`);
    data.forEach((row, y) => {
      if (typeof row !== 'string' || row.length !== cols) errors.push(`Camada "${layer}", linha ${y + 1}: tamanho errado.`);
      else if (!PRINTABLE.test(row)) errors.push(`Camada "${layer}", linha ${y + 1}: caractere inválido.`);
      else for (const ch of row) {
        if (layer === 'objects' && ch === EMPTY_OBJECT) continue;
        const t = getTile(ch);
        if (!t || t.layer !== layer) { errors.push(`Camada "${layer}", linha ${y + 1}: código "${ch}" não vale aqui.`); break; }
      }
    });
  }
  if (map.items !== undefined) {
    if (!Array.isArray(map.items) || map.items.length > MAX_ITEMS) errors.push(`Itens: no máximo ${MAX_ITEMS}.`);
    else if (repairItems(map.items, cols, rows).dropped) errors.push('Há item fora do mapa ou sem nome.');
  }
  if (map.buildings !== undefined) {
    if (!Array.isArray(map.buildings) || map.buildings.length > MAX_BUILDINGS) errors.push(`Construções: no máximo ${MAX_BUILDINGS}.`);
    else if (repairBuildings(map.buildings, cols, rows).dropped) errors.push('Há construção fora do mapa ou menor que 3×3.');
  }
  return { ok: errors.length === 0, errors };
}

// Conserta qualquer coisa parecida com um mapa (IA, colagem, versao antiga):
// corta/completa linhas, troca codigo desconhecido pelo vazio e move bloco que veio
// na camada errada (IA costuma por parede em "objects"). Devolve {map, warnings}.
export function repairMap(input, { cols, rows } = {}) {
  const warnings = [];
  const toRows = (v) => (Array.isArray(v) ? v.map((r) => String(r ?? '')) : typeof v === 'string' ? v.split(/\r?\n/) : []);
  const ground = toRows(input?.layers?.ground ?? input?.ground);
  const objects = toRows(input?.layers?.objects ?? input?.objects);
  const c = clampSize(cols ?? input?.cols ?? Math.max(MIN_SIZE, ...ground.map((r) => r.length)));
  const r = clampSize(rows ?? input?.rows ?? Math.max(MIN_SIZE, ground.length));
  if (ground.length && (ground.length !== r || ground.some((row) => row.length !== c))) {
    warnings.push(`Tamanho ajustado para ${c}×${r}.`);
  }
  const map = emptyMap(c, r);
  const g = map.layers.ground.map((row) => [...row]);
  const o = map.layers.objects.map((row) => [...row]);
  let unknown = 0;
  let moved = 0;
  for (let y = 0; y < r; y++) {
    for (let x = 0; x < c; x++) {
      const gc = ground[y]?.[x];
      if (gc !== undefined && gc !== DEFAULT_GROUND) {
        const t = getTile(gc);
        if (!t) unknown++;
        else if (t.layer === 'ground') g[y][x] = gc;
        else { o[y][x] = gc; moved++; }
      }
      const oc = objects[y]?.[x];
      // '.' nos objetos = vazio (muita IA usa ponto em vez de espaco)
      if (oc !== undefined && oc !== EMPTY_OBJECT && oc !== DEFAULT_GROUND) {
        const t = getTile(oc);
        if (!t) unknown++;
        else if (t.layer === 'objects') o[y][x] = oc;
        else { g[y][x] = oc; moved++; }
      }
    }
  }
  if (unknown) warnings.push(`${unknown} código(s) desconhecido(s) trocado(s) pelo vazio.`);
  if (moved) warnings.push(`${moved} bloco(s) estavam na camada errada e foram movidos.`);
  map.layers.ground = g.map((row) => row.join(''));
  map.layers.objects = o.map((row) => row.join(''));
  const it = repairItems(input?.items, c, r);
  const bd = repairBuildings(input?.buildings, c, r);
  map.items = it.items;
  map.buildings = bd.buildings;
  if (it.dropped) warnings.push(`${it.dropped} item(ns) fora do mapa ou sem nome foram descartados.`);
  if (bd.dropped) warnings.push(`${bd.dropped} construção(ões) fora do mapa ou pequenas demais foram descartadas.`);
  return { map, warnings };
}

// Mantem o canto superior esquerdo; o que sobra e cortado, o que falta vem vazio.
export function resizeMap(map, cols, rows) {
  const c = clampSize(cols);
  const r = clampSize(rows);
  const fit = (data, layer) => Array.from({ length: r }, (_, y) =>
    (data[y] ?? '').slice(0, c).padEnd(c, emptyCode(layer)));
  return {
    cols: c, rows: r, layers: { ground: fit(map.layers.ground, 'ground'), objects: fit(map.layers.objects, 'objects') },
    items: (map.items || []).filter((it) => it.x < c && it.y < r),
    buildings: (map.buildings || []).filter((b) => b.x + b.w <= c && b.y + b.h <= r)
  };
}

// ---- itens e construcoes (editor) ----
export function addItem(map, x, y, fields = {}) {
  if (!inside(map, x, y) || (map.items || []).length >= MAX_ITEMS) return map;
  const [item] = repairItems([{ name: 'Item achado', ...fields, x, y }], map.cols, map.rows).items;
  return { ...map, items: [...(map.items || []), item] };
}
export function updateItem(map, id, patch) {
  return { ...map, items: (map.items || []).map((it) => (it.id === id ? repairItems([{ ...it, ...patch }], map.cols, map.rows).items[0] || it : it)) };
}
export const removeItem = (map, id) => ({ ...map, items: (map.items || []).filter((it) => it.id !== id) });
export function updateBuilding(map, id, patch) {
  return { ...map, buildings: (map.buildings || []).map((b) => (b.id === id ? repairBuildings([{ ...b, ...patch }], map.cols, map.rows).buildings[0] || b : b)) };
}
export const removeBuilding = (map, id) => ({ ...map, buildings: (map.buildings || []).filter((b) => b.id !== id) });

// Ferramenta "Construcao": paredes no perimetro, piso dentro, porta no meio da parede de baixo
// e o registro do telhado. Objetos em cima das paredes saem (nao da para ter arvore na parede).
export function placeBuilding(map, x0, y0, x1, y1, { wall = '#', floor = '=', roof = 'telha', name = 'Construção' } = {}) {
  const x = Math.max(0, Math.min(x0, x1));
  const y = Math.max(0, Math.min(y0, y1));
  const w = Math.min(map.cols - 1, Math.max(x0, x1)) - x + 1;
  const h = Math.min(map.rows - 1, Math.max(y0, y1)) - y + 1;
  if (w < 3 || h < 3 || (map.buildings || []).length >= MAX_BUILDINGS) return map;
  const g = map.layers.ground.map((row) => [...row]);
  const o = map.layers.objects.map((row) => [...row]);
  for (let cy = y; cy < y + h; cy++) {
    for (let cx = x; cx < x + w; cx++) {
      const edge = cx === x || cy === y || cx === x + w - 1 || cy === y + h - 1;
      g[cy][cx] = edge ? wall : floor;
      if (edge) o[cy][cx] = EMPTY_OBJECT;
    }
  }
  const door = x + Math.floor(w / 2);
  g[y + h - 1][door] = 'D';
  const [b] = repairBuildings([{ x, y, w, h, name, roof }], map.cols, map.rows).buildings;
  return {
    ...map,
    layers: { ground: g.map((r) => r.join('')), objects: o.map((r) => r.join('')) },
    buildings: [...(map.buildings || []), b]
  };
}

export function getCell(map, layer, x, y) {
  return map.layers[layer]?.[y]?.[x];
}

const inside = (map, x, y) => x >= 0 && y >= 0 && x < map.cols && y < map.rows;

function withRows(map, layer, rowsByIndex) {
  const data = [...map.layers[layer]];
  for (const [y, chars] of rowsByIndex) data[y] = chars.join('');
  return { ...map, layers: { ...map.layers, [layer]: data } };
}

export function setCell(map, layer, x, y, code) {
  if (!inside(map, x, y) || getCell(map, layer, x, y) === code) return map;
  const chars = [...map.layers[layer][y]];
  chars[x] = code;
  return withRows(map, layer, [[y, chars]]);
}

export function rectFill(map, layer, x0, y0, x1, y1, code) {
  const [ax, bx] = [Math.max(0, Math.min(x0, x1)), Math.min(map.cols - 1, Math.max(x0, x1))];
  const [ay, by] = [Math.max(0, Math.min(y0, y1)), Math.min(map.rows - 1, Math.max(y0, y1))];
  const changed = [];
  for (let y = ay; y <= by; y++) {
    const chars = [...map.layers[layer][y]];
    for (let x = ax; x <= bx; x++) chars[x] = code;
    changed.push([y, chars]);
  }
  return changed.length ? withRows(map, layer, changed) : map;
}

// Balde: preenche a regiao de 4 vizinhos com o mesmo codigo (pilha, sem recursao).
export function floodFill(map, layer, x, y, code) {
  if (!inside(map, x, y)) return map;
  const target = getCell(map, layer, x, y);
  if (target === code) return map;
  const grid = map.layers[layer].map((row) => [...row]);
  const stack = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop();
    if (!inside(map, cx, cy) || grid[cy][cx] !== target) continue;
    grid[cy][cx] = code;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return { ...map, layers: { ...map.layers, [layer]: grid.map((row) => row.join('')) } };
}

// Fora do mapa conta como bloqueado (ninguem anda para fora da mesa).
export function isSolid(map, x, y) {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  if (!map || !inside(map, cx, cy)) return true;
  return !!(getTile(getCell(map, 'ground', cx, cy))?.solid || getTile(getCell(map, 'objects', cx, cy))?.solid);
}

// Movimento (WASD): bloqueia parede/objeto solido e celula com outro token.
// tokens: [{id, x, y}]; selfId ignora o proprio token.
export function canMoveTo(map, tokens, x, y, selfId) {
  if (isSolid(map, x, y)) return false;
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  return !(tokens || []).some((t) => t.id !== selfId && Math.floor(t.x) === cx && Math.floor(t.y) === cy);
}

// Distancia (em passos) do centro do token ao centro da celula do item; o servidor usa a mesma conta.
export const PICKUP_RANGE = 1.5;
export function tokenItemDistance(token, item, cell) {
  const half = ((token.size || 1) * cell) / 2;
  return Math.hypot((token.x + half) / cell - (item.x + 0.5), (token.y + half) / cell - (item.y + 0.5));
}

// Construcao onde o centro do token esta (token x,y em px, canto de cima-esquerda).
export function tokenBuilding(map, token, cell) {
  const half = ((token.size || 1) * cell) / 2;
  return buildingAt(map, Math.floor((token.x + half) / cell), Math.floor((token.y + half) / cell));
}
