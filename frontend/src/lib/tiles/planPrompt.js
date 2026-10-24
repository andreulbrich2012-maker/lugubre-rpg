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

// exemplo do modo texto: sem mar, cais, barco nem pescador (a IA fraca copiava o porto do exemplo)
export const TEXT_EXAMPLE = {
  ...PLAN_EXAMPLE,
  areas: [PLAN_EXAMPLE.areas[0], { type: 'campo', rect: [280, 280, 480, 480] }, ...PLAN_EXAMPLE.areas.slice(1).filter((a) => a.type !== 'mar')],
  rivers: PLAN_EXAMPLE.rivers.slice(0, 1),
  roads: PLAN_EXAMPLE.roads.filter((r) => r.type !== 'cais'),
  buildings: PLAN_EXAMPLE.buildings.filter((b) => b.type !== 'pescador'),
  objects: PLAN_EXAMPLE.objects.filter((o) => o.type !== 'barco'),
  pois: PLAN_EXAMPLE.pois.slice(0, 2)
};

export function buildPlanPrompt({ description = '', fromImage = false, items = true, monsters = false } = {}) {
  const types = Object.keys(PLAN_BUILDINGS).join(', ');
  const objects = Object.keys(PLAN_OBJECTS).join(', ');
  const styles = STYLES.map((s) => s.id).join(', ');
  return `Você monta o PLANO de um mapa de RPG de fantasia sombria (mesa "Lúgubre RPG", visto de cima, estilo Stardew Valley).
${fromImage ? `Há uma IMAGEM de mapa anexada (foto ou desenho). Copie o desenho o mais fiel possível e use os nomes da imagem. Prédio sem nome: invente um que combine. NÃO copie nomes nem frases do EXEMPLO.${description ? `\nObservação do mestre: ${description}` : ''}` : `O mapa: ${String(description).trim() || 'uma vila interessante'}`}

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
2. VILA: siga com o dedo a borda da vila e faça a cerca com esses pontos (repita o 1º no fim): muralha de pedra cinza = "muro"; troncos = "palicada"; sem cerca na imagem = nenhuma.
3. CHÃO: olhe entre a vila e a borda da imagem. Árvores grudadas cobrindo tudo → uma "floresta" do mapa inteiro [[0,0],[1000,0],[1000,1000],[0,1000]]. Grama verde aberta → NADA de floresta do mapa inteiro: uma "floresta" (points) para CADA mancha de mata, "bosque" para árvores soltas. "campo"/"clareira" para descampados; "rocha"/"montanha" onde houver; costa = "mar" até a borda + "areia" na praia.
4. ÁGUA: o rio principal é o mais largo. Ache ANTES onde as duas pontas dele tocam a moldura da imagem (ex.: sai pela direita → x=1000) e siga-o na MESMA direção até lá. Riacho/afluente = outro item que começa na borda ou na nascente e TERMINA num ponto do rio principal. Píer = "cais" da praia para dentro do mar.
5. CAMINHOS: cada estrada até a borda (0 ou 1000); a estrada que contorna a vila também; ruas de "terra" da praça até cada grupo de casas.
6. CASAS: um "bairro" para CADA amontoado de telhados, até os de 3–4 casas, do tamanho do amontoado (não junte dois). Vila pintada e apertada: "size":"pequena", "density":1.5.
7. ESPECIAIS: em "buildings" cada prédio com nome e cada telhado diferente (castelo = pedra cinza com torre, templo, taverna junto à praça, capela, celeiro, estábulo, serraria...). Quadrado cercado com lápides = "cemiterio" (plantação tem fileiras de terra).
8. DETALHES: praça com fogueira grande, bancos e tochas em volta; mercado: área "terra" com barracas, tendas e carroça; placas nas saídas; troncos na serraria.
9. CLIMA: igual ao da imagem (noite escura → "light": "noite"; tons sombrios → "style": "obscuro").

CONFIRA ANTES DE RESPONDER
[ ] a cerca/muro contorna a vila
[ ] "floresta" do mapa inteiro só se fora da vila a imagem é mata fechada
[ ] toda estrada e todo rio que saem do mapa terminam em 0 ou 1000, na MESMA borda da imagem
[ ] 7+ bairros pequenos ou 30–60 construções no total
[ ] pois = legenda + nomes escritos fora dela; nenhum nome do EXEMPLO

` : `REGRAS PARA FICAR BONITO
O pedido costuma ser curto e informal: complete com o que combina com ele (nomes, construções, detalhes, clima). Mapa pequeno e simples só se pedir.
1. Siga o pedido item por item, no lado pedido. Não invente rio, mar, lago ou cais que ele não pede. NÃO copie nomes, frases nem coordenadas do EXEMPLO.
2. Casas: muitos "bairro" retangulares de ~90x80, "size":"pequena", "density":1.5, com uma rua de "terra" entre eles. Aldeia/acampamento: 3–6. Vila: 8–12. Cidade: 15–25 enchendo todo o espaço dentro do muro. Prédios com função (taverna, templo, mercado, celeiro...) vão em "buildings" DENTRO da vila, na beira da praça ou de uma rua, fora dos retângulos de bairro.
3. Chão: "floresta" no mapa todo ou só no lado pedido; depois um "campo" cobrindo a vila com 80 de folga. Nunca "campo" no mapa inteiro. Neve = "neve" no mapa todo. Pântano = "pantano" no mapa todo + 3–5 "lago"; a vila fica num "campo" (chão firme); palafitas = "bairro" na beira de um lago com "cais" entrando na água.
4. Praça com fonte ou fogueira grande; mercado = área "terra" ao lado da praça com 4–6 barracas/tendas, caixotes e sacos.
5. Estradas saem das bordas (0 ou 1000) até a praça; ruas de "terra" da praça a cada bairro; trilhas aos lugares afastados.
6. Vila: "palicada" em volta das casas; cidade: "muro". Porto fica fora dela, ligado por estrada. Plantação com "cerca" e o celeiro AO LADO dela, nunca dentro.
7. Como desenhar: morro = "montanha" circle raio 110 + "clareira" raio 60 no topo, a construção no centro; ponta de pedra = "rocha" entrando no mar; costa = "mar" numa borda (a praia é automática); porto = 3 "cais" de 120 da terra para dentro do mar (barcos automáticos); castelo = "castelo" grande dentro de um "muro" quadrado ~160x150, "torre" nos 4 cantos por dentro, "quartel" e "estabulo" no pátio, "praca" na frente; "em volta" = nos 4 lados; mina = "montanha" + "cabana" + carroça e trilha; acampamento = "clareira" raio 150 com 6–10 "tenda" em "buildings" em roda, "fogueira_grande" no meio, caixotes, barris, carroça e "palicada" em volta; mapa de mata: varie com 2–3 clareiras, "rocha" e "bosque".
8. Clima do pedido (sombrio/assombrado → "style":"gotico" ou "obscuro", "light":"entardecer" ou "noite").
9. Região grande (várias vilas): cada vila com praça, 5–8 bairros, prédios e cerca, ligadas por estradas curvas; vilas de tamanhos e formas diferentes (nada simétrico); o resto é floresta, campo, rio, lago ou montanha.

`}EXEMPLO (só o formato; faça o seu):
${JSON.stringify(fromImage ? PLAN_EXAMPLE : TEXT_EXAMPLE)}`;
}
