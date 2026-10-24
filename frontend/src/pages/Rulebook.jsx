import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronRight, Pencil, Search, X } from 'lucide-react';
import Button from '../components/Button';
import { api } from '../lib/api';
import { renderMarkdown } from '../lib/markdown';
import { useAuth } from '../store/authStore';

// Livro de regras vivo: o conteudo vem do banco (rule_sections), entao o admin edita aqui mesmo
// enquanto o livro evolui no beta (23/10: pedido do Andre).

// Titulos do docx vem em MAIUSCULAS; em letra gotica isso fica ilegivel, entao vira "Regras do Sistema".
const SMALL = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'para', 'por', 'com', 'no', 'na']);
export function niceTitle(title = '') {
  if (title !== title.toUpperCase() || !/[A-ZÀ-Ý]/.test(title)) return title;
  return title.toLowerCase().split(' ').map((w, i) => {
    if (/^([a-z]\.){2,}/i.test(w)) return w.toUpperCase();
    if (i > 0 && SMALL.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

function buildTree(sections) {
  const byParent = new Map();
  sections.forEach((s) => {
    const key = s.parent_id || 'root';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(s);
  });
  byParent.forEach((list) => list.sort((a, b) => a.position - b.position));
  return byParent;
}

export default function Rulebook() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [index, setIndex] = useState(null);
  const [section, setSection] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [editing, setEditing] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    api.get('/rules').then(({ data }) => setIndex(data)).catch(() => setError('Não foi possível abrir o livro agora. Tente de novo em instantes.'));
  }, []);

  const tree = useMemo(() => buildTree(index?.sections || []), [index]);
  const firstSlug = tree.get('root')?.[0]?.slug;
  const current = slug || firstSlug;

  useEffect(() => {
    if (!current) return;
    setSection(null);
    setEditing(false);
    setTocOpen(false);
    api.get(`/rules/${current}`)
      .then(({ data }) => { setSection(data); window.scrollTo({ top: 0 }); })
      .catch((err) => setError(err.response?.status === 404 ? 'Essa seção não existe (ou mudou de nome) no livro.' : 'Não foi possível abrir essa seção.'));
  }, [current]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults(null); return undefined; }
    const t = setTimeout(() => {
      api.get('/rules/search', { params: { q } }).then(({ data }) => setResults(data.results || data || [])).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const ancestors = useMemo(() => {
    if (!section || !index) return [];
    const byId = new Map(index.sections.map((s) => [s.id, s]));
    const chain = [];
    let p = byId.get(section.parent_id);
    while (p) { chain.unshift(p); p = byId.get(p.parent_id); }
    return chain;
  }, [section, index]);

  const toc = (
    <nav aria-label="Sumário do livro" className="text-[15px]">
      <label className="relative block">
        <span className="sr-only">Buscar no livro</span>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
        <input className="field !mt-0 !pl-10" placeholder="Buscar regra, raça, magia…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {results ? (
        <ul className="mt-4 space-y-1" aria-live="polite">
          {results.length === 0 && <li className="px-2 text-mist">Nada encontrado para “{query}”.</li>}
          {results.map((r) => (
            <li key={r.slug}>
              <Link to={`/regras/${r.slug}`} onClick={() => setQuery('')} className="block px-2 py-2 hover:bg-white/[.04]">
                <span className="font-bold text-bone">{niceTitle(r.title)}</span>
                {r.snippet && <span className="mt-0.5 block text-sm text-mist">{r.snippet}</span>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <TocList tree={tree} parent="root" current={current} trail={ancestors.map((a) => a.id)} depth={0} />
      )}
    </nav>
  );

  return (
    <main className="mx-auto grid max-w-[1400px] gap-8 px-4 py-8 lg:grid-cols-[19rem_minmax(0,1fr)] lg:py-12">
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
          <p className="mb-4 font-display text-3xl text-ember">Livro de Regras</p>
          {index?.meta?.version && <p className="-mt-3 mb-4 text-sm text-mist">Versão {index.meta.version}</p>}
          {toc}
        </div>
      </aside>

      <div className="lg:hidden">
        <Button variant="ghost" className="w-full justify-between" onClick={() => setTocOpen(true)} aria-expanded={tocOpen}>
          <span>Sumário e busca</span><ChevronRight size={18} />
        </Button>
        {tocOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-abyss px-4 pb-24 pt-4" role="dialog" aria-modal="true" aria-label="Sumário do livro">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-3xl text-ember">Livro de Regras</p>
              <button type="button" className="btn btn-glass !min-h-11 !w-11 !p-0" onClick={() => setTocOpen(false)} aria-label="Fechar sumário"><X size={18} /></button>
            </div>
            {toc}
          </div>
        )}
      </div>

      <article className="min-w-0">
        {error && !section && <p className="gothic-panel p-5 text-mist">{error}</p>}
        {!section && !error && <ArticleSkeleton />}
        {section && (
          <>
            <ol className="flex flex-wrap items-center gap-1 text-sm text-mist" aria-label="Você está em">
              <li><Link to="/regras" className="hover:text-bone">Livro</Link></li>
              {ancestors.map((a) => (
                <li key={a.id} className="flex items-center gap-1"><ChevronRight size={14} /><Link to={`/regras/${a.slug}`} className="hover:text-bone">{niceTitle(a.title)}</Link></li>
              ))}
            </ol>
            <header className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b-[6px] border-lead pb-5">
              <h1 className="font-display text-5xl leading-none text-bone sm:text-6xl">{niceTitle(section.title)}</h1>
              {isAdmin && !editing && <Button variant="ghost" onClick={() => setEditing(true)}><Pencil size={16} /> Editar seção</Button>}
            </header>

            {editing ? (
              <SectionEditor section={section} onCancel={() => setEditing(false)} onSaved={(updated) => { setSection((s) => ({ ...s, ...updated })); setEditing(false); }} />
            ) : (
              <div className="rule-body mt-6 max-w-[70ch] text-[18px] leading-[1.7] text-bone/90">
                {section.body_md ? renderMarkdown(section.body_md) : <p className="text-mist">Esta parte do livro só organiza as seções abaixo.</p>}
              </div>
            )}

            {section.children?.length > 0 && (
              <ul className="mt-10 max-w-[70ch] border-t-[3px] border-lead">
                {section.children.map((c) => (
                  <li key={c.slug} className="border-b-[3px] border-lead">
                    <Link to={`/regras/${c.slug}`} className="chapter-row group flex items-center justify-between py-4 pr-2">
                      <span className="font-display text-2xl text-bone">{niceTitle(c.title)}</span>
                      <ArrowRight size={18} className="text-mist transition-transform group-hover:translate-x-1 group-hover:text-ember" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <nav className="mt-14 grid max-w-[70ch] gap-3 sm:grid-cols-2" aria-label="Seção anterior e próxima">
              {section.prev ? (
                <button type="button" className="gothic-panel soft-motion p-4 text-left" onClick={() => navigate(`/regras/${section.prev.slug || section.prev}`)}>
                  <span className="flex items-center gap-2 text-sm text-mist"><ArrowLeft size={14} /> Anterior</span>
                  <span className="mt-1 block font-display text-xl text-bone">{niceTitle(section.prev.title) || 'Seção anterior'}</span>
                </button>
              ) : <span />}
              {section.next && (
                <button type="button" className="gothic-panel soft-motion p-4 text-right" onClick={() => navigate(`/regras/${section.next.slug || section.next}`)}>
                  <span className="flex items-center justify-end gap-2 text-sm text-mist">Próxima <ArrowRight size={14} /></span>
                  <span className="mt-1 block font-display text-xl text-bone">{niceTitle(section.next.title) || 'Próxima seção'}</span>
                </button>
              )}
            </nav>
            {section.updated_at && <p className="mt-8 text-sm text-mist">Atualizado em {new Intl.DateTimeFormat('pt-BR').format(new Date(section.updated_at))}</p>}
          </>
        )}
      </article>
    </main>
  );
}

function TocList({ tree, parent, current, trail, depth }) {
  const items = tree.get(parent) || [];
  if (!items.length) return null;
  return (
    <ul className={depth === 0 ? 'mt-4 space-y-0.5' : 'ml-3 border-l-[3px] border-lead pl-2'}>
      {items.map((s) => {
        const open = s.slug === current || trail.includes(s.id);
        const active = s.slug === current;
        return (
          <li key={s.id}>
            <Link
              to={`/regras/${s.slug}`}
              aria-current={active ? 'page' : undefined}
              className={`block px-2 py-1.5 transition-colors ${active ? 'lit font-bold' : depth === 0 ? 'font-display text-lg text-bone hover:text-ember' : 'text-mist hover:text-bone'}`}
            >
              {niceTitle(s.title)}
            </Link>
            {open && <TocList tree={tree} parent={s.id} current={current} trail={trail} depth={depth + 1} />}
          </li>
        );
      })}
    </ul>
  );
}

function SectionEditor({ section, onCancel, onSaved }) {
  const [title, setTitle] = useState(section.title);
  const [body, setBody] = useState(section.body_md || '');
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put(`/admin/rules/${section.id}`, { title, body_md: body });
      onSaved(data.section || data);
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível salvar. Nada foi perdido: o texto continua aqui.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 max-w-[80ch]">
      <label className="block text-sm text-mist">Título<input className="field" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <div className="mt-4 flex gap-2">
        <button type="button" className={`btn ${preview ? 'btn-glass' : 'btn-glass lit'}`} onClick={() => setPreview(false)}>Texto</button>
        <button type="button" className={`btn ${preview ? 'btn-glass lit' : 'btn-glass'}`} onClick={() => setPreview(true)}>Prévia</button>
      </div>
      {preview
        ? <div className="mt-3 border-[3px] border-lead p-5 text-[18px] leading-[1.7]">{renderMarkdown(body)}</div>
        : <textarea className="field mt-3 min-h-[28rem] font-mono text-[15px]" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Texto da seção em Markdown" />}
      <p className="mt-2 text-sm text-mist">Markdown: **negrito**, *itálico*, listas com “-”, tabelas com “|”, “## Título”.</p>
      {error && <p className="mt-3 text-red-200" role="alert">{error}</p>}
      <div className="mt-4 flex gap-3">
        <Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar seção'}</Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
      </div>
    </div>
  );
}

function ArticleSkeleton() {
  return (
    <div aria-label="Carregando seção" className="animate-pulse">
      <div className="h-4 w-40 bg-white/5" />
      <div className="mt-5 h-14 w-2/3 bg-white/5" />
      {Array.from({ length: 6 }, (_, i) => <div key={i} className="mt-4 h-4 bg-white/5" style={{ width: `${90 - i * 7}%` }} />)}
    </div>
  );
}
