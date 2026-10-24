import { useEffect, useRef, useState } from 'react';
import { Dices, Minus, Plus } from 'lucide-react';
import { DICE_SIDES, diceFormula } from '../../lib/load';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// Rolador de dados do jogador: quantos dados, qual dado e o bonus. "Girar" sacode os dados em
// pixel art enquanto o servidor rola de verdade; o resultado vai pela rota de rolagens da mesa,
// entao o mestre ve e fica no chat.
const MIN_SPIN = 1100;

function Stepper({ label, value, onChange, min, max, sign }) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#e8c98e]">{label}</p>
      <div className="flex items-stretch">
        <button type="button" className="btn btn-glass !min-h-10 !w-10 !p-0" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Diminuir ${label.toLowerCase()}`}><Minus size={15} /></button>
        <input
          className="field !mt-0 !min-h-10 !w-16 text-center tabular"
          inputMode="numeric"
          aria-label={label}
          value={sign && value > 0 ? `+${value}` : String(value)}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/[^\d-]/g, ''), 10);
            onChange(Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : 0);
          }}
        />
        <button type="button" className="btn btn-glass !min-h-10 !w-10 !p-0" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Aumentar ${label.toLowerCase()}`}><Plus size={15} /></button>
      </div>
    </div>
  );
}

export default function DicePanel({ sheet, onRoll, busy }) {
  const reduced = useReducedMotion();
  const [qty, setQty] = useState(1);
  const [sides, setSides] = useState(20);
  const [bonus, setBonus] = useState(0);
  const [label, setLabel] = useState('');
  const [phase, setPhase] = useState('idle');
  const [faces, setFaces] = useState([]);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const spin = useRef(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; clearInterval(spin.current); }, []);

  const formula = diceFormula(qty, sides, bonus);

  async function girar() {
    if (phase === 'rolling') return;
    const n = qty; const s = sides;
    setResult(null);
    setPhase('rolling');
    const shake = () => setFaces(Array.from({ length: n }, () => 1 + Math.floor(Math.random() * s)));
    shake();
    clearInterval(spin.current);
    if (!reduced) spin.current = setInterval(shake, 75);
    const started = Date.now();
    const data = await onRoll({ kind: 'free', formula, label: label.trim() || `Dados: ${formula}`, characterId: sheet?.id });
    const wait = Math.max(0, MIN_SPIN - (Date.now() - started));
    setTimeout(() => {
      if (!alive.current) return;
      clearInterval(spin.current);
      if (!data) { setPhase('idle'); setFaces([]); return; }
      setFaces(data.rolls || []);
      setResult(data);
      setPhase('done');
      setHistory((h) => [{ id: data.rollId, label: data.label, formula: data.formula, total: data.total }, ...h].slice(0, 6));
    }, reduced ? 0 : wait);
  }

  const shownSides = phase === 'idle' ? sides : (result?.dice?.[0]?.sides || sides);

  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#e8c98e]">Dado</p>
      <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label="Qual dado">
        {DICE_SIDES.map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={sides === d}
            onClick={() => setSides(d)}
            className={`grid min-h-11 place-items-center border-2 text-sm font-black ${sides === d ? 'border-[#ffd27a] bg-gradient-to-b from-[#e7b765] to-[#b97a2e] text-[#2a1608] shadow-[0_0_14px_rgb(var(--light)/.5)]' : 'border-[#1c0e06] bg-[#2a1a10] text-[#ffe2a6] hover:brightness-125'}`}
          >
            d{d}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <Stepper label="Quantidade" value={qty} onChange={setQty} min={1} max={20} />
        <Stepper label="Bônus" value={bonus} onChange={setBonus} min={-99} max={99} sign />
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-bold uppercase tracking-wider text-[#e8c98e]">Motivo (opcional)</span>
        <input className="field" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: abrir a fechadura" />
      </label>

      <div className="game-inset relative mt-3 grid min-h-[9.5rem] place-items-center overflow-hidden px-2 py-3" aria-live="polite">
        {phase === 'idle' ? (
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="game-die is-settled" data-sides={sides}>{sides === 100 ? '%' : sides}</span>
            <p className="mt-1 text-sm text-[#c9a979]">{formula}</p>
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-2">
            <div className="flex max-w-full flex-wrap justify-center gap-1.5">
              {faces.map((v, i) => (
                <span
                  key={`${phase}-${i}`}
                  data-sides={shownSides}
                  className={`game-die ${phase === 'rolling' ? 'is-rolling' : 'is-settled'} ${phase === 'done' && v === shownSides ? 'is-max' : ''} ${phase === 'done' && v === 1 ? 'is-min' : ''}`}
                  style={phase === 'rolling' ? { animationDelay: `${(i % 5) * -70}ms` } : { animationDelay: `${Math.min(i, 10) * 45}ms` }}
                >
                  {v}
                </span>
              ))}
            </div>
            {phase === 'done' && result && (
              <div className="game-total text-center">
                <p className="game-title text-5xl leading-none tabular">{result.total}</p>
                <p className="text-xs text-[#c9a979] tabular">{result.formula} · [{(result.rolls || []).join(', ')}]{result.bonus ? ` ${result.bonus > 0 ? '+' : '−'} ${Math.abs(result.bonus)}` : ''}</p>
                <p className="text-[11px] font-bold text-[#7fb35a]">Enviado ao mestre</p>
              </div>
            )}
            {phase === 'rolling' && <p className="text-sm font-bold text-[#ffe2a6]">Girando…</p>}
          </div>
        )}
      </div>

      <button type="button" className="btn btn-lit mt-3 w-full text-lg" onClick={girar} disabled={phase === 'rolling' || busy}>
        <Dices size={20} /> Girar {formula}
      </button>

      {history.length > 0 && (
        <div className="mt-3">
          <span className="game-ribbon">Últimas rolagens</span>
          <ul className="mt-1.5 space-y-1">
            {history.map((h) => (
              <li key={h.id} className="game-inset flex items-center gap-2 px-2 py-1 text-sm">
                <span className="min-w-0 flex-1 truncate text-[#e8c98e]">{h.label}</span>
                <span className="tabular text-xs text-[#c9a979]">{h.formula}</span>
                <b className="tabular w-10 text-right text-[#fff1d0]">{h.total}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
