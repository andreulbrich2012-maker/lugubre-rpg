// Folha de conferencia dos icones, sem dependencias: escreve PPM e o ffmpeg vira PNG.
// Uso: node src/lib/spellicons/preview.mjs <pasta> [magias|tecnicas|exemplos]
// Depois: ffmpeg -loglevel error -y -i x.ppm -vf scale=iw*4:ih*4:flags=neighbor x.png
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderIconPixels, ICON_SIZE as S } from './compose.js';
import { ELEMENT_IDS, SPELL_FORMS, MANEUVERS, WEAPONS } from './classify.js';

const out = process.argv[2] || '.';
const mode = process.argv[3] || 'magias';
const BG = [30, 24, 32]; // fundo escuro do site: os icones vivem sobre vidro escuro
const GAP = 3;

function canvas(cols, rows) {
  const w = cols * (S + GAP) + GAP, h = rows * (S + GAP) + GAP;
  const px = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) px.set(BG, i * 3);
  return { w, h, px };
}
function blit(c, { data }, col, row) {
  const ox = GAP + col * (S + GAP), oy = GAP + row * (S + GAP);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    if (!data[i + 3]) continue;
    const o = ((oy + y) * c.w + ox + x) * 3;
    c.px[o] = data[i]; c.px[o + 1] = data[i + 1]; c.px[o + 2] = data[i + 2];
  }
}
function save(c, name) {
  writeFileSync(join(out, name), Buffer.concat([Buffer.from(`P6\n${c.w} ${c.h}\n255\n`), Buffer.from(c.px)]));
  console.log(join(out, name));
}

if (mode === 'magias') {
  // linhas = elementos (+ arcano), colunas = formas (+ variantes raizes e portal)
  const cols = [...SPELL_FORMS.map((f) => [f, '']), ['controle', 'raizes'], ['movimento', 'portal']];
  const rows = [...ELEMENT_IDS, null];
  const c = canvas(cols.length, rows.length);
  rows.forEach((element, r) => cols.forEach(([form, variant], k) => {
    blit(c, renderIconPixels({ kind: 'magia', form, variant, element }), k, r);
  }));
  save(c, 'icones-magias.ppm');
} else if (mode === 'tecnicas') {
  // 29 armas com a manobra natural, depois as 7 manobras na espada e com elementos
  const per = 10;
  const rowsW = Math.ceil(WEAPONS.length / per);
  const c = canvas(per, rowsW + 2);
  WEAPONS.forEach((w, n) => blit(c, renderIconPixels({ kind: 'tecnica', weapon: w.id, maneuver: w.maneuver, form: w.maneuver }), n % per, Math.floor(n / per)));
  MANEUVERS.forEach((m, k) => blit(c, renderIconPixels({ kind: 'tecnica', weapon: 'espada-longa', maneuver: m, form: m }), k, rowsW));
  ['gaia', 'tartaro', 'nix', 'ananque', 'erebo', 'hemera', 'caos', 'eter', 'ponto'].forEach((el, k) => {
    const w = WEAPONS[(k * 3) % WEAPONS.length];
    blit(c, renderIconPixels({ kind: 'tecnica', weapon: w.id, maneuver: MANEUVERS[k % 7], form: MANEUVERS[k % 7], element: el }), k, rowsW + 1);
  });
  save(c, 'icones-tecnicas.ppm');
} else if (mode === 'exemplos') {
  const list = [
    { name: 'Raio Sombrio', type: 'magia', element: 'Érebo', damage_formula: '1d10+2', range: 'médio', description: 'Uma descarga de energia sombria direcionada contra um alvo.' },
    { name: 'Bênção de Éter', type: 'magia', element: 'Éter', damage_formula: '1d8+3', range: 'curto', description: 'Canaliza energia de Éter para produzir um efeito benéfico.' },
    { name: 'Golpe Guardião', type: 'poder', damage_formula: '1d8+1', range: 'corpo a corpo', recommended_class: 'Cavaleiro' },
    { name: 'Vinhas de Gaia', type: 'magia', element: 'Gaia', damage_formula: '1d4', description: 'Faz raízes crescerem sob os pés do alvo; se falhar, fica imobilizado por 1 turno.' },
    { name: 'Abraço do Vazio', type: 'magia', element: 'Érebo', damage_formula: '1d8+2', description: 'Agarra a vítima; o alvo fica imobilizado até escapar com teste de Força.' },
    { name: 'Ataque: Arco curto', type: 'poder' },
    { name: 'Ataque: Espada longa', type: 'poder' },
    { name: 'Explosão de Cinzas', type: 'magia', element: 'Caos', description: 'Libera uma onda breve de calor e fuligem.' }
  ];
  const c = canvas(list.length, 1);
  list.forEach((p, k) => blit(c, renderIconPixels(p), k, 0));
  save(c, 'icones-exemplos.ppm');
}
