// Folhas de conferencia (auditoria de estilo): node src/lib/avatar/audit.mjs <slot> <pasta>  -> paginas de 30 pecas (6 por linha), frente/perfil/costas
import { writeFileSync } from 'node:fs';
const root = new URL('./', import.meta.url).href;
const { renderPixels } = await import(root + 'compose.js');
const { defaultAppearance, defaultColors } = await import(root + 'appearance.js');
const { ITEMS, HAIRS, getItem } = await import(root + 'catalog.js');
const { W, H } = await import(root + 'skeleton.js');
const [slot, out] = process.argv.slice(2);
const list = slot === 'hair' ? HAIRS : ITEMS[slot];
const PER = 6, ROWS = 5, cw = W + 1, gap = 6;
const base = defaultAppearance('humano');
base.hair = { style: 'curto', color: 'castanho' };
base.layers = {
  torso: { id: 'camisa-manga-curta', colors: ['linho', 'couro-escuro', 'bronze'] },
  legs: { id: 'calca-simples', colors: ['couro', 'couro-escuro', 'bronze'] },
  feet: { id: 'sapatos-couro', colors: defaultColors(getItem('feet', 'sapatos-couro')) }
};
const names = [];
for (let page = 0; page * PER * ROWS < list.length; page++) {
  const items = list.slice(page * PER * ROWS, (page + 1) * PER * ROWS);
  const w = PER * (3 * cw + gap), h = Math.ceil(items.length / PER) * (H + 2);
  const px = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) px.set([((i % w) >> 3) % 2 === ((i / w / 8) | 0) % 2 ? 92 : 100, ((i % w) >> 3) % 2 === ((i / w / 8) | 0) % 2 ? 140 : 150, 72], i * 3);
  items.forEach((it, n) => {
    const app = JSON.parse(JSON.stringify(base));
    if (slot === 'hair') app.hair = { style: it.id, color: ['castanho', 'loiro', 'ruivo', 'preto', 'castanho-claro', 'grisalho'][n % 6] };
    else app.layers[slot] = { id: it.id, colors: defaultColors(it) };
    const ox = (n % PER) * (3 * cw + gap), oy = Math.floor(n / PER) * (H + 2);
    ['down', 'left', 'up'].forEach((d, k) => {
      const rgba = renderPixels(app, d, 'idle', 0);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4, a = rgba[i + 3] / 255; if (!a) continue;
        const o = ((oy + y + 1) * w + ox + k * cw + x) * 3;
        for (let c = 0; c < 3; c++) px[o + c] = Math.round(px[o + c] * (1 - a) + rgba[i + c] * a);
      }
    });
    names.push(`${page}.${n}: ${it.id}`);
  });
  writeFileSync(`${out}/${slot}-${page}.ppm`, Buffer.concat([Buffer.from(`P6\n${w} ${h}\n255\n`), Buffer.from(px)]));
}
writeFileSync(`${out}/${slot}-nomes.txt`, names.join('\n'));
