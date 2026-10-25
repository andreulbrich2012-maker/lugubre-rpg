// Gera docs/GOLPES.md a partir do catalogo (fonte unica: catalog.js).
// Uso: node src/lib/fx/weapons/docs.mjs ../docs/GOLPES.md
import { writeFileSync } from 'node:fs';
import { WEAPON_FAMILIES, WEAPONS } from './catalog.js';

const out = process.argv[2] || '../docs/GOLPES.md';

const TRAIL = { fino: 'fino e rápido', medio: 'médio', largo: 'largo (arco aberto)', pesado: 'pesado e grosso', garra: 'três riscos de garra' };
const SPARKS = { aco: 'aço (branco-azulado)', faisca: 'faíscas laranja', lasca: 'lascas de madeira', pedra: 'cacos de pedra', ouro: 'brilho dourado' };
const PROJ = { arrow: 'flecha', bolt: 'virote', dart: 'dardo', javelin: 'azagaia', stone: 'pedra', self: 'a própria arma, girando' };
const TAG = { elemento: 'elemento', montaria: 'montaria', dupla: 'em dupla' };

const row = (m) => {
  const extra = [...(m.tags || []).map((t) => TAG[t]), m.el ? `cor padrão ${m.el}` : null].filter(Boolean).join(', ');
  return `| ${m.name} | ${m.tipo} | ${m.desc}${extra ? ` *(${extra})*` : ''} | \`${m.id}\` |`;
};

const total = WEAPON_FAMILIES.reduce((n, f) => n + f.moves.length, 0) + WEAPONS.reduce((n, w) => n + (w.extra || []).length, 0);
const lines = [
  '# Golpes de arma',
  '',
  '<!-- Gerado por frontend/src/lib/fx/weapons/docs.mjs a partir de catalog.js. Edite o catálogo e rode de novo. -->',
  '',
  `Catálogo dos golpes animados das armas: **${WEAPON_FAMILIES.length} famílias de movimento**, **${WEAPONS.length} armas** e **${total} golpes** (base + exclusivos).`,
  '',
  'Como funciona:',
  '',
  '- **Família de movimento** (lâminas leves, pesadas, haste, arco…): tem os golpes base. O golpe base é o movimento, o tempo e o rastro.',
  '- **Arma**: é a ferramenta desenhada no golpe, com o mesmo sprite da arma na mão do personagem. Herda todos os golpes da família e pode ajustar o formato do rastro, a cor das faíscas e o impacto, além de somar técnicas exclusivas.',
  '- **Elemento** (Caos, Gaia, Ponto, Érebo, Nix, Tártaro, Éter, Ananque, Hemera) pinta o rastro, a lâmina e as partículas. Golpes marcados com "cor padrão" usam aquele elemento quando o ataque não tem nenhum.',
  '- **Resultado**: acerto, crítico (maior, dourado, hit-stop mais longo), erro (o alvo se esquiva, o projétil crava no chão), falha (a arma escapa da mão e o atacante fica tonto) e caído.',
  '',
  'Como escolher o golpe de um ataque (ver `docs/ANIMACOES.md`):',
  '',
  '1. Campo `animation: { family, move }` no poder. `family` aceita a família de movimento (`pesadas`), o id da arma (`machado-de-guerra`) ou uma família antiga (`corte`).',
  '2. Palavras no nome: "Golpe giratório", "Estocada dupla", "Lança: estocada tripla", "Chuva de flechas"…',
  '3. Sem golpe nomeado, a mesa sorteia pelo `rollId` entre os golpes da arma (fora os de montaria e em dupla). Todos os clientes veem o mesmo golpe.',
  '',
  'Resumo:',
  '',
  '| Família | Golpes base | Armas (exclusivos) |',
  '|---|---|---|',
  ...WEAPON_FAMILIES.map((f) => `| ${f.label} | ${f.moves.length} | ${WEAPONS.filter((w) => w.fam === f.id).map((w) => `${w.name} (+${(w.extra || []).length})`).join(', ')} |`),
  ''
];

for (const f of WEAPON_FAMILIES) {
  lines.push(`## ${f.label}`, '', f.desc, '', `Ferramenta padrão: ${WEAPONS.find((w) => w.id === f.tool)?.name || f.tool}.`, '');
  lines.push(`### Golpes base (${f.moves.length})`, '', '| Golpe | Movimento | Descrição | id |', '|---|---|---|---|');
  for (const m of f.moves) lines.push(row(m));
  lines.push('', '### Armas da família', '');
  for (const w of WEAPONS.filter((x) => x.fam === f.id)) {
    const adj = [`rastro ${TRAIL[w.trail] || w.trail}`, `faíscas: ${SPARKS[w.sparks] || w.sparks}`];
    if (w.proj) adj.push(`projétil: ${PROJ[w.proj] || w.proj}`);
    if (w.quake) adj.push('todo acerto solta onda no chão');
    if (w.impact && w.impact !== f.impact) adj.push(`impacto: ${w.impact}`);
    if (w.sling) adj.push('a pedra gira acima da cabeça antes de sair');
    if (w.rope === 'chain') adj.push('corrente curta com bola de ferro');
    lines.push(`#### ${w.name} — ${f.moves.length + (w.extra || []).length} golpes`, '', `Sprite: \`${w.held}\` · ${adj.join(' · ')}.`, '');
    if (w.extra?.length) {
      lines.push('| Exclusivo | Movimento | Descrição | id |', '|---|---|---|---|');
      for (const m of w.extra) lines.push(row(m));
      lines.push('');
    }
  }
}

writeFileSync(out, `${lines.join('\n')}\n`);
console.log(`${out}: ${total} golpes`);
