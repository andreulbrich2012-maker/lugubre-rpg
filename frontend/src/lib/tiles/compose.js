// "Auto-embelezamento" do mapa (24/10, pedido do Andre): o mapa salvo e um RASCUNHO GROSSO
// (1 codigo por celula, facil ate para IA fraca) e o render faz o resto, sempre igual em todos
// os clientes (so hash da posicao, nada de Math.random):
// - transicao organica entre terrenos naturais (grama/terra/areia/agua...): campo bilinear dos
//   centros das celulas + ruido, com precedencia (agua < areia < terra < grama);
// - margem de agua com espuma e barranco molhado, borda de grama com contorno e sombra;
// - decoracao espalhada (tufos, flores, pedrinhas, lirios, rachaduras) que nunca cai em
//   caminho, porta ou objeto;
// - paredes com topo/face e sombra; objetos com sombra eliptica, variacao (espelho/desvio) e
//   arvores grandes que ocupam as celulas de cima com a copa.
// Tudo puro (sem DOM): o navegador e o preview em node usam as mesmas funcoes.
import { SIZE, getTile, tileImages } from './catalog.js';
import { rasterize, cellHash } from './render.js';
import { wallVariant, wallPixels, FACE_SHADOW } from './walls.js';

// ---------- terrenos que se misturam (resto e "construido": borda reta) ----------
// Ordem = precedencia: quem vem depois cobre a borda de quem vem antes.
const BLEND_ORDER = ['L', '@', 'W', '~', '0', 'G', '%', 'j', ':', 'I', '*', 'z', ',', ';', 'c', 'v', '.', 'g'];
const PRECEDENCE = Object.fromEntries(BLEND_ORDER.map((c, i) => [c, i + 1]));
const WATER = new Set(['~', 'W', '0']);
const GRASS = new Set(['.', 'g']);
const PATH = new Set([';', 'c']);
export const DECOR_LEVELS = { nenhuma: 0, pouca: 0.45, normal: 1, muita: 1.8 };

export const blends = (code) => Boolean(PRECEDENCE[code]);

// Hash com "sal" para cada uso nao repetir o mesmo padrao.
const hash = (x, y, salt = 0) => cellHash(x * 31 + salt * 977, y * 17 + salt * 131);
const rand = (x, y, salt) => (hash(x, y, salt) % 10000) / 10000;

// Ruido de valor suave (bordas irregulares e arredondadas, sem serrilhado de grade).
function valueNoise(x, y, scale, salt) {
  const fx = x / scale;
  const fy = y / scale;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = fx - ix;
  const ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = rand(ix, iy, salt);
  const b = rand(ix + 1, iy, salt);
  const c = rand(ix, iy + 1, salt);
  const d = rand(ix + 1, iy + 1, salt);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const borderNoise = (x, y) => valueNoise(x, y, 11, 1) * 0.6 + valueNoise(x, y, 5, 2) * 0.3 + valueNoise(x, y, 2, 3) * 0.1;

// ---------- imagem RGBA simples ----------
export function newImage(w, h) {
  return { w, h, data: new Uint8ClampedArray(w * h * 4) };
}
function blend(img, x, y, r, g, b, a = 1) {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h || a <= 0) return;
  const i = (y * img.w + x) * 4;
  const d = img.data;
  const ia = d[i + 3] / 255;
  const oa = a + ia * (1 - a);
  if (oa <= 0) return;
  d[i] = (r * a + d[i] * ia * (1 - a)) / oa;
  d[i + 1] = (g * a + d[i + 1] * ia * (1 - a)) / oa;
  d[i + 2] = (b * a + d[i + 2] * ia * (1 - a)) / oa;
  d[i + 3] = oa * 255;
}
function scaleRgb(img, x, y, f) {
  const i = (y * img.w + x) * 4;
  img.data[i] *= f; img.data[i + 1] *= f; img.data[i + 2] *= f;
}
function tint(img, x, y, [r, g, b], a) {
  const i = (y * img.w + x) * 4;
  const d = img.data;
  d[i] += (r - d[i]) * a; d[i + 1] += (g - d[i + 1]) * a; d[i + 2] += (b - d[i + 2]) * a;
}
// Cola um RGBA 16x16 (ou w x h) com espelho opcional; alpha < 1 para sombras.
function stamp(img, rgba, w, h, ox, oy, { flip = false, alpha = 1 } = {}) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = flip ? w - 1 - x : x;
      const i = (y * w + sx) * 4;
      if (!rgba[i + 3]) continue;
      blend(img, ox + x, oy + y, rgba[i], rgba[i + 1], rgba[i + 2], (rgba[i + 3] / 255) * alpha);
    }
  }
}
function ellipse(img, cx, cy, rx, ry, alpha) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (d < 1) blend(img, x, y, 34, 18, 52, alpha * (d < 0.55 ? 1 : (1 - d) / 0.45)); // sombra arroxeada, borda macia
    }
  }
}

const hexRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// RGBA das imagens dos blocos (cache por codigo/imagem).
const tileCache = new Map();
function tileRgba(t, index) {
  const key = `${t.code}:${index}`;
  let out = tileCache.get(key);
  if (!out) {
    out = rasterize(tileImages(t)[index], t.palette);
    tileCache.set(key, out);
  }
  return out;
}
function imageIndex(t, cx, cy, frame) {
  const count = tileImages(t).length;
  if (count < 2) return 0;
  return t.frames ? frame % count : cellHash(cx, cy) % count;
}

// ---------- decoracoes pequenas (pixel art 3x3 a 5x5) ----------
const DECALS = {
  tuft: { pal: { a: '#2b6a40', b: '#5fa53f', c: '#88c04a' }, rows: ['.c.c.', 'cb.bc', '.aba.'] },
  tuft2: { pal: { a: '#2b6a40', b: '#88c04a', c: '#bcd96c' }, rows: ['c...c', '.b.b.', '.aaa.'] },
  flowerR: { pal: { a: '#2b6a40', r: '#e0524c', y: '#ffe27c' }, rows: ['.r.', 'ryr', '.a.'] },
  flowerY: { pal: { a: '#2b6a40', r: '#ffd04a', y: '#fff2c0' }, rows: ['.r.', 'ryr', '.a.'] },
  flowerB: { pal: { a: '#2b6a40', r: '#7aa0f0', y: '#f6f9ff' }, rows: ['.r.', 'ryr', '.a.'] },
  flowerW: { pal: { a: '#2b6a40', r: '#f6f2ea', y: '#ffd04a' }, rows: ['r.r', '.y.', 'r.r'] },
  pebble: { pal: { a: '#524866', b: '#8a7f8e', c: '#bdb1a6' }, rows: ['.cb', 'bba', '.a.'] },
  pebbleS: { pal: { a: '#6d627c', b: '#ab9f9c' }, rows: ['b.', 'ab'] },
  leaf: { pal: { a: '#9e6635', b: '#e0ad66' }, rows: ['.b', 'ba'] },
  mush: { pal: { a: '#d8c6a2', r: '#c43a3a', w: '#faefd6' }, rows: ['rwr', '.a.'] },
  lily: { pal: { a: '#2b6a40', b: '#5fa53f', c: '#88c04a', p: '#f4a8c8' }, rows: ['.bbb.', 'bccpb', 'bcc.b', '.bab.'] },
  crack: { pal: { a: '#3b3452' }, rows: ['a...', '.a..', '.aa.', '...a'] },
  dust: { pal: { a: '#ab9f9c' }, rows: ['a.a', '.a.'] },
  shell: { pal: { a: '#f4dda2', b: '#e8a890' }, rows: ['ab', 'ba'] },
  twig: { pal: { a: '#5c3328' }, rows: ['a..', '.aa'] }
};
const DECAL_RGBA = Object.fromEntries(Object.entries(DECALS).map(([k, d]) => {
  const w = d.rows[0].length;
  const h = d.rows.length;
  const data = new Uint8ClampedArray(w * h * 4);
  d.rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!d.pal[ch]) return;
    const [r, g, b] = hexRgb(d.pal[ch]);
    data.set([r, g, b, 255], (y * w + x) * 4);
  }));
  return [k, { w, h, data }];
}));
// O que nasce em cada chao: [decalque, chance por celula no nivel "normal"]
const BIOME = {
  '.': [['tuft', 0.5], ['tuft2', 0.25], ['flowerR', 0.07], ['flowerY', 0.08], ['flowerB', 0.05], ['flowerW', 0.05], ['pebbleS', 0.06]],
  g: [['tuft2', 0.7], ['tuft', 0.5], ['flowerY', 0.05]],
  ',': [['pebble', 0.18], ['pebbleS', 0.25], ['twig', 0.08], ['leaf', 0.06]],
  ':': [['shell', 0.08], ['pebbleS', 0.12]],
  v: [['leaf', 0.6], ['twig', 0.15], ['mush', 0.05]],
  '*': [['twig', 0.06], ['pebbleS', 0.06]],
  j: [['pebbleS', 0.12]],
  '%': [['tuft', 0.15]],
  '~': [['lily', 0.07]],
  _: [['crack', 0.1], ['dust', 0.08]],
  Q: [['dust', 0.06]],
  U: [['crack', 0.08]],
  ';': [['pebbleS', 0.08]],
  c: [['pebbleS', 0.05]]
};

// ---------- terreno ----------
// Devolve a imagem do chao inteiro (16 px por celula) para um quadro de animacao.
export function renderTerrain(map, { frame = 0, beautify = true, decor = 'normal' } = {}) {
  const { cols, rows } = map;
  const W = cols * SIZE;
  const H = rows * SIZE;
  const img = newImage(W, H);
  const ground = map.layers.ground;
  const objects = map.layers.objects;
  const code = (cx, cy) => ground[cy]?.[cx];
  const terr = new Uint8Array(W * H); // indice em BLEND_ORDER+1 (0 = construido)
  const codeOf = (id) => BLEND_ORDER[id - 1];

  // celulas: precedencia do terreno (0 = construido) e se a vizinhanca 3x3 e toda igual
  // (a maioria: pula as contas de borda, que sao o caro)
  const cellP = new Uint8Array(cols * rows);
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) cellP[cy * cols + cx] = PRECEDENCE[code(cx, cy)] || 0;
  const flat = new Uint8Array(cols * rows);
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const me = code(cx, cy);
      let same = true;
      for (let dy = -1; dy <= 1 && same; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const o = code(cx + dx, cy + dy);
          if (o !== undefined && o !== me) { same = false; break; }
        }
      }
      flat[cy * cols + cx] = same ? 1 : 0;
    }
  }

  // passo 1: qual terreno cada pixel mostra
  const cand = [0, 0, 0, 0];
  for (let py = 0; py < H; py++) {
    const cy = Math.floor(py / SIZE);
    const v = (py + 0.5) / SIZE - 0.5;
    const j0 = Math.floor(v);
    const fy = v - j0;
    const sy = fy * fy * (3 - 2 * fy);
    for (let px = 0; px < W; px++) {
      const cx = Math.floor(px / SIZE);
      const ownP = cellP[cy * cols + cx];
      if (!beautify || !ownP || flat[cy * cols + cx]) { terr[py * W + px] = ownP; continue; }
      const u = (px + 0.5) / SIZE - 0.5;
      const i0 = Math.floor(u);
      const fx = u - i0;
      const sx = fx * fx * (3 - 2 * fx);
      // cantos: celula construida ou fora do mapa conta como o proprio terreno (nao invade parede)
      const p00 = (i0 >= 0 && j0 >= 0 && cellP[j0 * cols + i0]) || ownP;
      const p10 = (i0 + 1 < cols && j0 >= 0 && cellP[j0 * cols + i0 + 1]) || ownP;
      const p01 = (i0 >= 0 && j0 + 1 < rows && cellP[(j0 + 1) * cols + i0]) || ownP;
      const p11 = (i0 + 1 < cols && j0 + 1 < rows && cellP[(j0 + 1) * cols + i0 + 1]) || ownP;
      let pick = ownP;
      if (!(p00 === p10 && p00 === p01 && p00 === p11)) {
        const w00 = (1 - sx) * (1 - sy);
        const w10 = sx * (1 - sy);
        const w01 = (1 - sx) * sy;
        const w11 = sx * sy;
        // candidatos em ordem de precedencia (maior primeiro); o ultimo preenche o resto
        let n = 0;
        for (const q of [p00, p10, p01, p11]) {
          let dup = false;
          for (let k = 0; k < n; k++) if (cand[k] === q) dup = true;
          if (dup) continue;
          let k = n++;
          while (k > 0 && cand[k - 1] < q) { cand[k] = cand[k - 1]; k--; }
          cand[k] = q;
        }
        const noise = (borderNoise(px, py) - 0.5) * 0.9;
        pick = cand[n - 1];
        for (let k = 0; k < n - 1; k++) {
          const t = cand[k];
          const f = (p00 === t ? w00 : 0) + (p10 === t ? w10 : 0) + (p01 === t ? w01 : 0) + (p11 === t ? w11 : 0);
          if (f + noise > 0.5) { pick = t; break; }
        }
      }
      terr[py * W + px] = pick;
    }
  }

  // passo 2: cor (textura do terreno escolhido, na posicao do pixel; parede com autotile)
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const own = getTile(code(cx, cy)) || getTile('.');
      const wall = beautify && own.wall ? wallVariant(map, cx, cy) : null;
      const ownRgba = wall
        ? wallPixels(own, tileImages(own)[imageIndex(own, cx, cy, frame)], wall.kind, wall.mask)
        : tileRgba(own, imageIndex(own, cx, cy, frame));
      const bySrc = [];
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const px = cx * SIZE + x;
          const py = cy * SIZE + y;
          const id = terr[py * W + px];
          let src = ownRgba;
          if (id && codeOf(id) !== own.code) {
            if (!bySrc[id]) {
              const t = getTile(codeOf(id));
              bySrc[id] = tileRgba(t, imageIndex(t, cx, cy, frame));
            }
            src = bySrc[id];
          }
          const si = (y * SIZE + x) * 4;
          const di = (py * W + px) * 4;
          img.data[di] = src[si]; img.data[di + 1] = src[si + 1]; img.data[di + 2] = src[si + 2]; img.data[di + 3] = 255;
        }
      }
    }
  }
  if (!beautify) return img;

  // passo 3: bordas (espuma, barranco molhado, contorno e sombra da grama, brilho da lava)
  // So perto de troca de terreno (celula "flat" pula tudo).
  const kindOf = new Uint8Array(BLEND_ORDER.length + 1); // 1 agua, 2 grama, 3 lava
  BLEND_ORDER.forEach((c, i) => { kindOf[i + 1] = WATER.has(c) ? 1 : GRASS.has(c) ? 2 : c === 'L' ? 3 : 0; });
  const K = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 255 : kindOf[terr[y * W + x]] | (terr[y * W + x] ? 0 : 8));
  const isW = (k) => k !== 255 && (k & 7) === 1;
  const isG = (k) => k !== 255 && (k & 7) === 2;
  const deepId = PRECEDENCE.W;
  const FOAM = hexRgb('#e8f8fa');
  const WET = hexRgb('#4a3038');
  const BANK = hexRgb('#8a5a34');
  const GLOW = hexRgb('#ffd27a');
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      // so celulas com borda que interessa por perto (agua x terra, grama x outro chao, lava)
      let water = 0; let dry = 0; let grass = 0; let notGrass = 0; let lava = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const c = code(cx + dx, cy + dy);
          if (c === undefined) continue;
          if (WATER.has(c)) water++; else dry++;
          if (GRASS.has(c)) grass++; else notGrass++;
          if (c === 'L') lava++;
        }
      }
      if (!(water && dry) && !(grass && notGrass) && !(lava && lava < 9) && !(water && code(cx, cy) === 'W')) continue;
      for (let py = cy * SIZE; py < (cy + 1) * SIZE; py++) {
        for (let px = cx * SIZE; px < (cx + 1) * SIZE; px++) {
          const id = terr[py * W + px];
          const k = kindOf[id] | (id ? 0 : 8);
          const l = K(px - 1, py); const r = K(px + 1, py); const u = K(px, py - 1); const d = K(px, py + 1);
          if (id && (k & 7) === 1) {
            const land = (q) => q !== 255 && (q & 7) !== 1;
            if (land(l) || land(r) || land(u) || land(d)) tint(img, px, py, FOAM, hash(px, py + frame, 9) % 3 === 0 ? 0.85 : 0.6);
            else if (land(K(px - 2, py)) || land(K(px + 2, py)) || land(K(px, py - 2)) || land(K(px, py + 2))) tint(img, px, py, FOAM, 0.22);
            else if (id === deepId && [px - 1, px + 1].some((x) => terr[py * W + x] && terr[py * W + x] !== deepId)) tint(img, px, py, FOAM, 0.12);
          } else {
            // margem: faixa de terra molhada entre a agua e o resto (mais grossa em cima da agua: barranco)
            if (isW(l) || isW(r) || isW(u) || isW(d)) tint(img, px, py, WET, 0.6);
            else if (isW(K(px - 2, py)) || isW(K(px + 2, py)) || isW(K(px, py - 2)) || isW(K(px, py + 2)) || isW(K(px - 1, py - 1)) || isW(K(px + 1, py - 1)) || isW(K(px - 1, py + 1)) || isW(K(px + 1, py + 1))) tint(img, px, py, BANK, 0.65);
            else if (isW(K(px - 3, py)) || isW(K(px + 3, py)) || isW(K(px, py + 3)) || isW(K(px, py + 4))) tint(img, px, py, BANK, 0.35);
          }
          if ((k & 7) === 2) {
            // contorno da touceira de grama onde encosta em outro chao
            const other = (q) => q !== 255 && (q & 7) !== 2 && (q & 7) !== 1;
            if (other(l) || other(r) || other(u) || other(d)) scaleRgb(img, px, py, 0.72);
          } else if (id && (k & 7) !== 1) {
            // sombra que a grama "alta" joga no chao logo abaixo dela
            if (isG(u) || isG(K(px, py - 2))) scaleRgb(img, px, py, 0.82);
          }
          if ((k & 7) === 3 && [l, r, u, d].some((q) => q !== 255 && (q & 7) !== 3)) tint(img, px, py, GLOW, 0.5);
        }
      }
    }
  }

  // sombra que a frente da parede projeta no chao abaixo
  for (let cy = 0; cy < rows - 1; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const w = getTile(code(cx, cy))?.wall && wallVariant(map, cx, cy);
      if (!w || w.kind !== 'face' || getTile(code(cx, cy + 1))?.wall) continue;
      for (let y = 0; y < FACE_SHADOW + 2; y++) {
        for (let x = 0; x < SIZE; x++) scaleRgb(img, cx * SIZE + x, (cy + 1) * SIZE + y, y < FACE_SHADOW ? 0.66 : 0.84);
      }
    }
  }

  // passo 4: decoracao espalhada (nunca em objeto, porta, parede ou na borda com outro chao)
  const density = DECOR_LEVELS[decor] ?? 1;
  if (density > 0) {
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const c = code(cx, cy);
        const list = BIOME[c];
        if (!list || (objects[cy]?.[cx] && objects[cy][cx] !== ' ')) continue;
        const ownId = PRECEDENCE[c] || 0;
        list.forEach(([name, chance], k) => {
          if (rand(cx, cy, 20 + k) >= chance * density) return;
          const d = DECAL_RGBA[name];
          const ox = cx * SIZE + 1 + (hash(cx, cy, 40 + k) % (SIZE - d.w - 1));
          const oy = cy * SIZE + 1 + (hash(cx, cy, 60 + k) % (SIZE - d.h - 1));
          for (let y = 0; y < d.h; y++) {
            for (let x = 0; x < d.w; x++) {
              const i = (y * d.w + x) * 4;
              if (!d.data[i + 3] || terr[(oy + y) * W + ox + x] !== ownId) continue;
              blend(img, ox + x, oy + y, d.data[i], d.data[i + 1], d.data[i + 2], 1);
            }
          }
        });
        // pedras soltas na grama que encosta no caminho
        if (GRASS.has(c)) {
          const nearPath = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => PATH.has(code(cx + dx, cy + dy)));
          if (nearPath && rand(cx, cy, 80) < 0.55 * density) {
            const d = DECAL_RGBA.pebbleS;
            const [dx, dy] = nearPath;
            const ox = cx * SIZE + (dx > 0 ? 12 : dx < 0 ? 2 : 3 + (hash(cx, cy, 81) % 10));
            const oy = cy * SIZE + (dy > 0 ? 12 : dy < 0 ? 2 : 3 + (hash(cx, cy, 82) % 10));
            stamp(img, d.data, d.w, d.h, ox, oy);
          }
        }
      }
    }
  }
  return img;
}

// ---------- objetos ----------
// Arvores grandes geradas por codigo (copa de bolhas com luz do alto-esquerda, tronco, contorno colorido).
const TREE_PAL = {
  T: ['#1d4a3e', '#2b6a40', '#468c3a', '#6aac44', '#a0cc5a', '#d2e888'],
  A: ['#173a3a', '#1f5640', '#2f7444', '#4a9046', '#76b052', '#a8d070'],
  Y: ['#3a2a4a', '#5a3a5a', '#7a4a5e', '#9c6a6a', '#c09080', '#e0b8a0']
};
const TRUNK = ['#3d2230', '#5c3328', '#7d4a2e', '#9e6635'];
const OUT = hexRgb('#1f1a2e');

function makeTree(kind, variant) {
  const w = 32;
  const h = 44;
  const pal = TREE_PAL[kind].map(hexRgb);
  const trunk = TRUNK.map(hexRgb);
  const data = new Uint8ClampedArray(w * h * 4);
  const inside = new Uint8Array(w * h);
  const set = (x, y, rgb) => { if (x >= 0 && y >= 0 && x < w && y < h) data.set([...rgb, 255], (y * w + x) * 4); };
  // tronco
  for (let y = 30; y < 43; y++) {
    for (let x = 13; x < 19; x++) set(x, y, trunk[x === 13 ? 1 : x >= 17 ? 0 : x === 14 ? 3 : 2]);
  }
  set(12, 42, trunk[1]); set(19, 42, trunk[0]); set(11, 43, trunk[0]); set(20, 43, trunk[0]);
  // copa: bolhas (pinheiro: camadas triangulares)
  const blobs = [];
  if (kind === 'A') {
    for (let k = 0; k < 4; k++) {
      const cy = 8 + k * 7;
      const r = 5 + k * 2.6;
      for (let x = -r; x <= r; x += 2) blobs.push([16 + x, cy + Math.abs(x) * 0.25, 3.2]);
    }
  } else {
    const n = 7 + variant;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + variant;
      blobs.push([16 + Math.cos(a) * (8 + (k % 2)), 17 + Math.sin(a) * 8.5, 6.5 + ((k + variant) % 3)]);
    }
    blobs.push([16, 16, 9.5]);
  }
  for (let y = 0; y < 36; y++) {
    for (let x = 0; x < w; x++) {
      let best = -1;
      let bx = 0;
      let by = 0;
      for (const [cx, cy, r] of blobs) {
        const d = 1 - Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
        if (d > best) { best = d; bx = (x + 0.5 - cx) / r; by = (y + 0.5 - cy) / r; }
      }
      if (best <= 0) continue;
      inside[y * w + x] = 1;
      // luz do alto-esquerda dentro de cada bolha + escurece embaixo da copa
      const light = -bx * 0.6 - by * 0.9 + (1 - y / 36) * 0.8 + ((hash(x, y, 300 + variant) % 7) - 3) * 0.09;
      const tone = Math.max(0, Math.min(5, Math.round(1.6 + light * 2)));
      set(x, y, pal[tone]);
    }
  }
  // contorno colorido escuro em volta da copa
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (inside[y * w + x]) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inside[(y + dy) * w + x + dx] && x + dx >= 0 && x + dx < w);
      if (near) set(x, y, OUT);
    }
  }
  return { w, h, data };
}
const TREES = { T: [0, 1, 2].map((v) => makeTree('T', v)), A: [0, 1].map((v) => makeTree('A', v)), Y: [0, 1].map((v) => makeTree('Y', v)) };
const NATURAL = new Set(['b', 'o', 'm', 'f', 'd', 'l', 'x', 'N', "'"]);

export const isAnimatedObject = (t) => Boolean(t?.frames);

// Camada estatica de objetos (sombras + sprites), de cima para baixo para a copa de baixo cobrir a de cima.
// Objetos animados (fogo, tocha, portal) ficam so com a sombra; o quadro e desenhado por cima a cada passo.
export function renderObjects(map, { beautify = true } = {}) {
  const { cols, rows } = map;
  const img = newImage(cols * SIZE, rows * SIZE);
  const objects = map.layers.objects;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const t = getTile(objects[cy]?.[cx]);
      if (!t || t.layer !== 'objects') continue;
      const x0 = cx * SIZE;
      const y0 = cy * SIZE;
      if (!beautify) {
        if (!isAnimatedObject(t)) stamp(img, tileRgba(t, imageIndex(t, cx, cy, 0)), SIZE, SIZE, x0, y0);
        continue;
      }
      const big = TREES[t.code];
      if (big) {
        const tree = big[hash(cx, cy, 5) % big.length];
        const dx = (hash(cx, cy, 6) % 5) - 2;
        ellipse(img, x0 + 8 + dx, y0 + 14, 10, 3.6, 0.42);
        stamp(img, tree.data, tree.w, tree.h, x0 - 8 + dx, y0 + SIZE - tree.h + 1, { flip: hash(cx, cy, 7) % 2 === 1 });
        continue;
      }
      ellipse(img, x0 + 8, y0 + 14, t.solid ? 7 : 5.5, t.solid ? 2.6 : 2, t.solid ? 0.4 : 0.3);
      if (isAnimatedObject(t)) continue;
      const natural = NATURAL.has(t.code);
      const dx = natural ? (hash(cx, cy, 8) % 3) - 1 : 0;
      const dy = natural ? -(hash(cx, cy, 9) % 2) : 0;
      stamp(img, tileRgba(t, imageIndex(t, cx, cy, 0)), SIZE, SIZE, x0 + dx, y0 + dy, { flip: natural && hash(cx, cy, 10) % 2 === 1 });
    }
  }
  return img;
}

// Telhados automaticos: sala fechada por parede, com porta, piso construido e cercada de
// natureza por fora (masmorra fica sem telhado). So quando o mapa nao trouxe "buildings".
const DOORS = new Set(['D', 'X', '(', '?']);
export function detectBuildings(map, max = 30) {
  const { cols, rows } = map;
  const g = map.layers.ground;
  const isWall = (x, y) => Boolean(getTile(g[y]?.[x])?.wall);
  const seen = new Uint8Array(cols * rows);
  const found = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (seen[y * cols + x] || isWall(x, y)) continue;
      const cells = [];
      const stack = [[x, y]];
      let edge = false;
      seen[y * cols + x] = 1;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        cells.push([cx, cy]);
        if (cx === 0 || cy === 0 || cx === cols - 1 || cy === rows - 1) edge = true;
        for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen[ny * cols + nx] || isWall(nx, ny)) continue;
          seen[ny * cols + nx] = 1;
          stack.push([nx, ny]);
        }
      }
      if (edge || cells.length > 400) continue;
      const xs = cells.map((c) => c[0]);
      const ys = cells.map((c) => c[1]);
      const bx = Math.min(...xs) - 1;
      const by = Math.min(...ys) - 1;
      const bw = Math.max(...xs) - bx + 2;
      const bh = Math.max(...ys) - by + 2;
      if (bx < 0 || by < 0 || bx + bw > cols || by + bh > rows || bw < 3 || bh < 3) continue;
      const built = cells.filter(([cx, cy]) => !blends(g[cy][cx])).length;
      if (built < cells.length * 0.6) continue; // patio de grama cercado nao e casa
      let door = false;
      let outside = 0;
      let natural = 0;
      for (let cx = bx; cx < bx + bw; cx++) {
        for (const cy of [by, by + bh - 1]) if (DOORS.has(g[cy][cx])) door = true;
        for (const cy of [by - 1, by + bh]) if (cy >= 0 && cy < rows) { outside++; if (blends(g[cy][cx])) natural++; }
      }
      for (let cy = by; cy < by + bh; cy++) {
        for (const cx of [bx, bx + bw - 1]) if (DOORS.has(g[cy][cx])) door = true;
        for (const cx of [bx - 1, bx + bw]) if (cx >= 0 && cx < cols) { outside++; if (blends(g[cy][cx])) natural++; }
      }
      if (!door || natural < outside * 0.5) continue;
      if (found.some((b) => bx < b.x + b.w && b.x < bx + bw && by < b.y + b.h && b.y < by + bh)) continue;
      const floor = g[cells[0][1]][cells[0][0]];
      found.push({ id: `auto${found.length + 1}`, x: bx, y: by, w: bw, h: bh, name: 'Construção', roof: floor === '=' ? 'madeira' : g[by][bx] === 'M' ? 'palha' : 'telha' });
      if (found.length >= max) return found;
    }
  }
  return found;
}

// Celulas de terreno animado (agua/lava): se nao houver, o terreno e desenhado uma vez so.
export function terrainFrames(map) {
  let n = 1;
  for (const row of map.layers.ground) for (const ch of row) { const t = getTile(ch); if (t?.frames) n = Math.max(n, t.frames.length); }
  return n;
}

// ---------- ciclo de luz ----------
// Multiplicacao pela cor do ceu + brilho somado das fontes de luz (tocha, fogo, janela, cristal).
export const LIGHT_TINT = { dia: null, entardecer: '#f2b890', noite: '#3a4688' };
export const NIGHT_LIGHT = '#ffc46a';
export function lightSources(map) {
  const out = [];
  for (const layer of ['ground', 'objects']) {
    map.layers[layer].forEach((row, y) => [...row].forEach((ch, x) => {
      const t = getTile(ch);
      if (t?.light) out.push([x, y, t.light]);
      else if (ch === 'J') out.push([x, y, NIGHT_LIGHT]); // janela acesa a noite
    }));
  }
  return out;
}

// Pura: imagem final como a mesa mostra (usada no preview em PNG e nos testes).
export function renderScene(map, { beautify = true, decor = map.decor || 'normal', light = map.light || 'dia', roofs = [], frame = 0, roofPixels } = {}) {
  const img = renderTerrain(map, { frame, beautify, decor });
  const obj = renderObjects(map, { beautify });
  stamp(img, obj.data, obj.w, obj.h, 0, 0);
  map.layers.objects.forEach((row, y) => [...row].forEach((ch, x) => {
    const t = getTile(ch);
    if (t && isAnimatedObject(t)) stamp(img, tileRgba(t, frame % t.frames.length), SIZE, SIZE, x * SIZE, y * SIZE);
  }));
  for (const b of roofs) {
    const r = roofPixels(b);
    stamp(img, r.data, r.width, r.height, b.x * SIZE, b.y * SIZE);
  }
  const tintHex = LIGHT_TINT[light];
  if (tintHex) {
    const [r, g, b] = hexRgb(tintHex);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = (img.data[i] * r) / 255; img.data[i + 1] = (img.data[i + 1] * g) / 255; img.data[i + 2] = (img.data[i + 2] * b) / 255;
    }
    const strength = light === 'noite' ? 0.7 : 0.35;
    for (const [lx, ly, color] of lightSources(map)) {
      const [cr, cg, cb] = hexRgb(color);
      const cx = (lx + 0.5) * SIZE;
      const cy = (ly + 0.5) * SIZE;
      const R = SIZE * 2.6;
      for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(img.h, cy + R); y++) {
        for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(img.w, cx + R); x++) {
          const f = 1 - Math.hypot(x - cx, y - cy) / R;
          if (f <= 0) continue;
          const i = (y * img.w + x) * 4;
          const k = f * f * strength;
          img.data[i] += cr * k; img.data[i + 1] += cg * k; img.data[i + 2] += cb * k;
        }
      }
    }
  }
  return img;
}
