import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { useMapSnapshot } from '../../lib/tiles/useMapSnapshot';

// Mapa completo da cena (mapa-item): uma "foto" do lugar numa moldura de pergaminho, so o lado
// de fora, com os pontos principais numerados. Clicar num ponto abre um balao explicando o que e.
// A imagem e gerada uma vez (worker) e fica guardada no navegador; abrir de novo e instantaneo.
// Esc fecha.
export default function WorldMapOverlay({ name, sceneId, tiles: sceneTiles, onClose }) {
  // mapa desenhado: sempre de dia (a noite da cena deixaria ilegivel); o estilo da cena fica
  const tiles = useMemo(() => (sceneTiles ? { ...sceneTiles, light: 'dia' } : sceneTiles), [sceneTiles]);
  const box = useRef(null);
  const [fit, setFit] = useState(4);
  const [zoom, setZoom] = useState(1);
  const [active, setActive] = useState(null);
  const pois = useMemo(() => tiles?.pois || [], [tiles]);
  const snap = useMapSnapshot(sceneId || name, tiles);

  useEffect(() => {
    const el = box.current;
    if (!el || !tiles?.cols) return;
    const w = el.clientWidth - 48; const h = el.clientHeight - 48;
    setFit(Math.max(1, Math.floor(Math.min(w / tiles.cols, h / tiles.rows) * 10) / 10));
  }, [tiles]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (active) setActive(null); else onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, active]);

  const cell = Math.max(1, Math.round(fit * zoom * 10) / 10);
  if (!tiles?.cols) return null;
  const W = tiles.cols * cell; const H = tiles.rows * cell;
  const open = pois.find((p) => p.id === active);
  const openIndex = pois.findIndex((p) => p.id === active);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={`Mapa: ${name}`} onClick={onClose}>
      <div className="relative flex max-h-full max-w-full flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="absolute right-2 top-2 z-20 flex gap-1">
          <button type="button" className="btn btn-glass !min-h-9 !w-9 !p-0" onClick={() => setZoom((z) => Math.max(0.5, z / 1.4))} aria-label="Afastar"><Minus size={16} /></button>
          <button type="button" className="btn btn-glass !min-h-9 !w-9 !p-0" onClick={() => setZoom((z) => Math.min(8, z * 1.4))} aria-label="Aproximar"><Plus size={16} /></button>
          <button type="button" className="btn btn-glass !min-h-9 !w-9 !p-0" onClick={onClose} aria-label="Fechar mapa"><X size={18} /></button>
        </div>
        <div ref={box} className="worldmap-parchment overflow-auto" style={{ width: 'min(96vw, 1400px)', height: 'min(92vh, 1000px)' }} onClick={() => setActive(null)}>
          <div className="relative mx-auto my-6 w-max">
            <div className="worldmap-photo relative" style={{ width: W, height: H }}>
              {snap.url
                ? <img src={snap.url} alt={`Mapa de ${name}`} draggable={false} style={{ width: W, height: H, imageRendering: cell >= snap.cell ? 'pixelated' : 'auto', display: 'block' }} />
                : (
                  <div className="worldmap-loading absolute inset-0 grid place-items-center">
                    <div className="w-64 text-center">
                      <p className="font-display text-xl">{snap.error ? 'Não deu para desenhar o mapa.' : 'Desenhando o mapa…'}</p>
                      {!snap.error && <div className="mt-2 h-3 overflow-hidden rounded-sm border-2 border-[#6a4a2a] bg-[#e8d6ae]"><div className="h-full bg-[#6a4a2a] transition-[width]" style={{ width: `${Math.round((snap.progress || 0) * 100)}%` }} /></div>}
                    </div>
                  </div>
                )}
              <div className="worldmap-vignette pointer-events-none absolute inset-0" />
              <p className="worldmap-name pointer-events-none absolute bottom-3 left-3">{name}</p>
              {pois.map((p, i) => (
                <button key={p.id} type="button" onClick={(e) => { e.stopPropagation(); setActive(p.id === active ? null : p.id); }}
                  className={`worldmap-pin ${active === p.id ? 'is-active' : ''}`}
                  style={{ left: (p.x + 0.5) * cell, top: (p.y + 0.5) * cell }} aria-label={`${i + 1}. ${p.name}`} aria-expanded={active === p.id}>
                  {i + 1}
                </button>
              ))}
              {open && (
                <div className="worldmap-note" role="tooltip" onClick={(e) => e.stopPropagation()}
                  style={{ left: Math.min(W - 130, Math.max(130, (open.x + 0.5) * cell)), top: (open.y + 0.5) * cell + (open.y * cell > H * 0.6 ? -18 : 18), transform: `translate(-50%, ${open.y * cell > H * 0.6 ? '-100%' : '0'})` }}>
                  <p className="font-display text-lg leading-tight">{openIndex + 1}. {open.name}</p>
                  {open.note && <p className="mt-1 text-sm italic leading-snug">{open.note}</p>}
                </div>
              )}
              <svg className="pointer-events-none absolute bottom-3 right-3 h-16 w-16 opacity-85" viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="22" fill="none" stroke="#5a3e22" strokeWidth="1.5" />
                <path d="M32 4 L37 32 L32 60 L27 32 Z" fill="#5a3e22" />
                <path d="M4 32 L32 27 L60 32 L32 37 Z" fill="#8a6a3a" />
                <text x="32" y="12" textAnchor="middle" fontSize="9" fill="#f2e6c8" fontWeight="700">N</text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
