import { describe, it, expect } from 'vitest';
import { SPELLS, SCHOOLS, SPELL_BY_ID, TIERS } from './catalog.js';
import { RECIPES, parseRecipe, recipeFor } from './recipes.js';
import { createSpellEffect, renderSpell } from './engine.js';
import { findSpell, matchSpellName, spellForOptions } from './match.js';
import { PRIMS } from './prims.js';
import { SPRITES, SYMBOLS } from './sprites.js';
import { createFakeContext } from '../fakeCanvas.js';
import { createPlayer } from '../player.js';
import { fxFromRoll, fxFromHit } from '../sync.js';
import { ELEMENT_KEYS, ELEMENTS } from '../elements.js';

const A = { x: 100, y: 120 };
const B = { x: 340, y: 120 };

function frames(id, opts = {}, n = 20) {
  const e = createSpellEffect({ spell: id, unit: 4, cell: 64, from: A, to: B, seed: 'teste', ...opts });
  const ctx = createFakeContext(0, 0);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = (e.T.total * i) / n;
    ctx.calls.length = 0;
    const fr = renderSpell(ctx, e, t);
    out.push({ t, fr, calls: ctx.calls.slice() });
  }
  return { e, out };
}

describe('catalogo do grimorio', () => {
  it('tem 400+ magias, ids e nomes unicos', () => {
    expect(SPELLS.length).toBeGreaterThanOrEqual(400);
    expect(new Set(SPELLS.map((s) => s.id)).size).toBe(SPELLS.length);
    expect(new Set(SPELLS.map((s) => s.name.toLowerCase())).size).toBe(SPELLS.length);
  });
  it('cada escola vai da basica a lendaria', () => {
    expect(SCHOOLS.length).toBeGreaterThanOrEqual(30);
    for (const sc of SCHOOLS) {
      const tiers = new Set(SPELLS.filter((s) => s.school === sc.id).map((s) => s.tier));
      expect([...tiers].sort()).toEqual(TIERS.map((t) => t.id));
    }
  });
  it('todo campo de texto esta preenchido', () => {
    for (const s of SPELLS) {
      expect(s.name && s.desc && s.target && s.range && s.element).toBeTruthy();
      expect(s.desc.length).toBeGreaterThan(15);
    }
  });
});

describe('receitas', () => {
  it('toda magia tem receita propria, unica e valida', () => {
    for (const s of SPELLS) expect(RECIPES[s.id], s.id).toBeTruthy();
    for (const id of Object.keys(RECIPES)) expect(SPELL_BY_ID[id], id).toBeTruthy();
    const srcs = SPELLS.map((s) => recipeFor(s));
    expect(new Set(srcs).size).toBe(SPELLS.length);
    for (const src of srcs) {
      const r = parseRecipe(src);
      expect(r.steps.length).toBeGreaterThan(0);
      for (const st of r.steps) expect(PRIMS[st.prim]).toBeTruthy();
    }
  });
  it('sprites e simbolos tem linhas do mesmo tamanho', () => {
    for (const [k, v] of Object.entries(SPRITES)) for (const r of v.rows) expect(r.length, k).toBe(v.rows[0].length);
    for (const [k, v] of Object.entries(SYMBOLS)) for (const r of v) expect(r.length, k).toBe(v[0].length);
  });
});

describe('animacao de cada magia', () => {
  it('renderiza todas as magias em todos os resultados sem erro', () => {
    for (const s of SPELLS) {
      for (const result of ['hit', 'crit', 'miss', 'fumble', 'downed']) {
        const { e, out } = frames(s.id, { result }, 12);
        expect(e.T.total).toBeGreaterThan(0);
        const drawn = out.reduce((n, f) => n + f.calls.length, 0);
        expect(drawn, `${s.id}/${result}`).toBeGreaterThan(0);
        expect(out[out.length - 1].fr.done).toBe(true);
      }
    }
  });
  it('e deterministica pela semente (rollId)', () => {
    for (const id of ['chuva-de-meteoros', 'relampago-em-cadeia', 'enxame-de-insetos', 'tempestade-do-caos']) {
      const a = frames(id, { seed: 'r-42' }).out.map((f) => f.calls);
      const b = frames(id, { seed: 'r-42' }).out.map((f) => f.calls);
      const c = frames(id, { seed: 'r-43' }).out.map((f) => f.calls);
      expect(a).toEqual(b);
      expect(c).not.toEqual(a);
    }
  });
  it('lendaria dura mais e treme mais que basica', () => {
    const basic = frames('fagulha');
    const legend = frames('meteoro');
    expect(legend.e.T.total).toBeGreaterThan(basic.e.T.total * 1.5);
    const maxShake = (f) => Math.max(...f.out.map((x) => Math.abs(x.fr.shake.x) + Math.abs(x.fr.shake.y)));
    expect(maxShake(legend)).toBeGreaterThan(maxShake(basic));
  });
  it('elemento explicito troca a cor', () => {
    const colors = (el) => new Set(frames('bola-de-fogo', { element: el }).out.flatMap((f) => f.calls.map((c) => c[5])));
    const nix = colors('Nix');
    expect([...nix]).toEqual(expect.arrayContaining([ELEMENTS.nix.ramp[3]]));
    expect(nix.has(ELEMENTS.tartaro.ramp[3])).toBe(false);
    for (const k of ELEMENT_KEYS) expect(colors(ELEMENTS[k].name).size).toBeGreaterThan(2);
  });
  it('erro desvia, falha volta no conjurador, caido afunda', () => {
    const miss = frames('lanca-de-gelo', { result: 'miss' });
    expect(miss.e.hit.y).not.toBe(miss.e.to.y);
    expect(miss.out.every((f) => f.fr.target.flash < 1)).toBe(true);
    const fumble = frames('bola-de-fogo', { result: 'fumble' });
    expect(fumble.e.steps.some((s) => s.prim === 'backfire')).toBe(true);
    const down = frames('dardo-sombrio', { result: 'downed' });
    expect(down.out[down.out.length - 2].fr.target.y).toBeGreaterThan(0);
  });
  it('cura nao empurra nem pisca branco no alvo', () => {
    const { out } = frames('cura');
    expect(out.every((f) => f.fr.target.flash < 1 && f.fr.target.x === 0)).toBe(true);
  });
  it('prefers-reduced-motion: so um clarao curto', () => {
    const { e, out } = frames('chuva-de-meteoros', { reduced: true });
    expect(e.T.total).toBeLessThanOrEqual(300);
    expect(out.every((f) => f.fr.shake.x === 0 && f.fr.shake.y === 0)).toBe(true);
  });
  it('teleporte leva o conjurador ate perto do alvo', () => {
    const { out } = frames('teleporte');
    expect(out[out.length - 2].fr.attacker.x).toBeGreaterThan(100);
  });
});

describe('ligacao poder -> magia', () => {
  it('casa pelo nome sem acento nem maiuscula', () => {
    expect(matchSpellName('BOLA DE FOGO').id).toBe('bola-de-fogo');
    expect(matchSpellName('Relampago em cadeia').id).toBe('relampago-em-cadeia');
    expect(matchSpellName('Palavra de Poder: Atordoar').id).toBe('palavra-de-poder-atordoar');
    expect(matchSpellName('Magia: Meteoro').id).toBe('meteoro');
  });
  it('casa por sinonimo e por nome que contem a magia', () => {
    expect(matchSpellName('Fireball').id).toBe('bola-de-fogo');
    expect(matchSpellName('Animar Mortos').id).toBe('erguer-mortos');
    expect(matchSpellName('Bola de Fogo Maior').id).toBe('bola-de-fogo');
    expect(matchSpellName('Grande Chuva de Meteoros').id).toBe('chuva-de-meteoros');
  });
  it('vinculo explicito vence o nome; desconhecido cai no classificador', () => {
    expect(findSpell({ name: 'Golpe do Cometa', animation: { spell: 'meteoro' } }).id).toBe('meteoro');
    expect(findSpell({ name: 'Golpe do Cometa', animation: 'magia:estrela-cadente' }).id).toBe('estrela-cadente');
    expect(findSpell({ name: 'Bola de Fogo', animation: 'raio' })).toBeNull();
    expect(findSpell({ name: 'Rajada', type: 'poder' })).toBeNull();
    expect(findSpell({ name: 'Golpe Guardião' })).toBeNull();
    expect(spellForOptions({ kind: 'corte', power: { name: 'Bola de Fogo' } })).toBeNull();
  });
  it('o player toca a magia do grimorio para um poder com o nome dela', () => {
    const hits = [];
    const player = createPlayer({ unit: 4, cell: 64, onImpact: (i) => hits.push(i) });
    player.play({ power: { name: 'Bola de Fogo', type: 'magia' }, from: A, to: B, seed: 's1', fromId: 'a', toId: 'b' }, 0);
    const ctx = createFakeContext(0, 0);
    let drawn = 0;
    for (let t = 0; t < 4000; t += 33) { ctx.calls.length = 0; player.step(ctx, t); drawn += ctx.calls.length; }
    expect(drawn).toBeGreaterThan(0);
    expect(hits[0]).toMatchObject({ family: 'grimorio', element: 'Tártaro' });
    expect(player.size).toBe(0);
  });
  it('roll + token:hit sincronizam a magia (mesmo rollId)', () => {
    const tokens = [
      { id: 't1', kind: 'character', character_id: 'c1', x: 0, y: 0, size: 1 },
      { id: 't2', kind: 'monster', x: 280, y: 0, size: 1 }
    ];
    const roll = { kind: 'attack', rollId: 'm1', characterId: 'c1', targetTokenId: 't2', powerName: 'Lança de Gelo', dice: [{ sides: 20, value: 12 }] };
    const atk = fxFromRoll(roll, { tokens, cell: 70 });
    const hits = [];
    const player = createPlayer({ unit: 4, cell: 70, onImpact: (i) => hits.push(i) });
    player.attack(atk, 0);
    player.impact(fxFromHit({ tokenId: 't2', outcome: 'hit', rollId: 'm1' }, { tokens, cell: 70, attack: atk }), 40);
    const ctx = createFakeContext(0, 0);
    for (let t = 0; t < 4000; t += 33) player.step(ctx, t);
    expect(hits).toHaveLength(1);
    expect(hits[0].family).toBe('grimorio');
  });
});

// ---- pendencias: transparencia dos tokens e palco que cabe magia alta ----
import { tokenFxStyle } from '../sync.js';
import { spellBounds, fitStage } from './bounds.js';

describe('alpha dos tokens (invisibilidade, teleporte)', () => {
  it('tokenFxStyle traduz alpha em filter: opacity() e limpa no fim', () => {
    expect(tokenFxStyle(null)).toEqual({ translate: '', filter: '' });
    expect(tokenFxStyle({ x: 0, y: 0, flash: 0, alpha: 1 })).toEqual({ translate: '', filter: '' });
    expect(tokenFxStyle({ x: 4, y: -2, flash: 0, alpha: 0.3 })).toEqual({ translate: '4px -2px', filter: 'opacity(0.3)' });
    expect(tokenFxStyle({ x: 0, y: 0, flash: 1, alpha: 0 }).filter).toBe('brightness(3) saturate(0) opacity(0)');
  });
  it('invisibilidade some com o conjurador e devolve no fim (player -> onFrame)', () => {
    const player = createPlayer({ unit: 4, cell: 64 });
    const ctx = createFakeContext(0, 0, { record: false });
    player.play({ spell: 'invisibilidade', from: A, to: B, fromId: 'c1', toId: 't1', seed: 'inv' }, 0);
    let min = 1;
    let last = null;
    for (let t = 0; t < 6000; t += 16) {
      const fr = player.step(ctx, t);
      if (fr.tokens.c1) min = Math.min(min, fr.tokens.c1.alpha);
      if (!fr.active) { last = fr; break; }
      last = fr;
    }
    expect(min).toBeLessThan(0.2);
    expect(last.active).toBe(false);
    expect(tokenFxStyle(last.tokens.c1).filter).toBe('');
  });
  it('teleporte reaparece esmaecido e termina solido', () => {
    const { out } = frames('teleporte', {}, 60);
    const alphas = out.map((f) => f.fr.attacker.alpha);
    expect(Math.min(...alphas)).toBeLessThan(0.5);
    expect(alphas[alphas.length - 1]).toBe(1);
  });
});

describe('palco do grimorio cabe magia alta', () => {
  const CELL = 48;
  const U = 3;
  const W = CELL * 7;
  const H = CELL * 3;
  const FROM = { x: 1.5 * CELL, y: 1.7 * CELL };
  const TO = { x: 5.5 * CELL, y: 1.7 * CELL };
  const fitOf = (id) => {
    const b = spellBounds({ spell: id, unit: U, cell: CELL, from: FROM, to: TO, seed: 'palco' });
    return { b, fit: fitStage(W, H, b) };
  };
  it('magia baixa nao mexe no palco', () => {
    expect(fitOf('fagulha').fit).toMatchObject({ f: 1, g: 1 });
  });
  it('colunas, olho gigante, dragao e meteoro cabem no mundo virtual', () => {
    for (const id of ['sol-nascente', 'milagre', 'chamado-ao-primordial', 'olho-de-ananque', 'invocar-dragao-ancestral', 'chuva-de-meteoros']) {
      const { b, fit } = fitOf(id);
      expect(fit.g * fit.f, id).toBeGreaterThan(1);
      // a caixa medida, deslocada para dentro do mundo virtual, comeca abaixo do topo
      expect(b.y0 + fit.oy, id).toBeGreaterThanOrEqual(0);
      expect(fit.g).toBeLessThanOrEqual(2);
      expect(fit.f).toBeLessThanOrEqual(2.5);
    }
  });
  it('clima e raio do ceu nao esticam o palco', () => {
    expect(fitOf('relampago').fit.f).toBe(1);
  });
});
