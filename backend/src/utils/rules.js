export const ATTRIBUTE_KEYS = ['forca', 'agilidade', 'presenca', 'intelecto', 'vigor'];
export const SKILL_KEYS = ['acrobacia', 'atletismo', 'crime', 'enganacao', 'furtividade', 'iniciativa', 'intimidacao', 'investigacao', 'medicina', 'percepcao', 'pontaria', 'reflexos', 'vontade'];

export function baseAttributes() {
  return Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, 2]));
}

export function baseSkills(keys = SKILL_KEYS) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

export function applyRaceModifiers(attributes, modifiers = {}) {
  return ATTRIBUTE_KEYS.reduce((acc, key) => {
    acc[key] = Number(attributes?.[key] ?? 2) + Number(modifiers?.[key] ?? 0);
    return acc;
  }, {});
}

export function calculateDodge(attributes) {
  return 15 - Number(attributes?.agilidade ?? 2);
}

export function calculateDefense(baseDefense, inventory = []) {
  const items = Array.isArray(inventory) ? inventory : [];
  const bonus = items.reduce((sum, item) => sum + Number(item.defenseBonus ?? 0), 0);
  return Number(baseDefense ?? 10) + bonus;
}
