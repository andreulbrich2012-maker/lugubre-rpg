// Cercas que emendam com a vizinha (24/10, pedido do Andre: "cerca de vila como nos mapas
// pintados"). O mapa guarda 1 codigo por celula; aqui cada celula olha as 8 vizinhas do mesmo
// codigo e monta o desenho: moirao no centro + tabuas (cerca) ou toras pontudas (palicada)
// indo ate a borda da celula na direcao de cada vizinha. Assim uma linha de cerca vira UMA
// cerca continua (reta, vertical, quina, T, diagonal e ponta solta).
// Projecao 3/4 (estilo Stardew, nunca copiado): uma tabua a altura h aparece h px acima do
// chao; na corrida vertical as tabuas ficam de lado (barra fina) e as toras se empilham
// mostrando as pontas. Luz do alto-esquerda, contorno sepia, rampas quentes (tone).
// Puro (sem DOM): o compose.js cola o sprite no lugar da celula.
import { canvas, tone, hash, toImages, thumbnail } from './paint.js';
import { outlineOf, hexToRgb, rgbToHex } from '../avatar/palette.js';

const S = 16;
const MX = 6; // margem dos lados (tora da borda passa um pouco da celula)
const OVER = 26; // linhas acima da celula (toras altas)
const GY = 12; // linha do chao dentro da celula (base do moirao)
const W = S + MX * 2;
const MB = 10; // linhas abaixo (a diagonal e a corrida vertical passam da borda de baixo)
const H = S + OVER + MB;
const CX = MX + 8; // centro (x) da celula no sprite
const CY = OVER + GY; // chao (y) da celula no sprite

// direcoes: [bit, dx, dy]; "frente" = quem desenha a tora/tabua que cai bem na borda
export const DIRS = [[1, 0, -1], [2, 1, -1], [4, 1, 0], [8, 1, 1], [16, 0, 1], [32, -1, 1], [64, -1, 0], [128, -1, -1]];
const FORWARD = 4 | 8 | 16 | 32;

const WOOD = '#9e6635';
const WOOD_D = '#7d4a2e';
const WOOD_L = '#c08746';
const BARK = '#7a5032';
const CUT = '#d8b07a';
const ROPE = '#b89a5e';

const outline = (hex) => rgbToHex(outlineOf(hexToRgb(hex)));
const T = (hex, t) => tone(hex, Math.max(0, Math.min(4, Math.round(t))));

// Pinta um conjunto de pixels {key: hex} com contorno sepia em volta, por cima do que ja existe
// (o que esta na frente recorta o de tras). skip(x, y): onde NAO por contorno (emenda na borda).
function paint(c, px, skip = () => false) {
  const has = (x, y) => px.has(`${x},${y}`);
  const add = [];
  for (const [k, hex] of px) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
      const nx = x + dx; const ny = y + dy;
      if (!has(nx, ny) && !skip(nx, ny)) add.push([nx, ny, outline(hex)]);
    }
  }
  for (const [x, y, hex] of add) c.set(x, y, hex);
  for (const [k, hex] of px) { const [x, y] = k.split(',').map(Number); c.set(x, y, hex); }
}

// Fora da celula na horizontal: contorno ali faria uma emenda escura com a tabua da vizinha.
const outsideX = (x) => x < MX || x >= MX + S;

// ---------- cerca de madeira ----------
// Moirao: 4 px de largura, tampo claro de 2 linhas, frente com veio; luz da esquerda.
function woodPost(c, tall) {
  const px = new Map();
  const top = CY - tall;
  for (let y = top; y <= CY; y++) {
    for (let k = 0; k < 4; k++) {
      const x = CX - 2 + k;
      let hex;
      if (y - top < 2) hex = T(WOOD_L, y === top ? 3 : (k === 3 ? 1 : 2) + 0.4);
      else {
        let t = [2.6, 2, 2, 1][k];
        if (y === top + 2) t -= 0.6; // sombra do tampo
        if (y >= CY - 1) t -= 0.7; // pe sujo de terra
        if (k === 1 && (y - top) % 5 === 3) t -= 0.6; // veio
        hex = T(WOOD_D, t);
      }
      px.set(`${x},${y}`, hex);
    }
  }
  paint(c, px);
}

// Tabua da cerca no meio-segmento (do centro ate a borda) na direcao [dx, dy], a altura h.
// Tabua = 2 linhas (borda de cima clara). Sem contorno onde ela continua na celula vizinha.
function woodRail(c, dx, dy, h) {
  const px = new Map();
  const plank = (x, y, knot) => { px.set(`${x},${y - 1}`, T(WOOD_L, 2.4 + knot)); px.set(`${x},${y}`, T(WOOD, 1.6 + knot)); };
  if (dx === 0) {
    // corrida vertical: as tabuas vistas de lado viram uma barra fina de 2 px na linha do moirao
    const y0 = (dy < 0 ? OVER : CY) - h - 1;
    const y1 = (dy < 0 ? CY : OVER + S - 1) - h;
    for (let y = y0; y <= y1; y++) {
      const knot = hash(h, y, 9) < 0.08 ? -0.6 : 0;
      px.set(`${CX - 1},${y}`, T(WOOD_L, 2.4 + knot));
      px.set(`${CX},${y}`, T(WOOD, 1.4 + knot));
    }
    paint(c, px, (x, y) => y > y1 || y < y0);
    return;
  }
  // horizontal ou diagonal: coluna a coluna do centro ate a borda (a vizinha continua dali)
  // (diagonal reta de centro a centro, 45 graus; a vizinha comeca no proximo x)
  const last = dx > 0 ? 7 : 8;
  for (let i = 0; i <= last; i++) {
    const x = CX + dx * i;
    const y = CY - h + dy * i;
    plank(x, y, hash(x, y + h, 7) < 0.08 ? -0.6 : 0);
  }
  paint(c, px, (x) => outsideX(x));
}

function drawWood(c, mask) {
  const H1 = 5; const H2 = 10;
  const rails = (pred) => { for (const [bit, dx, dy] of DIRS) if (mask & bit && pred(dy)) { woodRail(c, dx, dy, H1); woodRail(c, dx, dy, H2); } };
  rails((dy) => dy < 0); // tabuas que vao para tras ficam atras do moirao
  rails((dy) => dy === 0);
  // so na vertical: moirao mais baixo para a tabua de lado aparecer entre um e outro
  woodPost(c, !mask || mask & (2 | 4 | 8 | 32 | 64 | 128) ? 13 : 10);
  rails((dy) => dy > 0); // as que vem para frente ficam na frente
}

// ---------- palicada ----------
// Tora pontuda: 4 px de largura, ponta talhada (madeira clara), casca escura com luz na esquerda,
// amarra de corda. (x, y) = pe da tora no sprite.
function log(c, x, y, tall, seed) {
  const px = new Map();
  const top = y - tall;
  const shift = hash(x, y, seed) < 0.5 ? 0 : 1; // ponta torta de leve
  for (let yy = top; yy <= y; yy++) {
    const r = yy - top;
    for (let k = 0; k < 4; k++) {
      const xx = x - 2 + k;
      if (r === 0 && k !== 1 + shift) continue;
      if (r === 1 && (k === 0 || k === 3) && !(k === 3 && shift)) continue;
      let hex;
      if (r <= 1 || (r === 2 && k === 1)) {
        // ponta talhada: faceta clara do lado da luz, escura do outro
        hex = T(CUT, k <= 1 ? 3 - r * 0.4 : 1.6 - (k === 3 ? 0.6 : 0));
      } else {
        let t = [3, 2.2, 1.8, 1][k];
        const band = y - yy;
        if (band === 6 || band === 13) { px.set(`${xx},${yy}`, T(ROPE, [3, 2.4, 2, 1.2][k])); continue; }
        if (band === 7 || band === 14) t -= 0.7; // sombra da amarra
        if (yy >= y - 1) t -= 0.8; // pe na terra
        if (k === 2 && hash(xx, yy, seed + 3) < 0.18) t -= 0.7; // casca rachada
        hex = T(BARK, t);
      }
      px.set(`${xx},${yy}`, hex);
    }
  }
  paint(c, px);
}

const STEPS = { h: 4, v: 4, d: 6 }; // toras por segmento centro-a-centro
function drawPalisade(c, mask, variant) {
  const logs = [[CX, CY, 0]];
  for (const [bit, dx, dy] of DIRS) {
    if (!(mask & bit)) continue;
    const n = dy === 0 ? STEPS.h : dx === 0 ? STEPS.v : STEPS.d;
    for (let k = 1; k < n; k++) {
      const t = k / n;
      if (t > 0.5 || (t === 0.5 && !(FORWARD & bit))) break;
      logs.push([CX + dx * S * t, CY + dy * S * t, k]);
    }
  }
  // de tras para frente (chao mais alto primeiro), esquerda para a direita
  logs.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [x, y] of logs) {
    const gx = Math.round(x); const gy = Math.round(y);
    const tall = 19 + Math.floor(hash(gx, gy, variant + 11) * 3) + (mask ? 0 : 2);
    log(c, gx, gy, tall, variant);
  }
}

// ---------- API ----------
export const FENCE_KIND = { '+': 'madeira', 'Æ': 'palicada' };
export const isFence = (code) => Boolean(FENCE_KIND[code]);

// Mascara de vizinhas (8 bits, DIRS). Diagonal so conta quando as duas ortogonais do meio nao
// sao cerca (senao a quina ja liga e sairia um triangulo).
export function fenceMask(objects, cx, cy, code) {
  const same = (x, y) => objects[y]?.[x] === code;
  let m = 0;
  for (const [bit, dx, dy] of DIRS) {
    if (!same(cx + dx, cy + dy)) continue;
    if (dx && dy && (same(cx + dx, cy) || same(cx, cy + dy))) continue;
    m |= bit;
  }
  return m;
}

// Sprite RGBA da celula (cache por tipo/mascara/variante). ox, oy: onde colar em relacao ao
// canto da celula. shadows: elipses [x, y, rx, ry, alpha] relativas ao canto da celula.
const cache = new Map();
export function fenceSprite(code, mask, variant = 0) {
  const key = `${code}:${mask}:${variant}`;
  let out = cache.get(key);
  if (out) return out;
  const c = fenceCanvas(code, mask, variant);
  const data = new Uint8ClampedArray(W * H * 4);
  c.px.forEach((hex, i) => { if (hex) data.set([...hexToRgb(hex), 255], i * 4); });
  const shadows = [[8.5, GY + 1.5, 3.6, 1.6, 0.42]];
  for (const [bit, dx, dy] of DIRS) {
    if (!(mask & bit)) continue;
    shadows.push([8.5 + dx * 4.5, GY + 1.5 + dy * 4.5, dx ? 4.6 : 2.4, dy ? 3.4 : 1.5, 0.34]);
  }
  out = { w: W, h: H, data, ox: -MX, oy: -OVER, shadows };
  cache.set(key, out);
  return out;
}

export function fenceCanvas(code, mask, variant = 0) {
  const c = canvas(W, H);
  if (FENCE_KIND[code] === 'palicada') drawPalisade(c, mask, variant);
  else drawWood(c, mask);
  return c;
}

// Icone 16x16 da palicada para o editor (trecho reto, encolhido para caber).
export function palisadeIcon() {
  const c = fenceCanvas('Æ', 4 | 64, 1);
  const crop = canvas(S, S + 10);
  for (let y = 0; y < S + 10; y++) for (let x = 0; x < S; x++) crop.set(x, y, c.get(x + MX, y + OVER - 10));
  return toImages([thumbnail(crop)]);
}
