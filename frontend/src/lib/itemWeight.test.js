import { describe, it, expect } from 'vitest';
import { formatKg, inventoryLimitError, inventoryLoad, itemLoad, suggestWeight, unitWeight } from './itemWeight.js';
import { inventoryLimits, normalizeRules } from './tableRules.js';

describe('peso sugerido dos itens', () => {
  it('acha pelo nome, do mais especifico ao geral', () => {
    const kg = (name, extra = {}) => suggestWeight({ name, ...extra });
    expect(kg('Moeda de ouro')).toBe(0.01);
    expect(kg('Bolsa de moedas')).toBe(0.2);
    expect(kg('Poção de cura menor')).toBe(0.3);
    expect(kg('Espada longa')).toBe(1.5);
    expect(kg('Espada curta')).toBe(1);
    expect(kg('Armadura de placas')).toBe(20);
    expect(kg('Manoplas de placas')).toBe(1);
    expect(kg('Cota de malha')).toBe(12);
    expect(kg('Mochila de couro')).toBe(1);
    expect(kg('Baú de carvalho')).toBe(15);
    expect(kg('Maçã')).toBe(0.2);
    expect(kg('Maça cravejada')).toBe(2);
    expect(kg('Pilha de livros')).toBe(1);
  });

  it('cai no icone, na descricao, na categoria e por fim em 0,5 kg', () => {
    expect(suggestWeight({ name: 'Lembrança', icon: 'arma-montante-aco' })).toBe(3);
    expect(suggestWeight({ name: 'Lembrança', description: 'um escudo velho' })).toBe(3);
    expect(suggestWeight({ name: 'Coisa', category: 'Armaduras' })).toBe(8);
    expect(suggestWeight({ name: 'Coisa', category: 'Armas' })).toBe(1.5);
    expect(suggestWeight({ name: 'Coisa' })).toBe(0.5);
  });

  it('peso 0 ou ausente usa o sugerido; mochila pesa ela + o que tem dentro', () => {
    expect(unitWeight({ name: 'Espada', weight: 0 })).toBe(1.5);
    expect(unitWeight({ name: 'Espada', weight: 2 })).toBe(2);
    const bag = { name: 'Mochila', weight: 1, contents: [{ name: 'Pão', quantity: 2 }, { name: 'Corda', weight: 1 }] };
    expect(itemLoad(bag)).toBe(2.8);
    expect(inventoryLoad([bag, { name: 'Flechas', quantity: 20 }])).toEqual({ weight: 3.8, count: 2 });
  });

  it('limites do mestre: peso e quantidade de itens', () => {
    const inv = [{ name: 'Armadura de placas' }, { name: 'Escudo' }];
    expect(inventoryLimitError(inv, [{ name: 'Espada' }], { maxWeight: 32 })).toBeNull();
    expect(inventoryLimitError(inv, [{ name: 'Baú' }], { maxWeight: 32 })).toBe('Mochila cheia: passa do peso máximo (32 kg) que o mestre definiu.');
    expect(inventoryLimitError(inv, [{ name: 'Anel' }], { maxItems: 2 })).toBe('Mochila cheia: passa do máximo de 2 itens que o mestre definiu.');
    expect(inventoryLimitError(inv, [{ name: 'Anel' }], { maxWeight: null, maxItems: null })).toBeNull();
    expect(formatKg(12.5)).toBe('12,5 kg');
  });

  it('limite do jogador troca o geral so para ele', () => {
    const rules = normalizeRules({ inventory: { maxWeight: 30, maxItems: 10 }, players: { u1: { inventory: { maxWeight: null } } } });
    expect(inventoryLimits(rules, 'u1')).toEqual({ maxWeight: null, maxItems: 10 });
    expect(inventoryLimits(rules, 'u2')).toEqual({ maxWeight: 30, maxItems: 10 });
    // mesa sem limite salvo: padrao 30 kg e 9 itens; null salvo = sem limite
    expect(normalizeRules({}).inventory).toEqual({ maxWeight: 30, maxItems: 9 });
    expect(normalizeRules({ inventory: { maxWeight: null, maxItems: null } }).inventory).toEqual({ maxWeight: null, maxItems: null });
    expect(normalizeRules({}).sheet).toEqual({ stats: 'mestre', powers: 'mestre' });
  });
});
