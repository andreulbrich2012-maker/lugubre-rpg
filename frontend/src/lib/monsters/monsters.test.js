import { describe, it, expect } from 'vitest';
import { BASES, ELEMENTS } from './bases.js';
import { EPITHETS } from './epithets.js';
import { renderMonsterPixels, renderSheetPixels, DIRECTIONS, SHEET_LAYOUT } from './compose.js';
import { monsterLook, lookFromBase, classifyBase, normalize } from './classify.js';
import { DETAIL_IDS } from './details.js';

const FRAMES = [['idle', 2], ['walk', 4], ['attack', 1]];
const opaque = (px) => { let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i] === 255) n++; return n; };

describe('bases de monstros', () => {
  it('tem pelo menos 80 bases com ids e nomes unicos, ~10 por elemento', () => {
    expect(BASES.length).toBeGreaterThanOrEqual(80);
    expect(new Set(BASES.map((b) => b.id)).size).toBe(BASES.length);
    expect(new Set(BASES.map((b) => b.name)).size).toBe(BASES.length);
    for (const el of ELEMENTS) expect(BASES.filter((b) => b.element === el).length).toBeGreaterThanOrEqual(10);
  });

  for (const base of BASES) {
    it(`${base.name}: todos os quadros (4 direcoes x idle/andar/ataque) desenham algo`, () => {
      for (const size of [16, 32]) {
        const look = lookFromBase(base, size);
        for (const dir of DIRECTIONS) for (const [anim, n] of FRAMES) for (let f = 0; f < n; f++) {
          const px = renderMonsterPixels(look, dir, anim, f);
          expect(px.length).toBe(size * size * 4);
          expect(opaque(px), `${base.id} ${dir} ${anim} ${f} @${size}`).toBeGreaterThan(size * size * 0.06);
        }
      }
    });
  }

  it('pelo menos 80 desenhos distintos (forma + tons, sem contar a cor)', () => {
    const sigs = new Set(BASES.map((b) => {
      const look = lookFromBase(b, 32);
      // paleta neutra: so a forma e os tons contam, recolorir nao vale como desenho novo
      const grey = Object.fromEntries(Object.keys(look.palette).map((k) => [k, '#808080']));
      return ['down', 'left'].map((d) => Array.from(renderMonsterPixels({ ...look, palette: grey }, d, 'idle', 0)).join(',')).join('#');
    }));
    expect(sigs.size).toBeGreaterThanOrEqual(80);
  });

  it('direita e o espelho da esquerda', () => {
    const look = lookFromBase(BASES[0], 24);
    const l = renderMonsterPixels(look, 'left', 'walk', 1), r = renderMonsterPixels(look, 'right', 'walk', 1);
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) for (let k = 0; k < 4; k++) expect(r[(y * 24 + 23 - x) * 4 + k]).toBe(l[(y * 24 + x) * 4 + k]);
  });

  it('folha de sprites tem 7 colunas x 4 linhas', () => {
    const look = monsterLook({ name: 'Lobo Selvagem', category: 'Gaia', difficulty: 'Média' });
    const sheet = renderSheetPixels(look);
    expect(sheet.width).toBe(SHEET_LAYOUT.cols * look.size);
    expect(sheet.height).toBe(4 * look.size);
  });
});

describe('classificador pt-BR', () => {
  const cases = [
    ['Rato do Mato', 'Gaia', 'rato'],
    ['Lobo Sombrio Ancião', 'Érebo', 'lobo'],
    ['Avatar da Montanha', 'Gaia', 'avatar-montanha'],
    ['Morcego Sombrio', 'Érebo', 'morcego'],
    ['Avatar do Esquecido', 'Érebo', 'avatar-esquecido'],
    ['Javali Selvagem', 'Gaia', 'javali'],
    ['URSO PARDO', 'Gaia', 'urso'],
    ['Espectro Acorrentado', 'Érebo', 'espectro'],
    ['Cão Infernal', 'Tártaro', 'cao-infernal'],
    ['Lobo das Sombras', 'Érebo', 'lobo-sombras'],
    ['Diabrete Flamejante', 'Tártaro', 'diabrete'],
    ['Fogo-Fátuo', 'Éter', 'fogo-fatuo'],
    ['Água-Viva Gigante', 'Ponto', 'agua-viva'],
    ['Tubarão das Profundezas', 'Ponto', 'tubarao'],
    ['Esfinge do Deserto', 'Ananque', 'esfinge'],
    ['Guardião de Cinzas', 'Caos', 'guardiao-cinzas'],
    ['Goblin', 'Gaia', 'goblin'],
    ['Peregrino Sem Face', 'Érebo', 'peregrino'],
    ['Slime Rei', 'Caos', 'slime'],
    ['Elemental de Gelo', 'Nix', 'elemental-gelo'],
    ['Esqueleto Guerreiro', 'Tártaro', 'esqueleto'],
    ['Relógio Vivo', 'Ananque', 'relogio-vivo'],
    ['Avatar do Pântano', 'Gaia', 'avatar-montanha'],
    ['Xyzzor', 'Érebo', 'sombra'],
    ['Coisa Sem Nome', 'Tártaro', 'diabrete']
  ];
  for (const [name, category, base] of cases) {
    it(`"${name}" (${category}) -> ${base}`, () => expect(classifyBase({ name, category }).base.id).toBe(base));
  }

  it('ignora acentos e caixa', () => {
    expect(normalize('ÉREBO Ancião')).toBe('erebo anciao');
    expect(classifyBase({ name: 'cao infernal', category: 'Tartaro' }).base.id).toBe('cao-infernal');
  });

  it('lobo de Erebo herda o tom do elemento e o epiteto vira variante', () => {
    const gaia = monsterLook({ name: 'Lobo', category: 'Gaia' });
    const erebo = monsterLook({ name: 'Lobo Sombrio Ancião', category: 'Érebo', difficulty: 'Alta' });
    expect(erebo.base).toBe('lobo');
    expect(erebo.element).toBe('Érebo');
    expect(erebo.palette.a).not.toBe(gaia.palette.a);
    expect(erebo.epithets).toEqual(['sombrio', 'anciao']);
    expect(erebo.details.length).toBeGreaterThan(0);
  });

  it('tamanho cresce com nivel/dificuldade; avatares sao os maiores', () => {
    expect(monsterLook({ name: 'Rato do Mato', category: 'Gaia', difficulty: 'Baixa' }).size).toBe(16);
    expect(monsterLook({ name: 'Lobo Sombrio Ancião', category: 'Érebo', difficulty: 'Alta' }).size).toBe(24);
    expect(monsterLook({ name: 'Demônio Ancestral', category: 'Tártaro', difficulty: 'Mortal' }).size).toBe(32);
    expect(monsterLook({ name: 'Avatar da Montanha', category: 'Gaia', difficulty: 'Lendária' }).size).toBe(40);
    expect(monsterLook({ name: 'Lobo', category: 'Gaia', description: 'Criatura de nível 17.' }).level).toBe(17);
  });

  it('todo epiteto usa so detalhes conhecidos', () => {
    for (const e of EPITHETS) for (const d of e.details) expect(DETAIL_IDS).toContain(d);
  });
});

describe('determinismo', () => {
  it('mesmo cadastro -> mesmo descritor e mesmos pixels', () => {
    const m = { name: 'Aranha Cristalina', category: 'Gaia', difficulty: 'Média' };
    const a = monsterLook(m), b = monsterLook({ ...m });
    expect(a).toEqual(b);
    expect(Array.from(renderSheetPixels(a).data)).toEqual(Array.from(renderSheetPixels(b).data));
  });

  it('nomes diferentes da mesma base nao sao clones perfeitos', () => {
    const a = monsterLook({ name: 'Rato do Mato', category: 'Gaia' });
    const b = monsterLook({ name: 'Rato do Brejo', category: 'Gaia' });
    expect(a.key).not.toBe(b.key);
  });

  it('todas as variantes de exemplo renderizam com detalhes', () => {
    for (const e of EPITHETS) {
      const look = monsterLook({ name: `Javali ${e.words[0]}`, category: 'Gaia', difficulty: 'Média' });
      expect(look.epithets[0]).toBe(e.id);
      for (const dir of DIRECTIONS) expect(opaque(renderMonsterPixels(look, dir, 'walk', 0))).toBeGreaterThan(10);
    }
  });
});
