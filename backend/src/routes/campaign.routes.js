import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { query, tryQuery } from '../db/pool.js';
import {
  createLocalCampaign,
  createLocalMessage,
  deleteLocalCampaign,
  deleteLocalCampaignMessage,
  getLocalCampaignRoom,
  joinLocalCampaign,
  leaveLocalCampaign,
  listLocalCampaigns,
  removeLocalCampaignMember,
  updateLocalCampaign,
  updateLocalCampaignMemberCharacter,
  updateLocalCampaignMemberColor,
  updateLocalCampaignMessage
} from '../db/localStore.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const memberColors = ['#d6a65f', '#9b8ac7', '#4fb6a8', '#cf6f8f', '#8fb3ff', '#d08a3e', '#8bd17c', '#e0d27a'];
const campaignSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().default('')
});
const messageSchema = z.object({
  content: z.string().min(1).max(4000)
});
const shareCharacterSchema = z.object({
  characterId: z.string().uuid().optional().nullable()
});
const colorSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});
const diarySchema = z.object({
  title: z.string().min(2).max(140),
  content: z.string().min(1).max(12000),
  marker: z.string().optional().default(''),
  characterId: z.string().uuid().optional().nullable(),
  isGmPrivate: z.coerce.boolean().optional().default(false)
});
const shopCategories = ['Taverna', 'Ferreiro', 'Alquimista', 'Mercado Geral', 'Loja Mística', 'Estábulo', 'Alfaiate', 'Contrabandista', 'Templo', 'Biblioteca', 'Armazém', 'Curandeiro'];
const shopSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().optional().default(''),
  category: z.string().min(2),
  visibleToPlayers: z.coerce.boolean().default(true)
});
const shopItemSchema = z.object({
  name: z.string().min(1).max(140),
  description: z.string().optional().default(''),
  priceDracmas: z.coerce.number().min(0).default(0),
  stock: z.coerce.number().min(0).default(1),
  category: z.string().optional().default('Outros'),
  weight: z.coerce.number().min(0).default(0),
  available: z.coerce.boolean().default(true),
  note: z.string().optional().default('')
});
const purchaseSchema = z.object({
  itemId: z.string().uuid(),
  characterId: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().min(1).max(99).default(1)
});
const purchaseDecisionSchema = z.object({
  note: z.string().optional().default('')
});

function memberColor(userId = '') {
  const total = String(userId).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return memberColors[total % memberColors.length];
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function isMaster(member, campaign, user) {
  return user.role === 'admin' || member?.role === 'master' || campaign?.master_id === user.id;
}

function normalizeShopCategory(category) {
  const value = String(category || '').trim();
  return shopCategories.includes(value) ? value : 'Mercado Geral';
}

function parseJsonField(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toJson(value) {
  return JSON.stringify(value ?? null);
}

function walletTotal(wallet = {}) {
  return Number(wallet.bronze || 0) + Number(wallet.silver || 0) * 10 + Number(wallet.platinum || 0) * 100 + Number(wallet.gold || 0) * 500;
}

function walletFromTotal(total) {
  return { bronze: Math.max(0, Number(total || 0)), silver: 0, platinum: 0, gold: 0 };
}

async function requireCampaignMember(campaignId, user) {
  const member = await dbMember(campaignId, user.id);
  if (!member) {
    const error = new Error('Você não participa desta campanha.');
    error.status = 403;
    throw error;
  }
  const campaignResult = await query('select * from campaigns where id = $1', [campaignId]);
  const campaign = campaignResult.rows[0];
  if (!campaign) {
    const error = new Error('Campanha não encontrada.');
    error.status = 404;
    throw error;
  }
  return { member, campaign, master: isMaster(member, campaign, user) };
}

async function assertCampaignMaster(campaignId, user) {
  const context = await requireCampaignMember(campaignId, user);
  if (!context.master) {
    const error = new Error('Apenas o mestre pode fazer esta ação.');
    error.status = 403;
    throw error;
  }
  return context;
}

function sharedCharacter(row) {
  if (!row?.shared_character_id) return null;
  return {
    id: row.shared_character_id,
    character_name: row.character_name,
    player_name: row.player_name,
    photo: row.character_photo || '',
    level: row.level,
    life_current: row.life_current,
    life_max: row.life_max,
    sanity_current: row.sanity_current,
    sanity_max: row.sanity_max,
    mana: row.mana,
    mana_max: row.mana_max,
    defense: row.defense,
    attributes: parseJson(row.attributes, {}),
    skills: parseJson(row.skills, {}),
    skill_bonuses: parseJson(row.skill_bonuses, {}),
    inventory: parseJson(row.inventory, []),
    attacks: parseJson(row.attacks, []),
    spells: parseJson(row.spells, [])
  };
}

async function dbMember(campaignId, userId) {
  const result = await tryQuery(
    `select cm.*, c.master_id, c.name as campaign_name
     from campaign_members cm
     join campaigns c on c.id = cm.campaign_id
     where cm.campaign_id = $1 and cm.user_id = $2`,
    [campaignId, userId]
  );
  return result?.rows?.[0] || null;
}

async function assertOwnedCharacter(characterId, userId) {
  if (!characterId) return null;
  const result = await tryQuery('select id from characters where id = $1 and owner_id = $2', [characterId, userId]);
  if (result && !result.rowCount) {
    const error = new Error('Este personagem não pertence a você.');
    error.status = 403;
    throw error;
  }
  return result?.rows?.[0] || null;
}

async function loadDbMembers(campaignId, viewer) {
  const viewerMember = await dbMember(campaignId, viewer.id);
  if (!viewerMember) return null;
  const campaignResult = await query('select * from campaigns where id = $1', [campaignId]);
  const campaign = campaignResult.rows[0];
  const canSeeFullSheet = isMaster(viewerMember, campaign, viewer);
  const result = await query(
    `select
       u.id,
       u.id as user_id,
       u.name,
       u.profile_image_url,
       cm.role,
       cm.color,
       cm.character_id,
       coalesce(cm.shared_character_id, cm.character_id) as shared_character_id,
       ch.character_name,
       ch.player_name,
       ch.photo as character_photo,
       ch.level,
       ch.life_current,
       ch.life_max,
       ch.sanity_current,
       ch.sanity_max,
       ch.mana,
       ch.mana_max,
       ch.defense,
       ch.attributes,
       ch.skills,
       ch.skill_bonuses,
       ch.inventory,
       ch.attacks,
       ch.spells,
       cm.joined_at,
       cm.updated_at
     from campaign_members cm
     join users u on u.id = cm.user_id
     left join characters ch on ch.id = coalesce(cm.shared_character_id, cm.character_id)
     where cm.campaign_id = $1
     order by cm.role desc, u.name asc`,
    [campaignId]
  );
  return result.rows.map((row) => {
    const displayName = row.character_name || row.name || 'Jogador';
    const displayAvatar = row.character_photo || row.profile_image_url || '';
    return {
      ...row,
      color: row.color || memberColor(row.user_id),
      display_name: displayName,
      display_avatar: displayAvatar,
      shared_character: (canSeeFullSheet || row.user_id === viewer.id) ? sharedCharacter(row) : null
    };
  });
}

async function loadDbMessages(campaignId) {
  const result = await query(
    `select
       m.id,
       m.campaign_id,
       m.user_id,
       m.character_id,
       m.content,
       m.edited_at,
       m.created_at,
       m.updated_at,
       u.name as account_name,
       u.profile_image_url as account_avatar,
       cm.color,
       ch.character_name,
       ch.photo as character_photo
     from messages m
     join users u on u.id = m.user_id
     left join campaign_members cm on cm.campaign_id = m.campaign_id and cm.user_id = m.user_id
     left join characters ch on ch.id = coalesce(cm.shared_character_id, cm.character_id, m.character_id)
     where m.campaign_id = $1 and m.deleted_at is null
     order by m.created_at asc
     limit 200`,
    [campaignId]
  );
  return result.rows.map((row) => ({
    ...row,
    user_name: row.character_name || row.account_name || 'Jogador',
    user_avatar: row.character_photo || row.account_avatar || '',
    color: row.color || memberColor(row.user_id)
  }));
}

router.get('/', async (req, res) => {
  const result = await tryQuery(
    `select c.*, cm.role as member_role, cm.color as member_color
     from campaigns c
     join campaign_members cm on cm.campaign_id = c.id
     where cm.user_id = $1
     order by c.created_at desc`,
    [req.user.id]
  );
  res.json(result?.rows || await listLocalCampaigns(req.user.id));
});

router.post('/', async (req, res) => {
  const body = campaignSchema.parse(req.body);
  const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  const result = await tryQuery(
    `insert into campaigns (master_id, name, description, invite_code)
     values ($1, $2, $3, $4) returning *`,
    [req.user.id, body.name, body.description, inviteCode]
  );
  if (result?.rows?.[0]) {
    await query(
      `insert into campaign_members (campaign_id, user_id, role, color)
       values ($1, $2, 'master', $3)
       on conflict (campaign_id, user_id) do update set role = 'master', color = excluded.color, updated_at = now()`,
      [result.rows[0].id, req.user.id, memberColors[0]]
    );
    return res.status(201).json(result.rows[0]);
  }
  res.status(201).json(await createLocalCampaign(req.user.id, { ...body, invite_code: inviteCode }));
});

router.post('/join', async (req, res) => {
  try {
    const body = z.object({ inviteCode: z.string().min(4), characterId: z.string().uuid().optional().nullable() }).parse(req.body);
    await assertOwnedCharacter(body.characterId, req.user.id);
    const campaign = await tryQuery('select * from campaigns where invite_code = $1', [body.inviteCode.toUpperCase()]);
    if (campaign?.rows?.[0]) {
      await query(
        `insert into campaign_members (campaign_id, user_id, character_id, shared_character_id, role, color)
         values ($1, $2, $3, $3, 'player', $4)
         on conflict (campaign_id, user_id) do update set
           character_id = coalesce(excluded.character_id, campaign_members.character_id),
           shared_character_id = coalesce(excluded.shared_character_id, campaign_members.shared_character_id),
           color = coalesce(campaign_members.color, excluded.color),
           updated_at = now()`,
        [campaign.rows[0].id, req.user.id, body.characterId || null, memberColor(req.user.id)]
      );
      return res.json(campaign.rows[0]);
    }
    const local = await joinLocalCampaign(body.inviteCode, req.user.id, body.characterId || null);
    if (!local) return res.status(404).json({ message: 'Convite inválido.' });
    res.json(local);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível entrar na campanha.' });
  }
});

router.get('/:id', async (req, res) => {
  const member = await dbMember(req.params.id, req.user.id);
  if (member) {
    const campaign = await query('select * from campaigns where id = $1', [req.params.id]);
    const members = await loadDbMembers(req.params.id, req.user);
    const messages = await loadDbMessages(req.params.id);
    return res.json({ campaign: campaign.rows[0], members, messages, role: member.role });
  }
  const local = await getLocalCampaignRoom(req.params.id, req.user.id);
  if (!local) return res.status(403).json({ message: 'Você não participa desta campanha.' });
  res.json(local);
});

router.put('/:id', async (req, res) => {
  try {
    const body = campaignSchema.parse(req.body);
    const result = await tryQuery(
      `update campaigns set name = $1, description = $2, updated_at = now()
       where id = $3 and (master_id = $4 or $5 = 'admin')
       returning *`,
      [body.name, body.description, req.params.id, req.user.id, req.user.role]
    );
    const campaign = result?.rows?.[0] || await updateLocalCampaign(req.params.id, req.user.id, req.user.role, body);
    if (!campaign) return res.status(404).json({ message: 'Campanha não encontrada.' });
    res.json(campaign);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível editar a campanha.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await tryQuery(
      `delete from campaigns
       where id = $1 and (master_id = $2 or $3 = 'admin')`,
      [req.params.id, req.user.id, req.user.role]
    );
    if (result && result.rowCount === 0) return res.status(403).json({ message: 'Apenas o mestre pode excluir a campanha.' });
    if (!result) {
      const deleted = await deleteLocalCampaign(req.params.id, req.user.id, req.user.role);
      if (!deleted) return res.status(404).json({ message: 'Campanha não encontrada.' });
    }
    res.status(204).end();
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível excluir a campanha.' });
  }
});

router.post('/:id/leave', async (req, res) => {
  try {
    const result = await tryQuery(
      `delete from campaign_members cm
       using campaigns c
       where cm.campaign_id = c.id
         and cm.campaign_id = $1
         and cm.user_id = $2
         and c.master_id <> $2
         and cm.role <> 'master'`,
      [req.params.id, req.user.id]
    );
    if (result) {
      if (result.rowCount === 0) return res.status(400).json({ message: 'O mestre deve excluir a campanha.' });
      return res.status(204).end();
    }
    const left = await leaveLocalCampaign(req.params.id, req.user.id);
    if (!left) return res.status(404).json({ message: 'Campanha não encontrada.' });
    res.status(204).end();
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível sair da campanha.' });
  }
});

router.get('/:id/members', async (req, res) => {
  const members = await loadDbMembers(req.params.id, req.user);
  if (members) return res.json(members);
  const local = await getLocalCampaignRoom(req.params.id, req.user.id);
  if (!local) return res.status(403).json({ message: 'Você não participa desta campanha.' });
  res.json(local.members);
});

router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const member = await dbMember(req.params.id, req.user.id);
    if (member) {
      if (member.user_id === req.params.userId) return res.status(403).json({ message: 'O mestre não pode remover a si mesmo.' });
      if (member.role !== 'master' && req.user.role !== 'admin') return res.status(403).json({ message: 'Apenas o mestre pode remover jogadores.' });
      const result = await query(
        `delete from campaign_members
         where campaign_id = $1 and user_id = $2 and role <> 'master'`,
        [req.params.id, req.params.userId]
      );
      if (!result.rowCount) return res.status(404).json({ message: 'Jogador não encontrado.' });
      return res.status(204).end();
    }
    const removed = await removeLocalCampaignMember(req.params.id, req.user.id, req.params.userId, req.user.role);
    if (!removed) return res.status(404).json({ message: 'Jogador não encontrado.' });
    res.status(204).end();
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível remover o jogador.' });
  }
});

router.put('/:id/members/me/character', async (req, res) => {
  try {
    const body = shareCharacterSchema.parse(req.body);
    await assertOwnedCharacter(body.characterId, req.user.id);
    const result = await tryQuery(
      `update campaign_members
       set character_id = $1, shared_character_id = $1, updated_at = now()
       where campaign_id = $2 and user_id = $3
       returning *`,
      [body.characterId || null, req.params.id, req.user.id]
    );
    if (result) {
      if (!result.rowCount) return res.status(403).json({ message: 'Você não participa desta campanha.' });
      return res.json(result.rows[0]);
    }
    const member = await updateLocalCampaignMemberCharacter(req.params.id, req.user.id, body.characterId || null);
    if (!member) return res.status(403).json({ message: 'Você não participa desta campanha.' });
    res.json(member);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível compartilhar o personagem.' });
  }
});

router.put('/:id/members/:userId/color', async (req, res) => {
  try {
    const body = colorSchema.parse(req.body);
    const member = await dbMember(req.params.id, req.user.id);
    if (member) {
      if (member.role !== 'master' && req.user.role !== 'admin') return res.status(403).json({ message: 'Apenas o mestre pode alterar cores.' });
      const result = await query(
        `update campaign_members set color = $1, updated_at = now()
         where campaign_id = $2 and user_id = $3
         returning *`,
        [body.color, req.params.id, req.params.userId]
      );
      if (!result.rowCount) return res.status(404).json({ message: 'Jogador não encontrado.' });
      return res.json(result.rows[0]);
    }
    const updated = await updateLocalCampaignMemberColor(req.params.id, req.user.id, req.params.userId, body.color, req.user.role);
    if (!updated) return res.status(404).json({ message: 'Jogador não encontrado.' });
    res.json(updated);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível alterar a cor.' });
  }
});

router.get('/:id/messages', async (req, res) => {
  const member = await dbMember(req.params.id, req.user.id);
  if (member) return res.json(await loadDbMessages(req.params.id));
  const local = await getLocalCampaignRoom(req.params.id, req.user.id);
  if (!local) return res.status(403).json({ message: 'Você não participa desta campanha.' });
  res.json(local.messages);
});

router.post('/:id/messages', async (req, res) => {
  try {
    const body = messageSchema.parse(req.body);
    const member = await dbMember(req.params.id, req.user.id);
    if (member) {
      const { rows } = await query(
        `insert into messages (campaign_id, user_id, character_id, content)
         values ($1, $2, $3, $4)
         returning id, campaign_id, user_id, character_id, content, edited_at, created_at, updated_at`,
        [req.params.id, req.user.id, member.shared_character_id || member.character_id || null, body.content.trim()]
      );
      const messages = await loadDbMessages(req.params.id);
      return res.status(201).json(messages.find((message) => message.id === rows[0].id) || rows[0]);
    }
    const local = await createLocalMessage(req.params.id, req.user.id, body.content.trim());
    if (!local) return res.status(403).json({ message: 'Você não participa desta campanha.' });
    res.status(201).json(local);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível enviar a mensagem.' });
  }
});

router.put('/:id/messages/:messageId', async (req, res) => {
  try {
    const body = messageSchema.parse(req.body);
    const member = await dbMember(req.params.id, req.user.id);
    if (member) {
      const existing = await query(
        'select * from messages where id = $1 and campaign_id = $2 and deleted_at is null',
        [req.params.messageId, req.params.id]
      );
      if (!existing.rowCount) return res.status(404).json({ message: 'Mensagem não encontrada.' });
      if (existing.rows[0].user_id !== req.user.id) return res.status(403).json({ message: 'Você só pode editar suas próprias mensagens.' });
      await query(
        `update messages set content = $1, edited_at = now(), updated_at = now()
         where id = $2 and campaign_id = $3`,
        [body.content.trim(), req.params.messageId, req.params.id]
      );
      const messages = await loadDbMessages(req.params.id);
      return res.json(messages.find((message) => message.id === req.params.messageId));
    }
    const local = await updateLocalCampaignMessage(req.params.id, req.user.id, req.params.messageId, body.content.trim());
    if (!local) return res.status(404).json({ message: 'Mensagem não encontrada.' });
    res.json(local);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível editar a mensagem.' });
  }
});

router.delete('/:id/messages/:messageId', async (req, res) => {
  try {
    const member = await dbMember(req.params.id, req.user.id);
    if (member) {
      const existing = await query(
        'select * from messages where id = $1 and campaign_id = $2 and deleted_at is null',
        [req.params.messageId, req.params.id]
      );
      if (!existing.rowCount) return res.status(404).json({ message: 'Mensagem não encontrada.' });
      const canDelete = existing.rows[0].user_id === req.user.id || member.role === 'master' || req.user.role === 'admin';
      if (!canDelete) return res.status(403).json({ message: 'Você não pode excluir mensagens de outros jogadores.' });
      await query(
        `update messages set deleted_at = now(), updated_at = now()
         where id = $1 and campaign_id = $2`,
        [req.params.messageId, req.params.id]
      );
      return res.status(204).end();
    }
    const deleted = await deleteLocalCampaignMessage(req.params.id, req.user.id, req.user.role, req.params.messageId);
    if (!deleted) return res.status(404).json({ message: 'Mensagem não encontrada.' });
    res.status(204).end();
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível excluir a mensagem.' });
  }
});

router.get('/:id/diary', async (req, res) => {
  try {
    const { member, campaign, master } = await requireCampaignMember(req.params.id, req.user);
    const search = String(req.query.search || '').trim();
    const marker = String(req.query.marker || '').trim();
    const selectedUserId = String(req.query.userId || '').trim();
    const params = [req.params.id];
    const filters = ['e.campaign_id = $1'];

    if (master && selectedUserId) {
      params.push(selectedUserId);
      filters.push(`e.user_id = $${params.length}`);
      if (selectedUserId !== req.user.id) filters.push('e.is_gm_private = false');
    } else if (master) {
      filters.push('(e.is_gm_private = false or e.user_id = $2)');
      params.push(req.user.id);
    } else {
      filters.push('e.user_id = $2 and e.is_gm_private = false');
      params.push(req.user.id);
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      filters.push(`(lower(e.title) like $${params.length} or lower(e.content) like $${params.length})`);
    }
    if (marker) {
      params.push(marker);
      filters.push(`e.marker = $${params.length}`);
    }

    const entries = await query(
      `select e.*, u.name as author_name, c.character_name
       from campaign_diary_entries e
       join users u on u.id = e.user_id
       left join characters c on c.id = e.character_id
       where ${filters.join(' and ')}
       order by e.created_at desc`,
      params
    );
    const members = master ? await loadDbMembers(req.params.id, req.user) : [];
    res.json({ entries: entries.rows, members, role: member.role, isMaster: master, campaign });
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível carregar o diário.' });
  }
});

router.post('/:id/diary', async (req, res) => {
  try {
    const body = diarySchema.parse(req.body);
    const { member, master } = await requireCampaignMember(req.params.id, req.user);
    await assertOwnedCharacter(body.characterId, req.user.id);
    const isGmPrivate = Boolean(master && body.isGmPrivate);
    const created = await query(
      `insert into campaign_diary_entries (campaign_id, user_id, character_id, title, content, marker, is_gm_private)
       values ($1,$2,$3,$4,$5,$6,$7)
       returning *`,
      [req.params.id, req.user.id, body.characterId || member.shared_character_id || member.character_id || null, body.title.trim(), body.content.trim(), body.marker || '', isGmPrivate]
    );
    res.status(201).json(created.rows[0]);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível criar a anotação.' });
  }
});

router.put('/:id/diary/:entryId', async (req, res) => {
  try {
    const body = diarySchema.parse(req.body);
    const { master } = await requireCampaignMember(req.params.id, req.user);
    await assertOwnedCharacter(body.characterId, req.user.id);
    const existing = await query('select * from campaign_diary_entries where id = $1 and campaign_id = $2', [req.params.entryId, req.params.id]);
    if (!existing.rowCount) return res.status(404).json({ message: 'Anotação não encontrada.' });
    if (existing.rows[0].user_id !== req.user.id) return res.status(403).json({ message: 'Você só pode editar seu próprio diário.' });
    const updated = await query(
      `update campaign_diary_entries
       set title=$1, content=$2, marker=$3, character_id=$4, is_gm_private=$5, updated_at=now()
       where id=$6 and campaign_id=$7 and user_id=$8
       returning *`,
      [body.title.trim(), body.content.trim(), body.marker || '', body.characterId || null, Boolean(master && body.isGmPrivate), req.params.entryId, req.params.id, req.user.id]
    );
    res.json(updated.rows[0]);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível editar a anotação.' });
  }
});

router.delete('/:id/diary/:entryId', async (req, res) => {
  try {
    await requireCampaignMember(req.params.id, req.user);
    const deleted = await query(
      'delete from campaign_diary_entries where id = $1 and campaign_id = $2 and user_id = $3',
      [req.params.entryId, req.params.id, req.user.id]
    );
    if (!deleted.rowCount) return res.status(404).json({ message: 'Anotação não encontrada.' });
    res.status(204).end();
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível excluir a anotação.' });
  }
});

async function loadShopPayload(campaignId, user) {
  const { master } = await requireCampaignMember(campaignId, user);
  const shops = await query(
    `select s.*
     from campaign_shops s
     where s.campaign_id = $1 and ($2 = true or s.visible_to_players = true)
     order by s.category, s.name`,
    [campaignId, master]
  );
  const shopIds = shops.rows.map((shop) => shop.id);
  const items = shopIds.length
    ? await query('select * from campaign_shop_items where shop_id = any($1::uuid[]) order by name', [shopIds])
    : { rows: [] };
  const requests = master
    ? await query(
      `select pr.*, i.name as item_name, s.name as shop_name, u.name as user_name, c.character_name
       from shop_purchase_requests pr
       join campaign_shop_items i on i.id = pr.item_id
       join campaign_shops s on s.id = pr.shop_id
       join users u on u.id = pr.user_id
       left join characters c on c.id = pr.character_id
       where pr.campaign_id = $1
       order by pr.created_at desc`,
      [campaignId]
    )
    : await query(
      `select pr.*, i.name as item_name, s.name as shop_name, c.character_name
       from shop_purchase_requests pr
       join campaign_shop_items i on i.id = pr.item_id
       join campaign_shops s on s.id = pr.shop_id
       left join characters c on c.id = pr.character_id
       where pr.campaign_id = $1 and pr.user_id = $2
       order by pr.created_at desc`,
      [campaignId, user.id]
    );
  return {
    shops: shops.rows.map((shop) => ({ ...shop, items: items.rows.filter((item) => item.shop_id === shop.id) })),
    requests: requests.rows,
    isMaster: master,
    categories: shopCategories
  };
}

router.get('/:id/shops', async (req, res) => {
  try {
    res.json(await loadShopPayload(req.params.id, req.user));
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível carregar lojas.' });
  }
});

router.post('/:id/shops', async (req, res) => {
  try {
    await assertCampaignMaster(req.params.id, req.user);
    const body = shopSchema.parse(req.body);
    const created = await query(
      `insert into campaign_shops (campaign_id, name, description, category, visible_to_players)
       values ($1,$2,$3,$4,$5) returning *`,
      [req.params.id, body.name.trim(), body.description, normalizeShopCategory(body.category), body.visibleToPlayers]
    );
    res.status(201).json(created.rows[0]);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível criar loja.' });
  }
});

router.put('/:id/shops/:shopId', async (req, res) => {
  try {
    await assertCampaignMaster(req.params.id, req.user);
    const body = shopSchema.parse(req.body);
    const updated = await query(
      `update campaign_shops set name=$1, description=$2, category=$3, visible_to_players=$4, updated_at=now()
       where id=$5 and campaign_id=$6 returning *`,
      [body.name.trim(), body.description, normalizeShopCategory(body.category), body.visibleToPlayers, req.params.shopId, req.params.id]
    );
    if (!updated.rowCount) return res.status(404).json({ message: 'Loja não encontrada.' });
    res.json(updated.rows[0]);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível editar loja.' });
  }
});

router.delete('/:id/shops/:shopId', async (req, res) => {
  try {
    await assertCampaignMaster(req.params.id, req.user);
    const deleted = await query('delete from campaign_shops where id=$1 and campaign_id=$2', [req.params.shopId, req.params.id]);
    if (!deleted.rowCount) return res.status(404).json({ message: 'Loja não encontrada.' });
    res.status(204).end();
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível excluir loja.' });
  }
});

router.post('/:id/shops/:shopId/items', async (req, res) => {
  try {
    await assertCampaignMaster(req.params.id, req.user);
    const body = shopItemSchema.parse(req.body);
    const shop = await query('select id from campaign_shops where id=$1 and campaign_id=$2', [req.params.shopId, req.params.id]);
    if (!shop.rowCount) return res.status(404).json({ message: 'Loja não encontrada.' });
    const created = await query(
      `insert into campaign_shop_items (shop_id, name, description, price_dracmas, stock, category, weight, available, note)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
      [req.params.shopId, body.name.trim(), body.description, body.priceDracmas, body.stock, body.category, body.weight, body.available, body.note]
    );
    res.status(201).json(created.rows[0]);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível criar item.' });
  }
});

router.put('/:id/shop-items/:itemId', async (req, res) => {
  try {
    await assertCampaignMaster(req.params.id, req.user);
    const body = shopItemSchema.parse(req.body);
    const updated = await query(
      `update campaign_shop_items i set name=$1, description=$2, price_dracmas=$3, stock=$4, category=$5, weight=$6, available=$7, note=$8, updated_at=now()
       from campaign_shops s
       where i.shop_id = s.id and s.campaign_id=$9 and i.id=$10
       returning i.*`,
      [body.name.trim(), body.description, body.priceDracmas, body.stock, body.category, body.weight, body.available, body.note, req.params.id, req.params.itemId]
    );
    if (!updated.rowCount) return res.status(404).json({ message: 'Item não encontrado.' });
    res.json(updated.rows[0]);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível editar item.' });
  }
});

router.delete('/:id/shop-items/:itemId', async (req, res) => {
  try {
    await assertCampaignMaster(req.params.id, req.user);
    const deleted = await query(
      `delete from campaign_shop_items i using campaign_shops s
       where i.shop_id=s.id and s.campaign_id=$1 and i.id=$2`,
      [req.params.id, req.params.itemId]
    );
    if (!deleted.rowCount) return res.status(404).json({ message: 'Item não encontrado.' });
    res.status(204).end();
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível remover item.' });
  }
});

router.post('/:id/purchase-requests', async (req, res) => {
  try {
    await requireCampaignMember(req.params.id, req.user);
    const body = purchaseSchema.parse(req.body);
    await assertOwnedCharacter(body.characterId, req.user.id);
    const item = await query(
      `select i.*, s.campaign_id, s.visible_to_players
       from campaign_shop_items i
       join campaign_shops s on s.id = i.shop_id
       where i.id=$1 and s.campaign_id=$2 and s.visible_to_players=true and i.available=true`,
      [body.itemId, req.params.id]
    );
    if (!item.rowCount) return res.status(404).json({ message: 'Item não disponível.' });
    if (item.rows[0].stock < body.quantity) return res.status(400).json({ message: 'Estoque insuficiente.' });
    const total = Number(item.rows[0].price_dracmas || 0) * body.quantity;
    const created = await query(
      `insert into shop_purchase_requests (campaign_id, shop_id, item_id, user_id, character_id, quantity, total_price)
       values ($1,$2,$3,$4,$5,$6,$7) returning *`,
      [req.params.id, item.rows[0].shop_id, body.itemId, req.user.id, body.characterId || null, body.quantity, total]
    );
    res.status(201).json(created.rows[0]);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível solicitar compra.' });
  }
});

async function decidePurchase(req, status) {
  const { note } = purchaseDecisionSchema.parse(req.body);
  await assertCampaignMaster(req.params.id, req.user);
  const existing = await query(
    `select pr.*, i.name as item_name, i.description as item_description, i.weight, i.stock, i.price_dracmas
     from shop_purchase_requests pr
     join campaign_shop_items i on i.id = pr.item_id
     where pr.id=$1 and pr.campaign_id=$2`,
    [req.params.requestId, req.params.id]
  );
  if (!existing.rowCount) {
    const error = new Error('Solicitação não encontrada.');
    error.status = 404;
    throw error;
  }
  const request = existing.rows[0];
  if (request.status !== 'pending') return request;
  if (status === 'approved') {
    if (request.stock < request.quantity) {
      const error = new Error('Estoque insuficiente.');
      error.status = 400;
      throw error;
    }
    if (request.character_id) {
      const character = await query('select * from characters where id=$1 and owner_id=$2', [request.character_id, request.user_id]);
      if (character.rowCount) {
        const wallet = parseJsonField(character.rows[0].wallet, {});
        const total = walletTotal(wallet);
        if (total < request.total_price) {
          const error = new Error('Dracmas insuficientes na carteira do personagem.');
          error.status = 400;
          throw error;
        }
        const inventory = parseJsonField(character.rows[0].inventory, []);
        inventory.push({
          id: crypto.randomUUID(),
          quantity: request.quantity,
          weight: Number(request.weight || 0),
          name: request.item_name,
          category: 'Compras',
          description: request.item_description || '',
          defenseBonus: 0
        });
        await query(
          'update characters set wallet=$1, inventory=$2, updated_at=now() where id=$3',
          [toJson(walletFromTotal(total - request.total_price)), toJson(inventory), request.character_id]
        );
      }
    }
    await query('update campaign_shop_items set stock = greatest(0, stock - $1), updated_at=now() where id=$2', [request.quantity, request.item_id]);
  }
  const updated = await query(
    `update shop_purchase_requests set status=$1, gm_note=$2, updated_at=now()
     where id=$3 and campaign_id=$4 returning *`,
    [status, note, req.params.requestId, req.params.id]
  );
  return updated.rows[0];
}

router.put('/:id/purchase-requests/:requestId/approve', async (req, res) => {
  try {
    res.json(await decidePurchase(req, 'approved'));
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível aprovar compra.' });
  }
});

router.put('/:id/purchase-requests/:requestId/deny', async (req, res) => {
  try {
    res.json(await decidePurchase(req, 'denied'));
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível negar compra.' });
  }
});

export default router;
