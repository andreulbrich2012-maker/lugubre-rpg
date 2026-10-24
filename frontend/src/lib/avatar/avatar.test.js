import { describe, it, expect } from 'vitest';
import { SLOTS, ITEMS, HAIRS } from './catalog.js';
import { COLORS, HAIR_COLORS, SKINS } from './palette.js';
import { pose, DIRECTIONS, ANIMS, W, H, BUILDS } from './skeleton.js';
import { createLayer } from './paint.js';
import { renderPixels, renderSheetPixels } from './compose.js';
import { RACES, defaultAppearance, applyRace, repairAppearance, randomAppearance, isValidAppearance, raceIdFromName, stable } from './appearance.js';
import { TRAIT_GROUPS } from './traits.js';
import { BEARDS, EYE_STYLES } from './body.js';

const COLOR_IDS = new Set(COLORS.map((c) => c.id));
const VIEWS = [['down', 'medio'], ['left', 'medio'], ['up', 'medio']];

// Assinatura do DESENHO (canal + tom por pixel, sem a cor): recolorir nao conta como peca nova.
function signature(draw) {
  return VIEWS.map(([d, b]) => {
    const P = pose(d, 'idle', 0, b);
    const L = createLayer(P);
    draw(L, P, { app: defaultAppearance(), traits: {}, P });
    return [...L.pix].sort((a, b2) => a[0] - b2[0]).map(([i, p]) => `${i}${p.c}${p.s}${p.t[0]}`).join('|');
  }).join('#');
}

describe('catalogo do criador de personagem', () => {
  for (const slot of SLOTS) {
    it(`${slot.name}: pelo menos ${slot.min} pecas, ids/nomes unicos e desenhos diferentes`, () => {
      const list = ITEMS[slot.id];
      expect(list.length).toBeGreaterThanOrEqual(slot.min);
      expect(new Set(list.map((i) => i.id)).size).toBe(list.length);
      expect(new Set(list.map((i) => i.name)).size).toBe(list.length);
      const sigs = new Map();
      for (const it of list) {
        expect(typeof it.draw, it.id).toBe('function');
        expect(it.name, it.id).toMatch(/\S/);
        expect(it.sub, it.id).toMatch(/\S/);
        for (const ch of it.channels) expect(COLOR_IDS.has(ch.def), `${it.id} cor ${ch.def}`).toBe(true);
        const sig = signature(it.draw);
        expect(sig.replace(/#/g, '').length, `${it.id} nao desenha nada`).toBeGreaterThan(0);
        expect(sigs.get(sig), `${it.id} igual a ${sigs.get(sig)}`).toBeUndefined();
        sigs.set(sig, it.id);
      }
    });
  }

  it('cabelos: 50+ estilos com desenhos diferentes', () => {
    expect(HAIRS.length).toBeGreaterThanOrEqual(50);
    expect(new Set(HAIRS.map((h) => h.id)).size).toBe(HAIRS.length);
    expect(new Set(HAIRS.map((h) => h.name)).size).toBe(HAIRS.length);
    const sigs = new Map();
    for (const h of HAIRS) {
      const sig = signature((L, P, c) => { h.drawBack?.(L, P, c); h.drawFront?.(L, P, c); });
      expect(sigs.get(sig), `${h.id} igual a ${sigs.get(sig)}`).toBeUndefined();
      sigs.set(sig, h.id);
    }
  });

  it('quantidades minimas pedidas: 16+ cores de cabelo e tons de pele fantasiosos', () => {
    expect(HAIR_COLORS.length).toBeGreaterThanOrEqual(16);
    expect(SKINS.length).toBeGreaterThanOrEqual(16);
    for (const id of ['rubro-abissal', 'azul-profundo', 'verde-gorak', 'lilas-noite']) expect(SKINS.some((s) => s.id === id), id).toBe(true);
  });

  it('variedade de corpo e rosto', () => {
    expect(BEARDS.length).toBeGreaterThanOrEqual(6);
    expect(EYE_STYLES.length).toBeGreaterThanOrEqual(4);
    expect(BUILDS.length).toBeGreaterThanOrEqual(2);
    expect(RACES.map((r) => r.id)).toEqual(expect.arrayContaining(['abissiano', 'celestiano', 'centauro', 'durkar', 'gorak', 'humano', 'kenku', 'lumerin', 'minotauro', 'nocthar', 'primordiano', 'sylvar', 'satiro', 'tritao']));
  });
});

function checkPixels(px) {
  expect(px).toHaveLength(W * H * 4);
}

describe('composicao', () => {
  it('toda peca desenha em toda direcao e quadro sem erro e dentro do quadro', { timeout: 180000 }, () => {
    for (const slot of SLOTS) for (const it of ITEMS[slot.id]) {
      const app = defaultAppearance('humano');
      app.layers[slot.id] = { id: it.id };
      for (const d of DIRECTIONS) for (const [anim, n] of Object.entries(ANIMS)) for (let f = 0; f < n; f++) checkPixels(renderPixels(app, d, anim, f));
    }
  });

  it('todo cabelo, barba, olho e traco desenha em toda direcao', { timeout: 120000 }, () => {
    const app = defaultAppearance('humano');
    for (const h of HAIRS) for (const d of DIRECTIONS) for (let f = 0; f < 4; f++) checkPixels(renderPixels({ ...app, hair: { style: h.id, color: 'ruivo' } }, d, 'walk', f));
    for (const b of BEARDS) for (const d of DIRECTIONS) checkPixels(renderPixels({ ...app, beard: { style: b.id, color: 'preto' } }, d, 'idle', 0));
    for (const e of EYE_STYLES) checkPixels(renderPixels({ ...app, eyes: { style: e.id, color: 'verde' } }, 'down', 'idle', 0));
    for (const g of TRAIT_GROUPS) for (const o of g.options) for (const d of DIRECTIONS) for (let f = 0; f < 4; f++) {
      checkPixels(renderPixels({ ...app, traits: { ...app.traits, [g.id]: o.id } }, d, 'walk', f));
    }
  });

  it('cada raca tem padrao valido e a folha tem 6x4 quadros', () => {
    for (const r of RACES) {
      const app = applyRace(defaultAppearance(), r.id);
      expect(isValidAppearance(app), r.id).toBe(true);
      const sheet = renderSheetPixels(app);
      expect(sheet.width).toBe(6 * W);
      expect(sheet.height).toBe(4 * H);
    }
  });
});

describe('formato da aparencia', () => {
  it('conserta lixo, pecas inexistentes e cores invalidas', () => {
    for (const bad of [null, 3, 'x', [], { race: 'dragao', layers: { torso: { id: 'nao-existe' }, legs: 'x' }, hair: 5, skin: '#fff' }]) {
      const fixed = repairAppearance(bad);
      expect(isValidAppearance(fixed)).toBe(true);
      expect(fixed.v).toBe(1);
    }
    const app = defaultAppearance('humano');
    app.layers.torso.colors = ['nao-e-cor'];
    expect(repairAppearance(app).layers.torso.colors[0]).toBe(repairAppearance(defaultAppearance()).layers.torso.colors[0]);
  });

  it('sorteio sempre valido e reproduzivel', () => {
    let s = 1;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 60; i++) expect(isValidAppearance(randomAppearance(rand))).toBe(true);
    let a = 9; const r1 = () => ((a = (a * 16807) % 2147483647) / 2147483647);
    let b = 9; const r2 = () => ((b = (b * 16807) % 2147483647) / 2147483647);
    expect(stable(randomAppearance(r1))).toBe(stable(randomAppearance(r2)));
  });

  it('cor livre (#hex) vale em cabelo, pele, olhos, tracos e canais das pecas', () => {
    const app = defaultAppearance('humano');
    const custom = repairAppearance({ ...app, skin: '#7FD0A0', hair: { ...app.hair, color: '#ff00aa' }, eyes: { ...app.eyes, color: '#00ccff' }, traits: { ...app.traits, hornColor: '#123456' }, layers: { ...app.layers, torso: { id: app.layers.torso.id, colors: ['#abcdef'] } } });
    expect(custom.skin).toBe('#7fd0a0');
    expect(custom.hair.color).toBe('#ff00aa');
    expect(custom.eyes.color).toBe('#00ccff');
    expect(custom.traits.hornColor).toBe('#123456');
    expect(custom.layers.torso.colors[0]).toBe('#abcdef');
    expect(isValidAppearance(custom)).toBe(true);
    expect(repairAppearance({ ...app, hair: { ...app.hair, color: '#zzz' } }).hair.color).toBe('castanho-escuro');
    const a = renderPixels(app, 'down', 'idle', 0);
    const b = renderPixels({ ...app, hair: { ...app.hair, color: '#ff00aa' } }, 'down', 'idle', 0);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
  });

  it('valida mesmo com as chaves reordenadas (jsonb)', () => {
    const app = applyRace(defaultAppearance(), 'kenku');
    const reordered = JSON.parse(stable(app));
    expect(isValidAppearance(reordered)).toBe(true);
  });

  it('nome da raca do catalogo vira id', () => {
    expect(raceIdFromName('Sátiro')).toBe('satiro');
    expect(raceIdFromName('Tritão')).toBe('tritao');
    expect(raceIdFromName('Qualquer')).toBe('humano');
  });
});
