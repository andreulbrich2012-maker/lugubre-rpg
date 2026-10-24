// Trava da ficha compartilhada (regra da mesa sheet.stats / sheet.powers = 'mestre'):
// enquanto a ficha esta mostrada numa campanha assim, o dono nao mexe sozinho em vida/mana/sanidade
// (stats) nem em ataques/magias (powers). Fora de campanha (ou se ele e o mestre dela) fica livre.
import { tryQuery } from '../db/pool.js';
import { httpError } from './http.js';
import { normalizeRules } from './tableRules.js';

export const STATS_LOCKED = 'Só o mestre mexe na vida, mana e sanidade nesta campanha.';
export const POWERS_LOCKED = 'Só o mestre adiciona ou edita ataques e magias nesta campanha.';

export async function sheetLocks(characterId, userId) {
  const result = await tryQuery(
    `select c.master_id, c.table_rules, cm.role as viewer_role
     from campaign_members owner_cm
     join campaigns c on c.id = owner_cm.campaign_id
     left join campaign_members cm on cm.campaign_id = c.id and cm.user_id = $2
     where coalesce(owner_cm.shared_character_id, owner_cm.character_id) = $1`,
    [characterId, userId]
  );
  const locks = { stats: false, powers: false };
  for (const row of result?.rows || []) {
    if (row.master_id === userId || row.viewer_role === 'master') continue;
    const rules = normalizeRules(typeof row.table_rules === 'string' ? JSON.parse(row.table_rules) : row.table_rules);
    if (rules.sheet.stats === 'mestre') locks.stats = true;
    if (rules.sheet.powers === 'mestre') locks.powers = true;
  }
  return locks;
}

// Compara o que o dono quer salvar com a ficha atual e barra o que a mesa travou.
// next: { life_current, life_max, sanity_current, sanity_max, mana, mana_max, attacks, spells } (so o que muda)
export async function assertSheetUnlocked(row, userId, next) {
  const statsKeys = ['life_current', 'life_max', 'sanity_current', 'sanity_max', 'mana', 'mana_max'];
  const statsChanged = statsKeys.some((key) => next[key] !== undefined && Number(next[key]) !== Number(row[key]));
  const powersChanged = ['attacks', 'spells'].some((key) => next[key] !== undefined && powerSignature(next[key]) !== powerSignature(row[key]));
  if (!statsChanged && !powersChanged) return;
  const locks = await sheetLocks(row.id, userId);
  if (statsChanged && locks.stats) throw httpError(STATS_LOCKED, 403);
  if (powersChanged && locks.powers) throw httpError(POWERS_LOCKED, 403);
}

// Assinatura estavel de uma lista de poderes (ignora ordem de chaves e campos so de exibicao).
function powerSignature(list) {
  const items = typeof list === 'string' ? JSON.parse(list || '[]') : (list || []);
  return JSON.stringify(items.map((p) => [p.id, p.name, p.damage, Number(p.criticalValue ?? 20), Number(p.criticalMultiplier ?? 2), Number(p.manaCost ?? 0), p.range || '-', p.skill || '', p.element || '', p.description || '']));
}
