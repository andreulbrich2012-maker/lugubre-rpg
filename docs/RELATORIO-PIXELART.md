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
