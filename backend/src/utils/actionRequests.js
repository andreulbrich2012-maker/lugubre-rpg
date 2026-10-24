// Pedidos de acao ao mestre (modo 'pedir' das regras da mesa).
// O jogador tenta a acao; a rota lanca AskMaster depois de conferir alcance e turno; o pedido vira
// uma linha em campaign_action_requests e um evento para o mestre. Aprovado, a rota executa a acao
// de novo com approved = true (tudo conferido outra vez na hora).
import { query } from '../db/pool.js';
import { emitEvent } from './events.js';

export const REQUEST_TTL_MINUTES = 3;
const TTL = `interval '${REQUEST_TTL_MINUTES} minutes'`;
// acao da regra que cada tipo de pedido usa
export const REQUEST_ACTION = { pickup: 'pickup', enter: 'doors', exit: 'doors', attack: 'attack', trade: 'trade' };

export class AskMaster extends Error {
  constructor(info) {
    super('Pedido ao mestre.');
    this.askMaster = info; // { kind, sceneId, tokenId, characterId, payload, summary }
  }
}

export function requestView(row) {
  const created = new Date(row.created_at);
  return {
    id: row.id, kind: row.kind, status: row.status, summary: row.summary, userId: row.user_id,
    sceneId: row.scene_id, tokenId: row.token_id, characterId: row.character_id, payload: row.payload,
    created_at: created.toISOString(), expiresAt: new Date(created.getTime() + REQUEST_TTL_MINUTES * 60_000).toISOString()
  };
}

// Pedidos velhos viram 'expired' e o jogador fica sabendo.
export async function expireRequests(campaignId) {
  const { rows } = await query(
    `update campaign_action_requests set status = 'expired', decided_at = now()
     where campaign_id = $1 and status = 'pending' and created_at < now() - ${TTL} returning *`,
    [campaignId]
  );
  for (const row of rows) {
    await emitEvent(campaignId, 'action:decided', { ...requestView(row), message: 'O mestre não respondeu a tempo.' }, row.user_id, null);
  }
}

// Cria (ou reaproveita, se o mesmo pedido ja esta esperando) e avisa o mestre.
export async function createRequest(campaignId, userId, info) {
  await expireRequests(campaignId);
  const payload = JSON.stringify(info.payload || {});
  const same = (await query(
    `select * from campaign_action_requests where campaign_id = $1 and user_id = $2 and kind = $3 and status = 'pending' and payload = $4::jsonb`,
    [campaignId, userId, info.kind, payload]
  )).rows[0];
  if (same) return requestView(same);
  const { rows } = await query(
    `insert into campaign_action_requests (campaign_id, scene_id, user_id, character_id, token_id, kind, payload, summary)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
    [campaignId, info.sceneId || null, userId, info.characterId || null, info.tokenId || null, info.kind, payload, String(info.summary || '').slice(0, 200)]
  );
  const view = requestView(rows[0]);
  await emitEvent(campaignId, 'action:request', view, 'master', userId);
  return view;
}

export async function listPending(campaignId) {
  await expireRequests(campaignId);
  const { rows } = await query(
    `select * from campaign_action_requests where campaign_id = $1 and status = 'pending' order by created_at asc limit 50`,
    [campaignId]
  );
  return rows.map(requestView);
}

// Marca a decisao so se ainda estava esperando (dois cliques do mestre = uma execucao).
export async function claimRequest(campaignId, requestId, status) {
  await expireRequests(campaignId);
  const { rows } = await query(
    `update campaign_action_requests set status = $3, decided_at = now()
     where id = $1 and campaign_id = $2 and status = 'pending' returning *`,
    [requestId, campaignId, status]
  );
  if (rows[0]) return { row: rows[0] };
  const current = (await query('select status from campaign_action_requests where id = $1 and campaign_id = $2', [requestId, campaignId])).rows[0];
  return { missing: !current, status: current?.status };
}

export async function setRequestStatus(requestId, status) {
  await query('update campaign_action_requests set status = $2, decided_at = now() where id = $1', [requestId, status]);
}
