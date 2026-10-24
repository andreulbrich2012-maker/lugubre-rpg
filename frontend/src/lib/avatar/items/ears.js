// Orelhas: brincos, argolas, pingentes e adornos. A orelha tem 1x2 px de frente
// e 2x2 de perfil, entao cada peca e um sprite minusculo ancorado em P.ears e
// lido pelo contraste de tom (o compositor poe o contorno escuro em volta).
// Sprite: linhas de texto; a coluna `ox` e relativa ao x da orelha e a linha `oy`
// ao y da orelha (oy 1 = lobulo). A orelha da direita da tela e espelhada para o
// brinco abrir sempre "para fora" da cabeca. No perfil usa o mesmo desenho (ou
// `side`, quando a peca precisa de outro recorte por estar sobre a pele).
// Canais: a = metal (0-4), b = gema/detalhe (a-e), c = terceiro material (A-E).
const LG = { p: ['w', 4], q: ['w', 3], r: ['w', 2], s: ['w', 1], k: ['#2a1c30', 1] };
for (let i = 0; i < 5; i++) { LG[i] = ['a', i]; LG['abcde'[i]] = ['b', i]; LG['ABCDE'[i]] = ['c', i]; }

function sprite(L, e, mir, [rows, ox, oy]) {
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
    const v = LG[ch];
    if (!v) return;
    const x = mir ? e.x - (ox + dx) : e.x + ox + dx;
    L.px(x, e.y + oy + dy, v[0], v[1]);
  }));
}

// Peca "so de um lado" fica na orelha esquerda do personagem: de frente ela
// aparece a direita da tela, de costas a esquerda; o perfil mostra a esquerda.
function wanted(P, e, one) {
  if (!one || P.view === 'side') return true;
  return e.side === (P.view === 'down' ? 'r' : 'l');
}

function ear(spec) {
  return (L, P) => {
    for (const e of P.ears) {
      if (!wanted(P, e, spec.one)) continue;
      const side = P.view === 'side';
      const mir = !side && e.side === 'r';
      const parts = side && spec.side ? spec.side : spec.art;
      for (const p of parts) sprite(L, e, mir, p);
      spec.extra?.(L, P, e, mir);
    }
  };
}

// Protetores: concha felpuda na orelha + arco por cima da cabeca, que segue o
// contorno do cranio (template da cabeca do esqueleto) para nao "flutuar".
function muffs(kind) {
  return (L, P) => {
    const { x: hx, y: hy } = P.head;
    const furry = kind === 'pele';
    if (P.view === 'side') {
      for (let y = hy - 1; y <= hy + 4; y++) L.px(13, y, 'a', y === hy - 1 ? 3 : 2);
      L.px(12, hy - 1, 'a', 3);
      const e = P.ears[0];
      L.art(e.x - 1, e.y - 1, furry ? ['.AB.', 'ABBA', 'BBBA', '.AA.'] : ['.AA', 'ABA', 'AAA'], LGX);
      return;
    }
    const arch = [[-1, 4], [-1, 3], [0, 2], [0, 1], [1, 0], [2, -1]];
    for (const [dx, dy] of arch) { L.px(hx + dx, hy + dy, 'a', 3); L.px(hx + 11 - dx, hy + dy, 'a', 1); }
    for (let x = hx + 3; x <= hx + 8; x++) L.px(x, hy - 1, 'a', x < hx + 6 ? 3 : 2);
    if (kind === 'laco') { L.px(hx + 5, hy - 2, 'c', 3); L.px(hx + 6, hy - 2, 'c', 2); L.px(hx + 4, hy - 2, 'c', 4); L.px(hx + 7, hy - 2, 'c', 1); }
    for (const e of P.ears) {
      const mir = e.side === 'r';
      sprite(L, e, mir, [furry ? ['.cd.', 'cddc', 'cdcb', '.bb.'] : ['.cd', 'cdc', 'bcb'], furry ? -2 : -1, -1]);
    }
  };
}
const LGX = { A: ['b', 3], B: ['b', 2] };

const it = (id, name, sub, channels, draw) => ({ id, name, sub, channels, draw });
const M = (def = 'ouro') => ({ label: 'Metal', def });
const G = (def = 'carmesim', label = 'Gema') => ({ label, def });
const T = (def, label = 'Detalhe') => ({ label, def });

const BR = 'Brincos', AR = 'Argolas', PI = 'Pingentes', AD = 'Adornos';

export const EARS_ACC = [
  // ---- Brincos (pecas presas no lobulo) ----
  it('ponto-ouro', 'Ponto de ouro', BR, [M()], ear({ art: [[['4'], 0, 1]] })),
  it('perola', 'Pérola', BR, [M()], ear({ art: [[['3', 'p', 'r'], 0, 1]] })),
  it('gema-lobulo', 'Gema no lóbulo', BR, [M(), G('jade')], ear({ art: [[['2', 'e', 'b'], 0, 1]] })),
  it('piercings-fileira', 'Fileira de piercings', BR, [M('prata')], ear({ art: [[['4', '3', '.', '2'], 0, 0]], side: [[['.4', '3.', '.', '2'], 0, 0]] })),
  it('cruz-pendente', 'Cruz pendente', BR, [M('prata')], ear({ art: [[['.3.', '.4.', '432', '.3.', '.1.'], -1, 1]] })),
  it('estrela', 'Estrela', BR, [M(), G('ocre', 'Brilho')], ear({ art: [[['.3.', '4.4', '.e.', '3.1'], -1, 1]] })),
  it('lua-crescente', 'Lua crescente', BR, [M('prata')], ear({ art: [[['.3', '4.', '3.', '.2'], -1, 1]] })),
  it('presa', 'Presa de fera', BR, [M('bronze'), T('osso', 'Dente')], ear({ art: [[['.3', 'ed', 'dc', 'c.'], -1, 1]] })),
  it('caveirinha', 'Caveirinha', BR, [M('prata'), T('osso', 'Osso')], ear({ art: [[['.3.', 'ede', 'kdk', '.c.'], -1, 1]] })),
  it('pena-pendente', 'Pena pendente', BR, [M(), T('carmesim', 'Pena')], ear({ art: [[['.3', 'ed', 'dc', 'dc', 'cb', 'b.'], -1, 1]] })),
  it('dois-pontos', 'Dois pontos de gema', BR, [M(), G('azul-aco')], ear({ art: [[['e', 'b'], 0, 0], [['3'], -1, 1]], side: [[['e', 'b'], 1, 0], [['3'], 0, 1]] })),
  it('flor-lobulo', 'Florzinha', BR, [M(), G('rosa-seco', 'Pétalas')], ear({ art: [[['.d.', 'd4c', '.b.'], -1, 1]] })),
  // ---- Argolas ----
  it('argola-pequena', 'Argola pequena', AR, [M()], ear({ art: [[['.3.', '4.2', '.1.'], -1, 1]] })),
  it('argola-grande', 'Argola grande', AR, [M()], ear({ art: [[['.33.', '4..2', '4..1', '3..1', '.21.'], -2, 1]] })),
  it('argola-pirata', 'Argola de pirata', AR, [M()], ear({ one: true, art: [[['.43.', '4..2', '3..1', '.21.'], -2, 1]] })),
  it('argolas-encadeadas', 'Argolas encadeadas', AR, [M('prata')], ear({ art: [[['.3.', '4.2', '.3.', '4.1', '.2.'], -1, 1]] })),
  it('argola-conta', 'Argola com conta', AR, [M(), G('jade', 'Conta')], ear({ art: [[['.3.', '4.2', '3.1', '.e.', '.b.'], -1, 1]] })),
  it('argola-grossa', 'Argola grossa', AR, [M()], ear({ art: [[['43.', '4.2', '321', '.1.'], -1, 1]] })),
  it('argola-gota', 'Argola com gota', AR, [M(), G('carmesim')], ear({ art: [[['.33.', '4..2', '.32.', '.ed.', '..b.'], -2, 1]] })),
  it('argolas-subindo', 'Argolas subindo a orelha', AR, [M('prata')], ear({ art: [[['3.', '.4', '3.', '.4', '.2'], -1, -1]], side: [[['.3', '4.', '.3', '4.', '2.'], 0, -1]] })),
  it('alargador', 'Alargador', AR, [M('madeira'), G('couro-escuro', 'Centro')], ear({ art: [[['43', 'b2', '21'], -1, 0]] })),
  it('argola-espiral', 'Argola em espiral', AR, [M('cobre')], ear({ art: [[['.3.', '4.2', '3.1', '.21', '..1'], -1, 1]] })),
  // ---- Pingentes ----
  it('gota', 'Gota de cristal', PI, [M(), G('azul-aco', 'Cristal')], ear({ art: [[['3.', 'e.', 'dc', 'cb', 'b.'], 0, 1]] })),
  it('corrente-longa', 'Corrente longa', PI, [M('prata'), G('arcano')], ear({ art: [[['3', '1', '3', '1', 'e', 'b'], 0, 1]] })),
  it('lustre', 'Lustre', PI, [M(), G('carmesim')], ear({ art: [[['.3.', '424', '3.3', 'e.d', 'b.b'], -1, 1]] })),
  it('borla', 'Borla', PI, [M(), T('carmesim', 'Fios')], ear({ art: [[['.3.', '.4.', 'ede', 'dcb', 'c.b'], -1, 1]] })),
  it('cristal-longo', 'Cristal alongado', PI, [M('prata'), G('jade', 'Cristal')], ear({ art: [[['.3.', '.e.', 'ede', 'dcb', '.c.', '.b.'], -1, 1]] })),
  it('tres-gotas', 'Três gotas', PI, [M(), G('ameixa')], ear({ art: [[['.3.', '232', 'e.e', 'b.b', '.e.', '.b.'], -1, 1]] })),
  it('sino', 'Sininho', PI, [M()], ear({ art: [[['.3.', '.4.', '432', '321', '.0.'], -1, 1]] })),
  it('folha', 'Folha pendente', PI, [M(), T('musgo', 'Folha')], ear({ art: [[['3.', 'ed', 'dc', '.b'], 0, 1]], side: [[['.3', 'ed', 'dc', 'b.'], -1, 1]] })),
  it('olho-pendente', 'Olho místico', PI, [M(), G('azul-aco', 'Íris')], ear({ art: [[['.3.', '4p2', 'pbp', '3p1'], -1, 1]] })),
  // ---- Adornos (presos na orelha toda) ----
  it('bracadeira', 'Braçadeira de orelha', AD, [M('prata')], ear({ art: [[['34', '.3', '.2'], -1, -1]], side: [[['34', '43', '.2'], 0, -1]] })),
  it('ponteira', 'Ponteira de elfo', AD, [M(), G('jade')], ear({ art: [[['3.', '43', '.e', '.2'], -1, -2]], side: [[['.3', '34', 'e4', '.2'], 0, -2]] })),
  it('asa-dourada', 'Asa dourada', AD, [M()], ear({ art: [[['4..', '34.', '.32', '..2'], -2, -2]], side: [[['..4', '.43', '43.', '2..'], 1, -2]] })),
  it('corrente-orelha', 'Corrente da orelha', AD, [M('prata'), G('carmesim')], ear({ art: [[['3.', '.4', '1.', '.1', 'e.', 'b2'], -1, -1]], side: [[['.3', '4.', '.1', '1.', 'e.', 'b.'], 0, -1]] })),
  it('espiral-cobre', 'Espiral de cobre', AD, [M('cobre')], ear({ art: [[['.4', '3.', '.3', '2.', '.1'], -1, -1]], side: [[['43', '.3', '32', '1.'], 0, -1]] })),
  it('flor-orelha', 'Flor atrás da orelha', AD, [G('carmesim', 'Pétalas'), T('musgo', 'Folha')], ear({ art: [[['.3.', '3p2', '.1c'], 0, -1]], side: [[['.3.', '3p2', 'c1.'], 1, -1]] })),
  it('pena-orelha', 'Pena atrás da orelha', AD, [T('ocre', 'Pena'), T('carmesim', 'Ponta')], ear({ art: [[['..4', '.3.', 'e2.', 'c..'], 0, -3]], side: [[['4..', '.3.', '.2e', '..c'], 1, -3]] })),
  it('protetores', 'Protetores de orelha', AD, [T('aco', 'Arco'), T('carmesim', 'Conchas')], muffs('liso')),
  it('protetores-pele', 'Protetores de pele', AD, [T('camurca', 'Arco'), T('branco-gasto', 'Pele')], muffs('pele')),
  it('protetores-laco', 'Protetores com laço', AD, [T('rosa-seco', 'Arco'), T('branco-gasto', 'Conchas'), T('carmesim', 'Laço')], muffs('laco'))
];
