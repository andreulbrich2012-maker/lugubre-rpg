import { describe, expect, it } from 'vitest';
import { calculateResourceAdjustment, clampResourceCurrent, normalizeResourcePair } from './characterVitals';

describe('controles de Vida, Sanidade e Mana', () => {
  it('altera o valor atual em exatamente um ponto e respeita os limites', () => {
    expect(calculateResourceAdjustment({ type: 'life', current: 18, max: 25, field: 'current', delta: 1 }).current).toBe(19);
    expect(calculateResourceAdjustment({ type: 'life', current: 18, max: 25, field: 'current', delta: -1 }).current).toBe(17);
    expect(calculateResourceAdjustment({ type: 'sanity', current: 0, max: 52, field: 'current', delta: -1 }).current).toBe(0);
    expect(calculateResourceAdjustment({ type: 'mana', current: 30, max: 30, field: 'current', delta: 1 }).current).toBe(30);
  });

  it('altera o máximo em um ponto e ajusta o atual quando necessário', () => {
    const reduced = calculateResourceAdjustment({ type: 'life', current: 20, max: 20, field: 'max', delta: -1 });
    expect(reduced).toMatchObject({ current: 19, max: 19, currentWasAdjusted: true });
    expect(calculateResourceAdjustment({ type: 'sanity', current: 20, max: 52, field: 'max', delta: 1 }).max).toBe(53);
  });

  it('mantém máximos válidos e nunca produz atual maior que máximo', () => {
    expect(calculateResourceAdjustment({ type: 'life', current: 1, max: 1, field: 'max', delta: -1 }).max).toBe(1);
    expect(calculateResourceAdjustment({ type: 'mana', current: 1, max: 1, field: 'max', delta: -1 })).toMatchObject({ current: 0, max: 0 });
    expect(clampResourceCurrent(5, 0)).toBe(0);
    expect(normalizeResourcePair(20, 12)).toEqual({ current: 12, max: 12 });
  });

  it('preserva todos os cliques rápidos quando os ajustes são acumulados', () => {
    let pair = { current: 10, max: 20 };
    for (let index = 0; index < 8; index += 1) {
      pair = calculateResourceAdjustment({ type: 'life', ...pair, field: 'current', delta: 1 });
    }
    expect(pair.current).toBe(18);
  });
});
