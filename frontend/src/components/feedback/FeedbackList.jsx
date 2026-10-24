import FeedbackCard from './FeedbackCard';

export default function FeedbackList({ feedbacks, loading, onOpen }) {
  if (loading) {
    return (
      <div className="gothic-panel grid min-h-48 place-items-center" aria-label="Carregando feedbacks">
        <span className="spinner" />
      </div>
    );
  }

  return (
    <section className="gothic-panel p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-display text-3xl text-bone">Meus feedbacks</h2>
        <p className="tabular text-sm text-mist">{feedbacks.length} registro(s)</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {feedbacks.map((feedback) => <FeedbackCard key={feedback.id} feedback={feedback} onOpen={onOpen} />)}
        {!feedbacks.length && (
          <p className="border-[3px] border-dashed border-lead bg-glass p-8 text-center text-mist lg:col-span-2">
            Você ainda não enviou feedback.
          </p>
        )}
      </div>
    </section>
  );
}
