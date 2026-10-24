import { useEffect, useState } from 'react';
import { Edit, ImagePlus, Trash2 } from 'lucide-react';
import Alert from '../Alert';
import Button from '../Button';
import LoadingButton from '../LoadingButton';
import { api } from '../../lib/api';

const categories = ['Atualização', 'Correção', 'Novidade', 'Sistema', 'Visual', 'Campanhas', 'Personagens', 'Admin'];
const blankPost = {
  title: '',
  shortDescription: '',
  fullDescription: '',
  imageUrl: '',
  category: 'Atualização',
  publishedAt: new Date().toISOString().slice(0, 10),
  isVisible: true
};

function toForm(post) {
  return {
    title: post.title || '',
    shortDescription: post.short_description || '',
    fullDescription: post.full_description || '',
    imageUrl: post.image_url || '',
    category: post.category || 'Atualização',
    publishedAt: String(post.published_at || new Date().toISOString()).slice(0, 10),
    isVisible: post.is_visible ?? true
  };
}

export default function AdminDeveloperDiaryPage() {
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(blankPost);
  const [editingId, setEditingId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  async function load() {
    const { data } = await api.get('/admin/developer-posts');
    setPosts(data || []);
  }

  useEffect(() => { load(); }, []);

  function patch(value) {
    setForm((current) => ({ ...current, ...value }));
  }

  function readImage(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Envie um arquivo de imagem.' });
      return;
    }
    if (file.size > 1_500_000) {
      setMessage({ type: 'error', text: 'Use uma imagem menor que 1.5 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch({ imageUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  function reset() {
    setForm(blankPost);
    setEditingId('');
  }

  function startEdit(post) {
    setEditingId(post.id);
    setForm(toForm(post));
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(event) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (editingId) await api.put(`/admin/developer-posts/${editingId}`, form);
      else await api.post('/admin/developer-posts', form);
      setMessage({ type: 'success', text: editingId ? 'Publicação atualizada.' : 'Publicação criada.' });
      reset();
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Não foi possível salvar a publicação.' });
    } finally {
      setLoading(false);
    }
  }

  async function remove(post) {
    setDeletingId(post.id);
    setMessage(null);
    try {
      await api.delete(`/admin/developer-posts/${post.id}`);
      setConfirmDelete(null);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      if (editingId === post.id) reset();
      setMessage({ type: 'success', text: 'Publicação deletada.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Não foi possível deletar.' });
    } finally {
      setDeletingId('');
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <form onSubmit={save} className="gothic-panel rounded-md p-4 sm:p-5">
        <h2 className="font-display text-3xl text-bone">{editingId ? 'Editar publicação' : 'Nova publicação'}</h2>
        <div className="mt-5 grid gap-3">
          <input className="field !mt-0" placeholder="Título" value={form.title} onChange={(event) => patch({ title: event.target.value })} />
          <textarea className="min-h-24 field !mt-0" placeholder="Descrição curta" value={form.shortDescription} onChange={(event) => patch({ shortDescription: event.target.value })} />
          <textarea className="min-h-32 field !mt-0" placeholder="Descrição completa opcional" value={form.fullDescription} onChange={(event) => patch({ fullDescription: event.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="field !mt-0" value={form.category} onChange={(event) => patch({ category: event.target.value })}>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <input type="date" className="field !mt-0" value={form.publishedAt} onChange={(event) => patch({ publishedAt: event.target.value })} />
          </div>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 field !mt-0 text-sm font-semibold text-ember hover-lit">
            <ImagePlus size={16} />
            Enviar imagem
            <input className="hidden" type="file" accept="image/*" onChange={(event) => readImage(event.target.files?.[0])} />
          </label>
          <input className="field !mt-0" placeholder="Ou cole uma URL de imagem" value={form.imageUrl} onChange={(event) => patch({ imageUrl: event.target.value })} />
          {form.imageUrl && <img src={form.imageUrl} alt="Prévia da publicação" className="aspect-[16/9] w-full border-[3px] border-lead object-cover" />}
          <label className="flex min-h-11 items-center gap-3 field !mt-0 text-sm text-mist">
            <input type="checkbox" checked={form.isVisible} onChange={(event) => patch({ isVisible: event.target.checked })} />
            Visível na Landing Page
          </label>
          {message && <Alert type={message.type}>{message.text}</Alert>}
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <LoadingButton loading={loading} loadingText="Salvando..." className="w-full sm:w-auto">{editingId ? 'Salvar edição' : 'Criar publicação'}</LoadingButton>
            {editingId && <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={reset}>Cancelar</Button>}
          </div>
        </div>
      </form>

      <section className="gothic-panel rounded-md p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl text-bone">Diário do Desenvolvedor</h2>
          </div>
          <p className="text-sm text-mist">{posts.length} publicações</p>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {posts.map((post) => (
            <article key={post.id} className="pane p-4">
              <div className="aspect-[16/9] overflow-hidden pane">
                {post.image_url ? <img src={post.image_url} alt={`Imagem de ${post.title}`} className="h-full w-full object-cover" /> : <div className="h-full bg-glass" />}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-mist">
                <span className="badge text-ember">{post.category || 'Atualização'}</span>
                <span>{String(post.published_at || '').slice(0, 10)}</span>
                <span>{post.is_visible ? 'Visível' : 'Oculta'}</span>
              </div>
              <h3 className="mt-2 font-display text-2xl text-bone">{post.title}</h3>
              <p className="mt-1 text-sm text-mist">{post.short_description}</p>
              <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => startEdit(post)}><Edit size={15} /> Editar</Button>
                <Button type="button" variant="ghost" data-admin-delete-id={post.id} data-admin-delete-endpoint="developer-posts" className="w-full text-bone sm:w-auto" onClick={() => setConfirmDelete(post)}><Trash2 size={15} /> Deletar</Button>
              </div>
            </article>
          ))}
          {!posts.length && <p className="border-[3px] border-dashed border-lead p-6 text-center text-mist">Nenhuma publicação cadastrada.</p>}
        </div>
      </section>

      {confirmDelete && (
        <ConfirmDialog
          title={`Deletar ${confirmDelete.title}?`}
          loading={deletingId === confirmDelete.id}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => remove(confirmDelete)}
        />
      )}
    </div>
  );
}

function ConfirmDialog({ title, onCancel, onConfirm, loading = false }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
      <section className="gothic-panel max-h-[90vh] w-full max-w-md overflow-auto rounded-md p-4 sm:p-6">
        <h2 className="font-display text-3xl text-bone">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-mist">Tem certeza que deseja deletar esta publicação? Essa ação não poderá ser desfeita.</p>
        <div className="mt-6 grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Button type="button" variant="ghost" disabled={loading} className="w-full sm:w-auto" onClick={onCancel}>Cancelar</Button>
          <Button variant="danger" type="button" disabled={loading} className="w-full  sm:w-auto" onClick={onConfirm}>{loading ? 'Deletando...' : 'Deletar'}</Button>
        </div>
      </section>
    </div>
  );
}
