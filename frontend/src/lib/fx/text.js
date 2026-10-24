// Normalizacao de texto pt-BR: o mestre escreve "Benção", "Bencao" ou "BÊNÇÃO";
// a classificacao precisa tratar tudo igual.
export function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Casa por inicio de palavra ("flech" pega flecha/flechas, mas "arco" nao pega "marco").
// Palavras-chave com espaco ("duas maos") casam como frase. Terminar com "$" exige
// palavra inteira ("sol$" nao pode pegar "soldado").
export function hasWord(text, word) {
  if (!text || !word) return false;
  if (word.endsWith('$')) return (` ${text} `).includes(` ${word.slice(0, -1)} `);
  return (` ${text}`).includes(` ${word}`);
}

export function countWords(text, words) {
  let n = 0;
  for (const w of words) if (hasWord(text, w)) n++;
  return n;
}
