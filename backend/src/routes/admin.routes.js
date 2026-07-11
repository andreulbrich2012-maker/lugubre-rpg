import { Router } from 'express';
import { z } from 'zod';
import { tryQuery } from '../db/pool.js';
import {
  createLocalCatalogItem,
  createLocalMonster,
  createLocalMonsterAttack,
  deleteLocalCatalogItem,
  deleteLocalMonster,
  deleteLocalMonsterAttack,
  updateLocalCatalogItem,
  updateLocalMonster,
  updateLocalMonsterAttack
} from '../db/localStore.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { parseDiceFormula } from '../utils/rules.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

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
  const result = await tryQuery('delete from races where id=$1', [req.params.id]);
  if (!result) await deleteLocalCatalogItem('races', req.params.id);
  res.status(204).end();
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
  const result = await tryQuery('delete from classes where id=$1', [req.params.id]);
  if (!result) await deleteLocalCatalogItem('classes', req.params.id);
  res.status(204).end();
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
  const result = await tryQuery('delete from origins where id=$1', [req.params.id]);
  if (!result) await deleteLocalCatalogItem('origins', req.params.id);
  res.status(204).end();
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
  const result = await tryQuery('delete from skills where id=$1', [req.params.id]);
  if (!result) await deleteLocalCatalogItem('skills', req.params.id);
  res.status(204).end();
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
  const result = await tryQuery('delete from monsters where id=$1', [req.params.id]);
  if (!result) await deleteLocalMonster(req.params.id);
  res.status(204).end();
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
  const result = await tryQuery('delete from monster_attacks where id=$1', [req.params.attackId]);
  if (!result) await deleteLocalMonsterAttack(req.params.attackId);
  res.status(204).end();
});

export default router;
