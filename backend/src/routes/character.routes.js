import { Router } from 'express';
import { z } from 'zod';
import { tryQuery } from '../db/pool.js';
import {
  createLocalCharacter,
  deleteLocalCharacter,
  getLocalCatalog,
  getLocalCharacter,
  listLocalCharacters,
  updateLocalCharacter
} from '../db/localStore.js';
import { requireAuth } from '../middleware/auth.js';
import { applyRaceModifiers, baseAttributes, baseSkills, calculateDefense, calculateDodge } from '../utils/rules.js';

const router = Router();
router.use(requireAuth);

const itemSchema = z.object({
  name: z.string().min(1),
  weight: z.coerce.number().min(0),
  description: z.string().optional().default(''),
  defenseBonus: z.coerce.number().default(0)
});

const characterSchema = z.object({
  playerName: z.string().min(1),
  characterName: z.string().min(1),
  photo: z.string().optional().nullable(),
  raceId: z.string().optional().nullable(),
  classId: z.string().optional().nullable(),
  originId: z.string().optional().nullable(),
  origin: z.string().optional().default(''),
  level: z.coerce.number().min(1).max(20).default(1),
  lifeCurrent: z.coerce.number().min(0).default(63),
  lifeMax: z.coerce.number().min(0).default(63),
  sanityCurrent: z.coerce.number().min(0).default(52),
  sanityMax: z.coerce.number().min(0).default(52),
  mana: z.coerce.number().min(0).default(0),
  manaMax: z.coerce.number().min(0).optional(),
  defense: z.coerce.number().min(0).default(10),
  attributes: z.record(z.coerce.number()).default(baseAttributes()),
  skills: z.record(z.coerce.number()).optional(),
  inventory: z.array(itemSchema).default([])
});

async function skillKeys() {
  const result = await tryQuery('select "key" from skills order by name');
  return result?.rows?.map((skill) => skill.key) || (await getLocalCatalog('skills')).map((skill) => skill.key);
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

function characterSnapshot(row) {
  return {
    character_name: row.character_name,
    player_name: row.player_name,
    level: row.level,
    life_current: row.life_current,
    life_max: row.life_max,
    sanity_current: row.sanity_current,
    sanity_max: row.sanity_max,
    mana: row.mana,
    mana_max: row.mana_max,
    defense: row.defense,
    attributes: parseJsonField(row.attributes, {}),
    skills: parseJsonField(row.skills, {}),
    inventory: parseJsonField(row.inventory, [])
  };
}

async function recordCharacterSave(row, label = 'Salvamento') {
  if (!row?.id) return [];
  const result = await tryQuery(
    'insert into character_saves (character_id, label, snapshot) values ($1, $2, $3) returning id, label, saved_at',
    [row.id, label, toJson(characterSnapshot(row))]
  );
  if (result) {
    await tryQuery(
      `delete from character_saves
       where character_id = $1
         and id not in (
           select id from character_saves
           where character_id = $1
           order by saved_at desc
           limit 3
         )`,
      [row.id]
    );
    const saves = await tryQuery(
      'select id, label, saved_at from character_saves where character_id = $1 order by saved_at desc limit 3',
      [row.id]
    );
    return saves?.rows || [];
  }
  return row.save_history || [];
}

async function normalizeCharacter(body, currentSkills = null) {
  const data = characterSchema.parse(body);
  let modifiers = {};
  if (data.raceId) {
    const race = await tryQuery('select attribute_modifiers from races where id = $1', [data.raceId]);
    if (race?.rows?.[0]) modifiers = parseJsonField(race.rows[0].attribute_modifiers, {});
    else modifiers = (await getLocalCatalog('races')).find((item) => item.id === data.raceId)?.attribute_modifiers || {};
  }
  const attributes = applyRaceModifiers(baseAttributes(), modifiers);
  let origin = null;
  if (data.originId) {
    const result = await tryQuery('select skill_modifiers from origins where id = $1', [data.originId]);
    origin = result?.rows?.[0] || (await getLocalCatalog('origins')).find((item) => item.id === data.originId);
  }
  const originSkills = parseJsonField(origin?.skill_modifiers, {});
  const base = baseSkills(await skillKeys());
  const createdSkills = Object.fromEntries(Object.keys(base).map((key) => [key, Number(base[key] || 0) + Number(originSkills[key] || 0)]));
  return {
    ...data,
    manaMax: data.manaMax ?? data.mana,
    attributes,
    skills: currentSkills || data.skills || createdSkills
  };
}

async function enrich(row) {
  const [racesResult, classesResult, originsResult, skillsResult] = await Promise.all([
    tryQuery('select * from races order by name'),
    tryQuery('select * from classes order by name'),
    tryQuery('select * from origins order by name'),
    tryQuery('select id, "key", name, attribute from skills order by name')
  ]);
  const [races, classes, origins, skillsCatalog] = await Promise.all([
    racesResult?.rows || getLocalCatalog('races'),
    classesResult?.rows || getLocalCatalog('classes'),
    originsResult?.rows || getLocalCatalog('origins'),
    skillsResult?.rows || getLocalCatalog('skills')
  ]);
  const attributes = parseJsonField(row.attributes, baseAttributes());
  const inventory = parseJsonField(row.inventory, []);
  const skills = { ...baseSkills(skillsCatalog.map((skill) => skill.key)), ...parseJsonField(row.skills, {}) };
  const savesResult = await tryQuery(
    'select id, label, saved_at from character_saves where character_id = $1 order by saved_at desc limit 3',
    [row.id]
  );
  return {
    ...row,
    attributes,
    skills,
    inventory,
    save_history: savesResult?.rows || row.save_history || [],
    skills_catalog: skillsCatalog,
    race_name: row.race_name || races.find((item) => item.id === row.race_id)?.name,
    class_name: row.class_name || classes.find((item) => item.id === row.class_id)?.name,
    origin_name: row.origin_name || origins.find((item) => item.id === row.origin_id)?.name || row.origin,
    dodge: calculateDodge(attributes),
    total_defense: calculateDefense(row.defense, inventory)
  };
}

router.get('/', async (req, res) => {
  const result = await tryQuery(
    `select c.*, r.name as race_name, cl.name as class_name, o.name as origin_name
     from characters c
     left join races r on r.id = c.race_id
     left join classes cl on cl.id = c.class_id
     left join origins o on o.id = c.origin_id
     where c.owner_id = $1
     order by c.updated_at desc`,
    [req.user.id]
  );
  const rows = result?.rows || await listLocalCharacters(req.user.id);
  res.json(await Promise.all(rows.map(enrich)));
});

router.post('/', async (req, res) => {
  const data = await normalizeCharacter({ ...req.body, skills: undefined });
  const result = await tryQuery(
    `insert into characters
     (owner_id, player_name, character_name, photo, race_id, class_id, origin_id, origin, level, life_current, life_max, sanity_current, sanity_max, mana, mana_max, defense, attributes, skills, inventory)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     returning *`,
    [req.user.id, data.playerName, data.characterName, data.photo, data.raceId || null, data.classId || null, data.originId || null, data.origin, data.level, data.lifeCurrent, data.lifeMax, data.sanityCurrent, data.sanityMax, data.mana, data.manaMax, data.defense, toJson(data.attributes), toJson(data.skills), toJson(data.inventory)]
  );
  const row = result?.rows?.[0] || await createLocalCharacter(req.user.id, data);
  await recordCharacterSave(row, 'Criacao da ficha');
  res.status(201).json(await enrich(row));
});

router.get('/:id', async (req, res) => {
  const result = await tryQuery('select * from characters where id = $1 and owner_id = $2', [req.params.id, req.user.id]);
  const row = result?.rows?.[0] || await getLocalCharacter(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Ficha não encontrada.' });
  res.json(await enrich(row));
});

router.put('/:id', async (req, res) => {
  const current = await getLocalCharacter(req.params.id, req.user.id);
  const data = await normalizeCharacter(req.body, current?.skills || req.body.skills);
  const result = await tryQuery(
    `update characters set player_name=$1, character_name=$2, photo=$3, race_id=$4, class_id=$5,
     origin_id=$6, origin=$7, level=$8, life_current=$9, life_max=$10, sanity_current=$11, sanity_max=$12,
     mana=$13, mana_max=$14, defense=$15, attributes=$16, skills=$17, inventory=$18, updated_at=now()
     where id=$19 and owner_id=$20 returning *`,
    [data.playerName, data.characterName, data.photo, data.raceId || null, data.classId || null, data.originId || null, data.origin, data.level, data.lifeCurrent, data.lifeMax, data.sanityCurrent, data.sanityMax, data.mana, data.manaMax, data.defense, toJson(data.attributes), toJson(data.skills), toJson(data.inventory), req.params.id, req.user.id]
  );
  const row = result?.rows?.[0] || await updateLocalCharacter(req.params.id, req.user.id, data);
  if (!row) return res.status(404).json({ message: 'Ficha não encontrada.' });
  await recordCharacterSave(row, 'Edicao da base');
  res.json(await enrich(row));
});

router.patch('/:id/play', async (req, res) => {
  const dbRow = await tryQuery('select * from characters where id = $1 and owner_id = $2', [req.params.id, req.user.id]);
  const row = dbRow?.rows?.[0] || await getLocalCharacter(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Ficha não encontrada.' });
  const body = z.object({
    lifeCurrent: z.coerce.number().min(0).optional(),
    lifeMax: z.coerce.number().min(0).optional(),
    sanityCurrent: z.coerce.number().min(0).optional(),
    sanityMax: z.coerce.number().min(0).optional(),
    mana: z.coerce.number().min(0).optional(),
    manaMax: z.coerce.number().min(0).optional(),
    defense: z.coerce.number().min(0).optional(),
    skills: z.record(z.coerce.number()).optional(),
    inventory: z.array(itemSchema).optional()
  }).parse(req.body);
  const payload = {
    ...row,
    playerName: row.player_name || row.playerName,
    characterName: row.character_name || row.characterName,
    raceId: row.race_id || row.raceId,
    classId: row.class_id || row.classId,
    originId: row.origin_id || row.originId,
    lifeCurrent: body.lifeCurrent ?? row.life_current ?? 63,
    lifeMax: body.lifeMax ?? row.life_max ?? 63,
    sanityCurrent: body.sanityCurrent ?? row.sanity_current ?? 52,
    sanityMax: body.sanityMax ?? row.sanity_max ?? 52,
    mana: body.mana ?? row.mana,
    manaMax: body.manaMax ?? row.mana_max ?? row.mana,
    defense: body.defense ?? row.defense,
    skills: { ...parseJsonField(row.skills, {}), ...(body.skills || {}) },
    inventory: body.inventory ?? parseJsonField(row.inventory, [])
  };
  const updatedResult = await tryQuery(
    `update characters set life_current=$1, life_max=$2, sanity_current=$3, sanity_max=$4,
     mana=$5, mana_max=$6, defense=$7, skills=$8, inventory=$9, updated_at=now()
     where id=$10 and owner_id=$11 returning *`,
    [payload.lifeCurrent, payload.lifeMax, payload.sanityCurrent, payload.sanityMax, payload.mana, payload.manaMax, payload.defense, toJson(payload.skills), toJson(payload.inventory), req.params.id, req.user.id]
  );
  const updated = updatedResult?.rows?.[0] || await updateLocalCharacter(req.params.id, req.user.id, payload);
  await recordCharacterSave(updated, 'Ajuste de jogo');
  res.json(await enrich(updated));
});

router.delete('/:id', async (req, res) => {
  const result = await tryQuery('delete from characters where id = $1 and owner_id = $2', [req.params.id, req.user.id]);
  if (!result) await deleteLocalCharacter(req.params.id, req.user.id);
  res.status(204).end();
});

router.get('/:id/share', async (req, res) => {
  const result = await tryQuery('select share_token from characters where id = $1 and owner_id = $2', [req.params.id, req.user.id]);
  const row = result?.rows?.[0] || await getLocalCharacter(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Ficha não encontrada.' });
  res.json({ url: `/share/character/${row.share_token}` });
});

export default router;
