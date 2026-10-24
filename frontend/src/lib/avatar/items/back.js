// Costas: capas, mochilas, armas penduradas, asas e instrumentos.
// Ordem na composicao: de frente e de perfil a peca fica ATRAS do corpo (so as
// bordas aparecem: por isso as pecas sao largas/altas o bastante para "vazar"
// pelas margens do quadro); de costas ela vem por cima. O que cruza o peito
// (alca, fivela da capa) sai em drawOver, na camada 'over', acima da roupa.
// Legenda da arte: '0'-'4' = canal a (tons), 'a'-'e' = canal b, 'A'-'E' = canal c,
// mais cores fixas (fogo, brilho, papel) que nao fazem sentido recolorir.
const LG = {
  w: ['w', 4], W: ['w', 3], z: ['w', 1], k: ['#2e2a35', 1], K: ['#2e2a35', 0],
  y: ['#f6d66a', 3], Y: ['#e8902e', 2], f: ['#fff1b0', 4], r: ['#d8503a', 2], R: ['#9c2a2a', 2],
  g: ['#8fe0ff', 3], G: ['#4aa0d8', 2], v: ['#6faa4a', 3], V: ['#4f8238', 2], p: ['#e07a9a', 3]
};
for (let i = 0; i < 5; i++) { LG[i] = ['a', i]; LG['abcde'[i]] = ['b', i]; LG['ABCDE'[i]] = ['c', i]; }

// Arte com cisalhamento: a linha r desliza floor((r - ar) * s) colunas. Assim um
// desenho feito em pe vira diagonal sem redesenhar (espada cruzando as costas).
function sart(L, ax, ay, rows, o = {}) {
  const [ac, ar] = o.anchor || [0, 0];
  const s = o.s || 0, m = o.mirror ? -1 : 1, ds = o.ds || 0;
  rows.forEach((row, r) => {
    const sh = Math.floor((r - ar) * s);
    [...row].forEach((ch, c) => {
      const v = LG[ch];
      if (!v) return;
      L.px(ax + m * (c - ac) + sh, ay + r - ar, v[0], v[1] + ds);
    });
  });
}
function line(L, x0, y0, x1, y1, c, s) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) L.px(Math.round(x0 + ((x1 - x0) * i) / (n || 1)), Math.round(y0 + ((y1 - y0) * i) / (n || 1)), c, typeof s === 'function' ? s(i) : s);
}
const sw = (P) => (P.walk ? P.phase : 0);
const hash = (x, y) => ((x * 73 + y * 151) ^ (x * y)) % 7;

// ---------------------------------------------------------------- capas
// Capa parametrica: comprimento, abertura (flare), barra (reta/rasgada/ponta),
// gola (pelo/capuz/alta/penas), padrao e forro. De frente o que se ve e o FORRO
// (o lado de dentro aparece nas bordas), de costas o lado de fora com pregas.
function capeDraw(o) {
  return (L, P) => {
    const T = P.torso, top = T.top;
    const yb = o.long ? P.ground - 1 : P.hip + (o.len ?? 1);
    const n = yb - top;
    const s = sw(P);
    const hemCut = (x, y) => {
      if (o.hem === 'torn') return y > yb - ((hash(x, 3) % 4) === 0 ? 3 : hash(x, 1) % 3);
      if (o.hem === 'point') return y > yb - Math.abs(x - 11.5) / 2.5 + 2 && false;
      if (o.hem === 'zig') return y === yb && x % 2 === 0;
      return false;
    };
    const tone = (x, y, t) => {
      let c = 'a';
      if (o.pattern === 'patch' && ((Math.floor(x / 3) + Math.floor((y - top) / 3)) % 3 === 0)) { c = 'b'; }
      if (o.pattern === 'feather') { t += ((x + Math.floor((y - top) / 2)) % 2 === 0 && (y - top) % 2 === 1) ? -1 : 0; if ((y - top) % 2 === 1 && x % 2 === 0) c = 'b'; }
      if (o.pattern === 'stripe' && (y - top) % 4 === 2) c = 'b';
      return [c, t];
    };
    if (P.view === 'side') {
      const flut = P.walk ? 1 + (P.f % 2) : 0;
      for (let y = top; y <= yb; y++) {
        const r = y - top;
        const w = 1 + Math.min(o.flare ?? 3, Math.floor(r / 3));
        const tr = Math.floor((flut * r) / (n + 1) * 1.6);
        const xa = T.x1 - 2, xb = T.x1 + w + tr;
        for (let x = xa; x <= xb; x++) {
          if (hemCut(x - tr, y)) continue;
          let t = x === xb ? 1 : r < 2 ? 3 : 2;
          if (y === yb) t = Math.min(t, 1);
          const [c, tt] = tone(x, y, t);
          L.px(x, y, c, tt);
        }
        if (o.trim === 'ermine' && y >= yb - 1) for (let x = xa; x <= xb; x++) L.over(x, y, (x + y) % 3 ? 'w' : 'k', (x + y) % 3 ? 3 : 1);
        if (o.trim === 'border' && y === yb - 1) for (let x = xa; x <= xb; x++) L.over(x, y, 'b', 2);
      }
      return;
    }
    const up = P.view === 'up';
    const y0 = up ? top - 1 : top;
    for (let y = y0; y <= yb; y++) {
      const r = y - top;
      const hs = r > n / 2 ? s : 0;
      // de costas a capa cobre os ombros e vai abrindo sobre os bracos ate a barra
      const fl = up ? Math.min(Math.min(2, o.flare ?? 2), Math.floor((r + 2) / 3)) : Math.min(o.flare ?? 2, Math.floor((r + 1) / 3));
      const xa = T.x0 - (up ? 0 : 1) - fl + hs + (up && r < 0 ? 1 : 0);
      const xb = T.x1 + (up ? 0 : 1) + fl + hs - (up && r < 0 ? 1 : 0);
      for (let x = xa; x <= xb; x++) {
        if (hemCut(x - hs, y)) continue;
        let t = x === xa ? 3 : x === xb ? 1 : x === xb - 1 ? 1.6 : 2;
        if (up) {
          const mid = (xa + xb) / 2;
          // pregas: vincos escuros com um fio de luz ao lado (luz do alto-esquerda)
          // duas pregas que nascem no meio das costas e se aprofundam para baixo
          for (const fx of [Math.round(mid - 2), Math.round(mid + 3)]) {
            if (r >= 3 && x === fx) t = r >= 6 ? 1 : 1.6;
            if (r >= 5 && x === fx - 1) t = 3;
          }
          if (r <= 0) t = 3;
        }
        if (y === yb) t = Math.min(t, 1);
        t = Math.round(t);
        let [c, tt] = tone(x, y, t);
        if (!up && o.lining) c = x === xa || x === xb ? 'a' : 'b';
        L.px(x, y, c, tt);
      }
      if (o.trim === 'ermine') {
        if (y >= yb - 1) for (let x = xa; x <= xb; x++) L.over(x, y, (x * 2 + y) % 5 ? 'w' : 'k', (x * 2 + y) % 5 ? (y === yb ? 2 : 3) : 1);
        if (!up) { L.over(xa, y, 'w', 3); L.over(xb, y, 'w', 2); }
      }
      if (o.trim === 'border' && y === yb - 1) for (let x = xa; x <= xb; x++) L.over(x, y, 'b', x % 2 ? 2 : 3);
    }
    // golas que aparecem de frente/costas atras da cabeca
    if (o.collar === 'high') {
      if (up) {
        for (let y = top - 4; y < top; y++) for (let x = T.x0; x <= T.x1; x++) {
          if (y === top - 4 && (x === T.x0 || x === T.x1)) continue;
          L.px(x, y, 'a', x === T.x0 ? 3 : x === T.x1 ? 1 : y === top - 4 ? 3 : 2);
        }
      } else {
        for (let y = top - 4; y <= top; y++) {
          const k = y - (top - 4);
          L.px(T.x0 - 1, y, 'a', 3); L.px(T.x0, y, 'b', k < 1 ? 3 : 2);
          L.px(T.x1 + 1, y, 'a', 1); L.px(T.x1, y, 'b', k < 1 ? 2 : 1);
        }
      }
    }
    if (o.collar === 'fur' || o.collar === 'feather') {
      const ch = o.collar === 'fur' ? 'b' : 'b';
      if (up) {
        for (let x = T.x0 - 1; x <= T.x1 + 1; x++) {
          L.px(x, top - 1, ch, (x % 2) ? 3 : 4);
          L.px(x, top, ch, (x % 2) ? 2 : 3);
          if (o.collar === 'feather' || x % 2 === 0) L.px(x, top + 1, ch, 2);
          if (o.collar === 'feather' && x % 2) L.px(x, top + 2, ch, 1);
        }
        for (let x = T.x0 + 1; x <= T.x1 - 1; x += 2) L.px(x, top - 2, ch, 3);
      } else {
        for (const x of [T.x0 - 2, T.x0 - 1, T.x0, T.x1, T.x1 + 1, T.x1 + 2]) {
          L.px(x, top - 1, ch, x < 12 ? 3 : 2);
          L.px(x, top, ch, x < 12 ? 4 : 2);
          if (x % 2 === 0) L.px(x, top - 2, ch, 3);
        }
      }
    }
    if (o.collar === 'hood') {
      if (up) {
        // capuz caido sobre a nuca: bolsa de pano com a abertura escura em cima
        const hy = top - 3;
        sart(L, 12, hy, [
          '..2222..',
          '.311112.',
          '33100112',
          '33322221',
          '.333221.',
          '..3221..',
          '...21...'
        ], { anchor: [4, 0] });
      } else {
        for (const x of [T.x0 - 1, T.x0, T.x1, T.x1 + 1]) { L.px(x, top - 2, 'a', x < 12 ? 3 : 1); L.px(x, top - 1, 'a', x < 12 ? 3 : 1); }
      }
    }
  };
}
function capeSide(o) {
  return (L, P) => {
    const T = P.torso, top = T.top;
    if (o.collar === 'hood') sart(L, T.x1 - 1, top - 4, ['.222.', '33212', '332211', '.3221', '..21'], {});
    if (o.collar === 'fur' || o.collar === 'feather') sart(L, T.x1 - 2, top - 2, ['.d.d.', 'deded', 'dcdcb', '.c.c'], {});
    if (o.collar === 'high') sart(L, T.x1 - 1, top - 5, ['.3', '33', '33c', '32c', '32c', '22'], {});
  };
}
function capeOver(o) {
  return (L, P) => {
    const T = P.torso, top = T.top;
    if (P.view === 'up') return;
    if (P.view === 'side') {
      L.px(T.x1 - 1, top, 'a', 3); L.px(T.x1, top, 'a', 2);
      if (o.collar === 'fur' || o.collar === 'feather') { L.px(T.x1 - 2, top, 'b', 4); L.px(T.x1 - 1, top, 'b', 3); L.px(T.x1, top, 'b', 2); }
      if (o.clasp !== false) L.px(T.x0 + 1, top, 'c', 4);
      return;
    }
    // ponta da capa dobrando por cima dos ombros + fecho no meio do peito
    L.px(T.x0 + 1, top, 'a', 3); L.px(T.x0 + 2, top, 'a', 2);
    L.px(T.x1 - 1, top, 'a', 1); L.px(T.x1 - 2, top, 'a', 2);
    if (o.collar === 'fur' || o.collar === 'feather') {
      for (let x = T.x0 + 1; x <= T.x1 - 1; x++) if (x < 10 || x > 13) { L.px(x, top, 'b', x < 12 ? 4 : 2); if (x % 2) L.px(x, top + 1, 'b', x < 12 ? 3 : 1); }
    }
    if (o.trim === 'ermine') { L.px(T.x0 + 1, top + 1, 'w', 3); L.px(T.x1 - 1, top + 1, 'w', 2); L.px(T.x0 + 1, top, 'w', 4); L.px(T.x1 - 1, top, 'w', 2); }
    if (o.clasp === 'chain') { L.hline(T.x0 + 3, T.x1 - 3, top, 'c', 3); for (let x = T.x0 + 3; x <= T.x1 - 3; x += 2) L.px(x, top, 'c', 4); }
    else if (o.clasp !== false) { L.px(11, top, 'c', 4); L.px(12, top, 'c', 2); L.px(11, top + 1, 'c', 2); L.px(12, top + 1, 'c', 1); }
  };
}
function capelet(L, P, o) {
  // capinha curta que cobre os ombros (por cima dos bracos: etiqueta 'arm')
  const T = P.torso, top = T.top;
  if (P.view === 'side') {
    L.withTag('arm', () => {
      for (let r = 0; r < 4; r++) for (let x = T.x0 + 1 - Math.min(r, 2); x <= T.x1 + 1 + Math.min(r, 1); x++) {
        if (r === 3 && x % 2) continue;
        L.px(x, top + r, 'a', r === 0 ? 3 : x <= T.x0 ? 3 : r === 3 ? 1 : 2);
      }
      L.px(T.x0 + 1, top, 'c', 4);
    });
    return;
  }
  const up = P.view === 'up';
  L.withTag(up ? 'main' : 'arm', () => {
    for (let r = 0; r < 5; r++) {
      const ext = Math.min(r + (up ? 0 : 0), 2);
      const xa = T.x0 - ext, xb = T.x1 + ext;
      for (let x = xa; x <= xb; x++) {
        if (!up && r < 2 && x >= 10 && x <= 13) continue; // decote
        if (r === 4 && (x - xa) % 3 === 1) continue; // barra recortada
        if (!up && r >= 2 && x >= 11 && x <= 12) continue;
        let t = x === xa ? 3 : x === xb ? 1 : r === 0 ? 3 : 2;
        if (r === 4 || r === 3 && (x - xa) % 3 === 1) t = 1;
        L.px(x, top - (up ? 1 : 0) + r, (o.trim && r === 3) ? 'b' : 'a', t);
      }
    }
    if (!up) { L.px(10, top + 1, 'c', 4); L.px(13, top + 1, 'c', 3); L.hline(10, 13, top + 2, 'c', 2); }
    else L.hline(T.x0 + 2, T.x1 - 2, top - 1, 'a', 3);
  });
}
function cape(id, name, channels, o) {
  const body = capeDraw(o), side = capeSide(o), over = capeOver(o);
  return {
    id, name, sub: 'Capas', channels,
    draw(L, P) { body(L, P); if (P.view === 'side') side(L, P); },
    drawOver: over
  };
}

// ---------------------------------------------------------------- mochilas
// Mochila: desenho de costas (inteira), de perfil (fina, atras das costas) e de
// frente so as alcas no peito (drawOver) + o que sobra por cima dos ombros.
function pack(id, name, channels, spec) {
  return {
    id, name, sub: 'Mochilas e bolsas', channels,
    draw(L, P) {
      const T = P.torso, top = T.top;
      const jig = P.walk && P.f % 2 ? 1 : 0; // a carga "quica" meio passo atrasada
      if (P.view === 'side') {
        spec.sideBefore?.(L, P, jig);
        if (spec.side) sart(L, T.x1 + (spec.sx ?? 0), top - 1 + jig + (spec.sy ?? 0), spec.side);
        spec.sideAfter?.(L, P, jig);
        return;
      }
      const up = P.view === 'up';
      const rows = spec.up;
      const w = rows ? rows[0].length : 0;
      spec.before?.(L, P, jig, up);
      if (rows) sart(L, 12 - (w >> 1), top - 1 + jig + (spec.uy ?? 0), rows, { mirror: !up && spec.mirrorDown, anchor: [0, 0] });
      spec.after?.(L, P, jig, up);
    },
    drawOver(L, P) {
      const T = P.torso, top = T.top;
      if (spec.over) return spec.over(L, P);
      if (P.view === 'up') return;
      if (P.view === 'side') {
        L.hline(T.x0 + 2, T.x1 - 1, top, 'b', 2);
        L.vline(T.x0 + 1, top, top + 4, 'b', 1); L.px(T.x0 + 1, top + 3, 'c', 3);
        return;
      }
      for (const [x, t] of [[T.x0 + 2, 3], [T.x1 - 2, 1]]) {
        L.vline(x, top, top + 5, 'b', t);
        L.px(x, top + 3, 'c', t === 3 ? 4 : 2);
      }
    }
  };
}
// lanterna de ferro com chama (cor fixa: fogo nao se recolore); x = centro
function lanternArt(L, x, y, glow) {
  sart(L, x, y, ['.D.', 'CDB', 'yfy', 'fwf', 'YyY', 'CBA'], { anchor: [1, 0] });
  if (glow) { L.px(x, y + 3, 'f', 4); L.px(x - 1, y + 3, 'y', 4); }
}
// saco de dormir enrolado na horizontal: largo o bastante para aparecer de frente
function bedroll(L, P, y, ext = 3, ch = 'b') {
  const T = P.torso;
  if (P.view === 'side') {
    L.rect(T.x1, y, 4, 4, ch, 2); L.px(T.x1, y, ch, 3); L.px(T.x1 + 1, y, ch, 3); L.px(T.x1 + 1, y + 1, ch, 0); L.px(T.x1 + 2, y + 2, ch, 1); L.px(T.x1 + 3, y + 3, ch, 1);
    L.erase(T.x1 + 3, y); L.erase(T.x1, y + 3); L.px(T.x1 + 2, y + 1, 'c', 3); return;
  }
  const xa = T.x0 - ext, xb = T.x1 + ext;
  for (let x = xa; x <= xb; x++) {
    L.px(x, y, ch, x === xa || x === xb ? 2 : 3);
    L.px(x, y + 1, ch, x === xa || x === xb ? 1 : 2);
    L.px(x, y + 2, ch, 1);
  }
  // ponta em espiral e duas amarras
  for (const x of [xa, xb]) { L.px(x, y + 1, ch, 0); }
  for (const x of [xa + 2, xb - 2]) { L.px(x, y, 'c', 3); L.px(x, y + 1, 'c', 2); L.px(x, y + 2, 'c', 1); }
}
const PACK_UP = [
  '...dcc....',
  '.deeddddc.',
  'deddddddcb',
  'dcccccccbb',
  'dccDEDccbb',
  'abbbCBbbba',
  '4333333321',
  '3433333221',
  '3d33333dc1',
  '3c33322cb1',
  '.11111111.'
];
const PACK_SIDE = ['dc..', 'eddc', 'dccb', 'cbCb', '3332', '3321', '3321', '3dc1', '3cb1', '.11.'];

// ---------------------------------------------------------------- armas e objetos nas costas
// Desenho feito em pe (topo = cabo/ponta de cima), cisalhado na diagonal:
// de frente o cabo sobe atras do ombro direito do personagem (esquerda da tela),
// de costas o espelho, de perfil quase em pe atras da nuca.
function onBack(rows, o = {}) {
  const ac = o.ac ?? (rows[0].length >> 1);
  return (L, P) => {
    const T = P.torso, top = T.top + (o.dy ?? 0);
    const s = o.s ?? 0.7;
    if (P.view === 'down') sart(L, T.x0 - 4 + (o.dx ?? 0), top - 7, rows, { anchor: [ac, 0], s, mirror: o.flipDown });
    else if (P.view === 'up' && o.up) sart(L, 12 + o.up[0], T.top + o.up[1], rows, { anchor: [ac, 0], s: o.up[2] ?? 0, mirror: true });
    else if (P.view === 'up') sart(L, T.x1 + 4 - (o.dx ?? 0), top - 7, rows, { anchor: [ac, 0], s: -s, mirror: !o.flipDown });
    else sart(L, T.x1 + 5 + (o.dxs ?? 0), top - 6 + (o.dys ?? 0), rows, { anchor: [ac, 0], s: o.ss ?? -0.25 });
  };
}
// alca em diagonal no peito (do ombro direito ao quadril esquerdo)
function strapOver(L, P, o = {}) {
  const T = P.torso, top = T.top;
  if (P.view === 'up') return;
  if (P.view === 'side') {
    line(L, T.x1 - 1, top, T.x0 + 1, P.hip - 2, 'b', 1);
    return;
  }
  line(L, T.x0 + 1, top, T.x1 - 1, P.hip - 2, 'b', (i) => (i % 3 === 0 ? 3 : 2));
  if (o.buckle !== false) { const m = Math.round((T.x0 + T.x1) / 2) - 1; L.px(m, top + (m - T.x0 - 1), 'c', 4); }
  if (o.mirror) line(L, T.x1 - 1, top, T.x0 + 1, P.hip - 2, 'b', 2);
}
function strapBack(L, P, mirror) {
  const T = P.torso, top = T.top;
  if (P.view !== 'up') return;
  line(L, T.x1 - 1, top, T.x0 + 1, P.hip - 2, 'b', 2);
  if (mirror) line(L, T.x0 + 1, top, T.x1 - 1, P.hip - 2, 'b', 1);
}
function weapon(id, name, channels, rows, o = {}, sub = 'Armas nas costas') {
  const d = onBack(rows, o);
  return {
    id, name, sub, channels,
    draw(L, P) { if (o.strap !== false) strapBack(L, P, o.cross); o.before?.(L, P); d(L, P); o.after?.(L, P); },
    drawOver(L, P) { if (o.strap !== false) strapOver(L, P, { mirror: o.cross }); }
  };
}

const SWORD = ['.C.', '.b.', '.c.', '.b.', 'BDCB', '.dc', '.dc', '.dc', '.dc', '.dc', '.dc', '.dc', '.cb', '.CB', '..B'];
const GREAT = ['..D..', '..c..', '..b..', '..c..', '..b..', 'BDDCB', '.EDC.', '.434.', '.4321', '.4321', '.4321', '.4321', '.4321', '.4321', '.4321', '.432.', '..3..', '..2..'];
const AXE = ['...E.', '.44D2', '443d1', '433c1', '.32c1', '..1c.', '...b.', '...c.', '...b.', '...c.', '...b.', '...c.', '...b.', '...C.'];
const HAMMER = ['.DEDC.', 'CDDCCB', 'CDCCCB', 'BCCCBA', '..dc..', '..cb..', '..dc..', '..cb..', '..dc..', '..cb..', '..dc..', '..CB..'];
const STAFF = ['.gG.', 'gwgG', 'GgGG', 'CGGB', '.Cd.', '.Bc.', '..c.', '..d.', '..c.', '..b.', '..c.', '..d.', '..c.', '..b.', '..c.', '..d.', '..c.', '..b.', '..a.'];
const SPEAR = ['..4..', '..43.', '.443.', '.432.', '..2..', '.CDC.', '..rR.', '..dc.', '..cb.', '..dc.', '..cb.', '..dc.', '..cb.', '..dc.', '..cb.', '..dc.', '..cb.', '..dc.', '..B..'];
const BOW = ['.Cc..', 'C.dc.', '...dc', '...cb', 'w..cb', 'w...c', 'w...c', 'w..DC', 'w..CB', 'w...c', 'w...b', 'w..cb', 'w..cb', '...cb', 'C.cb.', '.Cb..'];
const QUIVER = ['y.Y.y', 'yr.Yr', '.4.4.', 'dDCDb', 'ddccb', 'dcccb', 'dcccb', 'ddccb', 'DDCCB', 'dcccb', 'dcccb', 'dccbb', '.cbb.'];
const SCROLL = ['.w.', 'wWz', 'CDB', 'dcb', 'dcb', 'Dcb', 'dcb', 'dcb', 'dcb', 'DCB', 'dcb', 'dcb', 'CCB'];
const LUTE = ['.cD.', 'dcCD', '.dcD', '..c.', '..c.', '..c.', '..c.', '..2.', '.333.', '33k22', '43k21', '332221', '33D221', '.3221.', '..11.'];

// escudos: de costas mostram a face inteira; de frente so a borda atras dos
// ombros; de perfil a espessura (um "chanfro" fino atras das costas).
function shield(kind) {
  return (L, P) => {
    const T = P.torso, top = T.top;
    if (P.view === 'side') {
      // de lado o escudo e um gomo: aro de metal por fora, madeira por dentro e o umbo saltado
      const h = kind === 'round' ? 11 : 13;
      for (let r = 0; r < h; r++) {
        const e = Math.min(r, h - 1 - r);
        const fat = kind === 'kite' && r > h - 5 ? (r === h - 1 ? 1 : 2) : e === 0 ? 1 : e === 1 ? 2 : 3;
        for (let k = 0; k < fat; k++) {
          const outer = k === fat - 1;
          L.px(T.x1 + k, top - 2 + r, outer ? 'c' : k === 0 ? 'a' : 'b', outer ? (r < h / 2 ? 3 : 1) : (r < 3 ? 3 : 2));
        }
      }
      if (kind === 'round') { L.px(T.x1 + 3, top + 2, 'c', 4); L.px(T.x1 + 3, top + 3, 'c', 2); }
      return;
    }
    const up = P.view === 'up';
    const cx = 11.5;
    if (kind === 'round') {
      const cy = top + 3.5, R = up ? 5.6 : 6.6;
      for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (let x = 0; x < 24; x++) {
        const dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
        if (d > R) continue;
        const edge = d > R - 1.2;
        const lit = dx + dy < 0;
        if (edge) L.px(x, y, 'c', lit ? 3 : 1);
        else if (d < 1.3) L.px(x, y, 'c', dx + dy < 0 ? 4 : 2); // umbo
        else {
          // quartos pintados alternados (canal b) sobre as tabuas (canal a), estilo nordico
          const q = (dx < 0) !== (dy < 0);
          let c = q ? 'b' : 'a', t = lit ? 3 : 2;
          if (d > R - 2.2) t = lit ? 3 : 1; // aba interna sombreada da borda
          if (!q && x % 3 === 0 && d < R - 2.2) t -= 1; // junta das tabuas
          L.px(x, y, c, t);
        }
      }
      if (up) for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) L.px(Math.round(cx + dx), Math.round(cy + dy), 'c', 4);
    } else {
      // escudo de pipa: topo reto, ponta embaixo
      const y0 = top - 1, h = 13, hw = up ? 5 : 6;
      for (let r = 0; r < h; r++) {
        const w = r < 6 ? hw : Math.max(0, Math.round(hw * (1 - (r - 5) / (h - 5))));
        if (w <= 0 && r !== h - 1) continue;
        for (let x = Math.floor(cx - w) + 1; x <= Math.ceil(cx + w) - 1; x++) {
          const edge = x === Math.floor(cx - w) + 1 || x === Math.ceil(cx + w) - 1 || r === 0;
          let c = 'a', t = x < cx ? 3 : 2;
          if (edge) { c = 'c'; t = x < cx || r === 0 ? 3 : 1; }
          else if (Math.abs(x - cx) < 1 || r === 3) { c = 'b'; t = x < cx ? 3 : 2; } // cruz do brasao
          L.px(x, y0 + r, c, t);
        }
        if (w <= 0) L.px(11, y0 + r, 'c', 1);
      }
    }
  };
}

// ---------------------------------------------------------------- asas
// Cada asa tem a arte da asa ESQUERDA da tela vista de frente (raiz embaixo a
// direita) e a arte de perfil (raiz embaixo a esquerda, abre para tras). De
// frente/costas espelha para o outro lado; de perfil desenha a asa de longe
// mais escura e deslocada, para dar profundidade. Bate 1px com o passo/respiro.
function wings(id, name, channels, F, rootF, S, rootS) {
  return {
    id, name, sub: 'Asas', channels,
    draw(L, P) {
      const T = P.torso, top = T.top;
      const flap = P.walk ? (P.f % 2 ? -1 : 0) : (P.f ? -1 : 0);
      if (P.view === 'side') {
        sart(L, T.x1 + 1, top + 1 + flap - 1, S, { anchor: rootS, ds: -1 });
        sart(L, T.x1 - 1, top + 2 + flap, S, { anchor: rootS });
        return;
      }
      const up = P.view === 'up';
      const ix = up ? 2 : 1;
      sart(L, T.x0 + ix, top + 2 + flap, F, { anchor: rootF });
      sart(L, T.x1 - ix, top + 2 + flap, F, { anchor: rootF, mirror: true, ds: up ? 0 : -0 });
    }
  };
}
const W_FEATHER = [
  '....3444.',
  '..344433.',
  '.3443332.',
  '34433322.',
  '4433d221.',
  '43d3d221.',
  '3d3dd2211',
  'dcdcd2211',
  'dcdcdc211',
  'cdcdcc111',
  'cbcbcb111',
  '.bcbcb...',
  '.cb.b....',
  '..b......'
];
const W_FEATHER_S = [
  '......44',
  '....4443',
  '...44332',
  '..44332d',
  '.4332ddc',
  '3332dcdc',
  '332dcdcb',
  '32dcdcb.',
  '2dcdcb..',
  'dcdcb...',
  'ccb.....',
  'b.......'
];
const W_FAIRY = [
  '.34443...',
  '34ww443..',
  '4w4b332..',
  '4w3b3322.',
  '.33b3221.',
  '..33221..',
  '....2211.',
  '...3221..',
  '..3w321..',
  '..33b21..',
  '...321...'
];
const W_FAIRY_S = [
  '...3444.',
  '..34ww43',
  '.334b332',
  '.33b322.',
  '3332221.',
  '2221....',
  '3321....',
  '.3w32...',
  '..3b21..',
  '...21...'
];
const W_BUTTERFLY = [
  '.3444....',
  '34bb43...',
  '4bEB332..',
  '3bBb3322.',
  '33332221.',
  '.3332211.',
  '..22211..',
  '.32d21...',
  '3dEd21...',
  '3dd321...',
  '.3221....',
  '..11.....'
];
const W_BUTTERFLY_S = [
  '...3444.',
  '..34bb43',
  '.33bEB43',
  '.33bbb32',
  '333322..',
  '2221....',
  '32d21...',
  '3dEd2...',
  '.3d21...',
  '..21....'
];
// Asas de membrana (morcego/dragao/ossos) saem de geometria: pulso, pontas dos
// dedos e membrana entre eles com a barra recortada em arco. Desenhar por pontos
// deixa os ossos retos e limpos (a mao tremia nos degraus da arte em texto).
// Coordenadas relativas a raiz; asa esquerda da tela (abre para x negativo).
function inPoly(pts, x, y) {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
function memWing(g) {
  // g: { wrist, tips, low, sc (0..1 fundo do recorte), mem: 'full'|'rag'|false, bone, boneT, claw, spikes }
  return (L, ox, oy, m, ds = 0) => {
    const X = (x) => ox + m * x;
    const pts = [[0, 0], g.wrist];
    g.tips.forEach((t, i) => {
      pts.push(t);
      const n = g.tips[i + 1] || g.low;
      // recorte da membrana: ponto medio puxado na direcao do pulso
      const mx = (t[0] + n[0]) / 2, my = (t[1] + n[1]) / 2;
      pts.push([mx + (g.wrist[0] - mx) * g.sc, my + (g.wrist[1] - my) * g.sc]);
    });
    pts.push(g.low);
    const angs = g.tips.map((t) => Math.atan2(t[1] - g.wrist[1], t[0] - g.wrist[0]));
    if (g.mem) {
      for (let y = -14; y <= 6; y++) for (let x = -11; x <= 1; x++) {
        if (!inPoly(pts, x + 0.5, y + 0.5)) continue;
        const a = Math.atan2(y + 0.5 - g.wrist[1], x + 0.5 - g.wrist[0]);
        let panel = angs.filter((t) => t < a).length;
        if (g.mem === 'rag' && panel % 2 === 0) continue;
        let t = panel % 2 ? 1 : 2;
        if (!inPoly(pts, x + 0.5, y - 0.5)) t = 3;
        else if (!inPoly(pts, x + 0.5, y + 1.5)) t = Math.min(t, 1);
        L.px(X(x), oy + y, 'a', t + ds);
      }
    }
    const bone = (a, b, t) => line(L, X(a[0]), oy + a[1], X(b[0]), oy + b[1], g.bone, t + ds);
    bone([0, 0], g.wrist, g.boneT + 1);
    if (g.thick) bone([0, 1], [g.wrist[0], g.wrist[1] + 1], g.boneT);
    for (const t of g.tips) bone(g.wrist, t, g.boneT);
    if (g.claw) { L.px(X(g.wrist[0]), oy + g.wrist[1] - 1, 'c', 4 + ds); L.px(X(g.wrist[0] + 1), oy + g.wrist[1] - 2, 'c', 3 + ds); }
    if (g.spikes) for (const t of g.tips) L.px(X(t[0]) , oy + t[1] + 1, 'c', 3 + ds);
  };
}
const G_BAT = { wrist: [-4, -7], tips: [[-10, -6], [-10, 0], [-6, 4]], low: [-1, 3], sc: 0.35, mem: 'full', bone: 'b', boneT: 1, claw: true };
const G_BAT_S = { wrist: [3, -9], tips: [[8, -10], [9, -4], [6, 1]], low: [1, 2], sc: 0.35, mem: 'full', bone: 'b', boneT: 1, claw: true };
const G_DRAGON = { wrist: [-5, -9], tips: [[-11, -10], [-11, -4], [-10, 1], [-5, 4]], low: [-1, 3], sc: 0.25, mem: 'full', bone: 'b', boneT: 2, claw: true, spikes: true, thick: true };
const G_DRAGON_S = { wrist: [3, -10], tips: [[9, -12], [10, -6], [9, -1], [5, 2]], low: [1, 2], sc: 0.25, mem: 'full', bone: 'b', boneT: 2, claw: true, spikes: true, thick: true };
const G_BONE = { wrist: [-4, -8], tips: [[-10, -8], [-10, -3], [-8, 2], [-4, 3]], low: [-1, 2], sc: 0.3, mem: 'rag', bone: 'c', boneT: 3, claw: true };
const G_BONE_S = { wrist: [3, -9], tips: [[8, -11], [9, -6], [8, -1], [4, 2]], low: [1, 2], sc: 0.3, mem: 'rag', bone: 'c', boneT: 3, claw: true };
function geoWings(id, name, channels, gF, gS) {
  const F = memWing(gF), S = memWing(gS);
  return {
    id, name, sub: 'Asas', channels,
    draw(L, P) {
      const T = P.torso, top = T.top;
      const flap = P.walk ? (P.f % 2 ? -1 : 0) : (P.f ? -1 : 0);
      if (P.view === 'side') {
        S(L, T.x1 + 3, top + flap, 1, -1); // asa de longe: mais alta e escura
        S(L, T.x1 - 1, top + 3 + flap, 1, 0);
        return;
      }
      const ix = P.view === 'up' ? 2 : 1;
      F(L, T.x0 + ix, top + 3 + flap, 1);
      F(L, T.x1 - ix, top + 3 + flap, -1);
    }
  };
}

// ---------------------------------------------------------------- instrumentos
function drum(L, P) {
  const T = P.torso, top = T.top;
  // baquetas cruzadas presas por cima (aparecem dos dois lados da cabeca)
  const sticks = (xa, xb, y) => { line(L, xa, y, xa + 4, y + 4, 'c', 3); line(L, xb, y, xb - 4, y + 4, 'c', 2); L.px(xa, y, 'w', 3); L.px(xb, y, 'w', 3); };
  if (P.view === 'side') {
    line(L, T.x1 + 4, top - 5, T.x1 + 1, top - 1, 'c', 3); L.px(T.x1 + 4, top - 5, 'w', 3);
    for (let r = 0; r < 7; r++) for (let k = 0; k < 4; k++) {
      const rim = r === 0 || r === 6;
      L.px(T.x1 + k, top + r, rim ? 'c' : k === 3 ? 'w' : 'b', rim ? 2 : k === 3 ? (r < 3 ? 3 : 2) : ((r + k) % 3 === 0 ? 'c' : 2) === 'c' ? 2 : 2);
      if (!rim && k < 3 && (r + k) % 3 === 0) L.px(T.x1 + k, top + r, 'c', 3);
    }
    return;
  }
  const up = P.view === 'up';
  const x0 = 12 - 5, y0 = top - 1;
  if (up) sticks(x0 - 1, x0 + 10, y0 - 5); else sticks(x0 - 3, x0 + 12, y0 - 6);
  for (let r = 0; r < 10; r++) for (let k = 0; k < 10; k++) {
    if ((r === 0 || r === 9) && (k === 0 || k === 9)) continue;
    const x = x0 + k, y = y0 + r;
    if (r < 2) { L.px(x, y, 'w', r === 0 ? 4 : (k < 5 ? 3 : 2)); continue; } // pele esticada (vista de cima)
    if (r === 2 || r === 9) { L.px(x, y, 'c', r === 2 ? (k < 5 ? 3 : 2) : 1); continue; } // aros
    // corpo com a corda em zigue-zague
    const zig = Math.abs(((k + (r - 3)) % 6) - 3) === 0 || Math.abs(((k - (r - 3) + 60) % 6) - 3) === 0;
    L.px(x, y, zig ? 'c' : 'b', zig ? 3 : k === 0 ? 3 : k === 9 ? 1 : 2);
  }
}
const LYRE = ['C..C', 'D..C', 'Dw.C', 'DwwC', 'DwwB', 'cwwb', '.dc.', '.cb.'];
const LYRE_BIG = ['D.....C', 'D.....C', '.D.w.C.', '.DwwwC.', '.dwwwb.', '.ddccb.', '..CCB..'];
const HORN = ['..DDC..', '.D...C.', 'D.dcb.C', 'D.c.b.B', 'D.cbb.B', '.D...B.', '.CCB...', '...BAA.', '....BAA', '....ECA'];

// ---------------------------------------------------------------- lista
const C = (a, b, c) => {
  const out = [];
  if (a) out.push({ label: a[0], def: a[1] });
  if (b) out.push({ label: b[0], def: b[1] });
  if (c) out.push({ label: c[0], def: c[1] });
  return out;
};
const W3 = (a, b, c) => C(['Metal', a], ['Cabo', b], ['Guarda', c]);

export const BACK = [
  // ---- capas ----
  cape('capa-curta', 'Capa curta', C(['Tecido', 'sangue'], ['Forro', 'linho'], ['Fecho', 'bronze']), { len: 1, flare: 1 }),
  cape('capa-longa', 'Capa longa', C(['Tecido', 'azul-noite'], ['Forro', 'cinza-claro'], ['Fecho', 'prata']), { long: true, lining: true, trim: 'border' }),
  cape('capa-rasgada', 'Capa rasgada', C(['Tecido', 'carvao'], ['Forro', 'chumbo'], ['Fecho', 'ferro']), { long: true, hem: 'torn', flare: 3, clasp: 'chain' }),
  cape('capa-gola-pelo', 'Capa com gola de pelo', C(['Tecido', 'floresta'], ['Pelo', 'camurca'], ['Fecho', 'bronze']), { long: true, collar: 'fur' }),
  cape('capa-capuz', 'Capa com capuz', C(['Tecido', 'musgo'], ['Forro', 'linho'], ['Fecho', 'bronze']), { len: 3, collar: 'hood', lining: true }),
  cape('capa-real', 'Manto real', C(['Veludo', 'carmesim'], ['Forro', 'ouro'], ['Fecho', 'ouro']), { long: true, flare: 3, trim: 'ermine', clasp: 'chain' }),
  cape('capa-gola-alta', 'Capa de gola alta', C(['Tecido', 'carvao'], ['Forro', 'sangue'], ['Fecho', 'prata']), { long: true, collar: 'high', lining: true, hem: 'zig' }),
  cape('manto-penas', 'Manto de penas', C(['Penas', 'petroleo'], ['Pontas', 'jade'], ['Fecho', 'ouro']), { long: true, pattern: 'feather', collar: 'feather', hem: 'zig' }),
  cape('capa-retalhos', 'Capa de retalhos', C(['Tecido', 'terra'], ['Remendo', 'mostarda'], ['Fecho', 'ferro']), { len: 4, pattern: 'patch', hem: 'torn', flare: 2 }),
  cape('capa-listrada', 'Capa listrada de viagem', C(['Tecido', 'oliva'], ['Listra', 'ocre'], ['Fecho', 'cobre']), { len: 3, pattern: 'stripe', flare: 2 }),
  {
    id: 'capelete', name: 'Capelete', sub: 'Capas', channels: C(['Tecido', 'vinho'], ['Barra', 'ouro'], ['Fecho', 'ouro']),
    draw(L, P) { if (P.view === 'up') capelet(L, P, { trim: true }); else if (P.view === 'side') sart(L, P.torso.x1, P.torso.top, ['22', '221', '2211'.slice(0, 3)]); else for (const x of [P.torso.x0 - 1, P.torso.x1 + 1]) L.px(x, P.torso.top, 'a', 2); },
    drawOver(L, P) { if (P.view !== 'up') capelet(L, P, { trim: true }); }
  },

  // ---- mochilas e bolsas ----
  pack('mochila', 'Mochila de couro', C(['Bolsa', 'couro'], ['Aba', 'couro-escuro'], ['Fivela', 'bronze']), { up: PACK_UP, side: PACK_SIDE }),
  pack('mochila-viagem', 'Mochila de viagem', C(['Lona', 'oliva'], ['Couro', 'couro'], ['Metal', 'ferro']), {
    up: PACK_UP.map((r, i) => (i < 1 ? '..........' : r)), side: PACK_SIDE,
    before(L, P, j, up) { if (!up) bedroll(L, P, P.torso.top - 2 + j, 3, '#a8483a'); },
    after(L, P, j, up) {
      const T = P.torso;
      if (up) bedroll(L, P, T.top - 3 + j, 2, '#a8483a');
      // frigideira pendurada do lado (detalhe de quem vive na estrada)
      const x = up ? T.x1 + 1 : T.x1 + 2;
      sart(L, x, T.top + 3 + j, ['.C.', 'CAC', 'BAB', '.B.', '.c.', '.b.'], {});
    },
    sideBefore(L, P, j) { bedroll(L, P, P.torso.top - 4 + j, 0, '#a8483a'); sart(L, P.torso.x1 + 3, P.torso.top + 4 + j, ['C', 'B', 'c']); }
  }),
  pack('saco-dormir', 'Saco de dormir', C(['Couro', 'couro'], ['Manta', 'vinho'], ['Amarra', 'camurca']), {
    after(L, P, j, up) { bedroll(L, P, P.torso.top - (up ? 1 : 2) + j, up ? 3 : 4); if (up) for (const x of [P.torso.x0 + 1, P.torso.x1 - 1]) L.vline(x, P.torso.top + 2, P.torso.top + 6, 'a', 1); },
    sideAfter(L, P, j) { bedroll(L, P, P.torso.top - 2 + j); },
    over(L, P) { if (P.view === 'down') for (const [x, t] of [[P.torso.x0 + 1, 3], [P.torso.x1 - 1, 1]]) L.vline(x, P.torso.top, P.torso.top + 4, 'a', t); else if (P.view === 'side') L.vline(P.torso.x0 + 1, P.torso.top, P.torso.top + 4, 'a', 2); }
  }),
  {
    id: 'bolsa-lateral', name: 'Bolsa a tiracolo', sub: 'Mochilas e bolsas', channels: C(['Bolsa', 'couro'], ['Alça', 'couro-escuro'], ['Fivela', 'bronze']),
    draw(L, P) {
      const T = P.torso;
      const bag = ['bdddc', 'dcccc', '33C21', '33321', '32221', '.111.'];
      if (P.view === 'up') { line(L, T.x0 + 1, T.top, T.x1 - 1, P.hip - 3, 'b', 2); sart(L, T.x0 - 4, P.hip - 4, bag); }
      else if (P.view === 'down') sart(L, T.x1 + 1, P.hip - 4, bag);
    },
    drawOver(L, P) {
      const T = P.torso;
      if (P.view === 'side') { line(L, T.x1 - 1, T.top, T.x0 + 1, P.hip - 3, 'b', 2); sart(L, T.x0, P.hip - 3, ['bddc', '3C21', '3321', '.11.']); }
      if (P.view === 'down') line(L, T.x0 + 1, T.top, T.x1 - 1, P.hip - 3, 'b', (i) => (i % 2 ? 2 : 3));
    }
  },
  weapon('porta-pergaminhos', 'Porta-pergaminhos', C(['Papel', 'osso'], ['Tubo', 'couro'], ['Tampa', 'ouro']), SCROLL, { s: 0.6, dy: 2, dx: 1 }, 'Mochilas e bolsas'),
  pack('mochila-lanterna', 'Mochila com lanterna', C(['Bolsa', 'terra'], ['Aba', 'couro-escuro'], ['Ferro', 'bronze']), {
    up: PACK_UP, side: PACK_SIDE,
    after(L, P, j, up) {
      const T = P.torso, glow = P.f % 2;
      // haste que sobe acima da cabeca e a lanterna balancando na ponta
      const x = up ? T.x1 - 1 : T.x0 + 1, top = T.top + j;
      const hx = up ? T.x1 + 4 : T.x0 - 5;
      L.vline(x, top - 10, top, 'c', 2);
      line(L, x, top - 10, hx, top - 10, 'c', 3);
      lanternArt(L, hx + (P.walk ? sw(P) : 0), top - 9, glow);
    },
    sideAfter(L, P, j) {
      const T = P.torso, top = T.top + j;
      L.vline(T.x1 + 2, top - 10, top, 'c', 2);
      L.hline(T.x1 + 2, T.x1 + 5, top - 10, 'c', 3);
      lanternArt(L, T.x1 + 5 + (P.walk ? 1 - (P.f % 2) : 0), top - 9, P.f % 2);
    }
  }),
  pack('cesto-vime', 'Cesto de vime', C(['Vime', 'camurca'], ['Alça', 'couro'], ['Fruta', 'carmesim']), {
    up: ['.vVvVv..', 'vCVvDvV.', '4343434.', '3434343.', '4343432.', '3434321.', '4343432.', '.32321..'],
    side: ['vV.', 'Cv.', '434', '343', '432', '321', '32.'],
    after(L, P, j, up) { if (!up) { const T = P.torso; sart(L, T.x0 - 1, T.top - 2 + j, ['v.V', 'VvC']); sart(L, T.x1 - 1, T.top - 2 + j, ['VvV', 'DvV']); } }
  }),
  pack('mochila-alquimista', 'Mochila de alquimista', C(['Bolsa', 'couro'], ['Couro', 'couro-escuro'], ['Fivela', 'bronze']), {
    up: ['...dcc....', '.deeddddc.', 'deddddddcb', 'dccDEDccbb', 'abbbCBbbba', '4w3W3w3W21', 'bgbrbvbyb1', '3G3R3V3Y21', '3333332221', '.11111111.'],
    side: ['dc.', 'cb.', '33E', '32D', '32C', '32E', '221', '11.'],
    after(L, P, j, up) {
      const T = P.torso;
      // frascos coloridos espetados nos bolsos laterais
      for (const [x, c] of [[up ? T.x0 - 1 : T.x0 - 1, 'g'], [up ? T.x1 + 1 : T.x1 + 1, 'r']]) { L.px(x, T.top + 1 + j, 'w', 3); L.px(x, T.top + 2 + j, c, 3); L.px(x, T.top + 3 + j, c, 2); }
      if (!up) L.px(T.x0 - 1, T.top + j, 'c', 3);
    }
  }),

  // ---- armas nas costas ----
  weapon('aljava', 'Aljava de flechas', C(['Pena', 'carmesim'], ['Couro', 'couro'], ['Metal', 'bronze']), QUIVER, { s: 0.5, dy: 2, dx: 1 }),
  weapon('espada-bainha', 'Espada na bainha', W3('aco', 'couro-escuro', 'bronze'), SWORD, { s: 0.7 }),
  weapon('espadao', 'Espadão', W3('aco', 'couro-escuro', 'ferro'), GREAT, { s: 0.75, dy: -1 }),
  weapon('machado-guerra', 'Machado de guerra', W3('ferro', 'madeira', 'aco'), AXE, { s: 0.65 }),
  weapon('martelo-guerra', 'Martelo de guerra', W3('ferro', 'madeira-escura', 'ferro'), HAMMER, { s: 0.6 }),
  weapon('cajado-costas', 'Cajado de cristal', W3('aco', 'madeira', 'prata'), STAFF, { s: 0.55, dy: -1 }),
  weapon('lanca-costas', 'Lança', W3('aco', 'madeira', 'bronze'), SPEAR, { s: 0.6, dy: -2 }),
  weapon('arco-costas', 'Arco longo', C(['Corda', 'osso'], ['Madeira', 'madeira'], ['Ponta', 'bronze']), BOW, { s: 0.5, dy: -1 }),
  {
    ...weapon('espadas-cruzadas', 'Espadas cruzadas', W3('aco', 'couro-escuro', 'ouro'), SWORD, { s: 0.7, cross: true }),
    draw(L, P) {
      strapBack(L, P, true);
      onBack(SWORD, { s: 0.7 })(L, P);
      if (P.view === 'side') onBack(SWORD, { dxs: -2, ss: -0.1 })(L, P);
      else onBack(SWORD, { s: 0.7 })(L, { ...P, view: P.view === 'up' ? 'down' : 'up' });
    }
  },
  { id: 'escudo-redondo', name: 'Escudo redondo', sub: 'Armas nas costas', channels: C(['Madeira', 'madeira'], ['Pintura', 'carmesim'], ['Aro', 'ferro']), draw: shield('round'), drawOver: (L, P) => strapOver(L, P) },
  { id: 'escudo-pipa', name: 'Escudo de cavaleiro', sub: 'Armas nas costas', channels: C(['Campo', 'azul-aco'], ['Brasão', 'ouro'], ['Borda', 'prata']), draw: shield('kite'), drawOver: (L, P) => strapOver(L, P) },

  // ---- asas ----
  wings('asas-penas', 'Asas de penas', C(['Penas', 'branco-gasto'], ['Remiges', 'cinza-claro'], null), W_FEATHER, [8, 10], W_FEATHER_S, [0, 10]),
  geoWings('asas-morcego', 'Asas de morcego', C(['Membrana', 'arcano'], ['Ossos', 'ameixa'], ['Garra', 'osso']), G_BAT, G_BAT_S),
  wings('asas-fada', 'Asas de fada', C(['Asa', 'jade'], ['Veios', 'petroleo'], null), W_FAIRY, [8, 6], W_FAIRY_S, [0, 5]),
  geoWings('asas-ossos', 'Asas de ossos', C(['Trapos', 'chumbo'], ['Detalhe', 'carvao'], ['Osso', 'osso']), G_BONE, G_BONE_S),
  wings('asas-borboleta', 'Asas de borboleta', C(['Asa', 'abobora'], ['Manchas', 'carvao'], ['Olho', 'osso']), W_BUTTERFLY, [8, 6], W_BUTTERFLY_S, [0, 5]),
  geoWings('asas-dragao', 'Asas de dragão', C(['Membrana', 'sangue'], ['Ossos', 'vinho'], ['Garras', 'osso']), G_DRAGON, G_DRAGON_S),

  // ---- instrumentos ----
  weapon('alaude', 'Alaúde', C(['Caixa', 'madeira'], ['Braço', 'madeira-escura'], ['Cravelhas', 'osso']), LUTE, { s: 0.45, dy: 2, dx: 2 }, 'Instrumentos'),
  { id: 'tambor', name: 'Tambor', sub: 'Instrumentos', channels: C(['Pele', 'osso'], ['Corpo', 'vinho'], ['Aros', 'madeira']), draw: drum, drawOver: (L, P) => strapOver(L, P, { buckle: false }) },
  weapon('lira', 'Lira', C(['Corpo', 'madeira'], ['Base', 'madeira-escura'], ['Braços', 'ouro']), LYRE_BIG, { s: 0.2, dy: 3, dx: 3, ac: 3, up: [1, 0, -0.2] }, 'Instrumentos'),
  weapon('trompa', 'Trompa de caça', C(['Bocal', 'couro'], ['Detalhe', 'couro-escuro'], ['Metal', 'bronze']), HORN, { s: 0.15, dy: 4, dx: 3, ac: 3, up: [0, 0, 0] }, 'Instrumentos')
];
