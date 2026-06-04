export default function Alert({ type = 'info', children }) {
  const styles = {
    error: 'border-red-400/40 bg-red-950/35 text-red-100',
    success: 'border-emerald-400/40 bg-emerald-950/30 text-emerald-100',
    info: 'border-ember/30 bg-ember/10 text-mist'
  };

  return (
    <div className={`rounded-md border px-3 py-2 text-sm shadow-lg shadow-black/20 soft-motion ${styles[type]}`}>
      {children}
    </div>
  );
}
