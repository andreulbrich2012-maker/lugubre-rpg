// Gerador de vila pronta (mesmo jeito da Vila de Corvalba): estrada principal, praca central com
// fonte e feira, fileiras de construcoes do catalogo com vielas na frente das portas, rio com
// ponte e lago, fazenda com campos, cemiterio ao lado da capela e floresta nas bordas.
// Deterministico pela semente. Devolve o mapa no formato do editor (repairMap aplicado).
import { DESIGN_BY_ID, DESIGNS } from './designs.js';
import { repairMap, MAX_BUILDINGS } from '../tiles/format.js';

export const VILLAGE_SIZES = [
  { id: 'aldeia', name: 'Aldeia', cols: 56, rows: 42 },
  { id: 'vila', name: 'Vila', cols: 72, rows: 50 },
  { id: 'cidade', name: 'Cidade', cols: 110, rows: 76 },
  { id: 'metropole', name: 'Metrópole', cols: 160, rows: 110 }
];

const GRASS = new Set(['.', 'á', 'g']);
const CLEAR = 3; // linhas livres acima da pegada (o telhado sobe ali)

function rng(seed) {
  let s = (Number(seed) >>> 0) || 1;
  return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
}

// predios especiais (um de cada, perto da praca) e o resto vem dos pools
const SPECIAL_NORTH = ['prefeitura-10', 'capela-8', 'biblioteca-10', 'padaria-7', 'loja-7', 'escola-10', 'banco', 'correio-7'];
const SPECIAL_SOUTH = ['taverna-10', 'ferraria-8', 'mercearia-7', 'alfaiataria-7', 'boticario-7', 'acougue-7', 'estalagem-10'];
const HOUSE_SIZES = ['cabana', 'pequena', 'media', 'grande'];
const housePool = DESIGNS.filter((d) => d.category === 'Casas' && HOUSE_SIZES.includes(d.size));
const bigHouses = DESIGNS.filter((d) => d.category === 'Casas' && ['casarao', 'mansao'].includes(d.size));

export function generateVillage({ size = 'vila', seed = 1, river = true, lake = true, farm = true, cemetery = true, style, light = 'dia', name } = {}) {
  const dims = VILLAGE_SIZES.find((s) => s.id === size) || VILLAGE_SIZES[1];
  const C = dims.cols;
  const R = dims.rows;
  const rnd = rng(seed);
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const G = Array.from({ length: R }, () => Array(C).fill('.'));
  const O = Array.from({ length: R }, () => Array(C).fill(' '));
  const inside = (x, y) => x >= 0 && y >= 0 && x < C && y < R;
  const taken = new Uint8Array(C * R); // 1 = nada de arvore/objeto aleatorio aqui
  const take = (x, y) => { if (inside(x, y)) taken[y * C + x] = 1; };
  const takeRect = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) take(x, y); };
  const isTaken = (x, y) => !inside(x, y) || taken[y * C + x] === 1;
  const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(x, y)) G[y][x] = ch; };
  const obj = (x, y, ch) => { if (inside(x, y)) { O[y][x] = ch; take(x, y); } };

  for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { const r = rnd(); if (r < 0.06) G[y][x] = 'á'; else if (r < 0.09) G[y][x] = 'g'; }

  // ---- estrada principal, praca e rio ----
  const roadY = Math.floor(R * 0.48);
  fill(0, roadY, C - 1, roadY + 1, ';'); takeRect(0, roadY, C - 1, roadY + 1);
  const riverOn = river && C >= 40;
  const riverX = riverOn ? Math.floor(C * 0.78) : C + 10;
  const pw = Math.max(10, Math.round(C * 0.22));
  const ph = Math.max(8, Math.round(R * 0.26));
  const px0 = Math.max(4, Math.min(riverX - pw - 10, Math.floor(C * 0.42 - pw / 2)));
  const py0 = roadY - Math.floor(ph / 2);
  fill(px0, py0, px0 + pw - 1, py0 + ph - 1, 'c'); takeRect(px0, py0, px0 + pw - 1, py0 + ph - 1);

  const lakeOn = lake && riverOn;
  const lakeC = { x: Math.min(C - 8, riverX + 4), y: R - Math.max(6, Math.round(R * 0.12)), rx: Math.max(7, Math.round(C * 0.15)), ry: Math.max(5, Math.round(R * 0.14)) };
  if (riverOn) {
    let rx = riverX;
    const end = lakeOn ? lakeC.y - lakeC.ry + 2 : R;
    for (let y = 0; y < end; y++) {
      if (y % 6 === 3) rx += rnd() < 0.5 ? -1 : 1;
      rx = Math.max(riverX - 2, Math.min(riverX + 2, rx));
      fill(rx, y, rx + 2, y, '0');
      takeRect(rx - 1, y, rx + 3, y);
    }
    // ponte onde a estrada cruza o rio
    for (let x = riverX - 4; x <= riverX + 6; x++) for (let y = roadY; y <= roadY + 1; y++) {
      if (G[y - 1]?.[x] === '0' || G[y + 2]?.[x] === '0') G[y][x] = '-';
    }
  }
  if (lakeOn) {
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
      const d = Math.hypot((x - lakeC.x) / lakeC.rx, (y - lakeC.y) / lakeC.ry);
      if (d < 1) { G[y][x] = d < 0.55 ? 'W' : '~'; take(x, y); } else if (d < 1.12) { G[y][x] = ':'; take(x, y); }
    }
  }

  // ---- construcoes em fileiras ----
  const buildings = [];
  const fits = (d, x, y) => {
    if (x < 1 || y < CLEAR || x + d.w > C - 1 || y + d.h > R - 1) return false;
    for (let yy = y - CLEAR; yy < y + d.h + 1; yy++) for (let xx = x - 1; xx <= x + d.w; xx++) {
      if (!inside(xx, yy)) continue;
      if (yy >= y && yy < y + d.h && !GRASS.has(G[yy][xx])) return false;
      if (taken[yy * C + xx] === 2) return false; // outra construcao (com folga do telhado)
    }
    return true;
  };
  const place = (d, x, y, nm) => {
    if (!d || buildings.length >= MAX_BUILDINGS || !fits(d, x, y)) return false;
    for (let yy = y - CLEAR; yy <= y + d.h; yy++) for (let xx = x - 1; xx <= x + d.w; xx++) if (inside(xx, yy)) taken[yy * C + xx] = 2;
    buildings.push({ id: `b${buildings.length + 1}`, x, y, w: d.w, h: d.h, name: nm || d.name, design: d.id });
    return true;
  };

  // uma fileira: construcoes com a base em "bottom" e no maximo maxH de altura; devolve o topo mais alto
  const small = dims.id === 'aldeia';
  const specials = small ? { n: ['capela-6', 'loja-7'], s: ['taverna-8'] } : { n: [...SPECIAL_NORTH], s: [...SPECIAL_SOUTH] };
  const row = (bottom, side, first, maxH, xEnd = C - 2) => {
    let x = 2 + Math.floor(rnd() * 2);
    let top = bottom;
    const houses = housePool.filter((d) => d.h <= maxH);
    const bigs = bigHouses.filter((d) => d.h <= maxH);
    while (x < xEnd - 3) {
      if (riverOn && x >= riverX - 2 && x <= riverX + 4) { x = riverX + 5; continue; }
      const nearPlaza = x >= px0 - 12 && x <= px0 + pw + 4;
      const tries = [];
      if (first && specials[side].length && (nearPlaza || rnd() < 0.45)) {
        const sp = DESIGN_BY_ID[specials[side][0]];
        if (sp && sp.h <= maxH) tries.push(sp);
      }
      if (rnd() < 0.08 && bigs.length) tries.push(pick(bigs));
      for (let k = 0; k < 4; k++) tries.push(pick(houses));
      // de vez em quando um jardinzinho no lugar de uma casa (quebra a fileira)
      if (!first && rnd() < 0.12 && x + 5 < xEnd) {
        const gy = bottom;
        if ([0, 1, 2, 3].every((k) => GRASS.has(G[gy][x + k]) && taken[gy * C + x + k] !== 2)) {
          obj(x, gy - 1, 'T'); obj(x + 2, gy, 'Â'); obj(x + 1, gy, 'f'); obj(x + 3, gy, 'f'); obj(x + 3, gy - 2, 'b');
          x += 5;
          continue;
        }
      }
      const ok = tries.find((d) => d && x + d.w < xEnd && place(d, x, bottom - d.h + 1));
      if (ok) {
        if (specials[side][0] === ok.id) specials[side].shift();
        top = Math.min(top, bottom - ok.h + 1);
        x += ok.w + 1 + Math.floor(rnd() * 2);
      } else x += 1;
    }
    return top;
  };
  const lakeLeft = lakeOn ? lakeC.x - lakeC.rx - 2 : C - 2;
  // norte: a primeira fileira encosta na estrada; as outras ganham uma viela logo abaixo das portas
  let bottom = roadY - 2;
  let first = true;
  while (bottom - 3 - CLEAR >= 1) {
    const maxH = Math.min(first ? 7 : 5, bottom - CLEAR);
    if (!first) { fill(1, bottom + 1, riverOn ? riverX - 2 : C - 2, bottom + 1, 'û'); takeRect(1, bottom + 1, riverOn ? riverX - 2 : C - 2, bottom + 1); }
    const top = row(bottom, 'n', first, maxH);
    first = false;
    bottom = top - CLEAR - 2;
  }
  // sul: cada fileira tem a viela logo abaixo das portas
  const farmTop = farm ? R - Math.max(8, Math.round(R * 0.16)) : R;
  let farmRect = null;
  // fazenda no canto de baixo-esquerdo
  if (farm) {
    const fx0 = 2; const fy0 = farmTop + 1;
    farmRect = { x0: fx0 - 1, x1: fx0 + Math.round(C * 0.18) + (dims.id === 'aldeia' ? 10 : 14), y0: fy0 - 1 }; const fx1 = Math.min(fx0 + Math.round(C * 0.18), px0 - 2); const fy1 = R - 2;
    if (fx1 - fx0 > 6 && fy1 - fy0 > 3) {
      fill(fx0, fy0, fx1, fy1, 'â');
      for (let y = fy0; y <= fy1; y++) for (let x = fx0; x <= fx1; x++) { take(x, y); if ((y - fy0) % 2 === 0) O[y][x] = 'Ñ'; }
      for (let y = fy0 - 1; y <= fy1; y++) { obj(fx0 - 1, y, '+'); obj(fx1 + 1, y, '+'); }
      obj(Math.floor((fx0 + fx1) / 2), fy0 + 1, 'Ð');
      const barn = DESIGN_BY_ID[dims.id === 'aldeia' ? 'celeiro-6' : 'celeiro-silo-8'];
      place(barn, fx1 + 3, fy1 - barn.h + 1, 'Celeiro');
      for (let y = fy0 - 1; y <= fy1; y++) for (let x = fx0 - 1; x <= fx1 + 1; x++) if (inside(x, y)) taken[y * C + x] = 2;
      obj(fx1 + 2, fy0, 'Ï');
    }
  }

  let lane = roadY + 2 + CLEAR + 6;
  first = true;
  while (lane < R - 2) {
    const xEnd = Math.min(C - 2, lane > (lakeOn ? lakeC.y - lakeC.ry - 1 : R) ? lakeLeft : C - 2);
    // a viela nao atravessa a fazenda: comeca do lado dela
    const x0 = farmRect && lane >= farmRect.y0 - 1 ? farmRect.x1 : 1;
    if (x0 < xEnd - 6) {
      for (let x = x0; x <= xEnd; x++) G[lane][x] = G[lane][x] === '0' ? '-' : 'û';
      takeRect(x0, lane, xEnd, lane);
      for (let x = x0; x <= xEnd; x++) if (taken[lane * C + x] === 2) G[lane][x] = '.';
      row(lane - 1, 's', first, first ? 6 : 5, xEnd);
    }
    first = false;
    lane += 1 + CLEAR + 5;
  }
  // trilhas de terra da porta ate a estrada, praca ou viela
  const inB = (x, y) => buildings.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  for (const b of buildings) {
    const dx = b.x + DESIGN_BY_ID[b.design].doorCol;
    for (let y = b.y + b.h; inside(dx, y) && !';c-û'.includes(G[y][dx]) && !inB(dx, y) && !'0~W:'.includes(G[y][dx]) && y < b.y + b.h + 12; y++) {
      G[y][dx] = 'û'; O[y][dx] = ' '; take(dx, y);
    }
  }

  // ---- praca: fonte no meio, feira, bancos, lampioes, estatua ----
  const pcx = px0 + Math.floor(pw / 2);
  obj(pcx - 1, roadY - 1, 'Ú');
  // praca grande: mais barracas, bancos e arvores em volta
  for (let x = px0 + 7; x < px0 + pw - 7; x += 7) { obj(x, py0 + 3, 'Ö'); if (ph > 12) obj(x, py0 + ph - 2, 'Ö'); }
  for (let x = px0 + 3; x < px0 + pw - 2; x += 6) { obj(x, py0, 'T'); obj(x, py0 + ph - 1, 'T'); }
  if (pw > 16) { obj(px0 + 5, roadY - 3, 'Â'); obj(px0 + pw - 6, roadY - 3, 'Â'); obj(pcx + 4, roadY + 3, 'Ê'); obj(pcx - 5, roadY + 3, 'Ê'); }
  obj(px0 + 2, py0 + 3, 'Ö'); obj(px0 + pw - 4, py0 + 3, 'Ö'); obj(px0 + 2, py0 + ph - 2, 'Ö');
  for (const [x, y] of [[px0 + 1, py0 + 1], [px0 + pw - 2, py0 + 1], [px0 + 1, py0 + ph - 2], [px0 + pw - 2, py0 + ph - 2]]) obj(x, y, 'Í');
  obj(px0 + 4, roadY + 3, 'Û');
  obj(pcx - 3, py0 + 1, 'Â'); obj(pcx + 3, py0 + 1, 'Â'); obj(pcx + 2, py0 + ph - 2, 'Â');
  obj(px0 + pw - 5, roadY + 3, 'Ø');
  obj(px0 + pw - 3, roadY + 2, 'u'); obj(px0 + pw - 2, roadY + 2, 'u'); obj(px0 + pw - 3, roadY + 3, 'q');
  obj(px0 - 3, roadY + 2, 'Ô');
  // lampioes ao longo da estrada
  for (let x = 4; x < C - 2; x += 9) if (!isTaken(x, roadY - 1) && GRASS.has(G[roadY - 1][x])) obj(x, roadY - 1, 'Í');
  if (lakeOn) obj(lakeC.x - 2, lakeC.y - 1, 'Ù');
  if (riverOn && !isTaken(riverX + 6, roadY - 2)) obj(riverX + 6, roadY - 2, 'Õ');

  // cemiterio do lado da capela
  const chapel = buildings.find((b) => /^capela|^igreja/.test(b.design));
  if (cemetery && chapel) {
    const gx = chapel.x + chapel.w + 1;
    for (let i = 0; i < 6; i++) {
      const x = gx + (i % 3) * 2; const y = chapel.y + 1 + Math.floor(i / 3) * 2;
      if (inside(x, y) && GRASS.has(G[y][x]) && !inB(x, y) && taken[y * C + x] !== 2) obj(x, y, ['À', 't', 'Ò'][i % 3]);
    }
  }

  // ---- floresta nas bordas e arvores soltas ----
  for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
    if (isTaken(x, y) || O[y][x] !== ' ' || !GRASS.has(G[y][x]) || inB(x, y)) continue;
    if (taken[y * C + x] === 2) continue;
    const edge = Math.min(x, y, C - 1 - x, R - 1 - y);
    const p = edge <= 1 ? 0.55 : edge <= 3 ? 0.18 : 0.025;
    if (rnd() < p) O[y][x] = rnd() < 0.35 ? 'A' : rnd() < 0.85 ? 'T' : 'b';
    else if (rnd() < 0.03) O[y][x] = rnd() < 0.5 ? 'f' : 'b';
    else if (rnd() < 0.006) O[y][x] = 'o';
  }
  // nada de arvore na faixa do telhado (ela ficaria "dentro" do telhado)
  for (const b of buildings) for (let y = b.y - CLEAR; y < b.y; y++) for (let x = b.x; x < b.x + b.w; x++) if (inside(x, y) && 'TAb'.includes(O[y][x])) O[y][x] = ' ';

  const items = [];
  const tav = buildings.find((b) => b.design.startsWith('taverna'));
  if (tav) items.push({ id: 'i1', x: tav.x + tav.w + 1, y: tav.y + tav.h - 1, name: 'Mochila esquecida', container: true, weight: 1, quantity: 1, category: 'Achados', contents: [{ id: 'c1', name: 'Poção de cura menor', quantity: 1, weight: 0.3, category: 'Poções' }, { id: 'c2', name: 'Bolsa de moedas', quantity: 1, weight: 0.2, dracmas: 15, category: 'Achados' }] });

  const raw = { cols: C, rows: R, layers: { ground: G.map((r) => r.join('')), objects: O.map((r) => r.join('')) }, items, buildings, light, decor: 'normal', ...(style && style !== 'padrao' ? { style } : {}) };
  const { map } = repairMap(raw, { cols: C, rows: R });
  return { map, name: name || `${dims.name} gerada`, notes: `${buildings.length} construções prontas; troque material, telhado e cores no painel de cada uma.` };
}
