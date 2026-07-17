import { describe, expect, it } from 'vitest';
import { getMenuDurations, MENU_CLOSE_DURATION_MS, MENU_OPEN_DURATION_MS, REDUCED_MENU_DURATION_MS } from './menuMotion';

describe('transicoes de menu', () => {
  it('usa abertura proxima de um segundo e fechamento mais curto', () => {
    expect(getMenuDurations(false)).toEqual({ open: MENU_OPEN_DURATION_MS, close: MENU_CLOSE_DURATION_MS });
    expect(MENU_OPEN_DURATION_MS).toBeGreaterThanOrEqual(800);
    expect(MENU_OPEN_DURATION_MS).toBeLessThanOrEqual(1000);
    expect(MENU_CLOSE_DURATION_MS).toBeLessThan(MENU_OPEN_DURATION_MS);
  });

  it('reduz imediatamente o tempo para usuarios com movimento reduzido', () => {
    expect(getMenuDurations(true)).toEqual({ open: REDUCED_MENU_DURATION_MS, close: REDUCED_MENU_DURATION_MS });
    expect(REDUCED_MENU_DURATION_MS).toBeLessThan(150);
  });
});
