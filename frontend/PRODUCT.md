# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- Jogadores de RPG de mesa (público aberto, pt-BR) que criam conta, montam fichas e entram em campanhas pelo navegador, no PC ou no celular, muitas vezes à noite durante a sessão.
- Mestres que criam campanhas, convidam jogadores, conduzem a sessão num mapa compartilhado e controlam NPCs e monstros.
- Admin (o autor do sistema, André) que mantém raças, classes, origens, perícias, monstros, biblioteca de poderes, diário do desenvolvedor e o livro de regras.

## Product Purpose
Lúgubre RPG é a plataforma oficial do sistema de RPG dark fantasy "Lúgubre" (livro de regras 0.5 Beta). Fichas vivas, campanhas online com chat, diário, lojas, mesa virtual (mapa com tokens, dados animados) e o livro de regras navegável. Sucesso: uma mesa inteira joga uma sessão do começo ao fim sem sair do site e sem procurar regra fora dele.

## Positioning
É o único lugar onde o sistema Lúgubre roda de verdade: as regras do livro (atributos que começam em 2, Esquiva = 15 − Agilidade, Mana no lugar de esforço, raças e origens oficiais) estão no banco e nas fichas, e a mesa virtual usa os próprios personagens e habilidades dos jogadores. O mestre decide o dano; os jogadores veem o efeito, nunca a vida do monstro.

## Operating Context
- Sessões ao vivo: mestre e jogadores na mesma campanha ao mesmo tempo, chat, rolagens e mapa compartilhado.
- Entre sessões: criação e evolução de fichas, anotações, diário, compras na loja da campanha.
- O livro de regras está em beta e evolui; o site precisa acompanhar as edições sem reescrever código.

## Capabilities and Constraints
- Stack existente: React 18 + Vite + Tailwind 3 + Zustand + React Router (frontend), Express + PostgreSQL + JWT + Socket.io (backend), deploy na Vercel (backend como função serverless em api/index.js). CSP da Vercel: só scripts e fontes do próprio site.
- Funções que precisam continuar funcionando: contas e login, fichas (raça, classe, origem, atributos, perícias, inventário, poderes, evolução), campanhas (membros, chat, diário, lojas, compartilhar ficha com o mestre), biblioteca de magias e poderes, monstros, amigos, feedback, diário do desenvolvedor, painel admin.
- Novas na versão 2 (pedido do André, 23/10/2026): anotações do mestre e dos jogadores na campanha; ficha compartilhada visível ao mestre; mesa virtual estilo Owlbear (mapa, grade, tokens dos personagens, NPCs e monstros, mover); rolagem de dados animada com alvo, o alvo mostra que tomou dano sem revelar vida nem valor; tabela do mestre com personagens, NPCs e monstros; livro de regras guardado no banco e exibido organizado, editável conforme o livro evolui.
- Mesmo banco e mesmo backend da versão atual; trabalho na branch `redesign-claude`, publicação só com OK do André.

## Brand Commitments
- Nome "Lúgubre RPG", gênero dark fantasy, mundo com os Oito Primordiais, a O.P.E.R.A. e os Oito Reinos (livro 0.5 Beta).
- Textos em português do Brasil.
- Não quebrar o livro de regras: regras do livro mandam sobre qualquer recurso novo.

## Evidence on Hand
- Livro de regras: ~/Downloads/Lugubre_RPG_Livro_de_Regras_0.5_Beta_revisado_v2.docx (extraído em docs/livro/livro-0.5-beta-v2.md).
- Imagens existentes: frontend/public/images/lugubre, frontend/public/assets/*.svg.
- Sem depoimentos, números de usuários ou preços: não inventar.

## Product Principles
1. A regra do livro é a fonte da verdade; o site a aplica, não a reinventa.
2. Durante a sessão, nada tira a mesa do ritmo: um clique para rolar, mover, anotar.
3. O mestre guarda o segredo: informação de monstro e de NPC só aparece para quem deve ver.
4. O sistema está em beta: conteúdo de regras é dado editável, não código.

## Accessibility & Inclusion
Público inclui adolescentes; conteúdo dark fantasy sem gore explícito. Funciona no celular. Respeitar prefers-reduced-motion nas animações de dados e mapa.
