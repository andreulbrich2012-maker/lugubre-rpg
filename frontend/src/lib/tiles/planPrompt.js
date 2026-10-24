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
    { type: 'floresta', rect: [0, 0, 1000, 1000] },
    { type: 'bosque', circle: [850, 150, 70] },
    { type: 'bairro', size: 'pequena', density: 1.4, rect: [340, 340, 110, 120] },
    { type: 'bairro', size: 'pequena', density: 1.4, rect: [560, 330, 140, 90] },
    { type: 'bairro', size: 'pequena', density: 1.4, rect: [360, 560, 120, 130] },
    { type: 'terra', rect: [540, 560, 120, 80] },
    { type: 'praca', circle: [470, 500, 60] },
    { type: 'plantacao', rect: [110, 560, 170, 110] },
    { type: 'cemiterio', rect: [740, 300, 110, 90] },
    { type: 'mar', points: [[880, 450], [1000, 380], [1000, 760], [900, 700]] }
  ],
  rivers: [{ points: [[200, 0], [240, 300], [300, 700], [260, 1000]], width: 3 }, { points: [[600, 0], [450, 200], [250, 330]], width: 2 }],
  roads: [
    { type: 'estrada', width: 2, points: [[0, 520], [470, 500], [1000, 480]] },
    { type: 'trilha', points: [[470, 500], [500, 250], [550, 0]] },
    { type: 'terra', width: 2, points: [[470, 500], [650, 420]] },
    { type: 'cais', width: 2, points: [[870, 560], [960, 560]] }
  ],
  fences: [
    { type: 'palicada', points: [[320, 320], [720, 310], [740, 700], [330, 720], [320, 320]] },
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
    { type: 'fogueira_grande', x: 470, y: 500 }, { type: 'barraca', x: 570, y: 590 }, { type: 'barraca', x: 620, y: 590 }, { type: 'tenda', x: 600, y: 620 }, { type: 'poco', x: 410, y: 540 }, { type: 'barraca', x: 500, y: 550 },
    { type: 'barco', x: 940, y: 600 }
  ],
  pois: [
    { name: 'Praça do Vau', x: 470, y: 500, description: 'Onde a vila se reúne em volta do fogo.' },
    { name: 'Templo da Aurora', x: 500, y: 330, description: 'Os sinos tocam sozinhos em noites sem lua.' },
    { name: 'Cais dos Pescadores', x: 910, y: 560, description: 'Barcos que voltam nem sempre trazem quem saiu.' },
    { name: 'Bosque dos Corvos', x: 850, y: 150, description: 'Os corvos dali contam os vivos da vila.' }
  ],
  items: [{ x: 480, y: 520, name: 'Bolsa de moedas', quantity: 1, weight: 0.2, dracmas: 20, category: 'Achados' }]
};

export function buildPlanPrompt({ description = '', fromImage = false, items = true, monsters = false } = {}) {
  const types = Object.keys(PLAN_BUILDINGS).join(', ');
  const objects = Object.keys(PLAN_OBJECTS).join(', ');
  const styles = STYLES.map((s) => s.id).join(', ');
  return `Você monta o PLANO de um mapa de RPG de fantasia sombria (mesa "Lúgubre RPG", visto de cima, estilo Stardew Valley).
${fromImage ? `Há uma IMAGEM de mapa anexada (foto ou desenho). Copie o desenho o mais fiel possível e use os nomes da imagem.${description ? `\nObservação do mestre: ${description}` : ''}` : `O mapa: ${String(description).trim() || 'uma vila interessante'}`}

COMO FUNCIONA
- Você NÃO desenha a grade. Você só diz o que existe e onde; o sistema desenha bonito.
- Coordenadas de 0 a 1000: x de 0 (esquerda) a 1000 (direita), y de 0 (topo) a 1000 (baixo).${fromImage ? ' Meça na imagem: o meio dela é x=500, y=500; um quarto da largura é x=250.' : ''} Seja preciso.
- Responda SOMENTE o JSON, sem texto antes ou depois.

CAMPOS
- "areas": regiões. type: ${PLAN_AREAS.join(', ')}.
  Forma: "points" (contorno, 3 ou mais pontos [x,y]), ou "circle": [x, y, raio], ou "rect": [x, y, largura, altura] (tudo na escala 0 a 1000).
  "bairro" = área cheia de casas: o sistema enche ela de casas sozinho, em fileiras, viradas para a rua mais perto ("density" de 0.5 a 1.5; "size": "pequena"|"media"|"grande").
  "floresta" pode cobrir o mapa todo: vila cercada, rio, estrada, bairro, campo, clareira e cemitério abrem a mata sozinhos. "bosque" = mancha rala.
  "praca" = só a praça central de pedra; feira/mercado ao ar livre = "terra" + barracas e tendas. "ritual" = círculo de pedras com altar (desenha sozinho). "cemiterio" ganha lápides e cerca sozinho.
- "rivers": [{"points": [[x,y],...], "width": 1 a 6}]. Cada braço/afluente é um item separado. Rio que sai do mapa: a ponta fica na borda (x ou y = 0 ou 1000).
- "roads": [{"type": "estrada"|"trilha"|"pedra"|"terra"|"cais", "width": 1 a 4, "points": [[x,y],...]}]. Onde a estrada cruza o rio vira ponte sozinha. "cais" = píer de tábuas entrando na água (porto). Estrada que sai do mapa termina na borda (0 ou 1000). Ruas de "terra" dentro da vila ligam a praça às casas.
- "fences": [{"type": "cerca"|"palicada"|"muro"|"sebe", "points": [[x,y],...]}]. Feche o contorno repetindo o primeiro ponto no fim. Onde uma estrada passa pela cerca fica uma abertura sozinha.
- "buildings": [{"type", "size": "pequena"|"media"|"grande", "x", "y", "facing", "name"}]
  type: ${types}.
  x,y = CENTRO da construção. facing (opcional) = para onde a PORTA aponta: "sul" (baixo), "norte" (cima), "leste" (direita), "oeste" (esquerda). Sem facing, o sistema vira a porta para a rua mais perto.
  Não use "portao": a abertura na cerca é automática.
- "objects": [{"type", "x", "y"}]. type: ${objects}.
- "pois": os PONTOS PRINCIPAIS que aparecem na legenda do mapa dos jogadores: [{"name", "x", "y", "description"}] na ordem da legenda (1, 2, 3...). Ponha de 8 a 25${fromImage ? ' (primeiro a legenda, na ordem; depois TODO outro nome escrito no mapa: bosques, clareiras, montanhas, vales, trilhas, cemitério)' : ''}. description: uma frase curta e misteriosa.
- "style": um destes: ${styles}. "light": "dia" | "entardecer" | "noite".
${items ? `- "items": coisas para os jogadores pegarem (até 20): {"x","y","name","quantity","weight" (kg, realista),"category"} com category em ${ITEM_CATEGORIES.map((c) => `"${c}"`).join(', ')}; dinheiro: "dracmas". Mochila/baú: "container": true e "contents": [itens].` : '- "items": [] (o mestre não quer itens).'}
${monsters ? '- "monsters": [{"name","x","y","hp"}] (até 12), em lugares onde dá para andar, longe da entrada.' : ''}

${fromImage ? `PASSO A PASSO (faça nesta ordem)
1. NOMES: leia a legenda (1, 2, 3...) e todo nome escrito no mapa → "pois".
2. VILA: siga com o dedo a borda da vila (onde a mata termina) e faça uma "palicada" com esses pontos (repita o 1º no fim).
3. MATA: uma "floresta" do mapa inteiro [[0,0],[1000,0],[1000,1000],[0,1000]]; "campo"/"clareira" só para descampados que a imagem mostra fora da vila; "rocha"/"montanha" onde houver.
4. ÁGUA: o rio principal é o mais largo; siga-o na MESMA direção até a borda. Riacho/afluente = outro item que começa na borda ou na nascente e TERMINA num ponto do rio principal.
5. CAMINHOS: cada estrada até a borda (0 ou 1000); a estrada que contorna a vila também; ruas de "terra" da praça até cada grupo de casas.
6. CASAS: um "bairro" para CADA amontoado de telhados, até os de 3–4 casas. Vila pintada e apertada: "size":"pequena", "density":1.5.
7. ESPECIAIS: em "buildings" cada prédio com nome e cada telhado diferente (templo, taverna junto à praça, capela no cemitério, celeiro, estábulo, serraria...).
8. DETALHES: praça com fogueira grande, bancos e tochas em volta; mercado: área "terra" com barracas, tendas e carroça; placas nas saídas; troncos na serraria.
9. CLIMA: igual ao da imagem (noite escura → "light": "noite"; tons sombrios → "style": "obscuro").

CONFIRA ANTES DE RESPONDER
[ ] a "palicada" contorna a vila
[ ] toda estrada e todo rio que saem do mapa terminam em 0 ou 1000
[ ] 7+ bairros pequenos ou 30–60 construções no total
[ ] pois = legenda + nomes escritos fora dela

` : `REGRAS PARA FICAR BONITO
1. Ponha MUITAS construções: uma vila tem de 30 a 60; uma cidade, 60 a 300. Use áreas "bairro" (pequenas, uma por grupo de casas) para encher as ruas.
   Toda construção com nome ou função própria (templo, taverna, moinho, serraria, estábulo, celeiro, mercado...) vai em "buildings" no lugar certo.
2. Praça no centro com fogueira grande ou fonte, barracas, bancos e lampiões.
3. Estradas saem das bordas (0 ou 1000) e chegam na praça; ruas de "terra" levam aos grupos de casas; trilhas aos lugares afastados.
4. Cerque a vila com "palicada"; cercas nas hortas.
5. Floresta do mapa inteiro (a vila abre a mata sozinha), manchas de bosque; plantações perto de celeiros; cemitério perto do templo.
6. Use o clima pedido.
7. Região grande (várias vilas/cidades): cada vila com sua praça, bairros e cerca, ligadas por estradas que passam pela mata; o resto do mapa é floresta, campo, rio ou montanha.

`}EXEMPLO (só o formato; faça o seu):
${JSON.stringify(PLAN_EXAMPLE)}`;
}
