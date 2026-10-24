import { describe, expect, it } from 'vitest';
import { ITEM_ICONS, iconFor, itemCategories, FALLBACK_ICON } from './items.js';
import { WEAPON_ICONS, WEAPON_LIST, WEAPON_MATERIALS, weaponIconFor, weaponIconId } from './weapons.js';
import { paintIcon, shapeSignature, iconPixels, iconSpec } from './render.js';

const pixelKey = (px) => Buffer.from(px).toString('base64');

describe('icones de itens', () => {
  it('tem pelo menos 150 desenhos distintos (recolor nao conta)', () => {
    // a assinatura ignora a paleta: mesma forma com outra cor conta uma vez so
    const shapes = new Set(Object.values(ITEM_ICONS).map(shapeSignature));
    expect(shapes.size).toBeGreaterThanOrEqual(150);
  });

  it('desenhos distintos tambem diferem no pixel final', () => {
    const seen = new Map();
    for (const spec of Object.values(ITEM_ICONS)) seen.set(shapeSignature(spec), pixelKey(paintIcon(spec)));
    expect(new Set(seen.values()).size).toBe(seen.size);
  });

  it('todo icone pinta, fica dentro do 16x16 e tem contorno (nenhum pixel na borda alem do contorno)', () => {
    for (const [id, spec] of Object.entries(ITEM_ICONS)) {
      const px = paintIcon(spec);
      expect(px.length, id).toBe(16 * 16 * 4);
      let opaque = 0;
      for (let i = 3; i < px.length; i += 4) if (px[i]) opaque++;
      expect(opaque, id).toBeGreaterThan(20);
    }
  });

  it('cobre todas as categorias pedidas', () => {
    const cats = itemCategories();
    for (const c of ['pocoes', 'comida', 'ingredientes', 'pergaminhos', 'livros', 'chaves', 'moedas', 'gemas', 'minerios', 'armaduras', 'joias', 'ferramentas', 'luz', 'cordas', 'bolsas', 'trofeus', 'diversos']) {
      expect(cats[c]?.length, c).toBeGreaterThan(0);
    }
    for (const metal of ['bronze', 'prata', 'platina', 'ouro']) expect(ITEM_ICONS[`moeda-${metal}`]).toBeTruthy();
    for (const p of ['vida', 'mana', 'sanidade', 'veneno', 'antidoto']) for (const s of ['p', 'm', 'g']) expect(ITEM_ICONS[`pocao-${p}-${s}`]).toBeTruthy();
  });

  it('nunca usa preto puro no contorno', () => {
    for (const spec of Object.values(ITEM_ICONS)) {
      const px = paintIcon(spec);
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3]) expect(px[i] + px[i + 1] + px[i + 2]).toBeGreaterThan(0);
      }
    }
  });
});

describe('icones de armas', () => {
  it('as 29 armas do jogo existem nos 3 materiais', () => {
    expect(WEAPON_LIST).toHaveLength(29);
    for (const w of WEAPON_LIST) for (const m of WEAPON_MATERIALS) expect(WEAPON_ICONS[weaponIconId(w.id, m)], `${w.id} ${m}`).toBeTruthy();
    const shapes = new Set(WEAPON_LIST.map((w) => shapeSignature(WEAPON_ICONS[weaponIconId(w.id, 'ferro')])));
    expect(shapes.size).toBe(29);
  });

  it('a variante encantada tem brilho (pixels translucidos)', () => {
    const px = paintIcon(WEAPON_ICONS[weaponIconId('espada-longa', 'ouro')]);
    let glow = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] > 0 && px[i] < 255) glow++;
    expect(glow).toBeGreaterThan(5);
  });

  it('resolve os nomes pt-BR das 29 armas', () => {
    const names = ['adaga', 'faca de caça', 'espada curta', 'espada longa', 'montante', 'sabre', 'rapieira', 'machadinha', 'machado de guerra', 'maça', 'martelo de guerra', 'mangual', 'lança', 'alabarda', 'foice', 'gadanha', 'chicote', 'cajado', 'bordão', 'manoplas', 'garras de ferro', 'escudo', 'arco curto', 'arco longo', 'besta leve', 'besta', 'funda', 'dardos', 'azagaia'];
    const ids = names.map((n) => weaponIconFor(n));
    names.forEach((n, i) => expect(ids[i], n).toBeTruthy());
    expect(new Set(ids).size).toBe(29);
    expect(ids.map((id) => id.replace(/^arma-|-ferro$/g, ''))).toEqual(WEAPON_LIST.map((w) => w.id));
  });

  it('entende prefixos e materiais', () => {
    expect(weaponIconFor('Ataque: Espada longa')).toBe('arma-espada-longa-ferro');
    expect(weaponIconFor('espada longa de aço')).toBe('arma-espada-longa-aco');
    expect(weaponIconFor('Adaga encantada')).toBe('arma-adaga-ouro');
    expect(weaponIconFor('Machado de guerra dourado')).toBe('arma-machado-de-guerra-ouro');
    expect(weaponIconFor('Arco longo élfico')).toBe('arma-arco-longo-ferro');
    expect(weaponIconFor('Besta leve')).toBe('arma-besta-leve-ferro');
    expect(weaponIconFor('Mochila')).toBeNull();
  });
});

describe('escolha automatica (iconFor)', () => {
  const cases = [
    [{ name: 'Poção de cura' }, 'pocao-vida-m'],
    [{ name: 'Poção de cura maior' }, 'pocao-vida-g'],
    [{ name: 'Elixir de mana pequeno' }, 'pocao-mana-p'],
    [{ name: 'Frasco de veneno' }, 'pocao-veneno-m'],
    [{ name: 'Antídoto' }, 'pocao-antidoto-m'],
    [{ name: 'Tônico de sanidade' }, 'pocao-sanidade-m'],
    [{ name: 'Bolsa de moedas' }, 'bolsa-ouro'],
    [{ name: 'Dracmas de prata', quantity: 12 }, 'pilha-prata'],
    [{ name: 'Moeda de platina' }, 'moeda-platina'],
    [{ name: 'Chave enferrujada' }, 'chave-enferrujada'],
    [{ name: 'Chave' }, 'chave'],
    [{ name: 'Cogumelo-pálido' }, 'cogumelo-palido'],
    [{ name: 'Escama de dragão' }, 'escama'],
    [{ name: 'Presa de lobo' }, 'presa'],
    [{ name: 'Maçã' }, 'maca'],
    [{ name: 'Maça' }, 'arma-maca-ferro'],
    [{ name: 'Corda de cânhamo (15 m)' }, 'corda'],
    [{ name: 'Tocha' }, 'tocha'],
    [{ name: 'Rubi' }, 'gema-brilhante-rubi'],
    [{ name: 'Elmo de ferro' }, 'elmo'],
    [{ name: 'Grimório do Érebo' }, 'grimorio'],
    [{ name: 'Ataque: Espada longa', category: 'Armas' }, 'arma-espada-longa-ferro'],
    [{ name: 'Escudo', category: 'Armaduras' }, 'escudo-brasao'],
    [{ name: 'Lembrança da avó', description: 'Um anel de prata com um rubi' }, 'gema-brilhante-rubi'],
    [{ name: 'Coisa', category: 'Poções' }, 'pocao-vida-m'],
    [{ name: 'Coisa', category: 'Livros' }, 'livro'],
    [{ name: 'Coisa', category: 'Tesouro' }, 'monte-ouro'],
    [{ name: 'Coisa', category: 'Ingredientes' }, 'erva'],
    [{ name: 'Coisa', category: 'Armas' }, 'arma-espada-longa-ferro'],
    [{ name: 'Coisa', category: 'Outros' }, FALLBACK_ICON],
    [{ name: 'Coisa', category: 'Categoria inventada' }, FALLBACK_ICON],
    [{ name: 'Qualquer', icon: 'coroa' }, 'coroa']
  ];
  it.each(cases)('%j -> %s', (item, id) => expect(iconFor(item)).toBe(id));

  it('todo id devolvido existe e pinta', () => {
    for (const [item] of cases) {
      const id = iconFor(item);
      expect(iconSpec(id), id).toBeTruthy();
      expect(iconPixels(id)).toBeInstanceOf(Uint8ClampedArray);
    }
  });

  it('nunca quebra com entrada vazia', () => {
    expect(iconFor()).toBe(FALLBACK_ICON);
    expect(iconFor({ name: null, category: undefined })).toBe(FALLBACK_ICON);
  });
});
