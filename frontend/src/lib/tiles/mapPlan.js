// Mapa por "plano": a IA (ou uma foto descrita pela IA) diz O QUE tem e ONDE, em coordenadas de
// 0 a 100 (porcentagem da largura/altura); aqui isso vira a grade de blocos bonita. Desenhar
// grade letra por letra e dificil para IA fraca; listar areas, rios, estradas e construcoes nao.
//
// Formato (tudo opcional menos o que se quer no mapa):
// { "name", "style", "light", "base": "grama"|"neve"|"areia"|"terra"|"pedra"|"pantano",
//   "areas": [{ "type": "floresta"|"bosque"|"campo"|"plantacao"|"praca"|"terra"|"cemiterio"|"lago"|
//               "pantano"|"areia"|"rocha"|"montanha"|"clareira"|"ritual"|"neve"|"lava",
//               "points": [[x,y],...] | "circle": [x,y,r] | "rect": [x,y,w,h] }],
//   "rivers": [{ "points": [[x,y],...], "width": 1..6 }],
//   "roads":  [{ "points": [[x,y],...], "width": 1..4, "type": "estrada"|"trilha"|"pedra"|"terra" }],
//   "fences": [{ "points": [[x,y],...], "type": "cerca"|"muro"|"sebe" }],
//   "buildings": [{ "type": "casa"|"taverna"|..., "size": "pequena"|"media"|"grande", "design": "id opcional",
//                   "x", "y", "facing": "sul"|"norte"|"leste"|"oeste", "name" }],
//   "objects": [{ "type": "fogueira"|"poco"|..., "x", "y" }],
//   "items": [...], "monsters": [...] }
import { repairMap, MAX_BUILDINGS, MAX_SIZE, isSolid } from './format.js';
import { DESIGN_BY_ID, DESIGNS } from '../buildings/designs.js';
import { roofRise } from '../buildings/index.js';
import { STYLE_IDS } from './styles.js';

export const PLAN_AREAS = ['bairro', 'mar', 'floresta', 'bosque', 'campo', 'plantacao', 'praca', 'terra', 'cemiterio', 'lago', 'pantano', 'areia', 'rocha', 'montanha', 'clareira', 'ritual', 'neve', 'lava'];
export const PLAN_OBJECTS = {
  fogueira: 'F', poco: 'Ô', fonte: 'Ú', estatua: 'Û', barraca: 'Ö', carroca: 'Ø', barco: 'Ù', tenda: 'Ý', forja: 'Ü',
  moinho: 'Õ', pedra: 'Þ', rocha: 'o', lapide: 't', cruz: 'À', lampiao: 'Í', tocha: 'i', banco: 'Â', barril: 'u', caixote: 'q',
  bau: 'C', arvore: 'T', pinheiro: 'A', arbusto: 'b', flores: 'f', espantalho: 'Ð', colmeia: 'Ï', placa: 's', altar: 'a',
  circulo: '`', menir: 'Ä', pilar: '1', sacos: 'Î', vaso: 'Ê', braseiro: '}', tronco: 'l', toco: 'l', cogumelos: 'm', arvore_morta: 'd',
  fogueira_grande: 'È'
};
// tipo de construcao -> projetos do catalogo (o tamanho escolhe entre eles)
export const PLAN_BUILDINGS = {
  casa: { pequena: ['casa-frente-pequena', 'casa-empena-pequena', 'casa-chale-pequena', 'casa-varanda-pequena', 'casa-ala-dir-pequena', 'casa-ala-esq-pequena'], media: ['casa-frente-media', 'casa-empena-media', 'casa-varanda-media', 'casa-ala-dir-media', 'casa-sobrado-media', 'casa-l-media', 'casa-geminada-media'], grande: ['casa-frente-grande', 'casa-varanda-grande', 'casa-sobrado-grande', 'casa-ala-esq-grande', 'casa-casarao-frente', 'casa-frente-casarao'] },
  cabana: { pequena: ['casa-chale-cabana', 'casa-frente-cabana', 'casa-varanda-cabana'], media: ['casa-chale-pequena'], grande: ['casa-chale-media'] },
  mansao: { pequena: ['casa-frente-casarao'], media: ['casa-sobrado-casarao'], grande: ['casa-frente-mansao', 'casa-varanda-mansao'] },
  taverna: { pequena: ['taverna-8'], media: ['taverna-10'], grande: ['taverna-12'] },
  estalagem: { pequena: ['estalagem-8'], media: ['estalagem-10'], grande: ['estalagem-12'] },
  loja: { pequena: ['loja-7'], media: ['loja-8'], grande: ['loja-9'] },
  mercado: { pequena: ['mercado-6'], media: ['mercado-10'], grande: ['mercado-10'] },
  padaria: { pequena: ['padaria-7'], media: ['padaria-8'], grande: ['padaria-9'] },
  ferraria: { pequena: ['ferraria-8'], media: ['ferraria-10'], grande: ['ferraria-12'] },
  serraria: { pequena: ['carpintaria-pequena-0'], media: ['carpintaria-media-0'], grande: ['carpintaria-comprida-0'] },
  armazem: { pequena: ['paiol-4'], media: ['armazem-media-0'], grande: ['armazem-grande-0'] },
  templo: { pequena: ['capela-6'], media: ['capela-8', 'templo-7'], grande: ['igreja-8', 'igreja-10', 'templo-10'] },
  capela: { pequena: ['capela-6'], media: ['capela-8'], grande: ['capela-10'] },
  prefeitura: { pequena: ['prefeitura-10'], media: ['prefeitura-10'], grande: ['prefeitura-13'] },
  biblioteca: { pequena: ['biblioteca-10'], media: ['biblioteca-10'], grande: ['biblioteca-13'] },
  escola: { pequena: ['escola-10'], media: ['escola-10'], grande: ['escola-13'] },
  quartel: { pequena: ['quartel-10'], media: ['quartel-10'], grande: ['quartel-13'] },
  celeiro: { pequena: ['celeiro-6'], media: ['celeiro-8', 'celeiro-silo-6'], grande: ['celeiro-10', 'celeiro-silo-8'] },
  estabulo: { pequena: ['estabulo'], media: ['estabulo'], grande: ['estabulo-longo'] },
  galinheiro: { pequena: ['galinheiro-p'], media: ['galinheiro-g'], grande: ['galinheiro-g'] },
  estufa: { pequena: ['estufa-p'], media: ['estufa-p'], grande: ['estufa-g'] },
  moinho: { pequena: ['moinho-p'], media: ['moinho-g'], grande: ['moinho-g'] },
  silo: { pequena: ['silo-baixo'], media: ['silo-alto'], grande: ['silo-alto'] },
  torre: { pequena: ['torre-guarda-48'], media: ['torre-guarda-64'], grande: ['torre-guarda-84'] },
  torre_mago: { pequena: ['torre-mago-4'], media: ['torre-mago-5'], grande: ['torre-mago-6'] },
  farol: { pequena: ['farol-48'], media: ['farol-64'], grande: ['farol-84'] },
  castelo: { pequena: ['castelo-10'], media: ['castelo-10'], grande: ['castelo-14'] },
  forte: { pequena: ['forte-10'], media: ['forte-10'], grande: ['forte-14'] },
  portao: { pequena: ['portao-6'], media: ['portao-8'], grande: ['portao-8'] },
  ruina: { pequena: ['ruina-5-4'], media: ['ruina-7-5'], grande: ['ruina-9-6'] },
  cripta: { pequena: ['cripta-7'], media: ['mausoleu-7'], grande: ['mausoleu-10'] },
  pescador: { pequena: ['pescador-5'], media: ['pescador-7'], grande: ['pescador-7'] },
  cabana_bruxa: { pequena: ['cabana-bruxa-5'], media: ['cabana-bruxa-6'], grande: ['cabana-bruxa-6'] },
  tenda: { pequena: ['tenda-4-7'], media: ['tenda-5-8'], grande: ['tenda-6-6'] },
  cogumelo: { pequena: ['cogumelo-4'], media: ['cogumelo-5'], grande: ['cogumelo-6'] }
};

const GRASSY = new Set(['.', 'á', 'g', 'à', ',', '*', ':', 'é', '%', 'v']);
const BASE = { grama: '.', neve: '*', areia: ':', terra: ',', pedra: 'é', pantano: '%' };
const WATER = new Set(['0', '~', 'W', 'ó']);

function rng(seed) {
  let s = (Number(seed) >>> 0) || 1;
  return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
}
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const strip = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/[\s-]+/g, '_');

// maior coordenada citada no plano (decide se a escala e 0-100 ou 0-1000)
function planMax(plan) {
  let m = 0;
  const see = (v) => { const n = Number(v); if (Number.isFinite(n) && n > m) m = n; };
  const walk = (list) => (Array.isArray(list) ? list : []).forEach((p) => (Array.isArray(p) ? (see(p[0]), see(p[1])) : (see(p?.x), see(p?.y))));
  for (const a of plan.areas || []) { walk(a?.points); if (Array.isArray(a?.circle)) { see(a.circle[0]); see(a.circle[1]); } if (Array.isArray(a?.rect)) { see(a.rect[0]); see(a.rect[1]); } }
  for (const k of ['rivers', 'roads', 'fences']) for (const l of plan[k] || []) walk(l?.points);
  for (const k of ['buildings', 'objects', 'items', 'monsters', 'pois']) walk(plan[k]);
  return m;
}

export const isPlan = (obj) => Boolean(obj && typeof obj === 'object' && !obj.layers && !obj.ground && (Array.isArray(obj.areas) || Array.isArray(obj.roads) || Array.isArray(obj.rivers) || (Array.isArray(obj.buildings) && obj.buildings.some((b) => b && (b.type || b.tipo)))));

// projeto do catalogo para uma construcao do plano
export function pickDesign(b, rnd = Math.random) {
  if (b.design && DESIGN_BY_ID[strip(b.design).replace(/_/g, '-')]) return DESIGN_BY_ID[strip(b.design).replace(/_/g, '-')];
  const type = strip(b.type ?? b.tipo ?? 'casa');
  const size = strip(b.size ?? b.tamanho ?? 'media').replace('medio', 'media').replace('pequeno', 'pequena');
  const key = Object.keys(PLAN_BUILDINGS).find((k) => type === k || type.includes(k)) || (/bruxa/.test(type) ? 'cabana_bruxa' : /igreja|santuario/.test(type) ? 'templo' : /estab|cavalar/.test(type) ? 'estabulo' : /deposito|paiol/.test(type) ? 'armazem' : /caca|lenhador/.test(type) ? 'cabana' : 'casa');
  const opts = (PLAN_BUILDINGS[key][size] || PLAN_BUILDINGS[key].media || []).filter((id) => DESIGN_BY_ID[id]);
  if (opts.length) return DESIGN_BY_ID[opts[Math.floor(rnd() * opts.length)]];
  return DESIGNS.find((d) => d.category === 'Casas' && d.size === 'media');
}

export function planToMap(plan, { cols = 64, rows = 48, seed = 1 } = {}) {
  const C = Math.max(16, Math.min(MAX_SIZE, Math.round(num(plan.cols, cols))));
  const R = Math.max(12, Math.min(MAX_SIZE, Math.round(num(plan.rows, rows))));
  const rnd = rng(seed);
  const base = BASE[strip(plan.base)] || '.';
  const G = Array.from({ length: R }, () => Array(C).fill(base));
  const O = Array.from({ length: R }, () => Array(C).fill(' '));
  const lock = new Uint8Array(C * R); // 1 = nao plantar arvore aqui; 2 = construcao/telhado
  const inside = (x, y) => x >= 0 && y >= 0 && x < C && y < R;
  // porcentagem -> celula
  // coordenadas de 0 a 1000 (precisao para mapa grande); plano antigo em 0 a 100 tambem vale
  const SCALE = num(plan.scale, 0) > 0 ? num(plan.scale) : planMax(plan) > 100.5 ? 1000 : 100;
  const px = (v) => Math.max(0, Math.min(C - 1, Math.round((num(v) / SCALE) * (C - 1))));
  const py = (v) => Math.max(0, Math.min(R - 1, Math.round((num(v) / SCALE) * (R - 1))));
  const pts = (list) => (Array.isArray(list) ? list : []).map((p) => (Array.isArray(p) ? [px(p[0]), py(p[1])] : [px(p?.x), py(p?.y)]));
  const setG = (x, y, ch) => { if (inside(x, y)) G[y][x] = ch; };
  const setO = (x, y, ch) => { if (inside(x, y)) O[y][x] = ch; };

  if (base === '.') for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { const r = rnd(); if (r < 0.05) G[y][x] = 'á'; else if (r < 0.08) G[y][x] = 'g'; }

  // ruido suave por celula (muda devagar: bordas organicas, nao serrilhadas)
  const hash = (x, y, k) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647 + seed * 1013904223) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h & 0xffff) / 0xffff; };
  const AMP = Math.max(3, Math.round(Math.min(C, R) * 0.07));
  const WSC = Math.max(4, Math.round(Math.min(C, R) * 0.06));
  const wob = (x, y, k) => { const X = x / WSC; const Y = y / WSC; const x0 = Math.floor(X); const y0 = Math.floor(Y); const fx = X - x0; const fy = Y - y0;
    const a = hash(x0, y0, k); const b = hash(x0 + 1, y0, k); const c = hash(x0, y0 + 1, k); const d = hash(x0 + 1, y0 + 1, k);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };

  // ---- areas ----
  // area natural em retangulo (campo, floresta, pantano...) vira poligono: borda organica, nada de quadrado
  const NATURAL = new Set(['floresta', 'bosque', 'campo', 'neve', 'areia', 'pantano', 'lago', 'rocha', 'montanha', 'clareira', 'mar', 'lava']);
  const shapeCells = (a) => {
    const cells = [];
    if (Array.isArray(a.rect) && !Array.isArray(a.points) && NATURAL.has(a.type)) {
      const [x, y, w, h] = a.rect.map((v) => num(v));
      return shapeCells({ type: a.type, points: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] });
    }
    if (Array.isArray(a.circle)) {
      const cx = px(a.circle[0]); const cy = py(a.circle[1]);
      const rx = Math.max(1, (num(a.circle[2], SCALE / 20) / SCALE) * C); const ry = Math.max(1, (num(a.circle[2], SCALE / 20) / SCALE) * R);
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry) + (rnd() - 0.5) * 0.12;
        if (inside(x, y) && d <= 1) cells.push([x, y, d]);
      }
    } else if (Array.isArray(a.rect)) {
      const x0 = px(a.rect[0]); const y0 = py(a.rect[1]); const x1 = px(num(a.rect[0]) + num(a.rect[2])); const y1 = py(num(a.rect[1]) + num(a.rect[3]));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cells.push([x, y, Math.max(Math.abs(x - (x0 + x1) / 2) / ((x1 - x0) / 2 + 0.5), Math.abs(y - (y0 + y1) / 2) / ((y1 - y0) / 2 + 0.5))]);
    } else {
      // vertice na borda do mapa vai alem dela: o balanço da borda nao deixa faixa sem preencher
      const poly = pts(a.points).map(([x, y]) => [x <= 0 ? -AMP - 2 : x >= C - 1 ? C + AMP + 1 : x, y <= 0 ? -AMP - 2 : y >= R - 1 ? R + AMP + 1 : y]);
      if (poly.length < 3) return cells;
      const xs = poly.map((p) => p[0]); const ys = poly.map((p) => p[1]);
      const cx = xs.reduce((s, v) => s + v, 0) / xs.length; const cy = ys.reduce((s, v) => s + v, 0) / ys.length;
      const rmax = Math.max(1, ...poly.map(([x, y]) => Math.hypot(x - cx, y - cy)));
      for (let y = Math.max(0, Math.min(...ys) - 2); y <= Math.min(R - 1, Math.max(...ys) + 2); y++) for (let x = Math.max(0, Math.min(...xs) - 2); x <= Math.min(C - 1, Math.max(...xs) + 2); x++) {
        // borda irregular (nada de linha reta): o ponto testado balanca um pouco
        const jx = x + (wob(x, y, 1) - 0.5) * AMP; const jy = y + (wob(x, y, 2) - 0.5) * AMP;
        let inP = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const [xi, yi] = poly[i]; const [xj, yj] = poly[j];
          if ((yi > jy) !== (yj > jy) && jx < ((xj - xi) * (jy - yi)) / (yj - yi || 1e-9) + xi) inP = !inP;
        }
        if (inP) cells.push([x, y, Math.hypot(x - cx, y - cy) / rmax]);
      }
    }
    return cells;
  };
  // mar cedo: o que vem depois (rocha, montanha) pode virar ponta/ilha; o resto nao apaga a agua
  const ORDER = { bairro: 10, mar: 1.5, floresta: 0, bosque: 1, montanha: 2, rocha: 3, campo: 4, neve: 4, areia: 5, terra: 5, pantano: 6, lago: 7, lava: 7, plantacao: 8, cemiterio: 8, clareira: 9, ritual: 9, praca: 10 };
  // chao do mapa quase todo (pantano, neve, campo, areia) e o fundo: pinta primeiro, a vila vem por cima
  const bbox = (a) => {
    if (Array.isArray(a.rect)) return [num(a.rect[2]), num(a.rect[3])];
    if (Array.isArray(a.circle)) return [num(a.circle[2]) * 2, num(a.circle[2]) * 2];
    const p = Array.isArray(a.points) ? a.points.filter(Array.isArray) : [];
    if (!p.length) return [0, 0];
    return [Math.max(...p.map((q) => num(q[0]))) - Math.min(...p.map((q) => num(q[0]))), Math.max(...p.map((q) => num(q[1]))) - Math.min(...p.map((q) => num(q[1])))];
  };
  const rank = (a) => (['pantano', 'neve', 'campo', 'areia'].includes(a.type) && bbox(a).every((v) => v >= SCALE * 0.8) ? -1 : ORDER[a.type]);
  const areas = (Array.isArray(plan.areas) ? plan.areas : []).map((a) => ({ ...a, type: strip(a?.type ?? a?.tipo) })).filter((a) => ORDER[a.type] !== undefined).sort((a, b) => rank(a) - rank(b));
  const noHouse = new Uint8Array(C * R); // mercado, cemiterio, ritual: o bairro nao poe casa em cima
  const forest = new Uint8Array(C * R); // 1 bosque, 2 floresta, 3 montanha
  const districts = []; // areas de bairro: o sistema enche de casas
  const sea = new Uint8Array(C * R); // 1 = celula de mar
  for (const a of areas) {
    const cells = shapeCells(a);
    const cemetery = [];
    for (const [x, y, d] of cells) {
      const i0 = y * C + x;
      if (sea[i0] && a.type !== 'mar') {
        // terra sobre o mar so para rocha/montanha (ponta de pedra, ilha); o resto respeita a agua
        if (a.type === 'rocha' || a.type === 'montanha') { sea[i0] = 0; lock[i0] = 0; } else continue;
      }
      switch (a.type) {
        case 'floresta': forest[y * C + x] = 2; break;
        case 'bosque': forest[y * C + x] = 1; break; // mancha rala, ate dentro da floresta
        case 'montanha': G[y][x] = 'é'; forest[y * C + x] = 3; if (rnd() < 0.05) setO(x, y, 'Þ'); break;
        case 'rocha': G[y][x] = 'é'; forest[y * C + x] = 3; if (rnd() < 0.08) setO(x, y, 'o'); break;
        case 'campo': G[y][x] = rnd() < 0.5 ? 'g' : 'á'; forest[y * C + x] = 0; if (rnd() < 0.05) setO(x, y, 'f'); break;
        case 'neve': G[y][x] = '*'; break;
        case 'areia': G[y][x] = ':'; forest[y * C + x] = 0; break;
        case 'terra': G[y][x] = ','; forest[y * C + x] = 0; break;
        case 'pantano': {
          // manchas de agua parada e lama no meio do capim (ruido), mais ralas na borda da area
          const n = wob(x, y, 5) * 0.7 + wob(x * 2, y * 2, 6) * 0.3 - Math.max(0, d - 0.6) * 0.6;
          G[y][x] = n > 0.54 ? '%' : n > 0.46 ? 'j' : 'g';
          forest[y * C + x] = 0;
          const r = rnd();
          if (n <= 0.46 && r < 0.06) setO(x, y, r < 0.03 ? 'T' : r < 0.05 ? 'd' : 'm');
          break;
        }
        case 'lago': G[y][x] = d < 0.55 ? 'W' : '~'; O[y][x] = ' '; forest[y * C + x] = 0; lock[y * C + x] = 1; break;
        case 'mar': G[y][x] = d < 0.82 ? 'ó' : '~'; O[y][x] = ' '; forest[y * C + x] = 0; lock[y * C + x] = 1; sea[y * C + x] = 1; break;
        case 'lava': G[y][x] = 'L'; forest[y * C + x] = 0; lock[y * C + x] = 1; break;
        case 'plantacao': G[y][x] = 'â'; forest[y * C + x] = 0; lock[y * C + x] = 1; if (y % 2 === 0) setO(x, y, 'Ñ'); break;
        case 'cemiterio': forest[y * C + x] = 0; lock[y * C + x] = 1; cemetery.push([x, y, d]); break;
        case 'clareira': forest[y * C + x] = 0; lock[y * C + x] = 1; break;
        case 'ritual': forest[y * C + x] = 0; lock[y * C + x] = 1; if (d < 0.35) G[y][x] = 'à'; break;
        case 'praca': G[y][x] = 'c'; forest[y * C + x] = 0; lock[y * C + x] = 1; break;
        case 'bairro': forest[y * C + x] = 0; break;
        default: break;
      }
    }
    // chao de terra pequeno = feira/mercado (o grande e o chao da vila); cemiterio e ritual tambem ficam sem casa
    if ((a.type === 'terra' && cells.length < C * R * 0.06) || a.type === 'cemiterio' || a.type === 'ritual') for (const [x, y] of cells) noHouse[y * C + x] = 1;
    if (a.type === 'bairro') districts.push({ cells, small: strip(a.size ?? a.tamanho) === 'grande' ? 0.2 : strip(a.size ?? a.tamanho) === 'media' ? 0.4 : 0.7, density: Math.max(0.2, Math.min(1.5, num(a.density ?? a.densidade, 1))), type: strip(a.buildings ?? a.tipo_casas ?? 'casa') });
    if (a.type === 'cemiterio') {
      for (const [x, y, d] of cemetery) {
        if (d > 0.92) setO(x, y, '+');
        else if (x % 2 === 0 && y % 2 === 0 && d < 0.8) setO(x, y, ['t', 'Ò', 'À'][(x + y) % 3]);
      }
    }
    if (a.type === 'ritual' && cells.length) {
      const cx = Math.round(cells.reduce((s, c) => s + c[0], 0) / cells.length); const cy = Math.round(cells.reduce((s, c) => s + c[1], 0) / cells.length);
      setO(cx, cy, '`');
      // raio minimo (~5% do mapa) e anel aberto em volta: o circulo de pedras aparece de verdade
      const r = Math.max(3, Math.round(Math.min(C, R) * 0.04), Math.round(Math.sqrt(cells.length / Math.PI) * 0.7));
      for (let yy = cy - r - 3; yy <= cy + r + 3; yy++) for (let xx = cx - r - 3; xx <= cx + r + 3; xx++) if (inside(xx, yy) && Math.hypot(xx - cx, (yy - cy) / 0.8) <= r + 3) { forest[yy * C + xx] = 0; lock[yy * C + xx] = Math.max(lock[yy * C + xx], 1); if ('TAb'.includes(O[yy][xx])) O[yy][xx] = ' '; }
      for (let k = 0; k < 8; k++) setO(Math.round(cx + Math.cos((k / 8) * Math.PI * 2) * r), Math.round(cy + Math.sin((k / 8) * Math.PI * 2) * r * 0.8), 'Ä');
    }
  }

  // ---- praia automatica: toda costa de mar ganha areia e a mata recua ----
  if (sea.some((v) => v)) {
    const dist = new Int16Array(C * R).fill(99);
    const q = [];
    for (let i = 0; i < C * R; i++) if (sea[i]) { dist[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++) {
      const i = q[h]; const x = i % C; const y = (i - x) / C;
      if (dist[i] >= 5) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx; const Y = y + dy; const j = Y * C + X;
        if (inside(X, Y) && dist[j] > dist[i] + 1) { dist[j] = dist[i] + 1; q.push(j); }
      }
    }
    const BEACH = Math.max(2, Math.round(Math.min(C, R) * 0.02));
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
      const i = y * C + x; const k = dist[i];
      if (!k || k > 5) continue;
      if (k <= BEACH + (wob(x, y, 7) > 0.5 ? 1 : 0) && '.áàg'.includes(G[y][x])) { G[y][x] = ':'; if (O[y][x] === 'f') O[y][x] = ' '; }
      if (forest[i] === 2 || forest[i] === 1) forest[i] = 0;
    }
  }

  // ---- linhas (rios, estradas, cercas) ----
  // ponta de rio/estrada a menos de 8% da borda vai ate a borda (IA fraca para em 917, 884...)
  const toEdge = (list) => {
    const p = pts(list);
    if (p.length < 2) return p;
    const snap = ([x, y]) => {
      const mx = Math.max(2, Math.round(C * 0.08)); const my = Math.max(2, Math.round(R * 0.08));
      const d = [[x, 0, x], [C - 1 - x, 1, x], [y, 2, y], [R - 1 - y, 3, y]].sort((a, b) => a[0] - b[0])[0];
      if (d[1] === 0 && x < mx) return [0, y];
      if (d[1] === 1 && C - 1 - x < mx) return [C - 1, y];
      if (d[1] === 2 && y < my) return [x, 0];
      if (d[1] === 3 && R - 1 - y < my) return [x, R - 1];
      return [x, y];
    };
    return [snap(p[0]), ...p.slice(1, -1), snap(p[p.length - 1])];
  };
  const line = (list, fn, edge = false) => {
    const p = edge ? toEdge(list) : pts(list);
    for (let i = 0; i + 1 < p.length; i++) {
      const [x0, y0] = p[i]; const [x1, y1] = p[i + 1];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let k = 0; k <= n; k++) fn(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), Math.abs(x1 - x0) >= Math.abs(y1 - y0));
    }
  };
  const brush = (x, y, w, fn) => { const h0 = -Math.floor((w - 1) / 2); for (let dy = h0; dy < h0 + w; dy++) for (let dx = h0; dx < h0 + w; dx++) fn(x + dx, y + dy); };
  for (const r of Array.isArray(plan.rivers) ? plan.rivers : []) {
    const w = Math.max(1, Math.min(6, Math.round(num(r?.width, 3))));
    line(r?.points, (x, y) => brush(x, y, w, (a, b) => { if (inside(a, b) && G[b][a] !== 'W' && G[b][a] !== '~') { G[b][a] = '0'; O[b][a] = ' '; forest[b * C + a] = 0; lock[b * C + a] = 1; } }), true);
  }
  const ROAD = { estrada: ';', pedra: 'c', trilha: 'û', terra: ',', cais: '-' };
  const piers = []; // cais desenhados: barcos e barris depois
  for (const r of Array.isArray(plan.roads) ? plan.roads : []) {
    const ch = ROAD[strip(r?.type ?? r?.tipo)] || ';';
    const w = Math.max(1, Math.min(4, Math.round(num(r?.width, ch === 'û' ? 1 : 2))));
    if (ch === '-') { pier(r?.points, w); continue; }
    line(r?.points, (x, y) => brush(x, y, w, (a, b) => {
      if (!inside(a, b)) return;
      forest[b * C + a] = 0; lock[b * C + a] = 1; O[b][a] = ' ';
      if (WATER.has(G[b][a]) || G[b][a] === '-') G[b][a] = '-'; else if (G[b][a] !== 'c' && G[b][a] !== ';') G[b][a] = ch;
    }), ch !== '-');
  }
  // cais: tabuas so na agua (mais ate 2 celulas de terra na raiz); cais sem agua nenhuma e ignorado
  function pier(list, w) {
    const cells = [];
    line(list, (x, y) => { if (inside(x, y) && !cells.some(([a, b]) => a === x && b === y)) cells.push([x, y]); });
    const wet = cells.map(([x, y]) => WATER.has(G[y][x]) || G[y][x] === '-');
    if (!wet.some(Boolean)) return;
    // raiz: ate 2 celulas secas, ou toda a areia (praia) emendada na parte molhada
    const ok = wet.map((v, k) => v || wet.some((u, j) => u && Math.abs(j - k) <= 2));
    for (const dir of [1, -1]) for (let k = dir > 0 ? 1 : cells.length - 2; k >= 0 && k < cells.length; k += dir) if (!ok[k] && ok[k - dir] && G[cells[k][1]][cells[k][0]] === ':') ok[k] = true;
    const keep = cells.filter((c, k) => ok[k]);
    for (const [cx, cy] of keep) brush(cx, cy, w, (a, b) => {
      if (!inside(a, b)) return;
      const water = WATER.has(G[b][a]) || G[b][a] === '-';
      if (!water && !keep.some(([x, y]) => x === a && y === b)) return;
      G[b][a] = '-'; O[b][a] = ' '; forest[b * C + a] = 0; lock[b * C + a] = 1;
    });
    // ponta = a extremidade molhada mais longe da terra; raiz = a primeira celula seca
    const wetIdx = wet.map((v, k) => (v ? k : -1)).filter((k) => k >= 0);
    const dryIdx = wet.map((v, k) => (v ? -1 : k)).filter((k) => k >= 0);
    const tipAtEnd = !dryIdx.length || dryIdx[0] < wetIdx[0];
    const tip = cells[tipAtEnd ? wetIdx[wetIdx.length - 1] : wetIdx[0]];
    const root = dryIdx.length ? cells[tipAtEnd ? dryIdx[dryIdx.length - 1] : dryIdx[0]] : null;
    const [x0, y0] = cells[0]; const [x1, y1] = cells[cells.length - 1];
    piers.push({ tip, root, horiz: Math.abs(x1 - x0) >= Math.abs(y1 - y0), w });
  }

  const FENCE = { cerca: ['o', '+'], muro: ['g', 'ç'], sebe: ['g', 'ñ'], palicada: ['o', 'Æ'] };
  for (const f of Array.isArray(plan.fences) ? plan.fences : []) {
    const [layer, ch] = FENCE[strip(f?.type ?? f?.tipo)] || FENCE.cerca;
    line(f?.points, (x, y) => {
      if (!inside(x, y) || WATER.has(G[y][x]) || ';cû-,'.includes(G[y][x])) return; // deixa passagem nas estradas
      if (layer === 'o') setO(x, y, ch); else G[y][x] = ch;
      lock[y * C + x] = 1; forest[y * C + x] = 0;
    });
  }

  // cerca/paliçada/muro fechado (1o ponto ~ ultimo): dentro dele e chao aberto, sem mata
  for (const f of Array.isArray(plan.fences) ? plan.fences : []) {
    const p = pts(f?.points);
    if (p.length < 4) continue;
    const [ax, ay] = p[0]; const [bx, by] = p[p.length - 1];
    if (Math.hypot(ax - bx, ay - by) > Math.max(3, C * 0.04)) continue;
    const xs = p.map((q) => q[0]); const ys = p.map((q) => q[1]);
    for (let y = Math.min(...ys); y <= Math.max(...ys); y++) for (let x = Math.min(...xs); x <= Math.max(...xs); x++) {
      let inP = false;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const [xi, yi] = p[i]; const [xj, yj] = p[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi) inP = !inP;
      }
      if (inP && inside(x, y)) { forest[y * C + x] = 0; if (G[y][x] === 'é' || G[y][x] === 'P') G[y][x] = '.'; }
    }
  }
  // bairros e pracas com uma margem sem mata (nao ficam ilhas dentro da floresta)
  for (const a of areas) {
    if (a.type !== 'bairro' && a.type !== 'praca') continue;
    for (const [x, y] of shapeCells(a)) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (inside(x + dx, y + dy) && forest[(y + dy) * C + x + dx] === 2) forest[(y + dy) * C + x + dx] = 0;
  }

  // ---- construcoes: no lugar pedido ou no espaco livre mais perto ----
  const buildings = [];
  const FENCE_CODES = new Set(Object.values(FENCE).map((f) => f[1]));
  const fenceAt = (x, y) => inside(x, y) && (FENCE_CODES.has(O[y][x]) || FENCE_CODES.has(G[y][x]));
  // folga acima = quanto o telhado daquele projeto sobe (casa baixa pede menos que torre)
  const clear = (d) => Math.min(4, roofRise(d.id));
  const free = (d, x, y) => {
    const CLEAR = clear(d);
    if (x < 1 || y < CLEAR || x + d.w > C - 1 || y + d.h > R - 1) return false;
    for (let yy = y - CLEAR; yy <= y + d.h; yy++) for (let xx = x - 1; xx <= x + d.w; xx++) {
      if (!inside(xx, yy)) continue;
      if (lock[yy * C + xx] === 2) return false;
      if (yy >= y - 1 && fenceAt(xx, yy)) return false; // nao passa por cima de cerca/muro (o telhado pode cobrir)
      if (yy >= y && yy < y + d.h && (WATER.has(G[yy][xx]) || ';c-ûP'.includes(G[yy][xx]) || 'çñLâ'.includes(G[yy][xx]))) return false;
    }
    return true;
  };
  // porta virada para a estrada/praca mais perto (quando a IA nao disse)
  const ROADISH = new Set([';', 'c', 'û', '-', ',']);
  const faceRoad = (d, x, y) => {
    const dist = (sx, sy, dx, dy) => { for (let k = 1; k <= 30; k++) { const X = sx + dx * k; const Y = sy + dy * k; if (!inside(X, Y)) return 99; if (ROADISH.has(G[Y][X])) return k; } return 99; };
    const cx = x + Math.floor(d.w / 2); const cy = y + Math.floor(d.h / 2);
    const opts = [['sul', dist(cx, y + d.h - 1, 0, 1)], ['norte', dist(cx, y, 0, -1) + 1], ['leste', dist(x + d.w - 1, cy, 1, 0) + 1], ['oeste', dist(x, cy, -1, 0) + 1]];
    opts.sort((a, b) => a[1] - b[1]);
    return opts[0][1] >= 99 ? 'sul' : opts[0][0];
  };
  // marca a pegada + a faixa do telhado (folga de 1 celula dos lados fica livre para a vizinha checar)
  const occupy = (d, x, y) => {
    for (let yy = y - clear(d); yy < y + d.h; yy++) for (let xx = x; xx < x + d.w; xx++) if (inside(xx, yy)) { lock[yy * C + xx] = 2; forest[yy * C + xx] = 0; if (!fenceAt(xx, yy)) O[yy][xx] = ' '; }
    for (let xx = x - 1; xx <= x + d.w; xx++) if (inside(xx, y + d.h)) { forest[(y + d.h) * C + xx] = 0; lock[(y + d.h) * C + xx] = Math.max(lock[(y + d.h) * C + xx], 1); }
  };
  const extraObjects = [];
  for (const b of (Array.isArray(plan.buildings) ? plan.buildings : []).slice(0, MAX_BUILDINGS)) {
    // moinho de vento fica melhor como o objeto grande com pas
    if (/moinho/.test(strip(b?.type ?? b?.tipo))) { extraObjects.push({ type: 'moinho', x: b.x, y: b.y }); continue; }
    // portao: a abertura na cerca ja e automatica; vira duas tochas na entrada
    if (/portao/.test(strip(b?.type ?? b?.tipo)) && (plan.fences || []).length) { extraObjects.push({ type: 'tocha', x: num(b.x) - SCALE * 0.01, y: b.y }, { type: 'tocha', x: num(b.x) + SCALE * 0.01, y: b.y }); continue; }
    const d = pickDesign(b || {}, rnd);
    if (!d) continue;
    const cx = px(b.x); const cy = py(b.y);
    let spot = null;
    // busca em aneis; farol e pescador preferem o lugar livre com mais agua em volta
    const RMAX = Math.max(14, Math.round(Math.min(C, R) * 0.15));
    const coastal = /farol|pescador/.test(strip(b?.type ?? b?.tipo));
    let best = -Infinity; let firstR = -1;
    for (let r = 0; r <= RMAX && (coastal ? firstR < 0 || r <= firstR + 6 : !spot); r++) {
      for (let dy = -r; dy <= r && (coastal || !spot); dy++) for (let dx = -r; dx <= r && (coastal || !spot); dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = cx + dx - Math.floor(d.w / 2); const y = cy + dy - Math.floor(d.h / 2);
        if (!free(d, x, y)) continue;
        if (!coastal) { spot = [x, y]; break; }
        if (firstR < 0) firstR = r;
        let wet = 0;
        for (let yy = y - 3; yy < y + d.h + 3; yy++) for (let xx = x - 3; xx < x + d.w + 3; xx++) if (inside(xx, yy) && WATER.has(G[yy][xx])) wet++;
        const score = Math.min(wet, 20) * 2 - r;
        if (score > best) { best = score; spot = [x, y]; }
      }
    }
    if (!spot) continue;
    const [x, y] = spot;
    occupy(d, x, y);
    const want = strip(b.facing ?? b.porta);
    const facing = ['sul', 'norte', 'leste', 'oeste'].includes(want) ? want : faceRoad(d, x, y);
    buildings.push({ id: `b${buildings.length + 1}`, x, y, w: d.w, h: d.h, design: d.id, name: String(b.name ?? b.nome ?? d.name).slice(0, 60), ...(facing !== 'sul' ? { facing } : {}) });
  }

  // ---- bairros: casas sozinhas, sem encostar, viradas para a rua ----
  const overNoHouse = (t, tx, ty) => { for (let yy = ty; yy < ty + t.h; yy++) for (let xx = tx; xx < tx + t.w; xx++) if (inside(xx, yy) && noHouse[yy * C + xx]) return true; return false; };
  for (const dist of districts) {
    // varre de cima para baixo e da esquerda para a direita: as casas saem em fileiras
    const order = dist.cells.map((c) => c).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const want = Math.round((dist.cells.length / 24) * dist.density);
    let made = 0;
    for (const [cx, cy] of order) {
      if (made >= want || buildings.length >= MAX_BUILDINGS) break;
      // algumas tentativas no mesmo lugar: se a grande nao cabe, tenta uma menor
      let d = null; let x = 0; let y = 0;
      for (const size of [rnd() < dist.small ? 'pequena' : rnd() < 0.85 ? 'media' : 'grande', 'pequena', 'pequena']) {
        const t = pickDesign({ type: dist.type, size }, rnd);
        if (!t) continue;
        const tx = cx - Math.floor(t.w / 2); const ty = cy - Math.floor(t.h / 2);
        if (free(t, tx, ty) && !overNoHouse(t, tx, ty)) { d = t; x = tx; y = ty; break; }
      }
      if (!d) continue;
      occupy(d, x, y);
      const facing = faceRoad(d, x, y);
      buildings.push({ id: `b${buildings.length + 1}`, x, y, w: d.w, h: d.h, design: d.id, name: d.name, auto: true, ...(facing !== 'sul' ? { facing } : {}) });
      made++;
    }
  }

  // ---- objetos soltos ----
  for (const o of [...extraObjects, ...(Array.isArray(plan.objects) ? plan.objects : [])]) {
    const ch = PLAN_OBJECTS[strip(o?.type ?? o?.tipo)];
    if (!ch) continue;
    let x = px(o.x); let y = py(o.y);
    // caiu na agua (moinho na beira do rio, poco...): vai para a margem seca mais perto
    if (inside(x, y) && WATER.has(G[y][x]) && ch !== 'Ù') {
      let best = null;
      for (let r = 1; r <= 6 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r && !best; dx++) {
        const X = x + dx; const Y = y + dy;
        if (inside(X, Y) && !WATER.has(G[Y][X]) && G[Y][X] !== '-' && lock[Y * C + X] !== 2 && O[Y][X] === ' ') best = [X, Y];
      }
      if (!best) continue;
      [x, y] = best;
    }
    // barco em terra: vai para a agua mais perto; sem agua perto, nao entra
    if (ch === 'Ù' && inside(x, y) && !WATER.has(G[y][x])) {
      let best = null;
      for (let r = 1; r <= 8 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r && !best; dx++) {
        if (inside(x + dx, y + dy) && WATER.has(G[y + dy][x + dx]) && O[y + dy][x + dx] === ' ') best = [x + dx, y + dy];
      }
      if (!best) continue;
      [x, y] = best;
    }
    if (!inside(x, y) || lock[y * C + x] === 2 || WATER.has(G[y][x]) && ch !== 'Ù') continue;
    setO(x, y, ch); lock[y * C + x] = 1; forest[y * C + x] = 0;
    // objeto grande (moinho, tenda, fonte...): abre uma clareira em volta
    if ('ÔÕÖØÙÚÛÜÝÞ'.includes(ch)) for (let yy = y - 4; yy <= y + 1; yy++) for (let xx = x - 2; xx <= x + 3; xx++) if (inside(xx, yy) && !(xx === x && yy === y)) { forest[yy * C + xx] = 0; lock[yy * C + xx] = Math.max(lock[yy * C + xx], 1); if ('TAb'.includes(O[yy][xx])) O[yy][xx] = ' '; }
  }

  // ---- cais: 1-2 barcos na agua ao lado da ponta, barril/caixote na raiz seca ----
  for (const { tip, root, horiz, w } of piers) {
    let boats = 0;
    for (const side of [1, -1]) for (let k = w; k <= w + 2 && boats < 2; k++) {
      const X = horiz ? tip[0] - 1 : tip[0] + side * k; const Y = horiz ? tip[1] + side * k : tip[1] - 1;
      if (inside(X, Y) && WATER.has(G[Y][X]) && O[Y][X] === ' ') { setO(X, Y, 'Ù'); boats++; break; }
    }
    if (!root) continue;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, 1]]) {
      const X = root[0] + dx * (w + 1); const Y = root[1] + dy * (w + 1);
      if (inside(X, Y) && !WATER.has(G[Y][X]) && G[Y][X] !== '-' && O[Y][X] === ' ' && lock[Y * C + X] !== 2) { setO(X, Y, rnd() < 0.5 ? 'u' : 'q'); lock[Y * C + X] = 1; break; }
    }
  }

  // ---- trilhas: da porta ate a estrada/praca mais perto (busca em largura curta) ----
  const ROADS = new Set([';', 'c', 'û', '-', ',']);
  // grade de ocupacao (mapa grande: milhares de casas; buildings.some por celula ficava lento)
  const bGrid = new Uint8Array(C * R);
  for (const b of buildings) for (let yy = Math.max(0, b.y); yy < Math.min(R, b.y + b.h); yy++) bGrid.fill(1, yy * C + Math.max(0, b.x), yy * C + Math.min(C, b.x + b.w));
  const inB = (x, y) => inside(x, y) && bGrid[y * C + x] === 1;
  for (const b of buildings) {
    const d = DESIGN_BY_ID[b.design];
    const sx = b.facing === 'leste' ? b.x + b.w - 1 : b.facing === 'oeste' ? b.x : b.x + d.doorCol;
    const sy = b.facing === 'norte' ? b.y - 1 : b.y + b.h;
    if (!inside(sx, sy)) continue;
    const prev = new Map([[`${sx},${sy}`, null]]);
    const q = [[sx, sy]];
    let hit = null;
    while (q.length && !hit) {
      const [x, y] = q.shift();
      if (ROADS.has(G[y][x]) && !(x === sx && y === sy)) { hit = [x, y]; break; }
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = x + dx; const ny = y + dy; const k = `${nx},${ny}`;
        if (!inside(nx, ny) || prev.has(k) || inB(nx, ny) || WATER.has(G[ny][nx]) || 'çñP'.includes(G[ny][nx]) || Math.abs(nx - sx) + Math.abs(ny - sy) > 22) continue;
        prev.set(k, [x, y]); q.push([nx, ny]);
      }
    }
    if (!hit) { if (!ROADS.has(G[sy][sx])) G[sy][sx] = 'û'; continue; }
    for (let c = prev.get(`${hit[0]},${hit[1]}`); c; c = prev.get(`${c[0]},${c[1]}`)) {
      if (!ROADS.has(G[c[1]][c[0]])) G[c[1]][c[0]] = 'û';
      O[c[1]][c[0]] = O[c[1]][c[0]] === '+' ? ' ' : O[c[1]][c[0]];
      forest[c[1] * C + c[0]] = 0; lock[c[1] * C + c[0]] = Math.max(lock[c[1] * C + c[0]], 1);
    }
  }

  // ---- vida automatica (para IA simples ficar bonito): praca, portas e ruas ----
  const freeCell = (x, y) => inside(x, y) && O[y][x] === ' ' && lock[y * C + x] !== 2 && !inB(x, y) && !WATER.has(G[y][x]);
  // praca: lampioes na borda e bancos; barracas se ninguem pos nada
  for (const a of areas) {
    if (a.type !== 'praca') continue;
    const cells = shapeCells(a);
    if (!cells.length) continue;
    const has = cells.some(([x, y]) => O[y][x] !== ' ');
    const edge = cells.filter(([, , d]) => d > 0.78);
    edge.forEach(([x, y], i) => { if (i % 7 === 0 && freeCell(x, y)) setO(x, y, 'Í'); else if (i % 7 === 3 && freeCell(x, y)) setO(x, y, 'Â'); });
    if (!has) {
      const cx = Math.round(cells.reduce((sum, c) => sum + c[0], 0) / cells.length); const cy = Math.round(cells.reduce((sum, c) => sum + c[1], 0) / cells.length);
      if (freeCell(cx, cy)) setO(cx, cy, 'F');
      const ring = cells.filter(([, , d]) => d > 0.45 && d < 0.62);
      ring.forEach(([x, y], i) => { if (i % 9 === 0 && freeCell(x, y) && freeCell(x + 1, y) && freeCell(x, y - 1)) setO(x, y, 'Ö'); });
    }
  }
  // portas: barril, caixote, vaso ou flores do lado (nem toda casa)
  for (const b of buildings) {
    if (rnd() < 0.35) continue;
    const d = DESIGN_BY_ID[b.design];
    const dx = b.facing === 'leste' ? b.x + b.w - 1 : b.facing === 'oeste' ? b.x : b.x + (d ? d.doorCol : 0);
    const y = b.facing === 'norte' ? b.y - 1 : b.y + b.h;
    for (const side of rnd() < 0.5 ? [-1, 1] : [1, -1]) {
      const x = dx + side * (1 + Math.floor(rnd() * 2));
      if (freeCell(x, y) && GRASSY.has(G[y][x])) { setO(x, y, ['u', 'q', 'Ê', 'f', 'Î', 'b'][Math.floor(rnd() * 6)]); break; }
    }
  }
  // lampioes ao longo das estradas, perto das casas (perto = ate 5 celulas da construcao)
  const nearB = new Uint8Array(C * R);
  for (const b of buildings) {
    for (let yy = Math.max(0, b.y - 5); yy <= Math.min(R - 1, b.y + b.h + 5); yy++) nearB.fill(1, yy * C + Math.max(0, b.x - 5), yy * C + Math.min(C - 1, b.x + b.w + 5) + 1);
  }
  for (let y = 1; y < R - 1; y++) for (let x = 1; x < C - 1; x++) {
    if (G[y][x] !== ';' || (x * 7 + y * 13) % 11 !== 0) continue;
    for (const [dx, dy] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
      const X = x + dx; const Y = y + dy;
      if (freeCell(X, Y) && GRASSY.has(G[Y][X]) && nearB[Y * C + X]) { setO(X, Y, 'Í'); lock[Y * C + X] = 1; break; }
    }
  }

  // ---- arvores: floresta fechada, bosque ralo, umas soltas no resto ----
  for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
    const i = y * C + x;
    if (lock[i] || O[y][x] !== ' ' || !GRASSY.has(G[y][x])) continue;
    const f = forest[i];
    const p = f === 2 ? 0.62 : f === 1 ? 0.22 : f === 3 ? 0.35 : 0.02;
    if (rnd() < p) O[y][x] = f === 3 ? (rnd() < 0.75 ? 'A' : 'o') : rnd() < (G[y][x] === '*' ? 0.8 : 0.4) ? 'A' : rnd() < 0.9 ? 'T' : 'b';
    else if (f !== 2 && rnd() < 0.025) O[y][x] = rnd() < 0.5 ? 'f' : 'b';
  }

  const style = STYLE_IDS.includes(strip(plan.style).replace(/_/g, '-')) ? strip(plan.style).replace(/_/g, '-') : undefined;
  const light = ['dia', 'entardecer', 'noite'].includes(strip(plan.light ?? plan.luz)) ? strip(plan.light ?? plan.luz) : 'dia';
  const items = (Array.isArray(plan.items) ? plan.items : []).map((it) => ({ ...it, x: px(it.x), y: py(it.y) }));
  // pontos principais (legenda do mapa): mesma escala das coordenadas
  const pois = (Array.isArray(plan.pois ?? plan.pontos) ? (plan.pois ?? plan.pontos) : []).map((p) => ({ ...p, x: px(p?.x), y: py(p?.y) }));
  const raw = { cols: C, rows: R, layers: { ground: G.map((r) => r.join('')), objects: O.map((r) => r.join('')) }, items, buildings, pois, light, decor: 'normal', ...(style && style !== 'padrao' ? { style } : {}) };
  const { map, warnings } = repairMap(raw, { cols: C, rows: R });
  const monsters = [];
  for (const m of Array.isArray(plan.monsters) ? plan.monsters : []) {
    const x = px(m?.x); const y = py(m?.y); const name = String(m?.name ?? m?.nome ?? '').trim().slice(0, 40);
    if (name && !isSolid(map, x, y) && !buildings.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)) monsters.push({ name, x, y, hp: Math.max(1, Math.min(500, Math.round(num(m.hp, 10)))) });
  }
  const asked = (Array.isArray(plan.buildings) ? plan.buildings : []).filter((b) => !/moinho|portao/.test(strip(b?.type ?? b?.tipo))).length;
  const placed = buildings.filter((b) => !b.auto).length;
  if (asked > placed) warnings.push(`${asked - placed} construção(ões) não couberam no mapa e ficaram de fora.`);
  return { map, warnings, monsters, name: String(plan.name ?? plan.nome ?? '').slice(0, 80), notes: String(plan.notes ?? plan.notas ?? '').slice(0, 300) };
}
