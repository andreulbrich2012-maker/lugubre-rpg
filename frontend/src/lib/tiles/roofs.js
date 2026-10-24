// Telhados das construcoes em pixel art, gerados por codigo (16 px por celula, como os blocos).
// Telhado de duas aguas visto de cima: cumeeira no meio, metade de cima iluminada (luz do
// alto-esquerda), metade de baixo na sombra, beiral escuro em volta.
import { SIZE } from './catalog.js';
import { cellHash } from './render.js';

// Cada material em 2 cores (plano de arte): o desenho (fiadas, palha, lajes, tabuas) e o mesmo.
export const ROOFS = ['telha', 'telha-azul', 'palha', 'palha-escura', 'ardosia', 'ardosia-verde', 'madeira', 'madeira-escura'];
export const ROOF_LABEL = {
  telha: 'Telha', 'telha-azul': 'Telha azul', palha: 'Palha', 'palha-escura': 'Palha escura',
  ardosia: 'Ardósia', 'ardosia-verde': 'Ardósia verde', madeira: 'Madeira', 'madeira-escura': 'Madeira escura'
};
const MATERIAL = (roof) => roof.split('-')[0];

// 0 contorno, 1 sombra, 2 base, 3 meio, 4 luz, 5 cumeeira
const PAL = {
  telha: ['#3a1424', '#7a2a2a', '#a8402e', '#cc5e36', '#e88a4a', '#f6b874'],
  palha: ['#3d2a1c', '#8a6430', '#b48a40', '#d4ac54', '#ecc970', '#fae49a'],
  ardosia: ['#1e1a34', '#33385c', '#455078', '#5a6a94', '#7c8eb4', '#a8b8d4'],
  madeira: ['#2e1a22', '#5c3328', '#7d4a2e', '#9e6635', '#c08746', '#e0ad66'],
  'telha-azul': ['#1a1a3a', '#2a3a6a', '#3a5a9a', '#4e78b8', '#74a0d4', '#a8c8ec'],
  'palha-escura': ['#2a1e18', '#5e4426', '#7e5e30', '#9e7a3c', '#bc9850', '#d8b870'],
  'ardosia-verde': ['#142a26', '#22423a', '#2f5a4c', '#3e7462', '#5e9680', '#8cbca4'],
  'madeira-escura': ['#1e1218', '#3a2222', '#523026', '#6a4030', '#86563a', '#a8744c']
};
const RGB = Object.fromEntries(Object.entries(PAL).map(([k, list]) => [k, list.map((h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
})]));

// Tom (1..4) do material no pixel (x, y) da agua do telhado; ty = linha dentro da agua.
function shade(roof, x, y, ty) {
  const n = cellHash(x, y) % 16;
  if (roof === 'telha') {
    // telha capa-canal: emenda so na metade de baixo da fiada (ponta arredondada, nao tijolo)
    const row = Math.floor(ty / 4);
    const u = (x + (row % 2) * 3) % 6;
    if (ty % 4 === 3 ? u !== 2 && u !== 3 : ty % 4 === 2 && u === 0) return 1;
    return u === 2 || (u === 3 && ty % 4 < 2) ? 4 : n < 3 ? 2 : 3;
  }
  if (roof === 'palha') {
    // fios verticais de palha com faixas de amarracao
    if (ty % 6 === 5) return n < 8 ? 1 : 2;
    const fiber = cellHash(x, 7) % 4;
    return fiber === 0 ? 2 : fiber === 3 && n < 6 ? 4 : 3;
  }
  if (roof === 'ardosia') {
    const row = Math.floor(ty / 5);
    if (ty % 5 === 4 || (x + (row % 2) * 4) % 8 === 0) return 1;
    return ty % 5 === 0 ? 4 : n < 2 ? 2 : 3;
  }
  // madeira: tabuas no sentido da agua, emendas pretas e juntas espacadas
  if (x % 5 === 0) return 1;
  if ((ty + (Math.floor(x / 5) * 7)) % 13 === 0) return 1;
  return x % 5 === 1 ? 4 : n < 3 ? 2 : 3;
}

// O telhado cobre a construcao menos a ultima fileira: a frente (parede com porta e janelas)
// continua a vista, como casa de RPG vista de cima, e o beiral joga sombra nela.
export const EAVE_SHADOW = 4;
export const roofRows = (h) => Math.max(2, h - 1);

// Pura: {width, height, data} RGBA do telhado (w*16 x (h-1)*16 + sombra do beiral).
export function roofPixels({ w, h, roof }) {
  const kind = PAL[roof] ? roof : 'telha';
  const mat = MATERIAL(kind);
  const pal = RGB[kind];
  const width = w * SIZE;
  const body = roofRows(h) * SIZE;
  const height = body + EAVE_SHADOW;
  const data = new Uint8ClampedArray(width * height * 4);
  const mid = Math.floor(body / 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (y >= body) {
        // sombra do beiral na parede da frente, some para baixo
        data[i] = 30; data[i + 1] = 16; data[i + 2] = 40; data[i + 3] = 150 - (y - body) * 32;
        continue;
      }
      let c;
      if (x === 0 || y === 0 || x === width - 1 || y === body - 1) c = pal[0];
      else if (y === mid - 1 || y === mid) c = pal[y === mid - 1 ? 5 : 4]; // cumeeira
      else if (y === mid + 1) c = pal[0]; // sombra da cumeeira na agua de baixo
      else {
        const top = y < mid;
        // agua de cima conta da cumeeira para cima (fiadas descem para o beiral)
        const ty = top ? mid - 1 - y : y - mid - 2;
        let tone = shade(mat, x, y, ty);
        if (!top) tone = Math.max(1, tone - 1); // agua de baixo na sombra
        if (y <= 1 || x <= 1 || x >= width - 2) tone = Math.max(1, tone - 1); // beiral
        if (y >= body - 3) tone = 1;
        c = pal[tone];
      }
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
    }
  }
  // chamine de pedra na agua de cima, a direita (casa com 5+ celulas): da escala de casa de vila.
  // 8x13 com tampa larga escura, tijolos em fiadas e sombra projetada na telha a direita
  if (w >= 5) {
    const cx0 = width - 26; const cy0 = Math.max(0, mid - 14);
    const B = [[46, 30, 40], [96, 58, 52], [140, 82, 64], [178, 112, 82], [206, 146, 108]];
    const put = (x, y, rgb) => { if (x >= 0 && y >= 0 && x < width && y < body) data.set([...rgb, 255], (y * width + x) * 4); };
    for (let y = cy0 + 2; y < cy0 + 13; y++) for (let x = cx0; x < cx0 + 8; x++) {
      const row = Math.floor((y - cy0 - 2) / 3); const mortar = (y - cy0 - 2) % 3 === 2 || (x - cx0 + (row % 2) * 2) % 4 === 3;
      put(x, y, x === cx0 ? B[0] : x === cx0 + 7 ? B[0] : mortar ? B[1] : x <= cx0 + 2 ? B[3] : B[2]);
    }
    for (let x = cx0 - 1; x < cx0 + 9; x++) { put(x, cy0, B[0]); put(x, cy0 + 1, x === cx0 - 1 || x === cx0 + 8 ? B[0] : B[4]); }
    for (let y = cy0 + 3; y < cy0 + 13; y++) for (const x of [cx0 + 8, cx0 + 9]) {
      const i = (y * width + x) * 4; if (y < body) { data[i] *= 0.7; data[i + 1] *= 0.7; data[i + 2] *= 0.75; }
    }
  }
  return { width, height, data };
}

// Para a casa 3D (house3d.js): mesmas cores e o mesmo desenho de fiadas do telhado.
export const ROOF_RGB = RGB;
export const roofShade = (roof, x, y, ty) => shade(MATERIAL(PAL[roof] ? roof : 'telha'), x, y, ty);
