import { ImagePlus } from 'lucide-react';
import { useState } from 'react';
import Alert from '../Alert';
import LoadingButton from '../LoadingButton';
import { feedbackPriorities, feedbackTypes } from './feedbackConstants';

const blankFeedback = {
  title: '',
  type: 'Bug',
  description: '',
  priority: 'Média',
  pageContext: '',
  attachmentUrl: ''
};

export default function FeedbackForm({ onSubmit, loading }) {
  const [form, setForm] = useState(blankFeedback);
  const [error, setError] = useState('');

  function patch(value) {
    setError('');
    setForm((current) => ({ ...current, ...value }));
  }

  function readAttachment(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Envie apenas imagem como anexo.');
      return;
    }
    if (file.size > 900_000) {
      setError('Use uma imagem menor que 900 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch({ attachmentUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError('Título e descrição são obrigatórios.');
      return;
    }
    if (form.description.trim().length < 10) {
      setError('Descreva melhor o feedback com pelo menos 10 caracteres.');
      return;
    }
    await onSubmit(form);
    setForm(blankFeedback);
  }

  return (
    <form onSubmit={submit} className="gothic-panel rounded-md p-4 sm:p-6">
      <div>
        <p className="text-xs uppercase tracking-[.24em] text-ember/70">Sua voz no sistema</p>
        <h2 className="font-display text-3xl text-ember">Enviar feedback</h2>
        <p className="mt-2 text-sm text-mist">Conte o que quebrou, o que pode melhorar ou que ideia deveria ganhar forma.</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Field label="Título">
          <input className="field" value={form.title} onChange={(event) => patch({ title: event.target.value })} placeholder="Ex: Menu mobile não abre" />
        </Field>
        <Field label="Página relacionada">
          <input className="field" value={form.pageContext} onChange={(event) => patch({ pageContext: event.target.value })} placeholder="/characters, /campaigns..." />
        </Field>
        <Field label="Tipo de feedback">
          <select className="field" value={form.type} onChange={(event) => patch({ type: event.target.value })}>
            {feedbackTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Prioridade">
          <select className="field" value={form.priority} onChange={(event) => patch({ priority: event.target.value })}>
            {feedbackPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Descrição" className="mt-4">
        <textarea className="field min-h-36 resize-y" value={form.description} onChange={(event) => patch({ description: event.target.value })} placeholder="Explique o problema, sugestão ou ideia com detalhes." />
      </Field>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block text-sm text-mist">
          Imagem/anexo opcional
          <span className="mt-1 flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-dashed border-ember/25 bg-black/30 px-3 py-3 text-sm text-mist hover:border-ember/45">
            <ImagePlus size={18} className="text-ember" />
            {form.attachmentUrl ? 'Imagem anexada' : 'Selecionar imagem'}
            <input type="file" accept="image/*" className="hidden" onChange={(event) => readAttachment(event.target.files?.[0])} />
          </span>
        </label>
        <LoadingButton loading={loading} loadingText="Enviando..." className="min-h-12 w-full sm:w-auto">Enviar feedback</LoadingButton>
      </div>

      {form.attachmentUrl && <img src={form.attachmentUrl} className="mt-4 max-h-56 w-full rounded-md border border-ember/15 object-cover" />}
      {error && <div className="mt-4"><Alert type="error">{error}</Alert></div>}
    </form>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block text-sm text-mist ${className}`}>
      {label}
      {children}
    </label>
  );
}
