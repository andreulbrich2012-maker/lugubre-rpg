# Grimório

Catálogo visual de magias do Lúgubre RPG. **Não é regra:** o livro ainda não define escolas, custos nem efeitos mecânicos de magia. Alvo, alcance e elemento são sugestões de cena, usadas para escolher animação e ícone. Um poder cadastrado com o mesmo nome (sem diferenciar acentos e maiúsculas) toca a animação daqui.

Fonte de dados: `frontend/src/lib/fx/spells/catalog.js`. 442 magias em 34 escolas, cada uma com animação própria. Para vê-las, abra **Grimório** no menu (rota `/grimorio`). Para ligar um poder a uma magia, ponha `"animation": { "spell": "<id>" }` no cadastro ou dê ao poder o mesmo nome (ver `docs/ANIMACOES.md`).

| Escola | Básica | Intermediária | Avançada | Lendária | Total |
|---|---|---|---|---|---|
| Fogo | 4 | 4 | 3 | 3 | 14 |
| Gelo | 4 | 4 | 3 | 2 | 13 |
| Água | 4 | 4 | 3 | 2 | 13 |
| Terra | 3 | 4 | 4 | 2 | 13 |
| Ar | 3 | 4 | 3 | 2 | 12 |
| Raio | 3 | 4 | 3 | 2 | 12 |
| Ácido | 3 | 5 | 2 | 1 | 11 |
| Veneno | 3 | 4 | 2 | 1 | 10 |
| Luz | 3 | 4 | 3 | 2 | 12 |
| Trevas | 3 | 4 | 3 | 2 | 12 |
| Força | 3 | 4 | 3 | 2 | 12 |
| Ilusão | 4 | 5 | 4 | 2 | 15 |
| Encantamento | 4 | 4 | 3 | 2 | 13 |
| Necromancia | 4 | 4 | 4 | 2 | 14 |
| Conjuração | 4 | 4 | 4 | 2 | 14 |
| Abjuração | 4 | 4 | 4 | 2 | 14 |
| Transmutação | 4 | 4 | 4 | 2 | 14 |
| Adivinhação | 4 | 4 | 3 | 2 | 13 |
| Divina | 4 | 4 | 4 | 2 | 14 |
| Natureza | 4 | 4 | 4 | 2 | 14 |
| Sombras | 4 | 4 | 3 | 2 | 13 |
| Sangue | 4 | 4 | 3 | 2 | 13 |
| Tempo | 4 | 4 | 3 | 2 | 13 |
| Espaço | 3 | 4 | 4 | 2 | 13 |
| Runas | 4 | 4 | 3 | 2 | 13 |
| Alquimia | 4 | 4 | 3 | 2 | 13 |
| Música | 4 | 4 | 3 | 2 | 13 |
| Maldições | 3 | 4 | 4 | 2 | 13 |
| Xamanismo | 3 | 5 | 3 | 2 | 13 |
| Cosmos | 3 | 4 | 3 | 3 | 13 |
| Caos | 3 | 4 | 3 | 2 | 12 |
| Metamagia | 3 | 4 | 3 | 2 | 12 |
| Utilitárias | 7 | 5 | 2 | 1 | 15 |
| Rituais | 3 | 4 | 4 | 3 | 14 |
| **Total** | 124 | 140 | 110 | 68 | 442 |

## Elementais

### Fogo (Piromancia)

_Chama, brasa, magma e explosão._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Fagulha | Básica | Uma criatura | Curto | Tártaro | Uma faísca salta dos dedos e acende o que tocar. |
| Toque Ardente | Básica | Uma criatura | Toque | Tártaro | A mão em brasa marca a carne do alvo com uma queimadura funda. |
| Mãos Flamejantes | Básica | Cone à frente | Pessoal | Tártaro | Um leque curto de chamas jorra das palmas abertas. |
| Brasa Saltitante | Básica | Vários alvos em cadeia | Curto | Tártaro | Uma brasa quica de inimigo em inimigo antes de apagar. |
| Bola de Fogo | Intermediária | Área pequena | Médio | Tártaro | Uma esfera de chamas voa até o alvo e explode em labareda. |
| Parede de Fogo | Intermediária | Linha | Médio | Tártaro | Uma cortina de chamas ergue-se do chão e queima quem atravessa. |
| Lança de Magma | Intermediária | Uma criatura | Médio | Tártaro | Um dardo de rocha derretida perfura e deixa o alvo em chamas. |
| Manto de Brasas | Intermediária | O conjurador | Pessoal | Tártaro | Chamas envolvem o corpo e queimam quem golpeia o conjurador. |
| Chuva de Cinzas Ardentes | Avançada | Área grande | Longo | Tártaro | Cinzas em brasa caem do céu e cobrem a área de fogo miúdo. |
| Sopro do Dragão | Avançada | Cone à frente | Pessoal | Tártaro | Um jato de fogo em cone devasta tudo à frente. |
| Coluna de Fogo | Avançada | Um ponto no chão | Médio | Tártaro | Um pilar de chamas desce do céu sobre um ponto e o consome. |
| Meteoro | Lendária | Área grande | Visão | Tártaro | Uma rocha incandescente rasga o céu e abre uma cratera em chamas. |
| Chuva de Meteoros | Lendária | Campo de batalha inteiro | Visão | Tártaro | Dezenas de pedras flamejantes castigam o campo de batalha. |
| Avatar do Tártaro | Lendária | O conjurador | Pessoal | Tártaro | O conjurador vira uma silhueta de fogo vivo que derrete o chão por onde passa. |

### Gelo (Criomancia)

_Geada, neve, cristais e frio que para o corpo._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Raio de Geada | Básica | Uma criatura | Curto | Ponto | Um fio de frio azul entorpece os membros do alvo. |
| Toque Gélido | Básica | Uma criatura | Toque | Ponto | Os dedos congelam a pele e roubam o calor do corpo. |
| Adaga de Gelo | Básica | O conjurador | Pessoal | Ponto | Uma lâmina de gelo surge na mão como arma improvisada. |
| Chão Escorregadio | Básica | Um ponto no chão | Curto | Ponto | Uma película de gelo cobre o chão e derruba quem pisa. |
| Lança de Gelo | Intermediária | Uma criatura | Médio | Ponto | Uma estaca de gelo voa e estilhaça no impacto. |
| Cone de Gelo | Intermediária | Cone à frente | Pessoal | Ponto | Um sopro glacial em cone congela o que encontra. |
| Muralha de Gelo | Intermediária | Linha | Médio | Ponto | Blocos de gelo erguem-se e fecham a passagem. |
| Armadura de Gelo | Intermediária | O conjurador | Pessoal | Ponto | Uma crosta de gelo protege o corpo e entorpece quem a toca. |
| Nevasca | Avançada | Área grande | Longo | Ponto | Uma tempestade de neve cega e congela a área. |
| Prisão de Gelo | Avançada | Uma criatura | Médio | Ponto | O alvo é encerrado num bloco de gelo maciço. |
| Estalagmites de Gelo | Avançada | Um ponto no chão | Médio | Ponto | Pontas de gelo irrompem do chão sob os inimigos. |
| Inverno Eterno | Lendária | Campo de batalha inteiro | Visão | Ponto | Um frio sem fim congela o campo de batalha e tudo que respira. |
| Zero Absoluto | Lendária | Uma criatura | Longo | Ponto | O frio total para o coração do alvo num instante. |

### Água (Hidromancia)

_Jatos, ondas, marés e afogamento._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Jato d'Água | Básica | Uma criatura | Curto | Ponto | Um esguicho forte empurra o alvo para trás. |
| Purificar Água | Básica | Um objeto | Toque | Ponto | Torna potável a água ou a bebida tocada. |
| Bolha Sufocante | Básica | Uma criatura | Curto | Ponto | Uma bolha de água envolve a cabeça do alvo e tira o fôlego. |
| Respirar na Água | Básica | O conjurador | Pessoal | Ponto | Guelras finas surgem no pescoço e permitem respirar submerso. |
| Onda | Intermediária | Linha | Médio | Ponto | Uma onda varre a linha e derruba quem estiver nela. |
| Redemoinho | Intermediária | Um ponto no chão | Médio | Ponto | Um vórtice de água prende e gira quem está no ponto. |
| Chicote d'Água | Intermediária | Uma criatura | Médio | Ponto | Um açoite líquido estala e agarra o alvo. |
| Forma Líquida | Intermediária | O conjurador | Pessoal | Ponto | O corpo vira água e escorre por frestas e grades. |
| Maremoto | Avançada | Área grande | Longo | Ponto | Uma muralha de água desaba sobre a área. |
| Gêiser | Avançada | Um ponto no chão | Médio | Ponto | Uma coluna de água fervente explode do chão. |
| Afogar | Avançada | Uma criatura | Médio | Ponto | Os pulmões do alvo se enchem de água salgada. |
| Dilúvio | Lendária | Campo de batalha inteiro | Visão | Ponto | Uma chuva sem fim inunda o campo e arrasta tudo. |
| Abraço do Abismo Marinho | Lendária | Área grande | Visão | Ponto | Tentáculos de água negra emergem e puxam os alvos para o fundo. |

### Terra (Geomancia)

_Pedra, lama, tremores e muralhas._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Pedrada | Básica | Uma criatura | Curto | Gaia | Uma pedra se desprende do chão e voa contra o alvo. |
| Lama | Básica | Um ponto no chão | Curto | Gaia | O chão vira lama grossa que prende os pés. |
| Pele de Pedra | Básica | O conjurador | Pessoal | Gaia | A pele endurece como rocha cinzenta. |
| Espinhos de Pedra | Intermediária | Um ponto no chão | Médio | Gaia | Estacas de rocha brotam do chão sob o alvo. |
| Muro de Pedra | Intermediária | Linha | Médio | Gaia | Uma muralha de pedra se ergue do solo. |
| Pedregulho | Intermediária | Uma criatura | Médio | Gaia | Uma rocha enorme é arremessada e esmaga o alvo. |
| Fenda | Intermediária | Um ponto no chão | Curto | Gaia | O chão se abre e engole quem está em cima. |
| Terremoto | Avançada | Área grande | Longo | Gaia | A terra treme, racha e derruba todos na área. |
| Prisão de Pedra | Avançada | Uma criatura | Médio | Gaia | O alvo é envolvido por um casulo de rocha. |
| Avalanche de Rochas | Avançada | Área pequena | Médio | Gaia | Rochas rolam do alto e soterram os inimigos. |
| Andar na Terra | Avançada | O conjurador | Pessoal | Gaia | O conjurador mergulha no solo e emerge em outro ponto. |
| Cataclismo | Lendária | Campo de batalha inteiro | Visão | Gaia | O chão inteiro se ergue em placas e desaba sobre os inimigos. |
| Montanha Viva | Lendária | Área grande | Visão | Gaia | Um pico de pedra brota do solo e esmaga tudo sob ele. |

### Ar (Aeromancia)

_Vento, vácuo, voo e redemoinhos._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Rajada | Básica | Uma criatura | Curto | Ponto | Um golpe de vento empurra o alvo para longe. |
| Queda Suave | Básica | O conjurador | Pessoal | Ponto | O vento amortece a queda como uma pluma. |
| Dissipar Névoa | Básica | Área pequena | Curto | Ponto | Uma brisa limpa névoa, fumaça e gás da área. |
| Lâmina de Vento | Intermediária | Linha | Médio | Ponto | Um corte de ar comprimido fere à distância. |
| Voo | Intermediária | O conjurador | Pessoal | Ponto | O conjurador flutua e voa pelos ares. |
| Muralha de Vento | Intermediária | Linha | Médio | Ponto | Uma parede de ventania desvia flechas e projéteis. |
| Vácuo | Intermediária | Uma criatura | Médio | Ponto | O ar é arrancado dos pulmões do alvo. |
| Tornado | Avançada | Um ponto no chão | Longo | Ponto | Um funil de vento suga e arremessa tudo na área. |
| Tempestade de Areia | Avançada | Área grande | Longo | Ponto | Areia cortante cega e esfola quem está na área. |
| Erguer no Ar | Avançada | Uma criatura | Médio | Ponto | O alvo é suspenso pelo vento e fica sem apoio. |
| Furacão | Lendária | Campo de batalha inteiro | Visão | Ponto | Ventos colossais varrem o campo de batalha. |
| Forma de Tempestade | Lendária | O conjurador | Pessoal | Ponto | O conjurador vira um redemoinho vivo de vento e raios. |

### Raio (Eletromancia)

_Choques, relâmpagos, trovões e tempestades._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Choque | Básica | Uma criatura | Curto | Ponto | Uma faísca elétrica salta da ponta do dedo. |
| Toque Chocante | Básica | Uma criatura | Toque | Ponto | A mão carregada dá um choque que trava os músculos. |
| Estática | Básica | O conjurador | Pessoal | Ponto | O corpo acumula carga e o próximo golpe dá choque. |
| Corrente Elétrica | Intermediária | Linha | Médio | Ponto | Um raio contínuo percorre a linha até o alvo. |
| Relâmpago em Cadeia | Intermediária | Vários alvos em cadeia | Médio | Ponto | Um raio salta de inimigo em inimigo. |
| Relâmpago | Intermediária | Uma criatura | Longo | Ponto | Um raio cai do céu sobre o alvo. |
| Esfera de Faíscas | Intermediária | Área pequena | Médio | Ponto | Uma bola crepitante explode em descargas. |
| Tempestade | Avançada | Área grande | Longo | Ponto | Nuvens negras despejam raios sobre a área. |
| Manto de Trovões | Avançada | O conjurador | Pessoal | Ponto | Arcos elétricos giram em volta do conjurador. |
| Trovão | Avançada | Cone à frente | Pessoal | Ponto | Um estrondo em cone ensurdece e derruba. |
| Fúria dos Céus | Lendária | Campo de batalha inteiro | Visão | Ponto | Centenas de raios caem sobre o campo de batalha. |
| Lança do Trovão Primordial | Lendária | Uma criatura | Longo | Ponto | Um único raio colossal desce e vaporiza o alvo. |

### Ácido (Corrosão)

_Gotas, poças e névoas que dissolvem carne e metal._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Gota Ácida | Básica | Uma criatura | Curto | Gaia | Uma gota corrosiva queima pele e metal. |
| Respingo Ácido | Básica | Até três criaturas | Curto | Gaia | Um respingo se divide e atinge dois alvos próximos. |
| Corroer | Básica | Um objeto | Toque | Gaia | O ácido dissolve uma fechadura, corrente ou grade. |
| Flecha Ácida | Intermediária | Uma criatura | Médio | Gaia | Uma seta de ácido que continua corroendo depois do impacto. |
| Poça Corrosiva | Intermediária | Área pequena | Médio | Gaia | Uma poça borbulhante corrói quem pisa. |
| Derreter Armadura | Intermediária | Uma criatura | Médio | Gaia | O ácido amolece e fura a armadura do alvo. |
| Vômito Ácido | Intermediária | Cone à frente | Pessoal | Gaia | Um jato de bile corrosiva sai em cone. |
| Sangue Ácido | Intermediária | O conjurador | Pessoal | Gaia | O sangue do conjurador queima quem o ferir. |
| Chuva Ácida | Avançada | Área grande | Longo | Gaia | Gotas corrosivas caem e dissolvem tudo devagar. |
| Lodo Devorador | Avançada | Uma criatura | Médio | Gaia | Uma massa ácida engole o alvo e o digere. |
| Mar de Ácido | Lendária | Área grande | Visão | Gaia | A área vira um lago corrosivo fervente. |

### Veneno (Toxicologia)

_Peçonha, esporos, névoas e pestes._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Picada Venenosa | Básica | Uma criatura | Curto | Gaia | Uma agulha de veneno arde e entorpece. |
| Envenenar Lâmina | Básica | Um objeto | Toque | Gaia | A arma tocada pinga veneno por alguns golpes. |
| Toque Peçonhento | Básica | Uma criatura | Toque | Gaia | O toque deixa veneno sob a pele. |
| Nuvem Venenosa | Intermediária | Área pequena | Médio | Gaia | Uma névoa verde sufoca quem respira. |
| Esporos Paralisantes | Intermediária | Uma criatura | Médio | Gaia | Esporos travam os músculos do alvo. |
| Sangue Envenenado | Intermediária | Uma criatura | Curto | Gaia | O veneno corre nas veias e enfraquece o alvo aos poucos. |
| Imunidade a Venenos | Intermediária | O conjurador | Pessoal | Gaia | O corpo neutraliza qualquer toxina. |
| Nuvem Pestilenta | Avançada | Área grande | Longo | Gaia | Uma nuvem de pestilência espalha febre e chagas. |
| Serpente de Veneno | Avançada | Uma criatura | Médio | Gaia | Uma serpente de peçonha verde morde o alvo e se desfaz. |
| Praga | Lendária | Campo de batalha inteiro | Visão | Gaia | Uma peste mágica se alastra de criatura em criatura. |

### Luz (Heliomancia)

_Sol, clarões, feixes e auroras._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Clarão | Básica | Uma criatura | Curto | Hemera | Um lampejo branco ofusca o alvo. |
| Dardo de Luz | Básica | Uma criatura | Curto | Hemera | Um dardo luminoso que queima criaturas das trevas. |
| Aura Solar | Básica | Aliados próximos | Pessoal | Hemera | Um calor dourado afasta o frio e o medo dos aliados. |
| Raio Solar | Intermediária | Linha | Médio | Hemera | Um feixe de sol queima tudo na linha. |
| Explosão Solar | Intermediária | Área pequena | Médio | Hemera | Uma esfera de luz explode e cega quem está perto. |
| Lança de Luz | Intermediária | Uma criatura | Médio | Hemera | Uma lança luminosa perfura e revela o invisível. |
| Espelho Solar | Intermediária | O conjurador | Pessoal | Hemera | A luz recebida é refletida contra o atacante. |
| Pilar de Luz | Avançada | Um ponto no chão | Longo | Hemera | Uma coluna de luz desce do céu sobre o alvo. |
| Aurora Ardente | Avançada | Área grande | Longo | Hemera | Uma onda de luz dourada varre a área. |
| Corpo de Luz | Avançada | O conjurador | Pessoal | Hemera | O conjurador vira luz pura e cruza o campo como um raio. |
| Sol Nascente | Lendária | Campo de batalha inteiro | Visão | Hemera | Um segundo sol surge no céu e queima as trevas do campo. |
| Prisma | Lendária | Vários alvos em cadeia | Visão | Hemera | A luz se divide em sete feixes que atingem alvos diferentes. |

### Trevas (Umbromancia)

_Breu, vazio e escuridão que devora a luz._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Dardo Sombrio | Básica | Uma criatura | Curto | Érebo | Uma farpa de escuridão gela o espírito do alvo. |
| Escuridão | Básica | Um ponto no chão | Curto | Érebo | Uma esfera de breu apaga toda luz no ponto. |
| Mão do Vazio | Básica | Uma criatura | Toque | Érebo | O toque arranca calor e cor do alvo. |
| Raio Sombrio | Intermediária | Linha | Médio | Érebo | Um feixe de trevas atravessa o alvo. |
| Explosão de Trevas | Intermediária | Área pequena | Médio | Érebo | Uma bolha negra estoura e engole a luz. |
| Tentáculos do Breu | Intermediária | Uma criatura | Médio | Érebo | Tentáculos negros brotam do chão e prendem o alvo. |
| Véu de Trevas | Intermediária | O conjurador | Pessoal | Érebo | Trevas envolvem o corpo e desviam golpes. |
| Esfera do Vazio | Avançada | Um ponto no chão | Médio | Érebo | Uma esfera negra devora tudo que toca. |
| Noite Sem Estrelas | Avançada | Área grande | Longo | Érebo | O céu escurece e os inimigos perdem a visão. |
| Eclipse Interior | Avançada | Uma criatura | Médio | Érebo | A luz do alvo se apaga e ele perde a vontade de lutar. |
| Buraco Negro | Lendária | Um ponto no chão | Visão | Érebo | Um ponto de vazio suga tudo em volta. |
| Fim da Luz | Lendária | Campo de batalha inteiro | Visão | Érebo | Toda luz do campo de batalha se apaga de uma vez. |

### Força (Evocação arcana)

_Energia arcana pura: mísseis, escudos e jaulas._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Mísseis Mágicos | Básica | Vários alvos em cadeia | Médio | Caos | Três dardos de energia que nunca erram o caminho. |
| Escudo Arcano | Básica | O conjurador | Pessoal | Caos | Um disco de força surge e bloqueia um golpe. |
| Mão Arcana | Básica | Um objeto | Curto | Caos | Uma mão de força pega, empurra ou carrega objetos. |
| Empurrão de Força | Intermediária | Uma criatura | Médio | Caos | Uma onda invisível arremessa o alvo para longe. |
| Raio Arcano | Intermediária | Linha | Médio | Caos | Um feixe violeta de energia pura. |
| Lâmina Espectral | Intermediária | Uma criatura | Médio | Caos | Uma espada de força flutua e golpeia sozinha. |
| Armadura Arcana | Intermediária | O conjurador | Pessoal | Caos | Uma couraça translúcida protege o corpo. |
| Prisão de Força | Avançada | Uma criatura | Médio | Caos | Uma jaula invisível encerra o alvo. |
| Martelo Arcano | Avançada | Área pequena | Médio | Caos | Um martelo de força desce e esmaga a área. |
| Esfera Resiliente | Avançada | Uma criatura | Médio | Caos | Uma bolha perfeita prende o alvo: nada entra, nada sai. |
| Tempestade Arcana | Lendária | Área grande | Visão | Caos | Centenas de mísseis mágicos cobrem a área. |
| Desintegrar | Lendária | Uma criatura | Longo | Caos | Um raio esverdeado reduz o alvo a pó. |

## Arcanas

### Ilusão (Ilusionismo)

_Do truque menor à realidade falsa que fere._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Ilusão Menor | Básica | Um objeto | Curto | Nix | Cria um som ou uma imagem pequena e falsa. |
| Disfarce | Básica | O conjurador | Pessoal | Nix | Muda a aparência do conjurador por algum tempo. |
| Luzes Dançantes | Básica | Uma criatura | Curto | Nix | Quatro luzes flutuantes enganam e distraem. |
| Ruído Fantasma | Básica | Um ponto no chão | Curto | Nix | Um som falso vem de onde o conjurador quiser. |
| Duplo Ilusório | Intermediária | O conjurador | Pessoal | Nix | Uma cópia do conjurador atrai os golpes. |
| Imagens Espelhadas | Intermediária | O conjurador | Pessoal | Nix | Três cópias giram em volta do conjurador. |
| Invisibilidade | Intermediária | O conjurador | Pessoal | Nix | O conjurador some da vista. |
| Terreno Ilusório | Intermediária | Um ponto no chão | Médio | Nix | O chão parece outra coisa: pântano, abismo ou campo florido. |
| Força Fantasmal | Intermediária | Uma criatura | Médio | Nix | Um monstro irreal ataca a mente do alvo. |
| Labirinto Ilusório | Avançada | Uma criatura | Médio | Nix | O alvo se perde num labirinto que só ele vê. |
| Invisibilidade em Grupo | Avançada | Aliados próximos | Pessoal | Nix | Todos os aliados próximos somem. |
| Assassino Fantasma | Avançada | Uma criatura | Médio | Nix | O maior medo do alvo toma forma e o fere. |
| Miragem Arcana | Avançada | Área grande | Longo | Nix | Uma paisagem inteira é trocada por uma ilusão. |
| Realidade Falsa | Lendária | Campo de batalha inteiro | Visão | Nix | A ilusão fica tão real que fere e mata. |
| Teatro de Sombras | Lendária | Área grande | Visão | Nix | Um exército ilusório marcha contra os inimigos. |

### Encantamento (Mente)

_Sono, medo, comando e domínio da vontade._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Enfeitiçar | Básica | Uma criatura | Curto | Nix | O alvo passa a ver o conjurador como amigo. |
| Sono | Básica | Área pequena | Curto | Nix | Uma névoa de sono derruba criaturas fracas. |
| Comando | Básica | Uma criatura | Curto | Nix | Uma palavra que o alvo obedece por um instante. |
| Zombaria Cruel | Básica | Uma criatura | Curto | Nix | Palavras mágicas ferem a mente e o orgulho. |
| Confusão | Intermediária | Uma criatura | Médio | Nix | O alvo ataca a esmo e não reconhece aliados. |
| Imobilizar Pessoa | Intermediária | Uma criatura | Médio | Nix | O corpo do alvo trava no lugar. |
| Sugestão | Intermediária | Uma criatura | Médio | Nix | Uma ideia razoável é plantada na mente do alvo. |
| Medo | Intermediária | Cone à frente | Pessoal | Nix | Uma onda de pavor faz os alvos fugirem. |
| Dominar | Avançada | Uma criatura | Médio | Nix | A vontade do alvo passa a ser do conjurador. |
| Loucura | Avançada | Área grande | Longo | Nix | A mente dos alvos se parte em mil vozes. |
| Apagar Memória | Avançada | Uma criatura | Médio | Nix | O alvo esquece os últimos minutos. |
| Palavra de Poder: Atordoar | Lendária | Uma criatura | Visão | Nix | Uma palavra que deixa o alvo em choque. |
| Domínio das Massas | Lendária | Campo de batalha inteiro | Visão | Nix | Uma multidão inteira obedece a uma só voz. |

### Conjuração (Invocação)

_Criaturas, servos e objetos chamados do nada._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Invocar Familiar | Básica | Um ponto no chão | Curto | Caos | Um espírito animal pequeno passa a servir o conjurador. |
| Conjurar Objeto | Básica | Um objeto | Curto | Caos | Um objeto simples aparece na mão. |
| Invocar Corvo | Básica | Uma criatura | Curto | Gaia | Um corvo surge do nada e bica o alvo. |
| Servo Invisível | Básica | Um ponto no chão | Curto | Caos | Um ajudante invisível carrega, limpa e busca. |
| Invocar Lobo Espectral | Intermediária | Um ponto no chão | Médio | Gaia | Um lobo de névoa azul surge e ataca. |
| Invocar Diabrete | Intermediária | Um ponto no chão | Médio | Tártaro | Um diabrete risonho salta de uma fenda em chamas. |
| Teia | Intermediária | Área pequena | Médio | Caos | Fios grudentos cobrem a área. |
| Invocar Elemental Menor | Intermediária | Um ponto no chão | Médio | Gaia | Um pequeno elemental do terreno surge para lutar. |
| Invocar Golem | Avançada | Um ponto no chão | Médio | Gaia | Um golem de pedra emerge do chão. |
| Invocar Horror do Abismo | Avançada | Um ponto no chão | Médio | Érebo | Tentáculos saem de uma fenda no chão. |
| Invocar Cavaleiro Espectral | Avançada | Um ponto no chão | Médio | Hemera | Um cavaleiro de luz monta guarda. |
| Chuva de Lâminas | Avançada | Área grande | Longo | Caos | Espadas conjuradas caem do céu sobre a área. |
| Invocar Dragão Ancestral | Lendária | Um ponto no chão | Visão | Tártaro | Um dragão de chamas rasga o céu e sopra fogo. |
| Chamado do Leviatã | Lendária | Área grande | Visão | Ponto | Uma criatura colossal emerge e esmaga tudo. |

### Abjuração (Proteção)

_Escudos, redomas, banimentos e anulação de magia._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Resistência | Básica | O conjurador | Pessoal | Ananque | Um brilho leve fortalece o corpo contra o próximo dano. |
| Proteção Contra o Mal | Básica | Um aliado | Toque | Éter | Seres profanos têm dificuldade de tocar o aliado. |
| Alarme | Básica | Área pequena | Toque | Ananque | Um sino mágico toca se alguém atravessar a área. |
| Aparar Feitiço | Básica | O conjurador | Pessoal | Ananque | Um gesto desvia uma magia menor. |
| Égide | Intermediária | Um aliado | Toque | Éter | Um escudo de luz flutua diante do aliado. |
| Dissipar Magia | Intermediária | Uma criatura | Médio | Ananque | Desfaz uma magia ativa no alvo. |
| Círculo de Proteção | Intermediária | Um ponto no chão | Pessoal | Éter | Um círculo no chão barra criaturas profanas. |
| Contra-Mágica | Intermediária | O conjurador | Pessoal | Ananque | Interrompe uma magia no meio da conjuração. |
| Redoma | Avançada | Aliados próximos | Pessoal | Éter | Uma cúpula de força protege todos dentro. |
| Banir | Avançada | Uma criatura | Médio | Ananque | O alvo é mandado de volta ao seu plano. |
| Refletir Magia | Avançada | O conjurador | Pessoal | Ananque | Magias contra o conjurador voltam para quem lançou. |
| Campo Antimagia | Avançada | Área pequena | Médio | Ananque | Nenhuma magia funciona dentro da área. |
| Santuário Inviolável | Lendária | Aliados próximos | Pessoal | Éter | Nada hostil entra na área enquanto durar. |
| Invulnerabilidade | Lendária | O conjurador | Pessoal | Ananque | O corpo fica intocável por um breve instante. |

### Transmutação (Mudança)

_Mudar corpo, matéria e forma._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Consertar | Básica | Um objeto | Toque | Caos | Une as partes quebradas de um objeto. |
| Salto Arcano | Básica | O conjurador | Pessoal | Caos | Pernas fortalecidas saltam três vezes mais longe. |
| Garras Bestiais | Básica | O conjurador | Pessoal | Caos | As mãos viram garras afiadas. |
| Moldar Argila | Básica | Um objeto | Toque | Caos | Molda terra, barro ou argila com as mãos. |
| Aumentar e Reduzir | Intermediária | Uma criatura | Médio | Caos | O alvo cresce ou encolhe. |
| Pele de Ferro | Intermediária | O conjurador | Pessoal | Caos | A pele vira metal escuro. |
| Metal Ardente | Intermediária | Uma criatura | Médio | Caos | O metal que o alvo veste esquenta até queimar. |
| Forma Gasosa | Intermediária | O conjurador | Pessoal | Caos | O corpo vira névoa. |
| Metamorfose | Avançada | Uma criatura | Médio | Caos | O alvo vira um sapo ou outro animal pequeno. |
| Petrificar | Avançada | Uma criatura | Médio | Caos | O alvo vira pedra devagar, dos pés à cabeça. |
| Forma Monstruosa | Avançada | O conjurador | Pessoal | Caos | O conjurador vira uma aberração de garras e presas. |
| Transmutar Matéria | Avançada | Um objeto | Toque | Caos | Muda o material de um objeto: ferro em vidro, pedra em madeira. |
| Metamorfose Verdadeira | Lendária | Uma criatura | Longo | Caos | Transforma qualquer coisa em qualquer outra, para sempre. |
| Forma Titânica | Lendária | O conjurador | Pessoal | Caos | O conjurador cresce até o tamanho de uma torre. |

### Adivinhação (Visão)

_Ver o oculto, o distante e o que ainda virá._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Detectar Magia | Básica | O conjurador | Pessoal | Ananque | Auras mágicas brilham à vista do conjurador. |
| Orientação | Básica | Um aliado | Toque | Ananque | Uma intuição guia o próximo teste do aliado. |
| Identificar | Básica | Um objeto | Toque | Ananque | Revela as propriedades de um objeto mágico. |
| Detectar Pensamentos | Básica | Uma criatura | Curto | Ananque | Ouve os pensamentos superficiais do alvo. |
| Ver o Invisível | Intermediária | O conjurador | Pessoal | Ananque | Revela criaturas invisíveis e ilusões. |
| Marca do Caçador | Intermediária | Uma criatura | Médio | Ananque | O alvo marcado não escapa à vista. |
| Clarividência | Intermediária | Um ponto no chão | Ilimitado | Ananque | Um olho mágico vê um lugar distante. |
| Presságio | Intermediária | O conjurador | Pessoal | Ananque | Ossos lançados revelam um sinal do futuro próximo. |
| Vidência | Avançada | Uma criatura | Ilimitado | Ananque | Observa uma criatura onde quer que ela esteja. |
| Visão Verdadeira | Avançada | O conjurador | Pessoal | Ananque | Vê a forma real de tudo. |
| Lendas e Saberes | Avançada | Um objeto | Toque | Ananque | Revela a história de um lugar ou objeto. |
| Previsão | Lendária | O conjurador | Pessoal | Ananque | O conjurador vê os golpes antes que aconteçam. |
| Olho de Ananque | Lendária | O conjurador | Ilimitado | Ananque | Vê todos os fios do destino por um instante. |

### Tempo (Cronomancia)

_Acelerar, frear, voltar e parar o tempo._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Reflexos Rápidos | Básica | O conjurador | Pessoal | Ananque | O tempo do conjurador corre um pouco mais rápido. |
| Lentidão | Básica | Uma criatura | Curto | Ananque | O tempo do alvo fica arrastado. |
| Envelhecer Objeto | Básica | Um objeto | Toque | Ananque | O objeto envelhece anos num instante. |
| Déjà Vu | Básica | O conjurador | Pessoal | Ananque | Repete o último instante e tenta de novo. |
| Pressa | Intermediária | O conjurador | Pessoal | Ananque | O conjurador age duas vezes mais rápido. |
| Congelar Instante | Intermediária | Uma criatura | Médio | Ananque | O alvo para no tempo por um momento. |
| Voltar Ferida | Intermediária | Um aliado | Toque | Ananque | Desfaz um ferimento recente. |
| Retroceder | Intermediária | O conjurador | Pessoal | Ananque | Volta à posição de alguns segundos atrás. |
| Bolha Temporal | Avançada | Área grande | Longo | Ananque | Dentro da bolha, o tempo quase para. |
| Envelhecer | Avançada | Uma criatura | Médio | Ananque | O alvo envelhece décadas. |
| Eco Temporal | Avançada | O conjurador | Pessoal | Ananque | Uma cópia do passado repete cada golpe. |
| Parar o Tempo | Lendária | Campo de batalha inteiro | Visão | Ananque | Tudo para, menos o conjurador. |
| Rebobinar | Lendária | Campo de batalha inteiro | Visão | Ananque | O campo volta ao estado de um instante atrás. |

### Espaço (Translocação)

_Teleporte, portais, dobras e gravidade._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Piscar | Básica | O conjurador | Curto | Nix | Some e reaparece a poucos passos. |
| Bolso Dimensional | Básica | Um objeto | Toque | Nix | Guarda um objeto num espaço oculto. |
| Empurrão Espacial | Básica | Uma criatura | Curto | Nix | Desloca o alvo alguns passos sem tocar nele. |
| Porta Dimensional | Intermediária | O conjurador | Médio | Nix | Abre uma porta para outro ponto à vista. |
| Trocar de Lugar | Intermediária | Uma criatura | Médio | Nix | Conjurador e alvo trocam de posição. |
| Teleporte | Intermediária | O conjurador | Ilimitado | Nix | Leva o conjurador a um lugar conhecido. |
| Dobra Espacial | Intermediária | Uma criatura | Médio | Nix | O espaço se dobra e o golpe chega pelo outro lado. |
| Portal | Avançada | Um ponto no chão | Médio | Nix | Abre um portal estável entre dois lugares. |
| Exílio | Avançada | Uma criatura | Médio | Nix | Manda o alvo para um vazio entre os mundos. |
| Gravidade Invertida | Avançada | Área pequena | Médio | Nix | Na área, tudo cai para cima. |
| Teleporte em Grupo | Avançada | Aliados próximos | Longo | Nix | Leva todos os aliados juntos. |
| Rasgo no Espaço | Lendária | Um ponto no chão | Visão | Nix | Uma fenda se abre e suga tudo para o nada. |
| Plano Próprio | Lendária | O conjurador | Ilimitado | Nix | Cria um semiplano particular. |

### Runas (Glifos e selos)

_Símbolos gravados que guardam, prendem e explodem._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Runa de Marca | Básica | Um objeto | Toque | Ananque | Grava uma runa que só o conjurador enxerga. |
| Runa de Explosão | Básica | Um ponto no chão | Curto | Ananque | Uma runa no chão explode quando pisada. |
| Runa de Afiação | Básica | Um objeto | Toque | Ananque | A arma gravada corta melhor. |
| Runa de Guarda | Básica | O conjurador | Pessoal | Ananque | Uma runa no peito absorve um golpe. |
| Glifo de Gelo | Intermediária | Um ponto no chão | Médio | Ponto | Um glifo congela quem passa por cima. |
| Runa de Prisão | Intermediária | Uma criatura | Médio | Ananque | Correntes rúnicas prendem o alvo. |
| Círculo Rúnico | Intermediária | Área pequena | Médio | Ananque | Um círculo de runas fortalece os aliados dentro dele. |
| Runa de Retorno | Intermediária | Um objeto | Toque | Ananque | O objeto gravado volta à mão do dono. |
| Runa da Ruína | Avançada | Uma criatura | Médio | Ananque | Uma runa marca o alvo e explode depois. |
| Selo Arcano | Avançada | Um objeto | Longo | Ananque | Lacra uma porta ou portal para sempre. |
| Chuva de Runas | Avançada | Área grande | Longo | Ananque | Runas caem do céu e explodem em sequência. |
| Palavra Primordial | Lendária | Campo de batalha inteiro | Visão | Ananque | Uma runa da criação reescreve o campo de batalha. |
| Corpo Rúnico | Lendária | O conjurador | Pessoal | Ananque | Runas cobrem a pele e cada uma é um feitiço pronto. |

### Metamagia (Magia sobre magia)

_Moldar, dobrar e roubar outras magias._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Magia Silenciosa | Básica | O conjurador | Pessoal | Ananque | A próxima magia não precisa de palavras. |
| Magia Distante | Básica | O conjurador | Pessoal | Ananque | A próxima magia alcança o dobro da distância. |
| Magia Estendida | Básica | O conjurador | Pessoal | Ananque | A próxima magia dura mais. |
| Magia Gêmea | Intermediária | O conjurador | Pessoal | Ananque | A próxima magia atinge dois alvos. |
| Magia Potencializada | Intermediária | O conjurador | Pessoal | Ananque | A próxima magia causa mais efeito. |
| Magia Acelerada | Intermediária | O conjurador | Pessoal | Ananque | Lança duas magias de uma vez. |
| Absorver Magia | Intermediária | O conjurador | Pessoal | Ananque | Bebe a energia de uma magia recebida. |
| Magia Persistente | Avançada | O conjurador | Pessoal | Ananque | A magia se mantém sem concentração. |
| Roubar Magia | Avançada | Uma criatura | Médio | Ananque | Toma uma magia ativa do alvo para si. |
| Magia Encadeada | Avançada | O conjurador | Pessoal | Ananque | A próxima magia salta para mais alvos. |
| Magia Maximizada | Lendária | O conjurador | Pessoal | Ananque | A próxima magia atinge o máximo. |
| Desejo | Lendária | O conjurador | Pessoal | Ananque | Imita qualquer magia ou altera a realidade. |

## Divinas e primais

### Divina (Cura e fé)

_Cura, bênçãos, luz sagrada e ressurreição._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Cura | Básica | Um aliado | Toque | Éter | Luz suave fecha as feridas do aliado. |
| Palavra Curativa | Básica | Um aliado | Curto | Éter | Uma palavra sagrada cura à distância. |
| Estabilizar | Básica | Um aliado | Toque | Éter | Impede que um aliado caído piore. |
| Chama Sagrada | Básica | Uma criatura | Curto | Éter | Fogo branco desce do alto sobre o alvo. |
| Cura em Massa | Intermediária | Aliados próximos | Pessoal | Éter | Uma onda de luz cura todos os aliados próximos. |
| Restauração | Intermediária | Um aliado | Toque | Éter | Remove venenos, doenças e maldições menores. |
| Bênção | Intermediária | Aliados próximos | Pessoal | Éter | Os aliados ficam mais certeiros e corajosos. |
| Luz Sagrada | Intermediária | Uma criatura | Médio | Éter | Um raio de luz divina pune os mortos-vivos. |
| Regeneração | Avançada | Um aliado | Toque | Éter | O corpo se refaz aos poucos, até membros perdidos. |
| Julgamento Celeste | Avançada | Área grande | Longo | Éter | Lâminas de luz descem do céu sobre os profanos. |
| Asas Celestes | Avançada | Aliados próximos | Pessoal | Éter | Os aliados ganham asas de luz por pouco tempo. |
| Ressurreição | Avançada | Um aliado | Toque | Éter | Traz de volta um aliado que morreu há pouco. |
| Milagre | Lendária | Campo de batalha inteiro | Visão | Éter | A vontade divina se manifesta como o conjurador pedir. |
| Ressurreição Verdadeira | Lendária | Aliados próximos | Visão | Éter | Todos os aliados caídos voltam inteiros. |

### Natureza (Druidismo)

_Raízes, espinhos, feras e florestas vivas._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Espinhos | Básica | Uma criatura | Curto | Gaia | Um punhado de espinhos dispara contra o alvo. |
| Raízes | Básica | Uma criatura | Curto | Gaia | Raízes brotam e prendem os pés do alvo. |
| Bom Fruto | Básica | O conjurador | Pessoal | Gaia | Frutos mágicos alimentam e curam um pouco. |
| Névoa da Mata | Básica | Área pequena | Curto | Gaia | Uma névoa verde esconde os aliados. |
| Enxame de Insetos | Intermediária | Área pequena | Médio | Gaia | Uma nuvem de insetos pica e cega. |
| Muralha de Espinhos | Intermediária | Linha | Médio | Gaia | Uma sebe espinhosa fecha a passagem. |
| Pele de Casca | Intermediária | O conjurador | Pessoal | Gaia | A pele vira casca de árvore. |
| Vinhas Constritoras | Intermediária | Uma criatura | Médio | Gaia | Vinhas grossas apertam o alvo. |
| Despertar Árvore | Avançada | Um ponto no chão | Médio | Gaia | Uma árvore ganha vida e luta. |
| Floresta Súbita | Avançada | Área grande | Longo | Gaia | Árvores brotam do nada e tomam a área. |
| Forma Selvagem | Avançada | O conjurador | Pessoal | Gaia | O conjurador assume a forma de um urso ou grande felino. |
| Esporos da Podridão | Avançada | Uma criatura | Médio | Gaia | Fungos tomam o corpo do alvo. |
| Ira da Floresta | Lendária | Campo de batalha inteiro | Visão | Gaia | A floresta inteira se levanta contra os inimigos. |
| Primavera Eterna | Lendária | Área grande | Visão | Gaia | Flores brotam, curam aliados e prendem inimigos. |

### Música (Arte bárdica)

_Canções, notas e ecos que movem corpo e alma._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Acorde Dissonante | Básica | Uma criatura | Curto | Nix | Uma nota aguda fere os ouvidos. |
| Canção de Coragem | Básica | Aliados próximos | Pessoal | Hemera | Os aliados ganham coragem. |
| Canção de Ninar | Básica | Uma criatura | Curto | Nix | Adormece o alvo. |
| Ritmo de Marcha | Básica | Aliados próximos | Pessoal | Hemera | Os aliados andam mais rápido. |
| Grito Sônico | Intermediária | Cone à frente | Pessoal | Nix | Uma onda de som em cone. |
| Balada da Cura | Intermediária | Aliados próximos | Pessoal | Éter | Uma melodia fecha as feridas dos aliados. |
| Melodia Hipnótica | Intermediária | Uma criatura | Médio | Nix | O alvo para e escuta, fascinado. |
| Hino de Batalha | Intermediária | Aliados próximos | Pessoal | Hemera | Os aliados batem com mais força. |
| Réquiem | Avançada | Área grande | Longo | Érebo | Uma canção fúnebre que fere os vivos. |
| Dança Irresistível | Avançada | Área grande | Longo | Nix | Os alvos dançam sem conseguir parar. |
| Eco Devastador | Avançada | Um ponto no chão | Médio | Nix | Um som que se repete e cresce até quebrar pedra. |
| Canção da Criação | Lendária | Campo de batalha inteiro | Visão | Hemera | A música altera o mundo à volta. |
| Sinfonia do Fim | Lendária | Área grande | Visão | Nix | Uma orquestra fantasma toca e tudo desaba. |

### Xamanismo (Espíritos)

_Totens, ancestrais e espíritos animais._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Totem Menor | Básica | O conjurador | Pessoal | Gaia | Um totem de madeira dá uma bênção leve. |
| Fantasma Ancestral | Básica | O conjurador | Pessoal | Éter | Um espírito ancestral sussurra conselhos. |
| Uivo do Lobo | Básica | Cone à frente | Pessoal | Gaia | O espírito do lobo amedronta os inimigos. |
| Totem da Tempestade | Intermediária | Um ponto no chão | Médio | Ponto | Um totem dispara raios em inimigos próximos. |
| Espírito do Urso | Intermediária | O conjurador | Pessoal | Gaia | A força do urso toma o corpo. |
| Exorcismo | Intermediária | Uma criatura | Médio | Éter | Expulsa um espírito do alvo. |
| Dança dos Espíritos | Intermediária | Aliados próximos | Pessoal | Gaia | Espíritos giram e protegem os aliados. |
| Andar entre Espíritos | Intermediária | O conjurador | Pessoal | Éter | Vê e toca o mundo dos espíritos. |
| Totem da Cura | Avançada | Um ponto no chão | Médio | Gaia | Um totem cura os aliados em volta. |
| Chamado dos Ancestrais | Avançada | Área grande | Longo | Éter | Espíritos ancestrais atacam os inimigos. |
| Possessão Animal | Avançada | O conjurador | Pessoal | Gaia | O conjurador vê e age pelo corpo de um animal. |
| Espírito da Montanha | Lendária | Área grande | Visão | Gaia | Um espírito colossal da terra desperta. |
| Avatar Ancestral | Lendária | O conjurador | Pessoal | Éter | Os ancestrais tomam o corpo do conjurador. |

### Cosmos (Astral)

_Estrelas, lua, constelações e o vazio cósmico._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Poeira Estelar | Básica | Uma criatura | Curto | Nix | Um brilho estelar revela e ofusca. |
| Mapa das Estrelas | Básica | O conjurador | Pessoal | Nix | Lê o céu e sabe a direção e a hora. |
| Estrela Cadente | Básica | Uma criatura | Curto | Nix | Uma estrelinha cai sobre o alvo. |
| Feixe Lunar | Intermediária | Linha | Médio | Nix | Um raio prateado da lua. |
| Constelação | Intermediária | Uma criatura | Médio | Nix | Estrelas ligadas formam uma figura que golpeia. |
| Projeção Astral | Intermediária | O conjurador | Pessoal | Nix | O espírito sai do corpo e viaja. |
| Gravidade Estelar | Intermediária | Uma criatura | Médio | Nix | O alvo fica pesado como uma estrela. |
| Chuva de Estrelas | Avançada | Área grande | Longo | Nix | Estrelas caem e explodem em luz fria. |
| Nova | Avançada | Um ponto no chão | Médio | Nix | Uma estrela nasce e explode no ponto. |
| Escudo Lunar | Avançada | Aliados próximos | Pessoal | Nix | As fases da lua giram em volta dos aliados. |
| Supernova | Lendária | Campo de batalha inteiro | Visão | Nix | Uma estrela morre e leva tudo junto. |
| Eclipse | Lendária | Campo de batalha inteiro | Visão | Nix | A lua cobre o sol e o poder dos inimigos se apaga. |
| Olhar do Vazio Cósmico | Lendária | Uma criatura | Visão | Nix | O alvo vê o cosmos inteiro e enlouquece. |

## Proibidas

### Necromancia (Arte dos mortos)

_Ossos, podridão, mortos que se erguem e vida roubada._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Toque Necrótico | Básica | Uma criatura | Toque | Érebo | O toque apodrece a carne do alvo. |
| Dardo de Ossos | Básica | Uma criatura | Curto | Érebo | Uma lasca de osso dispara contra o alvo. |
| Falar com os Mortos | Básica | Um cadáver | Toque | Érebo | O cadáver responde a algumas perguntas. |
| Sussurro Sepulcral | Básica | Uma criatura | Curto | Érebo | Um frio de túmulo enfraquece o alvo. |
| Drenar Vida | Intermediária | Uma criatura | Médio | Érebo | A vida do alvo flui para o conjurador. |
| Erguer Mortos | Intermediária | Um cadáver | Toque | Érebo | Um cadáver se levanta como servo morto-vivo. |
| Explosão de Cadáver | Intermediária | Área pequena | Médio | Érebo | Um cadáver explode em ossos e carne podre. |
| Armadura de Ossos | Intermediária | O conjurador | Pessoal | Érebo | Ossos cobrem o corpo como placas. |
| Dedo da Morte | Avançada | Uma criatura | Médio | Érebo | Um gesto e o coração do alvo para. |
| Exército dos Mortos | Avançada | Área grande | Longo | Érebo | Esqueletos brotam da terra em número. |
| Definhar | Avançada | Uma criatura | Médio | Érebo | O corpo do alvo envelhece e seca. |
| Lanças de Ossos | Avançada | Um ponto no chão | Médio | Érebo | Ossos brotam do chão como lanças. |
| Transcender em Lich | Lendária | O conjurador | Pessoal | Érebo | O conjurador abandona a carne e prende a alma num filactério. |
| Ceifador | Lendária | Campo de batalha inteiro | Visão | Érebo | A sombra da Morte passa pelo campo e ceifa os fracos. |

### Sombras (Arte das sombras)

_Furtividade, passos e sombras que agarram._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Passo Sombrio | Básica | O conjurador | Curto | Érebo | Some numa sombra e reaparece em outra próxima. |
| Manto de Sombras | Básica | O conjurador | Pessoal | Érebo | As sombras escondem o conjurador. |
| Lâmina de Sombra | Básica | Uma criatura | Curto | Érebo | Uma faca de sombra corta e se desfaz. |
| Pregar a Sombra | Básica | Uma criatura | Curto | Érebo | Uma adaga crava a sombra do alvo no chão e ele não se move. |
| Sombras Vivas | Intermediária | Área pequena | Médio | Érebo | As sombras do chão se erguem e agarram. |
| Roubar Sombra | Intermediária | Uma criatura | Médio | Érebo | Arranca a sombra do alvo, que fica fraco e pálido. |
| Duplo Sombrio | Intermediária | O conjurador | Pessoal | Érebo | A sombra do conjurador se levanta e luta ao lado. |
| Mordida da Sombra | Intermediária | Uma criatura | Médio | Érebo | A sombra do próprio alvo o morde por trás. |
| Reino das Sombras | Avançada | Área grande | Longo | Érebo | A área vira um mundo cinza onde só as sombras enxergam. |
| Forma de Sombra | Avançada | O conjurador | Pessoal | Érebo | O corpo vira sombra e atravessa paredes. |
| Marionete Sombria | Avançada | Uma criatura | Médio | Érebo | Manipula o alvo puxando a sombra dele. |
| Legião das Sombras | Lendária | Área grande | Visão | Érebo | Cada sombra no campo vira um guerreiro. |
| Devorador de Sombras | Lendária | Uma criatura | Longo | Érebo | Uma sombra colossal engole o alvo inteiro. |

### Sangue (Hemomancia)

_Pactos, sangrias e sangue que vira arma._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Gota de Sangue | Básica | Uma criatura | Curto | Tártaro | Uma gota do próprio sangue vira uma farpa vermelha. |
| Pacto de Sangue | Básica | O conjurador | Pessoal | Tártaro | Paga vida para fortalecer a próxima magia. |
| Sangria | Básica | Uma criatura | Curto | Tártaro | Abre um corte que sangra sem parar. |
| Farejar Sangue | Básica | O conjurador | Pessoal | Tártaro | Sente qualquer criatura ferida por perto. |
| Lança de Sangue | Intermediária | Uma criatura | Médio | Tártaro | O sangue derramado vira uma lança e perfura. |
| Ferver Sangue | Intermediária | Uma criatura | Médio | Tártaro | O sangue do alvo ferve nas veias. |
| Transfusão | Intermediária | Um aliado | Toque | Tártaro | Passa vida do conjurador para um aliado. |
| Poça Rubra | Intermediária | Um ponto no chão | Médio | Tártaro | O sangue no chão vira uma armadilha de espinhos. |
| Marionete de Sangue | Avançada | Uma criatura | Médio | Tártaro | Controla o corpo do alvo pelo sangue. |
| Chuva de Sangue | Avançada | Área grande | Longo | Tártaro | Uma chuva vermelha cura o conjurador e queima os inimigos. |
| Armadura Carmesim | Avançada | O conjurador | Pessoal | Tártaro | O sangue endurece em placas sobre o corpo. |
| Maré Carmesim | Lendária | Campo de batalha inteiro | Visão | Tártaro | Todo sangue derramado vira uma onda vermelha. |
| Senhor do Sangue | Lendária | O conjurador | Pessoal | Tártaro | O conjurador bebe a vida de todos à volta. |

### Maldições (Hexes)

_Azar, pragas, marcas e sinas._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Mau-olhado | Básica | Uma criatura | Curto | Érebo | O alvo tem azar no próximo teste. |
| Praga Menor | Básica | Uma criatura | Curto | Érebo | Coceira, febre e tropeços. |
| Marca do Corvo | Básica | Uma criatura | Curto | Érebo | Um corvo marca o alvo para morrer. |
| Maldição da Fraqueza | Intermediária | Uma criatura | Médio | Érebo | O alvo perde a força dos braços. |
| Maldição da Ferida Aberta | Intermediária | Uma criatura | Médio | Érebo | As feridas do alvo não fecham. |
| Boneco de Pano | Intermediária | Uma criatura | Médio | Érebo | O que se faz ao boneco o alvo sente. |
| Língua Presa | Intermediária | Uma criatura | Médio | Érebo | O alvo não consegue falar nem conjurar. |
| Maldição da Lua | Avançada | Uma criatura | Médio | Nix | O alvo vira fera nas noites de lua. |
| Sina Funesta | Avançada | Uma criatura | Médio | Érebo | O destino do alvo é selado para o pior. |
| Maldição em Massa | Avançada | Área grande | Longo | Érebo | Todos na área carregam um mau agouro. |
| Maldição do Espelho | Avançada | Uma criatura | Médio | Érebo | O reflexo do alvo sai do espelho e o ataca. |
| Maldição Eterna | Lendária | Uma criatura | Ilimitado | Érebo | Uma maldição que passa de pai para filho. |
| Palavra da Morte | Lendária | Uma criatura | Visão | Érebo | Uma palavra proibida que mata quem a ouve. |

### Caos (Magia selvagem)

_Surtos, mutações, fendas e entropia._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Faísca Caótica | Básica | Uma criatura | Curto | Caos | Um efeito aleatório explode no alvo. |
| Sorte Torta | Básica | Uma criatura | Curto | Caos | Inverte o próximo resultado do alvo. |
| Surto Selvagem | Básica | O conjurador | Pessoal | Caos | Um surto de magia descontrolada escapa do corpo. |
| Bola do Caos | Intermediária | Uma criatura | Médio | Caos | Uma esfera que muda de elemento no ar. |
| Ruptura | Intermediária | Área pequena | Médio | Caos | A realidade racha na área. |
| Mutação | Intermediária | Uma criatura | Médio | Caos | O corpo do alvo muda sem controle. |
| Prisma do Caos | Intermediária | Vários alvos em cadeia | Médio | Caos | Raios de cores aleatórias saltam entre os alvos. |
| Tempestade do Caos | Avançada | Área grande | Longo | Caos | Chove de tudo: sapos, fogo, flores e facas. |
| Desfazer | Avançada | Uma criatura | Médio | Caos | O alvo começa a deixar de existir. |
| Fenda Caótica | Avançada | Um ponto no chão | Médio | Caos | Uma fenda cospe criaturas impossíveis. |
| Entropia | Lendária | Campo de batalha inteiro | Visão | Caos | Tudo envelhece, se quebra e desaba. |
| Caos Primordial | Lendária | Campo de batalha inteiro | Visão | Caos | O mundo volta ao caos de antes da criação. |

## Ofícios e rituais

### Alquimia (Frascos e elixires)

_Bombas, tônicos, mutagênicos e a pedra filosofal._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Fogo de Alquimista | Básica | Área pequena | Curto | Tártaro | Um frasco que explode em chamas grudentas. |
| Fumaça Alquímica | Básica | Área pequena | Curto | Gaia | Um frasco solta uma fumaça espessa que esconde. |
| Tônico | Básica | Um aliado | Toque | Gaia | Um gole revigora o aliado. |
| Óleo Escorregadio | Básica | Área pequena | Curto | Gaia | Uma graxa espalhada derruba quem pisa. |
| Frasco de Geada | Intermediária | Área pequena | Médio | Ponto | Um frasco que estoura numa nuvem de gelo. |
| Elixir da Fúria | Intermediária | Um aliado | Toque | Tártaro | O aliado bebe e entra em fúria. |
| Destilar Essência | Intermediária | Um cadáver | Toque | Ananque | Extrai a essência mágica de uma criatura morta. |
| Bomba de Estilhaços | Intermediária | Área pequena | Médio | Gaia | Um frasco que explode em cacos de vidro e metal. |
| Homúnculo | Avançada | Um ponto no chão | Curto | Gaia | Cria um pequeno ser de barro e sangue. |
| Granada de Trovão | Avançada | Área grande | Longo | Ponto | Um frasco que explode em trovão e luz. |
| Mutagênico | Avançada | O conjurador | Pessoal | Gaia | O conjurador bebe e ganha força monstruosa. |
| Pedra Filosofal | Lendária | Um objeto | Toque | Ananque | Transforma metal em ouro e concede vida longa. |
| Elixir da Vida | Lendária | Um aliado | Toque | Éter | Cura qualquer mal e devolve a juventude. |

### Utilitárias (Truques do dia a dia)

_Luz, fechaduras, idiomas e conforto na estrada._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Luz | Básica | Um objeto | Toque | Hemera | Um objeto brilha como uma tocha. |
| Abrir Fechadura | Básica | Um objeto | Toque | Caos | Destranca uma porta ou cadeado. |
| Falar com Animais | Básica | Uma criatura | Curto | Gaia | Entende e fala com animais. |
| Prestidigitação | Básica | O conjurador | Pessoal | Caos | Pequenos truques: limpar, aquecer, acender, perfumar. |
| Trancar | Básica | Um objeto | Toque | Caos | Fecha uma porta com magia. |
| Compreender Idiomas | Básica | O conjurador | Pessoal | Nix | Entende qualquer língua falada ou escrita. |
| Chama Contínua | Básica | Um objeto | Toque | Hemera | Uma chama fria que nunca apaga. |
| Andar sobre a Água | Intermediária | O conjurador | Pessoal | Ponto | Caminha sobre a água como se fosse chão. |
| Patas de Aranha | Intermediária | O conjurador | Pessoal | Caos | Anda pelas paredes e pelo teto. |
| Mensagem | Intermediária | Uma criatura | Longo | Nix | Sussurra uma frase para alguém distante. |
| Visão no Escuro | Intermediária | O conjurador | Pessoal | Hemera | Enxerga no breu como de dia. |
| Cabana Arcana | Intermediária | Um ponto no chão | Curto | Caos | Uma tenda mágica protege do clima. |
| Mansão Arcana | Avançada | Um ponto no chão | Médio | Caos | Uma mansão extradimensional para descanso. |
| Encolher Objeto | Avançada | Um objeto | Toque | Caos | Diminui um objeto para carregar no bolso. |
| Fortaleza Instantânea | Lendária | Um ponto no chão | Visão | Gaia | Uma torre de pedra se ergue do nada. |

### Rituais (Cerimônias)

_Magias longas, de círculo, vela e sacrifício._

| Magia | Nível | Alvo | Alcance | Elemento | Efeito |
|---|---|---|---|---|---|
| Consagrar Solo | Básica | Um ponto no chão | Toque | Éter | Abençoa um pedaço de chão. |
| Ritual do Repouso | Básica | Aliados próximos | Pessoal | Éter | Um descanso curto rende como um longo. |
| Círculo de Sal | Básica | Área pequena | Toque | Ananque | Um círculo de sal que espíritos não atravessam. |
| Ritual da Lua Cheia | Intermediária | O conjurador | Pessoal | Nix | Recarrega o poder sob a lua. |
| Ritual de Guarda | Intermediária | Área pequena | Médio | Ananque | Protege uma casa ou acampamento a noite toda. |
| Unção | Intermediária | Um aliado | Toque | Éter | Um óleo sagrado fortalece por um dia. |
| Encantar Item | Intermediária | Um objeto | Toque | Ananque | Prende um feitiço num objeto. |
| Invocação Demoníaca | Avançada | Um ponto no chão | Longo | Tártaro | Abre o caminho para um demônio poderoso. |
| Laço de Almas | Avançada | Até três criaturas | Toque | Ananque | Une as almas de duas criaturas. |
| Ritual da Chuva | Avançada | Área grande | Longo | Ponto | Faz chover em toda uma região. |
| Ritual do Sangue Antigo | Avançada | O conjurador | Pessoal | Tártaro | Desperta o poder dos antepassados no sangue. |
| Ritual da Ruína | Lendária | Área grande | Ilimitado | Érebo | Amaldiçoa uma cidade inteira. |
| Ritual da Ascensão | Lendária | O conjurador | Ilimitado | Ananque | O conjurador sobe a um plano superior. |
| Chamado ao Primordial | Lendária | Um ponto no chão | Ilimitado | Éter | Um Primordial volta os olhos para o ritual. |
