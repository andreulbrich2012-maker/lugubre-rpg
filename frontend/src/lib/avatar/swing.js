// Aviso "este token atacou": a sala chama swing(tokenId) quando chega um ataque e o
// AvatarSprite daquele token toca a pose de golpe (anim 'attack', 3 quadros) uma vez.
// Fica fora do React para nao renderizar a mesa inteira a cada ataque.
const subs = new Map();

// from/to (opcionais, em px do mapa): o boneco vira para o alvo durante o golpe.
export function swing(tokenId, from, to) {
  if (!tokenId) return;
  const dir = facing(from, to);
  for (const fn of subs.get(tokenId) || []) fn(dir);
}

export function facing(from, to) {
  if (!from || !to) return null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (!dx && !dy) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

export function onSwing(tokenId, fn) {
  if (!tokenId) return () => {};
  if (!subs.has(tokenId)) subs.set(tokenId, new Set());
  subs.get(tokenId).add(fn);
  return () => {
    const set = subs.get(tokenId);
    set?.delete(fn);
    if (set && !set.size) subs.delete(tokenId);
  };
}
