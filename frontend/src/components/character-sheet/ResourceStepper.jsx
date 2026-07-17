import { Check, ChevronLeft, ChevronRight, LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react';

const tones = {
  life: {
    accent: 'text-red-300',
    border: 'border-red-400/25',
    button: 'border-red-400/25 bg-red-950/35 text-red-200 hover:bg-red-900/45',
    fill: 'bg-gradient-to-r from-red-950 via-red-700 to-red-500'
  },
  sanity: {
    accent: 'text-fuchsia-300',
    border: 'border-fuchsia-400/25',
    button: 'border-fuchsia-400/25 bg-fuchsia-950/35 text-fuchsia-200 hover:bg-fuchsia-900/45',
    fill: 'bg-gradient-to-r from-purple-950 via-purple-700 to-fuchsia-500'
  },
  mana: {
    accent: 'text-amber-300',
    border: 'border-amber-400/25',
    button: 'border-amber-400/25 bg-amber-950/35 text-amber-100 hover:bg-amber-900/45',
    fill: 'bg-gradient-to-r from-orange-950 via-orange-700 to-amber-400'
  }
};

function SaveState({ status }) {
  const normalized = status || 'Pronto';
  const config = normalized === 'Salvando...'
    ? { Icon: LoaderCircle, className: 'animate-spin text-mist' }
    : normalized === 'Erro ao salvar'
      ? { Icon: TriangleAlert, className: 'text-red-300' }
      : normalized === 'Salvo'
        ? { Icon: Check, className: 'text-emerald-300' }
        : { Icon: Check, className: 'text-mist/70' };
  const { Icon } = config;

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase ${config.className}`} aria-live="polite">
      <Icon size={12} /> {normalized}
    </span>
  );
}

export function ValueStepper({ label, value, onDecrease, onIncrease, decreaseDisabled = false, increaseDisabled = false, tone = 'life' }) {
  const colors = tones[tone] || tones.life;

  return (
    <div className="grid grid-cols-[minmax(62px,1fr)_44px_62px_44px] items-center overflow-hidden rounded-md border border-white/10 bg-black/30">
      <span className="px-2 text-[10px] font-bold uppercase text-mist">{label}</span>
      <button
        type="button"
        className={`grid h-11 w-11 place-items-center border-l ${colors.button} disabled:cursor-not-allowed disabled:opacity-35`}
        onClick={onDecrease}
        disabled={decreaseDisabled}
        aria-label={`Diminuir ${label}`}
      >
        <ChevronLeft size={20} />
      </button>
      <output className="grid h-11 place-items-center border-y-0 border-white/10 text-center text-lg font-black text-white" aria-label={`${label}: ${value}`}>
        {value}
      </output>
      <button
        type="button"
        className={`grid h-11 w-11 place-items-center border-l ${colors.button} disabled:cursor-not-allowed disabled:opacity-35`}
        onClick={onIncrease}
        disabled={increaseDisabled}
        aria-label={`Aumentar ${label}`}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

export function ResourceStepper({ type, label, current, max, status, onAdjust, onRetry, compact = false, onExpand }) {
  const safeCurrent = Math.max(0, Number(current || 0));
  const safeMax = Math.max(0, Number(max || 0));
  const width = safeMax > 0 ? Math.max(0, Math.min(100, (safeCurrent / safeMax) * 100)) : 0;
  const colors = tones[type] || tones.life;
  const minimumMax = type === 'mana' ? 0 : 1;

  if (compact) {
    return (
      <section className={`rounded-md border bg-[#111014] p-2.5 ${colors.border}`} data-testid={`resource-${type}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`text-[10px] font-bold uppercase ${colors.accent}`}>{label}</h3>
              <SaveState status={status} />
            </div>
            <p className="mt-0.5 text-xs text-mist">Máximo {safeMax}</p>
          </div>
          <div className="grid shrink-0 grid-cols-[44px_58px_44px] overflow-hidden rounded-md border border-white/10 bg-black/35">
            <button type="button" className={`grid h-11 place-items-center ${colors.button}`} onClick={() => onAdjust('current', -1)} disabled={safeCurrent <= 0} aria-label={`Diminuir ${label} atual`}><ChevronLeft size={20} /></button>
            <output className="grid h-11 place-items-center text-lg font-black text-white" aria-label={`${label} atual: ${safeCurrent}`}>{safeCurrent}</output>
            <button type="button" className={`grid h-11 place-items-center ${colors.button}`} onClick={() => onAdjust('current', 1)} disabled={safeMax > 0 && safeCurrent >= safeMax} aria-label={`Aumentar ${label} atual`}><ChevronRight size={20} /></button>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`${label}: ${safeCurrent} de ${safeMax}`} aria-valuemin="0" aria-valuemax={safeMax} aria-valuenow={safeCurrent}>
          <div className={`h-full rounded-full transition-[width] duration-200 ${colors.fill}`} style={{ width: `${width}%` }} />
        </div>
        {onExpand && <button type="button" className="mt-2 min-h-11 w-full text-left text-[10px] font-bold uppercase text-ember hover:text-white" onClick={onExpand}>Ajustar atual e máximo</button>}
      </section>
    );
  }

  return (
    <section className={`rounded-md border bg-[#111014] p-3 ${colors.border}`} data-testid={`resource-${type}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={`text-xs font-bold uppercase ${colors.accent}`}>{label}</h3>
        <SaveState status={status} />
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`${label}: ${safeCurrent} de ${safeMax}`} aria-valuemin="0" aria-valuemax={safeMax} aria-valuenow={safeCurrent}>
        <div className={`h-full rounded-full transition-[width] duration-200 ${colors.fill}`} style={{ width: `${width}%` }} />
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <ValueStepper
          label={`${label} atual`}
          value={safeCurrent}
          tone={type}
          onDecrease={() => onAdjust('current', -1)}
          onIncrease={() => onAdjust('current', 1)}
          decreaseDisabled={safeCurrent <= 0}
          increaseDisabled={safeMax > 0 && safeCurrent >= safeMax}
        />
        <ValueStepper
          label={`${label} máxima`}
          value={safeMax}
          tone={type}
          onDecrease={() => onAdjust('max', -1)}
          onIncrease={() => onAdjust('max', 1)}
          decreaseDisabled={safeMax <= minimumMax}
        />
      </div>
      {status === 'Atual ajustado' && <p className="mt-2 text-xs text-emerald-200">O valor atual foi ajustado para respeitar o novo máximo.</p>}
      {status === 'Erro ao salvar' && (
        <button type="button" className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-md border border-red-400/30 px-3 text-xs font-semibold text-red-200 hover:bg-red-950/30" onClick={onRetry}>
          <RotateCcw size={14} /> Tentar novamente
        </button>
      )}
    </section>
  );
}
