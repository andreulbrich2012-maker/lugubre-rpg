# Animações de ataque e magia

Efeitos de golpe e magia em pixel art no estilo Stardew Valley: partículas grossas (1–3 pixels de arte), cores quentes com variação de matiz, golpes curtos com hit-stop, flash branco e um tremor pequeno. Tudo é desenhado em código num `<canvas>` (só `fillRect`), sem pacotes novos.

- Biblioteca: `frontend/src/lib/fx/` (`index.js` exporta tudo)
- Camada React: `frontend/src/components/fx/FxLayer.jsx`
- Galeria: Admin → **Animações** (`components/admin/AdminAnimationsPage.jsx`)
- Folha de conferência: `docs/pixelart/animacoes.png` (gerar de novo com `node src/lib/fx/preview.mjs <pasta> tudo`)
- Testes: `cd frontend && npx vitest run src/lib/fx`
- Golpes de arma: `frontend/src/lib/fx/weapons/` · catálogo completo em `docs/GOLPES.md` · folha `docs/pixelart/animacoes-armas.png`

## Classificação automática

`classify(power, { monster })` → `{ family, group, form, element, label }`

Lê `name`, `type`, `element`, `range`, `description` e `requirement`, sem diferenciar acentos nem maiúsculas. O nome pesa mais que a descrição. Com isso, armas e magias novas já recebem uma animação sem cadastro extra. Para forçar uma animação, o item pode trazer o campo `animation`: `"raio"` ou `{ "family": "garra", "element": "Caos" }`.

| Grupo | Famílias |
|---|---|
| Corpo a corpo (12) | corte, estocada, esmagamento, giratorio, investida, chicotada, soco, garra, escudo, corte-duplo, montante, haste |
| Distância (4) | flecha, virote, arremesso, funda |
| Magia (9 formas) | projetil, raio, area, toque, bencao, terreno, controle, maldicao, movimento |
| Monstro (7) | mordida, garra-fera, investida-fera, sopro, ferrao, pancada, magia-fera |

Os elementos (Caos, Gaia, Ponto, Érebo, Nix, Tártaro, Éter, Ananque e Hemera) definem a paleta de cada efeito (5 tons, do escuro ao claro), a forma da partícula (estilhaço, folha, gota, fumaça, estrela, brasa, cruz, anel, raio) e o movimento dela (tremor, balanço, respingo, deriva, pisca, sobe, irradia, órbita, explosão). Golpes sem elemento usam faíscas de aço.

## Golpes de arma

Os ataques com arma não usam mais um único traço por família: cada arma tem de 15 a 27 golpes animados (269 no total). A lista legível está em `docs/GOLPES.md`, gerada a partir do catálogo.

**Organização.** Armas que lutam do mesmo jeito reaproveitam a animação base e trocam só a ferramenta desenhada.

- **Família de movimento** (11): lâminas leves, armas pesadas, contundentes e machados de uma mão, haste, adagas e facas, chicotes e correntes, desarmado e manoplas, escudo, arcos, bestas e arremesso. Cada uma tem de 16 a 25 golpes base, com o movimento, o tempo e o rastro definidos.
- **Arma** (30): herda os golpes da família e é desenhada com o mesmo sprite da mão do avatar (`lib/avatar/items/held.js`), girado em 32 passos. Pode ajustar o rastro (fino, médio, largo, pesado ou garra), a cor das faíscas (aço, faísca, lasca, pedra ou ouro), o impacto, a onda no chão (martelo) e o projétil (flecha, virote, dardo, azagaia, pedra ou a própria arma girando). Pode também somar de 1 a 3 técnicas exclusivas.
- **Golpe**: é uma sequência de segmentos: balanço (`sw`), estocada (`th`), giro (`sp`), pose de carga, aparar ou mira (`hd`), arremesso (`tw`), disparo (`sh`), chicotada (`ls`) e fenda no chão (`gr`). Cada golpe define também o deslocamento do atacante (passo, avanço, investida, salto, atravessar o alvo, recuo), a reação do alvo (empurrão, arremessado para cima, puxado, rasteira, cambaleio, tontura, desarme, agarrão), o impacto, o tremor, o elemento padrão e os extras de montaria (cavalo) e de golpe em dupla (aliado atacando pelo outro lado).

**Escolha do golpe.**

1. `animation: { family, move }` no poder. `family` aceita a família de movimento (`'pesadas'`), o id da arma (`'machado-de-guerra'`) ou uma família antiga (`'corte'`), e `move` é o id ou o nome do golpe. Também dá para passar `{ weapon: 'lanca' }`.
2. Palavras no nome ou no campo `weapon`/`requirement`: a arma sai de `weaponIdFor` (`lib/icons/weapons.js`) e o golpe do nome, com o termo mais específico ganhando ("Estocada dupla" vence "Estocada"). O nome da arma sozinho nunca puxa golpe: "Besta pesada" não vira "Disparo pesado".
3. Sem golpe nomeado, o efeito sorteia um golpe pelo `rollId` entre os da arma, deixando de fora os de montaria e os em dupla, e, para arma de distância longe do alvo, os que exigem aproximação. Como a semente é a mesma, todos os clientes veem o mesmo golpe, e ataques repetidos variam.

`classify()` devolve, além de `family`, os campos `weaponFamily`, `weapon` e `move` (este é `null` quando sai do sorteio). Na galeria ou num teste, `createEffect({ weapon, weaponFamily, move })` toca um golpe direto. `moves: false` volta ao traço antigo da família, e `{ family: 'corte' }` sem arma também continua no efeito antigo.

**Fases.** Na antecipação, a arma passa do ponto de partida, o atacante recua ou agacha e a ponta brilha ("ting"). Na ação, o rastro é uma fita de pixels que vai da ponta, quase branca, para dentro, em tons mais escuros com variação de matiz, e afina na cauda com pontilhado. Golpes rápidos deixam fantasmas da arma. Acertos intermediários de combos e rajadas têm flash, faíscas, poeira e um tremor curto. O contato final tem hit-stop e o impacto da família. Na recuperação, o atacante recua um pouco e volta, e a arma desce e some.

**Resultados.** No erro, o alvo se esquiva e o projétil crava no chão perto dele. No crítico, o golpe sai maior, o rastro mais claro, há brilho dourado e a flecha cravada pisca. Na falha, a arma escapa da mão, gira e cai atrás do atacante. Caído funciona como antes.

**Sincronização.** O evento `roll` toca o golpe até o contato. O `token:hit` do mesmo `rollId` assume o resto: recuo do atacante, arma voltando e impacto (`eff.linked`). Se o impacto chegar depois do contato, o ataque termina sozinho a recuperação e o impacto mostra só os efeitos no alvo. `onImpact` agora também informa `move` e `weapon`.

**Galeria.** Admin → Animações → aba **Golpes de arma**: família × arma × golpe (base e exclusivos) × elemento × resultado × distância, com os botões Tocar, Repetir e "Sortear pelo rollId", que mostra qual golpe a mesa escolheria. A aba "Famílias, magias e monstros" é a galeria antiga.

**Folhas.** `node src/lib/fx/weapons/preview.mjs <pasta> tudo` gera a folha geral. Use `familia <id>` para uma família, ou `golpe <arma> <golpe> [resultado] [elemento] [quadros]` para um golpe quadro a quadro. Para refazer o documento, rode `node src/lib/fx/weapons/docs.mjs ../docs/GOLPES.md`.

## Fases e variantes

**antecipação → ação (rastro) → impacto → recuperação**

- **Impacto:** hit-stop de 60 ms (100 ms no crítico), em que o relógio da animação congela; flash branco em estrela; partículas; tremor pequeno. O texto "Tomou dano!" continua com o Board, e a camada só avisa pelo `onImpact`.
- **Erro (`miss`):** o golpe passa ao lado ou o projétil cai depois do alvo, com o vento do golpe e poeira. O alvo se esquiva. Não há flash nem tremor.
- **Crítico (`crit`):** efeito 35% maior, brilhos dourados, anel extra e tremor dobrado.
- **Falha (`fumble`, 1 natural):** o golpe sai curto, o atacante tropeça, sobe uma nuvenzinha cômica e estrelas giram na cabeça dele.
- **Caído (`downed`, ou `down: true`):** depois do impacto, o alvo afunda e levanta poeira dos dois lados.
- **`prefers-reduced-motion`:** só um clarão curto no alvo, sem voo, tremor ou partículas.

## Sincronização na mesa

O mesmo golpe precisa aparecer igual em todos os clientes. Para isso, **a semente das partículas é sempre o `rollId`**. As partículas saem de um RNG determinístico, e a posição de cada uma é uma fórmula do tempo, sem estado entre quadros. Assim, todos veem a mesma coisa, em qualquer taxa de quadros.

1. **Evento `roll` com `kind: 'attack'`:** todos tocam a fase de ataque (antecipação e ação), que termina no contato.
   `const atk = fxFromRoll(roll, { tokens, cell, powers }); if (atk) layer.attack(atk)`
   - `powers` é a lista de ataques/magias conhecida (ficha ou biblioteca), usada para achar o item pelo `powerName`. Sem ela, a classificação usa o `powerName` ou o `label`.
   - Com 1 natural, `fxFromRoll` devolve `phase: 'full'`: a trapalhada toca inteira na hora, então use `layer.play(atk)`.
   - 20 natural (ou o `critOn` informado) gera `result: 'crit'`.
2. **Evento `token:hit`, quando o mestre decide:** todos tocam o impacto.
   `const imp = fxFromHit(hit, { tokens, cell, attack: atk }); if (imp) layer.impact(imp)`
   - `outcome: 'miss'` vira um erro; `'hit'` vira acerto (ou crítico, se a rolagem foi crítica); `'heal'` vira bênção. `down` vira a variante de queda.
   - Se o ataque com o mesmo `rollId` ainda estiver no ar, o impacto espera o contato. Se chegar depois, toca na hora.
   - Se não houver rolagem associada (mestre aplicando dano direto), o impacto toca sozinho no alvo.

Guarde `atk` por `rollId` (um `Map` com cerca de 20 entradas basta) para usar no `token:hit`.

## FxLayer

```jsx
<FxLayer ref={fxRef} width={width} height={height} cell={cell}
  onFrame={({ shake, tokens }) => { /* tremer o mapa; tokens[id] = { x, y, flash } */ }}
  onImpact={(info) => { /* { id, seed, result, down, family, element, toId, fromId } */ }} />

fxRef.current.play({ kind: 'corte', from: { x, y }, to: { x, y }, element: 'Érebo', result: 'hit', seed: rollId })
fxRef.current.attack(opts)   // só a fase de ataque
fxRef.current.impact(opts)   // só o impacto
fxRef.current.clear()
```

- As coordenadas são **px do mapa** (o centro do token: `tokenCenter(token, cell)`). A camada fica dentro da div que já recebe `translate/scale(view.z)`, então acompanha o zoom.
- `pixel` (opcional) define quantos px do mapa valem 1 pixel de efeito. O padrão é `cell / 16`, igual aos tiles.
- Em vez de `kind`, dá para passar `power` (o objeto do ataque) e `monster` para classificar na hora.
- `onFrame` também é chamado uma última vez com tudo zerado quando o efeito termina, então pode ser aplicado direto.

## Grimório (magias com animação própria)

O Grimório é um catálogo **visual** de 442 magias em 34 escolas, cada uma com 4 níveis (básica, intermediária, avançada e lendária). Cada magia tem nome, escola, nível, alvo, alcance, um efeito em uma frase, um elemento sugerido e uma **animação própria**. Ele não é regra: o livro ainda não define escolas de magia, e nada aqui mexe em custo, dano ou atributo. A lista legível está em `docs/GRIMORIO.md`.

- Dados: `frontend/src/lib/fx/spells/catalog.js` (uma linha por magia)
- Animações: `spells/recipes.js` (uma receita por magia), `spells/prims.js` (primitivas), `spells/engine.js` (linha do tempo, corpos e tremor), `spells/sprites.js` (criaturas e símbolos) e `spells/palettes.js`
- Ligação poder → magia: `spells/match.js`
- Página: **/grimorio** (no menu, em "Grimório de magias", e no Admin → Animações), `pages/Grimoire.jsx` + `components/fx/SpellStage.jsx`
- Folha de conferência: `docs/pixelart/animacoes-magias.png`. Para gerar de novo, rode `QUADROS=3 ESCALA=200% node src/lib/fx/spells/preview.mjs <pasta> folha hit animacoes-magias.png`. Também dá para gerar uma escola só (`... <pasta> fogo`) ou uma lista de ids (`... <pasta> bola-de-fogo,meteoro crit`).
- Testes: `npx vitest run src/lib/fx/spells`

### Como um poder toca uma magia do Grimório

1. **Vínculo explícito.** No cadastro do poder, use `"animation": { "spell": "bola-de-fogo" }` ou `"animation": "magia:bola-de-fogo"`.
2. **Nome igual.** A comparação ignora acentos e maiúsculas: "BOLA DE FOGO", "Bola de Fogo" e "Magia: Bola de Fogo" dão no mesmo. Também valem sinônimos conhecidos, como "Fireball", "Animar Mortos" e "Mísseis Mágicos".
3. **Nome que contém o de uma magia** com 7 letras ou mais: "Bola de Fogo Maior" toca `bola-de-fogo`.
4. Sem casamento, a escolha volta para o classificador por família (seções acima). Se o campo `animation` apontar uma família (`"animation": "raio"`), ele também vence o nome. Técnicas de arma (`type: "poder"`, ou com `weapon`) só entram no Grimório por vínculo explícito.

O `createPlayer` e o `FxLayer` decidem isso sozinhos: `fxFromRoll` e `fxFromHit` continuam iguais, e o mesmo `rollId` sincroniza o ataque e o impacto. Para tocar uma magia direto, use `fx.play({ spell: 'meteoro', from, to, result, element, seed })`. Passar `kind`/`family` força a família antiga, e `spell: false` desliga o Grimório.

### Receitas

Cada receita é uma linha de passos separados por `;`. Cada passo chama uma primitiva:

```
'bola-de-fogo': 'sigil hex; orb s=3 trail=ember tl=10; blast r=1.4; ring r=1.8; cracks n=4 r=1'
```

- **Primitivas (45):**
  - Círculo de conjuração e energia: `sigil`, `gather`, `glow`.
  - Projéteis e feixes: `orb` (orbe, lança, estilhaço, rocha, frasco, nota, caveira...), `beam` (reto, ziguezague, duplo, espiral, pulso, prisma), `chain`, `cone`, `wave`, `streak`, `drain`.
  - Explosões e ondas: `blast`, `burst`, `ring`, `nova`.
  - Vindo do céu e do chão: `pillar`, `bolt` (raio do céu), `meteor` (queda com sombra e cratera), `rain`, `wall`, `spikes`, `roots` (raízes, vinhas, tentáculos, correntes, teia, mãos).
  - Proteção e aura: `dome` (redoma, jaula, bolha, bloco de gelo, casulo de pedra), `aura`, `shield`, `heal`.
  - Símbolos e criaturas: `glyph` (caveira, olho, coração, ampulheta...), `summon` (esqueleto, lobo, diabrete, golem, corvo, cavaleiro, dragão, árvore, horror, leviatã...).
  - Ilusão e espaço: `copies` (duplos, imagens espelhadas, exército ilusório), `puff`, `portal`, `vortex`, `tornado`, `clock` (parar, acelerar, voltar e frear o tempo).
  - Área e ambiente: `cloud`, `swarm`, `slash`, `cracks`, `floor` (gelo, lava, ácido, sangue, lama, flores, sombra, sal), `weather` (chuva, neve, cinzas, areia, escuridão, sol, estrelas, folhas), `tint`, `flash`, `mark`, `maze`, `transform` (sapo, estátua, ouro, fera, gigante), `wings`, `threads`, `twinkle`, `sound`.
  - Controle (não desenham): `body` (empurrar, puxar, erguer, afundar, tremer, congelar, sumir, teleportar, saltar, trocar de lugar, investir até o alvo) e `shake`.
- **Opções comuns:**
  - `at=c|t|n|b|m|h`: conjurador, alvo, perto do alvo, atrás do conjurador, meio do caminho ou mão.
  - `ph=cast|travel|hit|span|all`: em que fase o passo toca.
  - `d` e `len`: atraso e duração, em fração da fase. `ms` dá a duração em milissegundos.
  - `p=<rampa>`: troca a cor só daquele passo.
- **Flags da receita:**
  - `@rampa`: cor da magia (fire, ice, acid, blood, bone, holy, arcane, shadow, space, rune...).
  - `calm`: não fere, então não empurra e não pisca branco.
  - `move`: deslocamento do conjurador.

### Variantes e nível

- **Nível:** a básica é curta (cerca de 1 s) e a lendária é longa (cerca de 2,5 s), com mais tremor de tela. Toda lendária ganha uma tinta de tela.
- **Acerto:** hit-stop e flash branco no alvo, só nas magias que ferem.
- **Crítico:** efeito 30% maior, brilho dourado e tremor dobrado.
- **Erro:** a magia cai ao lado do alvo, e ele se esquiva. Em cura ou bênção, o erro vira acerto.
- **Falha:** a conjuração sai curta e explode em fumaça no próprio conjurador, com estrelinhas na cabeça.
- **Caído:** o alvo afunda depois do impacto.
- **Elemento:** um elemento explícito (`element: 'Nix'`) repinta toda a magia com a rampa do Primordial.
- **`prefers-reduced-motion`:** só um clarão curto, sem voo nem tremor.

Tudo é determinístico pelo `rollId`: cada passo sorteia de novo, a cada quadro, com a mesma semente. Assim, todos os clientes veem os mesmos pixels.

Os tokens recebem, além de `x`, `y` e `flash`, o campo `alpha` (0 a 1) em `onFrame`, que é usado por invisibilidade e teleporte. Hoje o Board ignora esse campo; só o palco do Grimório o aplica.
