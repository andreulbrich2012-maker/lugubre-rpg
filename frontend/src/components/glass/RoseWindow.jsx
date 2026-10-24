import { useEffect, useId, useRef } from 'react';
import { PRIMORDIAIS } from './primordiais';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// Rosacea dos Oito Primordiais. Cada lanceta e um Primordial dividido em pedacos de vidro
// (tons diferentes, textura de vidro catedral) presos por chumbo que sempre termina na borda.
// Os nomes ficam gravados no aro, como inscricao.
const C = 500;
const polar = (r, deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
const pt = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;

function lancet(deg) {
  const r0 = 178;
  const r1 = 448;
  const half = 17;
  const p0 = polar(r0, deg - half);
  const p1 = polar(r0, deg + half);
  const apex = polar(r1, deg);
  const c0 = polar(372, deg - 21);
  const c1 = polar(372, deg + 21);
  return `M${pt(p0)} Q${pt(c0)} ${pt(apex)} Q${pt(c1)} ${pt(p1)} A${r0},${r0} 0 0 0 ${pt(p0)}Z`;
}

function sector(r0, r1, a0, a1) {
  const [p0, p1, p2, p3] = [polar(r0, a0), polar(r1, a0), polar(r1, a1), polar(r0, a1)];
  return `M${pt(p0)} L${pt(p1)} A${r1},${r1} 0 0 1 ${pt(p2)} L${pt(p3)} A${r0},${r0} 0 0 0 ${pt(p0)}Z`;
}

// Pedacos de cada lanceta: dois lados x tres faixas, cortados pela propria lanceta (clipPath).
const BANDS = [[150, 262], [262, 352], [352, 470]];
const SHADE = [0.95, 0.62, 0.8, 0.48, 0.7, 0.88];
function pieces(deg) {
  const out = [];
  [-1, 1].forEach((side) => {
    BANDS.forEach(([ra, rb]) => {
      const pts = [polar(ra, deg), polar(rb, deg), polar(rb, deg + side * 34), polar(ra, deg + side * 34)];
      out.push(`M${pts.map(pt).join(' L')}Z`);
    });
  });
  return out;
}
function cames(deg) {
  const a = polar(160, deg);
  const b = polar(470, deg);
  const arc = (r) => { const s = polar(r, deg - 34); const e = polar(r, deg + 34); return `M${pt(s)} A${r},${r} 0 0 1 ${pt(e)}`; };
  return `M${pt(a)} L${pt(b)} ${arc(262)} ${arc(352)}`;
}

export const PETALS = PRIMORDIAIS.map((p, i) => ({ ...p, deg: i * 45, d: lancet(i * 45), pieces: pieces(i * 45), cames: cames(i * 45) }));
const TREFOILS = PRIMORDIAIS.map((_, i) => polar(408, i * 45 + 22.5));
const BEADS = PRIMORDIAIS.map((_, i) => polar(262, i * 45 + 22.5));
const OCULUS = Array.from({ length: 16 }, (_, i) => sector(124, 172, i * 22.5, (i + 1) * 22.5));
const RIM = Array.from({ length: 8 }, (_, i) => sector(456, 494, i * 45 - 22.5, i * 45 + 22.5));
const RIM_TEXT = (() => { const s = polar(465, -22.5); const e = polar(465, -22.6); return `M${pt(s)} A465,465 0 1 1 ${pt(e)}`; })();
// Caminho ao contrario para os nomes da metade de baixo ficarem em pe.
const RIM_TEXT_REV = (() => { const s = polar(486, 0); const e = polar(486, 0.1); return `M${pt(s)} A486,486 0 1 0 ${pt(e)}`; })();
const upright = (deg) => deg > 90 && deg < 270;

export default function RoseWindow({ active, onActive, onSelect, className = '', children }) {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef(null);
  const torchRef = useRef(null);
  const pointerRef = useRef({ inside: false, x: C, y: 160 });
  const reduced = useReducedMotion();

  // A luz segue o cursor; parado, ela orbita devagar como o sol atravessando o vitral.
  useEffect(() => {
    const torch = torchRef.current;
    if (!torch) return undefined;
    if (reduced) {
      torch.setAttribute('cx', 360);
      torch.setAttribute('cy', 260);
      return undefined;
    }
    let frame;
    let x = 360;
    let y = 260;
    const start = performance.now();
    const tick = (now) => {
      const t = (now - start) / 1000 + 3.6;
      const target = pointerRef.current.inside
        ? pointerRef.current
        : { x: C + Math.cos(t * 0.21) * 280, y: C + Math.sin(t * 0.21) * 280 };
      x += (target.x - x) * 0.08;
      y += (target.y - y) * 0.08;
      torch.setAttribute('cx', x.toFixed(1));
      torch.setAttribute('cy', y.toFixed(1));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  function onPointerMove(event) {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    pointerRef.current = { inside: true, x: p.x, y: p.y };
  }

  const glassShapes = (
    <>
      {PETALS.map((p) => <path key={p.slug} d={p.d} />)}
      {TREFOILS.map(([x, y], i) => <circle key={`t${i}`} cx={x} cy={y} r="40" />)}
      {BEADS.map(([x, y], i) => <circle key={`b${i}`} cx={x} cy={y} r="24" />)}
      {OCULUS.map((d, i) => <path key={`o${i}`} d={d} />)}
      <circle cx={C} cy={C} r="124" />
    </>
  );

  return (
    <div className={`rose relative aspect-square ${reduced ? '' : 'rose-enter'} ${className}`}>
      <svg
        ref={svgRef}
        viewBox="0 0 1000 1000"
        className="h-full w-full"
        onPointerMove={onPointerMove}
        onPointerLeave={() => { pointerRef.current.inside = false; }}
        role="group"
        aria-label="Rosácea dos Oito Primordiais"
      >
        <defs>
          {PETALS.map((p) => <clipPath key={p.slug} id={`${uid}-c-${p.slug}`}><path d={p.d} /></clipPath>)}
          <radialGradient id={`${uid}-torch`} ref={torchRef} gradientUnits="userSpaceOnUse" cx="360" cy="260" r="330">
            <stop offset="0" stopColor="#fff1cf" stopOpacity=".9" />
            <stop offset=".3" stopColor="#ffd98a" stopOpacity=".38" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${uid}-glass`}>{glassShapes}</clipPath>
          <path id={`${uid}-rimtext`} d={RIM_TEXT} />
          <path id={`${uid}-rimrev`} d={RIM_TEXT_REV} />
          {/* Vidro catedral: estrias + sementes de ar multiplicadas no vidro, e bordas levemente tortas. */}
          <filter id={`${uid}-glassfx`} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency=".006 .05" numOctaves="3" seed="4" result="streak" />
            <feTurbulence type="fractalNoise" baseFrequency=".11" numOctaves="2" seed="11" result="seed" />
            <feComposite in="streak" in2="seed" operator="arithmetic" k1="0" k2=".7" k3=".5" k4="-.08" result="mix" />
            <feColorMatrix in="mix" type="saturate" values="0" result="gray" />
            <feComposite in="SourceGraphic" in2="gray" operator="arithmetic" k1="1.55" k2=".25" k3="0" k4="0" result="lit" />
            <feComposite in="lit" in2="SourceGraphic" operator="in" result="glass" />
            <feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="1" seed="7" result="warp" />
            <feDisplacementMap in="glass" in2="warp" scale="5" />
          </filter>
        </defs>

        <circle cx={C} cy={C} r="497" fill="#030204" />

        {/* Vidro de apoio: trevos, contas, oculo e aro. */}
        <g className="rose-panes" filter={`url(#${uid}-glassfx)`}>
          {TREFOILS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="40" fill={PETALS[(i + 3) % 8].hex} fillOpacity=".5" />)}
          {BEADS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="24" fill="#a4781a" fillOpacity=".45" />)}
          {OCULUS.map((d, i) => <path key={i} d={d} fill={i % 2 ? '#1c3e9e' : '#7a1630'} fillOpacity=".45" />)}
          {RIM.map((d, i) => <path key={i} d={d} fill="#110d16" />)}
          <circle cx={C} cy={C} r="124" fill="#0b0910" />
        </g>

        {/* As oito lancetas, cada uma em seis pedacos de tons diferentes. */}
        {PETALS.map((p, i) => (
          <g key={p.slug} clipPath={`url(#${uid}-c-${p.slug})`} className={`rose-petal ${active === i ? 'is-lit' : ''}`} style={{ '--i': i }}>
            <g filter={`url(#${uid}-glassfx)`}>
              {p.pieces.map((d, k) => <path key={k} d={d} fill={p.hex} fillOpacity={SHADE[(k + i) % SHADE.length]} />)}
            </g>
            <path d={p.cames} fill="none" stroke="#020203" strokeWidth="6" />
          </g>
        ))}

        {/* Luz atravessando o vidro (nunca o chumbo). */}
        <g clipPath={`url(#${uid}-glass)`} style={{ mixBlendMode: 'screen' }} pointerEvents="none">
          <rect width="1000" height="1000" fill={`url(#${uid}-torch)`} />
        </g>

        {/* Chumbo principal, por cima de tudo. */}
        <g className="rose-lead" fill="none" stroke="#020203" strokeLinejoin="round" pointerEvents="none">
          <g strokeWidth="11">{PETALS.map((p) => <path key={p.slug} d={p.d} pathLength="1" />)}</g>
          <g strokeWidth="7">
            {TREFOILS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="40" pathLength="1" />)}
            {TREFOILS.map(([x, y], i) => <circle key={`f${i}`} cx={x} cy={y} r="17" strokeWidth="5" pathLength="1" />)}
            {BEADS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="24" pathLength="1" />)}
            {OCULUS.map((d, i) => <path key={i} d={d} pathLength="1" />)}
            {RIM.map((d, i) => <path key={i} d={d} pathLength="1" />)}
          </g>
          <circle cx={C} cy={C} r="124" strokeWidth="12" pathLength="1" />
          <circle cx={C} cy={C} r="496" strokeWidth="8" pathLength="1" />
        </g>

        {/* Nomes gravados no aro. */}
        <text className="rose-names font-display" fontSize="28" letterSpacing="3" pointerEvents="none">
          {PETALS.map((p, i) => {
            const rev = upright(p.deg);
            const offset = rev ? ((360 - p.deg) % 360) / 360 : (p.deg + 22.5) / 360;
            return (
              <textPath key={p.slug} href={`#${uid}-${rev ? 'rimrev' : 'rimtext'}`} startOffset={`${offset * 100}%`} textAnchor="middle" fillOpacity={active === i ? 1 : 0.8} fill={active === i ? '#ffe1a0' : '#d8ccb4'}>
                {p.name}
              </textPath>
            );
          })}
        </text>

        {/* Alvos de foco e clique por cima, invisiveis. */}
        {PETALS.map((p, i) => (
          <a
            key={p.slug}
            href={`/regras/${p.slug}`}
            aria-label={`${p.name}: ${p.domain}`}
            onMouseEnter={() => onActive?.(i)}
            onFocus={() => onActive?.(i)}
            onClick={(event) => {
              if (!onSelect) return;
              event.preventDefault();
              onSelect(p);
            }}
            className="rose-hit"
          >
            <path d={p.d} fill="transparent" />
          </a>
        ))}
      </svg>
      {children && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex w-[26%] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}
