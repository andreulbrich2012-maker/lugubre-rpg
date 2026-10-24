import { priorityStyles, statusStyles } from './feedbackConstants';

export default function FeedbackStatusBadge({ label, tone = 'status' }) {
  const styles = tone === 'priority' ? priorityStyles : statusStyles;
  return (
    <span className={`badge ${styles[label] || 'bg-glass text-mist'}`}>
      {label || '-'}
    </span>
  );
}
