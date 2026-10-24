import { describe, it, expect } from 'vitest';
import { TILES } from './catalog.js';
import { buildMapPrompt, catalogText, parseMapResponse } from './aiPrompt.js';
import { validateMap } from './format.js';

const payload = {
  name: 'Cripta',
  layers: { ground: ['######', '#____#', '#____#', '##D###'], objects: ['      ', ' C  t ', ' x    ', '      '] },
  notes: 'Pequena cripta.'
};

describe('prompt para IA', () => {
  it('lista todos os codigos e o tamanho', () => {
    const p = buildMapPrompt({ description: 'uma cripta', cols: 30, rows: 20 });
    for (const t of TILES) expect(p).toContain(`"${t.code}" ${t.name}`);
    expect(p).toContain('30 colunas');
    expect(p).toContain('20 linhas');
    expect(p).toContain('uma cripta');
    expect(catalogText().split('\n').length).toBeGreaterThan(5);
  });

  it('o exemplo do prompt e um mapa valido', () => {
    const p = buildMapPrompt({ description: 'x', cols: 12, rows: 8 });
    const r = parseMapResponse(p.slice(p.indexOf('EXEMPLO')), 12, 8);
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual([]);
    expect(validateMap(r.map).ok).toBe(true);
  });
});

describe('parseMapResponse', () => {
  it('JSON com cercas ```', () => {
    const r = parseMapResponse('```json\n' + JSON.stringify(payload, null, 2) + '\n```', 6, 4);
    expect(r.ok).toBe(true);
    expect(r.name).toBe('Cripta');
    expect(r.map.layers.ground[3]).toBe('##D###');
    expect(r.map.layers.objects[1]).toBe(' C  t ');
  });

  it('texto antes e depois do JSON', () => {
    const r = parseMapResponse('Claro! Aqui está {o mapa}:\n' + JSON.stringify(payload) + '\nBom jogo!', 6, 4);
    expect(r.ok).toBe(true);
    expect(r.notes).toBe('Pequena cripta.');
    expect(validateMap(r.map).ok).toBe(true);
  });

  it('grade crua sem JSON separa objetos', () => {
    const r = parseMapResponse('Mapa:\n######\n#_C__#\n#____#\n##D###\nfim', 6, 4);
    expect(r.ok).toBe(true);
    expect(r.map.layers.ground[1]).toBe('#_.__#'); // sob o objeto fica o chao padrao
    expect(r.map.layers.objects[1][2]).toBe('C');
    expect(r.warnings[0]).toMatch(/grade/);
  });

  it('ajusta tamanho diferente do pedido', () => {
    const r = parseMapResponse(JSON.stringify(payload), 8, 5);
    expect(r.map.cols).toBe(8);
    expect(r.map.rows).toBe(5);
    expect(r.warnings.join(' ')).toMatch(/8×5/);
  });

  it('lixo devolve erro em pt-BR', () => {
    const r = parseMapResponse('desculpe, não consigo ajudar com isso', 6, 4);
    expect(r.ok).toBe(false);
    expect(r.map).toBeNull();
    expect(r.warnings[0]).toMatch(/Não encontrei/);
  });
});

describe('itens e construcoes no prompt', () => {
  it('pede items e buildings e o exemplo traz os dois', () => {
    const p = buildMapPrompt({ description: 'cripta', cols: 16, rows: 12 });
    expect(p).toMatch(/"items"/);
    expect(p).toMatch(/"buildings"/);
    expect(p).toContain('pode guardar itens');
    expect(p).toContain('x = coluna (0 a 15');
    const r = parseMapResponse(p.slice(p.indexOf('EXEMPLO')), 12, 8);
    expect(r.map.items.length).toBe(4);
    expect(r.map.items.find((it) => it.container)?.contents.map((c) => c.name)).toEqual(['Pão dormido', 'Pederneira']);
    expect(p).toContain('armadura de placas 20');
    expect(r.map.buildings[0]).toMatchObject({ x: 1, y: 1, w: 10, h: 5, roof: 'palha' });
    expect(r.map.items.find((it) => it.dracmas)?.dracmas).toBe(25);
  });

  it('le items dentro de "map" e conserta os invalidos', () => {
    const r = parseMapResponse(JSON.stringify({ map: { ...payload, items: [{ x: 1, y: 1, name: 'Ossos de rato' }, { x: 40, y: 1, name: 'Fora' }] } }), 6, 4);
    expect(r.ok).toBe(true);
    expect(r.map.items.map((it) => it.name)).toEqual(['Ossos de rato']);
    expect(r.warnings.join(' ')).toMatch(/descartad/);
  });
});

describe('itens e monstros sim/nao', () => {
  it('o prompt pede monstros so quando o mestre quer, e avisa quando nao quer itens', () => {
    const base = buildMapPrompt({ description: 'cripta', cols: 12, rows: 8 });
    expect(base).not.toContain('MONSTROS');
    const com = buildMapPrompt({ description: 'cripta', cols: 12, rows: 8, monsters: true, items: false });
    expect(com).toContain('MONSTROS ("monsters"');
    expect(com).toContain('NÃO quer itens');
  });

  it('monstros da resposta: so em celula livre, sem repetir, hp limitado', () => {
    const ground = Array.from({ length: 8 }, (_, y) => (y === 0 ? '#'.repeat(12) : '.'.repeat(12)));
    const text = JSON.stringify({ layers: { ground, objects: Array(8).fill(' '.repeat(12)) }, monsters: [
      { name: 'Esqueleto', x: 3, y: 3, hp: 9999 }, { name: 'Na parede', x: 2, y: 0 }, { name: 'Repetido', x: 3, y: 3 }, { name: '', x: 4, y: 4 }, { name: 'Fora', x: 40, y: 2 }
    ] });
    const r = parseMapResponse(text, 12, 8);
    expect(r.monsters).toEqual([{ name: 'Esqueleto', x: 3, y: 3, hp: 500 }]);
  });
});
