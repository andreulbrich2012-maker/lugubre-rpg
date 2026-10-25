import { describe, it, expect } from 'vitest';
import { skyAt, resolveLight, phaseAt, clockLabel } from './daylight.js';

describe('luz pela hora', () => {
  it('meio-dia sem tinta, meia-noite azul, entardecer quente e transicao suave', () => {
    expect(resolveLight(skyAt(720)).tint).toBe(null);
    expect(resolveLight(skyAt(0)).tint).toEqual([116, 130, 192]);
    expect(resolveLight(skyAt(0)).night).toBe(true);
    const dusk = resolveLight(skyAt(1110)).tint;
    expect(dusk[0]).toBeGreaterThan(dusk[2]);
    // 18:00 fica entre o dia e o entardecer
    const mid = resolveLight(skyAt(1065)).tint;
    expect(mid[2]).toBeGreaterThan(dusk[2]);
  });
  it('nomes antigos continuam valendo', () => {
    expect(resolveLight('noite').glow).toBe(1.4);
    expect(resolveLight('dia').tint).toBe(null);
    expect(resolveLight(undefined).radius).toBe(1.8);
  });
  it('rotulos', () => {
    expect(clockLabel(1125)).toBe('18:45');
    expect(phaseAt(360)).toBe('Amanhecer');
    expect(phaseAt(1300)).toBe('Noite');
  });
});
