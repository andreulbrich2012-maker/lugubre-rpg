import FeedbackPanel from '../components/feedback/FeedbackPanel';

export default function Feedback() {
  return (
    <main className="mx-auto max-w-7xl px-3 pb-24 pt-6 sm:px-4 sm:py-10">
      <section className="mb-6">
        <h1 className="font-display text-4xl text-bone sm:text-5xl">Feedback</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mist">
          Envie bugs, sugestões, ideias e comentários para ajudar a lapidar o Lúgubre RPG.
        </p>
      </section>
      <FeedbackPanel />
    </main>
  );
}
