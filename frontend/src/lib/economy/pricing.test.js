import { describe, expect, it } from 'vitest';
import { CATALOG, CATALOG_BY_ID, CATEGORIES } from './prices';
import { ARCHETYPES, archetypeStock } from './merchants';
import {
  areaAt, catalogCategory, cleanMult, coinsLabel, finalPrice, formatMult, matchCatalog, rentalEnd, rentalExpired, rentalLeft,
  roundPrice, sellOffer, totalMult, walletFromTotal, walletTotal
} from './pricing';
import { cleanWander, insidePoly, wanderCell, wanderPos } from './wander';

describe('tabela de precos', () => {
  it('ids unicos, categorias conhecidas e precos do livro', () => {
    expect(new Set(CATALOG.map((it) => it.id)).size).toBe(CATALOG.length);
    for (const it of CATALOG) {
      expect(CATEGORIES[it.cat], it.id).toBeTruthy();
      expect(it.price, it.id).toBeGreaterThan(0);
    }
    for (const [id, price] of [['adaga', 15], ['espada-curta', 40], ['montante', 250], ['besta', 200], ['cota-de-malha', 300], ['escudo', 80], ['antidoto', 50], ['tonico-de-clareza', 80]]) {
      expect(CATALOG_BY_ID[id].price, id).toBe(price);
      expect(CATALOG_BY_ID[id].src).toBe('livro');
    }
    // aluguel por dia onde faz sentido: barco, cavalo, quarto, ferramentas
    for (const id of ['bote', 'veleiro', 'cavalo', 'quarto-comum', 'picareta']) expect(CATALOG_BY_ID[id].rent, id).toBeGreaterThan(0);
  });

  it('cada modelo de mercador tem estoque do proprio oficio', () => {
    expect(ARCHETYPES).toHaveLength(10);
    const cats = (id) => new Set(archetypeStock(id).map(([cid]) => CATALOG_BY_ID[cid].cat));
    expect([...cats('barqueiro')]).toEqual(['barcos']);
    expect(cats('boticario').has('pocoes')).toBe(true);
    expect(cats('cavalarico').has('montarias')).toBe(true);
    expect(cats('estalajadeiro').has('servicos')).toBe(true);
    expect(ARCHETYPES.find((a) => a.id === 'joalheiro').buyCategories).toEqual([]); // penhores compram de tudo
  });
});

describe('contas de preco', () => {
  it('multiplicadores: limpa, formata e multiplica', () => {
    expect(cleanMult('abc')).toBe(1);
    expect(cleanMult(0)).toBe(1);
    expect(cleanMult(99)).toBe(10);
    expect(cleanMult(1.256)).toBe(1.26);
    expect(formatMult(1.5)).toBe('×1,5');
    expect(totalMult({ campaign: 2, scene: 1.5, area: 0.5, merchant: 2 })).toBe(3);
    expect(totalMult({ merchant: 2 }, { merchant: false })).toBe(1);
    expect(finalPrice(100, { campaign: 1.25, merchant: 1.5 })).toBe(188);
    expect(roundPrice(0.2)).toBe(1);
    expect(roundPrice(0)).toBe(0);
  });

  it('area de preco: a ultima desenhada ganha', () => {
    const areas = [{ name: 'Cidade', x: 0, y: 0, w: 10, h: 10, mult: 1.5 }, { name: 'Mercado', x: 2, y: 2, w: 2, h: 2, mult: 0.8 }];
    expect(areaAt(areas, 3, 3).name).toBe('Mercado');
    expect(areaAt(areas, 8, 8).name).toBe('Cidade');
    expect(areaAt(areas, 11, 1)).toBeNull();
  });

  it('venda ao mercador: categoria, taxa, alugado e nomes', () => {
    const ferreiro = { buys: true, buyRate: 0.5, buyCategories: ['armas', 'armaduras'] };
    expect(sellOffer({ name: 'Espada longa' }, ferreiro)).toBe(50);
    expect(sellOffer({ name: 'Espada longa' }, ferreiro, { campaign: 2, merchant: 3 })).toBe(100); // x do mercador nao conta
    expect(sellOffer({ name: 'Poção de cura' }, ferreiro)).toBe(0);
    expect(sellOffer({ name: 'Espada longa' }, { ...ferreiro, buys: false })).toBe(0);
    expect(sellOffer({ name: 'Rubi' }, { buys: true, buyRate: 0.6, buyCategories: [] })).toBe(300);
    expect(sellOffer({ name: 'Quarto comum (noite)' }, { buys: true, buyRate: 1 })).toBe(0); // servico nao se vende
    expect(matchCatalog({ name: 'Espada longa enferrujada' }).id).toBe('espada-longa');
    expect(matchCatalog({ name: 'Coisa estranha' })).toBeNull();
    expect(matchCatalog({ name: 'qualquer', catalogId: 'rubi' }).id).toBe('rubi');
    expect(catalogCategory({ name: 'Coisa', category: 'Armas' })).toBe('armas');
  });

  it('carteira e moedas', () => {
    expect(walletTotal({ gold: 1, platinum: 2, silver: 3, bronze: 4 })).toBe(734);
    expect(walletFromTotal(734)).toEqual({ gold: 1, platinum: 2, silver: 3, bronze: 4 });
    expect(coinsLabel(601)).toBe('1 ouro, 1 platina, 1 bronze');
    expect(coinsLabel(0)).toBe('0');
  });

  it('prazo do aluguel: relogio do mundo ou horas reais', () => {
    const world = rentalEnd({ days: 2, clockOn: true, worldMinutes: 100 });
    expect(world).toEqual({ endsWorldMinutes: 2980, endsAt: null });
    expect(rentalExpired(world, { worldMinutes: 2979 })).toBe(false);
    expect(rentalExpired(world, { worldMinutes: 2980 })).toBe(true);
    expect(rentalLeft(world, { worldMinutes: 100 })).toBe('2 dias no mundo');
    const now = Date.UTC(2026, 9, 24, 12);
    const real = rentalEnd({ days: 1, clockOn: false, now, realHoursPerDay: 2 });
    expect(new Date(real.endsAt).getTime() - now).toBe(2 * 3600_000);
    expect(rentalLeft(real, { now })).toBe('2 h');
    expect(rentalExpired(real, { now: now + 2 * 3600_000 })).toBe(true);
    expect(rentalEnd({ days: 999, clockOn: true }).endsWorldMinutes).toBe(30 * 1440);
  });
});

describe('NPC andando', () => {
  it('parado nao mexe; area fica dentro; rota passa pelos pontos', () => {
    expect(cleanWander(null)).toEqual({ mode: 'parado' });
    expect(cleanWander({ mode: 'rota', route: [[1, 1]] })).toEqual({ mode: 'parado' });
    expect(wanderPos({ id: 'a', wander: { mode: 'parado' } }, 70)).toBeNull();
    const poly = [[0, 0], [6, 0], [6, 6], [0, 6]];
    for (let t = 0; t < 200_000; t += 1333) {
      const c = wanderCell({ mode: 'area', area: { type: 'poly', points: poly } }, 'npc', t);
      expect(insidePoly(poly, c.x + 1e-9, c.y + 1e-9) || c.x === 0 || c.y === 0).toBe(true);
    }
    const route = { mode: 'rota', route: [[0, 0], [4, 0]], loop: false, speed: 1, pause: 0 };
    const xs = Array.from({ length: 80 }, (_, i) => wanderCell(route, 'r', i * 100).x);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(4);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(3); // anda o trecho todo em 8 s
    // mesma hora e mesmo token = mesma posicao (todos os jogadores veem igual)
    expect(wanderCell(route, 'r', 12345)).toEqual(wanderCell(route, 'r', 12345));
    const px = wanderPos({ id: 'r', wander: route }, 70, 12345);
    expect(px.x).toBeCloseTo(wanderCell(route, 'r', 12345).x * 70);
  });
});
