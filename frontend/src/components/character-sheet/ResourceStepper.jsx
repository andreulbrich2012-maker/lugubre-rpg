import { Check, ChevronLeft, ChevronRight, LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react';

// Cada recurso e um vidro de uma cor so: Vida rubi, Sanidade Eter, Mana Ponto.
const tones = {
  life: { fill: '#7a1630', button: 'bg-glass text-bone hover:bg-blood' },
  sanity: { fill: 'var(--p-eter)', button: 'bg-glass text-bone hover:bg-[var(--p-eter)]' },
  mana: { fill: 'var(--p-ponto)', button: 'bg-glass text-bone hover:bg-[var(--p-ponto)]' }
};

function SaveState({ status }) {
  const normalized = status || 'Pronto';
  const config = normalized === 'Salvando...'
    ? { Icon: LoaderCircle, className: 'animate-spin text-mist' }
    : normalized === 'Erro ao salvar'
      ? { Icon: TriangleAlert, className: 'text-bone' }
      : normalized === 'Salvo'
        ? { Icon: Check, className: 'text-bone' }
        : { Icon: Check, className: 'text-mist' };
  const { Icon } = config;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${config.className}`} aria-live="polite">
      <Icon size={12} /> {normalized}
    </span>
  );
}

export function ValueStepper({ label, value, onDecrease, onIncrease, decreaseDisabled = false, increaseDisabled = false, tone = 'life' }) {
  const colors = tones[tone] || tones.life;

  return (
    <div className="grid grid-cols-[minmax(62px,1fr)_44px_62px_44px] items-center overflow-hidden border-[3px] border-lead bg-glass">
      <span className="px-2 text-xs font-bold text-mist">{label}</span>
      <button
        type="button"
        className={`grid h-11 w-11 place-items-center border-l-[3px] border-lead ${colors.button} disabled:cursor-not-allowed disabled:opacity-35`}
        onClick={onDecrease}
        disabled={decreaseDisabled}
        aria-label={`Diminuir ${label}`}
      >
        <ChevronLeft size={20} />
      </button>
      <output className="grid h-11 place-items-center tabular text-center text-xl font-bold text-bone" aria-label={`${label}: ${value}`}>
        {value}
      </output>
      <button
        type="button"
        className={`grid h-11 w-11 place-items-center border-l-[3px] border-lead ${colors.button} disabled:cursor-not-allowed disabled:opacity-35`}
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
      <section className="pane p-2.5" data-testid={`resource-${type}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base text-bone">{label}</h3>
              <SaveState status={status} />
            </div>
            <p className="tabular mt-0.5 text-xs text-mist">Máximo {safeMax}</p>
          </div>
          <div className="grid shrink-0 grid-cols-[44px_58px_44px] overflow-hidden border-[3px] border-lead bg-glass">
            <button type="button" className={`grid h-11 place-items-center ${colors.button}`} onClick={() => onAdjust('current', -1)} disabled={safeCurrent <= 0} aria-label={`Diminuir ${label} atual`}><ChevronLeft size={20} /></button>
            <output className="grid h-11 place-items-center tabular text-2xl font-bold text-bone" aria-label={`${label} atual: ${safeCurrent}`}>{safeCurrent}</output>
            <button type="button" className={`grid h-11 place-items-center ${colors.button}`} onClick={() => onAdjust('current', 1)} disabled={safeMax > 0 && safeCurrent >= safeMax} aria-label={`Aumentar ${label} atual`}><ChevronRight size={20} /></button>
          </div>
        </div>
        <div className="gauge mt-2" role="progressbar" aria-label={`${label}: ${safeCurrent} de ${safeMax}`} aria-valuemin="0" aria-valuemax={safeMax} aria-valuenow={safeCurrent}>
          <span style={{ width: `${width}%`, background: colors.fill }} />
        </div>
        {onExpand && <button type="button" className="mt-2 min-h-11 w-full text-left text-sm font-bold text-ember hover:text-bone" onClick={onExpand}>Ajustar atual e máximo</button>}
      </section>
    );
  }

  return (
    <section className="pane p-3" data-testid={`resource-${type}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-xl text-bone">{label}</h3>
        <SaveState status={status} />
      </div>
      <div className="gauge mt-2" role="progressbar" aria-label={`${label}: ${safeCurrent} de ${safeMax}`} aria-valuemin="0" aria-valuemax={safeMax} aria-valuenow={safeCurrent}>
        <span style={{ width: `${width}%`, background: colors.fill }} />
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
      {status === 'Atual ajustado' && <p className="mt-2 text-xs text-bone">O valor atual foi ajustado para respeitar o novo máximo.</p>}
      {status === 'Erro ao salvar' && (
        <button type="button" className="mt-2 inline-flex min-h-11 items-center gap-2 border-[3px] border-lead px-3 text-xs font-semibold text-bone hover:bg-blood" onClick={onRetry}>
          <RotateCcw size={14} /> Tentar novamente
        </button>
      )}
    </section>
  );
}
