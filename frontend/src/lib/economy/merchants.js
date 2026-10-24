// Modelos de mercador (arquetipos): estoque padrao, recompra e alugueis. O mestre cria um
// mercador a partir de um modelo e depois muda tudo (precos, itens, recompra, multiplicador).
// ARQUIVO ESPELHADO: frontend/src/lib/economy/merchants.js e backend/src/utils/economy/merchants.js
// tem que ser iguais (o teste do backend confere).
//
// stock: [catalogId, quantidade em estoque]; quantidade 0 = so aluguel/servico (sem estoque limitado
// para alugar: o aluguel conta o proprio estoque do item).
// buys: o mercador compra coisas dos jogadores; buyRate: fracao do preco base que ele paga;
// buyCategories: categorias que ele aceita (vazio = qualquer uma).
// shopCategory: categoria da loja antiga (campaign_shops.category) para a aba de lojas.
// keywords: nomes de construcao do mapa onde ele combina (Ferraria, Taverna...).
import { CATALOG } from './prices.js';

const all = (cat, qty) => CATALOG.filter((it) => it.cat === cat).map((it) => [it.id, qty]);

export const ARCHETYPES = [
  {
    id: 'ferreiro', name: 'Ferreiro', title: 'Ferreiro e armeiro', shopCategory: 'Ferreiro',
    greeting: 'Aço bom não é barato. Mas salva o pescoço.',
    buys: true, buyRate: 0.5, buyCategories: ['armas', 'armaduras'],
    keywords: ['ferraria', 'ferreiro', 'forja', 'armeiro', 'armaria'],
    stock: [...all('armas', 3), ['reparo-de-arma', 0], ['martelo', 4]]
  },
  {
    id: 'armadureiro', name: 'Armadureiro', title: 'Armadureiro', shopCategory: 'Ferreiro',
    greeting: 'Quer voltar inteiro? Começa por aqui.',
    buys: true, buyRate: 0.5, buyCategories: ['armaduras'],
    keywords: ['armadur', 'couraca', 'ferraria'],
    stock: [...all('armaduras', 2), ['reparo-de-armadura', 0], ['luvas-de-couro', 4], ['botas', 4]]
  },
  {
    id: 'boticario', name: 'Boticário', title: 'Boticário e alquimista', shopCategory: 'Alquimista',
    greeting: 'Uma gota cura. Duas... depende do que você quer.',
    buys: true, buyRate: 0.4, buyCategories: ['pocoes'],
    keywords: ['botica', 'alquim', 'curandeir', 'ervanar', 'chale'],
    stock: [...all('pocoes', 5), ['kit-de-curativo', 3], ['kit-de-herbalismo', 2], ['kit-de-alquimia', 1]]
  },
  {
    id: 'taberneiro', name: 'Taberneiro', title: 'Taberneiro (comida e bebida)', shopCategory: 'Taverna',
    greeting: 'Senta, forasteiro. A sopa é de ontem, a cerveja é de hoje.',
    buys: false, buyRate: 0.3, buyCategories: ['comida'],
    keywords: ['taverna', 'taberna', 'estalagem', 'padaria', 'cervej', 'hospedaria'],
    stock: [...all('comida', 10), ['cama-no-salao', 0], ['banho-quente', 0]]
  },
  {
    id: 'mercador', name: 'Mercador', title: 'Mercador geral', shopCategory: 'Mercado Geral',
    greeting: 'Tem de tudo um pouco. E o que não tem, eu arrumo.',
    buys: true, buyRate: 0.4, buyCategories: [],
    keywords: ['emporio', 'mercado', 'loja', 'armazem', 'mercador', 'sobrado'],
    stock: [...all('aventura', 4), ...all('roupas', 3), ['racao-de-viagem', 10], ['pao', 10], ['adaga', 2], ['tocha', 20], ['picareta', 2], ['pa', 2], ['vara-de-pesca', 3], ['tenda', 2]]
  },
  {
    id: 'barqueiro', name: 'Barqueiro', title: 'Barqueiro (só barcos: venda e aluguel)', shopCategory: 'Armazém',
    greeting: 'O mar não perdoa casco ruim. Os meus não afundam. Quase nunca.',
    buys: true, buyRate: 0.5, buyCategories: ['barcos'],
    keywords: ['pescador', 'cais', 'porto', 'doca', 'barco', 'estaleiro'],
    stock: [['bote', 3], ['barco-de-pesca', 2], ['veleiro', 1], ['gale', 1], ['navio', 1], ['remo', 6], ['ancora', 2]]
  },
  {
    id: 'estalajadeiro', name: 'Estalajadeiro', title: 'Estalajadeiro (quartos)', shopCategory: 'Taverna',
    greeting: 'Cama limpa, porta com tranca. O resto é com você.',
    buys: false, buyRate: 0.3, buyCategories: [],
    keywords: ['estalagem', 'hospedaria', 'pousada', 'taverna', 'hotel'],
    stock: [['cama-no-salao', 0], ['quarto-comum', 6], ['quarto-confortavel', 3], ['suite-nobre', 1], ['estabulo-noite', 0], ['banho-quente', 0], ['refeicao-simples', 10], ['cerveja', 20]]
  },
  {
    id: 'cavalarico', name: 'Cavalariço', title: 'Cavalariço (montarias e aluguel)', shopCategory: 'Estábulo',
    greeting: 'Esse aqui não morde. Aquele ali, morde.',
    buys: true, buyRate: 0.5, buyCategories: ['montarias'],
    keywords: ['estabulo', 'cavalari', 'celeiro', 'baia'],
    stock: [...all('montarias', 2), ['racao-animal', 10], ['estabulo-noite', 0]]
  },
  {
    id: 'mago', name: 'Mago', title: 'Mago (pergaminhos e itens arcanos)', shopCategory: 'Loja Mística',
    greeting: 'Não toque em nada que brilhe. Nem no que não brilha.',
    buys: true, buyRate: 0.5, buyCategories: ['magia'],
    keywords: ['torre', 'mago', 'astrolog', 'biblioteca', 'arcan'],
    stock: [...all('magia', 2), ['identificar-item', 0], ['elixir-de-mana', 3], ['tonico-de-clareza', 2]]
  },
  {
    id: 'joalheiro', name: 'Joalheiro', title: 'Joalheiro e penhores (compra itens)', shopCategory: 'Contrabandista',
    greeting: 'Deixa eu ver isso na luz... hum. Já vi melhores.',
    buys: true, buyRate: 0.6, buyCategories: [],
    keywords: ['joalh', 'penhor', 'ourives', 'mercador'],
    stock: [...all('joias', 1)]
  }
];

export const ARCHETYPE_BY_ID = Object.fromEntries(ARCHETYPES.map((a) => [a.id, a]));

// estoque do modelo ja como itens de loja (catalogId, quantidade); repetido = fica o primeiro
export function archetypeStock(id) {
  const a = ARCHETYPE_BY_ID[id];
  if (!a) return [];
  const seen = new Set();
  return a.stock.filter(([cid]) => (seen.has(cid) ? false : seen.add(cid))).filter(([cid]) => CATALOG.some((it) => it.id === cid));
}
