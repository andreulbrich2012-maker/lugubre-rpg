// Mar aberto gerado: mar fundo (animado), ilhas com praia, coqueiros e pedras, rochedos soltos.
// Deterministico pela semente. As ilhas ficam fora da faixa do meio (por onde a rota passa).

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
}

export const SEA_SIZES = { pequeno: [44, 26], medio: [64, 36], grande: [90, 50] };

export function generateSea({ size = 'medio', islands = 4, rocks = 10, seed = Date.now() } = {}) {
  const [cols, rows] = SEA_SIZES[size] || SEA_SIZES.medio;
  const rnd = rng(seed);
  const ground = Array.from({ length: rows }, () => Array(cols).fill('ó'));
  const objects = Array.from({ length: rows }, () => Array(cols).fill(' '));
  const mid = rows / 2;
  const lane = Math.max(3, Math.round(rows * 0.12)); // faixa livre do meio
  const placed = [];
  for (let i = 0, tries = 0; i < islands && tries < 200; tries++) {
    const r = 2 + Math.floor(rnd() * Math.min(5, rows / 6));
    const cx = 6 + Math.floor(rnd() * (cols - 12));
    const top = rnd() < 0.5;
    const cy = top ? Math.floor(1 + r + rnd() * Math.max(1, mid - lane - 2 * r - 2)) : Math.floor(mid + lane + r + 1 + rnd() * Math.max(1, mid - lane - 2 * r - 2));
    if (placed.some((p) => Math.hypot(p.x - cx, p.y - cy) < p.r + r + 4)) continue;
    placed.push({ x: cx, y: cy, r });
    i++;
  }
  // ilha: anel de agua rasa, praia e o meio com grama; borda irregular pelo ruido
  for (const isl of placed) {
    for (let y = isl.y - isl.r - 3; y <= isl.y + isl.r + 3; y++) for (let x = isl.x - isl.r - 3; x <= isl.x + isl.r + 3; x++) {
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      const d = Math.hypot(x - isl.x, (y - isl.y) * 1.15) + (rnd() - 0.5) * 0.9;
      if (d <= isl.r - 1.2) ground[y][x] = '.';
      else if (d <= isl.r) ground[y][x] = ':';
      else if (d <= isl.r + 1.6 && ground[y][x] === 'ó') ground[y][x] = '~';
    }
    for (let y = isl.y - isl.r; y <= isl.y + isl.r; y++) for (let x = isl.x - isl.r; x <= isl.x + isl.r; x++) {
      if (ground[y]?.[x] === '.' && rnd() < 0.28) objects[y][x] = rnd() < 0.7 ? 'ý' : 'b';
      else if (ground[y]?.[x] === ':' && rnd() < 0.08) objects[y][x] = 'o';
    }
  }
  // rochedos soltos (agua rasa com pedra), longe da faixa do meio
  for (let i = 0, tries = 0; i < rocks && tries < 300; tries++) {
    const x = 3 + Math.floor(rnd() * (cols - 6));
    const y = 1 + Math.floor(rnd() * (rows - 2));
    if (Math.abs(y - mid) < lane || ground[y][x] !== 'ó') continue;
    ground[y][x] = '~';
    objects[y][x] = 'o';
    i++;
  }
  return {
    cols, rows,
    layers: { ground: ground.map((r) => r.join('')), objects: objects.map((r) => r.join('')) },
    items: [], buildings: [], sea: true
  };
}
