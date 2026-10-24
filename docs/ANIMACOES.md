# Animações de ataque e magia

Efeitos de golpe e magia em pixel art no estilo Stardew Valley: partículas grossas (1–3 pixels de arte), cores quentes com variação de matiz, golpes curtos com hit-stop, flash branco e um tremor pequeno. Tudo é desenhado em código num `<canvas>` (só `fillRect`), sem pacotes novos.

- Biblioteca: `frontend/src/lib/fx/` (`index.js` exporta tudo)
- Camada React: `frontend/src/components/fx/FxLayer.jsx`
- Galeria: Admin → **Animações** (`components/admin/AdminAnimationsPage.jsx`)
- Folha de conferência: `docs/pixelart/animacoes.png` (gerar de novo com `node src/lib/fx/preview.mjs <pasta> tudo`)
- Testes: `cd frontend && npx vitest run src/lib/fx`

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
