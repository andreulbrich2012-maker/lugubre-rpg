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
});
