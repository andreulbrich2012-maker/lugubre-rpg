// Orelhas: brincos, argolas, pingentes e adornos. A orelha tem 1x2 px de frente
// e 2x2 de perfil, entao cada peca e um sprite pequeno ancorado em P.ears.
// Sprite: linhas de texto; a coluna `ox` e relativa ao x da orelha e a linha `oy`
// ao y da orelha (oy 1 = lobulo). A orelha da direita da tela e espelhada para o
// brinco abrir sempre "para fora" da cabeca. No perfil usa o mesmo desenho (ou
// `side`, quando a peca precisa de outro recorte por estar sobre a pele).
// Leitura (auditoria 24/10, secao 7): joia de 1 px sumia, e ouro nos tons 3-4 tem
// quase a cor da pele clara. Entao toda joia tem pelo menos 2 px, um brilho
// branco (p) e um tom escuro (0-1) que da o contraste. De frente o pingente fica
// fora da cabeca e o compositor ja contorna; de perfil ele cai sobre a pele do
// queixo, entao ganha um contorno escuro proprio (outline()).
// Canais: a = metal (0-4), b = gema/detalhe (a-e), c = terceiro material (A-E).
// Legenda extra: p..s = branco (4..1), k = furo escuro.
import { idx } from '../skeleton.js';

const LG = { p: ['w', 4], q: ['w', 3], r: ['w', 2], s: ['w', 1], k: ['#2a1c30', 1] };
for (let i = 0; i < 5; i++) { LG[i] = ['a', i]; LG['abcde'[i]] = ['b', i]; LG['ABCDE'[i]] = ['c', i]; }
// contorno sepia bem escuro (mesma familia do contorno do compositor)
const OUT = ['#3a2230', 1];

function sprite(L, e, mir, [rows, ox, oy], cells) {
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
    const v = LG[ch];
    if (!v) return;
    const x = mir ? e.x - (ox + dx) : e.x + ox + dx;
    L.px(x, e.y + oy + dy, v[0], v[1]);
    cells?.push([x, e.y + oy + dy]);
  }));
}

// Contorno escuro nas celulas vizinhas que caem sobre a cabeca (pele/cabelo):
// sem ele a joia clara se perde no rosto de perfil.
function outline(L, P, cells) {
  const mine = new Set(cells.map(([x, y]) => idx(x, y)));
  for (const [x, y] of cells) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx > 23 || ny < 0 || ny > 31) continue;
      const i = idx(nx, ny);
      if (mine.has(i) || !P.headPart.cells.has(i) || L.has(nx, ny)) continue;
      L.px(nx, ny, OUT[0], OUT[1]);
    }
  }
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
      const cells = [];
      for (const p of parts) sprite(L, e, mir, p, cells);
      // de frente/costas so contorna o que a peca pede (o que invade o rosto)
      if (side || spec.outline) outline(L, P, cells);
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
  // botao 2x2: brilho branco em cima, sombra embaixo (le como bolinha de metal)
  it('botao-ouro', 'Botão de ouro', BR, [M()], ear({ art: [[['p3', '20'], -1, 1]] })),
  it('perola', 'Pérola', BR, [M('prata')], ear({ art: [[['.1', 'pq', 'rs'], -1, 1]] })),
  it('gema-lobulo', 'Gema lapidada', BR, [M(), G('jade')], ear({ art: [[['.2.', '.p.', 'edb', '.a.'], -1, 1]] })),
  it('piercings-fileira', 'Fileira de piercings', BR, [M('prata')], ear({ art: [[['p', '0', 'p', '0', '4'], -1, -2]], side: [[['p', '0', 'p', '0', '4'], 2, -2]] })),
  it('cruz-pendente', 'Cruz pendente', BR, [M('prata')], ear({ art: [[['.1.', '.4.', 'qp2', '.3.', '.0.'], -1, 1]] })),
  // estrela: quatro pontas na cor do brilho e o miolo branco (X, para nao confundir com a cruz)
  it('estrela', 'Estrela', BR, [M(), G('ocre', 'Brilho')], ear({ art: [[['.1.', 'e.d', '.p.', 'c.a'], -1, 1]] })),
  it('lua-crescente', 'Lua crescente', BR, [M('prata')], ear({ art: [[['..1', '.p3', '4..', '3..', '.10'], -2, 1]] })),
  it('presa', 'Presa de fera', BR, [M('bronze'), T('osso', 'Dente')], ear({ art: [[['31', 'ed', 'dc', 'b.', 'a.'], -1, 1]] })),
  it('caveirinha', 'Caveirinha', BR, [M('prata'), T('osso', 'Osso')], ear({ art: [[['.1.', 'ede', 'kdk', 'cbc'], -1, 1]] })),
  // pena longa: silhueta comprida que cai ate o ombro (le de longe, diferente de tudo)
  it('pena-pendente', 'Pena longa', BR, [M(), T('carmesim', 'Pena')], ear({ art: [[['.1', 'ed', 'dc', 'dc', 'cb', 'cb', 'a.'], -2, 1]] })),
  it('dois-pontos', 'Duas gemas', BR, [M(), G('azul-aco')], ear({ art: [[['e', 'a', '3', 'e', 'a'], -1, -1]], side: [[['e', 'a', '3', 'e', 'a'], 2, -1]] })),
  it('flor-lobulo', 'Florzinha', BR, [M(), G('carmesim', 'Pétalas')], ear({ art: [[['.d.', 'dpc', '.a.'], -1, 1]] })),
  it('espada-pendente', 'Espadinha', BR, [M('prata'), G('carmesim', 'Punho')], ear({ art: [[['.c.', 'd4b', '.p.', '.3.', '.2.', '.0.'], -1, 1]] })),
  it('chave-pendente', 'Chavinha', BR, [M('ouro')], ear({ art: [[['.p3', '.20', '.3.', '.2.', '30.'], -2, 1]] })),
  // ---- Argolas (o furo no meio e o que faz ler como argola) ----
  it('argola-pequena', 'Argola pequena', AR, [M()], ear({ art: [[['.3.', 'p.1', '.0.'], -1, 1]] })),
  it('argola-grande', 'Argola grande', AR, [M()], ear({ art: [[['.p3.', '4..2', '3..1', '3..1', '.10.'], -2, 1]] })),
  it('argola-pirata', 'Argola de pirata', AR, [M()], ear({ one: true, art: [[['.p4.', 'p332', '4..1', '3..0', '.10.'], -2, 1]] })),
  it('argolas-encadeadas', 'Argolas encadeadas', AR, [M('prata')], ear({ art: [[['.3.', 'p.1', '.2.', 'q.0', '.0.'], -1, 1]] })),
  it('argola-conta', 'Argola com conta', AR, [M(), G('jade', 'Conta')], ear({ art: [[['.3.', 'p.1', '.0.', 'edb', '.a.'], -1, 1]] })),
  it('argola-grossa', 'Argola grossa', AR, [M()], ear({ art: [[['p43', '3k1', '210'], -1, 1]] })),
  it('argola-gota', 'Argola com gota', AR, [M(), G('carmesim')], ear({ art: [[['.p3.', '4..2', '.21.', '.ed.', '.cb.', '..a.'], -2, 1]] })),
  it('argolas-subindo', 'Argolas subindo a orelha', AR, [M('prata')], ear({ art: [[['.p', '4.', '.0', 'p.', '.0', '3.'], -2, -2]], side: [[['p.', '.0', 'p.', '.0', '3.'], 2, -2]] })),
  it('alargador', 'Alargador', AR, [M('madeira'), G('couro-escuro', 'Centro')], ear({ art: [[['.43.', '3ba2', '2ab1', '.10.'], -2, 0]] })),
  it('argola-espiral', 'Argola em espiral', AR, [M('cobre')], ear({ art: [[['.3.', 'p.1', '3.0', '.21', '..0'], -1, 1]] })),
  it('argola-dupla', 'Argolas duplas', AR, [M('prata')], ear({ art: [[['.3..', 'p.1.', '.p.2', '..1.'], -2, 1]] })),
  // ---- Pingentes ----
  it('gota', 'Gota de cristal', PI, [M(), G('azul-aco', 'Cristal')], ear({ art: [[['1.', 'p.', 'ed', 'cb', '.a'], 0, 1]], side: [[['.1', '.p', 'ed', 'cb', 'a.'], -1, 1]] })),
  it('corrente-longa', 'Corrente longa', PI, [M('prata'), G('arcano')], ear({ art: [[['.3', '.0', '.3', '.0', 'pe', 'ba'], -1, 1]] })),
  it('lustre', 'Lustre', PI, [M(), G('carmesim')], ear({ art: [[['.1.', 'p42', '3.1', 'e.d', 'a.a'], -1, 1]] })),
  it('borla', 'Borla', PI, [M(), T('carmesim', 'Fios')], ear({ art: [[['.1.', '.p.', 'ede', 'dcb', 'c.a'], -1, 1]] })),
  it('cristal-longo', 'Cristal alongado', PI, [M('prata'), G('jade', 'Cristal')], ear({ art: [[['.1.', '.p.', 'ede', 'dcb', '.c.', '.a.'], -1, 1]] })),
  it('tres-gotas', 'Três gotas', PI, [M(), G('ameixa')], ear({ art: [[['.1.', 'p3p', 'e.e', 'a.a', '.e.', '.a.'], -1, 1]] })),
  it('sino', 'Sininho', PI, [M()], ear({ art: [[['.1.', '.p.', 'p32', '321', '.0.'], -1, 1]] })),
  it('folha', 'Folha pendente', PI, [M(), T('musgo', 'Folha')], ear({ art: [[['1.', 'ed', 'dc', 'cb', '.a'], 0, 1]], side: [[['.1', 'ed', 'dc', 'cb', 'a.'], -1, 1]] })),
  it('olho-pendente', 'Olho místico', PI, [M(), G('azul-aco', 'Íris')], ear({ art: [[['.1.', '3p2', 'pa1', '201'], -1, 1]] })),
  // medalhao: disco 3x3 grande e cheio, pendurado bem abaixo da orelha
  it('medalhao-orelha', 'Medalhão', PI, [M(), G('carmesim', 'Pedra')], ear({ art: [[['.1.', '.0.', 'p32', '3e1', '210'], -1, 1]] })),
  // ---- Adornos (presos na orelha toda) ----
  it('bracadeira', 'Braçadeira de orelha', AD, [M('prata')], ear({ art: [[['p3', '.2', '.0'], -1, -1]], side: [[['p3', '32', '.0'], 0, -1]] })),
  it('ponteira', 'Ponteira de elfo', AD, [M(), G('jade')], ear({ art: [[['p.', '43', '.e', '.0'], -1, -3]], side: [[['.p', '34', 'e1', '.0'], 0, -3]] })),
  it('asa-dourada', 'Asa dourada', AD, [M()], ear({ art: [[['p..', '43.', '.32', '..0'], -2, -2]], side: [[['..p', '.43', '42.', '0..'], 1, -2]] })),
  it('corrente-orelha', 'Corrente da orelha', AD, [M('prata'), G('carmesim')], ear({ art: [[['p.', '.3', '0.', '.3', 'e.', 'a0'], -1, -1]], side: [[['.p', '3.', '.0', '3.', 'e.', 'a.'], 0, -1]] })),
  it('espiral-cobre', 'Espiral de cobre', AD, [M('cobre')], ear({ art: [[['.p', '3.', '.3', '2.', '.0'], -1, -1]], side: [[['p3', '.3', '32', '0.'], 0, -1]] })),
  it('flor-orelha', 'Flor atrás da orelha', AD, [G('carmesim', 'Pétalas'), T('musgo', 'Folha')], ear({ outline: true, art: [[['.3.', '3p2', '.0c'], 0, -1]], side: [[['.3.', '3p2', 'c0.'], 1, -1]] })),
  it('pena-orelha', 'Pena atrás da orelha', AD, [T('ocre', 'Pena'), T('carmesim', 'Ponta')], ear({ outline: true, art: [[['..p', '.3.', 'e2.', 'c..'], 0, -3]], side: [[['p..', '.3.', '.2e', '..c'], 1, -3]] })),
  it('protetores', 'Protetores de orelha', AD, [T('aco', 'Arco'), T('carmesim', 'Conchas')], muffs('liso')),
  it('protetores-pele', 'Protetores de pele', AD, [T('camurca', 'Arco'), T('branco-gasto', 'Pele')], muffs('pele')),
  it('protetores-laco', 'Protetores com laço', AD, [T('rosa-seco', 'Arco'), T('branco-gasto', 'Conchas'), T('carmesim', 'Laço')], muffs('laco'))
];
