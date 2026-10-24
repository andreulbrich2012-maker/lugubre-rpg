import { useEffect, useRef, useState } from 'react';
import { Brain, Droplet, Heart } from 'lucide-react';

// Vida, mana e sanidade do personagem (so leitura: quem mexe e o mestre).
export const VITALS = [
  { key: 'life', label: 'Vida', short: 'Vida', fill: 'linear-gradient(90deg, #8e1a32, #d8443f)', Icon: Heart, color: '#ff8a7a' },
  { key: 'mana', label: 'Mana', short: 'Mana', fill: 'linear-gradient(90deg, #1c3e9e, #4f8de0)', Icon: Droplet, color: '#9cc4ff' },
  { key: 'sanity', label: 'Sanidade', short: 'San', fill: 'linear-gradient(90deg, #2a5f66, #5fc0b8)', Icon: Brain, color: '#9fe6dc' }
];

export function vital(sheet, key) {
  const cur = sheet?.[`${key}_current`] ?? (key === 'mana' ? sheet?.mana : 0);
  return { current: Number(cur ?? 0), max: Number(sheet?.[`${key}_max`] ?? 0) };
}

// Uma barra: pisca quando o valor cai (o mestre tirou).
export function GameBar({ meta, current, max, compact }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const prev = useRef(current);
  const [hit, setHit] = useState(false);
  useEffect(() => {
    const dropped = current < prev.current;
    prev.current = current;
    if (!dropped) return undefined;
    setHit(true);
    const t = setTimeout(() => setHit(false), 600);
    return () => clearTimeout(t);
  }, [current]);
  const { Icon } = meta;
  return (
    <div className="flex items-center gap-1.5" role="meter" aria-label={meta.label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={current} aria-valuetext={`${current} de ${max}`}>
      <Icon size={compact ? 13 : 15} style={{ color: meta.color }} className="shrink-0 drop-shadow-[0_1px_0_#000]" aria-hidden="true" />
      <div className={`game-bar flex-1 ${hit ? 'is-hit' : ''}`} style={{ '--fill': meta.fill }}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <span className={`tabular shrink-0 text-right font-bold text-[#fff1d0] drop-shadow-[0_1px_0_#000] ${compact ? 'w-12 text-[11px]' : 'w-14 text-xs'}`}>
        {current}<span className="text-[#c9a979]">/{max}</span>
      </span>
    </div>
  );
}

export default function GameBars({ sheet, compact }) {
  return (
    <div className="space-y-1">
      {VITALS.map((m) => <GameBar key={m.key} meta={m} compact={compact} {...vital(sheet, m.key)} />)}
    </div>
  );
}
