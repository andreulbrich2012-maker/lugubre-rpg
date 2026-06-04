import { Router } from 'express';
import { tryQuery } from '../db/pool.js';
import { getLocalDashboard } from '../db/localStore.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const result = await tryQuery(
    `select
       (select count(*)::int from characters where owner_id = $1) as characters_count,
       (select count(*)::int from campaign_members where user_id = $1) as campaigns_count`,
    [req.user.id]
  );

  if (result?.rows?.[0]) {
    const [characters, campaigns] = await Promise.all([
      tryQuery('select id, character_name, player_name, updated_at from characters where owner_id = $1 order by updated_at desc limit 3', [req.user.id]),
      tryQuery(
        `select c.id, c.name, c.description, c.invite_code, cm.role as member_role
         from campaigns c
         join campaign_members cm on cm.campaign_id = c.id
         where cm.user_id = $1
         order by c.created_at desc limit 3`,
        [req.user.id]
      )
    ]);
    return res.json({
      ...result.rows[0],
      recent_characters: characters?.rows || [],
      recent_campaigns: campaigns?.rows || []
    });
  }

  res.json(await getLocalDashboard(req.user.id));
});

export default router;
