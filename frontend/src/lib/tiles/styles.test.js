import { describe, it, expect } from 'vitest';
import { STYLES, STYLE_IDS, applyStyle, styleRgb, styleHex, isStyle } from './styles.js';
import { renderScene, terrainFrames, tileFrame } from './compose.js';
import { getTile } from './catalog.js';
import { setAmbience, serializeMap, repairMap } from './format.js';

// Amostra de cores: rampa de cinza, primarias, cores tipicas do mapa (grama, agua, terra).
const SAMPLE = [];
for (let v = 0; v <= 255; v += 51) SAMPLE.push([v, v, v]);
SAMPLE.push([255, 0, 0], [0, 255, 0], [0, 0, 255], [79, 154, 62], [50, 163, 203], [138, 90, 54], [242, 252, 255], [42, 28, 46]);

describe('estilos de mapa', () => {
  it('tem ~20 estilos com id, nome e descricao, e o primeiro e o padrao', () => {
    expect(STYLES.length).toBeGreaterThanOrEqual(20);
    expect(STYLES[0].id).toBe('padrao');
    expect(new Set(STYLE_IDS).size).toBe(STYLE_IDS.length);
    for (const s of STYLES) {
      expect(s.id).toMatch(/^[a-z-]+$/);
      expect(s.name.length).toBeGreaterThan(2);
      expect(s.description.length).toBeGreaterThan(10);
      expect(isStyle(s.id)).toBe(true);
    }
  });

  it('padrao (e estilo desconhecido) nao muda nada', () => {
    for (const [r, g, b] of SAMPLE) {
      expect(styleRgb(r, g, b, 'padrao')).toEqual([r, g, b]);
      expect(styleRgb(r, g, b, 'nao-existe')).toEqual([r, g, b]);
    }
    const px = new Uint8ClampedArray([10, 20, 30, 255, 200, 100, 50, 255]);
    expect([...applyStyle(px.slice(), 'padrao')]).toEqual([...px]);
  });

  it('todo estilo transforma sem erro, devolve cor valida e e deterministico', () => {
    for (const id of STYLE_IDS) {
      for (const [r, g, b] of SAMPLE) {
        const a = styleRgb(r, g, b, id);
        expect(a).toHaveLength(3);
        for (const v of a) expect(Number.isInteger(v) && v >= 0 && v <= 255, `${id} ${r},${g},${b}`).toBe(true);
        expect(styleRgb(r, g, b, id)).toEqual(a);
      }
      expect(styleHex('#4f9a3e', id)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('cada estilo (fora o padrao) muda a grama de um jeito diferente', () => {
    const seen = new Set();
    for (const id of STYLE_IDS.slice(1)) {
      const out = styleRgb(79, 154, 62, id).join(',');
      expect(out, id).not.toBe('79,154,62');
      seen.add(out);
    }
    expect(seen.size).toBe(STYLE_IDS.length - 1);
  });

  it('applyStyle mexe so nos pixels opacos', () => {
    const px = new Uint8ClampedArray([79, 154, 62, 0, 79, 154, 62, 255]);
    applyStyle(px, 'sepia');
    expect([...px.slice(0, 4)]).toEqual([79, 154, 62, 0]);
    expect([...px.slice(4, 7)]).not.toEqual([79, 154, 62]);
  });

  it('renderScene aplica o estilo do mapa e sem estilo fica igual ao padrao', () => {
    const map = { cols: 4, rows: 3, layers: { ground: ['..~~', '.~WW', '::~~'], objects: ['T   ', '    ', '    '] } };
    const base = renderScene(map);
    const pad = renderScene({ ...map, style: 'padrao' });
    const ink = renderScene({ ...map, style: 'gotico' });
    expect([...pad.data]).toEqual([...base.data]);
    expect([...ink.data]).not.toEqual([...base.data]);
    expect([...renderScene({ ...map, style: 'gotico' }).data]).toEqual([...ink.data]);
  });

  it('o estilo e salvo como a luz e a decoracao (padrao nao entra no JSON)', () => {
    const map = repairMap({ cols: 4, rows: 4, layers: { ground: ['....', '....', '....', '....'], objects: ['    ', '    ', '    ', '    '] } }).map;
    const outono = setAmbience(map, { style: 'outono' });
    expect(outono.style).toBe('outono');
    expect(JSON.parse(serializeMap(outono)).style).toBe('outono');
    expect(repairMap(JSON.parse(serializeMap(outono))).map.style).toBe('outono');
    expect(setAmbience(outono, { style: 'padrao' }).style).toBeUndefined();
    expect(setAmbience(map, { style: 'inventado' }).style).toBeUndefined();
  });
});

describe('agua animada', () => {
  it('agua tem 4 quadros ciclicos e o ciclo do terreno fecha com a lava (vai-e-volta)', () => {
    for (const code of ['~', 'W', '0', 'V', 'ó', 'ô']) {
      const t = getTile(code);
      expect(t.cycle, code).toBe(true);
      expect(t.frames).toHaveLength(4);
    }
    const lava = getTile('L');
    expect([0, 1, 2, 3, 4].map((k) => tileFrame(lava, k))).toEqual([0, 1, 2, 1, 0]);
    expect([0, 1, 2, 3, 4].map((k) => tileFrame(getTile('~'), k))).toEqual([0, 1, 2, 3, 0]);
    expect(terrainFrames({ layers: { ground: ['~L', 'W.'] } })).toBe(4);
    expect(terrainFrames({ layers: { ground: ['..', '..'] } })).toBe(1);
  });

  it('bloco de agua emenda: a ultima coluna/linha continua na primeira (sem costura dura)', () => {
    // mede a diferenca media na emenda contra a diferenca media entre vizinhos internos
    for (const code of ['~', 'W', 'ó']) {
      const t = getTile(code);
      const rows = t.frames[0];
      const lum = (ch) => { const n = parseInt(t.palette[ch].slice(1), 16); return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255); };
      let inner = 0; let seam = 0;
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 15; x++) inner += Math.abs(lum(rows[y][x]) - lum(rows[y][x + 1]));
        seam += Math.abs(lum(rows[y][15]) - lum(rows[y][0]));
      }
      expect(seam / 16, code).toBeLessThan((inner / (16 * 15)) * 3 + 20);
    }
  });
});
