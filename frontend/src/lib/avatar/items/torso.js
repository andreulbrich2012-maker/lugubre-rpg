// Roupas do tronco geradas por especificacao: manga x gola x comprimento x fecho x estampa x
// acabamento x extras. Cada combinacao tem nome proprio e desenho proprio (recolorir nao
// conta como peca nova). Canais: a = tecido principal, b = segundo tecido/acabamento,
// c = metal (botoes, fivelas, placas).
// Estilo Stardew: brilho forte no ombro esquerdo, dobras com vinco escuro, cintura com
// sombra, barra mais escura; tudo relativo as partes do esqueleto (vale em todo quadro).

// Faixa de x das pernas numa linha (para saia/barra de tunica acompanhar o passo).
function legSpan(P, y) {
  let a = Infinity;
  let b = -Infinity;
  for (const l of P.legs) {
    const r = l.rows.get(y) || l.rows.get(Math.min(y, l.bottom));
    if (!r) continue;
    a = Math.min(a, r[0]);
    b = Math.max(b, r[1]);
  }
  return a === Infinity ? null : [a, b];
}

// Fim (y) da barra por comprimento: 0 cintura, 1 quadril, 2 tunica, 3 robe, 4 ate o chao.
function hemY(P, len) {
  const foot = Math.min(...P.legs.map((l) => l.foot.y));
  return [P.hip - 1, P.hip + 1, P.hip + 3, foot - 2, foot][len] ?? P.hip - 1;
}

// Celulas da roupa (tronco + saia) com tom de relevo; devolve Map idx -> {x, y, s, zone}.
function bodyCells(L, P, o) {
  const cells = [];
  for (const [y, [a, b]] of P.torso.rows) for (let x = a; x <= b; x++) cells.push([x, y, 'torso']);
  const end = hemY(P, o.len || 0);
  for (let y = P.hip; y <= end; y++) {
    const r = legSpan(P, y);
    if (!r) continue;
    const k = y - P.hip;
    // barra abre em "A" (mais nos robes e vestidos); de perfil abre para tras
    const flare = o.len >= 3 ? Math.floor(k / 3) + 1 : o.len === 2 ? (k >= 2 ? 1 : 0) : 0;
    let [a, b] = r;
    if (P.view === 'side') b += flare + (o.len >= 3 ? 1 : 0);
    else { a -= flare; b += flare; }
    if (o.len >= 1 && k === 0) { a = Math.min(a, P.torso.rows.get(P.hip - 1)[0]); b = Math.max(b, P.torso.rows.get(P.hip - 1)[1]); }
    for (let x = a; x <= b; x++) cells.push([x, y, 'skirt']);
  }
  return cells;
}

function paintBody(L, P, o) {
  const cells = bodyCells(L, P, o);
  const set = new Set(cells.map(([x, y]) => y * 24 + x));
  const top = P.torso.top;
  const end = Math.max(...cells.map(([, y]) => y));
  const tx0 = P.torso.x0;
  const tx1 = P.torso.x1;
  const w = tx1 - tx0;
  for (const [x, y, zone] of cells) {
    const i = y * 24 + x;
    let s = 2;
    if (!set.has(i + 1)) s = 1;
    else if (!set.has(i - 1)) s = 3;
    if (y === top) s = 3;
    // brilho de ombro (alto-esquerda), sombra embaixo do peito e na cintura
    if (P.view !== 'up' && y <= top + 1 && x <= tx0 + 2) s = 4;
    if (P.view === 'up' && y === top && x <= tx0 + 2) s = 4;
    if (zone === 'torso' && y === P.hip - 1 && o.len >= 1) s = Math.max(1, s - 1);
    // dobras: vincos verticais no tecido (tunica/robe ganham mais)
    if (o.folds !== false) {
      const fx = P.view === 'side' ? tx0 + 2 : tx0 + Math.round(w * 0.33);
      if (zone === 'torso' && x === fx && y >= top + 3 && y <= top + 6) s = Math.max(1, s - 1);
      if (zone === 'skirt' && (x - tx0) % 3 === 1 && y > P.hip) s = Math.max(1, s - 1);
    }
    if (zone === 'skirt' && y === end) s = Math.min(s, 1);
    L.px(x, y, 'a', s);
  }
  return cells;
}

const T = (P) => P.torso;
const midX = (P) => (P.view === 'side' ? T(P).x0 + 1 : 11.5);
const rowSpan = (P, y) => T(P).rows.get(y) || [T(P).x0, T(P).x1];

// ---------- mangas ----------
function sleeves(L, P, o) {
  const kind = o.sleeve ?? 'short';
  if (kind === 'none') return;
  const n = { cap: 1, short: 3, puff: 3, elbow: 4, long: 7, bell: 7, tight: 7 }[kind] ?? 3;
  for (const a of P.arms) {
    L.withTag(a.tag, () => {
      const y1 = a.top + n - 1;
      L.fill(a, 'a', { y1: Math.min(y1, a.bottom) });
      if (kind === 'puff') for (let y = a.top; y <= a.top + 1; y++) { const [x0, x1] = a.rows.get(y); L.px(P.view === 'side' ? x0 - 1 : a.side === 'l' ? x0 - 1 : x1 + 1, y, 'a', 3); }
      if (kind === 'bell') for (let y = a.bottom - 1; y <= a.bottom; y++) { const [x0, x1] = a.rows.get(y); L.px(x0 - 1, y, 'a', 3); L.px(x1 + 1, y, 'a', 1); }
      // dobra no cotovelo e punho mais escuro
      if (n >= 4) { const r = a.rows.get(a.top + 3); if (r) L.px(r[a.side === 'l' ? 1 : 0], a.top + 3, 'a', 1); }
      if (o.trim === 'cuffs' || o.trim === 'full') { const yy = Math.min(y1, a.bottom); const [x0, x1] = a.rows.get(yy); L.hline(x0, x1, yy, 'b', 2); if (kind === 'bell') { L.px(x0 - 1, yy, 'b', 3); L.px(x1 + 1, yy, 'b', 1); } }
      if (o.pattern === 'vstripes' || o.pattern === 'hstripes') for (let y = a.top; y <= Math.min(y1, a.bottom); y++) if ((y - a.top) % 2 === 1 && o.pattern === 'hstripes') { const [x0, x1] = a.rows.get(y); L.hline(x0, x1, y, 'b', 2); }
      if (o.pattern === 'chain' || o.pattern === 'scale') for (let y = a.top; y <= Math.min(y1, a.bottom); y++) { const [x0, x1] = a.rows.get(y); for (let x = x0; x <= x1; x++) if ((x + y) % 2 === 0) L.px(x, y, o.pattern === 'chain' ? 'c' : 'a', 3); }
    });
  }
}

// ---------- golas ----------
function neckline(L, P, o) {
  const t = T(P);
  const y0 = t.top;
  const side = P.view === 'side';
  const up = P.view === 'up';
  const kind = o.neck || 'crew';
  const trim = o.trim === 'collar' || o.trim === 'full';
  if (up) {
    if (kind === 'high' || kind === 'hood' || kind === 'cowl') {
      const [a, b] = rowSpan(P, y0);
      if (kind === 'high') L.hline(a + 2, b - 2, y0 - 1, 'b', 2);
      if (kind === 'hood') { L.hline(a + 1, b - 1, y0, 'b', 3); L.hline(a + 2, b - 2, y0 + 1, 'b', 2); L.hline(a + 3, b - 3, y0 + 2, 'b', 1); L.px(a + 2, y0, 'b', 4); }
      if (kind === 'cowl') L.hline(a + 1, b - 1, y0, 'b', 2);
    }
    return;
  }
  if (side) {
    const x = t.x0;
    switch (kind) {
      case 'v': case 'deepv': case 'open':
        L.px(x, y0, 'skin', 2); L.px(x, y0 + 1, 'skin', 1); if (kind === 'deepv') L.px(x, y0 + 2, 'skin', 1);
        if (kind === 'open') { L.px(x + 1, y0, 'b', 3); L.px(x + 1, y0 + 1, 'b', 2); }
        break;
      case 'square': case 'boat': L.px(x, y0, 'skin', 2); L.px(x + 1, y0, 'skin', 2); if (kind === 'boat') L.px(x + 2, y0, 'skin', 2); break;
      case 'high': L.hline(x + 1, x + 3, y0 - 1, trim ? 'b' : 'a', 2); break;
      case 'hood': L.hline(x + 2, t.x1 + 1, y0, 'b', 3); L.px(t.x1 + 1, y0 + 1, 'b', 1); L.px(t.x1, y0 + 1, 'b', 2); break;
      case 'cowl': L.hline(x, x + 3, y0, 'b', 3); L.px(x, y0 + 1, 'b', 2); break;
      default: if (trim) L.hline(x, x + 2, y0, 'b', 2);
    }
    return;
  }
  // frente
  const c0 = 11;
  const c1 = 12;
  switch (kind) {
    case 'v':
      L.hline(c0 - 1, c1 + 1, y0, 'skin', 2); L.hline(c0, c1, y0 + 1, 'skin', 1);
      if (trim) { L.px(c0 - 2, y0, 'b', 3); L.px(c1 + 2, y0, 'b', 2); L.px(c0 - 1, y0 + 1, 'b', 3); L.px(c1 + 1, y0 + 1, 'b', 2); L.px(c0, y0 + 2, 'b', 3); L.px(c1, y0 + 2, 'b', 2); }
      break;
    case 'deepv':
      L.hline(c0 - 1, c1 + 1, y0, 'skin', 2); L.hline(c0, c1, y0 + 1, 'skin', 2); L.hline(c0, c1, y0 + 2, 'skin', 1); L.px(c0, y0 + 3, 'skin', 1);
      if (trim) for (let k = 0; k < 4; k++) { L.px(c0 - 1 - (k < 1 ? 1 : 0), y0 + k, 'b', 3); L.px(c1 + 1 + (k < 1 ? 1 : 0), y0 + k, 'b', 2); }
      break;
    case 'open': // lapelas
      L.hline(c0 - 1, c1 + 1, y0, 'skin', 2); L.hline(c0, c1, y0 + 1, 'skin', 1);
      for (let k = 0; k < 4; k++) { L.px(c0 - 2 + Math.floor(k / 2), y0 + k, 'b', 3); L.px(c1 + 2 - Math.floor(k / 2), y0 + k, 'b', 1); }
      break;
    case 'square':
      L.rect(c0 - 2, y0, 6, 2, 'skin', 2); L.hline(c0 - 2, c1 + 2, y0 + 1, 'skin', 1);
      if (trim) { L.hline(c0 - 3, c1 + 3, y0 + 2, 'b', 2); L.px(c0 - 3, y0, 'b', 3); L.px(c0 - 3, y0 + 1, 'b', 3); L.px(c1 + 3, y0, 'b', 1); L.px(c1 + 3, y0 + 1, 'b', 1); }
      break;
    case 'boat': {
      const [a, b] = rowSpan(P, y0);
      L.hline(a + 1, b - 1, y0, 'skin', 2);
      if (trim) L.hline(a, b, y0 + 1, 'b', 2);
      break;
    }
    case 'high': {
      L.hline(c0 - 1, c1 + 1, y0 - 1, trim ? 'b' : 'a', 3); L.px(c1 + 1, y0 - 1, trim ? 'b' : 'a', 1);
      L.hline(c0 - 1, c1 + 1, y0, trim ? 'b' : 'a', 1);
      break;
    }
    case 'hood': {
      // capuz caido: rolo de tecido em volta do pescoco e ombros
      const [a, b] = rowSpan(P, y0);
      L.hline(a + 1, b - 1, y0, 'b', 3); L.px(a, y0 + 1, 'b', 3); L.px(b, y0 + 1, 'b', 1);
      L.hline(c0 - 1, c1 + 1, y0, 'skin', 1);
      L.px(a + 1, y0, 'b', 4);
      break;
    }
    case 'cowl': {
      const [a, b] = rowSpan(P, y0);
      L.hline(a + 1, b - 1, y0, 'b', 3); L.hline(a + 2, b - 2, y0 + 1, 'b', 2); L.hline(c0 - 1, c1 + 1, y0 + 2, 'b', 1);
      break;
    }
    default: // gola redonda
      L.hline(c0, c1, y0, 'skin', 1);
      if (trim) { L.hline(c0 - 1, c1 + 1, y0 + 1, 'b', 2); L.px(c0 - 2, y0, 'b', 3); L.px(c1 + 2, y0, 'b', 2); }
  }
}

// ---------- estampas ----------
function pattern(L, P, o, cells) {
  const p = o.pattern;
  if (!p || p === 'plain') return;
  for (const [x, y, zone] of cells) {
    const tx = x - T(P).x0;
    const ty = y - T(P).top;
    const cur = L.get(x, y);
    if (!cur || cur.c === 'skin' || cur.c === 'b') continue;
    const s = cur.s;
    switch (p) {
      case 'vstripes': if (tx % 3 === 1) L.px(x, y, 'b', s); break;
      case 'hstripes': if (ty % 3 === 2) L.px(x, y, 'b', s); break;
      case 'checks': if ((Math.floor(tx / 2) + Math.floor(ty / 2)) % 2 === 0) L.px(x, y, 'b', s); break;
      case 'plaid': if (tx % 4 === 1 || ty % 4 === 1) L.px(x, y, 'b', (tx % 4 === 1 && ty % 4 === 1) ? Math.max(0, s - 1) : s); break;
      case 'quilt': if ((tx + ty) % 4 === 0 || (tx - ty + 40) % 4 === 0) L.px(x, y, 'a', Math.max(0, s - 1)); break;
      case 'chain': L.px(x, y, 'c', (x + y) % 2 === 0 ? Math.min(4, s + 1) : Math.max(0, s - 1)); break;
      case 'scale': if (ty % 2 === 0 ? tx % 2 === 0 : tx % 2 === 1) L.px(x, y, 'a', Math.min(4, s + 1)); else if (ty % 2 === 1) L.px(x, y, 'a', Math.max(0, s - 1)); break;
      case 'plates': if (zone === 'torso' && ty % 3 === 2) L.px(x, y, 'c', 1); else if (ty % 3 === 0) L.px(x, y, 'c', Math.min(4, s + 1)); else L.px(x, y, 'c', s); break;
      case 'dots': if ((tx * 3 + ty * 2) % 5 === 0) L.px(x, y, 'b', 3); break;
      case 'fur': if ((x * 7 + y * 3) % 4 === 0) L.px(x, y, 'a', Math.min(4, s + 1)); else if ((x * 5 + y) % 6 === 0) L.px(x, y, 'a', Math.max(0, s - 1)); break;
      case 'patches': if (((tx >> 1) * 5 + (ty >> 1) * 3) % 7 === 0) L.px(x, y, 'b', s); break;
      case 'diamond': if (Math.abs(((tx + 2) % 4) - 2) + Math.abs(((ty + 2) % 4) - 2) === 2) L.px(x, y, 'b', s); break;
      default:
    }
  }
}

// ---------- fechos ----------
function closure(L, P, o, cells) {
  const k = o.close;
  if (!k || P.view === 'up') return;
  const t = T(P);
  const end = Math.max(...cells.map(([, y]) => y));
  const side = P.view === 'side';
  const x = side ? t.x0 + 1 : 11;
  const start = t.top + (['v', 'deepv', 'open', 'square'].includes(o.neck) ? 2 : 1);
  switch (k) {
    case 'buttons': for (let y = start; y <= Math.min(end, P.hip + 1); y += 2) L.px(side ? x : 12, y, 'c', 4); if (!side) for (let y = start; y <= Math.min(end, P.hip + 1); y++) L.px(11, y, 'a', 1); break;
    case 'double': if (!side) for (let y = start; y <= P.hip - 1; y += 2) { L.px(10, y, 'c', 4); L.px(13, y, 'c', 3); } else for (let y = start; y <= P.hip - 1; y += 2) L.px(x, y, 'c', 4); break;
    case 'laces': for (let y = start; y <= start + 3; y++) { if (side) L.px(x, y, 'b', (y - start) % 2 ? 2 : 4); else { L.px(11, y, 'skin', 1); L.px(12, y, 'skin', 1); if ((y - start) % 2 === 0) { L.px(10, y, 'b', 4); L.px(13, y, 'b', 3); } else { L.px(11, y, 'b', 3); L.px(12, y, 'b', 3); } } } break;
    case 'seam': for (let y = start; y <= end; y++) L.px(side ? x : 12, y, 'a', 1); break;
    case 'wrap': if (!side) for (let k2 = 0; k2 <= P.hip - 1 - t.top; k2++) { L.px(9 + Math.round(k2 * 0.7), t.top + k2, 'a', 1); L.px(9 + Math.round(k2 * 0.7) - 1, t.top + k2, 'a', 3); } else for (let y = start; y <= P.hip - 1; y++) L.px(x, y, 'a', 1); break;
    case 'toggles': for (let y = start; y <= P.hip - 1; y += 2) { if (side) L.px(x, y, 'c', 3); else { L.px(11, y, 'c', 3); L.px(12, y, 'c', 4); } } break;
    case 'clasp': L.px(side ? x : 11, t.top + 1, 'c', 4); if (!side) L.px(12, t.top + 1, 'c', 3); break;
    default:
  }
}

// ---------- acabamento e extras ----------
function hemTrim(L, P, o, cells) {
  if (!(o.trim === 'hem' || o.trim === 'full')) return;
  const end = Math.max(...cells.map(([, y]) => y));
  for (const [x, y] of cells) if (y === end) L.px(x, y, 'b', 2);
  if (o.len >= 2) for (const [x, y] of cells) if (y === end - 1 && (x % 2 === 0)) L.px(x, y, 'b', 3);
}

function extras(L, P, o, cells) {
  const t = T(P);
  const side = P.view === 'side';
  const up = P.view === 'up';
  for (const e of o.extra || []) {
    switch (e) {
      case 'vest': // colete aberto por cima: laterais no canal b, meio fica o tecido a
        for (const [x, y, zone] of cells) {
          if (zone !== 'torso') continue;
          const inner = side ? x === t.x0 : Math.abs(x - 11.5) < 2;
          if (up || !inner) { const c = L.get(x, y); if (c && c.c !== 'skin') L.px(x, y, 'b', c.s); }
        }
        break;
      case 'corset':
        // de costas so o cordao cruzado (o painel do corpete fica na frente)
        if (up) { for (let y = t.top + 2; y <= P.hip - 1; y++) { L.px(11, y, 'b', (y % 2) ? 3 : 1); L.px(12, y, 'b', (y % 2) ? 1 : 3); } break; }
        for (let y = t.top + 2; y <= P.hip - 1; y++) {
          const [a, b] = rowSpan(P, y);
          const x0 = side ? a : a + 2;
          const x1 = side ? a + 2 : b - 2;
          for (let x = x0; x <= x1; x++) L.px(x, y, 'b', x === x0 ? 3 : x === x1 ? 1 : 2);
          if (!up && (y - t.top) % 2 === 0) L.px(side ? a + 1 : 11, y, 'c', 4), side || L.px(12, y, 'c', 3);
        }
        break;
      case 'sash': // faixa diagonal do ombro ao quadril
        for (let k = 0; k <= P.hip - 1 - t.top; k++) {
          const x = up ? t.x1 - 1 - k : side ? t.x0 + 1 + (k > 3 ? 1 : 0) : t.x0 + 1 + k;
          L.px(x, t.top + k, 'b', 3); L.px(x + 1, t.top + k, 'b', 1);
        }
        break;
      case 'pauldrons':
        for (const a of P.arms) {
          if (side && a.back) continue;
          L.withTag(a.tag, () => {
            const [x0, x1] = a.rows.get(a.top);
            const ext = side ? [x0 - 1, x1 + 1] : a.side === 'l' ? [x0 - 1, x1 + 1] : [x0 - 1, x1 + 1];
            L.hline(ext[0], ext[1], a.top - 1, 'c', 3); L.hline(ext[0], ext[1], a.top, 'c', 2); L.hline(ext[0], ext[1], a.top + 1, 'c', 1);
            L.px(ext[0], a.top - 1, 'c', 4);
          });
        }
        break;
      case 'furcollar': {
        const [a, b] = rowSpan(P, t.top);
        for (let x = a - 1; x <= b + 1; x++) { L.px(x, t.top - 1 + ((x * 3) % 2), 'b', (x % 3) ? 3 : 4); L.px(x, t.top, 'b', (x % 2) ? 2 : 3); }
        break;
      }
      case 'capelet': // capinha nos ombros
        for (let y = t.top; y <= t.top + 3; y++) {
          const [a, b] = rowSpan(P, y);
          const xa = (side ? a : a) - (y <= t.top + 2 ? 2 : 1);
          const xb = (side ? b + 1 : b) + (y <= t.top + 2 ? 2 : 1);
          for (let x = xa; x <= xb; x++) L.withTag('arm', () => L.px(x, y, 'b', y === t.top + 3 ? 1 : x <= xa + 1 ? 3 : 2));
        }
        break;
      case 'emblem':
        if (!up) { const x = side ? t.x0 + 2 : 10; L.art(x, t.top + 2, side ? ['c', 'C'] : ['.c.', 'cCc', '.c.'], { c: ['c', 3], C: ['c', 4] }); }
        break;
      case 'pocket':
        if (!up) { const x = side ? t.x0 + 1 : t.x0 + 1; L.hline(x, x + 2, t.top + 2, 'b', 3); L.hline(x, x + 2, t.top + 3, 'b', 1); }
        break;
      case 'apron': // avental: painel b na frente, do peito a barra
        if (up) break;
        for (const [x, y] of cells) {
          if (y < t.top + 2) continue;
          const inside = side ? x <= t.x0 + 1 : Math.abs(x - 11.5) < 3;
          if (inside) L.px(x, y, 'b', side ? 3 : x <= 10 ? 3 : x >= 13 ? 1 : 2);
        }
        break;
      case 'tabard': // tabardo: faixa b central da gola a barra (frente e costas)
        for (const [x, y] of cells) {
          const inside = side ? x <= t.x0 + 1 : Math.abs(x - 11.5) < 2;
          if (inside) L.px(x, y, 'b', x === 10 ? 3 : 2);
        }
        break;
      case 'rope': {
        const [a, b] = rowSpan(P, P.hip - 1);
        for (let x = a; x <= b; x++) L.px(x, P.hip - 1, 'b', x % 2 ? 3 : 1);
        if (!up) { const kx = side ? a : a + 2; L.px(kx, P.hip, 'b', 3); L.px(kx, P.hip + 1, 'b', 2); L.px(kx + 1, P.hip + 2, 'b', 1); }
        break;
      }
      case 'belt': {
        const [a, b] = rowSpan(P, P.hip - 1);
        L.hline(a, b, P.hip - 1, 'b', 1);
        if (!up) L.px(side ? a + 1 : 11, P.hip - 1, 'c', 4);
        break;
      }
      case 'tattered': {
        const end = Math.max(...cells.map(([, y]) => y));
        for (const [x, y] of cells) if (y === end && (x * 5) % 3 === 0) L.erase(x, y);
        for (const [x, y] of cells) if (y === end - 1 && (x * 7) % 5 === 0) L.erase(x, y);
        break;
      }
      case 'patch':
        if (!up) { const x = side ? t.x0 + 2 : t.x1 - 3; L.rect(x, t.top + 4, 2, 2, 'b', 2); L.px(x, t.top + 4, 'b', 3); }
        break;
      case 'ribs': // costelas de couro/osso (armadura leve)
        for (let y = t.top + 2; y <= P.hip - 2; y += 2) { const [a, b] = rowSpan(P, y); L.hline(a + 1, b - 1, y, 'c', 3); }
        break;
      case 'chest': // peitoral de placa por cima
        for (let y = t.top + 1; y <= P.hip - 2; y++) {
          const [a, b] = rowSpan(P, y);
          for (let x = a; x <= b; x++) L.px(x, y, 'c', x <= a + 1 ? 4 : x >= b - 1 ? 1 : y === t.top + 1 ? 3 : 2);
        }
        if (!up && !side) for (let y = t.top + 2; y <= P.hip - 2; y++) L.px(11, y, 'c', 3);
        break;
      case 'shoulderstrap': // alca de um ombro so (o outro braco fica a mostra)
        if (!up && !side) { for (let y = t.top; y <= t.top + 2; y++) for (let x = 13; x <= t.x1; x++) L.erase(x, y); L.px(14, t.top, 'b', 2); L.px(15, t.top + 1, 'b', 2); }
        break;
      case 'buttonsSide':
        if (!up) for (let y = t.top + 1; y <= P.hip - 1; y += 2) L.px(side ? t.x0 : t.x0 + 1, y, 'c', 4);
        break;
      case 'embroidery': {
        const end = Math.max(...cells.map(([, y]) => y));
        for (const [x, y] of cells) if (y === end - 1 && x % 2 === 0) L.px(x, y, 'c', 4);
        if (!up && !side) { L.px(10, t.top + 1, 'c', 4); L.px(13, t.top + 1, 'c', 3); }
        break;
      }
      default:
    }
  }
}

function garment(o) {
  return (L, P) => {
    const cells = paintBody(L, P, o);
    pattern(L, P, o, cells);
    hemTrim(L, P, o, cells);
    extras(L, P, o, cells);
    neckline(L, P, o);
    closure(L, P, o, cells);
    sleeves(L, P, o);
  };
}

const ch3 = (a, b = 'couro-escuro', c = 'bronze', labels = ['Tecido', 'Detalhe', 'Metal']) => [{ label: labels[0], def: a }, { label: labels[1], def: b }, { label: labels[2], def: c }];
const t = (id, name, sub, o, channels) => ({ id, name, sub, channels: channels || ch3(o.a || 'linho', o.b || 'couro-escuro', o.c || 'bronze'), draw: garment(o) });

const CA = 'Camisas e blusas', TU = 'Túnicas', CO = 'Coletes e corpetes', CS = 'Casacos e gibões', RO = 'Robes e mantos', VE = 'Vestidos', AR = 'Armaduras', RU = 'Rústicos e trapos';

export const TORSO = [
  // ---- camisas e blusas ----
  t('tunica-simples', 'Túnica simples', TU, { sleeve: 'short', neck: 'crew', len: 1, a: 'linho' }),
  t('camisa-linho', 'Camisa de linho', CA, { sleeve: 'long', neck: 'v', close: 'laces', a: 'branco-gasto', b: 'couro' }),
  t('camisa-manga-curta', 'Camisa de manga curta', CA, { sleeve: 'short', neck: 'crew', a: 'linho' }),
  t('camisa-botoes', 'Camisa de botões', CA, { sleeve: 'long', neck: 'high', close: 'buttons', a: 'branco-gasto', c: 'osso' }),
  t('camisa-listrada', 'Camisa listrada', CA, { sleeve: 'elbow', neck: 'crew', pattern: 'hstripes', a: 'branco-gasto', b: 'azul-noite' }),
  t('camisa-xadrez', 'Camisa xadrez', CA, { sleeve: 'long', neck: 'open', close: 'buttons', pattern: 'plaid', a: 'sangue', b: 'carvao' }),
  t('camisa-bufante', 'Camisa bufante', CA, { sleeve: 'puff', neck: 'deepv', close: 'laces', a: 'branco-gasto', b: 'linho' }),
  t('camisa-pirata', 'Camisa de pirata', CA, { sleeve: 'bell', neck: 'deepv', trim: 'collar', a: 'branco-gasto', b: 'linho' }),
  t('blusa-ombro-a-ombro', 'Blusa ombro a ombro', CA, { sleeve: 'puff', neck: 'boat', trim: 'collar', a: 'rosa-seco', b: 'branco-gasto' }),
  t('blusa-gola-alta', 'Blusa de gola alta', CA, { sleeve: 'tight', neck: 'high', a: 'carvao' }),
  t('regata', 'Regata', CA, { sleeve: 'none', neck: 'square', a: 'linho' }),
  t('regata-listrada', 'Regata listrada', CA, { sleeve: 'none', neck: 'crew', pattern: 'vstripes', a: 'osso', b: 'vinho' }),
  t('camisa-bolso', 'Camisa com bolso', CA, { sleeve: 'elbow', neck: 'open', close: 'buttons', extra: ['pocket'], a: 'oliva', b: 'musgo' }),
  t('camisa-bordada', 'Camisa bordada', CA, { sleeve: 'long', neck: 'square', trim: 'collar', extra: ['embroidery'], a: 'branco-gasto', b: 'carmesim', c: 'ouro' }),
  t('blusa-poa', 'Blusa de poá', CA, { sleeve: 'short', neck: 'v', pattern: 'dots', a: 'azul-aco', b: 'osso' }),
  t('camisa-trespassada', 'Camisa trespassada', CA, { sleeve: 'long', neck: 'v', close: 'wrap', a: 'linho', b: 'camurca' }),
  t('camiseta-gola-v', 'Camiseta gola V', CA, { sleeve: 'cap', neck: 'v', a: 'musgo' }),
  t('blusa-camponesa', 'Blusa camponesa', CA, { sleeve: 'puff', neck: 'square', close: 'laces', trim: 'collar', a: 'osso', b: 'vinho' }),
  // ---- tunicas ----
  t('tunica-viajante', 'Túnica de viajante', TU, { sleeve: 'long', neck: 'v', len: 2, extra: ['belt'], a: 'oliva', b: 'couro-escuro' }),
  t('tunica-curta', 'Túnica curta', TU, { sleeve: 'cap', neck: 'crew', len: 1, extra: ['rope'], a: 'linho', b: 'camurca' }),
  t('tunica-acabamento', 'Túnica com acabamento', TU, { sleeve: 'short', neck: 'crew', len: 2, trim: 'full', a: 'azul-aco', b: 'ocre' }),
  t('tunica-sacerdote', 'Túnica de sacerdote', TU, { sleeve: 'bell', neck: 'high', len: 2, extra: ['tabard'], a: 'branco-gasto', b: 'ouro' }),
  t('tunica-bordada', 'Túnica bordada', TU, { sleeve: 'long', neck: 'square', len: 2, trim: 'hem', extra: ['embroidery'], a: 'vinho', b: 'ouro', c: 'ouro' }),
  t('tunica-cacador', 'Túnica de caçador', TU, { sleeve: 'elbow', neck: 'v', close: 'laces', len: 2, extra: ['belt'], a: 'floresta', b: 'couro' }),
  t('tunica-capuz', 'Túnica com capuz', TU, { sleeve: 'long', neck: 'hood', len: 2, a: 'terra', b: 'camurca' }),
  t('tunica-faixa', 'Túnica com faixa', TU, { sleeve: 'short', neck: 'v', len: 2, extra: ['sash'], a: 'linho', b: 'carmesim' }),
  t('tunica-xadrez', 'Túnica xadrez', TU, { sleeve: 'long', neck: 'crew', len: 2, pattern: 'checks', a: 'mostarda', b: 'couro' }),
  t('tunica-sem-manga', 'Túnica sem manga', TU, { sleeve: 'none', neck: 'crew', len: 2, extra: ['rope'], a: 'camurca', b: 'couro-escuro' }),
  t('tunica-monge', 'Túnica de monge', TU, { sleeve: 'bell', neck: 'cowl', len: 2, extra: ['rope'], a: 'terra', b: 'camurca' }),
  t('tunica-ritual', 'Túnica ritual', TU, { sleeve: 'short', neck: 'v', len: 2, pattern: 'diamond', trim: 'hem', a: 'ameixa', b: 'ouro' }),
  // ---- coletes e corpetes ----
  t('colete-couro', 'Colete de couro', CO, { sleeve: 'long', neck: 'v', extra: ['vest'], a: 'branco-gasto', b: 'couro' }),
  t('colete-botoes', 'Colete de botões', CO, { sleeve: 'long', neck: 'high', close: 'double', extra: ['vest'], a: 'branco-gasto', b: 'vinho', c: 'ouro' }),
  t('colete-pele', 'Colete de pele', CO, { sleeve: 'none', neck: 'v', pattern: 'fur', extra: ['vest'], a: 'linho', b: 'camurca' }),
  t('colete-acolchoado', 'Colete acolchoado', CO, { sleeve: 'elbow', neck: 'crew', pattern: 'quilt', extra: ['vest'], a: 'linho', b: 'oliva' }),
  t('corpete-amarrado', 'Corpete amarrado', CO, { sleeve: 'puff', neck: 'square', extra: ['corset'], a: 'branco-gasto', b: 'vinho', c: 'osso' }),
  t('corpete-couro', 'Corpete de couro', CO, { sleeve: 'none', neck: 'square', extra: ['corset'], a: 'osso', b: 'couro-escuro', c: 'bronze' }),
  t('corpete-nobre', 'Corpete nobre', CO, { sleeve: 'bell', neck: 'boat', trim: 'collar', extra: ['corset'], a: 'ameixa', b: 'ouro', c: 'ouro' }),
  t('colete-bardo', 'Colete de bardo', CO, { sleeve: 'puff', neck: 'deepv', extra: ['vest', 'emblem'], a: 'branco-gasto', b: 'carmesim', c: 'ouro' }),
  t('colete-ferreiro', 'Colete de ferreiro', CO, { sleeve: 'none', neck: 'crew', extra: ['apron'], a: 'chumbo', b: 'couro' }),
  t('avental-cozinha', 'Avental de cozinha', CO, { sleeve: 'elbow', neck: 'crew', len: 1, extra: ['apron'], a: 'azul-aco', b: 'branco-gasto' }),
  t('colete-listrado', 'Colete listrado', CO, { sleeve: 'short', neck: 'v', pattern: 'vstripes', extra: ['vest'], a: 'osso', b: 'azul-noite' }),
  t('colete-bolsos', 'Colete de bolsos', CO, { sleeve: 'long', neck: 'crew', extra: ['vest', 'pocket'], a: 'linho', b: 'oliva' }),
  // ---- casacos e gibões ----
  t('gibao', 'Gibão', CS, { sleeve: 'long', neck: 'high', close: 'buttons', len: 1, pattern: 'quilt', a: 'vinho', c: 'ouro' }),
  t('gibao-acolchoado', 'Gibão acolchoado', CS, { sleeve: 'long', neck: 'crew', close: 'seam', len: 1, pattern: 'quilt', trim: 'cuffs', a: 'linho', b: 'couro' }),
  t('casaco-longo', 'Casaco longo', CS, { sleeve: 'long', neck: 'open', close: 'double', len: 3, a: 'azul-noite', b: 'carvao', c: 'prata' }),
  t('casaco-capitao', 'Casaco de capitão', CS, { sleeve: 'bell', neck: 'open', close: 'double', len: 2, trim: 'full', a: 'vinho', b: 'ouro', c: 'ouro' }),
  t('casaco-pele', 'Casaco com gola de pele', CS, { sleeve: 'long', neck: 'crew', close: 'toggles', len: 2, extra: ['furcollar'], a: 'couro', b: 'osso', c: 'osso' }),
  t('jaqueta-couro', 'Jaqueta de couro', CS, { sleeve: 'long', neck: 'open', close: 'seam', extra: ['belt'], a: 'couro-escuro', b: 'couro' }),
  t('sobretudo', 'Sobretudo', CS, { sleeve: 'long', neck: 'high', close: 'buttons', len: 3, extra: ['belt'], a: 'chumbo', b: 'couro-escuro' }),
  t('casaco-viajante', 'Casaco de viajante', CS, { sleeve: 'long', neck: 'hood', close: 'toggles', len: 2, a: 'terra', b: 'linho', c: 'madeira' }),
  t('casaco-militar', 'Casaco militar', CS, { sleeve: 'long', neck: 'high', close: 'double', len: 1, extra: ['pauldrons'], a: 'azul-aco', c: 'ouro', b: 'carvao' }),
  t('casaco-erudito', 'Casaco de erudito', CS, { sleeve: 'long', neck: 'open', close: 'buttons', len: 2, extra: ['pocket'], a: 'ameixa', b: 'carvao', c: 'prata' }),
  t('gibao-listrado', 'Gibão listrado', CS, { sleeve: 'puff', neck: 'high', close: 'buttons', len: 1, pattern: 'vstripes', a: 'carmesim', b: 'ocre', c: 'ouro' }),
  t('casaco-capinha', 'Casaco com capinha', CS, { sleeve: 'long', neck: 'high', close: 'buttons', len: 2, extra: ['capelet'], a: 'carvao', b: 'vinho', c: 'prata' }),
  t('jaqueta-acolchoada', 'Jaqueta acolchoada', CS, { sleeve: 'long', neck: 'high', close: 'seam', pattern: 'quilt', extra: ['furcollar'], a: 'oliva', b: 'camurca' }),
  t('casaco-trespassado', 'Casaco trespassado', CS, { sleeve: 'long', neck: 'v', close: 'wrap', len: 2, extra: ['belt'], a: 'petroleo', b: 'couro-escuro' }),
  // ---- robes e mantos ----
  t('robe-mago', 'Robe de mago', RO, { sleeve: 'bell', neck: 'v', len: 4, trim: 'full', a: 'azul-noite', b: 'ouro' }),
  t('robe-estrelado', 'Robe estrelado', RO, { sleeve: 'bell', neck: 'high', len: 4, pattern: 'dots', a: 'anil', b: 'ouro' }),
  t('robe-capuz', 'Robe com capuz', RO, { sleeve: 'bell', neck: 'hood', len: 4, extra: ['rope'], a: 'carvao', b: 'chumbo' }),
  t('robe-sacerdotal', 'Robe sacerdotal', RO, { sleeve: 'bell', neck: 'cowl', len: 4, extra: ['tabard'], a: 'branco-gasto', b: 'ouro' }),
  t('robe-necromante', 'Robe de necromante', RO, { sleeve: 'bell', neck: 'high', len: 4, extra: ['tattered', 'ribs'], a: 'carvao', b: 'ameixa', c: 'osso' }),
  t('robe-alquimista', 'Robe de alquimista', RO, { sleeve: 'long', neck: 'open', len: 3, extra: ['apron', 'pocket'], a: 'jade', b: 'couro' }),
  t('manto-peregrino', 'Manto de peregrino', RO, { sleeve: 'long', neck: 'hood', len: 3, extra: ['sash'], a: 'linho', b: 'terra' }),
  t('robe-druida', 'Robe de druida', RO, { sleeve: 'bell', neck: 'v', len: 4, pattern: 'diamond', extra: ['rope'], a: 'floresta', b: 'musgo' }),
  t('robe-curto', 'Robe curto', RO, { sleeve: 'long', neck: 'v', len: 3, close: 'wrap', extra: ['belt'], a: 'arcano', b: 'carvao' }),
  t('robe-oriental', 'Robe transpassado', RO, { sleeve: 'bell', neck: 'v', len: 4, close: 'wrap', extra: ['sash'], a: 'carmesim', b: 'ouro' }),
  t('robe-erudito', 'Robe de erudito', RO, { sleeve: 'bell', neck: 'square', len: 4, trim: 'collar', close: 'buttons', a: 'vinho', b: 'carvao', c: 'ouro' }),
  t('manto-xama', 'Manto de xamã', RO, { sleeve: 'long', neck: 'cowl', len: 3, pattern: 'fur', extra: ['embroidery'], a: 'camurca', b: 'couro', c: 'osso' }),
  t('robe-cultista', 'Robe de cultista', RO, { sleeve: 'bell', neck: 'hood', len: 4, trim: 'hem', extra: ['emblem'], a: 'sangue', b: 'carvao', c: 'ouro' }),
  // ---- vestidos ----
  t('vestido-simples', 'Vestido simples', VE, { sleeve: 'short', neck: 'square', len: 4, a: 'azul-aco' }),
  t('vestido-camponesa', 'Vestido de camponesa', VE, { sleeve: 'puff', neck: 'square', len: 4, extra: ['corset', 'apron'], a: 'mostarda', b: 'branco-gasto', c: 'couro' }),
  t('vestido-corpete', 'Vestido com corpete', VE, { sleeve: 'elbow', neck: 'deepv', len: 4, extra: ['corset'], a: 'floresta', b: 'couro-escuro', c: 'bronze' }),
  t('vestido-nobre', 'Vestido nobre', VE, { sleeve: 'bell', neck: 'boat', len: 4, trim: 'full', extra: ['embroidery'], a: 'vinho', b: 'ouro', c: 'ouro' }),
  t('vestido-curto', 'Vestido curto', VE, { sleeve: 'cap', neck: 'v', len: 3, extra: ['belt'], a: 'rosa-seco', b: 'couro' }),
  t('vestido-listrado', 'Vestido listrado', VE, { sleeve: 'short', neck: 'crew', len: 4, pattern: 'hstripes', a: 'osso', b: 'petroleo' }),
  t('vestido-sem-manga', 'Vestido sem manga', VE, { sleeve: 'none', neck: 'v', len: 4, extra: ['sash'], a: 'jade', b: 'ouro' }),
  t('vestido-xadrez', 'Vestido xadrez', VE, { sleeve: 'puff', neck: 'square', len: 3, pattern: 'checks', a: 'carmesim', b: 'osso' }),
  t('vestido-viuva', 'Vestido de viúva', VE, { sleeve: 'tight', neck: 'high', len: 4, close: 'buttons', a: 'carvao', c: 'prata' }),
  t('vestido-um-ombro', 'Vestido de um ombro', VE, { sleeve: 'none', neck: 'boat', len: 4, extra: ['shoulderstrap'], a: 'arcano', b: 'prata' }),
  t('vestido-festa', 'Vestido de festa', VE, { sleeve: 'puff', neck: 'boat', len: 4, pattern: 'dots', trim: 'hem', a: 'ameixa', b: 'ouro' }),
  // ---- armaduras ----
  t('cota-malha', 'Cota de malha', AR, { sleeve: 'elbow', neck: 'crew', len: 1, pattern: 'chain', a: 'ferro', c: 'ferro' }),
  t('cota-malha-longa', 'Cota de malha longa', AR, { sleeve: 'long', neck: 'high', len: 2, pattern: 'chain', a: 'aco', c: 'aco' }),
  t('armadura-placas', 'Armadura de placas', AR, { sleeve: 'long', neck: 'high', pattern: 'plates', extra: ['pauldrons'], a: 'aco', c: 'aco' }),
  t('peitoral-aco', 'Peitoral de aço', AR, { sleeve: 'short', neck: 'crew', extra: ['chest'], a: 'linho', c: 'aco' }),
  t('peitoral-ombreiras', 'Peitoral com ombreiras', AR, { sleeve: 'long', neck: 'crew', extra: ['chest', 'pauldrons'], a: 'chumbo', c: 'ferro' }),
  t('brigantina', 'Brigantina', AR, { sleeve: 'long', neck: 'v', pattern: 'quilt', close: 'buttons', extra: ['vest'], a: 'linho', b: 'vinho', c: 'bronze' }),
  t('couraca-couro', 'Couraça de couro', AR, { sleeve: 'short', neck: 'crew', extra: ['ribs', 'belt'], a: 'couro', b: 'couro-escuro', c: 'couro-escuro' }),
  t('armadura-escamas', 'Armadura de escamas', AR, { sleeve: 'elbow', neck: 'crew', len: 1, pattern: 'scale', a: 'bronze', c: 'bronze' }),
  t('armadura-tabardo', 'Armadura com tabardo', AR, { sleeve: 'long', neck: 'high', len: 2, pattern: 'chain', extra: ['tabard', 'emblem'], a: 'aco', b: 'azul-aco', c: 'ouro' }),
  t('gambesao', 'Gambesão', AR, { sleeve: 'long', neck: 'high', len: 1, pattern: 'quilt', close: 'seam', a: 'linho' }),
  t('armadura-osso', 'Armadura de ossos', AR, { sleeve: 'cap', neck: 'crew', extra: ['ribs', 'pauldrons'], a: 'couro-escuro', c: 'osso' }),
  t('armadura-ferro-negro', 'Armadura de ferro negro', AR, { sleeve: 'long', neck: 'high', pattern: 'plates', extra: ['pauldrons', 'emblem'], a: 'ferro-negro', c: 'ferro-negro' }),
  // ---- rusticos e trapos ----
  t('trapos', 'Trapos', RU, { sleeve: 'short', neck: 'crew', len: 2, extra: ['tattered', 'patch'], a: 'terra', b: 'linho' }),
  t('camisa-remendada', 'Camisa remendada', RU, { sleeve: 'elbow', neck: 'v', pattern: 'patches', a: 'linho', b: 'camurca' }),
  t('pele-de-animal', 'Pele de animal', RU, { sleeve: 'none', neck: 'boat', len: 2, pattern: 'fur', extra: ['tattered', 'shoulderstrap'], a: 'camurca', b: 'couro' }),
  t('saco-de-estopa', 'Túnica de estopa', RU, { sleeve: 'cap', neck: 'crew', len: 2, pattern: 'checks', extra: ['rope'], a: 'linho', b: 'camurca' }),
  t('camisa-rasgada', 'Camisa rasgada', RU, { sleeve: 'short', neck: 'deepv', extra: ['tattered'], a: 'branco-gasto' }),
  t('manto-mendigo', 'Manto de mendigo', RU, { sleeve: 'long', neck: 'hood', len: 3, extra: ['tattered', 'patch'], a: 'chumbo', b: 'terra' }),
  t('colete-tribal', 'Colete tribal', RU, { sleeve: 'none', neck: 'deepv', pattern: 'diamond', extra: ['vest', 'embroidery'], a: 'camurca', b: 'carmesim', c: 'osso' }),
  t('bata-pescador', 'Bata de pescador', RU, { sleeve: 'elbow', neck: 'square', len: 1, pattern: 'hstripes', extra: ['patch'], a: 'azul-aco', b: 'osso' }),
  t('blusao-la', 'Blusão de lã', RU, { sleeve: 'long', neck: 'high', pattern: 'diamond', trim: 'cuffs', a: 'mostarda', b: 'osso' }),
  t('poncho', 'Poncho', RU, { sleeve: 'none', neck: 'crew', len: 2, pattern: 'hstripes', extra: ['capelet'], a: 'ferrugem', b: 'ocre' })
];
