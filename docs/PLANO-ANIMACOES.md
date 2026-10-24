# Plano: animações de ataques, armas e magias (Lúgubre RPG)

Para quem for implementar: leia antes `docs/PROMPT-PIXELART.md`. As regras, o estilo Stardew e o fluxo de testes são os mesmos. Este plano entra **depois** do criador de personagem (precisa do esqueleto do avatar) e do modo jogo.

## 1. Ideia central: animação automática por categoria
Cada ataque ganha animação sozinho. Ninguém desenha animação item por item. Uma função `classify(poder)` olha os campos que a ficha já tem e escolhe a animação:
- o tipo, ataque ou magia;
- o `element`;
- o `range` e o `skill`;
- o dano (`damage`), que define o tamanho do efeito;
- palavras-chave no nome.

Arma ou magia nova, criada pelo jogador ou pelo admin, já sai animada. No formulário de editar ataque/magia entra um campo **"Animação: automática ▾"** para escolher outra quando a automática não combinar.

`classify` devolve `{ familia, entrega, elemento, tipoDeDano, tamanho }`:
- **tamanho:** pequeno se o dano máximo for até 6, médio de 7 a 12, grande acima de 12;
- **tipoDeDano:** corte, perfuração, impacto ou mágico;
- **palavras-chave:** listas de regex em pt-BR, sem acento e em minúsculas. Exemplo: `adaga|faca|punhal` → adaga; `arco|flecha` → arco; `cura|bencao|protecao|escudo de luz` → bênção.

## 2. Estrutura de todo ataque (12 princípios: antecipação, ação, impacto, recuperação)
| Fase | O que acontece | Tempo |
|---|---|---|
| Antecipação | Personagem vira para o alvo e recua a arma ou junta energia; aparece o círculo do elemento no chão (magias) | 150–300 ms |
| Ação | Golpe (arco de rastro), estocada, disparo ou conjuração | 100–200 ms |
| Impacto | Pausa de 60–90 ms, flash branco no alvo, faíscas ou partículas do tipo de dano, alvo recua 2–4 px e treme, trinca de vidro e "Tomou dano!" | 200–400 ms |
| Recuperação | Volta à pose parada, o rastro some | 150–250 ms |

Variações por resultado, já que é o mestre quem decide:
- **Errou:** o golpe passa direto, o alvo desvia 3 px para o lado, aparece "Errou" e um rastro de vento.
- **Crítico** (d20 ≥ crítico da arma): antecipação mais longa, pausa de 120 ms, tremida leve de tela, flash dourado, rastro maior e "Crítico!".
- **Falha** (d20 natural 1): a arma escorrega ou a magia falha (fumaça), e o personagem tropeça.
- **Caído** (PV 0): o alvo tomba (gira 90°), fica cinza e aparece "Caído".

**Sincronização com a mesa atual:**
- O evento `roll` do ataque toca a antecipação e a ação para todos.
- O evento `token:hit`, que sai quando o mestre decide, toca o impacto ou o erro.
- A rolagem de dano toca um impacto menor.

Partículas usam semente igual ao `rollId`, para todo mundo ver o mesmo efeito. Nunca mostrar número de dano nem vida de monstro.

## 3. Armas: famílias corpo a corpo
Cada família tem 4 direções e 4–6 quadros de pose no esqueleto do avatar. A arma é uma camada presa à mão, girando quadro a quadro. Os rastros de golpe são sprites em 3 tamanhos.

| Família | Exemplos do livro e comuns | Movimento | Impacto |
|---|---|---|---|
| Adaga / faca | Adaga, Adaga Enferrujada | 2 estocadas rápidas, rastro curto | perfuração: faíscas finas |
| Espada curta | Espada curta | corte horizontal | corte: rastro branco + faíscas |
| Espada longa | Espada longa | corte diagonal amplo | corte maior |
| Montante (duas mãos) | espadões | arco por cima da cabeça, mais lento | corte + poeira no chão |
| Machado | Machado de guerra | golpe de cima para baixo, pesado | impacto + lascas |
| Martelo / maça | maças, martelos | esmagar com quique | impacto: anel de choque + poeira |
| Lança / alabarda | Lança (alcança 3 m) | estocada longa em linha | perfuração em linha |
| Foice / gadanha | foices | varredura em meia-lua | corte em arco largo |
| Chicote | chicotes | estalo ondulado | estalo + faísca na ponta |
| Cajado / bordão | cajados | giro e pancada | impacto leve |
| Punhos / garras | desarmado | soco duplo | impacto pequeno |
| Escudo | Golpe Guardião | empurrão com o escudo | impacto + o alvo recua mais |

## 4. Armas: à distância
| Família | Exemplos | Disparo | Projétil |
|---|---|---|---|
| Arco curto / longo | Arco Curto, Arco longo | puxa a corda (antecipação), solta | flecha com rastro leve, arco de altura conforme a distância |
| Besta | Besta (recarregar gasta movimento) | mira e disparo seco; animação de recarga | virote reto e rápido |
| Arremesso | Adaga (pode ser arremessada), machadinha, dardo | braço por trás da cabeça | projétil girando |
| Funda | fundas | girar e soltar | pedra |

Flecha que erra crava no chão perto do alvo e some depois de 2 s. A que acerta some com um flash no alvo.

## 5. Magias: pela forma de entrega
Na pose de conjuração, o personagem levanta as mãos ou o cajado, que brilha na cor do elemento, e aparece um círculo de runas no chão.

| Entrega | Exemplos | Animação |
|---|---|---|
| Projétil | Raio Sombrio, "bola de", "dardo", "seta" | forma-se nas mãos, viaja com rastro e explode no alvo |
| Raio contínuo | "raio", "feixe" | linha viva do conjurador ao alvo por 400 ms, cintilando |
| Área / explosão | "explosão", "chuva", "tempestade", "onda" | marca no chão, depois a explosão em anel; atinge a área |
| Toque | Golpe Guardião, "toque" | a mão brilha e há um flash colado no alvo |
| Bênção / cura | Bênção de Éter, "cura", "proteção" | aura subindo no aliado, partículas para cima e um brilho verde-dourado |
| Terreno / invocação | Vinhas de Gaia, "muralha", "espinhos" | o efeito brota do chão sob o alvo e fica alguns segundos |
| Controle | Abraço do Vazio, Vinhas de Gaia (imobiliza) | algo agarra o alvo (tentáculos, vinhas, correntes) e o ícone de condição aparece |
| Maldição / contínuo | "maldição", "veneno", "corrupção" | marca pulsando sobre o alvo enquanto a condição durar |
| Movimento | "teleporte", "passo" | some numa nuvem e reaparece |

## 6. Assinatura de cada elemento
Os 8 Primordiais e Hemera: cor, forma da partícula e movimento.
| Elemento | Cores | Partícula | Movimento |
|---|---|---|---|
| Caos | rubi e magenta | estilhaços e rachaduras na "realidade" | tremido, em zigue-zague, com efeito de glitch |
| Gaia | verde-folha e terra | folhas, pedrinhas, brotos | brota e cresce do chão |
| Ponto | azul-mar e espuma | gotas, ondas, névoa, faísca de tempestade | flui em ondas |
| Érebo | roxo-sombra e preto | fumaça, tentáculos de sombra | escorre e apaga as luzes próximas por um instante |
| Nix | índigo e prata | poeira estelar, olhos, ondas de sonho | flutua devagar, ondulando |
| Tártaro | ferrugem e carmim | brasas, elos de corrente, mancha corrompida | pesado, cai e mancha o chão |
| Éter | dourado e branco | raios de luz, penas | sobe e irradia |
| Ananque | âmbar e bronze | engrenagens, fios do destino, runas girando | gira com precisão de relógio |
| Hemera | branco-quente e sol | clarões solares | explode em luz de dia |

## 7. Monstros (`monster_attacks`, pelo nome e pela categoria)
| Família | Palavras-chave | Animação |
|---|---|---|
| Mordida | mordida, presas | o monstro avança e a mandíbula fecha no alvo |
| Garra | garra, arranhão | 3 riscos diagonais |
| Investida | investida, chifrada, atropelar | corre em linha e o alvo é empurrado |
| Sopro | sopro, baforada, cuspe | cone saindo da boca, na cor do elemento do monstro |
| Ferrão / cauda | ferrão, cauda | chicotada por cima e perfuração |
| Pancada | soco, esmagar, pisotear | anel de choque e poeira |
| Magia de monstro | qualquer nome com elemento | segue a seção 5 com o elemento da categoria do monstro |

## 8. Implementação técnica
- **Onde fica o código:** `frontend/src/lib/vfx/`
  - `classify.js` (regras e listas de palavras);
  - `timeline.js` (animação = lista de quadros-chave com tempo, easing e alvo);
  - `particles.js` (sistema de partículas leve, semente determinística, no máximo 300 partículas);
  - `sprites/` (rastros, projéteis, impactos e círculos de runas em pixel art desenhada em código, como os blocos do mapa);
  - `poses.js` (poses de ataque e conjuração no esqueleto do avatar).
- **Desenho:** um canvas de efeitos por cima do `Board`, no mesmo sistema de coordenadas do mapa, com pixels nítidos.
- **Desempenho:** 60 fps. Anima só enquanto há efeito ativo e pausa com a aba escondida.
- **Movimento reduzido:** com `prefers-reduced-motion` ligado, só um flash curto, o texto e a trinca.
- **Banco:** nenhum dado novo obrigatório. A escolha manual vai em `attacks[].animation` / `spells[].animation`, dentro do JSON da ficha, então não precisa de migração.
- **Galeria:** a página **Admin > Animações** mostra cada família, entrega e elemento tocando em loop sobre um boneco e um alvo. Serve para conferir e ajustar.

## 9. Ordem de entrega e como conferir cada fase
1. Motor: `timeline`, `particles`, canvas de efeitos, sincronização com `roll` e `token:hit`, texto e trinca. **Conferir:** um ataque genérico funciona entre 2 abas.
2. Corpo a corpo: as 12 famílias, com poses e rastros. **Conferir:** galeria e GIF de cada família.
3. À distância: arcos, besta, arremesso, funda, com projéteis e erro cravando no chão.
4. Magias: as 9 entregas × 9 elementos. Começar por Raio Sombrio, Bênção de Éter, Golpe Guardião, Vinhas de Gaia e Abraço do Vazio, que são do livro.
5. Monstros: as 7 famílias.
6. Crítico, falha, caído e o campo "Animação" no formulário.
7. Testes: `classify` acerta as armas e magias do livro; a timeline é determinística (mesma semente, mesmos quadros); e o build passa.

Em cada fase, gere PNGs ou GIFs (`ffmpeg`) das animações e olhe antes de seguir.
