import { useMemo, useRef, useState } from 'react';
import { Check, Undo2, X } from 'lucide-react';
import TileMapCanvas from '../vtt/TileMapCanvas';

// Mini-mapa da cena para o mestre desenhar: retangulo (arrastar), poligono ou rota (clicar nos
// pontos) ou escolher uma construcao. Tudo em celulas do mapa.
// mode: 'rect' | 'poly' | 'route' | 'building'; onDone(result):
//   rect/building -> { type: 'rect', x, y, w, h }; poly -> { type: 'poly', points }; route -> { points }

export default function MapPicker({ scene, mode = 'rect', title, marks = [], areas = [], onDone, onClose }) {
  const tiles = scene?.map_kind === 'tiles' ? scene.tiles : null;
  const grid = scene?.grid_size || 70;
  const cols = tiles?.cols || Math.max(1, Math.round((scene?.width || grid * 24) / grid));
  const rows = tiles?.rows || Math.max(1, Math.round((scene?.height || grid * 16) / grid));
  const cell = Math.max(3, Math.min(24, Math.floor(Math.min(720 / cols, 480 / rows))));
  const W = cols * cell;
  const H = rows * cell;
  const [rect, setRect] = useState(null);
  const [points, setPoints] = useState([]);
  const drag = useRef(null);
  const buildings = useMemo(() => tiles?.buildings || [], [tiles]);

  const toCell = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(cols - 0.01, ((e.clientX - r.left) / r.width) * cols));
    const y = Math.max(0, Math.min(rows - 0.01, ((e.clientY - r.top) / r.height) * rows));
    return { x, y };
  };
  const down = (e) => {
    const p = toCell(e);
    if (mode === 'rect') { drag.current = p; setRect({ x: Math.floor(p.x), y: Math.floor(p.y), w: 1, h: 1 }); e.currentTarget.setPointerCapture(e.pointerId); return; }
    if (mode === 'building') {
      const b = buildings.find((d) => p.x >= d.x && p.x < d.x + d.w && p.y >= d.y - 1 && p.y < d.y + d.h + 2);
      // area da construcao + a frente dela (calcada): o NPC anda na porta, nao dentro da parede
      if (b) setRect({ x: b.x - 1, y: b.y + b.h, w: b.w + 2, h: 2, name: b.name });
      return;
    }
    setPoints((cur) => [...cur, [Math.floor(p.x) , Math.floor(p.y)]]);
  };
  const move = (e) => {
    if (!drag.current) return;
    const a = drag.current;
    const p = toCell(e);
    const x0 = Math.floor(Math.min(a.x, p.x)); const y0 = Math.floor(Math.min(a.y, p.y));
    setRect({ x: x0, y: y0, w: Math.floor(Math.max(a.x, p.x)) - x0 + 1, h: Math.floor(Math.max(a.y, p.y)) - y0 + 1 });
  };
  const up = () => { drag.current = null; };

  const ready = mode === 'rect' || mode === 'building' ? Boolean(rect) : points.length >= (mode === 'poly' ? 3 : 2);
  const done = () => {
    if (!ready) return;
    if (mode === 'rect' || mode === 'building') {
      const x = Math.max(0, rect.x); const y = Math.max(0, rect.y);
      onDone({ type: 'rect', x, y, w: Math.min(cols - x, rect.w), h: Math.min(rows - y, rect.h), name: rect.name });
    } else if (mode === 'poly') onDone({ type: 'poly', points });
    else onDone({ points });
  };
  const hint = { rect: 'Arraste para desenhar o retângulo.', poly: 'Clique nos cantos da área (3 ou mais).', route: 'Clique nos pontos da rota, em ordem.', building: 'Clique numa construção: o NPC anda na frente dela.' }[mode];
  const c = (v) => v * cell + cell / 2;

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-black/70 p-3" role="presentation">
      <section role="dialog" aria-modal="true" aria-label={title || 'Desenhar no mapa'} className="gothic-panel flex max-h-[94svh] max-w-[96vw] flex-col gap-2 border-[3px] border-lead p-3 text-bone">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-xl">{title || 'Desenhar no mapa'}</p>
            <p className="text-xs text-mist">{hint}</p>
          </div>
          <button type="button" className="btn btn-glass !min-h-8 !w-8 !p-0" onClick={onClose} aria-label="Fechar"><X size={15} /></button>
        </header>
        <div className="overflow-auto">
          <div className="relative" style={{ width: W, height: H }}>
            {tiles ? <TileMapCanvas map={tiles} cellSize={cell} className="absolute left-0 top-0" />
              : scene?.map_url ? <img src={scene.map_url} alt="" className="absolute inset-0 h-full w-full object-fill" draggable={false} />
                : <div className="absolute inset-0 bg-[#0e0c12]" />}
            <svg className="eco-picker-canvas absolute inset-0" width={W} height={H} onPointerDown={down} onPointerMove={move} onPointerUp={up} role="img" aria-label="Mapa para desenhar">
              {areas.map((a) => (
                <g key={a.id || `${a.x},${a.y}`}>
                  <rect x={a.x * cell} y={a.y * cell} width={a.w * cell} height={a.h * cell} fill="rgba(122,180,255,.15)" stroke="#8fb3ff" strokeDasharray="4 3" strokeWidth={2} />
                  <text x={a.x * cell + 3} y={a.y * cell + 12} fill="#cfe0ff" fontSize="11" fontWeight="700">{a.name} ×{a.mult}</text>
                </g>
              ))}
              {/* as casas 3D nao estao no mini-mapa: pegada + nome de cada construcao */}
              {buildings.map((b) => (
                <g key={b.id}>
                  <rect x={b.x * cell} y={b.y * cell} width={b.w * cell} height={b.h * cell} fill={mode === 'building' ? 'rgba(255,210,122,.3)' : 'rgba(60,40,30,.55)'} stroke={mode === 'building' ? '#ffd27a' : '#c9a979'} strokeWidth={1.5} />
                  {cell >= 6 && <text x={b.x * cell + 2} y={b.y * cell + 10} fill="#fff1d0" fontSize="9" fontWeight="700" style={{ paintOrder: 'stroke', stroke: '#1c0e06', strokeWidth: 2 }}>{b.name}</text>}
                </g>
              ))}
              {marks.map((m) => <circle key={m.id} cx={c(m.x)} cy={c(m.y)} r={Math.max(4, cell * 0.4)} fill="#e8b03a" stroke="#1c0e06" strokeWidth={2}><title>{m.name}</title></circle>)}
              {rect && <rect x={rect.x * cell} y={rect.y * cell} width={rect.w * cell} height={rect.h * cell} fill="rgba(255,210,122,.25)" stroke="#ffd27a" strokeWidth={2} />}
              {points.length > 0 && mode === 'poly' && <polygon points={points.map((p) => `${c(p[0])},${c(p[1])}`).join(' ')} fill="rgba(255,210,122,.25)" stroke="#ffd27a" strokeWidth={2} />}
              {points.length > 0 && mode === 'route' && <polyline points={points.map((p) => `${c(p[0])},${c(p[1])}`).join(' ')} fill="none" stroke="#ffd27a" strokeWidth={2.5} strokeDasharray="6 4" />}
              {(mode === 'poly' || mode === 'route') && points.map((p, i) => <g key={i}><circle cx={c(p[0])} cy={c(p[1])} r={5} fill="#ffd27a" stroke="#1c0e06" strokeWidth={2} /><text x={c(p[0]) + 6} y={c(p[1]) - 6} fill="#fff1d0" fontSize="11" fontWeight="800">{i + 1}</text></g>)}
            </svg>
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-end gap-2">
          {(mode === 'poly' || mode === 'route') && <button type="button" className="btn btn-glass !min-h-9 text-sm" onClick={() => setPoints((cur) => cur.slice(0, -1))} disabled={!points.length}><Undo2 size={15} /> Desfazer ponto</button>}
          <button type="button" className="btn btn-glass !min-h-9 text-sm" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-lit !min-h-9 text-sm" onClick={done} disabled={!ready}><Check size={15} /> Usar</button>
        </footer>
      </section>
    </div>
  );
}
