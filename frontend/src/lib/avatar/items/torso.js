export const TORSO = [
  { id: 'tunica-simples', name: 'Túnica simples', channels: [{ label: 'Tecido', def: 'linho' }], draw(L, P) {
    L.fill(P.torso, 'a');
    for (const a of P.arms) L.fill(a, 'a', { y1: a.top + 2 });
  } }
];
