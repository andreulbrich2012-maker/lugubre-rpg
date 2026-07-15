import { Router } from 'express';
import { tryQuery } from '../db/pool.js';
import { listLocalDeveloperPosts } from '../db/localStore.js';

const router = Router();

router.get('/developer-posts', async (_, res) => {
  const result = await tryQuery(
    `select id, title, short_description, full_description, image_url, category, published_at, created_at, updated_at
     from developer_posts
     where is_visible = true
     order by published_at desc, created_at desc
     limit 12`
  );
  res.json(result?.rows || await listLocalDeveloperPosts());
});

export default router;
