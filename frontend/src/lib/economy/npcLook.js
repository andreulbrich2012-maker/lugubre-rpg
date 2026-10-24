// Aparencia em pixel art de um mercador: boneco sorteado (mesmo motor da ficha) com a roupa do
// oficio. Semente = texto qualquer (o mesmo texto sempre da o mesmo boneco).
import { randomAppearance, repairAppearance } from '../avatar/appearance';
import { getItem } from '../avatar/catalog';

// slot -> [id da peca, cores opcionais]; peca que nao existir no catalogo e ignorada
const OUTFITS = {
  ferreiro: { torso: ['colete-ferreiro'], waist: ['cinto-ferramentas'], held: ['martelo-ferreiro'] },
  armadureiro: { torso: ['casaco-militar'], waist: ['cinto-rebites'], held: ['martelo'] },
  boticario: { torso: ['robe-alquimista'], waist: ['bolsa-ervas'], head: ['capuz'] },
  taberneiro: { torso: ['avental-cozinha'], waist: ['cinto-bolsa'], head: ['chapeu-cozinheiro'] },
  mercador: { torso: ['colete-bolsos'], waist: ['bolsa-moedas'], head: ['chapeu-aba-larga'] },
  barqueiro: { torso: ['bata-pescador'], head: ['tricorne'], waist: ['cinto-corda'] },
  estalajadeiro: { torso: ['colete-botoes'], waist: ['cinto-chaves'], held: ['lanterna'] },
  cavalarico: { torso: ['tunica-cacador'], head: ['chapeu-palha'], waist: ['cinto-couro'] },
  mago: { torso: ['robe-mago'], head: ['chapeu-mago'], held: ['cajado-cristal'] },
  joalheiro: { torso: ['casaco-erudito'], waist: ['bolsa-moedas'], held: ['livro'] }
};

function seeded(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function merchantAppearance(archetype, seed = String(Math.random())) {
  const rand = seeded(`${archetype}:${seed}`);
  const app = randomAppearance(rand);
  // oficio por cima do sorteio; tira acessorios que brigam com ele
  const outfit = OUTFITS[archetype] || {};
  for (const slot of ['head', 'held', 'face', 'back']) if (!outfit[slot]) delete app.layers[slot];
  for (const [slot, [id, colors]] of Object.entries(outfit)) {
    const item = getItem(slot, id);
    if (!item) continue;
    app.layers[slot] = { id, colors: colors || app.layers[slot]?.colors || item.channels.map((c) => c.def) };
  }
  return repairAppearance(app);
}
