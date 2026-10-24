// Pernas (encaixe 'knees'): joelheiras, caneleiras, ligas, faixas, coldres, bolsas
// e tornozeleiras. Desenhado por cima da calca e antes do calcado.
// Tudo e relativo a perna (l.top = quadril, l.foot.y = pe): coxa, joelho, canela e
// tornozelo saem de proporcoes, entao vale para altura baixa/normal, todo porte e
// todo quadro do passo (a perna de perfil inclina e as linhas seguem l.rows).
// Canais: a = couro/tecido principal, b = detalhe (tira, meia, bolsa), c = metal/osso.
//
// Legenda (igual a dos bracos): a/b/c = relevo automatico pela forma; A/B/C = brilho;
// x/y/z = tom 1; X/Y/Z = tom 0; m/n = b/c tom 3; k/K = pele; w/W = branco;
// r/t = gemas fixas; o/O = ouro fixo.

const LG = {
  A: ['a', 4], B: ['b', 4], C: ['c', 4],
  x: ['a', 1], y: ['b', 1], z: ['c', 1],
  X: ['a', 0], Y: ['b', 0], Z: ['c', 0],
  m: ['b', 3], n: ['c', 3], k: ['skin', 2], K: ['skin', 1],
  w: ['w', 3], W: ['w', 4],
  r: ['#d6455d', 3], t: ['#5ad1c8', 3], g: ['#7ac74f', 3], o: ['#e8b84a', 3], O: ['#e8b84a', 4],
  a: ['a', null], b: ['b', null], c: ['c', null]
};

// Relevo pela forma: esquerda/topo claros, direita/baixo escuros. Faixa de uma
// linha fica neutra no meio (topo e base se anulam) e so ganha luz pela esquerda.
function autoTone(set, x, y) {
  const has = (dx, dy) => set.has(`${x + dx},${y + dy}`);
  let s = 2;
  if (!has(-1, 0)) s += 1;
  if (!has(1, 0)) s -= 1;
  if (!has(0, -1)) s += 1;
  if (!has(0, 1)) s -= 1;
  return Math.max(1, Math.min(4, s));
}

// "Caneta" de uma perna: junta os pixels e pinta tudo de uma vez (o relevo precisa
// conhecer a forma inteira). A perna de tras do perfil fica mais escura e nao pinta
// por cima da perna da frente (senao a liga de tras apareceria sobre a calca da frente).
function pen(L, P, l) {
  const cells = new Map();
  const side = P.view === 'side';
  const frontLeg = l.back ? P.legs.find((o) => !o.back) : null;
  const top = l.top, fy = l.foot.y;
  const g = {
    view: P.view, side, up: P.view === 'up',
    top, fy, lo: fy - 1,
    knee: Math.min(fy - 1, top + Math.round((fy - top) * 0.45)),
    // lado de fora: de frente/costas, a borda externa de cada perna; de perfil, a frente
    out: side ? -1 : l.side === 'l' ? -1 : 1,
    clamp: (y) => Math.max(top, Math.min(fy - 1, y)),
    span(y) {
      if (l.rows.has(y)) return l.rows.get(y);
      return l.rows.get(y < top ? top : l.bottom);
    },
    mid(y) { const [a, b] = g.span(y); return (a + b) >> 1; },
    // x da borda externa (k = quantos px para fora)
    edge(y, k = 0) { const [a, b] = g.span(y); return g.out < 0 ? a - k : b + k; },
    px(x, y, ch) { if (LG[ch]) cells.set(`${x},${y}`, [x, y, ch]); },
    // linha pela perna; pat se repete a partir da esquerda; o/i = px extras fora/dentro
    row(y, pat = 'a', o = 0, i = 0) {
      const [a, b] = g.span(y);
      const x0 = a - (g.out < 0 ? o : i), x1 = b + (g.out < 0 ? i : o);
      for (let x = x0; x <= x1; x++) g.px(x, y, pat[(x - x0) % pat.length]);
    },
    flush() {
      const set = new Set(cells.keys());
      const ds = l.back ? -1 : 0;
      for (const [x, y, ch] of cells.values()) {
        if (frontLeg && frontLeg.cells.has(y * 24 + x)) continue;
        const [c, s] = LG[ch];
        L.px(x, y, c, (s ?? autoTone(set, x, y)) + ds);
      }
    }
  };
  return g;
}

// Qual perna: 'both', 'L' (esquerda do personagem) ou 'R'. De frente a esquerda do
// personagem e a perna da direita da tela; de costas, a da esquerda; de perfil
// (olhando a esquerda) e a da frente. P.legs no perfil ja vem [tras, frente].
function pick(P, who) {
  if (who === 'both') return P.legs;
  const up = P.view === 'up';
  const left = up ? P.legs[0] : P.legs[1];
  const right = up ? P.legs[1] : P.legs[0];
  return [who === 'L' ? left : right];
}

// ---------- pecas ----------
// Joelheira: 3 linhas em volta do joelho, a do meio salta 1px para fora.
// De costas so aparece a tira que prende.
function pad(style) {
  return (g) => {
    const y0 = g.clamp(g.knee - 1), y1 = y0 + 1, y2 = g.clamp(y0 + 2);
    if (g.up) { g.row(y1, style === 'osso' ? 'bm' : 'y'); return; }
    const m = g.mid(y1);
    if (style === 'couro') {
      g.row(y0, 'a'); g.row(y1, 'a', 1); g.row(y2, 'x');
      g.px(m, y1, 'm'); g.px(m - 1, y0, 'm');
    } else if (style === 'unica') {
      g.row(y0 - 1, 'y'); g.row(y0, 'a'); g.row(y1, 'a', 1); g.row(y2, 'a'); g.row(y2 + 1 <= g.lo ? y2 + 1 : y2, 'y');
      g.px(g.edge(y0 - 1, 1), y0 - 1, 'C');
    } else if (style === 'metal') {
      g.row(y0, 'c'); g.row(y1, 'c', 1); g.row(y2, 'z');
      g.px(g.span(y0)[0], y0, 'C'); g.px(m, y1, 'C');
    } else if (style === 'espinhos') {
      g.row(y0, 'c'); g.row(y1, 'c', 2); g.row(y2, 'z');
      g.px(g.edge(y1, 2), y1, 'C'); g.px(m, y1, 'C'); g.px(m, y0, 'Z');
    } else if (style === 'redonda') {
      const [a, b] = g.span(y0);
      for (let x = a + 1; x < b; x++) g.px(x, y0, 'c');
      g.row(y1, 'c', 1, 0);
      const [c, d] = g.span(y2);
      for (let x = c + 1; x < d; x++) g.px(x, y2, 'c');
      g.px(m, y1, 'r');
      g.px(a, y0, 'y'); g.px(b, y0, 'y'); g.px(c, y2, 'y'); g.px(d, y2, 'y');
    } else if (style === 'osso') {
      g.row(y0, 'c'); g.row(y1, 'cZ', 1); g.row(y2, 'bm');
      g.px(g.edge(y0, 1), y0, 'n');
    } else if (style === 'acolchoada') {
      g.row(y0, 'am'); g.row(y1, 'ma', 1); g.row(y2, 'am');
    }
  };
}

// Caneleira: do joelho ao tornozelo, com capa no joelho e quina clara no meio.
function shin(style, withPad = false) {
  return (g) => {
    const yk = g.clamp(withPad ? g.knee - 1 : g.knee);
    for (let y = yk; y <= g.lo; y++) {
      if (g.up) { if (y === g.lo || y === yk) g.row(y, 'y'); continue; }
      const m = g.mid(y);
      if (style === 'metal') {
        g.row(y, 'c', y === yk ? 1 : 0, y === yk ? 1 : 0);
        g.px(m, y, y === yk ? 'C' : 'n');
      } else {
        g.row(y, 'a', y === yk ? 1 : 0);
        if ((y - yk) % 2) { g.px(m - 1, y, 'm'); g.px(m + 1, y, 'm'); } else if (y !== yk) g.px(m, y, 'm');
      }
    }
    if (withPad && !g.up) {
      const y = yk;
      g.row(y, 'c', 1, 1); g.px(g.mid(y), y, 'C');
      if (y + 1 <= g.lo) g.row(y + 1, 'z', 1);
    }
  };
}

const band = (dy, pat, o = 0, i = 0, from = 'top') => (g) => {
  const base = from === 'top' ? g.top : from === 'knee' ? g.knee : g.lo;
  g.row(g.clamp(base + dy), pat, o, i);
};

// Laco de fita na borda externa (duas orelhas e uma ponta caida)
const bow = (dy, from = 'top') => (g) => {
  const y = g.clamp((from === 'top' ? g.top : g.knee) + dy);
  g.px(g.edge(y, 1), y, 'B'); g.px(g.edge(y, 1), y - 1, 'm'); g.px(g.edge(y, 2), y + 1, 'y');
};

const buckle = (dy, from = 'top', where = 'mid') => (g) => {
  if (g.up) return;
  const y = g.clamp((from === 'top' ? g.top : from === 'knee' ? g.knee : g.lo) + dy);
  const x = where === 'mid' ? g.mid(y) : g.edge(y);
  // fivela de 2px (1px sumia na tira escura): moldura clara + pino
  g.px(x, y, 'C');
  if (where === 'mid') g.px(x + 1, y, 'n');
  else { g.px(x - g.out, y, 'n'); g.px(g.edge(y, 1), y, 'x'); }
};

// Faixas enroladas: listras diagonais (a) com vinco (x) a cada 3px
const wraps = (y0rel, y1rel = null) => (g) => {
  const y0 = g.clamp(g.top + y0rel), y1 = y1rel == null ? g.lo : g.clamp(g.knee + y1rel);
  for (let y = y0; y <= y1; y++) {
    const [a, b] = g.span(y);
    for (let x = a; x <= b; x++) g.px(x, y, (x + y) % 3 === 0 ? 'x' : 'a');
  }
};

// Meias por cima da calca, do joelho para baixo
const stock = (kind) => (g) => {
  const y0 = g.knee;
  for (let y = y0; y <= g.lo; y++) {
    if (kind === 'listrada') g.row(y, (y - y0) % 2 ? 'a' : 'b');
    else if (kind === 'losango') g.row(y, (y - y0) % 2 ? 'bm' : 'mb');
    else g.row(y, 'b');
  }
  if (kind === 'lisa') g.row(y0, 'm', 0, 0);
  if (kind === 'losango') g.row(y0, 'a');
  if (kind === 'polaina') {
    // la grossa: borda franzida que transborda dos dois lados e fiapos alternados
    g.row(y0, 'bm', 1, 1);
    for (let y = y0 + 1; y <= g.lo; y++) if ((y - y0) % 2 === 0) g.px(g.edge(y, 1), y, 'b');
  }
};

// Cordoes cruzados subindo a perna (xadrez em X)
const laces = () => (g) => {
  for (let y = g.top + 1; y <= g.lo; y++) {
    const [a, b] = g.span(y), k = (y - g.top) % (b - a + 1);
    g.px(a + k, y, 'm'); g.px(b - k, y, 'm');
  }
};

const chainLoop = (dy) => (g) => {
  const y = g.clamp(g.top + dy);
  g.row(y, 'nz');
  g.px(g.edge(y, 1), y + 1, 'n'); g.px(g.edge(y, 1), y + 2, 'z'); g.px(g.edge(y, 0), y + 2, 'n');
};

const tails = (dy) => (g) => {
  const y = g.clamp(g.knee + dy);
  g.row(y, 'b');
  g.px(g.edge(y, 1), y, 'm'); g.px(g.edge(y, 1), y + 1, 'b'); g.px(g.edge(y, 2), y + 2, 'y'); g.px(g.edge(y, 1), y + 2, 'y');
};

// Adaga na bainha presa na coxa, do lado de fora (de perfil fica sobre a coxa)
const dagger = () => (g) => {
  const y = g.top;
  const x = g.side ? g.mid(y + 2) : g.edge(y, 1);
  g.row(y + 1, 'a'); g.row(Math.min(y + 3, g.lo), 'x');
  g.px(x, y - 1, 'C');
  g.px(x, y, 'a');
  g.px(x, y + 1, 'n'); g.px(x - g.out, y + 1, 'n');
  g.px(x, y + 1, 'C');
  for (let k = 2; k <= 4; k++) g.px(x, y + k, k === 4 ? 'y' : 'b');
  g.px(x, y + 5, 'n');
};

const pouch = (tall = 3) => (g) => {
  const y = g.top + 1;
  g.row(y, 'a');
  const xo = g.side ? g.mid(y) + 1 : g.edge(y, 1);
  const xs = [xo, xo - g.out, xo - 2 * g.out];
  if (g.up) { for (let k = 0; k < tall; k++) g.px(xo, y + k, 'b'); return; }
  for (let k = 0; k < tall; k++) for (const x of xs) g.px(x, y + k, k === 0 ? 'x' : 'b');
  g.px(xs[1], y + 1, 'C');
};

const vials = () => (g) => {
  // a linha acima do quadril fica sob a tunica (tronco vem depois), entao a rolha
  // fica na propria linha do quadril e a tira passa logo abaixo do vidro
  const y = g.top;
  g.row(g.clamp(y + 3), 'a');
  if (g.up) return;
  const [a, b] = g.span(y);
  const cols = ['r', 't', 'g'];
  let k = 0;
  for (let x = a; x <= b; x += 2) { g.px(x, y, 'n'); g.px(x, y + 1, cols[k % 3]); g.px(x, g.clamp(y + 2), cols[k % 3]); k++; }
};

const shinKnife = () => (g) => {
  const x = g.side ? g.mid(g.knee + 1) : g.edge(g.knee, 1);
  g.px(x, g.knee - 1, 'C'); g.px(x, g.knee, 'a');
  for (let y = g.knee + 1; y <= g.lo; y++) g.px(x, y, 'b');
  g.px(x, g.lo + 1, 'n');
  g.row(g.clamp(g.knee + 1), 'a');
};

const scroll = () => (g) => {
  const y = g.top;
  const x = g.side ? g.mid(y + 1) : g.edge(y, 1);
  g.px(x, y, 'n'); g.px(x - g.out, y, 'n');
  for (let k = 1; k <= 3; k++) { g.px(x, y + k, 'b'); g.px(x - g.out, y + k, 'm'); }
  g.px(x, y + 4, 'z'); g.px(x - g.out, y + 4, 'n');
  g.row(y + 2, 'a');
};

const patch = () => (g) => {
  if (g.up) return;
  const y = g.knee, m = g.mid(y);
  // remendo 3x2 com pontos brancos nos cantos (2x2 sumia na perna de 4px)
  for (let x = m - 1; x <= m + 1; x++) { g.px(x, y - 1, 'b'); g.px(x, y, 'b'); }
  g.px(m - 1, y - 1, 'w'); g.px(m + 1, y, 'w');
};

const torn = () => (g) => {
  if (g.up) return;
  const y = g.knee, m = g.mid(y);
  // buraco com pele a mostra e fiapos claros na borda
  g.px(m - 1, y, 'k'); g.px(m, y, 'k'); g.px(m, y - 1, 'k'); g.px(m - 1, y - 1, 'K');
  g.px(m + 1, y, 'W'); g.px(m - 1, y + 1, 'w'); g.px(m + 1, y - 1, 'w');
};

const bells = () => (g) => {
  const y = g.lo;
  g.row(y, 'a');
  g.px(g.edge(y, 1), y, 'o'); g.px(g.edge(y, 1), y + 1, 'O');
  if (!g.up) g.px(g.mid(y), y, 'o'); // guizo da frente
};

const shackle = () => (g) => {
  g.row(g.lo - 1, 'c', 1, 1); g.row(g.lo, 'z', 1, 1);
  g.px(g.edge(g.lo, 1), g.lo + 1, 'n'); g.px(g.edge(g.lo, 2), g.lo + 2, 'z');
};

const shells = () => (g) => {
  g.row(g.lo, 'a');
  const [a, b] = g.span(g.lo);
  for (let x = a; x <= b; x += 2) g.px(x, g.lo, 'w');
  g.px(g.edge(g.lo, 1), g.lo, 'W');
};

// ---------- montagem ----------
const ch = (a, b, c) => [{ label: 'Material', def: a }, { label: 'Detalhe', def: b }, { label: 'Metal', def: c }];
function mk(id, name, sub, channels, who, ...parts) {
  return {
    id, name, sub, channels,
    draw(L, P) {
      for (const l of pick(P, who)) {
        const g = pen(L, P, l);
        for (const p of parts) p(g);
        g.flush();
      }
    }
  };
}

const J = 'Joelheiras', F = 'Ligas e faixas', C = 'Coldres e bolsas', T = 'Tornozelos';

export const KNEES = [
  // ---- Joelheiras e caneleiras ----
  mk('joelheiras-couro', 'Joelheiras de couro', J, ch('camurca', 'branco-gasto', 'bronze'), 'both', pad('couro')),
  mk('joelheiras-metal', 'Joelheiras de metal', J, ch('couro', 'couro-escuro', 'aco'), 'both', pad('metal')),
  mk('joelheiras-espinhos', 'Joelheiras com espinhos', J, ch('couro', 'couro-escuro', 'ferro'), 'both', pad('espinhos')),
  mk('joelheira-unica', 'Joelheira única com fivelas', J, ch('ocre', 'carvao', 'aco'), 'L', pad('unica')),
  mk('joelheiras-redondas', 'Joelheiras redondas com gema', J, ch('couro', 'carvao', 'aco'), 'both', pad('redonda')),
  mk('joelheiras-osso', 'Joelheiras de osso', J, ch('couro', 'cinza-claro', 'osso'), 'both', pad('osso')),
  mk('joelheiras-acolchoadas', 'Joelheiras acolchoadas', J, ch('vinho', 'carmesim', 'ouro'), 'both', pad('acolchoada')),
  mk('remendo-joelho', 'Remendo no joelho', J, ch('couro', 'azul-aco', 'ferro'), 'L', patch()),
  mk('joelho-rasgado', 'Joelho rasgado', J, ch('couro', 'couro', 'ferro'), 'R', torn()),
  mk('caneleiras-metal', 'Caneleiras de metal', J, ch('couro', 'couro-escuro', 'aco'), 'both', shin('metal')),
  mk('caneleiras-couro', 'Caneleiras de couro amarradas', J, ch('camurca', 'couro-escuro', 'bronze'), 'both', shin('couro')),
  mk('grevas-joelheira', 'Grevas com joelheira', J, ch('couro', 'couro-escuro', 'ferro'), 'both', shin('metal', true)),

  // ---- Ligas e faixas ----
  mk('liga-renda', 'Liga de renda', F, ch('couro', 'branco-gasto', 'ouro'), 'L', band(1, 'm'), band(2, 'W.'), (g) => { if (!g.up) g.px(g.mid(g.top + 1), g.top + 1, 'r'); }),
  mk('ligas-laco', 'Ligas com laço', F, ch('couro', 'rosa-seco', 'ouro'), 'both', band(1, 'b'), bow(1)),
  mk('correia-coxa', 'Correia na coxa', F, ch('carvao', 'couro', 'aco'), 'L', band(1, 'a'), buckle(1, 'top', 'edge')),
  mk('correias-duplas', 'Correias duplas', F, ch('carvao', 'couro', 'aco'), 'both', band(0, 'a'), band(2, 'a'), buckle(0), buckle(2)),
  mk('faixas-pernas', 'Faixas nas pernas', F, ch('linho', 'osso', 'ferro'), 'both', wraps(0)),
  mk('faixa-joelho', 'Faixa no joelho', F, ch('branco-gasto', 'sangue', 'ferro'), 'R', wraps(1, 0), (g) => { g.px(g.edge(g.knee, 1), g.knee, 'x'); g.px(g.edge(g.knee, 1), g.knee + 1, 'a'); }),
  mk('correntes-pernas', 'Correntes nas pernas', F, ch('couro', 'couro', 'ferro'), 'both', chainLoop(1)),
  mk('fitas-joelho', 'Fitas esvoaçantes', F, ch('couro', 'carmesim', 'ouro'), 'L', tails(0)),
  mk('meias-joelho', 'Meias até o joelho', F, ch('couro', 'branco-gasto', 'ferro'), 'both', stock('lisa')),
  mk('meias-listradas', 'Meias listradas altas', F, ch('vinho', 'branco-gasto', 'ferro'), 'both', stock('listrada')),
  mk('polainas-la', 'Polainas de lã', F, ch('couro', 'mostarda', 'ferro'), 'both', stock('polaina')),
  mk('meias-losangos', 'Meias de losangos', F, ch('floresta', 'ocre', 'ferro'), 'both', stock('losango')),
  mk('cordoes-cruzados', 'Cordões cruzados', F, ch('couro', 'ocre', 'bronze'), 'both', laces()),

  // ---- Coldres e bolsas ----
  mk('coldre-adaga', 'Coldre de adaga na coxa', C, ch('couro-escuro', 'couro', 'aco'), 'L', dagger()),
  mk('duas-adagas-coxas', 'Adagas nas duas coxas', C, ch('couro-escuro', 'carvao', 'prata'), 'both', dagger()),
  mk('bolsa-coxa', 'Bolsa de coxa', C, ch('couro-escuro', 'linho', 'bronze'), 'L', pouch()),
  mk('bolsas-coxas', 'Bolsas nas duas coxas', C, ch('carvao', 'oliva', 'aco'), 'both', pouch(2)),
  mk('porta-frascos', 'Porta-frascos na coxa', C, ch('carvao', 'couro', 'bronze'), 'R', vials()),
  mk('faca-canela', 'Faca na canela', C, ch('couro-escuro', 'couro', 'aco'), 'L', shinKnife()),
  mk('porta-pergaminho', 'Porta-pergaminho na coxa', C, ch('couro', 'ocre', 'bronze'), 'R', scroll()),

  // ---- Tornozelos ----
  mk('tornozeleira-ouro', 'Tornozeleira de ouro', T, ch('couro', 'couro', 'ouro'), 'L', band(0, 'Cc', 0, 0, 'lo')),
  mk('tornozeleiras-contas', 'Tornozeleiras de contas', T, ch('couro', 'jade', 'ouro'), 'both', band(0, 'mn', 0, 0, 'lo')),
  mk('guizos-tornozelo', 'Guizos no tornozelo', T, ch('carmesim', 'couro', 'ouro'), 'L', bells()),
  mk('grilhoes-tornozelos', 'Grilhões nos tornozelos', T, ch('couro', 'couro', 'ferro'), 'both', shackle()),
  mk('tornozeleira-conchas', 'Tornozeleira de conchas', T, ch('couro', 'couro', 'osso'), 'R', shells()),
  mk('tornozeleiras-fivela', 'Tornozeleiras de couro com fivela', T, ch('carvao', 'couro', 'aco'), 'both', band(0, 'a', 1, 0, 'lo'), buckle(0, 'lo', 'mid'))
];
