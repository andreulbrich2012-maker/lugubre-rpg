// Barcos em pixel art 3/4 (estilo Stardew, desenho proprio): casco com costado de tabuas, convés
// com tabuas no comprimento, mastros com vela, remos, bandeira e esteira de espuma animada.
// Desenhado em codigo pixel a pixel no tamanho nativo (16 px = 1 celula) e ampliado nitido.
// O casco e um "campo de alturas": para cada pixel da tela desce do alto ate achar o barco
// (convés, cabine, castelo de popa, caixotes), entao o mesmo codigo serve as 8 direcoes.
import { DIRS } from './route.js';

const K = 0.55; // achatamento do chao na vista 3/4
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const C = Object.fromEntries(Object.entries({
  out: '#2a1c2e', out2: '#3c2a3e',
  w0: '#3d2230', w1: '#5c3328', w2: '#7d4a2e', w3: '#9e6635', w4: '#c08746', w5: '#e0ad66', w6: '#f0cc8a',
  sail: '#faefd6', sail2: '#e6d6b4', sail3: '#c4ad8a',
  red: '#ac3440', red2: '#7c2238', red3: '#d8584c',
  teal: '#2c8098', teal2: '#1e4a62', teal3: '#4cbcc6',
  gold: '#e4ae3c', gold2: '#b47c28',
  ink: '#1c2860', foam: '#c4eef2', white: '#f6fbff', glass: '#9fd8ec'
}).map(([k, v]) => [k, hex(v)]));

// Tipos: L/B = comprimento/boca em px; H = borda livre; masts u = posicao (fracao de L)
export const SPRITE_TYPES = {
  bote: { L: 26, B: 12, H: 4, band: null, oars: [0], masts: [], seat: true },
  pesca: { L: 38, B: 15, H: 5, band: 'teal', masts: [{ u: 0.14, h: 30, sail: 'lateen' }], crates: true },
  veleiro: { L: 48, B: 16, H: 6, band: 'white', masts: [{ u: 0.1, h: 46, sail: 'lateen', jib: true }], cabin: true },
  gale: { L: 72, B: 20, H: 6, band: 'red', oars: [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3], masts: [{ u: 0.04, h: 46, sail: 'square', stripes: true }], ram: true },
  navio: { L: 88, B: 28, H: 10, band: 'gold', ports: true, castle: true, masts: [{ u: 0.3, h: 64, sail: 'square' }, { u: 0.02, h: 74, sail: 'square' }, { u: -0.26, h: 58, sail: 'square' }] }
};

const DIR_ANGLE = Object.fromEntries(DIRS.map((d, i) => [d, (i * Math.PI) / 4]));

function hash(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) & 0xffff) / 0xffff;
}

// meia-boca do casco em u (popa arredondada, proa em ogiva)
function halfWidth(t, u) {
  const Lh = t.L / 2; const Bh = t.B / 2;
  if (u > Lh || u < -Lh) return -1;
  const bow = t.L * 0.32; const stern = t.L * 0.12;
  if (u > Lh - bow) { const k = (u - (Lh - bow)) / bow; return Bh * (1 - k * k); }
  if (u < -Lh + stern) { const k = (-Lh + stern - u) / stern; return Bh * (1 - 0.35 * k * k); }
  return Bh;
}

// superficie de cima em (u, v): convés, castelo de popa, cabine, caixotes
function surface(t, u, v) {
  const Lh = t.L / 2;
  if (t.castle && u < -Lh * 0.52) return { h: t.H + 6, kind: 'castle' };
  if (t.castle && u > Lh * 0.62) return { h: t.H + 3, kind: 'castle' };
  if (t.cabin && u > -Lh * 0.82 && u < -Lh * 0.38 && Math.abs(v) < t.B * 0.3) return { h: t.H + 6, kind: 'roof' };
  if (t.crates) {
    const boxes = [[-0.18, -0.2], [-0.3, 0.18], [-0.05, 0.22]];
    for (const [bu, bv] of boxes) if (Math.abs(u - bu * t.L) < 2.6 && Math.abs(v - bv * t.B) < 2.2) return { h: t.H + 4, kind: 'crate' };
  }
  if (t.seat && Math.abs(u) < 1.6) return { h: t.H + 1, kind: 'seat' };
  return { h: t.H, kind: 'deck' };
}

function buffer(w, h) { return { w, h, px: new Int16Array(w * h * 4).fill(-1) }; }
function setPx(b, x, y, rgb, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= b.w || y >= b.h) return;
  const i = (y * b.w + x) * 4;
  b.px[i] = rgb[0]; b.px[i + 1] = rgb[1]; b.px[i + 2] = rgb[2]; b.px[i + 3] = a;
}
const filled = (b, x, y) => x >= 0 && y >= 0 && x < b.w && y < b.h && b.px[(y * b.w + x) * 4 + 3] > 0;
// contorno colorido escuro em volta da peca (4 vizinhos)
function outline(b, rgb = C.out) {
  const add = [];
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    if (filled(b, x, y)) continue;
    if (filled(b, x - 1, y) || filled(b, x + 1, y) || filled(b, x, y - 1) || filled(b, x, y + 1)) add.push([x, y]);
  }
  for (const [x, y] of add) setPx(b, x, y, rgb);
  return b;
}
function over(dst, src) {
  for (let i = 0; i < dst.px.length; i += 4) {
    const a = src.px[i + 3];
    if (a <= 0) continue;
    if (a >= 255 || dst.px[i + 3] <= 0) { dst.px[i] = src.px[i]; dst.px[i + 1] = src.px[i + 1]; dst.px[i + 2] = src.px[i + 2]; dst.px[i + 3] = Math.max(a, dst.px[i + 3]); continue; }
    const k = a / 255;
    for (let c = 0; c < 3; c++) dst.px[i + c] = Math.round(dst.px[i + c] * (1 - k) + src.px[i + c] * k);
  }
}

const BANDS = { teal: [C.teal3, C.teal, C.teal2], white: [C.white, C.sail2, C.sail3], red: [C.red3, C.red, C.red2], gold: [C.gold, C.gold2, C.w1] };

// Um quadro: tipo, direcao (e, se, s, ...), quadro 0..3, andando (esteira e remos) ou parado.
export function renderBoat(type, dir = 'e', frame = 0, moving = true) {
  const t = SPRITE_TYPES[type] || SPRITE_TYPES.pesca;
  const a = DIR_ANGLE[dir] ?? 0;
  const ca = Math.cos(a); const sa = Math.sin(a);
  const mastTop = Math.max(t.H + 8, ...t.masts.map((m) => m.h));
  const R = t.L / 2 + t.L * 0.75 + 6;
  const W = Math.ceil(R * 2);
  const ax = Math.round(R);
  const ay = Math.round(mastTop + 10 + R * K);
  const Hh = Math.ceil(ay + R * K + 4);
  const bob = moving ? [0, 0, 1, 1][frame % 4] : [0, 0, 0, 1][frame % 4];
  // chao (u, v, z) -> tela
  const toScreen = (u, v, z) => {
    const X = u * ca - v * sa; const Y = u * sa + v * ca;
    return [ax + X, ay + Y * K - z];
  };
  const toLocal = (sx, sy, z) => {
    const X = sx - ax; const Y = (sy - ay + z) / K;
    return [X * ca + Y * sa, -X * sa + Y * ca];
  };
  // vergas bracejadas para o lado que deixa a vela mais larga na tela (nunca vira so uma linha)
  const spanLen = (b) => { const su = Math.sin(b); const sv = Math.cos(b); const X = su * ca - sv * sa; const Y = su * sa + sv * ca; return Math.hypot(X, Y * K); };
  const brace = spanLen(0.6) >= spanLen(-0.6) ? 0.6 : -0.6;
  const BRACE_S = Math.sin(brace); const BRACE_C = Math.cos(brace);
  const inHull = (u, v, z) => {
    const s = 0.78 + 0.22 * Math.min(1, z / t.H);
    const hw = halfWidth(t, u / s);
    return hw >= 0 && Math.abs(v / s) <= hw;
  };

  // ---- agua: sombra e esteira ----
  const water = buffer(W, Hh);
  for (let sy = 0; sy < Hh; sy++) for (let sx = 0; sx < W; sx++) {
    const [u, v] = toLocal(sx, sy - 1, 0);
    const hw = halfWidth(t, u / 1.06);
    if (hw >= 0 && Math.abs(v / 1.06) <= hw + 0.6) setPx(water, sx, sy, C.ink, 110);
  }
  const foam = (u, v, rgb = C.foam, al = 255) => { const [x, y] = toScreen(u, v, 0); setPx(water, x, y, rgb, al); };
  const Lh = t.L / 2;
  if (moving) {
    for (let d = 0; d < t.L * 0.38; d += 0.5) for (const side of [-1, 1]) {
      if ((d + frame * 1.5) % 4 < 2.2) foam(Lh - d * 0.9, side * (d * 0.5 + 0.8), d < 3 ? C.white : C.foam);
    }
    const wakeLen = Math.min(t.L * 0.55, 30);
    for (let d = 0; d < wakeLen; d += 0.5) for (const side of [-1, 1]) {
      const fade = d > wakeLen * 0.55;
      if (((d - frame * 2 + 40) % 5) < 3 && !(fade && hash(Math.round(d), side, frame) < 0.5)) {
        foam(-Lh - d, side * (t.B * 0.32 + d * 0.32), fade ? C.foam : C.white, fade ? 150 : 255);
        if (d < wakeLen * 0.4 && hash(Math.round(d * 2), side, frame + 7) < 0.5) foam(-Lh - d, side * (t.B * 0.32 + d * 0.32 - 1), C.foam, 220);
      }
    }
    for (let i = 0; i < t.L * 0.7; i++) {
      const d = hash(i, 3, frame) * wakeLen * 0.6; const v = (hash(i, 5, frame) - 0.5) * t.B * 0.6;
      foam(-Lh - 1 - d, v, C.foam, 200);
    }
  }
  // espuma colada no casco (pisca de leve mesmo parado)
  for (let sy = 0; sy < Hh; sy++) for (let sx = 0; sx < W; sx++) {
    const [u, v] = toLocal(sx, sy, 0);
    const hw = halfWidth(t, u / 0.8);
    const hw2 = halfWidth(t, u / 0.95);
    const outside = hw < 0 || Math.abs(v / 0.8) > hw;
    const near = hw2 >= 0 && Math.abs(v / 0.95) <= hw2 + 0.9;
    if (outside && near && hash(sx, sy, frame) < (moving ? 0.55 : 0.3)) setPx(water, sx, sy, hash(sx, sy, 9 + frame) < 0.4 ? C.white : C.foam);
  }

  // ---- casco (campo de alturas) ----
  const hull = buffer(W, Hh);
  const zTop = t.H + 8;
  const bandRamp = t.band ? BANDS[t.band] : null;
  for (let sy = 0; sy < Hh; sy++) for (let sx = 0; sx < W; sx++) {
    for (let z = zTop; z >= 0; z -= 0.5) {
      const [u, v] = toLocal(sx, sy + bob, z);
      if (!inHull(u, v, Math.min(z, t.H))) continue;
      const surf = surface(t, u, v);
      if (z > surf.h) continue;
      let rgb;
      // normal do costado na tela: lado de quem olha da esquerda (luz) fica mais claro
      const nx = Math.sign(v) * -sa; const lit = nx < -0.25 ? 1 : nx > 0.35 ? -1 : 0;
      if (z > surf.h - 0.75) {
        const hw = halfWidth(t, u);
        const rail = hw - Math.abs(v) < 1.3;
        if (surf.kind === 'roof') rgb = (Math.floor(u) % 3 === 0) ? C.red2 : C.red;
        else if (surf.kind === 'crate') rgb = Math.abs(u - Math.round(u / 5.2) * 5.2) < 0.6 ? C.w2 : C.w4;
        else if (surf.kind === 'seat') rgb = C.w5;
        else if (rail) rgb = C.w5;
        else {
          const idx = Math.floor((v + 50) / 2.6);
          const seam = Math.floor(u + idx * 7 + 100) % 11 === 0;
          rgb = seam ? C.w2 : idx % 2 ? C.w4 : C.w3;
          if (surf.kind === 'castle') rgb = idx % 2 ? C.w3 : C.w2;
        }
      } else if (surf.kind === 'roof' || surf.kind === 'crate' || (surf.kind === 'castle' && z > t.H)) {
        // parede da cabine / caixote / castelo
        rgb = lit > 0 ? C.w4 : lit < 0 ? C.w2 : C.w3;
        if (surf.kind === 'roof' && Math.abs(z - (t.H + 3)) < 0.8 && Math.abs((u % 6) + 6) % 6 < 1.4) rgb = C.glass;
        if (surf.kind === 'castle' && Math.abs(z - (t.H + 3)) < 0.8 && Math.abs(((u * 0.5) % 3) + 3) % 3 < 1) rgb = C.gold;
      } else {
        const depth = t.H - z;
        const ramp = [C.w5, C.w4, C.w3, C.w2, C.w1, C.w0];
        let k = depth < 1 ? 0 : depth < 2 ? 1 : 2 + (Math.floor(z / 2) % 2);
        if (z < 1.2) k = 5;
        k = Math.max(0, Math.min(5, k - lit));
        rgb = ramp[k];
        if (bandRamp && z > t.H * 0.42 && z < t.H * 0.42 + (t.H > 8 ? 2.5 : 1.5)) rgb = bandRamp[Math.max(0, Math.min(2, 1 - lit))];
        if (t.ports && z > t.H * 0.55 && z < t.H * 0.55 + 2 && Math.abs(v) > 2 && ((Math.floor(u + 200) % 8) < 2)) rgb = C.out;
      }
      setPx(hull, sx, sy, rgb);
      break;
    }
  }
  // esporao da gale: ponta de bronze na proa, na linha d'agua
  if (t.ram) for (let d = 0; d < 6; d++) for (const dz of [1, 2]) { const [x, y] = toScreen(Lh + d - 1, 0, dz); setPx(hull, x, y + bob, d > 3 ? C.gold : C.gold2); }
  outline(hull);

  // ---- remos (o lado de tras vai antes do casco) ----
  const oarsBack = buffer(W, Hh); const oarsFront = buffer(W, Hh);
  for (const ou of t.oars || []) for (const side of [-1, 1]) {
    const u0 = ou * t.L; const hw = halfWidth(t, u0);
    const swing = moving ? [-4, -1.5, 3, 1][frame % 4] : 0;
    const p0 = [u0, side * (hw - 0.5), t.H - 0.5];
    const p1 = [u0 + swing, side * (hw + t.B * 0.45 + 3), moving ? (frame % 4 === 2 ? 1.5 : 0) : 2.5];
    const [x0, y0] = toScreen(...p0); const [x1, y1] = toScreen(...p1);
    const near = (side * ca) > 0 || Math.abs(ca) < 0.2 ? y1 > ay : y1 > ay;
    const dst = near ? oarsFront : oarsBack;
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5);
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      setPx(dst, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + bob, k > 0.78 ? C.w4 : C.w3);
      if (k > 0.8) setPx(dst, x0 + (x1 - x0) * k + 1, y0 + (y1 - y0) * k + bob, C.w4);
    }
  }
  outline(oarsBack); outline(oarsFront);

  // ---- mastros e velas (de tras para frente) ----
  const rig = [];
  for (const m of t.masts) {
    const u = m.u * t.L;
    const base = surface(t, u, 0).h;
    const [bx, by] = toScreen(u, 0, base);
    rig.push({ m, u, base, depth: by });
  }
  rig.sort((p, q) => p.depth - q.depth);
  const rigLayers = rig.flatMap(({ m, u, base }) => {
    const b = buffer(W, Hh);
    const polePx = buffer(W, Hh);
    const top = m.h;
    const sailPx = (pu, pv, z, rgb) => { const [x, y] = toScreen(pu, pv, z); setPx(b, x, y + bob, rgb); };
    // vela atras do mastro ou na frente? (depende da direcao: vela vai para a proa)
    const drawSail = () => {
      if (m.sail === 'square') {
        const tiers = t.L > 80 ? [[0.3, 0.68, 1], [0.72, 0.95, 0.72]] : [[0.32, 0.92, 1]];
        for (const [s0, s1, wk] of tiers) {
          const Ws = t.B * 1.45 * wk; const z0 = base + (top - base) * s0; const z1 = base + (top - base) * s1;
          for (let ti = -1; ti <= 1; ti += 1 / (Ws * 1.5)) for (let s = 0; s <= 1; s += 1 / ((z1 - z0) * 1.6)) {
            const bul = (moving ? 3.2 : 1.6) * (1 - ti * ti) * (0.35 + 0.65 * Math.sin(Math.PI * s));
            let rgb = C.sail;
            if (ti * -sa > 0.35 || ti * ca > 0.75) rgb = C.sail2;
            if (s < 0.07 || s > 0.95) rgb = C.sail3;
            if (Math.abs((((ti + 1) * 3) % 1)) < 0.06) rgb = C.sail2;
            if (m.stripes && Math.floor((ti + 1) * 3.5) % 2 === 0) rgb = rgb === C.sail ? C.red : C.red2;
            // vergas bracejadas (~35 graus): de lado a vela nao some numa linha
            sailPx(u + bul + ti * Ws / 2 * BRACE_S, ti * Ws / 2 * BRACE_C, z1 - s * (z1 - z0), rgb);
          }
          // verga
          for (let ti = -1.08; ti <= 1.08; ti += 1 / (Ws * 2)) sailPx(u + 0.3 + ti * Ws / 2 * BRACE_S, ti * Ws / 2 * BRACE_C, z1 + 1, C.w2);
        }
      } else {
        // vela latina (triangulo no comprimento do barco), barriga para um lado
        const zb = base + 4; const Lb = t.L * 0.42;
        for (let p = 0; p <= 1; p += 1 / ((top - zb) * 1.6)) for (let q = 0; q <= 1 - p; q += 1 / (Lb * 1.6)) {
          const pu = u - q * Lb; const z = zb + p * (top - 1 - zb);
          const bul = (moving ? 3 : 1.5) * Math.sin(Math.PI * Math.min(1, q / Math.max(0.05, 1 - p))) * (1 - p);
          let rgb = (q > (1 - p) * 0.82 || p < 0.05) ? C.sail3 : (Math.floor(q * 6) % 2 ? C.sail : C.sail2);
          if (ca * bul < -1) rgb = C.sail2;
          sailPx(pu, bul, z, rgb);
        }
        for (let q = 0; q <= 1; q += 1 / (Lb * 2)) sailPx(u - q * Lb, 0, zb - 0.5, C.w2); // retranca
        if (m.jib) {
          const tip = t.L / 2 - 1;
          for (let p = 0; p <= 1; p += 1 / ((top - base) * 1.4)) for (let q = 0; q <= 1 - p; q += 1 / ((tip - u) * 1.6)) {
            const pu = u + 1 + q * (tip - u - 1); const z = base + 3 + p * (top - 6 - base - 3);
            const bul = (moving ? -2 : -1) * Math.sin(Math.PI * Math.min(1, q / Math.max(0.05, 1 - p))) * (1 - p);
            sailPx(pu, bul, z, q > (1 - p) * 0.85 ? C.sail3 : C.sail);
          }
        }
      }
    };
    const pole = () => {
      for (let z = base; z <= top; z += 0.5) {
        const [x, y] = toScreen(u, 0, z);
        setPx(polePx, x, y + bob, C.w4); setPx(polePx, x + 1, y + bob, C.w2);
      }
      // cesto da gavea no mastro mais alto do navio
      if (t.L > 80 && top >= 70) for (let dx = -2; dx <= 3; dx++) for (const dz of [top - 8, top - 9]) { const [x, y] = toScreen(u, 0, dz); setPx(polePx, x + dx, y + bob, dz === top - 8 ? C.w4 : C.w2); }
    };
    // a vela fica do lado da proa: se a proa aponta para longe de quem olha, a vela vai atras
    const sailBehind = sa < -0.2;
    pole();
    drawSail();
    outline(b); outline(polePx);
    return sailBehind ? [b, polePx] : [polePx, b];
  });

  // bandeira na ponta do mastro mais alto (tremula)
  const flag = buffer(W, Hh);
  if (t.masts.length) {
    const tall = rig.reduce((p, q) => (q.m.h > p.m.h ? q : p));
    const [fx, fy] = toScreen(tall.u, 0, tall.m.h + 1);
    const back = -ca >= 0 ? 1 : -1; // tremula para a popa
    for (let i = 0; i < 7; i++) for (let j = 0; j < 3 - Math.floor(i / 3); j++) {
      const wave = Math.round(Math.sin((i + frame * 2) * 0.9) * 0.8);
      setPx(flag, fx + back * (i + 1), fy - 2 + j + wave + bob, i > 4 ? C.red3 : C.red);
    }
    for (let z = 0; z < 3; z++) setPx(flag, fx, fy - z + bob, C.w2);
    outline(flag);
  }

  const out = buffer(W, Hh);
  over(out, water);
  over(out, oarsBack);
  over(out, hull);
  over(out, oarsFront);
  for (const b of rigLayers) over(out, b);
  over(out, flag);
  return { w: W, h: Hh, ax, ay, px: out.px };
}

// Os 4 quadros de uma direcao, recortados no mesmo retangulo (o barco nao "pula" ao animar).
const CACHE = new Map();
export function boatFrames(type, dir = 'e', moving = true) {
  const key = `${type}|${dir}|${moving ? 1 : 0}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const raw = [0, 1, 2, 3].map((f) => renderBoat(type, dir, f, moving));
  const { w, h } = raw[0];
  let x0 = w; let y0 = h; let x1 = 0; let y1 = 0;
  for (const r of raw) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (r.px[(y * w + x) * 4 + 3] > 0) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const cw = x1 - x0 + 1; const ch = y1 - y0 + 1;
  const frames = raw.map((r) => {
    const data = new Uint8ClampedArray(cw * ch * 4);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = ((y + y0) * w + x + x0) * 4; const o = (y * cw + x) * 4;
      if (r.px[i + 3] <= 0) continue;
      data[o] = r.px[i]; data[o + 1] = r.px[i + 1]; data[o + 2] = r.px[i + 2]; data[o + 3] = r.px[i + 3];
    }
    return data;
  });
  const out = { w: cw, h: ch, ax: raw[0].ax - x0, ay: raw[0].ay - y0, frames };
  CACHE.set(key, out);
  if (CACHE.size > 120) CACHE.delete(CACHE.keys().next().value);
  return out;
}

// ---- convés (cena do barco): costado embaixo do casco, mastro com vela recolhida e leme ----
// Costado: para cada celula do casco com mar embaixo, uma faixa de tabuas e espuma (px nativos).
export function deckSkirt(tiles) {
  const S = 16;
  const W = tiles.cols * S; const H = tiles.rows * S;
  const px = new Uint8ClampedArray(W * H * 4);
  const g = tiles.layers.ground;
  const hullAt = (x, y) => g[y]?.[x] === '=' || g[y]?.[x] === '>';
  const set = (x, y, rgb, a = 255) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; px[i + 3] = a; };
  const band = BANDS[{ pesca: 'teal', veleiro: 'white', gale: 'red', navio: 'gold' }[tiles.vessel?.type]] || null;
  for (let y = 0; y < tiles.rows; y++) for (let x = 0; x < tiles.cols; x++) {
    if (!hullAt(x, y)) continue;
    // costado visto de cima na vista 3/4: embaixo (popa e lados de baixo) e um pouco dos lados
    if (!hullAt(x, y + 1)) {
      for (let dy = 0; dy < 11; dy++) for (let dx = 0; dx < S; dx++) {
        const X = x * S + dx; const Y = (y + 1) * S + dy;
        let rgb = dy < 2 ? C.w5 : dy < 9 ? (Math.floor(dy / 2) % 2 ? C.w2 : C.w3) : C.w0;
        if (band && dy >= 4 && dy < 6) rgb = band[1];
        if ((dx + y * 5) % 16 === 0 && dy >= 2 && dy < 9) rgb = C.w1;
        set(X, Y, rgb);
      }
      for (let dx = 0; dx < S; dx++) set(x * S + dx, (y + 1) * S + 11, hash(x * S + dx, y, 1) < 0.6 ? C.white : C.foam);
    }
    for (const side of [-1, 1]) {
      if (hullAt(x + side, y)) continue;
      for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < 3; dx++) {
        const X = side < 0 ? x * S - 1 - dx : (x + 1) * S + dx;
        set(X, y * S + dy + 4, dx === 2 ? (hash(X, dy, 2) < 0.5 ? C.foam : C.white) : side < 0 ? C.w4 : C.w2);
      }
    }
  }
  // contorno
  const copy = new Uint8ClampedArray(px);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (copy[i + 3]) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx; const Y = y + dy; return X >= 0 && Y >= 0 && X < W && Y < H && copy[(Y * W + X) * 4 + 3] && !(copy[(Y * W + X) * 4] === C.foam[0] || copy[(Y * W + X) * 4] === C.white[0]); });
    if (n) set(x, y, C.out, 200);
  }
  return { w: W, h: H, data: px };
}

// Mastro no convés (3/4): poste alto, verga com a vela recolhida, cordas; ancora no pe do mastro.
export function deckMast(kind = 'square', tall = 64) {
  const W = 56; const H = tall + 44;
  const b = buffer(W, H);
  const cx = 27; const footY = tall + 8;
  for (let y = footY - tall; y <= footY; y++) { setPx(b, cx, y, C.w4); setPx(b, cx + 1, y, C.w3); setPx(b, cx + 2, y, C.w2); }
  // base do mastro (anel de madeira)
  for (let dx = -2; dx <= 4; dx++) { setPx(b, cx + dx, footY, C.w2); setPx(b, cx + dx, footY - 1, C.w3); }
  if (kind === 'square') {
    for (const [yy, half] of [[footY - tall + 8, 22], [footY - tall + 30, 25]]) {
      for (let dx = -half; dx <= half + 2; dx++) setPx(b, cx + dx, yy, C.w2);
      // vela enrolada na verga: rolo de pano com amarras
      for (let dx = -half + 2; dx <= half; dx++) for (let dy = 1; dy <= 3; dy++) setPx(b, cx + dx, yy + dy, (dx + 40) % 7 === 0 ? C.w1 : dy === 1 ? C.sail : dy === 2 ? C.sail2 : C.sail3);
      // cordas ate o convés
      for (let k = 0; k < 20; k++) { setPx(b, cx - half + k * 0.5, yy + 4 + k * 1.6, C.w1); setPx(b, cx + half + 2 - k * 0.5, yy + 4 + k * 1.6, C.w1); }
    }
    for (let dx = -3; dx <= 5; dx++) for (const dy of [0, 1]) setPx(b, cx + dx, footY - tall + 2 + dy, dy ? C.w2 : C.w4); // cesto
  } else {
    // latina: retranca para a popa (para baixo na tela) a meia altura, vela recolhida em cima dela
    const by = footY - 20;
    for (let k = 0; k < 34; k++) { setPx(b, cx, by + k * 0.9, C.w3); setPx(b, cx + 1, by + k * 0.9, C.w2); }
    for (let k = 0; k < 30; k++) for (const dx of [-1, 2]) setPx(b, cx + dx, by - 2 + k * 0.9, k % 6 === 0 ? C.w1 : dx < 0 ? C.sail : C.sail2);
    for (let k = 0; k < 30; k++) { setPx(b, cx, by - 3 + k * 0.9, k % 6 === 0 ? C.w1 : C.sail); }
  }
  // bandeirola
  for (let i = 0; i < 8; i++) for (let j = 0; j < 3 - Math.floor(i / 3); j++) setPx(b, cx + 3 + i, footY - tall - 3 + j, i > 5 ? C.red3 : C.red);
  outline(b);
  return toImage(b, cx + 1, footY);
}

// Leme (roda do timao num pe de madeira), 20x24.
export function deckHelm() {
  const b = buffer(22, 26);
  const cx = 10.5; const cy = 9.5;
  for (let y = 12; y < 24; y++) for (let x = 8; x < 14; x++) setPx(b, x, y, x < 10 ? C.w4 : x > 11 ? C.w2 : C.w3);
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    setPx(b, cx + Math.cos(a) * 7, cy + Math.sin(a) * 6, C.w3);
    setPx(b, cx + Math.cos(a) * 6, cy + Math.sin(a) * 5, C.w4);
  }
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    for (let r = 0; r <= 9; r += 0.5) setPx(b, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.86, r > 7 ? C.w5 : C.w2);
  }
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) setPx(b, cx + dx, cy + dy, C.gold);
  outline(b);
  return toImage(b, 11, 24);
}

// Placa do porto: poste, tabua e uma ancora pintada, 18x24.
export function portSign() {
  const b = buffer(20, 26);
  for (let y = 10; y < 25; y++) { setPx(b, 9, y, C.w4); setPx(b, 10, y, C.w2); }
  for (let y = 2; y < 12; y++) for (let x = 2; x < 18; x++) setPx(b, x, y, y === 2 ? C.w5 : y === 11 ? C.w2 : (y % 3 === 0 ? C.w3 : C.w4));
  const anchor = [[9, 4], [10, 4], [9, 5], [10, 5], [9, 6], [10, 6], [9, 7], [10, 7], [9, 8], [10, 8], [7, 5], [8, 5], [11, 5], [12, 5], [6, 8], [7, 9], [8, 9], [11, 9], [12, 9], [13, 8]];
  for (const [x, y] of anchor) setPx(b, x, y, C.teal2);
  outline(b);
  return toImage(b, 10, 25);
}

function toImage(b, ax, ay) {
  const data = new Uint8ClampedArray(b.w * b.h * 4);
  for (let i = 0; i < b.px.length; i += 4) if (b.px[i + 3] > 0) { data[i] = b.px[i]; data[i + 1] = b.px[i + 1]; data[i + 2] = b.px[i + 2]; data[i + 3] = b.px[i + 3]; }
  return { w: b.w, h: b.h, ax, ay, data };
}
