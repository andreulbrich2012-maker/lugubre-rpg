# Auditoria Tecnica - Lugubre RPG

Data: 2026-07-17

## Resumo executivo

A auditoria cobriu frontend React/Vite, API Express, PostgreSQL/Neon, autenticacao JWT, permissoes, uploads, economia, dependencias, responsividade e configuracao da Vercel. Foram identificados 18 problemas acionaveis: 5 criticos, 6 altos, 5 medios e 2 baixos. Todos os criticos e altos foram corrigidos e retestados. Duas limitacoes arquiteturais permanecem documentadas ao final.

## Ambiente

- Frontend: React, Vite 6.4.3, TailwindCSS
- Backend: Node.js, Express 5.2.1, Socket.io 4.8.3
- Banco: PostgreSQL Neon
- Branch: `master`
- Producao: https://lugubre-rpg.vercel.app
- Repositorio: https://github.com/andreulbrich2012-maker/lugubre-rpg
- Viewports inspecionados: 360x800, 390x844, 412x915, 430x932, 768x1024, 1366x768 e 1920x1080
- Navegador automatizado: Chromium

## Problemas e correcoes

| ID | Gravidade | Area | Causa real | Correcao e reteste | Status |
| --- | --- | --- | --- | --- | --- |
| SEC-01 | Critica | Cadastro | O email do cliente podia determinar `role=admin` | Cadastro agora sempre cria `user`; rotas administrativas continuam protegidas no backend | Corrigido |
| SEC-02 | Alta | Login | Respostas diferentes para email inexistente e senha errada permitiam enumeracao | Ambos retornam 401 e mensagem generica | Corrigido |
| SEC-03 | Critica | Seeds | Senhas previsiveis estavam no runtime e o login podia restaurar a senha seed | Fallback removido; seeds exigem variaveis explicitas e nunca sobrescrevem hashes existentes | Corrigido |
| SEC-04 | Alta | JWT | Segredo de desenvolvimento era fallback em producao e algoritmo nao era restrito | Producao exige `JWT_SECRET`; verificacao restrita a HS256; `token_version` permite revogacao | Corrigido |
| SEC-05 | Alta | Sessao | Logout removia apenas o token local, mantendo JWT valido | `POST /api/auth/logout` revoga tokens no banco; login posterior emite versao atual | Corrigido |
| SEC-06 | Alta | HTTP | CORS apontava para localhost em producao; headers e rate limit ausentes | Origens derivadas da Vercel, Helmet, CSP, HSTS e limites gerais/de autenticacao | Corrigido |
| SEC-07 | Alta | Uploads | Data URLs SVG e referencias inseguras eram aceitas | Backend aceita apenas PNG/JPEG/WebP/GIF base64, HTTPS ou assets internos seguros | Corrigido |
| API-01 | Critica | Express | Rejeicao em handler async no Express 4 causava timeout de 30 s | Express 5 e tratamento central; formula invalida retorna 400 imediatamente | Corrigido |
| API-02 | Media | Personagens | DELETE inexistente sempre retornava 204 | `rowCount`/resultado local agora produz 404 real | Corrigido |
| API-03 | Media | Erros | Health sob `/api` e rotas desconhecidas retornavam HTML/404 inconsistente | `/api/health` e fallback JSON padronizado | Corrigido |
| DB-01 | Critica | Lojas | Duas aprovacoes simultaneas debitavam carteira e estoque duas vezes | Transacao, `FOR UPDATE`, atualizacao atomica de estoque e status idempotente | Corrigido |
| DB-02 | Critica | Compras | Solicitacao sem personagem podia ser aprovada sem pagamento | `characterId` obrigatorio e propriedade validada | Corrigido |
| DB-03 | Media | Performance | Consultas frequentes nao tinham todos os indices de suporte | Indices para email normalizado, personagens, membros, amigos e mensagens | Corrigido |
| DATA-01 | Alta | Inicializacao | `db:init` redefinia senha de contas seed a cada execucao | Inicializador nao altera senha existente e informa quantos seeds foram configurados | Corrigido |
| UX-01 | Media | Personagens/Dashboard | Falha de API podia deixar loading infinito ou tela vazia | Estados de carregamento, erro, retry e finalizacao em `finally` | Corrigido |
| UX-02 | Baixa | Exclusao | Ficha era apagada sem confirmacao e botoes de icone nao tinham nome acessivel | Confirmacao, atualizacao otimista segura, `aria-label` e tooltip | Corrigido |
| PERF-01 | Media | Bundle | Todas as paginas estavam no bundle inicial de aproximadamente 554 KB | Rotas com `React.lazy`; chunk inicial reduzido para aproximadamente 249 KB | Corrigido |
| A11Y-01 | Baixa | Imagens/menu | Imagens sem `alt` e menu sem Escape/restauracao de foco | Textos alternativos, foco inicial, Escape e retorno de foco | Corrigido |

## Banco e consistencia

A migration reproduzivel adicionou `users.token_version` e indices. O `db:init` executou 143 comandos SQL no Neon sem erro e sem redefinir credenciais. A verificacao final encontrou:

- emails duplicados: 0
- personagens com Vida/Sanidade/Mana invalidas: 0
- estoque ou preco negativo: 0
- solicitacoes de compra invalidas: 0
- personagens orfaos: 0

Registros temporarios `AUDIT-*` foram removidos ao final. Residuos antigos claramente marcados como E2E tambem foram removidos; fichas possivelmente criadas pelo usuario nao foram tocadas.

## Testes executados

- 19 testes automatizados aprovados: 11 backend e 8 frontend
- `npm audit`: 0 vulnerabilidades conhecidas
- build Vite de producao aprovado
- `git diff --check` aprovado
- cadastro, login, sessao, logout/revogacao, 401, 403 e 404
- CRUD administrativo principal e bloqueio para usuario comum
- criacao, listagem, edicao, status, inventario, carteira, ataques, magias, dados e exclusao de personagem
- bonus de raca/origem, Vida, Sanidade, Mana e limites
- campanhas, mensagens, amigos, feedback, monstros, biblioteca e Diario do Desenvolvedor
- formulas validas e invalidas, incluindo limite de quantidade/lados/modificador
- CORS malicioso, headers, upload SVG rejeitado e respostas JSON
- fluxo real no Neon: personagem criado, listado, recarregado, compra concorrente, carteira/estoque/inventario verificados e limpeza final
- inspecao responsiva nas resolucoes listadas

## Resultado por modulo

| Modulo | Resultado |
| --- | --- |
| Landing Page | Carregamento, imagens, links internos e responsividade aprovados |
| Autenticacao | Corrigida e retestada, incluindo revogacao |
| Dashboard | Metricas reais e tratamento de falha corrigido |
| Personagens/ficha | Fluxos principais e persistencia aprovados |
| Campanhas/diario/lojas | Permissoes e CRUD exercitados; concorrencia de compra corrigida |
| Chat | REST e persistencia aprovados; limitacao Socket.io descrita abaixo |
| Amigos | Busca, amizade e mensagens validadas; duplicidade simetrica evitada |
| Monstros/Biblioteca | CRUD, elementos e parser validados |
| Feedback/Diario do Desenvolvedor | CRUD e visibilidade validados |
| Admin | Backend bloqueia nao admin; validacoes de categoria/elemento corrigidas |
| Mobile | Layouts sem overflow relevante; menu possui foco, Escape e opcoes por role |

## Pendencias e limitacoes

1. **Socket.io na Vercel - media:** a funcao serverless exporta Express e nao mantem um servidor WebSocket persistente. O chat online usa envio REST e polling a cada 5 segundos como fallback funcional. Tempo real verdadeiro exige hospedar o backend Socket.io em um servico de longa duracao e apontar `VITE_SOCKET_URL` para ele.
2. **Token no localStorage - media:** o risco foi reduzido com CSP e ausencia de renderizacao HTML arbitraria, mas a arquitetura mais forte usa cookie `HttpOnly`, `Secure` e `SameSite`. Essa migracao exige alterar o contrato de autenticacao e foi mantida como evolucao planejada.
3. **Firefox/Edge - baixa:** a regressao automatizada completa foi executada em Chromium. A verificacao cross-browser integral permanece manual.
4. **Lint/typecheck - baixa:** o projeto e JavaScript e nao possui configuracao de lint/typecheck. Testes, build, auditoria de dependencias e verificacao de diff foram executados.

## Entrega

- GitHub: https://github.com/andreulbrich2012-maker/lugubre-rpg
- Vercel: https://lugubre-rpg.vercel.app
- Banco: PostgreSQL Neon
- O commit e o deployment finais devem ser registrados no fechamento da auditoria.
