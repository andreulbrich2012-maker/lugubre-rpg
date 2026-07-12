import { Router } from 'express';
import { tryQuery } from '../db/pool.js';
import { getLocalPower, listLocalPowers } from '../db/localStore.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function filters(req) {
  const params = [];
  const where = [];
  const search = String(req.query.search || '').trim();
  const type = String(req.query.type || '').trim();
  const element = String(req.query.element || '').trim();
  const recommendedClass = String(req.query.class || '').trim();

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where.push(`(lower(name) like $${params.length} or lower(description) like $${params.length})`);
  }
  if (['magia', 'poder'].includes(type)) {
    params.push(type);
    where.push(`type = $${params.length}`);
  }
  if (element) {
    params.push(element);
    where.push(`element = $${params.length}`);
  }
  if (recommendedClass) {
    params.push(`%${recommendedClass.toLowerCase()}%`);
    where.push(`lower(coalesce(recommended_class, '')) like $${params.length}`);
  }

  return {
    params,
    sql: where.length ? `where ${where.join(' and ')}` : ''
  };
}

router.get('/', async (req, res) => {
  const { params, sql } = filters(req);
  const result = await tryQuery(
    `select *
     from power_library
     ${sql}
     order by type, element nulls last, recommended_level, name`,
    params
  );
  let rows = result?.rows || await listLocalPowers();
  if (!result) {
    const search = String(req.query.search || '').trim().toLowerCase();
    const type = String(req.query.type || '').trim();
    const element = String(req.query.element || '').trim();
    const recommendedClass = String(req.query.class || '').trim().toLowerCase();
    rows = rows.filter((power) => {
      if (search && !`${power.name || ''} ${power.description || ''}`.toLowerCase().includes(search)) return false;
      if (type && power.type !== type) return false;
      if (element && power.element !== element) return false;
      if (recommendedClass && !String(power.recommended_class || '').toLowerCase().includes(recommendedClass)) return false;
      return true;
    });
  }
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const result = await tryQuery('select * from power_library where id = $1', [req.params.id]);
  const power = result?.rows?.[0] || await getLocalPower(req.params.id);
  if (!power) return res.status(404).json({ message: 'Poder ou magia nao encontrado.' });
  res.json(power);
});

export default router;
