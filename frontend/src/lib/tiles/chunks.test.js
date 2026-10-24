import { describe, expect, it } from 'vitest';
import { renderTerrain, renderObjects, renderTerrainRegion, renderObjectsRegion, cropImage, subMap } from './compose.js';
import { chunkLayout, chunkRect, visibleChunks, pickLod, diffLayers, dirtyChunks, CHUNK } from './chunks.js';
import { planToMap } from './mapPlan.js';
import { SIZE } from './catalog.js';

// Mapa de teste com tudo que olha para o vizinho: rio, lago, mar, cachoeira, lava, paredes,
// cerca/palicada, arvores grandes, moinho, estrada e casas.
function testMap() {
  const { map } = planToMap({
    base: 'grama',
    areas: [
      { type: 'floresta', rect: [0, 0, 40, 40] },
      { type: 'lago', circle: [70, 30, 14] },
      { type: 'mar', rect: [0, 80, 40, 20] },
      { type: 'lava', circle: [80, 80, 6] },
      { type: 'bairro', rect: [45, 55, 30, 25] }
    ],
    rivers: [{ points: [[50, 0], [45, 50], [20, 90]], width: 3 }],
    roads: [{ points: [[0, 50], [100, 55]], width: 2 }],
    fences: [{ points: [[10, 60], [40, 60]], type: 'cerca' }],
    objects: [{ type: 'moinho', x: 30, y: 70 }, { type: 'fogueira', x: 60, y: 45 }]
  }, { cols: 80, rows: 70, seed: 3 });
  const g = map.layers.ground.map((r) => [...r]);
  const o = map.layers.objects.map((r) => [...r]);
  // cachoeira e parede cruzando a borda dos pedacos de 32
  for (let y = 28; y < 36; y++) g[y][31] = 'V';
  for (let x = 28; x < 37; x++) { g[40][x] = '#'; g[41][x] = '#'; }
  for (let x = 60; x < 68; x++) o[33][x] = 'Æ';
  o[32][63] = 'ð'; o[33][31] = 'T'; o[34][32] = 'Õ';
  return { ...map, layers: { ground: g.map((r) => r.join('')), objects: o.map((r) => r.join('')) } };
}

const RECTS = [[0, 0, 32, 32], [32, 0, 32, 32], [32, 32, 32, 32], [64, 32, 16, 32], [0, 64, 32, 6], [64, 64, 16, 6], [17, 23, 20, 15]];

describe('render em pedacos (mapa grande)', () => {
  const map = testMap();

  it('pedaco do terreno = mesmo trecho do mapa inteiro (bordas, espuma, cachoeira)', () => {
    for (const frame of [0, 1]) {
      const full = renderTerrain(map, { frame });
      for (const [x, y, w, h] of RECTS) {
        const part = renderTerrainRegion(map, x, y, w, h, { frame });
        const ref = cropImage(full, x * SIZE, y * SIZE, w * SIZE, h * SIZE);
        expect(part.w).toBe(ref.w);
        expect(Buffer.from(part.data).equals(Buffer.from(ref.data)), `terreno ${x},${y} quadro ${frame}`).toBe(true);
      }
    }
  });

  it('pedaco dos objetos = mesmo trecho (copa e moinho que passam da borda)', () => {
    const full = renderObjects(map);
    for (const [x, y, w, h] of RECTS) {
      const part = renderObjectsRegion(map, x, y, w, h, {});
      const ref = cropImage(full, x * SIZE, y * SIZE, w * SIZE, h * SIZE);
      expect(Buffer.from(part.data).equals(Buffer.from(ref.data)), `objetos ${x},${y}`).toBe(true);
    }
  });

  it('subMap guarda a origem absoluta e recorta as linhas', () => {
    const s = subMap(map, 10, 5, 8, 4);
    expect(s.origin).toEqual({ x: 10, y: 5 });
    expect(s.layers.ground).toHaveLength(4);
    expect(s.layers.ground[0]).toBe(map.layers.ground[5].slice(10, 18));
    expect(subMap(map, 0, 0, map.cols, map.rows)).toBe(map);
  });
});

describe('chunks: divisao, vista e sujeira', () => {
  it('mapa pequeno e um pedaco so; grande vira pedacos de CHUNK', () => {
    expect(chunkLayout(80, 60)).toMatchObject({ single: true, nx: 1, ny: 1, cw: 80 });
    const L = chunkLayout(1000, 1000);
    expect(L).toMatchObject({ single: false, nx: Math.ceil(1000 / CHUNK), cw: CHUNK });
    expect(chunkRect(L, L.nx - 1, 0).w).toBe(1000 - (L.nx - 1) * CHUNK);
  });

  it('so os pedacos da vista, do centro para fora', () => {
    const L = chunkLayout(1000, 1000);
    const list = visibleChunks(L, { x0: 40, y0: 40, x1: 100, y1: 70 });
    expect(list.length).toBe(2 * 3);
    expect(list[0]).toEqual([2, 1]);
    expect(visibleChunks(L, { x0: 2000, y0: 0, x1: 2100, y1: 10 })).toEqual([]);
  });

  it('nivel de detalhe pelo tamanho da celula na tela', () => {
    expect(pickLod(2, false)).toBe('overview');
    expect(pickLod(8, false)).toBe(8);
    expect(pickLod(40, false)).toBe(16);
    expect(pickLod(2, true)).toBe(16);
  });

  it('diff acha so as linhas/colunas pintadas e suja os pedacos vizinhos certos', () => {
    const a = { ground: ['....', '....', '....'], objects: ['    ', '    ', '    '] };
    const b = { ...a, ground: ['....', '.~~.', '....'] };
    expect(diffLayers(a, b)).toEqual([[1, 1, 2]]);
    expect(diffLayers(a, { ...a })).toEqual([]);
    const L = chunkLayout(1000, 1000);
    // celula no meio de um pedaco: so ele
    expect([...dirtyChunks(L, [[48, 48, 48]])]).toEqual(['1|1']);
    // logo abaixo da borda: a copa sobe para o pedaco de cima tambem
    expect(dirtyChunks(L, [[CHUNK + 1, 48, 48]])).toEqual(new Set(['1|0', '1|1']));
  });
});
