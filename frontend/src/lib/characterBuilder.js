const requiredNumbers = [
  'level',
  'lifeCurrent',
  'lifeMax',
  'sanityCurrent',
  'sanityMax',
  'mana',
  'manaMax',
  'defense'
];

export function validateCharacterDraft(form, catalog) {
  if (!form.playerName?.trim()) return { step: 0, message: 'Informe o nome do jogador.' };
  if (!form.characterName?.trim()) return { step: 1, message: 'Informe o nome do personagem.' };
  if (!form.raceId) return { step: 3, message: 'Escolha uma raça.' };
  if (!catalog.races.some((item) => item.id === form.raceId)) return { step: 3, message: 'A raça selecionada não está mais disponível. Escolha outra opção.' };
  if (!form.classId) return { step: 4, message: 'Escolha uma classe.' };
  if (!catalog.classes.some((item) => item.id === form.classId)) return { step: 4, message: 'A classe selecionada não está mais disponível. Escolha outra opção.' };
  if (!form.originId && !form.origin?.trim()) return { step: 5, message: 'Escolha uma origem.' };
  if (form.originId && !catalog.origins.some((item) => item.id === form.originId)) return { step: 5, message: 'A origem selecionada não está mais disponível. Escolha outra opção.' };

  if (requiredNumbers.some((field) => !Number.isFinite(Number(form[field])))) {
    return { step: 8, message: 'A ficha contém um valor numérico inválido.' };
  }
  if (Number(form.lifeMax) < 1 || Number(form.sanityMax) < 1 || Number(form.manaMax) < 0) {
    return { step: 8, message: 'Os valores máximos da ficha são inválidos.' };
  }
  if (Number(form.lifeCurrent) < 0 || Number(form.sanityCurrent) < 0 || Number(form.mana) < 0) {
    return { step: 8, message: 'Vida, Sanidade e Mana não podem ser negativas.' };
  }
  return null;
}

export function buildCharacterPayload(form, { includeSkills = false } = {}) {
  const payload = {
    ...form,
    playerName: form.playerName.trim(),
    characterName: form.characterName.trim(),
    origin: form.origin?.trim() || '',
    level: Number(form.level),
    lifeCurrent: Number(form.lifeCurrent),
    lifeMax: Number(form.lifeMax),
    sanityCurrent: Number(form.sanityCurrent),
    sanityMax: Number(form.sanityMax),
    mana: Number(form.mana),
    manaMax: Number(form.manaMax),
    defense: Number(form.defense),
    inventory: (form.inventory || []).map((item) => ({
      ...item,
      quantity: Number(item.quantity ?? 1),
      weight: Number(item.weight || 0),
      defenseBonus: Number(item.defenseBonus || 0)
    }))
  };
  if (!includeSkills) delete payload.skills;
  return payload;
}

export function characterSaveError(error) {
  const status = error?.response?.status;
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (status === 413) return 'A imagem é grande demais. Escolha um arquivo de até 2 MB.';
  return error?.response?.data?.message || error?.message || 'Não foi possível salvar o personagem no banco de dados.';
}

