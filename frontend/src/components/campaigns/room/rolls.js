// Calculo das rolagens da mesa igual ao da ficha: 1d20 + atributo da pericia + treino + outros (livro 0.5 Beta).

function norm(text = '') {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function findSkill(sheet, key) {
  if (!key) return null;
  const catalog = sheet?.skills_catalog || [];
  const k = norm(key);
  return catalog.find((s) => norm(s.key) === k || norm(s.name) === k) || null;
}

export function skillBonus(sheet, key) {
  const skill = findSkill(sheet, key);
  if (!skill) return { bonus: Number(sheet?.attributes?.agilidade ?? 2), name: key || 'Ataque' };
  const attr = Number(sheet?.attributes?.[skill.attribute] ?? 2);
  const training = Number(sheet?.skills?.[skill.key] ?? 0);
  const other = Number(sheet?.skill_bonuses?.[skill.key] ?? 0);
  return { bonus: attr + training + other, name: skill.name, attribute: skill.attribute };
}

export function attackFormula(sheet, power) {
  const { bonus } = skillBonus(sheet, power?.skill);
  return bonus ? `1d20${bonus >= 0 ? '+' : ''}${bonus}` : '1d20';
}

export function powersOf(sheet) {
  const attacks = (sheet?.attacks || []).map((p) => ({ ...p, type: 'attacks' }));
  const spells = (sheet?.spells || []).map((p) => ({ ...p, type: 'spells' }));
  return [...attacks, ...spells];
}

export function rollSummary(roll) {
  if (!roll) return '';
  const dice = roll.rolls?.length ? `[${roll.rolls.join(', ')}]` : '';
  const bonus = roll.bonus ? ` ${roll.bonus > 0 ? '+' : '−'} ${Math.abs(roll.bonus)}` : '';
  return `${roll.formula} ${dice}${bonus} = ${roll.total}`;
}
