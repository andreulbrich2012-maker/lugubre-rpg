// Partes de baixo geradas por especificacao: comprimento x corte x saia x detalhes.
// Canais: a = tecido principal, b = detalhe (faixa, remendo, barra), c = metal/cordao.
// Tudo segue as pernas do esqueleto (l.rows, l.foot), entao o passo anima sozinho.
// Estilo Stardew: lado esquerdo da perna claro, direito escuro, vinco no meio da coxa,
// cos com sombra embaixo e barra mais escura.

function legEnd(P, l, len) {
  const f = l.foot.y;
  return { short: P.hip + 2, knee: P.hip + 3, capri: f - 2, full: f - 1, long: f }[len] ?? f - 1;
}

function legSpan(P, y) {
  let a = Infinity;
  let b = -Infinity;
  for (const l of P.legs) {
    const r = l.rows.get(y);
    if (!r) continue;
    a = Math.min(a, r[0]);
    b = Math.max(b, r[1]);
  }
  return a === Infinity ? null : [a, b];
}

function pants(L, P, o) {
  const out = [];
  for (const l of P.legs) {
    const y1 = legEnd(P, l, o.len);
    for (let y = P.hip; y <= y1; y++) {
      const r = l.rows.get(y);
      if (!r) continue;
      let [a, b] = r;
      const k = y - P.hip;
      // corte largo (bufante) e boca de sino
      if (o.fit === 'baggy' && k >= 1 && y < y1) { if (P.view === 'side') b += 1; else if (l.side === 'l') a -= 1; else b += 1; }
      if (o.fit === 'flare' && y >= y1 - 1) { a -= 1; b += 1; }
      for (let x = a; x <= b; x++) {
        let s = x === a ? 3 : x === b ? 1 : 2;
        if (l.back) s = Math.max(0, s - 1);
        if (y === P.hip) s = Math.max(1, s - 1); // sombra do cos/camisa
        if (y === y1) s = Math.min(s, 1); // barra
        // vinco da coxa
        if (k >= 2 && k <= 5 && x === a + 1 && b - a >= 2 && P.view !== 'side') s = Math.min(4, s + 1);
        L.px(x, y, 'a', s);
        out.push([x, y, l, k, a, b, y1]);
      }
    }
  }
  // gancho: fecha o vao entre as pernas de frente/costas na linha do quadril
  if (P.view !== 'side') { const sp = legSpan(P, P.hip); if (sp) for (let x = sp[0]; x <= sp[1]; x++) if (!L.has(x, P.hip)) L.px(x, P.hip, 'a', 1); }
  return out;
}

function skirt(L, P, o) {
  const len = { mini: 2, skirt: 3, midi: 5, long: 99 }[o.skirt] ?? 3;
  const foot = Math.min(...P.legs.map((l) => l.foot.y));
  const y1 = Math.min(P.hip + len, foot);
  const out = [];
  for (let y = P.hip - (o.high ? 1 : 0); y <= y1; y++) {
    const sp = legSpan(P, Math.min(y, foot - 1)) || legSpan(P, P.hip);
    const k = Math.max(0, y - P.hip);
    const flare = o.skirt === 'long' || o.skirt === 'midi' ? Math.floor(k / 3) + 1 : k >= 2 ? 1 : 0;
    let [a, b] = sp;
    if (P.view === 'side') b += flare; else { a -= flare; b += flare; }
    for (let x = a; x <= b; x++) {
      let s = x <= a ? 3 : x >= b ? 1 : 2;
      if (o.pleats && (x - a) % 2 === 1 && k >= 1) s = Math.max(0, s - 1);
      if (y === y1) s = Math.min(s, 1);
      L.px(x, y, 'a', s);
      out.push([x, y, null, k, a, b, y1]);
    }
  }
  return out;
}

function details(L, P, o, cells) {
  const up = P.view === 'up';
  const side = P.view === 'side';
  for (const d of o.det || []) {
    switch (d) {
      case 'waistband': {
        const sp = legSpan(P, P.hip);
        if (sp) for (let x = sp[0] - (o.skirt ? 1 : 0); x <= sp[1] + (o.skirt ? 1 : 0); x++) L.px(x, P.hip, 'b', x === sp[0] ? 3 : 2);
        break;
      }
      case 'drawstring':
        if (!up) { const x = side ? legSpan(P, P.hip)[0] : 11; L.px(x, P.hip, 'c', 4); L.px(x, P.hip + 1, 'c', 3); if (!side) L.px(12, P.hip + 1, 'c', 2); }
        break;
      case 'cuffs':
        for (const [x, y, , , , , y1] of cells) if (y === y1) L.px(x, y, 'b', 2);
        break;
      case 'rolled':
        for (const [x, y, , , a, , y1] of cells) { if (y === y1) L.px(x, y, 'b', x === a ? 4 : 3); if (y === y1 - 1) L.px(x, y, 'b', 1); }
        break;
      case 'sidestripe':
        for (const [x, y, l, k, a, b] of cells) {
          if (k < 1) continue;
          const outer = side ? x === b : l ? (l.side === 'l' ? x === a : x === b) : false;
          if (outer) L.px(x, y, 'b', 3);
        }
        break;
      case 'patches':
        for (const [x, y, l, k, a] of cells) if (l && k >= 3 && k <= 4 && x <= a + 1 && (l.side === 'l' || side)) L.px(x, y, 'b', k === 3 ? 3 : 2);
        break;
      case 'kneepatch':
        for (const [x, y, l, k, a, b] of cells) if (l && k === 4 && x > a && x < b + (side ? 1 : 0)) L.px(x, y, 'b', 2);
        break;
      case 'pockets':
        if (!up) for (const [x, y, l, k, a, b] of cells) if (l && k === 1 && (side ? x === a + 1 : l.side === 'l' ? x === a + 1 : x === b - 1)) { L.px(x, y, 'b', 1); L.px(x, y + 1, 'b', 2); }
        break;
      case 'laces': // cordao na lateral
        for (const [x, y, l, k, a, b] of cells) if (k >= 1 && k % 2 === 1) { const outer = side ? x === b : l ? (l.side === 'l' ? x === a : x === b) : false; if (outer) L.px(x, y, 'c', 4); }
        break;
      case 'stripes':
        for (const [x, y, , k] of cells) if (k % 3 === 2) L.px(x, y, 'b', L.get(x, y)?.s ?? 2);
        break;
      case 'plaid':
        for (const [x, y, , k, a] of cells) if ((x - a) % 3 === 1 || k % 3 === 1) L.px(x, y, 'b', ((x - a) % 3 === 1 && k % 3 === 1) ? 1 : 2);
        break;
      case 'checks':
        for (const [x, y, , k] of cells) if ((x + Math.floor(k / 2)) % 2 === 0 && k % 2 === 0) L.px(x, y, 'b', 2);
        break;
      case 'chain':
        for (const [x, y] of cells) L.px(x, y, 'c', (x + y) % 2 === 0 ? 3 : 1);
        break;
      case 'quilt':
        for (const [x, y, , k] of cells) if ((x + k) % 3 === 0) L.px(x, y, 'a', 1);
        break;
      case 'torn':
        for (const [x, y, , , , , y1] of cells) if (y === y1 && (x * 5 + y) % 3 === 0) L.erase(x, y);
        for (const [x, y, l, k, a] of cells) if (l && k === 3 && x === a + 1 && l.side !== 'r') L.px(x, y, 'skin', 1);
        break;
      case 'fur':
        for (const [x, y] of cells) if ((x * 7 + y * 3) % 4 === 0) L.px(x, y, 'a', 4);
        break;
      case 'tassets': // duas placas por coxa, cada uma com brilho em cima e sombra embaixo
        for (const l of P.legs) {
          for (let y = P.hip; y <= P.hip + 3; y++) {
            const r = l.rows.get(y);
            if (!r) continue;
            const plate = y - P.hip < 2 ? 0 : 1;
            const ty = (y - P.hip) % 2;
            for (let x = r[0] - (side ? 0 : l.side === 'l' ? 1 : 0); x <= r[1] + (side ? 1 : l.side === 'r' ? 1 : 0); x++) {
              let s2 = ty === 0 ? 3 : 1;
              if (x === r[0] - 1 || (side && x === r[0])) s2 = Math.min(4, s2 + 1);
              L.px(x, y, 'c', l.back ? Math.max(0, s2 - 1) : s2);
            }
            if (!up && ty === 0 && plate === 0) L.px(r[0] + 1, y, 'c', 4); // rebite
          }
        }
        break;
      case 'loincloth': // pano frontal (e de tras) pendurado no cinto
        for (let y = P.hip; y <= P.hip + 6; y++) {
          const cx = side ? legSpan(P, y)?.[0] ?? 9 : 11;
          const w = y > P.hip + 4 ? 1 : 2;
          for (let x = cx - (side ? 0 : w - 1); x <= cx + (side ? 1 : w); x++) L.px(x, y, 'b', x === cx - (side ? 0 : w - 1) ? 3 : 2);
        }
        { const sp = legSpan(P, P.hip); if (sp) L.hline(sp[0], sp[1], P.hip, 'c', 2); }
        break;
      case 'sarong': // pano enrolado na diagonal
        for (const [x, y, , k, a] of cells) if ((x - a + k) % 6 === 0) L.px(x, y, 'b', 1);
        { const sp = legSpan(P, P.hip); if (sp && !up) { L.px(side ? sp[0] : sp[1], P.hip + 1, 'b', 3); L.px(side ? sp[0] : sp[1], P.hip + 2, 'b', 2); } }
        break;
      case 'belt': {
        const sp = legSpan(P, P.hip);
        if (sp) { L.hline(sp[0], sp[1], P.hip, 'b', 1); if (!up) L.px(side ? sp[0] + 1 : 11, P.hip, 'c', 4); }
        break;
      }
      case 'apronfront':
        if (!up) for (let y = P.hip; y <= P.hip + 5; y++) { const cx = side ? (legSpan(P, y)?.[0] ?? 9) - 1 : 10; for (let x = cx; x <= cx + (side ? 1 : 3); x++) L.px(x, y, 'b', x === cx ? 3 : 2); }
        break;
      case 'hem':
        for (const [x, y, , , , , y1] of cells) if (y === y1 - 1 && x % 2 === 0) L.px(x, y, 'b', 3);
        break;
      default:
    }
  }
}

function lower(o) {
  return (L, P) => {
    let cells = [];
    if (o.len) cells = cells.concat(pants(L, P, o));
    if (o.skirt) cells = cells.concat(skirt(L, P, o));
    details(L, P, o, cells);
  };
}

const ch = (a, b, c) => [{ label: 'Tecido', def: a }, { label: 'Detalhe', def: b }, { label: 'Metal', def: c }];
const g = (id, name, sub, o) => ({ id, name, sub, channels: ch(o.a || 'couro', o.b || 'couro-escuro', o.c || 'bronze'), draw: lower(o) });

const CL = 'Calças', BE = 'Bermudas e curtas', SA = 'Saias', KI = 'Kilts e panos', AR = 'Armaduras', RU = 'Rústicos';

export const LEGS = [
  // ---- calcas ----
  g('calca-simples', 'Calça simples', CL, { len: 'full', a: 'couro' }),
  g('calca-cos', 'Calça com cós', CL, { len: 'full', det: ['waistband'], a: 'terra', b: 'couro-escuro' }),
  g('calca-cordao', 'Calça de cordão', CL, { len: 'full', det: ['drawstring'], a: 'linho', c: 'osso' }),
  g('calca-larga', 'Calça larga', CL, { len: 'full', fit: 'baggy', det: ['waistband'], a: 'linho', b: 'camurca' }),
  g('calca-bufante', 'Calça bufante', CL, { len: 'full', fit: 'baggy', det: ['cuffs', 'drawstring'], a: 'carmesim', b: 'ouro', c: 'ouro' }),
  g('calca-sino', 'Calça boca de sino', CL, { len: 'full', fit: 'flare', a: 'azul-aco' }),
  g('calca-listra-lateral', 'Calça com listra lateral', CL, { len: 'full', det: ['sidestripe'], a: 'azul-noite', b: 'ouro' }),
  g('calca-remendada', 'Calça remendada', CL, { len: 'full', det: ['patches'], a: 'couro', b: 'camurca' }),
  g('calca-joelho-reforcado', 'Calça de joelho reforçado', CL, { len: 'full', det: ['kneepatch'], a: 'oliva', b: 'couro-escuro' }),
  g('calca-bolsos', 'Calça de bolsos', CL, { len: 'full', det: ['pockets', 'waistband'], a: 'oliva', b: 'musgo' }),
  g('calca-dobrada', 'Calça dobrada', CL, { len: 'full', det: ['rolled'], a: 'azul-aco', b: 'osso' }),
  g('calca-amarrada', 'Calça amarrada', CL, { len: 'full', det: ['laces'], a: 'couro-escuro', c: 'couro' }),
  g('calca-listrada', 'Calça listrada', CL, { len: 'full', det: ['stripes'], a: 'osso', b: 'vinho' }),
  g('calca-xadrez', 'Calça xadrez', CL, { len: 'full', det: ['plaid'], a: 'floresta', b: 'carvao' }),
  g('calca-acolchoada', 'Calça acolchoada', CL, { len: 'full', det: ['quilt', 'waistband'], a: 'linho', b: 'couro' }),
  g('calca-couro', 'Calça de couro', CL, { len: 'full', det: ['belt'], a: 'couro-escuro', b: 'carvao', c: 'prata' }),
  g('calca-montaria', 'Calça de montaria', CL, { len: 'full', fit: 'baggy', det: ['sidestripe', 'belt'], a: 'camurca', b: 'couro-escuro' }),
  g('calca-nobre', 'Calça nobre', CL, { len: 'full', det: ['sidestripe', 'cuffs'], a: 'vinho', b: 'ouro' }),
  g('calca-bordada', 'Calça bordada', CL, { len: 'full', det: ['hem', 'cuffs'], a: 'ameixa', b: 'ouro' }),
  g('calca-pele', 'Calça de pele', CL, { len: 'full', det: ['fur'], a: 'camurca' }),
  g('calca-rasgada', 'Calça rasgada', CL, { len: 'full', det: ['torn'], a: 'azul-aco' }),
  g('calca-curta-tornozelo', 'Calça pesqueiro', CL, { len: 'capri', a: 'linho' }),
  g('pesqueiro-dobrado', 'Pesqueiro dobrado', CL, { len: 'capri', det: ['rolled'], a: 'oliva', b: 'linho' }),
  g('calca-avental', 'Calça com avental', CL, { len: 'full', det: ['apronfront'], a: 'chumbo', b: 'couro' }),
  // ---- bermudas ----
  g('bermuda', 'Bermuda', BE, { len: 'knee', a: 'camurca' }),
  g('bermuda-cos', 'Bermuda com cós', BE, { len: 'knee', det: ['waistband'], a: 'azul-aco', b: 'couro' }),
  g('bermuda-dobrada', 'Bermuda dobrada', BE, { len: 'knee', det: ['rolled'], a: 'linho', b: 'osso' }),
  g('bermuda-bolsos', 'Bermuda de bolsos', BE, { len: 'knee', det: ['pockets'], a: 'oliva', b: 'musgo' }),
  g('bermuda-larga', 'Bermuda larga', BE, { len: 'knee', fit: 'baggy', a: 'carmesim' }),
  g('calcao', 'Calção', BE, { len: 'short', a: 'couro' }),
  g('calcao-listrado', 'Calção listrado', BE, { len: 'short', det: ['sidestripe'], a: 'azul-noite', b: 'osso' }),
  g('calcao-rasgado', 'Calção rasgado', BE, { len: 'short', det: ['torn'], a: 'terra' }),
  g('bermuda-xadrez', 'Bermuda xadrez', BE, { len: 'knee', det: ['checks'], a: 'mostarda', b: 'couro' }),
  // ---- saias ----
  g('saia-curta', 'Saia curta', SA, { skirt: 'mini', a: 'vinho' }),
  g('saia', 'Saia', SA, { skirt: 'skirt', a: 'azul-aco' }),
  g('saia-midi', 'Saia midi', SA, { skirt: 'midi', a: 'floresta' }),
  g('saia-longa', 'Saia longa', SA, { skirt: 'long', a: 'ameixa' }),
  g('saia-pregas', 'Saia de pregas', SA, { skirt: 'skirt', pleats: true, a: 'carvao' }),
  g('saia-longa-pregas', 'Saia longa de pregas', SA, { skirt: 'long', pleats: true, a: 'azul-noite' }),
  g('saia-cos-alto', 'Saia de cós alto', SA, { skirt: 'midi', high: true, det: ['waistband'], a: 'carmesim', b: 'couro-escuro' }),
  g('saia-barra', 'Saia com barra', SA, { skirt: 'long', det: ['cuffs', 'hem'], a: 'linho', b: 'vinho' }),
  g('saia-listrada', 'Saia listrada', SA, { skirt: 'midi', det: ['stripes'], a: 'osso', b: 'petroleo' }),
  g('saia-avental', 'Saia com avental', SA, { skirt: 'long', det: ['apronfront'], a: 'mostarda', b: 'branco-gasto' }),
  g('saia-calca', 'Saia sobre calça', SA, { len: 'full', skirt: 'mini', a: 'couro', b: 'couro-escuro' }),
  g('saia-rasgada', 'Saia rasgada', SA, { skirt: 'midi', det: ['torn'], a: 'chumbo' }),
  g('saia-cinto', 'Saia com cinto', SA, { skirt: 'skirt', det: ['belt'], a: 'camurca', b: 'couro-escuro', c: 'prata' }),
  // ---- kilts e panos ----
  g('kilt', 'Kilt', KI, { skirt: 'skirt', pleats: true, det: ['plaid'], a: 'floresta', b: 'sangue' }),
  g('kilt-cinto', 'Kilt com cinto', KI, { skirt: 'skirt', det: ['plaid', 'belt'], a: 'azul-noite', b: 'mostarda', c: 'prata' }),
  g('tanga', 'Tanga de pano', KI, { len: 'short', det: ['loincloth'], a: 'couro', b: 'linho', c: 'couro-escuro' }),
  g('pano-guerreiro', 'Pano de guerreiro', KI, { len: 'full', det: ['loincloth'], a: 'couro-escuro', b: 'carmesim', c: 'bronze' }),
  g('sarongue', 'Sarongue', KI, { skirt: 'midi', det: ['sarong'], a: 'jade', b: 'petroleo' }),
  g('saia-couro-tiras', 'Saia de tiras de couro', KI, { len: 'full', skirt: 'skirt', pleats: true, det: ['belt'], a: 'couro', b: 'couro-escuro' }),
  // ---- armaduras ----
  g('escarcelas', 'Escarcelas', AR, { len: 'full', det: ['tassets'], a: 'couro-escuro', c: 'aco' }),
  g('calca-malha', 'Calça de malha', AR, { len: 'full', det: ['chain'], a: 'ferro', c: 'ferro' }),
  g('malha-escarcelas', 'Malha com escarcelas', AR, { len: 'full', det: ['chain', 'tassets'], a: 'aco', c: 'aco' }),
  g('saiote-placas', 'Saiote de placas', AR, { skirt: 'skirt', det: ['tassets'], a: 'couro', c: 'ferro' }),
  g('coxotes-acolchoados', 'Coxotes acolchoados', AR, { len: 'full', fit: 'baggy', det: ['quilt', 'kneepatch', 'waistband'], a: 'linho', b: 'couro', c: 'bronze' }),
  // ---- rusticos ----
  g('calca-estopa', 'Calça de estopa', RU, { len: 'capri', det: ['checks', 'drawstring'], a: 'linho', b: 'camurca', c: 'camurca' }),
  g('calca-trapos', 'Calça de trapos', RU, { len: 'capri', det: ['torn', 'patches'], a: 'terra', b: 'linho' }),
  g('perneiras-pele', 'Perneiras de pele', RU, { len: 'full', fit: 'baggy', det: ['fur', 'belt'], a: 'camurca', b: 'couro' }),
  g('calca-pescador', 'Calça de pescador', RU, { len: 'capri', fit: 'baggy', det: ['rolled', 'drawstring'], a: 'azul-aco', b: 'osso', c: 'osso' }),
  g('saia-palha', 'Saia de palha', RU, { skirt: 'skirt', pleats: true, det: ['hem'], a: 'ocre', b: 'mostarda' })
];
