// Pescoco: colares, amuletos, gargantilhas, lencos e golas.
// O chibi quase nao tem pescoco (o queixo encosta no tronco), entao tudo se
// ancora na linha de cima do tronco (P.torso.top) e no centro do corpo (11.5).
// Colar = caminho em "U" (de frente), diagonal da nuca ao peito (perfil) ou
// so a volta de tras (costas) + um pingente opcional na ponta do U.
// Canais: a = corrente/tecido principal (0-4), b = pingente/detalhe (a-e),
// c = terceiro material (A-E). Legenda extra: p..s = branco, k = furo escuro.
const LG = { p: ['w', 4], q: ['w', 3], r: ['w', 2], s: ['w', 1], k: ['#2a1c30', 1] };
for (let i = 0; i < 5; i++) { LG[i] = ['a', i]; LG['abcde'[i]] = ['b', i]; LG['ABCDE'[i]] = ['c', i]; }
const CX = 11.5;

function span(P, y) { return P.torso.rows.get(y) || [P.torso.x0, P.torso.x1]; }

// Liga dois pontos seguidos quando o degrau vertical passa de 1px (sem buracos).
function joined(raw) {
  const out = [];
  let prev = null;
  for (const p of raw) {
    if (prev && Math.abs(p.y - prev.y) > 1) {
      const st = Math.sign(p.y - prev.y);
      for (let y = prev.y + st; y !== p.y; y += st) out.push({ x: st > 0 ? prev.x : p.x, y });
    }
    out.push(p); prev = p;
  }
  return out;
}

// Caminho do colar por visao. depth = quanto o U desce; hw = meia-largura.
function path(P, depth, hw = 2.5) {
  const top = P.torso.top;
  if (P.view === 'side') {
    // o braco da frente cobre o meio do tronco de perfil: o fio corre na linha
    // do topo (acima do ombro) e desce pela frente do peito, onde aparece.
    const fx = P.torso.x0 + 1, bx = fx + 3, raw = [];
    for (let x = bx; x > fx; x--) raw.push({ x, y: top });
    for (let y = top + 1; y <= top + Math.max(1, depth); y++) raw.push({ x: fx - (y - top > 2 ? 1 : 0), y });
    return raw;
  }
  if (P.view === 'up') {
    const raw = [];
    for (let x = Math.ceil(CX - hw); x <= Math.floor(CX + hw); x++) raw.push({ x, y: top });
    return raw;
  }
  const raw = [];
  for (let x = Math.ceil(CX - hw); x <= Math.floor(CX + hw); x++) {
    const t = (x - CX) / hw;
    raw.push({ x, y: top + Math.round(depth * (1 - t * t)) });
  }
  return joined(raw);
}

// Estilos de fio. i = indice no caminho (alterna tons para dar "contas"/elos).
function strand(L, P, st, pts) {
  const n = pts.length;
  pts.forEach(({ x, y }, i) => {
    const mid = i > 0 && i < n - 1;
    switch (st) {
      case 'chain': L.px(x, y, 'a', i % 2 ? 1 : 3); break;
      case 'cord': L.px(x, y, 'a', i % 2 ? 1 : 2); break;
      case 'beads': L.px(x, y, i % 2 ? 'a' : 'b', i % 2 ? 1 : 3); break;
      case 'pearls': L.px(x, y, 'w', i % 2 ? 2 : 4); break;
      case 'thick': L.px(x, y, 'a', 3); L.px(x, y + 1, 'a', i % 2 ? 1 : 2); break;
      case 'flowers': L.px(x, y, i % 3 === 1 ? 'c' : 'b', i % 3 === 1 ? 2 : i % 3 === 0 ? 4 : 3); if (i % 3 === 0 && mid && P.view !== 'up') L.px(x, y + 1, 'b', 1); break;
      case 'gold': L.px(x, y, 'a', 3); L.px(x, y - 1, 'a', 4); break;
      default: L.px(x, y, 'a', 2);
    }
  });
}

// Penduricalhos ao longo do fio (dentes, conchas, ossos, penas): so na frente.
function hangers(L, P, kind, pts) {
  if (P.view === 'up') return;
  const n = pts.length;
  pts.forEach(({ x, y }, i) => {
    if (i === 0 || i === n - 1 || i % 2 !== (P.view === 'side' ? 1 : 0)) return;
    if (kind === 'teeth') { L.px(x, y + 1, 'b', 4); L.px(x, y + 2, 'b', 2); }
    if (kind === 'shells') { L.px(x, y + 1, 'b', 3); L.px(x + 1, y + 1, 'b', 2); L.px(x, y + 2, 'b', 1); }
    if (kind === 'bones') { L.px(x, y + 1, 'b', 4); L.px(x, y + 2, 'b', 3); L.px(x, y + 3, 'b', 2); }
    if (kind === 'feathers') { L.px(x, y + 1, 'b', 3); L.px(x, y + 2, 'b', 2); L.px(x, y + 3, 'c', 2); L.px(x, y + 4, 'c', 1); }
  });
}

// Pingente na ponta do U. De perfil mostra so a metade da frente (fica fino).
function pendant(L, P, pts, rows) {
  if (P.view === 'up') return;
  const yb = Math.max(...pts.map((p) => p.y)) + 1;
  const w = rows[0].length;
  if (P.view === 'side') {
    const cw = Math.ceil(w / 2), fx = pts[pts.length - 1].x;
    rows.forEach((row, dy) => [...row.slice(0, cw)].forEach((ch, dx) => { const v = LG[ch]; if (v) L.px(fx - cw + 1 + dx, yb + dy, v[0], v[1]); }));
    return;
  }
  L.art(12 - Math.ceil(w / 2), yb, rows, LG);
}

const PEND = {
  gem: ['ed', 'dc', 'cb', '.b'],
  cross: ['.e.', 'ddc', '.c.', '.b.'],
  sun: ['d.c', '.e.', 'c.b'],
  medal: ['.dc.', 'decb', 'dccb', '.bb.'],
  key: ['.d.', 'd.c', '.c.', '.c.', '.cb'],
  whistle: ['dcc', 'cbb'],
  fang: ['ed', 'dc', 'c.'],
  skull: ['ede', 'kdk', '.c.'],
  moon: ['.d', 'c.', 'c.', '.b'],
  eye: ['.dd.', 'dpAc', '.cb.'],
  vial: ['.A', 'dq', 'eb', 'cb'],
  rune: ['dcc', 'cEb', 'cbb'],
  coin: ['.e.', 'dkc', '.b.'],
  heart: ['e.d', 'dcb', '.b.'],
  hourglass: ['ddd', '.q.', '.C.', 'ccb'],
  crossSmall: ['.d.', 'dcb', '.b.', '.b.'],
  ring: ['.d.', 'd.b', '.b.']
};

// ---- golas e faixas em volta do pescoco ----
// Faixa de `h` linhas a partir da linha do topo (dy0 pode ser -1: sobe ao lado
// do queixo). grow = px a mais para cada lado; tex = textura.
function band(L, P, { dy0 = 0, h = 1, grow = 0, inset = 0, tex = 'plain', ch = 'a' }) {
  const top = P.torso.top;
  const side = P.view === 'side', up = P.view === 'up';
  for (let r = 0; r < h; r++) {
    const y = top + dy0 + r;
    let a, b;
    if (side) { const fx = P.torso.x0 + 1; a = fx - (grow > 0 ? 1 : 0); b = fx + 3 + grow; }
    else { const s = span(P, Math.max(y, top)); a = s[0] - grow + inset; b = s[1] + grow - inset; }
    for (let x = a; x <= b; x++) {
      // linha acima do tronco: de frente so nas laterais do queixo (nao cobre o rosto)
      if (y < top && !up && !side && x > a + 1 && x < b - 1) continue;
      if (y < top && side && x < P.torso.x0 + 3) continue;
      const k = x - a, last = b - a;
      let s = r === 0 ? 3 : r === h - 1 ? 1 : 2;
      if (k === 0) s = Math.min(4, s + 1);
      if (k === last) s = Math.max(0, s - 1);
      let c = ch;
      if (tex === 'knit' && (x + y) % 2) s = Math.max(0, s - 1);
      if (tex === 'fur') { if ((x + r) % 2) s = Math.min(4, s + 1); if (r === h - 1 && (x % 2)) continue; }
      if (tex === 'lace') { c = 'w'; s = (x + r) % 2 ? 4 : 2; if (r === h - 1 && x % 2) continue; }
      if (tex === 'ruff') { c = 'w'; s = (x + r) % 2 ? 4 : 1; }
      if (tex === 'plate') { s = r % 2 ? 1 : 3; if (k === 0) s = 4; }
      if (tex === 'pearl') { c = 'w'; s = (x + r) % 2 ? 4 : 2; }
      L.px(x, y, c, s);
    }
  }
}

// Pontas soltas que balancam ao andar (cachecol, lenco). Perfil: voam para tras.
function tails(L, P, x, y, len, ch = 'a', two = true) {
  const sw = P.walk ? P.phase : 0;
  if (P.view === 'side') {
    const bx = P.torso.x0 + 4;
    for (let i = 0; i < len; i++) { const d = (i > 1 ? 1 : 0) + (i > 3 ? Math.abs(sw) : 0); L.px(bx + d, y + i, ch, 2); L.px(bx + 1 + d, y + i, ch, i === len - 1 ? 0 : 1); }
    return;
  }
  for (let i = 0; i < len; i++) {
    const d = i > 1 ? sw : 0;
    L.px(x + d, y + i, ch, i === len - 1 ? 1 : 3);
    if (two) L.px(x + 1 + d, y + i - 1 + (i ? 0 : 1), ch, 1);
  }
}

const it = (id, name, sub, channels, draw) => ({ id, name, sub, channels, draw });
const ch = (...pairs) => pairs.map(([label, def]) => ({ label, def }));

// Colar simples: lista de fios [estilo, profundidade, meia-largura] + extras.
function necklace({ strands = [['chain', 2]], hang, pend, back = 'clasp' }) {
  return (L, P) => {
    let main = null;
    for (const [st, d, hw] of strands) {
      const pts = path(P, d, hw);
      strand(L, P, st, pts);
      if (!main) main = pts;
      if (hang && st === strands[0][0]) hangers(L, P, hang, pts);
      main = pts;
    }
    if (pend) pendant(L, P, main, PEND[pend] || pend);
    if (P.view === 'up' && back === 'clasp') L.px(12, P.torso.top, 'a', 4); // fecho na nuca
  };
}

const CO = 'Colares', AM = 'Amuletos', GA = 'Gargantilhas', LE = 'Lenços e golas';

export const NECK = [
  // ---- Colares ----
  it('colar-contas', 'Colar de contas', CO, ch(['Fio', 'couro'], ['Contas', 'jade']), necklace({ strands: [['beads', 2]] })),
  it('corrente-fina', 'Corrente fina', CO, ch(['Metal', 'ouro']), necklace({ strands: [['chain', 2]] })),
  it('corrente-grossa', 'Corrente grossa', CO, ch(['Metal', 'ouro']), necklace({ strands: [['thick', 2, 3]] })),
  it('colar-perolas', 'Colar de pérolas', CO, ch(['Fecho', 'prata']), necklace({ strands: [['pearls', 2, 3]] })),
  it('colar-dentes', 'Colar de dentes', CO, ch(['Cordão', 'couro'], ['Dentes', 'osso']), necklace({ strands: [['cord', 2, 3]], hang: 'teeth' })),
  it('colar-conchas', 'Colar de conchas', CO, ch(['Cordão', 'couro-escuro'], ['Conchas', 'rosa-seco']), necklace({ strands: [['cord', 2, 3]], hang: 'shells' })),
  it('colar-ossos', 'Colar de ossos', CO, ch(['Cordão', 'couro-escuro'], ['Ossos', 'osso']), necklace({ strands: [['cord', 3, 3]], hang: 'bones' })),
  it('colar-penas', 'Colar de penas', CO, ch(['Cordão', 'couro'], ['Penas', 'ocre'], ['Pontas', 'carmesim']), necklace({ strands: [['cord', 2, 3]], hang: 'feathers' })),
  it('colar-camadas', 'Colares em camadas', CO, ch(['Metal', 'ouro'], ['Contas', 'carmesim']), necklace({ strands: [['chain', 1, 2], ['beads', 3, 3]] })),
  it('guirlanda', 'Guirlanda de flores', CO, ch(['Fio', 'musgo'], ['Flores', 'rosa-seco'], ['Folhas', 'musgo']), necklace({ strands: [['flowers', 2, 3]], back: false })),
  it('rosario', 'Rosário', CO, ch(['Contas', 'madeira'], ['Cruz', 'prata']), necklace({ strands: [['beads', 3]], pend: 'crossSmall' })),
  it('corrente-longa', 'Corrente longa', CO, ch(['Metal', 'prata'], ['Gema', 'arcano']), necklace({ strands: [['chain', 5, 3]], pend: ['e', 'b'] })),
  // ---- Amuletos ----
  it('pingente-gema', 'Pingente de gema', AM, ch(['Corrente', 'ouro'], ['Gema', 'carmesim']), necklace({ strands: [['chain', 2]], pend: 'gem' })),
  it('simbolo-sagrado', 'Símbolo sagrado', AM, ch(['Corrente', 'ouro'], ['Símbolo', 'ouro']), necklace({ strands: [['chain', 2]], pend: 'cross' })),
  it('sol-radiante', 'Sol radiante', AM, ch(['Corrente', 'ouro'], ['Sol', 'abobora']), necklace({ strands: [['chain', 2]], pend: 'sun' })),
  it('medalhao', 'Medalhão', AM, ch(['Corrente', 'ouro'], ['Medalhão', 'ouro']), necklace({ strands: [['chain', 3, 3]], pend: 'medal' })),
  it('chave-pescoco', 'Chave no pescoço', AM, ch(['Cordão', 'couro'], ['Chave', 'bronze']), necklace({ strands: [['cord', 3]], pend: 'key' })),
  it('apito', 'Apito', AM, ch(['Cordão', 'linho'], ['Apito', 'prata']), necklace({ strands: [['cord', 2]], pend: 'whistle' })),
  it('presa-fera', 'Presa de fera', AM, ch(['Cordão', 'couro-escuro'], ['Presa', 'osso']), necklace({ strands: [['cord', 2]], pend: 'fang' })),
  it('caveira-pingente', 'Caveira', AM, ch(['Corrente', 'ferro'], ['Caveira', 'osso']), necklace({ strands: [['chain', 2]], pend: 'skull' })),
  it('lua-pingente', 'Lua de prata', AM, ch(['Corrente', 'prata'], ['Lua', 'prata']), necklace({ strands: [['chain', 2]], pend: 'moon' })),
  it('olho-protetor', 'Olho protetor', AM, ch(['Cordão', 'couro'], ['Olho', 'azul-aco'], ['Íris', 'azul-noite']), necklace({ strands: [['cord', 2]], pend: 'eye' })),
  it('frasco-pescoco', 'Frasco no pescoço', AM, ch(['Cordão', 'couro'], ['Vidro', 'jade'], ['Rolha', 'madeira']), necklace({ strands: [['cord', 2]], pend: 'vial' })),
  it('pedra-runica', 'Pedra rúnica', AM, ch(['Cordão', 'couro-escuro'], ['Pedra', 'pedra'], ['Runa', 'jade']), necklace({ strands: [['cord', 2]], pend: 'rune' })),
  it('moeda-furada', 'Moeda furada', AM, ch(['Cordão', 'couro'], ['Moeda', 'ouro']), necklace({ strands: [['cord', 2]], pend: 'coin' })),
  it('relicario', 'Relicário de coração', AM, ch(['Corrente', 'ouro'], ['Relicário', 'carmesim']), necklace({ strands: [['chain', 3]], pend: 'heart' })),
  it('ampulheta', 'Ampulheta', AM, ch(['Corrente', 'bronze'], ['Moldura', 'bronze'], ['Areia', 'ocre']), necklace({ strands: [['chain', 2]], pend: 'hourglass' })),
  // ---- Gargantilhas ----
  it('gargantilha-veludo', 'Gargantilha de veludo', GA, ch(['Fita', 'carvao'], ['Gema', 'carmesim']), (L, P) => {
    band(L, P, { h: 1, inset: 1 });
    if (P.view === 'down') { L.px(11, P.torso.top + 1, 'b', 4); L.px(12, P.torso.top + 1, 'b', 2); }
    if (P.view === 'side') L.px(P.torso.x0 + 1, P.torso.top + 1, 'b', 3);
  }),
  it('coleira-espinhos', 'Coleira de espinhos', GA, ch(['Couro', 'couro-escuro'], ['Espinhos', 'aco']), (L, P) => {
    band(L, P, { h: 2 });
    const top = P.torso.top;
    if (P.view === 'side') { const fx = P.torso.x0 + 1; for (let x = fx; x <= fx + 3; x += 2) L.px(x, top, 'b', 4); L.px(fx - 1, top + 1, 'b', 3); return; }
    const [a, b] = span(P, top);
    for (let x = a + 1; x <= b - 1; x += 2) L.px(x, top + 1, 'b', 4);
    L.px(a - 1, top + 1, 'b', 3); L.px(b + 1, top + 1, 'b', 2);
  }),
  it('gargantilha-renda', 'Gargantilha de renda', GA, ch(['Fita', 'carvao']), (L, P) => {
    band(L, P, { h: 1, inset: 1 });
    band(L, P, { dy0: 1, h: 1, inset: 1, tex: 'lace' });
  }),
  it('torque-ouro', 'Torque de ouro', GA, ch(['Ouro', 'ouro']), (L, P) => {
    const top = P.torso.top;
    if (P.view === 'side') { const fx = P.torso.x0 + 1; L.hline(fx, fx + 3, top, 'a', 3); L.px(fx - 1, top, 'a', 4); L.px(fx - 1, top + 1, 'a', 2); return; }
    const [a, b] = span(P, top);
    for (let x = a; x <= b; x++) L.px(x, top, 'a', x === a ? 4 : x === b ? 1 : 3);
    if (P.view === 'down') { L.erase(11, top); L.erase(12, top); L.px(10, top + 1, 'a', 4); L.px(13, top + 1, 'a', 2); L.px(10, top, 'a', 3); L.px(13, top, 'a', 2); }
    else L.px(12, top + 1, 'a', 1);
  }),
  it('gorjal', 'Gorjal de placas', GA, ch(['Placas', 'aco'], ['Rebites', 'bronze']), (L, P) => {
    band(L, P, { dy0: -1, h: 4, grow: 1, tex: 'plate' });
    const top = P.torso.top;
    if (P.view === 'down') { const [a, b] = span(P, top + 1); L.px(a, top + 1, 'b', 4); L.px(b, top + 1, 'b', 3); L.px(11, top + 2, 'b', 4); }
    if (P.view === 'side') L.px(P.torso.x0 + 1, top + 1, 'b', 4);
  }),
  it('gargantilha-argola', 'Gargantilha de argola', GA, ch(['Couro', 'couro'], ['Argola', 'ferro']), (L, P) => {
    band(L, P, { h: 2, inset: 1 });
    if (P.view === 'down') L.art(10, P.torso.top + 1, ['.dc.', 'd..b', '.cb.'], LG);
    if (P.view === 'side') L.art(P.torso.x0, P.torso.top + 1, ['d.', '.c', 'b.'], LG);
  }),
  it('gargantilha-perolas', 'Gargantilha de pérolas', GA, ch(['Fecho', 'prata'], ['Gema', 'jade']), (L, P) => {
    band(L, P, { h: 2, inset: 1, tex: 'pearl' });
    if (P.view === 'down') { L.px(11, P.torso.top + 2, 'b', 4); L.px(12, P.torso.top + 2, 'b', 2); }
    if (P.view === 'up') L.px(12, P.torso.top, 'a', 3);
  }),
  // ---- Lenços e golas ----
  it('lenco-amarrado', 'Lenço amarrado', LE, ch(['Tecido', 'carmesim'], ['Bolinhas', 'branco-gasto']), (L, P) => {
    band(L, P, { h: 1 });
    const top = P.torso.top;
    if (P.view === 'down') {
      L.art(9, top + 1, ['334321', '.3221.', '..21..'], LG);
      L.px(10, top + 1, 'b', 3); L.px(12, top + 2, 'b', 3);
    } else if (P.view === 'side') {
      const fx = P.torso.x0;
      L.art(fx, top + 1, ['322', '21.', '1..'], LG); L.px(fx + 1, top + 1, 'b', 3);
    } else { L.px(11, top + 1, 'a', 3); L.px(12, top + 1, 'a', 2); L.px(11, top + 2, 'a', 2); L.px(13, top + 2, 'a', 1); }
  }),
  it('cachecol', 'Cachecol', LE, ch(['Lã', 'carmesim'], ['Listras', 'osso']), (L, P) => {
    band(L, P, { dy0: -1, h: 3, grow: 1, tex: 'knit' });
    band(L, P, { dy0: 0, h: 1, grow: 1, ch: 'b' });
    const top = P.torso.top;
    if (P.view === 'down') tails(L, P, 13, top + 2, 3);
    else if (P.view === 'side') tails(L, P, 0, top + 2, 3);
    else tails(L, P, 11, top + 2, 2);
  }),
  it('cachecol-longo', 'Cachecol longo', LE, ch(['Lã', 'mostarda'], ['Franja', 'abobora']), (L, P) => {
    band(L, P, { dy0: -1, h: 3, grow: 1, tex: 'knit' });
    const top = P.torso.top;
    const sw = P.walk ? P.phase : 0;
    if (P.view === 'side') { tails(L, P, 0, top + 1, 7); return; }
    const x = P.view === 'down' ? 9 : 13;
    for (let i = 2; i < 8; i++) { const d = i > 4 ? sw : 0; L.px(x + d, top + i, 'a', 3); L.px(x + 1 + d, top + i, 'a', i % 2 ? 1 : 2); }
    L.px(x + sw, top + 8, 'b', 3); L.px(x + 1 + sw, top + 8, 'b', 2);
  }),
  it('gola-pele', 'Gola de pele', LE, ch(['Pele', 'terra']), (L, P) => band(L, P, { dy0: -1, h: 3, grow: 2, tex: 'fur' })),
  it('gola-renda', 'Gola de renda', LE, ch(['Base', 'branco-gasto']), (L, P) => band(L, P, { dy0: -1, h: 2, grow: 2, tex: 'ruff' })),
  it('estola', 'Estola', LE, ch(['Tecido', 'vinho'], ['Franja', 'ouro']), (L, P) => {
    band(L, P, { h: 2, grow: 1 });
    const top = P.torso.top;
    if (P.view === 'up') return;
    const xs = P.view === 'side' ? [P.torso.x0] : [span(P, top)[0] + 1, span(P, top)[1] - 1];
    for (const x of xs) {
      for (let y = top + 2; y < top + 7; y++) { L.px(x, y, 'a', x < 12 ? 3 : 2); }
      L.px(x, top + 7, 'b', 3);
    }
  }),
  it('capuz-caido', 'Capuz caído', LE, ch(['Tecido', 'azul-aco'], ['Forro', 'couro']), (L, P) => {
    const top = P.torso.top;
    if (P.view === 'up') {
      L.art(8, top - 1, ['.333332.', '33222221', '32bbbb21', '.32bb21.', '..3221..', '...21...'], LG);
      return;
    }
    if (P.view === 'side') { L.art(P.torso.x0 + 3, top - 2, ['.32.', '3221', '3bb1', '.21.'], LG); return; }
    band(L, P, { dy0: -1, h: 2, grow: 1 });
    const [a, b] = span(P, top);
    L.px(a, top - 1, 'b', 2); L.px(b, top - 1, 'b', 1);
  }),
  it('gola-alta', 'Gola alta', LE, ch(['Tecido', 'azul-noite'], ['Debrum', 'ouro']), (L, P) => {
    band(L, P, { dy0: -2, h: 3, grow: 1 });
    band(L, P, { dy0: 0, h: 1, grow: 1, ch: 'b' });
  }),
  it('jabot', 'Jabô de seda', LE, ch(['Fita', 'carvao']), (L, P) => {
    band(L, P, { h: 1, inset: 1 });
    const top = P.torso.top;
    if (P.view === 'down') L.art(10, top + 1, ['pqqp', '.qr.', 'qpqr', '.rs.'], LG);
    if (P.view === 'side') L.art(P.torso.x0, top + 1, ['pq', 'q.', 'pr', 'r.'], LG);
  }),
  it('laco-pescoco', 'Laço no pescoço', LE, ch(['Fita', 'vinho']), (L, P) => {
    band(L, P, { h: 1, inset: 1 });
    const top = P.torso.top;
    if (P.view === 'down') L.art(9, top, ['32..21', '324421', '21..10'], LG);
    if (P.view === 'side') L.art(P.torso.x0, top, ['32', '41', '1.'], LG);
    if (P.view === 'up') { L.px(11, top + 1, 'a', 2); L.px(12, top + 1, 'a', 1); }
  })
];
