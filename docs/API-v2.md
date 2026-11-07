# Lúgubre RPG — API v2 (sala de campanha, mesa virtual, rolagens, notas e livro)

Tudo abaixo fica em `/api`. Autenticação: `Authorization: Bearer <token>` (exceto o livro de regras público).
Erros sempre vêm como `{ "message": "texto em pt-BR" }` (validação: `{ "message": "Verifique os campos enviados.", "issues": [...] }`).
Os recursos v2 exigem PostgreSQL; sem banco eles respondem `503 { "message": "Este recurso precisa do banco de dados PostgreSQL configurado." }`.

Convenções:

- `:id` = id da campanha (UUID). Qualquer id que não seja UUID → `404`.
- "Mestre" = membro com papel `master`, o dono da campanha ou um admin global que seja membro.
- Corpos dos recursos novos (cenas, tokens, NPCs, vitais) usam **snake_case** (iguais às colunas). Rolagens, notas e acertos usam camelCase onde indicado.

---

## 1. Feed de eventos (substitui os sockets em produção)

Em produção (Vercel) não há Socket.io. A fonte de verdade é o feed por campanha. Os sockets continuam funcionando no `npm run dev`, mas o cliente deve usar o feed sempre.

### `GET /api/campaigns/:id/events` (membros)

Sem `after` → só o cursor atual:

```json
{ "cursor": 1842 }
```

Com `after=<cursor>` → até 200 eventos mais novos que o requisitante pode ver:

```json
{
  "events": [
    { "id": 1843, "type": "message:created", "payload": { "message": { "...": "..." } }, "audience": "all", "created_by": "uuid", "created_at": "2026-10-23T22:01:02.000Z" }
  ],
  "cursor": 1843
}
```

Visibilidade: o mestre vê todos; jogadores veem `audience = 'all'` e os eventos com `audience = <o próprio uuid>`.
Eventos com mais de 24 h são apagados. Se o cliente ficou fora muito tempo, recarregue o estado pelos GETs normais e pegue um cursor novo.

Alguns eventos saem em **duas versões**: uma para jogadores (`payload.view = "player"`, audiência `all`) e outra completa para o mestre (`payload.view = "master"`, audiência `master`). O mestre recebe as duas: **o cliente do mestre deve ignorar eventos com `view === "player"`**; o do jogador só recebe a versão `player` (e `view: "owner"` quando é dono do personagem).

### Loop recomendado

```js
// 1) carregar estado: GET /campaigns/:id?light=1, /messages, /scenes, /scenes/:sid/tokens, /notes...
// 2) pegar cursor
let { cursor } = await api.get(`/campaigns/${id}/events`);
async function tick() {
  try {
    const res = await api.get(`/campaigns/${id}/events?after=${cursor}`);
    for (const ev of res.events) {
      if (isMaster && ev.payload?.view === 'player') continue;
      applyEvent(ev);              // atualiza o estado local
    }
    cursor = res.cursor;
    if (res.events.length === 200) return setTimeout(tick, 0); // ainda há mais
  } catch (e) { /* 401 → login; 403 → saiu da campanha */ }
  setTimeout(tick, document.visibilityState === 'visible' ? 1500 : 10000);
}
tick();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });
```

Limites: o polling do feed e o movimento de tokens têm limite próprio (900 req/min por IP), fora do limite geral da API.

### Tipos de evento

| type | audience | payload |
|---|---|---|
| `message:created` | all | `{ message }` (mesmo formato de `GET /messages`) |
| `message:updated` | all | `{ message }` |
| `message:deleted` | all | `{ messageId }` |
| `members:changed` | all | `{ userId, action: 'joined'\|'left'\|'removed'\|'color'\|'character' }` → recarregue `GET /campaigns/:id?light=1` |
| `character:shared` | all | `{ userId, characterId \| null }` (null = deixou de compartilhar) |
| `character:updated` | all | `{ characterId }` (sem números; quem pode ver recarrega a ficha) |
| `notes:changed` | author / master / all | `{ noteId, action: 'created'\|'updated'\|'deleted', scope }` → recarregue `GET /notes` |
| `scene:updated` | all (cena ativa) ou master | `{ scene, changed?: [campos], map_changed?: bool }` — `scene` sem `map_url` (tem `has_map_url`); se `map_changed`, busque `GET /scenes/:sid` |
| `scene:activated` | all | `{ sceneId }` → recarregue cenas e tokens |
| `scene:deleted` | all/master | `{ sceneId }` |
| `token:moved` | all (master se oculto) | `{ tokenId, sceneId, x, y }` — coalescido: só a última posição recente fica no feed; anime até ela |
| `token:updated` | player + master | player: `{ token }` (projeção segura) ou `{ tokenId, sceneId, removed: true }` se ficou oculto; master: `{ token }` completo |
| `token:removed` | all | `{ tokenId, sceneId }` |
| `token:hit` | player + master + owner | player: `{ tokenId, sceneId, outcome, down, rollId }` (sem dano/PV); master: `+ amount, hp_current, hp_max`; owner (`view: "owner"`, só para o dono do personagem): `+ characterId, amount, life_current, life_max` |
| `initiative` | player + master | `{ sceneId, initiative, turn_index, round, current_token_id }` (jogador não vê entradas de tokens ocultos) |
| `combat` | player + master | `{ sceneId, mode, initiative, turn_index, round, turn_state, movement_per_turn }` (estado completo; o mais novo substitui os anteriores) |
| `roll` | all (master se secreta) | ver seção 5 |
| `ping` | all | `{ userId, name, color, x, y, sceneId }` (efêmero: mostre ~2 s) |

---

## 2. Sala da campanha (mudanças nos endpoints antigos)

### `GET /api/campaigns/:id?light=1`

Versão leve para reabrir/recarregar sem baixar 200 mensagens nem fichas:

```json
{
  "campaign": { "id": "uuid", "name": "Mesa", "master_id": "uuid", "invite_code": "A1B2C3D4", "...": "..." },
  "members": [
    { "user_id": "uuid", "name": "Ana", "role": "player", "color": "#9b8ac7", "display_name": "Heroína", "display_avatar": "", "shared_character_id": "uuid",
      "shared_character": { "id": "uuid", "character_name": "Heroína", "photo": "", "level": 1 } }
  ],
  "role": "player",
  "isMaster": false
}
```

Sem `light`, a resposta antiga continua (com `messages` e `isMaster`). Correção: os números da ficha (vida, atributos, inventário) não aparecem mais no topo do membro; só dentro de `shared_character`, e só para o mestre ou o próprio dono.

### `GET /api/campaigns/:id/messages?after=<created_at ISO>`

Mensagens com `created_at` maior que `after` (até 200, em ordem crescente). Sem `after`, as **últimas** 200 (antes vinham as 200 mais antigas). Cada mensagem agora tem:

```json
{ "id": "uuid", "message_type": "text" | "roll", "meta": null | { "...": "dados da rolagem (seção 5)" }, "content": "Ataque: 1d20+3 = 17", "user_name": "Heroína", "user_avatar": "", "color": "#d6a65f", "created_at": "..." }
```

### `PUT /api/campaigns/:id/members/me/character`

`{ "characterId": "uuid" | null }` — `null` deixa de compartilhar. A resposta é o membro mais `notice`: `"Personagem compartilhado com o mestre."` ou `"Personagem retirado da campanha."` (use esse texto no aviso). Emite `character:shared` e `members:changed`.

### Outras correções

- Lojas: `visibleToPlayers` / `available` aceitam `true/false` e `"true"/"false"` corretamente; `priceDracmas`, `stock`, `quantity` precisam ser inteiros.
- `POST /purchase-requests` sem `characterId` → `400 { "message": "Escolha um personagem para comprar." }`.
- Diário: `PUT` sem `characterId` mantém o personagem atual; o mestre pode excluir entradas dos jogadores (não as privadas de mestre de outra pessoa).
- Erros inesperados nunca mostram a mensagem do banco: viram `500 { "message": "<texto genérico pt-BR>" }`.

---

## 3. Notas

`scope`: `private` (só o autor), `master` (autor + mestres), `party` (todos os membros). Só o autor edita. O autor ou o mestre exclui (o mestre não enxerga nem exclui notas privadas de outros).

- `GET /api/campaigns/:id/notes` → lista visível, fixadas primeiro:
  ```json
  [{ "id": "uuid", "campaign_id": "uuid", "author_id": "uuid", "author_name": "Ana", "character_id": null, "character_name": null,
     "scope": "party", "title": "Pistas", "body": "texto (até 20 000)", "pinned": true, "created_at": "...", "updated_at": "..." }]
  ```
- `POST /api/campaigns/:id/notes` `{ "title": "Pistas", "body": "...", "scope": "party", "pinned": false, "characterId": null }` → 201 nota.
- `PATCH /api/campaigns/:id/notes/:noteId` (qualquer subconjunto dos campos acima) → nota.
- `DELETE /api/campaigns/:id/notes/:noteId` → 204.

Eventos: `notes:changed` para a audiência certa (privada → só autor; master → mestres + autor; party → todos).

---

## 4. Ficha completa para o mestre e vitais

### `GET /api/campaigns/:id/characters/:characterId`

Mesmo objeto enriquecido de `GET /api/characters/:id` (atributos, perícias, `skills_catalog`, inventário, ataques, magias, carteira, `dodge`, `total_defense`, `race_name`...). Pode: o dono, ou o mestre se o personagem estiver compartilhado na campanha. Outros → 403.

### `PATCH /api/campaigns/:id/characters/:characterId/vitals`

Mestre (personagem compartilhado) ou dono. Valores limitados a `0..máximo`.

```json
// pedido
{ "life_current": 12, "sanity_current": 30, "mana_current": 4 }
// resposta
{ "id": "uuid", "life_current": 12, "life_max": 30, "sanity_current": 20, "sanity_max": 20, "mana_current": 4, "mana_max": 10 }
```

Emite `character:updated { characterId }`.

---

## 5. Dados (rolagens)

### `POST /api/campaigns/:id/rolls`

```json
{
  "formula": "1d20+3",          // obrigatório, exceto kind 'skill' com characterId + skill
  "label": "Ataque com espada",
  "kind": "attack",             // 'attack' | 'damage' | 'skill' | 'free' (padrão 'free')
  "characterId": "uuid",        // opcional: dono ou mestre (se compartilhado)
  "skill": "Luta",              // nome ou chave da perícia (kind 'skill')
  "powerName": "Golpe Guardião",
  "targetTokenId": "uuid",
  "secret": false               // só o mestre; vai só para o mestre e não entra no chat
}
```

Fórmula: `NdM±B` (até 20 dados, d2–d100, bônus até 10 000). Em `kind: 'skill'` com `characterId` e `skill`, o servidor calcula como a ficha: `1d20 + atributo da perícia + treino + outros bônus`.

Resposta `201` (o mesmo objeto vai no evento `roll` e em `messages.meta`):

```json
{
  "rollId": "uuid", "userId": "uuid", "userName": "Ana", "characterId": "uuid", "characterName": "Heroína",
  "label": "Luta (Heroína)", "powerName": null, "skill": "Luta", "formula": "1d20+7",
  "rolls": [14], "dice": [{ "sides": 20, "value": 14 }], "bonus": 7, "total": 21,
  "targetTokenId": "uuid", "targetName": "Guardião de Cinzas", "kind": "skill", "secret": false,
  "color": "#9b8ac7", "created_at": "...", "messageId": "uuid"
}
```

Rolagens não secretas criam uma mensagem `message_type: 'roll'` no chat e emitem **só** o evento `roll` (não `message:created`). Use `messageId` para não duplicar a rolagem quando recarregar as mensagens.

Regras de combate para jogadores (seção 6.5): `attack`/`skill` só no próprio turno e uma vez; `damage` só depois de um `attack` no mesmo turno (uma vez); `free` sempre. Fora disso → `409`.

### `POST /api/campaigns/:id/tokens/:tokenId/hit` (mestre)

```json
{ "amount": 7, "outcome": "hit", "rollId": "uuid" }   // outcome: 'hit' | 'miss' | 'heal'
```

NPC/monstro: muda `hp_current` do token. Personagem: muda `life_current` da ficha. Sempre limitado a `0..máximo`. Resposta: `{ tokenId, sceneId, outcome, down, rollId, amount, hp_current, hp_max }`. Eventos `token:hit` (jogadores sem números; mestre e dono com números) e, para personagem, `character:updated`.

---

## 6. Mesa virtual

### 6.1 Cenas

Campos de cena:

| campo | tipo | padrão | observação |
|---|---|---|---|
| `name` | texto | — | obrigatório ao criar |
| `map_kind` | `'image'` \| `'tiles'` | `'image'` | |
| `map_url` | https ou `data:image/(webp\|png\|jpeg);base64,...` | null | até ~3,5 MB |
| `tiles` | objeto | null | ver 6.2 |
| `grid_size` | int px | 70 | tamanho de **1 passo (1 metro)**; escala de tokens e distância |
| `grid_offset_x/y` | int | 0 | |
| `width`, `height` | int px | 1400 × 1000 | |
| `show_grid` | bool | **false** | o mapa não tem quadradinhos por padrão |
| `move_mode` | `'free'` \| `'grid'` | **'free'** | movimento livre por padrão |
| `move_speed` | número | 6 | passos por segundo no WASD |
| `fog_enabled` | bool | false | |
| `fog_reveals` | `[{x,y,w,h}]` | `[]` | áreas reveladas (px do mapa) |
| `mode` | `'prep'` \| `'exploration'` \| `'combat'` | `'prep'` | PATCH aceita só prep/exploration; combate por 6.5 |
| `movement_per_turn` | int | 6 | passos por turno no combate |
| `initiative`, `turn_index`, `round`, `turn_state` | | | leitura; mudam por 6.5 |
| `is_active`, `position` | | | |

- `GET /api/campaigns/:id/scenes` → mestre: todas; jogador: só a ativa (array com 0 ou 1).
- `GET /api/campaigns/:id/scenes/:sceneId` → cena (jogador só a ativa).
- `POST /api/campaigns/:id/scenes` (mestre) `{ "name": "Cripta", "map_url": "https://...", "grid_size": 70 }` → 201 cena. A primeira cena já nasce ativa.
- `PATCH /api/campaigns/:id/scenes/:sceneId` (mestre) com qualquer campo editável (ex.: `{ "fog_reveals": [{ "x": 0, "y": 0, "w": 300, "h": 200 }] }`, `{ "mode": "exploration" }`).
- `DELETE /api/campaigns/:id/scenes/:sceneId` (mestre) → 204 (tokens juntos).
- `POST /api/campaigns/:id/scenes/:sceneId/activate` (mestre) → cena; emite `scene:activated`.
- `PUT /api/campaigns/:id/scenes/:sceneId/initiative` (mestre) `{ "initiative": [{ "tokenId": "uuid", "value": 17 }], "turn_index": 0, "round": 1 }` → cena; emite `initiative`. (Para combate com regras, prefira 6.5.)

### 6.2 Mapa em tiles

```json
{
  "cols": 20, "rows": 12,
  "layers": {
    "ground":  ["....................", "...(12 linhas)"],
    "objects": ["......T.............", "..."]
  }
}
```

Regras do servidor: `cols`/`rows` entre 4 e 80; 1 ou 2 camadas (nome `a-z_`); cada camada com exatamente `rows` linhas; cada linha com exatamente `cols` caracteres ASCII imprimíveis (1 caractere = 1 célula). O significado dos códigos é do frontend (`frontend/src/lib/tiles/catalog.js`); `.` é o chão padrão/vazio. Células sólidas são bloqueadas pelo cliente (o servidor só confere distância).

### 6.3 Mapa por IA — `POST /api/campaigns/:id/maps/generate` (mestre)

```json
// pedido
{ "description": "Cripta com colunas e um altar ao norte (até 1500)", "cols": 24, "rows": 16, "catalog": ". chão\n# parede\nT tocha\n... (até 6000)" }
// resposta 200
{ "tiles": { "cols": 24, "rows": 16, "layers": { "ground": ["..."], "objects": ["..."] } }, "name": "Cripta do Altar", "notes": "Dica para o mestre." }
```

O servidor corta/completa linhas com `.`. Provedor: `ANTHROPIC_API_KEY` (modelo `claude-haiku-5-5`, opcionalmente `ANTHROPIC_MAP_MODEL`) ou `GROQ_API_KEY` (`llama-3.3-70b-versatile`, opcionalmente `GROQ_MAP_MODEL`). Sem chave → `503 { "error": "Geração por IA não configurada no servidor. Use o prompt pronto e cole o resultado.", "message": "(o mesmo)" }`. Limite: 10 por hora por usuário (`429`). Tempo máximo 25 s (`502` se o provedor falhar). Grave o resultado com `PATCH scenes/:sid { "map_kind": "tiles", "tiles": ... }`.

### 6.4 NPCs e monstros da campanha (só mestre)

```json
{ "id": "uuid", "campaign_id": "uuid", "name": "Guarda", "image_url": null, "kind": "npc" | "monster", "monster_id": null,
  "hp_max": 10, "defense": 10, "dodge": 13, "attacks": [{ "name": "Espada", "damage_formula": "1d8+2", "description": "" }], "notes": "" }
```

- `GET /api/campaigns/:id/npcs`, `POST /api/campaigns/:id/npcs` (`name` obrigatório), `PATCH .../npcs/:npcId`, `DELETE .../npcs/:npcId`.
- `POST /api/campaigns/:id/npcs/from-monster/:monsterId` → copia um monstro da biblioteca (`hp_max = base_health`, `defense = armor`, ataques copiados).

### 6.5 Tokens

Objeto token (visão do mestre):

```json
{ "id": "uuid", "scene_id": "uuid", "campaign_id": "uuid", "kind": "character" | "npc" | "monster" | "marker",
  "character_id": "uuid" | null, "npc_id": "uuid" | null, "owner_id": "uuid do dono do personagem" | null,
  "name": "Heroína", "image_url": "...", "x": 210, "y": 140, "size": 1, "color": "#d6a65f", "hidden": false,
  "hp_current": 25, "hp_max": 30, "down": false, "conditions": ["envenenado"], "controlled_by": "uuid", "updated_at": "..." }
```

Visão do jogador: tokens `hidden` não aparecem; sem `hidden`/`npc_id`; `hp_current`/`hp_max` são `null` exceto no token do próprio personagem; `down` (PV ≤ 0) e `conditions` aparecem para todos. PV de personagem vem da ficha (`life_current/life_max`). `x`, `y` em px do mapa; `size` em passos.

- `GET /api/campaigns/:id/scenes/:sceneId/tokens`
- `POST /api/campaigns/:id/scenes/:sceneId/tokens`
  - Mestre: `{ "kind": "monster", "npcId": "uuid", "x": 0, "y": 0, "hidden": true }`, `{ "kind": "character", "characterId": "uuid" }` (precisa estar compartilhado), `{ "kind": "marker", "name": "Armadilha", "color": "#cf6f8f" }`.
  - Jogador: só `{ "kind": "character", "x": 0, "y": 0 }` — usa o personagem compartilhado dele, uma vez por cena (`409` se já existe), só na cena ativa.
- `PATCH /api/campaigns/:id/tokens/:tokenId` — mestre: qualquer campo (`name, image_url, x, y, size, color, hidden, hp_current, hp_max, conditions, controlled_by`); jogador: só `x`, `y` do próprio token (`controlled_by` = ele ou personagem dele). Envie a posição com throttle (~8/s) e sempre a posição final ao soltar a tecla.
- `DELETE /api/campaigns/:id/tokens/:tokenId` (mestre) → 204.
- `POST /api/campaigns/:id/ping` `{ "x": 10, "y": 20, "sceneId": "uuid" }` (qualquer membro).

### 6.6 Modos da mesa e combate por turnos

- `prep` (padrão): só o mestre move tokens. PATCH x,y de jogador → `409 "A mesa está em preparação: só o mestre move os tokens."`
- `exploration`: jogadores movem os próprios tokens livremente (WASD a `move_speed` passos/s).
- `combat`: turnos. O mestre ignora todas as regras abaixo.

`turn_state`:

```json
{ "tokenId": "uuid do token da vez", "moved": 2.85, "action_used": false, "attacked": false, "damage_rolled": false, "started_at": "ISO" }
```

Endpoints:

- `POST .../scenes/:sceneId/combat/start` (mestre) `{ "rollInitiative": true, "movement_per_turn": 6 }` → rola `1d20 + Agilidade` (da ficha) para personagens e `1d20` para NPC/monstro (marcadores ficam fora), ordena do maior para o menor. Alternativas: `{ "initiative": [{ "tokenId": "...", "value": 15 }] }` (ordem manual) ou `{ "rollInitiative": false }` (reusa a iniciativa salva). Resposta: cena com `mode: 'combat'`, `turn_index: 0`, `round: 1`.
- `POST .../combat/next` (mestre) → próximo turno; depois do último volta ao primeiro com `round + 1`; `turn_state` zera.
- `POST .../combat/end-turn` (jogador dono do token da vez, ou mestre) → igual ao `next`. Fora do turno → `409 "Não é o seu turno."`
- `POST .../combat/end` (mestre) → `mode: 'exploration'`, `turn_state: {}`.

Regras no servidor para jogadores em combate:

- Movimento: só o token da vez. A cada PATCH de `x,y` soma a **distância euclidiana** percorrida, em passos: `sqrt(dx² + dy²) / grid_size`, em `turn_state.moved` (float). Se passar de `movement_per_turn` (+ tolerância de 0,25) → `409 "Sem movimento neste turno."` (a posição não muda). Para não gastar passos à toa, mande posições intermediárias reais (o servidor soma o caminho, não a distância em linha reta do início).
- Ação: `attack` ou `skill` uma vez por turno (`409 "Você já usou sua ação neste turno."`); `damage` só depois de um `attack` no mesmo turno, uma vez (`409 "Role o ataque antes do dano neste turno."`); `free` sempre.
- Fora do turno → `409 "Não é o seu turno."`

Cada mudança (start/next/end/end-turn, passos gastos, ação usada) emite `combat` com o estado completo.

---

## 7. Livro de regras

Público (sem login):

- `GET /api/rules` →
  ```json
  { "meta": { "version": "0.5 Beta" },
    "sections": [{ "id": "uuid", "slug": "sobre-esta-edicao", "parent_id": null, "position": 0, "level": 1, "title": "Sobre esta edição" }] }
  ```
  `sections` vem na ordem de leitura (árvore em profundidade). Capítulos (`#`) têm `level 1`.
- `GET /api/rules/:slug` →
  ```json
  { "id": "uuid", "slug": "caos", "title": "Caos", "body_md": "markdown", "parent_id": "uuid", "level": 3, "position": 0, "updated_at": "...",
    "children": [{ "slug": "...", "title": "..." }],
    "prev": { "slug": "os-oito-primordiais", "title": "Os Oito Primordiais" },
    "next": { "slug": "gaia", "title": "Gaia" } }
  ```
- `GET /api/rules/search?q=erebo` → `{ "results": [{ "slug": "erebo", "title": "Érebo", "snippet": "…até 160 caracteres…" }] }` (sem diferenciar acentos/maiúsculas; mínimo 2 letras; até 30).

Slugs: minúsculas sem acento com hífens (`bem-vindo-a-lugubre`, `o-mundo-de-lugubre`, `criacao-de-personagem`, `regras-do-sistema`, `magias-e-poderes`, `equipamentos`, `criaturas`, `guia-do-mestre`, `referencia-e-desenvolvimento`; Primordiais `caos`, `gaia`, `ponto`, `erebo`, `nix`, `tartaro`, `eter`, `ananque`). Em colisão, só a repetida ganha o prefixo do pai (`elementos-caos`, `paladino-progressao-de-recursos`).

Markdown do corpo: parágrafos separados por linha em branco, `**negrito**`, `*itálico*`, listas `- `, tabelas `| a | b |` com `| --- | --- |`, citações `> ` (quadros do livro, primeira linha em negrito é o título do quadro), `---` separador, imagem `![alt](/images/livro/capa.webp)`.

Admin (`role = admin`):

- `POST /api/admin/rules` `{ "title": "Nova seção", "body_md": "...", "parent_id": "uuid|null", "slug": "opcional", "position": 3 }` → `201 { "section": {...mesmo formato do GET /:slug} }`
- `PUT /api/admin/rules/:id` `{ "title": "...", "body_md": "..." }` (também `slug`, `parent_id`, `position`) → `{ "section": {...} }`
- `DELETE /api/admin/rules/:id` → 204 (`409` se tiver subseções).
- `PUT /api/admin/rules-meta` `{ "version": "0.6 Beta" }` → `{ "meta": {...} }`

Seed: `npm run db:seed-rules` (lê `docs/livro/livro-0.5-beta-v2.md`). Cria o que falta, atualiza o que não foi editado e **nunca** sobrescreve seção editada pelo admin (salvo `-- --force`). Para regerar o Markdown a partir do .docx: `python3 docs/livro/extrair-livro.py <livro.docx>`.
