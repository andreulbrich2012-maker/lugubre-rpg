import { Edit, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Alert from '../Alert';
import Button from '../Button';
import LoadingButton from '../LoadingButton';
import FeedbackStatusBadge from './FeedbackStatusBadge';
import { feedbackPriorities, feedbackStatuses, feedbackTypes, formatFeedbackDate } from './feedbackConstants';
import { api } from '../../lib/api';

const blankFilters = { search: '', type: '', priority: '', status: '' };

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [filters, setFilters] = useState(blankFilters);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletingId, setDeletingId] = useState('');

  const activeFilters = useMemo(() => Object.entries(filters).filter(([, value]) => value).length, [filters]);

  async function load(nextFilters = filters) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const { data } = await api.get(`/admin/feedbacks?${params.toString()}`);
      setFeedbacks(data || []);
    } finally {
      setLoading(false);
    }
  }

  function patchFilters(value) {
    const next = { ...filters, ...value };
    setFilters(next);
    load(next);
  }

  async function openDetails(feedback) {
    const { data } = await api.get(`/admin/feedbacks/${feedback.id}`);
    setSelected(data);
  }

  async function saveStatus(id, status) {
    const { data } = await api.put(`/admin/feedbacks/${id}/status`, { status });
    setSelected((current) => current?.id === id ? { ...current, ...data } : current);
    setMessage({ type: 'success', text: 'Status atualizado.' });
    load();
  }

  async function saveResponse(id, adminResponse) {
    const { data } = await api.put(`/admin/feedbacks/${id}/response`, { adminResponse });
    setSelected((current) => current?.id === id ? { ...current, ...data } : current);
    setMessage({ type: 'success', text: 'Resposta salva.' });
    load();
  }

  async function deleteFeedback(feedback) {
    setDeletingId(feedback.id);
    setMessage(null);
    try {
      await api.delete(`/admin/feedbacks/${feedback.id}`);
      setFeedbacks((current) => current.filter((item) => item.id !== feedback.id));
      setSelected(null);
      setConfirmDelete(null);
      setMessage({ type: 'success', text: 'Feedback deletado.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Nao foi possivel deletar o feedback.' });
    } finally {
      setDeletingId('');
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <section className="gothic-panel rounded-md p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[.24em] text-ember/70">Admin</p>
            <h2 className="font-display text-3xl text-ember">Feedbacks</h2>
            <p className="mt-1 text-sm text-mist">Leia, filtre, responda e acompanhe pedidos dos usuários.</p>
          </div>
          <p className="text-sm text-mist">{feedbacks.length} resultado(s) · {activeFilters} filtro(s)</p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_180px_150px_190px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
            <input className="field pl-9" placeholder="Pesquisar título, usuário ou email" value={filters.search} onChange={(event) => patchFilters({ search: event.target.value })} />
          </label>
          <FilterSelect value={filters.type} onChange={(type) => patchFilters({ type })} options={feedbackTypes} placeholder="Todos tipos" />
          <FilterSelect value={filters.priority} onChange={(priority) => patchFilters({ priority })} options={feedbackPriorities} placeholder="Prioridade" />
          <FilterSelect value={filters.status} onChange={(status) => patchFilters({ status })} options={feedbackStatuses} placeholder="Status" />
          <Button type="button" variant="ghost" className="min-h-12 w-full lg:w-auto" onClick={() => { setFilters(blankFilters); load(blankFilters); }}>Limpar</Button>
        </div>
      </section>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      <section className="gothic-panel rounded-md p-4 sm:p-5">
        {loading ? (
          <div className="grid min-h-48 place-items-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-ember/30 border-t-ember" />
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {feedbacks.map((feedback) => (
              <article key={feedback.id} className="rounded-md border border-ember/15 bg-black/25 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[.18em] text-ember">{feedback.type}</p>
                    <h3 className="break-words font-display text-2xl text-white">{feedback.title}</h3>
                    <p className="mt-1 text-xs text-mist">{feedback.user_name} · {feedback.user_email}</p>
                    <p className="mt-1 text-xs text-mist">{formatFeedbackDate(feedback.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <FeedbackStatusBadge label={feedback.status} />
                    <FeedbackStatusBadge label={feedback.priority} tone="priority" />
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-mist">{feedback.description}</p>
                <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                  <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => openDetails(feedback)}><Edit size={15} /> Detalhes</Button>
                  <Button type="button" variant="ghost" data-admin-delete-id={feedback.id} data-admin-delete-endpoint="feedbacks" className="w-full text-red-200 sm:w-auto" onClick={() => setConfirmDelete(feedback)}><Trash2 size={15} /> Deletar</Button>
                </div>
              </article>
            ))}
            {!feedbacks.length && <p className="rounded-md border border-dashed border-ember/20 bg-black/20 p-8 text-center text-mist xl:col-span-2">Nenhum feedback encontrado.</p>}
          </div>
        )}
      </section>

      {confirmDelete && (
        <ConfirmDialog
          title={`Deletar ${confirmDelete.title}?`}
          loading={deletingId === confirmDelete.id}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteFeedback(confirmDelete)}
        />
      )}

      {selected && (
        <AdminFeedbackDetails
          feedback={selected}
          onClose={() => setSelected(null)}
          onStatus={saveStatus}
          onResponse={saveResponse}
          onDelete={setConfirmDelete}
        />
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options, placeholder }) {
  return (
    <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function AdminFeedbackDetails({ feedback, onClose, onStatus, onResponse, onDelete }) {
  const [status, setStatus] = useState(feedback.status || 'Enviado');
  const [adminResponse, setAdminResponse] = useState(feedback.admin_response || '');
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingResponse, setSavingResponse] = useState(false);

  async function submitStatus(event) {
    event.preventDefault();
    setSavingStatus(true);
    try {
      await onStatus(feedback.id, status);
    } finally {
      setSavingStatus(false);
    }
  }

  async function submitResponse(event) {
    event.preventDefault();
    setSavingResponse(true);
    try {
      await onResponse(feedback.id, adminResponse);
    } finally {
      setSavingResponse(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-2 py-3 backdrop-blur sm:px-4">
      <section className="gothic-panel max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-md p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[.18em] text-ember">{feedback.type} · {feedback.priority}</p>
            <h2 className="break-words font-display text-3xl text-white">{feedback.title}</h2>
            <p className="mt-1 text-sm text-mist">{feedback.user_name} · {feedback.user_email}</p>
          </div>
          <button className="grid h-11 w-11 shrink-0 place-items-center rounded border border-white/15 text-mist" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Info label="Descrição" value={feedback.description} large />
            <Info label="Página relacionada" value={feedback.page_context || '-'} />
            <Info label="Data de envio" value={formatFeedbackDate(feedback.created_at)} />
            {feedback.attachment_url && (
              <div>
                <p className="text-xs uppercase tracking-[.16em] text-ember">Anexo</p>
                <img src={feedback.attachment_url} alt={`Anexo do feedback ${feedback.title}`} className="mt-2 max-h-80 w-full rounded-md border border-ember/15 object-contain" />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <form onSubmit={submitStatus} className="rounded-md border border-ember/15 bg-black/25 p-4">
              <label className="block text-sm text-mist">
                Status atual
                <select className="field" value={status} onChange={(event) => setStatus(event.target.value)}>
                  {feedbackStatuses.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <LoadingButton loading={savingStatus} loadingText="Salvando..." className="mt-3 min-h-11 w-full">Alterar status</LoadingButton>
            </form>

            <form onSubmit={submitResponse} className="rounded-md border border-ember/15 bg-black/25 p-4">
              <label className="block text-sm text-mist">
                Resposta do admin
                <textarea className="field min-h-40 resize-y" value={adminResponse} onChange={(event) => setAdminResponse(event.target.value)} placeholder="Escreva uma resposta para o usuário." />
              </label>
              {feedback.responded_at && <p className="mt-2 text-xs text-mist">Última resposta em {formatFeedbackDate(feedback.responded_at)}</p>}
              <LoadingButton loading={savingResponse} loadingText="Salvando..." className="mt-3 min-h-11 w-full">Salvar resposta</LoadingButton>
            </form>

            <Button type="button" variant="ghost" data-admin-delete-id={feedback.id} data-admin-delete-endpoint="feedbacks" className="min-h-11 w-full text-red-200" onClick={() => onDelete(feedback)}><Trash2 size={15} /> Deletar feedback</Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value, large = false }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/25 p-3">
      <p className="text-xs uppercase tracking-[.16em] text-ember">{label}</p>
      <p className={`mt-2 whitespace-pre-wrap break-words text-mist ${large ? 'text-sm leading-relaxed' : 'text-sm'}`}>{value}</p>
    </div>
  );
}

function ConfirmDialog({ title, onCancel, onConfirm, loading = false }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4">
      <section className="gothic-panel max-h-[90vh] w-full max-w-md overflow-auto rounded-md p-4 sm:p-6">
        <h2 className="break-words font-display text-3xl text-ember">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-mist">Tem certeza que deseja deletar este feedback? Essa acao nao podera ser desfeita.</p>
        <div className="mt-6 grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Button type="button" variant="ghost" disabled={loading} className="w-full sm:w-auto" onClick={onCancel}>Cancelar</Button>
          <Button type="button" disabled={loading} className="w-full border-red-500/70 bg-red-900/70 hover:bg-red-800 sm:w-auto" onClick={onConfirm}>{loading ? 'Deletando...' : 'Deletar'}</Button>
        </div>
      </section>
    </div>
  );
}
