export const monsterCategories = [
  'Caos',
  'Gaia',
  'Ponto',
  'Érebo',
  'Nix',
  'Tártaro',
  'Éter',
  'Ananque'
];

export const monsterCategoryDescriptions = {
  Caos: 'Caos representa criação, destruição, magia primordial e o desconhecido.',
  Gaia: 'Gaia representa vida, natureza, proteção e resistência.',
  Ponto: 'Ponto representa oceanos, profundezas, névoa e tempestades.',
  Érebo: 'Érebo representa escuridão, sombras, silêncio e segredos.',
  Nix: 'Nix representa noite, sonhos, pesadelos e mistério.',
  Tártaro: 'Tártaro representa corrupção, monstros, aprisionamento e maldições.',
  Éter: 'Éter representa luz divina, esperança, cura e energia celestial.',
  Ananque: 'Ananque representa destino, tempo, ordem e inevitabilidade.'
};

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
    category: 'Caos',
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
    category: monster.category || 'Caos',
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
