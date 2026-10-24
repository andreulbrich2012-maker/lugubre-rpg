import { describe, expect, it } from 'vitest';
import { validateTiles, MAX_TILES_SIZE, MAX_TILES_BUILDINGS } from './tiles.js';

const grid = (n, ch = '.') => Array.from({ length: n }, () => ch.repeat(n));

describe('validateTiles: mapa grande', () => {
  it('aceita ate 1000x1000 celulas, com item e construcao na ultima celula', () => {
    const n = MAX_TILES_SIZE;
    const tiles = {
      cols: n, rows: n, layers: { ground: grid(n), objects: grid(n, ' ') },
      items: [{ id: 'fim', x: n - 1, y: n - 1, name: 'Achado no canto' }],
      buildings: [{ id: 'b1', x: n - 3, y: n - 3, w: 3, h: 3 }]
    };
    const out = validateTiles(tiles);
    expect(out.cols).toBe(1000);
    expect(out.items[0].x).toBe(999);
  });

  it('recusa acima de 1000 e lista de construcoes acima do limite', () => {
    expect(() => validateTiles({ cols: 1001, rows: 4, layers: { ground: grid(4) } })).toThrow(/1000/);
    const buildings = Array.from({ length: MAX_TILES_BUILDINGS + 1 }, (_, i) => ({ id: `b${i}`, x: 0, y: 0, w: 3, h: 3 }));
    expect(() => validateTiles({ cols: 8, rows: 8, layers: { ground: grid(8) }, buildings })).toThrow(/3000/);
  });
});
