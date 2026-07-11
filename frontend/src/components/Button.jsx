export default function Button({ children, className = '', variant = 'primary', ...props }) {
  const styles = variant === 'ghost'
    ? 'border border-ember/30 bg-transparent text-ember hover:bg-ember/10'
    : 'border border-blood/70 bg-blood text-white hover:bg-blood/80';
  return (
    <button className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 font-semibold soft-motion disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}
