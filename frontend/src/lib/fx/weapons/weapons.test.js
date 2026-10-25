import { describe, it, expect } from 'vitest';
import { WEAPON_FAMILIES, WEAPONS, WEAPON_OF } from './catalog.js';
import { movesOf, pickMove, weaponInfo, autoPool } from './select.js';
import { hasHeld, rotatedWeapon } from './sprite.js';
import { WEAPON_LIST } from '../../icons/weapons.js';
import { classify } from '../classify.js';
import { createEffect } from '../effect.js';
import { renderEffect } from '../render.js';
import { createPlayer } from '../player.js';
import { fxFromRoll, fxFromHit } from '../sync.js';
import { createFakeContext } from '../fakeCanvas.js';

const A = { x: 100, y: 100 };
const B = { x: 230, y: 120 };

function run(opts, n = 18) {
  const eff = createEffect({ unit: 4, cell: 64, from: A, to: B, ...opts });
  const ctx = createFakeContext(0, 0);
  const frames = [];
  for (let i = 0; i <= n; i++) {
    const t = (eff.T.total * i) / n;
    ctx.calls.length = 0;
    const fr = renderEffect(ctx, eff, t);
    frames.push({ fr, calls: ctx.calls.slice() });
  }
  return { eff, frames };
}

describe('catalogo de golpes', () => {
  it('toda familia de movimento tem de 15 a 25 golpes base, com ids unicos', () => {
    for (const f of WEAPON_FAMILIES) {
      expect(f.moves.length, f.id).toBeGreaterThanOrEqual(15);
      expect(f.moves.length, f.id).toBeLessThanOrEqual(25);
      expect(new Set(f.moves.map((m) => m.id)).size).toBe(f.moves.length);
      for (const m of f.moves) {
        expect(m.name && m.desc && m.tipo, `${f.id}/${m.id}`).toBeTruthy();
        expect(m.segs.length).toBeGreaterThan(0);
      }
    }
  });
  it('as 29 armas do jogo estao no catalogo, com sprite da mao e 15+ golpes', () => {
    for (const w of WEAPON_LIST) {
      expect(WEAPON_OF[w.id], w.id).toBeTruthy();
      expect(hasHeld(WEAPON_OF[w.id].held), w.id).toBe(true);
      const list = movesOf(w.id);
      expect(list.length, w.id).toBeGreaterThanOrEqual(15);
      expect(new Set(list.map((m) => m.id)).size, w.id).toBe(list.length);
    }
    for (const w of WEAPONS) expect(hasHeld(w.held), w.id).toBe(true);
  });
  it('o sprite girado tem contorno e pixels', () => {
    const px = rotatedWeapon('espada-longa', 0.7);
    expect(px.length).toBeGreaterThan(20);
  });
});

describe('render dos golpes', () => {
  const results = ['hit', 'crit', 'miss', 'fumble', 'downed'];
  for (const w of WEAPONS) {
    it(`${w.id}: todos os golpes e resultados desenham e terminam`, () => {
      for (const m of movesOf(w.id)) {
        for (const result of results) {
          const { eff, frames } = run({ weapon: w.id, move: m.id, result, seed: `${w.id}-${m.id}-${result}` }, 10);
          expect(eff.mv?.move.id).toBe(m.id);
          expect(frames.reduce((n, f) => n + f.calls.length, 0), `${w.id}/${m.id}/${result}`).toBeGreaterThan(0);
          expect(frames[frames.length - 1].fr.done).toBe(true);
          expect(eff.T.total).toBeLessThan(2600);
        }
      }
    });
  }
  it('elemento pinta o golpe e golpe elemental tem cor padrao', () => {
    const fis = createEffect({ weapon: 'espada-longa', move: 'corte-horizontal', from: A, to: B, seed: 's' });
    const nix = createEffect({ weapon: 'espada-longa', move: 'corte-horizontal', element: 'Nix', from: A, to: B, seed: 's' });
    expect(fis.elKey).toBe('fisico');
    expect(nix.elKey).toBe('nix');
    expect(createEffect({ weapon: 'espada-longa', move: 'lamina-de-tartaro', from: A, to: B, seed: 's' }).elKey).toBe('tartaro');
  });
});

describe('determinismo', () => {
  it('mesma semente => mesmo golpe, mesmas particulas e mesmos quadros', () => {
    const a = run({ power: { name: 'Machado de guerra' }, result: 'crit', seed: 'roll-77' });
    const b = run({ power: { name: 'Machado de guerra' }, result: 'crit', seed: 'roll-77' });
    expect(a.eff.mv.move.id).toBe(b.eff.mv.move.id);
    expect(a.eff.particles).toEqual(b.eff.particles);
    expect(a.eff.action).toEqual(b.eff.action);
    expect(a.frames.map((f) => f.calls)).toEqual(b.frames.map((f) => f.calls));
  });
  it('sem golpe nomeado, o rollId sorteia golpes variados (sem montaria/dupla)', () => {
    const seen = new Set();
    for (let i = 0; i < 40; i++) {
      const eff = createEffect({ power: { name: 'Espada longa' }, from: A, to: B, seed: `r${i}` });
      expect(eff.mv.move.tags || []).not.toContain('montaria');
      expect(eff.mv.move.tags || []).not.toContain('dupla');
      seen.add(eff.mv.move.id);
    }
    expect(seen.size).toBeGreaterThanOrEqual(10);
    const list = movesOf('espada-longa');
    expect(pickMove(list, 'abc')).toBe(pickMove(list, 'abc'));
    expect(autoPool(movesOf('arco-longo'), { cells: 6, ranged: true }).every((m) => !(m.body && m.body.go >= 0.7))).toBe(true);
  });
});

describe('classificacao por palavras', () => {
  it('nome escolhe o golpe', () => {
    expect(classify({ name: 'Golpe giratório' })).toMatchObject({ family: 'giratorio', weaponFamily: 'leves', move: 'giro' });
    expect(classify({ name: 'Estocada dupla' })).toMatchObject({ weaponFamily: 'leves', move: 'estocada-dupla' });
    expect(classify({ name: 'Espada longa: golpe com salto' })).toMatchObject({ weapon: 'espada-longa', move: 'golpe-com-salto' });
    expect(classify({ name: 'Lança: estocada tripla' })).toMatchObject({ weapon: 'lanca', move: 'estocada-tripla' });
    expect(classify({ name: 'Chuva de flechas', requirement: 'Arco longo' })).toMatchObject({ weapon: 'arco-longo', move: 'chuva-de-flechas' });
    expect(classify({ name: 'Martelo de guerra: martelo do trovão' })).toMatchObject({ weapon: 'martelo-de-guerra', move: 'martelo-do-trovao' });
    expect(classify({ name: 'Machadinha de arremesso' })).toMatchObject({ weaponFamily: 'arremesso', weapon: 'machadinha-arremesso' });
  });
  it('nome da arma sozinho nao puxa golpe', () => {
    expect(classify({ name: 'Besta pesada' })).toMatchObject({ weapon: 'besta', move: null });
    expect(classify('Ataque: Arco longo')).toMatchObject({ family: 'flecha', weapon: 'arco-longo', move: null });
    expect(classify({ name: 'Espada curta' })).toMatchObject({ family: 'corte', weapon: 'espada-curta', move: null });
  });
  it('campo animation { family, move } manda', () => {
    expect(classify({ name: 'Golpe X', animation: { family: 'pesadas', move: 'redemoinho' } })).toMatchObject({ family: 'montante', weaponFamily: 'pesadas', move: 'redemoinho' });
    expect(classify({ name: 'Golpe X', animation: { family: 'machado-de-guerra', move: 'racha-cranio' } })).toMatchObject({ weapon: 'machado-de-guerra', move: 'racha-cranio' });
    expect(classify({ name: 'Golpe X', animation: { family: 'corte', move: 'giro' } })).toMatchObject({ family: 'corte', weaponFamily: 'leves', move: 'giro' });
    expect(weaponInfo({ name: 'x', animation: { family: 'arco', move: 'leque' } })).toMatchObject({ weaponFamily: 'arco', move: 'leque' });
  });
  it('magia e monstro sem arma ficam como antes', () => {
    expect(classify({ name: 'Raio Sombrio', type: 'magia' }).weaponFamily).toBeUndefined();
    expect(classify({ name: 'Mordida' }, { monster: true }).weaponFamily).toBeUndefined();
    expect(classify({ name: 'Espada enferrujada' }, { monster: true })).toMatchObject({ weaponFamily: 'leves' });
  });
  it('familia explicita sem golpe continua no efeito antigo', () => {
    expect(createEffect({ family: 'corte', from: A, to: B, seed: 'x' }).mv).toBeNull();
    expect(createEffect({ power: { name: 'Espada' }, moves: false, from: A, to: B, seed: 'x' }).mv).toBeNull();
  });
});

describe('sincronizacao com golpes de arma', () => {
  const tokens = [
    { id: 't1', kind: 'character', character_id: 'c1', x: 0, y: 0, size: 1 },
    { id: 't2', kind: 'monster', x: 140, y: 0, size: 1 }
  ];
  it('ataque e impacto do mesmo rollId usam o mesmo golpe e impactam uma vez', () => {
    const impacts = [];
    const player = createPlayer({ unit: 70 / 16, cell: 70, onImpact: (i) => impacts.push(i) });
    const roll = { rollId: 'w1', kind: 'attack', characterId: 'c1', targetTokenId: 't2', powerName: 'Machado de guerra', dice: [{ sides: 20, value: 12 }] };
    const atk = fxFromRoll(roll, { tokens, cell: 70 });
    player.attack(atk, 0);
    player.impact(fxFromHit({ tokenId: 't2', outcome: 'hit', rollId: 'w1' }, { tokens, cell: 70, attack: atk }), 40);
    const ctx = createFakeContext(0, 0, { record: false });
    let frame;
    for (let t = 0; t < 3200; t += 16) frame = player.step(ctx, t);
    expect(impacts).toHaveLength(1);
    const expected = createEffect({ power: atk.power, from: atk.from, to: atk.to, seed: 'w1', unit: 70 / 16, cell: 70 }).mv.move.id;
    expect(impacts[0].move).toBe(expected);
    expect(frame.active).toBe(false);
  });
});
