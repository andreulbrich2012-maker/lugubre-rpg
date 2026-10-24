// Agua nova (24/10, "a agua ta muito feia"): pintada em codigo no estilo Stardew (so referencia),
// com 4 quadros CICLICOS (tile.cycle): o quadro 3 emenda no 0, entao correnteza e brilho andam
// sempre para o mesmo lado (no vai-e-volta o rio "voltava"). Tudo e periodico em 16 px: o bloco
// emenda com o vizinho igual sem costura, e o hash usa so a posicao (igual em todo cliente).
// A borda (espuma, anel claro, barranco molhado, pedras do rio, pe da cachoeira) e feita no
// compose.js, porque depende dos vizinhos.
import { canvas, hash, toImages } from './paint.js';

const P = 16;
export const WATER_FRAMES = 4;
const wrap = (v) => ((v % P) + P) % P;
const rnd = (x, y, s) => hash(wrap(x), wrap(y), s);

// Ruido de valor periodico (a grade do ruido divide 16: a textura fecha na borda do bloco).
function pnoise(x, y, cell, s) {
  const n = P / cell;
  const fx = x / cell; const fy = y / cell;
  const ix = Math.floor(fx); const iy = Math.floor(fy);
  const tx = fx - ix; const ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx); const sy = ty * ty * (3 - 2 * ty);
  const g = (i, j) => hash(((i % n) + n) % n, ((j % n) + n) % n, s);
  const a = g(ix, iy); const b = g(ix + 1, iy); const c = g(ix, iy + 1); const d = g(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const tdist = (a, b) => { const d = Math.abs(a - b) % P; return Math.min(d, P - d); };

// Brilho especular que nasce, pisca e anda 2 px antes de sumir (some no quadro 3: sem "pulo").
// set(x, y, hex): o compose espalha estes brilhos por celula (assim nao formam grade).
export const SPARKLE_HEX = ['#effeff', '#a8e4f4'];
export function sparkle(set, x, y, phase) {
  const [hi, mid] = SPARKLE_HEX;
  const p = phase % 4;
  if (p === 0) set(x, y, mid);
  else if (p === 1) { set(x + 1, y, hi); set(x, y, mid); set(x + 2, y, mid); set(x + 1, y - 1, mid); set(x + 1, y + 1, mid); }
  else if (p === 2) { set(x + 2, y, hi); set(x + 3, y, mid); }
}

// Ondinha: risco claro com a sombra embaixo, que oscila (0,1,2,1 px) e respira de tamanho.
function ripple(c, x, y, phase, light, dark, maxLen = 5) {
  const p = phase % 4;
  const dx = [0, 1, 2, 1][p];
  const len = Math.max(2, maxLen - [2, 1, 0, 1][p]);
  for (let k = 0; k < len; k++) c.set(wrap(x + dx + k), wrap(y), light);
  for (let k = 1; k < len - 1; k++) c.set(wrap(x + dx + k), wrap(y + 1), dark);
}

function frames(paint) {
  return Array.from({ length: WATER_FRAMES }, (_, f) => { const c = canvas(P, P); paint(c, f); return c; });
}

// ---------------- agua rasa: turquesa clara, manchas de fundo e caustica fraca ----------------
const SHALLOW = ['#2a8fbe', '#32a0ca', '#3aaed2', '#56c2dc', '#86dce6', '#effeff'];
function shallow(c, f) {
  // caustica: rede de Voronoi periodica que "respira" (pontos giram 0.8 px), so em parte do bloco
  const ang = (f * Math.PI) / 2;
  const pts = Array.from({ length: 4 }, (_, i) => {
    const ph = rnd(i, 7, 11) * Math.PI * 2;
    return [rnd(i, 1, 12) * P + Math.cos(ang + ph) * 0.8, rnd(i, 2, 12) * P + Math.sin(ang + ph) * 0.8];
  });
  for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
    let d1 = 99; let d2 = 99;
    for (const [px, py] of pts) {
      const d = Math.hypot(tdist(x + 0.5, px), tdist(y + 0.5, py));
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const depth = pnoise(x, y, 8, 3) * 0.7 + pnoise(x, y, 4, 4) * 0.3;
    let t = depth < 0.33 ? 0 : depth < 0.66 ? 1 : 2;
    if (d2 - d1 < 0.6 && pnoise(x, y, 8, 19) > 0.45) t = 3;
    c.set(x, y, SHALLOW[t]);
  }
  ripple(c, 2, 3, f, SHALLOW[4], SHALLOW[0], 4);
  ripple(c, 9, 10, f + 2, SHALLOW[4], SHALLOW[0], 5);
}

// ---------------- agua funda: azul escuro com ondinhas espalhadas ----------------
const DEEP = ['#163b78', '#1b4b8f', '#205aa2', '#2d74ba', '#5aa2da', '#d4f0ff'];
function deep(c, f) {
  for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
    // base quase lisa (mancha grande no bloco vira grade no mapa; a variacao larga vem do compose)
    const n = pnoise(x, y, 4, 6);
    c.set(x, y, DEEP[n > 0.8 ? 2 : n < 0.12 ? 0 : 1]);
  }
  ripple(c, 1, 2, f, DEEP[3], DEEP[0], 5);
  ripple(c, 10, 7, f + 1, DEEP[3], DEEP[0], 3);
  ripple(c, 5, 12, f + 2, DEEP[3], DEEP[0], 4);
}

// ---------------- rio: riscos de correnteza que andam 4 px por quadro (fecha em 16) ----------------
const RIVER = ['#2580bb', '#2b90c8', '#36a0d2', '#62c2e6', '#b4eaf6'];
const STREAKS = [[1, 2, 5], [4, 9, 4], [7, 4, 6], [10, 13, 3], [13, 7, 5], [15, 0, 3]];
function river(c, f) {
  for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
    const n = pnoise(x, y, 8, 7) * 0.6 + pnoise(x, y, 4, 8) * 0.4;
    c.set(x, y, RIVER[n < 0.4 ? 0 : n < 0.68 ? 1 : 2]);
  }
  for (const [y, x0, len] of STREAKS) {
    const x = x0 + f * 4;
    for (let k = 0; k < len; k++) c.set(wrap(x + k), y, RIVER[k === 0 || k === len - 1 ? 3 : 4]);
    for (let k = 1; k < len; k++) c.set(wrap(x + k - 1), wrap(y + 1), RIVER[0]);
  }
}

// Pedra do rio com espuma a montante e esteira animada a jusante. set(x, y, hex): serve para o
// canvas do bloco e para o compose (pedras espalhadas por celula). size 0 = pequena, 1 = grande.
const STONE = ['#2c2838', '#5a5468', '#857e90', '#aaa3b0', '#d2ccd2'];
export const FOAM_HEX = '#f2fcff';
export function riverStone(set, cx, cy, size, frame) {
  const rx = size ? 2.6 : 1.9; const ry = size ? 1.8 : 1.3;
  // esteira (V aberto para a direita) e espuma na frente: andam com o quadro
  const k = frame % 4;
  for (let i = 0; i < 3; i++) {
    const d = Math.round(rx) + 1 + i * 2 + (k % 2);
    if (i === 2 && k > 1) continue;
    set(cx + d, cy - 1 - Math.floor(i / 2), i ? RIVER[3] : RIVER[4]);
    set(cx + d, cy + 1 + Math.floor(i / 2), i ? RIVER[3] : RIVER[4]);
  }
  set(cx - Math.round(rx) - 1, cy, FOAM_HEX);
  set(cx - Math.round(rx) - 1, cy - 1 + (k > 1 ? 1 : 0), RIVER[4]);
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const nx = (x + 0.5 - cx) / rx; const ny = (y + 0.5 - cy) / ry;
      const d = nx * nx + ny * ny;
      if (d > 1.55) continue;
      if (d > 1) { set(x, y, STONE[0]); continue; }
      const l = -nx * 0.6 - ny * 0.9;
      set(x, y, STONE[Math.max(1, Math.min(4, Math.round(2.3 + l * 1.3)))]);
    }
  }
}

// ---------------- mar: ondas com crista branca que nasce, quebra e some ----------------
const SEA = ['#124c88', '#165c9c', '#1b6cac', '#2a82be', '#5aaad6', '#a8dcf2', '#effaff'];
function crest(c, x, y, phase) {
  const p = phase % 4;
  const dx = p;
  const arc = [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]];
  if (p === 3) { c.set(wrap(x + dx), y, SEA[4]); c.set(wrap(x + dx + 2), wrap(y + 1), SEA[4]); return; }
  for (const [ax, ay] of arc) {
    const col = p === 1 ? SEA[6] : p === 2 ? (ax % 2 ? SEA[6] : SEA[5]) : SEA[4];
    if (p === 0 && Math.abs(ax) === 2) continue;
    c.set(wrap(x + dx + ax), wrap(y + ay), col);
  }
  for (const ax of [-1, 0, 1]) c.set(wrap(x + dx + ax), wrap(y + 1), SEA[3]); // corpo da onda
  for (const ax of [-2, -1, 0, 1, 2]) c.set(wrap(x + dx + ax), wrap(y + 2), SEA[0]); // cavado
}
function sea(c, f) {
  for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
    // ondulacao larga (faixas suaves) + ruido: o mar nao fica chapado
    const swell = Math.sin(((y + pnoise(x, y, 8, 9) * 4) / P) * Math.PI * 4) * 0.5 + 0.5;
    const n = swell * 0.55 + pnoise(x, y, 4, 10) * 0.45;
    c.set(x, y, SEA[n < 0.34 ? 1 : n < 0.7 ? 2 : 3]);
  }
  crest(c, 2, 2, f);
  crest(c, 10, 9, f + 2);
}

// ---------------- cachoeira: filetes caindo 4 px por quadro ----------------
const FALL = ['#2476b2', '#3292cc', '#4eaee0', '#8ad4f0', '#effaff'];
function waterfall(c, f) {
  for (let x = 0; x < P; x++) {
    const stripe = pnoise(x, 0, 4, 13); // colunas mais claras/escuras (volume da queda)
    for (let y = 0; y < P; y++) {
      const sy = wrap(y - f * 4);
      let t = stripe < 0.35 ? 0 : stripe < 0.7 ? 1 : 2;
      for (let k = 0; k < 2; k++) {
        const y0 = Math.floor(rnd(x, k, 14) * P); const len = 3 + Math.floor(rnd(x, k, 15) * 5);
        const d = wrap(sy - y0);
        if (d < len) t = Math.max(t, d === 0 ? 4 : 3);
      }
      c.set(x, y, FALL[t]);
    }
  }
}

// ---------------- lodo: agua parada esverdeada com bolhas que sobem e estouram ----------------
const MUD = ['#38442a', '#465432', '#53623a', '#647444', '#8c9c5a', '#c2cc8a'];
function bubble(c, x, y, phase) {
  const p = phase % 4;
  if (p === 0) c.set(x, y, MUD[4]);
  else if (p === 1) { c.set(x, y, MUD[5]); c.set(x + 1, y, MUD[4]); c.set(x, y + 1, MUD[4]); c.set(x + 1, y + 1, MUD[1]); }
  else if (p === 2) { c.set(x - 1, y, MUD[4]); c.set(x + 2, y, MUD[4]); c.set(x, y - 1, MUD[4]); c.set(x + 1, y + 2, MUD[4]); }
}
function mud(c, f) {
  for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
    const n = rnd(x, y, 16);
    // brilho oleoso: faixa diagonal fina que desliza 4 px por quadro (fecha em 16)
    const sheen = wrap(x + y - f * 4) === 0 && pnoise(x, y, 8, 18) > 0.6;
    c.set(x, y, sheen ? MUD[3] : MUD[n < 0.12 ? 0 : n > 0.88 ? 2 : 1]);
  }
  bubble(c, 4, 5, f);
  bubble(c, 11, 10, f + 2);
  c.set(13, 3, MUD[4]); c.set(2, 12, MUD[3]); c.set(8, 14, MUD[0]); c.set(9, 14, MUD[0]);
}

// Monta o bloco no formato do catalogo (paleta unica para os 4 quadros).
function waterTile(def, paint, extra) {
  const { images, palette } = toImages(frames((c, f) => { paint(c, f); if (extra) extra(c, f); }));
  return { solid: false, ...def, cycle: true, frames: images, pixels: images[0], palette };
}

const stonesIcon = (c, f) => {
  const set = (x, y, hex) => { if (x >= 0 && y >= 0 && x < P && y < P) c.set(x, y, hex); };
  riverStone(set, 4, 4, 1, f);
  riverStone(set, 10, 11, 0, f);
};

export function waterTiles() {
  const riverTile = waterTile({ code: '0', name: 'Rio com pedras', category: 'Água', layer: 'ground' }, river, stonesIcon);
  // so a correnteza (sem pedras): o compose espalha pedras diferentes por celula
  const bare = toImages(frames(river));
  riverTile.bare = { frames: bare.images, palette: bare.palette };
  return {
    '~': waterTile({ code: '~', name: 'Água rasa', category: 'Água', layer: 'ground' }, shallow),
    W: waterTile({ code: 'W', name: 'Água funda', category: 'Água', layer: 'ground', solid: true }, deep),
    0: riverTile,
    V: waterTile({ code: 'V', name: 'Cachoeira', category: 'Água', layer: 'ground', solid: true }, waterfall),
    'ó': waterTile({ code: 'ó', name: 'Mar', category: 'Água', layer: 'ground', solid: true }, sea),
    'ô': waterTile({ code: 'ô', name: 'Lodo', category: 'Água', layer: 'ground' }, mud)
  };
}
export const WATER_TILES = waterTiles();
