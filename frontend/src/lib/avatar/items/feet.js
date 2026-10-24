// Calcados: um construtor parametrico (altura do cano x topo x meio x bico x peito do pe)
// gera cada peca com desenho proprio. Canais: a = material principal, b = detalhe/forro,
// c = metal/sola. O pe de perfil aponta para a esquerda (foot.x e o bico).
// Tudo relativo a perna (l.rows, l.foot) para valer em qualquer porte/altura/quadro.

function boot(o) {
  return (L, P) => {
    const v = P.view, side = v === 'side', up = v === 'up';
    for (const l of P.legs) {
      const f = l.foot, y = f.y, y2 = y + 1, fp = l.footPart;
      const shaft = o.shaft || 0;
      const yt = Math.max(l.top, y - shaft);
      const span = (r) => l.rows.get(r) || fp.rows.get(r) || [f.x, f.x + f.w - 1];
      const mid = (r) => { const [a, b] = span(r); return (a + b) >> 1; };
      const base = o.base || 'a';
      // 1) base: cano pela perna + pe
      if (shaft) L.fill(l, base, { y0: yt, ds: o.ds || 0 });
      L.fill(fp, o.footC || base, { ds: o.ds || 0 });
      if (o.bare) for (let x = f.x; x < f.x + f.w; x++) L.px(x, y, 'skin', 2); // sandalia: peito do pe de fora
      // 2) bico
      const tx = f.x;
      if (side) {
        if (o.toe === 'point') L.px(tx - 1, y2, 'a', 2);
        if (o.toe === 'curl') { L.px(tx - 1, y2, 'a', 2); L.px(tx - 2, y, 'a', 3); L.px(tx - 2, y - 1, 'a', 4); }
        if (o.toe === 'iron') { L.px(tx, y, 'c', 3); L.px(tx, y2, 'c', 3); L.px(tx + 1, y2, 'c', 4); }
        if (o.toe === 'round2') L.px(tx - 1, y2, 'a', 1);
      } else if (!up && o.toe === 'iron') {
        L.hline(span(y2)[0], span(y2)[1], y2, 'c', 3);
        L.px(span(y2)[0], y2, 'c', 4);
      } else if (!up && o.toe === 'curl') {
        L.px(mid(y2), y2, 'c', 4); // sino/ponta curva: aparece como brilho
      }
      // 3) sola mais escura
      if (o.sole !== false) {
        const [sa, sb] = fp.rows.get(y2);
        for (let x = side && o.toe ? sa - 0 : sa; x <= sb; x++) L.over(x, y2, o.soleC || 'a', o.soleT ?? 0);
        if (side && o.toe === 'point') L.over(tx - 1, y2, o.soleC || 'a', 0);
        if (o.heel && side) { L.px(f.x + f.w, y2, o.soleC || 'a', 0); }
        if (o.heel && up) L.hline(fp.rows.get(y2)[0], fp.rows.get(y2)[1], y2, o.soleC || 'a', 0);
      }
      // 4) topo do cano
      if (shaft) {
        const [ta, tb] = span(yt);
        const top = o.top;
        if (top === 'fold') {
          L.hline(ta, tb, yt, 'b', 3); L.hline(...span(yt + 1).slice(0, 2), yt + 1, 'b', 2);
          const [xa, xb] = span(yt + 2); L.hline(xa, xb, yt + 2, 'a', 1);
        } else if (top === 'band') {
          L.hline(ta, tb, yt, 'b', 2);
        } else if (top === 'fur') {
          L.hline(ta, tb, yt, 'b', 3); L.hline(...span(yt + 1).slice(0, 2), yt + 1, 'b', 2);
          for (let x = ta; x <= tb; x++) {
            if ((x - ta) % 2 === 0) L.px(x, yt - 1, 'b', 3);
            L.over(x, yt, 'b', (x + yt) % 2 ? 4 : 3);
          }
        } else if (top === 'flare') {
          for (let r = yt; r <= yt + 1; r++) { const [a, b] = span(r); L.px(a - 1, r, 'a', 3); L.px(b + 1, r, 'a', 1); }
          L.hline(ta - 1, tb + 1, yt, 'b', 2);
        } else if (top === 'spikes') {
          for (let x = ta; x <= tb; x += 2) L.px(x, yt - 1, 'c', 4);
          L.hline(ta, tb, yt, 'c', 3);
        } else if (top === 'torn') {
          for (let x = ta; x <= tb; x++) { if ((x * 7 + yt) % 3 === 0) { L.erase(x, yt); if (x % 2) L.erase(x, yt + 1); } }
        } else if (top === 'cuff') {
          // gola larga de pirata: copo aberto com forro a vista
          for (let r = yt; r <= yt + 2; r++) { const [a, b] = span(r); L.px(a - 1, r, 'a', 3); L.px(b + 1, r, 'a', 1); }
          L.hline(ta - 1, tb + 1, yt, 'b', 3);
          L.hline(ta, tb, yt + 1, 'b', 1);
        } else if (top === 'plate') {
          L.hline(ta, tb, yt, 'c', 3); L.hline(ta, tb, yt + 1, 'c', 2);
          L.px(ta, yt, 'c', 4);
        } else if (top === 'knee') {
          // joelheira: disco com rebite no alto da greva
          L.hline(ta - 1, tb + 1, yt, 'c', 3); L.hline(ta, tb, yt + 1, 'c', 3);
          L.hline(ta, tb, yt + 2, 'c', 2); L.px(mid(yt + 1), yt + 1, 'c', 4);
          if (side) L.px(ta - 1, yt + 1, 'c', 3);
        }
        if (o.wide) for (let r = yt; r < y; r++) { const [a, b] = span(r); L.px(a - 1, r, 'a', 3); L.px(b + 1, r, 'a', 1); }
      }
      // 5) meio do cano
      const rowsAt = (arr) => arr.map((d) => yt + d).filter((r) => r < y && r >= l.top);
      if (o.straps) for (const r of rowsAt(o.straps)) {
        const [a, b] = span(r);
        L.hline(a, b, r, 'b', 2);
        if (!up) L.px(side ? a : (l.side === 'r' ? a : b), r, 'c', 4);
      }
      if (o.laces && !up) for (let r = yt + 1; r < y; r++) {
        const [a, b] = span(r), c = mid(r);
        if (side) { if ((r - yt) % 2) { L.px(a, r, 'b', 4); L.px(a + 1, r, 'b', 3); } }
        else if ((r - yt) % 2) L.hline(c - 1, c + 1, r, 'b', 3); else L.px(c, r, 'b', 2);
      }
      if (o.rivets) for (const r of rowsAt(o.rivets)) { const [a, b] = span(r); L.px(a, r, 'c', 4); L.px(b, r, 'c', 3); }
      if (o.seam) for (let r = yt + 1; r < y; r++) if ((r - yt) % 2) L.px(side ? span(r)[1] - 1 : mid(r), r, 'b', 3);
      // juntas de placa: sombra na emenda + brilho logo acima (antes a linha preta formava um "E")
      if (o.plates) for (const r of rowsAt(o.plates)) { const [a, b] = span(r); L.hline(a, b, r, 'a', 1); if (r - 1 > yt) L.hline(a, b, r - 1, 'a', 3); }
      // reflexo curto de metal (2 px) na canela; a coluna inteira clara formava um "L"
      if (o.shine) for (let r = yt + 1; r < Math.min(y, yt + 3); r++) L.over(span(r)[0] + (side ? 0 : 1), r, 'c', 4);
      if (o.stripes) for (let r = yt; r < y; r++) if ((r - yt) % 2 === 0) L.hline(span(r)[0], span(r)[1], r, 'b', 2);
      if (o.wrap) for (let r = yt; r < y; r++) {
        const [a, b] = span(r);
        for (let x = a; x <= b; x++) L.over(x, r, (x + r) % 3 === 0 ? 'b' : 'a', (x + r) % 3 === 0 ? 3 : 1);
      }
      if (o.fuzz) for (let r = yt; r < y; r++) { const [a, b] = span(r); if (r % 2) { L.px(a - 1, r, 'a', 3); } else L.px(b + 1, r, 'a', 1); }
      if (o.buttons) for (let r = yt + 1; r < y; r += 2) { if (!up) L.px(side ? span(r)[0] : mid(r), r, 'c', 4); }
      if (o.spur && side) L.px(f.x + f.w, y2, 'c', 4); // espora atras do calcanhar
      if (o.spur && up) L.px(span(y2)[l.side === 'r' ? 1 : 0], y2, 'c', 4);
      // 6) peito do pe
      if (!up && o.instep) {
        const sx = side ? tx + 1 : mid(y);
        if (o.instep === 'buckle') { L.px(sx, y, 'c', 4); if (!side) L.px(sx, y2, 'c', 2); }
        else if (o.instep === 'stitch') { L.px(sx, y, 'b', 3); L.px(sx + (side ? 1 : -1), y, 'b', 2); }
        else if (o.instep === 'gem') L.px(sx, y, o.gem || '#d6455d', 4);
        else if (o.instep === 'bow') { L.px(sx, y, 'b', 3); L.px(sx + 1, y, 'b', 4); }
        else if (o.instep === 'strap') L.hline(span(y)[0], span(y)[1], y, 'b', 2);
        else if (o.instep === 'x') {
          const [a, b] = span(y);
          if (side) { L.px(tx + 1, y, 'b', 3); L.px(tx + 2, y, 'b', 2); L.px(tx + 1, y2, 'b', 2); }
          else { L.px(a, y, 'b', 3); L.px(b, y2, 'b', 2); L.px(a, y2, 'b', 2); L.px(b, y, 'b', 3); }
        }
      }
      if (up && o.bare) L.hline(fp.rows.get(y)[0], fp.rows.get(y)[1], y, 'a', 2); // tira do calcanhar
    }
  };
}

const item = (id, name, sub, o, channels) => ({
  id, name, sub,
  channels: channels || [{ label: o.cLabel || 'Couro', def: o.cDef || 'couro-escuro' }, { label: 'Detalhe', def: o.bDef || 'couro' }, { label: 'Metal', def: o.mDef || 'ferro' }],
  draw: boot(o)
});

const B = 'Botas', S = 'Sapatos', N = 'Sandálias', G = 'Grevas', T = 'Panos e faixas';

export const FEET = [
  // ---- Botas ----
  item('botas-viagem', 'Botas de viagem', B, { shaft: 3, top: 'band', seam: true, heel: true }),
  item('botas-curtas', 'Botas curtas', B, { shaft: 2, heel: true }),
  item('botas-cano-medio', 'Botas de cano médio', B, { shaft: 4, top: 'band', cDef: 'couro', bDef: 'couro-escuro' }),
  item('botas-cano-alto', 'Botas de cano alto', B, { shaft: 6, top: 'band', seam: true, cDef: 'couro-escuro' }),
  item('botas-coxa', 'Botas até a coxa', B, { shaft: 99, top: 'band', seam: true, straps: [4, 8], heel: true, cDef: 'couro-escuro' }),
  item('botas-montaria', 'Botas de montaria', B, { shaft: 7, top: 'flare', spur: true, shine: true, cDef: 'couro', bDef: 'couro-escuro' }),
  item('botas-fivelas', 'Botas com fivelas', B, { shaft: 5, straps: [1, 3], cDef: 'couro-escuro', bDef: 'couro', mDef: 'prata' }),
  item('botas-cadarco', 'Botas de cadarço', B, { shaft: 5, laces: true, top: 'band', cDef: 'couro', bDef: 'branco-gasto' }),
  item('botas-bico-ferro', 'Botas com bico de ferro', B, { shaft: 4, toe: 'iron', top: 'band', rivets: [2], cDef: 'couro-escuro' }),
  item('botas-pele-cano', 'Botas com pele no cano', B, { shaft: 5, top: 'fur', cDef: 'couro', bDef: 'branco-gasto' }),
  item('botas-dobradas', 'Botas dobradas', B, { shaft: 6, top: 'fold', cDef: 'couro-escuro', bDef: 'camurca' }),
  item('botas-pirata', 'Botas de pirata', B, { shaft: 6, top: 'cuff', straps: [4], cDef: 'couro-escuro', bDef: 'camurca', mDef: 'bronze' }),
  item('botas-soldado', 'Botas de soldado', B, { shaft: 5, laces: true, toe: 'iron', soleC: 'c', soleT: 1, cDef: 'carvao', bDef: 'cinza-claro' }),
  item('botas-cacador', 'Botas de caçador', B, { shaft: 6, top: 'fold', straps: [3], seam: true, cDef: 'terra', bDef: 'camurca' }),
  item('botas-rebitadas', 'Botas rebitadas', B, { shaft: 5, top: 'band', rivets: [1, 3], toe: 'iron', cDef: 'ferro-negro', bDef: 'couro-escuro' }),
  item('botas-ladino', 'Botas de ladino', B, { shaft: 6, top: 'band', seam: true, sole: false, cDef: 'carvao', bDef: 'chumbo' }),
  item('botas-neve', 'Botas de neve', B, { shaft: 4, top: 'fur', soleC: 'c', soleT: 3, heel: true, cDef: 'camurca', bDef: 'branco-gasto', mDef: 'osso' }),
  item('botinas-feiticeiro', 'Botinas de feiticeiro', B, { shaft: 2, toe: 'curl', top: 'band', instep: 'gem', cDef: 'arcano', bDef: 'ouro' }),
  item('botas-cavaleiro', 'Botas de cavaleiro', B, { shaft: 7, top: 'plate', straps: [3], spur: true, toe: 'iron', cDef: 'couro-escuro', mDef: 'aco' }),
  item('botas-osso', 'Botas de osso', B, { shaft: 5, top: 'spikes', rivets: [2, 4], cDef: 'couro-escuro', mDef: 'osso' }),
  item('botas-rasgadas', 'Botas rasgadas', B, { shaft: 4, top: 'torn', seam: true, cDef: 'terra', bDef: 'couro' }),
  item('botas-runicas', 'Botas rúnicas', B, { shaft: 5, top: 'band', stripes: false, instep: 'gem', gem: '#5ad1c8', plates: [2], cDef: 'azul-noite', bDef: 'prata' }),
  item('botas-largas', 'Botas largas de couro', B, { shaft: 5, wide: true, top: 'fold', cDef: 'couro', bDef: 'couro-escuro' }),
  // ---- Sapatos ----
  item('sapatos-couro', 'Sapatos de couro', S, { instep: 'stitch', cDef: 'couro-escuro', bDef: 'camurca' }),
  item('sapatos-bico-fino', 'Sapatos de bico fino', S, { toe: 'point', instep: 'stitch', cDef: 'carvao', bDef: 'ameixa' }),
  item('sapatos-fivela', 'Sapatos de fivela', S, { instep: 'buckle', heel: true, cDef: 'couro-escuro', mDef: 'prata' }),
  item('mocassins', 'Mocassins', S, { toe: 'round2', instep: 'stitch', sole: false, cDef: 'camurca', bDef: 'terra' }),
  item('tamancos', 'Tamancos', S, { instep: 'strap', soleC: 'c', soleT: 2, heel: true, cDef: 'couro', bDef: 'couro-escuro', mDef: 'madeira' }),
  item('sapatos-nobre', 'Sapatos de nobre', S, { toe: 'point', instep: 'gem', gem: '#e0b13a', heel: true, cDef: 'vinho', bDef: 'ouro' }),
  item('sapatos-la', 'Sapatos de laço', S, { instep: 'bow', cDef: 'ameixa', bDef: 'rosa-seco' }),
  item('sapatos-ferro', 'Sapatos reforçados', S, { toe: 'iron', instep: 'strap', cDef: 'couro-escuro', bDef: 'couro' }),
  // ---- Sandálias ----
  item('sandalias-simples', 'Sandálias simples', N, { bare: true, instep: 'strap', cDef: 'couro', bDef: 'couro-escuro' }),
  item('sandalias-gladiador', 'Sandálias de gladiador', N, { bare: true, shaft: 4, base: 'skin', instep: 'x', straps: [0, 2], cDef: 'couro', bDef: 'couro-escuro', mDef: 'bronze' }),
  item('sandalias-corda', 'Sandálias de corda', N, { bare: true, instep: 'strap', soleC: 'c', soleT: 2, cDef: 'camurca', bDef: 'ocre', mDef: 'ocre' }),
  item('sandalias-cruzadas', 'Sandálias de tiras cruzadas', N, { bare: true, instep: 'x', shaft: 2, base: 'skin', straps: [0], cDef: 'terra', bDef: 'couro-escuro' }),
  // ---- Grevas ----
  item('grevas-metal', 'Grevas de metal', G, { shaft: 6, top: 'plate', plates: [2, 4], shine: true, toe: 'iron', cDef: 'aco', bDef: 'ferro', mDef: 'prata' }),
  item('grevas-joelheira', 'Grevas com joelheira', G, { shaft: 8, top: 'knee', plates: [4, 6], toe: 'iron', cDef: 'ferro', bDef: 'aco', mDef: 'prata' }),
  item('grevas-espinhos', 'Grevas com espinhos', G, { shaft: 6, top: 'spikes', plates: [3], rivets: [2, 4], toe: 'iron', cDef: 'ferro-negro', bDef: 'ferro', mDef: 'ferro' }),
  item('grevas-ferro-negro', 'Grevas de ferro negro', G, { shaft: 5, top: 'knee', rivets: [3], cDef: 'ferro-negro', bDef: 'chumbo', mDef: 'prata' }),
  item('grevas-couro-placa', 'Grevas de couro e placa', G, { shaft: 6, top: 'plate', straps: [3], cDef: 'couro-escuro', bDef: 'couro', mDef: 'aco' }),
  item('grevas-bronze', 'Grevas de bronze', G, { shaft: 6, top: 'plate', plates: [3], shine: true, cDef: 'bronze', bDef: 'cobre', mDef: 'ouro' }),
  // ---- Panos e faixas ----
  item('pes-pano', 'Pés de pano', T, { sole: false, instep: 'strap', cDef: 'linho', bDef: 'osso' }),
  item('faixas-canela', 'Faixas nas canelas', T, { shaft: 5, wrap: true, sole: false, top: 'band', cDef: 'linho', bDef: 'osso' }),
  item('bandagens-pes', 'Bandagens nos pés', T, { shaft: 2, wrap: true, sole: false, cDef: 'branco-gasto', bDef: 'osso' }),
  item('meias-listradas', 'Meias listradas', T, { shaft: 5, stripes: true, sole: false, cDef: 'vinho', bDef: 'osso' }),
  item('polainas-botoes', 'Polainas de botões', T, { shaft: 4, buttons: true, top: 'band', cDef: 'cinza-claro', bDef: 'couro', mDef: 'prata' }),
  item('botas-pele-envolta', 'Botas de pele envolta', T, { shaft: 5, fuzz: true, top: 'fur', cDef: 'terra', bDef: 'camurca' }),
  item('botas-trapo-ritual', 'Faixas rituais', T, { shaft: 6, wrap: true, sole: false, instep: 'gem', gem: '#b8323a', cDef: 'sangue', bDef: 'osso' })
];
