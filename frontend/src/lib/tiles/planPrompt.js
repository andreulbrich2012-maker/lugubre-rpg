// Prompt do "plano" de mapa: a IA descreve areas, rios, estradas, cercas, construcoes e objetos
// em porcentagem (0 a 100) e o sistema desenha. Funciona com IA fraca e com foto de mapa.
import { PLAN_AREAS, PLAN_OBJECTS, PLAN_BUILDINGS } from './mapPlan.js';
import { STYLES } from './styles.js';
import { ITEM_CATEGORIES } from './format.js';

export const PLAN_EXAMPLE = {
  name: 'Vila do Vau',
  notes: 'Vila de lenhadores cortada por um rio; a taverna é o ponto de encontro.',
  style: 'padrao',
  light: 'dia',
  areas: [
    { type: 'floresta', points: [[0, 0], [1000, 0], [1000, 200], [700, 280], [300, 250], [0, 330]] },
    { type: 'floresta', points: [[0, 820], [350, 760], [600, 880], [1000, 820], [1000, 1000], [0, 1000]] },
    { type: 'bairro', density: 1, points: [[330, 340], [640, 330], [700, 640], [350, 680]] },
    { type: 'praca', circle: [470, 500, 60] },
    { type: 'plantacao', rect: [110, 560, 170, 110] },
    { type: 'cemiterio', rect: [740, 300, 110, 90] },
    { type: 'mar', points: [[880, 450], [1000, 380], [1000, 760], [900, 700]] }
  ],
  rivers: [{ points: [[200, 0], [240, 300], [300, 700], [260, 1000]], width: 3 }],
  roads: [
    { type: 'estrada', width: 2, points: [[0, 520], [470, 500], [1000, 480]] },
    { type: 'trilha', points: [[470, 500], [500, 250], [550, 0]] },
    { type: 'cais', width: 2, points: [[870, 560], [960, 560]] }
  ],
  fences: [
    { type: 'cerca', points: [[320, 320], [720, 310], [740, 700], [330, 720], [320, 320]] },
    { type: 'cerca', points: [[100, 550], [290, 550], [290, 680], [100, 680], [100, 550]] }
  ],
  buildings: [
    { type: 'templo', size: 'media', x: 500, y: 330, name: 'Templo da Aurora' },
    { type: 'taverna', size: 'media', x: 590, y: 440, name: 'Taverna do Vau' },
    { type: 'ferraria', size: 'pequena', x: 610, y: 600 },
    { type: 'celeiro', size: 'media', x: 160, y: 470 },
    { type: 'moinho', x: 280, y: 220 },
    { type: 'pescador', size: 'pequena', x: 850, y: 600 }
  ],
  objects: [
    { type: 'fogueira', x: 470, y: 500 }, { type: 'poco', x: 410, y: 540 }, { type: 'barraca', x: 500, y: 550 },
    { type: 'barco', x: 940, y: 600 }
  ],
  pois: [
    { name: 'Praça do Vau', x: 470, y: 500, description: 'Onde a vila se reúne em volta do fogo.' },
    { name: 'Templo da Aurora', x: 500, y: 330, description: 'Os sinos tocam sozinhos em noites sem lua.' },
    { name: 'Cais dos Pescadores', x: 910, y: 560, description: 'Barcos que voltam nem sempre trazem quem saiu.' }
  ],
  items: [{ x: 480, y: 520, name: 'Bolsa de moedas', quantity: 1, weight: 0.2, dracmas: 20, category: 'Achados' }]
};

export function buildPlanPrompt({ description = '', fromImage = false, items = true, monsters = false } = {}) {
  const types = Object.keys(PLAN_BUILDINGS).join(', ');
  const objects = Object.keys(PLAN_OBJECTS).join(', ');
  const styles = STYLES.map((s) => s.id).join(', ');
  return `Você monta o PLANO de um mapa de RPG de fantasia sombria (mesa "Lúgubre RPG", visto de cima, estilo Stardew Valley).
${fromImage ? `Há uma IMAGEM de mapa anexada. Copie o desenho dela o mais fiel possível: onde estão a floresta, o rio, as estradas, a praça, as plantações, o cemitério e CADA construção. Use os nomes que aparecem na imagem.${description ? `\nObservação do mestre: ${description}` : ''}` : `O mapa: ${String(description).trim() || 'uma vila interessante'}`}

COMO FUNCIONA
- Você NÃO desenha a grade. Você só diz o que existe e onde; o sistema desenha bonito.
- Coordenadas de 0 a 1000: x de 0 (esquerda) a 1000 (direita), y de 0 (topo) a 1000 (baixo).${fromImage ? ' Meça na imagem: o meio dela é x=500, y=500; um quarto da largura é x=250.' : ''} Seja preciso.
- Responda SOMENTE o JSON, sem texto antes ou depois.

CAMPOS
- "areas": regiões. type: ${PLAN_AREAS.join(', ')}.
  Forma: "points" (contorno, 3 ou mais pontos [x,y]), ou "circle": [x, y, raio], ou "rect": [x, y, largura, altura] (tudo na escala 0 a 1000).
  "bairro" = área cheia de casas: o sistema enche ela de casas sozinho, em fileiras, viradas para a rua mais perto ("density" de 0.5 a 1.5; "size": "pequena"|"media"|"grande" diz o tamanho típico). Use bairros para TODOS os aglomerados de casas e liste só as construções especiais em "buildings".
  Floresta fecha as bordas; bosque é ralo; praça é chão de pedra; plantação vira canteiros; cemitério ganha lápides e cerca sozinho.
- "rivers": [{"points": [[x,y],...], "width": 1 a 6}]. Rio atravessando a borda: comece e termine em 0 ou 100.
- "roads": [{"type": "estrada"|"trilha"|"pedra"|"terra"|"cais", "width": 1 a 4, "points": [[x,y],...]}]. Onde a estrada cruza o rio vira ponte sozinha. "cais" = píer de tábuas entrando na água (porto).
- "fences": [{"type": "cerca"|"palicada"|"muro"|"sebe", "points": [[x,y],...]}]. Feche o contorno repetindo o primeiro ponto no fim. Onde uma estrada passa pela cerca fica uma abertura sozinha.
- "buildings": [{"type", "size": "pequena"|"media"|"grande", "x", "y", "facing", "name"}]
  type: ${types}.
  x,y = CENTRO da construção. facing (opcional) = para onde a PORTA aponta: "sul" (baixo), "norte" (cima), "leste" (direita), "oeste" (esquerda). Sem facing, o sistema vira a porta para a rua mais perto.
  O sistema liga cada porta à estrada com uma trilha e afasta construções que se encostam.
- "objects": [{"type", "x", "y"}]. type: ${objects}.
- "pois": os PONTOS PRINCIPAIS que aparecem na legenda do mapa dos jogadores: [{"name", "x", "y", "description"}] na ordem da legenda (1, 2, 3...). Ponha de 8 a 20${fromImage ? ' (todos os números e nomes da legenda da imagem, no lugar de cada um)' : ''}. description: uma frase curta e misteriosa.
- "style": um destes: ${styles}. "light": "dia" | "entardecer" | "noite".
${items ? `- "items": coisas para os jogadores pegarem (até 20): {"x","y","name","quantity","weight" (kg, realista),"category"} com category em ${ITEM_CATEGORIES.map((c) => `"${c}"`).join(', ')}; dinheiro: "dracmas". Mochila/baú: "container": true e "contents": [itens].` : '- "items": [] (o mestre não quer itens).'}
${monsters ? '- "monsters": [{"name","x","y","hp"}] (até 12), em lugares onde dá para andar, longe da entrada.' : ''}

REGRAS PARA FICAR BONITO
1. Ponha MUITAS construções: uma vila tem de 30 a 60; uma cidade, 60 a 300.${fromImage ? ' Conte as casas da imagem: onde houver um amontoado de telhados, marque uma área "bairro" cobrindo esse amontoado.' : ' Use áreas "bairro" para encher as ruas de casas.'}
   Toda construção com nome ou função própria (templo, taverna, moinho, serraria, estábulo, celeiro, mercado...) vai em "buildings" no lugar certo.
2. Deixe uma faixa de uns 4 pontos entre construções vizinhas (o telhado precisa de espaço).
3. Praça ou largo no centro, com fogueira/fonte, barracas, bancos e lampiões.
4. Estradas saem das bordas e chegam na praça; trilhas levam aos lugares afastados.
5. Cerque a vila: uma "palicada" ou "cerca" em volta do conjunto de casas (como nos mapas pintados), e cercas nas hortas e no cemitério.
6. Floresta nas bordas e manchas de bosque; plantações perto de celeiros; cemitério perto do templo.
7. Use ${fromImage ? 'o mesmo clima da imagem (noite escura → "light": "noite"; tons sombrios → "style": "obscuro")' : 'o clima pedido'}.

EXEMPLO (só o formato; faça o seu):
${JSON.stringify(PLAN_EXAMPLE)}`;
}
