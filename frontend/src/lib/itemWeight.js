// Peso dos itens (kg) e limites do inventario. ARQUIVO ESPELHADO: frontend/src/lib/itemWeight.js e
// backend/src/utils/itemWeight.js tem que ser iguais (o teste do backend confere). Sem imports.
// Peso 0 ou ausente = "nao informado": entra o peso sugerido pelo nome, icone, descricao e categoria.

const norm = (s) => ` ${String(s || '').replace(/ma[cç]ãs?/gi, 'fruta').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;

// Regras em ordem: as mais especificas primeiro ("bolsa de moedas" antes de "moeda", "armadura de
// placas" antes de "armadura", "espada curta" antes de "espada"). Peso por unidade, em kg.
const RULES = [
  // dinheiro e tesouro
  [/\b(bolsa|saco|sacola|algibeira) (de )?(moedas|dracmas|ouro|prata|platina|bronze)\b/, 0.2],
  [/\b(moeda|moedas|dracma|dracmas)\b|\b(pilha|monte|moeda) (de )?(ouro|prata|platina|bronze)\b/, 0.01],
  [/\b(lingote|barra de (ouro|prata|platina|bronze))\b/, 1],
  [/\bpepita/, 0.05],
  [/\b(rubi|safira|esmeralda|ametista|topazio|diamante|onix|quartzo|aguamarinha|agua marinha|perola|gema|joia preciosa)\b/, 0.02],
  [/\b(anel|aneis|alianca)\b/, 0.02],
  [/\b(colar|rosario|amuleto|medalhao|relicario|pingente|talisma|broche|alfinete)\b/, 0.1],
  [/\b(coroa|tiara|diadema)\b/, 1],
  // armaduras (antes das armas: "escudo" e "manopla" aparecem nas duas)
  [/\b(elmo fechado|grande elmo|elmo de placas)\b/, 3],
  [/\b(elmo|capacete)\b/, 2],
  [/\b(manoplas? de placas)\b/, 1],
  [/\b(grevas?|sabatons?)\b/, 2],
  [/\b(armadura completa|armadura de placas|meia armadura|brunea|placas de aco|placas)\b/, 20],
  [/\b(cota de malha|malha|loriga|camisao de malha)\b/, 12],
  [/\b(couro batido|gibao)\b/, 6],
  [/\barmadura de couro\b/, 5],
  [/\b(armadura acolchoada|acolchoada)\b/, 4],
  [/\b(peitoral|couraca)\b/, 8],
  [/\barmadura\b/, 10],
  [/\bpavise\b/, 7],
  [/\bbroquel\b/, 1.5],
  [/\bescudo\b/, 3],
  [/\b(bota|botas|sapato|sapatos|calcado)\b/, 1],
  [/\b(luva|luvas)\b/, 0.3],
  [/\b(capuz|mascara)\b/, 0.3],
  [/\b(cinto|cinturao)\b/, 0.3],
  [/\b(capa|manto|robe|tunica|veste|roupa|roupas|cobertor)\b/, 1],
  // armas
  [/\b(montante|espadao|claymore|espada de duas maos)\b/, 3],
  [/\b(espada curta|gladio)\b/, 1],
  [/\b(sabre|cimitarra|alfange)\b/, 1.4],
  [/\b(rapieira|florete|estoque)\b/, 1.1],
  [/\bespada\b/, 1.5],
  [/\b(faca de caca)\b/, 0.4],
  [/\b(adaga|punhal|estilete)\b/, 0.5],
  [/\b(faca|faquinha)\b/, 0.3],
  [/\b(machadinha|machado de mao|machado pequeno)\b/, 1],
  [/\b(machado de guerra|machado grande|machado)\b/, 3],
  [/\b(martelo de guerra|marreta)\b/, 2.5],
  [/\b(mangual|mangoal)\b/, 2.5],
  [/\b(maca|clava|porrete|tacape|cetro)\b/, 2],
  [/\b(alabarda|glaive|archa|gadanha|segadeira)\b/, 3],
  [/\b(lanca|pique|tridente)\b/, 2],
  [/\bazagaia\b/, 1],
  [/\bfoice\b/, 1.5],
  [/\b(chicote|acoite|relho)\b/, 0.5],
  [/\b(cajado|bordao|bastao)\b/, 2],
  [/\b(varinha|vara magica)\b/, 0.3],
  [/\b(manoplas?|soqueira|garras de ferro)\b/, 1],
  [/\barco longo\b/, 1.5],
  [/\barco\b/, 1],
  [/\b(besta leve|besta de mao)\b/, 2.5],
  [/\bbesta\b/, 4],
  [/\b(funda|estilingue|atiradeira)\b/, 0.1],
  [/\b(flecha|flechas|seta|setas|virote|virotes|dardo|dardos|shuriken)\b/, 0.05],
  [/\b(aljava|carcaz)\b/, 0.5],
  // recipientes (mochilas e baus)
  [/\b(mochila|bornal)\b/, 1],
  [/\b(alforje|tiracolo)\b/, 1],
  [/\b(bau|arca|cofre)\b/, 15],
  [/\b(caixa|caixote)\b/, 4],
  [/\b(barril|tonel)\b/, 10],
  [/\b(saco|saca|sacola)\b/, 0.3],
  [/\b(bolsa|algibeira)\b/, 0.2],
  // pocoes, bebidas e comida
  [/\b(pocao|pocoes|elixir|tonico|filtro|ampola|frasco|antidoto|antiveneno|xarope|veneno)\b/, 0.3],
  [/\b(vinho|garrafa|hidromel)\b/, 1.2],
  [/\b(odre|cantil)\b/, 1.5],
  [/\b(caneca|cerveja|grogue)\b/, 0.5],
  [/\b(racao|racoes|provisao|provisoes|mantimento|mantimentos)\b/, 0.5],
  [/\b(pao|paes|broa|queijo|carne|coxa|presunto|charque|peixe|linguica|salame)\b/, 0.4],
  [/\b(torta|bolo)\b/, 1],
  [/\b(fruta|frutas|pera|cenoura|nabo|batata|mel)\b/, 0.2],
  [/\b(ovo|ovos|biscoito|bolacha|uva|uvas)\b/, 0.1],
  // ingredientes, ervas e trofeus de monstro
  [/\b(erva|ervas|folha|folhas|flor|flores|petala|cogumelo|cogumelos|fungo|raiz|baga|bagas|semente|sementes|trevo|bolota|musgo|mandragora)\b/, 0.05],
  [/\b(sal|po|cinzas|enxofre)\b/, 0.1],
  [/\b(couro|pele|pelego)\b/, 2],
  [/\b(cauda|rabo|tentaculo|asa|asas)\b/, 1],
  [/\b(chifre|chifres|corno|galhada)\b/, 0.5],
  [/\b(cranio|caveira)\b/, 0.8],
  [/\b(osso|ossos|femur|costela)\b/, 0.3],
  [/\b(coracao)\b/, 0.4],
  [/\b(escama|escamas|presa|presas|dente|dentes|garra|garras|unha|orelha|orelhas|olho|olhos|pena|penas|pluma|seda|teia)\b/, 0.05],
  // papeis e livros
  [/\b(carta|bilhete|envelope|mensagem|convite|pagina|nota|anotacao|mapa)\b/, 0.05],
  [/\b(pergaminho|pergaminhos|contrato|decreto|edital)\b/, 0.1],
  [/\b(grimorio|tomo|necronomicon|codice|biblia)\b/, 1.5],
  [/\b(livro|livros|diario|caderno|manual)\b/, 1],
  // chaves
  [/\b(molho de chaves)\b/, 0.2],
  [/\b(chave|chaves)\b/, 0.05],
  [/\b(cadeado|fechadura)\b/, 0.5],
  // ferramentas e equipamento
  [/\bpicareta\b/, 3],
  [/\b(pa|enxada|ancinho|rastelo)\b/, 2],
  [/\b(caldeirao)\b/, 5],
  [/\b(panela|marmita|kit de cozinha)\b/, 1.5],
  [/\b(martelo|serra)\b/, 1],
  [/\b(alicate|tenaz|pinca)\b/, 0.5],
  [/\b(gazua|gazuas|ferramentas de ladrao|kit de ladrao)\b/, 0.2],
  [/\b(kit|estojo)\b/, 1],
  [/\b(agulha|linha)\b/, 0.02],
  [/\bbalde\b/, 1],
  [/\b(vara de pesca)\b/, 1],
  [/\b(ampulheta|luneta|telescopio|espelho)\b/, 0.5],
  [/\b(lupa|lente|bussola|astrolabio)\b/, 0.2],
  [/\b(tocha|tochas|archote)\b/, 0.5],
  [/\b(lanterna|lampiao|lamparina|candeia)\b/, 1],
  [/\b(castical|candelabro)\b/, 0.5],
  [/\b(oleo)\b/, 0.5],
  [/\b(vela|velas|pederneira|isqueiro|fosforo|acendalha)\b/, 0.1],
  [/\b(arpeu|gancho)\b/, 2],
  [/\b(corrente|correntes)\b/, 3],
  [/\b(algema|algemas|grilhao|grilhoes)\b/, 1],
  [/\b(rede|redes)\b/, 2],
  [/\b(corda|cordas)\b/, 1],
  [/\b(barbante|cipo)\b/, 0.1],
  [/\b(saco de dormir|tenda|barraca)\b/, 3],
  [/\b(bandagem|bandagens|atadura|curativo)\b/, 0.1],
  // diversos
  [/\b(dado|dados)\b/, 0.01],
  [/\b(baralho|tarot)\b/, 0.1],
  [/\b(alaude|bandolim|violao|harpa|instrumento)\b/, 2],
  [/\b(flauta|pifano|ocarina|cachimbo|tinteiro|pena de escrever)\b/, 0.1],
  [/\b(sino|sineta|campainha|calice|taca)\b/, 0.3],
  [/\b(idolo|estatueta|estatua|reliquia)\b/, 1],
  [/\b(runa|runas|pedra runica)\b/, 0.2],
  [/\b(carvao|hulha)\b/, 0.5],
  [/\b(minerio|ferro bruto)\b/, 2],
  [/\b(bigorna)\b/, 50],
  [/\b(pedra|rocha|seixo|cristal)\b/, 0.5]
];

// Categoria do app quando nenhuma palavra decide
const CATEGORY_WEIGHTS = [
  [/^ armadura/, 8], [/^ arma/, 1.5], [/^ poc/, 0.3], [/^ (tesouro|joia|gema)/, 0.1], [/^ livro/, 1],
  [/^ (ingrediente|erva)/, 0.05], [/^ (comida|alimento)/, 0.4], [/^ (ferramenta|kit)/, 1]
];
export const DEFAULT_WEIGHT = 0.5;

const matchRules = (text) => {
  const t = norm(text);
  if (t.trim() === '') return null;
  for (const [re, kg] of RULES) if (re.test(t)) return kg;
  return null;
};

// Peso sugerido (kg por unidade): nome -> icone -> descricao -> categoria -> 0,5 kg.
export function suggestWeight(item = {}) {
  const { name = '', icon = '', description = '', category = '' } = item || {};
  const byText = matchRules(name) ?? matchRules(String(icon || '').replace(/^arma-|-(ferro|aco|ouro)$/g, ' ').replace(/[-_]/g, ' ')) ?? matchRules(description);
  if (byText != null) return byText;
  const cat = norm(category);
  for (const [re, kg] of CATEGORY_WEIGHTS) if (re.test(cat)) return kg;
  return DEFAULT_WEIGHT;
}

export const roundKg = (n) => Math.round(Number(n || 0) * 100) / 100;

// Peso de uma unidade: o informado, ou o sugerido se for 0/ausente.
export function unitWeight(item = {}) {
  const w = Number(item?.weight);
  return Number.isFinite(w) && w > 0 ? w : suggestWeight(item);
}

// Peso total de uma entrada do inventario: unidade x quantidade + conteudo (mochila, bau).
export function itemLoad(item = {}) {
  const qty = Math.max(0, Number(item?.quantity ?? 1));
  const own = unitWeight(item) * (Number.isFinite(qty) ? qty : 1);
  const inside = Array.isArray(item?.contents) ? item.contents.reduce((sum, c) => sum + itemLoad(c), 0) : 0;
  return roundKg(own + inside);
}

// Carga do inventario: peso total (kg) e quantidade de itens. Cada entrada conta 1 item (uma pilha de
// 20 flechas e 1 item); o que esta dentro de uma mochila so pesa, nao ocupa espaco a mais.
export function inventoryLoad(list = []) {
  const items = Array.isArray(list) ? list : [];
  return { weight: roundKg(items.reduce((sum, it) => sum + itemLoad(it), 0)), count: items.length };
}

export const formatKg = (n) => `${roundKg(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;

// Limites do mestre: {maxWeight (kg), maxItems}; null = sem limite.
// Devolve a mensagem em pt-BR se acrescentar `added` (lista) estoura o limite, senao null.
export function inventoryLimitError(inventory = [], added = [], limits = {}) {
  const before = inventoryLoad(inventory);
  const extra = inventoryLoad(added);
  const { maxWeight = null, maxItems = null } = limits || {};
  if (maxWeight != null && extra.weight > 0 && before.weight + extra.weight > maxWeight + 1e-9) {
    return `Mochila cheia: passa do peso máximo (${formatKg(maxWeight)}) que o mestre definiu.`;
  }
  if (maxItems != null && extra.count > 0 && before.count + extra.count > maxItems) {
    return `Mochila cheia: passa do máximo de ${maxItems} ${maxItems === 1 ? 'item' : 'itens'} que o mestre definiu.`;
  }
  return null;
}
