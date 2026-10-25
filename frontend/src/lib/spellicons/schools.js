// Identidade das escolas do grimorio nos icones (aditivo: so entra quando o registro
// traz `school`). Cada escola tem um material de moldura proprio (cor) e um brasao 5x5
// no canto de cima a direita; o nivel (1-4) vira pinos dourados na base da moldura.
// Assim duas magias de mesma forma+elemento em escolas diferentes nao se confundem.
//   '#' = tom claro do brasao, '+' = tom medio, '.' = vazio
import { ramp, hexToRgb, outlineOf } from '../avatar/palette.js';

export const SCHOOL_STYLE = {
  fogo: { frame: '#c4502a', glyph: ['..#..', '.##..', '.#+#.', '##+##', '.###.'] },
  gelo: { frame: '#7cb4dc', glyph: ['#.#.#', '.###.', '##+##', '.###.', '#.#.#'] },
  agua: { frame: '#2e74c4', glyph: ['..#..', '..#..', '.#+#.', '#+++#', '.###.'] },
  terra: { frame: '#8a6a3e', glyph: ['.....', '..#..', '.#+#.', '#+++#', '#####'] },
  ar: { frame: '#a8c8c0', glyph: ['###..', '...#.', '####.', '....#', '.###.'] },
  raio: { frame: '#e0c040', glyph: ['..##.', '.##..', '####.', '..##.', '.##..'] },
  acido: { frame: '#8cc030', glyph: ['.#...', '.#.#.', '#+##.', '#++#.', '.##..'] },
  veneno: { frame: '#5a8a3a', glyph: ['.###.', '#+#+#', '#####', '.#.#.', '.#.#.'] },
  luz: { frame: '#f0d070', glyph: ['#.#.#', '.###.', '##+##', '.###.', '#.#.#'] },
  trevas: { frame: '#463a5c', glyph: ['.###.', '##...', '#+...', '##...', '.###.'] },
  forca: { frame: '#c070d0', glyph: ['#...#', '.#.#.', '..+..', '.#.#.', '#...#'] },
  ilusao: { frame: '#d088c8', glyph: ['.###.', '#...#', '#.+.#', '#...#', '.###.'] },
  encantamento: { frame: '#e070a0', glyph: ['.#.#.', '#####', '#+++#', '.###.', '..#..'] },
  necromancia: { frame: '#6a7a5e', glyph: ['.###.', '#+#+#', '#####', '.###.', '.#.#.'] },
  conjuracao: { frame: '#5a64c8', glyph: ['#.#.#', '#####', '.#+#.', '.###.', '..#..'] },
  abjuracao: { frame: '#9aa6b8', glyph: ['#####', '#+#+#', '#+#+#', '.#+#.', '..#..'] },
  transmutacao: { frame: '#c89a3a', glyph: ['###..', '#.#..', '###.#', '..#.#', '..###'] },
  adivinhacao: { frame: '#4ab0b8', glyph: ['.....', '.###.', '#+#+#', '.###.', '.....'] },
  divina: { frame: '#e8e0c0', glyph: ['..#..', '.###.', '..#..', '..#..', '..#..'] },
  natureza: { frame: '#4a9a3a', glyph: ['..##.', '.#+#.', '#++#.', '#+#..', '#....'] },
  sombras: { frame: '#3a3448', glyph: ['..##.', '.#...', '#+...', '.#...', '..##.'] },
  sangue: { frame: '#9a1e2e', glyph: ['..#..', '.#+#.', '#+++#', '#+++#', '.###.'] },
  tempo: { frame: '#b8946a', glyph: ['#####', '.#+#.', '..#..', '.#+#.', '#####'] },
  espaco: { frame: '#6a4ab0', glyph: ['.###.', '#...#', '#.#.#', '#..#.', '.##..'] },
  runas: { frame: '#7a8a9a', glyph: ['#.#..', '##...', '#.#..', '#..#.', '#...#'] },
  alquimia: { frame: '#5aa088', glyph: ['.###.', '..#..', '.#+#.', '#+++#', '#####'] },
  musica: { frame: '#d8a050', glyph: ['..###', '..#.#', '..#.#', '###.#', '##.##'] },
  maldicoes: { frame: '#7a3a6a', glyph: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'] },
  xamanismo: { frame: '#a0744a', glyph: ['#.#.#', '#####', '.#+#.', '.###.', '.#.#.'] },
  cosmos: { frame: '#3a4a9a', glyph: ['..#..', '..#..', '##+##', '..#..', '..#..'] },
  caos: { frame: '#c03a5a', glyph: ['#.#.#', '.#+#.', '##+##', '.#+#.', '#.#.#'] },
  metamagia: { frame: '#9a6ad8', glyph: ['#####', '#...#', '#.#.#', '#...#', '#####'] },
  utilitarias: { frame: '#a89a7a', glyph: ['...##', '..##.', '.##..', '##...', '#....'] },
  rituais: { frame: '#b05a3a', glyph: ['.###.', '#.#.#', '#####', '#.#.#', '.###.'] }
};

const cache = new Map();

// Rampas (5 tons, mesma funcao do resto) de uma escola; null se nao existe.
export function schoolPalette(school) {
  const st = SCHOOL_STYLE[school];
  if (!st) return null;
  if (cache.has(school)) return cache.get(school);
  const frame = ramp(st.frame).map(hexToRgb);
  const p = { id: school, frame, outline: outlineOf(hexToRgb(st.frame)), glyph: st.glyph };
  cache.set(school, p);
  return p;
}
