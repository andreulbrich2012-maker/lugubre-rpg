import { MessageSquareText } from 'lucide-react';
import FeedbackStatusBadge from './FeedbackStatusBadge';
import { formatFeedbackDate } from './feedbackConstants';

export default function FeedbackCard({ feedback, onOpen }) {
  return (
    <article className="rounded-md border border-ember/15 bg-black/25 p-4 soft-motion">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[.18em] text-ember">{feedback.type}</p>
          <h3 className="mt-1 break-words font-display text-2xl text-white">{feedback.title}</h3>
          <p className="mt-1 text-xs text-mist">Enviado em {formatFeedbackDate(feedback.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <FeedbackStatusBadge label={feedback.status} />
          <FeedbackStatusBadge label={feedback.priority} tone="priority" />
        </div>
      </div>

      <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-mist">{feedback.description}</p>

      {feedback.admin_response && (
        <div className="mt-4 rounded-md border border-ember/20 bg-ember/10 p-3">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[.16em] text-ember"><MessageSquareText size={14} /> Resposta do admin</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-white">{feedback.admin_response}</p>
          {feedback.responded_at && <p className="mt-2 text-xs text-mist">Respondido em {formatFeedbackDate(feedback.responded_at)}</p>}
        </div>
      )}

      {onOpen && (
        <button type="button" className="mt-4 min-h-10 rounded-md border border-ember/25 px-3 py-2 text-sm font-semibold text-ember hover:bg-ember/10" onClick={() => onOpen(feedback)}>
          Abrir detalhes
        </button>
      )}
    </article>
  );
}
