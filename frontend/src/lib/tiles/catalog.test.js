import { describe, it, expect } from 'vitest';
import { TILES, CATEGORIES, SIZE, tileImages, DEFAULT_GROUND } from './catalog.js';

describe('catalogo de blocos', () => {
  it('tem ~45 blocos com codigos unicos e imprimiveis', () => {
    expect(TILES.length).toBeGreaterThanOrEqual(45);
    const codes = TILES.map((t) => t.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of codes) {
      expect(c).toHaveLength(1);
      expect(c.charCodeAt(0)).toBeGreaterThan(0x20);
      expect(c.charCodeAt(0)).toBeLessThan(0x7f);
      expect('"\\').not.toContain(c); // quebraria o JSON da IA
    }
    expect(codes).toContain(DEFAULT_GROUND);
  });

  it('cada imagem e 16x16 e usa so cores da paleta', () => {
    for (const t of TILES) {
      expect(['ground', 'objects']).toContain(t.layer);
      expect(CATEGORIES).toContain(t.category);
      for (const img of tileImages(t)) {
        expect(img, t.code).toHaveLength(SIZE);
        for (const row of img) {
          expect(row.length, `${t.code}: ${row}`).toBe(SIZE);
          for (const ch of row) if (ch !== '.') expect(t.palette[ch], `${t.code} cor ${ch}`).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
      if (t.frames) expect(t.frames.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('chao sem transparencia', () => {
    for (const t of TILES.filter((x) => x.layer === 'ground')) {
      for (const img of tileImages(t)) expect(img.join(''), t.code).not.toContain('.');
    }
  });
});
