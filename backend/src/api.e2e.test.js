import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

const app = createApp();

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

    expect(admin.body.user.role).toBe('admin');
    expect(admin.body.token).toBeTruthy();

    const demo = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@lugubre.local', password: 'demo123' })
      .expect(200);

    expect(demo.body.user.role).toBe('player');
    expect(demo.body.token).toBeTruthy();
  });

  it('cobre auth, admin, ficha, bônus, inventário, campanha e mensagens', async () => {
    const adminToken = await loginAdmin();
    const stamp = Date.now();

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
      .send({ name: `Origem ${stamp}`, description: 'Teste', skillModifiers: { [skill.body.key]: 2 } })
      .expect(201);

    const user = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jogador Teste', email: `jogador-${stamp}@lugubre.local`, password: 'adm123' })
      .expect(201);

    const token = user.body.token;
    const character = await request(app)
      .post('/api/characters')
      .set('Authorization', `Bearer ${token}`)
      .send({
        playerName: 'Jogador Teste',
        characterName: 'Ficha Teste',
        raceId: editedRace.body.id,
        classId: klass.body.id,
        originId: origin.body.id,
        mana: 10,
        defense: 10,
        attributes: { forca: 2, agilidade: 2, intelecto: 2, vigor: 2, presenca: 2 },
        inventory: [{ name: 'Couraça', weight: 2, defenseBonus: 1 }]
      })
      .expect(201);

    expect(character.body.attributes.forca).toBe(5);
    expect(character.body.skills[skill.body.key]).toBe(2);
    expect(character.body.total_defense).toBe(11);

    await request(app)
      .patch(`/api/characters/${character.body.id}/play`)
      .set('Authorization', `Bearer ${token}`)
      .send({ mana: 8, skills: { [skill.body.key]: 4 } })
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

    await request(app)
      .delete(`/api/characters/${character.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const d20 = Math.floor(Math.random() * 20) + 1;
    expect(d20).toBeGreaterThanOrEqual(1);
    expect(d20).toBeLessThanOrEqual(20);
  });
});
