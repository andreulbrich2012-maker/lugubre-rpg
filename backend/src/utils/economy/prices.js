// Tabela de precos padrao do Lugubre (em dracmas: 1 bronze = 1, prata = 10, platina = 100, ouro = 500).
// ARQUIVO ESPELHADO: frontend/src/lib/economy/prices.js e backend/src/utils/economy/prices.js tem que
// ser iguais (o teste do backend confere). Sem imports.
//
// Fonte: livro 0.5 beta, cap. 12 "Equipamentos para comecar" (marcados src: 'livro'); o resto foi
// calibrado em volta deles (pagamento de missao ~50 x nivel por personagem) e das lojas antigas.
//
// Para re-basear a economia inteira (ex.: tabela dracma -> real/dolar do Andre):
//   - mude PRICE_SCALE (multiplica todos os precos e alugueis) ou
//   - troque os numeros de price/rent abaixo (uma linha por item).
// Os mercadores ja criados guardam o proprio preco base no banco; "Repor precos do catalogo" no
// painel do mestre puxa os valores novos.
//
// Campos: id (fixo, nao mude), name, cat (CATEGORIES), price (compra), rent (aluguel por dia;
// ausente = nao se aluga), rentOnly (so aluguel: quarto, servico), weight (kg por unidade),
// kind ('item' | 'montaria' | 'barco' | 'servico'), boatType (barcos), icon (icone de lib/icons),
// desc, src ('livro' quando o preco vem do livro).

export const PRICE_TABLE_VERSION = 1;
export const PRICE_SCALE = 1;

// categoria do catalogo -> rotulo e categoria do inventario da ficha
export const CATEGORIES = {
  armas: { label: 'Armas', inv: 'Armas' },
  armaduras: { label: 'Armaduras', inv: 'Armaduras' },
  pocoes: { label: 'Poções', inv: 'Poções' },
  comida: { label: 'Comida e bebida', inv: 'Comida' },
  ferramentas: { label: 'Ferramentas', inv: 'Ferramentas' },
  aventura: { label: 'Aventura', inv: 'Outros' },
  roupas: { label: 'Roupas', inv: 'Outros' },
  magia: { label: 'Magia e pergaminhos', inv: 'Outros' },
  joias: { label: 'Joias e tesouro', inv: 'Achados' },
  montarias: { label: 'Montarias e animais', inv: 'Outros' },
  servicos: { label: 'Hospedagem e serviços', inv: 'Outros' },
  barcos: { label: 'Barcos', inv: 'Outros' }
};

// mesmos ids de backend/src/utils/boats.js (campaign_boats.type)
export const BOAT_TYPES = { bote: 'Bote', pesca: 'Barco de pesca', veleiro: 'Veleiro', gale: 'Galé', navio: 'Navio' };

const I = (id, name, cat, price, extra = {}) => ({ id, name, cat, price, weight: 0, kind: 'item', ...extra });

export const CATALOG = [
  // ---- armas (as 29 de lib/icons/weapons.js + municao) ----
  I('adaga', 'Adaga', 'armas', 15, { weight: 0.5, desc: '1d4. Leve; pode ser arremessada.', src: 'livro' }),
  I('faca-de-caca', 'Faca de caça', 'armas', 10, { weight: 0.4, desc: '1d4. Leve.' }),
  I('espada-curta', 'Espada curta', 'armas', 40, { weight: 1, desc: '1d6. Leve.', src: 'livro' }),
  I('espada-longa', 'Espada longa', 'armas', 100, { weight: 1.5, desc: '1d8.', src: 'livro' }),
  I('montante', 'Montante', 'armas', 250, { weight: 3, desc: '2d6. Duas mãos.', src: 'livro' }),
  I('sabre', 'Sabre', 'armas', 90, { weight: 1.2, desc: '1d8. Leve.' }),
  I('rapieira', 'Rapieira', 'armas', 120, { weight: 1, desc: '1d8. Precisa de destreza.' }),
  I('machadinha', 'Machadinha', 'armas', 20, { weight: 1, desc: '1d6. Pode ser arremessada.' }),
  I('machado-de-guerra', 'Machado de guerra', 'armas', 120, { weight: 3, desc: '1d10. Duas mãos.', src: 'livro' }),
  I('maca', 'Maça', 'armas', 50, { weight: 2, desc: '1d6. Esmagamento.' }),
  I('martelo-de-guerra', 'Martelo de guerra', 'armas', 110, { weight: 2.5, desc: '1d8. Esmagamento.' }),
  I('mangual', 'Mangual', 'armas', 90, { weight: 2, desc: '1d8. Ignora parte do escudo.' }),
  I('lanca', 'Lança', 'armas', 60, { weight: 2, desc: '1d8. Alcança 3 metros.', src: 'livro' }),
  I('alabarda', 'Alabarda', 'armas', 160, { weight: 3, desc: '1d10. Duas mãos; alcance.' }),
  I('foice', 'Foice', 'armas', 25, { weight: 1, desc: '1d6. Ferramenta de lavoura.' }),
  I('gadanha', 'Gadanha', 'armas', 45, { weight: 2.5, desc: '2d4. Duas mãos.' }),
  I('chicote', 'Chicote', 'armas', 15, { weight: 1, desc: '1d4. Alcance 3 metros.' }),
  I('cajado', 'Cajado', 'armas', 10, { weight: 2, desc: '1d6. Duas mãos.' }),
  I('bordao', 'Bordão', 'armas', 8, { weight: 2, desc: '1d6. Bastão de viagem.' }),
  I('manoplas', 'Manoplas', 'armas', 30, { weight: 1, desc: '1d4. Soco reforçado.' }),
  I('garras-de-ferro', 'Garras de ferro', 'armas', 45, { weight: 0.8, desc: '1d6. Leve.' }),
  I('arco-curto', 'Arco curto', 'armas', 60, { weight: 1, desc: '1d6. Distância média.', src: 'livro' }),
  I('arco-longo', 'Arco longo', 'armas', 150, { weight: 1.5, desc: '1d8. Distância longa.', src: 'livro' }),
  I('besta-leve', 'Besta leve', 'armas', 120, { weight: 2.5, desc: '1d8. Distância longa.' }),
  I('besta', 'Besta', 'armas', 200, { weight: 3, desc: '1d10. Distância longa; recarregar gasta o movimento.', src: 'livro' }),
  I('funda', 'Funda', 'armas', 2, { weight: 0.1, desc: '1d4. Distância média.' }),
  I('dardos', 'Dardos (5)', 'armas', 10, { weight: 0.5, desc: '1d4 cada. Arremesso.' }),
  I('azagaia', 'Azagaia', 'armas', 12, { weight: 1, desc: '1d6. Lança de arremesso.' }),
  I('flechas', 'Flechas (20)', 'armas', 5, { weight: 0.5, icon: 'flechas' }),
  I('virotes', 'Virotes (20)', 'armas', 8, { weight: 0.7, icon: 'virotes' }),
  I('aljava', 'Aljava', 'armas', 6, { weight: 0.5, icon: 'aljava' }),

  // ---- armaduras ----
  I('armadura-acolchoada', 'Armadura acolchoada', 'armaduras', 25, { weight: 4, desc: '+1 na Defesa.' }),
  I('armadura-de-couro', 'Armadura de couro', 'armaduras', 50, { weight: 5, desc: '+2 na Defesa.', src: 'livro' }),
  I('couro-batido', 'Couro batido', 'armaduras', 120, { weight: 6, desc: '+3 na Defesa.' }),
  I('cota-de-malha', 'Cota de malha', 'armaduras', 300, { weight: 12, desc: '+4 na Defesa; −2 para se esconder e fazer acrobacias.', src: 'livro' }),
  I('peitoral-de-aco', 'Peitoral de aço', 'armaduras', 600, { weight: 8, desc: '+5 na Defesa; −2 para se esconder.' }),
  I('armadura-de-placas', 'Armadura de placas', 'armaduras', 1500, { weight: 20, desc: '+6 na Defesa; −5 para se esconder e fazer acrobacias; anda 3 metros a menos.', src: 'livro' }),
  I('escudo', 'Escudo', 'armaduras', 80, { weight: 3, desc: '+1 na Defesa e +2 no Bloqueio.', src: 'livro' }),
  I('elmo', 'Elmo', 'armaduras', 40, { weight: 2 }),
  I('elmo-fechado', 'Elmo fechado', 'armaduras', 90, { weight: 3 }),
  I('manoplas-de-placas', 'Manoplas de placas', 'armaduras', 60, { weight: 1 }),
  I('grevas', 'Grevas', 'armaduras', 50, { weight: 2 }),

  // ---- pocoes e alquimia ----
  I('pocao-de-cura', 'Poção de cura', 'pocoes', 60, { weight: 0.3, desc: 'Recupera 1d8 + 2 de Vida.', src: 'livro' }),
  I('pocao-de-cura-maior', 'Poção de cura maior', 'pocoes', 180, { weight: 0.4, desc: 'Recupera 3d8 + 4 de Vida.' }),
  I('tonico-de-clareza', 'Tônico de clareza', 'pocoes', 80, { weight: 0.3, desc: 'Recupera 1d6 de Sanidade.', src: 'livro' }),
  I('antidoto', 'Antídoto', 'pocoes', 50, { weight: 0.3, desc: 'Cura envenenamento.', src: 'livro' }),
  I('elixir-de-mana', 'Elixir de mana', 'pocoes', 90, { weight: 0.3, desc: 'Recupera 1d8 de Mana.' }),
  I('oleo-de-fogo', 'Óleo de fogo', 'pocoes', 40, { weight: 0.5, desc: 'Arremessado: 1d6 de fogo.' }),
  I('frasco-de-acido', 'Frasco de ácido', 'pocoes', 45, { weight: 0.5, desc: 'Arremessado: 2d4 de ácido.' }),
  I('agua-benta', 'Água benta', 'pocoes', 25, { weight: 0.5 }),
  I('veneno', 'Veneno', 'pocoes', 140, { weight: 0.1, desc: 'Uma dose para lâmina.' }),
  I('ervas-medicinais', 'Ervas medicinais', 'pocoes', 5, { weight: 0.05, icon: 'erva' }),
  I('ervas-raras', 'Ervas raras', 'pocoes', 25, { weight: 0.05, icon: 'mandragora' }),

  // ---- comida e bebida ----
  I('pao', 'Pão', 'comida', 1, { weight: 0.3 }),
  I('queijo', 'Queijo', 'comida', 3, { weight: 0.5 }),
  I('maca-fruta', 'Maçã', 'comida', 1, { weight: 0.2 }),
  I('carne-seca', 'Carne seca', 'comida', 3, { weight: 0.3, icon: 'coxa' }),
  I('peixe', 'Peixe fresco', 'comida', 2, { weight: 0.5 }),
  I('linguica', 'Linguiça', 'comida', 2, { weight: 0.3 }),
  I('torta', 'Torta', 'comida', 4, { weight: 0.5 }),
  I('racao-de-viagem', 'Ração de viagem (1 dia)', 'comida', 2, { weight: 0.5 }),
  I('refeicao-simples', 'Refeição simples', 'comida', 3, { weight: 0.4, icon: 'coxa' }),
  I('refeicao-boa', 'Refeição boa', 'comida', 8, { weight: 0.5, icon: 'coxa' }),
  I('banquete', 'Banquete', 'comida', 25, { weight: 1, icon: 'torta' }),
  I('cerveja', 'Caneca de cerveja', 'comida', 2, { weight: 0.5, icon: 'caneca' }),
  I('hidromel', 'Hidromel', 'comida', 4, { weight: 0.5, icon: 'caneca' }),
  I('vinho-comum', 'Vinho comum (garrafa)', 'comida', 6, { weight: 1, icon: 'vinho' }),
  I('vinho-fino', 'Vinho fino (garrafa)', 'comida', 30, { weight: 1, icon: 'vinho' }),
  I('mel', 'Pote de mel', 'comida', 5, { weight: 0.5 }),

  // ---- ferramentas ----
  I('kit-de-curativo', 'Kit de curativo', 'ferramentas', 30, { weight: 1, icon: 'bandagem' }),
  I('kit-de-herbalismo', 'Kit de herbalismo', 'ferramentas', 40, { weight: 1.5, icon: 'erva' }),
  I('kit-de-alquimia', 'Kit de alquimia', 'ferramentas', 120, { weight: 4, icon: 'caldeirao' }),
  I('ferramentas-de-ladrao', 'Ferramentas de ladrão', 'ferramentas', 60, { weight: 0.5, icon: 'gazuas' }),
  I('ferramentas-de-ferreiro', 'Ferramentas de ferreiro', 'ferramentas', 80, { weight: 4, icon: 'martelo', rent: 4 }),
  I('ferramentas-de-carpinteiro', 'Ferramentas de carpinteiro', 'ferramentas', 30, { weight: 3, icon: 'serra', rent: 2 }),
  I('picareta', 'Picareta', 'ferramentas', 15, { weight: 4, rent: 1 }),
  I('pa', 'Pá', 'ferramentas', 8, { weight: 2, rent: 1 }),
  I('martelo', 'Martelo', 'ferramentas', 4, { weight: 1 }),
  I('vara-de-pesca', 'Vara de pesca', 'ferramentas', 5, { weight: 1, rent: 1 }),
  I('rede-de-pesca', 'Rede de pesca', 'ferramentas', 12, { weight: 3, icon: 'rede', rent: 1 }),
  I('kit-de-escrita', 'Kit de escrita', 'ferramentas', 20, { weight: 0.5, icon: 'tinteiro' }),
  I('lupa', 'Lupa', 'ferramentas', 50, { weight: 0.1 }),
  I('cadeado', 'Cadeado', 'ferramentas', 10, { weight: 0.5 }),
  I('alaude', 'Alaúde', 'ferramentas', 60, { weight: 2, rent: 3 }),
  I('flauta', 'Flauta', 'ferramentas', 10, { weight: 0.3 }),

  // ---- aventura ----
  I('mochila', 'Mochila', 'aventura', 12, { weight: 1 }),
  I('corda', 'Corda de cânhamo (15 m)', 'aventura', 8, { weight: 2 }),
  I('tocha', 'Tocha', 'aventura', 1, { weight: 0.5 }),
  I('lanterna', 'Lanterna', 'aventura', 15, { weight: 1, rent: 1 }),
  I('oleo-de-lanterna', 'Óleo de lanterna', 'aventura', 1, { weight: 0.5, icon: 'frasco-redonda_p-rolha' }),
  I('vela', 'Vela', 'aventura', 1, { weight: 0.1 }),
  I('cantil', 'Cantil', 'aventura', 5, { weight: 1, icon: 'odre' }),
  I('saco-de-dormir', 'Saco de dormir', 'aventura', 8, { weight: 3, icon: 'saco' }),
  I('tenda', 'Tenda (2 pessoas)', 'aventura', 25, { weight: 5, icon: 'saco', rent: 2 }),
  I('pederneira', 'Pederneira', 'aventura', 2, { weight: 0.1 }),
  I('arpeu', 'Arpéu', 'aventura', 10, { weight: 2 }),
  I('corrente', 'Corrente (3 m)', 'aventura', 30, { weight: 4 }),
  I('pe-de-cabra', 'Pé de cabra', 'aventura', 6, { weight: 2, icon: 'alicate' }),
  I('mapa-regional', 'Mapa regional', 'aventura', 40, { weight: 0.1, icon: 'mapa' }),
  I('bussola', 'Bússola', 'aventura', 80, { weight: 0.2 }),
  I('luneta', 'Luneta', 'aventura', 250, { weight: 0.5 }),
  I('espelho', 'Espelho de bolso', 'aventura', 15, { weight: 0.3 }),
  I('algemas', 'Algemas', 'aventura', 20, { weight: 1 }),
  I('bau-pequeno', 'Baú pequeno', 'aventura', 15, { weight: 5, icon: 'bau' }),
  I('balde', 'Balde', 'aventura', 2, { weight: 1 }),

  // ---- roupas ----
  I('roupa-comum', 'Roupa comum', 'roupas', 5, { weight: 1, icon: 'capa' }),
  I('roupa-de-viagem', 'Roupa de viagem', 'roupas', 12, { weight: 2, icon: 'capa' }),
  I('roupa-nobre', 'Roupa nobre', 'roupas', 90, { weight: 2, icon: 'capa' }),
  I('capa', 'Capa', 'roupas', 10, { weight: 1 }),
  I('capa-reforcada', 'Capa reforçada', 'roupas', 35, { weight: 1.5, icon: 'capa' }),
  I('botas', 'Botas', 'roupas', 10, { weight: 1 }),
  I('luvas-de-couro', 'Luvas de couro', 'roupas', 12, { weight: 0.3, icon: 'luvas' }),

  // ---- magia e pergaminhos ----
  I('pergaminho-simples', 'Pergaminho de magia simples', 'magia', 80, { weight: 0.1, icon: 'pergaminho-runa' }),
  I('pergaminho-forte', 'Pergaminho de magia forte', 'magia', 250, { weight: 0.1, icon: 'pergaminho-runa' }),
  I('grimorio-em-branco', 'Grimório em branco', 'magia', 50, { weight: 1.5, icon: 'grimorio' }),
  I('tinta-arcana', 'Tinta arcana', 'magia', 40, { weight: 0.2, icon: 'tinteiro' }),
  I('foco-magico', 'Foco mágico', 'magia', 95, { weight: 0.5, icon: 'pedra-runica' }),
  I('cristal-arcano', 'Cristal arcano', 'magia', 180, { weight: 0.5, icon: 'minerio-cristal' }),
  I('varinha-simples', 'Varinha simples', 'magia', 200, { weight: 0.2, icon: 'pedra-runica' }),
  I('amuleto-de-protecao', 'Amuleto de proteção', 'magia', 210, { weight: 0.1, icon: 'amuleto' }),
  I('componente-raro', 'Componente raro', 'magia', 150, { weight: 0.1, icon: 'olho' }),

  // ---- joias e tesouro (o joalheiro compra) ----
  I('anel-de-prata', 'Anel de prata', 'joias', 40, { weight: 0.02, icon: 'anel' }),
  I('anel-de-ouro', 'Anel de ouro', 'joias', 120, { weight: 0.02, icon: 'anel-gema' }),
  I('colar-de-ouro', 'Colar de ouro', 'joias', 250, { weight: 0.1, icon: 'colar-contas' }),
  I('perola', 'Pérola', 'joias', 100, { weight: 0.02 }),
  I('ametista', 'Ametista', 'joias', 120, { weight: 0.02 }),
  I('topazio', 'Topázio', 'joias', 200, { weight: 0.02 }),
  I('esmeralda', 'Esmeralda', 'joias', 450, { weight: 0.02 }),
  I('safira', 'Safira', 'joias', 450, { weight: 0.02 }),
  I('rubi', 'Rubi', 'joias', 500, { weight: 0.02 }),
  I('diamante', 'Diamante', 'joias', 1000, { weight: 0.02 }),
  I('lingote-de-prata', 'Lingote de prata', 'joias', 100, { weight: 1 }),
  I('lingote-de-ouro', 'Lingote de ouro', 'joias', 500, { weight: 1 }),

  // ---- montarias e animais (preco de compra; aluguel por dia) ----
  I('cavalo', 'Cavalo de montaria', 'montarias', 350, { rent: 15, kind: 'montaria', weight: 0.01, desc: 'Anda o dobro numa viagem.' }),
  I('cavalo-de-guerra', 'Cavalo de guerra', 'montarias', 1200, { rent: 50, kind: 'montaria', weight: 0.01 }),
  I('ponei', 'Pônei', 'montarias', 150, { rent: 8, kind: 'montaria', weight: 0.01 }),
  I('mula', 'Mula', 'montarias', 120, { rent: 6, kind: 'montaria', weight: 0.01, desc: 'Carrega até 80 kg.' }),
  I('burro', 'Burro', 'montarias', 80, { rent: 5, kind: 'montaria', weight: 0.01 }),
  I('carroca', 'Carroça', 'montarias', 150, { rent: 8, kind: 'montaria', weight: 0.01 }),
  I('carruagem', 'Carruagem', 'montarias', 800, { rent: 40, kind: 'montaria', weight: 0.01 }),
  I('cao-de-guarda', 'Cão de guarda', 'montarias', 60, { kind: 'montaria', weight: 0.01 }),
  I('sela', 'Sela', 'montarias', 40, { weight: 8, icon: 'couro' }),
  I('alforjes', 'Alforjes', 'montarias', 10, { weight: 2, icon: 'bolsa-ombro' }),
  I('racao-animal', 'Ração animal (1 dia)', 'montarias', 3, { weight: 5, icon: 'saco' }),

  // ---- hospedagem e servicos (so aluguel, por dia/noite) ----
  I('cama-no-salao', 'Cama no salão (noite)', 'servicos', 3, { rent: 3, rentOnly: true, kind: 'servico', weight: 0.01, icon: 'chave-enferrujada' }),
  I('quarto-comum', 'Quarto comum (noite)', 'servicos', 10, { rent: 10, rentOnly: true, kind: 'servico', weight: 0.01, icon: 'chave' }),
  I('quarto-confortavel', 'Quarto confortável (noite)', 'servicos', 25, { rent: 25, rentOnly: true, kind: 'servico', weight: 0.01, icon: 'chave' }),
  I('suite-nobre', 'Suíte nobre (noite)', 'servicos', 80, { rent: 80, rentOnly: true, kind: 'servico', weight: 0.01, icon: 'chave-ornada' }),
  I('estabulo-noite', 'Baia no estábulo (noite)', 'servicos', 5, { rent: 5, rentOnly: true, kind: 'servico', weight: 0.01, icon: 'chave-enferrujada' }),
  I('banho-quente', 'Banho quente', 'servicos', 2, { kind: 'servico', weight: 0.01, icon: 'balde' }),
  I('guia-local', 'Guia local (dia)', 'servicos', 20, { rent: 20, rentOnly: true, kind: 'servico', weight: 0.01, icon: 'mapa' }),
  I('reparo-de-arma', 'Reparo de arma', 'servicos', 20, { kind: 'servico', weight: 0.01, icon: 'martelo' }),
  I('reparo-de-armadura', 'Reparo de armadura', 'servicos', 40, { kind: 'servico', weight: 0.01, icon: 'martelo' }),
  I('bencao', 'Bênção', 'servicos', 45, { kind: 'servico', weight: 0.01, icon: 'calice' }),
  I('identificar-item', 'Identificar item mágico', 'servicos', 100, { kind: 'servico', weight: 0.01, icon: 'lupa' }),

  // ---- barcos (comprar ou alugar por dia; viram uma linha em campaign_boats) ----
  I('bote', 'Bote', 'barcos', 150, { rent: 5, kind: 'barco', boatType: 'bote', weight: 0.01, desc: 'Até 4 pessoas, a remo.' }),
  I('barco-de-pesca', 'Barco de pesca', 'barcos', 600, { rent: 20, kind: 'barco', boatType: 'pesca', weight: 0.01, desc: 'Até 6 pessoas; pesca e costa.' }),
  I('veleiro', 'Veleiro', 'barcos', 3000, { rent: 80, kind: 'barco', boatType: 'veleiro', weight: 0.01, desc: 'Até 12 pessoas; viagens no mar.' }),
  I('gale', 'Galé', 'barcos', 12000, { rent: 300, kind: 'barco', boatType: 'gale', weight: 0.01, desc: 'Remos e vela; precisa de tripulação.' }),
  I('navio', 'Navio', 'barcos', 40000, { rent: 900, kind: 'barco', boatType: 'navio', weight: 0.01, desc: 'Grande, com porão de carga.' }),
  I('remo', 'Remo', 'barcos', 3, { weight: 2 }),
  I('ancora', 'Âncora pequena', 'barcos', 40, { weight: 15 })
];

export const CATALOG_BY_ID = Object.fromEntries(CATALOG.map((it) => [it.id, it]));

// preco/aluguel base de um item do catalogo ja com a escala geral (inteiro, minimo 1 se > 0)
export const scaled = (n) => (n > 0 ? Math.max(1, Math.round(n * PRICE_SCALE)) : 0);
export const basePrice = (id) => scaled(CATALOG_BY_ID[id]?.price || 0);
export const baseRent = (id) => scaled(CATALOG_BY_ID[id]?.rent || 0);
