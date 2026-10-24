// Tipos de barco (mesma tabela de backend/src/utils/boats.js; o teste confere) e o que o mestre
// pode soltar no mar. len/beam = casco no convés em celulas; speed = celulas por segundo no mar.
export const BOAT_TYPES = {
  bote: { id: 'bote', name: 'Bote a remo', len: 6, beam: 5, speed: 0.8, capacity: 3, masts: 0, hold: false },
  pesca: { id: 'pesca', name: 'Barco de pesca', len: 9, beam: 5, speed: 1.0, capacity: 6, masts: 1, hold: false },
  veleiro: { id: 'veleiro', name: 'Veleiro', len: 11, beam: 5, speed: 1.6, capacity: 10, masts: 1, hold: true },
  gale: { id: 'gale', name: 'Galé', len: 17, beam: 7, speed: 1.3, capacity: 30, masts: 1, hold: true },
  navio: { id: 'navio', name: 'Navio grande', len: 21, beam: 9, speed: 1.4, capacity: 60, masts: 3, hold: true }
};
export const BOAT_TYPE_LIST = Object.values(BOAT_TYPES);
export const boatType = (id) => BOAT_TYPES[id] || BOAT_TYPES.pesca;

// Monstros da agua: o nome escolhe o bicho em pixel art (lib/monsters/classify).
export const SEA_MONSTERS = [
  { name: 'Serpente marinha', hp: 60 },
  { name: 'Tentáculo de kraken', hp: 30 },
  { name: 'Kraken', hp: 120 },
  { name: 'Tubarão', hp: 25 },
  { name: 'Enguia gigante', hp: 18 },
  { name: 'Água-viva gigante', hp: 12 },
  { name: 'Afogado', hp: 16 },
  { name: 'Tritão corrompido', hp: 30 }
];

// Velocidades que o mestre escolhe (multiplica a do tipo de barco).
export const SPEED_STEPS = [['½×', 0.5], ['1×', 1], ['2×', 2], ['4×', 4], ['10×', 10]];

export const isSeaScene = (scene) => Boolean(scene?.map_kind === 'tiles' && scene?.tiles?.sea);
export const isVesselScene = (scene) => Boolean(scene?.tiles?.vessel);
