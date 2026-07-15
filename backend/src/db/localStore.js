import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import { SKILL_DEFINITIONS } from '../utils/rules.js';

const dataDir = process.env.VERCEL ? '/tmp/lugubre-data' : path.resolve('data');
const dataFile = path.join(dataDir, 'local-db.json');
const seedVersion = '2026-07-rpg-sheet-v9-campaigns';
let cachedData = null;
let writeQueue = Promise.resolve();

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profile_image_url: user.profile_image_url || '',
    theme: user.theme || 'sombrio',
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

const defaultSkills = SKILL_DEFINITIONS.map(([key, name, attribute]) => ({ id: `skill-${key}`, key, name, attribute }));
const monsterCategories = ['Caos', 'Gaia', 'Ponto', 'Érebo', 'Nix', 'Tártaro', 'Éter', 'Ananque'];
const memberColors = ['#d6a65f', '#9b8ac7', '#4fb6a8', '#cf6f8f', '#8fb3ff', '#d08a3e', '#8bd17c', '#e0d27a'];

const defaultData = {
  users: [],
  characters: [],
  campaigns: [],
  campaign_members: [],
  messages: [],
  friends: [],
  friend_messages: [],
  powers: [],
  feedbacks: [],
  developer_posts: [
    {
      id: 'developer-post-feedback',
      title: 'Sistema de Feedback Adicionado',
      short_description: 'Jogadores agora podem enviar bugs, ideias e sugestões para a administração.',
      full_description: 'O painel de feedback aproxima a comunidade do desenvolvimento: cada relato pode ser acompanhado, respondido e transformado em melhoria real para o Lúgubre RPG.',
      image_url: '/assets/crypt-gate.svg',
      category: 'Sistema',
      published_at: new Date(Date.now() - 86_400_000).toISOString(),
      is_visible: true,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'developer-post-library',
      title: 'Biblioteca de Magias e Poderes',
      short_description: 'A biblioteca ganhou elementos, filtros e organização para consulta rápida.',
      full_description: 'Magias e poderes passaram a viver em uma área própria, pronta para expandir com novas escolas, elementos e vínculos com fichas.',
      image_url: '/assets/dark-castle.svg',
      category: 'Novidade',
      published_at: new Date(Date.now() - 172_800_000).toISOString(),
      is_visible: true,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  monsters: [
    {
      id: 'monster-guardian-ashes',
      name: 'Guardião de Cinzas',
      image_url: '/assets/haunted-ruins.svg',
      token_url: '/assets/haunted-ruins.svg',
      category: 'Caos',
      difficulty: 'Média',
      base_health: 20,
      min_health: 16,
      max_health: 24,
      armor: 12,
      items: ['Fragmento de Cinza', 'Núcleo Flamejante'],
      description: 'Uma sentinela de brasas antigas que protege ruínas esquecidas.',
      attacks: [
        { id: 'monster-guardian-ashes-punch', name: 'Punho Ardente', damage_formula: '1d8+2', description: 'Um golpe pesado envolto em cinzas vivas.' },
        { id: 'monster-guardian-ashes-burst', name: 'Explosão de Cinzas', damage_formula: '2d6+1', description: 'A criatura libera uma onda breve de calor e fuligem.' }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  skills: defaultSkills,
  origins: [
    { id: 'origin-survivor', name: 'Sobrevivente', description: 'Escapou de terras hostis e aprendeu a resistir quando tudo desaba.', skill_modifiers: { atletismo: 5, vontade: 5 } },
    { id: 'origin-noble', name: 'Nobre', description: 'Cresceu entre intrigas, títulos e ameaças ditas em voz baixa.', skill_modifiers: { enganacao: 5, intimidacao: 5 } },
    { id: 'origin-criminal', name: 'Criminoso', description: 'Conhece becos, fechaduras e o valor do silêncio.', skill_modifiers: { crime: 5, furtividade: 5 } },
    { id: 'origin-researcher', name: 'Pesquisador', description: 'Procura respostas em cadáveres, arquivos e vestígios proibidos.', skill_modifiers: { investigacao: 5, medicina: 5 } },
    { id: 'origin-hunter', name: 'Caçador', description: 'Rastreia presas e perigos antes que eles percebam sua presença.', skill_modifiers: { percepcao: 5, pontaria: 5 } },
    { id: 'origin-soldier', name: 'Soldado', description: 'Foi treinado para sobreviver ao caos da linha de frente.', skill_modifiers: { atletismo: 5, reflexos: 5 } },
    { id: 'origin-religious', name: 'Religioso', description: 'Carrega ritos, fé e cuidado contra horrores do mundo.', skill_modifiers: { vontade: 5, medicina: 5 } },
    { id: 'origin-merchant', name: 'Mercador', description: 'Aprendeu a ler pessoas e vender verdades convenientes.', skill_modifiers: { enganacao: 5, percepcao: 5 } }
  ],
  races: [
    { id: 'race-human', name: 'Humano', image: '', attribute_modifiers: {} },
    { id: 'race-elf', name: 'Elfo', image: '', attribute_modifiers: { forca: -1, intelecto: 1 } },
    { id: 'race-dark-elf', name: 'Elfo Negro', image: '', attribute_modifiers: { forca: -1, agilidade: 1 } },
    { id: 'race-dwarf', name: 'Anão', image: '', attribute_modifiers: { forca: 1, agilidade: -1 } },
    { id: 'race-tiefling', name: 'Tiefling', image: '', attribute_modifiers: { presenca: -1, intelecto: 1 } },
    { id: 'race-halfling', name: 'Halfling', image: '', attribute_modifiers: { agilidade: -1, presenca: 1 } },
    { id: 'race-genasi', name: 'Genasi', image: '', attribute_modifiers: {} },
    { id: 'race-kenku', name: 'Kenku', image: '', attribute_modifiers: { agilidade: 1, vigor: -1 } },
    { id: 'race-orc', name: 'Orc', image: '', attribute_modifiers: { forca: 1, intelecto: -1 } },
    { id: 'race-aasimar', name: 'Aasimar', image: '', attribute_modifiers: { vigor: -1, presenca: 1 } }
  ],
  classes: [
    { id: 'class-cavaleiro', name: 'Cavaleiro', description: 'Espadas, escudos, defesa e combate corpo a corpo.', image: '', progression: [{ level: 1, mana: 0, feature: 'Postura defensiva' }, { level: 5, mana: 0, feature: 'Mestre de escudo' }, { level: 10, mana: 0, feature: 'Golpe de guarda' }, { level: 15, mana: 0, feature: 'Muralha viva' }, { level: 20, mana: 0, feature: 'Campeão de aço' }] },
    { id: 'class-mago', name: 'Mago', description: 'Cajados, magia, conhecimento e mana.', image: '', progression: [{ level: 1, mana: 2, feature: 'Grimório inicial' }, { level: 5, mana: 4, feature: 'Canalização arcana' }, { level: 10, mana: 6, feature: 'Círculo ampliado' }, { level: 15, mana: 8, feature: 'Domínio ritual' }, { level: 20, mana: 10, feature: 'Arquimago' }] },
    { id: 'class-atirador', name: 'Atirador', description: 'Armas à distância, pontaria e precisão.', image: '', progression: [{ level: 1, mana: 0, feature: 'Mira calma' }, { level: 5, mana: 0, feature: 'Disparo preciso' }, { level: 10, mana: 0, feature: 'Olho de caçador' }, { level: 15, mana: 0, feature: 'Tiro impossível' }, { level: 20, mana: 0, feature: 'Lenda da mira' }] },
    { id: 'class-ladino', name: 'Ladino', description: 'Furtividade, crime, agilidade e ataques rápidos.', image: '', progression: [{ level: 1, mana: 0, feature: 'Passos leves' }, { level: 5, mana: 0, feature: 'Ataque oportunista' }, { level: 10, mana: 0, feature: 'Sombra viva' }, { level: 15, mana: 0, feature: 'Mãos invisíveis' }, { level: 20, mana: 0, feature: 'Mestre das sombras' }] },
    { id: 'class-paladino', name: 'Paladino', description: 'Defesa, fé, espada, proteção e habilidades sagradas.', image: '', progression: [{ level: 1, mana: 1, feature: 'Juramento sagrado' }, { level: 5, mana: 2, feature: 'Proteção divina' }, { level: 10, mana: 3, feature: 'Lâmina consagrada' }, { level: 15, mana: 4, feature: 'Aura protetora' }, { level: 20, mana: 5, feature: 'Guardião santo' }] },
    { id: 'class-sacerdote', name: 'Sacerdote', description: 'Cura, suporte, fé e proteção espiritual.', image: '', progression: [{ level: 1, mana: 2, feature: 'Prece de cura' }, { level: 5, mana: 4, feature: 'Benção protetora' }, { level: 10, mana: 6, feature: 'Rito de purificação' }, { level: 15, mana: 8, feature: 'Milagre menor' }, { level: 20, mana: 10, feature: 'Voz do santuário' }] },
    { id: 'class-feiticeiro', name: 'Feiticeiro', description: 'Magia instável, poder bruto e presença arcana.', image: '', progression: [{ level: 1, mana: 3, feature: 'Surto arcano' }, { level: 5, mana: 5, feature: 'Energia instável' }, { level: 10, mana: 7, feature: 'Poder bruto' }, { level: 15, mana: 9, feature: 'Ruptura mística' }, { level: 20, mana: 12, feature: 'Cataclisma pessoal' }] }
  ]
};

const seedUsers = [
  {
    name: 'Andre Admin',
    email: 'andreulbrich2012@gmail.com',
    password: 'adm123',
    role: 'admin'
  },
  {
    name: 'Administrador',
    email: 'adm@lugubre.local',
    password: 'adm123',
    role: 'admin'
  },
  {
    name: 'Joao Admin',
    email: 'joaogames9909@gmail.com',
    password: 'adm123',
    role: 'admin'
  },
  {
    name: 'Jogador Demo',
    email: 'demo@lugubre.local',
    password: 'demo123',
    role: 'user'
  }
];

export function getSeedPassword(email) {
  return seedUsers.find((seed) => seed.email === email.trim().toLowerCase())?.password || null;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function healthRange(baseHealth) {
  const base = Math.max(0, Number(baseHealth || 0));
  return {
    base_health: base,
    min_health: Math.max(0, base - 4),
    max_health: base + 4
  };
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

function colorForUser(userId = '') {
  const total = String(userId).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return memberColors[total % memberColors.length];
}

function parseLocalJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function localSharedCharacter(character) {
  if (!character) return null;
  return {
    id: character.id,
    character_name: character.character_name || character.characterName,
    player_name: character.player_name || character.playerName,
    photo: character.photo || '',
    level: character.level || 1,
    life_current: Number(character.life_current ?? character.lifeCurrent ?? 0),
    life_max: Number(character.life_max ?? character.lifeMax ?? 0),
    sanity_current: Number(character.sanity_current ?? character.sanityCurrent ?? 0),
    sanity_max: Number(character.sanity_max ?? character.sanityMax ?? 0),
    mana: Number(character.mana ?? 0),
    mana_max: Number(character.mana_max ?? character.manaMax ?? character.mana ?? 0),
    defense: Number(character.defense ?? 10),
    attributes: parseLocalJson(character.attributes, {}),
    skills: parseLocalJson(character.skills, {}),
    skill_bonuses: parseLocalJson(character.skill_bonuses ?? character.skillBonuses, {}),
    inventory: parseLocalJson(character.inventory, []),
    attacks: parseLocalJson(character.attacks, []),
    spells: parseLocalJson(character.spells, [])
  };
}

function normalizeLocalMonster(monster = {}) {
  const range = healthRange(monster.base_health ?? monster.baseHealth ?? 8);
  const now = new Date().toISOString();
  const items = Array.isArray(monster.items)
    ? monster.items.map((item) => String(item).trim()).filter(Boolean)
    : String(monster.items || '').split(',').map((item) => item.trim()).filter(Boolean);
  return {
    id: monster.id || crypto.randomUUID(),
    name: monster.name || 'Monstro',
    image_url: monster.image_url ?? monster.imageUrl ?? '',
    token_url: monster.token_url ?? monster.tokenUrl ?? monster.image_url ?? monster.imageUrl ?? '',
    category: normalizeMonsterCategory(monster.category),
    difficulty: monster.difficulty || 'Média',
    ...range,
    armor: Math.max(0, Number(monster.armor ?? 10)),
    items,
    description: monster.description || '',
    attacks: (Array.isArray(monster.attacks) ? monster.attacks : []).map((attack) => ({
      id: attack.id || crypto.randomUUID(),
      monster_id: monster.id || attack.monster_id,
      name: attack.name || 'Ataque',
      damage_formula: attack.damage_formula || attack.damageFormula || '1d4',
      description: attack.description || '',
      created_at: attack.created_at || now,
      updated_at: attack.updated_at || now
    })),
    created_at: monster.created_at || now,
    updated_at: monster.updated_at || now
  };
}

async function createSeedUser(seed) {
  return {
    id: crypto.randomUUID(),
    name: seed.name,
    email: seed.email,
    password_hash: await bcrypt.hash(seed.password, 10),
    role: seed.role,
    profile_image_url: '',
    theme: 'sombrio',
    created_at: new Date().toISOString()
  };
}

async function ensureSeedUsers(data) {
  const shouldRefreshSeeds = data.seed_version !== seedVersion;
  for (const seed of seedUsers) {
    const index = data.users.findIndex((user) => normalizeEmail(user.email) === seed.email);
    if (index >= 0) {
      data.users[index] = {
        ...data.users[index],
        name: seed.name,
        email: seed.email,
        role: seed.role,
        profile_image_url: data.users[index].profile_image_url || '',
        theme: data.users[index].theme || 'sombrio'
      };
      if (shouldRefreshSeeds) {
        data.users[index].password_hash = await bcrypt.hash(seed.password, 10);
      }
    } else {
      data.users.push(await createSeedUser(seed));
    }
  }
  data.seed_version = seedVersion;
}

async function writeStore(data) {
  cachedData = data;
  writeQueue = writeQueue.then(() => fs.writeFile(dataFile, JSON.stringify(data, null, 2)));
  await writeQueue;
}

async function ensureStore() {
  if (cachedData) return cachedData;
  await fs.mkdir(dataDir, { recursive: true });
  try {
    const data = JSON.parse(await fs.readFile(dataFile, 'utf8'));
    for (const [key, value] of Object.entries(defaultData)) {
      if (!Array.isArray(data[key])) data[key] = value;
    }
    for (const user of data.users) {
      user.email = normalizeEmail(user.email);
      if (!user.password_hash && user.password) {
        user.password_hash = await bcrypt.hash(user.password, 10);
        delete user.password;
      }
      user.profile_image_url = user.profile_image_url || '';
      user.theme = user.theme || 'sombrio';
      user.updated_at = user.updated_at || user.created_at || new Date().toISOString();
    }
    for (const character of data.characters) {
      character.life_current = Number(character.life_current ?? character.lifeCurrent ?? 63);
      character.life_max = Number(character.life_max ?? character.lifeMax ?? 63);
      character.sanity_current = Number(character.sanity_current ?? character.sanityCurrent ?? 52);
      character.sanity_max = Number(character.sanity_max ?? character.sanityMax ?? 52);
      character.mana_max = Number(character.mana_max ?? character.manaMax ?? character.mana ?? 0);
      character.skill_bonuses = character.skill_bonuses || character.skillBonuses || {};
      character.wallet = {
        bronze: Number(character.wallet?.bronze ?? 0),
        silver: Number(character.wallet?.silver ?? 0),
        platinum: Number(character.wallet?.platinum ?? 0),
        gold: Number(character.wallet?.gold ?? 0)
      };
      character.dice_settings = {
        quickRollModifier: Number(character.dice_settings?.quickRollModifier ?? character.diceSettings?.quickRollModifier ?? character.quickRollModifier ?? 0)
      };
      character.inventory = (Array.isArray(character.inventory) ? character.inventory : []).map((item) => ({
        id: item.id || crypto.randomUUID(),
        quantity: Number(item.quantity ?? 1),
        weight: Number(item.weight ?? 0),
        name: item.name || 'Item',
        category: item.category || 'Outros',
        description: item.description || '',
        defenseBonus: Number(item.defenseBonus ?? 0)
      }));
      character.attacks = (Array.isArray(character.attacks) ? character.attacks : []).map((power) => ({
        id: power.id || crypto.randomUUID(),
        name: power.name || 'Ataque',
        damage: power.damage || '1d4',
        criticalValue: Number(power.criticalValue ?? 20),
        criticalMultiplier: Number(power.criticalMultiplier ?? 2),
        range: power.range || '-',
        skill: power.skill || 'Luta',
        image: power.image || '',
        manaCost: Number(power.manaCost ?? 0),
        description: power.description || ''
      }));
      character.spells = (Array.isArray(character.spells) ? character.spells : []).map((power) => ({
        id: power.id || crypto.randomUUID(),
        name: power.name || 'Magia',
        damage: power.damage || '1d4',
        element: power.element || 'Érebo',
        criticalValue: Number(power.criticalValue ?? 20),
        criticalMultiplier: Number(power.criticalMultiplier ?? 2),
        image: power.image || '',
        manaCost: Number(power.manaCost ?? 0),
        description: power.description || ''
      }));
      if (character.race_id === 'race-dwarf' || character.raceId === 'race-dwarf') {
        character.attributes = { forca: 3, agilidade: 1, presenca: 2, intelecto: 2, vigor: 2 };
      }
      character.save_history = Array.isArray(character.save_history) ? character.save_history.slice(0, 3) : [];
      character.updated_at = character.updated_at || character.created_at || new Date().toISOString();
    }
    for (const member of data.campaign_members) {
      member.id = member.id || crypto.randomUUID();
      member.shared_character_id = member.shared_character_id ?? member.character_id ?? null;
      member.character_id = member.character_id ?? member.shared_character_id ?? null;
      member.color = member.color || colorForUser(member.user_id);
      member.updated_at = member.updated_at || member.joined_at || new Date().toISOString();
    }
    for (const campaign of data.campaigns) {
      campaign.updated_at = campaign.updated_at || campaign.created_at || new Date().toISOString();
    }
    for (const message of data.messages) {
      message.character_id = message.character_id || null;
      message.edited_at = message.edited_at || null;
      message.deleted_at = message.deleted_at || null;
      message.updated_at = message.updated_at || message.created_at || new Date().toISOString();
    }
    data.monsters = data.monsters.map(normalizeLocalMonster);
    for (const key of ['races', 'classes', 'skills']) {
      for (const item of defaultData[key]) {
        const index = data[key].findIndex((row) => (
          row.id === item.id ||
          (item.key && row.key === item.key) ||
          (item.name && normalizeEmail(row.name) === normalizeEmail(item.name))
        ));
        if (index >= 0) data[key][index] = { ...data[key][index], ...item };
        else data[key].push(item);
      }
    }
    for (const item of defaultData.origins) {
      const index = data.origins.findIndex((row) => row.id === item.id || normalizeEmail(row.name) === normalizeEmail(item.name));
      if (index >= 0) data.origins[index] = { ...data.origins[index], ...item };
      else data.origins.push(item);
    }
    for (const item of defaultData.monsters) {
      const index = data.monsters.findIndex((row) => row.id === item.id || normalizeEmail(row.name) === normalizeEmail(item.name));
      if (index >= 0) data.monsters[index] = normalizeLocalMonster({ ...data.monsters[index], ...item });
      else data.monsters.push(normalizeLocalMonster(item));
    }
    await ensureSeedUsers(data);
    await writeStore(data);
    return data;
  } catch {
    const data = { ...defaultData, users: [] };
    await ensureSeedUsers(data);
    await writeStore(data);
    return data;
  }
}

function nextSaveHistory(existing = [], label = 'Salvamento') {
  return [
    { id: crypto.randomUUID(), label, saved_at: new Date().toISOString() },
    ...existing
  ].slice(0, 3);
}

export async function findLocalUserByEmail(email) {
  const data = await ensureStore();
  return data.users.find((user) => normalizeEmail(user.email) === normalizeEmail(email));
}

export async function findLocalUserById(id) {
  const data = await ensureStore();
  return publicUser(data.users.find((user) => user.id === id));
}

export async function createLocalUser({ name, email, password, role = 'user' }) {
  const data = await ensureStore();
  const normalizedEmail = normalizeEmail(email);
  if (data.users.some((user) => normalizeEmail(user.email) === normalizedEmail)) {
    const error = new Error('Este email ja esta cadastrado.');
    error.status = 409;
    throw error;
  }
  const user = { id: crypto.randomUUID(), name: name.trim(), email: normalizedEmail, password_hash: await bcrypt.hash(password, 10), role, profile_image_url: '', theme: 'sombrio', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  data.users.push(user);
  await writeStore(data);
  return user;
}

export async function repairLocalUserPasswordByEmail(email, password) {
  const data = await ensureStore();
  const index = data.users.findIndex((user) => normalizeEmail(user.email) === normalizeEmail(email));
  if (index === -1) return null;
  data.users[index] = {
    ...data.users[index],
    email: normalizeEmail(data.users[index].email),
    password_hash: await bcrypt.hash(password, 10),
    updated_at: new Date().toISOString()
  };
  await writeStore(data);
  return data.users[index];
}

export async function updateLocalUserProfile(id, { name, email, profileImageUrl }) {
  const data = await ensureStore();
  const index = data.users.findIndex((user) => user.id === id);
  if (index === -1) return null;
  if (email && data.users.some((user) => user.id !== id && user.email === email.toLowerCase())) {
    const error = new Error('Este email ja esta cadastrado.');
    error.status = 409;
    throw error;
  }
  data.users[index] = {
    ...data.users[index],
    name: name ?? data.users[index].name,
    email: email?.toLowerCase() ?? data.users[index].email,
    profile_image_url: profileImageUrl ?? data.users[index].profile_image_url ?? '',
    updated_at: new Date().toISOString()
  };
  await writeStore(data);
  return publicUser(data.users[index]);
}

export async function updateLocalUserTheme(id, theme) {
  const data = await ensureStore();
  const index = data.users.findIndex((user) => user.id === id);
  if (index === -1) return null;
  data.users[index] = { ...data.users[index], theme, updated_at: new Date().toISOString() };
  await writeStore(data);
  return publicUser(data.users[index]);
}

export async function updateLocalUserPassword(id, currentPassword, newPassword) {
  const data = await ensureStore();
  const index = data.users.findIndex((user) => user.id === id);
  if (index === -1) return null;
  const ok = await bcrypt.compare(currentPassword, data.users[index].password_hash);
  if (!ok) {
    const error = new Error('Senha atual incorreta.');
    error.status = 401;
    throw error;
  }
  data.users[index] = {
    ...data.users[index],
    password_hash: await bcrypt.hash(newPassword, 10),
    updated_at: new Date().toISOString()
  };
  await writeStore(data);
  return publicUser(data.users[index]);
}

export async function getLocalCatalog(type, options = {}) {
  const data = await ensureStore();
  const rows = data[type] || [];
  return options.includeDeleted ? rows : rows.filter((item) => !item.deleted_at);
}

export async function createLocalCatalogItem(type, item) {
  const data = await ensureStore();
  const row = { ...item, id: crypto.randomUUID(), image: item.image || '' };
  data[type].push(row);
  await writeStore(data);
  return row;
}

export async function updateLocalCatalogItem(type, id, item) {
  const data = await ensureStore();
  const index = data[type].findIndex((row) => row.id === id && !row.deleted_at);
  if (index === -1) return null;
  data[type][index] = { ...data[type][index], ...item, id };
  await writeStore(data);
  return data[type][index];
}

export async function deleteLocalCatalogItem(type, id) {
  const data = await ensureStore();
  const index = data[type].findIndex((item) => item.id === id && !item.deleted_at);
  if (index === -1) return false;
  data[type][index] = { ...data[type][index], deleted_at: new Date().toISOString() };
  await writeStore(data);
  return true;
}

export async function listLocalMonsters(category = '') {
  const data = await ensureStore();
  const normalized = String(category || '').toLowerCase();
  return data.monsters
    .filter((monster) => !monster.deleted_at)
    .filter((monster) => !normalized || monster.category.toLowerCase() === normalized)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLocalMonster(id) {
  const data = await ensureStore();
  return data.monsters.find((monster) => monster.id === id && !monster.deleted_at) || null;
}

export async function createLocalMonster(monster) {
  const data = await ensureStore();
  const row = normalizeLocalMonster(monster);
  row.attacks = row.attacks.map((attack) => ({ ...attack, monster_id: row.id }));
  data.monsters.push(row);
  await writeStore(data);
  return row;
}

export async function updateLocalMonster(id, monster) {
  const data = await ensureStore();
  const index = data.monsters.findIndex((row) => row.id === id && !row.deleted_at);
  if (index === -1) return null;
  const existingAttacks = data.monsters[index].attacks || [];
  data.monsters[index] = normalizeLocalMonster({
    ...data.monsters[index],
    ...monster,
    id,
    attacks: Array.isArray(monster.attacks) ? monster.attacks : existingAttacks,
    updated_at: new Date().toISOString()
  });
  data.monsters[index].attacks = data.monsters[index].attacks.map((attack) => ({ ...attack, monster_id: id }));
  await writeStore(data);
  return data.monsters[index];
}

export async function deleteLocalMonster(id) {
  const data = await ensureStore();
  const index = data.monsters.findIndex((monster) => monster.id === id && !monster.deleted_at);
  if (index === -1) return false;
  data.monsters[index].deleted_at = new Date().toISOString();
  data.monsters[index].updated_at = data.monsters[index].deleted_at;
  await writeStore(data);
  return true;
}

export async function createLocalMonsterAttack(monsterId, attack) {
  const data = await ensureStore();
  const monster = data.monsters.find((row) => row.id === monsterId);
  if (!monster) return null;
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    monster_id: monsterId,
    name: attack.name || 'Ataque',
    damage_formula: attack.damage_formula || attack.damageFormula || '1d4',
    description: attack.description || '',
    created_at: now,
    updated_at: now
  };
  monster.attacks = [...(monster.attacks || []), row];
  monster.updated_at = now;
  await writeStore(data);
  return row;
}

export async function updateLocalMonsterAttack(attackId, attack) {
  const data = await ensureStore();
  for (const monster of data.monsters) {
    const index = (monster.attacks || []).findIndex((row) => row.id === attackId);
    if (index >= 0) {
      monster.attacks[index] = {
        ...monster.attacks[index],
        name: attack.name || monster.attacks[index].name,
        damage_formula: attack.damage_formula || attack.damageFormula || monster.attacks[index].damage_formula,
        description: attack.description ?? monster.attacks[index].description,
        updated_at: new Date().toISOString()
      };
      monster.updated_at = new Date().toISOString();
      await writeStore(data);
      return monster.attacks[index];
    }
  }
  return null;
}

export async function deleteLocalMonsterAttack(attackId) {
  const data = await ensureStore();
  for (const monster of data.monsters) {
    const before = (monster.attacks || []).length;
    monster.attacks = (monster.attacks || []).filter((attack) => attack.id !== attackId);
    if (monster.attacks.length !== before) {
      monster.updated_at = new Date().toISOString();
      await writeStore(data);
      return true;
    }
  }
  return false;
}

export async function listLocalPowers() {
  const data = await ensureStore();
  return [...(data.powers || [])].filter((power) => !power.deleted_at).sort((a, b) => (
    `${a.type || ''}${a.element || ''}${a.recommended_level || 0}${a.name || ''}`
      .localeCompare(`${b.type || ''}${b.element || ''}${b.recommended_level || 0}${b.name || ''}`)
  ));
}

export async function getLocalPower(id) {
  const data = await ensureStore();
  return (data.powers || []).find((power) => power.id === id && !power.deleted_at) || null;
}

export async function createLocalPower(power) {
  const data = await ensureStore();
  data.powers = data.powers || [];
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    ...power,
    created_at: now,
    updated_at: now
  };
  data.powers.push(row);
  await writeStore(data);
  return row;
}

export async function updateLocalPower(id, power) {
  const data = await ensureStore();
  data.powers = data.powers || [];
  const index = data.powers.findIndex((row) => row.id === id && !row.deleted_at);
  if (index === -1) return null;
  data.powers[index] = {
    ...data.powers[index],
    ...power,
    id,
    updated_at: new Date().toISOString()
  };
  await writeStore(data);
  return data.powers[index];
}

export async function deleteLocalPower(id) {
  const data = await ensureStore();
  data.powers = data.powers || [];
  const index = data.powers.findIndex((power) => power.id === id && !power.deleted_at);
  if (index === -1) return false;
  data.powers[index].deleted_at = new Date().toISOString();
  data.powers[index].updated_at = data.powers[index].deleted_at;
  await writeStore(data);
  return true;
}

function normalizeLocalDeveloperPost(post = {}, createdBy = null) {
  const now = new Date().toISOString();
  return {
    id: post.id || crypto.randomUUID(),
    title: post.title || 'Publicação',
    short_description: post.short_description || post.shortDescription || '',
    full_description: post.full_description || post.fullDescription || '',
    image_url: post.image_url || post.imageUrl || '',
    category: post.category || 'Atualização',
    published_at: post.published_at || post.publishedAt || now,
    is_visible: post.is_visible ?? post.isVisible ?? true,
    created_by: post.created_by ?? createdBy,
    created_at: post.created_at || now,
    updated_at: post.updated_at || now
  };
}

export async function listLocalDeveloperPosts({ includeHidden = false } = {}) {
  const data = await ensureStore();
  data.developer_posts = data.developer_posts || [];
  return data.developer_posts
    .map((post) => normalizeLocalDeveloperPost(post))
    .filter((post) => includeHidden || post.is_visible)
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
}

export async function createLocalDeveloperPost(post, createdBy = null) {
  const data = await ensureStore();
  data.developer_posts = data.developer_posts || [];
  const row = normalizeLocalDeveloperPost(post, createdBy);
  data.developer_posts.push(row);
  await writeStore(data);
  return row;
}

export async function updateLocalDeveloperPost(id, post) {
  const data = await ensureStore();
  data.developer_posts = data.developer_posts || [];
  const index = data.developer_posts.findIndex((row) => row.id === id);
  if (index === -1) return null;
  data.developer_posts[index] = normalizeLocalDeveloperPost({
    ...data.developer_posts[index],
    ...post,
    id,
    created_at: data.developer_posts[index].created_at,
    updated_at: new Date().toISOString()
  }, data.developer_posts[index].created_by);
  await writeStore(data);
  return data.developer_posts[index];
}

export async function deleteLocalDeveloperPost(id) {
  const data = await ensureStore();
  data.developer_posts = data.developer_posts || [];
  const before = data.developer_posts.length;
  data.developer_posts = data.developer_posts.filter((post) => post.id !== id);
  await writeStore(data);
  return data.developer_posts.length !== before;
}

function decorateLocalFeedback(data, feedback) {
  const user = data.users.find((row) => row.id === feedback.user_id) || {};
  const admin = data.users.find((row) => row.id === feedback.admin_id) || {};
  return {
    ...feedback,
    user_name: user.name || '',
    user_email: user.email || '',
    admin_name: admin.name || ''
  };
}

export async function listLocalFeedbacks(filters = {}) {
  const data = await ensureStore();
  const search = String(filters.search || '').trim().toLowerCase();
  const rows = (data.feedbacks || []).filter((feedback) => {
    const decorated = decorateLocalFeedback(data, feedback);
    if (filters.type && feedback.type !== filters.type) return false;
    if (filters.priority && feedback.priority !== filters.priority) return false;
    if (filters.status && feedback.status !== filters.status) return false;
    if (search && !`${feedback.title || ''} ${decorated.user_name} ${decorated.user_email}`.toLowerCase().includes(search)) return false;
    return true;
  });
  return rows
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map((feedback) => decorateLocalFeedback(data, feedback));
}

export async function getLocalFeedback(id) {
  const data = await ensureStore();
  const feedback = (data.feedbacks || []).find((row) => row.id === id);
  return feedback ? decorateLocalFeedback(data, feedback) : null;
}

export async function createLocalFeedback(userId, feedback) {
  const data = await ensureStore();
  data.feedbacks = data.feedbacks || [];
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    user_id: userId,
    title: feedback.title,
    type: feedback.type || 'Outro',
    description: feedback.description,
    priority: feedback.priority || 'Media',
    status: 'Enviado',
    page_context: feedback.pageContext || '',
    attachment_url: feedback.attachmentUrl || '',
    admin_response: '',
    admin_id: null,
    responded_at: null,
    created_at: now,
    updated_at: now
  };
  data.feedbacks.push(row);
  await writeStore(data);
  return decorateLocalFeedback(data, row);
}

export async function updateLocalFeedback(id, patch) {
  const data = await ensureStore();
  data.feedbacks = data.feedbacks || [];
  const index = data.feedbacks.findIndex((row) => row.id === id);
  if (index === -1) return null;
  data.feedbacks[index] = { ...data.feedbacks[index], ...patch, updated_at: new Date().toISOString() };
  await writeStore(data);
  return decorateLocalFeedback(data, data.feedbacks[index]);
}

export async function deleteLocalFeedback(id) {
  const data = await ensureStore();
  data.feedbacks = data.feedbacks || [];
  const before = data.feedbacks.length;
  data.feedbacks = data.feedbacks.filter((feedback) => feedback.id !== id);
  await writeStore(data);
  return data.feedbacks.length !== before;
}

export async function listLocalCharacters(ownerId) {
  const data = await ensureStore();
  return data.characters.filter((character) => character.owner_id === ownerId);
}

export async function getLocalCharacter(id, ownerId) {
  const data = await ensureStore();
  return data.characters.find((character) => character.id === id && character.owner_id === ownerId);
}

export async function createLocalCharacter(ownerId, character) {
  const data = await ensureStore();
  const now = new Date().toISOString();
  const row = {
    ...character,
    id: crypto.randomUUID(),
    owner_id: ownerId,
    player_name: character.playerName,
    character_name: character.characterName,
    race_id: character.raceId || null,
    class_id: character.classId || null,
    origin_id: character.originId || null,
    life_current: character.lifeCurrent ?? 63,
    life_max: character.lifeMax ?? 63,
    sanity_current: character.sanityCurrent ?? 52,
    sanity_max: character.sanityMax ?? 52,
    mana_max: character.manaMax ?? character.mana ?? 0,
    skill_bonuses: character.skillBonuses ?? character.skill_bonuses ?? {},
    inventory: character.inventory ?? [],
    attacks: character.attacks ?? [],
    spells: character.spells ?? [],
    wallet: character.wallet ?? { bronze: 0, silver: 0, platinum: 0, gold: 0 },
    dice_settings: character.diceSettings ?? character.dice_settings ?? { quickRollModifier: 0 },
    share_token: crypto.randomUUID(),
    save_history: [{ id: crypto.randomUUID(), label: 'Criacao da ficha', saved_at: now }],
    created_at: now,
    updated_at: now
  };
  data.characters.push(row);
  await writeStore(data);
  return row;
}

export async function updateLocalCharacter(id, ownerId, character) {
  const data = await ensureStore();
  const index = data.characters.findIndex((row) => row.id === id && row.owner_id === ownerId);
  if (index === -1) return null;
  const label = character.characterName ? 'Edicao da base' : 'Ajuste de jogo';
  data.characters[index] = {
    ...data.characters[index],
    ...character,
    player_name: character.playerName ?? data.characters[index].player_name,
    character_name: character.characterName ?? data.characters[index].character_name,
    race_id: character.raceId ?? data.characters[index].race_id ?? null,
    class_id: character.classId ?? data.characters[index].class_id ?? null,
    origin_id: character.originId ?? data.characters[index].origin_id ?? null,
    life_current: character.lifeCurrent ?? data.characters[index].life_current ?? 63,
    life_max: character.lifeMax ?? data.characters[index].life_max ?? 63,
    sanity_current: character.sanityCurrent ?? data.characters[index].sanity_current ?? 52,
    sanity_max: character.sanityMax ?? data.characters[index].sanity_max ?? 52,
    mana_max: character.manaMax ?? data.characters[index].mana_max ?? character.mana ?? 0,
    skill_bonuses: character.skillBonuses ?? character.skill_bonuses ?? data.characters[index].skill_bonuses ?? {},
    inventory: character.inventory ?? data.characters[index].inventory ?? [],
    attacks: character.attacks ?? data.characters[index].attacks ?? [],
    spells: character.spells ?? data.characters[index].spells ?? [],
    wallet: character.wallet ?? data.characters[index].wallet ?? { bronze: 0, silver: 0, platinum: 0, gold: 0 },
    dice_settings: character.diceSettings ?? character.dice_settings ?? data.characters[index].dice_settings ?? { quickRollModifier: 0 },
    save_history: nextSaveHistory(data.characters[index].save_history, label),
    updated_at: new Date().toISOString()
  };
  await writeStore(data);
  return data.characters[index];
}

export async function deleteLocalCharacter(id, ownerId) {
  const data = await ensureStore();
  data.characters = data.characters.filter((row) => row.id !== id || row.owner_id !== ownerId);
  await writeStore(data);
}

export async function listLocalCampaigns(userId) {
  const data = await ensureStore();
  const memberCampaigns = data.campaign_members.filter((member) => member.user_id === userId);
  return memberCampaigns.map((member) => ({
    ...data.campaigns.find((campaign) => campaign.id === member.campaign_id),
    member_role: member.role
  })).filter((campaign) => campaign.id);
}

export async function createLocalCampaign(masterId, campaign) {
  const data = await ensureStore();
  const now = new Date().toISOString();
  const row = {
    ...campaign,
    id: crypto.randomUUID(),
    master_id: masterId,
    created_at: now,
    updated_at: now
  };
  data.campaigns.push(row);
  data.campaign_members.push({
    id: crypto.randomUUID(),
    campaign_id: row.id,
    user_id: masterId,
    character_id: null,
    shared_character_id: null,
    role: 'master',
    color: memberColors[0],
    joined_at: now,
    updated_at: now
  });
  await writeStore(data);
  return row;
}

export async function updateLocalCampaign(campaignId, userId, role, campaign) {
  const data = await ensureStore();
  const index = data.campaigns.findIndex((row) => row.id === campaignId);
  if (index === -1) return null;
  if (data.campaigns[index].master_id !== userId && role !== 'admin') {
    const error = new Error('Apenas o mestre pode editar a campanha.');
    error.status = 403;
    throw error;
  }
  data.campaigns[index] = { ...data.campaigns[index], ...campaign, updated_at: new Date().toISOString() };
  await writeStore(data);
  return data.campaigns[index];
}

export async function deleteLocalCampaign(campaignId, userId, role) {
  const data = await ensureStore();
  const campaign = data.campaigns.find((row) => row.id === campaignId);
  if (!campaign) return null;
  if (campaign.master_id !== userId && role !== 'admin') {
    const error = new Error('Apenas o mestre pode excluir a campanha.');
    error.status = 403;
    throw error;
  }
  data.campaigns = data.campaigns.filter((row) => row.id !== campaignId);
  data.campaign_members = data.campaign_members.filter((row) => row.campaign_id !== campaignId);
  data.messages = data.messages.filter((row) => row.campaign_id !== campaignId);
  await writeStore(data);
  return true;
}

export async function joinLocalCampaign(inviteCode, userId, characterId = null) {
  const data = await ensureStore();
  const campaign = data.campaigns.find((row) => row.invite_code === inviteCode.toUpperCase());
  if (!campaign) return null;
  if (characterId && !data.characters.some((character) => character.id === characterId && character.owner_id === userId)) {
    const error = new Error('Este personagem não pertence a você.');
    error.status = 403;
    throw error;
  }
  const existing = data.campaign_members.find((member) => member.campaign_id === campaign.id && member.user_id === userId);
  const now = new Date().toISOString();
  if (existing) {
    existing.character_id = characterId ?? existing.character_id ?? null;
    existing.shared_character_id = characterId ?? existing.shared_character_id ?? null;
    existing.color = existing.color || colorForUser(userId);
    existing.updated_at = now;
  } else {
    data.campaign_members.push({
      id: crypto.randomUUID(),
      campaign_id: campaign.id,
      user_id: userId,
      character_id: characterId,
      shared_character_id: characterId,
      role: 'player',
      color: colorForUser(userId),
      joined_at: now,
      updated_at: now
    });
  }
  await writeStore(data);
  return campaign;
}

export async function getLocalCampaignRoom(campaignId, userId) {
  const data = await ensureStore();
  const member = data.campaign_members.find((row) => row.campaign_id === campaignId && row.user_id === userId);
  if (!member) return null;
  const campaign = data.campaigns.find((row) => row.id === campaignId);
  const canSeeFullSheet = member.role === 'master' || campaign?.master_id === userId;
  const members = data.campaign_members
    .filter((row) => row.campaign_id === campaignId)
    .map((row) => {
      const user = data.users.find((item) => item.id === row.user_id);
      const characterId = row.shared_character_id || row.character_id;
      const character = data.characters.find((item) => item.id === characterId);
      const sharedCharacter = canSeeFullSheet || row.user_id === userId ? localSharedCharacter(character) : null;
      return {
        id: row.user_id,
        user_id: row.user_id,
        name: user?.name || 'Jogador',
        profile_image_url: user?.profile_image_url || '',
        role: row.role,
        color: row.color || colorForUser(row.user_id),
        character_id: character?.id || null,
        shared_character_id: character?.id || null,
        character_name: character?.character_name || null,
        character_photo: character?.photo || '',
        display_name: character?.character_name || user?.name || 'Jogador',
        display_avatar: character?.photo || user?.profile_image_url || '',
        shared_character: sharedCharacter
      };
    });
  const messages = data.messages
    .filter((row) => row.campaign_id === campaignId)
    .filter((row) => !row.deleted_at)
    .map((row) => {
      const user = data.users.find((item) => item.id === row.user_id);
      const messageMember = members.find((item) => item.user_id === row.user_id);
      return {
        ...row,
        user_name: messageMember?.display_name || user?.name || 'Jogador',
        user_avatar: messageMember?.display_avatar || user?.profile_image_url || '',
        color: messageMember?.color || colorForUser(row.user_id)
      };
    })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return { campaign, members, messages, role: member.role };
}

export async function createLocalMessage(campaignId, userId, content) {
  const data = await ensureStore();
  const member = data.campaign_members.find((row) => row.campaign_id === campaignId && row.user_id === userId);
  if (!member) return null;
  const user = data.users.find((item) => item.id === userId);
  const character = data.characters.find((item) => item.id === (member.shared_character_id || member.character_id));
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    campaign_id: campaignId,
    user_id: userId,
    character_id: character?.id || null,
    content,
    edited_at: null,
    deleted_at: null,
    created_at: now,
    updated_at: now
  };
  data.messages.push(row);
  await writeStore(data);
  return {
    ...row,
    user_name: character?.character_name || user?.name || 'Jogador',
    user_avatar: character?.photo || user?.profile_image_url || '',
    color: member.color || colorForUser(userId)
  };
}

export async function leaveLocalCampaign(campaignId, userId) {
  const data = await ensureStore();
  const campaign = data.campaigns.find((row) => row.id === campaignId);
  const member = data.campaign_members.find((row) => row.campaign_id === campaignId && row.user_id === userId);
  if (!campaign || !member) return null;
  if (campaign.master_id === userId || member.role === 'master') {
    const error = new Error('O mestre deve excluir a campanha.');
    error.status = 400;
    throw error;
  }
  data.campaign_members = data.campaign_members.filter((row) => row.campaign_id !== campaignId || row.user_id !== userId);
  await writeStore(data);
  return true;
}

export async function removeLocalCampaignMember(campaignId, gmId, targetUserId, role = 'user') {
  const data = await ensureStore();
  const campaign = data.campaigns.find((row) => row.id === campaignId);
  if (!campaign) return null;
  const gm = data.campaign_members.find((row) => row.campaign_id === campaignId && row.user_id === gmId);
  if ((campaign.master_id !== gmId && gm?.role !== 'master' && role !== 'admin') || targetUserId === gmId) {
    const error = new Error(targetUserId === gmId ? 'O mestre não pode remover a si mesmo.' : 'Apenas o mestre pode remover jogadores.');
    error.status = 403;
    throw error;
  }
  const before = data.campaign_members.length;
  data.campaign_members = data.campaign_members.filter((row) => row.campaign_id !== campaignId || row.user_id !== targetUserId);
  await writeStore(data);
  return data.campaign_members.length !== before;
}

export async function updateLocalCampaignMemberCharacter(campaignId, userId, characterId) {
  const data = await ensureStore();
  const member = data.campaign_members.find((row) => row.campaign_id === campaignId && row.user_id === userId);
  if (!member) return null;
  if (characterId && !data.characters.some((character) => character.id === characterId && character.owner_id === userId)) {
    const error = new Error('Este personagem não pertence a você.');
    error.status = 403;
    throw error;
  }
  member.character_id = characterId || null;
  member.shared_character_id = characterId || null;
  member.updated_at = new Date().toISOString();
  await writeStore(data);
  return member;
}

export async function updateLocalCampaignMemberColor(campaignId, gmId, targetUserId, color, role = 'user') {
  const data = await ensureStore();
  const campaign = data.campaigns.find((row) => row.id === campaignId);
  const gm = data.campaign_members.find((row) => row.campaign_id === campaignId && row.user_id === gmId);
  if (!campaign) return null;
  if (campaign.master_id !== gmId && gm?.role !== 'master' && role !== 'admin') {
    const error = new Error('Apenas o mestre pode alterar cores.');
    error.status = 403;
    throw error;
  }
  const member = data.campaign_members.find((row) => row.campaign_id === campaignId && row.user_id === targetUserId);
  if (!member) return null;
  member.color = color;
  member.updated_at = new Date().toISOString();
  await writeStore(data);
  return member;
}

export async function updateLocalCampaignMessage(campaignId, userId, messageId, content) {
  const data = await ensureStore();
  const member = data.campaign_members.find((row) => row.campaign_id === campaignId && row.user_id === userId);
  const message = data.messages.find((row) => row.id === messageId && row.campaign_id === campaignId && !row.deleted_at);
  if (!member || !message) return null;
  if (message.user_id !== userId) {
    const error = new Error('Você só pode editar suas próprias mensagens.');
    error.status = 403;
    throw error;
  }
  message.content = content;
  message.edited_at = new Date().toISOString();
  message.updated_at = message.edited_at;
  await writeStore(data);
  return (await getLocalCampaignRoom(campaignId, userId))?.messages.find((row) => row.id === messageId) || message;
}

export async function deleteLocalCampaignMessage(campaignId, userId, role, messageId) {
  const data = await ensureStore();
  const member = data.campaign_members.find((row) => row.campaign_id === campaignId && row.user_id === userId);
  const message = data.messages.find((row) => row.id === messageId && row.campaign_id === campaignId && !row.deleted_at);
  if (!member || !message) return null;
  const isOwner = message.user_id === userId;
  const isMaster = member.role === 'master' || role === 'admin';
  if (!isOwner && !isMaster) {
    const error = new Error('Você não pode excluir mensagens de outros jogadores.');
    error.status = 403;
    throw error;
  }
  message.deleted_at = new Date().toISOString();
  message.updated_at = message.deleted_at;
  await writeStore(data);
  return true;
}

export async function getLocalDashboard(userId) {
  const data = await ensureStore();
  const characters = data.characters.filter((character) => character.owner_id === userId);
  const campaigns = data.campaign_members
    .filter((member) => member.user_id === userId)
    .map((member) => data.campaigns.find((campaign) => campaign.id === member.campaign_id))
    .filter(Boolean);
  return {
    characters_count: characters.length,
    campaigns_count: campaigns.length,
    recent_characters: characters.slice(-3).reverse(),
    recent_campaigns: campaigns.slice(-3).reverse()
  };
}

export async function searchLocalUsers(term, userId) {
  const data = await ensureStore();
  const normalized = term.toLowerCase();
  return data.users
    .filter((user) => user.id !== userId)
    .filter((user) => user.name.toLowerCase().includes(normalized) || user.email.toLowerCase().includes(normalized))
    .slice(0, 12)
    .map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.role }));
}

export async function listLocalFriends(userId) {
  const data = await ensureStore();
  return data.friends
    .filter((friendship) => friendship.user_id === userId || friendship.friend_id === userId)
    .map((friendship) => {
      const friendId = friendship.user_id === userId ? friendship.friend_id : friendship.user_id;
      const friend = data.users.find((user) => user.id === friendId);
      return friend ? { ...friendship, friend: { id: friend.id, name: friend.name, email: friend.email, role: friend.role } } : null;
    })
    .filter(Boolean);
}

export async function addLocalFriend(userId, friendEmail) {
  const data = await ensureStore();
  const friend = data.users.find((user) => user.email === friendEmail.toLowerCase());
  if (!friend || friend.id === userId) return null;
  const existing = data.friends.find((row) => (
    (row.user_id === userId && row.friend_id === friend.id) ||
    (row.user_id === friend.id && row.friend_id === userId)
  ));
  if (existing) {
    existing.status = 'accepted';
    await writeStore(data);
    return { ...existing, friend: { id: friend.id, name: friend.name, email: friend.email, role: friend.role } };
  }
  const row = {
    id: crypto.randomUUID(),
    user_id: userId,
    friend_id: friend.id,
    status: 'accepted',
    created_at: new Date().toISOString()
  };
  data.friends.push(row);
  await writeStore(data);
  return { ...row, friend: { id: friend.id, name: friend.name, email: friend.email, role: friend.role } };
}

export async function listLocalFriendMessages(userId, friendId) {
  const data = await ensureStore();
  return data.friend_messages
    .filter((message) => (
      (message.sender_id === userId && message.receiver_id === friendId) ||
      (message.sender_id === friendId && message.receiver_id === userId)
    ))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

export async function createLocalFriendMessage(userId, friendId, message) {
  const data = await ensureStore();
  const areFriends = data.friends.some((row) => (
    row.status === 'accepted' &&
    ((row.user_id === userId && row.friend_id === friendId) || (row.user_id === friendId && row.friend_id === userId))
  ));
  if (!areFriends) return null;
  const row = {
    id: crypto.randomUUID(),
    sender_id: userId,
    receiver_id: friendId,
    message,
    created_at: new Date().toISOString()
  };
  data.friend_messages.push(row);
  await writeStore(data);
  return row;
}
