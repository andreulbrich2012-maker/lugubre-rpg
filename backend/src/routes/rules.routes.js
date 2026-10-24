// Livro de regras: leitura publica e edicao pelo admin.
import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { slugify } from '../db/seedRules.js';
import { httpError, requireDatabase, uuidParam } from '../utils/http.js';

const fold = (column) => `translate(lower(${column}), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')`;
const foldText = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const SECTION_COLUMNS ='id, slug, parent_id, position, level, title, body_md, updated_at';

async function loadIndex() {
  const { rows } = await query('select id, slug, parent_id, position, level, title from rule_sections');
  const children = new Map();
  for (const row of rows) {
    const key = row.parent_id || 'root';
    if (!children.has(key)) children.set(key, []);
    children.get(key).push(row);
  }
  for (const list of children.values()) list.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
  // ordem de leitura: arvore em profundidade
  const order = [];
  const walk = (key) => (children.get(key) || []).forEach((row) => {
    order.push(row);
    walk(row.id);
  });
  walk('root');
  return { order, children };
}

async function sectionPayload(row) {
  const { order, children } = await loadIndex();
  const index = order.findIndex((item) => item.id === row.id);
  const link = (item) => (item ? { slug: item.slug, title: item.title } : null);
  return {
    ...row,
    children: (children.get(row.id) || []).map(link),
    prev: link(order[index - 1]),
    next: link(order[index + 1])
  };
}

function snippet(body, term) {
  const plain = String(body || '').replace(/[#>*_|`[\]]+/g, ' ').replace(/\s+/g, ' ').trim();
  // sem acentos o texto mantem o comprimento (letras acentuadas pre-compostas)
  const at = foldText(plain).indexOf(foldText(term));
  const start = Math.max(0, (at < 0 ? 0 : at) - 60);
  const text = plain.slice(start, start + 160);
  return `${start > 0 ? '…' : ''}${text}${start + 160 < plain.length ? '…' : ''}`;
}

export const rulesRouter = Router();
rulesRouter.use((req, res, next) => {
  requireDatabase();
  next();
});

rulesRouter.get('/', async (req, res) => {
  const { order } = await loadIndex();
  const meta = Object.fromEntries((await query('select "key", value from rulebook_meta')).rows.map((row) => [row.key, row.value]));
  res.json({ meta, sections: order });
});

rulesRouter.get('/search', async (req, res) => {
  const term = String(req.query.q || '').trim();
  if (term.length < 2) return res.json({ results: [] });
  // busca sem acento e sem extensao (unaccent nem sempre existe no Postgres gerenciado)
  const like = `%${foldText(term).replace(/[\\%_]/g, '\\$&')}%`;
  const { rows } = await query(
    `select slug, title, body_md from rule_sections
     where ${fold('title')} like $1 or ${fold('body_md')} like $1
     order by (${fold('title')} like $1) desc, level, position
     limit 30`,
    [like]
  );
  res.json({ results: rows.map((row) => ({ slug: row.slug, title: row.title, snippet: snippet(row.body_md, term) })) });
});

rulesRouter.get('/:slug', async (req, res) => {
  const { rows } = await query(`select ${SECTION_COLUMNS} from rule_sections where slug = $1`, [req.params.slug]);
  if (!rows[0]) throw httpError('Seção não encontrada.', 404);
  res.json(await sectionPayload(rows[0]));
});

const sectionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body_md: z.string().max(200000).optional(),
  slug: z.string().trim().regex(/^[a-z0-9-]{1,120}$/, 'Slug deve ter só letras minúsculas, números e hífens.').optional(),
  parent_id: z.string().uuid().nullable().optional(),
  position: z.coerce.number().int().min(0).max(100000).optional()
});

export const adminRulesRouter = Router();
adminRulesRouter.use(requireAuth, requireRole('admin'), (req, res, next) => {
  requireDatabase();
  next();
});
adminRulesRouter.param('id', uuidParam);

async function levelFor(parentId) {
  if (!parentId) return 1;
  const parent = (await query('select level from rule_sections where id = $1', [parentId])).rows[0];
  if (!parent) throw httpError('Seção pai não encontrada.');
  return parent.level + 1;
}

adminRulesRouter.post('/', async (req, res) => {
  const body = sectionSchema.parse(req.body);
  const parentId = body.parent_id || null;
  const position = body.position ?? Number((await query(
    'select count(*)::int as total from rule_sections where parent_id is not distinct from $1', [parentId])).rows[0].total);
  const { rows } = await query(
    `insert into rule_sections (slug, parent_id, position, level, title, body_md, updated_by)
     values ($1,$2,$3,$4,$5,$6,$7) returning ${SECTION_COLUMNS}`,
    [body.slug || slugify(body.title), parentId, position, await levelFor(parentId), body.title, body.body_md || '', req.user.id]
  );
  res.status(201).json({ section: await sectionPayload(rows[0]) });
});

adminRulesRouter.put('/:id', async (req, res) => {
  const body = sectionSchema.partial().parse(req.body);
  const current = (await query('select * from rule_sections where id = $1', [req.params.id])).rows[0];
  if (!current) throw httpError('Seção não encontrada.', 404);
  const parentId = body.parent_id !== undefined ? body.parent_id : current.parent_id;
  if (parentId === current.id) throw httpError('Uma seção não pode ser filha dela mesma.');
  const { rows } = await query(
    `update rule_sections set slug=$1, parent_id=$2, position=$3, level=$4, title=$5, body_md=$6, updated_by=$7, updated_at=now()
     where id=$8 returning ${SECTION_COLUMNS}`,
    [body.slug ?? current.slug, parentId, body.position ?? current.position, parentId === current.parent_id ? current.level : await levelFor(parentId),
      body.title ?? current.title, body.body_md ?? current.body_md, req.user.id, current.id]
  );
  res.json({ section: await sectionPayload(rows[0]) });
});

adminRulesRouter.delete('/:id', async (req, res) => {
  const children = await query('select 1 from rule_sections where parent_id = $1 limit 1', [req.params.id]);
  if (children.rowCount) throw httpError('Remova ou mova as subseções antes de excluir esta seção.', 409);
  const { rowCount } = await query('delete from rule_sections where id = $1', [req.params.id]);
  if (!rowCount) throw httpError('Seção não encontrada.', 404);
  res.status(204).end();
});

export const adminRulesMetaRouter = Router();
adminRulesMetaRouter.use(requireAuth, requireRole('admin'), (req, res, next) => {
  requireDatabase();
  next();
});
adminRulesMetaRouter.put('/', async (req, res) => {
  const body = z.record(z.string().regex(/^[a-z_]{1,40}$/), z.string().max(2000)).parse(req.body);
  for (const [key, value] of Object.entries(body)) {
    await query('insert into rulebook_meta ("key", value) values ($1,$2) on conflict ("key") do update set value = excluded.value', [key, value]);
  }
  const meta = Object.fromEntries((await query('select "key", value from rulebook_meta')).rows.map((row) => [row.key, row.value]));
  res.json({ meta });
});
