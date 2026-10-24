import { describe, expect, it } from 'vitest';
import { DEFAULT_MAX_ITEMS, DEFAULT_MAX_WEIGHT, diceFormula, gameLimits, loadLevel, loadSpeedFactor, loadSummary } from './load';

describe('loadSpeedFactor', () => {
  it('nao atrapalha ate metade da carga', () => {
    expect(loadSpeedFactor(0, 30)).toBe(1);
    expect(loadSpeedFactor(15, 30)).toBe(1);
  });
  it('cai em linha reta ate 0,6 no limite', () => {
    expect(loadSpeedFactor(22.5, 30)).toBeCloseTo(0.8, 5);
    expect(loadSpeedFactor(30, 30)).toBeCloseTo(0.6, 5);
  });
  it('acima do limite fica em 0,35', () => {
    expect(loadSpeedFactor(30.5, 30)).toBe(0.35);
    expect(loadSpeedFactor(100, 30)).toBe(0.35);
  });
  it('sem limite ou valores estranhos = 1', () => {
    expect(loadSpeedFactor(50, null)).toBe(1);
    expect(loadSpeedFactor(50, 0)).toBe(1);
    expect(loadSpeedFactor('x', 30)).toBe(1);
  });
});

describe('loadLevel', () => {
  it('da nome as faixas', () => {
    expect(loadLevel(5, 30).key).toBe('free');
    expect(loadLevel(20, 30).key).toBe('heavy');
    expect(loadLevel(30, 30).key).toBe('full');
    expect(loadLevel(31, 30).key).toBe('over');
  });
});

describe('gameLimits e loadSummary', () => {
  it('usa o padrao da mesa quando o mestre nao definiu', () => {
    expect(gameLimits({}, 'u1')).toEqual({ maxItems: DEFAULT_MAX_ITEMS, maxWeight: DEFAULT_MAX_WEIGHT });
  });
  it('respeita a excecao do jogador', () => {
    const rules = { inventory: { maxItems: 12, maxWeight: 40 }, players: { u1: { inventory: { maxItems: 5 } } } };
    expect(gameLimits(rules, 'u1')).toEqual({ maxItems: 5, maxWeight: 40 });
  });
  it('resume peso, itens e velocidade', () => {
    const s = loadSummary([{ name: 'Pedra', weight: 10, quantity: 2 }], { inventory: { maxWeight: 20, maxItems: 1 } }, 'u1');
    expect(s.weight).toBe(20);
    expect(s.count).toBe(1);
    expect(s.speed).toBeCloseTo(0.6, 5);
    expect(s.full).toBe(true);
  });
});

describe('diceFormula', () => {
  it('monta a formula aceita pelo servidor', () => {
    expect(diceFormula(2, 6, 3)).toBe('2d6+3');
    expect(diceFormula(1, 20, -2)).toBe('1d20-2');
    expect(diceFormula(3, 100, 0)).toBe('3d100');
  });
  it('prende nos limites', () => {
    expect(diceFormula(50, 7, 1.7)).toBe('20d20+1');
    expect(diceFormula(0, 8)).toBe('1d8');
  });
});
