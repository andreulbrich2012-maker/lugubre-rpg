// Objetos do mapa redesenhados com volume (24/10, pedido do Andre: "tudo que nao e chao tem
// que parecer 3D"). Projecao 3/4 como no Stardew (referencia, nunca copia): tampo claro em
// cima, frente mais escura, luz do alto-esquerda, contorno sepia. So muda pixels: codigo,
// camada, solid, pegada e numero de quadros/variantes continuam os do catalogo.
import { canvas, tone, hash } from './paint.js';
import { box, cyl, blob, cone, post, extrude } from './solid.js';

const WOOD = '#9e6635';
const WOOD_D = '#7d4a2e';
const WOOD_L = '#c08746';
const STONE = '#8a8494';
const STONE_L = '#a8a2b4';
const IRON = '#6a6c7c';
const GOLD = '#e4ae3c';
const WATER = '#2c6cb0';
const T = (hex, t) => tone(hex, Math.max(0, Math.min(4, Math.round(t))));

// tabuas: frente com juntas horizontais, tampo com juntas verticais
const planks = (step = 3, top = 4) => (face, lx, ly) => (face === 'front' ? (ly % step === step - 1 ? -1 : 0) : (lx % top === top - 1 ? -1 : 0));
// pedra aparelhada (frente): fiadas de 3 px desencontradas
const bricks = (face, lx, ly) => (face === 'front' ? ((ly % 3 === 2 || (lx + (Math.floor(ly / 3) % 2) * 3) % 6 === 5) ? -1 : 0) : 0);

// Chama de 3 quadros: (cx, yb) = base, h = altura, w = meia largura; f muda a ponta.
function flame(c, cx, yb, h, w, f) {
  const sway = [0, 1, -1, 0, 1][f % 5];
  for (let y = 0; y < h; y++) {
    const k = y / h;
    const half = w * (1 - k * k) * (y === 0 ? 0.8 : 1);
    const mid = cx + sway * k;
    for (let x = Math.floor(mid - half); x <= Math.ceil(mid + half - 1); x++) {
      const d = Math.abs(x + 0.5 - mid) / Math.max(half, 0.5);
      const col = d < 0.35 && k < 0.6 ? '#ffe48a' : d < 0.7 ? '#ffb64a' : k > 0.6 ? '#f07c2e' : '#d4482c';
      c.set(x, yb - y, col);
    }
  }
  c.set(cx + sway, yb - h, '#ffb64a');
  if (f % 3 === 2) c.set(cx - sway * 2 - 1, yb - h - 1, '#ffe48a');
}

// Cada entrada: [quantidade de imagens, desenho(c, i)]. O contorno e posto depois.
export const OBJ3D = {
  // ---------- construcoes ----------
  p: [1, (c) => {
    // poco pequeno: esteios e sarilho atras, cilindro de pedra com boca de agua na frente
    post(c, 1, 1, 9, WOOD); post(c, 13, 1, 9, WOOD);
    box(c, 1, 0, 14, 1, 1, WOOD_D, { lip: false });
    c.set(8, 2, tone('#d8c8a0', 2)); c.set(8, 3, tone('#d8c8a0', 1));
    cyl(c, 8, 4, 7, 3, 5, STONE, {
      top: STONE_L, hole: WATER, rim: 0.28, holeLift: 0.8,
      band: (ly, nx) => {
        if (ly % 3 === 2) return -1;
        const u = (nx + 1) * 3 + (Math.floor(ly / 3) % 2) * 0.5;
        return u - Math.floor(u) < 0.18 ? -1 : 0;
      }
    });
    c.set(6, 7, tone('#5cb8e0', 4)); c.set(7, 7, tone('#5cb8e0', 3)); c.set(10, 8, tone('#5cb8e0', 2));
    box(c, 7, 4, 3, 1, 2, WOOD_D, { top: WOOD_L });
  }],

  // ---------- mobilia ----------
  u: [1, (c) => {
    // barril: cilindro com aros de ferro e tampa de tabuas
    cyl(c, 8, 1, 5.5, 2.2, 10, WOOD, {
      top: WOOD_L,
      paint: (ly) => (ly === 1 || ly === 8 ? IRON : null),
      band: (ly, nx) => (ly === 1 || ly === 8 ? 0.6 : Math.abs(Math.round(nx * 3) - nx * 3) < 0.12 ? -0.6 : 0)
    });
    c.set(6, 2, tone(WOOD_L, 1)); c.set(9, 3, tone(WOOD_L, 1));
  }],
  q: [1, (c) => {
    // caixote: tampo de tabuas, frente com moldura e travessa diagonal
    box(c, 2, 2, 12, 4, 9, WOOD, {
      top: WOOD_L,
      tex: (f, lx, ly) => {
        if (f === 'top') return lx % 4 === 3 ? -1 : 0;
        if (lx <= 1 || lx >= 10 || ly <= 1 || ly >= 7) return lx >= 10 ? 0 : 0.7;
        return Math.abs((lx - 1) - (ly - 1) * 1.1) < 1 ? 0.7 : Math.abs((lx - 1) - (ly - 1) * 1.1) < 2 ? -0.6 : 0;
      }
    });
  }],
  C: [1, (c) => {
    // bau: tampa abaulada (tampo) + frente com cintas douradas e fechadura
    box(c, 2, 3, 12, 4, 8, WOOD, {
      top: WOOD_L, round: true,
      tex: (f, lx, ly) => {
        if (f === 'top') return lx % 4 === 3 ? -0.6 : 0;
        if (ly === 2) return -1.4;
        return 0;
      }
    });
    for (const x of [3, 12]) for (let y = 3; y <= 14; y++) if (c.get(x, y)) c.set(x, y, tone(GOLD, y < 7 ? 3 : y === 14 ? 1 : 2));
    for (let x = 2; x <= 13; x++) c.set(x, 7, tone(GOLD, x === 13 ? 1 : 3));
    box(c, 7, 8, 2, 1, 3, GOLD); c.set(7, 10, tone('#3a2418', 1));
  }],
  n: [1, (c) => {
    // mesa: tampo largo visto de cima, saia na frente, pernas
    post(c, 2, 9, 14, WOOD_D); post(c, 12, 9, 14, WOOD_D);
    box(c, 1, 3, 14, 6, 2, WOOD, { top: WOOD_L, tex: (f, lx) => (f === 'top' && lx % 5 === 4 ? -0.7 : 0) });
    c.set(4, 5, tone('#f4dda2', 4)); c.set(5, 5, tone('#f4dda2', 3));
  }],
  h: [1, (c) => {
    // cadeira: encosto atras, assento visto de cima, pernas
    box(c, 4, 1, 8, 1, 6, WOOD, { top: WOOD_L, tex: (f, lx) => (f === 'front' && (lx === 3 || lx === 4) ? -1 : 0) });
    post(c, 4, 10, 14, WOOD_D); post(c, 10, 10, 14, WOOD_D);
    box(c, 3, 7, 10, 3, 2, WOOD, { top: WOOD_L });
  }],
  Â: [1, (c) => {
    // banco de praca: encosto de ripas, assento, pes
    box(c, 1, 2, 14, 1, 4, WOOD, { top: WOOD_L, tex: (f, lx, ly) => (f === 'front' && ly === 1 ? -1 : 0) });
    post(c, 2, 9, 14, WOOD_D); post(c, 12, 9, 14, WOOD_D);
    box(c, 1, 7, 14, 3, 2, WOOD, { top: WOOD_L });
  }],

  // ---------- tumulos ----------
  t: [1, (c) => {
    // lapide: laje arredondada com espessura (tampo curvo), base e cruz gravada
    box(c, 2, 11, 12, 2, 2, STONE, { top: '#7a8a4c' });
    const arch = (x, y) => { const dx = x + 0.5 - 8; const dy = y + 0.5 - 6.5; return y >= 2 && y <= 11 && Math.abs(dx) <= 4.6 && (y > 6 || dx * dx + dy * dy <= 22); };
    extrude(c, arch, 2, STONE, { top: STONE_L });
    c.set(7, 6, tone(STONE, 0)); c.set(8, 6, tone(STONE, 1)); c.set(7, 7, tone(STONE, 0)); c.set(6, 7, tone(STONE, 0)); c.set(8, 7, tone(STONE, 0)); c.set(7, 8, tone(STONE, 0)); c.set(7, 9, tone(STONE, 0));
  }],
  Ò: [2, (c, i) => {
    const col = i ? '#7a8478' : STONE;
    const arch = (x, y) => { const dx = x + 0.5 - 8; const dy = y + 0.5 - 7; return y >= 3 && y <= 13 && Math.abs(dx) <= 4.6 && (y > 7 || dx * dx + dy * dy <= 22); };
    extrude(c, arch, 2, col, { top: i ? '#9aa496' : STONE_L });
    for (let x = 6; x <= 9; x++) c.set(x, 7, tone(col, 0));
    if (i) for (let k = 0; k < 5; k++) c.set(4 + Math.floor(hash(k, 1, 3) * 8), 2 + Math.floor(hash(k, 2, 3) * 11), tone('#5a8a34', 2 + (k % 2)));
    c.set(3, 14, tone('#5a8a34', 3)); c.set(12, 14, tone('#5a8a34', 2));
  }],
  À: [1, (c) => {
    // cruz de madeira sobre monte de terra
    blob(c, 8, 13, 6, 2.2, '#7d5a3a', { spec: false });
    const cross = (x, y) => (x >= 7 && x <= 8 && y >= 3 && y <= 13) || (x >= 4 && x <= 11 && y >= 6 && y <= 7);
    extrude(c, cross, 1, WOOD, { top: WOOD_L });
  }],

  // ---------- cerca ----------
  '+': [1, (c) => {
    // cerca: duas tabuas atravessando a celula (emenda com a vizinha) e moiroes com topo
    box(c, 0, 4, 16, 1, 2, WOOD, { top: WOOD_L });
    box(c, 0, 9, 16, 1, 2, WOOD, { top: WOOD_L });
    for (const x of [2, 11]) box(c, x, 1, 3, 2, 12, WOOD_D, { top: WOOD_L, tex: (f, lx, ly) => (f === 'front' && ly === 2 && lx === 1 ? -1 : 0) });
  }],

  // ---------- postes ----------
  Í: [1, (c) => {
    // lampiao: pe, poste e lanterna de vidro aceso com chapeu
    box(c, 5, 12, 6, 2, 1, IRON);
    post(c, 7, 6, 12, '#4a4c5a');
    box(c, 4, 0, 8, 2, 1, IRON);
    box(c, 5, 3, 6, 0, 4, '#ffd27a', { tex: (f, lx, ly) => (lx === 0 || lx === 5 ? -2 : ly === 0 ? 1 : 0.6) });
    c.set(6, 4, '#fff2c0');
  }],

  // ---------- mobilia (2) ----------
  E: [1, (c) => {
    // estante: caixa alta, tampo fino em cima, prateleiras com lombadas coloridas na frente
    box(c, 2, 1, 12, 2, 12, WOOD_D, { top: WOOD_L });
    const BOOKS = ['#c0403a', '#3e6e94', '#5fa53f', '#e4ae3c', '#9c6cd4', '#d8c8a0'];
    for (const sy of [4, 8]) {
      for (let x = 3; x <= 12; x++) c.set(x, sy, tone(WOOD_D, 0));
      for (let x = 3; x <= 12; x++) {
        const b = BOOKS[Math.floor(hash(x, sy, 2) * BOOKS.length)];
        const hgt = hash(x, sy, 3) < 0.2 ? 2 : 3;
        for (let k = 0; k < hgt; k++) c.set(x, sy + 3 - k, tone(b, k === hgt - 1 ? 3 : x === 12 ? 1 : 2));
      }
      for (let x = 3; x <= 12; x++) c.set(x, sy + 4, tone(WOOD, 3));
    }
  }],
  e: [1, (c) => {
    // cama: cabeceira atras, colchao visto de cima (lencol, travesseiro, coberta dobrada), pe na frente
    box(c, 2, 0, 12, 1, 3, WOOD_D, { top: WOOD_L });
    box(c, 2, 4, 12, 9, 2, WOOD, { top: '#f0e6d0' });
    blob(c, 8, 5.6, 4, 1.6, '#f6f2ea', { spec: false });
    box(c, 2, 8, 12, 5, 2, '#c0403a', { top: '#d8584c', tex: (f, lx, ly) => (f === 'top' && ly === 0 ? 1 : 0) });
    for (let x = 2; x <= 13; x++) c.set(x, 8, T('#f0e6d0', x === 13 ? 2 : 4));
  }],
  K: [1, (c) => {
    // trono: encosto alto de veludo com moldura dourada, bracos e assento
    box(c, 3, 0, 10, 1, 9, GOLD, { top: '#ffe27c' });
    box(c, 5, 2, 6, 0, 6, '#ac3440', { tex: (f, lx) => (lx === 0 ? 0.6 : 0) });
    c.set(7, 1, tone('#c0403a', 3)); c.set(8, 1, tone('#c0403a', 2));
    box(c, 4, 9, 8, 2, 3, '#ac3440', { top: '#d8584c', front: GOLD });
    box(c, 1, 7, 3, 3, 4, GOLD, { top: '#ffe27c' });
    box(c, 12, 7, 3, 3, 4, GOLD, { top: '#ffe27c' });
  }],
  '&': [1, (c) => {
    // armario de armas: caixa alta com espada, machado e lanca pendurados na frente
    box(c, 2, 1, 12, 2, 12, WOOD_D, { top: WOOD_L, tex: (f, lx, ly) => (f === 'front' && (lx === 0 || lx === 11 || ly === 0 || ly === 11) ? 0.8 : 0) });
    for (let y = 4; y <= 12; y++) for (let x = 3; x <= 12; x++) c.set(x, y, tone(WOOD_D, y === 4 ? 0 : 1));
    for (let y = 5; y <= 12; y++) c.set(5, y, tone('#c4ccd6', y === 5 ? 4 : 3));
    c.set(4, 9, tone(GOLD, 3)); c.set(6, 9, tone(GOLD, 2));
    for (let y = 5; y <= 12; y++) c.set(9, y, tone(WOOD, 3));
    c.set(10, 5, tone('#c4ccd6', 4)); c.set(10, 6, tone('#c4ccd6', 3)); c.set(11, 6, tone('#c4ccd6', 2)); c.set(10, 7, tone('#c4ccd6', 2));
    c.set(12, 5, tone('#c4ccd6', 4)); for (let y = 6; y <= 12; y++) c.set(12, y, tone(WOOD, 2));
  }],
  7: [1, (c) => {
    // prateleira de pocoes: duas tabuas com frascos (cada frasco com brilho e rolha)
    box(c, 2, 1, 12, 2, 12, WOOD_D, { top: WOOD_L });
    for (let y = 4; y <= 13; y++) for (let x = 3; x <= 12; x++) c.set(x, y, tone(WOOD_D, 1));
    for (const sy of [8, 13]) for (let x = 3; x <= 12; x++) c.set(x, sy, tone(WOOD, x === 12 ? 2 : 3));
    const POT = ['#c0403a', '#3a92cc', '#5fa53f', '#9c6cd4', '#e4ae3c'];
    let k = 0;
    for (const sy of [8, 13]) for (let x = 4; x <= 11; x += 3) {
      const col = POT[k++ % POT.length];
      c.set(x, sy - 3, tone(WOOD_L, 3)); c.set(x, sy - 2, tone(col, 4)); c.set(x + 1, sy - 2, tone(col, 2)); c.set(x, sy - 1, tone(col, 3)); c.set(x + 1, sy - 1, tone(col, 1));
    }
  }],
  4: [1, (c) => {
    // mesa de alquimia: mesa com frascos de pe (cilindros pequenos) e um livro aberto
    post(c, 2, 10, 14, WOOD_D); post(c, 12, 10, 14, WOOD_D);
    box(c, 1, 5, 14, 4, 2, WOOD, { top: WOOD_L });
    cyl(c, 4, 1, 1.6, 0.8, 4, '#5fa53f', { top: '#bcd96c' });
    cyl(c, 8, 3, 1.4, 0.7, 2, '#9c6cd4', { top: '#caa4f2' });
    box(c, 10, 5, 4, 2, 1, '#e8dcc0'); c.set(11, 5, tone('#3a2418', 2)); c.set(12, 6, tone('#3a2418', 2));
    c.set(4, 0, tone(WOOD_L, 2));
  }],
  // ---------- masmorra ----------
  1: [1, (c) => {
    // pilar: fuste cilindrico com capitel e base quadrados
    box(c, 3, 11, 10, 2, 2, STONE, { top: STONE_L });
    cyl(c, 8, 2, 3.5, 1.3, 10, STONE_L, { band: (ly, nx) => (Math.abs(nx) > 0.25 && Math.abs(nx) < 0.45 ? -0.5 : 0) });
    box(c, 3, 0, 10, 2, 2, STONE, { top: STONE_L });
  }],
  2: [1, (c) => {
    // sarcofago: caixa de pedra comprida com tampa entalhada (figura de maos postas)
    box(c, 3, 1, 10, 9, 4, STONE, { top: STONE_L, round: true, tex: bricks });
    blob(c, 8, 3, 2, 1.6, STONE_L, { spec: false });
    for (let y = 5; y <= 8; y++) { c.set(6, y, tone(STONE_L, 2)); c.set(9, y, tone(STONE_L, 1)); }
    c.set(7, 5, tone(GOLD, 3)); c.set(8, 5, tone(GOLD, 2));
  }],
  a: [1, (c) => {
    // altar: bloco de pedra com toalha vermelha caindo na frente e duas velas acesas
    box(c, 1, 6, 14, 4, 5, STONE, { top: STONE_L, tex: bricks });
    box(c, 5, 6, 6, 4, 4, '#ac3440', { top: '#d8584c', lip: false });
    for (const x of [2, 12]) { box(c, x, 3, 2, 1, 3, '#f0e6d0'); c.set(x, 2, '#ffb64a'); c.set(x, 1, '#ffe48a'); }
    c.set(8, 12, T(GOLD, 3)); c.set(7, 12, T(GOLD, 2));
  }],
  '[': [1, (c) => {
    // jaula: tampo de grade, barras na frente sobre fundo escuro
    box(c, 2, 2, 12, 3, 10, '#2a2230', { top: '#3a3040', lip: false });
    for (let x = 2; x <= 13; x++) { c.set(x, 2, tone(IRON, 3)); c.set(x, 4, tone(IRON, 3)); c.set(x, 14, tone(IRON, 1)); c.set(x, 5, tone(IRON, 2)); }
    for (let x = 2; x <= 13; x += 3) { for (let y = 2; y <= 4; y++) c.set(x, y, tone(IRON, 3)); for (let y = 5; y <= 14; y++) { c.set(x, y, tone(IRON, x === 2 ? 4 : 3)); c.set(x + 1, y, tone(IRON, 1)); } }
    c.set(9, 12, tone('#d8c6a2', 3)); c.set(10, 12, tone('#d8c6a2', 2)); c.set(6, 13, tone('#d8c6a2', 3));
  }],
  9: [1, (c) => {
    // armadura no suporte: elmo, peitoral redondo, ombreiras, haste e pe
    box(c, 4, 13, 8, 1, 1, WOOD_D, { top: WOOD });
    post(c, 7, 10, 13, WOOD);
    blob(c, 8, 7.5, 4, 3.6, '#a8b0c0');
    blob(c, 3.8, 5.5, 2, 1.6, '#a8b0c0'); blob(c, 12.2, 5.5, 2, 1.6, '#a8b0c0');
    cyl(c, 8, 0, 2.6, 1.2, 3, '#a8b0c0', { top: '#c4ccd6' });
    c.set(7, 3, tone(IRON, 0)); c.set(8, 3, tone(IRON, 0)); c.set(9, 3, tone(IRON, 0));
    c.set(8, 7, tone('#ac3440', 3)); c.set(8, 8, tone('#ac3440', 2));
  }],
  S: [1, (c) => {
    // estatua: pedestal em caixa e figura de pedra arredondada (corpo, cabeca, ombros)
    box(c, 3, 10, 10, 2, 3, STONE, { top: STONE_L });
    blob(c, 8, 7, 3.6, 3.4, STONE_L, { flatBottom: 0.8 });
    blob(c, 8, 2.6, 2.1, 2.1, STONE_L);
    blob(c, 4.6, 5.6, 1.4, 1.6, STONE_L, { spec: false }); blob(c, 11.4, 5.6, 1.4, 1.6, STONE_L, { spec: false });
  }],
  Ä: [1, (c) => {
    // pedra runica: menir com espessura no topo e runas brilhando na frente
    const men = (x, y) => y >= 3 && y <= 14 && x >= 4 + (y < 5 ? 1 : 0) && x <= 11 - (y < 5 ? 1 : 0) - (y < 4 ? 1 : 0);
    extrude(c, men, 2, STONE, { top: STONE_L, bias: -0.2 });
    for (const [x, y] of [[7, 6], [8, 7], [7, 8], [9, 9], [7, 10], [8, 11]]) c.set(x, y, tone('#5fc4c0', 4));
  }],
  É: [1, (c) => {
    blob(c, 8, 10, 5.5, 4.4, '#a8bcd8');
    blob(c, 7, 7.8, 3, 1.6, '#cfdcf2', { spec: false });
    c.set(6, 7, '#ffffff'); c.set(7, 7, '#ffffff');
  }],
  k: [1, (c) => {
    // cristal: tres prismas de faces chapadas (esquerda clara, direita escura)
    blob(c, 8, 13.5, 6.4, 1.8, '#4a4458', { spec: false });
    cone(c, 4, 6, 13, 3, '#4cbcc6');
    cone(c, 12, 5, 13, 3, '#4cbcc6');
    cone(c, 8, 1, 14, 4.4, '#4cbcc6');
    c.set(7, 4, '#bcf6ea'); c.set(6, 6, '#bcf6ea'); c.set(3, 9, '#bcf6ea');
  }],

  // ---------- decoracao / construcoes pequenas ----------
  s: [1, (c) => {
    // placa: tabua grossa (espessura em cima) num poste
    post(c, 7, 8, 14, WOOD_D);
    box(c, 1, 2, 14, 2, 6, WOOD, { top: WOOD_L, tex: (f, lx, ly) => (f === 'front' && ly === 2 ? -0.8 : 0) });
    for (const x of [4, 6, 7, 9, 11]) c.set(x, 6, tone('#3a2418', 2));
  }],
  Ë: [1, (c) => {
    post(c, 7, 9, 14, WOOD_D);
    cyl(c, 8, 3, 4, 1.6, 4, '#3e5e86', { top: '#5a7aa6' });
    box(c, 4, 6, 8, 0, 3, '#3e5e86');
    c.set(5, 6, tone('#3a2418', 1)); c.set(6, 6, tone('#3a2418', 1));
    post(c, 12, 1, 5, '#c0403a'); box(c, 12, 1, 3, 1, 1, '#c0403a');
  }],
  Ó: [1, (c) => {
    // vaso de barro: bojo redondo, gargalo cilindrico com boca aberta
    blob(c, 8, 10, 4.8, 4.4, '#c06a3a');
    cyl(c, 8, 2, 2.6, 1.2, 3, '#c06a3a', { hole: '#3a2418', rim: 0.4 });
    for (let x = 4; x <= 12; x++) if (c.get(x, 9)) c.set(x, 9, tone('#7d3a2a', x < 7 ? 2 : 1));
  }],
  Ê: [3, (c, i) => {
    // vaso de flores: vaso de terracota (cilindro) com terra, folhagem redonda e flores
    cyl(c, 8, 8, 4.8, 1.8, 4, '#b8603a', { top: '#d0784a', hole: '#4a3424', rim: 0.18 });
    blob(c, 8, 6, 4.6, 3.2, '#3f8a3a', { spec: false });
    const F = ['#e0524c', '#ffd04a', '#e88ac8'][i];
    for (const [x, y] of [[6, 4], [9, 5], [8, 3], [11, 6], [5, 6]]) { c.set(x, y, tone(F, 3)); c.set(x + 1, y + 1, tone(F, 1)); }
  }],
  Î: [1, (c) => {
    // sacos: dois sacos estufados com boca amarrada
    blob(c, 5.5, 10, 4, 4.6, '#c8a870');
    blob(c, 10.8, 11.5, 4, 3.6, '#b8985e');
    blob(c, 5.5, 5.2, 1.6, 1.1, '#c8a870', { spec: false });
    c.set(5, 6, tone('#8a6a3a', 1)); c.set(6, 6, tone('#8a6a3a', 1));
    c.set(10, 8, tone('#8a6a3a', 1)); c.set(11, 8, tone('#8a6a3a', 1));
  }],
  Ï: [1, (c) => {
    // colmeia de palha: cupula de aneis empilhados num toco
    box(c, 5, 12, 6, 1, 2, WOOD_D, { top: WOOD });
    for (let k = 0; k < 4; k++) blob(c, 8, 3.2 + k * 2.3, 2.6 + k * 1.2, 1.7, '#d8a040', { spec: k === 0 });
    c.set(7, 10, '#3a2418'); c.set(8, 10, '#3a2418'); c.set(7, 11, '#3a2418');
    c.set(13, 2, '#ffd04a'); c.set(2, 4, '#ffd04a');
  }],
  Ñ: [3, (c, i) => {
    // canteiro elevado: caixa de tabuas com terra no tampo e mudas
    box(c, 1, 3, 14, 8, 3, WOOD, { top: '#6a4a2e', lip: false, tex: (f, lx, ly) => (f === 'top' ? (ly % 3 === 2 ? -1 : 0) : 0) });
    for (let x = 1; x <= 14; x++) { c.set(x, 3, tone(WOOD_L, 3)); c.set(x, 10, tone(WOOD_L, 3)); }
    for (let y = 3; y <= 10; y++) { c.set(1, y, tone(WOOD_L, 3)); c.set(14, y, tone(WOOD_L, 2)); }
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
      const x = 3 + k * 3; const y = 6 + r * 3;
      c.set(x, y, tone('#5fa53f', 2)); c.set(x, y - 1, tone('#5fa53f', 3)); c.set(x + 1, y - 2, tone('#88c04a', 3));
      if (i === 2) c.set(x + 1, y - 1, tone('#e0524c', 3));
      if (i === 1 && k % 2 === 0) c.set(x - 1, y - 2, tone('#88c04a', 3));
    }
  }],
  Ð: [1, (c) => {
    // espantalho: estaca, bracos, camisa com volume, cabeca de saco e chapeu de aba
    post(c, 7, 8, 14, WOOD);
    box(c, 1, 6, 14, 1, 1, WOOD, { top: WOOD_L });
    blob(c, 8, 8.6, 3.4, 3, '#6a8ab0', { spec: false });
    blob(c, 8, 4.2, 2.4, 2.2, '#e0c890');
    blob(c, 8, 2, 5, 1.2, '#c49a3a', { spec: false });
    cyl(c, 8, -0.6, 2.4, 1, 1.6, '#c49a3a');
    c.set(1, 8, tone('#d2ae58', 3)); c.set(14, 8, tone('#d2ae58', 2)); c.set(7, 4, '#3a2418'); c.set(9, 4, '#3a2418');
  }],
  y: [1, (c) => {
    // tenda pequena: cone de lona com abertura escura na frente
    cone(c, 8, 1, 14, 7, '#d8c8a0');
    cone(c, 8, 7, 14, 2.6, '#3a2418');
    for (let y = 3; y <= 14; y += 4) for (let x = 0; x < 16; x++) { const p = c.get(x, y); if (p && x < 5) c.set(x, y, tone('#c0403a', 2)); }
  }],
  $: [1, (c) => {
    // tesouro: monte de moedas (cupula achatada) e pilhas de moedas cilindricas
    cyl(c, 4, 5, 1.8, 0.8, 4, GOLD, { band: (ly) => (ly % 2 ? -0.7 : 0) });
    blob(c, 8, 11, 6.6, 4.2, GOLD, { flatBottom: 0.7 });
    for (let k = 0; k < 8; k++) c.set(3 + Math.floor(hash(k, 1, 5) * 10), 8 + Math.floor(hash(k, 2, 5) * 5), T('#ffe27c', 4));
    cyl(c, 12, 7, 1.8, 0.8, 4, GOLD, { band: (ly) => (ly % 2 ? -0.7 : 0) });
    c.set(6, 10, T('#c0403a', 3)); c.set(10, 12, T('#4cbcc6', 3));
  }],
  8: [1, (c) => {
    // livros e pergaminhos: pilhas de livros (caixas finas) e rolos
    box(c, 2, 9, 6, 3, 2, '#c0403a', { top: '#f0e6d0' });
    box(c, 2, 6, 6, 3, 2, '#3e6e94', { top: '#f0e6d0' });
    box(c, 3, 3, 5, 3, 2, '#5fa53f', { top: '#f0e6d0' });
    cyl(c, 12, 9, 2, 0.9, 3, '#e8dcc0');
    cyl(c, 11, 4, 1.6, 0.8, 3, '#e8dcc0');
  }],
  '!': [1, (c) => {
    // espinhos: piramides de ferro saindo de uma chapa
    box(c, 1, 11, 14, 2, 1, IRON, { lip: false });
    for (const [x, y] of [[4, 4], [11, 3], [7.5, 6], [3, 9], [12, 9]]) cone(c, x, y, y + 5, 1.8, '#a8b0c0');
  }],
  '^': [1, (c) => {
    // armadilha: chapa de ferro um pouco elevada com furos
    box(c, 2, 3, 12, 9, 2, IRON, { top: '#8a8c9c', tex: (f, lx, ly) => (f === 'top' && lx % 3 === 1 && ly % 3 === 1 ? -3 : 0) });
    c.set(8, 7, tone('#c0403a', 2));
  }],
  o: [1, (c) => {
    // rocha: bloco arredondado com faceta de cima clara e trinca
    blob(c, 8, 9.5, 6.5, 4.6, STONE);
    blob(c, 7, 7.4, 4.4, 2.2, STONE_L, { spec: false });
    c.set(10, 10, tone(STONE, 0)); c.set(11, 11, tone(STONE, 0)); c.set(11, 12, tone(STONE, 1));
    c.set(4, 8, tone('#5a8a34', 3)); c.set(5, 7, tone('#5a8a34', 3));
  }],
  l: [1, (c) => {
    // tronco caido: cilindro deitado (topo claro, base escura) com a ponta cortada mostrando aneis
    for (let x = 1; x <= 12; x++) for (let y = 6; y <= 12; y++) {
      const ny = (y - 9) / 3.5;
      c.set(x, y, tone('#7d4a2e', Math.round(2.2 - ny * 1.6 + (hash(x, y >> 1, 4) < 0.15 ? -1 : 0))));
    }
    blob(c, 12.5, 9, 2.6, 3.6, '#d8b070', { spec: false });
    c.set(12, 9, tone('#a07040', 1)); c.set(13, 8, tone('#a07040', 1)); c.set(12, 7, tone('#a07040', 2)); c.set(11, 10, tone('#a07040', 2));
    c.set(4, 5, tone('#5fa53f', 3)); c.set(5, 5, tone('#5fa53f', 2)); c.set(5, 4, tone('#88c04a', 3));
  }],
  b: [1, (c) => {
    // arbusto: tres bolhas de folha com topo claro e flores
    blob(c, 4.8, 10, 4, 3.4, '#3f8a3a');
    blob(c, 11.2, 10, 4, 3.4, '#3f8a3a');
    blob(c, 8, 7.4, 4.6, 3.8, '#468c3a');
    c.set(5, 7, tone('#e0524c', 3)); c.set(10, 9, tone('#e0524c', 3)); c.set(12, 7, tone('#e0524c', 2));
  }],
  m: [1, (c) => {
    // cogumelos: chapeus em cupula (topo claro) sobre caules cilindricos
    cyl(c, 7, 7, 1.3, 0.6, 5, '#f0e6d0');
    blob(c, 7, 6, 4.6, 3, '#d4482c', { flatBottom: 0.55 });
    c.set(5, 5, '#ffffff'); c.set(8, 4, '#ffffff'); c.set(9, 6, '#f0e6d0');
    cyl(c, 12, 11, 0.9, 0.5, 2, '#f0e6d0');
    blob(c, 12, 10.6, 2.4, 1.7, '#d4482c', { flatBottom: 0.4 });
    blob(c, 3.5, 12.5, 1.6, 1.2, '#d4482c', { spec: false });
  }],
  N: [1, (c) => {
    cyl(c, 8, 7, 1.8, 0.8, 6, '#f0e6d0');
    blob(c, 8, 6, 6, 3.6, '#4cbcc6', { flatBottom: 0.5 });
    c.set(5, 4, '#bcf6ea'); c.set(9, 3, '#bcf6ea'); c.set(11, 5, '#bcf6ea');
    blob(c, 3, 12, 1.8, 1.3, '#4cbcc6', { spec: false });
  }],
  Ã: [1, (c) => {
    // ninho: anel de gravetos (cilindro baixo com buraco) e ovos dentro
    cyl(c, 8, 6, 6.4, 3, 2, '#8a6a3a', { hole: '#4a3424', rim: 0.3, band: (ly, nx) => (Math.round(nx * 6 + ly) % 2 ? -0.6 : 0) });
    blob(c, 6, 8.2, 1.4, 1.6, '#e8e0c8'); blob(c, 8.6, 8.6, 1.4, 1.6, '#bcd8e8'); blob(c, 10.6, 8.2, 1.3, 1.5, '#e8e0c8');
  }],
  d: [1, (c) => {
    // arvore morta: tronco cilindrico com galhos secos (lado direito escuro)
    blob(c, 8, 14, 4.2, 1.4, '#5c3328', { spec: false });
    cyl(c, 8, 5, 2, 0.8, 9, '#7d4a2e');
    const br = [[8, 5, 4, 1], [8, 6, 13, 2], [7, 9, 2, 6], [9, 8, 12, 5], [5, 3, 3, 0], [11, 3, 12, 1]];
    for (const [x0, y0, x1, y1] of br) { c.line(x0, y0, x1, y1, tone('#7d4a2e', 3)); c.line(x0 + 1, y0 + 1, x1 + 1, y1 + 1, tone('#7d4a2e', 1)); }
  }],
  3: [1, (c) => {
    // caixao: tampa de madeira (hexagono alongado) vista de cima, lateral grossa, cruz
    const lid = (x, y) => { const w = y < 4 ? 2.5 + y * 0.9 : 5.5 - (y - 4) * 0.25; return y >= 1 && y <= 11 && Math.abs(x + 0.5 - 8) <= w; };
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (lid(x, y - 3) && !lid(x, y)) c.set(x, y, tone(WOOD_D, x > 9 ? 1 : 2));
    c.shape(lid, WOOD, { bias: 0.8 });
    for (let y = 3; y <= 9; y++) c.set(8, y, tone(GOLD, 3));
    for (let x = 6; x <= 10; x++) c.set(x, 5, tone(GOLD, 3));
  }],

  // ---------- fogo (animados: mesmo numero de quadros de antes) ----------
  F: [3, (c, f) => {
    // fogueira: anel de pedras em elipse, lenha cruzada e chama
    for (const k of [5, 6, 7, 4, 0, 3, 1, 2]) {
      const a = (k / 8) * Math.PI * 2;
      blob(c, 8 + Math.cos(a) * 5.4, 11.5 + Math.sin(a) * 2.6, 2.1, 1.7, STONE, { spec: k > 3 });
    }
    box(c, 4, 10, 8, 1, 2, WOOD, { top: WOOD_L });
    flame(c, 8, 10, 9, 3.2, f);
  }],
  i: [3, (c, f) => {
    // tocha de pe: pe de pedra, haste e copo de ferro com chama
    box(c, 5, 12, 6, 1, 2, STONE, { top: STONE_L });
    post(c, 7, 6, 12, WOOD);
    cyl(c, 8, 4, 2.2, 0.9, 2, IRON, { hole: '#9c2a26', rim: 0.3 });
    flame(c, 8, 5, 5, 2, f);
  }],
  '{': [3, (c, f) => {
    // candelabro: pe redondo, haste, bracos e tres velas com chamas
    cyl(c, 8, 12, 3.2, 1.2, 1, GOLD);
    post(c, 7, 9, 12, GOLD);
    box(c, 2, 7, 12, 1, 1, GOLD, { top: '#ffe27c' });
    for (const x of [4, 8, 12]) {
      box(c, x - 1, 5, 2, 1, 2, '#f0e6d0');
      const s = (f + x) % 3;
      c.set(x - 1, 4, '#ffb64a'); c.set(x - 1, 3, s === 2 ? '#ffb64a' : '#ffe48a'); if (s !== 1) c.set(x - 1 + (s === 0 ? 0 : 1), 2, '#f07c2e');
    }
  }],
  '}': [3, (c, f) => {
    // braseiro: tigela de ferro (cilindro com brasas) em tres pes, chama em cima
    for (const [x0, x1] of [[5, 3], [10, 12]]) c.line(x0, 11, x1, 14, tone(IRON, 1));
    post(c, 7, 11, 14, IRON);
    cyl(c, 8, 6, 5, 1.8, 3, IRON, { top: '#8a8c9c', hole: '#d4482c', rim: 0.2, holeLift: 1.4 });
    flame(c, 8, 7, 6, 3, f);
  }],
  5: [3, (c, f) => {
    // caldeirao: bojo de ferro, boca com caldo verde borbulhando, fogo embaixo
    flame(c, 8, 15, 3, 3, f);
    blob(c, 8, 8.6, 6.4, 4.6, '#4a4c5a');
    cyl(c, 8, 3, 5.6, 1.8, 1, '#4a4c5a', { top: '#6a6c7c', hole: '#5a8c2c', rim: 0.16, holeLift: 2 });
    const bub = [[6, 4], [9, 5], [10, 4]][f];
    c.set(bub[0], bub[1], '#d2ee7c'); c.set(bub[0] + 1, bub[1] - 1, '#90c642');
    if (f !== 1) c.set(7, 1, '#90c642');
  }],
  6: [3, (c, f) => {
    // bigorna: tampo de ferro claro com chifre, cintura e pe largo; faiscas animadas
    box(c, 3, 11, 10, 2, 2, IRON, { top: '#8a8c9c' });
    box(c, 6, 8, 4, 0, 3, IRON);
    box(c, 2, 4, 11, 3, 2, IRON, { top: '#a8b0c0' });
    box(c, 0, 5, 2, 1, 1, IRON, { top: '#a8b0c0' });
    c.set(6, 5, '#ffb64a'); c.set(7, 5, '#ffe48a'); c.set(8, 5, '#ffb64a');
    const sp = [[[5, 2], [10, 1]], [[3, 1], [8, 0]], [[7, 2], [11, 3]]][f];
    for (const [x, y] of sp) c.set(x, y, '#ffe48a');
  }],
  O: [3, (c, f) => {
    // portal: anel de pedra deitado (cilindro baixo) com redemoinho arcano na boca
    cyl(c, 8, 4, 7, 4, 3, STONE, { top: STONE_L, hole: '#4a2e7a', rim: 0.22, holeLift: 1.6 });
    for (let k = 0; k < 10; k++) {
      const a = k * 0.7 + f * 0.9; const r = 0.6 + k * 0.42;
      const x = 8 + Math.cos(a) * r * 1.4; const y = 8.4 + Math.sin(a) * r * 0.7;
      c.set(x, y, k < 4 ? '#caa4f2' : '#9c6cd4');
    }
    c.set(4, 6, tone('#caa4f2', 3));
  }],
};

// Monta os canvases (com contorno) de um codigo.
export function draw3d(code) {
  const e = OBJ3D[code];
  if (!e) return null;
  const [n, fn] = e;
  return Array.from({ length: n }, (_, i) => { const c = canvas(16, 16); fn(c, i); c.outline(); return c; });
}
export { cone };

// ---------------- objetos grandes (stamps) ----------------
// Mesmo tamanho de imagem de antes (a pegada e o encaixe no mapa nao mudam). A ultima linha
// do canvas e a base da celula ancora.
const ROOF = '#b8442e';

// Telhado de duas aguas visto de 3/4: cumeeira em y0, beiral em y1, telhas em fiadas.
function roof3d(c, x0, x1, y0, y1, col, inset = 4) {
  for (let y = y0; y <= y1; y++) {
    const k = (y - y0) / Math.max(1, y1 - y0);
    const a = Math.round(x0 + inset * (1 - k)); const b = Math.round(x1 - inset * (1 - k));
    for (let x = a; x <= b; x++) {
      let t = y === y0 ? 4 : 3 - k * 1.2;
      if ((y - y0) % 3 === 0 && y > y0) t -= 1;
      if (x === a) t += 0.5; if (x === b) t -= 0.8;
      if (y === y1) t = 1;
      c.set(x, y, T(col, t));
    }
  }
}

export const STAMP3D = {
  'Ô': (c) => {
    // poco de pedra: telhadinho de duas aguas, esteios, sarilho com balde e boca cilindrica
    post(c, 3, 8, 26, WOOD); post(c, 27, 8, 26, WOOD);
    roof3d(c, 0, 31, 1, 10, ROOF, 5);
    for (let x = 4; x <= 27; x++) c.set(x, 11, T(WOOD_D, 0));
    box(c, 5, 13, 22, 0, 2, WOOD_D);
    for (let y = 15; y <= 21; y++) c.set(16, y, T('#d8c8a0', y % 2 ? 2 : 3));
    cyl(c, 16, 19, 13, 5.5, 9, STONE, {
      top: STONE_L, hole: WATER, rim: 0.2, holeLift: 1,
      band: (ly, nx) => {
        if (ly % 4 === 3) return -1;
        const u = (nx + 1) * 5 + (Math.floor(ly / 4) % 2) * 0.5;
        return u - Math.floor(u) < 0.1 ? -1 : (Math.floor(u) + Math.floor(ly / 4)) % 3 === 0 ? 0.4 : 0;
      }
    });
    for (const [x, y] of [[9, 23], [10, 23], [11, 24], [18, 26]]) c.set(x, y, T('#5cb8e0', 4));
    cyl(c, 16, 19, 2.4, 1, 3, WOOD, { top: WOOD_L, hole: WATER, rim: 0.4, paint: (ly) => (ly === 1 ? IRON : null) });
    for (let k = 0; k < 6; k++) c.set(4 + Math.floor(hash(k, 1, 9) * 24), 30 + Math.floor(hash(k, 2, 9) * 7), T('#5a8a34', 2 + (k % 2)));
  },
  'Ú': (c) => {
    // fonte: bacia grande cilindrica com agua, coluna, taca de cima e jatos caindo
    cyl(c, 16, 16, 15, 6, 5, STONE_L, {
      top: '#c4ccd6', hole: '#3a92cc', rim: 0.12, holeLift: 1.4,
      band: (ly) => (ly === 0 ? 0.6 : ly === 4 ? -0.4 : 0)
    });
    for (const [x, y] of [[8, 21], [9, 21], [22, 24], [23, 24], [12, 25], [20, 20]]) c.set(x, y, '#c4eef2');
    cyl(c, 16, 9, 2.4, 1, 13, STONE_L);
    cyl(c, 16, 6, 7, 2.6, 2, STONE_L, { top: '#c4ccd6', hole: '#3a92cc', rim: 0.25, holeLift: 1.6 });
    blob(c, 16, 3.5, 1.8, 2.6, '#5cb8e0');
    c.set(15, 2, '#f6f9ff');
    for (const [x, sgn] of [[9, -1], [23, 1]]) for (let y = 11; y <= 19; y++) c.set(x + sgn * Math.floor((y - 11) / 4), y, y % 2 ? '#c4eef2' : '#5cb8e0');
  },
  'Û': (c) => {
    // estatua grande: pedestal em caixa e figura de manto segurando espada
    box(c, 4, 34, 24, 5, 8, STONE, { top: STONE_L, tex: bricks });
    cone(c, 15, 12, 35, 9, STONE_L);
    blob(c, 15, 16, 6, 5, STONE_L, { spec: false });
    blob(c, 15, 7.5, 3.6, 4, STONE_L);
    blob(c, 9.5, 14, 2.4, 2.2, STONE_L, { spec: false });
    blob(c, 20.5, 14, 2.4, 2.2, STONE_L, { spec: false });
    post(c, 23, 3, 30, '#c4ccd6');
    box(c, 20, 21, 8, 1, 1, '#c4ccd6');
    c.set(23, 2, T('#c4ccd6', 4));
    for (let y = 24; y <= 34; y += 3) c.set(12 + (y % 2), y, T(STONE_L, 1));
  },
  'Ø': (c) => {
    // carroca: varais na frente, caixa de tabuas com tampo/bordas, feno empilhado, rodas grossas
    c.line(0, 18, 6, 14, T(WOOD, 3)); c.line(0, 19, 6, 15, T(WOOD, 1));
    box(c, 4, 7, 29, 6, 8, WOOD, { top: '#6a4632', lip: false, tex: planks(3) });
    for (let x = 4; x <= 32; x++) { c.set(x, 7, T(WOOD_L, 3)); c.set(x, 12, T(WOOD_L, 4)); }
    blob(c, 18, 7, 12, 5, '#d8b860', { flatBottom: 0.95, noise: (x, y) => (hash(x, y, 7) < 0.15 ? 0.8 : 0) });
    for (const wx of [10, 27]) {
      // roda com espessura: aro de tras escuro deslocado, aro da frente, raios e cubo
      for (let y = 15; y <= 27; y++) for (let x = wx - 6; x <= wx + 7; x++) {
        const dx = x + 0.5 - wx; const dy = y + 0.5 - 21;
        const r = Math.hypot(dx, dy); const rb = Math.hypot(dx - 1, dy);
        if (r <= 5.6) {
          const ang = Math.atan2(dy, dx);
          const spoke = Math.abs(Math.sin(ang * 3)) < 0.28;
          const t = r > 4.2 ? (dx + dy < -2 ? 3 : dx + dy > 3 ? 1 : 2) : spoke || r < 1.5 ? (r < 1.5 ? 2 : 3) : -1;
          if (t >= 0) c.set(x, y, T(r < 1.5 ? IRON : '#6a4632', t));
          else c.set(x, y, T('#4a3424', 0));
        } else if (rb <= 5.6) c.set(x, y, T('#4a3424', 1));
      }
    }
  },
  'Ö': (c) => {
    // barraca de feira: toldo listrado inclinado (tampo) com babado, postes e balcao com frutas
    post(c, 3, 10, 34, WOOD); post(c, 29, 10, 34, WOOD);
    box(c, 2, 21, 30, 5, 9, WOOD, { top: WOOD_L, tex: planks(3, 5) });
    const FR = ['#e0524c', '#ffd04a', '#88c04a', '#e88ac8', '#f07c2e'];
    for (let k = 0; k < 7; k++) blob(c, 6 + k * 3.7, 22.5 + (k % 2), 1.8, 1.5, FR[k % FR.length]);
    for (let y = 1; y <= 9; y++) for (let x = 0; x <= 33; x++) {
      const stripe = Math.floor((x + (9 - y) * 0.3) / 4) % 2 === 0;
      const t = y === 1 ? 4 : y < 5 ? 3 : 2.6;
      c.set(x, y, T(stripe ? '#c0403a' : '#f0e6d0', x === 33 ? t - 1 : t));
    }
    for (let x = 0; x <= 33; x++) {
      const stripe = Math.floor(x / 4) % 2 === 0;
      c.set(x, 10, T(stripe ? '#c0403a' : '#f0e6d0', 1.6));
      if (x % 4 !== 3) c.set(x, 11, T(stripe ? '#c0403a' : '#f0e6d0', 1));
    }
  },
  'Ù': (c) => {
    // barco: casco visto de 3/4 (borda de cima clara, interior escuro, costado com tabuas),
    // mastro e vela com volume (lado iluminado e lado na sombra)
    cyl(c, 24, 13, 21.5, 4.5, 7, '#7a4a2e', {
      top: WOOD_L, hole: '#5c3328', rim: 0.1, holeLift: 1.2,
      band: (ly) => (ly % 3 === 2 ? -1 : 0)
    });
    post(c, 23, 1, 17, '#6a4632');
    for (let y = 2; y <= 14; y++) {
      const w = Math.round((y - 1) * 1.25);
      for (let x = 25; x <= 25 + w; x++) c.set(x, y, T('#ece4d2', x < 25 + w * 0.5 ? 3 : x === 25 + w ? 1 : 2));
    }
    c.set(23, 0, '#c0403a'); c.set(24, 0, '#c0403a');
  },
  'Ü': (c) => {
    // forja: bloco de pedra com tampo, boca de fogo em arco e chamine
    box(c, 2, 9, 28, 7, 18, '#6a5a5a', { top: '#8a7a78', tex: bricks });
    box(c, 11, 0, 10, 3, 10, '#5a4a4a', { top: '#3a2a2a', tex: bricks });
    for (let x = 12; x <= 19; x++) c.set(x, 1, T('#2a1418', 1));
    const mouth = (x, y) => y >= 20 && y <= 31 && Math.abs(x + 0.5 - 16) <= 7 - (y < 23 ? 23 - y : 0);
    for (let y = 0; y < 36; y++) for (let x = 0; x < 32; x++) if (mouth(x, y)) c.set(x, y, T('#2a1418', y < 24 ? 1 : 2));
    for (let x = 9; x <= 23; x++) c.set(x, 31, T('#5a4a4a', 3));
    for (let i = 0; i < 10; i++) c.set(10 + Math.floor(hash(i, 1, 2) * 12), 26 + Math.floor(hash(i, 2, 2) * 5), i % 3 ? '#f07c2e' : '#ffd27a');
    for (let x = 10; x <= 22; x++) c.set(x, 30, x % 2 ? '#ffb64a' : '#d4482c');
  },
  'Ý': (c) => {
    // tenda grande: cone de lona (luz na esquerda), costuras radiais, faixas e entrada escura
    cone(c, 24, 3, 37, 23, '#d8c8a0', { tex: (x, y, nx) => (Math.abs((nx * 5) - Math.round(nx * 5)) < 0.12 && y > 8 ? -0.8 : 0) });
    for (const by of [14, 26]) for (let x = 0; x < 48; x++) { const p = c.get(x, by); if (p) { const nx = (x - 24) / ((by - 2) * 0.66); c.set(x, by, T('#c0403a', nx < -0.45 ? 3 : nx < 0.25 ? 2 : 1)); c.set(x, by + 1, T('#c0403a', nx < -0.45 ? 2 : 1)); } }
    cone(c, 24, 20, 37, 6, '#3a2418');
    c.line(24, 0, 24, 4, T(WOOD, 1)); c.set(25, 0, '#c0403a'); c.set(26, 0, '#c0403a'); c.set(25, 1, '#c0403a');
  },
  'Þ': (c) => {
    // pedra grande: rochedo com faceta de cima clara, frente escura, trinca e musgo
    blob(c, 16, 16.5, 14, 10, STONE);
    blob(c, 13, 11, 9, 4.6, STONE_L, { spec: false });
    blob(c, 22, 13, 5, 3, STONE_L, { spec: false, noise: () => -0.6 });
    c.line(18, 12, 21, 19, T(STONE, 0)); c.line(21, 19, 19, 24, T(STONE, 0)); c.line(19, 12, 22, 19, T(STONE, 3));
    for (let i = 0; i < 7; i++) c.set(6 + Math.floor(hash(i, 1, 6) * 16), 7 + Math.floor(hash(i, 2, 6) * 5), T('#5a8a34', 2 + (i % 2)));
  },
  'Õ': (c) => {
    // moinho: torre conica arredondada (cilindro que afina), telhado conico, porta, janela e pas
    for (let y = 26; y <= 71; y++) {
      const rx = 10 + (y - 26) * 0.07;
      for (let x = Math.floor(24 - rx); x <= Math.ceil(24 + rx); x++) {
        const nx = (x + 0.5 - 24) / rx; if (Math.abs(nx) > 1) continue;
        let t = 2.3 - nx * 1.5; if (nx > 0.75) t -= 0.4;
        if (y % 6 === 0) t -= 0.7;
        if (y >= 70) t -= 0.7;
        c.set(x, y, T('#d8c8a8', t));
      }
    }
    box(c, 20, 58, 8, 0, 14, '#6a4632', { tex: (f, lx) => (lx % 3 === 2 ? -1 : 0) });
    c.set(26, 64, T(GOLD, 4));
    box(c, 22, 40, 4, 1, 4, '#3a5a8a', { top: '#d8c8a8' });
    cone(c, 24, 12, 30, 14, '#7a3a2a', { tex: (x, y) => ((y - 12) % 4 === 3 ? -0.8 : 0) });
    const cx = 24; const cy = 22;
    for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      for (let k = 2; k < 20; k++) {
        const x = cx + dx * k; const y = cy + dy * k * 0.95;
        c.set(x, y, T(WOOD, 1)); c.set(x, y + 1, T(WOOD, 0));
        if (k > 6) for (let j = 1; j <= 3; j++) c.set(x + dy * j * 0.7, y - dx * j * 0.7, T('#e8dcc0', j === 1 ? 2 : 3));
      }
    }
    cyl(c, cx, cy - 2, 2.6, 1.2, 2, '#5a3a28', { top: WOOD_L });
  }
};
