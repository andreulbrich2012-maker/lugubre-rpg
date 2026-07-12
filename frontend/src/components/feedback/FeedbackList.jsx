import FeedbackCard from './FeedbackCard';

export default function FeedbackList({ feedbacks, loading, onOpen }) {
  if (loading) {
    return (
      <div className="gothic-panel grid min-h-48 place-items-center rounded-md">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-ember/30 border-t-ember" />
      </div>
    );
  }

  return (
    <section className="gothic-panel rounded-md p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[.24em] text-ember/70">Histórico</p>
          <h2 className="font-display text-3xl text-ember">Meus feedbacks</h2>
        </div>
        <p className="text-sm text-mist">{feedbacks.length} registro(s)</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {feedbacks.map((feedback) => <FeedbackCard key={feedback.id} feedback={feedback} onOpen={onOpen} />)}
        {!feedbacks.length && (
          <p className="rounded-md border border-dashed border-ember/20 bg-black/20 p-8 text-center text-mist lg:col-span-2">
            Você ainda não enviou feedback.
          </p>
        )}
      </div>
    </section>
  );
}
