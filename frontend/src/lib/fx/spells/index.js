// Grimorio: catalogo visual de magias + motor de animacao proprio. Ver docs/GRIMORIO.md
// (lista) e docs/ANIMACOES.md (como ligar um poder a uma magia).
export { SPELLS, SPELL_BY_ID, SCHOOLS, SCHOOL_BY_ID, DOMAINS, TIERS, TARGETS, RANGES, getSpell, tierLabel, slugify } from './catalog.js';
export { RECIPES, recipeFor, parseRecipe } from './recipes.js';
export { createSpellEffect, renderSpell, spellBodies, spellShake, spellSpan } from './engine.js';
export { findSpell, matchSpellName, linkedSpellId, spellForOptions, SYNONYMS } from './match.js';
export { SPELL_PALETTES, SCHOOL_PALETTE } from './palettes.js';
export { PRIMS } from './prims.js';
