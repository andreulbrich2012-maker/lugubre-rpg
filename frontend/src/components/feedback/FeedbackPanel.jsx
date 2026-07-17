import { useEffect, useState } from 'react';
import Alert from '../Alert';
import { api } from '../../lib/api';
import FeedbackForm from './FeedbackForm';
import FeedbackList from './FeedbackList';

export default function FeedbackPanel() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const [selected, setSelected] = useState(null);

  async function load() {
    setLoadingList(true);
    try {
      const { data } = await api.get('/feedbacks/my');
      setFeedbacks(data || []);
    } finally {
      setLoadingList(false);
    }
  }

  async function submitFeedback(payload) {
    setSending(true);
    setMessage(null);
    try {
      const { data } = await api.post('/feedbacks', payload);
      setMessage({ type: 'success', text: data.message || 'Feedback enviado com sucesso. Obrigado por ajudar a melhorar o Lúgubre RPG.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Não foi possível enviar o feedback.' });
    } finally {
      setSending(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <FeedbackForm onSubmit={submitFeedback} loading={sending} />
      {message && <Alert type={message.type}>{message.text}</Alert>}
      <FeedbackList feedbacks={feedbacks} loading={loadingList} onOpen={setSelected} />
      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-3 py-4 backdrop-blur">
          <section className="gothic-panel max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-md p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[.2em] text-ember">{selected.type} · {selected.priority}</p>
                <h2 className="break-words font-display text-3xl text-white">{selected.title}</h2>
              </div>
              <button className="grid h-11 w-11 place-items-center rounded border border-white/15 text-mist" onClick={() => setSelected(null)} aria-label="Fechar">×</button>
            </div>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-mist">{selected.description}</p>
            {selected.page_context && <p className="mt-4 text-sm text-ember">Página: {selected.page_context}</p>}
            {selected.attachment_url && <img src={selected.attachment_url} alt={`Anexo do feedback ${selected.title}`} className="mt-4 max-h-80 w-full rounded-md border border-ember/15 object-contain" />}
            {selected.admin_response && (
              <div className="mt-5 rounded-md border border-ember/20 bg-ember/10 p-4">
                <p className="text-xs uppercase tracking-[.18em] text-ember">Resposta do admin</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-white">{selected.admin_response}</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
