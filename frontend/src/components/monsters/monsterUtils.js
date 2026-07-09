export const monsterCategories = [
  'Elementais',
  'Mortos-vivos',
  'Feras',
  'Demônios',
  'Aberrações',
  'Humanoides',
  'Construtos',
  'Espíritos',
  'Criaturas do Caos',
  'Outros'
];

export const difficultyOptions = ['Baixa', 'Média', 'Alta', 'Mortal', 'Lendária'];

export function itemsText(items = []) {
  return Array.isArray(items) ? items.join(', ') : String(items || '');
}

export function parseItems(value) {
  if (Array.isArray(value)) return value;
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

export function blankMonster() {
  return {
    name: '',
    imageUrl: '',
    tokenUrl: '',
    category: 'Outros',
    difficulty: 'Média',
    baseHealth: 8,
    armor: 10,
    items: '',
    description: '',
    attacks: [{ name: '', damageFormula: '1d6', description: '' }]
  };
}

export function monsterToForm(monster) {
  return {
    id: monster.id,
    name: monster.name || '',
    imageUrl: monster.image_url || '',
    tokenUrl: monster.token_url || monster.image_url || '',
    category: monster.category || 'Outros',
    difficulty: monster.difficulty || 'Média',
    baseHealth: monster.base_health ?? 8,
    armor: monster.armor ?? 10,
    items: itemsText(monster.items),
    description: monster.description || '',
    attacks: (monster.attacks || []).map((attack) => ({
      id: attack.id,
      name: attack.name || '',
      damageFormula: attack.damage_formula || '1d6',
      description: attack.description || ''
    }))
  };
}

export function formToMonsterPayload(form) {
  return {
    name: form.name,
    imageUrl: form.imageUrl,
    tokenUrl: form.tokenUrl || form.imageUrl,
    category: form.category,
    difficulty: form.difficulty,
    baseHealth: Number(form.baseHealth || 0),
    armor: Number(form.armor || 0),
    items: parseItems(form.items),
    description: form.description,
    attacks: (form.attacks || [])
      .filter((attack) => attack.name.trim() && attack.damageFormula.trim())
      .map((attack) => ({
        name: attack.name,
        damageFormula: attack.damageFormula,
        description: attack.description || ''
      }))
  };
}
