// Trinca de vidro desenhada por cima de um token ou painel que tomou dano.
export default function Crack({ on, seed = 0 }) {
  const r = (n) => ((Math.sin(seed * 97 + n * 13.7) + 1) / 2);
  const cx = 40 + r(1) * 20;
  const cy = 40 + r(2) * 20;
  const rays = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + r(i) * 0.6;
    const len = 30 + r(i + 9) * 25;
    const mx = cx + Math.cos(a + 0.2) * len * 0.5;
    const my = cy + Math.sin(a + 0.2) * len * 0.5;
    return `M${cx},${cy} L${mx.toFixed(1)},${my.toFixed(1)} L${(cx + Math.cos(a) * len).toFixed(1)},${(cy + Math.sin(a) * len).toFixed(1)}`;
  });
  return (
    <svg viewBox="0 0 100 100" className={`crack ${on ? 'is-on' : ''}`} aria-hidden="true">
      <g fill="none" stroke="#f4ecd8" strokeOpacity=".85" strokeWidth="1.3" strokeLinecap="round">
        {rays.map((d) => <path key={d} d={d} />)}
        <circle cx={cx} cy={cy} r={6 + r(5) * 4} strokeOpacity=".5" />
      </g>
    </svg>
  );
}
