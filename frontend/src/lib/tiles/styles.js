// Estilos de mapa (24/10): "filtro" global escolhido por cena (map.style). E uma transformacao
// de cor por pixel, deterministica e pura (sem DOM): igual no navegador, no preview em node e
// em todos os clientes. Aplicada UMA vez nas camadas cacheadas (terreno/objetos), nunca por
// quadro; o ciclo de luz (dia/entardecer/noite) continua por cima.
// Cada estilo e uma receita de passos (troca de matiz por faixa, saturacao, curvas, mapa de
// gradiente, tom dividido sombra/luz, posterizacao). Pixel art tem poucas cores: o resultado
// de cada cor e memorizado, entao aplicar num mapa 80x80 custa quase so a leitura dos pixels.

// ---------- cor ----------
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const luma = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

function toHsl([r, g, b]) {
  const max = Math.max(r, g, b); const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}
function fromHsl([h, s, l]) {
  h = ((h % 360) + 360) % 360 / 360;
  if (!s) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
// distancia angular entre matizes (0..180)
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
// caminho mais curto de a ate b (com sinal)
const hueDelta = (a, b) => { let d = (b - a) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };

// ---------- passos (cada um: rgb 0..1 -> rgb 0..1) ----------
// Puxa matizes perto de "from" (largura "width" graus) para "to"; sat/light multiplicam la.
const hueMove = (from, to, { width = 50, amount = 1, sat = 1, light = 0 } = {}) => (c) => {
  const [h, s, l] = toHsl(c);
  if (s < 0.04) return c;
  const w = Math.max(0, 1 - hueDist(h, from) / width) * amount;
  if (!w) return c;
  return fromHsl([h + hueDelta(h, to) * w, clamp01(s * (1 + (sat - 1) * w)), clamp01(l + light * w)]);
};
const hsl = ({ h = 0, s = 1, l = 0, lmul = 1 } = {}) => (c) => {
  const [H, S, L] = toHsl(c);
  return fromHsl([H + h, clamp01(S * s), clamp01(L * lmul + l)]);
};
// Saturacao que poupa o que ja e muito saturado (vibrance) ou nao.
const vibrance = (v) => (c) => {
  const [h, s, l] = toHsl(c);
  return fromHsl([h, clamp01(s + (1 - s) * s * v), l]);
};
// Curva de luminancia: contraste em volta de "pivot", gamma, piso (preto lavado) e teto.
const curve = ({ contrast = 1, gamma = 1, lift = 0, gain = 1, pivot = 0.5 } = {}) => (c) => c.map((v) => {
  let x = Math.pow(clamp01(v), gamma);
  x = (x - pivot) * contrast + pivot;
  return clamp01(lift + clamp01(x) * (gain - lift));
});
// Mapa de gradiente: luminancia -> rampa de cores; "amount" mistura com a cor original e
// "keep" devolve um pouco da saturacao original (os objetos continuam distinguiveis).
const gradient = (stops, { amount = 1, keep = 0 } = {}) => {
  const cols = stops.map(hex);
  return (c) => {
    const y = clamp01(luma(c)) * (cols.length - 1);
    const i = Math.min(cols.length - 2, Math.floor(y));
    const g = mix(cols[i], cols[i + 1], y - i);
    const out = mix(c, g, amount);
    if (!keep) return out;
    const [h, s] = toHsl(c);
    const [h2, s2, l2] = toHsl(out);
    // devolve um pouco do matiz e da saturacao originais (o gradiente nao vira monocromia total)
    const hk = s > 0.1 ? h2 + hueDelta(h2, h) * keep : h2;
    return fromHsl([hk, clamp01(s2 + (s - s2) * keep), l2]);
  };
};
// Tom dividido: sombras puxam para uma cor, luzes para outra (cinema).
const split = (shadowHex, lightHex, amount = 0.3, balance = 0.5) => {
  const sh = hex(shadowHex); const li = hex(lightHex);
  return (c) => {
    const y = luma(c);
    const ws = (1 - smooth(0, balance + 0.25, y)) * amount;
    const wl = smooth(balance - 0.25, 1, y) * amount;
    let o = c;
    o = mix(o, [o[0] * 0.4 + sh[0] * 0.6 * (0.5 + y), o[1] * 0.4 + sh[1] * 0.6 * (0.5 + y), o[2] * 0.4 + sh[2] * 0.6 * (0.5 + y)], ws);
    o = mix(o, [Math.max(o[0], li[0] * y + o[0] * (1 - y)), Math.max(o[1], li[1] * y + o[1] * (1 - y)), Math.max(o[2], li[2] * y + o[2] * (1 - y))], wl);
    return o;
  };
};
const tint = (h, amount, mode = 'mix') => {
  const t = hex(h);
  return (c) => {
    if (mode === 'multiply') return mix(c, [c[0] * t[0], c[1] * t[1], c[2] * t[2]], amount);
    if (mode === 'screen') return mix(c, c.map((v, k) => 1 - (1 - v) * (1 - t[k])), amount);
    if (mode === 'color') { const [hh, ss] = toHsl(t); const [, s, l] = toHsl(c); return mix(c, fromHsl([hh, Math.max(s, ss * 0.6), l]), amount); }
    return mix(c, t, amount);
  };
};
// Posteriza a luminancia (mantem matiz): cara de vitral/gravura.
const posterize = (levels) => (c) => {
  const [h, s, l] = toHsl(c);
  return fromHsl([h, s, Math.round(l * (levels - 1)) / (levels - 1)]);
};
// Quantiza o matiz em n fatias (cores "de vidro", mais puras).
const hueSteps = (n, amount = 1) => (c) => {
  const [h, s, l] = toHsl(c);
  const q = Math.round(h / (360 / n)) * (360 / n);
  return fromHsl([h + hueDelta(h, q) * amount, s, l]);
};
// Escuros viram contorno quase preto colorido (vitral: chumbo entre os vidros).
const leadLines = (below, h = '#140c1c') => { const t = hex(h); return (c) => (luma(c) < below ? mix(t, c, luma(c) / below * 0.35) : c); };
// Espalha os matizes (cada familia de cor fica mais longe da outra) + saturacao: arco-iris.
const hueSpread = (k) => (c) => {
  const [h, s, l] = toHsl(c);
  if (s < 0.08) return c;
  return fromHsl([h + Math.sin((h / 360) * Math.PI * 6) * k, s, l]);
};

const pipe = (...steps) => (c) => steps.reduce((acc, f) => f(acc), c);

// ---------- os estilos ----------
// Ordem = ordem do seletor. As descricoes aparecem como dica no editor.
const DEFS = [
  ['padrao', 'Padrão', 'As cores originais do mapa.', null],
  ['obscuro', 'Obscuro', 'Escuro, frio e dessaturado: masmorra, maldição, clima de terror.', pipe(
    hsl({ s: 0.4 }), tint('#4a6a9a', 0.18, 'color'), curve({ gamma: 1.35, contrast: 1.12, gain: 0.84 }), split('#141c38', '#a8b4cc', 0.5, 0.45)
  )],
  ['arco-iris', 'Arco-íris', 'Cores vivas e variadas, cada família de cor mais pura: reino feérico, festa.', pipe(
    hueSpread(30), vibrance(0.4), hsl({ s: 1.05 }), curve({ contrast: 1.06, gain: 0.96 }), split('#3a1e6a', '#fff4d0', 0.18)
  )],
  ['outono', 'Outono', 'Folhagem laranja e vermelha, luz dourada de fim de tarde.', pipe(
    // verde vira dourado/laranja com mais saturacao e um pouco mais claro (senao vira oliva/lama)
    hueMove(112, 30, { width: 72, amount: 0.92, sat: 1.35, light: 0.04 }), hueMove(150, 8, { width: 30, amount: 0.6, sat: 1.3 }),
    hueMove(60, 26, { width: 26, amount: 0.5 }), split('#3a1830', '#ffd8a0', 0.25), curve({ contrast: 1.06 })
  )],
  ['inverno', 'Inverno', 'Verde vira branco-azulado, sombras frias: tudo parece coberto de geada.', pipe(
    hueMove(105, 190, { width: 70, amount: 0.8, sat: 0.35, light: 0.22 }), hsl({ s: 0.7 }),
    split('#24365a', '#f2f8ff', 0.4, 0.4), curve({ gamma: 0.85, lift: 0.04 })
  )],
  ['primavera', 'Primavera', 'Verde-limão fresco, luz clara e um toque rosado de flor.', pipe(
    hueMove(120, 88, { width: 60, amount: 0.6, sat: 1.2, light: 0.05 }), vibrance(0.5),
    tint('#ffd6ea', 0.12, 'screen'), curve({ gamma: 0.9 })
  )],
  ['verao-tropical', 'Verão tropical', 'Saturado e quente: verde-esmeralda, água turquesa, sol forte.', pipe(
    hueMove(115, 140, { width: 50, amount: 0.5, sat: 1.25 }), hueMove(215, 185, { width: 40, amount: 0.7, sat: 1.2, light: 0.04 }),
    vibrance(0.7), split('#183a5a', '#fff0b0', 0.22), curve({ contrast: 1.1 })
  )],
  ['sepia', 'Sépia', 'Foto antiga em tons de marrom e creme: lembrança, flashback.', pipe(
    gradient(['#1e130e', '#4a3020', '#8a6440', '#c8a474', '#f4e4c0'], { amount: 0.92 }), curve({ contrast: 1.05, lift: 0.03 })
  )],
  ['noturno-azul', 'Noturno azul', 'Luar: tudo em azuis profundos, com as cores quentes ainda visíveis.', pipe(
    gradient(['#05081a', '#111c42', '#22407a', '#4c78b8', '#b0ccff'], { amount: 0.86, keep: 0.1 }), curve({ contrast: 1.1 })
  )],
  ['pastel', 'Pastel', 'Cores suaves e claras, pouco contraste: livro infantil, sonho.', pipe(
    hsl({ s: 0.8 }), hueMove(110, 135, { width: 50, amount: 0.4 }), curve({ contrast: 0.8, lift: 0.14, gamma: 0.8 }),
    split('#7a6aa0', '#fff0f6', 0.25, 0.5)
  )],
  ['neon', 'Neon', 'Fundo escuro e cores que brilham em magenta e ciano.', pipe(
    // fundo quase preto arroxeado; claros viram ciano/magenta que "acendem"
    hueMove(110, 172, { width: 70, amount: 0.85 }), hueMove(25, 312, { width: 50, amount: 0.9 }),
    hueMove(220, 205, { width: 40, amount: 0.5 }), hueMove(355, 320, { width: 25, amount: 0.7 }),
    (c) => { const [h, s, l] = toHsl(c); const g = Math.pow(l, 1.7); return fromHsl([h, s < 0.06 ? s : clamp01(0.55 + s * 0.6), clamp01(g * 1.15)]); },
    split('#12052a', '#e8fffa', 0.35, 0.6), posterize(7)
  )],
  ['gotico', 'Gótico', 'Cinza arroxeado de catedral com vermelho-sangue que sobressai.', pipe(
    (c) => { const [h, s, l] = toHsl(c); const red = hueDist(h, 355) < 30 ? 1 : 0; return fromHsl([red ? 352 : h, clamp01(s * (red ? 1.25 : 0.22)), l]); },
    curve({ contrast: 1.3, gamma: 1.2, pivot: 0.45 }), split('#1c1028', '#d8c8e0', 0.45, 0.45)
  )],
  ['vitral', 'Vitral', 'Tons de joia ricos (rubi, esmeralda, safira) com contornos escuros de chumbo.', pipe(
    // joias: verde-esmeralda, rubi e safira profundos (escurece os claros), chumbo nos escuros
    hueSteps(8, 0.55), hueMove(95, 140, { width: 40, amount: 0.6 }), hsl({ s: 1.3, lmul: 0.78 }),
    curve({ gamma: 1.2, contrast: 1.2 }), posterize(5), leadLines(0.14)
  )],
  ['cinzas', 'Cinzas', 'Mundo coberto de cinza: quase sem cor, pretos lavados, ruína e luto.', pipe(
    hsl({ s: 0.12 }), tint('#b8aca0', 0.12, 'multiply'), curve({ contrast: 0.85, lift: 0.08, gain: 0.92 })
  )],
  ['sangue', 'Sangue', 'Grade carmesim: sombras vinho, luzes rosadas. Massacre, lua vermelha.', pipe(
    gradient(['#0e0208', '#3e0614', '#7c0c22', '#c42c3c', '#ffc4c4'], { amount: 0.82, keep: 0.06 }), curve({ contrast: 1.12 })
  )],
  ['gelo', 'Gelo', 'Tudo congelado: azul-claro e branco, brilho de cristal.', pipe(
    gradient(['#0e2240', '#2c5c8c', '#62a4cc', '#ace2f2', '#f4fcff'], { amount: 0.72, keep: 0.15 }), curve({ gamma: 0.85, lift: 0.04 })
  )],
  ['floresta-encantada', 'Floresta encantada', 'Verde-água mágico com sombras violeta e brilho de vaga-lume.', pipe(
    hueMove(110, 165, { width: 60, amount: 0.7, sat: 1.2 }), hueMove(30, 290, { width: 30, amount: 0.35 }),
    split('#2a0e4a', '#9cffe0', 0.5, 0.5), curve({ contrast: 1.12, gamma: 1.05 })
  )],
  ['deserto', 'Deserto', 'Ocre e areia sob sol forte: verde vira palha seca.', pipe(
    hueMove(110, 40, { width: 80, amount: 0.9, sat: 0.95, light: 0.1 }), hueMove(210, 190, { width: 40, amount: 0.4, sat: 0.85 }),
    tint('#f4c888', 0.25, 'multiply'), curve({ gamma: 0.84, lift: 0.04 }), split('#6a2a1e', '#fff2d0', 0.22)
  )],
  ['pantano', 'Pântano', 'Verde-oliva turvo e úmido, névoa doente: brejo, bruxa, praga.', pipe(
    hueMove(210, 150, { width: 60, amount: 0.6 }), hsl({ s: 0.6 }), tint('#6e7a3c', 0.3, 'color'),
    curve({ contrast: 0.92, gamma: 1.12, lift: 0.04 }), split('#1e2a1a', '#d8e0a0', 0.3)
  )],
  ['aquarela', 'Aquarela', 'Leve e luminosa como pintura em papel: cores lavadas e quentes.', pipe(
    // cores ainda vivas, mas lavadas pela luz e pelo papel quente; sombras azuladas de tinta
    vibrance(0.3), curve({ contrast: 0.82, gamma: 0.72, lift: 0.06 }), split('#3a5a8a', '#fff6e4', 0.28, 0.5), tint('#f6ead2', 0.15, 'multiply')
  )]
];

export const STYLES = DEFS.map(([id, name, description]) => ({ id, name, description }));
export const STYLE_IDS = STYLES.map((s) => s.id);
const FN = Object.fromEntries(DEFS.map(([id, , , fn]) => [id, fn]));
const memo = new Map(); // estilo -> Map(rgb inteiro -> rgb inteiro)

export const isStyle = (id) => Object.prototype.hasOwnProperty.call(FN, id);
const active = (id) => Boolean(id && FN[id]);

// Uma cor (0..255) no estilo: [r, g, b]. Estilo desconhecido ou 'padrao' devolve igual.
export function styleRgb(r, g, b, styleId) {
  const fn = FN[styleId];
  if (!fn) return [r, g, b];
  let m = memo.get(styleId);
  if (!m) { m = new Map(); memo.set(styleId, m); }
  const key = (r << 16) | (g << 8) | b;
  let v = m.get(key);
  if (v === undefined) {
    const o = fn([r / 255, g / 255, b / 255]);
    v = (Math.round(clamp01(o[0]) * 255) << 16) | (Math.round(clamp01(o[1]) * 255) << 8) | Math.round(clamp01(o[2]) * 255);
    if (m.size < 200000) m.set(key, v);
  }
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

// Aplica no lugar num ImageData, num {data} (imagem do compose) ou num Uint8ClampedArray RGBA.
// Pixels transparentes ficam como estao. Devolve o mesmo objeto.
export function applyStyle(target, styleId) {
  if (!active(styleId) || styleId === 'padrao' || !target) return target;
  const d = target.data || target;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const [r, g, b] = styleRgb(d[i], d[i + 1], d[i + 2], styleId);
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  return target;
}

// Para sprites (avatar/monstro) e qualquer canvas pronto: aplica no proprio canvas.
// Uso: styleCanvas(canvas, scene.tiles.style). Sem DOM em node: so chama se tiver getContext.
export function styleCanvas(cv, styleId) {
  if (!active(styleId) || styleId === 'padrao' || !cv?.getContext) return cv;
  const ctx = cv.getContext('2d');
  const img = ctx.getImageData(0, 0, cv.width, cv.height);
  applyStyle(img, styleId);
  ctx.putImageData(img, 0, 0);
  return cv;
}

// Cor hex no estilo (para CSS: cor do brilho dos itens, borda, etc.).
export function styleHex(h, styleId) {
  const [r, g, b] = hex(h).map((v) => Math.round(v * 255));
  const o = styleRgb(r, g, b, styleId);
  return `#${o.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Copia estilizada de uma folha de sprites (avatar/monstro), feita uma vez por folha e estilo.
const STYLED = new WeakMap();
export function styledCopy(src, styleId) {
  if (!active(styleId) || styleId === 'padrao' || !src || typeof document === 'undefined') return src;
  let byStyle = STYLED.get(src);
  if (!byStyle) { byStyle = new Map(); STYLED.set(src, byStyle); }
  if (!byStyle.has(styleId)) {
    const cv = document.createElement('canvas');
    cv.width = src.width;
    cv.height = src.height;
    cv.getContext('2d').drawImage(src, 0, 0);
    byStyle.set(styleId, styleCanvas(cv, styleId));
  }
  return byStyle.get(styleId);
}
