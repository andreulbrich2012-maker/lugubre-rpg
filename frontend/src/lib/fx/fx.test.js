import { describe, it, expect } from 'vitest';
import { classify } from './classify.js';
import { FAMILIES, familiesOf } from './families.js';
import { ELEMENT_KEYS, ELEMENTS } from './elements.js';
import { createEffect, buildTimeline, animTime, HITSTOP_MS } from './effect.js';
import { renderEffect } from './render.js';
import { createPlayer } from './player.js';
import { fxFromRoll, fxFromHit, rollResult } from './sync.js';
import { createFakeContext } from './fakeCanvas.js';
import { normalize } from './text.js';

const A = { x: 100, y: 100 };
const B = { x: 300, y: 140 };

function framesOf(opts, n = 24) {
  const eff = createEffect({ unit: 4, cell: 64, from: A, to: B, ...opts });
  const ctx = createFakeContext(0, 0);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = (eff.T.total * i) / n;
    ctx.calls.length = 0;
    const fr = renderEffect(ctx, eff, t);
    out.push({ t, fr, calls: ctx.calls.slice() });
  }
  return { eff, out };
}

describe('classify', () => {
  it('Raio Sombrio -> magia / raio / Érebo', () => {
    const c = classify({ name: 'Raio Sombrio', type: 'magia', element: 'Érebo', description: 'Um raio de energia sombria atinge o alvo.', range: 'Médio' });
    expect(c).toMatchObject({ group: 'magia', family: 'raio', element: 'Érebo' });
  });
  it('Bênção de Éter -> bênção (com ou sem acento)', () => {
    expect(classify({ name: 'Bênção de Éter', type: 'magia' }).family).toBe('bencao');
    expect(classify({ name: 'Benção de Éter', type: 'magia', element: 'Éter', description: 'Luz celestial fecha feridas.' })).toMatchObject({ family: 'bencao', element: 'Éter', form: 'suporte' });
    expect(classify({ name: 'BENCAO DE ETER', type: 'magia' })).toMatchObject({ family: 'bencao', element: 'Éter' });
  });
  it('Golpe Guardião -> escudo / defesa', () => {
    const c = classify({ name: 'Golpe Guardião', type: 'poder', element: null, description: 'Uma técnica defensiva que transforma bloqueio em contra-ataque.', range: 'Corpo a corpo', requirement: 'Escudo equipado' });
    expect(c).toMatchObject({ family: 'escudo', form: 'defesa', group: 'corpo' });
  });
  it('Vinhas de Gaia -> terreno / controle', () => {
    expect(classify({ name: 'Vinhas de Gaia', type: 'magia' })).toMatchObject({ family: 'terreno', form: 'controle', element: 'Gaia' });
  });
  it('Abraço do Vazio -> maldição', () => {
    expect(classify({ name: 'Abraço do Vazio', type: 'magia' }).family).toBe('maldicao');
  });
  it('"Ataque: Arco longo" -> flecha', () => {
    expect(classify('Ataque: Arco longo')).toMatchObject({ family: 'flecha', group: 'distancia' });
  });
  it('monstro "Mordida" -> mordida', () => {
    expect(classify({ name: 'Mordida' }, { monster: true })).toMatchObject({ family: 'mordida', group: 'monstro' });
    expect(classify({ name: 'Explosão de Cinzas', description: 'Onda breve de calor e fuligem.', monster: true })).toMatchObject({ family: 'sopro', element: 'Tártaro' });
  });
  it('armas e magias novas caem em alguma familia', () => {
    expect(classify({ name: 'Espada longa' }).family).toBe('corte');
    expect(classify({ name: 'Machado grande' }).family).toBe('montante');
    expect(classify({ name: 'Besta pesada' }).family).toBe('virote');
    expect(classify({ name: 'Lança' }).family).toBe('haste');
    expect(classify({ name: 'Funda' }).family).toBe('funda');
    expect(classify({ name: 'Azagaia' }).family).toBe('arremesso');
    expect(classify({ name: 'Bola de Fogo', type: 'magia' })).toMatchObject({ family: 'area', element: 'Tártaro' });
    expect(classify({ name: 'Passo Sombrio', type: 'magia' }).family).toBe('movimento');
    expect(classify({ name: 'Algo Estranho', type: 'magia', range: 'Toque' }).family).toBe('toque');
    expect(classify({ name: 'Coisa sem nome' }).family).toBe('corte');
  });
  it('campo animation sobrepoe a classificacao', () => {
    expect(classify({ name: 'Espada longa', animation: 'raio', element: 'Nix' })).toMatchObject({ family: 'raio', element: 'Nix' });
    expect(classify({ name: 'Espada', animation: { family: 'garra', element: 'Caos' } })).toMatchObject({ family: 'garra', element: 'Caos' });
  });
  it('normaliza acentos', () => {
    expect(normalize('Ênfase ÇÃO!')).toBe('enfase cao');
  });
});

describe('catalogo', () => {
  it('tem 12 corpo a corpo, 4 distancia, 9 formas de magia, 7 de monstro e 9 elementos', () => {
    expect(familiesOf('corpo')).toHaveLength(12);
    expect(familiesOf('distancia')).toHaveLength(4);
    expect(familiesOf('magia')).toHaveLength(9);
    expect(familiesOf('monstro')).toHaveLength(7);
    expect(ELEMENT_KEYS).toHaveLength(9);
    for (const k of ELEMENT_KEYS) expect(ELEMENTS[k].ramp).toHaveLength(5);
  });
});

describe('linha do tempo', () => {
  it('tem as quatro fases e hit-stop de ~60 ms no acerto', () => {
    const eff = createEffect({ family: 'corte', from: A, to: B, result: 'hit', seed: 'x' });
    expect(eff.T.hitstop).toBe(HITSTOP_MS);
    expect(eff.T.windup).toBeGreaterThan(0);
    expect(eff.T.impactAt).toBe(eff.T.windup + eff.T.action);
    // relogio congelado durante o hit-stop
    expect(animTime(eff, eff.T.impactAt + 30)).toBe(eff.T.impactAt);
    expect(animTime(eff, eff.T.impactAt + HITSTOP_MS + 10)).toBe(eff.T.impactAt + 10);
  });
  it('erro nao tem hit-stop nem tremor; critico e maior', () => {
    const fam = FAMILIES.find((f) => f.id === 'corte');
    expect(buildTimeline(fam, { result: 'miss', dist: 50, cell: 16 }).hitstop).toBe(0);
    const crit = buildTimeline(fam, { result: 'crit', dist: 50, cell: 16 });
    const hit = buildTimeline(fam, { result: 'hit', dist: 50, cell: 16 });
    expect(crit.hitstop).toBeGreaterThan(hit.hitstop);
    expect(crit.total).toBeGreaterThan(hit.total);
    const { out } = framesOf({ family: 'corte', result: 'miss', seed: 'm' });
    expect(out.every((f) => f.fr.shake.x === 0 && f.fr.shake.y === 0)).toBe(true);
  });
  it('movimento reduzido vira um clarao curto', () => {
    const eff = createEffect({ family: 'area', from: A, to: B, reduced: true });
    expect(eff.T.total).toBeLessThanOrEqual(300);
    expect(eff.particles).toHaveLength(0);
  });
});

describe('determinismo', () => {
  it('mesma semente => mesmas particulas e mesmos quadros', () => {
    const a = framesOf({ family: 'projetil', element: 'Caos', result: 'crit', seed: 'roll-123' });
    const b = framesOf({ family: 'projetil', element: 'Caos', result: 'crit', seed: 'roll-123' });
    expect(a.eff.particles).toEqual(b.eff.particles);
    expect(a.out.map((f) => f.calls)).toEqual(b.out.map((f) => f.calls));
  });
  it('semente diferente => particulas diferentes', () => {
    const a = createEffect({ family: 'area', element: 'Tártaro', from: A, to: B, seed: 'r1' });
    const b = createEffect({ family: 'area', element: 'Tártaro', from: A, to: B, seed: 'r2' });
    expect(a.particles).not.toEqual(b.particles);
  });
});

describe('render', () => {
  const results = ['hit', 'crit', 'miss', 'fumble', 'downed'];
  for (const fam of FAMILIES) {
    it(`${fam.id}: todos os resultados desenham sem erro`, () => {
      for (const result of results) {
        const element = fam.group === 'magia' ? 'Nix' : null;
        const { out } = framesOf({ family: fam.id, element, result, seed: `${fam.id}-${result}` });
        const drawn = out.reduce((n, f) => n + f.calls.length, 0);
        expect(drawn).toBeGreaterThan(0);
        expect(out[out.length - 1].fr.done).toBe(true);
      }
    });
  }
  it('cada elemento desenha', () => {
    for (const k of ELEMENT_KEYS) {
      const { out } = framesOf({ family: 'raio', element: ELEMENTS[k].name, seed: k });
      expect(out.some((f) => f.calls.length > 0)).toBe(true);
    }
  });
  it('rasteriza no buffer falso', () => {
    const eff = createEffect({ family: 'corte', unit: 1, cell: 16, from: { x: 10, y: 20 }, to: { x: 50, y: 20 }, seed: 's' });
    const ctx = createFakeContext(64, 40);
    renderEffect(ctx, eff, eff.T.impactAt + 5);
    expect(ctx.pixels.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  });
});

describe('player e sincronizacao', () => {
  const tokens = [
    { id: 't1', kind: 'character', character_id: 'c1', x: 0, y: 0, size: 1 },
    { id: 't2', kind: 'monster', x: 210, y: 0, size: 1 }
  ];
  it('roll + token:hit tocam ataque e impacto alinhados no contato', () => {
    const impacts = [];
    const player = createPlayer({ unit: 70 / 16, cell: 70, onImpact: (i) => impacts.push(i) });
    const roll = { rollId: 'r9', kind: 'attack', characterId: 'c1', targetTokenId: 't2', powerName: 'Arco longo', dice: [{ sides: 20, value: 14 }] };
    const atk = fxFromRoll(roll, { tokens, cell: 70 });
    expect(atk).toMatchObject({ seed: 'r9', fromId: 't1', toId: 't2', result: 'hit', phase: 'attack' });
    player.attack(atk, 0);
    const imp = fxFromHit({ tokenId: 't2', outcome: 'hit', down: true, rollId: 'r9' }, { tokens, cell: 70, attack: atk });
    expect(imp).toMatchObject({ result: 'hit', down: true, seed: 'r9' });
    player.impact(imp, 50);
    const ctx = createFakeContext(0, 0, { record: false });
    let frame;
    for (let t = 0; t < 2500; t += 16) frame = player.step(ctx, t);
    expect(impacts).toHaveLength(1);
    expect(impacts[0]).toMatchObject({ toId: 't2', result: 'hit', down: true, family: 'flecha' });
    expect(frame.active).toBe(false);
  });
  it('1 natural toca a falha inteira e o token:hit nao repete', () => {
    const roll = { rollId: 'r1', kind: 'attack', characterId: 'c1', targetTokenId: 't2', powerName: 'Espada', dice: [{ sides: 20, value: 1 }] };
    expect(rollResult(roll)).toBe('fumble');
    const atk = fxFromRoll(roll, { tokens, cell: 70 });
    expect(atk.phase).toBe('full');
    expect(fxFromHit({ tokenId: 't2', outcome: 'miss', rollId: 'r1' }, { tokens, attack: atk })).toBeNull();
  });
  it('rolagem que nao e ataque nao anima', () => {
    expect(fxFromRoll({ kind: 'damage', targetTokenId: 't2' }, { tokens })).toBeNull();
  });
});
