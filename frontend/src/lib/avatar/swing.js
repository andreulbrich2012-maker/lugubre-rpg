// Aviso "este token atacou": a sala chama swing(tokenId) quando chega um ataque e o
// AvatarSprite daquele token toca a pose de golpe (anim 'attack', 3 quadros) uma vez.
// Fica fora do React para nao renderizar a mesa inteira a cada ataque.
const subs = new Map();

export function swing(tokenId) {
  if (!tokenId) return;
  for (const fn of subs.get(tokenId) || []) fn();
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
