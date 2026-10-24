import { describe, it, expect } from 'vitest';
import {
  emptyMap, validateMap, repairMap, resizeMap, setCell, floodFill, rectFill, isSolid, canMoveTo, serializeMap, cloneMap,
  placeBuilding, addItem, updateItem, removeItem
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

describe('itens pegaveis e construcoes', () => {
  it('repairMap descarta itens fora do mapa, limita valores e corta textos', () => {
    const { map, warnings } = repairMap({
      layers: { ground: ['....', '....', '....', '....'] },
      items: [
        { id: 'a', x: 1, y: 2, name: 'Poção de cura', quantity: 0, weight: -3, category: 'poções', description: 'x'.repeat(300) },
        { id: 'a', x: 2, y: 2, name: 'N'.repeat(90), quantity: 5000, weight: 2.345, category: 'Inventada', dracmas: 12.6 },
        { x: 9, y: 0, name: 'Fora' },
        { x: 0, y: 0, name: '   ' }
      ]
    });
    expect(map.items).toHaveLength(2);
    const [a, b] = map.items;
    expect(a).toMatchObject({ id: 'a', quantity: 1, weight: 0, category: 'Poções' });
    expect(a.description).toHaveLength(200);
    expect(b.id).not.toBe('a');
    expect(b.name).toHaveLength(60);
    expect(b).toMatchObject({ quantity: 999, weight: 2.35, category: 'Achados', dracmas: 13 });
    expect(warnings.join(' ')).toMatch(/2 item/);
    expect(validateMap(map).ok).toBe(true);
  });

  it('construcoes: dentro do mapa e no minimo 3x3; telhado desconhecido vira telha', () => {
    const { map } = repairMap({
      layers: { ground: Array(6).fill('......') },
      buildings: [
        { x: 0, y: 0, w: 4, h: 3, name: 'Casa', roof: 'Ardósia' },
        { x: 3, y: 3, w: 4, h: 3 },
        { x: 0, y: 3, w: 2, h: 3 },
        { x: 1, y: 3, w: 3, h: 3, roof: 'ouro' }
      ]
    });
    expect(map.buildings.map((b) => [b.name, b.roof])).toEqual([['Casa', 'ardosia'], ['Construção', 'telha']]);
    expect(validateMap({ ...map, buildings: [{ id: 'x', x: 5, y: 5, w: 3, h: 3, name: 'a', roof: 'telha' }] }).ok).toBe(false);
  });

  it('placeBuilding cerca de parede, poe piso, porta embaixo e registra o telhado', () => {
    const m = placeBuilding(emptyMap(8, 6), 1, 1, 5, 4, { wall: 'B', floor: '_', roof: 'palha', name: 'Casa' });
    expect(m.layers.ground.slice(1, 5)).toEqual(['.BBBBB..', '.B___B..', '.B___B..', '.BBDBB..']);
    expect(m.buildings[0]).toMatchObject({ x: 1, y: 1, w: 5, h: 4, roof: 'palha', name: 'Casa' });
    expect(placeBuilding(m, 0, 0, 1, 1)).toBe(m); // menor que 3x3
  });

  it('itens: adicionar, editar, remover e cortar no redimensionar', () => {
    let m = addItem(emptyMap(6, 6), 5, 5, { name: 'Chave' });
    const id = m.items[0].id;
    m = updateItem(m, id, { quantity: 3 });
    expect(m.items[0]).toMatchObject({ name: 'Chave', quantity: 3, x: 5, y: 5 });
    expect(resizeMap(m, 5, 5).items).toEqual([]);
    expect(removeItem(m, id).items).toEqual([]);
    expect(JSON.parse(serializeMap(m)).items).toHaveLength(1);
  });
});
