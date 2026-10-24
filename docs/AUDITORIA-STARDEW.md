# Auditoria de estilo Stardew: criador de personagem

Conferi o catálogo inteiro (cada cabelo, roupa, acessório e item na mão) nas visões de frente, perfil e costas, ampliadas. O modelo usado foi um humano com camisa clara, calça e sapato.

As folhas estão em `docs/pixelart/auditoria/<categoria>-<página>.png`, com a ordem das peças em `<categoria>-nomes.txt` (6 peças por linha, 3 visões cada). Para gerar de novo, a partir de `frontend/`:

```bash
node src/lib/avatar/audit.mjs torso <pasta>
```

## Resumo por categoria

| Categoria | Peças | Nota | Comentário |
|---|---:|---|---|
| Cabeça | 42 | **Boa** | Chapéus, elmos, capuzes e coroas com silhueta clara: é a categoria mais "Stardew". |
| Costas | 40 | **Boa** | Capas, asas (anjo, morcego, fada, ossos, borboleta, dragão), armas e mochilas bem legíveis. |
| Na mão | 39 | **Boa** | Armas, cajados e ferramentas legíveis, com a pegada na mão. |
| Rosto: máscaras e óculos | 22 | **Boa** | Bico de praga, caveira, raposa, ferro, oni, óculos e venda. |
| Tronco | 102 | **Boa, com 3 defeitos** | Camisas, túnicas, coletes, casacos, robes, vestidos e armaduras leem bem. |
| Cabelos | 59 | **Média** | Longos, presos, tranças, cachos e afro bons; os raspados e as visões de costas têm defeitos. |
| Pés | 48 | **Média** | Funcionam, mas muitas botas ficam parecidas por causa da perna curta. |
| Cintura | 42 | **Média** | Cintos e bolsas leem; os penduricalhos tapam a perna curta. |
| Braços | 44 | **Média** | Ombreiras e braçadeiras boas; tatuagens, marcas e pulseiras finas quase não aparecem. |
| Mãos | 50 | **Fraca na metade** | Luvas boas; anéis, unhas e marcas (quase toda a 2ª página) somem. |
| Pescoço | 44 | **Fraca na metade** | Cachecóis, golas e lenços bons; a maioria dos colares e amuletos some sobre roupa clara. |
| Orelhas | 41 | **Fraca** | Protetores de orelha e argolas grandes aparecem; brincos de 1 px somem. |
| Rosto: marcas, cicatrizes e piercings | 21 | **Fraca** | Quase invisíveis nesse tamanho. |
| Partes de baixo | 62 | **Fraca** | A perna tem ~5 linhas visíveis: calça, bermuda e saia longa ficam quase iguais. |
| Pernas (acessórios) | 38 | **Fraca** | Mesmo motivo: pouco espaço entre a barra da roupa e a bota. |

## Problemas encontrados, do mais importante ao menos importante

### 1. Proporção do corpo: perna curta demais (afeta partes de baixo, pernas, pés e cintura)

- **Hoje:**
  - Tronco: 8 linhas (16–23).
  - Quadril: linha 24.
  - Pé: linhas 29–30.
  - Sobram só ~5 linhas de perna.
  - A "saia longa" termina uma linha abaixo da "midi".
- **No Stardew:** o fazendeiro tem tronco mais curto e perna de 7–8 linhas.
- **Correção:**
  - Encurtar o tronco para 7 linhas.
  - Subir o quadril e descer o pé até a linha 31, chegando a ~8 linhas de perna.
  - Todas as peças são relativas ao esqueleto (`skeleton.js`), então a maior parte se ajusta sozinha.
  - Depois, revisar as folhas de novo e recalibrar comprimentos (bermuda, capri, saias).

### 2. Braço de perfil manchado (afeta todo o tronco de manga curta)

- **Hoje:** de perfil, o braço nu passa por cima da camisa e aparece como uma faixa avermelhada borrada.
  - A linha interna escurece a borda.
  - A sombra rosada da pele fica forte demais.
- **Correção:**
  - Braço de perfil com tons 2 e 3 da pele, sem a linha interna.
  - Um contorno limpo só do lado de trás do braço.

### 3. Raspados em xadrez (cabelos)

- **Hoje:** raspado, moicano, undercut, tonsura e coque samurai usam um pontilhado de pixel alternado, que parece tela de arame.
- **Correção:** área sólida no tom 1 do cabelo, com 2 ou 3 pixels de brilho no alto, como no Stardew.

### 4. Cones vistos de costas (cabelos)

- **Hoje:** moicano, topete, coque alto, coque com franja e dreads presos viram um triângulo de costas, parecendo chapéu de bruxa.
- **Correção:**
  - Coque redondo (bola) de costas.
  - Moicano como faixa de largura constante até a nuca.
  - Topete de costas sem volume em ponta.

### 5. Estampas que viram ruído (tronco)

- **Poá** (Blusa de poá, Robe estrelado, Vestido de festa): sai em listras diagonais, porque a fórmula está errada. Trocar por bolinhas numa grade desencontrada.
- **Cota de malha e escamas:** xadrez de 1 px.
  - Malha: anéis de 2×2.
  - Escamas: meias-luas de 3×2 com brilho em cima.

### 6. Grevas com desenho de "EE" (pés)

As grevas de metal e as de bronze mostram faixas que formam a letra E. Aplicar o mesmo conserto feito nas escarcelas: placa com brilho em cima e sombra embaixo, sem cortar no meio.

### 7. Peças minúsculas invisíveis (orelhas, pescoço, mãos, braços, rosto)

- **Hoje:** brincos, anéis, colares finos, piercings, cicatrizes e tatuagens têm 1 px e somem, ainda mais sobre roupa clara.
- **Correção, no estilo Stardew:**
  - Joias com 2 px e um pixel de brilho branco.
  - Colar com pingente de 2×2 e corrente com contraste.
  - Cicatriz em tom bem escuro com 2–3 px.
  - Tatuagens e marcas fortes: com cor saturada, ou passar para a aba "Traços".
- **Opção:** juntar variações que ficam iguais nesse tamanho e criar outras com silhueta maior. Exemplos: brinco de pena longa, colar com medalhão grande, pulseira de couro grossa.

### 8. Cores padrão

Várias peças claras (osso, ouro, prata) usam cor padrão que some na túnica bege inicial. Vale escolher padrões com mais contraste e conferir sobre roupa clara e escura.

## Ordem sugerida para a próxima rodada

1. Proporção do esqueleto (item 1). Corrige de uma vez partes de baixo, pernas, pés e cintura.
2. Braço de perfil (item 2).
3. Cabelos: raspados e costas (itens 3 e 4).
4. Estampas e grevas (itens 5 e 6).
5. Peças minúsculas (item 7) e cores padrão (item 8).
6. Gerar todas as folhas de auditoria de novo e conferir.
7. Depois, as outras texturas: blocos do mapa um a um, poço 2×2 e objetos grandes, retratos, ícones de itens e de interface. Tudo no mesmo padrão: rampa quente com hue shift, contorno sépia e luz do alto-esquerda.
