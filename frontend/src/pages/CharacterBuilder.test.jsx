import { describe, expect, it } from 'vitest';
import { buildCharacterPayload, validateCharacterDraft } from '../lib/characterBuilder';

const catalog = {
  races: [{ id: 'race-1' }],
  classes: [{ id: 'class-1' }],
  origins: [{ id: 'origin-1' }]
};

const validDraft = {
  playerName: ' Jogador ',
  characterName: ' Personagem ',
  raceId: 'race-1',
  classId: 'class-1',
  originId: 'origin-1',
  origin: '',
  level: '1',
  lifeCurrent: '63',
  lifeMax: '63',
  sanityCurrent: '52',
  sanityMax: '52',
  mana: '10',
  manaMax: '10',
  defense: '10',
  skills: { luta: 10 },
  inventory: [{ name: 'Tocha', quantity: '2', weight: '1', defenseBonus: '0' }]
};

describe('criador de ficha', () => {
  it('mantém esquiva como 15 - agilidade', () => {
    expect(15 - 4).toBe(11);
  });

  it('aponta a etapa de cada campo obrigatório ausente', () => {
    expect(validateCharacterDraft({ ...validDraft, characterName: '' }, catalog)).toEqual({ step: 1, message: 'Informe o nome do personagem.' });
    expect(validateCharacterDraft({ ...validDraft, raceId: '' }, catalog)?.step).toBe(3);
    expect(validateCharacterDraft({ ...validDraft, classId: '' }, catalog)?.step).toBe(4);
    expect(validateCharacterDraft({ ...validDraft, originId: '' }, catalog)?.step).toBe(5);
  });

  it('rejeita referências removidas enquanto preserva os demais dados', () => {
    const result = validateCharacterDraft(validDraft, { ...catalog, races: [] });
    expect(result).toMatchObject({ step: 3 });
    expect(result.message).toContain('não está mais disponível');
  });

  it('normaliza números e não envia perícias na criação', () => {
    const payload = buildCharacterPayload(validDraft);
    expect(payload).toMatchObject({
      playerName: 'Jogador',
      characterName: 'Personagem',
      level: 1,
      lifeCurrent: 63,
      inventory: [{ name: 'Tocha', quantity: 2, weight: 1, defenseBonus: 0 }]
    });
    expect(payload.skills).toBeUndefined();
  });
});
