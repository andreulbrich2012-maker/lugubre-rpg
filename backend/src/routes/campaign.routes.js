import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { query, tryQuery } from '../db/pool.js';
import {
  createLocalCampaign,
  createLocalMessage,
  getLocalCampaignRoom,
  joinLocalCampaign,
  listLocalCampaigns
} from '../db/localStore.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const result = await tryQuery(
    `select c.*, cm.role as member_role
     from campaigns c
     join campaign_members cm on cm.campaign_id = c.id
     where cm.user_id = $1
     order by c.created_at desc`,
    [req.user.id]
  );
  res.json(result?.rows || await listLocalCampaigns(req.user.id));
});

router.post('/', async (req, res) => {
  const body = z.object({ name: z.string().min(2), description: z.string().optional().default('') }).parse(req.body);
  const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  const result = await tryQuery(
    `insert into campaigns (master_id, name, description, invite_code)
     values ($1, $2, $3, $4) returning *`,
    [req.user.id, body.name, body.description, inviteCode]
  );
  if (result?.rows?.[0]) {
    await query('insert into campaign_members (campaign_id, user_id, role) values ($1, $2, $3)', [result.rows[0].id, req.user.id, 'master']);
    return res.status(201).json(result.rows[0]);
  }
  res.status(201).json(await createLocalCampaign(req.user.id, { ...body, invite_code: inviteCode }));
});

router.post('/join', async (req, res) => {
  const body = z.object({ inviteCode: z.string().min(4), characterId: z.string().optional().nullable() }).parse(req.body);
  const campaign = await tryQuery('select * from campaigns where invite_code = $1', [body.inviteCode.toUpperCase()]);
  if (campaign?.rows?.[0]) {
    await query(
      `insert into campaign_members (campaign_id, user_id, character_id, role)
       values ($1, $2, $3, 'player')
       on conflict (campaign_id, user_id) do update set character_id = excluded.character_id`,
      [campaign.rows[0].id, req.user.id, body.characterId]
    );
    return res.json(campaign.rows[0]);
  }
  const local = await joinLocalCampaign(body.inviteCode, req.user.id, body.characterId);
  if (!local) return res.status(404).json({ message: 'Convite inválido.' });
  res.json(local);
});

router.get('/:id', async (req, res) => {
  const member = await tryQuery('select role from campaign_members where campaign_id = $1 and user_id = $2', [req.params.id, req.user.id]);
  if (member?.rowCount) {
    const campaign = await query('select * from campaigns where id = $1', [req.params.id]);
    const members = await query(
      `select u.id, u.name, cm.role, ch.id as character_id, ch.character_name
       from campaign_members cm
       join users u on u.id = cm.user_id
       left join characters ch on ch.id = cm.character_id
       where cm.campaign_id = $1`,
      [req.params.id]
    );
    const messages = await query(
      `select m.*, u.name as user_name from messages m
       join users u on u.id = m.user_id
       where m.campaign_id = $1 order by m.created_at asc limit 100`,
      [req.params.id]
    );
    return res.json({ campaign: campaign.rows[0], members: members.rows, messages: messages.rows, role: member.rows[0].role });
  }
  const local = await getLocalCampaignRoom(req.params.id, req.user.id);
  if (!local) return res.status(403).json({ message: 'Você não participa desta campanha.' });
  res.json(local);
});

router.post('/:id/messages', async (req, res) => {
  const body = z.object({ content: z.string().min(1) }).parse(req.body);
  const member = await tryQuery('select role from campaign_members where campaign_id = $1 and user_id = $2', [req.params.id, req.user.id]);
  if (member?.rowCount) {
    const { rows } = await query(
      `insert into messages (campaign_id, user_id, content)
       values ($1, $2, $3)
       returning id, campaign_id, user_id, content, created_at`,
      [req.params.id, req.user.id, body.content.trim()]
    );
    const user = await query('select name from users where id = $1', [req.user.id]);
    return res.status(201).json({ ...rows[0], user_name: user.rows[0]?.name || req.user.name });
  }
  const local = await createLocalMessage(req.params.id, req.user.id, body.content.trim());
  if (!local) return res.status(403).json({ message: 'Você não participa desta campanha.' });
  res.status(201).json(local);
});

router.delete('/:id/messages/:messageId', async (req, res) => {
  const member = await tryQuery('select role from campaign_members where campaign_id = $1 and user_id = $2', [req.params.id, req.user.id]);
  if (member?.rows?.[0]?.role !== 'master' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Apenas mestre ou admin pode administrar mensagens.' });
  }
  await tryQuery('delete from messages where id = $1 and campaign_id = $2', [req.params.messageId, req.params.id]);
  res.status(204).end();
});

export default router;
