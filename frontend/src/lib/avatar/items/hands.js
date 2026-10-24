// Maos: luvas, aneis, faixas, garras e marcas. A mao do chibi e so 2x2, entao
// o que diferencia as pecas e quanto sobem pelo antebraco (linhas do braco a
// partir de a.bottom), o punho (cuff), a textura e o que sai dos dedos.
// Tudo passa por put(): pinta com a etiqueta do braco (a.tag = 'arm' vai na 2a
// passada, por cima da roupa do tronco) e, no braco de tras do perfil, escurece
// 1 tom e nao pinta por cima do tronco (o braco de tras fica atras do corpo).
// Canais: a = material principal, b = detalhe (punho, listras, tinta),
// c = metal/garra (rebites, placas, unhas).
import { idx } from '../skeleton.js';
import { relief } from '../paint.js';

function put(L, P, a, x, y, c, s) {
  if (a.back && P.torso.cells.has(idx(x, y))) return;
  const t = Math.max(0, Math.min(4, s - (a.back ? 1 : 0)));
  L.withTag(a.tag, () => L.px(x, y, c, t));
}
function sp(a, y) { return a.rows.get(y) || a.handPart.rows.get(y) || [a.hand.x, a.hand.x + 1]; }
// coluna de fora do braco: de frente, a mais longe do tronco; de perfil, a da frente
function outer(P, a, y) { const [x0, x1] = sp(a, y); return P.view === 'side' ? x0 : a.side === 'r' ? x1 : x0; }
function inner(P, a, y) { const [x0, x1] = sp(a, y); return outer(P, a, y) === x0 ? x1 : x0; }
const dirOut = (P, a) => (P.view === 'side' ? -1 : a.side === 'r' ? 1 : -1);

// Mao "principal" (a que segura o item) e sempre visivel; aneis de uma mao so vao nela.
function arms(P, which) {
  if (!which || which === 'both') return P.arms;
  return P.arms.filter((a) => (which === 'main' ? a === P.holdArm : a !== P.holdArm));
}

// ---- luvas ----
function glove(o) {
  return (L, P) => {
    for (const a of arms(P, o.which)) {
      const hy = a.hand.y, len = o.len || 0;
      const yt = len ? Math.max(a.top, a.bottom - len + 1) : hy;
      const yEnd = o.fingerless ? hy : hy + 1;
      const cells = new Set();
      for (let y = yt; y <= yEnd; y++) { const [x0, x1] = sp(a, y); for (let x = x0; x <= x1; x++) cells.add(idx(x, y)); }
      const rel = relief(cells);
      for (const i of cells) put(L, P, a, i % 24, (i / 24) | 0, o.base || 'a', rel.get(i) + (o.ds || 0));
      if (o.fingerless) for (let x = sp(a, hy)[0]; x <= sp(a, hy)[1]; x++) put(L, P, a, x, hy, o.base || 'a', 1); // borda cortada nos dedos
      const ox = (y) => outer(P, a, y), ix = (y) => inner(P, a, y), d = dirOut(P, a);
      const row = (y, c, s, wide = 0) => { const [x0, x1] = sp(a, y); for (let x = x0 - wide; x <= x1 + wide; x++) put(L, P, a, x, y, c, x === x0 - wide ? s + 1 : x === x1 + wide ? s - 1 : s); };
      // corpo (entre o punho e a mao)
      for (let y = yt + 1; y < hy; y++) {
        const k = y - yt;
        if (o.body === 'stitch' && k % 2) put(L, P, a, ix(y), y, 'b', 3);
        if (o.body === 'stripes' && k % 2 === 0) row(y, 'b', 2);
        if (o.body === 'plates') row(y, o.base || 'a', k % 2 ? 3 : 1);
        if (o.body === 'laces') { put(L, P, a, k % 2 ? ox(y) : ix(y), y, 'b', 4); }
        if (o.body === 'studs' && k % 2 === 0) put(L, P, a, ox(y), y, 'c', 4);
        if (o.body === 'rune' && k % 3 === 1) put(L, P, a, ix(y), y, 'b', 4);
        if (o.body === 'scale') for (let x = sp(a, y)[0]; x <= sp(a, y)[1]; x++) if ((x + y) % 2) put(L, P, a, x, y, o.base || 'a', 1);
        if (o.body === 'shine') put(L, P, a, sp(a, y)[0], y, o.base || 'a', 4);
      }
      // punho
      const ct = yt;
      switch (o.cuff) {
        case 'band': row(ct, 'b', 3); break;
        case 'rolled': row(ct, 'b', 3); if (ct + 1 < hy) row(ct + 1, 'b', 1); break;
        case 'fur':
          row(ct, 'b', 3, 1); if (ct + 1 < hy) row(ct + 1, 'b', 2);
          put(L, P, a, sp(a, ct)[0] - 1 + ((ct) % 2), ct - 1, 'b', 4);
          put(L, P, a, sp(a, ct)[1] + 1 - ((ct) % 2), ct - 1, 'b', 3);
          break;
        case 'flare':
          row(ct, 'b', 3, 1); if (ct + 1 < hy) row(ct + 1, o.base || 'a', 2, 1);
          break;
        case 'stud': row(ct, 'a', 1); put(L, P, a, ox(ct), ct, 'c', 4); put(L, P, a, ix(ct), ct, 'c', 3); break;
        case 'lace': {
          const [x0, x1] = sp(a, ct);
          for (let x = x0 - 1; x <= x1 + 1; x++) put(L, P, a, x, ct, 'w', (x + ct) % 2 ? 4 : 2);
          put(L, P, a, ox(ct) + d, ct + 1, 'w', 3);
          break;
        }
        case 'plate': row(ct, 'c', 3, 0); if (ct + 1 < hy) row(ct + 1, 'c', 2); put(L, P, a, ox(ct) + d, ct, 'c', 3); put(L, P, a, ox(ct) + d, ct + 1, 'c', 1); break;
        case 'spikes': row(ct, 'c', 2); put(L, P, a, ox(ct) + d, ct, 'c', 4); if (ct + 2 < hy) put(L, P, a, ox(ct + 2) + d, ct + 2, 'c', 4); break;
        case 'strap': if (ct + 1 < hy) { row(ct + 1, 'b', 2); put(L, P, a, ox(ct + 1), ct + 1, 'c', 4); } break;
        case 'thick': row(ct, 'b', 3, 1); row(ct + 1, 'b', 2, 1); if (ct + 2 < hy) row(ct + 2, 'b', 1, 1); break;
        default: break;
      }
      // dorso da mao / nos dos dedos
      if (o.knuckle === 'studs') { put(L, P, a, ox(hy), hy, 'c', 4); put(L, P, a, ix(hy), hy, 'c', 3); }
      if (o.knuckle === 'plate') row(hy, 'c', 3);
      if (o.knuckle === 'spikes') { row(hy, 'c', 2); put(L, P, a, ox(hy) + d, hy, 'c', 4); put(L, P, a, ox(hy) + d, hy - 1, 'c', 3); }
      if (o.knuckle === 'gem') put(L, P, a, ox(hy), hy, 'b', 4);
      // pontas dos dedos
      if (o.claws) {
        const by = hy + 2;
        put(L, P, a, ox(by - 1), by, 'c', 4);
        put(L, P, a, ix(by - 1), by, 'c', 3);
        if (o.claws === 'long') { put(L, P, a, ox(by - 1), by + 1, 'c', 3); put(L, P, a, ix(by - 1), by + 1, 'c', 2); }
        if (o.claws === 'talon') put(L, P, a, ox(by - 1) + d, by + 1, 'c', 3);
      }
      if (o.tips) for (let x = sp(a, hy + 1)[0]; x <= sp(a, hy + 1)[1]; x++) put(L, P, a, x, hy + 1, 'b', 2);
    }
  };
}

// ---- marcas na pele, aneis e faixas (sem luva por baixo) ----
// spec.paint(a, helpers) desenha com coordenadas ja resolvidas para o braco.
function mark(which, paint) {
  return (L, P) => {
    for (const a of arms(P, which)) {
      const hy = a.hand.y, b = a.bottom;
      paint({
        a, hy, b, P,
        px: (x, y, c, s) => put(L, P, a, x, y, c, s),
        ox: (y) => outer(P, a, y), ix: (y) => inner(P, a, y), d: dirOut(P, a),
        row: (y, c, s) => { const [x0, x1] = sp(a, y); for (let x = x0; x <= x1; x++) put(L, P, a, x, y, c, x === x0 ? s + 1 : s - 1); },
        span: (y) => sp(a, y)
      });
    }
  };
}

const it = (id, name, sub, channels, draw) => ({ id, name, sub, channels, draw });
const ch = (...pairs) => pairs.map(([label, def]) => ({ label, def }));
const LV = 'Luvas', AN = 'Anéis', FX = 'Faixas', GM = 'Garras e marcas';
const C3 = (a, b = 'couro', c = 'bronze') => ch(['Material', a], ['Detalhe', b], ['Metal', c]);

export const HANDS = [
  // ---- Luvas ----
  it('luvas-couro', 'Luvas de couro', LV, C3('couro', 'couro-escuro'), glove({ len: 1, cuff: 'band' })),
  it('luvas-sem-dedos', 'Luvas sem dedos', LV, C3('couro-escuro', 'couro'), glove({ len: 1, cuff: 'rolled', fingerless: true })),
  it('luvas-longas', 'Luvas longas', LV, C3('carvao', 'chumbo'), glove({ len: 6, cuff: 'band', body: 'stitch' })),
  it('luvas-seda', 'Luvas de seda', LV, C3('branco-gasto', 'osso'), glove({ len: 7, body: 'shine' })),
  it('luvas-trabalho', 'Luvas de trabalho', LV, C3('camurca', 'couro'), glove({ len: 2, cuff: 'rolled', knuckle: 'plate' })),
  it('luvas-pele', 'Luvas forradas de pele', LV, C3('couro', 'branco-gasto'), glove({ len: 2, cuff: 'fur' })),
  it('luvas-mosqueteiro', 'Luvas de mosqueteiro', LV, C3('couro', 'camurca'), glove({ len: 3, cuff: 'flare', body: 'stitch' })),
  it('luvas-rebites', 'Luvas de rebites', LV, C3('couro-escuro', 'couro', 'aco'), glove({ len: 2, cuff: 'stud', knuckle: 'studs' })),
  it('luvas-renda', 'Luvas de renda', LV, C3('carvao', 'carvao'), glove({ len: 3, cuff: 'lace', fingerless: true, body: 'scale' })),
  it('luvas-listradas', 'Luvas listradas', LV, C3('vinho', 'osso'), glove({ len: 5, body: 'stripes', cuff: 'band' })),
  it('luvas-amarradas', 'Luvas amarradas', LV, C3('couro', 'linho'), glove({ len: 4, body: 'laces', cuff: 'band' })),
  it('luva-falcoaria', 'Luva de falcoaria', LV, C3('camurca', 'couro-escuro'), glove({ which: 'main', len: 4, cuff: 'thick', body: 'stitch' })),
  it('luva-arqueiro', 'Luva de arqueiro', LV, C3('couro', 'couro-escuro', 'bronze'), glove({ which: 'main', len: 2, cuff: 'strap', fingerless: true })),
  it('luvas-ladrao', 'Luvas de ladrão', LV, C3('carvao', 'carvao'), glove({ len: 0 })),
  it('luvas-mago', 'Luvas de mago', LV, C3('azul-noite', 'ouro'), glove({ len: 3, cuff: 'band', body: 'rune', knuckle: 'gem' })),
  it('luvas-tachas', 'Luvas de tachas', LV, C3('couro-escuro', 'couro', 'prata'), glove({ len: 4, cuff: 'band', body: 'studs' })),
  it('manoplas-placas', 'Manoplas de placas', LV, C3('aco', 'ferro', 'prata'), glove({ len: 3, cuff: 'plate', body: 'plates', knuckle: 'plate' })),
  it('manoplas-fileiras', 'Manoplas em fileiras', LV, C3('ferro', 'aco', 'prata'), glove({ len: 5, cuff: 'flare', body: 'plates', knuckle: 'plate' })),
  it('manoplas-espinhos', 'Manoplas de espinhos', LV, C3('ferro-negro', 'ferro', 'aco'), glove({ len: 3, cuff: 'spikes', body: 'plates', knuckle: 'spikes' })),
  it('manoplas-couro-placa', 'Manoplas de couro e placa', LV, C3('couro', 'couro-escuro', 'aco'), glove({ len: 3, cuff: 'stud', knuckle: 'plate', body: 'stitch' })),
  it('manoplas-escamas', 'Manoplas de escamas', LV, C3('bronze', 'cobre', 'ouro'), glove({ len: 4, cuff: 'plate', body: 'scale' })),
  // ---- Garras e marcas ----
  it('luvas-garras', 'Luvas com garras', GM, C3('couro-escuro', 'couro', 'osso'), glove({ len: 2, cuff: 'band', claws: 'short' })),
  it('garras-fera', 'Garras de fera', GM, C3('terra', 'camurca', 'osso'), glove({ len: 3, cuff: 'fur', claws: 'long' })),
  it('garras-metal', 'Garras de metal', GM, C3('ferro', 'ferro-negro', 'aco'), glove({ len: 1, cuff: 'plate', claws: 'talon', knuckle: 'plate' })),
  // Marcas: cor saturada e varios px no antebraco (1 px de tinta sumia na pele).
  it('tatuagem-mao', 'Tatuagem na mão', GM, ch(['Tinta', 'anil']), mark('both', ({ hy, b, px, ox, ix }) => {
    px(ox(hy), hy, 'a', 1); px(ix(hy), hy, 'a', 2);
    px(ix(b), b, 'a', 1); px(ox(b - 1), b - 1, 'a', 1); px(ix(b - 2), b - 2, 'a', 2);
  })),
  it('tatuagem-tribal', 'Tatuagem tribal', GM, ch(['Tinta', 'carvao']), mark('both', ({ a, b, row, px, ox, ix }) => {
    for (const y of [b - 4, b - 2, b]) if (y >= a.top) row(y, 'a', 1);
    px(ox(b - 3), b - 3, 'a', 0); px(ix(b - 1), b - 1, 'a', 0);
  })),
  it('henna', 'Henna', GM, ch(['Tinta', 'sangue']), mark('both', ({ hy, b, px, ox, ix }) => {
    px(ix(hy), hy, 'a', 1); px(ox(hy + 1), hy + 1, 'a', 2); px(ox(b), b, 'a', 1); px(ix(b - 1), b - 1, 'a', 2); px(ox(b - 2), b - 2, 'a', 1); px(ix(b - 3), b - 3, 'a', 2);
  })),
  // unhas: a ponta dos dedos inteira + 1 px saindo da mao (ganha contorno)
  it('unhas-pintadas', 'Unhas pintadas', GM, ch(['Esmalte', 'carvao']), mark('both', ({ hy, px, ox, ix }) => { px(ox(hy + 1), hy + 1, 'a', 3); px(ix(hy + 1), hy + 1, 'a', 1); })),
  it('unhas-longas', 'Unhas longas', GM, ch(['Esmalte', 'arcano']), mark('both', ({ hy, px, ox, ix }) => {
    px(ox(hy + 1), hy + 1, 'a', 3); px(ix(hy + 1), hy + 1, 'a', 1); px(ox(hy + 1), hy + 2, 'a', 4); px(ix(hy + 1), hy + 2, 'a', 2);
  })),
  // runa que brilha: tons altos + branco no centro, numa cor fria (le sobre pele quente)
  it('marca-runica', 'Marca rúnica brilhante', GM, ch(['Brilho', 'jade']), mark('both', ({ hy, b, px, ox, ix }) => {
    px(ox(hy), hy, 'a', 3); px(ix(hy), hy, 'a', 1);
    px(ox(b), b, 'a', 3); px(ix(b - 1), b - 1, 'w', 4); px(ox(b - 1), b - 1, 'a', 4); px(ix(b - 2), b - 2, 'a', 3); px(ox(b - 2), b - 2, 'a', 1);
  })),
  it('maos-pintadas', 'Mãos de guerra', GM, ch(['Tinta', 'sangue']), mark('both', ({ hy, b, row, px, ix }) => {
    row(hy, 'a', 2); row(hy + 1, 'a', 1); px(ix(b), b, 'a', 1); px(ix(b - 2), b - 2, 'a', 1);
  })),
  // cicatriz: tom 0 (bem escuro) e 3 px em diagonal, com um ponto de costura claro
  it('cicatrizes', 'Cicatrizes', GM, ch(['Cicatriz', 'sangue']), mark('both', ({ b, px, ox, ix }) => {
    px(ox(b - 1), b - 1, 'a', 0); px(ix(b - 2), b - 2, 'a', 0); px(ox(b - 3), b - 3, 'a', 0); px(ox(b - 2), b - 2, 'skin', 4);
  })),
  // ---- Faixas ----
  it('faixas-mao', 'Faixas nas mãos', FX, ch(['Pano', 'linho'], ['Sombra', 'couro']), mark('both', ({ hy, b, row, px, ox, ix, d }) => {
    row(hy, 'a', 3); row(b, 'a', 2); row(b - 1, 'a', 3);
    px(ix(b), b, 'b', 1); px(ix(hy), hy, 'b', 1);
    px(ox(b) + d, b, 'a', 3); px(ox(b) + d, b + 1, 'a', 1); // ponta solta
  })),
  it('bandagens', 'Bandagens', FX, ch(['Pano', 'branco-gasto'], ['Mancha', 'sangue']), mark('both', ({ a, hy, b, row, px, ox, ix }) => {
    for (let y = Math.max(a.top, b - 4); y <= hy; y++) row(y, 'a', (y % 2) ? 3 : 1);
    px(ix(b - 2), b - 2, 'b', 2); px(ox(hy), hy, 'b', 1);
  })),
  it('faixas-lutador', 'Faixas de lutador', FX, ch(['Pano', 'carmesim'], ['Cruzado', 'osso']), mark('both', ({ hy, b, row, px, ox, ix }) => {
    row(hy, 'a', 3); row(b, 'a', 3); row(b - 1, 'a', 1);
    px(ox(hy), hy, 'b', 4); px(ix(b), b, 'b', 3); px(ox(b - 1), b - 1, 'b', 3);
  })),
  // pulseira grossa de couro: 3 linhas e 1 px para fora do braco (sai da silhueta)
  it('pulseira-couro', 'Pulseira grossa de couro', FX, ch(['Couro', 'couro'], ['Rebites', 'prata']), mark('both', ({ b, row, px, ox, d }) => {
    row(b, 'a', 1); row(b - 1, 'a', 3); row(b - 2, 'a', 2);
    for (const y of [b - 2, b - 1, b]) px(ox(y) + d, y, 'a', y === b ? 0 : 2);
    px(ox(b - 1), b - 1, 'w', 4); px(ox(b - 1) + d, b - 1, 'b', 3);
  })),
  // braceletes: aro de metal com brilho branco de um lado e tom 0 do outro
  it('braceletes-finos', 'Braceletes', FX, ch(['Metal', 'ouro']), mark('both', ({ b, px, ox, ix }) => {
    for (const y of [b, b - 2]) { px(ox(y), y, 'w', 4); px(ix(y), y, 'a', 1); }
    px(ox(b - 1), b - 1, 'a', 0); px(ix(b - 1), b - 1, 'a', 0);
  })),
  it('pulseira-contas', 'Pulseira de contas', FX, ch(['Fio', 'couro-escuro'], ['Contas', 'jade']), mark('both', ({ b, px, ox, ix, d }) => {
    px(ox(b), b, 'b', 4); px(ix(b), b, 'b', 1); px(ox(b) + d, b, 'b', 2); px(ox(b - 1), b - 1, 'a', 0); px(ix(b - 1), b - 1, 'b', 3);
  })),
  it('corrente-mao', 'Corrente de mão', FX, ch(['Metal', 'prata'], ['Gema', 'carmesim']), mark('both', ({ hy, b, px, ox, ix }) => {
    px(ox(b), b, 'a', 4); px(ix(b), b, 'a', 0); px(ix(hy), hy, 'b', 3); px(ox(hy), hy, 'a', 0); px(ox(hy + 1), hy + 1, 'a', 4);
  })),
  it('munhequeira', 'Munhequeira de pano', FX, ch(['Pano', 'azul-aco'], ['Listra', 'branco-gasto']), mark('both', ({ b, row }) => { row(b, 'a', 1); row(b - 1, 'b', 3); row(b - 2, 'a', 2); })),
  it('bracadeira-osso', 'Pulseira de ossos', FX, ch(['Cordão', 'couro-escuro'], ['Ossos', 'osso']), mark('both', ({ b, row, px, ox, d }) => {
    row(b, 'a', 1); px(ox(b) + d, b - 1, 'b', 4); px(ox(b) + d, b, 'b', 3); px(ox(b) + d, b + 1, 'b', 1);
  })),
  // ---- Anéis ----
  // A mao tem 2x2: o anel e uma faixa clara atravessando a linha dos dedos
  // (brilho branco + tom 0); os maiores saem da mao para ganhar contorno.
  it('anel-simples', 'Anel simples', AN, ch(['Metal', 'ouro']), mark('main', ({ hy, px, ox, ix }) => { px(ox(hy + 1), hy + 1, 'w', 4); px(ix(hy + 1), hy + 1, 'a', 1); })),
  it('anel-gema', 'Anel de gema grande', AN, ch(['Metal', 'ouro'], ['Gema', 'carmesim']), mark('main', ({ hy, px, ox, ix, d }) => {
    px(ix(hy + 1), hy + 1, 'a', 1); px(ox(hy + 1), hy + 1, 'a', 3);
    px(ox(hy) + d, hy, 'b', 3); px(ox(hy) + d, hy + 1, 'b', 0); px(ox(hy) + d, hy - 1, 'w', 4); // gema 2 px + faisca
  })),
  it('anel-sinete', 'Anel de sinete', AN, ch(['Metal', 'ouro'], ['Brasão', 'vinho']), mark('main', ({ hy, px, ox, ix }) => { px(ox(hy), hy, 'b', 1); px(ix(hy), hy, 'a', 4); px(ox(hy + 1), hy + 1, 'a', 0); })),
  it('aneis-varios', 'Vários anéis', AN, ch(['Metal', 'ouro'], ['Gemas', 'jade']), mark('both', ({ hy, px, ox, ix }) => { px(ox(hy + 1), hy + 1, 'w', 4); px(ix(hy + 1), hy + 1, 'b', 3); px(ix(hy), hy, 'a', 0); px(ox(hy), hy, 'a', 3); })),
  it('aneis-pares', 'Um anel em cada mão', AN, ch(['Metal', 'prata']), mark('both', ({ hy, px, ox, ix }) => { px(ox(hy), hy, 'w', 4); px(ix(hy), hy, 'a', 0); })),
  it('anel-polegar', 'Anel no polegar', AN, ch(['Metal', 'bronze']), mark('main', ({ hy, px, ox, d }) => { px(ox(hy) + d, hy, 'skin', 2); px(ox(hy) + d, hy + 1, 'a', 4); px(ox(hy) + d, hy + 2, 'a', 0); })),
  it('anel-garra', 'Anel de garra', AN, ch(['Metal', 'prata']), mark('main', ({ hy, px, ox, ix }) => { px(ix(hy + 1), hy + 1, 'a', 0); px(ox(hy + 1), hy + 1, 'a', 3); px(ox(hy + 1), hy + 2, 'w', 4); px(ox(hy + 1), hy + 3, 'a', 1); })),
  it('soco-ingles', 'Soqueira', AN, ch(['Metal', 'ferro']), mark('main', ({ hy, px, ox, ix, d }) => { px(ox(hy), hy, 'a', 4); px(ix(hy), hy, 'a', 2); px(ox(hy) + d, hy, 'a', 3); px(ox(hy) + d, hy + 1, 'a', 0); px(ix(hy) - d, hy, 'a', 1); })),
  it('aneis-cheios', 'Mão cheia de anéis', AN, ch(['Metal', 'ouro'], ['Gemas', 'carmesim']), mark('main', ({ hy, px, ox, ix }) => { px(ox(hy + 1), hy + 1, 'w', 4); px(ix(hy + 1), hy + 1, 'a', 1); px(ox(hy), hy, 'b', 3); px(ix(hy), hy, 'a', 0); })),
  // anel de pedra que brilha: gema alta saindo do dorso + faisca em cruz
  it('anel-faisca', 'Anel cintilante', AN, ch(['Metal', 'prata'], ['Gema', 'azul-aco']), mark('main', ({ hy, px, ox, ix, d }) => {
    px(ix(hy + 1), hy + 1, 'a', 0); px(ox(hy + 1), hy + 1, 'a', 4);
    px(ox(hy) + d, hy, 'b', 4); px(ox(hy) + d, hy + 1, 'b', 1); px(ox(hy) + 2 * d, hy - 1, 'w', 4); px(ox(hy) + d, hy - 2, 'w', 3);
  }))
];
