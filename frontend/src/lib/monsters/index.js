// API publica dos monstros em pixel art (o mapa e o bestiario importam daqui).
export { monsterLook, classifyBase, detectElement, normalize } from './classify.js';
export { BASES, BASE_BY_ID, ELEMENTS } from './bases.js';
export { EPITHETS } from './epithets.js';
export { renderMonsterPixels, renderSheetPixels, ANIMS, FRAME_MS, DIRECTIONS, SHEET_LAYOUT, sheetFrameIndex } from './compose.js';
export { buildMonsterSheet, monsterFrameRect, drawMonsterFrame, monsterPortraitDataUrl, toLook } from './render.js';
