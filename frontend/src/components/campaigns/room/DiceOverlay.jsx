import { useEffect, useRef, useState } from 'react';
import GlassD20 from '../../glass/GlassD20';

// Rolagem em cena: todo mundo ve o d20 de vidro girar no centro da mesa e assentar no resultado.
export default function DiceOverlay({ roll, onDone }) {
  const [rolling, setRolling] = useState(true);
  const timers = useRef([]);

  useEffect(() => {
    if (!roll) return undefined;
    setRolling(true);
    timers.current.forEach(clearTimeout);
    timers.current = [
      setTimeout(() => setRolling(false), 950),
      setTimeout(() => onDone?.(), 3600)
    ];
    return () => timers.current.forEach(clearTimeout);
  }, [roll, onDone]);

  if (!roll) return null;
  const first = roll.dice?.[0];
  const sides = first?.sides || 20;
  const isD20 = sides === 20;
  const crit = isD20 && first?.value === 20;
  const fumble = isD20 && first?.value === 1;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center" aria-live="polite">
      <div className="dice-card flex flex-col items-center gap-3 border-[4px] border-lead bg-abyss/90 px-8 py-6 text-center shadow-[0_30px_80px_rgba(0,0,0,.8)]" style={{ '--tint': roll.color || 'var(--color-ember)' }}>
        <p className="font-display text-2xl text-bone">{roll.characterName || roll.userName}</p>
        <GlassD20 value={isD20 ? first?.value : roll.total} sides={isD20 ? 20 : sides} rolling={rolling} size={132} tint={roll.color || 'var(--color-ember)'} />
        <p className="text-mist">{roll.label}{roll.targetName ? <> → <span className="text-bone">{roll.targetName}</span></> : null}</p>
        {!rolling && (
          <p className="dice-total font-display text-5xl text-ember tabular">
            {roll.total}
            {crit && <span className="ml-3 align-middle text-2xl text-[#ffe9b8]">Crítico!</span>}
            {fumble && <span className="ml-3 align-middle text-2xl text-red-200">Falha</span>}
          </p>
        )}
        {!rolling && <p className="text-sm text-mist tabular">{roll.formula} · [{(roll.rolls || []).join(', ')}]{roll.bonus ? ` ${roll.bonus > 0 ? '+' : '−'} ${Math.abs(roll.bonus)}` : ''}</p>}
      </div>
    </div>
  );
}
