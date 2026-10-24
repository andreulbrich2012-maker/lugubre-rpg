// Prompt para qualquer IA (servidor ou copiar/colar no ChatGPT/Claude/Gemini) gerar
// um mapa no nosso formato, e o leitor tolerante da resposta.
import { TILES, CATEGORIES, DEFAULT_GROUND } from './catalog.js';
import { repairMap } from './format.js';

export function catalogText() {
  return CATEGORIES.map((cat) => {
    const items = TILES.filter((t) => t.category === cat)
      .map((t) => `"${t.code}" ${t.name} (${t.layer === 'ground' ? 'chão' : 'objeto'}${t.solid ? ', bloqueia' : ''})`);
    return items.length ? `${cat}: ${items.join('; ')}` : '';
  }).filter(Boolean).join('\n');
}

const EXAMPLE = {
  name: 'Taverna na clareira',
  layers: {
    ground: [
      '............',
      '.##########.',
      '.#========#.',
      '.#========#.',
      '.#========#.',
      '.####D#####.',
      '.....;......',
      '.....;......'
    ],
    objects: [
      'T  A      bT',
      '            ',
      '  E  n h C  ',
      '   hnh  u   ',
      '  r    F q  ',
      '            ',
      '  f      o  ',
      'T    m     T'
    ]
  },
  notes: 'Taverna fechada por paredes de pedra, porta ao sul ligada à estrada.'
};

export function buildMapPrompt({ description, cols, rows }) {
  return `Você é um cartógrafo de RPG de fantasia sombria (mesa virtual "Lúgubre RPG").
Crie um mapa visto de cima, em grade, para: ${String(description || '').trim() || 'um mapa livre e interessante'}

FORMATO
- A grade tem ${cols} colunas e ${rows} linhas.
- Há duas camadas, cada uma com EXATAMENTE ${rows} textos de EXATAMENTE ${cols} caracteres.
- "ground" (chão): todo caractere é um código de chão. Vazio = "${DEFAULT_GROUND}" (grama).
- "objects" (objetos por cima do chão): use espaço " " para célula vazia; só códigos de objeto.

CÓDIGOS (cada caractere é um bloco; "bloqueia" = não dá para andar por cima)
${catalogText()}

REGRAS
- Paredes ("#", "B", "M") fecham os cômodos; portas ("D" ou "X") e janelas ("J") ficam DENTRO da linha da parede.
- Todo cômodo tem pelo menos uma porta; caminhos/estradas ligam as entradas.
- Água, pântano e lava formam áreas contínuas, não pontos soltos; use ponte ("-") para atravessar rio.
- Paredes, portas, escadas, água e pisos só na camada "ground"; móveis, árvores e decoração só em "objects".
- Objeto que bloqueia não pode tapar porta nem fechar a única passagem.
- Bordas coerentes: floresta, água ou paredes nas margens; nada cortado pela metade.
- Não invente códigos e não use aspas nem barra invertida na grade.

RESPOSTA
Responda SOMENTE com este JSON, sem texto antes ou depois e sem comentários:
{"name": "...", "layers": {"ground": [...], "objects": [...]}, "notes": "uma frase sobre o mapa"}

EXEMPLO (12×8, só para mostrar o formato):
${JSON.stringify(EXAMPLE, null, 1)}`;
}

// Acha o primeiro objeto JSON balanceado a partir de cada "{" (ignora texto em volta).
function findJsonObjects(text) {
  const found = [];
  for (let start = text.indexOf('{'); start !== -1; start = text.indexOf('{', start + 1)) {
    let depth = 0;
    let inStr = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (ch === '\\') i++;
        else if (ch === '"') inStr = false;
      } else if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) {
        try { found.push(JSON.parse(text.slice(start, i + 1))); } catch { /* tenta o proximo */ }
        break;
      }
    }
    if (found.length) break;
  }
  return found;
}

function layersFrom(obj) {
  const src = obj?.layers || obj?.tiles?.layers || obj?.tiles || obj?.map?.layers || obj;
  if (src && (src.ground || src.objects)) return { ground: src.ground, objects: src.objects };
  return null;
}

// Ultimo recurso: linhas que parecem grade crua (so codigos de chao/objeto).
function rawGrid(text) {
  const codes = new Set(TILES.map((t) => t.code));
  const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*"|",?\s*$/g, ''));
  let best = [];
  let cur = [];
  for (const line of lines) {
    const chars = [...line];
    const known = chars.filter((ch) => codes.has(ch)).length;
    if (line.trim().length >= 4 && known / chars.length >= 0.8) cur.push(line);
    else { if (cur.length > best.length) best = cur; cur = []; }
  }
  if (cur.length > best.length) best = cur;
  // palavras como "Mapa:" tambem sao codigos validos: fica so o comprimento mais comum
  const counts = {};
  for (const l of best) counts[l.length] = (counts[l.length] || 0) + 1;
  const width = Number(Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]);
  best = best.filter((l) => l.length === width);
  return best.length >= 2 ? best : null;
}

// Devolve {ok, map, name, notes, warnings}. map ja vem consertado no tamanho pedido.
export function parseMapResponse(text, cols, rows) {
  const src = String(text || '');
  const fenced = [...src.matchAll(/```[a-zA-Z]*\s*\n?([\s\S]*?)```/g)].map((m) => m[1]);
  for (const chunk of [...fenced, src]) {
    const obj = findJsonObjects(chunk)[0];
    const layers = obj && layersFrom(obj);
    if (layers) {
      const { map, warnings } = repairMap({ layers }, { cols, rows });
      return { ok: true, map, name: obj.name || '', notes: obj.notes || '', warnings };
    }
  }
  const grid = rawGrid(fenced[0] || src);
  if (grid) {
    const { map, warnings } = repairMap({ layers: { ground: grid, objects: [] } }, { cols, rows });
    return { ok: true, map, name: '', notes: '', warnings: ['Li só a grade (sem JSON); objetos foram separados pelo código.', ...warnings] };
  }
  return { ok: false, map: null, name: '', notes: '', warnings: ['Não encontrei um mapa na resposta. Confira se colou o JSON inteiro.'] };
}
