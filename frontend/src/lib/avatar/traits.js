// Tracos de raca (orelhas, chifres, cauda, bico/presas/focinho, marcas, crista,
// aureola e pernas). Qualquer raca pode usar qualquer traco; a raca so escolhe
// os padroes (appearance.js). Cores: 'a' = cor do chifre/bico/barbatana,
// 'b' = cor das marcas, 'c' = pelagem (centauro/satiro), 'skin', 'hair'.

export const TRAIT_GROUPS = [
  { id: 'ears', name: 'Orelhas', options: [['humana', 'Humanas'], ['pontuda', 'Pontudas'], ['longa', 'Longas'], ['curta-pontuda', 'Curtas e pontudas'], ['barbatana', 'Barbatanas'], ['bovina', 'Bovinas'], ['caprina', 'Caprinas'], ['nenhuma', 'Sem orelhas']] },
  { id: 'horns', name: 'Chifres', options: [['nenhum', 'Sem chifres'], ['curvos', 'Curvos'], ['retos', 'Retos'], ['carneiro', 'De carneiro'], ['bovinos', 'Bovinos'], ['galhada', 'Galhada'], ['pequenos', 'Pequenos'], ['coroa-ossea', 'Coroa óssea']] },
  { id: 'tail', name: 'Cauda', options: [['nenhuma', 'Sem cauda'], ['abissal', 'Abissal'], ['bovina', 'Bovina'], ['caprina', 'Caprina'], ['penas', 'De penas'], ['equina', 'Equina'], ['escamosa', 'Escamosa']] },
  { id: 'face', name: 'Rosto', options: [['nenhum', 'Comum'], ['bico', 'Bico'], ['presas', 'Presas'], ['focinho', 'Focinho'], ['guelras', 'Guelras']] },
  { id: 'marks', name: 'Marcas', options: [['nenhuma', 'Sem marcas'], ['douradas', 'Marcas douradas'], ['sardas-luz', 'Sardas de luz'], ['pedra', 'Pele de pedra'], ['brasas', 'Veios de brasa'], ['escamas', 'Escamas'], ['sombras', 'Sombras nos olhos'], ['tribais', 'Pintura tribal'], ['runas', 'Runas']] },
  { id: 'crest', name: 'Crista', options: [['nenhuma', 'Sem crista'], ['penas', 'Penas'], ['barbatana', 'Barbatana']] },
  { id: 'halo', name: 'Aura', options: [['nenhuma', 'Sem aura'], ['aureola', 'Auréola'], ['chamas', 'Chamas']] },
  { id: 'legs', name: 'Pernas', options: [['humanas', 'Humanas'], ['cascos', 'Cascos (sátiro)'], ['garras', 'Garras (kenku)'], ['cavalo', 'Corpo de cavalo (centauro)']] }
].map((g) => ({ ...g, options: g.options.map(([id, name]) => ({ id, name })) }));

const LAYER_OF = { earsTrait: 'ears', horns: 'horns', tail: 'tail', faceTrait: 'face', marks: 'marks', crest: 'crest', halo: 'halo', legsTrait: 'legs' };

export function traitHides() { return []; }

// pontos [dx, dy, tom] relativos a uma ancora; na frente espelha para o outro lado.
function pts(L, ox, oy, list, c, mirror = 0) {
  for (const [dx, dy, s = 2] of list) L.px(ox + (mirror ? -dx : dx), oy + dy, c, s);
}

const EARS_FRONT = {
  pontuda: [[0, 0, 3], [0, 1, 1], [-1, 0, 2], [-1, -1, 2], [-2, -2, 3]],
  longa: [[0, 0, 3], [0, 1, 1], [-1, 0, 2], [-1, -1, 3], [-2, -1, 2], [-2, -2, 3], [-3, -2, 2], [-3, -3, 3], [-4, -4, 3]],
  'curta-pontuda': [[0, 0, 3], [0, 1, 1], [-1, 0, 2], [-1, -1, 3]],
  bovina: [[0, 0, 2], [-1, 0, 3], [-2, 0, 3], [-3, 1, 2], [-1, 1, 1], [-2, 1, 1]],
  caprina: [[0, 0, 2], [-1, 0, 3], [-1, 1, 2], [-2, 1, 3], [-2, 2, 1], [-3, 2, 2]]
};
const EARS_SIDE = {
  pontuda: [[0, 0, 3], [1, 0, 2], [0, 1, 1], [1, 1, 1], [2, -1, 2], [3, -2, 3]],
  longa: [[0, 0, 3], [1, 0, 2], [0, 1, 1], [1, 1, 1], [2, -1, 3], [3, -1, 2], [3, -2, 3], [4, -2, 2], [4, -3, 3], [5, -4, 3]],
  'curta-pontuda': [[0, 0, 3], [1, 0, 2], [0, 1, 1], [1, 1, 1], [2, -1, 3]],
  bovina: [[0, 0, 2], [1, 0, 3], [2, 0, 3], [3, 1, 2], [1, 1, 1], [2, 1, 1]],
  caprina: [[0, 0, 2], [1, 0, 3], [1, 1, 2], [2, 1, 3], [2, 2, 1], [3, 2, 2]]
};

function drawEarsTrait(L, P, kind) {
  if (kind === 'humana' || kind === 'nenhuma') return;
  for (const e of P.ears) {
    const m = P.view !== 'side' && e.side === 'l' ? 0 : P.view === 'side' ? 0 : 1;
    if (kind === 'barbatana') {
      const fin = P.view === 'side'
        ? [[0, -1, 2], [0, 0, 3], [0, 1, 1], [1, -2, 3], [1, -1, 1], [1, 0, 3], [2, -2, 2], [2, -1, 3], [3, -3, 3], [3, -2, 1]]
        : [[0, -1, 3], [0, 0, 2], [0, 1, 1], [-1, -2, 3], [-1, -1, 1], [-1, 0, 3], [-2, -2, 2], [-2, -1, 3], [-2, 0, 1]];
      pts(L, e.x, e.y, fin, 'a', m);
      continue;
    }
    const list = (P.view === 'side' ? EARS_SIDE : EARS_FRONT)[kind];
    if (list) pts(L, e.x, e.y, list, 'skin', m);
    if (kind === 'bovina') L.px(e.x + (P.view === 'side' ? 1 : m ? 1 : -1), e.y, '#c98080', 2);
  }
}

// chifres: lista para o chifre ESQUERDO da tela (relativa a caixa da cabeca); o direito espelha.
const HORNS_FRONT = {
  curvos: [[3, 1, 1], [2, 1, 2], [2, 0, 1], [1, 0, 3], [1, -1, 2], [2, -1, 1], [1, -2, 3], [2, -3, 3], [3, -4, 4]],
  retos: [[3, 1, 1], [2, 1, 2], [2, 0, 3], [3, 0, 1], [2, -1, 3], [3, -1, 1], [3, -2, 3], [3, -3, 4]],
  carneiro: [[3, 1, 2], [2, 1, 3], [1, 1, 3], [0, 2, 3], [-1, 3, 2], [-1, 4, 2], [-1, 5, 1], [0, 6, 1], [1, 6, 2], [1, 5, 3], [0, 4, 1], [0, 3, 2]],
  bovinos: [[3, 2, 1], [2, 1, 2], [1, 1, 3], [0, 1, 2], [-1, 1, 3], [-2, 0, 2], [-3, -1, 3], [-3, -2, 3], [-3, -3, 4], [2, 2, 1], [1, 2, 1], [0, 2, 1], [-1, 2, 1], [-2, 1, 1]],
  galhada: [[3, 1, 1], [3, 0, 2], [3, -1, 3], [2, -2, 2], [1, -3, 3], [0, -4, 3], [3, -2, 2], [4, -3, 3], [4, -4, 4], [1, -2, 1], [0, -2, 2], [-1, -3, 3]],
  pequenos: [[3, 1, 1], [3, 0, 3], [2, 1, 2]],
  'coroa-ossea': [[2, 1, 2], [2, 0, 3], [4, 0, 2], [4, -1, 3], [5, 0, 2], [5, -1, 2], [5, -2, 4]]
};
const HORNS_SIDE = {
  curvos: [[5, 1, 1], [6, 1, 2], [6, 0, 3], [7, 0, 1], [7, -1, 2], [8, -1, 3], [9, -2, 3], [10, -2, 4]],
  retos: [[4, 1, 1], [5, 1, 2], [4, 0, 3], [5, 0, 1], [4, -1, 3], [5, -2, 3], [5, -3, 4]],
  carneiro: [[6, 1, 2], [7, 1, 3], [8, 1, 3], [9, 2, 3], [10, 3, 2], [10, 4, 2], [10, 5, 1], [9, 6, 1], [8, 6, 2], [8, 5, 3], [9, 4, 1], [9, 3, 2], [8, 4, 2]],
  bovinos: [[5, 1, 1], [5, 0, 2], [4, 0, 3], [3, -1, 3], [2, -2, 3], [2, -3, 4], [6, 0, 2], [7, 0, 1]],
  galhada: [[6, 1, 1], [7, 0, 2], [8, -1, 3], [9, -2, 2], [10, -3, 3], [11, -4, 4], [8, -2, 2], [8, -3, 3], [7, -4, 4], [10, -2, 2], [11, -2, 3]],
  pequenos: [[5, 1, 1], [5, 0, 3], [6, 1, 2]],
  'coroa-ossea': [[3, 1, 2], [3, 0, 3], [5, 0, 2], [5, -1, 3], [7, 0, 2], [7, -1, 3], [9, 0, 2], [9, -1, 4]]
};

function drawHorns(L, P, kind) {
  if (!kind || kind === 'nenhum') return;
  const { x, y } = P.head;
  if (P.view === 'side') { pts(L, x, y, HORNS_SIDE[kind] || [], 'a'); return; }
  const list = HORNS_FRONT[kind] || [];
  pts(L, x, y, list, 'a');
  pts(L, x + 11, y, list.map(([dx, dy, s]) => [dx, dy, s === 1 ? 1 : Math.max(1, s - 1)]), 'a', 1);
}

function drawTail(L, P, kind, traits) {
  if (!kind || kind === 'nenhuma') return;
  const h = P.hip;
  const sway = P.walk ? [0, 1, 0, -1][P.f] : P.f;
  let list, c = 'skin';
  if (P.view === 'side') {
    const S = {
      abissal: [[14, h, 1], [15, h + 1, 2], [16, h + 1, 2], [17, h, 2], [18, h - 1 + sway, 2], [19, h - 2 + sway, 3], [18, h - 2 + sway, 2], [19, h - 3 + sway, 3], [20, h - 2 + sway, 1]],
      bovina: [[14, h, 1], [15, h + 1, 2], [16, h + 2, 2], [16, h + 3, 2], [17, h + 4 + sway, 1], [16, h + 4 + sway, 1]],
      caprina: [[14, h - 1, 2], [15, h - 2, 3], [15, h - 1, 1]],
      penas: [[14, h - 1, 2], [15, h - 1, 3], [16, h - 1, 2], [17, h, 3], [15, h, 1], [16, h, 2], [17, h + 1, 1], [18, h + 1, 2]],
      equina: [[19, h - 1, 2], [20, h, 2], [21, h + 1, 3], [21, h + 2, 2], [22, h + 3 + sway, 2], [21, h + 4 + sway, 1], [22, h + 5 + sway, 1]],
      escamosa: [[14, h, 2], [15, h + 1, 3], [16, h + 2, 2], [17, h + 3, 3], [18, h + 3 + sway, 2], [19, h + 3 + sway, 1], [15, h, 1], [16, h + 1, 1]]
    };
    list = S[kind];
  } else if (P.view === 'down') {
    const D = {
      abissal: [[16, h + 1, 1], [17, h + 2, 2], [18, h + 2, 2], [19, h + 1, 2], [20, h + sway, 2], [20, h - 1 + sway, 3], [19, h - 1 + sway, 2], [21, h - 1 + sway, 1], [20, h - 2 + sway, 3]],
      bovina: [[16, h + 2, 1], [17, h + 3, 2], [17, h + 4, 2], [18, h + 5 + sway, 1], [17, h + 5 + sway, 1]],
      caprina: [[16, h + 1, 2], [17, h, 3]],
      penas: [[16, h + 2, 2], [17, h + 3, 2], [18, h + 3, 3], [17, h + 4, 1], [18, h + 4, 2]],
      equina: [[17, h + 1, 2], [18, h + 2, 3], [18, h + 3, 2], [19, h + 4 + sway, 2], [18, h + 5 + sway, 1]],
      escamosa: [[16, h + 2, 2], [17, h + 3, 3], [18, h + 4, 2], [19, h + 4 + sway, 1], [17, h + 2, 1]]
    };
    list = D[kind];
  } else {
    const U = {
      abissal: [[11, h + 1, 2], [11, h + 2, 2], [12, h + 3, 2], [13, h + 4, 2], [14 + sway, h + 4, 3], [15 + sway, h + 3, 3], [14 + sway, h + 3, 2], [15 + sway, h + 5, 1], [16 + sway, h + 4, 2]],
      bovina: [[11, h + 1, 2], [11, h + 2, 2], [11, h + 3, 1], [11, h + 4, 2], [11 + sway, h + 5, 1], [12 + sway, h + 5, 1], [10 + sway, h + 5, 1]],
      caprina: [[11, h, 3], [12, h, 2], [11, h + 1, 2], [12, h + 1, 1]],
      penas: [[10, h, 2], [11, h, 3], [12, h, 3], [13, h, 2], [9, h + 1, 2], [10, h + 1, 3], [11, h + 1, 2], [12, h + 1, 3], [13, h + 1, 2], [14, h + 1, 1], [10, h + 2, 1], [12, h + 2, 1]],
      equina: [[11, h, 2], [12, h, 2], [11, h + 1, 3], [12, h + 1, 2], [11, h + 2, 2], [12, h + 2, 1], [11 + sway, h + 3, 2], [12 + sway, h + 4, 1], [11 + sway, h + 4, 1]],
      escamosa: [[11, h + 1, 3], [12, h + 1, 2], [11, h + 2, 2], [12, h + 3, 3], [13, h + 4, 2], [14 + sway, h + 4, 1]]
    };
    list = U[kind];
  }
  if (kind === 'equina' || kind === 'bovina') c = kind === 'equina' ? 'hair' : 'skin';
  if (kind === 'caprina') c = traits.legs === 'cascos' ? 'c' : 'skin';
  pts(L, 0, 0, list || [], c);
  if (kind === 'bovina') { const last = list[list.length - 1]; L.px(last[0], last[1], 'hair', 1); L.px(list[list.length - 2][0], list[list.length - 2][1], 'hair', 2); }
}

function drawFaceTrait(L, P, kind) {
  if (!kind || kind === 'nenhum' || P.view === 'up') return;
  const { x, y } = P.head;
  const side = P.view === 'side';
  if (kind === 'bico') {
    if (side) pts(L, x, y, [[0, 6, 3], [-1, 6, 3], [-2, 7, 2], [-1, 7, 2], [0, 7, 1], [1, 7, 1], [-1, 8, 1], [0, 8, 0]], 'a');
    else pts(L, x, y, [[5, 7, 3], [6, 7, 2], [5, 8, 2], [6, 8, 1], [5, 9, 1], [6, 9, 0]], 'a');
  } else if (kind === 'presas') {
    if (side) pts(L, x, y, [[1, 8, 4], [1, 9, 3]], '#e8dcc0');
    else pts(L, x, y, [[4, 8, 4], [4, 9, 3], [7, 8, 4], [7, 9, 3]], '#e8dcc0');
  } else if (kind === 'focinho') {
    if (side) {
      pts(L, x, y, [[-1, 6, 3], [-2, 7, 3], [-2, 8, 2], [-1, 9, 1], [0, 6, 3], [0, 7, 2], [0, 8, 2], [0, 9, 1], [-1, 7, 3], [-1, 8, 2], [1, 7, 2], [1, 8, 2], [1, 9, 1], [2, 9, 1]], 'skin');
      L.px(x - 2, y + 7, 'skin', 0);
      L.px(x - 1, y + 9, 'skin', 0);
    } else {
      for (let dy = 7; dy <= 10; dy++) for (let dx = 3; dx <= 8; dx++) if (!((dy === 10) && (dx === 3 || dx === 8))) L.px(x + dx, y + dy, 'skin', dy === 7 ? 4 : dy === 10 ? 2 : 3);
      L.px(x + 4, y + 8, 'skin', 0); L.px(x + 7, y + 8, 'skin', 0);
      L.hline(x + 5, x + 6, y + 10, 'skin', 1);
      L.px(x + 5, y + 9, '#e0d4b8', 3); L.px(x + 6, y + 9, '#e0d4b8', 2); // argola no nariz
    }
  } else if (kind === 'guelras') {
    if (side) pts(L, x, y, [[7, 8, 0], [8, 9, 0], [9, 8, 0]], 'skin');
    else pts(L, x, y, [[1, 7, 0], [1, 9, 0], [10, 7, 0], [10, 9, 0]], 'skin');
  }
}

function armLine(L, P, fn) {
  for (const a of P.arms) L.withTag(a.tag, () => fn(a));
}

function drawMarks(L, P, kind) {
  if (!kind || kind === 'nenhuma') return;
  const { x, y } = P.head;
  const side = P.view === 'side';
  const up = P.view === 'up';
  const t = P.torso;
  const face = (front, profile) => { if (!up) pts(L, x, y, side ? profile : front, kind === 'pedra' || kind === 'sombras' ? (kind === 'pedra' ? 'skin' : 'b') : 'b'); };
  switch (kind) {
    case 'douradas':
      face([[2, 8, 4], [2, 9, 3], [9, 8, 4], [9, 9, 3], [5, 4, 4], [6, 4, 4]], [[3, 8, 4], [3, 9, 3]]);
      armLine(L, P, (a) => { L.px(a.rows.get(a.top + 2)[0], a.top + 2, 'b', 4); L.px(a.rows.get(a.top + 4)[0], a.top + 4, 'b', 3); });
      break;
    case 'sardas-luz':
      face([[2, 8, 4], [3, 9, 4], [8, 9, 4], [9, 8, 4], [1, 7, 3], [10, 7, 3]], [[3, 8, 4], [4, 9, 4], [2, 9, 3]]);
      armLine(L, P, (a) => L.px(a.rows.get(a.top + 1)[0], a.top + 1, 'b', 4));
      break;
    case 'pedra':
      face([[2, 8, 0], [3, 9, 0], [9, 7, 0], [8, 8, 0], [1, 5, 1]], [[4, 8, 0], [5, 9, 0], [8, 5, 1]]);
      armLine(L, P, (a) => { const r = a.rows.get(a.top + 2); L.px(r[0], a.top + 2, 'skin', 0); L.px(r[1], a.top + 3, 'skin', 0); });
      L.px(t.x0 + 2, t.top + 2, 'skin', 0); L.px(t.x0 + 3, t.top + 3, 'skin', 0); L.px(t.x1 - 2, t.top + 4, 'skin', 0);
      break;
    case 'brasas':
      face([[2, 8, 4], [2, 9, 3], [9, 9, 3]], [[3, 9, 4]]);
      armLine(L, P, (a) => { const r = a.rows.get(a.top + 3); L.px(r[0], a.top + 3, 'b', 4); L.px(r[1], a.top + 4, 'b', 3); L.px(r[0], a.top + 5, 'b', 4); });
      L.px(t.x0 + 2, t.top + 3, 'b', 4); L.px(t.x0 + 3, t.top + 4, 'b', 3); L.px(t.x1 - 2, t.top + 2, 'b', 4);
      break;
    case 'escamas':
      face([[1, 7, 3], [2, 8, 2], [1, 9, 3], [10, 7, 3], [9, 8, 2], [10, 9, 3]], [[7, 8, 3], [8, 9, 2], [6, 9, 3]]);
      armLine(L, P, (a) => { for (let k = 1; k < 6; k += 2) { const r = a.rows.get(a.top + k); if (r) L.px(r[(k >> 1) % 2], a.top + k, 'b', 3); } });
      break;
    case 'sombras':
      face([[2, 8, 1], [3, 8, 1], [8, 8, 1], [9, 8, 1], [1, 6, 1], [10, 6, 1]], [[2, 8, 1], [3, 8, 1], [4, 7, 1]]);
      break;
    case 'tribais':
      face([[1, 7, 2], [2, 8, 2], [2, 7, 3], [9, 7, 3], [10, 7, 2], [9, 8, 2], [5, 10, 2], [6, 10, 2]], [[4, 7, 2], [5, 8, 2], [4, 8, 3]]);
      armLine(L, P, (a) => { const r = a.rows.get(a.top + 1); L.hline(r[0], r[1], a.top + 1, 'b', 2); });
      break;
    case 'runas':
      face([[5, 4, 4], [6, 4, 3], [5, 3, 3], [2, 9, 4], [9, 9, 4]], [[3, 9, 4], [3, 4, 4]]);
      armLine(L, P, (a) => { const r = a.rows.get(a.top + 3); L.px(r[0], a.top + 3, 'b', 4); L.px(r[1], a.top + 2, 'b', 4); L.px(r[1], a.top + 4, 'b', 4); });
      break;
    default:
  }
}

function drawCrest(L, P, kind) {
  if (!kind || kind === 'nenhuma') return;
  const { x, y } = P.head;
  if (kind === 'penas') {
    const list = P.view === 'side'
      ? [[6, -1, 3], [7, -2, 3], [8, -2, 2], [9, -1, 2], [10, -1, 3], [11, 0, 2], [12, 1, 2], [13, 2, 1], [8, -1, 1], [9, 0, 1], [11, 1, 1], [12, 2, 1]]
      : [[5, -2, 3], [6, -2, 2], [4, -1, 3], [5, -1, 2], [6, -1, 2], [7, -1, 1], [3, 0, 2], [8, 0, 1], [5, -3, 4]];
    pts(L, x, y, list, 'skin');
  } else if (kind === 'barbatana') {
    const list = P.view === 'side'
      ? [[4, -1, 3], [5, -2, 3], [6, -2, 1], [7, -2, 3], [8, -2, 1], [9, -1, 3], [10, -1, 1], [11, 0, 2], [6, -1, 2], [8, -1, 2], [10, 0, 2]]
      : [[5, -2, 3], [6, -2, 1], [5, -1, 2], [6, -1, 1], [5, -3, 4], [6, 0, 1], [5, 0, 2]];
    pts(L, x, y, list, 'a');
  }
}

function drawHalo(L, P, kind) {
  if (!kind || kind === 'nenhuma') return;
  const { x, y } = P.head;
  const fy = y - 4 + (P.walk ? 0 : P.f);
  if (kind === 'aureola') {
    L.hline(x + 3, x + 8, fy, '#f2d27a', 4);
    L.px(x + 2, fy + 1, '#f2d27a', 3); L.px(x + 9, fy + 1, '#f2d27a', 2);
    L.hline(x + 3, x + 8, fy + 2, '#f2d27a', 2);
  } else if (kind === 'chamas') {
    const f = P.f % 2;
    for (const [dx, h] of [[2, 2 + f], [5, 3 - f], [8, 2 + f]]) {
      L.px(x + dx, fy + 3, '#e0783a', 2);
      for (let k = 1; k < h; k++) L.px(x + dx, fy + 3 - k, '#f0b040', 3 + (k === h - 1 ? 1 : 0));
    }
  }
}

function drawLegsTrait(L, P, kind) {
  if (!kind || kind === 'humanas') return;
  if (kind === 'cascos') {
    for (const l of P.legs) {
      L.fill(l, 'c', { y0: P.hip + 2, y1: l.foot.y - 1 });
      L.fill(l.footPart, '#3a2a24', { y0: l.foot.y });
      L.fill(l.footPart, 'c', { y0: l.foot.y - 1, y1: l.foot.y - 1, ds: 1 });
    }
  } else if (kind === 'garras') {
    for (const l of P.legs) {
      L.fill(l, 'a', { y0: l.foot.y - 3, y1: l.foot.y - 1, ds: -1 });
      const { x, y, w } = l.foot;
      if (P.view === 'side') { L.hline(x - 1, x + w - 2, y + 1, 'a', 2); L.px(x - 1, y + 1, 'a', 3); L.px(x + w - 1, y + 1, 'a', 1); }
      else { L.px(x, y + 1, 'a', 3); L.px(x + (w >> 1), y + 1, 'a', 2); L.px(x + w - 1, y + 1, 'a', 1); L.px(x + 1, y, 'a', 2); }
    }
  } else if (kind === 'cavalo') {
    drawHorse(L, P);
  }
}

// Centauro: corpo de cavalo no lugar das pernas. Usa as fases das pernas do
// esqueleto para andar no mesmo ritmo que os outros.
function drawHorse(L, P) {
  const h = P.hip;
  const c = 'c';
  if (P.view === 'side') {
    for (let y = h - 1; y <= h + 3; y++) {
      const x0 = y === h - 1 ? 10 : 9, x1 = y === h - 1 || y === h + 3 ? 19 : 20;
      for (let x = x0; x <= x1; x++) L.px(x, y, c, y === h - 1 ? 3 : y === h + 3 ? 1 : x === x1 ? 1 : 2);
    }
    const legs = (baseX, back) => {
      for (const l of P.legs) {
        const dx = (l.rows.get(l.bottom)[0] - l.rows.get(l.top)[0]);
        const xs = baseX + (l.front ? 0 : 2) + (back ? -dx : dx);
        for (let y = h + 4; y <= l.foot.y + 1; y++) {
          const t = (y - h - 4) / Math.max(1, l.foot.y + 1 - h - 4);
          const x = Math.round(baseX + (l.front ? 0 : 2) + (back ? -dx : dx) * t);
          L.px(x, y, c, l.front ? 2 : 1); L.px(x + 1, y, c, l.front ? 1 : 0);
        }
        void xs;
        const fy = l.foot.y + 1;
        const fx = Math.round(baseX + (l.front ? 0 : 2) + (back ? -dx : dx));
        L.px(fx, fy, '#3a2a24', 2); L.px(fx + 1, fy, '#3a2a24', 1);
      }
    };
    legs(9, false);
    legs(16, true);
  } else {
    // de frente: peito do cavalo + patas da frente (e as de tras aparecendo no meio)
    const rows = P.view === 'down' ? [[h, 7, 16], [h + 1, 7, 16], [h + 2, 8, 15]] : [[h, 7, 16], [h + 1, 6, 17], [h + 2, 6, 17], [h + 3, 7, 16]];
    for (const [y, a, b] of rows) for (let x = a; x <= b; x++) L.px(x, y, c, x === a ? 3 : x === b ? 1 : 2);
    P.legs.forEach((l, k) => {
      const x = k ? 14 : 8;
      for (let y = rows[rows.length - 1][0] + 1; y <= l.foot.y + 1 && y < 32; y++) { L.px(x, y, c, 2); L.px(x + 1, y, c, 1); }
      L.hline(x, x + 1, Math.min(31, l.foot.y + 1), '#3a2a24', 2);
      const bx = k ? 12 : 10, by = P.view === 'down' ? l.foot.y - 1 : l.foot.y;
      for (let y = rows[rows.length - 1][0] + 1; y <= by; y++) L.px(bx, y, c, 0);
      L.px(bx, by + 1, '#3a2a24', 1);
    });
  }
}

export function drawTrait(layerKey, L, P, ctx) {
  const group = LAYER_OF[layerKey];
  const v = ctx.traits?.[group];
  switch (layerKey) {
    case 'earsTrait': return drawEarsTrait(L, P, v);
    case 'horns': return drawHorns(L, P, v);
    case 'tail': return drawTail(L, P, v, ctx.traits);
    case 'faceTrait': return drawFaceTrait(L, P, v);
    case 'marks': return drawMarks(L, P, v);
    case 'crest': return drawCrest(L, P, v);
    case 'halo': return drawHalo(L, P, v);
    case 'legsTrait': return drawLegsTrait(L, P, v);
    default:
  }
}
