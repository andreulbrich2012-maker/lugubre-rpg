// Carga do personagem no modo jogo: limites da mochila (com o padrao da mesa) e quanto o peso
// atrapalha andar. Funcoes puras, sem React, para testar e para o Board usar depois.
import { inventoryLimits } from './tableRules';
import { inventoryLoad } from './itemWeight';

export const DEFAULT_MAX_ITEMS = 9;
export const DEFAULT_MAX_WEIGHT = 30;

// Fator de velocidade pela carga: livre ate 50% do peso maximo, cai em linha reta ate 0,6
// em 100% e fica em 0,35 acima do limite. Sem limite (ou limite 0) = 1.
export function loadSpeedFactor(currentKg, maxKg) {
  const cur = Number(currentKg);
  const max = Number(maxKg);
  if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(cur) || cur <= 0) return 1;
  const ratio = cur / max;
  if (ratio <= 0.5) return 1;
  if (ratio <= 1) return Math.round((1 - ((ratio - 0.5) / 0.5) * 0.4) * 1000) / 1000;
  return 0.35;
}

// Nome da faixa de carga para a interface.
export function loadLevel(currentKg, maxKg) {
  const max = Number(maxKg);
  if (!Number.isFinite(max) || max <= 0) return { key: 'free', label: 'Leve' };
  const ratio = Number(currentKg || 0) / max;
  if (ratio > 1) return { key: 'over', label: 'Sobrecarregado' };
  if (ratio >= 0.999) return { key: 'full', label: 'No limite' };
  if (ratio > 0.5) return { key: 'heavy', label: 'Pesado' };
  return { key: 'free', label: 'Leve' };
}

// Limites que o jogador ve na barra: o do mestre, ou o padrao da mesa (9 itens, 30 kg).
export function gameLimits(rules, userId) {
  const lim = inventoryLimits(rules, userId);
  return {
    maxItems: lim.maxItems ?? DEFAULT_MAX_ITEMS,
    maxWeight: lim.maxWeight ?? DEFAULT_MAX_WEIGHT
  };
}

// Resumo pronto para o HUD: peso, itens, limites, fator de velocidade e faixa.
export function loadSummary(inventory, rules, userId) {
  const load = inventoryLoad(inventory || []);
  const limits = gameLimits(rules, userId);
  return {
    ...load,
    ...limits,
    speed: loadSpeedFactor(load.weight, limits.maxWeight),
    level: loadLevel(load.weight, limits.maxWeight),
    full: load.weight >= limits.maxWeight || load.count >= limits.maxItems
  };
}

// Formula de dado aceita pelo servidor: 1-20 dados, d2-d100, bonus inteiro.
export const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100];
export function diceFormula(quantity, sides, bonus = 0) {
  const q = Math.min(20, Math.max(1, Math.floor(Number(quantity) || 1)));
  const s = DICE_SIDES.includes(Number(sides)) ? Number(sides) : 20;
  const b = Math.max(-10000, Math.min(10000, Math.trunc(Number(bonus) || 0)));
  return `${q}d${s}${b ? (b > 0 ? `+${b}` : `${b}`) : ''}`;
}
