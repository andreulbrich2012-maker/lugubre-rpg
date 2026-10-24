// Registro de todas as pecas por encaixe (slot). Cada arquivo em items/ exporta
// uma lista; aqui so juntamos, indexamos e conferimos o basico.
import { HAIRS } from './items/hair.js';
import { TORSO } from './items/torso.js';
import { LEGS } from './items/legs.js';
import { FEET } from './items/feet.js';
import { HEADWEAR } from './items/head.js';
import { FACE_ACC } from './items/face.js';
import { EARS_ACC } from './items/ears.js';
import { NECK } from './items/neck.js';
import { BACK } from './items/back.js';
import { WAIST } from './items/waist.js';
import { ARMS } from './items/arms.js';
import { HANDS } from './items/hands.js';
import { KNEES } from './items/knees.js';
import { HELD } from './items/held.js';

// tab = aba do criador; min = quantidade minima pedida pelo Andre (teste confere).
export const SLOTS = [
  { id: 'torso', name: 'Tronco', tab: 'roupas', min: 100 },
  { id: 'legs', name: 'Parte de baixo', tab: 'roupas', min: 60 },
  { id: 'feet', name: 'Pés', tab: 'roupas', min: 30 },
  { id: 'head', name: 'Cabeça', tab: 'cabeca', min: 30 },
  { id: 'face', name: 'Rosto', tab: 'acessorios', min: 30 },
  { id: 'ears', name: 'Orelhas', tab: 'acessorios', min: 30 },
  { id: 'neck', name: 'Pescoço', tab: 'acessorios', min: 30 },
  { id: 'back', name: 'Costas', tab: 'acessorios', min: 30 },
  { id: 'waist', name: 'Cintura', tab: 'acessorios', min: 30 },
  { id: 'arms', name: 'Braços', tab: 'acessorios', min: 30 },
  { id: 'hands', name: 'Mãos', tab: 'acessorios', min: 30 },
  { id: 'knees', name: 'Pernas', tab: 'acessorios', min: 30 },
  { id: 'held', name: 'Na mão', tab: 'itens', min: 8 }
];
export const SLOT_IDS = SLOTS.map((s) => s.id);

const LISTS = { torso: TORSO, legs: LEGS, feet: FEET, head: HEADWEAR, face: FACE_ACC, ears: EARS_ACC, neck: NECK, back: BACK, waist: WAIST, arms: ARMS, hands: HANDS, knees: KNEES, held: HELD };

export const ITEMS = {};
for (const [slot, list] of Object.entries(LISTS)) {
  ITEMS[slot] = list.map((it) => ({ channels: [], sub: 'Outros', ...it, slot }));
}
export const ITEM_BY_ID = {};
for (const slot of SLOT_IDS) for (const it of ITEMS[slot]) ITEM_BY_ID[`${slot}:${it.id}`] = it;

export function getItem(slot, id) {
  return id ? ITEM_BY_ID[`${slot}:${id}`] || null : null;
}

export { HAIRS };
export const HAIR_BY_ID = Object.fromEntries(HAIRS.map((h) => [h.id, h]));
