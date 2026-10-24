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
