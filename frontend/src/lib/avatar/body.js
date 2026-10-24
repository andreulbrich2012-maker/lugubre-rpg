// Corpo base, rosto (olhos/expressoes) e barbas. O corpo usa so as partes do
// esqueleto, entao todo porte/altura/quadro sai certo sem desenho extra.

export function drawBody(L, P, app = {}) {
  const lower = app.lowerBody || 'humano';
  // braco e perna de tras primeiro (mais escuros pelo relevo de 'back')
  for (const a of P.arms) if (a.back) { L.fill(a, 'skin'); L.fill(a.handPart, 'skin'); }
  if (lower === 'humano') for (const l of P.legs) if (l.back) { L.fill(l, 'skin'); L.fill(l.footPart, 'skin', { ds: -1 }); }
  L.fill(P.torso, 'skin');
  if (lower === 'humano') {
    for (const l of P.legs) if (!l.back) { L.fill(l, 'skin'); L.fill(l.footPart, 'skin', { ds: -1 }); }
    // roupa de baixo simples: ninguem fica sem nada quando tira a calca
    for (const l of P.legs) L.fill(l, '#5e4c3c', { y1: P.hip + 1 });
    L.fill(P.torso, '#5e4c3c', { y0: P.hip - 1 });
  }
  L.fill(P.headPart, 'skin');
  // orelha humana (as orelhas de raca sao tracos)
  if (!app.hideHumanEars) drawEars(L, P, 'skin');
  for (const a of P.arms) if (!a.back) { L.fill(a, 'skin'); L.fill(a.handPart, 'skin'); }
  // separa o braco do tronco com um vinco de sombra no ombro
  if (P.view !== 'side') for (const a of P.arms) {
    const ox = a.side === 'l' ? a.rows.get(a.top)[1] : a.rows.get(a.top)[0];
    L.withTag('arm', () => L.px(ox, a.top, 'skin', 1));
  }
}

export function drawEars(L, P, c = 'skin') {
  for (const e of P.ears) {
    if (P.view === 'side') {
      L.px(e.x, e.y, c, 2); L.px(e.x + 1, e.y, c, 1); L.px(e.x, e.y + 1, c, 1); L.px(e.x + 1, e.y + 1, c, 1);
      L.px(e.x, e.y, c, 3);
    } else {
      L.px(e.x, e.y, c, e.side === 'l' ? 3 : 1);
      L.px(e.x, e.y + 1, c, 1);
    }
  }
}

// ---------- olhos e expressoes ----------
// Olho de frente 2x2: brilho branco em cima a esquerda, iris embaixo, pupila escura.
function eyeFront(L, x, y, kind) {
  switch (kind) {
    case 'fechado':
      L.hline(x, x + 1, y + 1, 'skin', 0); break;
    case 'feliz':
      L.px(x, y + 1, 'skin', 0); L.px(x + 1, y, 'skin', 0); break;
    case 'semicerrado':
      L.px(x, y + 1, 'eye', 1); L.px(x + 1, y + 1, 'eye', 0); L.hline(x, x + 1, y, 'skin', 1); break;
    case 'vazio': // sem pupila, so o brilho
      L.rect(x, y, 2, 2, 'w', 3); L.px(x + 1, y + 1, 'w', 1); break;
    case 'brilho':
      L.px(x, y, 'w', 4); L.px(x + 1, y, 'eye', 4); L.px(x, y + 1, 'eye', 3); L.px(x + 1, y + 1, 'eye', 2); break;
    case 'grande':
      L.px(x, y - 1, 'eye', 0); L.px(x + 1, y - 1, 'eye', 0);
      L.px(x, y, 'w', 4); L.px(x + 1, y, 'eye', 1); L.px(x, y + 1, 'eye', 2); L.px(x + 1, y + 1, 'eye', 0); break;
    case 'pequeno':
      L.px(x + (x < 12 ? 1 : 0), y + 1, 'eye', 0); L.px(x + (x < 12 ? 1 : 0), y, 'eye', 1); break;
    default: {
      // estilo Stardew: pupila escura 1x2 do lado de dentro e o branco do lado de fora
      const inner = x < 12 ? x + 1 : x;
      const outer = x < 12 ? x : x + 1;
      L.px(inner, y, 'eye', 0); L.px(inner, y + 1, 'eye', 2);
      L.px(outer, y, 'w', 4); L.px(outer, y + 1, 'w', 2);
    }
  }
}
function eyeSide(L, x, y, kind) {
  switch (kind) {
    case 'fechado': L.px(x, y + 1, 'skin', 0); L.px(x + 1, y + 1, 'skin', 0); break;
    case 'feliz': L.px(x, y + 1, 'skin', 0); L.px(x + 1, y, 'skin', 0); break;
    case 'semicerrado': L.px(x, y + 1, 'eye', 0); L.px(x, y, 'skin', 1); break;
    case 'vazio': L.px(x, y, 'w', 3); L.px(x, y + 1, 'w', 2); break;
    case 'brilho': L.px(x, y, 'eye', 4); L.px(x, y + 1, 'eye', 2); L.px(x + 1, y, 'w', 4); break;
    case 'grande': L.px(x, y - 1, 'eye', 0); L.px(x, y, 'eye', 1); L.px(x, y + 1, 'eye', 0); L.px(x + 1, y, 'w', 4); break;
    case 'pequeno': L.px(x, y + 1, 'eye', 0); break;
    default: L.px(x, y, 'eye', 1); L.px(x, y + 1, 'eye', 0); L.px(x + 1, y, 'w', 4);
  }
}

// brow: 'reta' | 'brava' | 'triste' | 'alta' | null ; mouth: 'linha'|'sorriso'|'aberta'|'serio'|'triste'|'presas'|null
export const EYE_STYLES = [
  { id: 'atento', name: 'Atento', eye: 'normal', brow: 'reta', mouth: 'linha' },
  { id: 'sorridente', name: 'Sorridente', eye: 'normal', brow: 'alta', mouth: 'sorriso', blush: true },
  { id: 'feliz', name: 'Alegre', eye: 'feliz', brow: 'alta', mouth: 'aberta', blush: true },
  { id: 'bravo', name: 'Bravo', eye: 'normal', brow: 'brava', mouth: 'serio' },
  { id: 'cansado', name: 'Cansado', eye: 'semicerrado', brow: 'reta', mouth: 'linha' },
  { id: 'triste', name: 'Melancólico', eye: 'normal', brow: 'triste', mouth: 'triste' },
  { id: 'sereno', name: 'Sereno', eye: 'fechado', brow: 'reta', mouth: 'sorriso' },
  { id: 'arregalado', name: 'Arregalado', eye: 'grande', brow: 'alta', mouth: 'aberta' },
  { id: 'astuto', name: 'Astuto', eye: 'semicerrado', brow: 'brava', mouth: 'sorriso' },
  { id: 'luminoso', name: 'Luminoso', eye: 'brilho', brow: 'reta', mouth: 'linha' },
  { id: 'sem-pupila', name: 'Sem pupila', eye: 'vazio', brow: 'brava', mouth: 'serio' },
  { id: 'miudo', name: 'Olhos miúdos', eye: 'pequeno', brow: 'reta', mouth: 'linha' }
];
export const EYE_BY_ID = Object.fromEntries(EYE_STYLES.map((e) => [e.id, e]));

export function drawFace(L, P, styleId = 'atento', opts = {}) {
  if (!P.face) return;
  const st = EYE_BY_ID[styleId] || EYE_STYLES[0];
  const { eyes, mouth, brow } = P.face;
  const side = P.view === 'side';
  eyes.forEach((e, k) => {
    if (side) eyeSide(L, e.x, e.y, st.eye); else eyeFront(L, e.x, e.y, st.eye);
    if (opts.noBrows) return;
    const bx = e.x, by = brow;
    const inner = side ? bx : k === 0 ? bx + 1 : bx; // canto de dentro da sobrancelha
    const outer = side ? bx + 1 : k === 0 ? bx : bx + 1;
    if (st.brow === 'reta') { L.px(bx, by, 'hair', 0); L.px(bx + 1, by, 'hair', 0); }
    else if (st.brow === 'brava') { L.px(outer, by - 1, 'hair', 0); L.px(inner, by, 'hair', 0); }
    else if (st.brow === 'triste') { L.px(outer, by, 'hair', 0); L.px(inner, by - 1, 'hair', 0); }
    else if (st.brow === 'alta') { L.px(bx, by - 1, 'hair', 0); L.px(bx + 1, by - 1, 'hair', 0); }
  });
  if (st.blush && !side) { L.px(eyes[0].x - 1, eyes[0].y + 2, '#d9707a', 2); L.px(eyes[1].x + 2, eyes[1].y + 2, '#d9707a', 2); }
  if (opts.noMouth) return;
  const mx = mouth.x, my = mouth.y;
  if (side) {
    if (st.mouth === 'aberta') { L.px(mx, my, 'skin', 0); L.px(mx, my - 0, '#5a1e2a', 1); }
    else if (st.mouth === 'sorriso') { L.px(mx, my, 'skin', 0); L.px(mx + 1, my - 1, 'skin', 1); }
    else L.px(mx, my, 'skin', 0);
    // nariz
    L.px(P.face.nose.x, P.face.nose.y, 'skin', 3);
    return;
  }
  switch (st.mouth) {
    case 'sorriso': L.px(mx - 1, my - 1, 'skin', 0); L.hline(mx, mx + 1, my, 'skin', 0); L.px(mx + 2, my - 1, 'skin', 0); break;
    case 'aberta': L.hline(mx, mx + 1, my, '#5a1e2a', 1); L.hline(mx, mx + 1, my - 1, 'skin', 0); break;
    case 'triste': L.px(mx - 1, my, 'skin', 0); L.hline(mx, mx + 1, my - 1, 'skin', 0); L.px(mx + 2, my, 'skin', 0); break;
    case 'serio': L.hline(mx - 1, mx + 2, my, 'skin', 0); break;
    default: L.hline(mx, mx + 1, my, 'skin', 0);
  }
}

// ---------- barbas ----------
// Desenhadas na metade de baixo do rosto; de costas nao aparecem (so a das orelhas).
function beardFront(L, P, kind) {
  const { x, y } = P.head; // caixa 12x11
  const c = 'beard';
  const chin = (rows) => rows.forEach(([dy, a, b, s]) => L.hline(x + a, x + b, y + dy, c, s ?? 2));
  switch (kind) {
    case 'bigode': chin([[8, 4, 7, 2]]); L.px(x + 3, y + 9, c, 1); L.px(x + 8, y + 9, c, 1); break;
    case 'bigode-longo': chin([[8, 3, 8, 2]]); L.vline(x + 2, y + 8, y + 11, c, 1); L.vline(x + 9, y + 8, y + 11, c, 1); break;
    case 'cavanhaque': chin([[10, 4, 7, 2], [11, 5, 6, 1]]); chin([[8, 4, 7, 3]]); L.erase(x + 5, y + 9); break;
    case 'queixo': chin([[10, 3, 8, 2], [11, 4, 7, 1]]); break;
    case 'costeletas': L.vline(x + 1, y + 5, y + 8, c, 1); L.vline(x + 10, y + 5, y + 8, c, 1); break;
    case 'por-fazer': for (let dx = 2; dx <= 9; dx++) for (let dy = 8; dy <= 10; dy++) if ((dx + dy) % 2 === 0 && L.P.headPart.cells.has((y + dy) * 24 + x + dx)) L.px(x + dx, y + dy, 'skin', 1); break;
    case 'curta':
      chin([[7, 1, 1, 1], [7, 10, 10, 1], [8, 1, 3, 2], [8, 8, 10, 1], [9, 2, 9, 2], [10, 3, 8, 1]]);
      chin([[8, 4, 7, 3]]); L.hline(x + 5, x + 6, y + 9, 'skin', 0); break;
    case 'cheia':
      chin([[6, 1, 1, 1], [6, 10, 10, 1], [7, 1, 2, 2], [7, 9, 10, 1], [8, 1, 10, 2], [9, 1, 10, 2], [10, 2, 9, 1], [11, 3, 8, 1], [12, 4, 7, 0]]);
      chin([[8, 4, 7, 3]]); L.hline(x + 5, x + 6, y + 9, 'skin', 0); break;
    case 'longa':
      chin([[6, 1, 1, 1], [6, 10, 10, 1], [7, 1, 2, 2], [7, 9, 10, 1], [8, 1, 10, 2], [9, 1, 10, 2], [10, 2, 9, 2], [11, 3, 8, 2], [12, 3, 8, 1], [13, 4, 7, 1], [14, 5, 6, 0]]);
      chin([[8, 4, 7, 3]]); L.hline(x + 5, x + 6, y + 9, 'skin', 0); L.px(x + 5, y + 12, c, 3); break;
    case 'trancada':
      chin([[7, 1, 1, 1], [7, 10, 10, 1], [8, 1, 10, 2], [9, 1, 10, 2], [10, 3, 8, 2], [11, 4, 7, 1]]);
      chin([[8, 4, 7, 3]]); L.hline(x + 5, x + 6, y + 9, 'skin', 0);
      for (let k = 0; k < 4; k++) { L.px(x + 5, y + 12 + k, c, k % 2 ? 1 : 3); L.px(x + 6, y + 12 + k, c, k % 2 ? 3 : 1); }
      L.hline(x + 5, x + 6, y + 15, '#d0a440', 3); break;
    case 'dupla':
      chin([[7, 1, 1, 1], [7, 10, 10, 1], [8, 1, 10, 2], [9, 1, 10, 2], [10, 2, 9, 2], [11, 2, 4, 1], [11, 7, 9, 1], [12, 2, 4, 2], [12, 7, 9, 2], [13, 3, 3, 1], [13, 8, 8, 1]]);
      chin([[8, 4, 7, 3]]); L.hline(x + 5, x + 6, y + 9, 'skin', 0); break;
    case 'ana':
      chin([[5, 0, 0, 1], [5, 11, 11, 1], [6, 0, 1, 2], [6, 10, 11, 1], [7, 0, 2, 2], [7, 9, 11, 1], [8, 0, 11, 2], [9, 0, 11, 2], [10, 1, 10, 2], [11, 1, 10, 2], [12, 2, 9, 2], [13, 2, 9, 1], [14, 3, 8, 1], [15, 4, 7, 0]]);
      chin([[8, 3, 8, 3]]); L.hline(x + 5, x + 6, y + 9, 'skin', 0);
      for (let dy = 10; dy <= 14; dy += 2) L.px(x + 5, y + dy, c, 3); break;
    default:
  }
}
function beardSide(L, P, kind) {
  const { x, y } = P.head;
  const c = 'beard';
  const rows = (list) => list.forEach(([dy, a, b, s]) => L.hline(x + a, x + b, y + dy, c, s ?? 2));
  switch (kind) {
    case 'bigode': case 'bigode-longo': rows([[8, 0, 2, 2]]); if (kind === 'bigode-longo') L.vline(x + 2, y + 9, y + 11, c, 1); break;
    case 'cavanhaque': rows([[8, 0, 1, 2], [10, 1, 3, 2], [11, 2, 3, 1]]); break;
    case 'queixo': rows([[10, 1, 5, 2], [11, 2, 5, 1]]); break;
    case 'costeletas': L.vline(x + 7, y + 5, y + 8, c, 1); L.vline(x + 8, y + 5, y + 7, c, 1); break;
    case 'por-fazer': for (let dx = 1; dx <= 7; dx++) for (let dy = 8; dy <= 10; dy++) if ((dx + dy) % 2 === 0) L.px(x + dx, y + dy, 'skin', 1); break;
    case 'curta': rows([[7, 7, 8, 1], [8, 0, 8, 2], [9, 1, 7, 2], [10, 2, 6, 1]]); break;
    case 'cheia': rows([[6, 7, 8, 1], [7, 6, 8, 2], [8, 0, 8, 2], [9, 1, 8, 2], [10, 1, 7, 2], [11, 2, 6, 1], [12, 3, 5, 0]]); break;
    case 'longa': rows([[6, 7, 8, 1], [7, 6, 8, 2], [8, 0, 8, 2], [9, 1, 8, 2], [10, 1, 7, 2], [11, 2, 6, 2], [12, 2, 5, 1], [13, 3, 5, 1], [14, 3, 4, 0]]); break;
    case 'trancada': rows([[7, 6, 8, 2], [8, 0, 8, 2], [9, 1, 7, 2], [10, 2, 6, 1]]); for (let k = 0; k < 4; k++) L.px(x + 3, y + 11 + k, c, k % 2 ? 1 : 3); L.px(x + 3, y + 15, '#d0a440', 3); break;
    case 'dupla': rows([[7, 6, 8, 2], [8, 0, 8, 2], [9, 1, 7, 2], [10, 1, 6, 2], [11, 1, 3, 1], [12, 1, 3, 1]]); break;
    case 'ana': rows([[5, 7, 9, 1], [6, 6, 9, 2], [7, 5, 9, 2], [8, 0, 9, 2], [9, 0, 8, 2], [10, 0, 8, 2], [11, 1, 7, 2], [12, 1, 6, 2], [13, 2, 5, 1], [14, 2, 4, 1], [15, 3, 4, 0]]); break;
    default:
  }
}

export const BEARDS = [
  { id: 'nenhuma', name: 'Sem barba' },
  { id: 'por-fazer', name: 'Por fazer' },
  { id: 'bigode', name: 'Bigode' },
  { id: 'bigode-longo', name: 'Bigode longo' },
  { id: 'cavanhaque', name: 'Cavanhaque' },
  { id: 'queixo', name: 'Barba no queixo' },
  { id: 'costeletas', name: 'Costeletas' },
  { id: 'curta', name: 'Barba curta' },
  { id: 'cheia', name: 'Barba cheia' },
  { id: 'longa', name: 'Barba longa' },
  { id: 'trancada', name: 'Barba trançada' },
  { id: 'dupla', name: 'Barba bifurcada' },
  { id: 'ana', name: 'Barba durkar' }
];

export function drawBeard(L, P, kind) {
  if (!kind || kind === 'nenhuma' || P.view === 'up') return;
  if (P.view === 'side') beardSide(L, P, kind); else beardFront(L, P, kind);
}
