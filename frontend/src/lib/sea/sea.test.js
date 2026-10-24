import { describe, expect, it } from 'vitest';
import { BOAT_TYPES } from './boats.js';
import { BOAT_TYPES as SERVER_TYPES } from '../../../../backend/src/utils/boats.js';
import { dirOf, pointAt, routeLength, seaRoute, secondsLeft, voyageLabel, voyageProgress, isWaterCode } from './route.js';
import { generateSea } from './seaMap.js';
import { boatFrames, deckSkirt } from './boatSprite.js';

describe('barcos', () => {
  it('a tabela de tipos e a mesma do servidor', () => {
    expect(BOAT_TYPES).toEqual(SERVER_TYPES);
  });

  it('sprite: 4 quadros do mesmo tamanho, com o barco e a esteira', () => {
    const f = boatFrames('veleiro', 'se', true);
    expect(f.frames).toHaveLength(4);
    expect(f.frames.every((d) => d.length === f.w * f.h * 4)).toBe(true);
    expect(f.ax).toBeGreaterThan(0);
    expect(f.ay).toBeGreaterThan(0);
    // quadros diferentes (a esteira e os remos andam)
    expect(Buffer.from(f.frames[0]).equals(Buffer.from(f.frames[2]))).toBe(false);
  });

  it('costado do convés so aparece embaixo do casco', () => {
    const tiles = { cols: 5, rows: 5, layers: { ground: ['óóóóó', 'ó===ó', 'ó===ó', 'óóóóó', 'óóóóó'] }, vessel: { type: 'pesca', part: 'deck' } };
    const s = deckSkirt(tiles);
    const alpha = (x, y) => s.data[(y * s.w + x) * 4 + 3];
    expect(alpha(40, 3 * 16 + 4)).toBe(255); // logo abaixo da ultima linha do casco
    expect(alpha(40, 1 * 16 + 4)).toBe(0); // em cima do convés nao
  });
});

describe('rota da viagem', () => {
  const route = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
  it('tamanho e ponto no meio do caminho (por distancia)', () => {
    expect(routeLength(route)).toBe(20);
    expect(pointAt(route, 0.25)).toMatchObject({ x: 5, y: 0, dir: 'e' });
    expect(pointAt(route, 0.75)).toMatchObject({ x: 10, y: 5, dir: 's' });
    expect(pointAt(route, 2)).toMatchObject({ x: 10, y: 10 });
  });

  it('direcao em 8', () => {
    expect(dirOf(1, 0)).toBe('e');
    expect(dirOf(1, 1)).toBe('se');
    expect(dirOf(0, -1)).toBe('n');
    expect(dirOf(-1, -1)).toBe('nw');
    expect(dirOf(0, 0, 'w')).toBe('w');
  });

  it('progresso anda so navegando; tempo que falta e o rotulo', () => {
    const at = new Date(10_000).toISOString();
    const v = { status: 'sailing', progress: 0.5, speed: 2, route, progress_at: at };
    expect(voyageProgress(v, 10_000 + 2500)).toBeCloseTo(0.75);
    expect(secondsLeft(v, 10_000)).toBeCloseTo(5);
    expect(voyageLabel(v, 10_000)).toBe('Navegando');
    expect(voyageLabel(v, 10_000 + 60_000)).toBe('Chegando ao destino');
    expect(voyageProgress({ ...v, status: 'paused' }, 99_999)).toBe(0.5);
    expect(voyageLabel({ ...v, status: 'paused' }, 0)).toBe('Parado no mar');
    expect(secondsLeft({ ...v, status: 'paused' })).toBeNull();
  });

  it('mar gerado: mar fundo, ilhas fora da faixa do meio e rota pela agua', () => {
    const sea = generateSea({ size: 'pequeno', islands: 3, rocks: 6, seed: 42 });
    expect(sea.sea).toBe(true);
    expect(sea.layers.ground).toHaveLength(sea.rows);
    expect(sea.layers.ground.join('')).toMatch(/[.:]/); // tem ilha
    const r = seaRoute(sea);
    expect(r.length).toBeGreaterThanOrEqual(2);
    expect(r[0].x).toBeLessThan(5);
    expect(r[r.length - 1].x).toBeGreaterThan(sea.cols - 5);
    for (const p of r) expect(isWaterCode(sea.layers.ground[p.y][p.x])).toBe(true);
  });

  it('rota desvia de uma ilha no meio do caminho', () => {
    const ground = Array.from({ length: 9 }, (_, y) => Array.from({ length: 20 }, (_, x) => (x >= 8 && x <= 11 && y >= 2 && y <= 6 ? '.' : 'ó')).join(''));
    const r = seaRoute({ cols: 20, rows: 9, layers: { ground } });
    expect(r.length).toBeGreaterThan(2);
    for (let i = 0; i <= 40; i++) {
      const p = pointAt(r, i / 40);
      expect(ground[Math.round(p.y)][Math.round(p.x)]).toBe('ó');
    }
  });
});
