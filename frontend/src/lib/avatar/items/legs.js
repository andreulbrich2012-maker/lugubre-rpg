export const LEGS = [
  { id: 'calca-simples', name: 'Calça simples', channels: [{ label: 'Tecido', def: 'couro' }], draw(L, P) {
    for (const l of P.legs) L.fill(l, 'a', { y1: l.foot.y - 1 });
  } }
];
