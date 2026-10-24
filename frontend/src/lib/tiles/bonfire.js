// Fogueira grande da praca (24/10, pedido do Andre): anel de pedras, lenha em pe (tipi),
// pilha de toras do lado e chamas altas animadas. Estilo Stardew (nunca copiado): luz do
// alto-esquerda, rampas quentes, contorno sepia.
// Como anima: o mapa so troca quadros de 16x16 na celula ancora (render.js), entao o fogo fica
// centrado na ancora e o sprite grande (pedras dos lados, toras, faiscas) e estatico. Os 3
// quadros sao o recorte da ancora de cada desenho; o estatico guarda so o que e igual nos 3.
import { canvas, tone, hash, toImages } from './paint.js';
import { blob } from './solid.js';

const DROP = 7; // o sprite desce 7 px: o fogo inteiro (16 px de altura) cabe na celula ancora
const W = 44;
const H = 44;
const AX = 14; // canto da celula ancora dentro do sprite
const AY = H - 1 - (15 + DROP);
const CX = AX + 8; // centro do fogo
const GY = AY + 17; // chao no centro do anel (as pedras da frente passam um pouco da ancora)
const FB = AY + 15; // base das chamas

const STONE = '#8a8494';
const STONE_W = '#9a8a7c';
const WOOD = '#8a5634';
const WOOD_L = '#b8804a';
const CUT = '#d8b07a';
const CHAR = '#3e2c2a';
const T = (hex, t) => tone(hex, Math.max(0, Math.min(4, Math.round(t))));

// Tora inclinada (2 px): lado esquerdo iluminado, ponta de cima queimada.
function stick(c, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n); const y = Math.round(y0 + ((y1 - y0) * i) / n);
    const burnt = i / n > 0.62;
    c.set(x, y, burnt ? T(CHAR, 2) : T(WOOD_L, 2.6));
    c.set(x + 1, y, burnt ? T(CHAR, 1) : T(WOOD, 1.4));
  }
}

// Chama: (cx, yb) = base, h = altura, w = meia largura, sway = entortar a ponta.
function flame(c, cx, yb, h, w, sway, hot = true) {
  for (let y = 0; y < h; y++) {
    const k = y / h;
    const half = w * Math.sqrt(1 - k) * (1 - k * 0.35);
    const mid = cx + sway * k * k * 2;
    for (let x = Math.floor(mid - half); x <= Math.ceil(mid + half - 1); x++) {
      const d = Math.abs(x + 0.5 - mid) / Math.max(half, 0.5);
      let col;
      if (hot && d < 0.38 && k < 0.55) col = k < 0.2 ? '#fff4c0' : '#ffe48a';
      else if (d < 0.72 && k < 0.8) col = '#ffb64a';
      else col = k > 0.55 || d > 0.9 ? '#e8642a' : '#f08a30';
      c.set(x, yb - y, col);
    }
  }
}

function draw(f) {
  const c = canvas(W, H);
  // chao queimado com cinza
  for (let y = GY - 6; y <= GY + 6; y++) for (let x = CX - 15; x <= CX + 15; x++) {
    const d = ((x + 0.5 - CX) / 13) ** 2 + ((y + 0.5 - GY) / 5) ** 2;
    if (d > 1) continue;
    c.set(x, y, hash(x, y, 4) < 0.16 ? T('#8a8088', 2) : T('#4e3c38', d > 0.7 ? 1.4 : 2));
  }
  // pedras do anel: as de tras primeiro
  const stones = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + 0.11;
    stones.push([CX + Math.cos(a) * 15, GY + Math.sin(a) * 5.6, k]);
  }
  const ring = (front) => {
    for (const [x, y, k] of stones.filter((s) => (s[1] > GY) === front).sort((a, b) => a[1] - b[1])) {
      blob(c, x, y, 2.8 + (k % 3) * 0.35, 2.2, k % 2 ? STONE : STONE_W, { spec: true });
    }
  };
  ring(false);
  // brasas fixas no fundo do anel
  for (let k = 0; k < 10; k++) {
    const x = CX - 8 + Math.floor(hash(k, 1, 5) * 17); const y = GY - 2 + Math.floor(hash(k, 2, 5) * 4);
    c.set(x, y, k % 3 === 0 ? '#ffd04a' : k % 3 === 1 ? '#f07c2e' : '#b83a26');
  }
  // tipi de lenha: toras de tras, fogo, toras da frente
  const py = GY - 13;
  stick(c, CX - 8, GY - 1, CX - 1, py);
  stick(c, CX + 7, GY - 1, CX, py);
  stick(c, CX - 1, GY - 3, CX, py - 1);
  const sway = [0, 1, -1][f];
  flame(c, CX - 5, FB, 9 + [1, 0, 3][f], 3, -1 + sway * 0.5);
  flame(c, CX + 5, FB, 9 + [3, 1, 0][f], 3, 1 + sway * 0.5);
  flame(c, CX, FB, 16, 6.6, sway);
  // brasas que pulsam (so dentro da ancora)
  for (let k = 0; k < 5; k++) c.set(CX - 6 + k * 3, FB - (k + f) % 2, (k + f) % 3 ? '#ffe48a' : '#ffb64a');
  stick(c, CX - 7, GY + 3, CX - 4, GY - 5);
  stick(c, CX + 5, GY + 3, CX + 3, GY - 5);
  // tora deitada na frente (ponta cortada clara)
  for (let x = CX - 8; x <= CX + 7; x++) {
    c.set(x, GY + 1, T(WOOD_L, 3)); c.set(x, GY + 2, T(WOOD, hash(x, 1, 6) < 0.2 ? 1 : 2)); c.set(x, GY + 3, T(WOOD, 1));
  }
  c.set(CX - 9, GY + 1, T(CUT, 3)); c.set(CX - 9, GY + 2, T(CUT, 2)); c.set(CX - 9, GY + 3, T(CUT, 1)); c.set(CX - 10, GY + 2, T(CUT, 3));
  c.set(CX + 7, GY + 1, '#ffb64a'); c.set(CX + 7, GY + 2, '#f07c2e'); c.set(CX + 8, GY + 2, T(CHAR, 1));
  ring(true);
  // pilha de toras do lado (pontas cortadas com aneis)
  for (const [x, y] of [[36, 40], [40.5, 40], [38.2, 36.6]]) {
    blob(c, x, y, 2.4, 2.2, CUT, { spec: false });
    c.set(Math.round(x - 0.5), Math.round(y - 0.5), T(WOOD, 1));
    c.set(Math.round(x + 1.5), Math.round(y), T(WOOD, 1.6));
  }
  // faiscas subindo (acima da ancora: paradas, a luz e que pisca)
  c.outline();
  for (const [x, y, col] of [[20, 18, '#ffd04a'], [25, 14, '#ffb64a'], [18, 10, '#ffe48a'], [24, 7, '#f07c2e'], [21, 3, '#ffb64a']]) c.set(x, y, col);
  return c;
}

export function bonfireTile() {
  const full = [0, 1, 2].map(draw);
  // estatico: so os pixels iguais nos 3 quadros (o fogo entra pelos quadros da ancora)
  const still = canvas(W, H);
  for (let i = 0; i < W * H; i++) if (full.every((c) => c.px[i] === full[0].px[i])) still.px[i] = full[0].px[i];
  const crops = full.map((src) => {
    const c = canvas(16, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) c.set(x, y, src.get(AX + x, AY + y));
    return c;
  });
  const { images, palette } = toImages(crops);
  return {
    code: 'È', name: 'Fogueira grande', category: 'Decoração', layer: 'objects', solid: true, light: '#f29a40',
    frames: images, pixels: images[0], palette, big: still, foot: [[0, 0]], span: [1, 1], drop: DROP, shadowW: 36
  };
}
