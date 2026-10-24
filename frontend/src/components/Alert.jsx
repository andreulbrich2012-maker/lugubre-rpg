export default function Alert({ type = 'info', children }) {
  // Vidro colorido preso no chumbo: so a cor do vidro diz o tipo (sem borda lateral).
  const styles = {
    error: 'bg-blood/30 text-bone',
    success: 'bg-[color-mix(in_srgb,var(--p-gaia)_35%,transparent)] text-bone',
    info: 'bg-glass text-mist'
  };

  return (
    <div role={type === 'error' ? 'alert' : undefined} className={`border-[3px] border-lead px-3 py-2 text-sm outline outline-1 -outline-offset-4 outline-ember/10 soft-motion ${styles[type]}`}>
      {children}
    </div>
  );
}
