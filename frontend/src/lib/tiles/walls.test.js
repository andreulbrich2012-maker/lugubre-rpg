import { describe, it, expect } from 'vitest';
import { getTile, tileImages } from './catalog.js';
import { wallMask, wallVariant, wallPixels, N, E, S, W } from './walls.js';
import { roofPixels, ROOFS, EAVE_SHADOW } from './roofs.js';

const map = (ground) => ({ cols: ground[0].length, rows: ground.length, layers: { ground, objects: ground.map((r) => ' '.repeat(r.length)) } });

describe('autotile das paredes', () => {
  // ####
  // #__#
  // ##D#
  const m = map(['####', '#__#', '##D#', '....']);

  it('mascara de vizinhos conta portas como parede', () => {
    expect(wallMask(m, 0, 0)).toBe(E | S);
    expect(wallMask(m, 0, 1)).toBe(N | S);
    expect(wallMask(m, 1, 2)).toBe(W | E);
    expect(wallMask(m, 1, 0)).toBe(E | W); // chao abaixo
  });

  it('parede com parede abaixo = topo; com chao abaixo = face; porta sempre face', () => {
    expect(wallVariant(m, 0, 0).kind).toBe('top');
    expect(wallVariant(m, 1, 0).kind).toBe('face');
    expect(wallVariant(m, 0, 2).kind).toBe('face');
    expect(wallVariant(m, 2, 2).kind).toBe('face'); // porta
    expect(wallVariant(m, 1, 1)).toBeNull(); // chao
  });

  it('gera sprites 16x16 opacos diferentes para topo e face', () => {
    const t = getTile('#');
    const top = wallPixels(t, tileImages(t)[0], 'top', S);
    const face = wallPixels(t, tileImages(t)[0], 'face', 0);
    expect(top).toHaveLength(16 * 16 * 4);
    expect([...top].filter((_, i) => i % 4 === 3).every((a) => a === 255)).toBe(true);
    expect(Buffer.from(top).equals(Buffer.from(face))).toBe(false);
  });
});

describe('telhados', () => {
  it('cada material cobre a construcao menos a fileira da frente, com sombra do beiral', () => {
    for (const roof of ROOFS) {
      const r = roofPixels({ w: 4, h: 5, roof });
      expect(r.width).toBe(64);
      expect(r.height).toBe(4 * 16 + EAVE_SHADOW);
      expect(r.data[3]).toBe(255);
      expect(r.data[(r.height - 1) * r.width * 4 + 3]).toBeLessThan(255); // sombra semi-transparente
    }
    expect(roofPixels({ w: 3, h: 3, roof: 'x' }).height).toBe(2 * 16 + EAVE_SHADOW);
  });
});
