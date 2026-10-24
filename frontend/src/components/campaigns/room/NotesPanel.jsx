import { useMemo, useState } from 'react';
import { Lock, Pin, PinOff, Plus, Trash2, Users, Eye } from 'lucide-react';
import Button from '../../Button';
import { api } from '../../../lib/api';

// Anotacoes da campanha: privadas, para o mestre ou para o grupo (pedido do Andre, 23/10).
const SCOPES = {
  private: { label: 'Só eu', icon: Lock },
  master: { label: 'Eu e o mestre', icon: Eye },
  party: { label: 'Todo o grupo', icon: Users }
};

export default function NotesPanel({ campaignId, notes, currentUserId, isMaster, onChanged }) {
  const [filter, setFilter] = useState('all');
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const scopes = isMaster ? ['private', 'party'] : ['private', 'master', 'party'];

  const visible = useMemo(() => notes.filter((n) => filter === 'all' || n.scope === filter), [notes, filter]);

  async function save() {
    if (!draft?.title?.trim() && !draft?.body?.trim()) return;
    setError('');
    try {
      const body = { title: draft.title?.trim() || 'Sem título', body: draft.body || '', scope: draft.scope, pinned: Boolean(draft.pinned) };
      if (draft.id) await api.patch(`/campaigns/${campaignId}/notes/${draft.id}`, body);
      else await api.post(`/campaigns/${campaignId}/notes`, body);
      setDraft(null);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível salvar a nota. O texto continua aqui.');
    }
  }

  async function remove(note) {
    if (!window.confirm(`Apagar a nota “${note.title}”?`)) return;
    await api.delete(`/campaigns/${campaignId}/notes/${note.id}`).catch(() => null);
    onChanged();
  }

  async function togglePin(note) {
    await api.patch(`/campaigns/${campaignId}/notes/${note.id}`, { pinned: !note.pinned }).catch(() => null);
    onChanged();
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap gap-1 border-b-[3px] border-lead p-3">
        {['all', ...scopes].map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)} className={`btn btn-glass !min-h-9 !px-3 text-sm ${filter === s ? 'lit' : ''}`}>
            {s === 'all' ? 'Todas' : SCOPES[s].label}
          </button>
        ))}
        <Button className="ml-auto !min-h-9 text-sm" onClick={() => setDraft({ title: '', body: '', scope: isMaster ? 'private' : 'master' })}><Plus size={16} /> Nota</Button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {draft && (
          <div className="gothic-panel p-3">
            <input className="field !mt-0" placeholder="Título" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="Título da nota" />
            <textarea className="field mt-2 min-h-[9rem]" placeholder="Pistas, nomes, segredos…" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} aria-label="Texto da nota" />
            <div className="mt-2 flex flex-wrap gap-1" role="radiogroup" aria-label="Quem pode ver">
              {scopes.map((s) => {
                const Icon = SCOPES[s].icon;
                return (
                  <button key={s} type="button" role="radio" aria-checked={draft.scope === s} onClick={() => setDraft({ ...draft, scope: s })} className={`btn btn-glass !min-h-9 !px-3 text-sm ${draft.scope === s ? 'lit' : ''}`}>
                    <Icon size={14} /> {SCOPES[s].label}
                  </button>
                );
              })}
            </div>
            {error && <p className="mt-2 text-sm text-red-200" role="alert">{error}</p>}
            <div className="mt-3 flex gap-2">
              <Button onClick={save}>Salvar</Button>
              <Button variant="ghost" onClick={() => { setDraft(null); setError(''); }}>Cancelar</Button>
            </div>
          </div>
        )}

        {visible.map((note) => {
          const Icon = SCOPES[note.scope]?.icon || Lock;
          const mine = note.author_id === currentUserId;
          return (
            <article key={note.id} className={`border-[3px] border-lead bg-black/35 p-3 ${note.pinned ? 'outline outline-1 outline-ember/40' : ''}`}>
              <header className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-display text-xl text-bone">{note.title}</h3>
                  <p className="flex items-center gap-1 text-xs text-mist"><Icon size={12} /> {SCOPES[note.scope]?.label} · {mine ? 'você' : note.author_name}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {mine && <button type="button" className="btn btn-glass !min-h-9 !w-9 !p-0" onClick={() => togglePin(note)} aria-label={note.pinned ? 'Desafixar' : 'Fixar'}>{note.pinned ? <PinOff size={15} /> : <Pin size={15} />}</button>}
                  {mine && <button type="button" className="btn btn-glass !min-h-9 !px-2 text-sm" onClick={() => setDraft({ ...note })}>Editar</button>}
                  {(mine || isMaster) && <button type="button" className="btn btn-glass !min-h-9 !w-9 !p-0 text-red-200" onClick={() => remove(note)} aria-label="Apagar nota"><Trash2 size={15} /></button>}
                </div>
              </header>
              {note.body && <p className="mt-2 whitespace-pre-wrap text-[15px] text-bone/90">{note.body}</p>}
            </article>
          );
        })}
        {!visible.length && !draft && (
          <p className="p-4 text-center text-mist">{isMaster ? 'Nenhuma nota. Guarde aqui segredos da campanha ou recados para o grupo.' : 'Nenhuma nota. Anote pistas só para você, mande algo só para o mestre ou divida com o grupo.'}</p>
        )}
      </div>
    </section>
  );
}
