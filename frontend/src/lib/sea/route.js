// Rota da viagem na cena de mar: tamanho, ponto em um progresso (0..1), direcao do barco
// (8 direcoes) e progresso agora (mesma conta do servidor, com o relogio dele).

export const DIRS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];

export function routeLength(route) {
  let total = 0;
  for (let i = 1; i < (route?.length || 0); i++) total += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
  return total;
}

// Direcao (8) de um vetor no mapa (y para baixo): e, se, s, ...
export function dirOf(dx, dy, fallback = 'e') {
  if (!dx && !dy) return fallback;
  const a = (Math.atan2(dy, dx) * 180) / Math.PI;
  return DIRS[((Math.round(a / 45) % 8) + 8) % 8];
}

// Ponto da rota no progresso t (por distancia, nao por trecho) e a direcao do trecho.
export function pointAt(route, t) {
  if (!route?.length) return { x: 0, y: 0, dir: 'e' };
  if (route.length === 1) return { ...route[0], dir: 'e' };
  const total = routeLength(route);
  let want = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1]; const b = route[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (want <= seg || i === route.length - 1) {
      const k = seg ? Math.min(1, want / seg) : 0;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, dir: dirOf(b.x - a.x, b.y - a.y) };
    }
    want -= seg;
  }
  const last = route[route.length - 1];
  return { ...last, dir: 'e' };
}

// Progresso agora. offset = relogio do servidor - relogio daqui (ms).
export function voyageProgress(v, now = Date.now()) {
  const base = Number(v?.progress) || 0;
  if (!v || v.status !== 'sailing') return Math.min(1, base);
  const len = Math.max(1, routeLength(v.route));
  const secs = Math.max(0, (now - new Date(v.progress_at).getTime()) / 1000);
  return Math.min(1, base + (secs * Number(v.speed || 1)) / len);
}

// Tempo que falta (segundos) no ritmo atual; null parado.
export function secondsLeft(v, now = Date.now()) {
  if (!v || v.status !== 'sailing') return null;
  const len = routeLength(v.route);
  return Math.max(0, ((1 - voyageProgress(v, now)) * len) / Math.max(0.01, Number(v.speed || 1)));
}

export function voyageLabel(v, now = Date.now()) {
  const p = voyageProgress(v, now);
  if (p >= 1) return 'Chegando ao destino';
  if (v.status === 'paused') return 'Parado no mar';
  return 'Navegando';
}

// ---- rota automatica pelo mar (desvia das ilhas) ----
const WATER = new Set(['ó', 'W', '~', '0', 'ô']);
export const isWaterCode = (ch) => WATER.has(ch);

function lineClear(tiles, a, b) {
  const g = tiles.layers.ground; const o = tiles.layers.objects || [];
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(a.x + ((b.x - a.x) * i) / Math.max(1, n));
    const y = Math.round(a.y + ((b.y - a.y) * i) / Math.max(1, n));
    if (!WATER.has(g[y]?.[x]) || (o[y]?.[x] && o[y][x] !== ' ')) return false;
  }
  return true;
}

// Da esquerda para a direita pela agua (BFS 8 vizinhos), depois so os cantos necessarios.
export function seaRoute(tiles) {
  const { cols, rows } = tiles;
  const g = tiles.layers.ground; const o = tiles.layers.objects || [];
  const free = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && WATER.has(g[y][x]) && (!o[y]?.[x] || o[y][x] === ' ');
  const mid = Math.floor(rows / 2);
  const edge = (x0, dx) => {
    for (let x = x0; x >= 0 && x < cols; x += dx) {
      for (let d = 0; d < rows; d++) for (const y of [mid - d, mid + d]) if (free(x, y)) return { x, y };
    }
    return null;
  };
  const start = edge(Math.min(2, cols - 1), 1);
  const goal = edge(Math.max(0, cols - 3), -1);
  const straight = [{ x: 2, y: mid }, { x: cols - 3, y: mid }];
  if (!start || !goal) return straight;
  const prev = new Int32Array(cols * rows).fill(-1);
  const key = (x, y) => y * cols + x;
  const queue = [key(start.x, start.y)];
  prev[queue[0]] = queue[0];
  let found = false;
  for (let qi = 0; qi < queue.length && !found; qi++) {
    const k = queue[qi]; const x = k % cols; const y = Math.floor(k / cols);
    for (const [dx, dy] of [[1, 0], [0, 1], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx; const ny = y + dy;
      if (!free(nx, ny) || prev[key(nx, ny)] !== -1) continue;
      if (dx && dy && (!free(x + dx, y) || !free(x, y + dy))) continue; // nao corta quina de ilha
      prev[key(nx, ny)] = k;
      if (nx === goal.x && ny === goal.y) { found = true; break; }
      queue.push(key(nx, ny));
    }
  }
  if (!found) return straight;
  const path = [];
  for (let k = key(goal.x, goal.y); ; k = prev[k]) { path.push({ x: k % cols, y: Math.floor(k / cols) }); if (k === prev[k]) break; }
  path.reverse();
  const out = [path[0]];
  let i = 0;
  while (i < path.length - 1) {
    let j = path.length - 1;
    while (j > i + 1 && !lineClear(tiles, path[i], path[j])) j--;
    out.push(path[j]);
    i = j;
  }
  return out.slice(0, 64);
}
