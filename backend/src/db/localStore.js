import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';

const dataDir = path.resolve('data');
const dataFile = path.join(dataDir, 'local-db.json');

const defaultSkills = [
  { id: 'skill-luta', key: 'luta', name: 'Luta', attribute: 'forca' },
  { id: 'skill-pontaria', key: 'pontaria', name: 'Pontaria', attribute: 'agilidade' },
  { id: 'skill-furtividade', key: 'furtividade', name: 'Furtividade', attribute: 'agilidade' },
  { id: 'skill-arcana', key: 'arcana', name: 'Arcana', attribute: 'intelecto' },
  { id: 'skill-religiao', key: 'religiao', name: 'Religião', attribute: 'presenca' },
  { id: 'skill-percepcao', key: 'percepcao', name: 'Percepção', attribute: 'presenca' },
  { id: 'skill-sobrevivencia', key: 'sobrevivencia', name: 'Sobrevivência', attribute: 'vigor' }
];

const defaultData = {
  users: [],
  characters: [],
  campaigns: [],
  campaign_members: [],
  messages: [],
  skills: defaultSkills,
  origins: [
    { id: 'origin-initiated', name: 'Iniciado do Véu', description: 'Conhece rumores, símbolos e presságios.', skill_modifiers: { arcana: 1, religiao: 1 } },
    { id: 'origin-survivor', name: 'Sobrevivente', description: 'Escapou de algo que ainda sussurra seu nome.', skill_modifiers: { sobrevivencia: 2 } },
    { id: 'origin-scholar', name: 'Erudito Oculto', description: 'Estudou textos que deveriam permanecer fechados.', skill_modifiers: { arcana: 2 } }
  ],
  races: [
    { id: 'race-human', name: 'Humano Sombrio', image: '', attribute_modifiers: { forca: 1, presenca: 1 } },
    { id: 'race-elf', name: 'Elfo Crepuscular', image: '', attribute_modifiers: { agilidade: 2, vigor: -1 } },
    { id: 'race-dwarf', name: 'Anão de Cripta', image: '', attribute_modifiers: { vigor: 2, agilidade: -1 } }
  ],
  classes: [
    { id: 'class-blade', name: 'Lâmina Funesta', image: '', progression: [{ level: 1, mana: 2, feature: 'Golpe sombrio' }, { level: 10, mana: 12, feature: 'Corte sepulcral' }, { level: 20, mana: 25, feature: 'Executor do abismo' }] },
    { id: 'class-occultist', name: 'Ocultista', image: '', progression: [{ level: 1, mana: 6, feature: 'Ritual menor' }, { level: 10, mana: 22, feature: 'Pacto profano' }, { level: 20, mana: 45, feature: 'Arquimago lúgubre' }] }
  ]
};

async function createSeedAdmin() {
  return {
    id: crypto.randomUUID(),
    name: 'Andre Admin',
    email: 'andreulbrich2012@gmail.com',
    password_hash: await bcrypt.hash('adm123', 10),
    role: 'admin',
    created_at: new Date().toISOString()
  };
}

async function writeStore(data) {
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    const data = JSON.parse(await fs.readFile(dataFile, 'utf8'));
    for (const [key, value] of Object.entries(defaultData)) {
      if (!Array.isArray(data[key])) data[key] = value;
    }
    for (const key of ['origins', 'races', 'classes', 'skills']) {
      for (const item of defaultData[key]) {
        const index = data[key].findIndex((row) => row.id === item.id);
        if (index >= 0) data[key][index] = { ...data[key][index], ...item };
        else data[key].push(item);
      }
    }
    if (!data.users.some((user) => user.email === 'andreulbrich2012@gmail.com')) {
      data.users.push(await createSeedAdmin());
    }
    await writeStore(data);
    return data;
  } catch {
    const data = { ...defaultData, users: [await createSeedAdmin()] };
    await writeStore(data);
    return data;
  }
}

export async function findLocalUserByEmail(email) {
  const data = await ensureStore();
  return data.users.find((user) => user.email === email.toLowerCase());
}

export async function createLocalUser({ name, email, password, role = 'player' }) {
  const data = await ensureStore();
  if (data.users.some((user) => user.email === email.toLowerCase())) {
    const error = new Error('Email já cadastrado.');
    error.status = 409;
    throw error;
  }
  const user = { id: crypto.randomUUID(), name, email: email.toLowerCase(), password_hash: await bcrypt.hash(password, 10), role, created_at: new Date().toISOString() };
  data.users.push(user);
  await writeStore(data);
  return user;
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
  const row = {
    ...character,
    id: crypto.randomUUID(),
    owner_id: ownerId,
    player_name: character.playerName,
    character_name: character.characterName,
    race_id: character.raceId || null,
    class_id: character.classId || null,
    origin_id: character.originId || null,
    share_token: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  data.characters.push(row);
  await writeStore(data);
  return row;
}

export async function updateLocalCharacter(id, ownerId, character) {
  const data = await ensureStore();
  const index = data.characters.findIndex((row) => row.id === id && row.owner_id === ownerId);
  if (index === -1) return null;
  data.characters[index] = {
    ...data.characters[index],
    ...character,
    player_name: character.playerName,
    character_name: character.characterName,
    race_id: character.raceId || null,
    class_id: character.classId || null,
    origin_id: character.originId || null,
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
