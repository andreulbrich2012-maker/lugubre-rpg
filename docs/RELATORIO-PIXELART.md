# Relatório: pixel art (mapas, criador de personagem e modo jogo)

Branch `pixelart-wip`, a partir do commit de trabalho em andamento `5396d38`. Nada foi para a `master` nem para a Vercel.

## Depois do deploy: atualizar o banco

O banco ganhou uma coluna nova: `characters.appearance jsonb`, criada com `alter table ... add column if not exists`, então o schema só acrescenta coisas. Na produção, rode **Admin > Sistema > "Atualizar banco"** depois do deploy. Sem isso, salvar a aparência dá erro de coluna inexistente.

## Testes (resultado final)

| Comando | Resultado |
|---|---|
| `cd frontend && npx vitest run` | **62 de 62 passando** (9 arquivos). |
| `npm test --prefix backend` | **20 de 20 passando**, com Postgres local e as contas-semente de teste. |
| `cd frontend && npx vite build` | Build ok. |

Sobre o backend:
- Sem `DATABASE_URL` no ambiente, os 7 testes de API são pulados e 13 passam.
- Com Postgres, os testes de API precisam das sementes `SEED_ADMIN_PASSWORD=adm123` e `SEED_DEMO_PASSWORD=demo123` no `db:init`, porque `api.e2e.test.js` entra com essas senhas.

O teste que desenha todas as peças em todas as direções agora tem limite de 180 s, porque o catálogo cresceu. Na prática leva cerca de 6 s.

Também testei no navegador, contra o backend e o Postgres locais:
- **Ficha nova:** criei uma ficha (Elfo) e a etapa Aparência abriu no personagem base Sylvar. Troquei a roupa, salvei e a aparência foi gravada no banco.
- **Editar aparência:** pela ficha, troquei o cabelo para afro e o banco foi atualizado.
- **Mesa como jogador:** a câmera segue o personagem e o boneco anda e vira para o lado do movimento. O personagem para na parede. A tecla E ao lado da porta abriu o interior da casa.

## Quantidade de peças por categoria

Todas são desenhos próprios. O teste compara uma assinatura de canal e tom por pixel nas três visões e falha se duas peças forem iguais, então recolorir não conta como peça nova.

| Categoria | Peças | Mínimo pedido |
|---|---:|---:|
| Cabelos | **59** | 50 |
| Cores de cabelo | **20** | 16 |
| Roupas de tronco | **102** | 100 |
| Partes de baixo | **62** | 60 |
| Cabeça | **42** | 30 |
| Rosto | **43** | 30 |
| Orelhas | **41** | 30 |
| Pescoço | **44** | 30 |
| Costas | **40** | 30 |
| Cintura | **42** | 30 |
| Braços e pulsos | **44** | 30 |
| Mãos | **50** | 30 |
| Pernas (acessórios) | **38** | 30 |
| Pés | **48** | 30 |
| Itens na mão | **39** | (sem mínimo; o teste pede 8) |
| Tons de pele | **22** | inclui fantasiosos: rubro abissal, azul profundo, verde-cinza, lilás da noite, pedra, penas, marinha |
| Barbas | **13** | |
| Olhos e expressões | **12** estilos e **10** cores | |
| Raças do livro | **14** | todas, com traços e personagem base |

Cada peça tem de 1 a 3 canais de cor (tecido, detalhe e metal) que podem ser trocados por 38 cores.

O teste `avatar.test.js` confere essas quantidades mínimas por categoria.

## O que foi feito

### Parte 1: mapas

O embelezamento automático (`compose.js`), os telhados, os itens pegáveis, o prompt para IA e a nova `drawMap` já estavam escritos na sessão anterior. Conferi tudo nas prévias e nos testes, e completei o que faltava:
- **Luz e decoração por cena:** `light` (dia, entardecer ou noite) e `decor` (nenhuma, pouca, normal ou muita) entraram no formato do mapa (`format.js`, só são gravados quando fogem do padrão), na validação do backend (`tiles.js`) e no editor, na seção "Ambiente".
- **Evento de pegar item:** pegar um item agora emite `scene:updated` com `{changed: ['items'], items}` no lugar do antigo `scene:items`, como pede a especificação. Também emite `character:updated` e a mensagem "Kael pegou …". O teste e2e e o `docs/API-v2.md` foram atualizados.

### Parte 2: criador de personagem

**Estilo Stardew.** O contorno virou marrom-sépia, nunca preto nem roxo frio. A pele tem rampa própria, com sombra rosada e luz cor de pêssego. Os olhos são 1×2 (pupila escura e o branco do lado de fora). O cabelo tem franja em mechas pontudas com vinco entre elas e brilho em arco, e os cachos são feitos de cachinhos espalhados.

**Geradores.**
- Cabelos: máscara gerada a partir de volume, franja, comprimento e extras (rabo, coque, tranças, moicano, dreads, cachos).
- Roupas de tronco: combinam manga, gola, comprimento, fecho, estampa, acabamento e extras (colete, corpete, faixa, ombreiras, avental, tabardo, peitoral…).
- Partes de baixo: combinam comprimento, corte, saia e detalhes.
- Acessórios: um gerador por categoria.

**Personagem base de cada raça** (`RACE_BASE` em `appearance.js`), com cabelo, cores e roupa de acordo com a cultura do livro:

| Raça | Personagem base |
|---|---|
| Humano | viajante |
| Abissiano | casaco escuro |
| Celestiano | túnica de sacerdote |
| Centauro | túnica com faixa |
| Durkar | colete de ferreiro e cinto de ferramentas |
| Gorak | colete tribal e cinto de ossos |
| Kenku | casaco com capinha |
| Lumerin | blusa camponesa |
| Minotauro | peitoral com ombreiras |
| Nocthar | jaqueta e adagas |
| Primordiano | túnica ritual |
| Sylvar | túnica de caçador |
| Sátiro | colete de bardo |
| Tritão | bata de pescador |

Bancos antigos que ainda têm raças de outro cenário caem na raça do livro mais parecida: Elfo vira Sylvar, Anão vira Durkar, Tiefling vira Abissiano, Orc vira Gorak, e assim por diante.

**Código.**
- `render.js`: `buildSpriteSheet` (com cache), `composeFrame`, `frameDataUrl` (miniaturas) e `portraitDataUrl` (retrato).
- `AvatarSprite.jsx`: props `{appearance, direction, moving, scale}`.
- `AvatarCreator.jsx`:
  - Prévia grande que gira e anda.
  - Abas: Corpo, Cabelo, Rosto, Traços, Roupas, Acessórios e Na mão.
  - Busca por nome e filtro por grupo, com a lista paginada.
  - Miniaturas recortadas na parte do corpo de cada peça.
  - Cores de cada canal.
  - Botões "Aleatório", "Desfazer" e "Personagem base de …".
- O "Aleatório" parte do personagem base da raça, usa no máximo 3 acessórios, raramente cobre o rosto e tira as cores de uma única paleta combinada.

**Integração.**
- `CharacterBuilder.jsx` ganhou a etapa "Aparência" depois de "Origem", começando do personagem base da raça escolhida.
- `CharacterSheet.jsx` mostra o boneco andando e girando, com o botão "Editar aparência".
- Backend: coluna `appearance` aceita e devolvida em `character.routes.js`, mais a rota `PATCH /api/characters/:id/appearance`.

### Parte 3: modo jogo
- Em mapa de blocos, o token de personagem vira o `AvatarSprite` animado, andando na direção do movimento. Os tokens trazem a aparência da ficha.
- **Câmera do jogador:**
  - Fica perto, a 4 px de tela por pixel da arte (múltiplo inteiro, então nítida), e centrada no personagem.
  - Arrastar o mapa desliga a câmera; o botão de passos liga de novo.
  - O mestre continua com a visão geral.
- **Colisão:** a que já existia no WASD, com paredes e objetos sólidos, continua valendo, e foi testada.
- **Tecla E:**
  - Item ao alcance: abre o "Pegar".
  - Porta perto: abre o interior da construção, ou avisa que está trancada.
  - Dentro ou ao lado de uma construção: alterna o telhado.

## Arquivos alterados

**Backend**
- `backend/src/db/schema.sql`
- `backend/src/db/localStore.js`
- `backend/src/routes/character.routes.js`
- `backend/src/routes/campaign.v2.js`
- `backend/src/utils/tiles.js`
- `backend/src/v2.e2e.test.js`

**Frontend: avatar**
- `frontend/src/lib/avatar/appearance.js`
- `frontend/src/lib/avatar/body.js`
- `frontend/src/lib/avatar/compose.js`
- `frontend/src/lib/avatar/palette.js`
- `frontend/src/lib/avatar/preview.mjs`
- `frontend/src/lib/avatar/render.js` (novo)
- `frontend/src/lib/avatar/avatar.test.js`
- `frontend/src/lib/avatar/items/*.js`: hair, torso, legs, head, face, ears, neck, back, arms, hands, knees, held

**Frontend: componentes e páginas**
- `frontend/src/components/avatar/AvatarSprite.jsx` (novo)
- `frontend/src/components/avatar/AvatarCreator.jsx` (novo)
- `frontend/src/components/avatar/AppearancePanel.jsx` (novo)
- `frontend/src/components/vtt/Board.jsx`
- `frontend/src/components/vtt/TileMapEditor.jsx`
- `frontend/src/lib/tiles/format.js`
- `frontend/src/lib/tiles/format.test.js`
- `frontend/src/lib/characterBuilder.js`
- `frontend/src/pages/CharacterBuilder.jsx`
- `frontend/src/pages/CharacterSheet.jsx`
- `frontend/src/pages/CampaignRoom.jsx`
- `frontend/src/styles.css`

**Documentação**
- `docs/API-v2.md`
- `docs/pixelart/*` (prévias)

## Prévias (PNG em `docs/pixelart/`)

**Mapas**
- `mapa-blocos.png`: blocos.
- `mapa-antes-sem-embelezamento.png` e `mapa-depois-com-embelezamento.png`: o mesmo rascunho, antes e depois do embelezamento.
- `mapa-noite.png`: o mesmo mapa à noite.
- `modo-jogo-tecla-e.png`: construção aberta com a tecla E. As construções com telhado também aparecem no mapa "depois".

**Personagens**
- `avatar-racas-base.png`: as 14 raças, cada uma nas 4 direções, mais o passo de frente e de lado.
- `avatar-andando-4-direcoes.png` e `avatar-aleatorios-andando.png`: ciclo de andar nas 4 direções.
- `previa-personagens-cabelos.png`: cabelos.

**Amostras de cada categoria**
- `avatar-slot-head.png`, `-face`, `-ears`, `-neck`, `-back`, `-arms`, `-hands`, `-knees`, `-held`.
- Para tronco, partes de baixo, pés e cintura, gere com `node src/lib/avatar/preview.mjs <pasta> slot:torso` (ou `legs`, `feet`, `waist`), a partir de `frontend/`.

## O que ficou faltando ou merece revisão

1. **Push não feito.** Este PC não tem credencial do GitHub, e o `git push` falhou. Os commits estão só locais, na branch `pixelart-wip`. Para enviar: `gh auth login` e depois `git push origin pixelart-wip`.
2. **Quadro do personagem em 24×32, não 16×32.** O corpo cabe em 16 colunas (x 4–19) como pedido; as 8 colunas de margem são para asas, caudas e armas que saem do corpo. Foi decisão da sessão anterior e mantive.
3. **Blocos do mapa não foram redesenhados um a um nesta sessão.** Usam a paleta mestre no estilo Stardew aplicada antes. Também ficaram de fora o poço 2×2 e outros "stamps" de várias células; só as árvores ocupam várias células.
4. **Pré-render do mapa.** É feito em uma camada inteira fora da tela, não em pedaços. Basta até 80×80.
5. **Acessórios de um lado só.** Os que ficam só no braço ou na perna direita não aparecem de perfil, porque ali esse membro está escondido atrás do corpo.
6. **Leitura fraca em alguns casos:**
   - Brincos de 1 px.
   - Colares claros sobre túnica clara.
   - Escudo, alaúde e tambor nas costas vistos de frente.
   - O topo de cajados longos passa na frente do rosto em alguns quadros de perfil.
7. **Botão "Aleatório".** Sorteia qualquer item de cada categoria; dá para refinar por estilo (guerreiro, mago, camponês).
8. **Ambiente de teste deste PC.** A porta 55432 já era usada pelo container `noharm-demo-db-1`. O primeiro `db:init` e os testes criaram as tabelas do Lúgubre no banco `postgres` desse container; o banco `noharm` não foi tocado. A limpeza automática foi bloqueada, então essas tabelas continuam lá. O teste local passou a usar um container próprio, `lugubre-pg`, na porta 55433.


---

# Segunda rodada (plano de arte completo, seções B–J do `PROMPT-CONTINUAR`)

## Antes de publicar
- **O banco mudou de novo, só acrescentando.** A coluna `characters.appearance` já veio na primeira rodada. Itens da ficha ganharam o campo opcional `icon`, que não precisa de coluna nova (fica no jsonb). Depois do deploy: **Admin > Sistema > "Baixar cópia de segurança"** e depois **"Atualizar banco"**.
- **Este PC não está logado no GitHub nem na Vercel.** Todos os commits estão só na `pixelart-wip` local. Para publicar:
  1. `gh auth login`
  2. `git push origin pixelart-wip`
  3. `git checkout master`
  4. `git merge pixelart-wip`
  5. `git push origin master`
  6. `npx vercel login`
  7. `npx vercel link --yes --project lugubre-rpg`
  8. `npx vercel deploy --prod --yes`
- **As 180 magias e os 336 monstros citados no prompt não estão neste repositório.** Nem a `master` nem a `pixelart-wip` têm esses seeds. Por isso a arte de monstros e magias é gerada **pelo registro** (nome, elemento, tipo e descrição): o que existir no banco de produção ganha arte sozinho.

## Testes
- Frontend: **302/302**.
- Backend: **20/20** com Postgres local.
- `vite build` passa.

## O que entrou

**Personagem**
- **Cor livre** (#hex) em cabelo, barba, olhos, pele, traços e em cada canal de cada peça, com seletor "+" no criador. A rampa de luz e sombra sai da própria cor.
- **Proporção nova:** tronco de 7 linhas e perna maior, então calças, saias e joelheiras passam a se ler.
- **Correções da auditoria** (`docs/AUDITORIA-STARDEW.md`):
  - braço de perfil limpo;
  - raspados sólidos, coque redondo e nuca com pontas de mecha;
  - poá, malha e escamas redesenhados;
  - grevas sem o desenho de "E";
  - joias, piercings, cicatrizes e tatuagens legíveis (2 px ou mais, brilho e contraste).
- **As 29 armas do livro na mão**, com 55 itens na mão no total.

**Mapas**
- **50 blocos novos**, feitos com o pintor em código `tiles/paint.js` (mesma rampa e contorno sépia):
  - 18 terrenos, entre eles mar e lodo animados e solos do Tártaro e de Éter que pulsam e brilham;
  - cerca de pedra e sebe;
  - 16 objetos;
  - 10 construções grandes de várias células: poço, moinho, barraca de feira, carroça, barco, fonte, estátua, forja, tenda e pedra grande;
  - 4 árvores novas: carvalho grande, macieira, cerejeira e palmeira.
- **Os códigos novos são letras acentuadas**, porque o ASCII acabou. Frontend e backend aceitam.
- **Repintura** dos terrenos chapados: terra, areia, neve, pântano, gelo, lama, cinzas e abismo.
- **Transições** na ordem água < areia < terra < grama < neve. Decoração por bioma também nos terrenos novos.
- **Telhados:** 8 opções (4 materiais × 2 cores), chaminé nas casas grandes, e telhado automático na mesa para salas fechadas com porta.
- **Prompt da IA** explica objetos grandes e códigos acentuados.
- **Fluxo do editor testado no navegador:** descrever → copiar prompt → colar resposta → "Usar este mapa" salvou a cena.

**Ícones e criaturas**
- **Ícones de itens:** 190 desenhos (mínimo pedido: 150) mais as 29 armas em ferro, aço e ouro encantado.
  - Escolha automática pelo nome, com seletor manual no item.
  - Aparecem no inventário, no item pegável do mapa (que agora brilha com o próprio ícone) e no "Pegar".
- **Monstros:** 91 bases por elemento.
  - Os epítetos são variantes reais (paleta e detalhes) e o tamanho cresce com o nível.
  - Parado, andando e ataque, nas 4 direções.
  - Bestiário com retrato; token de monstro ou NPC sem imagem vira o sprite.
- **Ícones de magias e técnicas:** moldura por elemento × 12 formas, e arma × 7 manobras. Aparecem na Biblioteca, no Admin e na ficha.

**Animações**
- 32 famílias (12 corpo a corpo, 4 à distância, 9 magias, 7 de monstro) e 9 assinaturas de elemento.
- Resultados acerto, crítico, erro, falha no 1 e caído.
- Galeria em **Admin > Animações**.
- Ligadas na mesa: o evento `roll` toca o ataque e o `token:hit` toca o impacto. A semente é o rollId, então todos veem igual.

## Prévias novas (`docs/pixelart/`)
- `mapa-vila-objetos-grandes.png`, `mapa-vila-rascunho.png`, `mapa-vila-noite.png`, `mapa-terrenos-transicoes.png`
- `icones-itens.png`, `icones-armas.png`, `icones-magias.png`, `icones-tecnicas.png`
- `monstros-bases.png`, `monstros-variantes.png`, `monstros-andando.png`
- `animacoes.png`
- `auditoria/*`: as folhas de todas as categorias do criador, refeitas.

## O que ficou faltando ou merece revisão
- **Animações não vistas tocando ao vivo.** No navegador de teste o painel ficava escondido e o `requestAnimationFrame` não roda em aba oculta. Os quadros foram conferidos nas folhas PNG, o evento chega e registra o ataque, e os 53 testes passam. Vale ver ao vivo numa mesa de verdade.
- **Poses de ataque do personagem** (o boneco golpeando) ainda não existem. A animação usa o efeito por cima do boneco.
- **Monstros:** o nível é estimado (não há coluna de nível); quadrúpedes de frente ficam estreitos; a aranha e a esfinge a 16 px leem fraco.
- **Ícones:** as raízes de Gaia parecem um "Ω"; espadas parecidas a 24 px; dardos, linguiça, cinto, pote de mel e bestas mais fracos.
- **Pendências do catálogo** (nomes de raças diferentes do livro, raças, origens e perícias faltando): o prompt manda perguntar antes de mexer, então não mexi. Por enquanto as raças antigas caem na raça do livro mais parecida, só para a aparência.

# Terceira rodada (construções 3D, portas, regras do mestre, estilos)

## O que entrou
- **Construções no estilo Stardew** (`frontend/src/lib/buildings/kit.js`): visão 3/4 de verdade — fachada, telhado em perspectiva (frontal, empena, celeiro/gambrel, plano com ameias), varandas, toldos, pórticos, campanários, torres, silos, palafitas, ruínas, casa-cogumelo e tenda. Contorno sépia, luz de cima-esquerda, sombra no chão.
- **Catálogo de 250 projetos** (`designs.js`): 100 casas (pequenina → mansão, 15 formatos), fazenda (celeiros, estábulos, silos, estufas, moinhos), comércio (lojas, padaria, taverna, ferraria, mercado...), cidade (prefeitura, biblioteca, escola, quartel, farol, muralhas), religião (capelas, igrejas, templos, criptas) e fantasia/ruínas (torres de mago, cabana da bruxa, castelos, iurtas).
- **Material e cores trocáveis sem refazer nada**: cada construção do mapa guarda `design` + `material` (tábuas, troncos, pedra, tijolo, reboco/enxaimel, tábuas verticais, vidro) + `roofStyle` (telha, ardósia, palha, tabuinhas, vidro) + `colors` (telhado, parede, detalhes). 7 materiais × 5 telhados × cores livres → bem mais de 500 combinações. Trocar material puxa a cor natural (tijolo avermelhado, palha dourada); o mestre pode recolorir. Mapas antigos (casas desenhadas com paredes) passam a usar o mesmo kit.
- **Interiores prontos** (`interiors.js`): 15 tipos (casa, taverna, loja, ferraria, alquimista, biblioteca, capela/igreja, celeiro/estábulo, armazém, quartel, prefeitura, torre, cripta, moinho, mansão) com cômodos, portas, móveis e luz; o tamanho segue o projeto. "Criar interior" no painel da casa já gera o mapa mobiliado.
- **Editor de mapa mais simples**: abas Pintar / Construções / Itens / Ambiente; galeria de construções com busca e filtro de tamanho; na IA, perguntas "Itens para pegar? Sim/Não" e "Monstros no mapa? Sim/Não" (monstros viram tokens ao salvar).
- **Água nova** (rasa, funda, rio, cachoeira, mar, lodo) com espuma animada nas margens, e **20 estilos de mapa** (Obscuro, Arco-íris, Outono, Inverno, Sépia, Gótico, Neon, Aquarela...) que valem para chão, construções, personagens e monstros.
- **Cursor do mestre** aparece para os jogadores (botão para esconder).

## Prévias
`construcoes-casas.png`, `construcoes-2.png`, `construcoes-3.png`, `construcoes-materiais.png`, `interiores.png`, `interiores-casas.png`, `agua-nova.png`, `estilos-de-mapa.png`.

## Depois do deploy
O schema só acrescentou colunas (`campaign_scenes.parent_scene_id`, `parent_building_id`, `campaigns.table_rules`, `characters.appearance`): depois do deploy, Admin > Sistema > backup e "Atualizar banco".
