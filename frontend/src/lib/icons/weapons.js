// Icones das 29 armas do jogo, 16x16, em composicao diagonal (cabo embaixo-esquerda, ponta
// em cima-direita) como nos icones classicos de RPG. Cada arma e montada por primitivas:
// eixo diagonal (x + y = 15), travessa perpendicular e formas no sistema girado (u ao longo
// da arma, v perpendicular), entao lamina, cabeca de machado ou arco saem sem "buracos" de 45 graus.
// Tres materiais por arma: ferro (fosco), aco (brilhante com guarda de latao) e ouro encantado
// (com aura e brilhos). O volume vem do motor (render.js), igual aos itens.

const grid = () => Array.from({ length: 16 }, () => Array(16).fill('.'));

function tools(g) {
  const put = (x, y, ch) => { if (x >= 1 && y >= 1 && x <= 14 && y <= 14) g[y][x] = ch; };
  return {
    put,
    // eixo principal: ponto t = (t, 15 + o - t); largura centrada (w=2 cresce para a direita)
    ax(t0, t1, ch, w = 1, o = 0) {
      for (let t = t0; t <= t1; t++) for (let k = -Math.floor((w - 1) / 2); k <= Math.ceil((w - 1) / 2); k++) put(t + k, 15 + o - t, ch);
    },
    // travessa perpendicular ao eixo no ponto t (guarda, colar)
    pp(t, half, ch, o = 0, thick = false) {
      for (let k = -half; k <= half; k++) {
        put(t + k, 15 + o - t + k, ch);
        if (thick && k < half) put(t + k + 1, 15 + o - t + k, ch); // travessa grossa sem degraus vazados
      }
    },
    pts(list, ch) { for (const [x, y] of list) put(x, y, ch); },
    // forma no sistema girado em volta de (cx, cy): u ao longo da arma (para a ponta), v para cima-esquerda
    rot(cx, cy, ch, test) {
      for (let y = 1; y <= 14; y++) for (let x = 1; x <= 14; x++) {
        const dx = x - cx, dy = y - cy;
        if (test((dx - dy) / Math.SQRT2, (-dx - dy) / Math.SQRT2)) put(x, y, ch);
      }
    },
    // so troca pixels ja desenhados (fio da lamina, sulco, faixas)
    paint(ch, test, only) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (g[y][x] !== '.' && (!only || only.includes(g[y][x])) && test(x, y)) g[y][x] = ch;
    }
  };
}

// u/v de um pixel em relacao ao centro (para os testes de forma)
const uv = (x, y, cx, cy) => [((x - cx) - (y - cy)) / Math.SQRT2, (-(x - cx) - (y - cy)) / Math.SQRT2];

// Pomo pequeno em L no ponto t do eixo
function pommel(T, t, ch = 'e') { T.pts([[t, 15 - t], [t - 1, 15 - t], [t, 16 - t]], ch); }

// Arco: corda no eixo e o corpo curvado para cima-esquerda (parabola no sistema girado)
function bow(T, half, height, { grip = true } = {}) {
  const c = 7.5;
  T.rot(c, c, 'w', (u, v) => Math.abs(u) <= half && Math.abs(v - height * (1 - (u / half) ** 2)) <= 0.55 + 0.35 * (1 - Math.abs(u) / half));
  T.rot(c, c, 's', (u, v) => Math.abs(u) <= half - 0.4 && Math.abs(v) <= 0.36);
  if (grip) T.rot(c, c, 'l', (u, v) => Math.abs(u) <= 0.9 && Math.abs(v - height) <= 0.75);
  T.rot(c, c, 'g', (u, v) => Math.abs(Math.abs(u) - half) <= 0.75 && Math.abs(v) <= 0.9);
}

export const WEAPON_LIST = [
  { id: 'adaga', name: 'Adaga', draw(T) {
    pommel(T, 3); T.ax(4, 5, 'l'); T.pp(6, 2, 'g');
    T.ax(7, 10, 'm', 2); T.ax(11, 12, 'm');
  } },
  { id: 'faca-de-caca', name: 'Faca de caça', draw(T) {
    T.ax(2, 2, 'g', 2); T.ax(3, 5, 'w', 2); T.put(4, 11, 'g');
    T.pp(6, 1, 'g'); T.ax(7, 9, 'm', 3); T.ax(10, 11, 'm', 2); T.ax(12, 12, 'm');
    T.put(9, 4, 'm'); T.put(8, 5, 'q');
  } },
  { id: 'espada-curta', name: 'Espada curta', draw(T) {
    pommel(T, 3); T.ax(4, 5, 'l', 2); T.pp(6, 2, 'g', 0, true);
    T.ax(7, 10, 'm', 3); T.ax(11, 11, 'm', 2); T.ax(12, 12, 'm');
  } },
  { id: 'espada-longa', name: 'Espada longa', draw(T) {
    pommel(T, 2); T.ax(3, 4, 'l', 2); T.pp(5, 3, 'g', 0, true);
    T.ax(6, 12, 'm', 3); T.ax(13, 13, 'm', 2); T.ax(14, 14, 'm');
    T.ax(7, 11, 'q');
  } },
  { id: 'montante', name: 'Montante', draw(T) {
    pommel(T, 2); T.ax(3, 4, 'l', 2); T.pts([[3, 12]], 'L');
    T.pp(5, 4, 'g', 0, true); T.pts([[1, 7], [8, 14]], 'g');
    T.ax(6, 11, 'm', 4); T.ax(12, 12, 'm', 3); T.ax(13, 13, 'm', 2); T.put(14, 1, 'm');
    T.ax(7, 11, 'q'); T.ax(6, 6, 'g', 2);
  } },
  { id: 'sabre', name: 'Sabre', draw(T) {
    T.put(2, 13, 'e'); T.ax(3, 4, 'l'); T.pp(5, 1, 'g');
    T.pts([[6, 12], [5, 13], [4, 14], [3, 14]], 'g');
    T.ax(6, 8, 'm', 2); T.ax(9, 11, 'm', 2, 1); T.ax(12, 12, 'm', 2, 2); T.put(13, 4, 'm');
  } },
  { id: 'rapieira', name: 'Rapieira', draw(T) {
    pommel(T, 2); T.ax(3, 4, 'l'); T.pp(5, 3, 'g');
    T.pts([[6, 12], [7, 12], [7, 11], [3, 8], [3, 9], [4, 8]], 'g');
    T.ax(6, 7, 'm', 2); T.ax(8, 10, 'm'); T.ax(11, 14, 'M');
  } },
  { id: 'machadinha', name: 'Machadinha', draw(T) {
    T.ax(2, 3, 'l'); T.ax(4, 11, 'w');
    T.rot(10.5, 4.5, 'm', (u, v) => v >= 0.4 && v <= 4.3 && Math.abs(u) <= 0.9 + v * 0.38);
    T.rot(10.5, 4.5, 'g', (u, v) => v < 0.4 && v >= -1.6 && Math.abs(u) <= 0.8);
    T.paint('M', (x, y) => uv(x, y, 10.5, 4.5)[1] > 3.3, ['m']);
  } },
  { id: 'machado-de-guerra', name: 'Machado de guerra', draw(T) {
    T.ax(1, 3, 'l'); T.ax(4, 12, 'w');
    T.rot(9.5, 5.5, 'm', (u, v) => Math.abs(v) >= 0.6 && Math.abs(v) <= 4.6 && Math.abs(u) <= 0.7 + Math.abs(v) * 0.5);
    T.rot(9.5, 5.5, 'g', (u, v) => Math.abs(v) < 0.8 && Math.abs(u) <= 1.4);
    T.ax(13, 13, 'm'); T.put(14, 1, 'M');
    T.paint('M', (x, y) => Math.abs(uv(x, y, 9.5, 5.5)[1]) > 3.7, ['m']);
  } },
  { id: 'maca', name: 'Maça', draw(T) {
    T.put(2, 13, 'g'); T.ax(3, 5, 'l', 2); T.ax(6, 8, 'w');
    T.rot(10.5, 4.5, 'm', (u, v) => (u / 3.4) ** 2 + (v / 2.5) ** 2 <= 1);
    T.paint('q', (x, y) => { const [u, v] = uv(x, y, 10.5, 4.5); return Math.abs(Math.abs(v) - 1.1) < 0.36 && Math.abs(u) < 2.6; }, ['m']);
    T.rot(10.5, 4.5, 'g', (u, v) => Math.abs(u + 3) <= 0.5 && Math.abs(v) <= 1.1);
    T.rot(10.5, 4.5, 'M', (u, v) => u > 3.2 && u <= 4.4 && Math.abs(v) <= 0.5);
  } },
  { id: 'martelo-de-guerra', name: 'Martelo de guerra', draw(T) {
    T.ax(1, 3, 'l', 2); T.ax(4, 12, 'w');
    T.rot(10, 5, 'm', (u, v) => Math.abs(u) <= 1.9 && v >= -1.2 && v <= 4.2);
    T.rot(10, 5, 'q', (u, v) => v < -1.2 && v >= -4.6 && Math.abs(u) <= (v + 4.8) * 0.36);
    T.rot(10, 5, 'g', (u, v) => Math.abs(u) <= 2.1 && Math.abs(v - 1.4) <= 0.5);
    T.paint('M', (x, y) => uv(x, y, 10, 5)[1] > 3.4, ['m']);
  } },
  { id: 'mangual', name: 'Mangual', draw(T) {
    T.put(2, 13, 'g'); T.ax(3, 4, 'l', 2); T.ax(5, 6, 'w', 2); T.put(7, 8, 'g');
    T.pts([[8, 8], [9, 9], [10, 9], [11, 8]], 'c');
    T.rot(11, 4.5, 'o', (u, v) => u * u + v * v <= 6.2);
    T.pts([[11, 1], [14, 4], [8, 4], [11, 7], [13, 2], [9, 2], [14, 6], [8, 6]], 'M');
  } },
  { id: 'lanca', name: 'Lança', draw(T) {
    T.ax(1, 10, 'w'); T.ax(4, 5, 'l');
    T.pp(10, 1, 'g');
    T.rot(11.5, 3.5, 'm', (u, v) => u >= -2.2 && u <= 3.8 && Math.abs(v) <= 2 - Math.abs(u - 0.2) * 0.55);
  } },
  { id: 'alabarda', name: 'Alabarda', draw(T) {
    T.ax(1, 12, 'w'); T.ax(3, 4, 'l');
    T.rot(13, 2, 'm', (u, v) => u >= -0.6 && u <= 1.3 && Math.abs(v) <= 0.7);
    T.rot(10, 5, 'm', (u, v) => v >= 0.6 && v <= 4.4 && u >= -1.9 && u <= 1.2 + v * 0.18);
    T.rot(10, 5, 'q', (u, v) => v <= -0.6 && v >= -2.8 && Math.abs(u + (v + 0.6) * 0.55) <= 0.75);
    T.pp(9, 1, 'g'); T.pp(11, 1, 'g');
    T.paint('M', (x, y) => uv(x, y, 10, 5)[1] > 3.5, ['m']);
  } },
  { id: 'foice', name: 'Foice', draw(T) {
    T.ax(2, 3, 'l'); T.ax(4, 6, 'w'); T.put(7, 8, 'g');
    T.rot(8.4, 5.2, 'm', (u, v) => {
      const r = Math.hypot(u, v);
      const a = Math.atan2(v, u);
      return r >= 2.6 && r <= 3.9 - Math.max(0, a - 1.2) * 0.6 && a >= -1.75 && a <= 2.9;
    });
  } },
  { id: 'gadanha', name: 'Gadanha', draw(T) {
    T.ax(1, 12, 'w'); T.ax(5, 5, 'g'); T.put(6, 10, 'w'); T.put(7, 10, 'w');
    T.pts([[12, 2], [13, 2], [12, 1]], 'g');
    T.pts([[5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [2, 3], [3, 3], [1, 4]], 'm');
    T.pts([[4, 1], [2, 2]], 'M');
  } },
  { id: 'chicote', name: 'Chicote', draw(T) {
    T.put(2, 13, 'g'); T.ax(3, 5, 'l'); T.pp(6, 0, 'g');
    T.pts([[7, 8], [8, 8], [9, 8], [10, 7], [11, 6], [12, 5], [12, 4], [12, 3], [11, 2], [10, 2], [9, 3], [9, 4], [10, 4]], 'r');
    T.pts([[8, 8], [11, 6], [12, 3], [9, 3]], 'R');
  } },
  { id: 'cajado', name: 'Cajado', draw(T) {
    T.ax(2, 10, 'w'); T.put(6, 9, 'W'); T.ax(3, 4, 'l');
    T.pts([[10, 3], [10, 2], [11, 5], [13, 5], [14, 4], [10, 4], [11, 1]], 'w');
    T.rot(12.2, 2.8, 'e', (u, v) => u * u + v * v <= 2.4);
  } },
  { id: 'bordao', name: 'Bordão', draw(T) {
    T.ax(1, 14, 'w', 2); T.ax(1, 3, 'm', 2); T.ax(12, 14, 'm', 2); T.ax(7, 8, 'l', 2); T.ax(6, 6, 'L', 2); T.ax(9, 9, 'L', 2);
  } },
  { id: 'manoplas', name: 'Manoplas', draw(T) {
    const rows = [
      '....M.M.M.M.....',
      '...mmmmmmmmmm...',
      '..mmqmmqmmqmmm..',
      '..mmmmmmmmmmmm..',
      '..qqqqqqqqqmmm..',
      '..mmmmmmmmmmmm..',
      '..mmmmmmmmmmm...',
      '...mmmmmmmmm....',
      '....gggggggg....',
      '....llllllll....',
      '....lLlLlLlL....',
      '....llllllll....'
    ];
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') T.put(x, y + 2, ch); }));
  } },
  { id: 'garras-de-ferro', name: 'Garras de ferro', draw(T) {
    T.ax(2, 4, 'l', 2); T.pp(5, 2, 'g');
    for (const o of [-3, 0, 3]) { T.ax(6, 10, 'm', 1, o); T.ax(11, 11, 'M', 1, o + 1); }
    T.pp(5, 3, 'g');
  } },
  { id: 'escudo', name: 'Escudo', draw(T) {
    const rows = [
      'gggggggggggg',
      'gwwwwmmwwwwg',
      'gwwwwmmwwwwg',
      'gwwwwmmwwwwg',
      'gmmmmMMmmmmg',
      'gmmmmMMmmmmg',
      'gwwwwmmwwwwg',
      '.gwwwmmwwwg.',
      '.gwwwmmwwwg.',
      '..gwwmmwwg..',
      '...gwmmwg...',
      '....gggg....'
    ];
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') T.put(x + 2, y + 2, ch); }));
  } },
  { id: 'arco-curto', name: 'Arco curto', draw(T) { bow(T, 5.2, 2.8); } },
  { id: 'arco-longo', name: 'Arco longo', draw(T) { bow(T, 7.2, 3.6); } },
  { id: 'besta-leve', name: 'Besta leve', draw(T) {
    T.ax(3, 9, 'w', 2); T.ax(2, 2, 'w');
    T.rot(10, 5, 'm', (u, v) => Math.abs(v) <= 3.6 && Math.abs(u + 0.5 * (v / 3.6) ** 2) <= 0.6);
    T.rot(10, 5, 's', (u, v) => Math.abs(v) <= 2.6 && Math.abs(u + 1.5 - Math.abs(v) * 0.3) <= 0.45 && Math.abs(v) > 0.4);
    T.ax(10, 12, 'M'); T.put(6, 9, 'g');
  } },
  { id: 'besta', name: 'Besta', draw(T) {
    T.ax(2, 10, 'w', 2); T.pts([[2, 12], [1, 12]], 'g');
    T.rot(10.5, 4.5, 'm', (u, v) => Math.abs(v) <= 4.8 && Math.abs(u + 0.9 * (v / 4.8) ** 2) <= 0.62);
    T.rot(10.5, 4.5, 's', (u, v) => Math.abs(v) <= 3.8 && Math.abs(u + 2.4 - Math.abs(v) * 0.38) <= 0.45 && Math.abs(v) > 0.5);
    T.rot(12.6, 2.4, 'g', (u, v) => Math.abs(u) <= 0.7 && Math.abs(v) <= 1.3);
    T.pts([[5, 12], [6, 12], [5, 13]], 'g');
  } },
  { id: 'funda', name: 'Funda', draw(T) {
    const rows = [
      '.rr..........r',
      'r..r.........r',
      'r..r........r.',
      '.rr.r......r..',
      '.....r.....r..',
      '......r...r...',
      '......lllll...',
      '.....llooolL..',
      '.....looooll..',
      '.....llooolL..',
      '......lllll...'
    ];
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') T.put(x + 1, y + 2, ch); }));
  } },
  { id: 'dardos', name: 'Dardos', draw(T) {
    // tres dardos paralelos e escalonados: pena larga, haste fina e ponta de metal
    for (const [o, t] of [[-5, 1], [0, 3], [5, 6]]) {
      T.ax(t, t + 1, 'f', 2, o); T.ax(t + 2, t + 4, 'w', 1, o); T.ax(t + 5, t + 6, 'm', 1, o); T.ax(t + 7, t + 7, 'M', 1, o);
    }
  } },
  { id: 'azagaia', name: 'Azagaia', draw(T) {
    T.ax(1, 11, 'w'); T.ax(5, 7, 'l'); T.ax(12, 13, 'm', 2); T.put(14, 1, 'm'); T.pp(11, 1, 'g');
  } }
];

// ferro: fosco e frio; aco: claro com guarda de latao e gema vermelha; ouro: encantado (aura + brilhos)
export const WEAPON_MATERIALS = ['ferro', 'aco', 'ouro'];
const MATS = {
  ferro: { m: '#969cab', g: '#6e6878', l: '#7a4a2e', w: '#9a6a3c', e: '#6e6878', face: '#9a6a3c', label: 'de ferro' },
  aco: { m: '#bccbe0', g: '#c8963a', l: '#4a3a5a', w: '#7a4a2e', e: '#d8283c', face: '#3e5ea0', label: 'de aço' },
  ouro: { m: '#f0c44a', g: '#8a48c8', l: '#5a2a7a', w: '#6a3a5a', e: '#4ae0e0', face: '#6a3a9a', label: 'encantada' }
};
const MAT_NAMES = { ferro: 'ferro', aco: 'aço', ouro: 'ouro' };

const GLOW_ALL = new Set(['arco-curto', 'arco-longo', 'cajado', 'chicote', 'funda', 'escudo', 'bordao', 'manoplas']);

export const weaponIconId = (weaponId, material = 'ferro') => `arma-${weaponId}-${material}`;

export const WEAPON_ICONS = {};
for (const w of WEAPON_LIST) {
  const g = grid();
  w.draw(tools(g));
  const rows = g.map((r) => r.join(''));
  for (const mat of WEAPON_MATERIALS) {
    const M = MATS[mat];
    const pal = {
      m: [M.m, 'edge'], M: [M.m, 4], q: [M.m, 1], o: [M.m, 'round'], c: [M.g, 2],
      g: [M.g, 'edge'], l: [M.l, 'edge'], L: [M.l, 0], w: [w.id === 'escudo' ? M.face : M.w, 'edge'], W: [M.w, 0],
      e: [M.e, 'round'], s: ['#ece4d0', 'raw'], f: ['#c84a3a', 'edge'], r: ['#b07a48', 'edge'], R: ['#b07a48', 0]
    };
    const spec = { rows, pal, label: `${w.name} (${MAT_NAMES[mat]})`, cat: 'armas' };
    if (mat === 'ouro') {
      // a aura sai do metal (lamina brilhando); armas sem lamina brilham inteiras
      spec.aura = { hex: '#ffe27a', alpha: 92, from: GLOW_ALL.has(w.id) ? undefined : [M.m, M.e] };
      spec.sparkles = [[2, 2, '#fff6c0'], [13, 13, '#c8fff8']];
    }
    WEAPON_ICONS[weaponIconId(w.id, mat)] = spec;
  }
}

// ---- escolha automatica pelo nome ----
export const normalize = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// sinonimos e grafias comuns; a ordem importa: nomes compostos antes dos simples
const WEAPON_KEYS = [
  ['faca-de-caca', ['faca de caca', 'faca']],
  ['espada-curta', ['espada curta', 'gladio']],
  ['espada-longa', ['espada longa', 'espada bastarda', 'espada']],
  ['montante', ['montante', 'espadao', 'claymore', 'espada de duas maos']],
  ['machado-de-guerra', ['machado de guerra', 'machado grande', 'machado']],
  ['machadinha', ['machadinha', 'machado de mao', 'machado pequeno']],
  ['martelo-de-guerra', ['martelo de guerra', 'marreta', 'martelo']],
  ['arco-longo', ['arco longo']],
  ['arco-curto', ['arco curto', 'arco']],
  ['besta-leve', ['besta leve', 'besta de mao']],
  ['besta', ['besta pesada', 'besta']],
  ['garras-de-ferro', ['garras de ferro', 'garras', 'garra']],
  ['manoplas', ['manoplas', 'manopla', 'soqueira', 'luvas de combate']],
  ['adaga', ['adaga', 'punhal', 'estilete']],
  ['sabre', ['sabre', 'cimitarra', 'alfange']],
  ['rapieira', ['rapieira', 'florete', 'estoque']],
  ['maca', ['maca', 'clava', 'porrete', 'tacape', 'cetro']],
  ['mangual', ['mangual', 'mangoal']],
  ['alabarda', ['alabarda', 'glaive', 'archa']],
  ['gadanha', ['gadanha', 'segadeira']],
  ['foice', ['foice']],
  ['azagaia', ['azagaia', 'dardo de arremesso', 'pilo']],
  ['lanca', ['lanca', 'pique', 'tridente', 'tridente']],
  ['chicote', ['chicote', 'acoite', 'relho']],
  ['cajado', ['cajado', 'vara magica', 'varinha']],
  ['bordao', ['bordao', 'bastao', 'basto']],
  ['escudo', ['escudo', 'broquel']],
  ['funda', ['funda', 'estilingue', 'atiradeira']],
  ['dardos', ['dardos', 'dardo', 'shuriken', 'facas de arremesso']]
];

export function weaponMaterialOf(text) {
  const t = normalize(text);
  if (/\b(ouro|dourad[oa]|encantad[oa]|magic[oa]|runic[oa]|sagrad[oa]|arcan[oa]|lendari[oa]|\+\d)/.test(t)) return 'ouro';
  if (/\b(aco|mithril|adamante|prata|refinad[oa]|obra-prima|obra prima)\b/.test(t)) return 'aco';
  return 'ferro';
}

// "Ataque: Espada longa", "espada longa de aço" -> arma-espada-longa-aco
export function weaponIdFor(text) {
  // "maçã" (fruta) e "maça" (arma) viram a mesma palavra sem acento: tira a fruta antes
  const t = ` ${normalize(String(text || '').replace(/ma[cç]ãs?/gi, 'fruta')).replace(/[^a-z0-9+]+/g, ' ')} `;
  for (const [id, keys] of WEAPON_KEYS) if (keys.some((k) => t.includes(` ${k} `))) return id;
  return null;
}

export function weaponIconFor(name, extra = '') {
  const id = weaponIdFor(name) || (extra ? weaponIdFor(extra) : null);
  return id ? weaponIconId(id, weaponMaterialOf(`${name} ${extra}`)) : null;
}
