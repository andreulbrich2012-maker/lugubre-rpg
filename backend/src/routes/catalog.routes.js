import { Router } from 'express';
import { tryQuery } from '../db/pool.js';
import { getLocalCatalog } from '../db/localStore.js';

const router = Router();

router.get('/races', async (_, res) => {
  const result = await tryQuery('select * from races order by name');
  res.json(result?.rows || await getLocalCatalog('races'));
});

router.get('/classes', async (_, res) => {
  const result = await tryQuery('select * from classes order by name');
  res.json(result?.rows || await getLocalCatalog('classes'));
});

router.get('/origins', async (_, res) => {
  const result = await tryQuery('select * from origins order by name');
  res.json(result?.rows || await getLocalCatalog('origins'));
});

router.get('/skills', async (_, res) => {
  const result = await tryQuery('select id, "key", name, attribute from skills order by name');
  res.json(result?.rows || await getLocalCatalog('skills'));
});

export default router;
