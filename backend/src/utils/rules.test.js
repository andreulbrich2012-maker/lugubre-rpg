import { describe, expect, it } from 'vitest';
import { applyRaceModifiers, baseAttributes, baseSkills, calculateDefense, calculateDodge, parseDiceFormula, rollDiceFormula } from './rules.js';

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

  it('aceita formulas seguras e rejeita entradas invalidas ou extremas', () => {
    expect(parseDiceFormula('2d6+3')).toEqual({ quantity: 2, sides: 6, bonus: 3 });
    expect(parseDiceFormula('1d12-1')).toEqual({ quantity: 1, sides: 12, bonus: -1 });
    expect(() => parseDiceFormula('texto')).toThrow('Formula de dado invalida.');
    expect(() => parseDiceFormula('999d999')).toThrow('fora dos limites');
    expect(() => parseDiceFormula('1d6+999999999')).toThrow('fora dos limites');
    const result = rollDiceFormula('1d20+5');
    expect(result.rolls[0]).toBeGreaterThanOrEqual(1);
    expect(result.rolls[0]).toBeLessThanOrEqual(20);
    expect(result.total).toBe(result.rolls[0] + 5);
  });
});
