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
  // especificas primeiro: a busca usa type.includes(chave) e pega a primeira
  ruina_igreja: { pequena: ['capela-ruina-6'], media: ['capela-ruina-6'], grande: ['igreja-ruina-12'] },
  igreja_gotica: { pequena: ['capela-gotica-8'], media: ['capela-gotica-8', 'igreja-gotica-10'], grande: ['igreja-gotica-10'] },
  palafita: { pequena: ['palafita-4'], media: ['palafita-6'], grande: ['palafita-8'] },
  torre_muralha: { pequena: ['torre-muralha-3'], media: ['torre-muralha-4', 'torre-muralha-redonda-4'], grande: ['torre-muralha-redonda-4'] },
  tenda_lider: { pequena: ['tenda-lider-7'], media: ['tenda-lider-7'], grande: ['tenda-lider-9'] },
  tenda_mercado: { pequena: ['tenda-mercado-5'], media: ['tenda-mercado-7'], grande: ['tenda-mercado-7'] },
  armazem_cais: { pequena: ['armazem-cais-9'], media: ['armazem-cais-9'], grande: ['armazem-cais-12'] },
  guindaste: { pequena: ['guindaste-4'], media: ['guindaste-4'], grande: ['guindaste-4'] },
  capitao: { pequena: ['casa-capitao-7'], media: ['casa-capitao-7'], grande: ['casa-capitao-9'] },
  mercado_peixe: { pequena: ['mercado-peixe-6'], media: ['mercado-peixe-9'], grande: ['mercado-peixe-9'] },
  moinho_agua: { pequena: ['moinho-agua-8'], media: ['moinho-agua-8'], grande: ['moinho-agua-10'] },
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
  castelo: { pequena: ['castelo-10'], media: ['castelo-patio-20', 'castelo-14'], grande: ['castelo-patio-26'] },
  forte: { pequena: ['forte-10'], media: ['forte-10'], grande: ['forte-14'] },
  portao: { pequena: ['portao-6'], media: ['portao-8'], grande: ['portao-8'] },
  ruina: { pequena: ['ruina-5-4'], media: ['ruina-7-5'], grande: ['ruina-9-6'] },
  cripta: { pequena: ['cripta-7'], media: ['mausoleu-7'], grande: ['mausoleu-10'] },
  pescador: { pequena: ['pescador-5', 'palafita-4'], media: ['pescador-7', 'palafita-6'], grande: ['pescador-7'] },
  cabana_bruxa: { pequena: ['cabana-bruxa-5'], media: ['cabana-bruxa-6'], grande: ['cabana-bruxa-6'] },
  tenda: { pequena: ['tenda-canadense-3', 'tenda-abrigo-3', 'tenda-redonda-4', 'barraca-acampamento-3'], media: ['tenda-canadense-4', 'tenda-redonda-5', 'tenda-abrigo-4', 'tenda-4-7'], grande: ['tenda-lider-7', 'tenda-lider-9'] },
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
// opcoes do catalogo por tipo+tamanho (memo: o enchimento de bairro grande pede milhares de vezes)
const choiceMemo = new Map();
function designChoices(rawType, rawSize) {
  const memo = `${rawType}|${rawSize}`;
  if (choiceMemo.has(memo)) return choiceMemo.get(memo);
  const type = strip(rawType ?? 'casa');
  const size = strip(rawSize ?? 'media').replace('medio', 'media').replace('pequeno', 'pequena');
  // sinonimos que contem outra chave ("capela_abandonada" contem "capela"): resolvidos antes da busca
  const syn = /igreja.*ruin|capela.*abandon|igreja.*abandon|ruina.*(igreja|capela)/.test(type) ? 'ruina_igreja' : /gotic/.test(type) ? 'igreja_gotica' : /moinho.*agua|roda.*agua/.test(type) ? 'moinho_agua' : null;
  const key = syn || Object.keys(PLAN_BUILDINGS).find((k) => type === k || type.includes(k)) || (/bruxa/.test(type) ? 'cabana_bruxa' : /igreja|santuario/.test(type) ? 'templo' : /estab|cavalar/.test(type) ? 'estabulo' : /deposito|paiol/.test(type) ? 'armazem' : /caca|lenhador/.test(type) ? 'cabana' : 'casa');
  const opts = (PLAN_BUILDINGS[key][size] || PLAN_BUILDINGS[key].media || []).filter((id) => DESIGN_BY_ID[id]).map((id) => DESIGN_BY_ID[id]);
  choiceMemo.set(memo, opts);
  return opts;
}
export function pickDesign(b, rnd = Math.random) {
  if (b.design && DESIGN_BY_ID[strip(b.design).replace(/_/g, '-')]) return DESIGN_BY_ID[strip(b.design).replace(/_/g, '-')];
  const opts = designChoices(b.type ?? b.tipo ?? 'casa', b.size ?? b.tamanho ?? 'media');
  if (opts.length) return opts[Math.floor(rnd() * opts.length)];
  return DESIGNS.find((d) => d.category === 'Casas' && d.size === 'media');
}

// tamanho dito pela IA (foto) costuma vir pequeno demais (~75%): se construcoes pedidas nao cabem,
// aumenta o mapa (mesma proporcao) e desenha de novo, ate 3 vezes
export function planToMap(plan, opts = {}) {
  let r = planToMapOnce(plan, opts);
  if (!(num(plan?.cols, 0) > 0 && num(plan?.rows, 0) > 0)) return r;
  let p = plan;
  for (let k = 0; k < 3 && r.missing > Math.max(1, r.asked * 0.08); k++) {
    p = { ...p, cols: Math.round(num(p.cols) * 1.2), rows: Math.round(num(p.rows) * 1.2) };
    if (p.cols > 300 || p.rows > 300) break;
    const r2 = planToMapOnce(p, opts);
    if (r2.missing >= r.missing) { r = r2.missing < r.missing ? r2 : r; break; }
    r = r2;
  }
  return r;
}

function planToMapOnce(plan, { cols = 64, rows = 48, seed = 1 } = {}) {
  // tamanho dito pela IA (foto: proporcao da imagem e escala das casas) vale, ate 300 blocos
  const C = Math.max(16, Math.min(MAX_SIZE, Math.round(num(plan.cols, 0) > 0 ? Math.min(300, num(plan.cols)) : num(cols, 64))));
  const R = Math.max(12, Math.min(MAX_SIZE, Math.round(num(plan.rows, 0) > 0 ? Math.min(300, num(plan.rows)) : num(rows, 48))));
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

  // ruido suave por celula (muda devagar: bordas organicas, nao serrilhadas)
  const hash = (x, y, k) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647 + seed * 1013904223) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h & 0xffff) / 0xffff; };
  const AMP = Math.max(3, Math.round(Math.min(C, R) * 0.07));
  const WSC = Math.max(4, Math.round(Math.min(C, R) * 0.06));
  // ruido de valor com interpolacao suave; sc = tamanho da "mancha" em celulas
  const noise = (x, y, k, sc) => { const X = x / sc; const Y = y / sc; const x0 = Math.floor(X); const y0 = Math.floor(Y); let fx = X - x0; let fy = Y - y0;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = hash(x0, y0, k); const b = hash(x0 + 1, y0, k); const c = hash(x0, y0 + 1, k); const d = hash(x0 + 1, y0 + 1, k);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
  const wob = (x, y, k) => noise(x, y, k, WSC);
  // manchas de mata/campo: escala propria (nao depende do tamanho do mapa ate certo ponto)
  const PSC = Math.max(5, Math.min(14, Math.round(Math.min(C, R) * 0.05)));

  // grama em manchas: campinas floridas, capim alto e um pouco de grama seca (nada de sal e pimenta uniforme)
  if (base === '.') for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
    const r = hash(x, y, 23);
    if (r >= 0.6) continue;
    const m = noise(x, y, 21, PSC * 1.6); const t = noise(x, y, 22, PSC);
    if (m > 0.74 && r < 0.4) G[y][x] = 'á';
    else if (t > 0.75 && r < 0.45) G[y][x] = 'g';
    else if (r < 0.03) G[y][x] = 'á'; else if (r < 0.05) G[y][x] = 'g';
  }

  // ---- areas ----
  // area natural em retangulo (campo, floresta, pantano...) vira poligono: borda organica, nada de quadrado
  const NATURAL = new Set(['floresta', 'bosque', 'campo', 'neve', 'areia', 'pantano', 'lago', 'rocha', 'montanha', 'clareira', 'mar', 'lava']);
  const shapeCells = (a) => {
    if (a._cells) return a._cells;
    a._cells = shapeCells0(a);
    return a._cells;
  };
  // balanço da borda por celula: igual para todas as areas, calculado uma vez so
  const JX = new Float32Array(C * R).fill(NaN); const JY = new Float32Array(C * R);
  const shapeCells0 = (a) => {
    const cells = [];
    if (Array.isArray(a.rect) && !Array.isArray(a.points) && NATURAL.has(a.type)) {
      const [x, y, w, h] = a.rect.map((v) => num(v));
      return shapeCells({ type: a.type, points: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] });
    }
    if (Array.isArray(a.circle)) {
      const cx = px(a.circle[0]); const cy = py(a.circle[1]);
      const rx = Math.max(1, (num(a.circle[2], SCALE / 20) / SCALE) * C); const ry = Math.max(1, (num(a.circle[2], SCALE / 20) / SCALE) * R);
      // circulo natural (lago, bosque, praca...) sai torto de proposito: raio balanca com ruido
      const org = NATURAL.has(a.type) || a.type === 'praca';
      const amp = a.type === 'praca' ? 0.3 : 0.42;
      const k = 40 + (cx * 7 + cy * 13) % 97;
      const sc = Math.max(2.5, Math.min(rx, ry) * 0.55);
      const grow = org ? 1 + amp / 2 : 1;
      for (let y = Math.floor(cy - ry * grow); y <= cy + ry * grow; y++) for (let x = Math.floor(cx - rx * grow); x <= cx + rx * grow; x++) {
        const d0 = Math.hypot((x - cx) / rx, (y - cy) / ry);
        const d = org ? d0 - (noise(x, y, k, sc) * 0.75 + noise(x, y, k + 1, sc * 0.45) * 0.25 - 0.5) * amp : d0 + (rnd() - 0.5) * 0.12;
        if (inside(x, y) && d <= 1) cells.push([x, y, Math.max(0, d)]);
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
        const ji = y * C + x;
        if (Number.isNaN(JX[ji])) {
          JX[ji] = x + (wob(x, y, 1) - 0.5) * AMP + (noise(x, y, 3, WSC * 0.35) - 0.5) * AMP * 0.35;
          JY[ji] = y + (wob(x, y, 2) - 0.5) * AMP + (noise(x, y, 4, WSC * 0.35) - 0.5) * AMP * 0.35;
        }
        const jx = JX[ji]; const jy = JY[ji];
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
  // terra quase do mapa todo (IA usa como "chao da cidade") tambem e fundo: o campo da vila fica por cima
  const rank = (a) => ((['pantano', 'neve', 'campo', 'areia'].includes(a.type) && bbox(a).every((v) => v >= SCALE * 0.8)) || (a.type === 'terra' && bbox(a).every((v) => v >= SCALE * 0.6)) ? -1 : ORDER[a.type]);
  const areas = (Array.isArray(plan.areas) ? plan.areas : []).map((a) => ({ ...a, type: strip(a?.type ?? a?.tipo) })).filter((a) => ORDER[a.type] !== undefined).sort((a, b) => rank(a) - rank(b));
  const noHouse = new Uint8Array(C * R); // mercado, cemiterio, ritual: o bairro nao poe casa em cima
  const forest = new Uint8Array(C * R); // 1 bosque, 2 floresta, 3 montanha
  const districts = []; // areas de bairro: o sistema enche de casas
  const sea = new Uint8Array(C * R); // 1 = celula de mar
  const lake = new Uint8Array(C * R); // 1 = celula de lago
  for (const a of areas) {
    let cells = shapeCells(a);
    if (a.type === 'terra' && cells.length >= C * R * 0.3) a.huge = true; // chao de terra do mapa quase todo: so manchas
    if (a.type === 'terra' && cells.length >= C * R * 0.06) { a.big = true; if (Array.isArray(a.rect)) a._cells = cells = shapeCells({ type: 'terra', points: [[a.rect[0], a.rect[1]], [num(a.rect[0]) + num(a.rect[2]), a.rect[1]], [num(a.rect[0]) + num(a.rect[2]), num(a.rect[1]) + num(a.rect[3])], [a.rect[0], num(a.rect[1]) + num(a.rect[3])]] }); }
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
        case 'montanha': if (G[y][x] !== '*' || d < 0.45) G[y][x] = 'é'; // na neve: pico de pedra, encosta branca
          forest[y * C + x] = 3; if (rnd() < 0.05) setO(x, y, 'Þ'); break;
        case 'rocha': if (G[y][x] !== '*') G[y][x] = 'é'; forest[y * C + x] = 3; if (rnd() < 0.08) setO(x, y, 'o'); break;
        case 'campo':
          forest[y * C + x] = 0;
          if (G[y][x] === '*') break; // campo no mapa de neve: chao aberto mas continua branco
          G[y][x] = rnd() < 0.5 ? 'g' : 'á'; if (rnd() < 0.05) setO(x, y, 'f');
          break;
        case 'neve': G[y][x] = '*'; break;
        case 'areia': G[y][x] = ':'; forest[y * C + x] = 0; break;
        case 'terra':
          // terra grande (chao da vila, cais, patio) vira chao batido em manchas; a pequena (feira) e cheia
          G[y][x] = a.huge ? (wob(x, y, 8) * 0.8 + rnd() * 0.2 > 0.66 ? ',' : rnd() < 0.5 ? 'g' : '.') : !a.big || wob(x, y, 8) * 0.8 + rnd() * 0.2 - d * 0.25 > 0.3 ? ',' : 'g';
          forest[y * C + x] = 0; break;
        case 'pantano': {
          // manchas de agua parada e lama no meio do capim (ruido), mais ralas na borda da area
          const n = wob(x, y, 5) * 0.7 + wob(x * 2, y * 2, 6) * 0.3 - Math.max(0, d - 0.6) * 0.6;
          G[y][x] = n > 0.54 ? '%' : n > 0.46 ? 'j' : 'g';
          forest[y * C + x] = 0;
          const r = rnd();
          if (n <= 0.46 && r < 0.06) setO(x, y, r < 0.03 ? 'T' : r < 0.05 ? 'd' : 'm');
          break;
        }
        case 'lago': G[y][x] = d < 0.55 ? 'W' : '~'; O[y][x] = ' '; forest[y * C + x] = 0; lock[y * C + x] = 1; lake[y * C + x] = 1; break;
        case 'mar': G[y][x] = 'ó'; O[y][x] = ' '; forest[y * C + x] = 0; lock[y * C + x] = 1; sea[y * C + x] = 1; break;
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
    if (a.type === 'praca' && cells.length >= 12) {
      // borda gasta: nas 2 celulas da beira o calcamento rareia e mistura com terra batida e grama
      const own = new Set(cells.map(([x, y]) => y * C + x));
      for (const [x, y] of cells) {
        let e = 9;
        for (let r = 1; r <= 2 && e === 9; r++) for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (!own.has((y + dy) * C + x + dx)) { e = r; break; }
        if (e === 9) continue;
        const n = noise(x, y, 31, 2.2) + (e === 2 ? 0.35 : 0);
        if (n < 0.35) G[y][x] = hash(x, y, 33) < 0.5 ? ',' : base === '.' ? 'g' : base;
        else if (n < 0.6) G[y][x] = hash(x, y, 32) < 0.5 ? 'c' : ',';
      }
    }
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
      if (!k || k > 6) continue;
      // largura da praia varia ao longo da costa (enseadas e pontas de areia)
      if (k <= BEACH + Math.round(noise(x, y, 7, PSC) * 3 - 1) && '.áàg'.includes(G[y][x])) { G[y][x] = ':'; if (O[y][x] === 'f') O[y][x] = ' '; }
      if (k <= 5 && (forest[i] === 2 || forest[i] === 1)) forest[i] = 0;
    }
    // agua rasa colada na costa, faixa de largura irregular
    const wd = new Int16Array(C * R).fill(99);
    const q2 = [];
    for (let i = 0; i < C * R; i++) if (!sea[i]) { const x = i % C; const y = (i - x) / C; if ((x > 0 && sea[i - 1]) || (x < C - 1 && sea[i + 1]) || (y > 0 && sea[i - C]) || (y < R - 1 && sea[i + C])) { wd[i] = 0; q2.push(i); } }
    for (let h = 0; h < q2.length; h++) {
      const i = q2[h]; const x = i % C; const y = (i - x) / C;
      if (wd[i] >= 4) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx; const Y = y + dy; const j = Y * C + X;
        if (inside(X, Y) && sea[j] && wd[j] > wd[i] + 1) { wd[j] = wd[i] + 1; q2.push(j); }
      }
    }
    for (const i of q2) if (sea[i] && G[(i - (i % C)) / C][i % C] === 'ó') {
      const x = i % C; const y = (i - x) / C;
      if (wd[i] <= 1 + (noise(x, y, 34, 4) > 0.5 ? 1 : 0) + (noise(x, y, 35, PSC) > 0.68 ? 1 : 0)) G[y][x] = '~';
    }
  }
  // beira de lago: capim alto e juncos (chao de brejo) em manchas
  {
    const ld = new Uint8Array(C * R); const lq = [];
    for (let i = 0; i < C * R; i++) if (lake[i]) { ld[i] = 1; lq.push(i); }
    for (let h = 0; h < lq.length; h++) {
      const i = lq[h]; const x = i % C; const y = (i - x) / C;
      if (ld[i] >= 4) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx; const Y = y + dy; const j = Y * C + X;
        if (inside(X, Y) && !ld[j]) { ld[j] = ld[i] + 1; lq.push(j); }
      }
    }
    for (const i of lq) {
      const x = i % C; const y = (i - x) / C;
      if (lake[i] || !GRASSY.has(G[y][x]) || G[y][x] === '*') continue;
      const n = noise(x, y, 36, 3);
      if (ld[i] <= 2 && n > 0.5) G[y][x] = '%'; else if (n > 0.3) G[y][x] = 'g';
      if (forest[i] === 2) forest[i] = 1;
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
  const line = (list, fn, edge = false) => lineCells(edge ? toEdge(list) : pts(list), fn);
  const lineCells = (p, fn) => {
    for (let i = 0; i + 1 < p.length; i++) {
      const [x0, y0] = p[i]; const [x1, y1] = p[i + 1];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let k = 0; k <= n; k++) fn(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), Math.abs(x1 - x0) >= Math.abs(y1 - y0));
    }
  };
  const brush = (x, y, w, fn) => { const h0 = -Math.floor((w - 1) / 2); for (let dy = h0; dy < h0 + w; dy++) for (let dx = h0; dx < h0 + w; dx++) fn(x + dx, y + dy); };
  // "exit"/"from": a IA diz por qual borda o rio sai/entra; o rabo que foge para outra borda e cortado
  // e o rio segue reto ate a borda pedida (IA fraca emenda o riacho e sai pela borda errada)
  const EDGE = { leste: [0, SCALE], oeste: [0, 0], sul: [1, SCALE], norte: [1, 0], direita: [0, SCALE], esquerda: [0, 0], baixo: [1, SCALE], cima: [1, 0] };
  const toBorder = (list, edge) => {
    const e = EDGE[strip(edge)];
    let p = (Array.isArray(list) ? list : []).filter(Array.isArray).map((q) => [num(q[0]), num(q[1])]);
    if (!e || p.length < 2) return p;
    const [ax, at] = e;
    if (Math.abs(p[p.length - 1][ax] - at) < SCALE * 0.03 || Math.abs(p[0][ax] - at) < SCALE * 0.03) return p;
    // corta do fim os trechos que andam mais no outro eixo (indo para outra borda)
    while (p.length > 2) {
      const [a, b] = p.slice(-2);
      const along = Math.abs(b[ax] - a[ax]); const across = Math.abs(b[1 - ax] - a[1 - ax]);
      if (across > along || (b[ax] - a[ax]) * (at - a[ax]) < 0) p = p.slice(0, -1); else break;
    }
    const last = p[p.length - 1].slice(); last[ax] = at;
    return [...p, last];
  };
  for (const r of Array.isArray(plan.rivers) ? plan.rivers : []) {
    const w = Math.max(1, Math.min(6, Math.round(num(r?.width, 3))));
    let rp = toBorder(r?.points, r?.exit ?? r?.saida);
    if (r?.from ?? r?.entrada) rp = toBorder([...rp].reverse(), r.from ?? r.entrada).reverse();
    line(rp, (x, y) => brush(x, y, w, (a, b) => { if (inside(a, b) && G[b][a] !== 'W' && G[b][a] !== '~') { G[b][a] = '0'; O[b][a] = ' '; forest[b * C + a] = 0; lock[b * C + a] = 1; } }), true);
  }
  // trecho reto e comprido de rua ganha curva suave (as pontas ficam no lugar). Onde outra rua
  // encosta no meio do trecho a curva zera (o cruzamento em T nao se solta)
  // SO quando o plano pede: "ruas": "curvas" (todas) ou "curva": true numa rua. Sem isso a rua segue
  // exatamente os pontos (foto com rua reta = rua reta; rua curva na foto vem nos pontos)
  const TEXT = strip(plan.mode ?? plan.modo) === 'texto';
  const ALL_CURVY = /curv/.test(strip(plan.ruas ?? plan.streets));
  const bend = (p, ends, k, curvy = ALL_CURVY) => {
    if (!curvy) return p;
    const out = [p[0]];
    for (let i = 0; i + 1 < p.length; i++) {
      const [x0, y0] = p[i]; const [x1, y1] = p[i + 1];
      const L = Math.hypot(x1 - x0, y1 - y0);
      if (L >= 12) {
        const ux = (x1 - x0) / L; const uy = (y1 - y0) / L;
        const A = TEXT ? Math.min(6, L * 0.065) : Math.min(3.2, L * 0.045);
        const s1 = hash(x0, y0, k) * 2 - 1; const s2 = hash(x1, y1, k + 1) * 2 - 1;
        const pins = [];
        for (const [ex, ey] of ends) {
          const t = ((ex - x0) * ux + (ey - y0) * uy) / L; const off = Math.abs((ex - x0) * -uy + (ey - y0) * ux);
          if (t > 0.02 && t < 0.98 && off <= 2.5) pins.push(t);
        }
        const n = Math.max(2, Math.round(L / 4));
        for (let j = 1; j < n; j++) {
          const t = j / n;
          let env = 1; for (const tp of pins) env = Math.min(env, Math.abs(t - tp) * L / 8);
          const o = (Math.sin(Math.PI * t) * (0.75 + 0.25 * Math.abs(s1)) * (s1 < 0 ? -1 : 1) + Math.sin(2 * Math.PI * t) * 0.35 * s2) * A * Math.min(1, env);
          out.push([Math.round(x0 + (x1 - x0) * t - uy * o), Math.round(y0 + (y1 - y0) * t + ux * o)]);
        }
      }
      out.push(p[i + 1]);
    }
    return out;
  };
  const ROAD = { estrada: ';', pedra: 'c', trilha: 'û', terra: ',', cais: '-' };
  const piers = []; // cais desenhados: barcos e barris depois
  const roadCell = new Uint8Array(C * R); // celulas de estrada/rua (o enchimento automatico nao poe casa em cima)
  const roadList = (Array.isArray(plan.roads) ? plan.roads : []).map((r) => ({ r, ch: ROAD[strip(r?.type ?? r?.tipo)] || ';' }));
  const roadEnds = [];
  for (const o of roadList) if (o.ch !== '-') { o.p = toEdge(o.r?.points); if (o.p.length) roadEnds.push(o.p[0], o.p[o.p.length - 1]); }
  const paintRoad = (ch, w) => (x, y) => brush(x, y, w, (a, b) => {
    if (!inside(a, b)) return;
    forest[b * C + a] = 0; lock[b * C + a] = 1; O[b][a] = ' '; roadCell[b * C + a] = 1;
    if (WATER.has(G[b][a]) || G[b][a] === '-') G[b][a] = '-'; else if (G[b][a] !== 'c' && G[b][a] !== ';') G[b][a] = ch;
  });
  roadList.forEach(({ r, ch, p }, k) => {
    const w = Math.max(1, Math.min(4, Math.round(num(r?.width, ch === 'û' ? 1 : 2))));
    if (ch === '-') { pier(r?.points, w); return; }
    lineCells(bend(p, roadEnds, 50 + k * 3, ALL_CURVY || r?.curva === true || /curv/.test(strip(r?.forma))), paintRoad(ch, w));
  });
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
      // deixa passagem so nas estradas/ruas de verdade (chao de terra nao abre o muro)
      if (!inside(x, y) || WATER.has(G[y][x]) || roadCell[y * C + x] || ';cû-'.includes(G[y][x])) return;
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

  // ---- vielas: bairro grande sem rua por dentro ganha uma (ou duas) ruela de terra torta ----
  const planSpots = (Array.isArray(plan.buildings) ? plan.buildings : []).map((b) => [px(b?.x), py(b?.y)]);
  districts.forEach((dist, k) => {
    const cells = dist.cells;
    if (cells.length < 300) return;
    let x0 = C; let y0 = R; let x1 = 0; let y1 = 0;
    for (const [x, y] of cells) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const bw = x1 - x0 + 1; const bh = y1 - y0 + 1;
    if (Math.min(bw, bh) < 18) return;
    // ja tem rua cruzando por dentro (longe da borda)? entao nao precisa
    let inner = 0;
    for (const [x, y] of cells) if (roadCell[y * C + x] && x > x0 + 3 && x < x1 - 3 && y > y0 + 3 && y < y1 - 3) inner++;
    if (inner > Math.min(bw, bh)) return;
    const lanes = [bw >= bh ? 'h' : 'v'];
    if (Math.min(bw, bh) >= 34) lanes.push(bw >= bh ? 'v' : 'h');
    for (const dir of lanes) {
      // posicao que cruza menos construcoes pedidas pelo plano
      let best = null; let bestHits = Infinity;
      for (const f of [0.5, 0.38, 0.62]) {
        const c = dir === 'h' ? Math.round(y0 + bh * f) : Math.round(x0 + bw * f);
        const hits = planSpots.filter(([x, y]) => (dir === 'h' ? Math.abs(y - c) <= 4 && x >= x0 && x <= x1 : Math.abs(x - c) <= 4 && y >= y0 && y <= y1)).length;
        if (hits < bestHits) { bestHits = hits; best = c; }
      }
      // as pontas avancam ate achar uma rua (ate 8 celulas alem do bairro)
      const reach = (sx, sy, dx, dy) => { for (let j = 0; j <= 8; j++) { const X = sx + dx * j; const Y = sy + dy * j; if (!inside(X, Y)) return [X - dx, Y - dy]; if (roadCell[Y * C + X]) return [X, Y]; } return [sx, sy]; };
      const a = dir === 'h' ? reach(x0, best, -1, 0) : reach(best, y0, 0, -1);
      const b = dir === 'h' ? reach(x1, best, 1, 0) : reach(best, y1, 0, 1);
      const w = Math.min(bw, bh) >= 30 ? 2 : 1;
      lineCells(bend([a, b], roadEnds, 300 + k * 5), (x, y) => brush(x, y, w, (X, Y) => {
        if (!inside(X, Y) || WATER.has(G[Y][X]) || 'çñ'.includes(G[Y][X]) || O[Y][X] === '+' || O[Y][X] === 'Æ') return;
        roadCell[Y * C + X] = 1; forest[Y * C + X] = 0; lock[Y * C + X] = 1; O[Y][X] = ' ';
        if (!';c-'.includes(G[Y][X])) G[Y][X] = ',';
      }));
    }
  });

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
  // as maiores primeiro (castelo, igreja): a torre/quartel pequenos acham lugar em volta depois
  const sizeRank = { grande: 0, media: 1, pequena: 2 };
  const isBig = (b) => /castel|forte|igreja|templo|catedral|prefeitura/.test(strip(b?.type ?? b?.tipo));
  const ordered = (Array.isArray(plan.buildings) ? plan.buildings : []).slice(0, MAX_BUILDINGS).map((b, i) => [b, i])
    .sort((a, c) => (isBig(c[0]) - isBig(a[0])) || ((sizeRank[strip(a[0]?.size)] ?? 1) - (sizeRank[strip(c[0]?.size)] ?? 1)) * (isBig(a[0]) ? 1 : 0) || a[1] - c[1]).map(([b]) => b);
  for (const b of ordered) {
    // moinho de vento fica melhor como o objeto grande com pas
    if (/moinho/.test(strip(b?.type ?? b?.tipo)) && !/agua/.test(strip(b?.type ?? b?.tipo))) { extraObjects.push({ type: 'moinho', x: b.x, y: b.y }); continue; }
    // portao: a abertura na cerca ja e automatica; vira duas tochas na entrada
    if (/portao/.test(strip(b?.type ?? b?.tipo)) && (plan.fences || []).length) { extraObjects.push({ type: 'tocha', x: num(b.x) - SCALE * 0.01, y: b.y }, { type: 'tocha', x: num(b.x) + SCALE * 0.01, y: b.y }); continue; }
    let d = pickDesign(b || {}, rnd);
    if (!d) continue;
    const cx = px(b.x); const cy = py(b.y);
    let spot = null;
    // nao coube no tamanho pedido: tenta os menores (castelo grande dentro de muro pequeno)
    for (const size of ['media', 'pequena']) {
      if (spot || !b || strip(b.size) === 'pequena' || (size === 'media' && strip(b.size) === 'media')) break;
      if (findSpot(d, cx, cy, b)) break;
      const d2 = pickDesign({ ...b, size, design: undefined }, rnd);
      if (d2 && d2.w * d2.h < d.w * d.h) d = d2;
    }
    spot = findSpot(d, cx, cy, b);
    if (!spot) continue;
    const [x, y] = spot;
    occupy(d, x, y);
    const want = strip(b.facing ?? b.porta);
    const facing = ['sul', 'norte', 'leste', 'oeste'].includes(want) ? want : faceRoad(d, x, y);
    buildings.push({ id: `b${buildings.length + 1}`, x, y, w: d.w, h: d.h, design: d.id, name: String(b.name ?? b.nome ?? d.name).slice(0, 60), ...(facing !== 'sul' ? { facing } : {}) });
  }
  function findSpot(d, cx, cy, b) {
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
    return spot;
  }

  // ---- acampamento: tendas espalhadas pela clareira (bairro de casas usa fillStreets, abaixo) ----
  const freeGround = (x, y) => inside(x, y) && O[y][x] === ' ' && lock[y * C + x] !== 2 && GRASSY.has(G[y][x]) && !roadCell[y * C + x];
  const overNoHouse = (t, tx, ty) => { for (let yy = ty; yy < ty + t.h; yy++) for (let xx = tx; xx < tx + t.w; xx++) if (inside(xx, yy) && noHouse[yy * C + xx]) return true; return false; };
  const overRoad = (t, tx, ty) => { for (let yy = ty; yy < ty + t.h; yy++) for (let xx = tx; xx < tx + t.w; xx++) if (inside(xx, yy) && roadCell[yy * C + xx]) return true; return false; };
  const fillDistrict = (dist) => {
    // varre de cima para baixo e da esquerda para a direita: as casas saem em fileiras
    const order = dist.cells.map((c) => c).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    // acampamento: tendas espalhadas, nao em fileira
    if (dist.scatter) for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const want = dist.want ?? Math.round((dist.cells.length / 24) * dist.density);
    let made = 0;
    for (const [cx, cy] of order) {
      if (made >= want || buildings.length >= MAX_BUILDINGS) break;
      // algumas tentativas no mesmo lugar: se a grande nao cabe, tenta uma menor
      let d = null; let x = 0; let y = 0;
      for (const size of [rnd() < dist.small ? 'pequena' : rnd() < 0.85 ? 'media' : 'grande', 'pequena', 'pequena']) {
        const t = pickDesign({ type: dist.type, size }, rnd);
        if (!t) continue;
        const tx = cx - Math.floor(t.w / 2); const ty = cy - Math.floor(t.h / 2);
        if (free(t, tx, ty) && !overNoHouse(t, tx, ty) && !(dist.avoidRoad && overRoad(t, tx, ty))) { d = t; x = tx; y = ty; break; }
      }
      if (!d) continue;
      occupy(d, x, y);
      const facing = faceRoad(d, x, y);
      buildings.push({ id: `b${buildings.length + 1}`, x, y, w: d.w, h: d.h, design: d.id, name: d.name, auto: true, ...(facing !== 'sul' ? { facing } : {}) });
      made++;
    }
    return made;
  };
  // ---- bairros como vila feita a mao: casas de frente para as ruas que passam por ele ----
  // recuo e espacamento variam, sobra um quintal/arvore/poco de vez em quando, a 2a fileira vem atras;
  // vizinhas nao repetem projeto nem cor de telhado
  const ROOFS = ['#b8442e', '#5a6a94', '#3e7a5a', '#7a4a8a', '#c47a2e', '#9a3a3a', '#2e6a8a', '#8a5a3a', '#6a7a3a'];
  const roofOf = (b) => b.colors?.roof || DESIGN_BY_ID[b.design]?.defaults?.colors?.roof;
  // vizinhas ja postas (grade de baldes 16x16: mapa grande tem milhares de casas)
  const buckets = new Map();
  const bucketAdd = (b) => { const k = ((b.y + (b.h >> 1)) >> 4) * 4096 + ((b.x + (b.w >> 1)) >> 4); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(b); };
  const near = (_list, x, y, r) => {
    const out = [];
    for (let by = (y >> 4) - 1; by <= (y >> 4) + 1; by++) for (let bx = (x >> 4) - 1; bx <= (x >> 4) + 1; bx++) for (const b of buckets.get(by * 4096 + bx) || []) if (Math.abs(b.x + b.w / 2 - x) < r && Math.abs(b.y + b.h / 2 - y) < r) out.push(b);
    return out;
  };
  const pickVaried = (type, size, nb) => {
    let t = null;
    for (let k = 0; k < 4; k++) { t = pickDesign({ type, size }, rnd); if (!t || !nb.some((b) => b.design === t.id)) break; }
    return t;
  };
  const addAuto = (d, x, y, facing, nb) => {
    occupy(d, x, y);
    const b = { id: `b${buildings.length + 1}`, x, y, w: d.w, h: d.h, design: d.id, name: d.name, auto: true, ...(facing !== 'sul' ? { facing } : {}) };
    const style = d.defaults?.roofStyle;
    const used = new Set(nb.map(roofOf));
    if (style !== 'palha' && style !== 'vidro' && (used.has(roofOf(b)) || rnd() < 0.3)) {
      const opts = ROOFS.filter((c) => !used.has(c));
      if (opts.length) b.colors = { roof: opts[Math.floor(rnd() * opts.length)] };
    }
    buildings.push(b);
    bucketAdd(b);
    return b;
  };
  const stamp = new Int32Array(C * R); let tag = 0;
  const isStreet = (i) => roadCell[i] === 1 || G[(i - (i % C)) / C][i % C] === 'c';
  const fillStreets = (dist) => {
    const cells = dist.cells;
    if (!cells.length || buildings.length >= MAX_BUILDINGS) return 0;
    tag++;
    // bairro enorme (mapa grande): o miolo e testado de 2 em 2 celulas (casa tem 4+ de largura)
    const step = cells.length > 2500 ? 2 : 1;
    const onStep = (x, y) => step === 1 || (x % 2 === 0 && y % 2 === 0);
    let x0 = C; let y0 = R; let x1 = 0; let y1 = 0;
    for (const [x, y] of cells) { stamp[y * C + x] = tag; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const M = 3;
    const bx0 = Math.max(0, x0 - 10); const by0 = Math.max(0, y0 - 10); const bx1 = Math.min(C - 1, x1 + 10); const by1 = Math.min(R - 1, y1 + 10);
    const BW = bx1 - bx0 + 1; const BH = by1 - by0 + 1;
    const L = (x, y) => (y - by0) * BW + (x - bx0);
    const inBox = (x, y) => x >= bx0 && y >= by0 && x <= bx1 && y <= by1;
    // distancia ate a rua mais perto (e qual celula de rua)
    const dd = new Uint8Array(BW * BH).fill(255); const src = new Int32Array(BW * BH).fill(-1);
    const q = new Int32Array(BW * BH); let qh = 0; let qt = 0;
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) if (isStreet(y * C + x)) { dd[L(x, y)] = 0; src[L(x, y)] = y * C + x; q[qt++] = L(x, y); }
    while (qh < qt) {
      const li = q[qh++]; const x = bx0 + (li % BW); const y = by0 + Math.floor(li / BW);
      if (dd[li] >= 40) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx; const Y = y + dy;
        if (!inBox(X, Y)) continue;
        const lj = L(X, Y);
        if (dd[lj] !== 255 || WATER.has(G[Y][X])) continue;
        dd[lj] = dd[li] + 1; src[lj] = src[li]; q[qt++] = lj;
      }
    }
    // margem: a casa pode avancar ate M celulas para fora do bairro (sem atravessar rua)
    const ext = new Uint8Array(BW * BH); qh = 0; qt = 0;
    for (const [x, y] of cells) { ext[L(x, y)] = 1; q[qt++] = L(x, y); }
    const ed = new Uint8Array(BW * BH);
    while (qh < qt) {
      const li = q[qh++]; if (ed[li] >= M) continue;
      const x = bx0 + (li % BW); const y = by0 + Math.floor(li / BW);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx; const Y = y + dy;
        if (!inBox(X, Y) || ext[L(X, Y)] || isStreet(Y * C + X)) continue;
        ext[L(X, Y)] = 2; ed[L(X, Y)] = ed[li] + 1; q[qt++] = L(X, Y);
      }
    }
    const reserved = new Uint8Array(BW * BH);
    const okFoot = (t, x, y) => {
      let core = 0;
      for (let yy = y; yy < y + t.h; yy++) for (let xx = x; xx < x + t.w; xx++) {
        if (!inBox(xx, yy) || !ext[L(xx, yy)] || reserved[L(xx, yy)]) return false;
        if (stamp[yy * C + xx] === tag) core++;
      }
      return core * 3 >= t.w * t.h && !overNoHouse(t, x, y) && !overRoad(t, x, y) && free(t, x, y);
    };
    const want = dist.want ?? Math.round((dist.cells.length / 24) * dist.density);
    const tight = dist.density >= 1.2; // bairro cheio: vaos e recuos menores
    const mine = [];
    let made = 0;
    const sizeOf = () => (rnd() < dist.small ? 'pequena' : rnd() < 0.85 ? 'media' : 'grande');
    // quintal: arvore (de fruta as vezes), poco ou moita com flores no vao entre casas
    const garden = (gx0, gy0, gx1, gy1) => {
      const spots = [];
      for (let y = gy0; y <= gy1; y++) for (let x = gx0; x <= gx1; x++) if (inBox(x, y) && ext[L(x, y)] && freeGround(x, y)) spots.push([x, y]);
      if (!spots.length) return;
      const r = rnd();
      const [cx, cy] = spots[Math.floor(spots.length / 2)];
      if (r < 0.18 && freeGround(cx + 1, cy) && freeGround(cx, cy - 1) && freeGround(cx + 1, cy - 1)) { setO(cx, cy, 'Ô'); lock[cy * C + cx] = 1; return; }
      const n = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const [x, y] = spots[Math.floor(rnd() * spots.length)];
        if (O[y][x] !== ' ') continue;
        setO(x, y, r < 0.55 ? ['T', 'ò', 'ù', 'T'][Math.floor(rnd() * 4)] : rnd() < 0.5 ? 'b' : 'f');
        lock[y * C + x] = 1;
      }
    };
    // 1) frente para a rua
    const anchors = [];
    for (let li = 0; li < BW * BH; li++) {
      if (dd[li] !== 1 || !ext[li]) continue;
      const x = bx0 + (li % BW); const y = by0 + Math.floor(li / BW);
      const si = src[li]; const sx = si % C; const sy = (si - sx) / C;
      const vx = sx - x; const vy = sy - y;
      const f = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'leste' : 'oeste') : vy > 0 ? 'sul' : 'norte';
      const horiz = f === 'sul' || f === 'norte';
      anchors.push({ x, y, f, line: Math.round((horiz ? y : x) / 3), along: horiz ? x : y });
    }
    const FO = { sul: 0, norte: 1, leste: 2, oeste: 3 };
    anchors.sort((a, b) => FO[a.f] - FO[b.f] || a.line - b.line || a.along - b.along);
    for (const a of anchors) {
      if (made >= want || buildings.length >= MAX_BUILDINGS) break;
      if (reserved[L(a.x, a.y)] || lock[a.y * C + a.x] === 2) continue;
      const nb = near(mine, a.x, a.y, 14);
      let done = null;
      for (const size of [sizeOf(), 'pequena']) {
        const t = pickVaried(dist.type, size, nb);
        if (!t) continue;
        const r = rnd();
        const sb0 = r < (tight ? 0.72 : 0.55) ? 0 : r < 0.94 ? 1 : 2;
        const j = Math.floor(rnd() * 3) - 1;
        // rua torta: se a casa encosta na rua, recua mais um pouco (ate 2 celulas)
        for (let sb = sb0; sb <= sb0 + 2 && !done; sb++) {
          let x; let y;
          if (a.f === 'sul') { x = a.x - Math.floor(t.w / 2) + j; y = a.y - sb - t.h + 1; }
          else if (a.f === 'norte') { x = a.x - Math.floor(t.w / 2) + j; y = a.y + sb + Math.max(0, clear(t) - 2); }
          else if (a.f === 'leste') { x = a.x - sb - t.w + 1; y = a.y - Math.floor(t.h / 2) + j; }
          else { x = a.x + sb; y = a.y - Math.floor(t.h / 2) + j; }
          if (okFoot(t, x, y)) done = addAuto(t, x, y, a.f, nb);
        }
        if (done) break;
      }
      if (!done) continue;
      mine.push(done); made++;
      // vao depois da casa (no sentido da rua): as vezes nada, as vezes 1-2 celulas, as vezes um quintal
      const r = rnd();
      const gap = r < (tight ? 0.62 : 0.42) ? 0 : r < (tight ? 0.86 : 0.7) ? 1 : r < (tight ? 0.93 : 0.85) ? 2 : 3 + Math.floor(rnd() * 3);
      if (!gap) continue;
      const horiz = a.f === 'sul' || a.f === 'norte';
      const gx0 = horiz ? done.x + done.w + 1 : done.x; const gx1 = horiz ? done.x + done.w + gap : done.x + done.w - 1;
      const gy0 = horiz ? done.y : done.y + done.h + 1; const gy1 = horiz ? done.y + done.h - 1 : done.y + done.h + gap;
      for (let y = gy0; y <= gy1; y++) for (let x = gx0; x <= gx1; x++) if (inBox(x, y)) reserved[L(x, y)] = 1;
      if (gap >= 3) garden(gx0, gy0, gx1, gy1);
    }
    // 2) miolo do bairro: 2a fileira atras das casas da frente, cada uma virada para a rua mais perto
    if (made < want) {
      const rest = cells.filter(([x, y]) => onStep(x, y) && !reserved[L(x, y)] && lock[y * C + x] !== 2)
        .map(([x, y]) => [x, y, (dd[L(x, y)] === 255 ? 60 : dd[L(x, y)]) + hash(x, y, 61) * 3]);
      rest.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]);
      for (const [cx, cy] of rest) {
        if (made >= want || buildings.length >= MAX_BUILDINGS) break;
        if (lock[cy * C + cx] === 2 || reserved[L(cx, cy)]) continue;
        const nb = near(mine, cx, cy, 14);
        let done = null;
        for (const size of [sizeOf(), 'pequena', 'pequena']) {
          const t = pickVaried(dist.type, size, nb);
          if (!t) continue;
          const x = cx - Math.floor(t.w / 2) + Math.floor(rnd() * 3) - 1; const y = cy - Math.floor(t.h / 2) + Math.floor(rnd() * 2);
          if (okFoot(t, x, y)) { done = addAuto(t, x, y, faceRoad(t, x, y), nb); break; }
        }
        if (!done) continue;
        mine.push(done); made++;
        if (rnd() < 0.3) { for (let y = done.y; y < done.y + done.h; y++) for (let x = done.x + done.w + 1; x <= done.x + done.w + 2; x++) if (inBox(x, y)) reserved[L(x, y)] = 1; }
      }
    }
    // 3) sobrou espaco e o bairro pede mais: completa varrendo (so onde cabe, sem pisar em rua)
    if (made < want && tight) {
      const order = cells.filter(([x, y]) => onStep(x, y)).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      for (const [cx, cy] of order) {
        if (made >= want || buildings.length >= MAX_BUILDINGS) break;
        if (lock[cy * C + cx] === 2) continue;
        const nb = near(mine, cx, cy, 14);
        for (const size of ['pequena', 'media']) {
          const t = pickVaried(dist.type, size, nb);
          if (!t) continue;
          const x = cx - Math.floor(t.w / 2); const y = cy - Math.floor(t.h / 2);
          if (free(t, x, y) && !overNoHouse(t, x, y) && !overRoad(t, x, y)) { mine.push(addAuto(t, x, y, faceRoad(t, x, y), nb)); made++; break; }
        }
      }
    }
    return made;
  };
  for (const dist of districts) fillStreets(dist);

  // ---- modo texto: povoado vazio (palicada/muro ou praca com menos de 6 construcoes) ganha casas ----
  // so quando o plano diz "mode":"texto" (foto fiel e esparsa nao e mexida)
  if (strip(plan.mode ?? plan.modo) === 'texto') {
    const polyCells = (p) => {
      const out = [];
      const xs = p.map((q) => q[0]); const ys = p.map((q) => q[1]);
      for (let y = Math.max(0, Math.min(...ys)); y <= Math.min(R - 1, Math.max(...ys)); y++) for (let x = Math.max(0, Math.min(...xs)); x <= Math.min(C - 1, Math.max(...xs)); x++) {
        let inP = false;
        for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i]; const [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi) inP = !inP; }
        if (inP) out.push([x, y, 0]);
      }
      return out;
    };
    const places = [];
    for (const f of Array.isArray(plan.fences) ? plan.fences : []) {
      if (!['palicada', 'muro'].includes(strip(f?.type ?? f?.tipo))) continue;
      const p = pts(f?.points);
      if (p.length >= 4 && Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) <= Math.max(3, C * 0.04)) places.push(polyCells(p));
    }
    const rad = Math.round(Math.min(C, R) * 0.12);
    for (const a of areas) {
      if (a.type !== 'praca') continue;
      const pc = shapeCells(a); if (!pc.length) continue;
      const cx = Math.round(pc.reduce((s2, c) => s2 + c[0], 0) / pc.length); const cy = Math.round(pc.reduce((s2, c) => s2 + c[1], 0) / pc.length);
      if (places.some((cells) => cells.some(([x, y]) => x === cx && y === cy))) continue;
      const disc = [];
      for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) if (inside(x, y) && Math.hypot(x - cx, y - cy) <= rad) disc.push([x, y, 0]);
      places.push(disc);
    }
    const camp = /acampamento|bandid|salteador|tenda/.test(strip(`${plan.name ?? ''} ${plan.notes ?? ''}`)) || [...(plan.buildings || []), ...(plan.objects || [])].filter((b) => /tenda/.test(strip(b?.type ?? b?.tipo))).length >= 2;
    if (camp) for (const a of areas) if (a.type === 'clareira') places.push(shapeCells(a));
    for (const cells of places) {
      if (cells.length < 60) continue;
      const set = new Set(cells.map(([x, y]) => y * C + x));
      const have = buildings.filter((b) => set.has((b.y + (b.h >> 1)) * C + b.x + (b.w >> 1))).length;
      // vila do modo texto: pelo menos ~40 casas se o lugar comporta (cada casa ~20 celulas de chao)
      const target = Math.max(camp ? 6 : Math.min(40, Math.round(cells.length / 20)), Math.round((cells.length / 24) * (camp ? 0.22 : 0.45)));
      if (have >= Math.min(6, target) && have >= target * (camp ? 0.5 : 0.75)) continue;
      (camp ? fillDistrict : fillStreets)({ cells, small: 0.7, density: 1, type: camp ? 'tenda' : 'casa', want: target - have, avoidRoad: true, scatter: camp });
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
    // umas arvores na beira da praca (sombra), fora do calcamento
    const pcx = cells.reduce((sum, c) => sum + c[0], 0) / cells.length; const pcy = cells.reduce((sum, c) => sum + c[1], 0) / cells.length;
    const every = Math.max(9, Math.round(edge.length / 7));
    edge.forEach(([x, y], i) => {
      if ((i + Math.floor(hash(cells.length, 1, 90) * every)) % every !== 0) return;
      const a = Math.atan2(y - pcy, x - pcx); const X = Math.round(x + Math.cos(a) * 2); const Y = Math.round(y + Math.sin(a) * 2);
      if (freeCell(X, Y) && GRASSY.has(G[Y][X]) && !roadCell[Y * C + X] && freeCell(X, Y - 1)) { setO(X, Y, hash(X, Y, 91) < 0.2 ? 'ù' : 'T'); lock[Y * C + X] = 1; }
    });
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

  // ---- modo texto: mata grande e vazia ganha lugares (afloramento de pedra, clareira com tocos e pedras) ----
  if (TEXT) {
    const spots = [];
    const far = (x, y, d) => { for (let yy = y - d; yy <= y + d; yy += 2) for (let xx = x - d; xx <= x + d; xx += 2) if (!inside(xx, yy) || lock[yy * C + xx] || forest[yy * C + xx] !== 2) return false; return true; };
    const want = Math.min(10, Math.round(forest.reduce((n, v) => n + (v === 2 ? 1 : 0), 0) / 1800));
    for (let k = 0; k < want * 40 && spots.length < want; k++) {
      const x = 6 + Math.floor(rnd() * (C - 12)); const y = 6 + Math.floor(rnd() * (R - 12));
      if (!far(x, y, 9) || spots.some(([a, b]) => Math.hypot(a - x, b - y) < Math.min(C, R) * 0.22)) continue;
      spots.push([x, y]);
      const rock = spots.length % 2 === 1; const rad = (rock ? 4 : 6) + Math.floor(rnd() * 4);
      for (let yy = y - rad - 2; yy <= y + rad + 2; yy++) for (let xx = x - rad - 2; xx <= x + rad + 2; xx++) {
        if (!inside(xx, yy) || lock[yy * C + xx]) continue;
        const d = Math.hypot(xx - x, (yy - y) * 1.2) + (wob(xx, yy, 14) - 0.5) * 3;
        if (d > rad) continue;
        if (rock) { G[yy][xx] = 'é'; forest[yy * C + xx] = 3; if (rnd() < 0.12) O[yy][xx] = rnd() < 0.3 ? 'Þ' : 'o'; }
        else { G[yy][xx] = rnd() < 0.5 ? 'g' : 'á'; forest[yy * C + xx] = 0; const r = rnd(); if (r < 0.05) O[yy][xx] = ['l', 'm', 'o', 'f', 'f'][Math.floor(rnd() * 5)]; }
      }
    }
  }

  // ---- arvores: mata com clareiras e capoes, borda com moitas, especies em manchas ----
  // f: 0 nada, 1 bosque, 2 floresta, 3 montanha/rocha
  const fAt = (x, y) => (inside(x, y) ? forest[y * C + x] : 2);
  for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
    const i = y * C + x;
    if (lock[i] || O[y][x] !== ' ' || !GRASSY.has(G[y][x])) continue;
    const f = forest[i];
    const snow = G[y][x] === '*'; // na neve so pinheiro e arbusto (nada de flor nem arvore de folha)
    const r = rnd();
    if (f === 2) {
      // densidade da mata varia: clareiras (com capim e flor), mata normal e capao fechado
      const dens = noise(x, y, 70, PSC * 1.4) * 0.7 + noise(x, y, 71, PSC * 0.5) * 0.3;
      const edge = fAt(x - 2, y) !== 2 || fAt(x + 2, y) !== 2 || fAt(x, y - 2) !== 2 || fAt(x, y + 2) !== 2;
      let p = dens < 0.3 ? 0.1 : dens < 0.4 ? 0.38 : dens > 0.66 ? 0.78 : 0.62;
      if (edge) p = Math.min(p, 0.42);
      if (dens < 0.3 && !snow && G[y][x] === '.') G[y][x] = hash(x, y, 72) < 0.5 ? 'g' : 'á';
      if (r < p) {
        const pine = snow ? 1 : 0.12 + noise(x, y, 73, PSC * 2) * 0.6; // manchas de pinheiral
        const k = rnd();
        O[y][x] = edge && k < 0.35 ? 'b' : k < 0.02 && !snow ? 'd' : k < 0.03 ? 'l' : k < 0.04 && !snow ? 'm' : rnd() < pine ? 'A' : rnd() < 0.08 && !snow ? 'ð' : 'T';
      } else if (r < p + (edge ? 0.12 : dens < 0.3 ? 0.06 : 0.02)) O[y][x] = snow ? 'b' : dens < 0.3 && rnd() < 0.6 ? 'f' : 'b';
    } else if (f === 3) {
      if (r < 0.35) O[y][x] = rnd() < 0.75 ? 'A' : 'o';
    } else {
      // fora da mata: moitas e arvores soltas encostadas na borda (transicao suave), flores no campo
      const touch = fAt(x - 1, y) === 2 || fAt(x + 1, y) === 2 || fAt(x, y - 1) === 2 || fAt(x, y + 1) === 2;
      const p = f === 1 ? 0.22 : touch ? 0.1 : 0.02;
      if (r < p) O[y][x] = snow || rnd() < 0.4 ? 'A' : touch && rnd() < 0.4 ? 'b' : rnd() < 0.9 ? 'T' : 'b';
      else if (rnd() < (G[y][x] === 'á' ? 0.06 : 0.025)) O[y][x] = !snow && rnd() < 0.5 ? 'f' : 'b';
    }
  }
  // praia: pedras soltas na areia perto da agua
  if (sea.some((v) => v)) for (let y = 1; y < R - 1; y++) for (let x = 1; x < C - 1; x++) {
    if (G[y][x] !== ':' || O[y][x] !== ' ' || lock[y * C + x] === 2) continue;
    if (!(sea[y * C + x - 1] || sea[y * C + x + 1] || sea[(y - 1) * C + x] || sea[(y + 1) * C + x] || sea[y * C + x - 2] || sea[y * C + x + 2])) continue;
    const r = hash(x, y, 80);
    if (r < 0.006 && O[y][x + 1] === ' ') O[y][x] = 'Þ'; else if (r < 0.04 && noise(x, y, 81, 5) > 0.45) O[y][x] = 'o';
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
  return { map, warnings, monsters, asked, missing: Math.max(0, asked - placed), name: String(plan.name ?? plan.nome ?? '').slice(0, 80), notes: String(plan.notes ?? plan.notas ?? '').slice(0, 300) };
}
