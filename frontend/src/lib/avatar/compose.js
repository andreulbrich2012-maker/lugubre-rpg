// Monta um quadro: pose do esqueleto -> camadas na ordem da direcao -> pixels.
// Puro (sem DOM). O render.js transforma isto em canvas/sprite sheet.
import { pose, W, H, ANIMS, DIRECTIONS } from './skeleton.js';
import { createLayer, compose } from './paint.js';
import { SKIN_BY_ID, HAIR_BY_ID, EYE_BY_ID as EYE_COLOR_BY_ID, colorHex } from './palette.js';
import { drawBody, drawFace, drawBeard } from './body.js';
import { drawTrait, traitHides } from './traits.js';
import { getItem, HAIR_BY_ID as HAIRSTYLE_BY_ID } from './catalog.js';
import { repairAppearance } from './appearance.js';

// Ordem das camadas por visao. 'arm' (bracos da frente) sai numa 2a passada.
// 'knees' vem depois de 'feet': joelheira, caneleira e tornozeleira ficam por cima da bota.
const ORDER = {
  down: ['back', 'tail', 'hairBack', 'body', 'marks', 'legsTrait', 'legs', 'feet', 'knees', 'torso', 'waist', 'arms', 'hands', 'neck', 'over', 'faceBase', 'faceTrait', 'beard', 'hairFront', 'earsTrait', 'crest', 'horns', 'head', 'face', 'ears', 'halo', 'held'],
  side: ['back', 'hairBack', 'tail', 'body', 'marks', 'legsTrait', 'legs', 'feet', 'knees', 'torso', 'waist', 'arms', 'hands', 'neck', 'over', 'faceBase', 'faceTrait', 'beard', 'hairFront', 'earsTrait', 'crest', 'horns', 'head', 'face', 'ears', 'halo', 'held'],
  up: ['held', 'body', 'marks', 'legsTrait', 'legs', 'feet', 'knees', 'torso', 'waist', 'arms', 'hands', 'neck', 'hairBack', 'back', 'over', 'tail', 'hairFront', 'earsTrait', 'crest', 'horns', 'head', 'face', 'ears', 'halo']
};
// Item na mao de costas fica atras do corpo (passada principal, antes de tudo).
const EQUIP = new Set(['torso', 'legs', 'feet', 'head', 'face', 'ears', 'neck', 'back', 'waist', 'arms', 'hands', 'knees', 'held']);
// Linha interna (pecas que se "descolam" do que esta por baixo).
const EDGE = { torso: 'all', legs: 'all', feet: 'all', head: 'all', back: 'all', hairFront: 'down', hairBack: 'all', neck: 'down', waist: 'down', held: 'all', arms: 'down', hands: false, knees: 'down', beard: 'down', horns: 'all', crest: 'all', earsTrait: false, face: false, ears: false, over: 'down' };

function baseColors(app) {
  const skin = SKIN_BY_ID[app.skin]?.hex || colorHex(app.skin, '#e8b996');
  const hair = HAIR_BY_ID[app.hair?.color]?.hex || colorHex(app.hair?.color, '#4a2f22');
  const beard = HAIR_BY_ID[app.beard?.color]?.hex || colorHex(app.beard?.color, hair);
  const eye = EYE_COLOR_BY_ID[app.eyes?.color]?.hex || colorHex(app.eyes?.color, '#5a3a26');
  return { skin, hair, beard, eye, w: '#f4ecdc' };
}

export function frameCount(anim) { return ANIMS[anim] || 1; }

// Pixels RGBA (Uint8ClampedArray 24*32*4) de um quadro.
export function renderPixels(appearance, dir = 'down', anim = 'idle', f = 0, opts = {}) {
  const app = opts.repaired ? appearance : repairAppearance(appearance);
  const P = pose(dir, anim, f, app.body, app.height);
  const base = baseColors(app);
  const traits = app.traits || {};
  const lowerBody = traits.legs === 'cavalo' ? 'cavalo' : 'humano';
  const equip = {};
  const hidden = new Set(traitHides(traits));
  for (const slot of EQUIP) {
    const sel = app.layers?.[slot];
    const it = sel && getItem(slot, sel.id);
    if (!it) continue;
    equip[slot] = { it, colors: { ...base, ...Object.fromEntries((it.channels || []).map((ch, k) => ['abc'[k], colorHex(sel.colors?.[k] ?? ch.def)])) } };
    for (const h of it.hides || []) hidden.add(h);
  }
  // Pecas que nao combinam com corpo de cavalo (calca/sapato/joelheira).
  if (lowerBody === 'cavalo') { hidden.add('legs'); hidden.add('feet'); hidden.add('knees'); }
  if (traits.legs === 'cascos' || traits.legs === 'garras') hidden.add('feet');
  const hair = HAIRSTYLE_BY_ID[app.hair?.style];
  const layers = [];
  const push = (key, fn, colors = base) => {
    const L = createLayer(P, key);
    fn(L);
    if (L.pix.size) layers.push({ L, colors, edge: EDGE[key] ?? false });
  };
  const ctx = { app, traits, P };
  for (const key of ORDER[P.view]) {
    if (hidden.has(key)) continue;
    if (EQUIP.has(key)) {
      const e = equip[key];
      if (!e) continue;
      push(key, (L) => e.it.draw(L, P, { ...ctx, item: e.it }), e.colors);
      continue;
    }
    switch (key) {
      // 'over': parte da frente de pecas de outro encaixe (fivela da capa, alca da aljava)
      case 'over':
        for (const [slot, e] of Object.entries(equip)) if (e.it.drawOver && !hidden.has(slot)) push(key, (L) => e.it.drawOver(L, P, { ...ctx, item: e.it }), e.colors);
        break;
      case 'body': push(key, (L) => drawBody(L, P, { lowerBody, hideHumanEars: traits.ears && traits.ears !== 'humana' })); break;
      case 'faceBase': push(key, (L) => drawFace(L, P, app.eyes?.style, { noMouth: ['bico', 'focinho'].includes(traits.face) })); break;
      case 'beard': push(key, (L) => drawBeard(L, P, app.beard?.style)); break;
      case 'hairBack': if (hair?.drawBack && !hidden.has('hair')) push(key, (L) => hair.drawBack(L, P, ctx)); break;
      case 'hairFront': if (hair?.drawFront && !hidden.has('hair')) push(key, (L) => hair.drawFront(L, P, { ...ctx, under: equip.head?.it })); break;
      default: push(key, (L) => drawTrait(key, L, P, ctx), { ...base, ...traitColors(traits) });
    }
  }
  return compose(layers, { flip: P.dir === 'right', shadow: opts.shadow !== false });
}

function traitColors(t) {
  return { a: colorHex(t.hornColor || 'osso'), b: colorHex(t.markColor || 'ouro'), c: colorHex(t.coat || 'castanho') };
}

// Grade completa: linhas = direcoes (down,left,right,up); colunas = idle(2) + walk(4) + attack(3).
export const SHEET_LAYOUT = { dirs: DIRECTIONS, anims: [['idle', 2], ['walk', 4], ['attack', 3]], cols: 9, rows: 4, w: W, h: H };
export function sheetFrameIndex(anim, f) { return anim === 'walk' ? 2 + (f % 4) : anim === 'attack' ? 6 + (f % 3) : f % 2; }

export function renderSheetPixels(appearance) {
  const app = repairAppearance(appearance);
  const { cols, rows } = SHEET_LAYOUT;
  const out = new Uint8ClampedArray(cols * W * rows * H * 4);
  DIRECTIONS.forEach((dir, r) => {
    for (const [anim, n] of SHEET_LAYOUT.anims) for (let f = 0; f < n; f++) {
      const px = renderPixels(app, dir, anim, f, { repaired: true });
      const c = sheetFrameIndex(anim, f);
      for (let y = 0; y < H; y++) {
        const dst = ((r * H + y) * cols * W + c * W) * 4;
        out.set(px.subarray(y * W * 4, (y + 1) * W * 4), dst);
      }
    }
  });
  return { width: cols * W, height: rows * H, data: out };
}

// Nome pedido na especificacao: um quadro RGBA da aparencia (mesma funcao).
export const composeFrame = renderPixels;
