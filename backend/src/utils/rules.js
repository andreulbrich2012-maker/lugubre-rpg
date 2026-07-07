export const ATTRIBUTE_KEYS = ['forca', 'agilidade', 'presenca', 'intelecto', 'vigor'];
export const SKILL_DEFINITIONS = [
  ['acrobacia', 'Acrobacia', 'agilidade'],
  ['adestramento', 'Adestramento', 'presenca'],
  ['artes', 'Artes', 'presenca'],
  ['atletismo', 'Atletismo', 'forca'],
  ['atualidades', 'Atualidades', 'intelecto'],
  ['ciencias', 'Ciências', 'intelecto'],
  ['crime', 'Crime', 'agilidade'],
  ['diplomacia', 'Diplomacia', 'presenca'],
  ['enganacao', 'Enganação', 'presenca'],
  ['fortitude', 'Fortitude', 'vigor'],
  ['furtividade', 'Furtividade', 'agilidade'],
  ['iniciativa', 'Iniciativa', 'agilidade'],
  ['intimidacao', 'Intimidação', 'presenca'],
  ['intuicao', 'Intuição', 'presenca'],
  ['investigacao', 'Investigação', 'intelecto'],
  ['luta', 'Luta', 'forca'],
  ['medicina', 'Medicina', 'intelecto'],
  ['ocultismo', 'Ocultismo', 'intelecto'],
  ['percepcao', 'Percepção', 'presenca'],
  ['pilotagem', 'Pilotagem', 'agilidade'],
  ['pontaria', 'Pontaria', 'agilidade'],
  ['profissao', 'Profissão', 'intelecto'],
  ['reflexos', 'Reflexos', 'agilidade'],
  ['religiao', 'Religião', 'presenca'],
  ['sobrevivencia', 'Sobrevivência', 'intelecto'],
  ['tatica', 'Tática', 'intelecto'],
  ['tecnologia', 'Tecnologia', 'intelecto'],
  ['vontade', 'Vontade', 'presenca']
];

export const SKILL_KEYS = SKILL_DEFINITIONS.map(([key]) => key);

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

export function parseDiceFormula(formula) {
  const match = String(formula || '').trim().toLowerCase().match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) {
    const error = new Error('Formula de dado invalida.');
    error.status = 400;
    throw error;
  }
  return {
    quantity: Math.min(20, Math.max(1, Number(match[1]))),
    sides: Math.min(100, Math.max(2, Number(match[2]))),
    bonus: Number(match[3] || 0)
  };
}

export function rollDiceFormula(formula) {
  const parsed = parseDiceFormula(formula);
  const rolls = Array.from({ length: parsed.quantity }, () => Math.floor(Math.random() * parsed.sides) + 1);
  const total = rolls.reduce((sum, value) => sum + value, 0) + parsed.bonus;
  return {
    formula,
    rolls,
    bonus: parsed.bonus,
    total
  };
}
