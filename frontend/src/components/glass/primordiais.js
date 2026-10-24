// Os Oito Primordiais do livro 0.5 Beta (cap. O Mundo de Lugubre). Cada um vira um vidro do site.
export const PRIMORDIAIS = [
  { slug: 'caos', name: 'Caos', color: 'var(--p-caos)', hex: '#7a1630', domain: 'Criação, destruição, magia primordial e o desconhecido.' },
  { slug: 'gaia', name: 'Gaia', color: 'var(--p-gaia)', hex: '#1f6a3f', domain: 'Vida, natureza, proteção e resistência.' },
  { slug: 'ponto', name: 'Ponto', color: 'var(--p-ponto)', hex: '#1c3e9e', domain: 'Oceanos, profundezas, névoa e tempestades.' },
  { slug: 'erebo', name: 'Érebo', color: 'var(--p-erebo)', hex: '#3a2a5e', domain: 'Escuridão, sombras, silêncio e segredos.' },
  { slug: 'nix', name: 'Nix', color: 'var(--p-nix)', hex: '#232a6b', domain: 'Noite, sonhos, pesadelos e mistério.' },
  { slug: 'tartaro', name: 'Tártaro', color: 'var(--p-tartaro)', hex: '#8a3a14', domain: 'Corrupção, monstros, aprisionamento e maldições.' },
  { slug: 'eter', name: 'Éter', color: 'var(--p-eter)', hex: '#2a7c86', domain: 'Luz divina, esperança, cura e energia celestial.' },
  { slug: 'ananque', name: 'Ananque', color: 'var(--p-ananque)', hex: '#a4781a', domain: 'Destino, tempo, ordem e inevitabilidade.' }
];

export const primordialByName = Object.fromEntries(PRIMORDIAIS.map((p) => [p.name, p]));
