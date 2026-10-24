// Prazos dos alugueis e o relogio do mundo (dias passando).
// Usado pela rota da economia e por campaign.v2.js (feed de eventos e regras da mesa).
import { pool, query } from '../../db/pool.js';
import { emitEvent } from '../events.js';
import { parseJson } from '../http.js';

// O relogio do mestre so guarda a hora do dia (0..1439). Cada mudanca soma a diferenca em
// campaigns.world_minutes: ate 12 h para frente conta como avancar, mais que isso como voltar
// (o botao "voltar 15 min" vira -15, nao +1425).
export function clockDelta(oldMinutes, newMinutes) {
  const d = (((Number(newMinutes) - Number(oldMinutes)) % 1440) + 1440) % 1440;
  return d > 720 ? d - 1440 : d;
}

export async function advanceWorld(campaignId, oldRules, newRules) {
  const before = oldRules?.clock || {};
  const after = newRules?.clock || {};
  if (!after.on || !before.on) return;
  const delta = clockDelta(before.minutes, after.minutes);
  if (!delta) return;
  await query('update campaigns set world_minutes = world_minutes + $1 where id = $2', [delta, campaignId]);
  await expireRentals(campaignId);
}

// tira do inventario (ou de dentro de um recipiente) o item com este id
function withoutItem(inventory, itemId) {
  let found = null;
  const out = [];
  for (const it of inventory) {
    if (it?.id === itemId) { found = it; continue; }
    if (Array.isArray(it?.contents) && it.contents.some((c) => c?.id === itemId)) {
      found = it.contents.find((c) => c.id === itemId);
      out.push({ ...it, contents: it.contents.filter((c) => c.id !== itemId) });
      continue;
    }
    out.push(it);
  }
  return { inventory: out, found };
}

// Encerra um aluguel: o item sai do inventario, o estoque volta, o barco volta ao barqueiro.
// status 'returned' = venceu sozinho ou o jogador devolveu; 'ended' = o mestre encerrou.
export async function closeRental(rentalId, status = 'returned', userId = null) {
  const client = await pool.connect();
  let rental;
  try {
    await client.query('begin');
    rental = (await client.query(`select * from campaign_rentals where id = $1 and status = 'active' for update`, [rentalId])).rows[0];
    if (!rental) { await client.query('rollback'); return null; }
    if (rental.character_id && rental.inventory_item_id) {
      const ch = (await client.query('select id, inventory from characters where id = $1 for update', [rental.character_id])).rows[0];
      if (ch) {
        const { inventory, found } = withoutItem(parseJson(ch.inventory, []), rental.inventory_item_id);
        if (found) await client.query('update characters set inventory = $1, updated_at = now() where id = $2', [JSON.stringify(inventory), ch.id]);
      }
    }
    if (rental.item_id) await client.query('update campaign_shop_items set stock = stock + 1, updated_at = now() where id = $1 and unlimited = false', [rental.item_id]);
    // barco alugado: deixa de ser do personagem (rented_until no passado = devolvido)
    if (rental.boat_id) await client.query('update campaign_boats set owner_character_id = null, rented_until = now() where id = $1', [rental.boat_id]);
    await client.query(`update campaign_rentals set status = $2, ended_at = now() where id = $1`, [rental.id, status]);
    await client.query(
      `insert into campaign_trades (campaign_id, shop_id, user_id, character_id, kind, item_name, quantity, unit_price, total, meta)
       values ($1,$2,$3,$4,'devolucao',$5,1,0,0,$6)`,
      [rental.campaign_id, rental.shop_id, rental.user_id, rental.character_id, rental.name, JSON.stringify({ rentalId: rental.id, status, by: userId })]
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
  if (rental.character_id) await emitEvent(rental.campaign_id, 'character:updated', { characterId: rental.character_id }, 'all', userId);
  const message = status === 'ended' ? `O mestre encerrou o aluguel: ${rental.name}.` : `Acabou o aluguel: ${rental.name} voltou para o dono.`;
  if (rental.user_id) await emitEvent(rental.campaign_id, 'rental:ended', { rentalId: rental.id, name: rental.name, characterId: rental.character_id, message }, rental.user_id, userId);
  await emitEvent(rental.campaign_id, 'economy:updated', { rentalId: rental.id }, 'master', userId);
  if (rental.boat_id) await emitEvent(rental.campaign_id, 'voyage:updated', { boatId: rental.boat_id }, 'all', userId);
  return rental;
}

// Alugueis vencidos da campanha voltam sozinhos (relogio do mundo ou horas reais).
export async function expireRentals(campaignId) {
  const { rows } = await query(
    `select r.id from campaign_rentals r join campaigns c on c.id = r.campaign_id
     where r.campaign_id = $1 and r.status = 'active'
       and ((r.ends_world_minutes is not null and c.world_minutes >= r.ends_world_minutes)
         or (r.ends_world_minutes is null and r.ends_at is not null and r.ends_at <= now()))`,
    [campaignId]
  );
  for (const row of rows) await closeRental(row.id, 'returned');
  return rows.length;
}

// Conferencia barata no feed de eventos (chamado varias vezes por segundo): no maximo 1x a cada
// 20 s por campanha nesta instancia; erro aqui nunca derruba o feed.
const lastCheck = new Map();
export function expireRentalsSoon(campaignId) {
  const now = Date.now();
  if (now - (lastCheck.get(campaignId) || 0) < 20_000) return;
  lastCheck.set(campaignId, now);
  if (lastCheck.size > 2000) lastCheck.clear();
  expireRentals(campaignId).catch((error) => console.error('[alugueis]', error.message));
}
