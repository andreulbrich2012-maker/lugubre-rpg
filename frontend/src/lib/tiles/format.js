// Formato do mapa (o backend valida igual):
// {cols, rows, layers: {ground: [rows de cols chars], objects: [idem]}}
// Funcoes puras: sempre devolvem um mapa novo (o desfazer guarda as versoes antigas).
import { DEFAULT_GROUND, EMPTY_OBJECT, getTile } from './catalog.js';

export const MIN_SIZE = 4;
export const MAX_SIZE = 80;
export const LAYERS = ['ground', 'objects'];

const emptyCode = (layer) => (layer === 'ground' ? DEFAULT_GROUND : EMPTY_OBJECT);
const clampSize = (n) => Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(Number(n)) || MIN_SIZE));
const PRINTABLE = /^[\x20-\x7e]*$/;

export function emptyMap(cols = 16, rows = 12) {
  const c = clampSize(cols);
  const r = clampSize(rows);
  return {
    cols: c,
    rows: r,
    layers: {
      ground: Array.from({ length: r }, () => DEFAULT_GROUND.repeat(c)),
      objects: Array.from({ length: r }, () => EMPTY_OBJECT.repeat(c))
    }
  };
}

export function cloneMap(map) {
  return { cols: map.cols, rows: map.rows, layers: { ground: [...map.layers.ground], objects: [...map.layers.objects] } };
}

export function serializeMap(map) {
  return JSON.stringify({ cols: map.cols, rows: map.rows, layers: map.layers });
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
  return { map, warnings };
}

// Mantem o canto superior esquerdo; o que sobra e cortado, o que falta vem vazio.
export function resizeMap(map, cols, rows) {
  const c = clampSize(cols);
  const r = clampSize(rows);
  const fit = (data, layer) => Array.from({ length: r }, (_, y) =>
    (data[y] ?? '').slice(0, c).padEnd(c, emptyCode(layer)));
  return { cols: c, rows: r, layers: { ground: fit(map.layers.ground, 'ground'), objects: fit(map.layers.objects, 'objects') } };
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
