// Blocos novos (24/10, plano de arte secoes B e C): terrenos, paredes, objetos de 1 celula e
// objetos grandes de varias celulas ("stamps"). Feitos com o pintor (paint.js), no mesmo
// estilo Stardew do resto: rampa quente, contorno sepia, luz do alto-esquerda.
// Os codigos ASCII acabaram; estes usam letras do Latin-1 (a validacao aceita ¡-ÿ).
import { canvas, tone, hash, toImages, thumbnail } from './paint.js';
import { WATER_TILES } from './water.js';
import { STAMP3D } from './objects3d.js';

const N = 16;
// Pinta 'n' imagens (variantes ou quadros) chamando fn(c, i) em cada canvas 16x16.
function images(fn, n = 3) {
  return Array.from({ length: n }, (_, i) => { const c = canvas(N, N); fn(c, i); return c; });
}
function each(c, fn) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c.set(x, y, fn(x, y)); }
const jitter = (x, y, s, a = 0.14, b = 0.86) => { const r = hash(x, y, s); return r < a ? 1 : r > b ? -1 : 0; };

// Monta o bloco no formato do catalogo. variants = escolhidas por hash; frames = animadas.
function tile(def, canvases) {
  const { images: imgs, palette } = toImages(canvases);
  const t = { solid: false, ...def, palette };
  if (def.animated) { t.frames = imgs; delete t.animated; } else if (imgs.length > 1) t.variants = imgs;
  t.pixels = imgs[0];
  return t;
}

// ---------------- terrenos ----------------
const GRASS = '#4f9a3e';
function grassBase(c, v) {
  each(c, (x, y) => tone(GRASS, 2 + jitter(x, y, v + 1)));
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(hash(i, 3, v) * N); const y = Math.floor(hash(i, 4, v) * (N - 1));
    c.set(x, y, tone(GRASS, 3)); c.set(x, y + 1, tone(GRASS, 1));
  }
}
const FLOWERS = ['#e0524c', '#ffd04a', '#f6f2ea', '#7aa0f0', '#e88ac8'];

function seco(c, v) {
  const B = '#c4963f';
  each(c, (x, y) => tone(B, 2 + jitter(x, y, v + 5, 0.12, 0.9)));
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(hash(i, 1, v + 9) * N); const y = Math.floor(hash(i, 2, v + 9) * (N - 2));
    c.set(x, y, tone(B, 3)); c.set(x, y + 1, tone(B, 2)); c.set(x, y + 2, tone(B, 0));
  }
  for (let i = 0; i < 3; i++) { const x = Math.floor(hash(i, 7, v) * 15); const y = Math.floor(hash(i, 8, v) * 15); c.set(x, y, tone('#d4703a', 3)); c.set(x + 1, y + 1, tone('#d4703a', 1)); }
}

const TERRAINS = [
  tile({ code: 'á', name: 'Grama florida', category: 'Chão', layer: 'ground' }, images((c, v) => {
    grassBase(c, v);
    for (let by = 0; by < 4; by++) for (let bx = 0; bx < 4; bx++) {
      if (hash(bx, by, v + 11) > 0.42) continue;
      const x = bx * 4 + 1 + Math.floor(hash(bx, by, v + 12) * 2); const y = by * 4 + 1 + Math.floor(hash(bx, by, v + 13) * 2);
      const f = FLOWERS[Math.floor(hash(bx, by, v + 14) * FLOWERS.length)];
      c.set(x, y - 1, tone(f, 3)); c.set(x - 1, y, tone(f, 3)); c.set(x + 1, y, tone(f, 2)); c.set(x, y + 1, tone(f, 1)); c.set(x, y, tone('#ffd04a', 4));
    }
  })),
  tile({ code: 'à', name: 'Grama seca', category: 'Chão', layer: 'ground' }, images(seco)),
  tile({ code: 'â', name: 'Terra arada', category: 'Chão', layer: 'ground' }, images((c, v) => {
    // sulcos de 5 px: crista clara e arredondada, vale escuro, borda irregular (torroes) e
    // brotinhos de vez em quando; antes eram faixas retas que pareciam tabuas
    const B = '#8a5634';
    each(c, (x, y) => {
      const wob = hash(x >> 1, Math.floor(y / 5), v) < 0.3 ? 1 : 0;
      const r = (y + wob) % 5;
      const t = [3, 2, 2, 1, 0][r] + jitter(x, y, v + 21, 0.1, 0.9);
      return tone(B, t);
    });
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(hash(i, 1, v + 3) * 15); const y = Math.floor(hash(i, 2, v + 3) * 3) * 5 + 1;
      if (i % 2) { c.set(x, y, tone('#5fa53f', 3)); c.set(x + 1, y - 1, tone('#5fa53f', 2)); c.set(x, y + 1, tone('#2b6a40', 2)); }
      else { c.set(x, y, tone(B, 4)); c.set(x + 1, y, tone(B, 3)); }
    }
  })),
  tile({ code: 'ã', name: 'Terra queimada', category: 'Chão', layer: 'ground' }, images((c, v) => {
    const B = '#4e3c3a';
    each(c, (x, y) => tone(B, 2 + jitter(x, y, v + 2, 0.18, 0.84)));
    let x = Math.floor(hash(1, 1, v) * 16); let y = 0;
    while (y < N) { c.set(x, y, tone(B, 0)); x = (x + (hash(x, y, v) < 0.5 ? 1 : 0) + 16) % 16; y++; }
    for (let i = 0; i < 4; i++) c.set(Math.floor(hash(i, 5, v) * 16), Math.floor(hash(i, 6, v) * 16), i % 2 ? '#f07c2e' : '#ffb64a');
  })),
  tile({ code: 'ä', name: 'Deserto', category: 'Chão', layer: 'ground' }, images((c, v) => {
    const B = '#e0b468';
    each(c, (x, y) => { const s = Math.sin((x * 0.55 + y * 1.35 + v * 2.1)); return tone(B, 2 + (s > 0.78 ? 1 : s < -0.86 ? -1 : 0) + (hash(x, y, v) < 0.05 ? 1 : 0)); });
  })),
  tile({ code: 'å', name: 'Cascalho', category: 'Chão', layer: 'ground' }, images((c, v) => {
    const B = '#7f7672';
    each(c, (x, y) => tone(B, 1 + jitter(x, y, v + 3, 0.2, 0.95)));
    const cols = ['#a89a8c', '#8c90a4', '#b8a890', '#9a8a7a'];
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(hash(i, 1, v + 4) * 16); const y = Math.floor(hash(i, 2, v + 4) * 16); const col = cols[i % cols.length];
      c.set(x, y, tone(col, 3)); c.set((x + 1) % 16, y, tone(col, 2)); c.set(x, (y + 1) % 16, tone(col, 1));
    }
  })),
  tile({ code: 'é', name: 'Rocha natural', category: 'Terreno', layer: 'ground' }, images((c, v) => {
    const B = '#7c7488';
    const seeds = Array.from({ length: 5 }, (_, i) => [hash(i, 1, v + 6) * 16, hash(i, 2, v + 6) * 16]);
    each(c, (x, y) => {
      const ds = seeds.map(([sx, sy]) => {
        const dx = Math.min(Math.abs(x + 0.5 - sx), 16 - Math.abs(x + 0.5 - sx));
        const dy = Math.min(Math.abs(y + 0.5 - sy), 16 - Math.abs(y + 0.5 - sy));
        return [Math.hypot(dx, dy), sx, sy];
      }).sort((a, b) => a[0] - b[0]);
      const edge = ds[1][0] - ds[0][0];
      if (edge < 0.9) return tone(B, 0);
      if (edge < 1.8) return tone(B, 1);
      const up = (y + 0.5 - ds[0][2]) < -1.2 || (x + 0.5 - ds[0][1]) < -1.6;
      return tone(B, up ? 3 : 2);
    });
  })),
  tile({ code: 'ê', name: 'Mármore xadrez', category: 'Chão', layer: 'ground' }, images((c, v) => {
    each(c, (x, y) => {
      const light = ((x >> 3) + (y >> 3)) % 2 === 0;
      const B = light ? '#e6dcc8' : '#4a4458';
      const lx = x % 8; const ly = y % 8;
      if (lx === 7 || ly === 7) return tone(B, 1);
      if (lx === 0 || ly === 0) return tone(B, 3);
      const vein = light && (lx + ly * (v + 1)) % 9 === 3 && hash(x, y, v) < 0.7;
      return tone(B, vein ? 1 : 2);
    });
  }, 2)),
  tile({ code: 'ë', name: 'Madeira podre', category: 'Chão', layer: 'ground' }, images((c, v) => {
    const B = '#6a4632';
    each(c, (x, y) => {
      const r = y % 4; const off = Math.floor(y / 4) * 5 + v * 3;
      if (r === 3 || (x + off) % 11 === 0) return tone(B, 0);
      return tone(B, (r === 0 ? 3 : 2) + (hash(x, y, v) < 0.12 ? -1 : 0));
    });
    for (let i = 0; i < 2; i++) { const x = 2 + Math.floor(hash(i, 1, v) * 11); const y = Math.floor(hash(i, 2, v) * 4) * 4 + 1; c.set(x, y, '#1e1418'); c.set(x + 1, y, '#1e1418'); c.set(x, y + 1, '#2e1e22'); }
    for (let i = 0; i < 5; i++) c.set(Math.floor(hash(i, 3, v) * 16), Math.floor(hash(i, 4, v) * 16), tone('#5a7a34', 2 + (i % 2)));
  })),
  tile({ code: 'í', name: 'Palha', category: 'Chão', layer: 'ground' }, images((c, v) => {
    const B = '#d2ae58';
    each(c, (x, y) => { const k = (x + y * 2 + Math.floor(hash(0, y, v) * 3)) % 5; return tone(B, k === 0 ? 1 : k === 2 ? 3 : k === 3 && hash(x, y, v) < 0.3 ? 4 : 2); });
  })),
  tile({ code: 'î', name: 'Tapete azul', category: 'Chão', layer: 'ground' }, images((c) => {
    each(c, (x, y) => {
      const b = Math.min(x, y, 15 - x, 15 - y);
      if (b === 0) return tone('#c49a3a', 1);
      if (b === 1) return tone('#c49a3a', 3);
      const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
      if (Math.round(d) === 5) return tone('#c49a3a', 2);
      if (d < 2) return tone('#e0524c', 3);
      return tone('#2c4a8c', (x + y) % 4 === 0 ? 3 : 2);
    });
  }, 1)),
  // mar e lodo: pintados em codigo junto com o resto da agua (water.js), 4 quadros ciclicos
  WATER_TILES['ó'],
  WATER_TILES['ô'],
  tile({ code: 'õ', name: 'Solo de cristal', category: 'Especiais', layer: 'ground', light: '#4cbcc6' }, images((c, v) => {
    const B = '#2c3048';
    each(c, (x, y) => tone(B, 2 + jitter(x, y, v + 8, 0.2, 0.9)));
    for (let i = 0; i < 3; i++) {
      const x = 2 + Math.floor(hash(i, 1, v + 2) * 11); const y = 3 + Math.floor(hash(i, 2, v + 2) * 10);
      const C = i % 2 ? '#4cbcc6' : '#9c6cd4';
      c.set(x, y - 2, tone(C, 4)); c.set(x, y - 1, tone(C, 3)); c.set(x + 1, y - 1, tone(C, 2)); c.set(x - 1, y, tone(C, 3)); c.set(x, y, tone(C, 2)); c.set(x + 1, y, tone(C, 1)); c.set(x, y + 1, tone(C, 0));
    }
  })),
  tile({ code: 'ö', name: 'Solo do Tártaro', category: 'Especiais', layer: 'ground', light: '#d0402a', animated: true }, images((c, f) => {
    const B = '#2e1618';
    each(c, (x, y) => tone(B, 2 + jitter(x, y, 4, 0.15, 0.9)));
    // veios: caminhos fixos que acendem e apagam (pulsam) a cada quadro
    for (let k = 0; k < 2; k++) {
      let x = Math.floor(hash(k, 1, 9) * 16);
      for (let y = 0; y < N; y++) { c.set(x, y, tone('#c0302a', [1, 2, 3][(f + k) % 3])); if (f === 2) c.set((x + 1) % 16, y, tone('#c0302a', 0)); x = (x + (hash(x, y, k) < 0.33 ? 1 : hash(x, y, k) > 0.66 ? 15 : 0)) % 16; }
    }
  })),
  tile({ code: 'ú', name: 'Solo de Éter', category: 'Especiais', layer: 'ground', light: '#5fd0c8', animated: true }, images((c, f) => {
    const B = '#b4c4cc';
    each(c, (x, y) => tone(B, 2 + jitter(x, y, 5, 0.12, 0.9)));
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(hash(i, 1, 11) * 16); const y = Math.floor(hash(i, 2, 11) * 16);
      const on = (i + f) % 3;
      c.set(x, y, tone('#5fd0c8', 2 + on)); if (on === 2) { c.set((x + 1) % 16, y, tone('#5fd0c8', 2)); c.set(x, (y + 1) % 16, tone('#5fd0c8', 2)); }
    }
  })),
  tile({ code: 'û', name: 'Trilha de terra', category: 'Chão', layer: 'ground' }, images((c, v) => {
    const B = '#a87a4a';
    each(c, (x, y) => tone(B, 2 + jitter(x, y, v + 12, 0.1, 0.92)));
    for (let i = 0; i < 4; i++) { const x = Math.floor(hash(i, 1, v) * 15); const y = Math.floor(hash(i, 2, v) * 15); c.set(x, y, tone('#9a8f86', 3)); c.set(x + 1, y + 1, tone('#9a8f86', 1)); }
  })),
  tile({ code: 'ü', name: 'Pedras soltas', category: 'Chão', layer: 'ground' }, images((c, v) => {
    each(c, (x, y) => tone('#8a6a44', 2 + jitter(x, y, v + 13)));
    const spots = [[4, 4], [11, 5], [6, 11], [13, 12]];
    spots.forEach(([sx, sy], i) => { if (hash(i, v, 3) < 0.85) c.ellipse(sx + (v % 2), sy, 2.6, 2, '#9a94a4'); });
  })),
  // ---- paredes ----
  tile({ code: 'ç', name: 'Cerca de pedra', category: 'Paredes', layer: 'ground', solid: true }, images((c) => {
    const B = '#8c8678';
    each(c, (x, y) => {
      const row = Math.floor(y / 4); const off = row % 2 ? 3 : 0;
      if (y % 4 === 3 || (x + off) % 6 === 5) return tone(B, 0);
      return tone(B, y % 4 === 0 ? 3 : 2);
    });
    for (let i = 0; i < 5; i++) c.set(Math.floor(hash(i, 1, 2) * 16), Math.floor(hash(i, 2, 2) * 16), tone('#5a8a34', 2));
  }, 1)),
  tile({ code: 'ñ', name: 'Sebe', category: 'Paredes', layer: 'ground', solid: true }, images((c) => {
    each(c, () => tone('#2f6a34', 1));
    for (const [x, y] of [[3, 3], [10, 2], [6, 8], [13, 9], [2, 12], [9, 14], [14, 15]]) c.ellipse(x, y, 3.4, 3, '#3f8a3a', { spec: false });
    for (let i = 0; i < 4; i++) c.set(Math.floor(hash(i, 1, 4) * 16), Math.floor(hash(i, 2, 4) * 16), tone('#e88ac8', 3));
  }, 1))
];

// ---------------- objetos de 1 celula ----------------
// Os desenhos abaixo sao a versao chapada original; o catalogo troca os pixels pela versao com
// volume 3/4 de objects3d.js (OBJ3D). Para mudar o visual, edite la.
function obj(def, draw, n = 1) {
  return tile({ layer: 'objects', ...def }, images((c, i) => { draw(c, i); c.outline(); }, n));
}
const WOOD = '#8a5a34';
const STONE = '#8a8494';

const OBJECTS = [
  obj({ code: 'Á', name: 'Correntes', category: 'Masmorra' }, (c) => {
    for (let i = 0; i < 6; i++) { const x = 2 + i * 2; const y = 9 + Math.round(Math.sin(i * 0.9) * 2); c.rect(x, y, x + 1, y + 1, '#8a90a0'); c.set(x, y, tone('#8a90a0', 4)); }
  }),
  obj({ code: 'À', name: 'Cruz de túmulo', category: 'Masmorra', solid: true }, (c) => {
    c.ellipse(8, 13.5, 6, 2, '#6a4a30', { spec: false });
    c.rect(7, 3, 8, 13, WOOD); c.rect(4, 6, 11, 7, WOOD);
  }),
  obj({ code: 'Â', name: 'Banco', category: 'Mobília', solid: true }, (c) => {
    c.rect(1, 7, 14, 9, WOOD); c.rect(1, 4, 14, 5, WOOD, { bias: 0.3 });
    c.rect(2, 10, 3, 13, WOOD, { bias: -0.5 }); c.rect(12, 10, 13, 13, WOOD, { bias: -0.5 });
  }),
  obj({ code: 'Ã', name: 'Ninho', category: 'Natureza' }, (c) => {
    c.ellipse(8, 10, 6.5, 3.5, '#8a6a3a', { spec: false });
    c.ellipse(8, 9.5, 4.2, 2, '#4a3424', { spec: false });
    for (const [x, col] of [[6, '#e8e0c8'], [8.5, '#bcd8e8'], [10.5, '#e8e0c8']]) c.ellipse(x, 8.5, 1.4, 1.7, col);
  }),
  obj({ code: 'Ä', name: 'Pedra rúnica', category: 'Especiais', solid: true, light: '#5fc4c0' }, (c) => {
    c.shape((x, y) => y >= 2 && y <= 14 && x >= 4 + (y < 4 ? 1 : 0) && x <= 11 - (y < 4 ? 1 : 0), STONE);
    for (const [x, y] of [[7, 5], [8, 6], [7, 7], [9, 8], [7, 9], [8, 10]]) c.set(x, y, tone('#5fc4c0', 4));
  }),
  obj({ code: 'Å', name: 'Sangue no chão', category: 'Masmorra' }, (c) => {
    c.ellipse(8, 10, 5, 2.6, '#8a1a2a', { spec: false }); c.ellipse(4, 7, 1.5, 1, '#8a1a2a', { spec: false }); c.ellipse(12, 12.5, 1.6, 1, '#8a1a2a', { spec: false });
    c.set(7, 9, tone('#8a1a2a', 4));
  }),
  obj({ code: 'É', name: 'Pedra lunar', category: 'Especiais', solid: true, light: '#bcd8f0' }, (c) => {
    c.ellipse(8, 10, 5.5, 4.5, '#a8bcd8'); c.set(6, 8, tone('#ffffff', 2)); c.set(7, 7, tone('#ffffff', 2));
  }),
  obj({ code: 'Ê', name: 'Vaso de flores', category: 'Decoração', solid: true }, (c, i) => {
    c.shape((x, y) => y >= 9 && y <= 14 && x >= 4 + (y > 12 ? 1 : 0) && x <= 11 - (y > 12 ? 1 : 0), '#b8603a');
    c.rect(4, 8, 11, 9, '#b8603a', { bias: 0.4 });
    c.ellipse(8, 6, 4.5, 3, '#3f8a3a', { spec: false });
    const F = ['#e0524c', '#ffd04a', '#e88ac8'][i];
    for (const [x, y] of [[6, 4], [9, 5], [8, 3], [11, 6]]) c.set(x, y, tone(F, 3));
  }, 3),
  obj({ code: 'Ë', name: 'Caixa de correio', category: 'Construções', solid: true }, (c) => {
    c.rect(7, 8, 8, 14, WOOD); c.shape((x, y) => y >= 3 && y <= 8 && x >= 4 && x <= 11 && !(y === 3 && (x === 4 || x === 11)), '#3e5e86');
    c.rect(11, 3, 12, 5, '#c0403a');
  }),
  obj({ code: 'Í', name: 'Lampião', category: 'Decoração', solid: true, light: '#ffc46a' }, (c) => {
    c.rect(7, 6, 8, 14, '#3a3c48'); c.rect(5, 14, 10, 15, '#3a3c48');
    c.rect(5, 1, 10, 5, '#3a3c48'); c.rect(6, 2, 9, 4, '#ffd27a', { flat: true }); c.set(6, 2, '#fff2c0');
  }),
  obj({ code: 'Î', name: 'Sacos', category: 'Mobília', solid: true }, (c) => {
    c.ellipse(5.5, 10.5, 4, 4.5, '#c8a870'); c.ellipse(10.5, 11.5, 4, 3.5, '#b8985e');
    c.set(5, 6, tone('#8a6a3a', 1)); c.set(6, 6, tone('#8a6a3a', 1));
  }),
  obj({ code: 'Ï', name: 'Colmeia', category: 'Natureza', solid: true }, (c) => {
    c.rect(7, 12, 8, 15, WOOD);
    for (let k = 0; k < 4; k++) c.ellipse(8, 4 + k * 2.2, 3 + k * 0.9, 1.4, '#d8a040', { spec: false });
    c.set(7, 10, '#3a2418'); c.set(8, 10, '#3a2418');
    c.set(12, 3, '#ffd04a'); c.set(3, 5, '#ffd04a');
  }),
  obj({ code: 'Ð', name: 'Espantalho', category: 'Natureza', solid: true }, (c) => {
    c.rect(7, 6, 8, 15, WOOD); c.rect(2, 7, 13, 8, WOOD);
    c.rect(5, 7, 10, 11, '#6a8ab0'); c.ellipse(7.5, 4, 2.5, 2.3, '#e0c890');
    c.rect(4, 1, 11, 2, '#c49a3a'); c.rect(6, 0, 9, 1, '#c49a3a');
    c.set(2, 9, '#d2ae58'); c.set(13, 9, '#d2ae58');
  }),
  obj({ code: 'Ñ', name: 'Canteiro', category: 'Natureza' }, (c, i) => {
    c.rect(1, 4, 14, 14, '#6a4a2e');
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
      const x = 3 + k * 3; const y = 6 + r * 3;
      const G = i === 2 ? '#e0524c' : '#5fa53f';
      c.set(x, y, tone('#5fa53f', 3)); c.set(x + 1, y - 1, tone('#5fa53f', 2)); if (i > 0) c.set(x, y - 1, tone(G, 3));
    }
  }, 3),
  obj({ code: 'Ò', name: 'Lápide antiga', category: 'Masmorra', solid: true }, (c, i) => {
    c.shape((x, y) => { const dx = x + 0.5 - 8; const dy = y + 0.5 - 7; return y >= 3 && y <= 14 && Math.abs(dx) <= 4.5 && (y > 7 || dx * dx + dy * dy <= 22); }, i ? '#7a8478' : STONE);
    c.rect(6, 7, 9, 7, tone(STONE, 0), { flat: true, bias: -2 });
    if (i) for (let k = 0; k < 4; k++) c.set(4 + Math.floor(hash(k, 1, 3) * 8), 4 + Math.floor(hash(k, 2, 3) * 9), tone('#5a8a34', 2));
  }, 2),
  obj({ code: 'Ó', name: 'Vaso de barro', category: 'Decoração', solid: true }, (c) => {
    c.ellipse(8, 10, 4.5, 4.5, '#c06a3a'); c.rect(6, 3, 9, 5, '#c06a3a'); c.rect(5, 2, 10, 2, '#c06a3a', { bias: 0.5 });
    c.rect(4, 9, 11, 9, tone('#3a2418', 2), { flat: true });
  })
];

// ---------------- objetos grandes (stamps) ----------------
// big: imagem maior que a celula. foot: celulas que bloqueiam (relativas a ancora, que e a
// celula de baixo a esquerda). O resto do sprite e so desenho (copa, telhado, pas do moinho).
function stamp(def, w, h, draw, fw = 2, fh = 1) {
  const c = canvas(w, h);
  draw(c);
  c.outline();
  const thumb = thumbnail(c);
  const { images: imgs, palette } = toImages([thumb]);
  const foot = [];
  for (let dy = 0; dy > -fh; dy--) for (let dx = 0; dx < fw; dx++) foot.push([dx, dy]);
  return { layer: 'objects', solid: true, ...def, pixels: imgs[0], palette, big: c, foot, span: [fw, fh] };
}

const STAMPS = [
  stamp({ code: 'Ô', name: 'Poço de pedra', category: 'Construções' }, 32, 40, STAMP3D['Ô'], 2, 2),
  stamp({ code: 'Õ', name: 'Moinho', category: 'Construções', light: null }, 48, 72, STAMP3D['Õ'], 3, 2),
  stamp({ code: 'Ö', name: 'Barraca de feira', category: 'Construções' }, 34, 36, STAMP3D['Ö'], 2, 1),
  stamp({ code: 'Ø', name: 'Carroça', category: 'Construções' }, 36, 28, STAMP3D['Ø'], 2, 1),
  stamp({ code: 'Ù', name: 'Barco', category: 'Construções' }, 48, 30, STAMP3D['Ù'], 3, 1),
  stamp({ code: 'Ú', name: 'Fonte', category: 'Construções' }, 32, 34, STAMP3D['Ú'], 2, 2),
  stamp({ code: 'Û', name: 'Estátua grande', category: 'Decoração' }, 32, 48, STAMP3D['Û'], 2, 1),
  stamp({ code: 'Ü', name: 'Forja', category: 'Construções', light: '#eb7a34' }, 32, 36, STAMP3D['Ü'], 2, 2),
  stamp({ code: 'Ý', name: 'Tenda grande', category: 'Construções' }, 48, 40, STAMP3D['Ý'], 3, 2),
  stamp({ code: 'Þ', name: 'Pedra grande', category: 'Natureza' }, 32, 28, STAMP3D['Þ'], 2, 1)
];

// Arvores novas: desenhadas pelo gerador de arvores do compose.js (copa por cima, 2x3 celulas).
export const TREE_KINDS = {
  'ð': { name: 'Carvalho grande', big: true },
  'ò': { name: 'Macieira', fruit: '#d8343a' },
  'ù': { name: 'Cerejeira' },
  'ý': { name: 'Palmeira' }
};
const TREES = Object.entries(TREE_KINDS).map(([code, k]) => {
  const c = canvas(16, 16);
  const leaf = code === 'ù' ? '#e8a0c0' : code === 'ý' ? '#5fa53f' : '#468c3a';
  if (code === 'ý') { c.rect(7, 6, 8, 15, '#a07246'); for (const [dx, dy] of [[-5, 2], [5, 2], [-4, -1], [4, -1], [0, -2]]) c.line(8, 5, 8 + dx, 5 + dy, leaf); }
  else { c.rect(7, 10, 8, 15, '#7d4a2e'); c.ellipse(8, 6, 6.5, 5.5, leaf); if (k.fruit) for (const [x, y] of [[5, 5], [10, 7], [7, 9]]) c.set(x, y, k.fruit); }
  c.outline();
  const { images: imgs, palette } = toImages([c]);
  return { code, name: k.name, category: 'Natureza', layer: 'objects', solid: true, pixels: imgs[0], palette, tree: true };
});

export const MORE_TILES = [...TERRAINS, ...OBJECTS, ...STAMPS, ...TREES];

// Repintura (auditoria 24/10): terrenos antigos que estavam chapados ganham textura rica e 3
// variantes. So troca a imagem e a paleta; codigo, nome e regras continuam iguais.
export const REPAINT = {
  ',': images((c, v) => {
    const B = '#8a5a36';
    each(c, (x, y) => tone(B, 2 + jitter(x, y, v + 30, 0.16, 0.86)));
    for (let i = 0; i < 6; i++) { const x = Math.floor(hash(i, 1, v + 31) * 15); const y = Math.floor(hash(i, 2, v + 31) * 15); c.set(x, y, tone(B, 0)); c.set(x + 1, y, tone(B, 1)); c.set(x, y - 1 < 0 ? 0 : y - 1, tone(B, 3)); }
    for (let i = 0; i < 2; i++) c.set(Math.floor(hash(i, 3, v) * 16), Math.floor(hash(i, 4, v) * 16), tone('#9a8f86', 3));
  }),
  ':': images((c, v) => {
    const B = '#e6c486';
    each(c, (x, y) => { const s = Math.sin(x * 0.4 + y * 0.9 + v * 1.7); return tone(B, 2 + (s > 0.85 ? 1 : 0) + (hash(x, y, v + 32) < 0.08 ? -1 : 0)); });
    for (let i = 0; i < 3; i++) c.set(Math.floor(hash(i, 1, v + 33) * 16), Math.floor(hash(i, 2, v + 33) * 16), tone('#c49a6a', 1));
  }),
  '*': images((c, v) => {
    // neve: branco com sombras suaves de monte (elipses azuladas espalhadas), nada de blocos
    const B = '#dce6f4';
    each(c, (x, y) => tone(B, 2 + (hash(x, y, v + 34) < 0.08 ? 1 : 0)));
    if (v !== 1) c.ellipse(4 + v * 4, 10, 4, 1.6, '#c0cce4', { spec: false, bias: -0.5 });
    for (let i = 0; i < 4; i++) c.set(Math.floor(hash(i, 1, v + 36) * 16), Math.floor(hash(i, 2, v + 36) * 16), '#ffffff');
  }),
  '%': images((c, v) => {
    const B = '#56683a';
    each(c, (x, y) => tone(B, 2 + jitter(x, y, v + 37, 0.2, 0.85)));
    if (v === 0) c.ellipse(5, 6, 3.2, 1.8, '#3a5034', { spec: false });
    if (v === 2) c.ellipse(11, 11, 3.6, 2, '#3a5034', { spec: false });
    for (let i = 0; i < 3; i++) { const x = Math.floor(hash(i, 1, v + 38) * 15); const y = Math.floor(hash(i, 2, v + 38) * 13) + 2; c.set(x, y, tone('#7a8a4c', 3)); c.set(x, y - 1, tone('#7a8a4c', 3)); if (i === 0) c.set(x, y - 2, tone('#5a3a28', 2)); }
  }),
  'I': images((c, v) => {
    const B = '#b8daf0';
    each(c, (x, y) => tone(B, 2 + (hash(x, y, v + 39) < 0.06 ? 1 : 0)));
    // so uma variante tem rachadura (antes toda celula repetia o mesmo zigue-zague)
    if (v === 0) { let x = 3 + Math.floor(hash(1, 1, v) * 8); for (let y = 2; y < 12; y++) { c.set(x, y, tone(B, 0)); x += hash(x, y, v + 40) < 0.5 ? 1 : -1; } }
    for (let i = 0; i < 2; i++) { const sx = Math.floor(hash(i, 1, v + 41) * 13); const sy = Math.floor(hash(i, 2, v + 41) * 14); c.set(sx, sy, '#ffffff'); c.set(sx + 1, sy, tone(B, 4)); c.set(sx + 2, sy, tone(B, 4)); }
  }),
  j: images((c, v) => {
    const B = '#5e4030';
    each(c, (x, y) => tone(B, 2 + jitter(x, y, v + 42, 0.18, 0.86)));
    if (v !== 1) { const px = 4 + v * 3; const py = 5 + v * 2; c.ellipse(px, py, 3, 1.6, '#3e2c26', { spec: false }); c.set(px - 1, py - 1, tone('#8ab0c8', 3)); }
    for (let i = 0; i < 3; i++) c.set(Math.floor(hash(i, 1, v + 43) * 16), Math.floor(hash(i, 2, v + 43) * 16), tone(B, 0));
  }),
  z: images((c, v) => {
    const B = '#5a5458';
    each(c, (x, y) => tone(B, 2 + jitter(x, y, v + 43, 0.22, 0.8)));
    for (let i = 0; i < 3; i++) c.set(Math.floor(hash(i, 1, v + 44) * 16), Math.floor(hash(i, 2, v + 44) * 16), i ? '#d4703a' : '#ffb64a');
    for (let i = 0; i < 4; i++) c.set(Math.floor(hash(i, 3, v + 44) * 16), Math.floor(hash(i, 4, v + 44) * 16), tone('#e8e0d8', 3));
  }),
  '@': images((c, v) => {
    // abismo: escuridao funda com nevoa fraca; a borda vem da mistura de terrenos
    each(c, (x, y) => tone('#1a1426', hash(x, y, v + 45) < 0.06 ? 1 : 0));
    for (let i = 0; i < 2; i++) { const x = Math.floor(hash(i, 1, v + 46) * 14); const y = Math.floor(hash(i, 2, v + 46) * 16); c.set(x, y, tone('#3a3a6a', 2)); c.set(x + 1, y, tone('#3a3a6a', 1)); }
  })
};
// Terrenos naturais que entram na mistura de bordas (compose.js), com a precedencia dita no plano.
export const NATURAL_GROUND = ['ó', 'ô', 'ä', 'å', 'û', 'â', 'ã', 'é', 'ü', 'à', 'á'];
