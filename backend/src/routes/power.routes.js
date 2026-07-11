import { Router } from 'express';
import { query } from '../db/pool.js';
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
  const result = await query(
    `select *
     from power_library
     ${sql}
     order by type, element nulls last, recommended_level, name`,
    params
  );
  res.json(result.rows);
});

router.get('/:id', async (req, res) => {
  const result = await query('select * from power_library where id = $1', [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ message: 'Poder ou magia não encontrado.' });
  res.json(result.rows[0]);
});

export default router;
