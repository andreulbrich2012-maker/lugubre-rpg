// Grimorio: catalogo VISUAL de magias (nome, escola, nivel, alvo, alcance, efeito
// em uma frase e elemento sugerido). NAO e regra do jogo: o livro ainda nao define
// escolas nem custos. Serve para escolher animacao e icone de qualquer poder pelo
// nome (ver match.js) e para a pagina Grimorio.
//
// Formato de cada linha das escolas (uma magia por linha):
//   <nivel> <alvo> <alcance> <elemento> <Nome> — <efeito em uma frase>
// nivel: B basica, I intermediaria, A avancada, L lendaria
// alvo / alcance / elemento: codigos das tabelas abaixo
import { normalize } from '../text.js';

export const TIERS = [
  { id: 1, code: 'B', key: 'basica', label: 'Básica' },
  { id: 2, code: 'I', key: 'intermediaria', label: 'Intermediária' },
  { id: 3, code: 'A', key: 'avancada', label: 'Avançada' },
  { id: 4, code: 'L', key: 'lendaria', label: 'Lendária' }
];
const TIER_BY_CODE = Object.fromEntries(TIERS.map((t) => [t.code, t]));

export const TARGETS = {
  um: 'Uma criatura',
  mul: 'Até três criaturas',
  vol: 'Vários alvos em cadeia',
  ali: 'Um aliado',
  si: 'O conjurador',
  gru: 'Aliados próximos',
  are: 'Área pequena',
  gde: 'Área grande',
  con: 'Cone à frente',
  lin: 'Linha',
  pto: 'Um ponto no chão',
  obj: 'Um objeto',
  cad: 'Um cadáver',
  cam: 'Campo de batalha inteiro'
};

export const RANGES = {
  T: 'Toque',
  P: 'Pessoal',
  C: 'Curto',
  M: 'Médio',
  L: 'Longo',
  V: 'Visão',
  I: 'Ilimitado'
};

export const ELEMENT_CODES = {
  ca: 'Caos', ga: 'Gaia', po: 'Ponto', er: 'Érebo', ni: 'Nix', ta: 'Tártaro', et: 'Éter', an: 'Ananque', he: 'Hemera'
};

// Dominios agrupam as escolas na pagina (filtro de cima).
export const DOMAINS = [
  { id: 'elemental', label: 'Elementais' },
  { id: 'arcana', label: 'Arcanas' },
  { id: 'primal', label: 'Divinas e primais' },
  { id: 'proibida', label: 'Proibidas' },
  { id: 'oficio', label: 'Ofícios e rituais' }
];

const SCHOOL_DATA = [
  {
    id: 'fogo', label: 'Fogo', title: 'Piromancia', domain: 'elemental',
    hint: 'Chama, brasa, magma e explosão.',
    list: `
B um C ta Fagulha — Uma faísca salta dos dedos e acende o que tocar.
B um T ta Toque Ardente — A mão em brasa marca a carne do alvo com uma queimadura funda.
B con P ta Mãos Flamejantes — Um leque curto de chamas jorra das palmas abertas.
B vol C ta Brasa Saltitante — Uma brasa quica de inimigo em inimigo antes de apagar.
I are M ta Bola de Fogo — Uma esfera de chamas voa até o alvo e explode em labareda.
I lin M ta Parede de Fogo — Uma cortina de chamas ergue-se do chão e queima quem atravessa.
I um M ta Lança de Magma — Um dardo de rocha derretida perfura e deixa o alvo em chamas.
I si P ta Manto de Brasas — Chamas envolvem o corpo e queimam quem golpeia o conjurador.
A gde L ta Chuva de Cinzas Ardentes — Cinzas em brasa caem do céu e cobrem a área de fogo miúdo.
A con P ta Sopro do Dragão — Um jato de fogo em cone devasta tudo à frente.
A pto M ta Coluna de Fogo — Um pilar de chamas desce do céu sobre um ponto e o consome.
L gde V ta Meteoro — Uma rocha incandescente rasga o céu e abre uma cratera em chamas.
L cam V ta Chuva de Meteoros — Dezenas de pedras flamejantes castigam o campo de batalha.
L si P ta Avatar do Tártaro — O conjurador vira uma silhueta de fogo vivo que derrete o chão por onde passa.`
  },
  {
    id: 'gelo', label: 'Gelo', title: 'Criomancia', domain: 'elemental',
    hint: 'Geada, neve, cristais e frio que para o corpo.',
    list: `
B um C po Raio de Geada — Um fio de frio azul entorpece os membros do alvo.
B um T po Toque Gélido — Os dedos congelam a pele e roubam o calor do corpo.
B si P po Adaga de Gelo — Uma lâmina de gelo surge na mão como arma improvisada.
B pto C po Chão Escorregadio — Uma película de gelo cobre o chão e derruba quem pisa.
I um M po Lança de Gelo — Uma estaca de gelo voa e estilhaça no impacto.
I con P po Cone de Gelo — Um sopro glacial em cone congela o que encontra.
I lin M po Muralha de Gelo — Blocos de gelo erguem-se e fecham a passagem.
I si P po Armadura de Gelo — Uma crosta de gelo protege o corpo e entorpece quem a toca.
A gde L po Nevasca — Uma tempestade de neve cega e congela a área.
A um M po Prisão de Gelo — O alvo é encerrado num bloco de gelo maciço.
A pto M po Estalagmites de Gelo — Pontas de gelo irrompem do chão sob os inimigos.
L cam V po Inverno Eterno — Um frio sem fim congela o campo de batalha e tudo que respira.
L um L po Zero Absoluto — O frio total para o coração do alvo num instante.`
  },
  {
    id: 'agua', label: 'Água', title: 'Hidromancia', domain: 'elemental',
    hint: 'Jatos, ondas, marés e afogamento.',
    list: `
B um C po Jato d'Água — Um esguicho forte empurra o alvo para trás.
B obj T po Purificar Água — Torna potável a água ou a bebida tocada.
B um C po Bolha Sufocante — Uma bolha de água envolve a cabeça do alvo e tira o fôlego.
B si P po Respirar na Água — Guelras finas surgem no pescoço e permitem respirar submerso.
I lin M po Onda — Uma onda varre a linha e derruba quem estiver nela.
I pto M po Redemoinho — Um vórtice de água prende e gira quem está no ponto.
I um M po Chicote d'Água — Um açoite líquido estala e agarra o alvo.
I si P po Forma Líquida — O corpo vira água e escorre por frestas e grades.
A gde L po Maremoto — Uma muralha de água desaba sobre a área.
A pto M po Gêiser — Uma coluna de água fervente explode do chão.
A um M po Afogar — Os pulmões do alvo se enchem de água salgada.
L cam V po Dilúvio — Uma chuva sem fim inunda o campo e arrasta tudo.
L gde V po Abraço do Abismo Marinho — Tentáculos de água negra emergem e puxam os alvos para o fundo.`
  },
  {
    id: 'terra', label: 'Terra', title: 'Geomancia', domain: 'elemental',
    hint: 'Pedra, lama, tremores e muralhas.',
    list: `
B um C ga Pedrada — Uma pedra se desprende do chão e voa contra o alvo.
B pto C ga Lama — O chão vira lama grossa que prende os pés.
B si P ga Pele de Pedra — A pele endurece como rocha cinzenta.
I pto M ga Espinhos de Pedra — Estacas de rocha brotam do chão sob o alvo.
I lin M ga Muro de Pedra — Uma muralha de pedra se ergue do solo.
I um M ga Pedregulho — Uma rocha enorme é arremessada e esmaga o alvo.
I pto C ga Fenda — O chão se abre e engole quem está em cima.
A gde L ga Terremoto — A terra treme, racha e derruba todos na área.
A um M ga Prisão de Pedra — O alvo é envolvido por um casulo de rocha.
A are M ga Avalanche de Rochas — Rochas rolam do alto e soterram os inimigos.
A si P ga Andar na Terra — O conjurador mergulha no solo e emerge em outro ponto.
L cam V ga Cataclismo — O chão inteiro se ergue em placas e desaba sobre os inimigos.
L gde V ga Montanha Viva — Um pico de pedra brota do solo e esmaga tudo sob ele.`
  },
  {
    id: 'ar', label: 'Ar', title: 'Aeromancia', domain: 'elemental',
    hint: 'Vento, vácuo, voo e redemoinhos.',
    list: `
B um C po Rajada — Um golpe de vento empurra o alvo para longe.
B si P po Queda Suave — O vento amortece a queda como uma pluma.
B are C po Dissipar Névoa — Uma brisa limpa névoa, fumaça e gás da área.
I lin M po Lâmina de Vento — Um corte de ar comprimido fere à distância.
I si P po Voo — O conjurador flutua e voa pelos ares.
I lin M po Muralha de Vento — Uma parede de ventania desvia flechas e projéteis.
I um M po Vácuo — O ar é arrancado dos pulmões do alvo.
A pto L po Tornado — Um funil de vento suga e arremessa tudo na área.
A gde L po Tempestade de Areia — Areia cortante cega e esfola quem está na área.
A um M po Erguer no Ar — O alvo é suspenso pelo vento e fica sem apoio.
L cam V po Furacão — Ventos colossais varrem o campo de batalha.
L si P po Forma de Tempestade — O conjurador vira um redemoinho vivo de vento e raios.`
  },
  {
    id: 'raio', label: 'Raio', title: 'Eletromancia', domain: 'elemental',
    hint: 'Choques, relâmpagos, trovões e tempestades.',
    list: `
B um C po Choque — Uma faísca elétrica salta da ponta do dedo.
B um T po Toque Chocante — A mão carregada dá um choque que trava os músculos.
B si P po Estática — O corpo acumula carga e o próximo golpe dá choque.
I lin M po Corrente Elétrica — Um raio contínuo percorre a linha até o alvo.
I vol M po Relâmpago em Cadeia — Um raio salta de inimigo em inimigo.
I um L po Relâmpago — Um raio cai do céu sobre o alvo.
I are M po Esfera de Faíscas — Uma bola crepitante explode em descargas.
A gde L po Tempestade — Nuvens negras despejam raios sobre a área.
A si P po Manto de Trovões — Arcos elétricos giram em volta do conjurador.
A con P po Trovão — Um estrondo em cone ensurdece e derruba.
L cam V po Fúria dos Céus — Centenas de raios caem sobre o campo de batalha.
L um L po Lança do Trovão Primordial — Um único raio colossal desce e vaporiza o alvo.`
  },
  {
    id: 'acido', label: 'Ácido', title: 'Corrosão', domain: 'elemental',
    hint: 'Gotas, poças e névoas que dissolvem carne e metal.',
    list: `
B um C ga Gota Ácida — Uma gota corrosiva queima pele e metal.
B mul C ga Respingo Ácido — Um respingo se divide e atinge dois alvos próximos.
B obj T ga Corroer — O ácido dissolve uma fechadura, corrente ou grade.
I um M ga Flecha Ácida — Uma seta de ácido que continua corroendo depois do impacto.
I are M ga Poça Corrosiva — Uma poça borbulhante corrói quem pisa.
I um M ga Derreter Armadura — O ácido amolece e fura a armadura do alvo.
I con P ga Vômito Ácido — Um jato de bile corrosiva sai em cone.
I si P ga Sangue Ácido — O sangue do conjurador queima quem o ferir.
A gde L ga Chuva Ácida — Gotas corrosivas caem e dissolvem tudo devagar.
A um M ga Lodo Devorador — Uma massa ácida engole o alvo e o digere.
L gde V ga Mar de Ácido — A área vira um lago corrosivo fervente.`
  },
  {
    id: 'veneno', label: 'Veneno', title: 'Toxicologia', domain: 'elemental',
    hint: 'Peçonha, esporos, névoas e pestes.',
    list: `
B um C ga Picada Venenosa — Uma agulha de veneno arde e entorpece.
B obj T ga Envenenar Lâmina — A arma tocada pinga veneno por alguns golpes.
B um T ga Toque Peçonhento — O toque deixa veneno sob a pele.
I are M ga Nuvem Venenosa — Uma névoa verde sufoca quem respira.
I um M ga Esporos Paralisantes — Esporos travam os músculos do alvo.
I um C ga Sangue Envenenado — O veneno corre nas veias e enfraquece o alvo aos poucos.
I si P ga Imunidade a Venenos — O corpo neutraliza qualquer toxina.
A gde L ga Nuvem Pestilenta — Uma nuvem de pestilência espalha febre e chagas.
A um M ga Serpente de Veneno — Uma serpente de peçonha verde morde o alvo e se desfaz.
L cam V ga Praga — Uma peste mágica se alastra de criatura em criatura.`
  },
  {
    id: 'luz', label: 'Luz', title: 'Heliomancia', domain: 'elemental',
    hint: 'Sol, clarões, feixes e auroras.',
    list: `
B um C he Clarão — Um lampejo branco ofusca o alvo.
B um C he Dardo de Luz — Um dardo luminoso que queima criaturas das trevas.
B gru P he Aura Solar — Um calor dourado afasta o frio e o medo dos aliados.
I lin M he Raio Solar — Um feixe de sol queima tudo na linha.
I are M he Explosão Solar — Uma esfera de luz explode e cega quem está perto.
I um M he Lança de Luz — Uma lança luminosa perfura e revela o invisível.
I si P he Espelho Solar — A luz recebida é refletida contra o atacante.
A pto L he Pilar de Luz — Uma coluna de luz desce do céu sobre o alvo.
A gde L he Aurora Ardente — Uma onda de luz dourada varre a área.
A si P he Corpo de Luz — O conjurador vira luz pura e cruza o campo como um raio.
L cam V he Sol Nascente — Um segundo sol surge no céu e queima as trevas do campo.
L vol V he Prisma — A luz se divide em sete feixes que atingem alvos diferentes.`
  },
  {
    id: 'trevas', label: 'Trevas', title: 'Umbromancia', domain: 'elemental',
    hint: 'Breu, vazio e escuridão que devora a luz.',
    list: `
B um C er Dardo Sombrio — Uma farpa de escuridão gela o espírito do alvo.
B pto C er Escuridão — Uma esfera de breu apaga toda luz no ponto.
B um T er Mão do Vazio — O toque arranca calor e cor do alvo.
I lin M er Raio Sombrio — Um feixe de trevas atravessa o alvo.
I are M er Explosão de Trevas — Uma bolha negra estoura e engole a luz.
I um M er Tentáculos do Breu — Tentáculos negros brotam do chão e prendem o alvo.
I si P er Véu de Trevas — Trevas envolvem o corpo e desviam golpes.
A pto M er Esfera do Vazio — Uma esfera negra devora tudo que toca.
A gde L er Noite Sem Estrelas — O céu escurece e os inimigos perdem a visão.
A um M er Eclipse Interior — A luz do alvo se apaga e ele perde a vontade de lutar.
L pto V er Buraco Negro — Um ponto de vazio suga tudo em volta.
L cam V er Fim da Luz — Toda luz do campo de batalha se apaga de uma vez.`
  },
  {
    id: 'forca', label: 'Força', title: 'Evocação arcana', domain: 'elemental',
    hint: 'Energia arcana pura: mísseis, escudos e jaulas.',
    list: `
B vol M ca Mísseis Mágicos — Três dardos de energia que nunca erram o caminho.
B si P ca Escudo Arcano — Um disco de força surge e bloqueia um golpe.
B obj C ca Mão Arcana — Uma mão de força pega, empurra ou carrega objetos.
I um M ca Empurrão de Força — Uma onda invisível arremessa o alvo para longe.
I lin M ca Raio Arcano — Um feixe violeta de energia pura.
I um M ca Lâmina Espectral — Uma espada de força flutua e golpeia sozinha.
I si P ca Armadura Arcana — Uma couraça translúcida protege o corpo.
A um M ca Prisão de Força — Uma jaula invisível encerra o alvo.
A are M ca Martelo Arcano — Um martelo de força desce e esmaga a área.
A um M ca Esfera Resiliente — Uma bolha perfeita prende o alvo: nada entra, nada sai.
L gde V ca Tempestade Arcana — Centenas de mísseis mágicos cobrem a área.
L um L ca Desintegrar — Um raio esverdeado reduz o alvo a pó.`
  },
  {
    id: 'ilusao', label: 'Ilusão', title: 'Ilusionismo', domain: 'arcana',
    hint: 'Do truque menor à realidade falsa que fere.',
    list: `
B obj C ni Ilusão Menor — Cria um som ou uma imagem pequena e falsa.
B si P ni Disfarce — Muda a aparência do conjurador por algum tempo.
B um C ni Luzes Dançantes — Quatro luzes flutuantes enganam e distraem.
B pto C ni Ruído Fantasma — Um som falso vem de onde o conjurador quiser.
I si P ni Duplo Ilusório — Uma cópia do conjurador atrai os golpes.
I si P ni Imagens Espelhadas — Três cópias giram em volta do conjurador.
I si P ni Invisibilidade — O conjurador some da vista.
I pto M ni Terreno Ilusório — O chão parece outra coisa: pântano, abismo ou campo florido.
I um M ni Força Fantasmal — Um monstro irreal ataca a mente do alvo.
A um M ni Labirinto Ilusório — O alvo se perde num labirinto que só ele vê.
A gru P ni Invisibilidade em Grupo — Todos os aliados próximos somem.
A um M ni Assassino Fantasma — O maior medo do alvo toma forma e o fere.
A gde L ni Miragem Arcana — Uma paisagem inteira é trocada por uma ilusão.
L cam V ni Realidade Falsa — A ilusão fica tão real que fere e mata.
L gde V ni Teatro de Sombras — Um exército ilusório marcha contra os inimigos.`
  },
  {
    id: 'encantamento', label: 'Encantamento', title: 'Mente', domain: 'arcana',
    hint: 'Sono, medo, comando e domínio da vontade.',
    list: `
B um C ni Enfeitiçar — O alvo passa a ver o conjurador como amigo.
B are C ni Sono — Uma névoa de sono derruba criaturas fracas.
B um C ni Comando — Uma palavra que o alvo obedece por um instante.
B um C ni Zombaria Cruel — Palavras mágicas ferem a mente e o orgulho.
I um M ni Confusão — O alvo ataca a esmo e não reconhece aliados.
I um M ni Imobilizar Pessoa — O corpo do alvo trava no lugar.
I um M ni Sugestão — Uma ideia razoável é plantada na mente do alvo.
I con P ni Medo — Uma onda de pavor faz os alvos fugirem.
A um M ni Dominar — A vontade do alvo passa a ser do conjurador.
A gde L ni Loucura — A mente dos alvos se parte em mil vozes.
A um M ni Apagar Memória — O alvo esquece os últimos minutos.
L um V ni Palavra de Poder: Atordoar — Uma palavra que deixa o alvo em choque.
L cam V ni Domínio das Massas — Uma multidão inteira obedece a uma só voz.`
  },
  {
    id: 'necromancia', label: 'Necromancia', title: 'Arte dos mortos', domain: 'proibida',
    hint: 'Ossos, podridão, mortos que se erguem e vida roubada.',
    list: `
B um T er Toque Necrótico — O toque apodrece a carne do alvo.
B um C er Dardo de Ossos — Uma lasca de osso dispara contra o alvo.
B cad T er Falar com os Mortos — O cadáver responde a algumas perguntas.
B um C er Sussurro Sepulcral — Um frio de túmulo enfraquece o alvo.
I um M er Drenar Vida — A vida do alvo flui para o conjurador.
I cad T er Erguer Mortos — Um cadáver se levanta como servo morto-vivo.
I are M er Explosão de Cadáver — Um cadáver explode em ossos e carne podre.
I si P er Armadura de Ossos — Ossos cobrem o corpo como placas.
A um M er Dedo da Morte — Um gesto e o coração do alvo para.
A gde L er Exército dos Mortos — Esqueletos brotam da terra em número.
A um M er Definhar — O corpo do alvo envelhece e seca.
A pto M er Lanças de Ossos — Ossos brotam do chão como lanças.
L si P er Transcender em Lich — O conjurador abandona a carne e prende a alma num filactério.
L cam V er Ceifador — A sombra da Morte passa pelo campo e ceifa os fracos.`
  },
  {
    id: 'conjuracao', label: 'Conjuração', title: 'Invocação', domain: 'arcana',
    hint: 'Criaturas, servos e objetos chamados do nada.',
    list: `
B pto C ca Invocar Familiar — Um espírito animal pequeno passa a servir o conjurador.
B obj C ca Conjurar Objeto — Um objeto simples aparece na mão.
B um C ga Invocar Corvo — Um corvo surge do nada e bica o alvo.
B pto C ca Servo Invisível — Um ajudante invisível carrega, limpa e busca.
I pto M ga Invocar Lobo Espectral — Um lobo de névoa azul surge e ataca.
I pto M ta Invocar Diabrete — Um diabrete risonho salta de uma fenda em chamas.
I are M ca Teia — Fios grudentos cobrem a área.
I pto M ga Invocar Elemental Menor — Um pequeno elemental do terreno surge para lutar.
A pto M ga Invocar Golem — Um golem de pedra emerge do chão.
A pto M er Invocar Horror do Abismo — Tentáculos saem de uma fenda no chão.
A pto M he Invocar Cavaleiro Espectral — Um cavaleiro de luz monta guarda.
A gde L ca Chuva de Lâminas — Espadas conjuradas caem do céu sobre a área.
L pto V ta Invocar Dragão Ancestral — Um dragão de chamas rasga o céu e sopra fogo.
L gde V po Chamado do Leviatã — Uma criatura colossal emerge e esmaga tudo.`
  },
  {
    id: 'abjuracao', label: 'Abjuração', title: 'Proteção', domain: 'arcana',
    hint: 'Escudos, redomas, banimentos e anulação de magia.',
    list: `
B si P an Resistência — Um brilho leve fortalece o corpo contra o próximo dano.
B ali T et Proteção Contra o Mal — Seres profanos têm dificuldade de tocar o aliado.
B are T an Alarme — Um sino mágico toca se alguém atravessar a área.
B si P an Aparar Feitiço — Um gesto desvia uma magia menor.
I ali T et Égide — Um escudo de luz flutua diante do aliado.
I um M an Dissipar Magia — Desfaz uma magia ativa no alvo.
I pto P et Círculo de Proteção — Um círculo no chão barra criaturas profanas.
I si P an Contra-Mágica — Interrompe uma magia no meio da conjuração.
A gru P et Redoma — Uma cúpula de força protege todos dentro.
A um M an Banir — O alvo é mandado de volta ao seu plano.
A si P an Refletir Magia — Magias contra o conjurador voltam para quem lançou.
A are M an Campo Antimagia — Nenhuma magia funciona dentro da área.
L gru P et Santuário Inviolável — Nada hostil entra na área enquanto durar.
L si P an Invulnerabilidade — O corpo fica intocável por um breve instante.`
  },
  {
    id: 'transmutacao', label: 'Transmutação', title: 'Mudança', domain: 'arcana',
    hint: 'Mudar corpo, matéria e forma.',
    list: `
B obj T ca Consertar — Une as partes quebradas de um objeto.
B si P ca Salto Arcano — Pernas fortalecidas saltam três vezes mais longe.
B si P ca Garras Bestiais — As mãos viram garras afiadas.
B obj T ca Moldar Argila — Molda terra, barro ou argila com as mãos.
I um M ca Aumentar e Reduzir — O alvo cresce ou encolhe.
I si P ca Pele de Ferro — A pele vira metal escuro.
I um M ca Metal Ardente — O metal que o alvo veste esquenta até queimar.
I si P ca Forma Gasosa — O corpo vira névoa.
A um M ca Metamorfose — O alvo vira um sapo ou outro animal pequeno.
A um M ca Petrificar — O alvo vira pedra devagar, dos pés à cabeça.
A si P ca Forma Monstruosa — O conjurador vira uma aberração de garras e presas.
A obj T ca Transmutar Matéria — Muda o material de um objeto: ferro em vidro, pedra em madeira.
L um L ca Metamorfose Verdadeira — Transforma qualquer coisa em qualquer outra, para sempre.
L si P ca Forma Titânica — O conjurador cresce até o tamanho de uma torre.`
  },
  {
    id: 'adivinhacao', label: 'Adivinhação', title: 'Visão', domain: 'arcana',
    hint: 'Ver o oculto, o distante e o que ainda virá.',
    list: `
B si P an Detectar Magia — Auras mágicas brilham à vista do conjurador.
B ali T an Orientação — Uma intuição guia o próximo teste do aliado.
B obj T an Identificar — Revela as propriedades de um objeto mágico.
B um C an Detectar Pensamentos — Ouve os pensamentos superficiais do alvo.
I si P an Ver o Invisível — Revela criaturas invisíveis e ilusões.
I um M an Marca do Caçador — O alvo marcado não escapa à vista.
I pto I an Clarividência — Um olho mágico vê um lugar distante.
I si P an Presságio — Ossos lançados revelam um sinal do futuro próximo.
A um I an Vidência — Observa uma criatura onde quer que ela esteja.
A si P an Visão Verdadeira — Vê a forma real de tudo.
A obj T an Lendas e Saberes — Revela a história de um lugar ou objeto.
L si P an Previsão — O conjurador vê os golpes antes que aconteçam.
L si I an Olho de Ananque — Vê todos os fios do destino por um instante.`
  },
  {
    id: 'divina', label: 'Divina', title: 'Cura e fé', domain: 'primal',
    hint: 'Cura, bênçãos, luz sagrada e ressurreição.',
    list: `
B ali T et Cura — Luz suave fecha as feridas do aliado.
B ali C et Palavra Curativa — Uma palavra sagrada cura à distância.
B ali T et Estabilizar — Impede que um aliado caído piore.
B um C et Chama Sagrada — Fogo branco desce do alto sobre o alvo.
I gru P et Cura em Massa — Uma onda de luz cura todos os aliados próximos.
I ali T et Restauração — Remove venenos, doenças e maldições menores.
I gru P et Bênção — Os aliados ficam mais certeiros e corajosos.
I um M et Luz Sagrada — Um raio de luz divina pune os mortos-vivos.
A ali T et Regeneração — O corpo se refaz aos poucos, até membros perdidos.
A gde L et Julgamento Celeste — Lâminas de luz descem do céu sobre os profanos.
A gru P et Asas Celestes — Os aliados ganham asas de luz por pouco tempo.
A ali T et Ressurreição — Traz de volta um aliado que morreu há pouco.
L cam V et Milagre — A vontade divina se manifesta como o conjurador pedir.
L gru V et Ressurreição Verdadeira — Todos os aliados caídos voltam inteiros.`
  },
  {
    id: 'natureza', label: 'Natureza', title: 'Druidismo', domain: 'primal',
    hint: 'Raízes, espinhos, feras e florestas vivas.',
    list: `
B um C ga Espinhos — Um punhado de espinhos dispara contra o alvo.
B um C ga Raízes — Raízes brotam e prendem os pés do alvo.
B si P ga Bom Fruto — Frutos mágicos alimentam e curam um pouco.
B are C ga Névoa da Mata — Uma névoa verde esconde os aliados.
I are M ga Enxame de Insetos — Uma nuvem de insetos pica e cega.
I lin M ga Muralha de Espinhos — Uma sebe espinhosa fecha a passagem.
I si P ga Pele de Casca — A pele vira casca de árvore.
I um M ga Vinhas Constritoras — Vinhas grossas apertam o alvo.
A pto M ga Despertar Árvore — Uma árvore ganha vida e luta.
A gde L ga Floresta Súbita — Árvores brotam do nada e tomam a área.
A si P ga Forma Selvagem — O conjurador assume a forma de um urso ou grande felino.
A um M ga Esporos da Podridão — Fungos tomam o corpo do alvo.
L cam V ga Ira da Floresta — A floresta inteira se levanta contra os inimigos.
L gde V ga Primavera Eterna — Flores brotam, curam aliados e prendem inimigos.`
  },
  {
    id: 'sombras', label: 'Sombras', title: 'Arte das sombras', domain: 'proibida',
    hint: 'Furtividade, passos e sombras que agarram.',
    list: `
B si C er Passo Sombrio — Some numa sombra e reaparece em outra próxima.
B si P er Manto de Sombras — As sombras escondem o conjurador.
B um C er Lâmina de Sombra — Uma faca de sombra corta e se desfaz.
B um C er Pregar a Sombra — Uma adaga crava a sombra do alvo no chão e ele não se move.
I are M er Sombras Vivas — As sombras do chão se erguem e agarram.
I um M er Roubar Sombra — Arranca a sombra do alvo, que fica fraco e pálido.
I si P er Duplo Sombrio — A sombra do conjurador se levanta e luta ao lado.
I um M er Mordida da Sombra — A sombra do próprio alvo o morde por trás.
A gde L er Reino das Sombras — A área vira um mundo cinza onde só as sombras enxergam.
A si P er Forma de Sombra — O corpo vira sombra e atravessa paredes.
A um M er Marionete Sombria — Manipula o alvo puxando a sombra dele.
L gde V er Legião das Sombras — Cada sombra no campo vira um guerreiro.
L um L er Devorador de Sombras — Uma sombra colossal engole o alvo inteiro.`
  },
  {
    id: 'sangue', label: 'Sangue', title: 'Hemomancia', domain: 'proibida',
    hint: 'Pactos, sangrias e sangue que vira arma.',
    list: `
B um C ta Gota de Sangue — Uma gota do próprio sangue vira uma farpa vermelha.
B si P ta Pacto de Sangue — Paga vida para fortalecer a próxima magia.
B um C ta Sangria — Abre um corte que sangra sem parar.
B si P ta Farejar Sangue — Sente qualquer criatura ferida por perto.
I um M ta Lança de Sangue — O sangue derramado vira uma lança e perfura.
I um M ta Ferver Sangue — O sangue do alvo ferve nas veias.
I ali T ta Transfusão — Passa vida do conjurador para um aliado.
I pto M ta Poça Rubra — O sangue no chão vira uma armadilha de espinhos.
A um M ta Marionete de Sangue — Controla o corpo do alvo pelo sangue.
A gde L ta Chuva de Sangue — Uma chuva vermelha cura o conjurador e queima os inimigos.
A si P ta Armadura Carmesim — O sangue endurece em placas sobre o corpo.
L cam V ta Maré Carmesim — Todo sangue derramado vira uma onda vermelha.
L si P ta Senhor do Sangue — O conjurador bebe a vida de todos à volta.`
  },
  {
    id: 'tempo', label: 'Tempo', title: 'Cronomancia', domain: 'arcana',
    hint: 'Acelerar, frear, voltar e parar o tempo.',
    list: `
B si P an Reflexos Rápidos — O tempo do conjurador corre um pouco mais rápido.
B um C an Lentidão — O tempo do alvo fica arrastado.
B obj T an Envelhecer Objeto — O objeto envelhece anos num instante.
B si P an Déjà Vu — Repete o último instante e tenta de novo.
I si P an Pressa — O conjurador age duas vezes mais rápido.
I um M an Congelar Instante — O alvo para no tempo por um momento.
I ali T an Voltar Ferida — Desfaz um ferimento recente.
I si P an Retroceder — Volta à posição de alguns segundos atrás.
A gde L an Bolha Temporal — Dentro da bolha, o tempo quase para.
A um M an Envelhecer — O alvo envelhece décadas.
A si P an Eco Temporal — Uma cópia do passado repete cada golpe.
L cam V an Parar o Tempo — Tudo para, menos o conjurador.
L cam V an Rebobinar — O campo volta ao estado de um instante atrás.`
  },
  {
    id: 'espaco', label: 'Espaço', title: 'Translocação', domain: 'arcana',
    hint: 'Teleporte, portais, dobras e gravidade.',
    list: `
B si C ni Piscar — Some e reaparece a poucos passos.
B obj T ni Bolso Dimensional — Guarda um objeto num espaço oculto.
B um C ni Empurrão Espacial — Desloca o alvo alguns passos sem tocar nele.
I si M ni Porta Dimensional — Abre uma porta para outro ponto à vista.
I um M ni Trocar de Lugar — Conjurador e alvo trocam de posição.
I si I ni Teleporte — Leva o conjurador a um lugar conhecido.
I um M ni Dobra Espacial — O espaço se dobra e o golpe chega pelo outro lado.
A pto M ni Portal — Abre um portal estável entre dois lugares.
A um M ni Exílio — Manda o alvo para um vazio entre os mundos.
A are M ni Gravidade Invertida — Na área, tudo cai para cima.
A gru L ni Teleporte em Grupo — Leva todos os aliados juntos.
L pto V ni Rasgo no Espaço — Uma fenda se abre e suga tudo para o nada.
L si I ni Plano Próprio — Cria um semiplano particular.`
  },
  {
    id: 'runas', label: 'Runas', title: 'Glifos e selos', domain: 'arcana',
    hint: 'Símbolos gravados que guardam, prendem e explodem.',
    list: `
B obj T an Runa de Marca — Grava uma runa que só o conjurador enxerga.
B pto C an Runa de Explosão — Uma runa no chão explode quando pisada.
B obj T an Runa de Afiação — A arma gravada corta melhor.
B si P an Runa de Guarda — Uma runa no peito absorve um golpe.
I pto M po Glifo de Gelo — Um glifo congela quem passa por cima.
I um M an Runa de Prisão — Correntes rúnicas prendem o alvo.
I are M an Círculo Rúnico — Um círculo de runas fortalece os aliados dentro dele.
I obj T an Runa de Retorno — O objeto gravado volta à mão do dono.
A um M an Runa da Ruína — Uma runa marca o alvo e explode depois.
A obj L an Selo Arcano — Lacra uma porta ou portal para sempre.
A gde L an Chuva de Runas — Runas caem do céu e explodem em sequência.
L cam V an Palavra Primordial — Uma runa da criação reescreve o campo de batalha.
L si P an Corpo Rúnico — Runas cobrem a pele e cada uma é um feitiço pronto.`
  },
  {
    id: 'alquimia', label: 'Alquimia', title: 'Frascos e elixires', domain: 'oficio',
    hint: 'Bombas, tônicos, mutagênicos e a pedra filosofal.',
    list: `
B are C ta Fogo de Alquimista — Um frasco que explode em chamas grudentas.
B are C ga Fumaça Alquímica — Um frasco solta uma fumaça espessa que esconde.
B ali T ga Tônico — Um gole revigora o aliado.
B are C ga Óleo Escorregadio — Uma graxa espalhada derruba quem pisa.
I are M po Frasco de Geada — Um frasco que estoura numa nuvem de gelo.
I ali T ta Elixir da Fúria — O aliado bebe e entra em fúria.
I cad T an Destilar Essência — Extrai a essência mágica de uma criatura morta.
I are M ga Bomba de Estilhaços — Um frasco que explode em cacos de vidro e metal.
A pto C ga Homúnculo — Cria um pequeno ser de barro e sangue.
A gde L po Granada de Trovão — Um frasco que explode em trovão e luz.
A si P ga Mutagênico — O conjurador bebe e ganha força monstruosa.
L obj T an Pedra Filosofal — Transforma metal em ouro e concede vida longa.
L ali T et Elixir da Vida — Cura qualquer mal e devolve a juventude.`
  },
  {
    id: 'musica', label: 'Música', title: 'Arte bárdica', domain: 'primal',
    hint: 'Canções, notas e ecos que movem corpo e alma.',
    list: `
B um C ni Acorde Dissonante — Uma nota aguda fere os ouvidos.
B gru P he Canção de Coragem — Os aliados ganham coragem.
B um C ni Canção de Ninar — Adormece o alvo.
B gru P he Ritmo de Marcha — Os aliados andam mais rápido.
I con P ni Grito Sônico — Uma onda de som em cone.
I gru P et Balada da Cura — Uma melodia fecha as feridas dos aliados.
I um M ni Melodia Hipnótica — O alvo para e escuta, fascinado.
I gru P he Hino de Batalha — Os aliados batem com mais força.
A gde L er Réquiem — Uma canção fúnebre que fere os vivos.
A gde L ni Dança Irresistível — Os alvos dançam sem conseguir parar.
A pto M ni Eco Devastador — Um som que se repete e cresce até quebrar pedra.
L cam V he Canção da Criação — A música altera o mundo à volta.
L gde V ni Sinfonia do Fim — Uma orquestra fantasma toca e tudo desaba.`
  },
  {
    id: 'maldicoes', label: 'Maldições', title: 'Hexes', domain: 'proibida',
    hint: 'Azar, pragas, marcas e sinas.',
    list: `
B um C er Mau-olhado — O alvo tem azar no próximo teste.
B um C er Praga Menor — Coceira, febre e tropeços.
B um C er Marca do Corvo — Um corvo marca o alvo para morrer.
I um M er Maldição da Fraqueza — O alvo perde a força dos braços.
I um M er Maldição da Ferida Aberta — As feridas do alvo não fecham.
I um M er Boneco de Pano — O que se faz ao boneco o alvo sente.
I um M er Língua Presa — O alvo não consegue falar nem conjurar.
A um M ni Maldição da Lua — O alvo vira fera nas noites de lua.
A um M er Sina Funesta — O destino do alvo é selado para o pior.
A gde L er Maldição em Massa — Todos na área carregam um mau agouro.
A um M er Maldição do Espelho — O reflexo do alvo sai do espelho e o ataca.
L um I er Maldição Eterna — Uma maldição que passa de pai para filho.
L um V er Palavra da Morte — Uma palavra proibida que mata quem a ouve.`
  },
  {
    id: 'xamanismo', label: 'Xamanismo', title: 'Espíritos', domain: 'primal',
    hint: 'Totens, ancestrais e espíritos animais.',
    list: `
B si P ga Totem Menor — Um totem de madeira dá uma bênção leve.
B si P et Fantasma Ancestral — Um espírito ancestral sussurra conselhos.
B con P ga Uivo do Lobo — O espírito do lobo amedronta os inimigos.
I pto M po Totem da Tempestade — Um totem dispara raios em inimigos próximos.
I si P ga Espírito do Urso — A força do urso toma o corpo.
I um M et Exorcismo — Expulsa um espírito do alvo.
I gru P ga Dança dos Espíritos — Espíritos giram e protegem os aliados.
I si P et Andar entre Espíritos — Vê e toca o mundo dos espíritos.
A pto M ga Totem da Cura — Um totem cura os aliados em volta.
A gde L et Chamado dos Ancestrais — Espíritos ancestrais atacam os inimigos.
A si P ga Possessão Animal — O conjurador vê e age pelo corpo de um animal.
L gde V ga Espírito da Montanha — Um espírito colossal da terra desperta.
L si P et Avatar Ancestral — Os ancestrais tomam o corpo do conjurador.`
  },
  {
    id: 'cosmos', label: 'Cosmos', title: 'Astral', domain: 'primal',
    hint: 'Estrelas, lua, constelações e o vazio cósmico.',
    list: `
B um C ni Poeira Estelar — Um brilho estelar revela e ofusca.
B si P ni Mapa das Estrelas — Lê o céu e sabe a direção e a hora.
B um C ni Estrela Cadente — Uma estrelinha cai sobre o alvo.
I lin M ni Feixe Lunar — Um raio prateado da lua.
I um M ni Constelação — Estrelas ligadas formam uma figura que golpeia.
I si P ni Projeção Astral — O espírito sai do corpo e viaja.
I um M ni Gravidade Estelar — O alvo fica pesado como uma estrela.
A gde L ni Chuva de Estrelas — Estrelas caem e explodem em luz fria.
A pto M ni Nova — Uma estrela nasce e explode no ponto.
A gru P ni Escudo Lunar — As fases da lua giram em volta dos aliados.
L cam V ni Supernova — Uma estrela morre e leva tudo junto.
L cam V ni Eclipse — A lua cobre o sol e o poder dos inimigos se apaga.
L um V ni Olhar do Vazio Cósmico — O alvo vê o cosmos inteiro e enlouquece.`
  },
  {
    id: 'caos', label: 'Caos', title: 'Magia selvagem', domain: 'proibida',
    hint: 'Surtos, mutações, fendas e entropia.',
    list: `
B um C ca Faísca Caótica — Um efeito aleatório explode no alvo.
B um C ca Sorte Torta — Inverte o próximo resultado do alvo.
B si P ca Surto Selvagem — Um surto de magia descontrolada escapa do corpo.
I um M ca Bola do Caos — Uma esfera que muda de elemento no ar.
I are M ca Ruptura — A realidade racha na área.
I um M ca Mutação — O corpo do alvo muda sem controle.
I vol M ca Prisma do Caos — Raios de cores aleatórias saltam entre os alvos.
A gde L ca Tempestade do Caos — Chove de tudo: sapos, fogo, flores e facas.
A um M ca Desfazer — O alvo começa a deixar de existir.
A pto M ca Fenda Caótica — Uma fenda cospe criaturas impossíveis.
L cam V ca Entropia — Tudo envelhece, se quebra e desaba.
L cam V ca Caos Primordial — O mundo volta ao caos de antes da criação.`
  },
  {
    id: 'metamagia', label: 'Metamagia', title: 'Magia sobre magia', domain: 'arcana',
    hint: 'Moldar, dobrar e roubar outras magias.',
    list: `
B si P an Magia Silenciosa — A próxima magia não precisa de palavras.
B si P an Magia Distante — A próxima magia alcança o dobro da distância.
B si P an Magia Estendida — A próxima magia dura mais.
I si P an Magia Gêmea — A próxima magia atinge dois alvos.
I si P an Magia Potencializada — A próxima magia causa mais efeito.
I si P an Magia Acelerada — Lança duas magias de uma vez.
I si P an Absorver Magia — Bebe a energia de uma magia recebida.
A si P an Magia Persistente — A magia se mantém sem concentração.
A um M an Roubar Magia — Toma uma magia ativa do alvo para si.
A si P an Magia Encadeada — A próxima magia salta para mais alvos.
L si P an Magia Maximizada — A próxima magia atinge o máximo.
L si P an Desejo — Imita qualquer magia ou altera a realidade.`
  },
  {
    id: 'utilitarias', label: 'Utilitárias', title: 'Truques do dia a dia', domain: 'oficio',
    hint: 'Luz, fechaduras, idiomas e conforto na estrada.',
    list: `
B obj T he Luz — Um objeto brilha como uma tocha.
B obj T ca Abrir Fechadura — Destranca uma porta ou cadeado.
B um C ga Falar com Animais — Entende e fala com animais.
B si P ca Prestidigitação — Pequenos truques: limpar, aquecer, acender, perfumar.
B obj T ca Trancar — Fecha uma porta com magia.
B si P ni Compreender Idiomas — Entende qualquer língua falada ou escrita.
B obj T he Chama Contínua — Uma chama fria que nunca apaga.
I si P po Andar sobre a Água — Caminha sobre a água como se fosse chão.
I si P ca Patas de Aranha — Anda pelas paredes e pelo teto.
I um L ni Mensagem — Sussurra uma frase para alguém distante.
I si P he Visão no Escuro — Enxerga no breu como de dia.
I pto C ca Cabana Arcana — Uma tenda mágica protege do clima.
A pto M ca Mansão Arcana — Uma mansão extradimensional para descanso.
A obj T ca Encolher Objeto — Diminui um objeto para carregar no bolso.
L pto V ga Fortaleza Instantânea — Uma torre de pedra se ergue do nada.`
  },
  {
    id: 'rituais', label: 'Rituais', title: 'Cerimônias', domain: 'oficio',
    hint: 'Magias longas, de círculo, vela e sacrifício.',
    list: `
B pto T et Consagrar Solo — Abençoa um pedaço de chão.
B gru P et Ritual do Repouso — Um descanso curto rende como um longo.
B are T an Círculo de Sal — Um círculo de sal que espíritos não atravessam.
I si P ni Ritual da Lua Cheia — Recarrega o poder sob a lua.
I are M an Ritual de Guarda — Protege uma casa ou acampamento a noite toda.
I ali T et Unção — Um óleo sagrado fortalece por um dia.
I obj T an Encantar Item — Prende um feitiço num objeto.
A pto L ta Invocação Demoníaca — Abre o caminho para um demônio poderoso.
A mul T an Laço de Almas — Une as almas de duas criaturas.
A gde L po Ritual da Chuva — Faz chover em toda uma região.
A si P ta Ritual do Sangue Antigo — Desperta o poder dos antepassados no sangue.
L gde I er Ritual da Ruína — Amaldiçoa uma cidade inteira.
L si I an Ritual da Ascensão — O conjurador sobe a um plano superior.
L pto I et Chamado ao Primordial — Um Primordial volta os olhos para o ritual.`
  }
];

export function slugify(name) {
  return normalize(name).replace(/ /g, '-');
}

function parseLine(line, school) {
  const m = line.match(/^([BIAL]) (\w+) ([TPCMLVI]) (\w\w) (.+?) — (.+)$/);
  if (!m) throw new Error(`grimorio: linha invalida em ${school.id}: ${line}`);
  const [, tier, target, range, el, name, desc] = m;
  if (!TARGETS[target]) throw new Error(`grimorio: alvo desconhecido ${target} (${name})`);
  if (!ELEMENT_CODES[el]) throw new Error(`grimorio: elemento desconhecido ${el} (${name})`);
  return {
    id: slugify(name),
    name,
    school: school.id,
    tier: TIER_BY_CODE[tier].id,
    target: TARGETS[target],
    targetKind: target,
    range: RANGES[range],
    rangeKind: range,
    element: ELEMENT_CODES[el],
    desc
  };
}

export const SCHOOLS = SCHOOL_DATA.map(({ list, ...s }) => s);
export const SCHOOL_BY_ID = Object.fromEntries(SCHOOLS.map((s) => [s.id, s]));

export const SPELLS = SCHOOL_DATA.flatMap((school) => school.list
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => parseLine(l, school)));

export const SPELL_BY_ID = Object.fromEntries(SPELLS.map((s) => [s.id, s]));

export function getSpell(id) {
  return SPELL_BY_ID[id] || null;
}

export function tierLabel(tier) {
  return TIERS.find((t) => t.id === tier)?.label || '';
}
