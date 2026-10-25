# Golpes de arma

<!-- Gerado por frontend/src/lib/fx/weapons/docs.mjs a partir de catalog.js. Edite o catálogo e rode de novo. -->

Catálogo dos golpes animados das armas: **11 famílias de movimento**, **30 armas** e **269 golpes** (base + exclusivos).

Como funciona:

- **Família de movimento** (lâminas leves, pesadas, haste, arco…): tem os golpes base. O golpe base é o movimento, o tempo e o rastro.
- **Arma**: é a ferramenta desenhada no golpe, com o mesmo sprite da arma na mão do personagem. Herda todos os golpes da família e pode ajustar o formato do rastro, a cor das faíscas e o impacto, além de somar técnicas exclusivas.
- **Elemento** (Caos, Gaia, Ponto, Érebo, Nix, Tártaro, Éter, Ananque, Hemera) pinta o rastro, a lâmina e as partículas. Golpes marcados com "cor padrão" usam aquele elemento quando o ataque não tem nenhum.
- **Resultado**: acerto, crítico (maior, dourado, hit-stop mais longo), erro (o alvo se esquiva, o projétil crava no chão), falha (a arma escapa da mão e o atacante fica tonto) e caído.

Como escolher o golpe de um ataque (ver `docs/ANIMACOES.md`):

1. Campo `animation: { family, move }` no poder. `family` aceita a família de movimento (`pesadas`), o id da arma (`machado-de-guerra`) ou uma família antiga (`corte`).
2. Palavras no nome: "Golpe giratório", "Estocada dupla", "Lança: estocada tripla", "Chuva de flechas"…
3. Sem golpe nomeado, a mesa sorteia pelo `rollId` entre os golpes da arma (fora os de montaria e em dupla). Todos os clientes veem o mesmo golpe.

Resumo:

| Família | Golpes base | Armas (exclusivos) |
|---|---|---|
| Lâminas leves | 22 | Espada curta (+2), Espada longa (+2), Sabre (+2), Rapieira (+2), Foice (+2) |
| Armas pesadas | 20 | Montante (+2), Machado de guerra (+2), Martelo de guerra (+2) |
| Contundentes e machados de uma mão | 18 | Maça (+2), Machadinha (+2) |
| Armas de haste | 20 | Lança (+2), Alabarda (+2), Gadanha (+2), Cajado (+2), Bordão (+2) |
| Adagas e facas | 18 | Adaga (+2), Faca de caça (+2) |
| Chicotes e correntes | 17 | Chicote (+2), Mangual (+2) |
| Desarmado e manoplas | 20 | Manoplas (+2), Garras de ferro (+2) |
| Escudo | 16 | Escudo (+1) |
| Arcos | 25 | Arco curto (+1), Arco longo (+2) |
| Bestas | 19 | Besta leve (+1), Besta (+1) |
| Arremesso | 18 | Dardos (+1), Azagaia (+2), Machadinha arremessada (+2), Funda (+3) |

## Lâminas leves

Espadas de uma mão, sabres, rapieira e foice: golpes rápidos, rastro fino e preciso.

Ferramenta padrão: Espada longa.

### Golpes base (22)

| Golpe | Movimento | Descrição | id |
|---|---|---|---|
| Corte horizontal | Corte | Varre a lâmina da esquerda para a direita na altura do peito. | `corte-horizontal` |
| Corte diagonal descendente | Corte | Ergue a lâmina acima do ombro e desce na diagonal. | `corte-diagonal` |
| Corte ascendente | Corte | Parte de baixo e sobe rasgando, jogando o alvo para cima. | `corte-ascendente` |
| Estocada | Estocada | Avança o pé da frente e crava a ponta em linha reta. | `estocada` |
| Estocada dupla | Estocada | Duas estocadas seguidas, alta e baixa. | `estocada-dupla` |
| Giro | Giro | Gira o corpo inteiro com a lâmina estendida. | `giro` |
| Combo de três golpes | Combo | Corte, contracorte e estocada final, avançando a cada golpe. | `combo-tres` |
| Golpe com salto | Salto | Salta sobre o alvo e desce a lâmina com o peso do corpo. | `golpe-com-salto` |
| Golpe de pomo | Esmagamento | Inverte a pegada e bate com o pomo no rosto do alvo. | `golpe-de-pomo` |
| Aparar e contra-atacar | Contra-ataque | Apara o golpe inimigo com um tinido e responde na hora. | `aparar-contra` |
| Corte em arco amplo | Corte | Um corte largo de meia-volta que cobre tudo à frente. | `arco-amplo` |
| Investida | Investida | Corre até o alvo e atravessa com a ponta à frente. | `investida` |
| Golpe giratório no chão | Giro | Agacha e gira rente ao chão para derrubar. | `giro-rasteiro` |
| Desarmar | Especial | Prende a arma do alvo com a lâmina e a arranca da mão dele. | `desarmar` |
| Golpe final | Especial | Concentra força com a lâmina erguida e desce um corte pesado. | `finalizacao` |
| Corte cruzado | Combo | Dois cortes diagonais que se cruzam em X no alvo. | `corte-cruzado` |
| Rajada de cortes | Combo | Cinco cortes curtos e rápidos, quase sem respirar. | `rajada-de-cortes` |
| Corte atravessado | Investida | Passa pelo alvo como um vulto e corta no caminho. | `corte-atravessado` |
| Lâmina de Tártaro | Elemental | A lâmina pega fogo antes de um corte diagonal. *(elemento, cor padrão Tártaro)* | `lamina-de-tartaro` |
| Corte de Érebo | Elemental | Some numa sombra e reaparece cortando do outro lado. *(elemento, cor padrão Érebo)* | `corte-de-erebo` |
| Carga montada | Montaria | Passa a galope e corta de cima da sela. *(montaria)* | `carga-montada` |
| Golpe em dupla | Dupla | Um aliado ataca pelo outro lado no mesmo instante. *(em dupla)* | `golpe-em-dupla` |

### Armas da família

#### Espada curta — 24 golpes

Sprite: `espada-curta` · rastro fino e rápido · faíscas: aço (branco-azulado).

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Gládio no flanco | Estocada | Encosta no alvo e crava a lâmina curta por baixo da guarda. | `gladio-no-flanco` |
| Cortes curtos | Combo | Dois talhos curtos e secos, quase sem recuar o braço. | `cortes-curtos` |

#### Espada longa — 24 golpes

Sprite: `espada-longa` · rastro médio · faíscas: aço (branco-azulado).

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Meia-espada | Estocada | Segura a lâmina pelo meio e crava como uma lança curta. | `meia-espada` |
| Corte do falcão | Salto | Salta bem alto e desce como um falcão. | `corte-do-falcao` |

#### Sabre — 24 golpes

Sprite: `cimitarra` · rastro largo (arco aberto) · faíscas: aço (branco-azulado).

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Corte de cavalaria | Montaria | Golpe largo de cima do cavalo, a lâmina curva rasgando. *(montaria)* | `corte-de-cavalaria` |
| Molinete | Giro | Gira o sabre no pulso, dois círculos, e corta. | `molinete` |

#### Rapieira — 24 golpes

Sprite: `rapieira` · rastro fino e rápido · faíscas: aço (branco-azulado).

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Flecha do esgrimista | Investida | Atravessa a distância num pulo e crava a ponta fina. | `fleche` |
| Cem estocadas | Combo | Uma nuvem de estocadas finas em volta do coração do alvo. | `cem-estocadas` |

#### Foice — 24 golpes

Sprite: `foice-curta` · rastro largo (arco aberto) · faíscas: aço (branco-azulado).

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Gancho da foice | Agarrar | Engancha o alvo pela lâmina curva e puxa. | `gancho-da-foice` |
| Ceifa baixa | Corte | Corta rente ao chão como quem colhe trigo. | `ceifa-baixa` |

## Armas pesadas

Montante, machado de guerra e martelo de guerra: antecipação longa, rastro largo e impacto que treme o chão.

Ferramenta padrão: Montante.

### Golpes base (20)

| Golpe | Movimento | Descrição | id |
|---|---|---|---|
| Golpe descendente | Esmagamento | Ergue a arma bem alto e desce com tudo. | `golpe-descendente` |
| Varredura pesada | Corte | Um golpe horizontal largo que arrasta o alvo. | `varredura-pesada` |
| Golpe ascendente | Esmagamento | Arrasta a arma no chão e sobe arremessando o alvo. | `golpe-ascendente` |
| Redemoinho | Giro | Duas voltas completas com a arma, ganhando velocidade. | `redemoinho` |
| Salto esmagador | Salto | Salta alto e cai com a arma sobre o alvo. | `salto-esmagador` |
| Ombrada | Investida | Arranca correndo com a arma baixa e acerta com o ombro. | `ombrada` |
| Golpe sísmico | Esmagamento | Crava a arma no chão e a fenda corre até o alvo. | `golpe-sismico` |
| Cabo no estômago | Esmagamento | Golpe curto com a ponta do cabo para abrir a guarda. | `golpe-de-cabo` |
| Dois tempos | Combo | Desce a arma e, sem parar, sobe de volta. | `dois-tempos` |
| Meia-lua colossal | Corte | Um arco gigantesco de lado a lado. | `meia-lua-colossal` |
| Varredura baixa | Corte | Passa a arma rente ao chão nas pernas do alvo. | `varredura-baixa` |
| Aparar e contra-atacar | Contra-ataque | Segura o golpe na lâmina larga e devolve com força. | `aparar-contra` |
| Golpe carregado | Especial | Treme segurando a arma no alto e solta tudo de uma vez. | `golpe-carregado` |
| Quebra-guarda | Esmagamento | Golpe de cima pensado para atravessar escudo e armadura. | `quebra-guarda` |
| Fúria | Combo | Quatro golpes pesados alternados, avançando. | `furia` |
| Golpe incandescente | Elemental | A arma esquenta até brilhar e desce soltando brasas. *(elemento, cor padrão Tártaro)* | `golpe-incandescente` |
| Fenda de Gaia | Elemental | O chão se abre em espinhos de pedra até o alvo. *(elemento, cor padrão Gaia)* | `fenda-de-gaia` |
| Execução | Especial | Salta, ergue a arma sobre a cabeça e encerra a luta. | `execucao` |
| Carga montada | Montaria | Desce a arma pesada do alto do cavalo em pleno galope. *(montaria)* | `carga-montada` |
| Golpe em dupla | Dupla | Abre a guarda do alvo para o aliado acertar junto. *(em dupla)* | `golpe-em-dupla` |

### Armas da família

#### Montante — 22 golpes

Sprite: `montante` · rastro pesado e grosso · faíscas: aço (branco-azulado).

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Giro do montante | Giro | Uma volta e meia com a lâmina enorme estendida. | `giro-do-montante` |
| Meia-espada pesada | Estocada | Segura a lâmina pelo meio e empurra a ponta com o corpo. | `meia-espada-pesada` |

#### Machado de guerra — 22 golpes

Sprite: `machado-de-guerra` · rastro largo (arco aberto) · faíscas: faíscas laranja · impacto: cut.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Racha-crânio | Esmagamento | Desce o machado reto no topo da cabeça. | `racha-cranio` |
| Machado arremessado | Arremesso | Arremessa o machado pesado, girando como uma roda. | `machado-arremessado` |

#### Martelo de guerra — 22 golpes

Sprite: `martelo` · rastro pesado e grosso · faíscas: cacos de pedra · todo acerto solta onda no chão.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Martelo do trovão | Elemental | O martelo junta raios e desce num estrondo. *(elemento, cor padrão Ponto)* | `martelo-do-trovao` |
| Arremesso do martelo | Arremesso | Atira o martelo girando, que volta para a mão. | `arremesso-do-martelo` |

## Contundentes e machados de uma mão

Maça e machadinha: golpes curtos e fortes, fáceis de encadear.

Ferramenta padrão: Maça.

### Golpes base (18)

| Golpe | Movimento | Descrição | id |
|---|---|---|---|
| Golpe lateral | Esmagamento | Bate de lado na altura da cabeça. | `golpe-lateral` |
| Golpe descendente | Esmagamento | Ergue e desce a cabeça da arma sobre o alvo. | `golpe-descendente` |
| Golpe ascendente | Esmagamento | Sobe por baixo do queixo e levanta o alvo. | `golpe-ascendente` |
| Golpe duplo | Combo | Ida e volta, dois golpes no mesmo fôlego. | `golpe-duplo` |
| Combo de três golpes | Combo | Lado, outro lado e um golpe de cima para terminar. | `combo-tres` |
| Giro | Giro | Gira no próprio eixo e bate com o embalo. | `giro` |
| Golpe com salto | Salto | Pula e acerta de cima com o peso do corpo. | `golpe-com-salto` |
| Golpe de cabo | Esmagamento | Cutucão com a ponta do cabo para atordoar. | `golpe-de-cabo` |
| Quebra-joelho | Esmagamento | Golpe baixo e seco no joelho do alvo. | `quebra-joelho` |
| Aparar e contra-atacar | Contra-ataque | Desvia o golpe com a cabeça da arma e devolve. | `aparar-contra` |
| Investida | Investida | Corre e bate no embalo da corrida. | `investida` |
| Rajada | Combo | Cinco golpes curtos e rápidos. | `rajada` |
| Arremesso | Arremesso | Atira a arma girando no alvo. | `arremesso` |
| Golpe na têmpora | Esmagamento | Pancada rápida na cabeça que deixa o alvo tonto. | `golpe-na-tempora` |
| Golpe carregado | Especial | Junta força com a arma erguida e solta de uma vez. | `golpe-carregado` |
| Golpe radiante | Elemental | A cabeça da arma brilha como o sol no impacto. *(elemento, cor padrão Hemera)* | `golpe-radiante` |
| Golpe final | Especial | Três passos, um salto e o golpe mais pesado que tem. | `golpe-final` |
| Golpe em dupla | Dupla | Ataca junto com um aliado pelos dois lados. *(em dupla)* | `golpe-em-dupla` |

### Armas da família

#### Maça — 20 golpes

Sprite: `maca` · rastro médio · faíscas: faíscas laranja.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Esmagar armadura | Esmagamento | Golpe de cima pensado para amassar placas de metal. | `esmagar-armadura` |
| Maça sagrada | Elemental | A maça se acende com luz de Éter e abençoa o golpe. *(elemento, cor padrão Éter)* | `maca-sagrada` |

#### Machadinha — 20 golpes

Sprite: `machadinha` · rastro largo (arco aberto) · faíscas: faíscas laranja · impacto: cut.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Machadinha giratória | Arremesso | Arremessa a machadinha girando e ela volta para a mão. | `machadinha-giratoria` |
| Gancho de machadinha | Agarrar | Engancha o alvo pela barba do machado e puxa. | `gancho-de-machadinha` |

## Armas de haste

Lança, alabarda, gadanha, cajado e bordão: alcance longo, estocadas e varreduras.

Ferramenta padrão: Lança.

### Golpes base (20)

| Golpe | Movimento | Descrição | id |
|---|---|---|---|
| Estocada | Estocada | Empurra a haste e crava a ponta. | `estocada` |
| Estocada dupla | Estocada | Recolhe e crava de novo, alto e baixo. | `estocada-dupla` |
| Estocada tripla | Estocada | Três estocadas em ritmo, avançando um passo. | `estocada-tripla` |
| Varredura | Corte | Gira a haste num arco largo na altura da cintura. | `varredura` |
| Golpe descendente | Esmagamento | Desce a haste inteira como um açoite de madeira. | `golpe-descendente` |
| Giro de haste | Giro | Roda a haste nas mãos duas vezes antes de bater. | `giro-de-haste` |
| Mergulho | Salto | Usa a haste de vara para saltar e cai cravando a ponta. | `mergulho` |
| Investida | Investida | Corre com a haste baixa e trespassa o alvo. | `investida` |
| Rasteira | Corte | Varre as pernas do alvo com a haste rente ao chão. | `rasteira` |
| Golpe de cabo | Esmagamento | Vira a haste e acerta com a ponta de trás. | `golpe-de-cabo` |
| Aparar e contra-atacar | Contra-ataque | Bloqueia com a haste atravessada e responde com a ponta. | `aparar-contra` |
| Cem estocadas | Combo | Uma chuva de estocadas curtas, rápidas demais para contar. | `cem-estocadas` |
| Empalar | Estocada | Junta força e atravessa o alvo de lado a lado. | `empalar` |
| Arremesso | Arremesso | Arremessa a própria haste como um dardo. | `arremesso` |
| Molinete defensivo | Giro | Gira a haste à frente do corpo e emenda uma estocada. | `molinete` |
| Golpe ascendente | Corte | Sobe a ponta por baixo e levanta o alvo. | `golpe-ascendente` |
| Recuo e estocada | Estocada | Dá um passo atrás para ganhar distância e crava a ponta. | `recuo-e-estocada` |
| Lança de Ponto | Elemental | A ponta se cobre de água e gelo e explode no alvo. *(elemento, cor padrão Ponto)* | `lanca-de-ponto` |
| Justa | Montaria | Carga a cavalo com a haste apoiada, como num torneio. *(montaria)* | `justa` |
| Golpe em dupla | Dupla | Prende o alvo com a haste para o aliado acertar. *(em dupla)* | `golpe-em-dupla` |

### Armas da família

#### Lança — 22 golpes

Sprite: `lanca` · rastro fino e rápido · faíscas: aço (branco-azulado).

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Parede de lanças | Estocada | Três estocadas abertas em leque, fechando a passagem. | `parede-de-lancas` |
| Lança cadente | Salto | Salta altíssimo e cai com a lança apontada para baixo. | `lanca-cadente` |

#### Alabarda — 22 golpes

Sprite: `alabarda` · rastro largo (arco aberto) · faíscas: aço (branco-azulado).

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Gancho da alabarda | Agarrar | Engancha o alvo com o espigão de trás e derruba. | `gancho-da-alabarda` |
| Machado de haste | Esmagamento | Usa a lâmina de machado da alabarda num golpe de cima. | `machado-de-haste` |

#### Gadanha — 22 golpes

Sprite: `foice` · rastro pesado e grosso · faíscas: aço (branco-azulado) · impacto: cut.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Ceifa da gadanha | Corte | Um arco gigantesco com a lâmina curva da gadanha. | `ceifa-da-gadanha` |
| Colheita das almas | Elemental | Gira a gadanha envolta em sombra de Érebo. *(elemento, cor padrão Érebo)* | `colheita-das-almas` |

#### Cajado — 22 golpes

Sprite: `cajado-cristal` · rastro médio · faíscas: brilho dourado · impacto: crush.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Ponta arcana | Elemental | O cristal do cajado estoura energia de Caos na estocada. *(elemento, cor padrão Caos)* | `ponta-arcana` |
| Luz do cajado | Elemental | Ergue o cajado, o cristal brilha com Éter e desce no alvo. *(elemento, cor padrão Éter)* | `luz-do-cajado` |

#### Bordão — 22 golpes

Sprite: `bordao` · rastro médio · faíscas: lascas de madeira · impacto: crush.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Duas pontas | Combo | Bate com uma ponta e emenda com a outra. | `duas-pontas` |
| Salto do peregrino | Salto | Finca o bordão, salta por cima e cai batendo. | `salto-do-peregrino` |

## Adagas e facas

Adaga e faca de caça: perto do alvo, muitos golpes curtos, arremessos e truques.

Ferramenta padrão: Adaga.

### Golpes base (18)

| Golpe | Movimento | Descrição | id |
|---|---|---|---|
| Corte rápido | Corte | Um talho curto, mais rápido que o olho. | `corte-rapido` |
| Estocada | Estocada | Crava a ponta entre as costelas. | `estocada` |
| Estocada dupla | Estocada | Duas facadas em sequência. | `estocada-dupla` |
| Rajada de facadas | Combo | Corte, facada, corte, facada, corte. | `rajada` |
| Corte cruzado | Combo | Dois talhos em X. | `corte-cruzado` |
| Punhalada pelas costas | Especial | Passa por trás do alvo e crava a lâmina nas costas. | `pelas-costas` |
| Arremesso de adaga | Arremesso | Atira a adaga girando direto no alvo. | `arremesso` |
| Leque de lâminas | Arremesso | Três lâminas arremessadas em leque. | `leque-de-laminas` |
| Corte ascendente | Corte | Abre o alvo de baixo para cima. | `corte-ascendente` |
| Giro | Giro | Gira rente ao alvo com a lâmina para fora. | `giro` |
| Bote | Salto | Salta como um gato e crava a lâmina de cima. | `bote` |
| Cortar o tendão | Corte | Agacha e corta atrás do tornozelo. | `cortar-tendao` |
| Golpe de cabo | Esmagamento | Bate com o cabo na têmpora. | `golpe-de-cabo` |
| Aparar e contra-atacar | Contra-ataque | Desvia com a lâmina curta e responde com uma facada. | `aparar-contra` |
| Finta | Especial | Ameaça um golpe alto e crava baixo. | `finta` |
| Golpe na garganta | Especial | Mira com calma e crava de uma vez onde mais dói. | `golpe-na-garganta` |
| Lâmina de Érebo | Elemental | Vira sombra, atravessa o alvo e corta ao sair. *(elemento, cor padrão Érebo)* | `lamina-de-erebo` |
| Golpe em dupla | Dupla | Enquanto o aliado distrai, a adaga entra pelo flanco. *(em dupla)* | `golpe-em-dupla` |

### Armas da família

#### Adaga — 20 golpes

Sprite: `adaga` · rastro fino e rápido · faíscas: aço (branco-azulado).

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Dança das adagas | Giro | Gira em volta do alvo cortando de todos os lados. | `danca-das-adagas` |
| Punhal oculto | Estocada | Esconde a lâmina junto ao corpo e crava por baixo. | `punhal-oculto` |

#### Faca de caça — 20 golpes

Sprite: `faca-de-caca` · rastro médio · faíscas: aço (branco-azulado).

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Esfolar | Combo | Dois cortes descendentes fundos, como quem tira o couro. | `esfolar` |
| Bote do caçador | Investida | Corre abaixado e crava a faca de uma vez. | `bote-do-cacador` |

## Chicotes e correntes

Chicote e mangual: a arma serpenteia até o alvo, enrola, puxa e estala.

Ferramenta padrão: Chicote.

### Golpes base (17)

| Golpe | Movimento | Descrição | id |
|---|---|---|---|
| Chicotada | Chicotada | A tira serpenteia e estala no alvo. | `chicotada` |
| Chicotada dupla | Chicotada | Duas chicotadas, ida e volta. | `chicotada-dupla` |
| Estalo | Chicotada | Estala a ponta bem no rosto do alvo. | `estalo` |
| Chicotada de cima | Chicotada | Gira a arma acima da cabeça e desce sobre o alvo. | `chicotada-descendente` |
| Rasteira | Agarrar | A tira corre no chão e laça os tornozelos. | `rasteira` |
| Enrolar | Agarrar | A tira dá voltas no alvo e o prende. | `enrolar` |
| Puxão | Agarrar | Enrola e puxa o alvo com força para perto. | `puxao` |
| Giro | Giro | Gira a arma em volta do corpo e solta no alvo. | `giro` |
| Laço | Agarrar | Roda a tira no alto como um laço e captura o alvo. | `laco` |
| Chicotada em X | Combo | Duas chicotadas diagonais que se cruzam. | `chicotada-em-x` |
| Rajada de chicotadas | Combo | Quatro estalos curtos seguidos. | `rajada` |
| Desarmar | Especial | Laça a arma do alvo e arranca da mão dele. | `desarmar` |
| Chicotada saltando | Salto | Salta e chicoteia lá de cima. | `salto` |
| Estalo no chão | Esmagamento | Estala no chão e a onda de poeira corre até o alvo. | `estalo-no-chao` |
| Corrente tensa | Estocada | Lança a ponta reta como uma lança. | `corrente-tensa` |
| Chicote de brasas | Elemental | A tira pega fogo e deixa um rastro de brasas. *(elemento, cor padrão Tártaro)* | `chicote-de-brasas` |
| Golpe final | Especial | Gira duas vezes ganhando força e estala com tudo. | `golpe-final` |

### Armas da família

#### Chicote — 19 golpes

Sprite: `chicote` · rastro fino e rápido · faíscas: lascas de madeira.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Estalo duplo | Chicotada | Dois estalos tão rápidos que soam como um só. | `estalo-duplo` |
| Laço do domador | Agarrar | Enrola o pescoço do alvo e o força a se curvar. | `laco-do-domador` |

#### Mangual — 19 golpes

Sprite: `mangual` · rastro pesado e grosso · faíscas: faíscas laranja · impacto: crush · corrente curta com bola de ferro.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Bola de demolição | Esmagamento | Gira a bola acima da cabeça e a desce como uma marreta. | `bola-de-demolicao` |
| Mangual giratório | Giro | Três voltas com a bola à frente, uma barreira de ferro. | `mangual-giratorio` |

## Desarmado e manoplas

Manoplas e garras de ferro: socos, ganchos, joelhadas e agarrões.

Ferramenta padrão: Manoplas.

### Golpes base (20)

| Golpe | Movimento | Descrição | id |
|---|---|---|---|
| Jab | Estocada | Soco curto e rápido com a mão da frente. | `jab` |
| Direto | Estocada | Soco reto com o peso do corpo. | `direto` |
| Cruzado | Corte | Gancho de lado no queixo. | `cruzado` |
| Uppercut | Corte | Soco de baixo para cima que tira o alvo do chão. | `uppercut` |
| Um-dois | Combo | Jab e direto em sequência. | `um-dois` |
| Combo de três | Combo | Jab, direto e uppercut. | `combo-tres` |
| Soco giratório | Giro | Gira o corpo e acerta com as costas do punho. | `soco-giratorio` |
| Soco saltado | Salto | Pula e desce o punho como um martelo. | `soco-saltado` |
| Ombrada | Investida | Corre e trombada com o ombro. | `ombrada` |
| Rajada de socos | Combo | Seis socos curtos alternando as mãos. | `rajada` |
| Soco no chão | Esmagamento | Bate no chão e a onda derruba o alvo. | `soco-no-chao` |
| Joelhada | Esmagamento | Puxa o alvo e sobe o joelho. | `joelhada` |
| Aparar e contra-atacar | Contra-ataque | Bloqueia com o antebraço e devolve um direto. | `aparar-contra` |
| Esquiva e contra | Contra-ataque | Gira o tronco para fora do golpe e acerta de volta. | `esquiva-e-contra` |
| Agarrão | Agarrar | Agarra o alvo, levanta e joga no chão. | `agarrao` |
| Cotovelada | Esmagamento | Golpe curto de cotovelo, colado no alvo. | `cotovelada` |
| Chute giratório | Giro | Gira no calcanhar e acerta um chute largo. | `chute-giratorio` |
| Soco carregado | Especial | Treme o punho juntando força e solta um direto devastador. | `soco-carregado` |
| Punho de Tártaro | Elemental | O punho pega fogo e explode no alvo. *(elemento, cor padrão Tártaro)* | `punho-de-tartaro` |
| Golpe em dupla | Dupla | Segura o alvo para o aliado bater. *(em dupla)* | `golpe-em-dupla` |

### Armas da família

#### Manoplas — 22 golpes

Sprite: `manoplas` · rastro médio · faíscas: faíscas laranja.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Punho de ferro | Esmagamento | Direto blindado que amassa o alvo e treme o chão. | `punho-de-ferro` |
| Martelo duplo | Esmagamento | Junta as duas manoplas e desce como um martelo. | `martelo-duplo` |

#### Garras de ferro — 22 golpes

Sprite: `garras-de-ferro` · rastro três riscos de garra · faíscas: aço (branco-azulado) · impacto: claw.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Rasgar | Combo | Duas patadas de garra, de cima e de baixo. | `rasgar` |
| Frenesi de garras | Combo | Seis riscos de garra seguidos, sem pausa. | `frenesi-de-garras` |

## Escudo

Escudo como arma: empurrões, pancadas de borda, bloqueios e arremesso.

Ferramenta padrão: Escudo.

### Golpes base (16)

| Golpe | Movimento | Descrição | id |
|---|---|---|---|
| Empurrão | Investida | Empurra com o escudo inteiro, soltando uma onda de choque. | `empurrao` |
| Golpe de borda | Esmagamento | Bate com a borda do escudo de lado. | `golpe-de-borda` |
| Investida com escudo | Investida | Corre escondido atrás do escudo e atropela. | `investida` |
| Aparar e refletir | Defesa | Segura o golpe e devolve a força numa onda. | `aparar-e-refletir` |
| Contra-ataque | Contra-ataque | Bloqueia e emenda uma pancada com a borda. | `contra-ataque` |
| Salto esmagador | Salto | Salta e cai com o escudo por cima do alvo. | `salto-esmagador` |
| Arremesso de escudo | Arremesso | Arremessa o escudo girando, que volta para a mão. | `arremesso` |
| Giro | Giro | Gira o corpo e bate com o escudo no embalo. | `giro` |
| Golpe duplo | Combo | Empurrão e pancada de borda em sequência. | `golpe-duplo` |
| Muralha | Defesa | Finca os pés, o escudo brilha e a onda empurra tudo. | `muralha` |
| Rasteira | Esmagamento | Desce a borda do escudo no pé do alvo. | `rasteira` |
| Golpe ascendente | Esmagamento | Sobe a borda por baixo do queixo. | `golpe-ascendente` |
| Tremor | Esmagamento | Bate a borda do escudo no chão e a onda corre até o alvo. | `tremor` |
| Ricochete | Arremesso | O escudo quica no chão antes de acertar o alvo. | `ricochete` |
| Escudo de Éter | Elemental | O escudo se enche de luz celestial e empurra o alvo. *(elemento, cor padrão Éter)* | `escudo-de-eter` |
| Golpe em dupla | Dupla | Segura o alvo contra o escudo enquanto o aliado ataca. *(em dupla)* | `golpe-em-dupla` |

### Armas da família

#### Escudo — 17 golpes

Sprite: `escudo` · rastro largo (arco aberto) · faíscas: aço (branco-azulado).

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Guarda inabalável | Defesa | Apara dois golpes seguidos e devolve com um empurrão. | `guarda-inabalavel` |

## Arcos

Arco curto e arco longo: tiros únicos, leques, chuvas de flechas e tiros carregados.

Ferramenta padrão: arco.

### Golpes base (25)

| Golpe | Movimento | Descrição | id |
|---|---|---|---|
| Tiro | Disparo | Puxa a corda e solta uma flecha. | `tiro` |
| Tiro duplo | Disparo | Duas flechas, uma atrás da outra. | `tiro-duplo` |
| Leque de flechas | Disparo | Três flechas de uma vez, abertas em leque. | `leque` |
| Tiro carregado | Especial | Segura a corda no limite até a flecha brilhar. | `tiro-carregado` |
| Chuva de flechas | Disparo | Atira para o alto e as flechas caem sobre o alvo. | `chuva-de-flechas` |
| Tiro perfurante | Disparo | A flecha atravessa o alvo e segue em frente. | `tiro-perfurante` |
| Tiro rápido | Disparo | Saca, encaixa e solta numa puxada curta. | `tiro-rapido` |
| Rajada de três | Disparo | Três flechas soltas em sequência, quase sem intervalo. | `rajada-de-tres` |
| Tiro em parábola | Disparo | A flecha sobe alto e cai no alvo. | `tiro-alto` |
| Tiro saltando | Salto | Salta para trás e atira no ar. | `tiro-saltando` |
| Tiro à queima-roupa | Disparo | Chega perto e atira quase encostado. | `queima-roupa` |
| Rajada | Disparo | Cinco flechas seguidas, tão rápido quanto puxa. | `rajada` |
| Tiro de cobertura | Disparo | Quatro flechas em volta do alvo para mantê-lo abaixado. | `tiro-de-cobertura` |
| Tiro em movimento | Disparo | Avança sem parar de atirar: duas flechas no caminho. | `tiro-em-movimento` |
| Flecha que ricocheteia | Disparo | Quica no chão antes do alvo e sobe de surpresa. | `flecha-ricochete` |
| Flecha explosiva | Especial | Uma flecha com um saquinho de pólvora que estoura no alvo. *(cor padrão Tártaro)* | `flecha-explosiva` |
| Flecha de corda | Agarrar | Uma flecha amarrada numa corda que puxa o alvo. | `flecha-arpao` |
| Tiro curvo | Disparo | A flecha faz uma curva para contornar a cobertura. | `tiro-curvo` |
| Recuo e tiro | Disparo | Dá dois passos para trás e atira. | `recuo-e-tiro` |
| Flecha rasante | Disparo | Atira baixo, rente ao chão, nas pernas. | `flecha-rasante` |
| Flecha de fogo | Elemental | A ponta pega fogo com Tártaro antes de soltar. *(elemento, cor padrão Tártaro)* | `flecha-de-tartaro` |
| Tiro montado | Montaria | Atira em pleno galope. *(montaria)* | `tiro-montado` |
| Tiro em dupla | Dupla | Atira junto com um aliado que ataca de perto. *(em dupla)* | `tiro-em-dupla` |
| Tiro no ponto fraco | Especial | Prende a respiração, mira na fresta da armadura e solta. | `ponto-fraco` |
| Flecha final | Especial | A flecha mais pesada da aljava, carregada até a corda gemer. | `flecha-final` |

### Armas da família

#### Arco curto — 26 golpes

Sprite: `arco` · rastro fino e rápido · faíscas: aço (branco-azulado) · projétil: flecha.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Tiro ágil | Disparo | Pula de lado e atira duas flechas no ar. | `tiro-agil` |

#### Arco longo — 27 golpes

Sprite: `arco-longo` · rastro fino e rápido · faíscas: aço (branco-azulado) · projétil: flecha.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Tiro de longo alcance | Disparo | Mira para o céu e acerta o alvo lá longe. | `tiro-de-longo-alcance` |
| Flecha de guerra | Disparo | Uma flecha grossa de ponta larga que derruba. | `flecha-de-guerra` |

## Bestas

Besta leve e besta: virotes retos e rápidos, recargas e disparos pesados.

Ferramenta padrão: Besta.

### Golpes base (19)

| Golpe | Movimento | Descrição | id |
|---|---|---|---|
| Disparo | Disparo | Mira e solta o virote. | `disparo` |
| Disparo pesado | Disparo | Um virote grosso que empurra o alvo para trás. | `disparo-pesado` |
| Disparo duplo | Disparo | Dois virotes lado a lado. | `disparo-duplo` |
| Disparo perfurante | Disparo | O virote atravessa o alvo. | `disparo-perfurante` |
| Recarga com manivela | Disparo | Gira a manivela, arma o virote pesado e dispara. | `recarga-manivela` |
| Virote ricocheteante | Disparo | O virote quica numa pedra e acerta o alvo. | `virote-ricochete` |
| Disparo de cobertura | Disparo | Três virotes em volta do alvo para segurar o avanço. | `disparo-de-cobertura` |
| Recarga rápida | Combo | Dispara, recarrega num estalo e dispara de novo. | `recarga-rapida` |
| Disparo em parábola | Disparo | Mira para cima e o virote cai no alvo. | `disparo-alto` |
| Rajada | Disparo | Três virotes seguidos de uma besta de repetição. | `rajada` |
| Disparo carregado | Especial | Gira a manivela até o arco da besta brilhar. | `disparo-carregado` |
| Saraivada | Disparo | Virotes para o alto que caem em cima do alvo. | `saraivada` |
| Disparo rasante | Disparo | Ajoelha e atira nas pernas. | `disparo-rasante` |
| Disparo saltando | Salto | Salta para trás e dispara no ar. | `disparo-saltando` |
| Disparo à queima-roupa | Disparo | Encosta a besta no alvo e dispara. | `queima-roupa` |
| Coronhada | Esmagamento | Vira a besta e bate com a coronha. | `coronhada` |
| Virote explosivo | Elemental | Um virote com carga de Tártaro que explode no alvo. *(elemento, cor padrão Tártaro)* | `virote-explosivo` |
| Disparo montado | Montaria | Dispara de cima do cavalo. *(montaria)* | `disparo-montado` |
| Virote final | Especial | Mira longa, respiração presa e um virote que derruba. | `virote-final` |

### Armas da família

#### Besta leve — 20 golpes

Sprite: `besta-leve` · rastro fino e rápido · faíscas: aço (branco-azulado) · projétil: virote.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Disparo de quadril | Disparo | Saca e atira da cintura, sem mirar. | `disparo-de-quadril` |

#### Besta — 20 golpes

Sprite: `besta` · rastro fino e rápido · faíscas: aço (branco-azulado) · projétil: virote.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Virote arpão | Agarrar | Um virote preso a uma corda que puxa o alvo. | `virote-arpao` |

## Arremesso

Dardos, azagaia e funda: tudo que sai da mão voando.

Ferramenta padrão: Dardos.

### Golpes base (18)

| Golpe | Movimento | Descrição | id |
|---|---|---|---|
| Arremesso | Arremesso | Atira com o braço inteiro. | `arremesso` |
| Leque | Arremesso | Três projéteis abertos em leque. | `leque` |
| Rajada | Arremesso | Três arremessos seguidos, um em cada mão. | `rajada` |
| Arremesso alto | Arremesso | Atira para o alto e o projétil cai sobre o alvo. | `arremesso-alto` |
| Arremesso giratório | Giro | Gira o corpo e solta no embalo. | `arremesso-giratorio` |
| Arremesso saltando | Salto | Salta e atira lá de cima. | `arremesso-saltando` |
| Recuo e arremesso | Arremesso | Pula para trás e atira enquanto recua. | `recuo-e-arremesso` |
| Arremesso rasante | Arremesso | Rente ao chão, direto nas pernas. | `rasante` |
| Chuva | Arremesso | Um punhado jogado para o alto que cai no alvo. | `chuva` |
| Arremesso duplo | Arremesso | Um com cada mão, ao mesmo tempo. | `arremesso-duplo` |
| Arremesso perfurante | Arremesso | Tão forte que atravessa o alvo. | `arremesso-perfurante` |
| Arremesso curvo | Arremesso | Com efeito, faz uma curva no ar. | `arremesso-curvo` |
| Golpe de mão | Estocada | Usa o projétil na mão como punhal. | `golpe-de-mao` |
| Arremesso carregado | Especial | Mira com calma e atira com toda a força. | `arremesso-carregado` |
| Ricochete | Arremesso | Quica no chão e sobe no alvo. | `ricochete` |
| Arremesso de Nix | Elemental | O projétil deixa um rastro de estrelas da noite. *(elemento, cor padrão Nix)* | `arremesso-de-nix` |
| Arremesso em dupla | Dupla | Atira enquanto o aliado avança sobre o alvo. *(em dupla)* | `arremesso-em-dupla` |
| Arremesso final | Especial | O arremesso mais forte, com o corpo todo. | `arremesso-final` |

### Armas da família

#### Dardos — 19 golpes

Sprite: `dardos` · rastro fino e rápido · faíscas: aço (branco-azulado) · projétil: dardo.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Três dardos | Arremesso | Três dardos em linha, quase colados. | `tres-dardos` |

#### Azagaia — 20 golpes

Sprite: `azagaia` · rastro médio · faíscas: aço (branco-azulado) · projétil: azagaia.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Azagaia poderosa | Arremesso | Corre três passos e arremessa com o corpo todo. | `azagaia-poderosa` |
| Investida com azagaia | Investida | Usa a azagaia como lança curta numa corrida. | `investida-com-azagaia` |

#### Machadinha arremessada — 20 golpes

Sprite: `machadinha` · rastro largo (arco aberto) · faíscas: faíscas laranja · projétil: a própria arma, girando · impacto: cut.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Machadinha bumerangue | Arremesso | A machadinha gira no alvo e volta para a mão. | `machadinha-bumerangue` |
| Duas machadinhas | Arremesso | Uma machadinha em cada mão, arremessadas juntas. | `duas-machadinhas` |

#### Funda — 21 golpes

Sprite: `funda` · rastro fino e rápido · faíscas: cacos de pedra · projétil: pedra · impacto: crush · a pedra gira acima da cabeça antes de sair.

| Exclusivo | Movimento | Descrição | id |
|---|---|---|---|
| Pedra pesada | Esmagamento | Uma pedra do tamanho de um punho, girada até zunir. | `pedra-pesada` |
| Giro da funda | Giro | Gira a funda acima da cabeça ganhando força e solta. | `giro-da-funda` |
| Cascalho | Arremesso | Um punhado de pedrinhas espalhadas de uma vez. | `cascalho` |

