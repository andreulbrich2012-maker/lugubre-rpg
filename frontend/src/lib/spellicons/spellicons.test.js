import { describe, it, expect } from 'vitest';
import { spellForm, classifyPower, iconKey, SPELL_FORMS, MANEUVERS, WEAPONS, ELEMENT_IDS, elementKey } from './classify.js';
import { renderIconPixels, ICON_SIZE } from './compose.js';
import { symbolGrid } from './symbols.js';
import { weaponGrid, MANEUVER_BADGES } from './weapons.js';

// Exemplos do livro 0.5 beta (cap. Magias e Poderes e Bestiario)
const RAIO_SOMBRIO = { name: 'Raio Sombrio', type: 'magia', element: 'Érebo', mana_cost: 3, damage_formula: '1d10+2', range: 'Médio', duration: 'Instantânea', recommended_class: 'Mago', description: 'Uma descarga de energia sombria direcionada contra um alvo.' };
const BENCAO = { name: 'Bênção de Éter', type: 'magia', element: 'Éter', mana_cost: 4, damage_formula: '1d8+3', range: 'Curto', duration: 'Instantânea', recommended_class: 'Sacerdote', description: 'Canaliza energia de Éter para produzir um efeito benéfico. Ainda deve esclarecer se representa cura, proteção ou outro resultado.' };
const GOLPE_GUARDIAO = { name: 'Golpe Guardião', type: 'poder', element: null, mana_cost: 0, damage_formula: '1d8+1', range: 'Corpo a corpo', duration: 'Instantâneo', recommended_class: 'Cavaleiro', description: 'Um golpe associado à função protetora do Cavaleiro.' };
const VINHAS = { name: 'Vinhas de Gaia', type: 'magia', element: 'Gaia', damage_formula: '1d4', description: 'Faz raízes crescerem sob os pés do alvo; se falhar em teste de Agilidade, fica imobilizado por 1 turno.' };
const ABRACO = { name: 'Abraço do Vazio', type: 'magia', element: 'Érebo', damage_formula: '1d8+2', description: 'Agarra a vítima; o alvo fica imobilizado até escapar com teste de Força.' };

describe('spellForm: exemplos do livro', () => {
  it('Raio Sombrio e um raio de Erebo', () => {
    expect(spellForm(RAIO_SOMBRIO)).toBe('raio');
    expect(classifyPower(RAIO_SOMBRIO)).toMatchObject({ kind: 'magia', element: 'erebo' });
  });
  it('Bencao de Eter e bencao (nome pesa mais que "cura, protecao" citados na descricao)', () => {
    expect(spellForm(BENCAO)).toBe('bencao');
  });
  it('Golpe Guardiao e tecnica defensiva com a espada do Cavaleiro', () => {
    expect(classifyPower(GOLPE_GUARDIAO)).toMatchObject({ kind: 'tecnica', form: 'defesa', weapon: 'espada-longa' });
  });
  it('Vinhas de Gaia e controle com raizes', () => {
    expect(classifyPower(VINHAS)).toMatchObject({ form: 'controle', variant: 'raizes', element: 'gaia' });
  });
  it('Abraco do Vazio e controle: abraco + agarra + imobilizado (agarrao) vencem "vazio" (maldicao)', () => {
    expect(spellForm(ABRACO)).toBe('controle');
  });
  it('raio de N metros e area, nao feixe', () => {
    expect(spellForm({ name: 'Chamas Negras', type: 'magia', element: 'Tártaro', description: 'Fogo num raio de 3 metros.' })).toBe('area');
  });
  it('outras formas por palavra-chave', () => {
    const f = (name, description = '') => spellForm({ name, type: 'magia', element: 'Nix', description });
    expect(f('Toque Gélido')).toBe('toque');
    expect(f('Lança de Gelo')).toBe('projetil');
    expect(f('Explosão de Cinzas')).toBe('area');
    expect(f('Cura Lunar')).toBe('cura');
    expect(f('Barreira de Sombras')).toBe('escudo');
    expect(f('Maldição do Pesadelo')).toBe('maldicao');
    expect(f('Passo Sombrio', 'Teleporta o conjurador.')).toBe('movimento');
    expect(classifyPower({ name: 'Passo Sombrio', type: 'magia', element: 'Nix', description: 'Teleporta o conjurador.' }).variant).toBe('portal');
    expect(f('Invocar Corvos')).toBe('invocacao');
    expect(f('Campo de Espinhos')).toBe('terreno');
    expect(f('Correntes do Tártaro')).toBe('controle');
  });
  it('sem acento e caixa alta tambem funcionam', () => {
    expect(spellForm({ name: 'BENCAO DE ETER', type: 'magia', element: 'ETER' })).toBe('bencao');
    expect(elementKey('TÁRTARO')).toBe('tartaro');
  });
});

describe('tecnicas e ataques de arma', () => {
  it('reconhece as 29 armas pelo nome "Ataque: X"', () => {
    for (const w of WEAPONS) {
      const info = classifyPower({ name: `Ataque: ${w.label}`, type: 'poder' });
      expect(info.kind).toBe('tecnica');
      expect(info.weapon, w.label).toBe(w.id);
      expect(info.form).toBe(w.maneuver);
    }
    expect(WEAPONS).toHaveLength(29);
  });
  it('manobras pelo nome', () => {
    const m = (name) => classifyPower({ name, type: 'poder' });
    expect(m('Investida com Lança')).toMatchObject({ weapon: 'lanca', form: 'investida' });
    expect(m('Giro do Machado')).toMatchObject({ weapon: 'machado-de-guerra', form: 'giro' });
    expect(m('Estocada Precisa').form).toBe('perfuracao');
    expect(m('Arremesso de Machadinha')).toMatchObject({ weapon: 'machadinha', form: 'arremesso' });
    expect(m('Tiro Certeiro').form).toBe('tiro');
    expect(m('Golpe com Arco Longo').form).toBe('tiro');
  });
});

describe('render', () => {
  it('toda combinacao elemento x forma renderiza 24x24 sem buracos no miolo', () => {
    const variants = { controle: ['correntes', 'raizes'], movimento: ['seta', 'portal'] };
    for (const element of [...ELEMENT_IDS, null]) {
      for (const form of SPELL_FORMS) {
        for (const variant of variants[form] || ['']) {
          const { width, height, data } = renderIconPixels({ kind: 'magia', form, variant, element });
          expect(width).toBe(ICON_SIZE);
          expect(height).toBe(ICON_SIZE);
          const center = (12 * ICON_SIZE + 12) * 4;
          expect(data[center + 3]).toBe(255);
        }
      }
    }
  });
  it('toda arma x manobra renderiza', () => {
    for (const w of WEAPONS) for (const m of MANEUVERS) {
      const { data } = renderIconPixels({ kind: 'tecnica', weapon: w.id, maneuver: m, form: m, element: null });
      expect(data.length).toBe(ICON_SIZE * ICON_SIZE * 4);
    }
  });
  it('e deterministico', () => {
    const a = renderIconPixels(RAIO_SOMBRIO).data;
    const b = renderIconPixels({ ...RAIO_SOMBRIO }).data;
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    expect(iconKey(classifyPower(RAIO_SOMBRIO))).toBe('magia|raio|erebo|-|-');
  });
  it('icones diferentes de fato diferem', () => {
    const a = renderIconPixels({ kind: 'magia', form: 'raio', element: 'gaia' }).data;
    const b = renderIconPixels({ kind: 'magia', form: 'raio', element: 'nix' }).data;
    const c = renderIconPixels({ kind: 'magia', form: 'cura', element: 'gaia' }).data;
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
    expect(Buffer.from(a).equals(Buffer.from(c))).toBe(false);
  });
  it('entrada desconhecida cai num icone valido', () => {
    for (const p of [null, undefined, {}, 'qualquer coisa', { name: 'Xyz', element: 'Fogo' }, { type: 'magia' }]) {
      const info = classifyPower(p);
      expect([...SPELL_FORMS, ...MANEUVERS]).toContain(info.form);
      expect(renderIconPixels(p).data.length).toBe(ICON_SIZE * ICON_SIZE * 4);
    }
    expect(spellForm(null)).toBe('projetil');
  });
  it('grades tem 16x16 e selos 7x7', () => {
    for (const form of SPELL_FORMS) symbolGrid(form).forEach((r) => expect(r).toHaveLength(16));
    expect(symbolGrid('controle', 'raizes')).toHaveLength(16);
    for (const w of WEAPONS) {
      const g = weaponGrid(w.id);
      expect(g).toHaveLength(16);
      g.forEach((r) => expect(r).toHaveLength(16));
    }
    for (const g of Object.values(MANEUVER_BADGES)) g.forEach((r) => expect(r).toHaveLength(7));
  });
});

// ---- grimorio: escola + nivel + irmas deixam cada icone diferente ----
import { createHash } from 'node:crypto';
import { SPELLS } from '../fx/spells/catalog.js';
import { grimoireIconPower } from './grimorio.js';
import { SCHOOL_STYLE } from './schools.js';

describe('icones do grimorio por escola', () => {
  const hashOf = (p) => createHash('md5').update(renderIconPixels(p).data).digest('hex');
  it('toda escola tem moldura e brasao 5x5', () => {
    const ids = new Set(SPELLS.map((s) => s.school));
    for (const id of ids) {
      expect(SCHOOL_STYLE[id], id).toBeTruthy();
      expect(SCHOOL_STYLE[id].glyph.length).toBe(5);
      for (const r of SCHOOL_STYLE[id].glyph) expect(r.length).toBe(5);
    }
  });
  it('quase todas as 442 magias tem pixels distintos (>= 400)', () => {
    const hashes = new Set(SPELLS.map((s) => hashOf(grimoireIconPower(s))));
    expect(hashes.size).toBeGreaterThanOrEqual(400);
  });
  it('mesma forma+elemento em escolas diferentes nao repete o icone', () => {
    const base = { name: 'Bola de Fogo', type: 'magia', element: 'Tártaro', description: 'Explode numa área.' };
    const a = hashOf({ ...base, school: 'fogo', tier: 2 });
    const b = hashOf({ ...base, school: 'caos', tier: 2 });
    const c = hashOf({ ...base, school: 'fogo', tier: 3 });
    expect(new Set([a, b, c]).size).toBe(3);
  });
  it('poder fora do grimorio (sem escola) continua igual', () => {
    const p = { name: 'Raio Sombrio', type: 'magia', element: 'Érebo', damage_formula: '1d10+2', range: 'Médio' };
    expect(classifyPower(p).school).toBeUndefined();
    expect(iconKey(classifyPower(p))).toBe('magia|raio|erebo|-|-');
  });
});
