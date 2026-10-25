// Importa o Livro de Regras (Markdown) para rule_sections.
// Uso: npm run db:seed-rules --workspace backend [-- --force] [-- --file caminho.md]
// Idempotente: cria secoes novas, atualiza as que nao mudaram desde o ultimo seed
// e NUNCA sobrescreve secoes editadas pelo admin (seed_hash diferente), salvo --force.
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_FILE = path.resolve(__dirname, '../../../docs/livro/livro-0.5-beta-v2.md');
const ROOT_TITLE = 'Sobre esta edição';
export const RULEBOOK_VERSION = '0.5 Beta';

export function slugify(title) {
  return String(title)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'secao';
}

// Devolve as secoes em ordem de leitura: {slug, parentSlug, level, position, title, body_md}.
export function parseRulebook(markdown) {
  const sections = [];
  const root = { title: ROOT_TITLE, level: 1, parent: null, lines: [], children: [] };
  const roots = [root];
  let h1 = root;
  let h2 = null;
  let current = root;

  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const heading = line.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (!heading) {
      current.lines.push(line);
      continue;
    }
    const level = heading[1].length;
    const title = heading[2];
    // o "## Sobre esta edição" antes do primeiro capitulo e a propria raiz
    if (h1 === root && level === 2 && slugify(title) === slugify(ROOT_TITLE) && !root.children.length) {
      current = root;
      continue;
    }
    const node = { title, level, lines: [], children: [] };
    if (level === 1) {
      roots.push(node);
      h1 = node;
      h2 = null;
    } else if (level === 2 || !h2) {
      node.level = level === 3 && !h2 ? 2 : level;
      h1.children.push(node);
      if (level === 2) h2 = node;
    } else {
      h2.children.push(node);
    }
    current = node;
  }

  const used = new Set();
  const walk = (node, parentSlug, position) => {
    let slug = slugify(node.title);
    // colisao: so a repetida ganha o prefixo do pai (ex.: elementos-caos)
    if (used.has(slug) && parentSlug) slug = `${parentSlug}-${slug}`;
    for (let index = 2; used.has(slug); index += 1) slug = `${slugify(node.title)}-${index}`;
    used.add(slug);
    sections.push({
      slug,
      parentSlug,
      level: node.level,
      position,
      title: node.title,
      body_md: node.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
    });
    node.children.forEach((child, index) => walk(child, slug, index));
  };
  roots.forEach((node, index) => walk(node, null, index));
  return sections;
}

export function sectionHash(section) {
  return crypto.createHash('sha1')
    .update([section.title, section.body_md, section.parentSlug || '', section.position, section.level].join('\u0000'))
    .digest('hex');
}

// Secoes que mudaram de nome no livro: a linha antiga ganha o slug novo (sem apagar nada),
// senao o site mostraria as duas (ex.: "Sylvar" e "Elfo"). Edicao do admin continua protegida.
export const SLUG_RENAMES = {
  sylvar: 'elfo', nocthar: 'elfo-negro', durkar: 'anao', lumerin: 'halfling',
  gorak: 'orc', celestiano: 'aasimar', abissiano: 'tiefling', primordiano: 'genasi'
};

export async function seedRules(pool, markdown, { force = false } = {}) {
  const sections = parseRulebook(markdown);
  const wanted = new Set(sections.map((s) => s.slug));
  for (const [from, to] of Object.entries(SLUG_RENAMES)) {
    if (!wanted.has(to)) continue;
    await pool.query(
      `update rule_sections set slug = $2 where slug = $1 and not exists (select 1 from rule_sections where slug = $2)`,
      [from, to]
    );
  }
  const existing = new Map((await pool.query(
    `select s.*, p.slug as parent_slug from rule_sections s left join rule_sections p on p.id = s.parent_id`
  )).rows.map((row) => [row.slug, row]));
  const ids = new Map([...existing.values()].map((row) => [row.slug, row.id]));
  const stats = { total: sections.length, inserted: 0, updated: 0, unchanged: 0, protected: 0 };

  for (const section of sections) {
    const hash = sectionHash(section);
    const parentId = section.parentSlug ? ids.get(section.parentSlug) || null : null;
    const row = existing.get(section.slug);
    if (!row) {
      const { rows } = await pool.query(
        `insert into rule_sections (slug, parent_id, position, level, title, body_md, seed_hash)
         values ($1,$2,$3,$4,$5,$6,$7) returning id`,
        [section.slug, parentId, section.position, section.level, section.title, section.body_md, hash]
      );
      ids.set(section.slug, rows[0].id);
      stats.inserted += 1;
      continue;
    }
    const current = { title: row.title, body_md: row.body_md, parentSlug: row.parent_slug, position: row.position, level: row.level };
    const untouched = row.seed_hash && sectionHash(current) === row.seed_hash;
    if (!untouched && !force) {
      stats.protected += 1;
      continue;
    }
    if (untouched && row.seed_hash === hash) {
      stats.unchanged += 1;
      continue;
    }
    await pool.query(
      `update rule_sections set parent_id=$1, position=$2, level=$3, title=$4, body_md=$5, seed_hash=$6, updated_at=now()
       where id=$7`,
      [parentId, section.position, section.level, section.title, section.body_md, hash, row.id]
    );
    stats.updated += 1;
  }

  await pool.query(
    `insert into rulebook_meta ("key", value) values ('version', $1)
     on conflict ("key") do update set value = case when $2 then excluded.value else rulebook_meta.value end`,
    [RULEBOOK_VERSION, force]
  );
  return stats;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await import('../config/env.js');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL nao encontrado.');
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--file');
  const file = fileIndex >= 0 ? path.resolve(args[fileIndex + 1]) : DEFAULT_FILE;
  const { pool } = await import('./pool.js');
  try {
    const stats = await seedRules(pool, await fs.readFile(file, 'utf8'), { force: args.includes('--force') });
    console.log(`Livro de regras: ${stats.total} secoes (${stats.inserted} novas, ${stats.updated} atualizadas, ${stats.unchanged} iguais, ${stats.protected} protegidas por edicao do admin).`);
  } finally {
    await pool.end();
  }
}
