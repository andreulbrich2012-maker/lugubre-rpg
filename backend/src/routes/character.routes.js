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
import { applyRaceModifiers, baseAttributes, baseSkills, calculateDefense, calculateDodge, rollDiceFormula } from '../utils/rules.js';

const router = Router();
router.use(requireAuth);

const itemSchema = z.object({
  id: z.string().optional(),
  quantity: z.coerce.number().min(0).default(1),
  weight: z.coerce.number().min(0).default(0),
  name: z.string().min(1),
  category: z.string().optional().default('Outros'),
  description: z.string().optional().default(''),
  defenseBonus: z.coerce.number().default(0)
});

const powerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  damage: z.string().min(1),
  criticalValue: z.coerce.number().min(1).max(20).default(20),
  criticalMultiplier: z.coerce.number().min(1).max(10).default(2),
  range: z.string().optional().default('-'),
  skill: z.string().optional().default('Luta'),
  element: z.string().optional().default('Érebo'),
  image: z.string().optional().default(''),
  manaCost: z.coerce.number().min(0).default(0),
  description: z.string().optional().default('')
});

const walletSchema = z.object({
  bronze: z.coerce.number().default(0),
  silver: z.coerce.number().default(0),
  platinum: z.coerce.number().default(0),
  gold: z.coerce.number().default(0)
});

const diceSettingsSchema = z.object({
  quickRollModifier: z.coerce.number().default(0)
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
  skillBonuses: z.record(z.coerce.number()).optional(),
  inventory: z.array(itemSchema).default([]),
  attacks: z.array(powerSchema).default([]),
  spells: z.array(powerSchema).default([]),
  wallet: walletSchema.default({ bronze: 0, silver: 0, platinum: 0, gold: 0 }),
  diceSettings: diceSettingsSchema.default({ quickRollModifier: 0 })
});

async function skillKeys() {
  const result = await tryQuery('select "key" from skills where deleted_at is null order by name');
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

function normalizeSkillTraining(skills = {}, keys = []) {
  return Object.fromEntries(keys.map((key) => {
    const rounded = Math.round(Number(skills?.[key] || 0) / 5) * 5;
    return [key, Math.max(0, Math.min(15, rounded))];
  }));
}

function normalizeItem(item) {
  const parsed = itemSchema.parse(item);
  return {
    ...parsed,
    id: parsed.id || crypto.randomUUID(),
    quantity: Number(parsed.quantity ?? 1),
    weight: Number(parsed.weight ?? 0),
    category: parsed.category || 'Outros',
    description: parsed.description || '',
    defenseBonus: Number(parsed.defenseBonus ?? 0)
  };
}

function normalizePower(power) {
  const parsed = powerSchema.parse(power);
  return {
    ...parsed,
    id: parsed.id || crypto.randomUUID(),
    criticalValue: Number(parsed.criticalValue ?? 20),
    criticalMultiplier: Number(parsed.criticalMultiplier ?? 2),
    range: parsed.range || '-',
    skill: parsed.skill || 'Luta',
    element: parsed.element || 'Érebo',
    image: parsed.image || '',
    manaCost: Number(parsed.manaCost ?? 0),
    description: parsed.description || ''
  };
}

function normalizeWallet(wallet) {
  const parsed = walletSchema.parse(wallet || {});
  return {
    bronze: Math.max(0, Number(parsed.bronze || 0)),
    silver: Math.max(0, Number(parsed.silver || 0)),
    platinum: Math.max(0, Number(parsed.platinum || 0)),
    gold: Math.max(0, Number(parsed.gold || 0))
  };
}

function clampCurrent(value, max) {
  const safeMax = Number(max ?? 0);
  const safeValue = Math.max(0, Number(value || 0));
  return safeMax > 0 ? Math.min(safeValue, safeMax) : safeValue;
}

function normalizeDiceSettings(settings) {
  const parsed = diceSettingsSchema.parse(settings || {});
  return { quickRollModifier: Number(parsed.quickRollModifier || 0) };
}

function walletTotal(wallet) {
  return Number(wallet?.bronze || 0) + Number(wallet?.silver || 0) * 10 + Number(wallet?.platinum || 0) * 100 + Number(wallet?.gold || 0) * 500;
}

function powerField(value) {
  if (['attack', 'attacks', 'ataque', 'ataques'].includes(value)) return 'attacks';
  if (['spell', 'spells', 'magia', 'magias'].includes(value)) return 'spells';
  return null;
}

const referenceSchema = z.object({
  raceId: z.string().min(1).nullable().optional(),
  classId: z.string().min(1).nullable().optional(),
  originId: z.string().min(1).nullable().optional()
});

function hasField(object, field) {
  return Object.prototype.hasOwnProperty.call(object, field);
}

async function getActiveReference(type, id) {
  if (!id) return null;
  const tables = {
    race: { table: 'races', local: 'races', columns: 'id, name, attribute_modifiers' },
    class: { table: 'classes', local: 'classes', columns: 'id, name' },
    origin: { table: 'origins', local: 'origins', columns: 'id, name, skill_modifiers' }
  };
  const config = tables[type];
  const result = await tryQuery(`select ${config.columns} from ${config.table} where id = $1 and deleted_at is null`, [id]);
  if (result) return result.rows[0] || null;
  return (await getLocalCatalog(config.local)).find((item) => item.id === id) || null;
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
    skill_bonuses: parseJsonField(row.skill_bonuses, {}),
    inventory: parseJsonField(row.inventory, []),
    attacks: parseJsonField(row.attacks, []),
    spells: parseJsonField(row.spells, []),
    wallet: parseJsonField(row.wallet, {}),
    dice_settings: parseJsonField(row.dice_settings, {})
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
  const keys = await skillKeys();
  let modifiers = {};
  if (data.raceId) {
    const race = await tryQuery('select attribute_modifiers from races where id = $1 and deleted_at is null', [data.raceId]);
    if (race?.rows?.[0]) modifiers = parseJsonField(race.rows[0].attribute_modifiers, {});
    else modifiers = (await getLocalCatalog('races')).find((item) => item.id === data.raceId)?.attribute_modifiers || {};
  }
  const attributes = applyRaceModifiers(baseAttributes(), modifiers);
  let origin = null;
  if (data.originId) {
    const result = await tryQuery('select skill_modifiers from origins where id = $1 and deleted_at is null', [data.originId]);
    origin = result?.rows?.[0] || (await getLocalCatalog('origins')).find((item) => item.id === data.originId);
  }
  const originSkills = parseJsonField(origin?.skill_modifiers, {});
  const base = baseSkills(keys);
  const createdSkills = Object.fromEntries(Object.keys(base).map((key) => [key, Number(base[key] || 0) + Number(originSkills[key] || 0)]));
  return {
    ...data,
    manaMax: data.manaMax ?? data.mana,
    attributes,
    skills: normalizeSkillTraining(currentSkills || data.skills || createdSkills, keys),
    skillBonuses: Object.fromEntries(keys.map((key) => [key, Number(data.skillBonuses?.[key] || 0)])),
    inventory: data.inventory.map(normalizeItem),
    attacks: data.attacks.map(normalizePower),
    spells: data.spells.map(normalizePower),
    wallet: normalizeWallet(data.wallet),
    diceSettings: normalizeDiceSettings(data.diceSettings)
  };
}

async function enrich(row) {
  const [racesResult, classesResult, originsResult, skillsResult] = await Promise.all([
    tryQuery('select * from races order by name'),
    tryQuery('select * from classes order by name'),
    tryQuery('select * from origins order by name'),
    tryQuery('select id, "key", name, attribute from skills where deleted_at is null order by name')
  ]);
  const [races, classes, origins, skillsCatalog] = await Promise.all([
    racesResult?.rows || getLocalCatalog('races', { includeDeleted: true }),
    classesResult?.rows || getLocalCatalog('classes', { includeDeleted: true }),
    originsResult?.rows || getLocalCatalog('origins', { includeDeleted: true }),
    skillsResult?.rows || getLocalCatalog('skills')
  ]);
  const attributes = parseJsonField(row.attributes, baseAttributes());
  const inventory = parseJsonField(row.inventory, []);
  const attacks = parseJsonField(row.attacks, []);
  const spells = parseJsonField(row.spells, []);
  const skillBonuses = parseJsonField(row.skill_bonuses, {});
  const wallet = normalizeWallet(parseJsonField(row.wallet, {}));
  const diceSettings = normalizeDiceSettings(parseJsonField(row.dice_settings, {}));
  const skills = { ...baseSkills(skillsCatalog.map((skill) => skill.key)), ...parseJsonField(row.skills, {}) };
  const savesResult = await tryQuery(
    'select id, label, saved_at from character_saves where character_id = $1 order by saved_at desc limit 3',
    [row.id]
  );
  const raceRef = races.find((item) => item.id === row.race_id);
  const classRef = classes.find((item) => item.id === row.class_id);
  const originRef = origins.find((item) => item.id === row.origin_id);
  const referenceWarnings = [
    row.race_id && raceRef?.deleted_at ? {
      type: 'race',
      field: 'raceId',
      label: 'raça',
      current_name: raceRef.name || row.race_name || 'Raça removida',
      message: 'Sua raça atual foi removida do sistema. Troque a raça clicando aqui.'
    } : null,
    row.class_id && classRef?.deleted_at ? {
      type: 'class',
      field: 'classId',
      label: 'classe',
      current_name: classRef.name || row.class_name || 'Classe removida',
      message: 'Sua classe atual foi removida do sistema. Troque a classe clicando aqui.'
    } : null,
    row.origin_id && originRef?.deleted_at ? {
      type: 'origin',
      field: 'originId',
      label: 'origem',
      current_name: originRef.name || row.origin_name || row.origin || 'Origem removida',
      message: 'Sua origem atual foi removida do sistema. Troque a origem clicando aqui.'
    } : null
  ].filter(Boolean);

  return {
    ...row,
    attributes,
    skills,
    skill_bonuses: skillBonuses,
    inventory,
    attacks,
    spells,
    wallet,
    wallet_total_dracmas: walletTotal(wallet),
    dice_settings: diceSettings,
    quick_roll_modifier: diceSettings.quickRollModifier,
    save_history: savesResult?.rows || row.save_history || [],
    skills_catalog: skillsCatalog,
    reference_warnings: referenceWarnings,
    race_name: row.race_name || raceRef?.name,
    class_name: row.class_name || classRef?.name,
    origin_name: row.origin_name || originRef?.name || row.origin,
    dodge: calculateDodge(attributes),
    total_defense: calculateDefense(row.defense, inventory)
  };
}

async function findOwnedCharacter(id, ownerId) {
  const result = await tryQuery('select * from characters where id = $1 and owner_id = $2', [id, ownerId]);
  return result?.rows?.[0] || await getLocalCharacter(id, ownerId);
}

async function persistPlayLists(req, row, payload, label = 'Ajuste de jogo') {
  const inventory = payload.inventory ?? parseJsonField(row.inventory, []);
  const attacks = payload.attacks ?? parseJsonField(row.attacks, []);
  const spells = payload.spells ?? parseJsonField(row.spells, []);
  const result = await tryQuery(
    `update characters set inventory=$1, attacks=$2, spells=$3, updated_at=now()
     where id=$4 and owner_id=$5 returning *`,
    [toJson(inventory), toJson(attacks), toJson(spells), req.params.id, req.user.id]
  );
  const updated = result?.rows?.[0] || await updateLocalCharacter(req.params.id, req.user.id, { inventory, attacks, spells });
  await recordCharacterSave(updated, label);
  return enrich(updated);
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
     (owner_id, player_name, character_name, photo, race_id, class_id, origin_id, origin, level, life_current, life_max, sanity_current, sanity_max, mana, mana_max, defense, attributes, skills, skill_bonuses, inventory, attacks, spells, wallet, dice_settings)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
     returning *`,
    [req.user.id, data.playerName, data.characterName, data.photo, data.raceId || null, data.classId || null, data.originId || null, data.origin, data.level, data.lifeCurrent, data.lifeMax, data.sanityCurrent, data.sanityMax, data.mana, data.manaMax, data.defense, toJson(data.attributes), toJson(data.skills), toJson(data.skillBonuses), toJson(data.inventory), toJson(data.attacks), toJson(data.spells), toJson(data.wallet), toJson(data.diceSettings)]
  );
  const row = result?.rows?.[0] || await createLocalCharacter(req.user.id, data);
  await recordCharacterSave(row, 'Criacao da ficha');
  res.status(201).json(await enrich(row));
});

router.get('/:id/inventory', async (req, res) => {
  const row = await findOwnedCharacter(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Ficha nao encontrada.' });
  res.json(parseJsonField(row.inventory, []));
});

router.post('/:id/inventory', async (req, res) => {
  const row = await findOwnedCharacter(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Ficha nao encontrada.' });
  const inventory = [...parseJsonField(row.inventory, []), normalizeItem(req.body)];
  res.status(201).json(await persistPlayLists(req, row, { inventory }, 'Item adicionado'));
});

router.put('/:id/inventory/:itemId', async (req, res) => {
  const row = await findOwnedCharacter(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Ficha nao encontrada.' });
  const inventory = parseJsonField(row.inventory, []);
  const index = inventory.findIndex((item) => item.id === req.params.itemId);
  if (index === -1) return res.status(404).json({ message: 'Item nao encontrado.' });
  inventory[index] = normalizeItem({ ...req.body, id: req.params.itemId });
  res.json(await persistPlayLists(req, row, { inventory }, 'Item editado'));
});

router.delete('/:id/inventory/:itemId', async (req, res) => {
  const row = await findOwnedCharacter(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Ficha nao encontrada.' });
  const inventory = parseJsonField(row.inventory, []);
  const nextInventory = inventory.filter((item) => item.id !== req.params.itemId);
  if (nextInventory.length === inventory.length) return res.status(404).json({ message: 'Item nao encontrado.' });
  res.json(await persistPlayLists(req, row, { inventory: nextInventory }, 'Item removido'));
});

router.get('/:id/powers', async (req, res) => {
  const row = await findOwnedCharacter(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Ficha nao encontrada.' });
  res.json({
    attacks: parseJsonField(row.attacks, []),
    spells: parseJsonField(row.spells, [])
  });
});

router.post('/:id/powers/roll', async (req, res) => {
  const row = await findOwnedCharacter(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Ficha nao encontrada.' });
  const body = z.object({
    formula: z.string().min(1),
    criticalValue: z.coerce.number().min(1).max(20).default(20),
    criticalMultiplier: z.coerce.number().min(1).max(10).default(2),
    d20: z.coerce.number().min(1).max(20).optional()
  }).parse(req.body);
  const attackRoll = body.d20 ?? Math.floor(Math.random() * 20) + 1;
  const damage = rollDiceFormula(body.formula);
  const isCritical = attackRoll >= body.criticalValue;
  res.json({
    ...damage,
    attackRoll,
    criticalValue: body.criticalValue,
    criticalMultiplier: body.criticalMultiplier,
    isCritical,
    total: isCritical ? damage.total * body.criticalMultiplier : damage.total,
    baseTotal: damage.total
  });
});

router.post('/:id/powers', async (req, res) => {
  const row = await findOwnedCharacter(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Ficha nao encontrada.' });
  const body = z.object({ type: z.string().default('attacks') }).passthrough().parse(req.body);
  let source = body;
  if (body.powerId) {
    const library = await tryQuery('select * from power_library where id = $1 and deleted_at is null', [body.powerId]);
    if (!library?.rowCount) return res.status(404).json({ message: 'Poder ou magia da biblioteca não encontrado.' });
    const power = library.rows[0];
    source = {
      type: power.type === 'magia' ? 'spells' : 'attacks',
      name: power.name,
      damage: power.damage_formula || '1d4',
      range: power.range || '-',
      skill: power.type === 'magia' ? 'Ocultismo' : 'Luta',
      element: power.element || 'Érebo',
      image: power.image_url || '',
      manaCost: power.mana_cost || 0,
      description: power.description || '',
      criticalValue: 20,
      criticalMultiplier: 2
    };
    await tryQuery(
      `insert into character_powers (character_id, power_id, custom_name, custom_description, custom_damage_formula, custom_mana_cost)
       values ($1,$2,$3,$4,$5,$6)`,
      [req.params.id, body.powerId, source.name, source.description, source.damage, source.manaCost]
    );
  }
  const field = powerField(source.type);
  if (!field) return res.status(400).json({ message: 'Tipo de poder invalido.' });
  const list = parseJsonField(row[field], []);
  const power = normalizePower(source);
  res.status(201).json(await persistPlayLists(req, row, { [field]: [...list, power] }, field === 'spells' ? 'Magia adicionada' : 'Ataque adicionado'));
});

router.put('/:id/powers/:type/:powerId', async (req, res) => {
  const row = await findOwnedCharacter(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Ficha nao encontrada.' });
  const field = powerField(req.params.type);
  if (!field) return res.status(400).json({ message: 'Tipo de poder invalido.' });
  const list = parseJsonField(row[field], []);
  const index = list.findIndex((power) => power.id === req.params.powerId);
  if (index === -1) return res.status(404).json({ message: 'Poder nao encontrado.' });
  list[index] = normalizePower({ ...req.body, id: req.params.powerId });
  res.json(await persistPlayLists(req, row, { [field]: list }, field === 'spells' ? 'Magia editada' : 'Ataque editado'));
});

router.delete('/:id/powers/:type/:powerId', async (req, res) => {
  const row = await findOwnedCharacter(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Ficha nao encontrada.' });
  const field = powerField(req.params.type);
  if (!field) return res.status(400).json({ message: 'Tipo de poder invalido.' });
  const list = parseJsonField(row[field], []);
  const nextList = list.filter((power) => power.id !== req.params.powerId);
  if (nextList.length === list.length) return res.status(404).json({ message: 'Poder nao encontrado.' });
  res.json(await persistPlayLists(req, row, { [field]: nextList }, field === 'spells' ? 'Magia removida' : 'Ataque removido'));
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
     mana=$13, mana_max=$14, defense=$15, attributes=$16, skills=$17, skill_bonuses=$18, inventory=$19, attacks=$20, spells=$21, wallet=$22, dice_settings=$23, updated_at=now()
     where id=$24 and owner_id=$25 returning *`,
    [data.playerName, data.characterName, data.photo, data.raceId || null, data.classId || null, data.originId || null, data.origin, data.level, data.lifeCurrent, data.lifeMax, data.sanityCurrent, data.sanityMax, data.mana, data.manaMax, data.defense, toJson(data.attributes), toJson(data.skills), toJson(data.skillBonuses), toJson(data.inventory), toJson(data.attacks), toJson(data.spells), toJson(data.wallet), toJson(data.diceSettings), req.params.id, req.user.id]
  );
  const row = result?.rows?.[0] || await updateLocalCharacter(req.params.id, req.user.id, data);
  if (!row) return res.status(404).json({ message: 'Ficha não encontrada.' });
  await recordCharacterSave(row, 'Edicao da base');
  res.json(await enrich(row));
});

router.patch('/:id/references', async (req, res) => {
  const dbRow = await tryQuery('select * from characters where id = $1 and owner_id = $2', [req.params.id, req.user.id]);
  const row = dbRow?.rows?.[0] || await getLocalCharacter(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Ficha nao encontrada.' });

  const body = referenceSchema.parse(req.body);
  const race = hasField(body, 'raceId') ? await getActiveReference('race', body.raceId) : null;
  const klass = hasField(body, 'classId') ? await getActiveReference('class', body.classId) : null;
  const origin = hasField(body, 'originId') ? await getActiveReference('origin', body.originId) : null;

  if (body.raceId && !race) return res.status(400).json({ message: 'Raca invalida ou removida.' });
  if (body.classId && !klass) return res.status(400).json({ message: 'Classe invalida ou removida.' });
  if (body.originId && !origin) return res.status(400).json({ message: 'Origem invalida ou removida.' });

  const attributes = hasField(body, 'raceId')
    ? applyRaceModifiers(baseAttributes(), parseJsonField(race?.attribute_modifiers, {}))
    : parseJsonField(row.attributes, baseAttributes());
  const nextRaceId = hasField(body, 'raceId') ? body.raceId || null : row.race_id;
  const nextClassId = hasField(body, 'classId') ? body.classId || null : row.class_id;
  const nextOriginId = hasField(body, 'originId') ? body.originId || null : row.origin_id;
  const nextOriginName = hasField(body, 'originId') ? origin?.name || '' : row.origin;

  const result = await tryQuery(
    `update characters
     set race_id=$1, class_id=$2, origin_id=$3, origin=$4, attributes=$5, updated_at=now()
     where id=$6 and owner_id=$7
     returning *`,
    [nextRaceId, nextClassId, nextOriginId, nextOriginName, toJson(attributes), req.params.id, req.user.id]
  );
  const updated = result?.rows?.[0] || await updateLocalCharacter(req.params.id, req.user.id, {
    raceId: nextRaceId,
    classId: nextClassId,
    originId: nextOriginId,
    origin: nextOriginName,
    attributes
  });
  await recordCharacterSave(updated, 'Troca de referencia');
  res.json(await enrich(updated));
});

router.patch('/:id/play', async (req, res) => {
  const dbRow = await tryQuery('select * from characters where id = $1 and owner_id = $2', [req.params.id, req.user.id]);
  const row = dbRow?.rows?.[0] || await getLocalCharacter(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Ficha não encontrada.' });
  const body = z.object({
    lifeCurrent: z.coerce.number().optional(),
    lifeMax: z.coerce.number().min(0).optional(),
    sanityCurrent: z.coerce.number().optional(),
    sanityMax: z.coerce.number().min(0).optional(),
    mana: z.coerce.number().optional(),
    manaMax: z.coerce.number().min(0).optional(),
    defense: z.coerce.number().min(0).optional(),
    skills: z.record(z.coerce.number()).optional(),
    skillBonuses: z.record(z.coerce.number()).optional(),
    inventory: z.array(itemSchema).optional(),
    attacks: z.array(powerSchema).optional(),
    spells: z.array(powerSchema).optional(),
    wallet: walletSchema.optional(),
    diceSettings: diceSettingsSchema.optional()
  }).parse(req.body);
  const keys = await skillKeys();
  const payload = {
    ...row,
    playerName: row.player_name || row.playerName,
    characterName: row.character_name || row.characterName,
    raceId: row.race_id || row.raceId,
    classId: row.class_id || row.classId,
    originId: row.origin_id || row.originId,
    lifeCurrent: clampCurrent(body.lifeCurrent ?? row.life_current ?? 63, body.lifeMax ?? row.life_max ?? 63),
    lifeMax: body.lifeMax ?? row.life_max ?? 63,
    sanityCurrent: clampCurrent(body.sanityCurrent ?? row.sanity_current ?? 52, body.sanityMax ?? row.sanity_max ?? 52),
    sanityMax: body.sanityMax ?? row.sanity_max ?? 52,
    mana: clampCurrent(body.mana ?? row.mana, body.manaMax ?? row.mana_max ?? row.mana),
    manaMax: body.manaMax ?? row.mana_max ?? row.mana,
    defense: body.defense ?? row.defense,
    skills: normalizeSkillTraining({ ...parseJsonField(row.skills, {}), ...(body.skills || {}) }, keys),
    skillBonuses: Object.fromEntries(keys.map((key) => [key, Number({ ...parseJsonField(row.skill_bonuses, {}), ...(body.skillBonuses || {}) }[key] || 0)])),
    inventory: body.inventory ? body.inventory.map(normalizeItem) : parseJsonField(row.inventory, []),
    attacks: body.attacks ? body.attacks.map(normalizePower) : parseJsonField(row.attacks, []),
    spells: body.spells ? body.spells.map(normalizePower) : parseJsonField(row.spells, []),
    wallet: normalizeWallet(body.wallet ?? parseJsonField(row.wallet, {})),
    diceSettings: normalizeDiceSettings(body.diceSettings ?? parseJsonField(row.dice_settings, {}))
  };
  const updatedResult = await tryQuery(
    `update characters set life_current=$1, life_max=$2, sanity_current=$3, sanity_max=$4,
     mana=$5, mana_max=$6, defense=$7, skills=$8, skill_bonuses=$9, inventory=$10, attacks=$11, spells=$12, wallet=$13, dice_settings=$14, updated_at=now()
     where id=$15 and owner_id=$16 returning *`,
    [payload.lifeCurrent, payload.lifeMax, payload.sanityCurrent, payload.sanityMax, payload.mana, payload.manaMax, payload.defense, toJson(payload.skills), toJson(payload.skillBonuses), toJson(payload.inventory), toJson(payload.attacks), toJson(payload.spells), toJson(payload.wallet), toJson(payload.diceSettings), req.params.id, req.user.id]
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
