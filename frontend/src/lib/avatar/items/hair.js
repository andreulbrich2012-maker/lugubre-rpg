// Cabelos. Cada estilo desenha duas partes: drawBack (atras do corpo: o que cai
// nas costas) e drawFront (por cima da cabeca: topo, franja, laterais).
// Arte em texto relativa a caixa da cabeca (P.head 12x11): '0'..'4' = tons do cabelo.
const HL = { 0: ['hair', 0], 1: ['hair', 1], 2: ['hair', 2], 3: ['hair', 3], 4: ['hair', 4] };

function art(L, P, dx, dy, rows) { L.art(P.head.x + dx, P.head.y + dy, rows, HL); }

export const HAIRS = [
  { id: 'careca', name: 'Careca', sub: 'Curtos' },
  {
    id: 'curto', name: 'Curto', sub: 'Curtos',
    drawFront(L, P) {
      if (P.view === 'down') art(L, P, -1, -1, [
        '....333333....',
        '...34433332...',
        '..3443333322..',
        '.333333333221.',
        '.322222222221.',
        '.21.2..2.1.11.',
        '.1..........1.'
      ]);
      else if (P.view === 'up') art(L, P, -1, -1, [
        '....333333....',
        '...33433332...',
        '..3343333322..',
        '.333333333221.',
        '.333333332221.',
        '.332222222211.',
        '.222222222211.',
        '.122222222211.',
        '..1222222211..',
        '...11111111...'
      ]);
      else art(L, P, -1, -1, [
        '....333333....',
        '...34433332...',
        '..34433333221.',
        '.333333332221.',
        '.32222222222..',
        '.21.2...22221.',
        '.......12221..',
        '........1211..',
        '.........11...'
      ]);
    }
  }
];
