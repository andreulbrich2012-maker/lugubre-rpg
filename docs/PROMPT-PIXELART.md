# Prompt para continuar as pixel arts do Lúgubre RPG

No outro PC: abra o Claude Code numa pasta vazia e cole tudo abaixo (da linha "---" em diante). Ele mesmo clona o projeto.

---

Você vai continuar o sistema de mapas em pixel art e o criador de personagens do **Lúgubre RPG**, meu site de RPG dark fantasy em pt-BR. O código está no GitHub: `https://github.com/andreulbrich2012-maker/lugubre-rpg`, branch **`pixelart-wip`** (é onde está o trabalho em andamento). React 18 + Vite + Tailwind em `frontend/`, Express + Postgres em `backend/`, publicado na Vercel. Outra sessão começou este trabalho e parou no meio. **Antes de tudo:**
1. `git clone https://github.com/andreulbrich2012-maker/lugubre-rpg.git && cd lugubre-rpg && git checkout pixelart-wip && npm install`
2. Veja o que já foi feito: `git log --oneline -5` e `git show --stat HEAD` (o último commit é o trabalho em andamento). Leia os arquivos citados abaixo. Não recomece do zero.
3. Monte o ambiente local de teste (só local, nunca aponte para o banco de produção):
   - Postgres: `docker run -d --name lugubre-pg -e POSTGRES_PASSWORD=lugubre -p 55432:5432 postgres:17` (se não houver Docker, use um Postgres local qualquer).
   - Crie `backend/.env` a partir de `backend/.env.example` com `DATABASE_URL=postgres://postgres:lugubre@localhost:55432/postgres`, um `JWT_SECRET` qualquer, `CLIENT_URL=http://127.0.0.1:5177,http://localhost:5177` e `SEED_ADMIN_PASSWORD`/`SEED_DEMO_PASSWORD` vazios. O `.env` não vai para o git.
   - `npm run db:init --prefix backend` e `npm run db:seed-rules --prefix backend`.
   - Rode o backend (`npm run dev --prefix backend`, porta 3333) e o frontend (`npm run dev --prefix frontend -- --port 5177 --host 127.0.0.1`), registre duas contas pelo site (uma vira admin com `update users set role='admin' where email='...'` no banco local), crie uma campanha e uma cena para testar a mesa.

## Regras
- Faça commits na branch `pixelart-wip` e dê `git push` dela ao terminar cada parte (para eu pegar no outro PC). Nunca faça push na `master` nem deploy: eu reviso e publico.
- Não instale pacotes novos. Toda arte é desenhada em código: cada sprite é uma lista de strings de pixels mais uma paleta, como em `frontend/src/lib/tiles/catalog.js`.
- Comentários no código em português **sem acentos**, explicando o porquê. Textos da interface em português **com acentos**.
- O visual da interface segue `frontend/DESIGN.md` e `frontend/src/styles.css`: classes `btn btn-lit`, `btn btn-glass`, `gothic-panel`, `field`, `lit` e `border-[3px] border-lead`; fontes `font-display` e `text-bone/mist/ember`.
- Teste sempre: `cd frontend && npx vitest run`, `npm test --prefix backend` e `cd frontend && npx vite build`. Tudo tem que passar no fim.
- **Olhe o que desenhou.** Use os scripts de prévia (`frontend/src/lib/tiles/preview.mjs` e o equivalente do avatar) para gerar um PNG, amplie 4× com `ffmpeg -vf scale=iw*4:ih*4:flags=neighbor` e abra a imagem. Refaça o que ficar feio. Nunca entregue arte sem ter visto.

## Direção de arte: estilo Stardew Valley como REFERÊNCIA (nunca copie sprites dele)
- Paleta quente e saturada, com rampas de 4–5 tons e *hue shifting*: sombras puxam para azul/roxo, luzes para amarelo/creme. Nada de cinza morto.
- Contornos coloridos escuros (marrom, verde-escuro), não preto puro. Luz vindo de cima à esquerda. Texturas ricas: veios na madeira, pedras irregulares, fileiras de telhas.
- Blocos de 16×16. Objetos grandes ocupam várias células: árvores 2×3 ou 3×4 com a copa por cima, casas com parede, janelas com moldura, varanda, porta e telhado, poço 2×2.
- Sombra elíptica suave sob todo objeto e personagem.
- Vegetação viva: tufos de grama, flores, pedrinhas, folhas, lírios na água.
- Para manter o clima sombrio do Lúgubre: ciclo de luz por cena (dia / entardecer / noite) que o mestre escolhe. À noite, um overlay azul-escuro, e tochas, fogueiras, janelas e cristais brilham.

## PARTE 1: Mapas (`frontend/src/lib/tiles/*`, `frontend/src/components/vtt/*`)
O formato do mapa é `{cols, rows, layers:{ground:[linhas], objects:[linhas]}}`, com 1 caractere por célula. Já existem 92 blocos em `catalog.js` e todos os caracteres ASCII livres já estão em uso. A sessão anterior começou, sem terminar, os arquivos `compose.js`, `walls.js`, `roofs.js` e `backend/src/utils/tiles.js`, além de mudanças em `render.js`, `format.js`, `aiPrompt.js`, `Board.jsx`, `TileMapEditor.jsx` e `backend/src/routes/campaign.v2.js`. Ela parou exatamente enquanto reescrevia `drawMap` para usar as camadas compostas.

1. **Embelezamento automático (prioridade máxima).** O mapa salvo é só um rascunho grosso; quem embeleza é o desenho na tela, de forma determinística (o mesmo mapa fica igual em todos os computadores):
   - transições de terreno por autotile (cantos/marching squares ou blob 47), com precedência água < areia < terra < grama: bordas arredondadas e irregulares, margem e espuma na água, pedras soltas na beira dos caminhos;
   - decoração espalhada por ruído/hash (grama, flores, pedrinhas, folhas, lírios, rachaduras), nunca em cima de caminho, porta ou objeto. Opção por cena: nenhuma, pouca, normal, muita;
   - paredes com autotile: "topo" quando há parede embaixo e "face" quando há chão embaixo, com cantos coerentes e sombra no chão;
   - telhado automático para salas fechadas com porta;
   - variações de árvores e rochas, sombras e árvores de várias células geradas a partir de um único código.

   Pré-renderize em pedaços (offscreen) para ficar rápido; anime só as células animadas. Se for preciso, crie "stamps": um código âncora que desenha um sprite maior. Mostre o mesmo rascunho renderizado **sem** e **com** o embelezamento, em 2 PNGs.
2. **Repintar todos os blocos** no estilo acima, conferindo a folha de prévia.
3. **Construções com telhado.** O mapa ganha `buildings:[{id,x,y,w,h,name,roof:'telha'|'palha'|'ardosia'|'madeira'}]`. O telhado fica por cima e some com um fade de 250 ms quando a pessoa clica na construção ou quando o token dela entra. O mestre tem um botão "ver interiores". No editor, a ferramenta "Construção" funciona arrastando um retângulo e cria paredes, piso, porta e telhado.
4. **Itens pegáveis.** O mapa ganha `items:[{id,x,y,name,description,quantity,weight,category,dracmas?}]`, com no máximo 60. Os itens brilham no mapa. Um popover "Pegar" aparece ao clicar ou ao apertar E quando o token está a até 1,5 passo do item. Endpoint `POST /api/campaigns/:id/scenes/:sceneId/pickup {itemId}`:
   - só funciona em exploração, ou em combate no próprio turno, e nesse caso gasta a ação;
   - é atômico (dois jogadores não pegam o mesmo item);
   - põe o item no inventário da ficha (moedas vão para a carteira);
   - manda uma mensagem no chat do tipo "Kael pegou Poção de cura";
   - emite os eventos `scene:updated` e `character:updated`.

   Erros em pt-BR. Os eventos e o loop de consulta estão em `docs/API-v2.md`. O editor ganha um painel "Itens".
5. **IA: o site só gera o prompt.** Não existe geração de IA dentro do site; o endpoint `/maps/generate` e o `mapgen.js` foram removidos. O fluxo do editor é:
   - "Descreva o mapa", com chips de exemplo e o tamanho Pequeno 16×12, Médio 24×16 ou Grande 32×22;
   - o botão **Copiar prompt**;
   - "Cole aqui a resposta da IA", que importa sozinho, mostra a prévia e oferece "Usar este mapa", "Tentar de novo" e "Ajustar à mão".

   O prompt pede um vocabulário pequeno (terrenos, paredes e portas, poucos objetos, `buildings` e `items`) e explica que o resto é automático, para funcionar até com IAs simples. O parser continua tolerante.
6. O movimento continua livre, sem grade, com WASD. Não quebre o `Board.jsx`: ele já tem zoom, pan, alvo, trinca de dano, névoa e pings.

## PARTE 2: Criador de personagem (`frontend/src/lib/avatar/*`, `frontend/src/components/avatar/*`)
Foi começado em `frontend/src/lib/avatar/` e os testes falham (14 de 22). O sistema é um boneco de papel com um esqueleto só, para que qualquer combinação use a mesma animação:
- frame de 16×32 no estilo chibi (cabeça grande, uns 40% da altura);
- 4 direções; parado com 2 quadros e andando com 4;
- as camadas seguem os pontos de encaixe do esqueleto;
- cada peça tem 1 a 3 canais de cor que podem ser trocados.

**Quantidades mínimas.** Recolorir **não** conta como peça nova: cada peça precisa de um desenho próprio. Use combinação paramétrica de forma: gola, manga, comprimento, fechos, bordas, estampas.
- 50 cabelos, com 16 ou mais cores;
- 100 roupas de tronco;
- 60 partes de baixo;
- 30 acessórios para cada parte do corpo: cabeça, rosto, orelhas, pescoço, costas, cintura, braços/pulsos, mãos, pernas e pés;
- mais: tons de pele (inclusive fantasiosos), barbas, olhos/expressões e itens na mão;
- traços de todas as raças do livro (`docs/livro/livro-0.5-beta-v2.md`): Abissiano, Celestiano, Centauro, Durkar, Gorak, Humano, Kenku, Lumerin, Minotauro, Nocthar, Primordiano, Sylvar, Sátiro e Tritão.

**Peças de código e integração:**
- `composeFrame`, `buildSpriteSheet` (com cache) e retrato em dataURL.
- Formato `appearance` com versão, mais `validate`, `repair` e `randomize`.
- `AvatarCreator.jsx`: prévia grande que gira e anda, abas, busca e filtros (para não virar uma lista infinita), miniaturas, cores, "Aleatório" e "Desfazer".
- `AvatarSprite.jsx` com as props `{appearance, direction, moving, scale}`.
- Coluna `characters.appearance jsonb`, criada com `alter table ... add column if not exists` em `backend/src/db/schema.sql`, aceita e devolvida em `backend/src/routes/character.routes.js`.
- Etapa "Aparência" no `CharacterBuilder.jsx` e boneco animado com "Editar aparência" no `CharacterSheet.jsx`.
- Teste de quantidade mínima por categoria.

## PARTE 3 (só depois das partes 1 e 2): Modo jogo
- A câmera segue o personagem do jogador, de perto e com pixels nítidos.
- O token vira o `AvatarSprite` animado, andando na direção do movimento.
- Colisão com paredes e objetos sólidos.
- Tecla E para portas, itens e construções.
- O mestre continua com a visão geral.

## Entrega
No fim, escreva `docs/RELATORIO-PIXELART.md` com:
- os arquivos alterados;
- a quantidade de peças por categoria;
- os caminhos dos PNGs de prévia: blocos, mapa antes/depois, construções, personagens de pelo menos 4 raças andando nas 4 direções e amostras de cada categoria de roupa;
- o resultado dos testes;
- o que ficou faltando.

Se o banco mudar, a produção se atualiza pelo botão Admin > Sistema > "Atualizar banco" depois do deploy (o schema só acrescenta coisas). Avise isso no relatório.
