import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// d20 de vidro: rola girando, os numeros piscam e assenta no resultado. Critico (20) acende, falha (1) trinca.
const HEX = '50,4 90,27 90,73 50,96 10,73 10,27';
const FACETS = [
  '50,4 90,27 50,30', '50,4 10,27 50,30', '10,27 50,30 24,62', '90,27 50,30 76,62',
  '50,30 24,62 76,62', '10,27 10,73 24,62', '90,27 90,73 76,62', '24,62 76,62 50,96',
  '10,73 24,62 50,96', '90,73 76,62 50,96'
];

export default function GlassD20({ value, rolling, sides = 20, size = 120, tint = 'var(--color-ember)', label, onClick, disabled }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value ?? sides);
  const timer = useRef(null);

  useEffect(() => {
    clearInterval(timer.current);
    if (rolling && !reduced) {
      timer.current = setInterval(() => setShown(1 + Math.floor(Math.random() * sides)), 55);
    } else if (value != null) {
      setShown(value);
    }
    return () => clearInterval(timer.current);
  }, [rolling, value, sides, reduced]);

  const crit = !rolling && value === sides && sides === 20;
  const fumble = !rolling && value === 1 && sides === 20;
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-label={label || `d${sides}: ${shown}`}
      className={`d20 relative inline-grid place-items-center ${rolling ? 'is-rolling' : ''} ${crit ? 'is-crit' : ''} ${fumble ? 'is-fumble' : ''}`}
      style={{ width: size, height: size, '--tint': tint }}
    >
      <svg viewBox="0 0 100 100" className="d20-body absolute inset-0 h-full w-full" aria-hidden="true">
        <polygon points={HEX} fill="var(--tint)" fillOpacity=".22" />
        {FACETS.map((f, i) => (
          <polygon key={f} points={f} fill="var(--tint)" fillOpacity={[0.5, 0.18, 0.3, 0.42, 0.62, 0.12, 0.26, 0.36, 0.2, 0.3][i]} />
        ))}
        <g fill="none" stroke="#020203" strokeWidth="3" strokeLinejoin="round">
          <polygon points={HEX} />
          {FACETS.map((f) => <polygon key={f} points={f} strokeWidth="1.6" />)}
        </g>
        {fumble && <path d="M50 30 L44 46 L55 52 L47 70 M55 52 L68 58" stroke="#020203" strokeWidth="2.2" fill="none" />}
      </svg>
      <span className="d20-face relative mt-[14%] font-display tabular leading-none text-white" style={{ fontSize: size * 0.27 }}>{shown}</span>
    </Tag>
  );
}
