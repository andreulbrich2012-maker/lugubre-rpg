// Kit de construcoes em pixel art (estilo Stardew como referencia, nunca copiado).
// Uma construcao e montada a partir de VOLUMES (corpo, ala recuada, torre, varanda) desenhados
// em projecao 3/4: a profundidade do predio vira altura na tela. Telhado "frente" (cumeeira
// paralela a fachada: vemos a agua da frente subindo) ou "empena" (frontao triangular virado
// para nos e as duas aguas recuando para cima). Cada material tem um desenho feito a mao em
// regras pequenas (tabuas, troncos, pedra, tijolo, reboco com enxaimel) com luz do alto-esquerda.
// Puro (sem DOM): devolve RGBA; o Board e as previas em node usam o mesmo codigo.
import { ramp, hexToRgb } from '../avatar/palette.js';
import { applyStyle } from '../tiles/styles.js';
import { resolveLight } from '../tiles/daylight.js';

const tone5 = (hex) => ramp(hex).map(hexToRgb);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Cores de cada canal configuravel da construcao.
export const DEFAULT_COLORS = {
  roof: '#b8442e', wall: '#e8d6b0', trim: '#f0e6d0', wood: '#7a4a2e', stone: '#8a8498', window: '#4a72b0', accent: '#3e6e94'
};

function hashXY(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------- tela ----------
export function createCanvas(w, h) {
  const px = new Array(w * h).fill(null);
  const glow = new Uint8Array(w * h);
  const c = {
    w, h, px, glow,
    set(x, y, rgb, lit = false) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= w || y >= h || !rgb) return;
      px[y * w + x] = rgb; glow[y * w + x] = lit ? 1 : 0;
    },
    clear(x, y) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) px[y * w + x] = null; },
    get(x, y) { return x >= 0 && y >= 0 && x < w && y < h ? px[y * w + x] : null; },
    shade(x, y, k) { const p = c.get(x, y); if (p) c.set(x, y, p.map((v, i) => clamp(v * k * (i === 2 ? 1.04 : 1), 0, 255))); }
  };
  return c;
}

// ---------- paredes (desenho por material) ----------
// t(x,y) devolve o tom 0..4 do material na posicao local (lx, ly a partir do canto de cima-esquerda da parede).
const WALL_PATTERNS = {
  // tabuas horizontais (clapboard): cada tabua 4 px com borda de cima clara e sombra embaixo
  tabuas: (lx, ly, s) => {
    const r = ly % 4;
    const joint = (lx + Math.floor(ly / 4) * 11) % 19 === 0;
    if (r === 3) return 0;
    if (joint) return 1;
    if (r === 0) return 3;
    return hashXY(lx >> 1, ly >> 2, s) < 0.08 ? 1 : 2;
  },
  // tabuas verticais com mata-junta (celeiro, estabulo)
  verticais: (lx) => {
    const r = lx % 6;
    if (r === 0) return 3; if (r === 1) return 1; if (r === 5) return 1;
    return 2;
  },
  // troncos empilhados (cabana): cilindros de 5 px com brilho em cima
  troncos: (lx, ly) => {
    const r = ly % 5;
    return [3, 3, 2, 1, 0][r];
  },
  // pedra irregular: blocos de alturas diferentes, cada um com luz no alto-esquerda
  pedra: (lx, ly, s) => {
    const row = Math.floor(ly / 6);
    const off = Math.floor(hashXY(row, 1, s) * 9);
    const wdt = 7 + Math.floor(hashXY(row, 2, s) * 4);
    const bx = Math.floor((lx + off) / wdt);
    const u = (lx + off) % wdt;
    const v = ly % 6;
    if (v === 5 || u === 0) return 0;
    if (v === 0 || u === 1) return 3;
    return hashXY(bx, row, s) < 0.25 ? 1 : 2;
  },
  // tijolo: 8x3 desencontrado, argamassa clara
  tijolo: (lx, ly) => {
    const row = Math.floor(ly / 3);
    const u = (lx + (row % 2) * 4) % 8;
    if (ly % 3 === 2 || u === 0) return -1; // argamassa (cor propria)
    return ly % 3 === 0 ? 3 : 2;
  },
  // reboco liso (o enxaimel e desenhado por cima)
  reboco: (lx, ly, s) => (hashXY(lx, ly, s) < 0.03 ? 1 : 2),
  // vidro (estufa): paineis com caixilho claro e reflexo diagonal
  vidro: (lx, ly) => {
    if (lx % 8 === 0 || ly % 8 === 0) return 4;
    return (lx + ly) % 11 < 2 ? 4 : (lx % 8) + (ly % 8) < 6 ? 3 : 2;
  }
};
export const WALL_MATERIALS = Object.keys(WALL_PATTERNS);

// Desenha uma parede retangular com material, cantos e fundacao.
function drawWall(c, x0, y0, w, h, colors, material, opts = {}) {
  const WT = tone5(colors.wall);
  const TR = tone5(colors.trim);
  const MOR = tone5('#d8ccb4');
  const ST = tone5(colors.stone);
  const WD = tone5(colors.wood);
  const pat = WALL_PATTERNS[material] || WALL_PATTERNS.tabuas;
  const found = opts.foundation ?? 4;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const lx = x - x0; const ly = y - y0;
      let rgb;
      if (ly >= h - found) {
        const fy = h - 1 - ly;
        const seam = (lx + (fy >> 1) * 5) % 9 === 0 || fy === found - 1;
        rgb = ST[seam ? 1 : fy === found - 1 ? 3 : fy === 0 ? 1 : 2];
      } else {
        let t = pat(lx, ly, opts.seed || 0);
        rgb = t === -1 ? MOR[2] : WT[t];
      }
      c.set(x, y, rgb);
    }
  }
  // enxaimel: vigas escuras (cantos, linha do meio, X nos paineis)
  if (material === 'reboco' && opts.timber !== false) {
    const beam = y0 + Math.floor((h - found) / 2);
    for (let x = x0; x < x0 + w; x++) { c.set(x, y0, WD[2]); c.set(x, y0 + 1, WD[1]); c.set(x, beam, WD[2]); c.set(x, beam + 1, WD[1]); }
    const step = 16;
    for (let px = x0; px < x0 + w; px += step) {
      for (let y = y0; y < y0 + h - found; y++) { c.set(px, y, WD[2]); c.set(px + 1, y, WD[1]); }
      // X de travamento no painel de baixo
      if (opts.braces && px + step < x0 + w) {
        const top = beam + 2; const bot = y0 + h - found - 1;
        for (let k = 0; k <= bot - top; k++) {
          const fx = Math.round((k / (bot - top)) * (step - 3));
          c.set(px + 2 + fx, top + k, WD[1]); c.set(px + step - 1 - fx, top + k, WD[2]);
        }
      }
    }
    for (let y = y0; y < y0 + h - found; y++) { c.set(x0 + w - 2, y, WD[2]); c.set(x0 + w - 1, y, WD[1]); }
  }
  // tabuas de canto (claras a esquerda, sombra a direita) e luz/sombra lateral
  if (opts.corners !== false && material !== 'reboco') {
    const CR = material === 'pedra' || material === 'tijolo' ? ST : TR;
    for (let y = y0; y < y0 + h - found; y++) {
      c.set(x0, y, CR[3]); c.set(x0 + 1, y, CR[2]);
      c.set(x0 + w - 2, y, CR[1]); c.set(x0 + w - 1, y, CR[0]);
    }
  }
  // pontas dos troncos nos cantos (cabana de troncos)
  if (material === 'troncos') {
    for (let y = y0; y < y0 + h - found; y += 5) {
      for (const cx of [x0, x0 + w - 3]) {
        for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 3; dx++) c.set(cx + dx, y + dy, WD[dy === 0 ? 4 : dy === 3 ? 1 : dx === 1 ? 3 : 2]);
      }
    }
  }
  // sombra de oclusao embaixo do beiral (3 px) e lateral direita mais escura
  for (let y = y0; y < y0 + 3; y++) for (let x = x0; x < x0 + w; x++) c.shade(x, y, y === y0 + 2 ? 0.86 : 0.66);
  for (let y = y0; y < y0 + h; y++) for (let x = x0 + w - 4; x < x0 + w - 2; x++) c.shade(x, y, 0.9);
}

// ---------- telhados ----------
// Desenho das telhas: escamas (telha/ardosia), palha (fibras com amarras), tabuinhas (shingle de madeira).
const ROOF_PATTERNS = {
  escama: (u, v, course) => {
    const w = 6; const k = (u + (course % 2) * 3) % w; const r = v % 4;
    if (r === 0) return k === 0 || k === w - 1 ? 0.6 : 2.1;
    if (r === 3) return k === 0 ? 1 : 3.3;
    return k === 0 ? 1.2 : k === 1 ? 3 : r === 2 ? 2.7 : 2.3;
  },
  ardosia: (u, v, course) => {
    const w = 8; const k = (u + (course % 2) * 4) % w; const r = v % 5;
    if (r === 0) return 0.8;
    if (k === 0) return 1.1;
    return r === 4 ? 3.2 : r === 1 ? 1.8 : 2.4;
  },
  palha: (u, v) => {
    const r = v % 7;
    if (r === 0) return 1;
    const f = hashXY(u, 3) * 3;
    return r === 6 ? 3.4 : f < 1 ? 2 : f < 2 ? 2.6 : 3;
  },
  vidro: (u, v) => (u % 8 === 0 || v % 6 === 0 ? 4 : (u + v) % 9 < 2 ? 4 : 2.6),
  tabuinhas: (u, v, course) => {
    const k = (u + (course % 2) * 5 + Math.floor(hashXY(course, u >> 3) * 3)) % 9; const r = v % 4;
    if (r === 0) return 0.9;
    if (k === 0) return 1.2;
    return r === 3 ? 3.1 : 2.3;
  }
};
export const ROOF_STYLES = Object.keys(ROOF_PATTERNS);

// Telhado "frente": cumeeira paralela a fachada. A agua da frente sobe da linha do beiral
// (eaveY) ate a cumeeira, que fica 'depth' px acima; atras aparece um pedaco da outra agua.
function drawRoofFront(c, x0, w, eaveY, depth, colors, style, opts = {}) {
  const RT = tone5(colors.roof);
  const TR = tone5(colors.trim);
  const pat = ROOF_PATTERNS[style] || ROOF_PATTERNS.escama;
  const over = opts.overhang ?? 3;
  const xa = x0 - over; const xb = x0 + w - 1 + over;
  const ridge = eaveY - depth;
  const back = Math.max(3, Math.round(depth * 0.18));
  for (let y = ridge - back; y <= eaveY + 1; y++) {
    const round = y === ridge - back ? 2 : y === ridge - back + 1 ? 1 : 0;
    for (let x = xa + round; x <= xb - round; x++) {
      let t;
      if (y < ridge) t = 1.5 + (hashXY(x, y, 7) < 0.1 ? -0.5 : 0);
      else if (y <= ridge + 1) t = y === ridge ? 4.2 : 3.4;
      else {
        const v = eaveY - y; const course = Math.floor(v / 4);
        t = pat(x - xa, v, course);
        if (y <= ridge + 4) t += 0.4;
      }
      if (x <= xa + 4) t += 0.5;
      if (x >= xb - 6) t -= 0.7;
      c.set(x, y, RT[clamp(Math.round(t), 0, 4)]);
    }
    if (y > ridge - back + 1) { c.set(xa, y, TR[1]); c.set(xa + 1, y, TR[3]); c.set(xb, y, TR[0]); c.set(xb - 1, y, TR[1]); }
  }
  for (let x = xa; x <= xb; x++) { c.set(x, eaveY, TR[3]); c.set(x, eaveY + 1, TR[1]); c.set(x, eaveY + 2, TR[0]); }
  return { ridge, top: ridge - back };
}

// Telhado "empena": frontao triangular na frente; as duas aguas recuam para cima ('depth' px).
// Esquerda iluminada, direita na sombra; cumeeira vertical subindo do topo do triangulo.
function drawRoofGable(c, x0, w, eaveY, pitch, depth, colors, style, material, opts = {}) {
  const RT = tone5(colors.roof);
  const TR = tone5(colors.trim);
  const WT = tone5(colors.wall);
  const pat = ROOF_PATTERNS[style] || ROOF_PATTERNS.escama;
  const over = opts.overhang ?? 3;
  const cx = x0 + (w - 1) / 2;
  const half = w / 2 + over;
  const gh = Math.round((w / 2) * pitch); // altura do frontao
  const apex = eaveY - gh;
  const edgeY = (x) => eaveY - gh * (1 - Math.abs(x - cx) / half); // linha da borda do telhado
  // aguas recuando: entre a borda e a borda deslocada 'depth' para cima
  for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
    const ey = Math.round(edgeY(x));
    const left = x < cx;
    for (let y = ey - depth; y <= ey + 1; y++) {
      const v = ey - y; const course = Math.floor(v / 4);
      let t = pat(Math.round(Math.abs(x - cx)), v, course);
      t += left ? 0.6 : -0.8;
      if (y >= ey) t = left ? 3.6 : 1.2; // tabua da borda (fascia)
      if (Math.abs(x - cx) < 1) t = 4; // cumeeira
      const rgb = y >= ey ? TR[clamp(Math.round(t), 0, 4)] : RT[clamp(Math.round(t), 0, 4)];
      c.set(x, y, rgb);
    }
  }
  // frontao: parede triangular (mesmo material ou tabuas) com acabamento
  for (let y = apex + 2; y <= eaveY; y++) {
    const hw = ((y - apex) / gh) * (w / 2) - 1;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const lx = x - x0; const ly = y - apex;
      const t = material === 'reboco' ? 2 : (WALL_PATTERNS[material === 'pedra' || material === 'tijolo' ? 'tabuas' : material] || WALL_PATTERNS.tabuas)(lx, ly, 3);
      c.set(x, y, WT[t < 0 ? 2 : t]);
    }
  }
  // sombra do beiral do frontao (oclusao sob a borda)
  for (let y = apex + 2; y <= eaveY; y++) {
    const hw = ((y - apex) / gh) * (w / 2) - 1;
    for (const x of [Math.round(cx - hw), Math.round(cx - hw) + 1, Math.round(cx + hw), Math.round(cx + hw) - 1]) c.shade(x, y, 0.72);
  }
  return { apex, gh, top: Math.round(apex - depth) };
}

// Mansarda/celeiro (gambrel): empena em dois cortes (mais vertical embaixo, mais deitada em cima).
function drawRoofGambrel(c, x0, w, eaveY, depth, colors, style, material) {
  const RT = tone5(colors.roof);
  const TR = tone5(colors.trim);
  const WT = tone5(colors.wall);
  const pat = ROOF_PATTERNS[style] || ROOF_PATTERNS.tabuinhas;
  const cx = x0 + (w - 1) / 2;
  const half = w / 2 + 3;
  const kneeX = half * 0.62; const kneeH = Math.round(w * 0.42); const topH = Math.round(w * 0.16);
  const edgeY = (x) => {
    const d = Math.abs(x - cx);
    if (d > kneeX) return eaveY - kneeH * ((half - d) / (half - kneeX));
    return eaveY - kneeH - topH * ((kneeX - d) / kneeX);
  };
  for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
    const ey = Math.round(edgeY(x));
    const left = x < cx;
    for (let y = ey - depth; y <= ey + 1; y++) {
      const v = ey - y;
      let t = pat(Math.round(Math.abs(x - cx)), v, Math.floor(v / 4)) + (left ? 0.6 : -0.8);
      if (y >= ey) t = left ? 3.6 : 1.2;
      if (Math.abs(x - cx) < 1) t = 4;
      c.set(x, y, (y >= ey ? TR : RT)[clamp(Math.round(t), 0, 4)]);
    }
  }
  const apex = eaveY - kneeH - topH;
  for (let y = apex + 2; y <= eaveY; y++) {
    for (let x = Math.floor(cx - half) + 3; x <= Math.ceil(cx + half) - 3; x++) {
      if (y <= edgeY(x) + 1) continue;
      c.set(x, y, WT[WALL_PATTERNS[material] ? Math.max(0, WALL_PATTERNS[material](x - x0, y - apex, 5)) : 2]);
    }
  }
  return { apex, top: Math.round(apex - depth) };
}

// ---------- pecas da fachada ----------
function drawWindow(c, x, y, colors, { w = 10, h = 10, night = false, shutters = true, box = false, round = false } = {}) {
  const TR = tone5(colors.trim);
  const SH = tone5(colors.accent);
  const GL = night ? tone5('#ffc85a') : tone5(colors.window);
  if (shutters) for (let yy = y - 1; yy <= y + h; yy++) for (const sx of [x - 4, x + w + 1]) for (let k = 0; k < 3; k++) c.set(sx + k, yy, SH[(yy - y) % 2 === 0 ? 1 : k === 0 ? 3 : 2]);
  for (let yy = y - 1; yy <= y + h; yy++) {
    for (let xx = x - 1; xx <= x + w; xx++) {
      const lx = xx - x; const ly = yy - y;
      if (round && ly < 3 && Math.hypot(lx - (w - 1) / 2, (ly - 3) * 1.4) > w / 2 + 0.5) continue;
      const edge = xx === x - 1 || xx === x + w || yy === y - 1 || yy === y + h;
      if (edge) { c.set(xx, yy, TR[xx === x - 1 || yy === y - 1 ? 3 : 1]); continue; }
      if (lx === Math.floor(w / 2) || ly === Math.floor(h / 2)) { c.set(xx, yy, TR[2]); continue; }
      const hi = lx + ly < 3 || (lx === 1 && ly === Math.floor(h / 2) + 2);
      c.set(xx, yy, GL[hi ? 4 : night ? 3 : ly > h / 2 ? 1 : 2], night);
    }
  }
  for (let xx = x - 2; xx <= x + w + 1; xx++) c.set(xx, y + h + 1, TR[3]);
  if (box) {
    const BX = tone5(colors.wood); const LF = tone5('#4f9a3e'); const FL = tone5(box);
    for (let xx = x - 2; xx <= x + w + 1; xx++) { c.set(xx, y + h + 3, BX[3]); c.set(xx, y + h + 4, BX[1]); c.set(xx, y + h + 2, (xx % 3 === 0) ? FL[3] : LF[xx % 2 ? 2 : 3]); }
  }
}

function drawDoor(c, cx, groundY, colors, { w = 12, h = 20, locked = false, double = false, arch = true, barn = false } = {}) {
  const TR = tone5(colors.trim);
  const DT = tone5(colors.wood);
  const x0 = Math.round(cx - w / 2);
  const y0 = groundY - h;
  for (let y = y0 - 2; y <= groundY; y++) {
    for (let x = x0 - 2; x <= x0 + w + 1; x++) {
      const ry = y - y0;
      if (arch && ry < 2 && Math.abs(x - (x0 + (w - 1) / 2)) > w / 2 - 2 + ry * 2 + 2) continue;
      const frame = x < x0 || x >= x0 + w || ry < 0;
      if (frame) { c.set(x, y, TR[x < x0 || ry < 0 ? 3 : 1]); continue; }
      const lx = x - x0;
      const recess = ry < 2 || lx >= w - 2;
      let t = lx % 4 === 0 ? 1 : lx < 2 ? 3 : 2;
      if (barn) {
        // porta de celeiro: moldura branca e X
        const d1 = Math.abs(lx - (ry / h) * w) < 1; const d2 = Math.abs(lx - (1 - ry / h) * w) < 1;
        if (d1 || d2 || lx < 1 || lx >= w - 1 || ry < 1 || ry >= h - 1) { c.set(x, y, TR[d1 ? 3 : 2]); continue; }
      }
      if (double && lx === Math.floor(w / 2)) t = 0;
      c.set(x, y, DT[recess && !barn ? 0 : t]);
    }
  }
  const G = tone5('#d0a440');
  const kx = x0 + w - 3; const ky = y0 + Math.floor(h / 2) + 1;
  if (locked) { for (let y = ky; y <= ky + 2; y++) for (let x = kx - 1; x <= kx + 1; x++) c.set(x, y, G[y === ky ? 4 : 2]); c.set(kx, ky - 1, G[1]); }
  else if (!barn) { c.set(kx, ky, G[4]); c.set(kx, ky + 1, G[2]); }
  // degrau
  const ST = tone5(colors.stone);
  for (let x = x0 - 3; x <= x0 + w + 2; x++) { c.set(x, groundY + 1, ST[3]); c.set(x, groundY + 2, ST[1]); }
  return { x0, y0 };
}

function drawChimney(c, x, topY, h, colors) {
  const B = tone5('#9a5a44');
  for (let y = topY; y < topY + h; y++) for (let xx = x; xx < x + 7; xx++) {
    const row = Math.floor((y - topY) / 3); const seam = (y - topY) % 3 === 2 || (xx - x + (row % 2) * 2) % 4 === 3;
    c.set(xx, y, B[xx === x ? 3 : xx === x + 6 ? 1 : seam ? 1 : 2]);
  }
  for (let xx = x - 1; xx < x + 8; xx++) { c.set(xx, topY - 1, B[1]); c.set(xx, topY, B[xx === x - 1 ? 1 : 4]); }
}

// Varanda: piso de tabuas, colunas e um telhadinho na frente da fachada.
function drawPorch(c, x0, w, groundY, colors, h = 18) {
  const WD = tone5(colors.wood); const TR = tone5(colors.trim); const RT = tone5(colors.roof);
  const top = groundY - h;
  for (let y = top; y <= top + 4; y++) for (let x = x0 - 2; x <= x0 + w + 1; x++) {
    const v = top + 4 - y; const k = (x + (Math.floor(v / 2) % 2) * 2) % 5;
    c.set(x, y, RT[y === top + 4 ? 0 : k === 0 ? 1 : v === 3 ? 3 : 2]);
  }
  for (let x = x0 - 2; x <= x0 + w + 1; x++) { c.set(x, top + 5, TR[3]); c.set(x, top + 6, TR[1]); }
  for (const px of [x0, x0 + w - 3]) for (let y = top + 7; y <= groundY - 1; y++) { c.set(px, y, TR[3]); c.set(px + 1, y, TR[2]); c.set(px + 2, y, TR[1]); }
  for (let x = x0 - 1; x <= x0 + w; x++) { c.set(x, groundY, WD[x % 4 === 0 ? 1 : 3]); c.set(x, groundY + 1, WD[1]); c.set(x, groundY + 2, WD[0]); }
  // grade da varanda
  for (let x = x0 + 3; x < x0 + w - 3; x++) { c.set(x, groundY - 6, TR[3]); if (x % 3 === 0) for (let y = groundY - 5; y < groundY; y++) c.set(x, y, TR[2]); }
}

// ---------- volume ----------
// v: { x, w, wallH, roof: 'frente'|'empena'|'celeiro'|'plano', pitch, depth, setback,
//      material, roofStyle, door: 'meio'|'esquerda'|..|false, windows, shutters, boxes,
//      chimney, porch, dormers, locked, barnDoor, sign }
function drawVolume(c, ox, groundY, v, colors, ctx) {
  // profundidade do telhado proporcional a pegada (quanto mais funda a casa, mais telhado se ve)
  if (v.depth == null && ctx.footH) v = { ...v, depth: v.roof === 'frente' || !v.roof ? Math.round(Math.max(22, ctx.footH * 0.62 - v.wallH * 0.15)) : Math.round(Math.max(14, ctx.footH * 0.42)) };
  const base = groundY - (v.setback || 0);
  const x0 = ox + v.x; const w = v.w;
  const wallTop = base - v.wallH + 1;
  // telhado primeiro (fica atras da fachada so na parte de cima; a fachada cobre o resto)
  let roofInfo = null;
  const style = v.roofStyle || 'escama';
  if (v.roof === 'empena') roofInfo = drawRoofGable(c, x0, w, wallTop, v.pitch ?? 0.7, v.depth ?? 12, colors, style, v.material);
  else if (v.roof === 'celeiro') roofInfo = drawRoofGambrel(c, x0, w, wallTop, v.depth ?? 12, colors, style, v.material);
  else if (v.roof !== 'plano') roofInfo = drawRoofFront(c, x0, w, wallTop, v.depth ?? 26, colors, style);
  drawWall(c, x0, wallTop + (v.roof === 'frente' || !v.roof ? 3 : 0), w, v.wallH - (v.roof === 'frente' || !v.roof ? 3 : 0), colors, v.material || 'tabuas', { seed: ctx.seed, braces: v.braces, foundation: v.foundation });
  // janelas
  const night = ctx.night;
  const doorCx = v.door === false ? null : x0 + (v.doorAt != null ? v.doorAt : (w - 1) / 2);
  const winY = wallTop + (v.roof === 'frente' ? 9 : 6);
  const winH = clamp(v.wallH - 22, 7, 12);
  const slots = [];
  const spacing = v.winSpacing || 20;
  for (let cxw = x0 + 10; cxw <= x0 + w - 12; cxw += spacing) slots.push(cxw);
  if (v.buttress) {
    // contrafortes entre as janelas (igreja gotica)
    for (let bx = x0 + 1; bx <= x0 + w - 6; bx += spacing) if (doorCx == null || Math.abs(bx + 2 - doorCx) > 12) drawButtress(c, bx - 1, wallTop + 10, base - 1, colors);
    drawButtress(c, x0 + w - 6, wallTop + 10, base - 1, colors);
  }
  for (const sx of slots) {
    if (doorCx != null && Math.abs(sx + 5 - doorCx) < 16 && !v.slits) continue;
    if (v.windows === 0) break;
    if (v.lancet) { drawLancet(c, sx + 2, winY - 2, colors, { w: 7, h: clamp(v.wallH - 28, 12, 30), night, empty: v.lancet === 'vazia' }); continue; }
    if (v.slits) { drawSlit(c, sx + 5, winY + 2, clamp(v.wallH - 30, 8, 14), colors); continue; }
    drawWindow(c, sx, winY, colors, { h: winH, night, shutters: v.shutters !== false, box: v.boxes ? ['#e0524c', '#ffd04a', '#e88ac8'][Math.floor(hashXY(sx, 1, ctx.seed) * 3)] : false });
  }
  // segundo andar: fileira de janelas mais acima
  if (v.floors === 2) {
    const y2 = wallTop + 6;
    for (const sx of slots) drawWindow(c, sx, y2, colors, { h: 8, night, shutters: v.shutters !== false });
    // faixa entre os andares
    const TR = tone5(colors.trim);
    const midY = wallTop + Math.round(v.wallH / 2) - 2;
    for (let x = x0; x < x0 + w; x++) { c.set(x, midY, TR[3]); c.set(x, midY + 1, TR[1]); }
  }
  // janela no frontao (empena)
  if (roofInfo && v.roof === 'empena' && roofInfo.gh > 12 && v.rose) {
    drawRose(c, Math.round(x0 + (w - 1) / 2), wallTop - Math.round(roofInfo.gh * 0.42), Math.min(9, Math.round(roofInfo.gh * 0.22)), colors, night);
  } else if (roofInfo && v.roof === 'empena' && roofInfo.gh > 12) {
    const gx = Math.round(x0 + (w - 1) / 2 - 3);
    drawWindow(c, gx, wallTop - Math.round(roofInfo.gh * 0.55), colors, { w: 6, h: 6, night, shutters: false, round: true });
  }
  if (doorCx != null) drawDoor(c, doorCx, base - 4, colors, { w: v.barnDoor ? 18 : 12, h: v.barnDoor ? Math.min(26, v.wallH - 4) : clamp(v.wallH - 10, 14, 20), locked: ctx.locked, double: v.doubleDoor, barn: v.barnDoor, arch: !v.barnDoor });
  if (v.lancet && doorCx != null) {
    // portal ogival por cima da porta (gotico): arco de pedra e timpano escuro
    const TR = tone5(colors.trim); const dh = clamp(v.wallH - 10, 14, 20); const top = base - 4 - dh - 2;
    for (let k = 0; k < 11; k++) {
      const hw = 9 * Math.sqrt(k / 10);
      for (let x = Math.round(doorCx - hw - 1); x <= Math.round(doorCx + hw + 1); x++) {
        const edge = Math.abs(x - doorCx) > hw - 1.2;
        c.set(x, top - 10 + k, edge ? TR[x < doorCx ? 3 : 1] : k > 3 && Math.abs(x - doorCx) < 1 ? TR[2] : [44, 32, 44]);
      }
    }
    for (const sx of [Math.round(doorCx - 10), Math.round(doorCx + 9)]) for (let y = top; y <= base - 4; y++) c.set(sx, y, TR[sx < doorCx ? 3 : 1]);
  }
  if (v.porch && doorCx != null) drawPorch(c, Math.round(doorCx - v.porch / 2), v.porch, base - 1, colors);
  if (v.hoist && doorCx != null) drawHoist(c, Math.round(doorCx), v.roof === 'empena' && roofInfo ? roofInfo.apex + Math.round(roofInfo.gh * 0.25) : wallTop + 1, wallTop, base, colors);
  if (v.flag && roofInfo) drawFlag(c, x0 + Math.round(w * (v.flagAt ?? 0.3)), (roofInfo.ridge ?? roofInfo.apex) - 20, colors);
  if (v.chimney && roofInfo) drawChimney(c, x0 + Math.round(w * 0.72), (roofInfo.ridge ?? roofInfo.apex) - 8, 14, colors);
  if (v.sign && doorCx != null) {
    // placa pendurada ao lado da porta (loja/taverna)
    const SG = tone5(colors.wood); const TX = tone5(colors.accent);
    const sx = Math.round(doorCx + 10); const sy = wallTop + 6;
    for (let y = sy; y < sy + 8; y++) for (let x = sx; x < sx + 12; x++) c.set(x, y, SG[y === sy ? 3 : y === sy + 7 ? 1 : 2]);
    for (let x = sx + 3; x < sx + 9; x++) c.set(x, sy + 3, TX[3]);
    c.set(sx + 2, sy - 2, SG[0]); c.set(sx + 9, sy - 2, SG[0]); c.set(sx + 2, sy - 1, SG[1]); c.set(sx + 9, sy - 1, SG[1]);
  }
  return roofInfo;
}

// ---------- extras ----------
function drawTower(c, cx, groundY, r, h, colors, ctx, opts = {}) {
  // torre redonda: cilindro com sombreamento horizontal e telhado conico
  const WT = tone5(colors.stone); const RT = tone5(colors.roof);
  for (let y = groundY - h; y <= groundY; y++) for (let x = cx - r; x <= cx + r; x++) {
    const n = (x - cx) / r;
    const t = 2 + -n * 1.4 - (Math.abs(n) > 0.8 ? 0.6 : 0);
    const row = Math.floor((groundY - y) / 5); const seam = (groundY - y) % 5 === 0 || (x + row * 3) % 8 === 0;
    c.set(x, y, WT[clamp(Math.round(seam ? t - 1 : t), 0, 4)]);
  }
  if (opts.crown) {
    // coroa de ameias sobre misulas (torre de muralha redonda)
    const top = groundY - h;
    for (let y = top - 8; y <= top + 3; y++) for (let x = cx - r - 2; x <= cx + r + 2; x++) {
      const n = (x - cx) / (r + 2);
      const merlon = Math.floor((x - cx + 40) / 5) % 2 === 0;
      if (y < top - 3 && !merlon) continue;
      const t = 2.3 - n * 1.5 + (y === top - 8 || (y === top - 3 && !merlon) ? 1.4 : 0) + (y >= top + 2 ? -1 : 0);
      c.set(x, y, WT[clamp(Math.round(t), 0, 4)]);
    }
    for (let x = cx - r - 1; x <= cx + r + 1; x += 4) { c.set(x, top + 4, WT[0]); c.set(x + 1, top + 4, WT[1]); }
    if (opts.door) drawDoor(c, cx, groundY - 1, colors, { w: 10, h: 16, locked: ctx.locked });
    for (const sy of [groundY - Math.round(h * 0.55), groundY - Math.round(h * 0.85)]) if (sy > top + 8 && sy < groundY - 26) drawSlit(c, cx, sy, 9, colors);
    return;
  }
  const coneH = Math.round(r * 2.2);
  for (let y = groundY - h - coneH; y <= groundY - h + 1; y++) {
    const hw = ((y - (groundY - h - coneH)) / coneH) * (r + 2);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const n = (x - cx) / (hw || 1);
      c.set(x, y, RT[clamp(Math.round(2.2 - n * 1.5 + ((y + Math.round(x * 0.5)) % 4 === 0 ? -0.8 : 0)), 0, 4)]);
    }
  }
  if (opts.window !== false) drawWindow(c, cx - 3, groundY - h + 8, colors, { w: 6, h: 9, night: ctx.night, shutters: false, round: true });
}

function drawVines(c, x, y0, y1, seed) {
  const LF = tone5('#3f8a3a'); const DK = tone5('#2b6a40');
  for (let y = y1; y > y0; y--) {
    const xx = x + Math.round(Math.sin(y * 0.45 + seed) * 1.5);
    c.set(xx, y, DK[2]);
    if (y % 3 === 0) { c.set(xx - 1, y, LF[3]); c.set(xx + 1, y - 1, LF[2]); c.set(xx, y - 1, LF[4]); }
  }
}

function drawBush(c, cx, groundY, seed) {
  const LF = tone5('#3f8a3a');
  for (let dy = -6; dy <= 1; dy++) for (let dx = -6; dx <= 6; dx++) {
    const d = (dx / 6.2) ** 2 + ((dy + 2) / 4.2) ** 2;
    if (d > 1) continue;
    const l = -dx * 0.45 - (dy + 2) * 0.7;
    c.set(cx + dx, groundY + dy, LF[clamp(Math.round(2 + l * 0.55 + (hashXY(dx, dy, seed) < 0.15 ? 1 : 0)), 0, 4)]);
  }
  c.set(cx - 2, groundY - 4, tone5('#e0524c')[3]); c.set(cx + 3, groundY - 2, tone5('#ffd04a')[3]);
}

// Toldo listrado sobre janelas/porta (lojas, padaria, mercado).
function drawAwning(c, x0, w, y, colors, depth = 7) {
  const A = tone5(colors.accent); const T = tone5(colors.trim);
  for (let k = 0; k < depth; k++) {
    const yy = y + k; const grow = Math.round(k * 0.5);
    for (let x = x0 - grow; x <= x0 + w + grow; x++) {
      const stripe = Math.floor((x - x0 + 40) / 5) % 2 === 0;
      c.set(x, yy, (stripe ? A : T)[k === 0 ? 3 : k === depth - 1 ? 1 : 2]);
    }
  }
  for (let x = x0 - Math.round(depth * 0.5); x <= x0 + w + Math.round(depth * 0.5); x += 5) { c.set(x + 2, y + depth, A[1]); c.set(x + 3, y + depth, A[1]); }
}

// Colunas com frontao classico na frente da fachada (prefeitura, templo, biblioteca).
function drawPortico(c, cx, w, groundY, h, colors) {
  const ST = tone5(colors.trim); const RT = tone5(colors.roof);
  const x0 = Math.round(cx - w / 2); const top = groundY - h;
  const n = Math.max(3, Math.round(w / 14));
  for (let i = 0; i < n; i++) {
    const px = Math.round(x0 + 3 + (i * (w - 10)) / (n - 1));
    for (let y = top + 6; y <= groundY; y++) for (let k = 0; k < 5; k++) c.set(px + k, y, ST[k === 0 ? 4 : k === 1 ? 3 : k === 4 ? 1 : 2]);
    for (let k = -1; k < 6; k++) { c.set(px + k, top + 5, ST[3]); c.set(px + k, groundY, ST[1]); }
  }
  for (let x = x0 - 2; x <= x0 + w + 2; x++) { c.set(x, top + 3, ST[3]); c.set(x, top + 4, ST[2]); c.set(x, top + 5, ST[1]); }
  const ph = Math.round(w * 0.22);
  for (let y = top - ph; y <= top + 2; y++) {
    const hw = ((y - (top - ph)) / ph) * (w / 2 + 2);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const edge = Math.abs(x - cx) > hw - 2 || y >= top + 1;
      c.set(x, y, edge ? RT[x < cx ? 3 : 1] : ST[2]);
    }
  }
  for (let x = x0 - 1; x <= x0 + w + 1; x++) { c.set(x, groundY + 1, ST[3]); c.set(x, groundY + 2, ST[2]); c.set(x, groundY + 3, ST[1]); }
}

// Torre do sino (capela/igreja): torre quadrada com abertura em arco, sino e telhado pontudo.
function drawBellTower(c, cx, groundY, w, h, colors, ctx, opts = {}) {
  const x0 = Math.round(cx - w / 2);
  // torre quebrada: guarda o que havia atras do topo para devolver onde a pedra caiu
  const behind = opts.broken ? Array.from({ length: 40 }, (_, k) => Array.from({ length: w + 2 }, (_, j) => c.get(x0 - 1 + j, groundY - h - 3 + k))) : null;
  drawWall(c, x0, groundY - h, w, h, colors, 'pedra', { seed: 7, foundation: 0, corners: true });
  if (opts.spire) return drawSpireTop(c, cx, x0, w, groundY, h, colors, ctx);
  const ay = groundY - h + 6; const aw = Math.max(6, w - 8);
  const ax = Math.round(cx - aw / 2);
  for (let y = ay; y < ay + 10; y++) for (let x = ax; x < ax + aw; x++) {
    if (y < ay + 3 && Math.hypot(x - (ax + (aw - 1) / 2), (y - (ay + 3)) * 1.5) > aw / 2) continue;
    c.set(x, y, [34, 22, 40]);
  }
  if (opts.broken) return breakTowerTop(c, x0, w, groundY - h, behind, colors, opts.seed || 3);
  const G = tone5('#d0a440');
  for (let y = ay + 3; y < ay + 9; y++) { const hw = Math.round((y - ay - 2) * 0.6); for (let x = Math.round(cx) - hw; x <= Math.round(cx) + hw; x++) c.set(x, y, G[x < cx ? 4 : 2]); }
  const RT = tone5(colors.roof);
  const ph = Math.round(w * 1.4);
  for (let y = groundY - h - ph; y <= groundY - h + 1; y++) {
    const hw = ((y - (groundY - h - ph)) / ph) * (w / 2 + 3);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) c.set(x, y, RT[clamp(Math.round(x < cx ? 3 : 1.4), 0, 4)]);
  }
  const T = tone5('#d0a440');
  for (let y = groundY - h - ph - 6; y < groundY - h - ph; y++) c.set(Math.round(cx), y, T[3]);
  c.set(Math.round(cx) - 1, groundY - h - ph - 4, T[3]); c.set(Math.round(cx) + 1, groundY - h - ph - 4, T[3]);
  void ctx;
}

// Ameias sobre um volume de telhado plano (castelo, forte, muralha).
function drawBattlements(c, x0, w, topY, colors) {
  const ST = tone5(colors.stone);
  for (let y = topY - 6; y <= topY; y++) for (let x = x0 - 1; x <= x0 + w; x++) {
    const merlon = Math.floor((x - x0) / 5) % 2 === 0;
    if (y < topY - 3 && !merlon) continue;
    c.set(x, y, ST[y === topY - 6 || (y === topY - 3 && !merlon) ? 4 : x % 5 === 4 ? 1 : 2]);
  }
}

// Ruina: buracos no telhado e no alto das paredes, rachaduras e mato.
function ruinate(c, x0, w, yTop, yBot, seed, colors) {
  // buracos poucos e irregulares no telhado: fundo escuro marrom com caibros aparecendo e borda clara quebrada
  const WD = tone5((colors && colors.wood) || '#8a5a34');
  const holes = Math.max(2, Math.round(w / 30));
  for (let k = 0; k < holes; k++) {
    const cx = x0 + 8 + Math.floor(hashXY(k, 1, seed) * (w - 16)); const cy = yTop + 6 + Math.floor(hashXY(k, 2, seed) * Math.max(1, (yBot - yTop) * 0.35));
    const rx = 6 + Math.floor(hashXY(k, 3, seed) * 6); const ry = 4 + Math.floor(hashXY(k, 4, seed) * 3);
    const inside = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1 - hashXY(x, y, seed + k) * 0.35;
    for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
      if (!c.get(x, y) || !inside(x, y)) continue;
      const rafter = (x - cx + 64) % 5 === 0;
      c.set(x, y, rafter ? WD[1 + (y < cy ? 1 : 0)] : y <= cy - ry + 1 ? [62, 40, 34] : [44, 30, 30]);
      if (!inside(x, y + 1) && c.get(x, y + 1)) c.shade(x, y + 1, 1.25);
    }
  }
  // rachaduras finas na parede
  for (let k = 0; k < 3; k++) {
    let x = x0 + 4 + Math.floor(hashXY(k, 5, seed) * (w - 8)); let y = yBot - Math.floor(hashXY(k, 6, seed) * 14) - 10;
    for (let i = 0; i < 7; i++) { c.shade(x, y, 0.62); x += hashXY(x, y, seed) < 0.5 ? 1 : 0; y += 1; }
  }
  // tabuas soltas encostadas
  const lx = x0 + Math.floor(hashXY(9, 9, seed) * (w - 10)) + 4;
  for (let i = 0; i < 9; i++) { c.set(lx + Math.floor(i / 3), yBot + 5 - i, WD[2]); c.set(lx + 1 + Math.floor(i / 3), yBot + 5 - i, WD[3]); }
}

// Palafita: estacas de madeira e passarela embaixo da construcao (cabana de pescador).
function drawStilts(c, x0, w, groundY, h, colors) {
  const WD = tone5(colors.wood);
  for (let x = x0 + 2; x < x0 + w - 2; x += 10) for (let y = groundY - h; y <= groundY; y++) { c.set(x, y, WD[3]); c.set(x + 1, y, WD[2]); c.set(x + 2, y, WD[1]); }
  for (let y = groundY - h; y <= groundY - h + 2; y++) for (let x = x0 - 2; x <= x0 + w + 1; x++) c.set(x, y, WD[y === groundY - h ? 3 : (x % 4 === 0) ? 1 : 2]);
}

// Silo: cilindro alto com cupula.
function drawSilo(c, cx, groundY, r, h, colors) {
  const WT = tone5(colors.wall); const RT = tone5(colors.roof); const T = tone5(colors.trim);
  for (let y = groundY - h; y <= groundY; y++) for (let x = cx - r; x <= cx + r; x++) {
    const n = (x - cx) / r; const band = (groundY - y) % 12 < 2;
    c.set(x, y, (band ? T : WT)[clamp(Math.round(2 - n * 1.5), 0, 4)]);
  }
  for (let y = groundY - h - r; y <= groundY - h; y++) for (let x = cx - r; x <= cx + r; x++) {
    if (Math.hypot(x - cx, (y - (groundY - h)) * 1.3) > r) continue;
    c.set(x, y, RT[clamp(Math.round(2.4 - (x - cx) / r * 1.5 - (y - (groundY - h - r)) / r * -0.6), 0, 4)]);
  }
}

// Casa-cogumelo: chapeu pintado sobre um caule com porta e janela redonda.
function drawMushroom(c, cx, groundY, w, colors, ctx) {
  const ST = tone5('#e8dcc0'); const CP = tone5(colors.roof); const SP = tone5('#f6f0e0');
  const sh = Math.round(w * 0.45); const sw = Math.round(w * 0.32);
  for (let y = groundY - sh; y <= groundY; y++) for (let x = cx - sw; x <= cx + sw; x++) { const n = (x - cx) / sw; c.set(x, y, ST[clamp(Math.round(2.4 - n * 1.6), 0, 4)]); }
  const cy = groundY - sh; const r = w / 2;
  for (let y = cy - Math.round(r * 0.9); y <= cy + 4; y++) for (let x = Math.round(cx - r); x <= Math.round(cx + r); x++) {
    const nx = (x - cx) / r; const ny = (y - cy) / (r * 0.9);
    if (nx * nx + ny * ny > 1 && y < cy) continue;
    if (y >= cy && Math.abs(nx) > 1 - (y - cy) * 0.04) continue;
    let t = 2.4 - nx * 1.2 - ny * 0.6;
    const spot = Math.hypot(((x * 0.6 + y) % 13) - 6, ((y * 0.7 + x * 0.3) % 11) - 5) < 2.2 && y < cy;
    c.set(x, y, spot ? SP[3] : CP[clamp(Math.round(t), 0, 4)]);
  }
  drawDoor(c, cx, groundY - 1, { ...colors }, { w: 10, h: Math.min(14, sh - 4), locked: ctx.locked });
  drawWindow(c, cx - 3 + Math.round(sw * 0.5), groundY - sh + 4, colors, { w: 6, h: 6, round: true, shutters: false, night: ctx.night });
}

// Tenda (nomade/feira): lona em triangulo com listras e abertura.
function drawTent(c, cx, groundY, w, h, colors) {
  const A = tone5(colors.accent); const T = tone5(colors.wall);
  for (let y = groundY - h; y <= groundY; y++) {
    const hw = ((y - (groundY - h)) / h) * (w / 2);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const stripe = Math.floor((x - cx + 40 + (y - groundY) * 0.3) / 6) % 2 === 0;
      c.set(x, y, (stripe ? A : T)[x < cx ? 3 : 1]);
    }
  }
  for (let y = groundY - Math.round(h * 0.5); y <= groundY; y++) { const hw = ((y - (groundY - h * 0.5)) / (h * 0.5)) * (w / 6); for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) c.set(x, y, [40, 26, 30]); }
  const P = tone5(colors.wood); for (let y = groundY - h - 6; y < groundY - h; y++) c.set(Math.round(cx), y, P[2]);
}

// ---------- pecas novas: ruina de igreja, palafita com deque, castelo, tendas, porto, gotico ----------
const DARK = [40, 26, 32];
function line(c, x0, y0, x1, y1, rgb, thick = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) for (let k = 0; k < thick; k++) c.set(x0 + ((x1 - x0) * i) / n + k, y0 + ((y1 - y0) * i) / n, Array.isArray(rgb[0]) ? rgb[k] : rgb);
}
// ruido suave (valor interpolado): manchas organicas de musgo e grama
function vnoise(x, y, s) {
  const x0 = Math.floor(x); const y0 = Math.floor(y); const fx = x - x0; const fy = y - y0;
  const a = hashXY(x0, y0, s); const b = hashXY(x0 + 1, y0, s); const c = hashXY(x0, y0 + 1, s); const d = hashXY(x0 + 1, y0 + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

// Janela ogival (gotica): vitral colorido com chumbo; a noite acende quente.
function drawLancet(c, x, y, colors, { w = 7, h = 16, night = false, empty = false } = {}) {
  const TR = tone5(colors.trim); const LD = tone5(colors.stone);
  const GL = ['#a8384a', '#3a58a8', '#c8a040', '#3e7a4a'].map(tone5); const NG = tone5('#ffc85a');
  const cx = x + (w - 1) / 2; const tip = Math.ceil(w * 0.9);
  const half = (ly) => (ly >= tip ? w / 2 : (w / 2) * Math.sqrt(Math.max(0, ly / tip)));
  for (let ly = -1; ly <= h; ly++) for (let xx = Math.floor(cx - w / 2 - 1); xx <= Math.ceil(cx + w / 2 + 1); xx++) {
    const dx = Math.abs(xx - cx); const g = half(Math.max(0, ly));
    if (dx > g + 1.2) continue;
    const glass = ly >= 0 && ly < h && dx <= g - 0.3;
    if (!glass) { c.set(xx, y + ly, xx < cx ? TR[3] : TR[1]); continue; }
    if (empty) { const sh = hashXY(xx, ly, 5) < 0.12 && ly > h * 0.6; c.set(xx, y + ly, sh ? GL[(xx + ly) % 4][1] : [34 + ly, 26 + ly, 34 + ly]); continue; }
    if (dx < 0.6 || (ly > tip && (ly - tip) % 5 === 0)) { c.set(xx, y + ly, LD[0]); continue; }
    if (night) { c.set(xx, y + ly, NG[(ly % 5 === 1) ? 4 : 3], true); continue; }
    const pane = GL[(Math.floor((ly + 40) / 5) + (xx < cx ? 0 : 1)) % 4];
    c.set(xx, y + ly, pane[xx < cx ? (ly < tip + 2 ? 3 : 2) : 1]);
  }
  for (let xx = Math.round(cx - w / 2 - 2); xx <= Math.round(cx + w / 2 + 2); xx++) c.set(xx, y + h + 1, TR[3]);
}

// Rosacea (janela redonda de vitral no frontao).
function drawRose(c, cx, cy, r, colors, night) {
  const TR = tone5(colors.trim); const LD = tone5(colors.stone); const NG = tone5('#ffc85a');
  const GL = ['#a8384a', '#3a58a8', '#c8a040'].map(tone5);
  for (let y = cy - r - 1; y <= cy + r + 1; y++) for (let x = cx - r - 1; x <= cx + r + 1; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d > r + 1.2) continue;
    if (d > r - 0.6) { c.set(x, y, TR[x + y < cx + cy ? 3 : 1]); continue; }
    const a = Math.atan2(y - cy, x - cx); const seg = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 8);
    if ((Math.abs(Math.sin(a * 4)) * d < 0.7 && d > 1.5) || Math.abs(d - r * 0.5) < 0.5) { c.set(x, y, LD[0]); continue; }
    if (night) c.set(x, y, NG[d < 2 ? 4 : 3], true);
    else c.set(x, y, GL[(seg + (d < r * 0.5 ? 1 : 0)) % 3][d < 2 ? 4 : x < cx ? 3 : 2]);
  }
}

// Seteira: fenda estreita em cruz na pedra (muralha, torre).
function drawSlit(c, cx, y, h, colors) {
  const ST = tone5(colors.stone);
  const mid = y + Math.floor(h / 2);
  for (let yy = y - 1; yy <= y + h; yy++) for (let dx = -2; dx <= 2; dx++) {
    if (Math.abs(dx) === 2 || yy === y - 1 || yy === y + h) { if (Math.abs(dx) < 2 || (yy > y - 1 && yy < y + h)) c.set(cx + dx, yy, ST[dx < 0 || yy === y - 1 ? 3 : 1]); continue; }
    if (dx === 0 || yy === mid) c.set(cx + dx, yy, DARK);
  }
}

// Contraforte: pilar escalonado encostado na parede.
function drawButtress(c, x, top, base, colors) {
  const ST = tone5(colors.stone);
  const step = Math.round(top + (base - top) * 0.45);
  for (let y = top; y <= base; y++) {
    const wd = y < step ? 4 : 6; const xs = y < step ? x + 1 : x;
    for (let k = 0; k < wd; k++) c.set(xs + k, y, ST[(y - top) % 6 === 5 ? 1 : k === 0 ? 4 : k === wd - 1 ? 0 : k === wd - 2 ? 1 : 2]);
  }
  for (let k = 0; k < 4; k++) { c.set(x + 1 + k, top - 1, ST[4]); c.set(x + 2 + k - 1, top - 2, ST[3]); }
  for (let k = 0; k < 6; k++) c.set(x + k, step, ST[4]);
}

// Caixote de madeira (porto, armazem) com a tampa vista de cima.
const CRATE = tone5('#a87c4a');
function drawCrate(c, x, by, s) {
  const tH = Math.ceil(s / 2);
  for (let y = by - s - tH + 1; y <= by; y++) for (let xx = x; xx < x + s; xx++) {
    const lx = xx - x; const ly = y - (by - s + 1);
    let t;
    if (ly < 0) t = y === by - s - tH + 1 || lx === 0 ? 4 : lx === s - 1 ? 2 : (lx % 3 === 0 ? 3 : 4);
    else t = lx === 0 || ly === 0 ? 3 : lx === s - 1 || ly === s - 1 ? 0 : Math.abs(lx - ly) < 1 ? 3 : (ly === Math.floor(s / 2) ? 1 : 2);
    c.set(xx, y, CRATE[t]);
  }
}
// Barril com aros de ferro.
function drawBarrel(c, cx, by, r, h) {
  const B = tone5('#8a5a34'); const I = tone5('#6a6670');
  for (let y = by - h + 1; y <= by; y++) for (let x = cx - r; x <= cx + r; x++) {
    const n = (x - cx) / r; const ly = y - (by - h + 1);
    const hoop = ly === 2 || ly === h - 3;
    c.set(x, y, (hoop ? I : B)[clamp(Math.round(2.4 - n * 1.6 + (Math.abs(n) > 0.85 ? -0.6 : 0) + (x % 3 === 0 && !hoop ? -0.5 : 0)), 0, 4)]);
  }
  for (let y = by - h - 2; y <= by - h + 1; y++) for (let x = cx - r; x <= cx + r; x++) if (((x - cx) / (r + 0.4)) ** 2 + ((y - (by - h)) / 2.4) ** 2 <= 1) c.set(x, y, B[(x - cx) % 3 === 0 ? 2 : 3]);
}
// Peixe deitado (banca de peixe, cesto).
function drawFish(c, x, y, dir, col) {
  const F = tone5(col);
  for (let k = 0; k < 5; k++) { const X = x + k * dir; c.set(X, y, F[3]); if (k > 0 && k < 4) { c.set(X, y - 1, F[4]); c.set(X, y + 1, F[1]); } }
  c.set(x + dir, y, DARK);
  c.set(x + 5 * dir, y - 1, F[2]); c.set(x + 5 * dir, y + 1, F[2]); c.set(x + 6 * dir, y - 2, F[2]); c.set(x + 6 * dir, y + 2, F[1]);
}
// Rolo de corda.
function drawRope(c, cx, by) {
  const R = tone5('#c8a878');
  for (let y = by - 4; y <= by; y++) for (let x = cx - 6; x <= cx + 6; x++) {
    const d = Math.hypot((x - cx) / 6.5, (y - by + 2) / 2.6); if (d > 1) continue;
    c.set(x, y, R[Math.round(d * 6) % 2 ? 1 : x < cx ? 4 : 3]);
  }
  c.set(cx, by - 2, R[0]); c.set(cx + 1, by - 2, R[0]);
}
// Cesto de vime (com peixe ou fruta por cima).
function drawBasket(c, cx, by, fill) {
  const V = tone5('#b08a4a');
  for (let y = by - 6; y <= by; y++) for (let x = cx - 6; x <= cx + 6; x++) {
    const hw = 6 - (by - y < 2 ? 1 : 0); if (Math.abs(x - cx) > hw) continue;
    c.set(x, y, V[(x + y) % 2 ? 2 : (x < cx ? 4 : 3)]);
  }
  for (let x = cx - 6; x <= cx + 6; x++) c.set(x, by - 6, V[4]);
  if (fill === 'peixe') { drawFish(c, cx - 4, by - 7, 1, '#8aa0b8'); drawFish(c, cx + 4, by - 8, -1, '#a8b0c0'); }
  else for (let k = 0; k < 7; k++) { const F = tone5(['#d04a3a', '#e8a030', '#7ab040'][k % 3]); const fx = cx - 5 + (k % 4) * 3 + (k > 3 ? 1 : 0); const fy = by - 7 - (k > 3 ? 2 : 0); c.set(fx, fy, F[3]); c.set(fx + 1, fy, F[2]); c.set(fx, fy - 1, F[4]); c.set(fx + 1, fy - 1, F[3]); }
}
function drawProps(c, ox, groundY, props, colors) {
  for (const p of props || []) {
    const x = ox + p.x; const by = groundY - (p.y || 0);
    if (p.k === 'caixa') drawCrate(c, x - 5, by, p.s || 10);
    else if (p.k === 'caixas') { drawCrate(c, x - 10, by, 10); drawCrate(c, x, by, 10); drawCrate(c, x - 5, by - 15, 9); }
    else if (p.k === 'barril') drawBarrel(c, x, by, 5, 12);
    else if (p.k === 'corda') drawRope(c, x, by);
    else if (p.k === 'cesto') drawBasket(c, x, by, p.fill || 'peixe');
    else if (p.k === 'ancora') {
      const I = tone5('#5a5866');
      for (let y = by - 16; y <= by; y++) c.set(x, y, I[3]), c.set(x + 1, y, I[1]);
      for (let k = -5; k <= 6; k++) c.set(x + k, by - 13, I[2]);
      for (let k = 0; k <= 6; k++) { c.set(x - k, by - Math.round(k * 0.6), I[2]); c.set(x + 1 + k, by - Math.round(k * 0.6), I[1]); }
      c.set(x, by - 18, I[3]); c.set(x - 1, by - 17, I[3]); c.set(x + 2, by - 17, I[1]); c.set(x + 1, by - 18, I[2]);
    }
    void colors;
  }
}

// Viga de carga (armazem do cais): porta do sotao, viga saindo da parede, polia e fardo pendurado.
function drawHoist(c, cx, beamY, wallTop, base, colors) {
  const WD = tone5(colors.wood); const TR = tone5(colors.trim); const RP = tone5('#d8c090');
  const dy = wallTop + 5; const lh = 15;
  for (let y = dy; y < dy + lh; y++) for (let x = cx - 7; x <= cx + 7; x++) {
    const edge = x === cx - 7 || x === cx + 7 || y === dy;
    c.set(x, y, edge ? TR[x === cx + 7 ? 1 : 3] : WD[x === cx ? 0 : (x - cx + 7) % 3 === 0 ? 1 : y === dy + 1 ? 0 : 2]);
  }
  for (let x = cx - 8; x <= cx + 8; x++) c.set(x, dy + lh, TR[3]);
  // a viga vem na nossa direcao: na tela desce alguns pixels a partir da parede
  for (let y = beamY; y <= beamY + 7; y++) for (let x = cx - 2; x <= cx + 2; x++) c.set(x, y, WD[y === beamY ? 4 : y >= beamY + 6 ? 0 : x === cx - 2 ? 3 : x === cx + 2 ? 1 : 2]);
  const py = beamY + 9;
  for (let y = py - 2; y <= py + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) if (Math.hypot(x - cx, y - py) <= 2.3) c.set(x, y, [78, 74, 86]);
  c.set(cx - 1, py - 1, [160, 156, 168]);
  const rx = cx + 2; const top = dy + lh - 12;
  for (let y = py + 1; y < top - 5; y++) c.set(rx, y, RP[y % 2 ? 2 : 3]);
  drawCrate(c, rx - 4, top + 4, 9);
  void base;
}

// Mastro com bandeira (casa do capitao, castelo).
function drawFlag(c, x, topY, colors, h = 20) {
  const WD = tone5(colors.wood); const AC = tone5(colors.accent); const G = tone5('#d0a440');
  for (let y = topY; y < topY + h; y++) { c.set(x, y, WD[3]); c.set(x + 1, y, WD[1]); }
  c.set(x, topY - 1, G[4]); c.set(x + 1, topY - 1, G[2]);
  for (let k = 0; k < 11; k++) {
    const wave = Math.round(Math.sin(k * 0.7) * 1.2);
    const hh = 7 - Math.floor(k / 4);
    for (let j = 0; j < hh; j++) c.set(x + 2 + k, topY + 1 + j + wave + Math.floor((7 - hh) / 2), AC[j === 0 ? 4 : j === hh - 1 ? 1 : k % 4 === 3 ? 2 : 3]);
  }
}
// Estandarte pendurado na muralha (castelo).
function drawBanner(c, x, y, colors, w = 9, h = 22) {
  const AC = tone5(colors.accent); const G = tone5('#d0a440'); const WD = tone5(colors.wood);
  for (let k = -1; k <= w; k++) { c.set(x + k, y - 1, WD[3]); c.set(x + k, y, WD[1]); }
  for (let ly = 1; ly <= h; ly++) for (let lx = 0; lx < w; lx++) {
    const notch = ly > h - 4 && Math.abs(lx - (w - 1) / 2) < (ly - (h - 4)) * 0.9;
    if (notch) continue;
    const dia = Math.abs(lx - (w - 1) / 2) + Math.abs(ly - 9) <= 3;
    c.set(x + lx, y + ly, dia ? G[lx < w / 2 ? 4 : 2] : AC[lx === 0 ? 3 : lx === w - 1 ? 1 : 2]);
  }
}

// Topo de torre quebrado (igreja em ruinas): pedra irregular, sem telhado.
function breakTowerTop(c, x0, w, top, behind, colors, seed) {
  const ST = tone5(colors.stone);
  for (let x = x0 - 1; x <= x0 + w; x++) {
    const lx = x - x0;
    const cut = 2 + Math.round(Math.abs(Math.sin(lx * 0.55 + seed)) * 4 + hashXY(lx >> 1, 1, seed) * 4) + (lx > w * 0.55 ? Math.round((lx - w * 0.55) * 0.9) : 0);
    for (let y = top - 3; y < top + cut; y++) {
      const old = behind[y - top + 3]?.[x - x0 + 1];
      if (old) c.set(x, y, old); else c.clear(x, y);
    }
    c.set(x, top + cut, ST[4]); c.set(x, top + cut + 1, ST[3]);
  }
}
// Belfry gotico: aberturas ogivais, pinaculos nos cantos e agulha altissima de ardosia.
function drawSpireTop(c, cx, x0, w, groundY, h, colors, ctx) {
  const RT = tone5(colors.roof); const ST = tone5(colors.stone); const G = tone5('#c8a040');
  const top = groundY - h;
  // duas aberturas ogivais escuras
  for (const ox2 of [-Math.round(w * 0.22), Math.round(w * 0.22)]) {
    const ax = Math.round(cx + ox2); const ay = top + 6;
    for (let ly = 0; ly < 14; ly++) { const hw = ly < 4 ? Math.floor(ly * 0.6) : 2; for (let x = ax - hw; x <= ax + hw; x++) c.set(x, ay + ly, ctx.night ? [220, 170, 80] : [30, 22, 34], ctx.night); }
  }
  // cornija
  for (let x = x0 - 2; x <= x0 + w + 1; x++) { c.set(x, top, ST[4]); c.set(x, top + 1, ST[2]); c.set(x, top + 2, ST[0]); }
  // pinaculos
  for (const px of [x0 - 1, x0 + w - 3]) for (let y = top - 12; y < top; y++) { const hw = Math.floor((y - (top - 12)) / 5); for (let x = px + 1 - hw; x <= px + 2 + hw; x++) c.set(x, y, ST[x <= px + 1 ? 3 : 1]); }
  // agulha
  const ph = Math.round(w * 3.3); const base = top - 1;
  for (let y = base - ph; y <= base; y++) {
    const hw = ((y - (base - ph)) / ph) * (w / 2 + 1);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const course = (base - y) % 5 === 0;
      const t = (x < cx ? 3 : 1.2) - (course ? 0.9 : 0) + (Math.abs(x - cx) < 0.6 ? 0.6 : 0);
      c.set(x, y, RT[clamp(Math.round(t), 0, 4)]);
    }
  }
  // lucarna na base da agulha
  const ly0 = base - 12;
  for (let y = ly0; y <= base - 2; y++) { const hw = Math.floor((y - ly0) * 0.5); for (let x = Math.round(cx) - hw; x <= Math.round(cx) + hw; x++) c.set(x, y, Math.abs(x - cx) < hw - 1 && y > ly0 + 4 ? (ctx.night ? [220, 170, 80] : DARK) : RT[x < cx ? 4 : 2], ctx.night); }
  // cruz/fiel no topo
  for (let y = base - ph - 7; y < base - ph; y++) c.set(Math.round(cx), y, G[3]);
  c.set(Math.round(cx) - 1, base - ph - 5, G[3]); c.set(Math.round(cx) + 1, base - ph - 5, G[2]);
}

// Desabamento: um pedaco do telhado e do alto da parede caiu. Pelo buraco aparecem o escuro
// do interior, o ripado partido do telhado (madeira) e a borda quebrada da alvenaria; entulho na frente.
function collapseVolume(c, x0, w, wallTop, base, at, cw, seed, colors) {
  const ST = tone5(colors.stone); const WD = tone5(colors.wood); const MS = tone5('#4e7a3a');
  const cx = Math.round(x0 + w * at); const rx = cw / 2; const ry = cw * 0.42;
  const cy = wallTop - Math.round(ry * 0.25);
  const inside = (x, y) => {
    const n = (vnoise(x / 3, y / 3, seed) - 0.5) * 0.5;
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1 + n && y < wallTop + (base - wallTop) * 0.5;
  };
  const hole = [];
  for (let y = Math.floor(cy - ry - 3); y <= Math.ceil(cy + ry + 3); y++) for (let x = Math.floor(cx - rx - 3); x <= Math.ceil(cx + rx + 3); x++) {
    if (x < x0 || x >= x0 + w || !c.get(x, y) || !inside(x, y)) continue;
    hole.push([x, y]);
  }
  for (const [x, y] of hole) {
    const k = (y - (cy - ry)) / (2 * ry);
    const roof = y < wallTop;
    let rgb = [Math.round(38 + 26 * k), Math.round(28 + 18 * k), Math.round(32 + 12 * k)];
    if (!roof && hashXY(x, y, seed) < 0.12) rgb = ST[1];
    if (k > 0.75 && vnoise(x / 3, y / 2, seed + 1) < 0.35) rgb = MS[2];
    // ripado e caibros que sobraram (so na parte do telhado)
    if (roof) {
      const lath = (y + 400) % 5 === 0 && hashXY(x >> 2, y, seed) > 0.3;
      const rafter = (x - cx + 400) % 9 === 0 && hashXY(x, y >> 3, seed) > 0.25;
      if (rafter) rgb = WD[x < cx ? 2 : 1];
      else if (lath) rgb = WD[3];
    }
    c.set(x, y, rgb);
  }
  // borda quebrada: telha/pedra clara em cima do buraco, sombra embaixo dela
  for (const [x, y] of hole) {
    if (!inside(x, y - 1) && c.get(x, y - 1)) { c.set(x, y - 1, y - 1 < wallTop ? tone5(colors.roof)[4] : ST[4]); }
    if (!inside(x, y + 1) && c.get(x, y + 1) && y + 1 >= wallTop) { c.set(x, y + 1, ST[4]); c.set(x, y + 2, ST[3]); }
  }
  drawRubble(c, cx, base + 2, Math.round(cw * 0.9), colors, seed);
}
function drawRubble(c, cx, groundY, w, colors, seed) {
  const ST = tone5(colors.stone); const MS = tone5('#4e7a3a');
  const n = Math.round(w / 2.5); const stones = [];
  for (let i = 0; i < n; i++) {
    const u = hashXY(i, 1, seed) * 2 - 1; const hmax = Math.round((1 - Math.abs(u)) * 9);
    stones.push([Math.round(cx + (u * w) / 2), groundY - Math.floor(hashXY(i, 2, seed) * (hmax + 1)), 2 + Math.floor(hashXY(i, 3, seed) * 3)]);
  }
  stones.sort((a, b) => a[1] - b[1]);
  for (const [x, y, s] of stones) for (let dy = 0; dy < s; dy++) for (let dx = 0; dx <= s; dx++) c.set(x + dx, y - dy, ST[dy === s - 1 ? 4 : dx === 0 ? 3 : dx === s ? 1 : 2]);
  for (let i = 0; i < n / 2; i++) { const x = Math.round(cx + (hashXY(i, 7, seed) * 2 - 1) * w * 0.55); c.set(x, groundY, MS[3]); c.set(x, groundY - 1, MS[2]); c.set(x + 1, groundY - 2, MS[3]); }
}
// Mato tomando conta: musgo nas telhas e na pedra (manchas organicas), sem apagar janela acesa.
function overgrow(c, seed, amount = 0.3) {
  const MS = tone5('#5a8a3a');
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const p = c.get(x, y); if (!p || c.glow[y * c.w + x]) continue;
    const n = vnoise(x / 7, y / 5, seed) * 0.85 + hashXY(x, y, seed) * 0.15;
    if (n > amount) continue;
    const lum = (p[0] + p[1] + p[2]) / 3; const m = MS[clamp(Math.round(lum / 48 - 0.3), 0, 4)];
    const k = n < amount - 0.1 ? 0.78 : 0.45;
    c.px[y * c.w + x] = p.map((v, i) => Math.round(v * (1 - k) + m[i] * k));
  }
}

// Palafita com deque: estacas altas, piso de tabuas na frente da casa, guarda-corpo e escada ate o chao/agua.
function drawStiltDeck(c, x0, w, groundY, h, deck, ladderX, colors) {
  const WD = tone5(colors.wood); const WET = tone5('#3a4a40');
  const top = groundY - h; const backY = groundY - deck;
  const posts = []; for (let x = x0 + 2; x <= x0 + w - 5; x += 16) posts.push(x);
  if (posts[posts.length - 1] < x0 + w - 8) posts.push(x0 + w - 5);
  const post = (x, y0, y1, dim) => {
    for (let y = y0; y <= y1; y++) for (let k = 0; k < 3; k++) {
      const wet = y > y1 - 4; const t = (k === 0 ? 3 : k === 1 ? 2 : 1) - (dim ? 1 : 0);
      c.set(x + k, y, (wet ? WET : WD)[clamp(t, 0, 4)]);
    }
  };
  for (const x of posts) post(x, top - deck, backY, true);
  // piso do deque visto de cima e a borda da frente
  for (let y = top - deck; y <= top; y++) for (let x = x0 - 1; x <= x0 + w; x++) {
    const v = top - y; const joint = (x + Math.floor(v / 3) * 7) % 23 === 0;
    c.set(x, y, WD[v % 3 === 2 || joint ? 1 : v % 3 === 0 ? 4 : 3]);
  }
  for (let x = x0 - 1; x <= x0 + w; x++) { c.set(x, top + 1, WD[2]); c.set(x, top + 2, WD[1]); c.set(x, top + 3, WD[0]); }
  // estacas da frente com travas em X
  for (const x of posts) post(x, top + 4, groundY, false);
  for (let i = 0; i + 1 < posts.length; i++) {
    const a = posts[i] + 3; const b = posts[i + 1] - 1; if (ladderX > a - 4 && ladderX < b + 4) continue;
    line(c, a, top + 5, b, groundY - 6, WD[1]); line(c, b, top + 5, a, groundY - 6, WD[2]);
  }
  // guarda-corpo na frente (com a passagem da escada) e nas laterais
  const gap = (x) => Math.abs(x - ladderX) < 7;
  for (let x = x0; x < x0 + w; x++) { if (gap(x)) continue; c.set(x, top - 8, WD[4]); c.set(x, top - 7, WD[2]); if ((x - x0) % 6 === 0) for (let y = top - 6; y < top; y++) c.set(x, y, WD[2]); }
  for (const sx of [x0, x0 + w - 2]) for (let y = top - deck - 6; y <= top - 7; y++) { c.set(sx, y, WD[3]); c.set(sx + 1, y, WD[1]); }
  // escada
  for (let y = top - 2; y <= groundY; y++) { c.set(ladderX - 4, y, WD[3]); c.set(ladderX + 3, y, WD[1]); if ((y - top) % 4 === 1) for (let x = ladderX - 3; x <= ladderX + 2; x++) c.set(x, y, WD[x < ladderX ? 4 : 3]); }
}

// Telheiro aberto (mercado de peixe, banca de feira): pilares, fundo na sombra, balcao com mercadoria.
function drawStallShed(c, x0, w, groundY, footH, colors, style, ctx, { canvas = false, goods = 'peixe' } = {}) {
  const WD = tone5(colors.wood); const ST = tone5(colors.stone); const AC = tone5(colors.accent); const CV = tone5(colors.wall);
  const postH = 34; const eave = groundY - postH; const depth = Math.round(Math.min(30, footH * 0.42));
  // fundo: parede de tabuas na sombra e chao de pedra
  for (let y = eave; y <= groundY; y++) for (let x = x0 + 2; x < x0 + w - 2; x++) {
    const k = (y - eave) / postH;
    c.set(x, y, k < 0.42 ? WD[(x - x0) % 6 === 0 ? 0 : k < 0.1 ? 0 : 1] : ST[(x + Math.floor(y / 4) * 3) % 9 === 0 || y % 4 === 0 ? 1 : 2]);
  }
  // rede e peixes pendurados no fundo
  if (goods === 'peixe') {
    const R = tone5('#c8b890');
    for (let y = eave + 3; y < eave + 13; y++) for (let x = x0 + 8; x < x0 + 30; x++) if ((x + y) % 4 === 0 || (x - y + 400) % 4 === 0) c.set(x, y, R[2]);
    for (let x = x0 + w - 34; x < x0 + w - 10; x += 6) { c.set(x, eave + 3, R[1]); drawFish(c, x - 1, eave + 7, 1, '#8aa0b8'); }
  } else {
    for (let x = x0 + 10; x < x0 + w - 10; x += 9) { const F = tone5(['#c8a040', '#7ab040', '#d04a3a'][(x >> 3) % 3]); for (let y = eave + 4; y < eave + 11; y++) c.set(x, y, F[y === eave + 4 ? 1 : x % 2 ? 2 : 3]); }
  }
  // pilares
  const posts = [x0 + 2, x0 + w - 5]; for (let x = x0 + 50; x < x0 + w - 40; x += 48) posts.push(x);
  for (const px of posts) for (let y = eave; y <= groundY; y++) { c.set(px, y, WD[3]); c.set(px + 1, y, WD[2]); c.set(px + 2, y, WD[1]); }
  // balcao (com passagem no meio)
  const cx = x0 + w / 2;
  for (let x = x0 + 6; x < x0 + w - 6; x++) {
    if (Math.abs(x - cx) < 9) continue;
    for (let y = groundY - 15; y <= groundY - 2; y++) {
      const top = y < groundY - 11;
      c.set(x, y, top ? WD[y === groundY - 15 ? 4 : 3] : WD[(x - x0) % 5 === 0 ? 0 : y === groundY - 11 ? 0 : 2]);
    }
  }
  // mercadoria em cima do balcao
  for (let x = x0 + 9; x < x0 + w - 12; x += 9) {
    if (Math.abs(x + 3 - cx) < 13) continue;
    if (goods === 'peixe') {
      const k = Math.floor((x - x0) / 9);
      if (k % 3 === 2) { const I = tone5('#c8e4f0'); for (let y = groundY - 18; y <= groundY - 15; y++) for (let xx = x; xx < x + 8; xx++) c.set(xx, y, I[(xx + y) % 3 ? 3 : 4]); }
      else { drawFish(c, x, groundY - 15, 1, k % 2 ? '#8aa0b8' : '#c87a5a'); drawFish(c, x + 7, groundY - 17, -1, '#a8b0c0'); }
    } else {
      for (let k = 0; k < 6; k++) { const F = tone5(['#d04a3a', '#e8a030', '#7ab040', '#e8d040'][(k + (x >> 3)) % 4]); const fx = x + (k % 3) * 3; const fy = groundY - 16 - (k > 2 ? 2 : 0); c.set(fx, fy, F[3]); c.set(fx + 1, fy, F[2]); c.set(fx, fy - 1, F[4]); c.set(fx + 1, fy - 1, F[3]); }
    }
  }
  // cobertura: telhado de verdade ou lona listrada com sanefa recortada
  if (!canvas) {
    drawRoofFront(c, x0, w, eave, depth, colors, style || 'tabuinhas', { overhang: 4 });
  } else {
    for (let y = eave - depth; y <= eave; y++) {
      const v = (eave - y) / depth;
      for (let x = x0 - 3; x <= x0 + w + 2; x++) {
        const stripe = Math.floor((x - x0 + 40) / 8) % 2 === 0;
        const t = 2.6 + (v > 0.9 ? 1 : 0) - (x > x0 + w - 4 ? 1 : 0) + (x < x0 + 2 ? 0.8 : 0) - (v < 0.08 ? 0.6 : 0);
        c.set(x, y, (stripe ? AC : CV)[clamp(Math.round(t), 0, 4)]);
      }
    }
    for (let x = x0 - 3; x <= x0 + w + 2; x++) {
      const k = (x - x0 + 40) % 8; const drop = 2 + Math.round(Math.sqrt(Math.max(0, 12 - (k - 3.5) ** 2)));
      for (let y = eave + 1; y <= eave + drop; y++) c.set(x, y, (Math.floor((x - x0 + 40) / 8) % 2 === 0 ? AC : CV)[y === eave + drop ? 1 : 2]);
    }
  }
  // placa com o peixe pendurada no meio
  if (goods === 'peixe') {
    const sx = Math.round(cx) - 7; const sy = eave + 5;
    for (let y = sy; y < sy + 8; y++) for (let x = sx; x < sx + 14; x++) c.set(x, y, WD[y === sy ? 4 : y === sy + 7 ? 1 : 3]);
    drawFish(c, sx + 3, sy + 4, 1, '#3e6e94');
    c.set(sx + 2, sy - 1, WD[0]); c.set(sx + 11, sy - 1, WD[0]);
  }
  void ctx;
}

// Tendas variadas: redonda (feltro, tipo iurta), canadense (em A), abrigo (lona inclinada), do lider (pavilhao).
function drawRoundTent(c, cx, groundY, R, colors, ctx) {
  const WL = tone5(colors.wall); const AC = tone5(colors.accent); const RF = tone5(colors.roof); const WD = tone5(colors.wood);
  const ry = Math.max(3, Math.round(R * 0.32)); const wallH = Math.round(R * 0.62); const coneH = Math.round(R * 0.7);
  const baseCy = groundY - ry;
  for (let x = cx - R; x <= cx + R; x++) {
    const n = (x - cx) / R; const e = Math.sqrt(Math.max(0, 1 - n * n));
    const yb = Math.round(baseCy + ry * e); const yt = Math.round(baseCy - wallH + ry * e);
    for (let y = yt; y <= yb; y++) {
      const ly = y - yt; let col = WL; let t = 2.7 - n * 1.5;
      if (ly >= 2 && ly < 6) { col = (Math.abs(((x - cx + 40) % 6) - 3) + Math.abs(ly - 3.5) < 2.5) ? WL : AC; t += 0.3; }
      if (y >= yb - 1) t -= 1.2;
      c.set(x, y, col[clamp(Math.round(t), 0, 4)]);
    }
  }
  const rimCy = baseCy - wallH; const RR = R + 2; const rry = ry + 1; const apexY = rimCy - coneH;
  for (let y = apexY; y <= rimCy + rry; y++) for (let x = cx - RR; x <= cx + RR; x++) {
    const inEll = ((x - cx) / RR) ** 2 + ((y - rimCy) / rry) ** 2 <= 1;
    const inTri = y <= rimCy && Math.abs(x - cx) <= ((y - apexY) / coneH) * RR;
    if (!inEll && !inTri) continue;
    const n = (x - cx) / RR;
    const ang = (x - cx) / Math.max(1, y - apexY + 3);
    const seam = Math.abs((((ang * 2.6) % 1) + 1) % 1 - 0.5) > 0.4;
    const edge = inEll && y > rimCy && ((x - cx) / RR) ** 2 + ((y + 2 - rimCy) / rry) ** 2 > 1;
    const t = 2.6 - n * 1.5 - (seam ? 0.8 : 0);
    c.set(x, y, edge ? AC[clamp(Math.round(t + 0.4), 0, 4)] : RF[clamp(Math.round(t), 0, 4)]);
  }
  for (let y = apexY - 3; y <= apexY + 1; y++) for (let x = cx - 3; x <= cx + 3; x++) if (Math.hypot(x - cx, (y - apexY + 1) * 1.5) <= 3.2) c.set(x, y, WD[x < cx ? 3 : 1]);
  drawDoor(c, cx, groundY - 2, { ...colors, wood: colors.accent }, { w: 10, h: Math.min(15, wallH + 2), locked: ctx.locked, arch: false });
}
function drawAFrameTent(c, cx, groundY, W, footH, colors) {
  const CV = tone5(colors.wall); const AC = tone5(colors.accent); const WD = tone5(colors.wood);
  const hw = Math.round(W / 2) - 4; const H = Math.round(hw * 1.1); const D = Math.round(footH * 0.5);
  const edgeY = (x) => groundY - H * (1 - Math.abs(x - cx) / hw);
  for (let x = cx - hw - 1; x <= cx + hw + 1; x++) {
    const ey = Math.round(edgeY(Math.max(cx - hw, Math.min(cx + hw, x))));
    const left = x < cx;
    for (let y = ey - D; y <= ey; y++) {
      let t = (left ? 3.1 : 1.4) - (Math.abs(x - cx) % 7 === 3 ? 0.9 : 0) - (y < ey - D + 2 ? 0.5 : 0);
      if (Math.abs(x - cx) < 1) t = 4;
      c.set(x, y, CV[clamp(Math.round(t), 0, 4)]);
    }
  }
  const oH = Math.round(H * 0.72);
  for (let y = groundY - H + 2; y <= groundY; y++) {
    const half = ((y - (groundY - H)) / H) * hw - 1;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const d = Math.abs(x - cx); const oh = ((y - (groundY - oH)) / oH) * hw * 0.5;
      let rgb = CV[d > half - 1.5 ? (x < cx ? 3 : 1) : 2];
      if (y > groundY - oH && d <= oh) { const k = (y - (groundY - oH)) / oH; rgb = [Math.round(34 + 26 * k), Math.round(24 + 18 * k), Math.round(30 + 10 * k)]; }
      else if (y > groundY - oH - 2 && d <= oh + 3.5) rgb = AC[x < cx ? 3 : 2];
      c.set(x, y, rgb);
    }
  }
  // mastro com flamula na ponta de tras da cumeeira
  const py = groundY - H - D;
  for (let y = py - 7; y < py + 1; y++) c.set(cx, y, WD[2]);
  for (let k = 0; k < 5; k++) { c.set(cx + 1 + k, py - 7 + Math.floor(k / 2), AC[3]); c.set(cx + 1 + k, py - 6 + Math.floor(k / 2), AC[2]); }
  line(c, cx - hw + 2, groundY - 6, cx - hw - 3, groundY, WD[1]); line(c, cx + hw - 2, groundY - 6, cx + hw + 3, groundY, WD[1]);
  for (const sx of [cx - hw - 3, cx + hw + 3]) { c.set(sx, groundY, WD[3]); c.set(sx, groundY - 1, WD[3]); }
}
function drawLeanTo(c, x0, W, groundY, footH, colors) {
  const CV = tone5(colors.wall); const AC = tone5(colors.accent); const WD = tone5(colors.wood);
  const a = x0 + 6; const b = x0 + W - 7; const Hf = 22; const D = Math.round(footH * 1.05);
  const yF = groundY - Hf; const yB = groundY - D;
  for (let y = yF; y <= groundY; y++) for (let x = a; x <= b; x++) { const k = (y - yF) / Hf; c.set(x, y, [Math.round(44 + 50 * k), Math.round(34 + 40 * k), Math.round(34 + 22 * k)]); }
  // cama de palha, trouxa e panela
  const P = tone5('#c8a050');
  for (let y = groundY - 7; y <= groundY - 1; y++) for (let x = a + 4; x < a + 28; x++) c.set(x, y, P[(x + y) % 3 ? 2 : 3]);
  for (let y = groundY - 9; y <= groundY - 3; y++) for (let x = a + 6; x < a + 22; x++) c.set(x, y, AC[y === groundY - 9 ? 4 : x === a + 6 ? 4 : y > groundY - 5 ? 1 : 2]);
  for (let y = groundY - 10; y <= groundY - 2; y++) for (let x = b - 14; x < b - 4; x++) if (Math.hypot(x - (b - 9), (y - (groundY - 6)) * 1.1) < 5) c.set(x, y, tone5('#9a7a4a')[x < b - 9 ? 3 : 1]);
  const sag = (x) => yF + Math.round(2 * Math.sin((Math.PI * (x - a)) / (b - a)));
  for (let y = yB; y <= yF + 3; y++) for (let x = a - 2; x <= b + 2; x++) {
    const yf = sag(x); if (y > yf) continue;
    const v = (yf - y) / Math.max(1, yf - yB);
    let t = 3.2 - v * 1.3 - (x > b - 4 ? 0.9 : 0) + (x < a + 2 ? 0.6 : 0) - ((x - a + 40) % 10 === 0 ? 0.9 : 0);
    c.set(x, y, (y >= yf - 1 ? AC : CV)[clamp(Math.round(t), 0, 4)]);
  }
  for (const px of [a, b - 1]) for (let y = yF - 3; y <= groundY; y++) { c.set(px, y, WD[3]); c.set(px + 1, y, WD[1]); }
  line(c, a, yF - 2, a - 5, groundY, WD[1]); line(c, b, yF - 2, b + 5, groundY, WD[1]);
}
function drawLeaderTent(c, x0, W, groundY, footH, colors, ctx) {
  const CV = tone5(colors.wall); const AC = tone5(colors.accent); const RF = tone5(colors.roof); const WD = tone5(colors.wood); const G = tone5('#d0a440');
  const a = x0 + 7; const b = x0 + W - 8; const cx = Math.round((a + b) / 2); const wallH = 30; const yE = groundY - wallH;
  const D = Math.round(footH * 0.5); const hwE = (b - a) / 2 + 4; const ridgeHalf = Math.round(hwE * 0.3);
  for (let y = yE; y <= groundY; y++) for (let x = a; x <= b; x++) {
    const stripe = Math.floor((x - a) / 8) % 2 === 0; const n = (x - cx) / ((b - a) / 2);
    const t = 2.7 - n * 0.9 - (x > b - 3 ? 1 : 0) + (x < a + 2 ? 0.8 : 0) - (y > groundY - 2 ? 1 : 0);
    c.set(x, y, (stripe ? AC : CV)[clamp(Math.round(t), 0, 4)]);
  }
  const dw = 10; const dh = 24;
  for (let y = groundY - dh; y <= groundY; y++) for (let x = cx - dw; x <= cx + dw; x++) {
    const k = (y - (groundY - dh)) / dh; const lim = dw * Math.min(1, k * 1.5);
    if (Math.abs(x - cx) <= lim - 3) c.set(x, y, ctx.night ? [Math.round(200 + 40 * k), Math.round(140 + 30 * k), 70] : [Math.round(40 + 34 * k), Math.round(28 + 24 * k), Math.round(30 + 12 * k)], ctx.night);
    else if (Math.abs(x - cx) <= lim) c.set(x, y, CV[x < cx ? 4 : 3]);
  }
  for (let x = cx - 6; x <= cx + 6; x++) { c.set(x, groundY, AC[1]); c.set(x, groundY + 1, AC[2]); }
  for (let y = yE - D; y <= yE + 1; y++) {
    const v = (yE - y) / D; const hw = hwE - (hwE - ridgeHalf) * v;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const u = (x - cx) / hw; const stripe = Math.floor((u + 1) * 4.5) % 2 === 0;
      const t = 2.8 - u * 1.3 + (v > 0.94 ? 1.2 : 0);
      c.set(x, y, (stripe ? RF : CV)[clamp(Math.round(t), 0, 4)]);
    }
  }
  for (let x = Math.round(cx - hwE); x <= Math.round(cx + hwE); x++) {
    const k = (x - Math.round(cx - hwE)) % 8; const drop = 2 + Math.round(Math.sqrt(Math.max(0, 12 - (k - 3.5) ** 2)));
    for (let y = yE + 1; y <= yE + 1 + drop; y++) c.set(x, y, (Math.floor((x - cx + 400) / 8) % 2 ? AC : RF)[y === yE + 1 + drop ? 1 : 2]);
    c.set(x, yE + 1, G[3]);
  }
  for (const px of [cx - ridgeHalf, cx + ridgeHalf]) {
    for (let y = yE - D - 16; y < yE - D + 1; y++) { c.set(px, y, WD[3]); c.set(px + 1, y, WD[1]); }
    c.set(px, yE - D - 17, G[4]);
    for (let k = 0; k < 8; k++) { const hh = 5 - Math.floor(k * 0.6); for (let j = 0; j < hh; j++) c.set(px + 2 + k, yE - D - 15 + j + Math.round(Math.sin(k * 0.8)), AC[j === 0 ? 4 : 3]); }
  }
}

// Guindaste de madeira do porto: roda de pisar, mastro em A, lanca, corda e carga.
function drawCrane(c, x0, W, groundY, colors) {
  const WD = tone5(colors.wood); const RP = tone5('#d8c090'); const IR = tone5('#5a5866');
  for (let y = groundY - 4; y <= groundY; y++) for (let x = x0 + 1; x < x0 + W - 1; x++) c.set(x, y, WD[y === groundY - 4 ? 4 : y === groundY ? 0 : (x - x0) % 7 === 0 ? 1 : 2]);
  const mx = x0 + Math.round(W * 0.56); const top = groundY - 76;
  const tipX = x0 + W - 3; const tipY = top - 6;
  // cordas por tras
  line(c, x0 + 16, groundY - 21, mx, top + 3, RP[2]);
  // pernas do mastro e travessas
  line(c, mx - 10, groundY - 4, mx - 1, top, [WD[3], WD[2], WD[1]], 3);
  line(c, mx + 8, groundY - 4, mx - 1, top, [WD[3], WD[2], WD[1]], 3);
  for (const ty of [groundY - 26, groundY - 50]) { const k = (groundY - 4 - ty) / (groundY - 4 - top); const hw = Math.round(9 * (1 - k)); for (let x = mx - hw - 1; x <= mx + hw + 2; x++) { c.set(x, ty, WD[3]); c.set(x, ty + 1, WD[1]); } }
  // lanca
  line(c, mx - 6, top + 14, tipX, tipY, [WD[4], WD[2], WD[1]], 3);
  for (let y = top - 2; y <= top + 3; y++) for (let x = mx - 2; x <= mx + 3; x++) c.set(x, y, WD[y === top - 2 ? 4 : 2]);
  // corda do topo ate a ponta, descendo com gancho e fardo
  line(c, mx + 1, top + 1, tipX, tipY + 1, RP[3]);
  const hookY = groundY - 30;
  for (let y = tipY + 3; y < hookY; y++) c.set(tipX, y, RP[y % 2 ? 2 : 3]);
  c.set(tipX, hookY, IR[3]); c.set(tipX + 1, hookY + 1, IR[2]); c.set(tipX - 1, hookY + 1, IR[2]);
  // fardo em rede
  const N = tone5('#a8865a');
  for (let y = hookY + 2; y <= hookY + 12; y++) for (let x = tipX - 6; x <= tipX + 6; x++) {
    if (Math.hypot((x - tipX) / 6.5, (y - hookY - 7) / 5.5) > 1) continue;
    c.set(x, y, (x + y) % 3 === 0 ? N[1] : N[x < tipX ? 3 : 2]);
  }
  // roda de pisar (de perfil) por cima
  const wx = x0 + 17; const wy = groundY - 21; const R = 16;
  for (let y = wy - R - 2; y <= wy + R + 2; y++) for (let x = wx - R - 2; x <= wx + R + 2; x++) {
    const dx = x - wx; const dy = y - wy; const d = Math.hypot(dx, dy); const a = Math.atan2(dy, dx);
    const ak = Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
    const rim = d <= R + 1.5 && d >= R - 2;
    const spoke = d < R - 1 && d * Math.abs(Math.sin(a - ak)) < 1;
    const tread = d < R - 1.5 && d > R - 4 && Math.abs(Math.sin(a * 8)) < 0.3;
    if (d < 2.6) c.set(x, y, IR[dx + dy < 0 ? 3 : 1]);
    else if (rim) c.set(x, y, WD[clamp(Math.round(2.4 - (dx + dy) / R - (d > R ? 0.6 : 0)), 0, 4)]);
    else if (spoke || tread) c.set(x, y, WD[spoke ? 1 : 2]);
  }
  // suporte da roda
  line(c, wx - 8, groundY - 4, wx, wy, WD[2]); line(c, wx + 8, groundY - 4, wx, wy, WD[1]);
}

// Roda d'agua (moinho d'agua): aro duplo, raios, pas; calha trazendo agua por cima; espuma embaixo.
function drawWaterWheel(c, cx, cy, r, flumeX, colors) {
  const WD = tone5(colors.wood); const WA = tone5('#5a9ad0'); const IR = tone5('#5a5866');
  // calha
  const fy = cy - r - 8;
  for (let x = Math.min(flumeX, cx - 2); x <= Math.max(flumeX, cx + 2); x++) for (let y = fy; y <= fy + 5; y++) c.set(x, y, y <= fy + 1 ? WA[(x + y) % 4 ? 3 : 4] : WD[y === fy + 5 ? 0 : y === fy + 2 ? 3 : 2]);
  const sp = flumeX > cx ? flumeX - 3 : flumeX + 2;
  if (Math.abs(sp - cx) > r + 3) for (let y = fy + 6; y < cy + r; y++) for (let x = sp; x <= sp + 2; x++) c.set(x, y, WD[x === sp ? 3 : 1]);
  for (let y = cy - r - 2; y <= cy + r + 5; y++) for (let x = cx - r - 5; x <= cx + r + 5; x++) {
    const dx = x - cx; const dy = y - cy; const d = Math.hypot(dx, dy); const a = Math.atan2(dy, dx);
    const ak = Math.round(a / (Math.PI / 6)) * (Math.PI / 6); const ak3 = Math.round(a / (Math.PI / 3)) * (Math.PI / 3);
    const paddle = d > r - 2 && d <= r + 4.5 && d * Math.abs(Math.sin(a - ak)) < 1.3;
    const rim = Math.abs(d - r) < 1.5 || Math.abs(d - r * 0.6) < 1;
    const spoke = d < r && d * Math.abs(Math.sin(a - ak3)) < 1.1;
    const light = -(dx + dy) / (r * 1.3);
    if (d < 3) c.set(x, y, IR[dx + dy < 0 ? 3 : 1]);
    else if (paddle) c.set(x, y, WD[clamp(Math.round(2.6 + light), 0, 4)]);
    else if (rim) c.set(x, y, WD[clamp(Math.round(2.2 + light), 0, 4)]);
    else if (spoke) c.set(x, y, WD[1]);
  }
  // agua caindo da calha na roda e espuma embaixo
  for (let y = fy + 6; y < cy - r + 6; y++) for (let x = cx + 1; x <= cx + 4; x++) c.set(x, y, WA[(y + x) % 3 ? 3 : 4]);
  const F = tone5('#e8f4ff');
  for (let x = cx - r - 4; x <= cx + r + 4; x++) for (let y = cy + r - 2; y <= cy + r + 3; y++) {
    if (Math.hypot((x - cx) / (r + 4), (y - cy - r) / 3.2) > 1) continue;
    if (hashXY(x, y, 3) < 0.55) c.set(x, y, (hashXY(x, y, 4) < 0.5 ? F : WA)[hashXY(x, y, 5) < 0.5 ? 4 : 3]);
  }
}

// Castelo grande com patio: muralha da frente com portao e grade, torres redondas nos cantos,
// adarves nas laterais, patio de lajes e grama, torre de menagem no fundo e salao/estabulo nos lados.
function drawCastle(c, ox, groundY, spec, colors, ctx) {
  const W = spec.w * 16; const footH = spec.h * 16; const big = spec.w >= 24;
  const mat = spec.material || 'pedra'; const rs = spec.roofStyle || 'ardosia';
  const ST = tone5(colors.stone); const GR = tone5('#5a7a40'); const IR = tone5('#4a4852');
  const PT = tone5('#a08c74'); // lajes do patio: pedra mais quente que a muralha
  const side = 14; const frontH = big ? 54 : 48; const backH = 40;
  const backBase = groundY - footH + 30; const frontTop = groundY - frontH + 1;
  const cx = ox + W / 2;
  const kw = Math.round((W * (big ? 0.36 : 0.42)) / 2) * 2; const kx = Math.round((W - kw) / 2);
  const keepBase = backBase + Math.round((frontTop - backBase) * 0.5);
  // patio
  for (let y = backBase - 3; y <= frontTop + 4; y++) for (let x = ox + side; x < ox + W - side; x++) {
    const row = Math.floor(y / 6); const u = (x + (row % 2) * 5) % 10; const v = y % 6;
    const path = Math.abs(x - cx) < 12 && y > keepBase - 2;
    const g = vnoise(x / 6, y / 5, ctx.seed + 5) * 0.8 + hashXY(x, y, ctx.seed) * 0.2;
    let rgb = v === 5 || u === 0 ? PT[1] : v === 0 || u === 1 ? PT[3] : PT[path ? 3 : 2];
    if (!path && g < 0.3) rgb = GR[v === 5 || u === 0 ? 1 : 2];
    if (y > frontTop - 4) rgb = PT[1];
    c.set(x, y, rgb);
  }
  drawWall(c, ox + side - 2, backBase - backH + 1, W - 2 * side + 4, backH, colors, mat, { seed: ctx.seed + 1, foundation: 3 });
  drawBattlements(c, ox + side - 2, W - 2 * side + 4, backBase - backH + 1, colors);
  // adarves das laterais (vemos so o alto da muralha)
  const sTop = backBase - backH - 5; const sBot = frontTop - 2;
  for (const sx of [ox, ox + W - side]) for (let y = sTop; y <= sBot; y++) for (let x = sx; x < sx + side; x++) {
    const lx = x - sx; const edge = lx < 3 || lx >= side - 3; const merlon = Math.floor((y - sTop) / 5) % 2 === 0;
    let t;
    if (edge) t = merlon ? (lx === 0 || lx === side - 3 ? 4 : lx === side - 1 || lx === 2 ? 2 : 3) : 0;
    else t = y % 6 === 0 || (x + Math.floor(y / 6) * 3) % 7 === 0 ? 1 : 2;
    c.set(x, y, ST[t]);
  }
  // torres do fundo
  const tr = big ? 16 : 14;
  for (const tx of [ox + tr - 2, ox + W - tr + 2]) drawTower(c, tx, backBase + 2, tr, backH + 30, colors, ctx);
  if (big) for (const tx of [ox + 7, ox + W - 7]) drawTower(c, tx, Math.round((backBase + frontTop) / 2) + 8, 11, 54, colors, ctx, { crown: true });
  // torre de menagem com torrinhas nos cantos e bandeira
  const kh = big ? 100 : 88;
  const keep = { x: kx, w: kw, wallH: kh, roof: 'frente', depth: big ? 40 : 34, setback: groundY - keepBase, material: mat, roofStyle: rs, windows: 0, flag: true, flagAt: 0.5 };
  drawVolume(c, ox, groundY, keep, colors, ctx);
  const kTop = keepBase - kh + 1;
  for (let sx = ox + kx + 16; sx <= ox + kx + kw - 22; sx += 22) {
    if (Math.abs(sx + 3 - cx) < 12) { drawWindow(c, sx, kTop + 34, colors, { w: 8, h: 10, night: ctx.night, shutters: false, round: true }); continue; }
    drawWindow(c, sx, kTop + 12, colors, { w: 7, h: 10, night: ctx.night, shutters: false, round: true });
    drawWindow(c, sx, kTop + 40, colors, { w: 7, h: 10, night: ctx.night, shutters: false, round: true });
  }
  for (const tx of [ox + kx + 2, ox + kx + kw - 3]) drawTower(c, tx, keepBase + 2, 9, kh + 10, colors, ctx, { window: false });
  // salao e estabulo nos lados do patio
  const hb = keepBase + 18; const hw = Math.min(big ? 88 : 64, kx - side - 18);
  if (hw >= 40) {
    drawVolume(c, ox, groundY, { x: side + 6, w: hw, wallH: 38, roof: 'frente', depth: 24, setback: groundY - hb, material: mat, roofStyle: rs, chimney: true, winSpacing: 18 }, colors, ctx);
    drawVolume(c, ox, groundY, { x: W - side - 6 - hw, w: hw, wallH: 34, roof: 'frente', depth: 24, setback: groundY - hb, material: 'verticais', roofStyle: 'tabuinhas', barnDoor: true, windows: 0 }, { ...colors, roof: '#7a5a3a', wall: '#8a5a3a' }, ctx);
  }
  // muralha da frente com seteiras
  drawWall(c, ox, frontTop, W, frontH, colors, mat, { seed: ctx.seed + 2 });
  drawBattlements(c, ox, W, frontTop, colors);
  for (let sx = ox + 40; sx < ox + W - 40; sx += 24) if (Math.abs(sx - cx) > (big ? 52 : 46)) drawSlit(c, sx, frontTop + 14, 12, colors);
  // portao
  const gw = big ? 76 : 64; const gx = Math.round(cx - gw / 2); const gh = frontH + 26;
  drawWall(c, gx, groundY - gh + 1, gw, gh, colors, mat, { seed: ctx.seed + 3 });
  drawBattlements(c, gx, gw, groundY - gh + 1, colors);
  drawWindow(c, Math.round(cx - 4), groundY - gh + 12, colors, { w: 8, h: 8, night: ctx.night, shutters: false, round: true });
  const aw = 26; const ah = 34; const acx = cx - 0.5; const ar = aw / 2; const springY = groundY - ah + ar;
  for (let y = groundY - ah - 4; y <= groundY; y++) for (let x = Math.round(acx - ar - 4); x <= Math.round(acx + ar + 4); x++) {
    const dx = Math.abs(x - acx);
    const inner = y >= springY ? dx <= ar : Math.hypot(dx, y - springY) <= ar;
    const outer = y >= springY ? dx <= ar + 3 : Math.hypot(dx, y - springY) <= ar + 3.5;
    if (!outer) continue;
    if (!inner) { const ang = Math.atan2(y - springY, x - acx); c.set(x, y, ST[y >= springY ? (x < acx ? 4 : 1) : Math.round(ang * 5) % 2 ? 3 : 4]); continue; }
    const k = (y - (groundY - ah)) / ah;
    const grid = y < groundY - ah * 0.42 && ((x - Math.round(acx) + 40) % 4 === 0 || y % 4 === 0);
    if (grid) c.set(x, y, IR[y % 4 === 0 ? 1 : 2]);
    else if (k > 0.82) c.set(x, y, ST[k > 0.92 ? 2 : 1]);
    else c.set(x, y, [Math.round(30 + 24 * k), Math.round(22 + 18 * k), Math.round(28 + 12 * k)]);
  }
  for (let x = Math.round(acx - ar); x <= Math.round(acx + ar); x++) if ((x - Math.round(acx) + 40) % 4 === 0) { c.set(x, groundY - Math.round(ah * 0.42), IR[3]); c.set(x, groundY - Math.round(ah * 0.42) + 1, IR[0]); }
  for (const bx of [gx + 5, gx + gw - 14]) drawBanner(c, bx, groundY - gh + 22, colors);
  const fr = big ? 20 : 18;
  for (const tx of [ox + fr - 2, ox + W - fr + 2]) drawTower(c, tx, groundY, fr, frontH + 36, colors, ctx);
}

const NEW_TENTS = new Set(['redonda', 'canadense', 'abrigo', 'lider', 'mercado']);
function drawTentKind(c, kind, ox, W, groundY, footH, colors, ctx, spec) {
  if (kind === 'redonda') return drawRoundTent(c, ox + W / 2, groundY, Math.round(W / 2) - 3, colors, ctx);
  if (kind === 'canadense') return drawAFrameTent(c, ox + W / 2, groundY, W, footH, colors);
  if (kind === 'abrigo') return drawLeanTo(c, ox, W, groundY, footH, colors);
  if (kind === 'lider') return drawLeaderTent(c, ox, W, groundY, footH, colors, ctx);
  return drawStallShed(c, ox + 2, W - 4, groundY, footH, colors, spec.roofStyle, ctx, { canvas: true, goods: 'frutas' });
}

// ---------- montagem ----------
// spec: { w, h (celulas), volumes:[...], tower, vines, bushes, colors, seed }
// Devolve { width, height, data, offsetY } no mesmo formato do house3d (16 px por celula).
export function renderBuilding(spec, { light = 'dia', locked = false, style } = {}) {
  const S = 16;
  const W = spec.w * S + 8;
  const footH = spec.h * S;
  const tall = Math.max(40, ...spec.volumes.map((v) => v.wallH + (v.depth ?? footH * 0.62) + (v.roof === 'empena' || v.roof === 'celeiro' ? v.w * 0.5 * Math.max(1, v.pitch || 0) : 8) + (v.setback || 0))) + (spec.tower ? spec.tower.h + spec.tower.r * 2 : 0) + (spec.bell ? spec.bell.h + spec.bell.w * (spec.bell.spire ? 3.5 : 1.6) + 8 : 0) + (spec.silo ? spec.silo.h + spec.silo.r : 0) + (spec.stilts || 0) + 18;
  const H = Math.ceil(Math.max(footH, tall, spec.rise || 0)) + 10;
  const c = createCanvas(W, H);
  const groundY = H - 12;
  const ox = 4;
  const colors = { ...DEFAULT_COLORS, ...(spec.colors || {}) };
  const ctx = { night: resolveLight(light).night, seed: spec.seed || 0, locked, footH };
  // de tras para frente: volumes recuados primeiro
  const order = [...spec.volumes].sort((a, b) => (b.setback || 0) - (a.setback || 0));
  if (spec.stilts && spec.deck) {
    const dv = spec.volumes.find((v) => v.door !== false) || spec.volumes[0];
    drawStiltDeck(c, ox, spec.w * S, groundY, spec.stilts, spec.deck, Math.round(ox + dv.x + (dv.doorAt != null ? dv.doorAt : (dv.w - 1) / 2)), colors);
  } else if (spec.stilts) drawStilts(c, ox, spec.w * S, groundY, spec.stilts, colors);
  const base = groundY - (spec.stilts || 0);
  if (spec.special === 'cogumelo') drawMushroom(c, ox + spec.w * S / 2, base, spec.w * S, colors, ctx);
  else if (spec.special === 'tenda' && NEW_TENTS.has(spec.tent)) drawTentKind(c, spec.tent, ox, spec.w * S, base, footH, colors, ctx, spec);
  else if (spec.special === 'castelo') drawCastle(c, ox, base, spec, colors, ctx);
  else if (spec.special === 'guindaste') drawCrane(c, ox, spec.w * S, base, colors);
  else if (spec.special === 'telheiro') drawStallShed(c, ox + 2, spec.w * S - 4, base, footH, colors, spec.roofStyle, ctx, { goods: spec.goods || 'peixe' });
  else if (spec.special === 'tenda') drawTent(c, ox + spec.w * S / 2, base, spec.w * S, Math.round(footH * 0.8 + 10), colors);
  for (const v of order) {
    const info = drawVolume(c, ox, base, v, colors, ctx);
    const vx = ox + v.x; const vb = base - (v.setback || 0);
    if (v.awning) drawAwning(c, vx + 6, v.w - 12, vb - v.wallH + 10, colors);
    if (v.battlements) drawBattlements(c, vx, v.w, vb - v.wallH + 1, colors);
    if (v.ruin) ruinate(c, vx, v.w, (info?.top ?? vb - v.wallH), vb - 6, (spec.seed || 0) + v.x, colors);
    if (v.collapse) collapseVolume(c, vx, v.w, vb - v.wallH + 1, vb, v.collapse.at ?? 0.65, v.collapse.w ?? 40, (spec.seed || 0) + 11, colors);
  }
  if (spec.portico) drawPortico(c, ox + spec.portico.x, spec.portico.w, base - 1, spec.portico.h, colors);
  if (spec.bell) drawBellTower(c, ox + spec.bell.x, base - (spec.bell.setback || 0), spec.bell.w, spec.bell.h, colors, ctx, spec.bell);
  if (spec.silo) drawSilo(c, ox + spec.silo.x, base, spec.silo.r, spec.silo.h, colors);
  if (spec.tower) drawTower(c, ox + spec.tower.x, base, spec.tower.r, spec.tower.h, colors, ctx, spec.tower);
  if (spec.wheel) drawWaterWheel(c, ox + spec.wheel.x, base - spec.wheel.r - 3, spec.wheel.r, ox + (spec.wheel.flume ?? spec.wheel.x - spec.wheel.r - 10), colors);
  if (spec.overgrown) overgrow(c, (spec.seed || 0) + 21, spec.overgrown === true ? 0.3 : spec.overgrown);
  if (spec.vines) drawVines(c, ox + spec.vines, groundY - (spec.volumes[0].wallH - 6), groundY - 5, spec.seed || 0);
  for (const bx of spec.bushes || []) drawBush(c, ox + bx, groundY, bx);
  drawProps(c, ox, groundY, spec.props, colors);
  // contorno escuro em volta (cor sepia, nunca preto)
  const OUT = [42, 26, 34];
  const add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (c.get(x, y)) continue;
    if (c.get(x + 1, y) || c.get(x - 1, y) || c.get(x, y + 1) || c.get(x, y - 1)) add.push([x, y]);
  }
  for (const [x, y] of add) c.set(x, y, OUT);
  // RGBA + sombra no chao + luz da cena
  // estilo do mapa ANTES da luz, na mesma ordem do chao (render.js): senao o obscuro escurecia
  // por cima da noite e a casa ficava bem mais funda que o resto do mapa
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const p = c.px[i]; if (!p) continue;
    data[i * 4] = p[0]; data[i * 4 + 1] = p[1]; data[i * 4 + 2] = p[2]; data[i * 4 + 3] = 255;
  }
  applyStyle(data, style);
  // noite de lua (azul claro, legivel) igual ao LIGHT_TINT do compose.js
  const tint = resolveLight(light).tint;
  if (tint) for (let i = 0; i < W * H; i++) {
    if (!data[i * 4 + 3] || c.glow[i]) continue;
    for (let k = 0; k < 3; k++) data[i * 4 + k] = (data[i * 4 + k] * tint[k]) / 255;
  }
  for (let y = groundY + 3; y < H; y++) for (let x = 6; x < W; x++) {
    const i = (y * W + x) * 4; if (data[i + 3]) continue;
    data.set([30, 18, 40, Math.max(0, 130 - (y - groundY - 3) * 26)], i);
  }
  // recorta as linhas vazias de cima (o sprite fica do tamanho do desenho)
  let top = 0;
  while (top < groundY && !data.subarray(top * W * 4, (top + 1) * W * 4).some((v, i) => i % 4 === 3 && v)) top++;
  top = Math.max(0, top - 1);
  const cut = data.slice(top * W * 4);
  // a base da construcao (groundY) cai na ultima linha da pegada
  return { width: W, height: H - top, data: cut, offsetX: -4, offsetY: footH - (groundY + 1 - top) };
}
