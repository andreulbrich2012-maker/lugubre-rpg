# Lúgubre RPG: contexto completo + plano de arte (para continuar no outro PC)

Cole tudo abaixo (da linha "---" em diante) na primeira mensagem de uma sessão nova do Claude Code no outro PC. Ela traz o contexto da conversa anterior e o trabalho que falta.

---

Você vai continuar o projeto **Lúgubre RPG** com o André, que é o dono. Antes, outra sessão do Claude fez muita coisa; este texto resume tudo o que você precisa saber. O André fala português do Brasil e prefere respostas curtas e diretas. Quando ele disser "só quero que funcione", faça você mesmo, sem jogar passos técnicos para ele.

## 1. O que é o projeto
- Site oficial do RPG de mesa dark fantasy **Lúgubre**, com livro de regras 0.5 Beta, aberto ao público, em pt-BR. Tem:
  - fichas de personagem e campanhas;
  - mesa virtual (mapa, tokens, dados, combate por turnos);
  - Livro de Regras navegável;
  - Biblioteca de magias e poderes, Bestiário e painel Admin.
- Endereço no ar: **https://lugubre-rpg.vercel.app**
- Código: **https://github.com/andreulbrich2012-maker/lugubre-rpg**
  - `master`: o que está no ar.
  - `pixelart-wip`: o trabalho de arte em andamento, que é onde você vai trabalhar.
- Stack:
  - frontend: React 18 + Vite + Tailwind 3 + Zustand, em `frontend/`;
  - backend: Express + PostgreSQL + JWT + zod, em `backend/`;
  - hospedagem: Vercel. O backend roda como função serverless em `api/index.js`, com `maxDuration` de 60 s.
- **Não existe Socket.io em produção.** O tempo real funciona por um feed de eventos com polling (1,5 s com a aba visível, 10 s escondida). Detalhes em `docs/API-v2.md`.
- Documentos importantes:
  - `frontend/PRODUCT.md` (produto) e `frontend/DESIGN.md` (sistema visual);
  - `docs/API-v2.md` (toda a API nova);
  - `docs/PROMPT-PIXELART.md` e `docs/PLANO-ANIMACOES.md` (planos de arte e animação; este arquivo resume e amplia os dois);
  - `docs/livro/livro-0.5-beta-v2.md`, o livro inteiro em Markdown. **O livro é a fonte da verdade das regras: não quebre o livro.**

## 2. O que já está pronto e no ar (`master`)
- **Visual "Vitral dos Primordiais"** (interface escura):
  - chumbo preto, oito vidros coloridos (os Oito Primordiais), luz âmbar;
  - fontes Grenze Gotisch (títulos) e Schibsted Grotesk (texto), instaladas no projeto via fontsource;
  - landing com rosácea interativa e Livro de Regras em `/regras`. O livro tem 195 seções guardadas no banco (`rule_sections`), com busca, e o admin edita na própria página.
- **Sala de campanha** (`frontend/src/pages/CampaignRoom.jsx` + `components/campaigns/room/*` + `components/vtt/Board.jsx`):
  - mapa por imagem enviada do PC ou em pixel art; zoom, arrastar;
  - **movimento livre por WASD** (sem quadradinhos), na velocidade que o mestre escolhe;
  - modos preparação, exploração e combate. Em combate há iniciativa, movimento limitado e uma ação por turno, e o servidor confere tudo;
  - d20 de vidro animado para todos;
  - **o mestre decide se acertou e o dano.** O jogador só vê "Tomou dano!" e a trinca no token, nunca a vida nem o número do monstro;
  - notas privadas, para o mestre ou para o grupo; ficha completa visível ao mestre, com ajuste de vida, sanidade e mana;
  - painel do mestre (cenas, névoa, condições, NPCs, monstros da biblioteca); chat, diário e loja.
- **Conteúdo no banco:**
  - 180 magias (20 por elemento: Caos, Gaia, Ponto, Érebo, Nix, Tártaro, Éter, Ananque e Hemera);
  - 29 ataques base de arma e 24 técnicas de arma;
  - 336 monstros (2 por nível 1–20 por elemento nos 8 Primordiais, mais alguns feitos à mão), com cerca de 670 ataques.

  Tudo isso está como seed no fim de `backend/src/db/schema.sql`. Na Biblioteca, magias e poderes ficam em `power_library`; os monstros, em `monsters` e `monster_attacks`.
- **Admin > Sistema:** baixa uma cópia de segurança do banco (em páginas) e "Atualizar banco", que aplica o `schema.sql` (só acrescenta, nunca apaga) e carrega o livro.
- **Testes** (devem sempre passar): `cd frontend && npx vitest run`, `npm test --prefix backend` e `cd frontend && npx vite build`.

## 3. Regras de trabalho e decisões do André
- **Nunca perder dados do banco de produção.** Antes de qualquer mudança no banco, faça a cópia de segurança em Admin > Sistema e confira o número de registros. O schema só pode acrescentar coisas (`create table if not exists`, `add column if not exists`, inserções com `on conflict do nothing` / `where not exists`).
- **A senha do banco de produção é "sensível" na Vercel e não pode ser baixada.** Nunca peça a senha nem a cole no chat. O banco de produção só é atualizado pelo botão Admin > Sistema, depois do deploy.
- **Como publicar:** a Vercel **não** publica sozinha a partir do GitHub.
  1. `npx vercel login`, uma vez, com o André logado.
  2. `npx vercel link --yes --project lugubre-rpg`.
  3. Testes passando.
  4. `git push origin master`.
  5. `npx vercel deploy --prod --yes`.
  6. Se o schema mudou, abra https://lugubre-rpg.vercel.app/admin?sec=system com o André logado como admin: primeiro "Baixar cópia de segurança", depois "Atualizar banco".

  O `.vercelignore` impede o envio de `.env`. **Você publica sozinho: ao fim de cada etapa aprovada, faça o deploy completo.**
- **Commits** terminam com: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- **Comentários no código** em português **sem acentos**, explicando o porquê. Textos da interface em português **com acentos**.
- **Decisões de produto:**
  - movimento livre por padrão;
  - o mestre decide dano e acerto;
  - jogador nunca vê vida de monstro;
  - **o site NÃO tem IA embutida para mapas: ele só gera o prompt.** O usuário cola o prompt em qualquer IA (ChatGPT, Gemini, Claude) e cola a resposta de volta;
  - o sistema embeleza o mapa sozinho, para que até IAs simples gerem mapas bonitos;
  - a interface continua escura ("obscura"); **a arte do jogo (mapas, personagens, monstros, itens) segue o estilo do Stardew Valley.**
- **Pendências que o André ainda não decidiu:**
  - O catálogo do banco difere do livro. Os nomes das raças são diferentes (Elfo ↔ Sylvar, Anão ↔ Durkar…); faltam as raças Centauro, Minotauro, Sátiro e Tritão, 7 origens e as perícias Criação e Negociação; e a ficha não usa a progressão de Vida/Mana/Sanidade por nível do livro. Pergunte antes de mexer.
  - Responsividade: a ficha foi corrigida. Faltou revisar as outras telas no celular e no tablet com prints de verdade. Quando for capturar telas em sequência, faça login uma vez e espere entre as páginas: muitas requisições seguidas batem no limite e jogam a sessão para a tela de login.

## 4. Montar o ambiente neste PC
1. `git clone https://github.com/andreulbrich2012-maker/lugubre-rpg.git && cd lugubre-rpg && git checkout pixelart-wip && npm install`
2. Postgres local (nunca o de produção): `docker run -d --name lugubre-pg -e POSTGRES_PASSWORD=lugubre -p 55432:5432 postgres:17`
3. Crie `backend/.env` a partir de `backend/.env.example` com:
   - `DATABASE_URL=postgres://postgres:lugubre@localhost:55432/postgres`
   - `JWT_SECRET` com qualquer valor
   - `CLIENT_URL=http://127.0.0.1:5177,http://localhost:5177`
   - `SEED_ADMIN_PASSWORD` e `SEED_DEMO_PASSWORD` vazios
4. `npm run db:init --prefix backend && npm run db:seed-rules --prefix backend`
5. Backend: `npm run dev --prefix backend` (porta 3333). Frontend: `npm run dev --prefix frontend -- --port 5177 --host 127.0.0.1`.
6. Registre duas contas pelo site e transforme uma em admin no banco local (`update users set role='admin' where email='...'`). Crie uma campanha e uma cena para testar a mesa.

## 5. Estado da branch `pixelart-wip` (trabalho pela metade)
Outra sessão começou a arte e parou no meio. **Rode `git log --oneline -8` e os testes antes de tudo.** No último estado:
- O build passava, mas 14 testes do avatar falhavam.
- Mapas (`frontend/src/lib/tiles/`): 92 blocos 16×16 e começos de `compose.js`, `walls.js` e `roofs.js`. Parou na reescrita do `drawMap`.
- Avatar (`frontend/src/lib/avatar/`): 49 calçados prontos. O resto está incompleto.
- Já existiam: formato de itens pegáveis, endpoint de pegar (parcial), autotile de paredes (parcial) e `backend/src/utils/tiles.js` (validação).

---

# PLANO DE ARTE COMPLETO (estilo Stardew Valley)

## A. Direção de arte (vale para tudo)
- **Stardew Valley como referência de estilo. Nunca copie sprites dele**: é material protegido. Desenhamos tudo do zero.
- Paleta quente e saturada, com rampas de 4–5 tons e *hue shifting*: sombras puxam para azul/roxo, luzes para amarelo/creme. Sem cinza morto.
- Contornos coloridos escuros (marrom, verde-escuro, roxo-escuro), nunca preto puro. Luz de cima à esquerda.
- Texturas ricas: veios de madeira, pedras irregulares, fileiras de telhas, folhas com 2–3 tons.
- Sombra elíptica suave sob todo objeto, personagem e monstro.
- Escala: blocos de 16×16; personagens de 16×32 com cabeça grande (chibi); objetos grandes ocupam várias células.
- Ciclo de luz por cena: dia, entardecer e noite (overlay azul-escuro, com tochas, janelas, fogueiras, cristais e magias brilhando). Ele mantém o clima sombrio do Lúgubre.
- **Toda arte é feita em código** (listas de strings de pixels + paleta, como em `frontend/src/lib/tiles/catalog.js`), sem pacotes novos. Gere folhas PNG com os scripts de prévia, amplie 4× com `ffmpeg -vf scale=iw*4:ih*4:flags=neighbor`, **olhe** e refaça o que ficar feio.
- **Para chegar às quantidades com qualidade, use geração paramétrica.** Uma base desenhada à mão recebe variações reais de forma (partes, acessórios, cortes). Mudar só a cor **não** conta como peça nova; mudar a paleta conta apenas como variante de tom.

## B. Chão e terrenos (todos com transição automática)
O mapa salvo é um **rascunho grosso**. O sistema desenha bordas, transições e enfeites sozinho, de forma determinística (igual para todos os jogadores).

**Terrenos.** Cada um tem 2–4 variantes de base, escolhidas por hash para não repetir.
- Grama: curta, alta, seca/outono, florida, de pântano.
- Terra: batida, arada (em sulcos), lama, terra queimada.
- Areia: praia, deserto, cascalho.
- Pedra: rocha natural, piso de masmorra, paralelepípedo, laje de templo, mármore xadrez, piso com runas.
- Interiores: assoalho de madeira (2 tons), madeira podre, carpete/tapete (2 cores), palha.
- Frio: neve, gelo.
- Água: rasa, funda, rio com correnteza, lago, mar com ondas, cachoeira; pântano e lodo (animados).
- Especiais: lava, poça de ácido (animados), cinzas, cristal, solo corrompido do Tártaro (veios pulsando), solo de Éter (brilho), abismo/fosso.
- Caminhos: trilha de terra, caminho de pedras soltas, estrada de paralelepípedo, ponte de madeira, ponte de corda.

**Transições automáticas.**
- Técnica: autotile por cantos (marching squares) ou blob 47.
- Precedência: água < areia < terra < grama < neve.
- Bordas arredondadas e irregulares, margem com faixa de areia ou pedra, espuma na água e pedras soltas na beira do caminho.

**Decoração automática** por ruído/hash:
- o que aparece: tufos de grama, flores (4 cores), pedrinhas, folhas, gravetos, cogumelos pequenos, lírios e juncos na água, rachaduras no piso, poeira;
- respeita o bioma e nunca cai em cima de caminho, porta ou objeto;
- o mestre escolhe a quantidade por cena: nenhuma, pouca, normal ou muita.

## C. Paredes, construções e objetos do mapa
- **Paredes com autotile:** "topo" quando há parede embaixo, "face" quando há chão embaixo, com cantos e sombra no chão.
  - Materiais: pedra, tijolo, madeira, caverna, muralha com ameias, cerca de madeira, cerca de pedra, sebe.
  - Portas: simples, dupla, trancada, secreta, portão de ferro, arco. Também janelas e paredes com tocha.
- **Construções com telhado.** O mapa ganha `buildings:[{id,x,y,w,h,name,roof}]` e os telhados são telha, palha, ardósia ou madeira, cada um em 2 cores. Há varanda, chaminé, janelas com moldura e vasos.
  - O telhado some com um fade de 250 ms quando a pessoa clica, quando o token entra ou quando o mestre usa "ver interiores".
  - Salas fechadas com porta ganham telhado automaticamente.
  - Ferramenta "Construção" no editor: arrastar um retângulo cria paredes, piso, porta e telhado.
- **Objetos grandes de várias células** ("stamps": um código âncora desenha o sprite maior, e só a base bloqueia):
  - árvores 2×3 ou 3×4 (carvalho, pinheiro, macieira, cerejeira, árvore morta, árvore retorcida, palmeira) com copa por cima;
  - pedras grandes, poço 2×2, moinho, barracas de feira, carroça, barco, estátua, altar, fonte, forja, tendas.
- **Objetos de 1 célula.** Hoje são 92; complete com os que ficaram de fora: correntes, cruz de túmulo, banco, ninho, palco, pedra rúnica, sangue no chão, pedra lunar, além de vasos, caixas de correio, placas, lampiões, barris, sacos, colmeias, espantalhos, canteiros com plantas e lápides variadas.
- **Itens pegáveis.** O mapa ganha `items:[{id,x,y,name,description,quantity,weight,category,dracmas?}]`, com no máximo 60.
  - Os itens brilham no mapa. Um popover "Pegar" aparece ao clicar ou com a tecla E quando o token está a até 1,5 passo.
  - Endpoint `POST /api/campaigns/:id/scenes/:sceneId/pickup`: funciona em exploração ou no próprio turno em combate (gasta a ação); é atômico; manda para o inventário ou para a carteira; avisa no chat.
- **Prompt da IA de mapa** (o site só gera o prompt): vocabulário pequeno (terrenos, paredes e portas, poucos objetos, `buildings`, `items`) e o aviso de que o resto é automático.
  - Fluxo do editor: "Descreva o mapa", com exemplos e tamanho Pequeno 16×12, Médio 24×16 ou Grande 32×22 → **Copiar prompt** → "Cole aqui a resposta" → prévia → "Usar este mapa", "Tentar de novo" ou "Ajustar à mão".
  - O parser é tolerante. Mostre o mesmo rascunho **sem** e **com** o embelezamento em 2 PNGs.

## D. Personagens (criador em `frontend/src/lib/avatar/` e `components/avatar/`)
- Boneco de papel com um esqueleto só:
  - frame de 16×32, 4 direções;
  - parado com 2 quadros, andando com 4 (e mais tarde as poses de ataque do item F);
  - camadas presas aos pontos do esqueleto, com 1–3 canais de cor por peça;
  - sombra no chão.
- **Mínimos** (recolorir não conta como peça nova):
  - 50 cabelos, com 16 ou mais cores;
  - 100 roupas de tronco (camisas, túnicas, vestidos, robes, couro, cota, placas, casacos, coletes);
  - 60 partes de baixo;
  - 30 acessórios por parte do corpo: cabeça, rosto, orelhas, pescoço, costas, cintura, braços/pulsos, mãos, pernas e pés (os 49 calçados atuais já cumprem pés);
  - mais: tons de pele (inclusive fantasiosos), barbas, olhos/expressões e todas as armas da seção E como item na mão.
- **Raças do livro**, com traços: Abissiano (chifres, pele avermelhada), Celestiano (brilho, auréola discreta), Centauro (corpo inferior de cavalo, que pode ser uma base própria), Durkar (baixo e robusto, barba), Gorak (presas, pele esverdeada), Humano, Kenku (bico, penas), Lumerin (pequeno, olhos brilhantes), Minotauro (cabeça de touro), Nocthar (pele escura azulada, orelhas), Primordiano (marcas elementais), Sylvar (orelhas longas), Sátiro (chifres, pernas de bode), Tritão (barbatanas, escamas).
- **Interface e integração:**
  - `AvatarCreator.jsx` com prévia grande que gira e anda, abas, busca e filtros, miniaturas, cores, "Aleatório" e "Desfazer";
  - `AvatarSprite.jsx` com as props `{appearance, direction, moving, scale}`;
  - coluna `characters.appearance jsonb` (com `add column if not exists`);
  - etapa "Aparência" no criador de ficha e boneco animado na ficha;
  - teste de quantidade mínima por categoria.

## E. Armas (sprites de item + na mão do personagem)
- As 29 armas do banco (`'Ataque: …'` em `power_library`, no fim do `schema.sql`): adaga, faca de caça, espada curta, espada longa, montante, sabre, rapieira, machadinha, machado de guerra, maça, martelo de guerra, mangual, lança, alabarda, foice, gadanha, chicote, cajado, bordão, manoplas, garras de ferro, escudo, arco curto, arco longo, besta leve, besta, funda, dardos e azagaia.
- Cada arma ganha:
  - um ícone 16×16 para o inventário e a Biblioteca;
  - um sprite na mão para as 4 direções;
  - 2–3 variantes de material (ferro, aço, ouro/encantada) para as versões melhores.

## F. Animações de ataque e magia (detalhes em `docs/PLANO-ANIMACOES.md`)
- **Animação automática por categoria:** `classify(poder)` olha tipo, elemento, alcance, dano e o nome. Arma ou magia nova já sai animada, e o campo "Animação" do formulário permite trocar.
- **Fases:** antecipação → ação (rastro) → impacto (pausa curta, flash, partículas, tremida, trinca, "Tomou dano!") → recuperação. Também há erro, crítico, falha no 1 e caído.
- **Sincronização:** no evento `roll`, toca o ataque; no `token:hit`, quando o mestre decide, toca o impacto. A semente das partículas é o `rollId`.
- **Famílias:**
  - 12 corpo a corpo;
  - 4 à distância (arco, besta, arremesso, funda);
  - 9 formas de magia (projétil, raio, área, toque, bênção/cura, terreno, controle, maldição, movimento);
  - 9 assinaturas de elemento (cor, partícula e movimento de cada Primordial e de Hemera);
  - 7 famílias de ataque de monstro (mordida, garra, investida, sopro, ferrão, pancada, magia).
- **As 180 magias e as 24 técnicas** do banco precisam funcionar com `classify`. Teste que as do livro (Raio Sombrio, Bênção de Éter, Golpe Guardião, Vinhas de Gaia, Abraço do Vazio) caem na categoria certa.
- **Galeria em Admin > Animações** para conferir tudo.

## G. Ícones de magias e técnicas
- 180 magias e 24 técnicas, com ícone 16×16 (ou 24×24) cada.
- Faça paramétrico: uma moldura e um fundo por elemento, mais um símbolo por forma de entrega (projétil, raio, área, cura, escudo, controle, maldição, movimento, invocação, buff). O resultado é coerente e reconhecível.
- Ícones das técnicas: a silhueta da arma + o símbolo da manobra.

## H. Monstros: 336 no banco
- **40 por elemento nos 8 Primordiais:** 10 criaturas-base por elemento × 4 epítetos. A lista está no fim de `backend/src/db/schema.sql` (seção "Bestiario expandido"). Exemplos: Gaia vai do Rato do Mato ao Avatar da Montanha; Érebo vai do Morcego Sombrio ao Avatar do Esquecido. Há também 16 feitos à mão (seção "Conteudo extra").
- **Arte paramétrica:**
  - desenhe à mão as **80 criaturas-base** (10 por elemento);
  - cada epíteto vira uma variante real: troca de paleta pelo tom do epíteto mais 1–2 detalhes (chifres, cicatriz, armadura, brilho, cristais, correntes, musgo, chamas, aura);
  - o tamanho cresce com o nível: 16×16 nos níveis 1–6, 24×24 nos 7–14 e 32×32 ou maior nos 15–20 (os Avatares).
- Animação: parado com 2 quadros, andando com 4 quadros nas 4 direções (ou espelhado) e uma pose de ataque. Sombra no chão.
- Integração: o token de monstro no mapa usa o sprite, e o Bestiário e a Biblioteca mostram o retrato.
- Ataques dos monstros: use a família de animação de monstro pelo nome do ataque.

## I. Itens de inventário (ícones 16×16)
- Categorias: poções (vida, mana, sanidade, veneno, antídoto, em vários tamanhos), comida, ingredientes e ervas, pergaminhos, livros, chaves, moedas (bronze, prata, platina, ouro: a dracma), gemas e cristais, minérios, armaduras (as peças do criador como ícone), anéis e amuletos, ferramentas, tochas e lanternas, cordas, mochilas e bolsas, troféus de monstro (orelha, presa, couro, escama).
- **Mínimo de 150 ícones.**
- O inventário da ficha e os itens pegáveis do mapa usam esses ícones. A categoria e o nome escolhem o ícone automaticamente; dá para trocar.

## J. Modo jogo (por último)
- A câmera segue o personagem de perto, com pixels nítidos.
- O token vira o `AvatarSprite` animado na direção do movimento.
- Colisão com sólidos.
- Tecla E para portas, itens e construções.
- O mestre mantém a visão geral.

## K. Ordem de entrega
1. Consertar a branch: testes verdes, `drawMap` terminado.
2. Terrenos e transições automáticas + decoração automática, com PNG antes/depois.
3. Paredes, construções e telhados, objetos grandes e repintura de todos os blocos.
4. Itens pegáveis + fluxo "copiar prompt".
5. Criador de personagem completo com os mínimos.
6. Armas (ícone + na mão) e ícones de itens.
7. Monstros (80 bases + variantes) no mapa e no Bestiário.
8. Ícones de magias e técnicas.
9. Animações (seção F).
10. Modo jogo.

**Em cada etapa:** commit e push na `pixelart-wip`, PNGs ou GIFs conferidos e testes passando. Escreva o resumo e os caminhos das imagens em `docs/RELATORIO-PIXELART.md`. Mostre as imagens ao André. **Depois de cada etapa, publique tudo, sem esperar pedido:**
1. Testes passando nos três comandos.
2. `git checkout master && git merge pixelart-wip && git push origin master`, e volte para a `pixelart-wip`.
3. `npx vercel deploy --prod --yes`. Se ainda não estiver logado, rode antes `npx vercel login` com o André e `npx vercel link --yes --project lugubre-rpg`.
4. Se o schema ou os seeds mudaram, abra https://lugubre-rpg.vercel.app/admin?sec=system no navegador logado como admin (o André entra na conta dele), clique em **Baixar cópia de segurança**, confira o número de registros, guarde o arquivo e só então clique em **Atualizar banco**. O número de registros nunca pode diminuir.
5. Abra o site no ar e confira se a mudança apareceu e se as campanhas e fichas antigas continuam lá.
6. Diga ao André, em poucas linhas, o que foi para o ar.

Se algo der errado no deploy, o site anterior continua no ar: nunca apague dados para "consertar".
