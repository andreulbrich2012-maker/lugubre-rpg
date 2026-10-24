// Folhas de conferencia dos monstros, sem dependencias: escreve PPM e o ffmpeg vira PNG.
// Uso: node src/lib/monsters/preview.mjs <pasta> [modo] [tamanho]
//   'bases' (padrao): todas as bases, frente + lado + costas, no tamanho dado (32)
//   'variantes': nomes de exemplo de cada elemento com epitetos (tamanho pelo nivel)
//   'andando': ciclo de andar nas 4 direcoes + ataque de algumas bases
//   'tamanhos': a mesma base em 16/24/32/40
// Depois: ffmpeg -loglevel error -y -i x.ppm -vf scale=iw*4:ih*4:flags=neighbor x.png
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASES } from './bases.js';
import { renderMonsterPixels } from './compose.js';
import { monsterLook, lookFromBase } from './classify.js';

const out = process.argv[2] || '.';
const mode = process.argv[3] || 'bases';
const size = Number(process.argv[4]) || 32;

function canvas(w, h) {
  const px = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const x = i % w, y = (i / w) | 0;
    px.set(((x >> 3) + (y >> 3)) % 2 ? [54, 66, 44] : [62, 74, 50], i * 3);
  }
  return { w, h, px };
}
function blit(c, rgba, S, ox, oy) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4, a = rgba[i + 3] / 255;
    if (!a) continue;
    const o = ((oy + y) * c.w + ox + x) * 3;
    for (let k = 0; k < 3; k++) c.px[o + k] = Math.round(c.px[o + k] * (1 - a) + rgba[i + k] * a);
  }
}
function save(c, name) {
  writeFileSync(join(out, name), Buffer.concat([Buffer.from(`P6\n${c.w} ${c.h}\n255\n`), Buffer.from(c.px)]));
  console.log(join(out, name));
}

if (mode === 'bases') {
  const S = size, cell = S * 3 + 4, per = 8;
  const rows = Math.ceil(BASES.length / per);
  const c = canvas(per * cell, rows * (S + 3));
  BASES.forEach((b, n) => {
    const look = lookFromBase(b, S);
    const ox = (n % per) * cell, oy = Math.floor(n / per) * (S + 3);
    ['down', 'left', 'up'].forEach((d, k) => blit(c, renderMonsterPixels(look, d, 'idle', 0), S, ox + k * S, oy));
  });
  save(c, `monstros-bases-${S}.ppm`);
} else if (mode === 'variantes') {
  const samples = [
    ['Rato do Mato', 'Gaia', 'Baixa'], ['Rato Pestilento', 'Gaia', 'Baixa'], ['Lobo Sombrio Ancião', 'Érebo', 'Alta'], ['Lobo Selvagem', 'Gaia', 'Média'],
    ['Urso da Montanha', 'Gaia', 'Alta'], ['Javali Blindado', 'Gaia', 'Média'], ['Avatar da Montanha', 'Gaia', 'Lendária'], ['Morcego Sombrio', 'Érebo', 'Baixa'],
    ['Espectro Acorrentado', 'Érebo', 'Alta'], ['Avatar do Esquecido', 'Érebo', 'Lendária'], ['Coruja Lunar', 'Nix', 'Baixa'], ['Lobo Invernal Alfa', 'Nix', 'Alta'],
    ['Pesadelo Onírico', 'Nix', 'Mortal'], ['Diabrete Flamejante', 'Tártaro', 'Baixa'], ['Cão Infernal Sanguinário', 'Tártaro', 'Média'], ['Demônio Ancestral', 'Tártaro', 'Mortal'],
    ['Esqueleto Guerreiro', 'Tártaro', 'Média'], ['Fogo-Fátuo Errante', 'Éter', 'Baixa'], ['Anjo Menor Radiante', 'Éter', 'Alta'], ['Fênix Sagrada', 'Éter', 'Mortal'],
    ['Slime Pequeno', 'Caos', 'Baixa'], ['Slime Rei', 'Caos', 'Alta'], ['Aberração Pútrida', 'Caos', 'Média'], ['Guardião de Cinzas', 'Caos', 'Média'],
    ['Caranguejo Abissal', 'Ponto', 'Baixa'], ['Enguia Tempestuosa', 'Ponto', 'Média'], ['Tubarão das Profundezas', 'Ponto', 'Alta'], ['Autômato de Bronze', 'Ananque', 'Média'],
    ['Esfinge Eterna', 'Ananque', 'Mortal'], ['Goblin', 'Gaia', 'Baixa'], ['Peregrino Sem Face', 'Érebo', 'Média'], ['Criatura Desconhecida', 'Nix', 'Média'],
    ['Aranha Cristalina', 'Gaia', 'Média'], ['Golem Musgoso', 'Gaia', 'Alta'], ['Sombra Faminta', 'Érebo', 'Baixa'], ['Carniçal Pestilento', 'Tártaro', 'Média'],
    ['Água-Viva Espectral', 'Ponto', 'Baixa'], ['Relógio Vivo Dourado', 'Ananque', 'Média'], ['Mímico Ganancioso', 'Érebo', 'Alta'], ['Quimera Rúnica', 'Caos', 'Mortal']
  ];
  const per = 8, cell = 2 * 40 + 6;
  const c = canvas(per * cell, Math.ceil(samples.length / per) * 44);
  samples.forEach(([name, category, difficulty], n) => {
    const look = monsterLook({ name, category, difficulty });
    const ox = (n % per) * cell, oy = Math.floor(n / per) * 44;
    const S = look.size;
    blit(c, renderMonsterPixels(look, 'down', 'idle', 0), S, ox + (40 - S), oy + 42 - S);
    blit(c, renderMonsterPixels(look, 'left', 'idle', 0), S, ox + 40 + 2, oy + 42 - S);
    console.log(`${name} -> ${look.base} / ${look.epithet?.id || '-'} / nivel ${look.level} / ${S}px`);
  });
  save(c, 'monstros-variantes.ppm');
} else if (mode === 'andando') {
  const ids = (process.argv[5] || 'lobo,goblin,morcego,slime,cobra,aranha,espectro,olho-flutuante,mimico,polvo').split(',');
  const S = size;
  const c = canvas(17 * (S + 1), ids.length * (S + 2));
  ids.forEach((id, row) => {
    const b = BASES.find((x) => x.id === id);
    const look = lookFromBase(b, S);
    ['down', 'left', 'right', 'up'].forEach((d, k) => {
      for (let f = 0; f < 4; f++) blit(c, renderMonsterPixels(look, d, 'walk', f), S, (k * 4 + f) * (S + 1), row * (S + 2));
    });
    blit(c, renderMonsterPixels(look, 'left', 'attack', 0), S, 16 * (S + 1), row * (S + 2));
  });
  save(c, 'monstros-andando.ppm');
} else if (mode === 'tamanhos') {
  const ids = (process.argv[5] || 'rato,lobo,goblin').split(',');
  const c = canvas(4 * 2 * 42, ids.length * 44);
  ids.forEach((id, row) => [16, 24, 32, 40].forEach((S, k) => {
    const look = lookFromBase(BASES.find((x) => x.id === id), S);
    blit(c, renderMonsterPixels(look, 'down', 'idle', 0), S, k * 84 + (40 - S), row * 44 + 42 - S);
    blit(c, renderMonsterPixels(look, 'left', 'idle', 0), S, k * 84 + 42, row * 44 + 42 - S);
  }));
  save(c, 'monstros-tamanhos.ppm');
}
