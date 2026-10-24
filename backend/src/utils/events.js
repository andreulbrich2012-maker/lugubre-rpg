import { query } from '../db/pool.js';

const EVENT_TTL = "interval '24 hours'";
let lastPrune = 0;

// Feed de eventos da campanha. audience: 'all' | 'master' | uuid de um usuario.
export async function emitEvent(campaignId, type, payload = {}, audience = 'all', createdBy = null) {
  const { rows } = await query(
    `insert into campaign_events (campaign_id, type, payload, audience, created_by)
     values ($1, $2, $3, $4, $5) returning id`,
    [campaignId, type, JSON.stringify(payload ?? {}), audience || 'all', createdBy]
  );
  pruneEvents();
  return rows[0].id;
}

// Mesmo evento em duas versoes: a dos jogadores (sem numeros secretos) e a completa do mestre.
export async function emitSplit(campaignId, type, playerPayload, masterPayload, createdBy = null, { hidden = false } = {}) {
  if (!hidden && playerPayload) await emitEvent(campaignId, type, { ...playerPayload, view: 'player' }, 'all', createdBy);
  await emitEvent(campaignId, type, { ...masterPayload, view: 'master' }, 'master', createdBy);
}

// ponytail: limpeza oportunista no maximo 1x/min por instancia; cron se o volume crescer.
function pruneEvents() {
  const now = Date.now();
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  query(`delete from campaign_events where created_at < now() - ${EVENT_TTL}`).catch((error) => {
    console.error('[eventos] falha ao limpar', error.message);
  });
}

export async function listEvents(campaignId, userId, isMaster, after) {
  const { rows } = await query(
    `select id, type, payload, audience, created_by, created_at
     from campaign_events
     where campaign_id = $1 and id > $2
       and ($3 or audience = 'all' or audience = $4)
     order by id asc
     limit 200`,
    [campaignId, after, isMaster, String(userId)]
  );
  return rows.map((row) => ({ ...row, id: Number(row.id) }));
}

export async function latestEventId(campaignId) {
  const { rows } = await query('select coalesce(max(id), 0) as id from campaign_events where campaign_id = $1', [campaignId]);
  return Number(rows[0].id);
}
