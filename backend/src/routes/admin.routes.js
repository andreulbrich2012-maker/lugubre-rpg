import { Router } from 'express';
import { z } from 'zod';
import { tryQuery } from '../db/pool.js';
import {
  createLocalCatalogItem,
  createLocalMonster,
  createLocalMonsterAttack,
  createLocalPower,
  deleteLocalCatalogItem,
  deleteLocalFeedback,
  deleteLocalMonster,
  deleteLocalMonsterAttack,
  deleteLocalPower,
  getLocalFeedback,
  listLocalFeedbacks,
  updateLocalCatalogItem,
  updateLocalFeedback,
  updateLocalMonster,
  updateLocalMonsterAttack,
  updateLocalPower
} from '../db/localStore.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { parseDiceFormula } from '../utils/rules.js';
import { feedbackPriorities, feedbackStatuses, feedbackTypes } from './feedback.routes.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
  const original = router[method].bind(router);
  router[method] = (...args) => original(...args.map((arg) => (typeof arg === 'function' ? asyncRoute(arg) : arg)));
}

const monsterCategories = ['Caos', 'Gaia', 'Ponto', 'Érebo', 'Nix', 'Tártaro', 'Éter', 'Ananque'];

const raceSchema = z.object({
  name: z.string().min(2),
  image: z.string().optional().nullable(),
  attributeModifiers: z.record(z.coerce.number()).default({})
});

const classSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().default(''),
  image: z.string().optional().nullable(),
  progression: z.array(z.object({
    level: z.coerce.number().min(1).max(20),
    mana: z.coerce.number().min(0),
    feature: z.string().min(1)
  })).default([])
});

const originSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().default(''),
  skillModifiers: z.record(z.coerce.number()).default({})
});

const skillSchema = z.object({
  name: z.string().min(2),
  key: z.string().min(2).regex(/^[a-z0-9_]+$/),
  attribute: z.enum(['forca', 'agilidade', 'intelecto', 'vigor', 'presenca']).default('presenca')
});

const monsterAttackSchema = z.object({
  name: z.string().min(2),
  damageFormula: z.string().min(3),
  description: z.string().optional().default('')
});

const monsterSchema = z.object({
  name: z.string().min(2),
  imageUrl: z.string().optional().default(''),
  tokenUrl: z.string().optional().default(''),
  category: z.string().min(2).default('Caos'),
  difficulty: z.string().min(2).default('Média'),
  baseHealth: z.coerce.number().min(0).default(8),
  armor: z.coerce.number().min(0).default(10),
  items: z.union([z.array(z.string()), z.string()]).optional().default([]),
  description: z.string().optional().default(''),
  attacks: z.array(monsterAttackSchema).optional()
});
const powerElements = ['Érebo', 'Nix', 'Tártaro', 'Ananque', 'Éter', 'Gaia', 'Caos', 'Hemera', 'Ponto'];
const powerLibrarySchema = z.object({
  name: z.string().min(2).max(140),
  type: z.enum(['magia', 'poder']).default('magia'),
  element: z.string().optional().nullable(),
  description: z.string().optional().default(''),
  manaCost: z.coerce.number().min(0).default(0),
  damageFormula: z.string().optional().default(''),
  range: z.string().optional().default(''),
  duration: z.string().optional().default(''),
  requirement: z.string().optional().default(''),
  recommendedClass: z.string().optional().default(''),
  recommendedLevel: z.coerce.number().min(1).max(20).default(1),
  imageUrl: z.string().optional().default('')
});
const feedbackStatusSchema = z.object({
  status: z.enum(feedbackStatuses)
});
const feedbackResponseSchema = z.object({
  adminResponse: z.string().trim().max(8000).optional().default('')
});

function toJson(value) {
  return JSON.stringify(value ?? null);
}

function healthRange(baseHealth) {
  const base = Math.max(0, Number(baseHealth || 0));
  return {
    base_health: base,
    min_health: Math.max(0, base - 4),
    max_health: base + 4
  };
}

function normalizeItems(items) {
  if (Array.isArray(items)) return items.map((item) => item.trim()).filter(Boolean);
  return String(items || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizeMonsterCategory(category) {
  const value = String(category || '').trim();
  if (monsterCategories.includes(value)) return value;
  const key = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const aliases = {
    caos: 'Caos',
    gaia: 'Gaia',
    ponto: 'Ponto',
    erebo: 'Érebo',
    nix: 'Nix',
    tartaro: 'Tártaro',
    eter: 'Éter',
    ananque: 'Ananque',
    elementais: 'Caos',
    'criaturas do caos': 'Caos',
    feras: 'Gaia',
    'mortos-vivos': 'Tártaro',
    demonios: 'Tártaro',
    aberracoes: 'Tártaro',
    humanoides: 'Ananque',
    construtos: 'Ananque',
    espiritos: 'Nix',
    outros: 'Caos'
  };
  return aliases[key] || 'Caos';
}

function monsterPayload(body) {
  const parsed = monsterSchema.parse(body);
  for (const attack of parsed.attacks || []) parseDiceFormula(attack.damageFormula);
  return {
    name: parsed.name,
    image_url: parsed.imageUrl || '',
    token_url: parsed.tokenUrl || parsed.imageUrl || '',
    category: normalizeMonsterCategory(parsed.category),
    difficulty: parsed.difficulty,
    ...healthRange(parsed.baseHealth),
    armor: parsed.armor,
    items: normalizeItems(parsed.items),
    description: parsed.description,
    attacks: parsed.attacks?.map((attack) => ({
      name: attack.name,
      damage_formula: attack.damageFormula,
      description: attack.description || ''
    }))
  };
}

function attackPayload(body) {
  const parsed = monsterAttackSchema.parse(body);
  parseDiceFormula(parsed.damageFormula);
  return {
    name: parsed.name,
    damage_formula: parsed.damageFormula,
    description: parsed.description || ''
  };
}

function normalizePowerElement(type, element) {
  if (type !== 'magia') return null;
  const value = String(element || '').trim();
  return powerElements.includes(value) ? value : 'Érebo';
}

function powerPayload(body) {
  const parsed = powerLibrarySchema.parse(body);
  if (parsed.damageFormula) parseDiceFormula(parsed.damageFormula);
  return {
    name: parsed.name.trim(),
    type: parsed.type,
    element: normalizePowerElement(parsed.type, parsed.element),
    description: parsed.description || '',
    mana_cost: parsed.manaCost,
    damage_formula: parsed.damageFormula || '',
    range: parsed.range || '',
    duration: parsed.duration || '',
    requirement: parsed.requirement || '',
    recommended_class: parsed.recommendedClass || '',
    recommended_level: parsed.recommendedLevel,
    image_url: parsed.imageUrl || ''
  };
}

function feedbackSelect(extra = '') {
  return `
    select f.*,
           u.name as user_name,
           u.email as user_email,
           admin.name as admin_name
    from feedbacks f
    join users u on u.id = f.user_id
    left join users admin on admin.id = f.admin_id
    ${extra}
  `;
}

async function deleteRecord({ sql, params, notFoundMessage, localDelete }) {
  const result = await tryQuery(sql, params);
  if (result) {
    if (!result.rowCount) {
      return { status: 404, body: { success: false, message: notFoundMessage } };
    }
    return { status: 200, body: { success: true, message: 'Item excluido com sucesso.' } };
  }

  const deleted = await localDelete?.();
  if (!deleted) {
    return { status: 404, body: { success: false, message: notFoundMessage } };
  }
  return { status: 200, body: { success: true, message: 'Item excluido com sucesso.' } };
}

function parseFeedbackFilters(query) {
  const filters = [];
  const params = [];
  if (feedbackTypes.includes(query.type)) {
    params.push(query.type);
    filters.push(`f.type = $${params.length}`);
  }
  if (feedbackPriorities.includes(query.priority)) {
    params.push(query.priority);
    filters.push(`f.priority = $${params.length}`);
  }
  if (feedbackStatuses.includes(query.status)) {
    params.push(query.status);
    filters.push(`f.status = $${params.length}`);
  }
  if (String(query.search || '').trim()) {
    params.push(`%${String(query.search).trim()}%`);
    filters.push(`(f.title ilike $${params.length} or u.name ilike $${params.length} or u.email ilike $${params.length})`);
  }
  return {
    where: filters.length ? `where ${filters.join(' and ')}` : '',
    params
  };
}

router.get('/feedbacks', async (req, res) => {
  const { where, params } = parseFeedbackFilters(req.query);
  const result = await tryQuery(
    `${feedbackSelect(where)}
     order by f.created_at desc
     limit 250`,
    params
  );
  res.json(result?.rows || await listLocalFeedbacks(req.query));
});

router.get('/feedbacks/:id', async (req, res) => {
  const result = await tryQuery(`${feedbackSelect('where f.id = $1')}`, [req.params.id]);
  const feedback = result?.rows?.[0] || await getLocalFeedback(req.params.id);
  if (!feedback) return res.status(404).json({ message: 'Feedback nao encontrado.' });
  res.json(feedback);
});

router.put('/feedbacks/:id/status', async (req, res) => {
  const parsed = feedbackStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Status invalido.' });
  const result = await tryQuery(
    `update feedbacks
     set status=$1, updated_at=now()
     where id=$2
     returning *`,
    [parsed.data.status, req.params.id]
  );
  const feedback = result?.rows?.[0] || await updateLocalFeedback(req.params.id, { status: parsed.data.status });
  if (!feedback) return res.status(404).json({ message: 'Feedback nao encontrado.' });
  res.json(feedback);
});

router.put('/feedbacks/:id/response', async (req, res) => {
  const parsed = feedbackResponseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Resposta invalida.' });
  const response = parsed.data.adminResponse || '';
  const result = await tryQuery(
    `update feedbacks
     set admin_response=$1,
         admin_id=$2,
         responded_at=case when $1 = '' then null else now() end,
         updated_at=now()
     where id=$3
     returning *`,
    [response, req.user.id, req.params.id]
  );
  const feedback = result?.rows?.[0] || await updateLocalFeedback(req.params.id, {
    admin_response: response,
    admin_id: response ? req.user.id : null,
    responded_at: response ? new Date().toISOString() : null
  });
  if (!feedback) return res.status(404).json({ message: 'Feedback nao encontrado.' });
  res.json(feedback);
});

router.delete('/feedbacks/:id', async (req, res) => {
  const deleted = await deleteRecord({
    sql: 'delete from feedbacks where id=$1',
    params: [req.params.id],
    notFoundMessage: 'Feedback nao encontrado ou ja excluido.',
    localDelete: () => deleteLocalFeedback(req.params.id)
  });
  res.status(deleted.status).json(deleted.body);
});

router.post('/races', async (req, res) => {
  const body = raceSchema.parse(req.body);
  const payload = { name: body.name, image: body.image || '', attribute_modifiers: body.attributeModifiers };
  const result = await tryQuery('insert into races (name, image, attribute_modifiers) values ($1, $2, $3) returning *', [payload.name, payload.image, toJson(payload.attribute_modifiers)]);
  res.status(201).json(result?.rows?.[0] || await createLocalCatalogItem('races', payload));
});

router.put('/races/:id', async (req, res) => {
  const body = raceSchema.parse(req.body);
  const payload = { name: body.name, image: body.image || '', attribute_modifiers: body.attributeModifiers };
  const result = await tryQuery('update races set name=$1, image=$2, attribute_modifiers=$3 where id=$4 returning *', [payload.name, payload.image, toJson(payload.attribute_modifiers), req.params.id]);
  res.json(result?.rows?.[0] || await updateLocalCatalogItem('races', req.params.id, payload));
});

router.delete('/races/:id', async (req, res) => {
  const deleted = await deleteRecord({
    sql: 'delete from races where id=$1',
    params: [req.params.id],
    notFoundMessage: 'Raca nao encontrada ou ja excluida.',
    localDelete: () => deleteLocalCatalogItem('races', req.params.id)
  });
  res.status(deleted.status).json(deleted.body);
});

router.post('/classes', async (req, res) => {
  const body = classSchema.parse(req.body);
  const payload = { name: body.name, description: body.description, image: body.image || '', progression: body.progression };
  const result = await tryQuery('insert into classes (name, description, image, progression) values ($1, $2, $3, $4) returning *', [payload.name, payload.description, payload.image, toJson(payload.progression)]);
  res.status(201).json(result?.rows?.[0] || await createLocalCatalogItem('classes', payload));
});

router.put('/classes/:id', async (req, res) => {
  const body = classSchema.parse(req.body);
  const payload = { name: body.name, description: body.description, image: body.image || '', progression: body.progression };
  const result = await tryQuery('update classes set name=$1, description=$2, image=$3, progression=$4 where id=$5 returning *', [payload.name, payload.description, payload.image, toJson(payload.progression), req.params.id]);
  res.json(result?.rows?.[0] || await updateLocalCatalogItem('classes', req.params.id, payload));
});

router.delete('/classes/:id', async (req, res) => {
  const deleted = await deleteRecord({
    sql: 'delete from classes where id=$1',
    params: [req.params.id],
    notFoundMessage: 'Classe nao encontrada ou ja excluida.',
    localDelete: () => deleteLocalCatalogItem('classes', req.params.id)
  });
  res.status(deleted.status).json(deleted.body);
});

router.post('/origins', async (req, res) => {
  const body = originSchema.parse(req.body);
  const payload = { name: body.name, description: body.description, skill_modifiers: body.skillModifiers };
  const result = await tryQuery('insert into origins (name, description, skill_modifiers) values ($1, $2, $3) returning *', [payload.name, payload.description, toJson(payload.skill_modifiers)]);
  res.status(201).json(result?.rows?.[0] || await createLocalCatalogItem('origins', payload));
});

router.put('/origins/:id', async (req, res) => {
  const body = originSchema.parse(req.body);
  const payload = { name: body.name, description: body.description, skill_modifiers: body.skillModifiers };
  const result = await tryQuery('update origins set name=$1, description=$2, skill_modifiers=$3 where id=$4 returning *', [payload.name, payload.description, toJson(payload.skill_modifiers), req.params.id]);
  res.json(result?.rows?.[0] || await updateLocalCatalogItem('origins', req.params.id, payload));
});

router.delete('/origins/:id', async (req, res) => {
  const deleted = await deleteRecord({
    sql: 'delete from origins where id=$1',
    params: [req.params.id],
    notFoundMessage: 'Origem nao encontrada ou ja excluida.',
    localDelete: () => deleteLocalCatalogItem('origins', req.params.id)
  });
  res.status(deleted.status).json(deleted.body);
});

router.post('/skills', async (req, res) => {
  const body = skillSchema.parse(req.body);
  const result = await tryQuery('insert into skills (name, "key", attribute) values ($1, $2, $3) returning id, "key", name, attribute', [body.name, body.key, body.attribute]);
  res.status(201).json(result?.rows?.[0] || await createLocalCatalogItem('skills', body));
});

router.put('/skills/:id', async (req, res) => {
  const body = skillSchema.parse(req.body);
  const result = await tryQuery('update skills set name=$1, "key"=$2, attribute=$3 where id=$4 returning id, "key", name, attribute', [body.name, body.key, body.attribute, req.params.id]);
  res.json(result?.rows?.[0] || await updateLocalCatalogItem('skills', req.params.id, body));
});

router.delete('/skills/:id', async (req, res) => {
  const deleted = await deleteRecord({
    sql: 'delete from skills where id=$1',
    params: [req.params.id],
    notFoundMessage: 'Pericia nao encontrada ou ja excluida.',
    localDelete: () => deleteLocalCatalogItem('skills', req.params.id)
  });
  res.status(deleted.status).json(deleted.body);
});

router.post('/monsters', async (req, res) => {
  const payload = monsterPayload(req.body);
  const result = await tryQuery(
    `insert into monsters (name, image_url, token_url, category, difficulty, base_health, min_health, max_health, armor, items, description)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     returning *`,
    [payload.name, payload.image_url, payload.token_url, payload.category, payload.difficulty, payload.base_health, payload.min_health, payload.max_health, payload.armor, toJson(payload.items), payload.description]
  );
  let monster = result?.rows?.[0] || await createLocalMonster(payload);
  if (result && payload.attacks?.length) {
    const attacks = [];
    for (const attack of payload.attacks) {
      const created = await tryQuery(
        'insert into monster_attacks (monster_id, name, damage_formula, description) values ($1, $2, $3, $4) returning *',
        [monster.id, attack.name, attack.damage_formula, attack.description]
      );
      attacks.push(created.rows[0]);
    }
    monster = { ...monster, attacks };
  }
  res.status(201).json(monster);
});

router.put('/monsters/:id', async (req, res) => {
  const payload = monsterPayload(req.body);
  const result = await tryQuery(
    `update monsters set name=$1, image_url=$2, token_url=$3, category=$4, difficulty=$5,
     base_health=$6, min_health=$7, max_health=$8, armor=$9, items=$10, description=$11, updated_at=now()
     where id=$12 returning *`,
    [payload.name, payload.image_url, payload.token_url, payload.category, payload.difficulty, payload.base_health, payload.min_health, payload.max_health, payload.armor, toJson(payload.items), payload.description, req.params.id]
  );
  let monster = result?.rows?.[0] || await updateLocalMonster(req.params.id, payload);
  if (!monster) return res.status(404).json({ message: 'Monstro nao encontrado.' });
  if (Array.isArray(payload.attacks)) {
    if (result) {
      await tryQuery('delete from monster_attacks where monster_id=$1', [req.params.id]);
      const attacks = [];
      for (const attack of payload.attacks) {
        const created = await tryQuery(
          'insert into monster_attacks (monster_id, name, damage_formula, description) values ($1, $2, $3, $4) returning *',
          [req.params.id, attack.name, attack.damage_formula, attack.description]
        );
        attacks.push(created.rows[0]);
      }
      monster = { ...monster, attacks };
    } else {
      monster = await updateLocalMonster(req.params.id, payload);
    }
  }
  res.json(monster);
});

router.delete('/monsters/:id', async (req, res) => {
  const deleted = await deleteRecord({
    sql: 'delete from monsters where id=$1',
    params: [req.params.id],
    notFoundMessage: 'Monstro nao encontrado ou ja excluido.',
    localDelete: () => deleteLocalMonster(req.params.id)
  });
  res.status(deleted.status).json(deleted.body);
});

router.post('/monsters/:id/attacks', async (req, res) => {
  const payload = attackPayload(req.body);
  const result = await tryQuery(
    'insert into monster_attacks (monster_id, name, damage_formula, description) values ($1, $2, $3, $4) returning *',
    [req.params.id, payload.name, payload.damage_formula, payload.description]
  );
  const attack = result?.rows?.[0] || await createLocalMonsterAttack(req.params.id, payload);
  if (!attack) return res.status(404).json({ message: 'Monstro nao encontrado.' });
  res.status(201).json(attack);
});

router.put('/monster-attacks/:attackId', async (req, res) => {
  const payload = attackPayload(req.body);
  const result = await tryQuery(
    'update monster_attacks set name=$1, damage_formula=$2, description=$3, updated_at=now() where id=$4 returning *',
    [payload.name, payload.damage_formula, payload.description, req.params.attackId]
  );
  const attack = result?.rows?.[0] || await updateLocalMonsterAttack(req.params.attackId, payload);
  if (!attack) return res.status(404).json({ message: 'Ataque nao encontrado.' });
  res.json(attack);
});

router.delete('/monster-attacks/:attackId', async (req, res) => {
  const deleted = await deleteRecord({
    sql: 'delete from monster_attacks where id=$1',
    params: [req.params.attackId],
    notFoundMessage: 'Ataque nao encontrado ou ja excluido.',
    localDelete: () => deleteLocalMonsterAttack(req.params.attackId)
  });
  res.status(deleted.status).json(deleted.body);
});

router.post('/powers', async (req, res) => {
  const payload = powerPayload(req.body);
  const result = await tryQuery(
    `insert into power_library (name, type, element, description, mana_cost, damage_formula, range, duration, requirement, recommended_class, recommended_level, image_url)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     returning *`,
    [payload.name, payload.type, payload.element, payload.description, payload.mana_cost, payload.damage_formula, payload.range, payload.duration, payload.requirement, payload.recommended_class, payload.recommended_level, payload.image_url]
  );
  res.status(201).json(result?.rows?.[0] || await createLocalPower(payload));
});

router.put('/powers/:id', async (req, res) => {
  const payload = powerPayload(req.body);
  const result = await tryQuery(
    `update power_library
     set name=$1, type=$2, element=$3, description=$4, mana_cost=$5, damage_formula=$6,
         range=$7, duration=$8, requirement=$9, recommended_class=$10, recommended_level=$11, image_url=$12, updated_at=now()
     where id=$13
     returning *`,
    [payload.name, payload.type, payload.element, payload.description, payload.mana_cost, payload.damage_formula, payload.range, payload.duration, payload.requirement, payload.recommended_class, payload.recommended_level, payload.image_url, req.params.id]
  );
  const power = result?.rows?.[0] || await updateLocalPower(req.params.id, payload);
  if (!power) return res.status(404).json({ message: 'Poder ou magia nao encontrado.' });
  res.json(power);
});

router.delete('/powers/:id', async (req, res) => {
  const deleted = await deleteRecord({
    sql: 'delete from power_library where id=$1',
    params: [req.params.id],
    notFoundMessage: 'Poder ou magia nao encontrado ou ja excluido.',
    localDelete: () => deleteLocalPower(req.params.id)
  });
  res.status(deleted.status).json(deleted.body);
});

export default router;
