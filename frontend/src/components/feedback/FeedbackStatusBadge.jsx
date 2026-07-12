import { priorityStyles, statusStyles } from './feedbackConstants';

export default function FeedbackStatusBadge({ label, tone = 'status' }) {
  const styles = tone === 'priority' ? priorityStyles : statusStyles;
  return (
    <span className={`inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles[label] || 'border-white/15 bg-black/30 text-mist'}`}>
      {label || '-'}
    </span>
  );
}
