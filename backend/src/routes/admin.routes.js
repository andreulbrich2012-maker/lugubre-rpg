import { Router } from 'express';
import { z } from 'zod';
import { tryQuery } from '../db/pool.js';
import { createLocalCatalogItem, deleteLocalCatalogItem, updateLocalCatalogItem } from '../db/localStore.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

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

function toJson(value) {
  return JSON.stringify(value ?? null);
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

export default router;
