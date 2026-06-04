export const ATTRIBUTE_KEYS = ['forca', 'agilidade', 'intelecto', 'vigor', 'presenca'];
export const SKILL_KEYS = ['luta', 'pontaria', 'furtividade', 'arcana', 'religiao', 'percepcao', 'sobrevivencia'];

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
  const bonus = inventory.reduce((sum, item) => sum + Number(item.defenseBonus ?? 0), 0);
  return Number(baseDefense ?? 10) + bonus;
}
