import { useState } from 'react';
import { Backpack, Lock, Map as MapIcon, Weight, X } from 'lucide-react';
import ItemIcon from '../icons/ItemIcon';
import { formatKg, itemLoad, unitWeight } from '../../lib/itemWeight';

// Barra de itens embaixo da tela: um quadrado por vaga da mochila (limite do mestre, padrao 9),
// teclas 1-9 escolhem, a carga aparece logo abaixo. Mochilas abrem o que tem dentro.

function ItemDetails({ item, onOpenMap, onClose }) {
  const [inside, setInside] = useState(null);
  const contents = Array.isArray(item.contents) ? item.contents : [];
  const shown = inside || item;
  return (
    <div className="game-wood pointer-events-auto w-[min(22rem,calc(100vw-1rem))] p-2.5" role="region" aria-label={`Item: ${item.name}`}>
      <div className="flex items-start gap-2.5">
        <span className="game-inset grid h-14 w-14 shrink-0 place-items-center"><ItemIcon item={shown} size={48} /></span>
        <div className="min-w-0 flex-1">
          <p className="game-title truncate text-xl leading-tight">{shown.name}</p>
          <p className="text-xs text-[#e8c98e]">
            {shown.category ? `${shown.category} · ` : ''}{Number(shown.quantity ?? 1) > 1 ? `${shown.quantity}× · ` : ''}
            {formatKg(unitWeight(shown))} cada{itemLoad(shown) !== unitWeight(shown) ? ` · total ${formatKg(itemLoad(shown))}` : ''}
          </p>
        </div>
        <button type="button" className="grid h-7 w-7 place-items-center text-[#ffe2a6] hover:text-white" onClick={inside ? () => setInside(null) : onClose} aria-label={inside ? 'Voltar' : 'Fechar item'}><X size={16} /></button>
      </div>
      {shown.description && <p className="game-parchment mt-2 max-h-28 overflow-y-auto px-2 py-1.5 text-sm leading-snug">{shown.description}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {shown.mapSceneId && (
          <button type="button" className="btn btn-lit !min-h-9 !px-3 text-sm" onClick={() => onOpenMap(shown)}><MapIcon size={15} /> Abrir mapa</button>
        )}
      </div>
      {!inside && contents.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#e8c98e]"><Backpack size={13} /> Dentro ({contents.length})</p>
          <div className="flex flex-wrap gap-1">
            {contents.map((c, i) => (
              <button key={c.id || i} type="button" className="game-slot" title={`${c.name} · ${formatKg(itemLoad(c))}`} onClick={() => setInside(c)} aria-label={`${c.name}, abrir`}>
                <ItemIcon item={c} size={32} />
                {Number(c.quantity ?? 1) > 1 && <span className="game-qty tabular">{c.quantity}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Hotbar({ inventory, summary, selected, onSelect, onOpenMap }) {
  const [hover, setHover] = useState(null);
  const list = Array.isArray(inventory) ? inventory : [];
  const slots = Math.max(summary.maxItems, list.length);
  const item = selected != null ? list[selected] : null;
  const pct = summary.maxWeight > 0 ? Math.min(100, (summary.weight / summary.maxWeight) * 100) : 0;
  const tone = summary.level.key === 'over' || summary.level.key === 'full' ? '#d8443f' : summary.level.key === 'heavy' ? '#e0a63a' : '#7fb35a';

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex flex-col items-center gap-2 px-1 sm:bottom-3">
      {item && <ItemDetails key={item.id || selected} item={item} onOpenMap={onOpenMap} onClose={() => onSelect(null)} />}
      <div className="game-wood pointer-events-auto max-w-full px-1.5 pb-1 pt-1.5 sm:px-2">
        <div className="flex gap-[3px] overflow-x-auto sm:gap-1" role="toolbar" aria-label="Itens (teclas 1 a 9)">
          {Array.from({ length: slots }, (_, i) => {
            const it = list[i];
            const locked = i >= summary.maxItems;
            return (
              <div key={it?.id || `vazio-${i}`} className="relative">
                <button
                  type="button"
                  className={`game-slot ${selected === i && it ? 'is-selected' : ''} ${locked && !it ? 'is-locked' : ''}`}
                  onClick={() => it && onSelect(selected === i ? null : i)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover((h) => (h === i ? null : h))}
                  aria-label={it ? `${i + 1}: ${it.name}${Number(it.quantity ?? 1) > 1 ? `, ${it.quantity} unidades` : ''}` : `${i + 1}: vazio`}
                  aria-pressed={selected === i && Boolean(it)}
                  disabled={!it}
                >
                  {i < 9 && <span className="game-num">{i + 1}</span>}
                  {it ? <ItemIcon item={it} size={32} title="" /> : locked ? <Lock size={12} className="text-[#5a3a22]" aria-hidden="true" /> : null}
                  {it && Number(it.quantity ?? 1) > 1 && <span className="game-qty tabular">{it.quantity}</span>}
                  {it?.mapSceneId && <MapIcon size={11} className="absolute right-0.5 top-0.5 text-[#ffd27a]" aria-hidden="true" />}
                  {it?.contents?.length > 0 && <Backpack size={11} className="absolute right-0.5 top-0.5 text-[#ffd27a]" aria-hidden="true" />}
                </button>
                {hover === i && it && selected !== i && (
                  <div className="game-parchment pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-52 -translate-x-1/2 px-2 py-1.5 text-left text-xs sm:block" role="tooltip">
                    <p className="font-bold leading-tight">{it.name}{Number(it.quantity ?? 1) > 1 ? ` ×${it.quantity}` : ''}</p>
                    <p className="text-[#6a4423]">{formatKg(itemLoad(it))}{it.contents?.length ? ` · ${it.contents.length} dentro` : ''}</p>
                    {it.description && <p className="mt-0.5 line-clamp-3 leading-snug">{it.description}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex items-center gap-2 px-0.5 text-[11px] font-bold text-[#f6e6c4]" title={`Velocidade: ${Math.round(summary.speed * 100)}%`}>
          <Weight size={12} className="shrink-0 text-[#e8c98e]" aria-hidden="true" />
          <div className="game-bar h-2.5 flex-1" style={{ '--fill': tone }} role="meter" aria-label="Peso carregado" aria-valuemin={0} aria-valuemax={summary.maxWeight} aria-valuenow={summary.weight}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <span className="tabular shrink-0">{formatKg(summary.weight)}<span className="text-[#c9a979]"> / {formatKg(summary.maxWeight)}</span></span>
          <span className="hidden shrink-0 sm:inline" style={{ color: tone }}>{summary.level.label}</span>
        </div>
      </div>
    </div>
  );
}
