import { describe, expect, it } from 'vitest';
import { applyRaceModifiers, baseAttributes, baseSkills, calculateDefense, calculateDodge } from './rules.js';

describe('regras de ficha', () => {
  it('inicia atributos em 2 e perícias em 0', () => {
    expect(Object.values(baseAttributes()).every((value) => value === 2)).toBe(true);
    expect(Object.values(baseSkills()).every((value) => value === 0)).toBe(true);
  });

  it('aplica modificadores raciais', () => {
    expect(applyRaceModifiers(baseAttributes(), { agilidade: 2, vigor: -1 })).toMatchObject({ agilidade: 4, vigor: 1 });
  });

  it('calcula esquiva e defesa total', () => {
    expect(calculateDodge({ agilidade: 4 })).toBe(11);
    expect(calculateDefense(10, [{ defenseBonus: 2 }, { defenseBonus: 1 }])).toBe(13);
  });
});
