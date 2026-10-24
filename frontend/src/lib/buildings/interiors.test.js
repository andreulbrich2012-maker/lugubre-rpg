import { describe, it, expect } from 'vitest';
import { generateInterior, checkInterior, INTERIOR_TYPES, interiorTypeFor } from './interiors.js';
import { validateMap } from '../tiles/format.js';

const key = (res) => JSON.stringify(res.map.layers);

describe('generateInterior', () => {
  for (const t of INTERIOR_TYPES) {
    for (const s of t.sizes) {
      it(`${t.id}/${s.id}: valido, com entrada e caminho ate todo comodo`, () => {
        for (let seed = 0; seed < 8; seed++) {
          const res = generateInterior({ type: t.id, size: s.id, seed });
          const chk = checkInterior(res);
          expect(chk.errors, `${t.id}/${s.id} semente ${seed}`).toEqual([]);
          expect(validateMap(res.map).ok).toBe(true);
          expect(res.map.cols).toBeLessThanOrEqual(80);
          expect(res.map.rows).toBeLessThanOrEqual(80);
          expect(res.rooms.length).toBeGreaterThan(0);
          expect(res.map.layers.ground[res.entry.y + 1][res.entry.x]).toBe('D');
        }
      });
    }
  }

  it('casa: sementes 0..99 dao 100 plantas diferentes em cada tamanho', () => {
    const sizes = INTERIOR_TYPES.find((t) => t.id === 'casa').sizes;
    const all = new Set();
    for (const s of sizes) {
      const seen = new Set();
      for (let seed = 0; seed < 100; seed++) {
        const res = generateInterior({ type: 'casa', size: s.id, seed });
        expect(checkInterior(res).ok).toBe(true);
        seen.add(key(res));
        all.add(key(res));
      }
      expect(seen.size, s.id).toBe(100);
    }
    expect(all.size).toBe(100 * sizes.length);
  });

  it('casa pela pegada (sem tamanho): 100 diferentes e validas', () => {
    const seen = new Set();
    for (let seed = 0; seed < 100; seed++) {
      const res = generateInterior({ type: 'casa', w: 7, h: 5, seed });
      expect(checkInterior(res).ok).toBe(true);
      seen.add(key(res));
    }
    expect(seen.size).toBe(100);
  });

  it('deterministico: mesma entrada, mesmo mapa', () => {
    for (const t of INTERIOR_TYPES) {
      const a = generateInterior({ type: t.id, seed: 42, w: 9, h: 6 });
      const b = generateInterior({ type: t.id, seed: 42, w: 9, h: 6 });
      expect(a).toEqual(b);
    }
  });

  it('tamanho vem da pegada e e maior por dentro, com limite', () => {
    const small = generateInterior({ type: 'casa', w: 5, h: 4, seed: 1 });
    expect(small.map.cols).toBe(12);
    expect(small.map.rows).toBe(11);
    const huge = generateInterior({ type: 'casa', w: 60, h: 60, seed: 1 });
    expect(huge.map.cols).toBe(40);
    expect(huge.map.rows).toBe(30);
    expect(checkInterior(huge).ok).toBe(true);
    const tiny = generateInterior({ type: 'casa', w: 3, h: 3, seed: 1 });
    expect(tiny.map.cols).toBe(10);
    expect(checkInterior(tiny).ok).toBe(true);
  });

  it('parede e piso do chamador (codigo ou material da fachada)', () => {
    const a = generateInterior({ type: 'casa', size: 'media', seed: 3, wall: 'pedra', floor: '_' });
    expect(a.map.layers.ground[0][0]).toBe('#');
    const b = generateInterior({ type: 'casa', size: 'media', seed: 3, wall: 'B', floor: 'nada' });
    expect(b.map.layers.ground[0][0]).toBe('B');
    expect(checkInterior(b).ok).toBe(true);
  });

  it('sobrado tem varios comodos e escada', () => {
    const res = generateInterior({ type: 'casa', size: 'sobrado', seed: 5 });
    expect(res.rooms.length).toBeGreaterThanOrEqual(5);
    expect(res.map.layers.ground.join('')).toMatch(/</);
  });

  it('tipos com mobilia caracteristica', () => {
    const has = (type, size, re) => {
      const res = generateInterior({ type, size, seed: 2 });
      return re.test(res.map.layers.objects.join(''));
    };
    expect(has('capela', 'capela', /a/)).toBe(true);
    expect(has('capela', 'capela', /Â/)).toBe(true);
    expect(has('ferraria', 'grande', /[6Ü]/)).toBe(true);
    expect(has('alquimista', 'grande', /4/)).toBe(true);
    expect(has('biblioteca', 'grande', /E/)).toBe(true);
    expect(has('cripta', 'grande', /2/)).toBe(true);
    expect(has('quartel', 'quartel', /e/)).toBe(true);
    expect(has('torre', 'pequena', /`/)).toBe(true);
  });
});

describe('interiorTypeFor', () => {
  it('mapeia nomes livres (com e sem acento)', () => {
    expect(interiorTypeFor('Taverna do Javali')).toBe('taverna');
    expect(interiorTypeFor('Estábulo')).toBe('celeiro');
    expect(interiorTypeFor('Igreja Matriz')).toBe('capela');
    expect(interiorTypeFor('Armazém')).toBe('armazem');
    expect(interiorTypeFor('Mansão dos Corvos')).toBe('mansao');
    expect(interiorTypeFor('torre')).toBe('torre');
    expect(interiorTypeFor('Casa do lenhador')).toBe('casa');
    expect(interiorTypeFor('')).toBe('casa');
  });
  it('INTERIOR_TYPES tem id, nome e tamanhos', () => {
    for (const t of INTERIOR_TYPES) {
      expect(t.id && t.name).toBeTruthy();
      expect(t.sizes.length).toBeGreaterThan(0);
    }
  });
});
