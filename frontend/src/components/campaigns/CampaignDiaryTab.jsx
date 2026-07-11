import { useEffect, useMemo, useState } from 'react';
import { Edit, Plus, Search, Trash2, X } from 'lucide-react';
import Alert from '../Alert';
import Button from '../Button';
import LoadingButton from '../LoadingButton';
import { api } from '../../lib/api';

const markers = ['', 'sessão', 'pista', 'segredo', 'objetivo', 'resumo'];
const blankEntry = { title: '', content: '', marker: '', characterId: '', isGmPrivate: false };

export default function CampaignDiaryTab({ campaignId, isMaster, currentUserId }) {
  const [entries, setEntries] = useState([]);
  const [members, setMembers] = useState([]);
  const [filters, setFilters] = useState({ search: '', marker: '', userId: '' });
  const [editor, setEditor] = useState(null);
  const [reader, setReader] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const visibleMembers = useMemo(() => members.filter((member) => member.user_id !== currentUserId || isMaster), [members, currentUserId, isMaster]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.marker) params.set('marker', filters.marker);
    if (filters.userId) params.set('userId', filters.userId);
    const { data } = await api.get(`/campaigns/${campaignId}/diary?${params.toString()}`);
    setEntries(data.entries || []);
    setMembers(data.members || []);
    setLoading(false);
  }

  useEffect(() => { load().catch(() => setLoading(false)); }, [campaignId, filters.marker, filters.userId]);

  async function saveEntry(event) {
    event.preventDefault();
    const payload = editor.entry;
    try {
      if (editor.mode === 'edit') await api.put(`/campaigns/${campaignId}/diary/${payload.id}`, payload);
      else await api.post(`/campaigns/${campaignId}/diary`, payload);
      setEditor(null);
      setMessage({ type: 'success', text: 'Diário salvo.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Não foi possível salvar.' });
    }
  }

  async function deleteEntry(entry) {
    if (!window.confirm('Excluir esta anotação do diário?')) return;
    await api.delete(`/campaigns/${campaignId}/diary/${entry.id}`);
    setMessage({ type: 'success', text: 'Anotação excluída.' });
    await load();
  }

  return (
    <section className="gothic-panel rounded-md p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[.24em] text-ember/70">Campanha</p>
          <h2 className="font-display text-3xl text-ember">Diário da Campanha</h2>
          <p className="mt-1 text-sm text-mist">{isMaster ? 'Você pode ler os diários dos jogadores. Seu diário privado fica só com você.' : 'Suas anotações ficam separadas por campanha.'}</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setEditor({ mode: 'add', entry: blankEntry })}><Plus size={16} /> Nova anotação</Button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_180px_220px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
          <input className="w-full rounded-md border border-ember/20 bg-black/30 py-3 pl-9 pr-3" placeholder="Buscar no diário" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        </label>
        <select className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={filters.marker} onChange={(event) => setFilters({ ...filters, marker: event.target.value })}>
          {markers.map((marker) => <option key={marker || 'todos'} value={marker}>{marker || 'Todos marcadores'}</option>)}
        </select>
        {isMaster && (
          <select className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={filters.userId} onChange={(event) => setFilters({ ...filters, userId: event.target.value })}>
            <option value="">Todos visíveis</option>
            <option value={currentUserId}>Meu diário privado</option>
            {visibleMembers.filter((member) => member.user_id !== currentUserId).map((member) => <option key={member.user_id} value={member.user_id}>{member.display_name || member.name}</option>)}
          </select>
        )}
        <LoadingButton loading={loading} loadingText="Buscando..." className="w-full" onClick={load}>Filtrar</LoadingButton>
      </div>

      {message && <div className="mt-4"><Alert type={message.type}>{message.text}</Alert></div>}

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {entries.map((entry) => (
          <article key={entry.id} className="rounded-md border border-ember/15 bg-black/25 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <button type="button" className="min-w-0 text-left" onClick={() => setReader(entry)}>
                <p className="text-xs uppercase tracking-[.18em] text-ember">{entry.marker || 'anotação'} {entry.is_gm_private ? 'privada' : ''}</p>
                <h3 className="break-words font-display text-2xl text-white">{entry.title}</h3>
                <p className="mt-1 line-clamp-3 text-sm text-mist">{entry.content}</p>
                <p className="mt-3 text-xs text-mist">{entry.author_name} · {new Date(entry.created_at).toLocaleString('pt-BR')}</p>
              </button>
              {entry.user_id === currentUserId && (
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button variant="ghost" className="px-3" onClick={() => setEditor({ mode: 'edit', entry: { ...entry, characterId: entry.character_id || '', isGmPrivate: entry.is_gm_private } })}><Edit size={16} /></Button>
                  <Button variant="ghost" className="px-3 text-red-200" onClick={() => deleteEntry(entry)}><Trash2 size={16} /></Button>
                </div>
              )}
            </div>
          </article>
        ))}
        {!entries.length && <p className="rounded-md border border-dashed border-ember/20 bg-black/20 p-6 text-center text-mist">Nenhuma anotação encontrada.</p>}
      </div>

      {reader && <DiaryReader entry={reader} onClose={() => setReader(null)} />}
      {editor && <DiaryEditor editor={editor} setEditor={setEditor} onClose={() => setEditor(null)} onSubmit={saveEntry} isMaster={isMaster} />}
    </section>
  );
}

function DiaryReader({ entry, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3 backdrop-blur">
      <article className="gothic-panel max-h-[92vh] w-full max-w-2xl overflow-auto rounded-md p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[.2em] text-ember">{entry.marker || 'Diário'}</p>
            <h2 className="font-display text-3xl text-white">{entry.title}</h2>
            <p className="mt-1 text-xs text-mist">{entry.author_name} · {new Date(entry.created_at).toLocaleString('pt-BR')}</p>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded border border-white/15" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-mist">{entry.content}</p>
      </article>
    </div>
  );
}

function DiaryEditor({ editor, setEditor, onClose, onSubmit, isMaster }) {
  const entry = editor.entry;
  const update = (patch) => setEditor({ ...editor, entry: { ...entry, ...patch } });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3 backdrop-blur">
      <form onSubmit={onSubmit} className="gothic-panel max-h-[92vh] w-full max-w-2xl overflow-auto rounded-md p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-3xl text-ember">{editor.mode === 'edit' ? 'Editar anotação' : 'Nova anotação'}</h2>
          <button type="button" className="grid h-10 w-10 place-items-center rounded border border-white/15" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-3">
          <input className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" placeholder="Título" value={entry.title} onChange={(event) => update({ title: event.target.value })} />
          <select className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={entry.marker || ''} onChange={(event) => update({ marker: event.target.value })}>
            {markers.map((marker) => <option key={marker || 'sem'} value={marker}>{marker || 'Sem marcador'}</option>)}
          </select>
          {isMaster && (
            <label className="flex items-center gap-2 rounded-md border border-ember/15 bg-black/20 p-3 text-sm text-mist">
              <input type="checkbox" checked={Boolean(entry.isGmPrivate)} onChange={(event) => update({ isGmPrivate: event.target.checked })} />
              Diário privado do mestre
            </label>
          )}
          <textarea className="min-h-64 rounded-md border border-ember/20 bg-black/30 px-3 py-3" placeholder="Conteúdo" value={entry.content} onChange={(event) => update({ content: event.target.value })} />
          <div className="grid gap-2 sm:flex sm:justify-end">
            <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
            <Button className="w-full sm:w-auto">Salvar</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
