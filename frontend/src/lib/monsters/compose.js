// Monta um quadro do monstro: pose -> plano de corpo da base -> detalhes da
// variante -> pixels RGBA. Puro (sem DOM). O render.js transforma em canvas.
import { createCanvas, finish, bbox, GROUND } from './raster.js';
import { PLANS } from './plans/index.js';
import { drawDetails } from './details.js';

export const DIRECTIONS = ['down', 'left', 'right', 'up'];
export const ANIMS = { idle: 2, walk: 4, attack: 1 };
export const FRAME_MS = { idle: 520, walk: 150, attack: 420 };
// Folha: linhas = direcoes; colunas = idle(2) + walk(4) + ataque(1).
export const SHEET_LAYOUT = { dirs: DIRECTIONS, anims: [['idle', 2], ['walk', 4], ['attack', 1]], cols: 7, rows: 4 };
export function sheetFrameIndex(anim, f) {
  if (anim === 'walk') return 2 + (f % 4);
  if (anim === 'attack') return 6;
  return f % 2;
}

export function pose(dir, anim, f, S) {
  const u = 32 / S;
  const view = dir === 'down' ? 'down' : dir === 'up' ? 'up' : 'side';
  let bob = 0, swing = 0, flap = 0.3, atk = false, moving = false;
  if (anim === 'walk') {
    moving = true;
    swing = [1, 0, -1, 0][f % 4];
    bob = [0, -1, 0, -1][f % 4];
    flap = [0.05, 0.5, 0.95, 0.5][f % 4];
  } else if (anim === 'attack') {
    atk = true; flap = 0; bob = 0;
  } else {
    bob = f % 2 ? 1 : 0;
    flap = f % 2 ? 0.75 : 0.2;
  }
  return { dir, view, anim, f, bob, bobU: bob * u, swing, flap, atk, moving, u };
}

// look: descritor de monsterLook() (ou um parcial com plan/params/palette/size).
export function renderMonsterPixels(look, dir = 'down', anim = 'idle', f = 0, opts = {}) {
  const S = look.size;
  const plan = PLANS[look.plan];
  if (!plan) throw new Error(`plano de monstro desconhecido: ${look.plan}`);
  const P = look.params || {};
  const vz = viewZoom(look, dir);
  const C = createCanvas(S, { zoom: (opts.zoom ?? look.zoom ?? fitZoom(look)) * vz });
  const p = pose(dir, anim, f, S);
  p.u = C.u;
  p.bobU = p.bob * C.u;
  // o ataque avanca 1px na direcao em que olha (lateral) para dar impacto
  if (p.atk && p.view === 'side') C.shift(-C.u, 0);
  plan(C, P, p, look);
  drawDetails(C, look, p);
  const b = bbox(C);
  let shadow = false;
  if (opts.shadow !== false && b && !P.noShadow) {
    const fl = C.anchors.float;
    const k = 1 / C.u;
    const cyG = C.toPxF(16, GROUND - 0.2)[1];
    if (fl) {
      // criaturas que pairam: sombra menor, fixa no chao (nao acompanha o balanco)
      shadow = { cx: C.toPxF(fl.x, 0)[0], cy: cyG, w: Math.max(2, fl.w * k * (p.bob ? 0.92 : 1)), h: Math.max(1.1, 1.6 * k) };
    } else {
      const w = (b.x1 - b.x0 + 1) / 2;
      shadow = { cx: (b.x0 + b.x1 + 1) / 2 + (p.atk && p.view === 'side' ? 1 : 0), cy: cyG, w: Math.max(2, w * 0.82 + 0.6), h: Math.max(1.2, 1.9 * k) };
    }
  }
  return finish(C, look.palette, {
    shadow,
    aura: look.aura || null,
    auraPulse: !!(p.bob || p.atk),
    flip: dir === 'right'
  });
}

// Quadrupedes de frente ficam estreitos (o corpo some atras da cabeca): a vista de
// frente/costas ganha um zoom extra para ler tao bem quanto a lateral.
const FRONT_ZOOM = { quad: 1.35, crawler: 1.1, serpent: 1.1, fish: 1.15 };
export function viewZoom(look, dir) {
  if (dir === 'left' || dir === 'right') return 1;
  return look.params?.frontZoom ?? FRONT_ZOOM[look.plan] ?? 1;
}

// Zoom automatico: mede a criatura (quadros de 32px, sem zoom) e aproxima ate ela
// encher o quadro. Assim um rato e um urso ocupam o mesmo espaco no seu tamanho,
// e o tamanho real vem do nivel. Cache por plano+parametros.
const zoomCache = new Map();
export function fitZoom(look) {
  const key = look.plan + JSON.stringify(look.params || {}) + (look.details || []).join(',');
  let z = zoomCache.get(key);
  if (z) return z;
  let half = 1, top = 30;
  const probe = { ...look, size: 32, aura: null };
  for (const [d, a, f] of [['down', 'idle', 0], ['down', 'idle', 1], ['left', 'idle', 0], ['left', 'walk', 0], ['left', 'walk', 2], ['left', 'attack', 0], ['up', 'idle', 0]]) {
    const px = renderMonsterPixels(probe, d, a, f, { zoom: 1, shadow: false });
    for (let i = 0; i < 32 * 32; i++) {
      if (!px[i * 4 + 3]) continue;
      const x = i % 32, y = (i / 32) | 0;
      half = Math.max(half, Math.abs(x + 0.5 - 16) + 0.5);
      top = Math.min(top, y);
    }
  }
  const P = look.params || {};
  z = Math.max(0.7, Math.min(P.maxZoom ?? 1.7, 15 / half, 30 / (31 - top)));
  zoomCache.set(key, z);
  return z;
}

export function renderSheetPixels(look) {
  const S = look.size;
  const { cols, rows } = SHEET_LAYOUT;
  const out = new Uint8ClampedArray(cols * S * rows * S * 4);
  DIRECTIONS.forEach((dir, r) => {
    for (const [anim, n] of SHEET_LAYOUT.anims) for (let f = 0; f < n; f++) {
      const px = renderMonsterPixels(look, dir, anim, f);
      const c = sheetFrameIndex(anim, f);
      for (let y = 0; y < S; y++) out.set(px.subarray(y * S * 4, (y + 1) * S * 4), ((r * S + y) * cols * S + c * S) * 4);
    }
  });
  return { width: cols * S, height: rows * S, data: out };
}
