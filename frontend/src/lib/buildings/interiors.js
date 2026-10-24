// Gerador de interiores (cena "dentro da construcao"): cada construcao do mapa de fora liga
// a um mapa de interior. O cliente gera aqui e manda pronto para o servidor (que so valida),
// entao tudo e deterministico: mesma entrada + mesma semente = mesmo mapa, sem Math.random.
//
// Ideia (estilo Stardew): o interior e maior que a pegada de fora; o mapa todo e a casa,
// com parede no contorno e a porta de entrada no meio da parede de baixo. Por dentro:
// 1) divide o retangulo em comodos (BSP com pesos; o comodo principal sempre encosta embaixo
//    para receber a porta), ou desenhos proprios (torre redonda, capela com sacristia no canto);
// 2) liga os comodos com portas (arvore geradora a partir do principal: tudo alcancavel);
// 3) mobilia por papel do comodo (cama encostada no fundo com criado-mudo, mesa com cadeiras
//    em volta, lareira, tapete, plantas...), sempre conferindo que nada solido fecha caminho:
//    cada peca solida so fica se todas as celulas andaveis continuam ligadas a entrada;
// 4) luz: todo comodo ganha tocha/candelabro se ainda nao tem fonte de luz.
// No fim passa por repairMap/validateMap (formato do backend) e por checkInterior (BFS).
import { repairMap, validateMap, isSolid } from '../tiles/format.js';
import { getTile } from '../tiles/catalog.js';

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const strip = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// ---------- aleatorio com semente (mulberry32 sobre hash FNV da chave) ----------
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function makeRng(key) {
  let a = hashStr(key);
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    }
  };
  return rng;
}

// ---------- tipos, tamanhos e pegada padrao (em celulas do mapa de fora) ----------
// sizes: [id, nome, [w, h] da pegada usada quando o chamador nao manda w/h]
const TYPE_DEFS = {
  casa: { name: 'Casa', wall: 'M', floor: '=', sizes: [['cabana', 'Cabana', [4, 3]], ['pequena', 'Casa pequena', [6, 4]], ['media', 'Casa média', [8, 5]], ['grande', 'Casa grande', [10, 7]], ['sobrado', 'Sobrado', [13, 9]]] },
  taverna: { name: 'Taverna', wall: 'M', floor: '=', sizes: [['pequena', 'Taverna pequena', [8, 5]], ['media', 'Taverna', [10, 7]], ['grande', 'Estalagem', [13, 9]]] },
  loja: { name: 'Loja', wall: 'B', floor: '=', sizes: [['pequena', 'Venda', [6, 4]], ['media', 'Loja', [8, 5]], ['grande', 'Empório', [10, 6]]] },
  ferraria: { name: 'Ferraria', wall: '#', floor: '_', sizes: [['pequena', 'Forja', [6, 4]], ['grande', 'Ferraria', [9, 6]]] },
  alquimista: { name: 'Alquimista', wall: 'B', floor: '=', sizes: [['pequena', 'Boticário', [6, 4]], ['grande', 'Laboratório', [8, 6]]] },
  biblioteca: { name: 'Biblioteca', wall: '#', floor: '=', sizes: [['pequena', 'Biblioteca pequena', [8, 5]], ['grande', 'Grande biblioteca', [12, 8]]] },
  capela: { name: 'Capela / igreja', wall: '#', floor: 'Q', doorCenter: true, sizes: [['capela', 'Capela', [6, 6]], ['igreja', 'Igreja', [9, 9]]] },
  celeiro: { name: 'Celeiro / estábulo', wall: 'M', floor: '=', sizes: [['celeiro', 'Celeiro', [8, 5]], ['estabulo', 'Estábulo', [9, 6]]] },
  armazem: { name: 'Armazém', wall: 'M', floor: '=', sizes: [['pequeno', 'Armazém pequeno', [7, 5]], ['grande', 'Armazém grande', [11, 7]]] },
  quartel: { name: 'Quartel / guarda', wall: '#', floor: '_', sizes: [['posto', 'Posto da guarda', [7, 5]], ['quartel', 'Quartel', [11, 8]]] },
  prefeitura: { name: 'Prefeitura', wall: 'B', floor: '_', doorCenter: true, sizes: [['pequena', 'Paço municipal', [8, 6]], ['grande', 'Prefeitura', [12, 8]]] },
  torre: { name: 'Torre de mago', wall: '#', floor: '=', doorCenter: true, sizes: [['pequena', 'Torre', [6, 6]], ['grande', 'Torre alta', [8, 8]]] },
  cripta: { name: 'Cripta', wall: '#', floor: '_', light: 'noite', doorCenter: true, sizes: [['pequena', 'Jazigo', [5, 4]], ['grande', 'Cripta', [8, 7]]] },
  moinho: { name: 'Moinho', wall: 'M', floor: '=', doorCenter: true, sizes: [['moinho', 'Moinho', [5, 5]]] },
  mansao: { name: 'Mansão', wall: 'B', floor: '=', doorCenter: true, sizes: [['solar', 'Solar', [12, 8]], ['mansao', 'Mansão', [16, 11]]] }
};

export const INTERIOR_TYPES = Object.entries(TYPE_DEFS).map(([id, d]) => ({
  id, name: d.name, sizes: d.sizes.map(([sid, name]) => ({ id: sid, name }))
}));

// Nome/tipo livre da construcao de fora -> tipo de interior (palavra-chave, sem acento).
const TYPE_WORDS = [
  ['taverna', ['taverna', 'estalagem', 'hospedaria', 'pousada', 'bar', 'botequim', 'inn']],
  ['ferraria', ['ferraria', 'ferreiro', 'forja', 'oficina']],
  ['alquimista', ['alquim', 'botica', 'boticario', 'herbanario', 'curandeir', 'apotecario']],
  ['biblioteca', ['biblioteca', 'arquivo', 'escola', 'academia']],
  ['capela', ['capela', 'igreja', 'templo', 'santuario', 'catedral', 'mosteiro', 'abadia']],
  ['celeiro', ['celeiro', 'estabulo', 'cavalarica', 'curral', 'galinheiro', 'fazenda']],
  ['armazem', ['armazem', 'deposito', 'galpao', 'silo', 'paiol']],
  ['quartel', ['quartel', 'guarda', 'caserna', 'posto', 'forte', 'guarnicao']],
  ['prefeitura', ['prefeitura', 'paco', 'camara', 'tribunal', 'conselho', 'governo']],
  ['torre', ['torre', 'mago', 'feiticeir', 'observatorio']],
  ['cripta', ['cripta', 'mausoleu', 'jazigo', 'tumba', 'catacumba']],
  ['moinho', ['moinho', 'padaria', 'atafona']],
  ['mansao', ['mansao', 'solar', 'palacete', 'palacio', 'castelo', 'casarao']],
  ['loja', ['loja', 'venda', 'mercado', 'emporio', 'mercearia', 'comercio', 'quitanda', 'armarinho', 'joalheria']]
];
export function interiorTypeFor(buildingType) {
  const s = strip(buildingType);
  if (TYPE_DEFS[s]) return s;
  for (const [id, words] of TYPE_WORDS) if (words.some((w) => s.includes(w))) return id;
  return 'casa';
}

// Material da fachada 3D (backend: madeira/pedra/tijolo/enxaimel) tambem vale como parede.
const WALL_BY_MATERIAL = { madeira: 'M', pedra: '#', tijolo: 'B', enxaimel: 'M' };
const WALLS = new Set(['#', 'B', 'M', 'H', 'Z', 'ç', 'ñ']);
function wallCode(wall, dflt) {
  if (WALLS.has(wall)) return wall;
  return WALL_BY_MATERIAL[strip(wall)] || dflt;
}
function floorCode(floor, dflt) {
  const t = getTile(floor);
  return t && t.layer === 'ground' && !t.solid && !t.wall && floor !== '<' && floor !== '>' ? floor : dflt;
}

// Tamanho pela pegada: o que tiver area mais perto da pegada de fora.
function sizeFor(def, size, w, h) {
  const ids = def.sizes.map((s) => s[0]);
  if (ids.includes(size)) return size;
  const area = (w > 0 && h > 0) ? w * h : null;
  if (!area) return def.sizes[Math.min(1, def.sizes.length - 1)][0];
  let best = def.sizes[0];
  for (const s of def.sizes) if (Math.abs(s[2][0] * s[2][1] - area) < Math.abs(best[2][0] * best[2][1] - area)) best = s;
  return best[0];
}

// ---------- plano (grade mutavel enquanto gera) ----------
const DOOR = 'D';
const DOORS = new Set(['D', 'X', '(', '?']);
const isFloorCode = (c) => {
  const t = getTile(c);
  return Boolean(t && t.layer === 'ground' && !t.solid && !t.wall && c !== '<' && c !== '>');
};
const DIRS = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

class Plan {
  constructor(cols, rows, wall, floor, rng) {
    Object.assign(this, { cols, rows, wall, floor, rng });
    this.g = Array.from({ length: rows }, () => Array(cols).fill(wall));
    this.o = Array.from({ length: rows }, () => Array(cols).fill(' '));
    this.owner = new Int16Array(cols * rows).fill(-1);
    this.foot = new Uint8Array(cols * rows); // celulas cobertas por objeto grande (lareira 2x2...)
    this.keep = new Uint8Array(cols * rows); // reservado: frente de porta, entrada, frente de escada
    this.rooms = [];
    this.entry = null;
  }

  in(x, y) { return x >= 0 && y >= 0 && x < this.cols && y < this.rows; }
  i(x, y) { return y * this.cols + x; }

  addRoom(room, cells) {
    room.id = this.rooms.length;
    this.rooms.push(room);
    const fl = room.floor || this.floor;
    const list = cells || rectCells(room);
    for (const [x, y] of list) { this.g[y][x] = fl; this.owner[this.i(x, y)] = room.id; }
    return room;
  }

  cells(room) {
    const out = [];
    for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) {
      if (this.owner[this.i(x, y)] === room.id) out.push([x, y]);
    }
    return out;
  }

  solid(x, y) {
    if (!this.in(x, y)) return true;
    if (this.foot[this.i(x, y)]) return true;
    if (getTile(this.g[y][x])?.solid) return true;
    return Boolean(getTile(this.o[y][x])?.solid);
  }

  isWall(x, y) {
    if (!this.in(x, y)) return true;
    const c = this.g[y][x];
    return Boolean(getTile(c)?.wall) && !DOORS.has(c);
  }

  free(x, y, room) {
    if (!this.in(x, y)) return false;
    const k = this.i(x, y);
    if (room && this.owner[k] !== room.id) return false;
    return isFloorCode(this.g[y][x]) && this.o[y][x] === ' ' && !this.foot[k] && !this.keep[k];
  }

  // Todas as celulas andaveis ligadas a entrada (sem bolsao fechado por movel).
  connected() {
    if (!this.entry) return true;
    const { cols, rows } = this;
    const seen = new Uint8Array(cols * rows);
    let total = 0;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!this.solid(x, y)) total++;
    const stack = [[this.entry.x, this.entry.y]];
    seen[this.i(this.entry.x, this.entry.y)] = 1;
    let n = 0;
    while (stack.length) {
      const [x, y] = stack.pop();
      n++;
      for (const [dx, dy] of Object.values(DIRS)) {
        const nx = x + dx;
        const ny = y + dy;
        if (!this.in(nx, ny) || seen[this.i(nx, ny)] || this.solid(nx, ny)) continue;
        seen[this.i(nx, ny)] = 1;
        stack.push([nx, ny]);
      }
    }
    return n === total;
  }

  // Coloca um grupo inteiro ou nada: [[x, y, codigo]]. Objeto grande ocupa a pegada (foot).
  place(list, room, keepCells = []) {
    const used = new Set();
    const footOf = (x, y, t) => (t?.foot ? t.foot.map(([dx, dy]) => [x + dx, y + dy]) : [[x, y]]);
    for (const [x, y, code] of list) {
      const t = getTile(code);
      if (!t || t.layer !== 'objects') return false;
      for (const [fx, fy] of footOf(x, y, t)) {
        const k = `${fx},${fy}`;
        if (used.has(k) || !this.free(fx, fy, room)) return false;
        used.add(k);
      }
    }
    let solid = false;
    for (const [x, y, code] of list) {
      const t = getTile(code);
      this.o[y][x] = code;
      if (t.foot) for (const [fx, fy] of footOf(x, y, t)) this.foot[this.i(fx, fy)] = 1;
      if (t.solid) solid = true;
    }
    if (solid && !this.connected()) {
      for (const [x, y, code] of list) {
        const t = getTile(code);
        this.o[y][x] = ' ';
        if (t.foot) for (const [fx, fy] of footOf(x, y, t)) this.foot[this.i(fx, fy)] = 0;
      }
      return false;
    }
    for (const [x, y] of keepCells) if (this.in(x, y)) this.keep[this.i(x, y)] = 1;
    return true;
  }
}

const rectCells = (r) => {
  const out = [];
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) out.push([x, y]);
  return out;
};

// ---------- particao em comodos ----------
// rooms: [{role, name, weight, main?, minW?, minH?}]. O grupo com o principal fica embaixo nos
// cortes horizontais (a porta de entrada e na parede de baixo). Orcamento evita explosao.
function partition(rect, rooms, rng, opts, budget) {
  if (--budget.n < 0) return null;
  if (rooms.length === 1) {
    const r = rooms[0];
    if (rect.w < (r.minW || 3) || rect.h < (r.minH || 3)) return null;
    if (r.main && opts.centerX !== undefined && !(rect.x + 1 <= opts.centerX && opts.centerX <= rect.x + rect.w - 2)) return null;
    // nada de comodo-corredor: tira fina e comprida fica feia e nao cabe movel
    if (rect.w * rect.h > 9 && Math.max(rect.w / rect.h, rect.h / rect.w) > (r.maxRatio || 2.4)) return null;
    return [{ ...r, ...rect }];
  }
  const total = rooms.reduce((s, r) => s + r.weight, 0);
  const ratio = rect.w / rect.h;
  const orients = ratio > 1.15 ? ['v', 'h'] : ratio < 0.87 ? ['h', 'v'] : rng.shuffle(['v', 'h']);
  for (const o of orients) {
    const len = o === 'v' ? rect.w : rect.h;
    const usable = len - 1;
    if (usable < 4) continue;
    for (let t = 0; t < 4; t++) {
      const order = rng.shuffle(rooms);
      const k = rng.int(1, rooms.length - 1);
      let A = order.slice(0, k);
      let B = order.slice(k);
      if (o === 'h' && A.some((r) => r.main)) [A, B] = [B, A];
      const wa = A.reduce((s, r) => s + r.weight, 0) / total;
      const a = clamp(Math.round(usable * wa + (rng.next() - 0.5) * 2.4), 2, usable - 2);
      const ra = o === 'v' ? { x: rect.x, y: rect.y, w: a, h: rect.h } : { x: rect.x, y: rect.y, w: rect.w, h: a };
      const rb = o === 'v'
        ? { x: rect.x + a + 1, y: rect.y, w: usable - a, h: rect.h }
        : { x: rect.x, y: rect.y + a + 1, w: rect.w, h: usable - a };
      const pa = partition(ra, A, rng, opts, budget);
      const pb = pa && partition(rb, B, rng, opts, budget);
      if (pa && pb) return [...pa, ...pb];
    }
  }
  return null;
}

// Portas entre comodos: celula de parede reta com um comodo de cada lado.
function doorCandidates(p) {
  const pairs = new Map();
  for (let y = 1; y < p.rows - 1; y++) {
    for (let x = 1; x < p.cols - 1; x++) {
      if (!p.isWall(x, y)) continue;
      const own = (cx, cy) => p.owner[p.i(cx, cy)];
      let a = -1;
      let b = -1;
      if (own(x - 1, y) >= 0 && own(x + 1, y) >= 0 && p.isWall(x, y - 1) && p.isWall(x, y + 1)) { a = own(x - 1, y); b = own(x + 1, y); }
      else if (own(x, y - 1) >= 0 && own(x, y + 1) >= 0 && p.isWall(x - 1, y) && p.isWall(x + 1, y)) { a = own(x, y - 1); b = own(x, y + 1); }
      if (a < 0 || b < 0 || a === b) continue;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!pairs.has(key)) pairs.set(key, { a: Math.min(a, b), b: Math.max(a, b), cells: [] });
      pairs.get(key).cells.push([x, y]);
    }
  }
  return [...pairs.values()];
}

function openDoor(p, x, y) {
  p.g[y][x] = DOOR;
  for (const [dx, dy] of Object.values(DIRS)) {
    const nx = x + dx;
    const ny = y + dy;
    if (p.in(nx, ny) && p.owner[p.i(nx, ny)] >= 0) p.keep[p.i(nx, ny)] = 1;
  }
}

// Arvore geradora a partir do principal; comodos "de passagem" (sala, salao, corredor) tem
// preferencia como pai, para quarto nao virar corredor. Uma porta extra as vezes (circuito).
const HUBS = new Set(['sala', 'salao', 'taverna', 'loja', 'nave', 'salao_mansao', 'salao_quartel', 'salao_prefeitura', 'jantar', 'oficina', 'laboratorio', 'leitura', 'armazem', 'cripta']);
function connectRooms(p, rng) {
  const edges = doorCandidates(p);
  const linked = new Set([p.rooms.find((r) => r.main).id]);
  const pickCell = (cells) => {
    // evita a ponta da parede (porta colada no canto fica feia e trava movel)
    const mid = cells.filter((_, i) => cells.length < 3 || (i > 0 && i < cells.length - 1));
    return rng.pick(mid.length ? mid : cells);
  };
  while (linked.size < p.rooms.length) {
    const open = edges.filter((e) => linked.has(e.a) !== linked.has(e.b));
    if (!open.length) return false;
    const score = (e) => {
      const from = linked.has(e.a) ? e.a : e.b;
      return (HUBS.has(p.rooms[from].role) ? 2 : 0) + (p.rooms[from].main ? 1 : 0) + rng.next();
    };
    const best = open.reduce((m, e) => (score(e) > score(m) ? e : m), open[0]);
    const [x, y] = pickCell(best.cells);
    openDoor(p, x, y);
    best.used = true;
    linked.add(best.a);
    linked.add(best.b);
  }
  const spare = edges.filter((e) => !e.used && HUBS.has(p.rooms[e.a].role) && HUBS.has(p.rooms[e.b].role));
  if (spare.length && rng.chance(0.35)) openDoor(p, ...pickCell(rng.pick(spare).cells));
  return true;
}

// ---------- mobilia ----------
const TABLES = [
  [' h ', 'hnh', ' h '],
  ['hnh'],
  ['h', 'n', 'h'],
  ['hnnh'],
  ['hh', 'nn', 'hh'],
  [' hh ', 'hnnh', ' hh '],
  ['hn'],
  ['nh'],
  ['h ', 'nh'],
  [' h', 'hn']
];
const SMALL_TABLES = [['hnh'], ['hn'], ['nh'], ['h', 'n'], [' h ', 'hnh']];
const RUGS = ['R', 'R', 'î'];
const RUG_SET = new Set(['R', 'î']);
const NIGHTSTANDS = ['Ó', 'Ê', '{', 'q', '8', 'Ó'];

class Furnisher {
  constructor(p, rng) { this.p = p; this.rng = rng; }

  // Celulas livres do comodo encostadas na parede do lado pedido.
  slots(room, side) {
    const [dx, dy] = DIRS[side];
    return this.p.cells(room).filter(([x, y]) => this.p.free(x, y, room) && this.p.isWall(x + dx, y + dy));
  }

  // Fileira encostada na parede (horizontal no fundo/embaixo, vertical nas laterais).
  along(room, side, codes, { tries = 12 } = {}) {
    const horiz = side === 'top' || side === 'bottom';
    const slots = this.slots(room, side);
    const set = new Set(slots.map(([x, y]) => `${x},${y}`));
    for (const [x, y] of this.rng.shuffle(slots).slice(0, tries)) {
      const list = codes.map((c, k) => [horiz ? x + k : x, horiz ? y : y + k, c]);
      if (!list.every(([cx, cy]) => set.has(`${cx},${cy}`))) continue;
      if (this.p.place(list.filter((e) => e[2] !== ' '), room)) return list;
    }
    return null;
  }

  onWall(room, code, sides = ['top', 'left', 'right'], n = 1) {
    let placed = 0;
    for (let k = 0; k < n; k++) {
      for (const side of this.rng.shuffle(sides)) {
        if (this.along(room, side, [code])) { placed++; break; }
      }
    }
    return placed;
  }

  corner(room, code, n = 1) {
    let placed = 0;
    const corners = this.p.cells(room).filter(([x, y]) => {
      if (!this.p.free(x, y, room)) return false;
      const v = this.p.isWall(x, y - 1) || this.p.isWall(x, y + 1);
      const h = this.p.isWall(x - 1, y) || this.p.isWall(x + 1, y);
      return v && h;
    });
    for (const [x, y] of this.rng.shuffle(corners)) {
      if (placed >= n) break;
      if (this.p.place([[x, y, code]], room)) placed++;
    }
    return placed;
  }

  // Desenho (linhas de texto, ' ' = ignora) em lugar livre longe da parede (margem).
  stamp(room, pattern, { margin = 1, tries = 40 } = {}) {
    const ph = pattern.length;
    const pw = Math.max(...pattern.map((r) => r.length));
    const xs = [];
    for (let y = room.y + margin; y + ph <= room.y + room.h - margin; y++) {
      for (let x = room.x + margin; x + pw <= room.x + room.w - margin; x++) xs.push([x, y]);
    }
    for (const [x, y] of this.rng.shuffle(xs).slice(0, tries)) {
      const list = [];
      pattern.forEach((row, dy) => [...row].forEach((c, dx) => { if (c !== ' ') list.push([x + dx, y + dy, c]); }));
      if (this.p.place(list, room)) return { x, y, w: pw, h: ph };
    }
    return null;
  }

  // Tapete no chao (camada ground): retangulo central, sem encostar na parede.
  rug(room, code, { margin = 1, minW = 2, minH = 2, maxW = 7, maxH = 5, at, patch = false } = {}) {
    const aw = room.w - margin * 2;
    const ah = room.h - margin * 2;
    if (aw < minW || ah < minH) return null;
    // patch: monte pequeno (palha); senao proporcional ao comodo
    const lo = (a, mn, mx) => Math.min(patch ? mn : Math.max(mn, Math.floor(a * 0.45)), Math.min(a, mx));
    const w = at?.w ?? clamp(this.rng.int(lo(aw, minW, maxW), Math.min(aw, maxW)), minW, aw);
    const h = at?.h ?? clamp(this.rng.int(lo(ah, minH, maxH), Math.min(ah, maxH)), minH, ah);
    const x0 = at?.x ?? room.x + margin + this.rng.int(0, aw - w);
    const y0 = at?.y ?? room.y + margin + this.rng.int(0, ah - h);
    // nao emenda com outro tapete (dois tapetes colados viram uma mancha torta)
    const fl = room.floor || this.p.floor;
    for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) {
      if (this.p.in(x, y) && this.p.owner[this.p.i(x, y)] === room.id && RUG_SET.has(this.p.g[y][x]) && this.p.g[y][x] !== fl) return null;
    }
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      if (this.p.in(x, y) && this.p.owner[this.p.i(x, y)] === room.id && isFloorCode(this.p.g[y][x])) this.p.g[y][x] = code;
    }
    return { x: x0, y: y0, w, h };
  }

  // Objeto grande encostado no fundo (lareira 2x2): ancora na celula de baixo-esquerda.
  bigOnTop(room, code) {
    const t = getTile(code);
    const fh = t.span[1];
    const xs = [];
    for (let x = room.x; x + t.span[0] <= room.x + room.w; x++) if (this.p.isWall(x, room.y - 1) && this.p.isWall(x + 1, room.y - 1)) xs.push(x);
    for (const x of this.rng.shuffle(xs)) {
      if (this.p.place([[x, room.y + fh - 1, code]], room)) return { x, y: room.y };
    }
    return null;
  }

  // Escada (chao): canto ou parede; a frente fica reservada.
  stairs(room, code) {
    const slots = this.rng.shuffle(this.slots(room, 'top').concat(this.slots(room, 'left'), this.slots(room, 'right')));
    for (const [x, y] of slots) {
      const below = [x, y + 1];
      if (!this.p.free(...below, room)) continue;
      this.p.g[y][x] = code;
      this.p.keep[this.p.i(x, y)] = 1;
      this.p.keep[this.p.i(...below)] = 1;
      return true;
    }
    return false;
  }

  // Cama (ou duas) no fundo, criado-mudo do lado, bau no pe as vezes.
  bed(room, { double = false, chest = 0.4 } = {}) {
    const stand = this.rng.pick(NIGHTSTANDS);
    const beds = double ? ['e', 'e'] : ['e'];
    const options = this.rng.shuffle([[stand, ...beds], [...beds, stand], beds]);
    for (const codes of options) {
      const got = this.along(room, 'top', codes) || this.along(room, this.rng.pick(['left', 'right']), ['e']);
      if (!got) continue;
      if (this.rng.chance(chest)) {
        for (const [x, y, c] of got) if (c === 'e' && this.p.place([[x, y + 1, 'C']], room)) break;
      }
      return got;
    }
    return null;
  }

  // Mesa com cadeiras e, embaixo, tapete do tamanho do conjunto (+1 de borda).
  tableOnRug(room, patterns, rugCode, opts) {
    const at = this.table(room, patterns, opts);
    if (at && rugCode) this.rug(room, rugCode, { at: { x: at.x - 1, y: at.y - 1, w: at.w + 2, h: at.h + 2 } });
    return at;
  }

  table(room, patterns = TABLES, opts) {
    for (const pat of this.rng.shuffle(patterns)) {
      const at = this.stamp(room, pat, opts);
      if (at) return at;
    }
    return null;
  }

  // Varios itens soltos pelas paredes (despensa, deposito, loja).
  stock(room, codes, fill = 0.5, sides = ['top', 'left', 'right', 'bottom']) {
    const slots = sides.flatMap((s) => this.slots(room, s));
    const want = Math.round(new Set(slots.map(([x, y]) => `${x},${y}`)).size * fill);
    let n = 0;
    for (const [x, y] of this.rng.shuffle(slots)) {
      if (n >= want) break;
      if (this.p.place([[x, y, this.rng.pick(codes)]], room)) n++;
    }
    return n;
  }

  lightCount(room) {
    let n = 0;
    for (const [x, y] of this.p.cells(room)) {
      if (getTile(this.p.o[y][x])?.light) n++;
      for (const [dx, dy] of Object.values(DIRS)) if (getTile(this.p.g[y + dy]?.[x + dx])?.light) n++;
    }
    return n;
  }

  // Garante luz: tocha de parede (pedra), tocha de pe ou candelabro.
  light(room, want = Math.max(1, Math.round(room.w * room.h / 45))) {
    let have = this.lightCount(room);
    const stone = this.p.wall === '#';
    for (let tries = 0; have < want && tries < 6; tries++) {
      if (stone && this.rng.chance(0.6)) {
        const xs = this.p.cells(room).filter(([x, y]) => y === room.y && this.p.g[y - 1]?.[x] === '#' && this.p.isWall(x - 1, y - 1) && this.p.isWall(x + 1, y - 1));
        if (xs.length) {
          const [x, y] = this.rng.pick(xs);
          this.p.g[y - 1][x] = '/';
          have++;
          continue;
        }
      }
      const code = this.rng.chance(0.55) ? 'i' : '{';
      if (this.corner(room, code) || this.onWall(room, code)) have++;
    }
  }
}

// ---------- mobilia por papel do comodo ----------
const F = {
  sala(f, r, { solo = false } = {}) {
    const { rng } = f;
    if (r.w >= 4 && r.h >= 5 && rng.chance(0.7)) f.bigOnTop(r, 'Ü');
    else f.along(r, 'top', ['F']) || f.onWall(r, 'F', ['left', 'right']);
    f.onWall(r, 'E', ['top'], rng.int(1, 2));
    if (solo) {
      f.bed(r, { chest: 0.5 });
      f.onWall(r, rng.pick(['u', 'Ó', '5']), ['top', 'left', 'right']);
    }
    // mesa no tapete (estilo Stardew) e, em sala grande, um segundo canto de estar
    f.tableOnRug(r, solo ? SMALL_TABLES : TABLES, r.w >= 5 && r.h >= 5 ? rng.pick(RUGS) : null, { margin: 1 });
    if (!solo && r.w * r.h >= 48) f.tableOnRug(r, SMALL_TABLES, rng.chance(0.5) ? rng.pick(RUGS) : null, { margin: 1 });
    if (rng.chance(0.5)) f.onWall(r, 'Â', ['left', 'right', 'bottom']);
    if (rng.chance(0.4)) f.onWall(r, 'C', ['left', 'right', 'bottom']);
    f.corner(r, 'Ê', rng.int(1, 2));
    if (rng.chance(0.3)) f.onWall(r, 'Ó', ['left', 'right', 'bottom']);
  },
  cozinha(f, r) {
    const { rng } = f;
    if (r.w >= 4 && r.h >= 4 && rng.chance(0.55)) f.bigOnTop(r, 'Ü');
    else f.along(r, 'top', rng.pick([['F', '5'], ['5', 'F'], ['F']]));
    f.along(r, rng.pick(['top', 'left', 'right']), ['n', 'n'].slice(0, rng.int(1, 2)));
    f.stock(r, ['u', 'Ó', 'Î', 'q', 'Ó'], 0.25);
    if (r.w >= 5 && r.h >= 4) f.table(r, SMALL_TABLES);
    f.corner(r, 'Ê', rng.chance(0.4) ? 1 : 0);
  },
  jantar(f, r) {
    const { rng } = f;
    const L = clamp(r.w - 4, 2, 6);
    const pats = [['h'.repeat(L), 'n'.repeat(L), 'h'.repeat(L)], [' ' + 'h'.repeat(L), 'h' + 'n'.repeat(L) + 'h', ' ' + 'h'.repeat(L)], ['hnnh']];
    f.tableOnRug(r, pats, r.h >= 5 ? 'R' : null);
    f.onWall(r, rng.pick(['E', '7', 'C']), ['top']);
    f.corner(r, rng.pick(['{', 'Ê']), 2);
  },
  quarto(f, r) {
    const { rng } = f;
    const bed = f.bed(r, { double: r.w >= 5 && rng.chance(0.35) });
    if (r.w >= 5 && r.h >= 4 && rng.chance(0.5)) f.bed(r, { chest: 0.2 });
    // tapete ao pe da cama
    if (bed && bed[0][1] === r.y && r.h >= 4 && rng.chance(0.7)) {
      const xs = bed.filter((e) => e[2] === 'e').map((e) => e[0]);
      f.rug(r, rng.pick(RUGS), { at: { x: Math.min(...xs) - 1, y: r.y + 1, w: xs.length + 2, h: 2 } });
    } else if (rng.chance(0.6)) f.stamp(r, ['r'], { margin: 1 });
    f.onWall(r, rng.pick(['E', 'C', 'q', '&', 'E']), ['left', 'right', 'top']);
    if (rng.chance(0.4)) f.table(r, [['hn'], ['nh'], ['h', 'n']], { margin: 0 });
    f.corner(r, 'Ê', rng.chance(0.5) ? 1 : 0);
  },
  banheiro(f, r) {
    const { rng } = f;
    f.along(r, 'top', [rng.pick(['u', 'u'])]) || f.onWall(r, 'u');
    if (rng.chance(0.5)) f.onWall(r, 'u');
    f.onWall(r, rng.pick(['Ó', 'Ê', 'q']), ['left', 'right', 'top']);
    f.stamp(r, ['r'], { margin: 0 });
  },
  despensa(f, r) {
    const { rng } = f;
    if (rng.chance(0.3)) f.stairs(r, '>');
    f.stock(r, ['q', 'u', 'Î', 'Ó', 'q', 'C'], 0.6);
  },
  taverna(f, r) {
    const { rng } = f;
    // balcao: fileira de mesas a 2 da parede do fundo, presa numa lateral, ponta aberta
    if (r.h >= 6) {
      const L = clamp(Math.floor(r.w * rng.int(35, 55) / 100), 3, 8);
      const left = rng.chance(0.5);
      const x0 = left ? r.x : r.x + r.w - L;
      const counter = [];
      for (let k = 0; k < L; k++) counter.push([x0 + k, r.y + 2, 'n']);
      if (f.p.place(counter, r)) {
        for (let k = 0; k < L; k++) {
          const c = rng.pick(['u', 'u', '7', 'E', 'u']);
          if (rng.chance(0.75)) f.p.place([[x0 + k, r.y, c]], r);
          if (k % 2 === (left ? 0 : 1) && rng.chance(0.8)) f.p.place([[x0 + k, r.y + 3, 'h']], r);
        }
        const gapX = left ? x0 + L : x0 - 1;
        f.p.keep[f.p.i(gapX, r.y + 1)] = 1;
        f.p.keep[f.p.i(gapX, r.y + 2)] = 1;
      }
    }
    f.bigOnTop(r, 'Ü') || f.onWall(r, 'F', ['left', 'right']);
    const want = Math.max(2, Math.floor(r.w * r.h / 22));
    for (let k = 0; k < want; k++) f.table(r, TABLES.slice(0, 6));
    f.stock(r, ['u', 'Â'], 0.12, ['left', 'right', 'bottom']);
    f.corner(r, 'Ê', 1);
  },
  loja(f, r) {
    const { rng } = f;
    f.stock(r, ['E', '7', 'E'], 0.7, ['top']);
    // balcao em frente as prateleiras
    if (r.h >= 5) {
      const L = clamp(Math.floor(r.w / 2), 2, 6);
      for (let t = 0; t < 8; t++) {
        const x0 = r.x + rng.int(1, Math.max(1, r.w - L - 1));
        const list = [];
        for (let k = 0; k < L; k++) list.push([x0 + k, r.y + 2, 'n']);
        if (f.p.place(list, r)) { if (rng.chance(0.6)) f.p.place([[x0 + rng.int(0, L - 1), r.y + 1, 'h']], r); break; }
      }
    }
    f.stock(r, ['q', 'u', 'C', 'Ó', 'Î', 'Ê', 'q'], 0.45, ['left', 'right']);
    if (r.w >= 7 && r.h >= 7) f.stamp(r, [rng.pick(['qq', 'uq', 'ÎÎ', 'Óq'])], { margin: 2 });
    f.corner(r, 'Ê', 1);
  },
  deposito(f, r) {
    f.stock(r, ['q', 'u', 'Î', 'q', 'C'], 0.65);
  },
  oficina(f, r) {
    const { rng } = f;
    f.bigOnTop(r, 'Ü') || f.along(r, 'top', ['}']);
    f.along(r, 'top', ['6']) || f.stamp(r, ['6']);
    f.along(r, 'top', [rng.pick(['u', 'q'])]);
    f.onWall(r, '&', ['left', 'right', 'top'], rng.int(1, 2));
    f.onWall(r, '9', ['left', 'right'], rng.int(1, 2));
    if (r.w >= 6 && r.h >= 5) f.stamp(r, ['6'], { margin: 2 });
    f.stock(r, ['q', 'u', 'Î'], 0.15, ['left', 'right', 'bottom']);
    f.table(r, [['nh'], ['hn']], { margin: 0 });
  },
  laboratorio(f, r) {
    const { rng } = f;
    f.stock(r, ['7', 'E', '7'], 0.6, ['top']);
    f.along(r, rng.pick(['left', 'right']), ['4', '4'].slice(0, rng.int(1, 2))) || f.onWall(r, '4');
    f.onWall(r, '4', ['left', 'right', 'bottom']);
    f.stamp(r, ['5'], { margin: 2 }) || f.stamp(r, ['5']);
    if (r.w >= 5 && r.h >= 5) f.rug(r, 'î', { maxW: 3, maxH: 3 });
    f.table(r, SMALL_TABLES);
    f.stock(r, ['Ó', 'Ê', '8', 'q'], 0.2, ['left', 'right', 'bottom']);
    f.corner(r, 'Ê', 1);
  },
  estoque(f, r) {
    f.stock(r, ['7', 'Ó', 'q', 'u', 'Ó', 'Î'], 0.6);
  },
  leitura(f, r) {
    const { rng } = f;
    // estantes em fileiras (corredores entre elas) numa metade, mesas de leitura na outra
    const half = r.w >= 9 ? Math.floor(r.w / 2) : r.w;
    const left = rng.chance(0.5);
    const sx0 = left ? r.x : r.x + r.w - half;
    for (let y = r.y; y < r.y + r.h - 2; y += 2) {
      const list = [];
      const x1 = sx0 + (left ? 0 : 1);
      for (let x = x1; x < x1 + half - 1; x++) list.push([x, y, 'E']);
      f.p.place(list, r) || f.p.place(list.slice(0, -1), r);
    }
    if (r.w >= 9) {
      f.rug(r, 'R', { at: { x: left ? r.x + half + 1 : r.x + 1, y: r.y + 1, w: r.w - half - 2, h: Math.max(2, r.h - 3) } });
      for (let k = 0; k < 3; k++) f.table(r, [['hnh'], [' h ', 'hnh'], ['hnnh'], ['h', 'n', 'h']]);
      f.stock(r, ['8', '{', 'E'], 0.2);
    } else {
      f.table(r, SMALL_TABLES, { margin: 0 });
    }
    f.corner(r, 'Ê', 1);
  },
  arquivo(f, r) {
    f.stock(r, ['E', 'E', 'C', '8'], 0.7);
    f.table(r, SMALL_TABLES, { margin: 0 });
  },
  escritorio(f, r) {
    const { rng } = f;
    f.onWall(r, 'E', ['top'], 2);
    if (r.w >= 4 && r.h >= 4) f.rug(r, rng.pick(['R', 'î']), { maxW: 3, maxH: 2 });
    f.table(r, [['nn', 'h '], ['nn', ' h'], ['n', 'h'], ['hn', ' h']], { margin: 1 }) || f.table(r, [['nh'], ['hn']], { margin: 0 });
    f.onWall(r, rng.pick(['C', '8', 'Ê']), ['left', 'right']);
  },
  nave(f, r, { centerX }) {
    const { rng } = f;
    const cx = centerX;
    // corredor central de carpete ate o altar
    const aisleW = r.w >= 11 ? 3 : 1;
    const ax0 = cx - Math.floor(aisleW / 2);
    f.rug(r, 'R', { at: { x: ax0, y: r.y + 2, w: aisleW, h: r.h - 2 } });
    f.p.place([[cx, r.y + 1, 'a']], r) || f.p.place([[cx, r.y, 'a']], r);
    for (const dx of [-2, 2]) f.p.place([[cx + dx, r.y, '{']], r);
    if (r.w >= 9) for (const x of [r.x, r.x + r.w - 1]) f.p.place([[x, r.y, rng.pick(['S', 'S', 'Ê'])]], r);
    // bancos em fileiras dos dois lados do corredor (sobra passagem nas laterais)
    const step = r.h >= 9 ? rng.pick([1, 2]) : 1;
    for (let y = r.y + 3; y < r.y + r.h - 1; y += step + 1) {
      const lx0 = r.x + 1;
      const lx1 = ax0 - 2;
      const rx0 = ax0 + aisleW + 1;
      const rx1 = r.x + r.w - 2;
      for (const [a, b] of [[lx0, lx1], [rx0, rx1]]) {
        const list = [];
        for (let x = a; x <= b; x++) list.push([x, y, 'Â']);
        if (list.length) f.p.place(list, r);
      }
    }
    if (r.w >= 11 && r.h >= 9) {
      for (let y = r.y + 3; y < r.y + r.h - 2; y += 3) for (const x of [r.x, r.x + r.w - 1]) f.p.place([[x, y, '1']], r);
    }
  },
  sacristia(f, r) {
    const { rng } = f;
    f.onWall(r, rng.pick(['E', 'C']), ['top']);
    f.stock(r, ['C', '8', 'Ó', 'q'], 0.35);
  },
  celeiro(f, r, { stalls = false } = {}) {
    const { rng } = f;
    // palha espalhada em montes no assoalho (chao todo de palha fica chapado)
    for (let k = 0; k < Math.max(2, Math.floor(r.w * r.h / 30)); k++) f.rug(r, 'í', { margin: 0, maxW: 3, maxH: 2, patch: true });
    if (stalls && r.h >= 5) {
      // baias de cerca no fundo: divisorias de 2 celulas, frente aberta
      const count = Math.floor((r.w - 1) / 3);
      const x0 = r.x + rng.int(0, Math.max(0, r.w - (count * 3 + 1)));
      for (let k = 0; k <= count; k++) {
        const fx = x0 + k * 3;
        f.p.place([[fx, r.y, '+'], [fx, r.y + 1, '+']], r);
        if (k < count) {
          const inside = rng.pick(['Î', 'u', ' ', 'Î']);
          if (inside !== ' ') f.p.place([[fx + 1 + rng.int(0, 1), r.y, inside]], r);
        }
      }
    } else {
      f.stock(r, ['Î', 'Î', 'q', 'u'], 0.5, ['top']);
      // cercadinho de galinhas num canto
      if (r.w >= 8 && r.h >= 6) {
        const left = rng.chance(0.5);
        const x0 = left ? r.x : r.x + r.w - 4;
        const y0 = r.y + r.h - 3;
        const pen = [[x0 + (left ? 3 : 0), y0, '+'], [x0 + (left ? 3 : 0), y0 + 1, '+'], [x0 + (left ? 3 : 0), y0 + 2, '+']];
        for (let k = 0; k < 4; k++) if (k !== (left ? 3 : 0)) pen.push([x0 + k, y0, '+']);
        if (f.p.place(pen.filter(([x, y]) => !(x === x0 + 1 && y === y0)), r)) {
          f.p.place([[x0 + (left ? 1 : 2), y0 + 2, 'Ã']], r);
          f.p.place([[x0 + (left ? 0 : 3), y0 + 2, 'Ã']], r);
        }
      }
    }
    f.stock(r, ['l', 'Î', 'q'], 0.1, ['bottom']);
    if (r.w >= 6 && r.h >= 6 && rng.chance(0.7)) f.stamp(r, ['Ø'], { margin: 2 });
    f.stock(r, ['Î', 'q', 'u', 'Î'], 0.3, ['left', 'right']);
    for (let k = 0; k < Math.max(1, Math.floor(r.w * r.h / 50)); k++) f.stamp(r, rng.pick([['ÎÎ'], ['Îq'], ['qÎ'], ['ÎÎ', 'Î '], ['uu'], ['q', 'Î']]), { margin: 2 });
  },
  armazem(f, r) {
    const { rng } = f;
    f.stock(r, ['q', 'u', 'Î', 'q'], 0.6, ['top', 'left', 'right']);
    // ilhas de caixotes com corredores
    for (let y = r.y + 2; y < r.y + r.h - 2; y += 3) {
      for (let x = r.x + 2; x < r.x + r.w - 3; x += rng.int(4, 5)) {
        const L = rng.int(2, 3);
        const list = [];
        for (let k = 0; k < L && x + k < r.x + r.w - 2; k++) list.push([x + k, y, rng.pick(['q', 'u', 'Î', 'q'])]);
        f.p.place(list, r);
      }
    }
    if (r.w >= 8 && r.h >= 6 && rng.chance(0.5)) f.stamp(r, ['Ø'], { margin: 1 });
  },
  dormitorio(f, r) {
    const { rng } = f;
    // camas em fila no fundo, bau entre elas
    for (let x = r.x + rng.int(0, 1); x < r.x + r.w; x += 2) {
      f.p.place([[x, r.y, 'e']], r);
      if (rng.chance(0.6)) f.p.place([[x, r.y + 1, 'C']], r);
    }
    if (r.h >= 6) for (let x = r.x + rng.int(0, 1); x < r.x + r.w; x += 2) f.p.place([[x, r.y + r.h - 1, 'e']], r);
    f.onWall(r, '&', ['left', 'right']);
  },
  arsenal(f, r) {
    f.stock(r, ['&', '9', '&', 'q', 'u'], 0.65);
  },
  salao_quartel(f, r) {
    const { rng } = f;
    const L = clamp(r.w - 5, 2, 5);
    f.table(r, [['Â'.repeat(L), 'n'.repeat(L), 'Â'.repeat(L)], ['h'.repeat(L), 'n'.repeat(L), 'h'.repeat(L)], ['hnh']]);
    f.onWall(r, '&', ['top', 'left', 'right'], rng.int(1, 2));
    f.onWall(r, '9', ['top', 'left', 'right'], 1);
    f.corner(r, '}', 1);
    f.stock(r, ['u', 'q'], 0.1, ['left', 'right']);
  },
  salao_prefeitura(f, r, { centerX }) {
    const { rng } = f;
    f.rug(r, 'R', { at: { x: centerX, y: r.y + 3, w: 1, h: r.h - 3 } });
    const L = clamp(r.w - 6, 2, 5);
    const x0 = centerX - Math.floor(L / 2);
    const table = [];
    for (let k = 0; k < L; k++) table.push([x0 + k, r.y + 1, 'n']);
    if (f.p.place(table, r)) {
      for (let k = 0; k < L; k++) f.p.place([[x0 + k, r.y, k === Math.floor(L / 2) ? 'K' : 'h']], r);
      f.p.place([[x0 - 1, r.y + 1, 'h']], r);
      f.p.place([[x0 + L, r.y + 1, 'h']], r);
    }
    // bancos da plateia dos dois lados do corredor
    for (let y = r.y + 4; y < r.y + r.h - 2; y += 2) {
      for (const [a, b] of [[r.x + 2, centerX - 2], [centerX + 2, r.x + r.w - 3]]) {
        const list = [];
        for (let x = a; x <= b && list.length < 4; x++) list.push([x, y, 'Â']);
        if (list.length >= 2) f.p.place(list, r);
      }
    }
    for (const x of [r.x, r.x + r.w - 1]) f.p.place([[x, r.y, rng.pick(['S', 'Ê', '{'])]], r);
    f.stock(r, ['E', 'Â', 'Ê', 'Â'], 0.3, ['left', 'right']);
  },
  torre(f, r, { centerX, centerY }) {
    const { rng } = f;
    f.p.place([[centerX, centerY, '`']], r);
    for (const [dx, dy] of rng.shuffle([[-2, 0], [2, 0], [0, -2], [0, 2]]).slice(0, rng.int(2, 4))) f.p.place([[centerX + dx, centerY + dy, '{']], r);
    f.stairs(r, '<');
    f.stock(r, ['E', 'E', '7', '4', '8', 'k'], 0.55);
    f.stamp(r, ['5'], { margin: 2 });
    f.tableOnRug(r, SMALL_TABLES, 'î', { margin: 2 });
    f.stamp(r, ['4'], { margin: 2 });
    f.stamp(r, [rng.pick(['S', 'k', '9'])], { margin: 2 });
    for (let k = 0; k < 3; k++) f.stamp(r, ['8'], { margin: 1 });
  },
  cripta(f, r, { centerX }) {
    const { rng } = f;
    f.stairs(r, '>');
    // sarcofagos em duas fileiras simetricas
    for (let y = r.y + 1; y < r.y + r.h - 2; y += 2) {
      for (const dx of [-2, 2]) {
        const x = centerX + dx * (r.w >= 9 ? rng.pick([1, 2]) : 1);
        if (rng.chance(0.85)) f.p.place([[x, y, rng.chance(0.8) ? '2' : '3']], r);
      }
    }
    f.p.place([[centerX, r.y, rng.pick(['a', 'S', '2'])]], r);
    f.corner(r, 'w', 3);
    f.stock(r, ['}', 'x', 'Á', 'x', '3'], 0.25);
    for (let k = 0; k < 4; k++) {
      const [x, y] = rng.pick(f.p.cells(r));
      if (f.p.g[y][x] === '_' && rng.chance(0.5)) f.p.g[y][x] = 'U';
    }
  },
  ossuario(f, r) {
    f.stock(r, ['x', '3', 'x', 'Á', '2'], 0.6);
    f.corner(r, 'w', 2);
  },
  moinho(f, r) {
    const { rng } = f;
    f.stamp(r, ['Þ'], { margin: 2 }) || f.stamp(r, ['Þ'], { margin: 1 });
    f.stairs(r, '<');
    for (let k = 0; k < 3; k++) f.rug(r, 'í', { margin: 0, maxW: 3, maxH: 2, patch: true });
    f.stock(r, ['Î', 'Î', 'q', 'u', 'Î'], 0.5);
    f.stamp(r, ['ÎÎ'], { margin: 1 });
    if (rng.chance(0.5)) f.table(r, SMALL_TABLES, { margin: 1 });
  },
  salao_mansao(f, r, { centerX }) {
    const { rng } = f;
    f.rug(r, 'R', { at: { x: centerX - 1, y: r.y + 1, w: 3, h: r.h - 1 } });
    f.stairs(r, '<');
    f.bigOnTop(r, 'Ü');
    for (const x of [r.x, r.x + r.w - 1]) f.p.place([[x, r.y, rng.pick(['S', 'Ê', '9'])]], r);
    f.stock(r, ['Ê', 'Â', '{', 'Ê', 'E'], 0.3, ['left', 'right']);
    f.corner(r, 'Ê', 2);
  }
};
F.salao = F.sala;
F.cabana = (f, r) => F.sala(f, r, { solo: true });
F.estabulo = (f, r) => F.celeiro(f, r, { stalls: true });

// ---------- programa de comodos por tipo/tamanho (ordem = prioridade; o fim cai se nao couber) ----------
const R = (role, name, weight, extra = {}) => ({ role, name, weight, ...extra });
const PROGRAMS = {
  casa: {
    cabana: () => [R('cabana', 'Cabana', 1, { main: true })],
    pequena: (rng) => [R('sala', 'Sala', 3, { main: true }), R('quarto', 'Quarto', 1.6), ...(rng.chance(0.4) ? [R('despensa', 'Despensa', 0.7, { minW: 2, minH: 2 })] : [])],
    media: (rng) => [R('sala', 'Sala', 3, { main: true }), R('quarto', 'Quarto', 1.6), R('cozinha', 'Cozinha', 1.4), ...(rng.chance(0.6) ? [R('banheiro', 'Banheiro', 0.7, { minW: 2, minH: 2 })] : [R('despensa', 'Despensa', 0.7, { minW: 2, minH: 2 })])],
    grande: (rng) => [R('sala', 'Sala', 3.2, { main: true }), R('quarto', 'Quarto', 1.6), R('cozinha', 'Cozinha', 1.5), R('quarto', 'Quarto das crianças', 1.3), R('banheiro', 'Banheiro', 0.8, { minW: 2, minH: 2 }), ...(rng.chance(0.6) ? [R('despensa', 'Despensa', 0.7, { minW: 2, minH: 2 })] : [])],
    sobrado: () => [R('sala', 'Sala', 3.4, { main: true, stairs: '<' }), R('jantar', 'Sala de jantar', 1.8), R('cozinha', 'Cozinha', 1.5), R('quarto', 'Quarto principal', 1.7), R('quarto', 'Quarto', 1.3), R('quarto', 'Quarto de hóspedes', 1.2), R('banheiro', 'Banheiro', 0.8, { minW: 2, minH: 2 }), R('despensa', 'Despensa', 0.8, { minW: 2, minH: 2 })]
  },
  taverna: {
    pequena: () => [R('taverna', 'Salão', 4, { main: true }), R('cozinha', 'Cozinha', 1.4), R('despensa', 'Adega', 0.9, { minW: 2, minH: 2 })],
    media: () => [R('taverna', 'Salão', 4, { main: true }), R('cozinha', 'Cozinha', 1.4), R('quarto', 'Quarto de hóspedes', 1.1), R('quarto', 'Quarto de hóspedes', 1.1), R('despensa', 'Adega', 0.9, { minW: 2, minH: 2 })],
    grande: () => [R('taverna', 'Salão', 4.5, { main: true, stairs: '<' }), R('cozinha', 'Cozinha', 1.4), R('quarto', 'Quarto 1', 1), R('quarto', 'Quarto 2', 1), R('quarto', 'Quarto 3', 1), R('quarto', 'Quarto 4', 1), R('despensa', 'Adega', 1, { minW: 2, minH: 2 })]
  },
  loja: {
    pequena: () => [R('loja', 'Loja', 3, { main: true }), R('deposito', 'Depósito', 1, { minW: 2, minH: 2 })],
    media: () => [R('loja', 'Loja', 3, { main: true }), R('deposito', 'Depósito', 1.2, { minW: 2, minH: 2 }), R('quarto', 'Quarto do lojista', 1.2)],
    grande: () => [R('loja', 'Loja', 3.5, { main: true }), R('deposito', 'Depósito', 1.4), R('quarto', 'Quarto do lojista', 1.2), R('cozinha', 'Cozinha', 1)]
  },
  ferraria: {
    pequena: () => [R('oficina', 'Oficina', 3, { main: true }), R('deposito', 'Depósito', 1, { minW: 2, minH: 2 })],
    grande: () => [R('oficina', 'Oficina', 3.5, { main: true }), R('arsenal', 'Mostruário', 1.2), R('quarto', 'Quarto do ferreiro', 1.2), R('deposito', 'Depósito', 0.9, { minW: 2, minH: 2 })]
  },
  alquimista: {
    pequena: () => [R('laboratorio', 'Laboratório', 3, { main: true }), R('estoque', 'Estoque', 1, { minW: 2, minH: 2 })],
    grande: () => [R('laboratorio', 'Laboratório', 3.2, { main: true }), R('estoque', 'Estoque', 1.1), R('quarto', 'Quarto', 1.2), R('escritorio', 'Estudo', 1)]
  },
  biblioteca: {
    pequena: () => [R('leitura', 'Salão de leitura', 3, { main: true }), R('arquivo', 'Arquivo', 1)],
    grande: () => [R('leitura', 'Salão de leitura', 4, { main: true }), R('arquivo', 'Arquivo', 1.2), R('escritorio', 'Escritório', 1.1), R('arquivo', 'Pergaminhos raros', 1)]
  },
  celeiro: {
    celeiro: () => [R('celeiro', 'Celeiro', 1, { main: true })],
    estabulo: (rng) => [R('estabulo', 'Estábulo', 3, { main: true }), ...(rng.chance(0.6) ? [R('deposito', 'Selaria', 1)] : [])]
  },
  armazem: {
    pequeno: () => [R('armazem', 'Armazém', 1, { main: true })],
    grande: () => [R('armazem', 'Armazém', 4, { main: true }), R('escritorio', 'Escritório', 1)]
  },
  quartel: {
    posto: () => [R('salao_quartel', 'Posto', 2.4, { main: true }), R('dormitorio', 'Alojamento', 1.6)],
    quartel: () => [R('salao_quartel', 'Salão', 3, { main: true }), R('dormitorio', 'Alojamento', 2.2), R('arsenal', 'Arsenal', 1.2), R('escritorio', 'Sala do capitão', 1), R('cozinha', 'Cozinha', 1)]
  },
  prefeitura: {
    pequena: () => [R('salao_prefeitura', 'Salão', 3, { main: true }), R('escritorio', 'Gabinete', 1)],
    grande: () => [R('salao_prefeitura', 'Salão nobre', 3.5, { main: true }), R('escritorio', 'Gabinete', 1.1), R('arquivo', 'Arquivo', 1), R('jantar', 'Sala do conselho', 1.4)]
  },
  moinho: { moinho: () => [R('moinho', 'Moinho', 1, { main: true })] },
  mansao: {
    solar: () => [R('salao_mansao', 'Salão', 3.4, { main: true }), R('jantar', 'Sala de jantar', 1.6), R('cozinha', 'Cozinha', 1.3), R('quarto', 'Quarto principal', 1.5), R('quarto', 'Quarto', 1.2), R('banheiro', 'Banho', 0.8, { minW: 2, minH: 2 })],
    mansao: () => [R('salao_mansao', 'Salão', 3.6, { main: true }), R('jantar', 'Sala de jantar', 1.8), R('cozinha', 'Cozinha', 1.4), R('leitura', 'Biblioteca', 1.6), R('quarto', 'Quarto principal', 1.6), R('quarto', 'Quarto', 1.2), R('quarto', 'Quarto de hóspedes', 1.2), R('banheiro', 'Banho', 0.9, { minW: 2, minH: 2 }), R('despensa', 'Despensa', 0.8, { minW: 2, minH: 2 })]
  }
};

const DECOR = {
  sala: [['Ê', 'Ó', 'E', 'Â', 'C', 'Ê'], 0.14], cabana: [['Ê', 'Ó', 'q', 'u'], 0.12], quarto: [['Ê', 'E', 'C', 'Ó'], 0.12],
  cozinha: [['u', 'Ó', 'Î', 'q', 'Ó'], 0.15], jantar: [['Ê', 'E', '7', 'Ó'], 0.15], banheiro: [['Ó', 'Ê'], 0.1],
  taverna: [['u', 'Ê', 'Â', 'q'], 0.1], loja: [['Ê', 'Ó', 'q'], 0.1], escritorio: [['E', 'Ê', 'C'], 0.15],
  salao_mansao: [['Ê', 'S', 'Ó', 'E'], 0.1], laboratorio: [['Ó', 'Ê', '7'], 0.1], oficina: [['q', 'u', '&'], 0.08]
};
const FLOOR_BY_ROLE = { cozinha: ['_', '_', null], banheiro: ['_'], despensa: ['_', null], deposito: [null, '_'], estoque: [null], oficina: [null], arsenal: ['_', null], quarto: [null], dormitorio: [null] };

// ---------- montagem ----------
function dims(def, size, w, h) {
  const foot = def.sizes.find((s) => s[0] === size)[2];
  const fw = w > 0 ? w : foot[0];
  const fh = h > 0 ? h : foot[1];
  let cols = clamp(Math.round(fw * 2 + 2), 10, 40);
  let rows = clamp(Math.round(fh * 2 + 3), 8, 30);
  return [cols, rows];
}

// Layout com desenho proprio (capela, torre, cripta): devolve false se nao deu.
function customLayout(type, size, p, rng) {
  const inner = { x: 1, y: 1, w: p.cols - 2, h: p.rows - 2 };
  const cx = Math.floor(p.cols / 2);
  if (type === 'torre') {
    const ccx = (p.cols - 1) / 2;
    const ccy = (p.rows - 1) / 2;
    const rx = (p.cols - 2) / 2 + 0.35;
    const ry = (p.rows - 2) / 2 + 0.35;
    const cells = rectCells(inner).filter(([x, y]) => ((x - ccx) / rx) ** 2 + ((y - ccy) / ry) ** 2 <= 1);
    p.addRoom({ role: 'torre', name: size === 'grande' ? 'Sala de estudos' : 'Sala da torre', main: true, ...inner }, cells);
    return true;
  }
  if (type === 'capela' || type === 'cripta') {
    const main = p.addRoom({ role: type === 'capela' ? 'nave' : 'cripta', name: type === 'capela' ? 'Nave' : 'Câmara', main: true, ...inner });
    const big = size === 'igreja' || size === 'grande';
    const sides = big ? rng.shuffle(['tl', 'tr']) : [rng.pick(['tl', 'tr'])];
    const cw = clamp(Math.floor(inner.w * 0.28), 3, 5);
    const ch = clamp(Math.floor(inner.h * 0.35), 3, 5);
    if (inner.w - 2 * (cw + 1) < 5 || inner.h - ch - 1 < 4) return true;
    sides.slice(0, big ? 2 : (rng.chance(0.7) ? 1 : 0)).forEach((corner, k) => {
      const x = corner === 'tl' ? inner.x : inner.x + inner.w - cw;
      const wx = corner === 'tl' ? x + cw : x - 1;
      for (let y = inner.y; y <= inner.y + ch; y++) { p.g[y][wx] = p.wall; p.owner[p.i(wx, y)] = -1; }
      for (let xx = x; xx < x + cw; xx++) { p.g[inner.y + ch][xx] = p.wall; p.owner[p.i(xx, inner.y + ch)] = -1; }
      const role = type === 'capela' ? 'sacristia' : 'ossuario';
      const name = type === 'capela' ? (k ? 'Capela lateral' : 'Sacristia') : (k ? 'Câmara lateral' : 'Ossuário');
      p.addRoom({ role, name, x, y: inner.y, w: cw, h: ch });
    });
    main.x = inner.x; // metadado: retangulo cheio
    return true;
  }
  return null;
}

function build(type, def, size, cols, rows, rng, wall, floor) {
  const p = new Plan(cols, rows, wall, floor, rng);
  const centerX = Math.floor(cols / 2);
  const inner = { x: 1, y: 1, w: cols - 2, h: rows - 2 };
  if (!customLayout(type, size, p, rng)) {
    let program = PROGRAMS[type][size](rng);
    let parts = null;
    while (!parts) {
      parts = partition(inner, program, rng, def.doorCenter ? { centerX } : {}, { n: 3000 });
      if (!parts) {
        if (program.length === 1) return null;
        program = program.slice(0, -1); // o menos importante sai
      }
    }
    // o principal primeiro (id 0) e o resto na ordem do programa
    parts.sort((a, b) => (b.main ? 1 : 0) - (a.main ? 1 : 0));
    for (const part of parts) {
      const opts = FLOOR_BY_ROLE[part.role];
      const fl = opts ? rng.pick(opts) : null;
      p.addRoom({ ...part, floor: fl || undefined });
    }
  }
  const main = p.rooms.find((r) => r.main);
  // porta de entrada na parede de baixo, dentro do principal
  const bottom = p.cells(main).filter(([, y]) => y === rows - 2).map(([x]) => x);
  if (!bottom.length) return null;
  let dx;
  if (def.doorCenter) dx = centerX;
  else {
    const inner2 = bottom.filter((x) => x > Math.min(...bottom) && x < Math.max(...bottom));
    const pool = inner2.length ? inner2 : bottom;
    const mid = pool[Math.floor(pool.length / 2)];
    dx = clamp(mid + rng.int(-2, 2), Math.min(...pool), Math.max(...pool));
  }
  if (p.owner[p.i(dx, rows - 2)] !== main.id) return null;
  p.g[rows - 1][dx] = DOOR;
  p.entry = { x: dx, y: rows - 2 };
  p.keep[p.i(dx, rows - 2)] = 1;
  if (p.owner[p.i(dx, rows - 3)] === main.id) p.keep[p.i(dx, rows - 3)] = 1;
  if (p.rooms.length > 1 && !connectRooms(p, rng)) return null;

  // janelas no fundo e na frente (nao em cripta)
  if (type !== 'cripta') {
    for (const room of p.rooms) {
      for (const [wy, iy] of [[0, 1], [rows - 1, rows - 2]]) {
        const xs = p.cells(room).filter(([x, y]) => y === iy && p.isWall(x, wy) && p.isWall(x - 1, wy) && p.isWall(x + 1, wy) && Math.abs(x - dx) > 1).map(([x]) => x);
        const n = Math.min(xs.length, wy === 0 ? (room.w >= 7 ? 2 : 1) : (rng.chance(0.5) ? 1 : 0));
        for (const x of rng.shuffle(xs).slice(0, n)) p.g[wy][x] = 'J';
      }
    }
  }

  const f = new Furnisher(p, rng);
  // escada pedida pelo programa antes (precisa de parede livre)
  for (const room of p.rooms) if (room.stairs) f.stairs(room, room.stairs);
  const ctx = { centerX, centerY: Math.floor(rows / 2) };
  for (const room of p.rooms) (F[room.role] || F.sala)(f, room, ctx);
  for (const room of p.rooms) f.light(room);
  // enfeites encostados nas paredes que sobraram (casa com cara de habitada)
  for (const room of p.rooms) {
    const d = DECOR[room.role];
    if (d) f.stock(room, d[0], d[1], ['top', 'left', 'right', 'bottom']);
  }
  // tapetinho na entrada (casa e comercio)
  if (['casa', 'taverna', 'loja', 'mansao', 'alquimista'].includes(type) && rng.chance(0.5)) p.o[p.entry.y][p.entry.x] = 'r';

  return p;
}

function toResult(p, type, size, name, light) {
  const { map } = repairMap({
    cols: p.cols, rows: p.rows,
    layers: { ground: p.g.map((r) => r.join('')), objects: p.o.map((r) => r.join('')) },
    items: [], buildings: [], ...(light ? { light } : {})
  });
  return {
    map,
    rooms: p.rooms.map((r) => ({ name: r.name, role: r.role, x: r.x, y: r.y, w: r.w, h: r.h })),
    entry: { ...p.entry },
    door: { x: p.entry.x, y: p.entry.y + 1 },
    type, size, name: name || p.rooms.find((r) => r.main).name
  };
}

// Confere o resultado: formato valido, porta de entrada, e caminho (BFS sem solidos) da
// entrada ate todo comodo. Usado no gerador (tenta outra semente se falhar) e nos testes.
export function checkInterior(res) {
  const errors = [];
  const { map, entry, rooms } = res || {};
  const v = validateMap(map);
  if (!v.ok) errors.push(...v.errors);
  if (!map || !entry) return { ok: false, errors: [...errors, 'Sem mapa ou entrada.'] };
  if (map.cols > 80 || map.rows > 80) errors.push('Interior maior que 80×80.');
  if (map.layers.ground[entry.y + 1]?.[entry.x] !== DOOR) errors.push('Entrada sem porta embaixo.');
  if (isSolid(map, entry.x, entry.y)) errors.push('Entrada bloqueada.');
  const seen = new Set([`${entry.x},${entry.y}`]);
  const stack = [[entry.x, entry.y]];
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of Object.values(DIRS)) {
      const nx = x + dx;
      const ny = y + dy;
      const k = `${nx},${ny}`;
      if (seen.has(k) || isSolid(map, nx, ny)) continue;
      seen.add(k);
      stack.push([nx, ny]);
    }
  }
  for (const r of rooms || []) {
    let ok = false;
    for (let y = r.y; y < r.y + r.h && !ok; y++) for (let x = r.x; x < r.x + r.w && !ok; x++) if (seen.has(`${x},${y}`)) ok = true;
    if (!ok) errors.push(`Cômodo "${r.name}" sem caminho da entrada.`);
  }
  return { ok: errors.length === 0, errors };
}

// API principal. type: id de INTERIOR_TYPES (ou nome livre: passa por interiorTypeFor);
// w/h: pegada da construcao no mapa de fora; size: id do tamanho (opcional, senao pela pegada);
// seed: numero/texto; wall/floor: codigo do bloco (ou material da fachada: madeira/pedra/...).
// Devolve {map, rooms:[{name, role, x, y, w, h}], entry:{x, y}, door:{x, y}, type, size, name}.
export function generateInterior({ type = 'casa', w, h, size, seed = 0, wall, floor, name } = {}) {
  const id = TYPE_DEFS[type] ? type : interiorTypeFor(type);
  const def = TYPE_DEFS[id];
  const sz = sizeFor(def, size, Number(w), Number(h));
  let [cols, rows] = dims(def, sz, Number(w), Number(h));
  if (id === 'torre') { const s = Math.max(cols, rows) | 1; cols = s; rows = s; }
  const wl = wallCode(wall, def.wall);
  const fl = floorCode(floor, def.floor);
  for (let attempt = 0; attempt < 40; attempt++) {
    const rng = makeRng(`${id}|${sz}|${cols}x${rows}|${wl}${fl}|${seed}|${attempt}`);
    const p = build(id, def, sz, cols, rows, rng, wl, fl);
    if (!p) continue;
    const res = toResult(p, id, sz, name, def.light);
    if (checkInterior(res).ok) return res;
  }
  // nunca deveria chegar aqui: sala vazia com porta (sempre valida)
  const p = new Plan(cols, rows, wl, fl, makeRng('fallback'));
  p.addRoom({ role: 'sala', name: def.name, main: true, x: 1, y: 1, w: cols - 2, h: rows - 2 });
  const dx = Math.floor(cols / 2);
  p.g[rows - 1][dx] = DOOR;
  p.entry = { x: dx, y: rows - 2 };
  return toResult(p, id, sz, name, def.light);
}
