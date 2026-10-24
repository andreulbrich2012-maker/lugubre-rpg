// Construcao vista de fora em perspectiva 3/4 (estilo Stardew): fachada em pe com porta e
// janelas, telhado inclinado que sobe acima da pegada no mapa e sombra no chao. Gerada em
// codigo a partir da construcao do mapa ({x,y,w,h,roof,wall,locked,door}); puro (sem DOM).
import { SIZE } from './catalog.js';
import { ROOF_RGB, roofShade } from './roofs.js';
import { ramp, hexToRgb } from '../avatar/palette.js';
import { cellHash } from './render.js';
import { styleRgb } from './styles.js';

export const WALLS = ['enxaimel', 'madeira', 'pedra', 'tijolo'];
export const WALL_LABEL = { enxaimel: 'Enxaimel (reboco e vigas)', madeira: 'Madeira', pedra: 'Pedra', tijolo: 'Tijolo' };
const WALL_BASE = { enxaimel: '#e6d8b8', madeira: '#a86e3c', pedra: '#8c8698', tijolo: '#b4563c' };
const TIMBER = '#5c3828';

const RISE = 20; // quanto o telhado sobe acima da pegada (px de arte)
const SHADOW = 5; // sombra no chao abaixo da fachada

// Material da parede padrao: combina com o telhado.
export function wallOf(b) {
  if (WALLS.includes(b.wall)) return b.wall;
  return { palha: 'madeira', 'palha-escura': 'madeira', ardosia: 'pedra', 'ardosia-verde': 'pedra', madeira: 'madeira', 'madeira-escura': 'madeira' }[b.roof] || 'enxaimel';
}

const tones = (hex) => ramp(hex).map(hexToRgb);

// Coluna da porta (relativa a construcao): a declarada ou a do mapa, senao o meio.
export function doorColumn(b, tiles) {
  if (b.door) return Math.max(0, Math.min(b.w - 1, b.door.x - b.x));
  const g = tiles?.layers?.ground || [];
  const DOORS = 'DX(?]';
  for (let x = b.x; x < b.x + b.w; x++) if (DOORS.includes(g[b.y + b.h - 1]?.[x])) return x - b.x;
  return Math.floor(b.w / 2);
}

// Pura: {width, height, data, offsetY}. offsetY (px de arte) = onde o sprite comeca acima da pegada.
// Camadas (de tras para frente): agua de tras do telhado, agua da frente com fiadas, tabuas de
// acabamento nas bordas, frontao sobre a porta, chamine; fachada com tabuas de canto,
// fundacao, janelas com venezianas e floreira, porta com batente e lampiao; contorno escuro
// em volta de tudo; sombra no chao; luz da cena (janelas e lampiao continuam acesos).
const RISE_PX = 24;
const PATH_PX = 10; // caminho de pedras que sai da porta (desenhado no chao, abaixo da pegada)
// style: estilo global do mapa (styles.js; o Board passa scene.tiles.style), antes da luz.
export function housePixels(b, tiles, { light = 'dia', style } = {}) {
  const W = b.w * SIZE;
  const H = b.h * SIZE;
  const T = H + RISE_PX + Math.max(SHADOW, PATH_PX);
  const rgb = new Array(W * T).fill(null);
  const glow = new Uint8Array(W * T);
  const put = (x, y, c, lit = false) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= T || !c) return;
    rgb[y * W + x] = c;
    glow[y * W + x] = lit ? 1 : 0;
  };
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < T ? rgb[y * W + x] : null);
  const hash = (x, y, sv = 0) => cellHash(x * 7 + sv * 131 + b.x * 17, y * 13 + b.y * 29);
  const clampT = (t) => Math.max(0, Math.min(4, Math.round(t)));

  const wall = wallOf(b);
  const WT = tones(WALL_BASE[wall]);
  const trimHex = wall === 'enxaimel' || wall === 'tijolo' ? '#efe4cc' : wall === 'pedra' ? '#7a5a3e' : '#5c3a28';
  const TR = tones(trimHex);
  const TT = tones(TIMBER);
  const ST = tones('#7e7690');
  const roof = ROOF_RGB[b.roof] ? b.roof : 'telha';
  const RT = ROOF_RGB[roof];
  const SHUT = tones(['#3e6e94', '#4e8a3e', '#9a3a3a', '#5a4a8a'][hash(1, 2, 3) % 4]);

  const groundY = H + RISE_PX - 1;
  const F = Math.max(28, Math.min(46, Math.round(H * 0.58)));
  const facadeTop = groundY - F + 1;
  const fx0 = 3;
  const fx1 = W - 4;
  const eaveY = facadeTop + 1;
  const topY = 1;
  const ridgeY = Math.round(topY + (eaveY - topY) * 0.22);
  const dc = doorColumn(b, tiles);
  const doorCx = dc * SIZE + SIZE / 2;

  // ---------- telhado ----------
  // Bordas retas (beiral lateral), cantos de cima arredondados. A agua da frente e feita de
  // fiadas de telhas sobrepostas (escamas): cada telha tem a ponta de baixo arredondada e
  // projeta sombra na fiada de baixo; fiadas desencontradas. Palha/madeira usam o desenho do material.
  const scale = roof.startsWith('palha') || roof.startsWith('madeira') ? 'fibra' : 'escama';
  for (let y = topY; y <= eaveY; y++) {
    const l = y === topY ? 3 : y === topY + 1 ? 1 : 0;
    const r = W - 1 - l;
    for (let x = l; x <= r; x++) {
      let t;
      if (y < ridgeY) {
        t = (y - topY) < 1 ? 2 : 1.4 + ((x + y * 3) % 7 === 0 ? -0.6 : (x * 5 + y) % 11 === 0 ? 0.6 : 0); // agua de tras, mais escura
      } else if (y <= ridgeY + 1) {
        t = y === ridgeY ? 5 : 3.5; // cumeeira
      } else if (scale === 'escama') {
        const k = eaveY - 2 - y; // 0 = fiada de baixo
        const course = Math.floor(k / 4);
        const rr = k % 4; // 0 = ponta de baixo da telha
        const u = (x + (course % 2) * 3) % 6; // telha de 6 px de largura
        if (rr === 0) t = u === 0 || u === 5 ? 0.6 : 2.2; // ponta arredondada: cantos na sombra
        else if (rr === 3) t = u === 0 ? 1 : 3.2; // topo da telha pega luz
        else t = u === 0 ? 1.2 : rr === 2 ? 2.8 : 2.3;
        if (u === 1 && rr >= 1) t += 0.7; // brilho na borda esquerda de cada telha
      } else {
        // palha/madeira: fibras verticais com amarras horizontais a cada 6 px
        const k = eaveY - 2 - y;
        const tex = roofShade(roof, x, y, k);
        t = k % 6 === 0 ? 1 : tex >= 3 ? 3 : tex <= 1 ? 1.6 : 2.3;
      }
      if (y > ridgeY + 1 && y <= ridgeY + 3) t += 0.5;
      if (x < l + 5) t += 0.5;
      if (x > r - 7) t -= 0.6;
      put(x, y, RT[Math.max(0, Math.min(5, Math.round(t)))]);
    }
    // tabua de acabamento nas laterais (2 px)
    if (y > topY + 1) { put(l, y, TR[1]); put(l + 1, y, TR[3]); put(r, y, TR[0]); put(r - 1, y, TR[1]); }
  }
  // beiral: tabua de acabamento + espessura do telhado
  for (let x = 0; x < W; x++) { put(x, eaveY - 1, TR[3]); put(x, eaveY, TR[1]); }

  // frontao (triangulo de parede sobre a porta): da volume, como as casas do Stardew
  if (b.w >= 4) {
    const gw = Math.min(34, Math.round(W * 0.42));
    const gh = Math.round(gw * 0.5);
    const gy0 = eaveY - gh;
    for (let y = gy0; y <= eaveY; y++) {
      const half = ((y - gy0) / gh) * (gw / 2);
      for (let x = Math.round(doorCx - half); x <= Math.round(doorCx + half); x++) {
        const edge = x <= doorCx - half + 1.5 || x >= doorCx + half - 1.5;
        if (edge) put(x, y, x < doorCx ? TR[3] : TR[1]);
        else put(x, y, WT[clampT(2 + (x < doorCx ? 0.6 : -0.4) + (hash(x, y, 9) % 9 === 0 ? -1 : 0))]);
      }
    }
    // telhadinho do frontao (aba) e janelinha redonda
    for (let y = gy0 - 2; y <= eaveY; y++) {
      const half = ((y - gy0 + 2) / (gh + 2)) * (gw / 2 + 3);
      for (const sgn of [-1, 1]) {
        for (let k = 0; k < 2; k++) put(doorCx + sgn * (half - k), y, RT[sgn < 0 ? 4 - k : 1]);
      }
    }
    const wy = gy0 + Math.round(gh * 0.55);
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const d = Math.hypot(dx, dy);
      if (d > 3.3) continue;
      put(doorCx + dx, wy + dy, d > 2.3 ? TR[2] : tones('#4a6ea8')[dx + dy < -1 ? 4 : 2]);
    }
  }

  // chamine
  if (b.w >= 4) {
    const cx0 = Math.round(W * 0.74);
    const CT = tones('#9a5a44');
    for (let y = ridgeY - 9; y <= ridgeY + 6; y++) {
      for (let x = cx0; x < cx0 + 7; x++) {
        const row = Math.floor((y - ridgeY + 9) / 3);
        const seam = (y - ridgeY + 9) % 3 === 2 || (x - cx0 + (row % 2) * 2) % 4 === 3;
        put(x, y, CT[x === cx0 ? 3 : x === cx0 + 6 ? 1 : seam ? 1 : 2]);
      }
    }
    for (let x = cx0 - 1; x < cx0 + 8; x++) { put(x, ridgeY - 10, CT[1]); put(x, ridgeY - 9, CT[x === cx0 - 1 ? 1 : 4]); }
  }

  // ---------- fachada ----------
  const beamY = facadeTop + Math.floor((F - 4) / 2);
  for (let y = eaveY + 1; y <= groundY; y++) {
    for (let x = fx0; x <= fx1; x++) {
      const fy = y - facadeTop;
      let c;
      if (y > groundY - 4) {
        const seam = (x + Math.floor((groundY - y) / 2) * 4) % 7 === 0 || y === groundY - 2;
        c = ST[seam ? 1 : y === groundY - 3 ? 3 : 2];
      } else if (wall === 'madeira') {
        const r = fy % 4;
        const seam = r === 3 || (x + Math.floor(fy / 4) * 9) % 23 === 0;
        c = WT[seam ? 0 : r === 0 ? 3 : hash(x >> 2, fy, 1) % 9 === 0 ? 1 : 2];
      } else if (wall === 'pedra') {
        const row = Math.floor(fy / 5);
        const off = (row * 5) % 9;
        const seam = fy % 5 === 4 || (x + off) % 8 === 0;
        c = WT[seam ? 1 : (fy % 5 === 0 || (x + off) % 8 === 1) ? 3 : hash(Math.floor((x + off) / 8), row, 2) % 4 === 0 ? 1 : 2];
      } else if (wall === 'tijolo') {
        const row = Math.floor(fy / 3);
        const seam = fy % 3 === 2 || (x + (row % 2) * 3) % 6 === 0;
        c = seam ? tones('#d8c4a8')[1] : WT[hash(x >> 1, row, 3) % 5 === 0 ? 1 : fy % 3 === 0 ? 3 : 2];
      } else {
        c = WT[hash(x, fy, 4) % 31 === 0 ? 1 : 2];
        if (y === beamY || y === beamY + 1) c = TT[y === beamY ? 2 : 1];
        if (b.w >= 5 && (x - fx0) % (SIZE * 2) < 2 && x > fx0 + 3 && x < fx1 - 3) c = TT[(x - fx0) % (SIZE * 2) === 0 ? 2 : 1];
      }
      // tabuas de canto (claras a esquerda, na sombra a direita)
      if (y <= groundY - 4 && (x <= fx0 + 1 || x >= fx1 - 1)) c = TR[x <= fx0 + 1 ? (x === fx0 ? 3 : 2) : (x === fx1 ? 0 : 1)];
      put(x, y, c);
    }
  }
  // sombra do beiral na parede (3 linhas)
  for (let y = eaveY + 1; y <= eaveY + 3; y++) for (let x = fx0; x <= fx1; x++) {
    const c = at(x, y); if (c) put(x, y, c.map((v, k) => v * (y === eaveY + 3 ? 0.85 : 0.62) * (k === 2 ? 1.06 : 1)));
  }

  // janelas com venezianas e floreira
  const night = light === 'noite' || light === 'entardecer';
  const winTop = facadeTop + 7;
  const winH = Math.max(8, Math.min(11, F - 22));
  for (let col = 0; col < b.w; col++) {
    if (Math.abs(col - dc) % 2 !== 1) continue;
    const cx = col * SIZE + SIZE / 2;
    const x0 = Math.round(cx - 4);
    if (x0 - 5 < fx0 + 2 || x0 + 13 > fx1 - 2) continue;
    // venezianas
    for (let y = winTop - 1; y <= winTop + winH; y++) {
      for (const sx of [x0 - 5, x0 + 10]) for (let k = 0; k < 3; k++) put(sx + k, y, SHUT[(y - winTop) % 2 === 0 ? 1 : k === 0 ? 3 : 2]);
    }
    for (let y = winTop - 2; y <= winTop + winH + 1; y++) {
      for (let x = x0 - 2; x <= x0 + 9; x++) {
        const edge = x <= x0 - 1 || x >= x0 + 8 || y <= winTop - 1 || y >= winTop + winH;
        if (edge) { put(x, y, TR[x <= x0 - 1 || y <= winTop - 1 ? 3 : 1]); continue; }
        if (x === x0 + 3 || x === x0 + 4 || y === winTop + Math.floor(winH / 2)) { put(x, y, TR[2]); continue; }
        const g = night ? tones('#ffc85a') : tones('#4a6ea8');
        const hi = (x - x0) + (y - winTop) < 3;
        put(x, y, g[hi ? 4 : night ? 3 : (y - winTop) > winH / 2 ? 1 : 2], night);
      }
    }
    if (hash(col, 5, 6) % 3 !== 0) {
      const BOX = tones('#8a5a34');
      const FL = tones(['#e0524c', '#ffd04a', '#e88ac8', '#f6f2ea'][hash(col, 7, 8) % 4]);
      const LEAF = tones('#4f9a3e');
      for (let x = x0 - 3; x <= x0 + 10; x++) { put(x, winTop + winH + 2, BOX[3]); put(x, winTop + winH + 3, BOX[1]); }
      for (let x = x0 - 2; x <= x0 + 9; x++) put(x, winTop + winH + 1, (x + col) % 3 === 0 ? FL[3] : LEAF[(x % 2) ? 2 : 3]);
    }
  }

  // porta com batente claro, arco em cima e degrau; lampiao ao lado
  const doorW = 12;
  const doorH = Math.min(20, F - 8);
  const dx0 = Math.round(doorCx - doorW / 2);
  const dy0 = groundY - 4 - doorH;
  const DT = tones('#7a4a2e');
  for (let y = dy0 - 2; y <= groundY - 4; y++) {
    for (let x = dx0 - 2; x <= dx0 + doorW + 1; x++) {
      const ry = y - dy0;
      const inArch = ry >= 0 || Math.abs(x - (dx0 + doorW / 2 - 0.5)) <= doorW / 2 + 2 + ry * 2;
      if (!inArch) continue;
      const frameP = x < dx0 || x >= dx0 + doorW || ry < 0 || (ry < 2 && Math.abs(x - (dx0 + doorW / 2 - 0.5)) > doorW / 2 - 2 + ry);
      if (frameP) { put(x, y, TR[x < dx0 || ry < 0 ? 3 : 1]); continue; }
      const plank = (x - dx0) % 4 === 0;
      const brace = Math.abs((x - dx0) - (ry - 4) * 0.6) < 0.8 && ry > 4 && ry < doorH - 2;
      // porta recuada: faixa de sombra embaixo do batente de cima e na lateral direita
      const recess = ry < 3 || x >= dx0 + doorW - 2;
      put(x, y, DT[recess ? 0 : plank ? 1 : brace ? 1 : (x - dx0) < 2 ? 3 : 2]);
    }
  }
  const gold = tones('#d0a440');
  const kx = dx0 + doorW - 3;
  const ky = dy0 + Math.floor(doorH / 2) + 1;
  if (b.locked) {
    put(kx - 1, ky - 2, gold[1]); put(kx, ky - 2, gold[1]); put(kx + 1, ky - 2, gold[1]);
    put(kx - 1, ky - 1, gold[1]); put(kx + 1, ky - 1, gold[1]);
    for (let y = ky; y <= ky + 2; y++) for (let x = kx - 2; x <= kx + 2; x++) put(x, y, gold[x === kx - 2 ? 4 : y === ky + 2 ? 1 : 3]);
    put(kx, ky + 1, tones('#3a2a24')[0]);
  } else { put(kx, ky, gold[4]); put(kx, ky + 1, gold[2]); }
  // lampiao na parede, a direita da porta
  const lx = dx0 + doorW + 4;
  if (lx + 3 < fx1 - 1) {
    const LT = tones('#3a3c48');
    put(lx + 1, dy0 + 1, LT[2]); put(lx + 1, dy0 + 2, LT[2]);
    for (let y = dy0 + 3; y <= dy0 + 6; y++) for (let x = lx; x <= lx + 2; x++) put(x, y, (y === dy0 + 3 || y === dy0 + 6 || x !== lx + 1) ? LT[y === dy0 + 3 ? 3 : 1] : tones('#ffd27a')[night ? 4 : 3], x === lx + 1 && y > dy0 + 3 && y < dy0 + 6);
  }
  // varandinha/degrau de pedra na frente da porta
  for (let x = dx0 - 4; x <= dx0 + doorW + 3; x++) { put(x, groundY - 3, ST[4]); put(x, groundY - 2, ST[3]); put(x, groundY - 1, ST[2]); put(x, groundY, ST[1]); }

  // ---------- trepadeira, arbustos na fundacao e caminho de pedras ----------
  const LEAF = tones('#3f8a3a');
  const DARK = tones('#2b6a40');
  if ((b.x * 7 + b.y * 3 + b.w) % 3 !== 0) {
    // trepadeira subindo por um dos cantos da fachada
    const left = (b.x + b.y) % 2 === 0;
    const vx = left ? fx0 + 2 : fx1 - 6;
    for (let y = groundY - 5; y > facadeTop + 3; y--) {
      const sway = Math.round(Math.sin(y * 0.5) * 1.5);
      const x = vx + sway + (left ? 0 : 2);
      put(x, y, DARK[2]);
      if ((y + vx) % 3 === 0) { put(x - 1, y, LEAF[3]); put(x + 1, y - 1, LEAF[2]); put(x, y - 1, LEAF[4]); }
      if ((y + vx) % 7 === 0) put(x + (left ? 2 : -2), y, LEAF[3]);
    }
  }
  // arbustos redondos encostados na fundacao (nos cantos, longe da porta)
  for (const bxs of [fx0 + 5, fx1 - 5]) {
    if (Math.abs(bxs - doorCx) < doorW + 6 || hash(bxs, 9, 9) % 4 === 0) continue;
    for (let dy = -5; dy <= 1; dy++) for (let dx = -5; dx <= 5; dx++) {
      const d = (dx / 5.5) ** 2 + ((dy + 2) / 3.6) ** 2;
      if (d > 1) continue;
      const l = -dx * 0.5 - (dy + 2) * 0.7;
      put(bxs + dx, groundY + dy, LEAF[clampT(2 + l * 0.6 + (hash(dx, dy, bxs) % 5 === 0 ? 1 : 0))]);
    }
    put(bxs - 2, groundY - 4, tones('#e0524c')[3]); put(bxs + 2, groundY - 2, tones('#ffd04a')[3]);
  }
  // caminho de pedras chatas saindo da porta para o chao (nao bloqueia: e so desenho)
  for (let k = 0; k < 3; k++) {
    const py = groundY + 2 + k * 3;
    const px = doorCx + (k % 2 ? 2 : -2);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (Math.abs(dx) === 3 && dy !== 0) continue;
      put(px + dx, py + dy, ST[dy < 0 ? 4 : dy > 0 ? 2 : 3]);
    }
  }

  // ---------- contorno escuro em volta de tudo ----------
  const OUTLINE = [42, 26, 34];
  const add = [];
  for (let y = 0; y < T; y++) for (let x = 0; x < W; x++) {
    if (at(x, y)) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy))) add.push([x, y]);
  }
  for (const [x, y] of add) put(x, y, OUTLINE);

  // ---------- RGBA + sombra no chao + luz da cena ----------
  const data = new Uint8ClampedArray(W * T * 4);
  const tint = { entardecer: [242, 184, 144], noite: [58, 70, 136] }[light];
  for (let i = 0; i < W * T; i++) {
    const c = style && style !== 'padrao' && rgb[i] ? styleRgb(rgb[i][0], rgb[i][1], rgb[i][2], style) : rgb[i];
    if (!c) continue;
    const m = tint && !glow[i] ? tint.map((v) => v / 255) : [1, 1, 1];
    data[i * 4] = c[0] * m[0]; data[i * 4 + 1] = c[1] * m[1]; data[i * 4 + 2] = c[2] * m[2]; data[i * 4 + 3] = 255;
  }
  for (let y = groundY + 2; y < T; y++) {
    for (let x = 4; x < W; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3]) continue;
      data.set([...(style ? styleRgb(30, 18, 40, style) : [30, 18, 40]), Math.max(0, 130 - (y - groundY - 2) * 30)], i);
    }
  }
  return { width: W, height: T, data, offsetY: -RISE_PX };
}
