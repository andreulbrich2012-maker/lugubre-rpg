// RNG deterministico: a semente e o rollId, entao todos os clientes da mesa
// sorteiam as mesmas particulas e veem exatamente a mesma animacao.

// FNV-1a de 32 bits: barato, sem dependencias e estavel entre navegadores.
export function hashSeed(value) {
  const str = String(value ?? '');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32: periodo suficiente para algumas centenas de particulas por golpe.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// O "salt" separa fluxos (rastro, impacto, poeira) para que mudar a quantidade
// de particulas de uma fase nao embaralhe as outras.
export function makeRng(seed, salt = '') {
  const next = mulberry32(hashSeed(`${seed}|${salt}`));
  return {
    next,
    range: (a, b) => a + (b - a) * next(),
    int: (a, b) => Math.floor(a + (b - a + 1) * next()),
    pick: (list) => list[Math.floor(next() * list.length)],
    sign: () => (next() < 0.5 ? -1 : 1),
    chance: (p) => next() < p
  };
}

// Ruido por quadro sem estado (para tremulacao/jitter): mesmo i e quadro => mesmo valor.
export function noise(i, frame, seed = 0) {
  let h = Math.imul((i + 1) ^ 0x9e3779b9, 2654435761) ^ Math.imul(frame + 7, 40503) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296) * 2 - 1;
}
