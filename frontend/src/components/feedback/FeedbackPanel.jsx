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
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 px-3 py-4">
          <section className="gothic-panel max-h-[92vh] w-full max-w-2xl overflow-y-auto p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="break-words font-display text-3xl text-bone">{selected.title}</h2>
                <p className="mt-1 text-sm text-mist">{selected.type} · {selected.priority}</p>
              </div>
              <button type="button" className="grid h-11 w-11 shrink-0 place-items-center border-[3px] border-lead bg-glass text-mist hover:text-ember" onClick={() => setSelected(null)} aria-label="Fechar">×</button>
            </div>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-mist">{selected.description}</p>
            {selected.page_context && <p className="mt-4 text-sm text-ember">Página: {selected.page_context}</p>}
            {selected.attachment_url && <img src={selected.attachment_url} alt={`Anexo do feedback ${selected.title}`} className="mt-4 max-h-80 w-full border-[3px] border-lead object-contain" />}
            {selected.admin_response && (
              <div className="mt-5 pane lit p-4">
                <p className="font-display text-lg text-bone">Resposta do admin</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-bone">{selected.admin_response}</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
