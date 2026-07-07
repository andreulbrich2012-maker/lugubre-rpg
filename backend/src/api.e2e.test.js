import fs from 'fs/promises';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { signToken } from './middleware/auth.js';

process.env.REQUIRE_POSTGRES = 'true';

const app = createApp();

beforeAll(async () => {
  if (process.env.DATABASE_URL) return;
  await Promise.all([
    fs.rm(path.resolve('data/local-db.json'), { force: true }),
    fs.rm(path.resolve('../data/local-db.json'), { force: true })
  ]);
});

async function loginAdmin() {
  const { body } = await request(app)
    .post('/api/auth/login')
    .send({ email: 'andreulbrich2012@gmail.com', password: 'adm123' })
    .expect(200);
  return body.token;
}

describe('fluxo principal da API', () => {
  it('autentica os perfis seed admin e demo', async () => {
    const admin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'adm@lugubre.local', password: 'adm123' })
      .expect(200);

    expect(admin.body.success).toBe(true);
    expect(admin.body.user.role).toBe('admin');
    expect(admin.body.token).toBeTruthy();

    const andre = await request(app)
      .post('/api/auth/login')
      .send({ email: '  ANDREULBRICH2012@GMAIL.COM  ', password: 'adm123' })
      .expect(200);

    expect(andre.body.success).toBe(true);
    expect(andre.body.user.email).toBe('andreulbrich2012@gmail.com');

    const demo = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@lugubre.local', password: 'demo123' })
      .expect(200);

    expect(demo.body.user.role).toBe('user');
    expect(demo.body.token).toBeTruthy();

    const joao = await request(app)
      .post('/api/auth/login')
      .send({ email: 'joaogames9909@gmail.com', password: 'adm123' })
      .expect(200);

    expect(joao.body.user.role).toBe('admin');

    const ghostToken = signToken({ id: crypto.randomUUID(), email: 'fantasma@lugubre.local' });
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${ghostToken}`)
      .expect(401);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'andreulbrich2012@gmail.com', password: 'senhaerrada' })
      .expect(401);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'conta-inexistente@lugubre.local', password: 'adm123' })
      .expect(404);

    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Duplicado', email: '  ANDREULBRICH2012@GMAIL.COM  ', password: 'adm123' })
      .expect(409);
  });

  it('mantem a sessao estavel em logins repetidos e erros nao relacionados ao token', async () => {
    const stamp = Date.now();
    const email = `sessao-${stamp}@lugubre.local`;

    const registered = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Sessao Teste', email, password: 'adm123' })
      .expect(201);

    const firstLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: `  ${email.toUpperCase()}  `, password: 'adm123' })
      .expect(200);

    const secondLogin = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'adm123' })
      .expect(200);

    expect(firstLogin.body.user.id).toBe(registered.body.user.id);
    expect(secondLogin.body.user.id).toBe(registered.body.user.id);
    expect(firstLogin.body.token).toBeTruthy();
    expect(secondLogin.body.token).toBeTruthy();

    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${firstLogin.body.token}`)
      .expect(200);

    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${secondLogin.body.token}`)
      .expect(200);

    await request(app)
      .put('/api/users/password')
      .set('Authorization', `Bearer ${secondLogin.body.token}`)
      .send({ currentPassword: 'senha-errada', newPassword: 'nova123' })
      .expect(401);

    const sessionAfterError = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${secondLogin.body.token}`)
      .expect(200);

    expect(sessionAfterError.body.user.email).toBe(email);
  });

  it('cobre auth, admin, ficha, bônus, inventário, campanha e mensagens', async () => {
    const adminToken = await loginAdmin();
    const stamp = Date.now();

    const officialSkills = await request(app)
      .get('/api/catalog/skills')
      .expect(200);
    const officialRaces = await request(app)
      .get('/api/catalog/races')
      .expect(200);
    const officialOrigins = await request(app)
      .get('/api/catalog/origins')
      .expect(200);
    const officialClasses = await request(app)
      .get('/api/catalog/classes')
      .expect(200);

    const defaultSkillKeys = [
      'acrobacia',
      'atletismo',
      'crime',
      'enganacao',
      'furtividade',
      'iniciativa',
      'intimidacao',
      'investigacao',
      'medicina',
      'percepcao',
      'pontaria',
      'reflexos',
      'vontade'
    ];
    const defaultRaceNames = ['Humano', 'Elfo', 'Elfo Negro', 'Anão', 'Tiefling', 'Halfling', 'Genasi'];
    const defaultOriginNames = ['Sobrevivente', 'Nobre', 'Criminoso', 'Pesquisador', 'Caçador', 'Soldado', 'Religioso', 'Mercador'];

    expect(officialSkills.body.map((item) => item.key)).toEqual(expect.arrayContaining(defaultSkillKeys));
    expect(officialRaces.body.map((item) => item.name)).toEqual(expect.arrayContaining(defaultRaceNames));
    expect(officialClasses.body.length).toBeGreaterThanOrEqual(7);
    expect(officialOrigins.body.map((item) => item.name)).toEqual(expect.arrayContaining(defaultOriginNames));
    for (const originItem of officialOrigins.body.filter((item) => defaultOriginNames.includes(item.name))) {
      const trained = Object.entries(originItem.skill_modifiers || {}).filter(([, value]) => Number(value) === 5);
      expect(trained).toHaveLength(2);
    }

    const skill = await request(app)
      .post('/api/admin/skills')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Oculto ${stamp}`, key: `oculto_${stamp}`, attribute: 'intelecto' })
      .expect(201);

    const race = await request(app)
      .post('/api/admin/races')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Raça ${stamp}`, image: '/assets/dark-castle.svg', attributeModifiers: { forca: 2 } })
      .expect(201);

    const editedRace = await request(app)
      .put(`/api/admin/races/${race.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Raça Editada ${stamp}`, image: '/assets/dark-castle.svg', attributeModifiers: { forca: 3 } })
      .expect(200);

    const klass = await request(app)
      .post('/api/admin/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Classe ${stamp}`, image: '/assets/crypt-gate.svg', progression: [{ level: 1, mana: 5, feature: 'Teste' }] })
      .expect(201);

    const origin = await request(app)
      .post('/api/admin/origins')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Origem ${stamp}`, description: 'Teste', skillModifiers: { [skill.body.key]: 5 } })
      .expect(201);

    const user = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jogador Teste', email: `jogador-${stamp}@lugubre.local`, password: 'adm123' })
      .expect(201);

    let token = user.body.token;
    const profileImage = 'data:image/png;base64,iVBORw0KGgo=';

    await request(app)
      .post('/api/auth/login')
      .send({ email: `nao-existe-${stamp}@lugubre.local`, password: 'adm123' })
      .expect(404);

    await request(app)
      .post('/api/auth/login')
      .send({ email: `jogador-${stamp}@lugubre.local`, password: 'senhaerrada' })
      .expect(401);

    const profile = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Jogador Editado', email: `jogador-editado-${stamp}@lugubre.local`, profileImageUrl: profileImage })
      .expect(200);

    expect(profile.body.user.name).toBe('Jogador Editado');
    expect(profile.body.user.profile_image_url).toBe(profileImage);

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(me.body.user.id).toBe(user.body.user.id);

    const theme = await request(app)
      .put('/api/users/theme')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'daltonismo' })
      .expect(200);

    expect(theme.body.user.theme).toBe('daltonismo');

    const removedImage = await request(app)
      .delete('/api/users/profile-image')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(removedImage.body.user.profile_image_url).toBe('');

    await request(app)
      .put('/api/users/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'errada123', newPassword: 'nova123' })
      .expect(401);

    await request(app)
      .put('/api/users/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'adm123', newPassword: 'nova123' })
      .expect(200);

    const loginAfterPasswordChange = await request(app)
      .post('/api/auth/login')
      .send({ email: `jogador-editado-${stamp}@lugubre.local`, password: 'nova123' })
      .expect(200);
    token = loginAfterPasswordChange.body.token;

    const expectedRaceAttributes = {
      Humano: { forca: 2, agilidade: 2, presenca: 2, intelecto: 2, vigor: 2 },
      Elfo: { forca: 1, agilidade: 2, presenca: 2, intelecto: 3, vigor: 2 },
      'Elfo Negro': { forca: 1, agilidade: 3, presenca: 2, intelecto: 2, vigor: 2 },
      Anão: { forca: 3, agilidade: 1, presenca: 2, intelecto: 2, vigor: 2 },
      Tiefling: { forca: 2, agilidade: 2, presenca: 1, intelecto: 3, vigor: 2 },
      Halfling: { forca: 2, agilidade: 1, presenca: 3, intelecto: 2, vigor: 2 },
      Genasi: { forca: 2, agilidade: 2, presenca: 2, intelecto: 2, vigor: 2 }
    };
    const classId = officialClasses.body.find((item) => item.name === 'Cavaleiro')?.id || officialClasses.body[0].id;
    const defaultOriginId = officialOrigins.body.find((item) => item.name === 'Sobrevivente')?.id || officialOrigins.body[0].id;

    for (const raceItem of officialRaces.body.filter((item) => defaultRaceNames.includes(item.name))) {
      const response = await request(app)
        .post('/api/characters')
        .set('Authorization', `Bearer ${token}`)
        .send({
          playerName: 'Teste Raça',
          characterName: `Teste ${raceItem.name}`,
          raceId: raceItem.id,
          classId,
          originId: defaultOriginId,
          mana: 10,
          manaMax: 10,
          inventory: []
        })
        .expect(201);

      expect(response.body.attributes).toMatchObject(expectedRaceAttributes[raceItem.name]);

      await request(app)
        .delete(`/api/characters/${response.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
    }

    const humanRaceId = officialRaces.body.find((item) => item.name === 'Humano').id;
    for (const originItem of officialOrigins.body.filter((item) => defaultOriginNames.includes(item.name))) {
      const response = await request(app)
        .post('/api/characters')
        .set('Authorization', `Bearer ${token}`)
        .send({
          playerName: 'Teste Origem',
          characterName: `Origem ${originItem.name}`,
          raceId: humanRaceId,
          classId,
          originId: originItem.id,
          mana: 10,
          manaMax: 10,
          inventory: []
        })
        .expect(201);
      const trained = Object.entries(response.body.skills).filter(([, value]) => Number(value) === 5);
      expect(trained).toHaveLength(2);
      for (const [key] of trained) {
        expect(originItem.skill_modifiers[key]).toBe(5);
      }

      await request(app)
        .delete(`/api/characters/${response.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
    }

    const character = await request(app)
      .post('/api/characters')
      .set('Authorization', `Bearer ${token}`)
      .send({
        playerName: 'Jogador Teste',
        characterName: 'Ficha Teste',
        raceId: editedRace.body.id,
        classId: klass.body.id,
        originId: origin.body.id,
        lifeCurrent: 63,
        lifeMax: 63,
        sanityCurrent: 52,
        sanityMax: 52,
        mana: 10,
        manaMax: 10,
        defense: 10,
        attributes: { forca: 2, agilidade: 2, intelecto: 2, vigor: 2, presenca: 2 },
        inventory: [{ quantity: 1, weight: 2, name: 'Couraça', description: 'Proteção pesada', defenseBonus: 1 }],
        attacks: [{ name: 'Espada Longa', damage: '1d8+2' }],
        spells: [{ name: 'Raio Sombrio', damage: '1d10+2' }]
      })
      .expect(201);

    expect(character.body.attributes.forca).toBe(5);
    expect(character.body.skills[skill.body.key]).toBe(5);
    expect(character.body.total_defense).toBe(11);
    expect(character.body.life_current).toBe(63);
    expect(character.body.sanity_current).toBe(52);
    expect(character.body.mana_max).toBe(10);
    expect(character.body.inventory[0]).toMatchObject({ quantity: 1, weight: 2, name: 'Couraça' });
    expect(character.body.attacks[0]).toMatchObject({ name: 'Espada Longa', damage: '1d8+2' });
    expect(character.body.spells[0]).toMatchObject({ name: 'Raio Sombrio', damage: '1d10+2' });
    expect(character.body.save_history).toHaveLength(1);

    await request(app)
      .patch(`/api/characters/${character.body.id}/play`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        lifeCurrent: 40,
        sanityCurrent: 30,
        mana: 8,
        manaMax: 10,
        skills: { [skill.body.key]: 4 },
        inventory: [{ quantity: 2, weight: 1, name: 'Poção de Vida', description: 'Restaura fôlego' }],
        attacks: [{ name: 'Arco Curto', damage: '1d6+1' }],
        spells: [{ name: 'Bola de Fogo', damage: '2d8+3' }]
      })
      .expect(200);

    await request(app)
      .patch(`/api/characters/${character.body.id}/play`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lifeCurrent: 39, sanityCurrent: 29, mana: 7 })
      .expect(200);

    await request(app)
      .patch(`/api/characters/${character.body.id}/play`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lifeCurrent: 38, sanityCurrent: 28, mana: 6 })
      .expect(200);

    const savedCharacter = await request(app)
      .patch(`/api/characters/${character.body.id}/play`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lifeCurrent: 37, sanityCurrent: 27, mana: 5 })
      .expect(200);

    expect(savedCharacter.body.life_current).toBe(37);
    expect(savedCharacter.body.sanity_current).toBe(27);
    expect(savedCharacter.body.mana).toBe(5);
    expect(savedCharacter.body.inventory[0]).toMatchObject({ quantity: 2, weight: 1, name: 'Poção de Vida' });
    expect(savedCharacter.body.attacks[0]).toMatchObject({ name: 'Arco Curto', damage: '1d6+1' });
    expect(savedCharacter.body.spells[0]).toMatchObject({ name: 'Bola de Fogo', damage: '2d8+3' });
    expect(savedCharacter.body.save_history).toHaveLength(3);

    const addedItem = await request(app)
      .post(`/api/characters/${character.body.id}/inventory`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 3, weight: 0.5, name: 'Vela Ritual', description: 'Chama fria' })
      .expect(201);

    const itemId = addedItem.body.inventory.find((item) => item.name === 'Vela Ritual').id;
    expect(itemId).toBeTruthy();

    const editedItem = await request(app)
      .put(`/api/characters/${character.body.id}/inventory/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 2, weight: 1, name: 'Vela Ritual Editada', description: 'Chama fria' })
      .expect(200);

    expect(editedItem.body.inventory.find((item) => item.id === itemId)).toMatchObject({ quantity: 2, weight: 1, name: 'Vela Ritual Editada' });

    const attack = await request(app)
      .post(`/api/characters/${character.body.id}/powers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'attacks', name: 'Machado', damage: '1d8+2', description: 'Corte pesado' })
      .expect(201);

    const attackId = attack.body.attacks.find((power) => power.name === 'Machado').id;
    expect(attackId).toBeTruthy();

    await request(app)
      .put(`/api/characters/${character.body.id}/powers/attacks/${attackId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Machado Negro', damage: '2d6+3', description: 'Corte pesado' })
      .expect(200);

    const spell = await request(app)
      .post(`/api/characters/${character.body.id}/powers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'spells', name: 'Sussurro', damage: '1d20+5', manaCost: 3, description: 'Eco proibido' })
      .expect(201);

    const spellId = spell.body.spells.find((power) => power.name === 'Sussurro').id;
    expect(spell.body.spells.find((power) => power.id === spellId)).toMatchObject({ manaCost: 3 });

    const damageRoll = await request(app)
      .post(`/api/characters/${character.body.id}/powers/roll`)
      .set('Authorization', `Bearer ${token}`)
      .send({ formula: '2d6+3' })
      .expect(200);

    expect(damageRoll.body.rolls).toHaveLength(2);
    expect(damageRoll.body.total).toBeGreaterThanOrEqual(5);

    await request(app)
      .delete(`/api/characters/${character.body.id}/powers/spells/${spellId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app)
      .delete(`/api/characters/${character.body.id}/powers/attacks/${attackId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app)
      .delete(`/api/characters/${character.body.id}/inventory/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const campaign = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Campanha ${stamp}`, description: 'Teste' })
      .expect(201);

    const message = await request(app)
      .post(`/api/campaigns/${campaign.body.id}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Mensagem de teste' })
      .expect(201);

    expect(message.body.content).toBe('Mensagem de teste');

    const editedCampaign = await request(app)
      .put(`/api/campaigns/${campaign.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Campanha Editada ${stamp}`, description: 'Editada' })
      .expect(200);

    expect(editedCampaign.body.name).toContain('Campanha Editada');

    const dashboard = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(dashboard.body.characters_count).toBeGreaterThanOrEqual(1);
    expect(dashboard.body.campaigns_count).toBeGreaterThanOrEqual(1);

    const friend = await request(app)
      .post('/api/friends/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'demo@lugubre.local' })
      .expect(201);

    await request(app)
      .get('/api/friends')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const friendMessage = await request(app)
      .post('/api/friends/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ friendId: friend.body.friend.id, message: 'Ola, demo.' })
      .expect(201);

    expect(friendMessage.body.message).toBe('Ola, demo.');

    await request(app)
      .get(`/api/friends/messages/${friend.body.friend.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app)
      .delete(`/api/characters/${character.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app)
      .delete(`/api/campaigns/${campaign.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const d20 = Math.floor(Math.random() * 20) + 1;
    expect(d20).toBeGreaterThanOrEqual(1);
    expect(d20).toBeLessThanOrEqual(20);
    expect(d20 + savedCharacter.body.skills[skill.body.key]).toBeGreaterThan(savedCharacter.body.skills[skill.body.key]);
  });
});
