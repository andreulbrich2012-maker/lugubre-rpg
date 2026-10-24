// Moldura + fundo 24x24 por elemento. Base comum (contorno escuro colorido, faixa de 2px
// chanfrada com luz no canto superior esquerdo, sombra interna) e uma decoracao propria
// por elemento para que cada um seja reconhecido de relance, mesmo pequeno.
import { N, blank, hash2 } from './pixels.js';
import { paletteOf, charColor } from './palette.js';

const LAST = N - 1;
const ring = (x, y) => Math.min(x, y, LAST - x, LAST - y);
// lado da moldura mais proximo: cima/esquerda recebem luz
const litSide = (x, y) => Math.min(x, y) <= Math.min(LAST - x, LAST - y);

function put(L, x, y, c) {
  if (c && x >= 0 && y >= 0 && x < N && y < N) L.px[y * N + x] = c;
}
function get(L, x, y) {
  return x >= 0 && y >= 0 && x < N && y < N ? L.px[y * N + x] : null;
}
// Carimba uma grade de texto nos quatro cantos (espelhada).
function corners(L, grid, P, which = 'tl tr bl br') {
  const h = grid.length, w = grid[0].length;
  for (const k of which.split(' ')) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = charColor(grid[y][x], P);
      if (!c) continue;
      const X = k[1] === 'l' ? x : LAST - x;
      const Y = k[0] === 't' ? y : LAST - y;
      put(L, X, Y, c);
    }
  }
}

// Fundo: banda clara atras do simbolo, escurecendo para baixo-direita.
function background(L, P, center = 11.5) {
  for (let y = 1; y < LAST; y++) for (let x = 1; x < LAST; x++) {
    const d = Math.hypot(x - center + 1, y - center + 1);
    const lv = d < 5.5 ? 2 : d < 10 ? 1 : 0;
    put(L, x, y, P.bg[(x + y > 30 && lv > 0) ? lv - 1 : lv]);
  }
}

function baseFrame(L, P) {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const k = ring(x, y);
    if (k === 0) put(L, x, y, P.outline);
    else if (k === 1) put(L, x, y, litSide(x, y) ? P.frame[3] : P.frame[1]);
    else if (k === 2) put(L, x, y, litSide(x, y) ? P.frame[2] : P.frame[1]);
    else if (k === 3 && litSide(x, y)) put(L, x, y, P.bg[0]); // a moldura projeta sombra para dentro
  }
  // cantos arredondados
  for (const [x, y] of [[0, 0], [LAST, 0], [0, LAST], [LAST, LAST]]) put(L, x, y, null);
  for (const [x, y] of [[1, 1], [LAST - 1, 1], [1, LAST - 1], [LAST - 1, LAST - 1]]) put(L, x, y, P.outline);
}

// ---- decoracoes por elemento ----
const DECOR = {
  // Gaia: madeira com veios e tufos de folha nos cantos
  gaia(L, P) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const k = ring(x, y);
      if ((k === 1 || k === 2) && hash2(x, y, 3) < 0.16) put(L, x, y, P.frame[0]);
    }
    corners(L, [
      '.K0K....',
      'K232K...',
      '03442K..',
      'K2443K..',
      '.K232...',
      '..K.....'
    ], P, 'tl br');
    corners(L, ['.KK.', 'K32K', 'K21K', '.KK.'], P, 'tr bl');
    for (const [x, y] of [[6, 17], [17, 6], [15, 18], [5, 9]]) put(L, x, y, P.bg[3]);
  },
  // Tartaro: basalto rachado com brasa vazando e fagulhas subindo
  tartaro(L, P) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const k = ring(x, y);
      if ((k === 1 || k === 2) && hash2(x, y, 7) < 0.13) put(L, x, y, k === 1 ? P.magic[3] : P.magic[1]);
      if (k >= 1 && k <= 2 && y >= LAST - 2) put(L, x, y, k === 1 ? P.magic[1] : P.magic[2]); // lava embaixo
    }
    for (const [x, y, c] of [[5, 19, 4], [8, 17, 3], [17, 19, 4], [19, 15, 3], [4, 14, 2], [15, 16, 2]]) put(L, x, y, P.magic[c]);
    corners(L, ['KK..', 'KD3.', '.3..'], P, 'tl tr');
  },
  // Erebo: pedra violeta com fumaca de sombra nos cantos e luas
  erebo(L, P) {
    const wisp = [[4, 15], [5, 16], [5, 17], [6, 18], [4, 18], [3, 17], [18, 4], [17, 5], [18, 6], [19, 7], [16, 4], [19, 5]];
    for (const [x, y] of wisp) put(L, x, y, P.bg[3]);
    for (const [x, y] of [[4, 19], [3, 16], [19, 4], [16, 3]]) put(L, x, y, P.bg[2]);
    corners(L, ['.KKK.', 'K43K.', 'K3K..', 'K3K..', '.K...'], P, 'tl br');
  },
  // Nix: moldura de gelo, cristais nos cantos, estrelas no ceu noturno
  nix(L, P) {
    for (let x = 2; x < LAST - 1; x++) if (x % 3 === 0) put(L, x, 1, P.second[4]);
    for (let y = 2; y < LAST - 1; y++) if (y % 3 === 0) put(L, 1, y, P.second[4]);
    corners(L, [
      '.KK...',
      'KEWK..',
      'KWEDK.',
      '.KDCK.',
      '..KK..'
    ], P);
    for (const [x, y] of [[5, 6], [18, 9], [7, 18], [16, 17], [12, 4], [4, 12]]) put(L, x, y, P.second[3]);
    for (const [x, y] of [[17, 4], [16, 5], [18, 5], [17, 6]]) put(L, x, y, P.second[2]);
    put(L, 17, 5, P.white);
  },
  // Eter: prata-azulada com aureola dourada no topo e raios de luz caindo
  eter(L, P) {
    for (let y = 3; y < 19; y++) for (let x = 3; x < LAST - 2; x++) {
      if ((x - y + 40) % 6 === 0 && x + y < 26 && get(L, x, y) && ring(x, y) >= 3) put(L, x, y, P.bg[3]);
    }
    const halo = [
      '...KKKKKK...',
      '.KKCDEEDCKK.',
      'KCDK....KDCK'
    ];
    halo.forEach((row, y) => [...row].forEach((ch, x) => put(L, 6 + x, y, charColor(ch, P))));
    corners(L, ['.K.', 'KWK', '.K.'], P, 'bl br');
  },
  // Caos: carmesim com borda serrilhada irregular e fendas brilhando
  caos(L, P) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const k = ring(x, y);
      if (k === 1 && hash2(x, y, 11) < 0.22) put(L, x, y, P.outline); // dentes quebrados
      if (k === 2 && hash2(x, y, 12) < 0.15) put(L, x, y, P.second[3]);
    }
    const crack = [[3, 6], [4, 7], [4, 8], [5, 9], [20, 13], [19, 14], [19, 15], [18, 16], [17, 17], [9, 20], [10, 19], [14, 3], [13, 4]];
    for (const [x, y] of crack) put(L, x, y, P.magic[2]);
    corners(L, ['KK.', 'K4K', '.K.'], P, 'tr bl');
  },
  // Ponto: azul real geometrico, trelica de losangos e joias nos cantos e meios
  ponto(L, P) {
    for (let y = 3; y < LAST - 2; y++) for (let x = 3; x < LAST - 2; x++) {
      if ((x + y) % 6 === 0 || (x - y + 48) % 6 === 0) {
        const c = get(L, x, y);
        if (c === P.bg[0]) continue;
        put(L, x, y, c === P.bg[2] ? P.bg[3] : P.bg[2]);
      }
    }
    for (let i = 3; i < LAST - 2; i += 2) { put(L, i, 1, P.frame[4]); put(L, 1, i, P.frame[4]); }
    const gem = ['.K.', 'KEK', '.K.'];
    corners(L, ['KKK.', 'KEDK', 'KDK.', '.K..'], P);
    for (const [x, y] of [[10, 0], [10, LAST - 2], [0, 10], [LAST - 2, 10]]) {
      gem.forEach((row, j) => [...row].forEach((ch, i) => put(L, x + i + (x === 10 ? 0.5 : 0) | 0, y + j, charColor(ch, P))));
    }
  },
  // Ananque: ouro com dentes de engrenagem, rebites e mostrador de relogio ao fundo
  ananque(L, P) {
    for (let i = 2; i < LAST - 1; i++) {
      if (i % 4 < 2) continue;
      // vao entre dentes: o contorno desce uma linha
      for (const [x, y, x2, y2] of [[i, 0, i, 1], [i, LAST, i, LAST - 1], [0, i, 1, i], [LAST, i, LAST - 1, i]]) {
        put(L, x, y, null);
        put(L, x2, y2, P.outline);
      }
    }
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const r = k % 3 === 0 ? 7.2 : 7.6;
      const x = Math.round(11.5 + Math.cos(a) * r), y = Math.round(11.5 + Math.sin(a) * r);
      put(L, x, y, k % 3 === 0 ? P.magic[2] : P.bg[3]);
    }
    corners(L, ['....', '.KK.', '.KWK', '..K.'].map((r) => r), P);
    for (const [x, y] of [[2, 2], [LAST - 2, 2], [2, LAST - 2], [LAST - 2, LAST - 2]]) put(L, x, y, P.frame[4]);
  },
  // Hemera: ouro-branco, aurora em faixas e sol nascendo no horizonte
  hemera(L, P) {
    for (let y = 3; y < LAST - 2; y++) for (let x = 3; x < LAST - 2; x++) {
      const band = y < 8 ? P.second[1] : y < 12 ? P.bg[3] : y < 16 ? P.bg[2] : P.bg[1];
      const a = Math.atan2(y - 21, x - 11.5);
      const ray = Math.floor((a + Math.PI) / (Math.PI / 9)) % 2 === 0 && y < 17;
      put(L, x, y, ray ? (y < 8 ? P.second[2] : y < 12 ? P.second[1] : P.bg[3]) : band);
      const d = Math.hypot(x - 11.5, y - 21);
      if (d < 3.6) put(L, x, y, d < 2.2 ? P.white : P.magic[3]);
    }
    for (let x = 3; x < LAST - 2; x++) put(L, x, 3, P.second[1]); // sombra interna no topo
    for (let y = 3; y < LAST - 2; y++) put(L, 3, y, P.bg[1]);
    corners(L, ['....', '.KK.', '.KWK', '..K.'], P, 'tl tr');
  },
  arcano(L, P) {
    for (const [x, y] of [[5, 5], [18, 5], [5, 18], [18, 18]]) put(L, x, y, P.bg[3]);
  },
  // tecnica sem elemento: moldura de ferro rebitada sobre couro
  arma(L, P) {
    for (const [x, y] of [[2, 2], [LAST - 2, 2], [2, LAST - 2], [LAST - 2, LAST - 2], [11, 1], [12, 1], [1, 11], [1, 12], [11, LAST - 1], [12, LAST - 1], [LAST - 1, 11], [LAST - 1, 12]]) {
      put(L, x, y, P.frame[4]);
    }
    for (let i = 4; i < LAST - 3; i += 2) put(L, i, LAST - 4, P.bg[1]); // costura do couro
  }
};

const memo = new Map();
// Camada base (fundo + moldura) de um estilo; memorizada porque e igual para todo icone do elemento.
export function frameLayer(styleId) {
  const P = paletteOf(styleId);
  if (memo.has(P.id)) {
    const src = memo.get(P.id);
    return { w: N, h: N, px: src.px.slice() };
  }
  const L = blank();
  background(L, P);
  baseFrame(L, P);
  (DECOR[P.id] || DECOR.arcano)(L, P);
  memo.set(P.id, { w: N, h: N, px: L.px.slice() });
  return L;
}

export const FRAME_STYLES = Object.keys(DECOR);
