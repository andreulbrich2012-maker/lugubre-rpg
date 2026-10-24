import { query, tryQuery } from '../db/pool.js';
import { httpError } from './http.js';

export function isMaster(member, campaign, user) {
  return user.role === 'admin' || member?.role === 'master' || campaign?.master_id === user.id;
}

export async function dbMember(campaignId, userId) {
  const result = await tryQuery(
    `select cm.*, c.master_id, c.name as campaign_name
     from campaign_members cm
     join campaigns c on c.id = cm.campaign_id
     where cm.campaign_id = $1 and cm.user_id = $2`,
    [campaignId, userId]
  );
  return result?.rows?.[0] || null;
}

export async function requireCampaignMember(campaignId, user) {
  const member = await dbMember(campaignId, user.id);
  if (!member) {
    throw httpError('Você não participa desta campanha.', 403);
  }
  const campaign = (await query('select * from campaigns where id = $1', [campaignId])).rows[0];
  if (!campaign) throw httpError('Campanha não encontrada.', 404);
  return { member, campaign, master: isMaster(member, campaign, user) };
}

export async function assertCampaignMaster(campaignId, user) {
  const context = await requireCampaignMember(campaignId, user);
  if (!context.master) throw httpError('Apenas o mestre pode fazer esta ação.', 403);
  return context;
}
