import { describe, it, expect } from 'vitest';
import { planToMap, isPlan, pickDesign } from './mapPlan.js';
import { PLAN_EXAMPLE, buildPlanPrompt } from './planPrompt.js';
import { parseMapResponse } from './aiPrompt.js';
import { validateMap } from './format.js';

describe('plano de mapa', () => {
  it('o exemplo do prompt vira um mapa valido com construcoes, pontos e cerca', () => {
    const r = planToMap(PLAN_EXAMPLE, { cols: 100, rows: 80 });
    expect(validateMap(r.map).ok).toBe(true);
    expect(r.map.buildings.length).toBeGreaterThanOrEqual(8);
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

  it('composicao organica: mesmo plano e semente dao o mesmo mapa (deterministico)', () => {
    const plan = { mode: 'texto', areas: [{ type: 'floresta', rect: [0, 0, 1000, 1000] }, { type: 'campo', rect: [100, 100, 800, 800] }, { type: 'bairro', density: 1.5, size: 'pequena', rect: [150, 150, 700, 700] }, { type: 'praca', circle: [500, 500, 60] }, { type: 'lago', circle: [850, 850, 80] }],
      roads: [{ type: 'terra', points: [[150, 350], [850, 350]] }, { type: 'terra', points: [[150, 650], [850, 650]] }, { type: 'estrada', points: [[0, 500], [1000, 500]] }] };
    const a = planToMap(plan, { cols: 90, rows: 80, seed: 7 }).map;
    const b = planToMap(plan, { cols: 90, rows: 80, seed: 7 }).map;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(planToMap(plan, { cols: 90, rows: 80, seed: 8 }).map)).not.toBe(JSON.stringify(a));
  });

  it('bairro com ruas: casas nao se sobrepoem, nao pisam na rua e a maioria fica de frente para ela', () => {
    const plan = { mode: 'texto', areas: [{ type: 'bairro', density: 1.5, size: 'pequena', rect: [50, 50, 900, 900] }],
      roads: [{ type: 'terra', points: [[0, 330], [1000, 330]] }, { type: 'terra', points: [[0, 660], [1000, 660]] }, { type: 'terra', points: [[500, 0], [500, 1000]] }] };
    const { map } = planToMap(plan, { cols: 100, rows: 90, seed: 3 });
    const bs = map.buildings;
    expect(bs.length).toBeGreaterThan(25);
    for (const a of bs) for (const b of bs) if (a !== b) expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y).toBe(true);
    // ninguem em cima de rua: o chao embaixo das casas nunca e a terra da rua sem ser a casa
    const facingStreet = bs.filter((b) => {
      const f = b.facing || 'sul';
      const probe = f === 'sul' ? [[b.x + (b.w >> 1), b.y + b.h], [b.x + (b.w >> 1), b.y + b.h + 1], [b.x + (b.w >> 1), b.y + b.h + 2]] : f === 'norte' ? [[b.x + (b.w >> 1), b.y - 1], [b.x + (b.w >> 1), b.y - 3], [b.x + (b.w >> 1), b.y - 4]] : f === 'leste' ? [[b.x + b.w, b.y + (b.h >> 1)], [b.x + b.w + 1, b.y + (b.h >> 1)], [b.x + b.w + 2, b.y + (b.h >> 1)]] : [[b.x - 1, b.y + (b.h >> 1)], [b.x - 2, b.y + (b.h >> 1)], [b.x - 3, b.y + (b.h >> 1)]];
      return probe.some(([x, y]) => map.layers.ground[y]?.[x] === ',');
    });
    expect(facingStreet.length / bs.length).toBeGreaterThan(0.5);
    // vizinhas nao repetem o mesmo projeto lado a lado
    let same = 0;
    for (const a of bs) for (const b of bs) if (a !== b && a.design === b.design && Math.abs(a.y - b.y) <= 1 && Math.abs(a.x + a.w - b.x) <= 2) same++;
    expect(same / bs.length).toBeLessThan(0.15);
  });

  it('rua segue os pontos: reta fica reta; so curva quando o plano pede (curva: true)', () => {
    const linha = (road) => {
      const { map } = planToMap({ mode: 'texto', roads: [road] }, { cols: 100, rows: 60, seed: 5 });
      const rows = [];
      for (let x = 0; x < 100; x++) rows.push(map.layers.ground.findIndex((r) => r[x] === ','));
      return rows;
    };
    const reta = linha({ type: 'terra', width: 1, points: [[0, 500], [1000, 500]] });
    expect(Math.max(...reta.map((y) => Math.abs(y - 29.5)))).toBeLessThanOrEqual(1);
    const torta = linha({ type: 'terra', width: 1, curva: true, points: [[0, 500], [1000, 500]] });
    expect(torta[0]).toBeGreaterThanOrEqual(29); expect(torta[0]).toBeLessThanOrEqual(30);
    expect(torta[99]).toBeGreaterThanOrEqual(29); expect(torta[99]).toBeLessThanOrEqual(30);
    expect(Math.max(...torta.map((y) => Math.abs(y - 29.5)))).toBeGreaterThanOrEqual(2);
  });

  it('bairro grande sem rua ganha viela por dentro', () => {
    const { map } = planToMap({ areas: [{ type: 'bairro', rect: [200, 200, 600, 600] }] }, { cols: 80, rows: 80, seed: 2 });
    expect(map.layers.ground.slice(18, 62).join('')).toContain(',');
  });

  it('mapa grande (1000x1000) continua rapido', () => {
    const plan = { mode: 'texto', areas: [{ type: 'floresta', rect: [0, 0, 1000, 1000] }, { type: 'campo', rect: [100, 100, 800, 800] }, { type: 'bairro', density: 1.2, rect: [200, 200, 600, 600] }, { type: 'mar', rect: [900, 0, 100, 1000] }],
      roads: [{ type: 'terra', points: [[200, 500], [800, 500]] }, { type: 'estrada', points: [[0, 400], [900, 400]] }] };
    const t = performance.now();
    const r = planToMap(plan, { cols: 1000, rows: 1000 });
    expect(r.map.buildings.length).toBeGreaterThan(100);
    expect(performance.now() - t).toBeLessThan(15000);
  });
  it('terra do mapa quase todo e fundo: campo da cidade fica verde e o muro nao abre no chao de terra', () => {
    const r = planToMap({ areas: [{ type: 'terra', rect: [0, 0, 800, 1000] }, { type: 'campo', rect: [200, 200, 400, 600] }], fences: [{ type: 'muro', points: [[150, 150], [650, 150], [650, 850], [150, 850], [150, 150]] }] }, { cols: 80, rows: 60 });
    const g = r.map.layers.ground;
    expect(g[30].slice(30, 40)).not.toMatch(/,/);
    const top = g[Math.round(0.15 * 59)].slice(Math.round(0.2 * 79), Math.round(0.6 * 79));
    expect(top).toMatch(/^ç+$/);
  });
});
