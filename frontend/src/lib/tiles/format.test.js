import { describe, it, expect } from 'vitest';
import {
  emptyMap, validateMap, repairMap, resizeMap, setCell, floodFill, rectFill, isSolid, canMoveTo, serializeMap, cloneMap
} from './format.js';

describe('formato do mapa', () => {
  it('emptyMap valida e limita o tamanho', () => {
    const m = emptyMap(10, 6);
    expect(validateMap(m).ok).toBe(true);
    expect(m.layers.ground[0]).toBe('..........');
    expect(m.layers.objects[0]).toBe('          ');
    expect(emptyMap(1, 999).cols).toBe(4);
    expect(emptyMap(1, 999).rows).toBe(80);
  });

  it('validateMap acha erros', () => {
    const m = emptyMap(4, 4);
    m.layers.ground[1] = '..';
    m.layers.objects[2] = ' ? ';
    const r = validateMap(m);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
    const w = emptyMap(4, 4);
    w.layers.objects[0] = '#   '; // parede na camada errada
    expect(validateMap(w).ok).toBe(false);
  });

  it('repairMap completa, corta, troca desconhecido e move camada', () => {
    const { map, warnings } = repairMap({ layers: { ground: ['##', '#é##########', '.T..'], objects: ['....', ' # '] } }, { cols: 4, rows: 4 });
    expect(validateMap(map).ok).toBe(true);
    // 'é' (desconhecido) vira chao padrao, mas a parede que veio nos objetos ocupa a mesma celula
    expect(map.layers.ground).toEqual(['##..', '####', '....', '....']);
    expect(map.layers.objects[2][1]).toBe('T');
    expect(map.layers.objects[0]).toBe('    '); // '.' nos objetos = vazio
    expect(warnings.join(' ')).toMatch(/desconhecido/);
    expect(warnings.join(' ')).toMatch(/camada errada/);
  });

  it('resize, setCell, rectFill, floodFill sao puros', () => {
    const m = emptyMap(6, 4);
    const r = resizeMap(setCell(m, 'ground', 5, 3, '#'), 4, 5);
    expect(r.cols).toBe(4);
    expect(r.layers.ground).toHaveLength(5);
    expect(r.layers.ground.every((row) => row === '....')).toBe(true);
    expect(m.layers.ground[3]).toBe('......');

    const box = rectFill(m, 'ground', 1, 1, 4, 2, '#');
    expect(box.layers.ground).toEqual(['......', '.####.', '.####.', '......']);
    const filled = floodFill(box, 'ground', 0, 0, '~');
    expect(filled.layers.ground).toEqual(['~~~~~~', '~####~', '~####~', '~~~~~~']);
    expect(floodFill(box, 'ground', 0, 0, '.')).toBe(box);
    expect(setCell(m, 'ground', 99, 0, '#')).toBe(m);
  });

  it('isSolid e canMoveTo', () => {
    let m = setCell(emptyMap(5, 5), 'ground', 1, 1, '#');
    m = setCell(m, 'objects', 2, 2, 'T');
    m = setCell(m, 'objects', 3, 3, 'f');
    expect(isSolid(m, 1, 1)).toBe(true);
    expect(isSolid(m, 2.6, 2.2)).toBe(true);
    expect(isSolid(m, 3, 3)).toBe(false);
    expect(isSolid(m, -1, 0)).toBe(true);
    expect(isSolid(m, 5, 0)).toBe(true);
    const tokens = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 4, y: 4 }];
    expect(canMoveTo(m, tokens, 4, 4)).toBe(false);
    expect(canMoveTo(m, tokens, 4, 4, 'b')).toBe(true);
    expect(canMoveTo(m, tokens, 3, 3, 'a')).toBe(true);
    expect(canMoveTo(m, tokens, 1, 1, 'a')).toBe(false);
  });

  it('serialize e clone', () => {
    const m = emptyMap(4, 4);
    expect(JSON.parse(serializeMap(m))).toEqual(m);
    const c = cloneMap(m);
    c.layers.ground[0] = '####';
    expect(m.layers.ground[0]).toBe('....');
  });
});
