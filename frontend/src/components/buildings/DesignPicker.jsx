import { useMemo, useState } from 'react';
import BuildingSprite from './BuildingSprite';
import { CATEGORIES, DESIGNS } from '../../lib/buildings';

const SIZE_LABEL = { cabana: 'Pequenina', pequena: 'Pequena', media: 'Média', grande: 'Grande', casarao: 'Casarão', mansao: 'Mansão' };

// Galeria dos projetos prontos: filtra por categoria, tamanho e nome; clique escolhe.
export default function DesignPicker({ value, onChange }) {
  const [cat, setCat] = useState('Casas');
  const [size, setSize] = useState('');
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return DESIGNS.filter((d) => (term ? d.name.toLowerCase().includes(term) : d.category === cat) && (!size || d.size === size));
  }, [cat, size, q]);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" aria-pressed={cat === c && !q} onClick={() => { setCat(c); setQ(''); setSize(''); }}
            className={`rounded-md border-2 border-lead px-2 py-1 text-xs ${cat === c && !q ? 'lit' : 'bg-glass text-mist hover:text-bone'}`}>{c}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="field py-1 text-sm" placeholder="Buscar: padaria, torre, celeiro..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar construção" />
        {cat === 'Casas' && !q && (
          <select className="field w-32 py-1 text-sm" value={size} onChange={(e) => setSize(e.target.value)} aria-label="Tamanho">
            <option value="">Todos os tamanhos</option>
            {Object.entries(SIZE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        )}
      </div>
      <p className="text-xs text-mist">{list.length} construções. Depois de colocar, o mestre troca material, telhado e cores.</p>
      <ul className="grid max-h-[22rem] grid-cols-2 gap-2 overflow-y-auto pr-1">
        {list.map((d) => (
          <li key={d.id}>
            <button type="button" onClick={() => onChange(d.id)} aria-pressed={value === d.id} title={`${d.name} (${d.w}×${d.h})`}
              className={`flex h-full w-full flex-col items-center justify-end gap-1 rounded-md border-2 p-1 ${value === d.id ? 'border-ember bg-ember/15' : 'border-lead bg-glass hover:border-mist'}`}>
              <span className="grid h-20 w-full place-items-end justify-center overflow-hidden">
                <BuildingSprite building={{ id: d.id, design: d.id, x: 0, y: 0, w: d.w, h: d.h }} scale={Math.min(1, 120 / (d.w * 16 + 8))} />
              </span>
              <span className="text-center text-[11px] leading-tight text-bone">{d.name}</span>
              <span className="text-[10px] text-mist">{d.w}×{d.h} células</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
