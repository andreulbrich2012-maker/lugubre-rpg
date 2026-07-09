import { Router } from 'express';
import { tryQuery } from '../db/pool.js';
import { getLocalMonster, listLocalMonsters } from '../db/localStore.js';
import { requireAuth } from '../middleware/auth.js';
import { rollDiceFormula } from '../utils/rules.js';

const router = Router();
router.use(requireAuth);

function parseJsonField(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeMonster(row) {
  if (!row) return null;
  return {
    ...row,
    image_url: row.image_url || '',
    token_url: row.token_url || row.image_url || '',
    items: parseJsonField(row.items, []),
    attacks: Array.isArray(row.attacks) ? row.attacks : parseJsonField(row.attacks, [])
  };
}

async function monsterRows(category = '') {
  const params = [];
  const where = category ? 'where lower(m.category) = lower($1)' : '';
  if (category) params.push(category);
  const result = await tryQuery(
    `select m.*,
       coalesce(
         json_agg(
           json_build_object(
             'id', a.id,
             'monster_id', a.monster_id,
             'name', a.name,
             'damage_formula', a.damage_formula,
             'description', coalesce(a.description, ''),
             'created_at', a.created_at,
             'updated_at', a.updated_at
           )
           order by a.created_at
         ) filter (where a.id is not null),
         '[]'::json
       ) as attacks
     from monsters m
     left join monster_attacks a on a.monster_id = m.id
     ${where}
     group by m.id
     order by m.name`,
    params
  );
  return result?.rows?.map(normalizeMonster) || listLocalMonsters(category);
}

async function findMonster(id) {
  const result = await tryQuery(
    `select m.*,
       coalesce(
         json_agg(
           json_build_object(
             'id', a.id,
             'monster_id', a.monster_id,
             'name', a.name,
             'damage_formula', a.damage_formula,
             'description', coalesce(a.description, ''),
             'created_at', a.created_at,
             'updated_at', a.updated_at
           )
           order by a.created_at
         ) filter (where a.id is not null),
         '[]'::json
       ) as attacks
     from monsters m
     left join monster_attacks a on a.monster_id = m.id
     where m.id = $1
     group by m.id`,
    [id]
  );
  return normalizeMonster(result?.rows?.[0]) || getLocalMonster(id);
}

router.get('/', async (req, res) => {
  res.json(await monsterRows(req.query.category || ''));
});

router.get('/:id', async (req, res) => {
  const monster = await findMonster(req.params.id);
  if (!monster) return res.status(404).json({ message: 'Monstro nao encontrado.' });
  res.json(monster);
});

router.post('/:id/attacks/:attackId/roll', async (req, res) => {
  const monster = await findMonster(req.params.id);
  if (!monster) return res.status(404).json({ message: 'Monstro nao encontrado.' });
  const attack = monster.attacks.find((item) => item.id === req.params.attackId);
  if (!attack) return res.status(404).json({ message: 'Ataque nao encontrado.' });
  const result = rollDiceFormula(attack.damage_formula);
  res.json({
    monster: { id: monster.id, name: monster.name },
    attack: { id: attack.id, name: attack.name, damage_formula: attack.damage_formula },
    ...result
  });
});

export default router;
