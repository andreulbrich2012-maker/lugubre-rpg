// Na mao: armas, cajados, ferramentas e miudezas. Cada item e um desenho EM PE
// (topo = ponta) com um ponto de pegada (grip) que cai na mao do braco que
// segura (P.holdArm). O desenho e cisalhado para inclinar: de frente tomba para
// fora do corpo, de perfil tomba para a frente (assim a ponta passa na frente do
// rosto sem cobri-lo), de costas fica atras do corpo e espelhado.
// Pixels do cabo que caem dentro da caixa da mao sao pulados: a mao (ou a luva)
// aparece por cima do cabo e o item parece segurado de verdade.
// Legenda: '0'-'4' = canal a, 'a'-'e' = canal b, 'A'-'E' = canal c, resto fixo.
const LG = {
  w: ['w', 4], W: ['w', 3], z: ['w', 1], k: ['#2e2a35', 1], K: ['#2e2a35', 0],
  y: ['#f6d66a', 3], Y: ['#e8902e', 2], f: ['#fff1b0', 4], r: ['#d8503a', 2], R: ['#9c2a2a', 2],
  g: ['#8fe0ff', 3], G: ['#4aa0d8', 2], v: ['#6faa4a', 3], V: ['#4f8238', 2], p: ['#e07a9a', 3], P: ['#b04a6a', 2]
};
for (let i = 0; i < 5; i++) { LG[i] = ['a', i]; LG['abcde'[i]] = ['b', i]; LG['ABCDE'[i]] = ['c', i]; }

function sart(L, ax, ay, rows, o = {}) {
  const [ac, ar] = o.anchor || [0, 0];
  const s = o.s || 0, m = o.mirror ? -1 : 1;
  rows.forEach((row, r) => {
    const sh = Math.floor((r - ar) * s);
    [...row].forEach((ch, c) => {
      const v = LG[ch];
      if (!v) return;
      const x = ax + m * (c - ac) + sh, y = ay + r - ar;
      if (o.skip && o.skip(x, y, ch)) return;
      L.px(x, y, v[0], v[1]);
    });
  });
}

// spec: { rows (ou fn(P)), grip: [col, linha], s: { down, side, up }, views: { side: {...} },
//         gripChars, extra(L, P, at) }
function held(id, name, sub, channels, spec) {
  return {
    id, name, sub, channels,
    draw(L, P) {
      const v = P.view, h = P.holdArm.hand;
      const vs = { ...spec, ...(spec.views?.[v] || {}) };
      const rows = typeof vs.rows === 'function' ? vs.rows(P) : vs.rows;
      const sh = { down: 0.34, side: 0.5, up: 0.34, ...(spec.s || {}), ...(vs.s || {}) };
      const s = v === 'up' ? -sh.up : sh[v];
      const mirror = v === 'up' ? !vs.mirror : !!vs.mirror;
      const ax = (v === 'up' ? h.x + 1 : h.x) + (vs.dx || 0) * (v === 'up' ? -1 : 1);
      const ay = h.y + (vs.dy || 0);
      const gc = vs.gripChars ?? 'abcde';
      const skip = (x, y, ch) => x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h && gc.includes(ch);
      const paint = () => {
        sart(L, ax, ay, rows, { anchor: vs.grip, s, mirror, skip });
        vs.extra?.(L, P, { ax, ay, s, mirror });
      };
      // de costas o item fica atras do corpo: passada principal, sem etiqueta de braco
      if (v === 'up') paint(); else L.withTag(P.holdArm.tag, paint);
    }
  };
}
const C = (...pairs) => pairs.map(([label, def]) => ({ label, def }));
const ARMA = (a = 'aco', b = 'couro-escuro', c = 'bronze') => C(['Lâmina', a], ['Cabo', b], ['Guarda', c]);

// chama que tremula: tres quadros alternando com o tempo da animacao
const flame = (P) => [['.y.', 'yfY', 'YyY'], ['y..', 'yfy', 'YyY'], ['.Y.', 'yfy', 'YyY'], ['..y', 'Yfy', 'YyY']][P.f % 4];

export const HELD = [
  // ---- armas ----
  held('espada', 'Espada', 'Armas', ARMA(), {
    rows: ['.4..', '.43.', '.43.', '.43.', '.43.', '.43.', '.32.', 'BDCB', '.c..', '.b..', '.D..'], grip: [1, 8]
  }),
  held('adaga', 'Adaga', 'Armas', ARMA('prata', 'couro', 'ferro'), {
    rows: ['.4.', '.43', '.43', '.32', 'DCB', '.c.', '.b.', '.C.'], grip: [1, 5], s: { down: 0.5, side: 0.6 }
  }),
  held('espada-longa', 'Espada longa', 'Armas', ARMA('aco', 'vinho', 'ouro'), {
    rows: ['..4..', '..4..', '.443.', '.443.', '.443.', '.443.', '.443.', '.443.', '.443.', '.332.', 'EDDCB', '.EC..', '..c..', '..b..', '..c..', '.DC..'], grip: [2, 12], s: { side: 0.6 }
  }),
  held('cimitarra', 'Cimitarra', 'Armas', ARMA('aco', 'couro-escuro', 'ouro'), {
    rows: ['3...', '43..', '.43.', '.43.', '.432', '..43', '..43', '.DCB', '..c.', '..b.', '..E.'], grip: [2, 8]
  }),
  held('rapieira', 'Rapieira', 'Armas', ARMA('prata', 'couro-escuro', 'ouro'), {
    rows: ['.4.', '.4.', '.3.', '.4.', '.3.', '.4.', '.3.', '.3.', '.3.', 'DEC', 'Dc.', 'Db.', '.DC'], grip: [1, 10], s: { side: 0.6 }
  }),
  held('machado', 'Machado', 'Armas', ARMA('ferro', 'madeira', 'aco'), {
    rows: ['...d', '.4Ed', '443c', '432c', '.21c', '...d', '...c', '...c', '...b', '...a'], grip: [3, 7]
  }),
  held('machado-duplo', 'Machado de duas lâminas', 'Armas', ARMA('aco', 'madeira-escura', 'ouro'), {
    rows: ['...E...', '.4.d.4.', '443d321', '432D211', '43.c.21', '.2.d.1.', '...c...', '...d...', '...c...', '...b...', '...b...', '...C...'], grip: [3, 9]
  }),
  held('martelo', 'Martelo de guerra', 'Armas', ARMA('ferro', 'madeira', 'bronze'), {
    rows: ['.443.', '44332', '3C3C1', '33221', '..d..', '..c..', '..d..', '..c..', '..b..', '..B..'], grip: [2, 7]
  }),
  held('maca', 'Maça cravejada', 'Armas', ARMA('ferro', 'couro-escuro', 'aco'), {
    rows: ['.E.E.', 'E443D', '.4432', 'E3321', '.D1D.', '..C..', '..d..', '..c..', '..d..', '..b..', '..C..'], grip: [2, 8]
  }),
  held('mangual', 'Mangual', 'Armas', ARMA('ferro-negro', 'madeira', 'aco'), {
    // bola presa na corrente pendurada da ponta do cabo, balancando com o passo
    rows: ['.D.', '.d.', '.c.', '.d.', '.c.', '.b.', '.C.'], grip: [1, 4],
    extra(L, P, { ax, ay, mirror }) {
      const dir = mirror ? 1 : -1, sw = P.walk ? P.phase : 0;
      const tx = ax + Math.floor(-3 * (P.view === 'up' ? -0.34 : P.view === 'side' ? 0.5 : 0.34)), ty = ay - 3;
      L.px(tx, ty - 1, 'c', 3);
      L.px(tx + dir, ty, 'c', 2); L.px(tx + dir * 2 + sw, ty + 1, 'c', 3); L.px(tx + dir * 2 + sw, ty + 2, 'c', 2);
      sart(L, tx + dir * 3 + sw, ty + 3, ['.E.', 'E43E', '4321', '.21.', '.E.'], { anchor: [1, 0] });
    }
  }),
  held('clava', 'Clava', 'Armas', C(['Pregos', 'ferro'], ['Madeira', 'madeira'], ['Faixa', 'couro']), {
    rows: ['.ed.', 'ed3c', 'dddc', 'd3cc', 'dccb', '.cb.', '.cb.', '.C..', '.c..', '.b..', '.a..'], grip: [1, 8], s: { down: 0.25 }
  }),
  held('lanca', 'Lança', 'Armas', ARMA('aco', 'madeira', 'bronze'), {
    rows: ['.4.', '443', '432', '.2.', '.C.', '.r.', '.d.', '.c.', '.d.', '.c.', '.d.', '.c.', '.d.', '.c.', '.b.', '.c.', '.b.', '.a.'], grip: [1, 13], s: { down: 0.3, side: 0.55, up: 0.3 }
  }),
  held('tridente', 'Tridente', 'Armas', ARMA('bronze', 'madeira-escura', 'ouro'), {
    rows: ['4.4.4', '3.3.3', '32322', '.DCB.', '..d..', '..c..', '..d..', '..c..', '..d..', '..c..', '..d..', '..c..', '..b..', '..c..', '..a..'], grip: [2, 12], s: { down: 0.3, side: 0.55, up: 0.3 }
  }),
  held('foice', 'Foice', 'Armas', ARMA('aco', 'madeira-escura', 'ferro'), {
    rows: ['d4443..', 'c.12443', 'd....32', 'c.....1', 'd......', 'c......', 'd......', 'c......', 'd......', 'c......', 'd......', 'c......', 'D......', 'c......', 'b......', 'c......', 'b......', 'a......'], grip: [0, 14],
    s: { down: 0.2, up: 0.2, side: 0.45 }, views: { side: { mirror: true } }
  }),
  held('arco', 'Arco', 'Armas', C(['Corda', 'osso'], ['Madeira', 'madeira'], ['Empunhadura', 'couro']), {
    rows: ['..dD', '.d.z', 'dc.0', 'c..0', 'c..0', 'C..0', 'C..0', 'c..0', 'c..0', 'dc.0', '.d.z', '..dD'], grip: [0, 5], gripChars: 'C', dx: -1,
    s: { down: 0, side: 0.15, up: 0 }
  }),
  held('besta', 'Besta', 'Armas', C(['Virote', 'aco'], ['Coronha', 'madeira'], ['Metal', 'ferro']), {
    rows: ['B.....B', 'Cz...zC', '.CzDzC.', '...4...', '...d...', '..dcb..', '...c...', '...cA..', '...b...', '...a...'], grip: [3, 7], s: { down: 0.2, side: 0.3, up: 0.2 }
  }),
  held('escudo', 'Escudo de mão', 'Armas', C(['Campo', 'azul-aco'], ['Brasão', 'ouro'], ['Borda', 'prata']), {
    // de frente o escudo cobre o antebraco; de lado vira um gomo na frente do peito
    rows: ['CDDDDDC', 'D33b32B', 'D3bbb2B', 'D33b32B', 'C33b21B', '.C3b2B.', '.C321B.', '..CBB..', '...B...'], grip: [3, 5], gripChars: '', s: { down: 0, up: 0 },
    views: { side: { rows: ['.D.', 'D3B', 'D3B', 'Db2', 'D2B', 'D2B', 'D1B', '.B.'], grip: [1, 3], s: { side: 0 }, dx: -2 }, up: { dx: -1 } }
  }),

  // ---- cajados e magia ----
  held('cajado-cristal', 'Cajado de cristal', 'Cajados e magia', C(['Cristal', 'arcano'], ['Madeira', 'madeira'], ['Garras', 'ouro']), {
    rows: ['.4.', '434', '432', 'C2C', '.D.', '.d.', '.c.', '.d.', '.c.', '.d.', '.c.', '.d.', '.c.', '.b.', '.c.', '.b.', '.c.', '.a.'], grip: [1, 13],
    s: { down: 0.25, side: 0.45, up: 0.25 },
    extra(L, P, { ax, ay, s }) { if (P.f % 2) L.px(ax + Math.floor(-13 * s) - 1, ay - 14, 'w', 4); }
  }),
  held('cajado-nodoso', 'Cajado nodoso', 'Cajados e magia', C(['Folhas', 'musgo'], ['Madeira', 'madeira'], ['Amarra', 'couro']), {
    rows: ['.3dd.', '3dc.d', '.d.3c', '.dcc.', '..d3.', '..c..', '..d..', '..c..', '.dc..', '..c..', '..dc.', '..c..', '..C..', '..c..', '..b..', '..b..', '..a..'], grip: [2, 13],
    s: { down: 0.25, side: 0.45, up: 0.25 }
  }),
  held('varinha', 'Varinha', 'Cajados e magia', C(['Brilho', 'ouro'], ['Madeira', 'madeira-escura'], ['Ponta', 'prata']), {
    rows: (P) => (P.f % 2 ? ['.4.', '434', '.4.', '.E.', '.d.', '.c.', '.b.', '.a.'] : ['4.4', '.4.', '4.4', '.E.', '.d.', '.c.', '.b.', '.a.']), grip: [1, 6], s: { down: 0.5, side: 0.6, up: 0.5 }
  }),
  held('cetro', 'Cetro', 'Cajados e magia', C(['Gema', 'carmesim'], ['Cabo', 'ouro'], ['Coroa', 'ouro']), {
    rows: ['D.D.D', 'DD4DD', '.C3C.', '..C..', '..d..', '..c..', '..d..', '..c..', '..b..', '..D..'], grip: [2, 8], s: { down: 0.3, side: 0.4, up: 0.3 }
  }),
  held('orbe', 'Orbe arcano', 'Cajados e magia', C(['Orbe', 'arcano'], ['Base', 'madeira-escura'], ['Aro', 'ouro']), {
    // a esfera flutua sobre a palma e sobe/desce 1px com a animacao
    rows: (P) => { const b = ['.33.', '3w42', '3432', '.21.', '....']; return P.f % 2 ? ['....', ...b.slice(0, 4)] : b; },
    grip: [1, 5], gripChars: '', s: { down: 0, side: 0, up: 0 }, dy: 0,
    extra(L, P, { ax, ay, mirror }) { const m = mirror ? -1 : 1; L.px(ax + m * -1, ay - 1, 'c', 3); L.px(ax + m * 2, ay - 1, 'c', 2); L.px(ax, ay - 1, 'c', 4); L.px(ax + m, ay - 1, 'c', 3); }
  }),
  held('grimorio', 'Grimório', 'Cajados e magia', C(['Gema', 'jade'], ['Capa', 'vinho'], ['Cantos', 'ouro']), {
    rows: ['Edddc', 'dcDcC', 'dD3Dc', 'dcDcb', 'Ecccb', 'zwwWB'], grip: [0, 2], s: { down: 0, side: 0, up: 0 }, dx: -1
  }),
  held('pergaminho', 'Pergaminho mágico', 'Cajados e magia', C(['Selo', 'carmesim'], ['Papel', 'osso'], ['Hastes', 'madeira']), {
    rows: ['DCCCB', '.eddc', '.dbbc', '.dddc', '.dbbc', '.d3dc', 'DCCCB'], grip: [1, 4], gripChars: '', s: { down: 0, side: 0, up: 0 }, dx: -1, dy: -2
  }),

  // ---- ferramentas ----
  held('pa', 'Pá', 'Ferramentas', C(['Lâmina', 'ferro'], ['Cabo', 'madeira'], ['Punho', 'madeira-escura']), {
    rows: ['.33.', '4332', '4332', '3221', '.21.', '.d..', '.c..', '.d..', '.c..', '.d..', '.c..', '.b..', '.b..', 'CBC.'], grip: [1, 11], s: { down: 0.25, side: 0.4, up: 0.25 }
  }),
  held('picareta', 'Picareta', 'Ferramentas', C(['Ferro', 'ferro'], ['Cabo', 'madeira'], ['Cunha', 'aco']), {
    rows: ['.34E43.', '4..d..2', '3..c..1', '...d...', '...c...', '...d...', '...c...', '...b...', '...b...', '...a...'], grip: [3, 7]
  }),
  held('enxada', 'Enxada', 'Ferramentas', C(['Ferro', 'ferro'], ['Cabo', 'madeira'], ['Anel', 'bronze']), {
    rows: ['43Cd', '321d', '...c', '...d', '...c', '...d', '...c', '...d', '...c', '...b', '...b', '...a'], grip: [3, 9], s: { down: 0.25, side: 0.4, up: 0.25 }
  }),
  held('vara-pesca', 'Vara de pesca', 'Ferramentas', C(['Linha', 'branco-gasto'], ['Vara', 'madeira'], ['Molinete', 'ferro']), {
    rows: ['..d', '.3c', '3.d', '3.c', '3.d', '3.c', 'r.d', 'w.c', '..d', '..c', '..DC', '..c', '..b', '..b', '..a'], grip: [2, 12], s: { down: 0.3, side: 0.5, up: 0.3 }
  }),
  held('frigideira', 'Frigideira', 'Ferramentas', C(['Ferro', 'ferro-negro'], ['Cabo', 'madeira'], ['Ovo', 'branco-gasto']), {
    rows: ['.3443.', '310012', '30DE01', '310A01', '.2111.', '..d...', '..c...', '..b...', '..b...', '..a...'], grip: [2, 7], s: { down: 0.15, side: 0.3, up: 0.15 }
  }),
  held('regador', 'Regador', 'Ferramentas', C(['Lata', 'cobre'], ['Alça', 'couro-escuro'], ['Bico', 'cobre']), {
    // segurado pela alca de cima; o bico sai para a frente
    rows: ['..bcc..', '.b...c.', 'D.4443.', '.C43322', '..43321', '..3221.', '...111.'], grip: [3, 0], s: { down: 0, side: 0, up: 0 },
    views: { side: { mirror: false } }
  }),
  held('martelo-ferreiro', 'Martelo de ferreiro', 'Ferramentas', C(['Cabeça', 'aco'], ['Cabo', 'madeira'], ['Cunha', 'ferro']), {
    rows: ['443A', '332A', '.d..', '.c..', '.d..', '.b..', '.b..', '.a..'], grip: [1, 5], s: { down: 0.4, side: 0.5, up: 0.4 }
  }),

  // ---- outros ----
  held('tocha', 'Tocha', 'Outros', C(['Madeira', 'madeira'], ['Pano', 'linho'], ['Faixa', 'couro']), {
    rows: (P) => [...flame(P), 'bdc', '.D.', '.3.', '.2.', '.1.', '.1.', '.0.'], grip: [1, 7], gripChars: '0123', s: { down: 0.2, side: 0.3, up: 0.2 },
    extra(L, P, { ax, ay, s }) { if (P.f % 2) L.px(ax + Math.floor(-8 * s), ay - 8, 'f', 4); }
  }),
  held('lanterna', 'Lanterna', 'Outros', C(['Vidro', 'ouro'], ['Alça', 'couro-escuro'], ['Ferro', 'ferro-negro']), {
    rows: (P) => ['.b.', '.b.', 'CDB', P.f % 2 ? 'yfy' : 'yfY', 'f4f', 'YyY', 'CBA'], grip: [1, 0], s: { down: 0, side: 0, up: 0 }
  }),
  held('pocao', 'Poção', 'Outros', C(['Líquido', 'carmesim'], ['Rolha', 'couro'], ['Selo', 'ouro']), {
    rows: ['.dd.', '.zW.', 'W443', '4332', '3221', '.11.'], grip: [1, 5], gripChars: '', s: { down: 0, side: 0, up: 0 }
  }),
  held('buque', 'Buquê de flores', 'Outros', C(['Flor', 'rosa-seco'], ['Flor 2', 'mostarda'], ['Laço', 'carmesim']), {
    rows: ['.4.d.', '434ed', 'v3vdV', 'Vv3vV', '.CvC.', '..V..', '..V..', '..V..'], grip: [2, 5], gripChars: 'vV', s: { down: 0.2, side: 0.3, up: 0.2 }
  }),
  held('alaude', 'Alaúde', 'Outros', C(['Caixa', 'madeira'], ['Braço', 'madeira-escura'], ['Cravelhas', 'osso']), {
    rows: ['Ec.', 'Ec.', '.c.', '.c.', '.c.', '.c.', '.33.', '33k2', '43k21', '33221', '.221.'], grip: [1, 7], gripChars: '', s: { down: 0.3, side: 0.4, up: 0.3 }, dx: -1
  }),
  held('caneca', 'Caneca', 'Outros', C(['Bebida', 'ocre'], ['Madeira', 'madeira'], ['Aros', 'ferro']), {
    rows: ['.wWz.', 'W433z', 'eddcC', 'DCCBC', 'dccbC', 'dccb.', 'DCCB.'], grip: [3, 3], gripChars: '', s: { down: 0, side: 0, up: 0 }, dx: -2, dy: -1
  }),
  held('maca-fruta', 'Maçã', 'Outros', C(['Casca', 'carmesim'], ['Cabinho', 'couro'], ['Folha', 'musgo']), {
    rows: ['..bD', '3434.', '4w32', '3321', '.21.', '....'], grip: [1, 5], gripChars: '', s: { down: 0, side: 0, up: 0 }
  }),
  held('livro', 'Livro de viagem', 'Outros', C(['Capa', 'azul-aco'], ['Fita', 'carmesim'], ['Páginas', 'osso']), {
    rows: ['1333E', '1343D', '1444D', '1333D', '1222D', '0111C', '..b..', '..a..'], grip: [0, 2], gripChars: '', s: { down: 0, side: 0, up: 0 }, dx: -2, dy: -1
  })
];
