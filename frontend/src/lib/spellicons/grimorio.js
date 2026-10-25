// Icones das magias do grimorio: registro "parecido com poder" + escola, nivel e o
// indice da magia entre as irmas que cairiam no mesmo desenho (mesma escola, nivel,
// forma e elemento). O indice espelha o simbolo e/ou poe uma faisca (compose.js).
import { SPELLS } from '../fx/spells/catalog.js';
import { classifyPower, iconKey } from './classify.js';

function basePower(spell) {
  return { name: spell.name, type: 'magia', element: spell.element, range: spell.range, description: `${spell.desc} ${spell.target}`, school: spell.school, tier: spell.tier };
}

let nthById = null;
function nthOf(id) {
  if (!nthById) {
    nthById = new Map();
    const seen = new Map();
    for (const s of SPELLS) {
      const k = iconKey(classifyPower(basePower(s)));
      const n = seen.get(k) || 0;
      seen.set(k, n + 1);
      nthById.set(s.id, n);
    }
  }
  return nthById.get(id) || 0;
}

// Registro para <SpellIcon power={...}> de uma magia do grimorio.
export function grimoireIconPower(spell) {
  return { ...basePower(spell), nth: nthOf(spell.id) };
}
