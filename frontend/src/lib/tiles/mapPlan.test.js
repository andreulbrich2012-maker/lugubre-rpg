import { describe, it, expect } from 'vitest';
import { planToMap, isPlan, pickDesign } from './mapPlan.js';
import { PLAN_EXAMPLE, buildPlanPrompt } from './planPrompt.js';
import { parseMapResponse } from './aiPrompt.js';
import { validateMap } from './format.js';

describe('plano de mapa', () => {
  it('o exemplo do prompt vira um mapa valido com construcoes, pontos e cerca', () => {
    const r = planToMap(PLAN_EXAMPLE, { cols: 100, rows: 80 });
    expect(validateMap(r.map).ok).toBe(true);
    expect(r.map.buildings.length).toBeGreaterThan(8);
    expect(r.map.pois.map((p) => p.name)).toContain('Templo da Aurora');
    expect(r.map.layers.objects.join('')).toContain('+');
    expect(r.map.layers.ground.join('')).toContain('-'); // ponte/cais
  });

  it('escala 0-100 (plano antigo) e 0-1000 dao o mesmo lugar', () => {
    const a = planToMap({ buildings: [{ type: 'casa', size: 'pequena', x: 50, y: 50, facing: 'sul' }] }, { cols: 60, rows: 50 });
    const b = planToMap({ buildings: [{ type: 'casa', size: 'pequena', x: 500, y: 500, facing: 'sul' }] }, { cols: 60, rows: 50 });
    expect(a.map.buildings[0].x).toBe(b.map.buildings[0].x);
    expect(a.map.buildings[0].y).toBe(b.map.buildings[0].y);
  });

  it('bairro enche de casas sem sobrepor', () => {
    const r = planToMap({ areas: [{ type: 'bairro', density: 1, rect: [100, 100, 800, 800] }], roads: [{ points: [[0, 500], [1000, 500]] }] }, { cols: 80, rows: 70 });
    const bs = r.map.buildings;
    expect(bs.length).toBeGreaterThan(15);
    for (const a of bs) for (const b of bs) if (a !== b) expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y).toBe(true);
  });

  it('porta vira para a estrada mais perto quando a IA nao diz', () => {
    const r = planToMap({ roads: [{ points: [[0, 200], [1000, 200]], width: 2 }], buildings: [{ type: 'casa', size: 'media', x: 500, y: 500 }] }, { cols: 60, rows: 60 });
    expect(r.map.buildings[0].facing).toBe('norte');
  });

  it('reconhece plano na resposta da IA e escolhe projeto pelo tipo', () => {
    expect(isPlan({ areas: [] })).toBe(true);
    expect(isPlan({ layers: { ground: [] } })).toBe(false);
    expect(pickDesign({ type: 'Taverna', size: 'grande' }).id).toBe('taverna-12');
    const r = parseMapResponse('```json\n' + JSON.stringify(PLAN_EXAMPLE) + '\n```', 72, 54);
    expect(r.ok && r.plan).toBe(true);
  });

  it('prompt com foto pede legenda e bairros', () => {
    const p = buildPlanPrompt({ fromImage: true });
    expect(p).toContain('IMAGEM');
    expect(p).toContain('"pois"');
    expect(p).toContain('bairro');
  });

  it('rocha no mar vira ilha e o farol cabe; praia automatica na costa', () => {
    const r = planToMap({ areas: [{ type: 'mar', rect: [600, 0, 400, 1000] }, { type: 'rocha', circle: [800, 500, 80] }], buildings: [{ type: 'farol', x: 800, y: 500 }] }, { cols: 80, rows: 60 });
    expect(r.map.buildings.length).toBe(1);
    expect(r.map.layers.ground.join('')).toContain(':');
  });

  it('campo do mapa todo nao apaga o mar', () => {
    const r = planToMap({ areas: [{ type: 'mar', rect: [700, 0, 300, 1000] }, { type: 'campo', rect: [0, 0, 1000, 1000] }] }, { cols: 60, rows: 40 });
    expect(r.map.layers.ground[20].slice(55)).toMatch(/^[ó~]+$/);
  });

  it('cais so na agua: no seco e ignorado; na agua ganha barco', () => {
    const seco = planToMap({ roads: [{ type: 'cais', points: [[100, 500], [300, 500]] }] }, { cols: 60, rows: 40 });
    expect(seco.map.layers.ground.join('')).not.toContain('-');
    const mar = planToMap({ areas: [{ type: 'mar', rect: [600, 0, 400, 1000] }], roads: [{ type: 'cais', points: [[450, 500], [800, 500]] }] }, { cols: 60, rows: 40 });
    expect(mar.map.layers.ground[20]).toContain('-');
    expect(mar.map.layers.objects.join('')).toContain('Ù');
  });

  it('projeto em L: id novo minusculo e id antigo continua valendo', () => {
    expect(pickDesign({ design: 'casa-L-media' }).id).toBe('casa-l-media');
    const r = planToMap({ buildings: [{ type: 'casa', design: 'casa-l-media', x: 500, y: 500 }] }, { cols: 60, rows: 50 });
    expect(r.map.buildings[0].design).toBe('casa-l-media');
  });

  it('modo texto usa exemplo sem mar/cais; modo foto mantem o exemplo completo', () => {
    expect(buildPlanPrompt({ description: 'vila' })).not.toContain('"type":"cais"');
    expect(buildPlanPrompt({ fromImage: true })).toContain('"type":"cais"');
    expect(buildPlanPrompt({ description: 'vila' })).toContain('"mode":"texto"');
    expect(buildPlanPrompt({ fromImage: true })).not.toContain('"mode":"texto"');
  });
  it('mercado (terra pequena) e cemiterio ficam sem casa de bairro em cima', () => {
    const r = planToMap({ areas: [{ type: 'bairro', size: 'pequena', density: 1.5, rect: [100, 100, 800, 800] }, { type: 'terra', rect: [400, 400, 200, 200] }] }, { cols: 80, rows: 60 });
    const x0 = Math.round(0.42 * 79); const x1 = Math.round(0.58 * 79); const y0 = Math.round(0.42 * 59); const y1 = Math.round(0.58 * 59);
    const over = r.map.buildings.filter((b) => b.x < x1 && b.x + b.w > x0 && b.y < y1 && b.y + b.h > y0);
    expect(r.map.buildings.length).toBeGreaterThan(10);
    expect(over.length).toBe(0);
  });

  it('pantano do mapa todo e o fundo: o campo da vila fica por cima e tem agua parada', () => {
    const r = planToMap({ areas: [{ type: 'campo', rect: [400, 400, 200, 200] }, { type: 'pantano', rect: [0, 0, 1000, 1000] }] }, { cols: 80, rows: 60 });
    const g = r.map.layers.ground;
    expect(g.join('')).toContain('%');
    expect(g[30].slice(36, 44)).not.toMatch(/[%j]/);
  });

  it('barco em terra vai para a agua mais perto', () => {
    const r = planToMap({ areas: [{ type: 'mar', rect: [700, 0, 300, 1000] }], objects: [{ type: 'barco', x: 650, y: 500 }, { type: 'barco', x: 100, y: 100 }] }, { cols: 60, rows: 40 });
    const o = r.map.layers.objects;
    const boats = o.join('\n').split('Ù').length - 1;
    expect(boats).toBe(1);
    const y = o.findIndex((row) => row.includes('Ù'));
    expect(r.map.layers.ground[y][o[y].indexOf('Ù')]).toMatch(/[ó~]/);
  });
  it('mapa de neve: campo da vila continua branco e a mata vira pinheiro', () => {
    const r = planToMap({ areas: [{ type: 'neve', rect: [0, 0, 1000, 1000] }, { type: 'campo', rect: [300, 300, 400, 400] }, { type: 'floresta', circle: [100, 100, 100] }] }, { cols: 80, rows: 60 });
    expect(r.map.layers.ground[30].slice(36, 44)).toMatch(/^[*]+$/);
    expect(r.map.layers.objects.join('')).not.toContain('T');
  });

  it('rio com exit: o rabo que foge para outra borda vira reto ate a borda pedida', () => {
    const rio = { points: [[0, 300], [500, 600], [700, 650], [740, 800], [760, 1000]], width: 2 };
    const sem = planToMap({ rivers: [rio] }, { cols: 60, rows: 40 }).map.layers.ground;
    const com = planToMap({ rivers: [{ ...rio, exit: 'leste' }] }, { cols: 60, rows: 40 }).map.layers.ground;
    expect(sem[39]).toContain('0');
    expect(com[39]).not.toContain('0');
    expect(com.some((row) => row[59] === '0')).toBe(true);
  });

  it('tenda usa projeto de tenda de verdade (nao cai em casa)', () => {
    for (const size of ['pequena', 'media', 'grande']) expect(pickDesign({ type: 'tenda', size }).id).toMatch(/^(tenda|barraca-acampamento)-/);
  });

  it('modo texto: paliçada vazia ganha casas; sem modo texto (foto) fica como esta', () => {
    const base = { areas: [{ type: 'praca', circle: [500, 500, 50] }], fences: [{ type: 'palicada', points: [[250, 250], [750, 250], [750, 750], [250, 750], [250, 250]] }], buildings: [{ type: 'taverna', x: 600, y: 500 }] };
    const foto = planToMap(base, { cols: 80, rows: 60 });
    const texto = planToMap({ ...base, mode: 'texto' }, { cols: 80, rows: 60 });
    expect(foto.map.buildings.length).toBe(1);
    expect(texto.map.buildings.length).toBeGreaterThan(8);
  });
  it('exit na borda de onde o rio ja vem nao corta o rio (riacho que desce do norte ate o lago)', () => {
    const r = planToMap({ rivers: [{ points: [[800, 0], [820, 500], [815, 860]], width: 2, exit: 'norte' }] }, { cols: 60, rows: 40 });
    expect(r.map.layers.ground[33]).toContain('0');
  });

  it('cols/rows do plano (foto) definem o tamanho, ate 300', () => {
    const r = planToMap({ cols: 66, rows: 46, buildings: [{ type: 'casa', x: 500, y: 500 }] }, { cols: 200, rows: 182 });
    expect([r.map.cols, r.map.rows]).toEqual([66, 46]);
    expect(planToMap({ cols: 5000, rows: 900 }, { cols: 60, rows: 40 }).map.cols).toBe(300);
  });
});
