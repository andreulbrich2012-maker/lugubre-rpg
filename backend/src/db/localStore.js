import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';

const dataDir = process.env.VERCEL ? '/tmp/lugubre-data' : path.resolve('data');
const dataFile = path.join(dataDir, 'local-db.json');
const seedVersion = '2026-06-rpg-data-v3';

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profile_image_url: user.profile_image_url || '',
    theme: user.theme || 'lugubre',
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

const defaultSkills = [
  { id: 'skill-acrobacia', key: 'acrobacia', name: 'Acrobacia', attribute: 'agilidade' },
  { id: 'skill-atletismo', key: 'atletismo', name: 'Atletismo', attribute: 'forca' },
  { id: 'skill-crime', key: 'crime', name: 'Crime', attribute: 'agilidade' },
  { id: 'skill-enganacao', key: 'enganacao', name: 'Enganação', attribute: 'presenca' },
  { id: 'skill-furtividade', key: 'furtividade', name: 'Furtividade', attribute: 'agilidade' },
  { id: 'skill-iniciativa', key: 'iniciativa', name: 'Iniciativa', attribute: 'agilidade' },
  { id: 'skill-intimidacao', key: 'intimidacao', name: 'Intimidação', attribute: 'presenca' },
  { id: 'skill-investigacao', key: 'investigacao', name: 'Investigação', attribute: 'intelecto' },
  { id: 'skill-medicina', key: 'medicina', name: 'Medicina', attribute: 'intelecto' },
  { id: 'skill-percepcao', key: 'percepcao', name: 'Percepção', attribute: 'presenca' },
  { id: 'skill-pontaria', key: 'pontaria', name: 'Pontaria', attribute: 'agilidade' },
  { id: 'skill-reflexos', key: 'reflexos', name: 'Reflexos', attribute: 'agilidade' },
  { id: 'skill-vontade', key: 'vontade', name: 'Vontade', attribute: 'presenca' }
];

const defaultData = {
  users: [],
  characters: [],
  campaigns: [],
  campaign_members: [],
  messages: [],
  friends: [],
  friend_messages: [],
  skills: defaultSkills,
  origins: [
    { id: 'origin-initiated', name: 'Iniciado do Véu', description: 'Conhece rumores, símbolos e presságios.', skill_modifiers: { investigacao: 5, vontade: 5 } },
    { id: 'origin-survivor', name: 'Sobrevivente', description: 'Escapou de algo que ainda sussurra seu nome.', skill_modifiers: { atletismo: 5, percepcao: 5 } },
    { id: 'origin-scholar', name: 'Erudito Oculto', description: 'Estudou textos que deveriam permanecer fechados.', skill_modifiers: { medicina: 5, investigacao: 5 } }
  ],
  races: [
    { id: 'race-human', name: 'Humano', image: '', attribute_modifiers: {} },
    { id: 'race-elf', name: 'Elfo', image: '', attribute_modifiers: { forca: -1, intelecto: 1 } },
    { id: 'race-dark-elf', name: 'Elfo Negro', image: '', attribute_modifiers: { forca: -1, agilidade: 1 } },
    { id: 'race-dwarf', name: 'Anão', image: '', attribute_modifiers: { forca: 1, agilidade: -1, intelecto: 1 } },
    { id: 'race-warforged', name: 'Warforged', image: '', attribute_modifiers: { agilidade: -1, vigor: 1 } }
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

async function createSeedUser(seed) {
  return {
    id: crypto.randomUUID(),
    name: seed.name,
    email: seed.email,
    password_hash: await bcrypt.hash(seed.password, 10),
    role: seed.role,
    profile_image_url: '',
    theme: 'lugubre',
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
        theme: data.users[index].theme || 'lugubre'
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
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    const data = JSON.parse(await fs.readFile(dataFile, 'utf8'));
    const shouldRefreshCatalog = data.seed_version !== seedVersion;
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
      user.theme = user.theme || 'lugubre';
      user.updated_at = user.updated_at || user.created_at || new Date().toISOString();
    }
    for (const character of data.characters) {
      character.life_current = Number(character.life_current ?? character.lifeCurrent ?? 63);
      character.life_max = Number(character.life_max ?? character.lifeMax ?? 63);
      character.sanity_current = Number(character.sanity_current ?? character.sanityCurrent ?? 52);
      character.sanity_max = Number(character.sanity_max ?? character.sanityMax ?? 52);
      character.mana_max = Number(character.mana_max ?? character.manaMax ?? character.mana ?? 0);
      character.save_history = Array.isArray(character.save_history) ? character.save_history.slice(0, 3) : [];
      character.updated_at = character.updated_at || character.created_at || new Date().toISOString();
    }
    if (shouldRefreshCatalog) {
      const allowedRaceIds = new Set(defaultData.races.map((item) => item.id));
      const allowedClassIds = new Set(defaultData.classes.map((item) => item.id));
      data.races = defaultData.races;
      data.classes = defaultData.classes;
      data.skills = defaultData.skills;
      for (const character of data.characters) {
        if (character.race_id && !allowedRaceIds.has(character.race_id)) character.race_id = '';
        if (character.class_id && !allowedClassIds.has(character.class_id)) character.class_id = '';
      }
    } else {
      for (const key of ['races', 'classes', 'skills']) {
        for (const item of defaultData[key]) {
          const index = data[key].findIndex((row) => row.id === item.id);
          if (index >= 0) data[key][index] = { ...data[key][index], ...item };
          else data[key].push(item);
        }
      }
    }
    for (const item of defaultData.origins) {
      const index = data.origins.findIndex((row) => row.id === item.id || normalizeEmail(row.name) === normalizeEmail(item.name));
      if (index >= 0) data.origins[index] = { ...data.origins[index], ...item };
      else data.origins.push(item);
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
  const user = { id: crypto.randomUUID(), name: name.trim(), email: normalizedEmail, password_hash: await bcrypt.hash(password, 10), role, profile_image_url: '', theme: 'lugubre', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
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

export async function getLocalCatalog(type) {
  const data = await ensureStore();
  return data[type] || [];
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
  const index = data[type].findIndex((row) => row.id === id);
  if (index === -1) return null;
  data[type][index] = { ...data[type][index], ...item, id };
  await writeStore(data);
  return data[type][index];
}

export async function deleteLocalCatalogItem(type, id) {
  const data = await ensureStore();
  data[type] = data[type].filter((item) => item.id !== id);
  await writeStore(data);
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
  const row = {
    ...campaign,
    id: crypto.randomUUID(),
    master_id: masterId,
    created_at: new Date().toISOString()
  };
  data.campaigns.push(row);
  data.campaign_members.push({
    campaign_id: row.id,
    user_id: masterId,
    character_id: null,
    role: 'master',
    joined_at: new Date().toISOString()
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
  data.campaigns[index] = { ...data.campaigns[index], ...campaign };
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
  const existing = data.campaign_members.find((member) => member.campaign_id === campaign.id && member.user_id === userId);
  if (existing) existing.character_id = characterId;
  else data.campaign_members.push({ campaign_id: campaign.id, user_id: userId, character_id: characterId, role: 'player', joined_at: new Date().toISOString() });
  await writeStore(data);
  return campaign;
}

export async function getLocalCampaignRoom(campaignId, userId) {
  const data = await ensureStore();
  const member = data.campaign_members.find((row) => row.campaign_id === campaignId && row.user_id === userId);
  if (!member) return null;
  const campaign = data.campaigns.find((row) => row.id === campaignId);
  const members = data.campaign_members
    .filter((row) => row.campaign_id === campaignId)
    .map((row) => {
      const user = data.users.find((item) => item.id === row.user_id);
      const character = data.characters.find((item) => item.id === row.character_id);
      return { id: row.user_id, name: user?.name || 'Jogador', role: row.role, character_id: character?.id, character_name: character?.character_name };
    });
  const messages = data.messages
    .filter((row) => row.campaign_id === campaignId)
    .map((row) => ({ ...row, user_name: data.users.find((user) => user.id === row.user_id)?.name || 'Jogador' }));
  return { campaign, members, messages, role: member.role };
}

export async function createLocalMessage(campaignId, userId, content) {
  const data = await ensureStore();
  const member = data.campaign_members.find((row) => row.campaign_id === campaignId && row.user_id === userId);
  if (!member) return null;
  const row = { id: crypto.randomUUID(), campaign_id: campaignId, user_id: userId, content, created_at: new Date().toISOString() };
  data.messages.push(row);
  await writeStore(data);
  return { ...row, user_name: data.users.find((user) => user.id === userId)?.name || 'Jogador' };
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
