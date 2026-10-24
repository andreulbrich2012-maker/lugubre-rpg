// Prompt para qualquer IA (servidor ou copiar/colar no ChatGPT/Claude/Gemini) gerar
// um mapa no nosso formato, e o leitor tolerante da resposta.
import { TILES, CATEGORIES, DEFAULT_GROUND } from './catalog.js';
import { repairMap, ITEM_CATEGORIES, MAX_ITEMS, MAX_BUILDINGS } from './format.js';

export function catalogText() {
  return CATEGORIES.map((cat) => {
    const items = TILES.filter((t) => t.category === cat)
      .map((t) => `"${t.code}" ${t.name} (${t.layer === 'ground' ? 'chão' : 'objeto'}${t.span ? `, grande ${t.span[0]}×${t.span[1]}` : ''}${t.solid ? ', bloqueia' : ''}${t.loot ? ', pode guardar itens' : ''})`);
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
  items: [
    { id: 'i1', x: 9, y: 2, name: 'Poção de cura menor', description: 'Frasco turvo que fecha cortes leves.', quantity: 1, weight: 0.5, category: 'Poções' },
    { id: 'i2', x: 9, y: 2, name: 'Bolsa de moedas', description: 'Couro gasto, cheira a cerveja.', quantity: 1, weight: 0.2, category: 'Tesouro', dracmas: 25 },
    { id: 'i3', x: 9, y: 4, name: 'Corda de cânhamo', description: '10 metros, um pouco úmida.', quantity: 1, weight: 1, category: 'Achados' }
  ],
  buildings: [
    { id: 'b1', x: 1, y: 1, w: 10, h: 5, name: 'Taverna do Corvo', roof: 'palha' }
  ],
  notes: 'Taverna fechada por paredes de pedra, porta ao sul ligada à estrada; o baú guarda moedas e uma poção.'
};

export function buildMapPrompt({ description, cols, rows }) {
  return `Você é um cartógrafo de RPG de fantasia sombria (mesa virtual "Lúgubre RPG": mundo medieval, gótico, perigoso; moeda = dracmas).
Crie um mapa visto de cima, em grade, para: ${String(description || '').trim() || 'um mapa livre e interessante'}

TAMANHO (obrigatório)
- EXATAMENTE ${cols} colunas e ${rows} linhas.
- "ground" e "objects": cada uma é uma lista de EXATAMENTE ${rows} textos, cada texto com EXATAMENTE ${cols} caracteres.
- Coordenadas: x = coluna (0 a ${cols - 1}, da esquerda para a direita), y = linha (0 a ${rows - 1}, de cima para baixo).

CAMADAS
- "ground" (chão): todo caractere é um código de chão. Vazio = "${DEFAULT_GROUND}" (grama).
- "objects" (por cima do chão): espaço " " = célula vazia; só códigos de objeto.

CÓDIGOS (cada caractere é um bloco; "bloqueia" = não dá para andar por cima)
${catalogText()}

COMO FAZER UM MAPA BOM
- Pense primeiro na planta: onde ficam as construções, os caminhos, a água e a natureza.
- Construções e salas são retângulos FECHADOS por paredes ("#", "B", "M" ou "H" em caverna) com piso dentro ("_", "=", "Q"...).
- Toda sala tem pelo menos uma porta ("D") DENTRO da linha da parede; janelas ("J") também ficam na parede.
- Caminhos/estradas (";", ",", "c") ligam as portas entre si e às bordas do mapa.
- Água, pântano e lava formam áreas contínuas (lagos, rios), nunca pontos soltos; ponte ("-") atravessa rio.
- Fora das construções: grama, terra, árvores e arbustos em grupos, bordas naturais (floresta, água, rocha).
- Interior mobiliado com sentido (taverna: mesas, cadeiras, barris; cripta: sarcófagos, ossos, altar).
- Objeto que bloqueia nunca tapa porta nem fecha a única passagem.
- Paredes, portas, escadas, água e pisos só em "ground"; móveis, árvores e decoração só em "objects".
- Não invente códigos e não use aspas nem barra invertida dentro da grade.
- Alguns códigos são letras acentuadas ("á", "Ô", "ç"...): copie exatamente como estão na lista.
- Objeto "grande L×A" (poço, moinho, carroça, barco, tenda...): escreva o código SÓ na célula de baixo à esquerda e deixe vazias (" ") as outras células que ele ocupa, à direita e acima. O desenho e o bloqueio ocupam a área toda sozinhos.
- O desenho final arredonda bordas entre terrenos, espalha flores, pedrinhas e folhas e põe telhado nas casas: não tente desenhar isso na grade.

CONSTRUÇÕES COM TELHADO ("buildings", até ${MAX_BUILDINGS})
- Para cada casa/taverna/capela com paredes, registre o retângulo INTEIRO incluindo as paredes:
  {"id": "b1", "x": coluna do canto esquerdo, "y": linha de cima, "w": largura, "h": altura, "name": "nome curto", "roof": "telha" | "palha" | "ardosia" | "madeira"}
- O retângulo bate exatamente com as paredes da grade (w e h ≥ 3). Masmorras, cavernas e ruínas sem teto NÃO entram em "buildings".

ITENS PEGÁVEIS ("items", até ${MAX_ITEMS})
- Coloque itens só onde faz sentido saquear: objetos marcados "pode guardar itens" (baú, tesouro, prateleira de poções, livros, caixote, barril, ossos, corpo caído, altar, sarcófago...) ou no chão de um lugar plausível.
- Nem todo objeto tem item. Um baú guarda de 1 a 3 itens (vários itens podem ter o mesmo x,y).
- O x,y do item é a célula do objeto que o guarda.
- Nomes em português, no clima sombrio do mundo: "Poção de cura menor", "Chave de ferro torta", "Pergaminho de luz", "Erva-de-sangue", "Adaga enferrujada", "Bolsa de moedas".
- Valores pequenos e sensatos, nada poderoso demais: quantity de 1 a 5, weight em kg (0.1 a 5).
- category: ${ITEM_CATEGORIES.map((c) => `"${c}"`).join(', ')}.
- Dinheiro: um item com "dracmas" (número inteiro, normalmente 5 a 60) vai para a bolsa do personagem.
- Formato: {"id": "i1", "x": 0, "y": 0, "name": "...", "description": "até 1 frase", "quantity": 1, "weight": 0.5, "category": "Poções"}

RESPOSTA
Responda SOMENTE com o JSON abaixo, sem texto antes ou depois, sem \`\`\` e sem comentários:
{"name": "...", "layers": {"ground": [...], "objects": [...]}, "buildings": [...], "items": [...], "notes": "uma frase sobre o mapa para o mestre"}

EXEMPLO (12×8, só para mostrar o formato; o seu mapa tem ${cols}×${rows}):
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

// items/buildings podem vir na raiz, em "tiles" ou em "map" (cada IA embrulha de um jeito).
const extra = (obj, key) => obj?.[key] ?? obj?.tiles?.[key] ?? obj?.map?.[key];

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
      const { map, warnings } = repairMap({ layers, items: extra(obj, 'items'), buildings: extra(obj, 'buildings') }, { cols, rows });
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
