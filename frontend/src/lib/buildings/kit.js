// Kit de construcoes em pixel art (estilo Stardew como referencia, nunca copiado).
// Uma construcao e montada a partir de VOLUMES (corpo, ala recuada, torre, varanda) desenhados
// em projecao 3/4: a profundidade do predio vira altura na tela. Telhado "frente" (cumeeira
// paralela a fachada: vemos a agua da frente subindo) ou "empena" (frontao triangular virado
// para nos e as duas aguas recuando para cima). Cada material tem um desenho feito a mao em
// regras pequenas (tabuas, troncos, pedra, tijolo, reboco com enxaimel) com luz do alto-esquerda.
// Puro (sem DOM): devolve RGBA; o Board e as previas em node usam o mesmo codigo.
import { ramp, hexToRgb } from '../avatar/palette.js';

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
  drawWall(c, x0, wallTop + (v.roof === 'frente' || !v.roof ? 3 : 0), w, v.wallH - (v.roof === 'frente' || !v.roof ? 3 : 0), colors, v.material || 'tabuas', { seed: ctx.seed, braces: v.braces });
  // janelas
  const night = ctx.night;
  const doorCx = v.door === false ? null : x0 + (v.doorAt != null ? v.doorAt : (w - 1) / 2);
  const winY = wallTop + (v.roof === 'frente' ? 9 : 6);
  const winH = clamp(v.wallH - 22, 7, 12);
  const slots = [];
  const spacing = v.winSpacing || 20;
  for (let cxw = x0 + 10; cxw <= x0 + w - 12; cxw += spacing) slots.push(cxw);
  for (const sx of slots) {
    if (doorCx != null && Math.abs(sx + 5 - doorCx) < 16) continue;
    if (v.windows === 0) break;
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
  if (roofInfo && v.roof === 'empena' && roofInfo.gh > 12) {
    const gx = Math.round(x0 + (w - 1) / 2 - 3);
    drawWindow(c, gx, wallTop - Math.round(roofInfo.gh * 0.55), colors, { w: 6, h: 6, night, shutters: false, round: true });
  }
  if (doorCx != null) drawDoor(c, doorCx, base - 4, colors, { w: v.barnDoor ? 18 : 12, h: v.barnDoor ? Math.min(26, v.wallH - 4) : clamp(v.wallH - 10, 14, 20), locked: ctx.locked, double: v.doubleDoor, barn: v.barnDoor, arch: !v.barnDoor });
  if (v.porch && doorCx != null) drawPorch(c, Math.round(doorCx - v.porch / 2), v.porch, base - 1, colors);
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
function drawTower(c, cx, groundY, r, h, colors, ctx) {
  // torre redonda: cilindro com sombreamento horizontal e telhado conico
  const WT = tone5(colors.stone); const RT = tone5(colors.roof);
  for (let y = groundY - h; y <= groundY; y++) for (let x = cx - r; x <= cx + r; x++) {
    const n = (x - cx) / r;
    const t = 2 + -n * 1.4 - (Math.abs(n) > 0.8 ? 0.6 : 0);
    const row = Math.floor((groundY - y) / 5); const seam = (groundY - y) % 5 === 0 || (x + row * 3) % 8 === 0;
    c.set(x, y, WT[clamp(Math.round(seam ? t - 1 : t), 0, 4)]);
  }
  const coneH = Math.round(r * 2.2);
  for (let y = groundY - h - coneH; y <= groundY - h + 1; y++) {
    const hw = ((y - (groundY - h - coneH)) / coneH) * (r + 2);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const n = (x - cx) / (hw || 1);
      c.set(x, y, RT[clamp(Math.round(2.2 - n * 1.5 + ((y + Math.round(x * 0.5)) % 4 === 0 ? -0.8 : 0)), 0, 4)]);
    }
  }
  drawWindow(c, cx - 3, groundY - h + 8, colors, { w: 6, h: 9, night: ctx.night, shutters: false, round: true });
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
function drawBellTower(c, cx, groundY, w, h, colors, ctx) {
  const x0 = Math.round(cx - w / 2);
  drawWall(c, x0, groundY - h, w, h, colors, 'pedra', { seed: 7, foundation: 0, corners: true });
  const ay = groundY - h + 6; const aw = Math.max(6, w - 8);
  const ax = Math.round(cx - aw / 2);
  for (let y = ay; y < ay + 10; y++) for (let x = ax; x < ax + aw; x++) {
    if (y < ay + 3 && Math.hypot(x - (ax + (aw - 1) / 2), (y - (ay + 3)) * 1.5) > aw / 2) continue;
    c.set(x, y, [34, 22, 40]);
  }
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

// ---------- montagem ----------
// spec: { w, h (celulas), volumes:[...], tower, vines, bushes, colors, seed }
// Devolve { width, height, data, offsetY } no mesmo formato do house3d (16 px por celula).
export function renderBuilding(spec, { light = 'dia', locked = false } = {}) {
  const S = 16;
  const W = spec.w * S + 8;
  const footH = spec.h * S;
  const tall = Math.max(40, ...spec.volumes.map((v) => v.wallH + (v.depth ?? footH * 0.62) + (v.roof === 'empena' || v.roof === 'celeiro' ? v.w * 0.5 : 8) + (v.setback || 0))) + (spec.tower ? spec.tower.h + spec.tower.r * 2 : 0) + (spec.bell ? spec.bell.h + spec.bell.w * 1.6 : 0) + (spec.silo ? spec.silo.h + spec.silo.r : 0) + (spec.stilts || 0) + 18;
  const H = Math.ceil(Math.max(footH, tall)) + 10;
  const c = createCanvas(W, H);
  const groundY = H - 12;
  const ox = 4;
  const colors = { ...DEFAULT_COLORS, ...(spec.colors || {}) };
  const ctx = { night: light === 'noite' || light === 'entardecer', seed: spec.seed || 0, locked, footH };
  // de tras para frente: volumes recuados primeiro
  const order = [...spec.volumes].sort((a, b) => (b.setback || 0) - (a.setback || 0));
  if (spec.stilts) drawStilts(c, ox, spec.w * S, groundY, spec.stilts, colors);
  const base = groundY - (spec.stilts || 0);
  if (spec.special === 'cogumelo') drawMushroom(c, ox + spec.w * S / 2, base, spec.w * S, colors, ctx);
  else if (spec.special === 'tenda') drawTent(c, ox + spec.w * S / 2, base, spec.w * S, Math.round(footH * 0.8 + 10), colors);
  for (const v of order) {
    const info = drawVolume(c, ox, base, v, colors, ctx);
    const vx = ox + v.x; const vb = base - (v.setback || 0);
    if (v.awning) drawAwning(c, vx + 6, v.w - 12, vb - v.wallH + 10, colors);
    if (v.battlements) drawBattlements(c, vx, v.w, vb - v.wallH + 1, colors);
    if (v.ruin) ruinate(c, vx, v.w, (info?.top ?? vb - v.wallH), vb - 6, (spec.seed || 0) + v.x, colors);
  }
  if (spec.portico) drawPortico(c, ox + spec.portico.x, spec.portico.w, base - 1, spec.portico.h, colors);
  if (spec.bell) drawBellTower(c, ox + spec.bell.x, base - (spec.bell.setback || 0), spec.bell.w, spec.bell.h, colors, ctx);
  if (spec.silo) drawSilo(c, ox + spec.silo.x, base, spec.silo.r, spec.silo.h, colors);
  if (spec.tower) drawTower(c, ox + spec.tower.x, base, spec.tower.r, spec.tower.h, colors, ctx);
  if (spec.vines) drawVines(c, ox + spec.vines, groundY - (spec.volumes[0].wallH - 6), groundY - 5, spec.seed || 0);
  for (const bx of spec.bushes || []) drawBush(c, ox + bx, groundY, bx);
  // contorno escuro em volta (cor sepia, nunca preto)
  const OUT = [42, 26, 34];
  const add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (c.get(x, y)) continue;
    if (c.get(x + 1, y) || c.get(x - 1, y) || c.get(x, y + 1) || c.get(x, y - 1)) add.push([x, y]);
  }
  for (const [x, y] of add) c.set(x, y, OUT);
  // RGBA + sombra no chao + luz da cena
  const data = new Uint8ClampedArray(W * H * 4);
  const tint = { entardecer: [242, 184, 144], noite: [58, 70, 136] }[light];
  for (let i = 0; i < W * H; i++) {
    const p = c.px[i]; if (!p) continue;
    const m = tint && !c.glow[i] ? tint.map((v) => v / 255) : [1, 1, 1];
    data[i * 4] = p[0] * m[0]; data[i * 4 + 1] = p[1] * m[1]; data[i * 4 + 2] = p[2] * m[2]; data[i * 4 + 3] = 255;
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
