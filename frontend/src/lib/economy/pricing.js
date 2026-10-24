// Contas de preco do comercio (compra, venda ao mercador, aluguel e prazo).
// ARQUIVO ESPELHADO: frontend/src/lib/economy/pricing.js e backend/src/utils/economy/pricing.js
// tem que ser iguais (o teste do backend confere). So importa a tabela ao lado.
//
// Preco final = base do item x campanha x cena (cidade/mapa) x area do mapa x mercador.
// O jogador so ve o preco final; o mestre ve a conta.
// Venda ao mercador = base x campanha x cena x area x taxa de recompra (sem o x do mercador:
// mercador careiro nao paga mais pelo que compra).
import { CATALOG, CATALOG_BY_ID, CATEGORIES, scaled } from './prices.js';

export const MULT_PRESETS = [0.5, 0.8, 1, 1.25, 1.5, 2];
export const MULT_MIN = 0.1;
export const MULT_MAX = 10;
// 1 dia de aluguel sem o relogio do mundo ligado = estas horas reais (o mestre muda na campanha)
export const DEFAULT_REAL_HOURS_PER_DAY = 2;
export const MAX_RENT_DAYS = 30;

export function cleanMult(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.round(Math.min(MULT_MAX, Math.max(MULT_MIN, n)) * 100) / 100;
}

export const formatMult = (m) => `×${String(cleanMult(m)).replace('.', ',')}`;

// arredonda para dracmas inteiros; coisa paga nunca sai de graca
export function roundPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(1, Math.round(n));
}

// produto dos multiplicadores { campaign, scene, area, merchant }
export function totalMult(m = {}, { merchant = true } = {}) {
  return cleanMult(m.campaign) * cleanMult(m.scene) * cleanMult(m.area) * (merchant ? cleanMult(m.merchant) : 1);
}

export const finalPrice = (base, m) => roundPrice(Number(base || 0) * totalMult(m));

// celula (x, y) dentro de alguma area de preco da cena? a ultima desenhada ganha
export function areaAt(areas = [], cx, cy) {
  let hit = null;
  for (const a of Array.isArray(areas) ? areas : []) {
    if (cx >= a.x && cy >= a.y && cx < a.x + a.w && cy < a.y + a.h) hit = a;
  }
  return hit;
}

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const lower = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const BY_EXACT = new Map(CATALOG.map((it) => [lower(it.name), it]));
// sem acento "maça" (arma) e "maçã" (fruta) viram iguais: nome ambiguo nao casa sem acento
const BY_NAME = new Map();
const AMBIGUOUS = new Set();
for (const it of CATALOG) {
  const k = norm(it.name);
  if (BY_NAME.has(k)) AMBIGUOUS.add(k); else BY_NAME.set(k, it);
}
for (const k of AMBIGUOUS) BY_NAME.delete(k);

// Item do inventario -> item do catalogo (pelo catalogId, pelo nome exato ou sem acento/parenteses).
export function matchCatalog(item = {}) {
  if (item.catalogId && CATALOG_BY_ID[item.catalogId]) return CATALOG_BY_ID[item.catalogId];
  if (BY_EXACT.has(lower(item.name))) return BY_EXACT.get(lower(item.name));
  const n = norm(item.name);
  if (!n) return null;
  if (BY_NAME.has(n)) return BY_NAME.get(n);
  // "Espada longa enferrujada" -> espada longa (o nome mais comprido que aparece no comeco)
  let best = null;
  for (const [key, it] of BY_NAME) if (key.length >= 3 && (n === key || n.startsWith(`${key} `)) && (!best || key.length > norm(best.name).length)) best = it;
  return best;
}

// categoria do catalogo de um item do inventario (para o mercador saber se compra)
const INV_TO_CAT = { armas: 'armas', armaduras: 'armaduras', pocoes: 'pocoes', comida: 'comida', ferramentas: 'ferramentas', tesouro: 'joias', achados: 'joias', livros: 'magia', ingredientes: 'pocoes' };
export function catalogCategory(item = {}) {
  const hit = matchCatalog(item);
  if (hit) return hit.cat;
  return INV_TO_CAT[norm(item.category).split(' ')[0]] || null;
}

// Quanto o mercador paga por UMA unidade deste item do inventario (0 = nao compra).
// shop: { buys, buyRate, buyCategories[] (vazio = qualquer uma) }; m = multiplicadores do lugar.
export function sellOffer(item, shop = {}, m = {}) {
  if (!shop.buys || item?.rentalId) return 0;
  const cat = catalogCategory(item);
  const cats = Array.isArray(shop.buyCategories) ? shop.buyCategories : [];
  if (cats.length && !cats.includes(cat)) return 0;
  const hit = matchCatalog(item);
  if (!hit || hit.rentOnly || hit.kind === 'servico') return 0;
  const rate = Math.min(1, Math.max(0, Number(shop.buyRate ?? 0.5)));
  const value = scaled(hit.price) * totalMult(m, { merchant: false }) * rate;
  return value > 0 ? Math.max(1, Math.floor(value)) : 0;
}

export const categoryLabel = (cat) => CATEGORIES[cat]?.label || 'Outros';
export const inventoryCategory = (cat) => CATEGORIES[cat]?.inv || 'Outros';

// Prazo do aluguel. Com o relogio do mundo ligado, conta em minutos do mundo (1 dia = 1440);
// sem ele, cada dia de aluguel dura realHoursPerDay horas reais.
export function rentalEnd({ days, clockOn, worldMinutes = 0, now = Date.now(), realHoursPerDay = DEFAULT_REAL_HOURS_PER_DAY }) {
  const d = Math.max(1, Math.min(MAX_RENT_DAYS, Math.floor(Number(days) || 1)));
  if (clockOn) return { endsWorldMinutes: Number(worldMinutes || 0) + d * 1440, endsAt: null };
  const hours = Number(realHoursPerDay) > 0 ? Number(realHoursPerDay) : DEFAULT_REAL_HOURS_PER_DAY;
  return { endsWorldMinutes: null, endsAt: new Date(now + d * hours * 3600_000).toISOString() };
}

export function rentalExpired(rental, { worldMinutes = 0, now = Date.now() } = {}) {
  if (rental.endsWorldMinutes != null) return Number(worldMinutes) >= Number(rental.endsWorldMinutes);
  if (rental.endsAt) return new Date(rental.endsAt).getTime() <= now;
  return false;
}

// "faltam 2 dias e 3 h" (mundo) ou "faltam 1 h 20 min" (tempo real)
export function rentalLeft(rental, { worldMinutes = 0, now = Date.now() } = {}) {
  if (rental.endsWorldMinutes != null) {
    const left = Math.max(0, Number(rental.endsWorldMinutes) - Number(worldMinutes));
    const d = Math.floor(left / 1440);
    const h = Math.floor((left % 1440) / 60);
    return left <= 0 ? 'vencido' : `${d ? `${d} ${d === 1 ? 'dia' : 'dias'}` : ''}${d && h ? ' e ' : ''}${h || !d ? `${h} h` : ''} no mundo`;
  }
  const ms = new Date(rental.endsAt).getTime() - now;
  if (!(ms > 0)) return 'vencido';
  const min = Math.ceil(ms / 60000);
  return min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`;
}

// dracmas -> "2 ouro, 1 platina, 3 prata, 4 bronze"
export function coinsLabel(total) {
  let rest = Math.max(0, Math.floor(Number(total) || 0));
  const parts = [];
  for (const [value, name] of [[500, 'ouro'], [100, 'platina'], [10, 'prata'], [1, 'bronze']]) {
    const n = Math.floor(rest / value);
    rest %= value;
    if (n) parts.push(`${n} ${name}`);
  }
  return parts.join(', ') || '0';
}

export const walletTotal = (w = {}) => Number(w.bronze || 0) + Number(w.silver || 0) * 10 + Number(w.platinum || 0) * 100 + Number(w.gold || 0) * 500;
export function walletFromTotal(total) {
  let rest = Math.max(0, Math.floor(Number(total || 0)));
  const gold = Math.floor(rest / 500); rest %= 500;
  const platinum = Math.floor(rest / 100); rest %= 100;
  const silver = Math.floor(rest / 10);
  return { bronze: rest % 10, silver, platinum, gold };
}
