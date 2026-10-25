// Biblioteca de animacoes de ataque e magia (pixel art estilo Stardew, desenhada
// em codigo num <canvas>). Ver docs/ANIMACOES.md para a sincronizacao na mesa.
export { classify, elementOf } from './classify.js';
export { FAMILIES, FAMILY_BY_ID, GROUPS, RESULTS, familiesOf, getFamily } from './families.js';
export { ELEMENTS, ELEMENT_KEYS, PALETTES, elementKey, getElement } from './elements.js';
export { createEffect, buildTimeline, animTime, phaseAt, bodies, shakeAt, normalizeResult, HITSTOP_MS } from './effect.js';
export { renderEffect } from './render.js';
export { createPlayer } from './player.js';
export { drawGrass, drawActor } from './stage.js';
export { fxFromRoll, fxFromHit, tokenCenter, rollResult } from './sync.js';
// Golpes de arma: familias de movimento, armas (ferramentas) e golpes. Ver docs/GOLPES.md.
export { WEAPON_FAMILIES, WEAPONS, FAMILY_OF as WEAPON_FAMILY_OF, WEAPON_OF } from './weapons/catalog.js';
export { movesOf, weaponsOf, pickMove, weaponInfo } from './weapons/select.js';
// Grimorio: magias com animacao propria. Ver docs/GRIMORIO.md.
export { SPELLS, SCHOOLS, getSpell, findSpell, matchSpellName, createSpellEffect, renderSpell } from './spells/index.js';
