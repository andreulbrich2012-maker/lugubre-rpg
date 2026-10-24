import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check, ClipboardPaste, Copy, Eraser, Grid3x3, Hand, Loader2, PaintBucket, Paintbrush,
  Pipette, Redo2, Save, Sparkles, Square, Undo2, X, ZoomIn, ZoomOut
} from 'lucide-react';
import TileMapCanvas from './TileMapCanvas';
import { TILES, CATEGORIES, DEFAULT_GROUND, EMPTY_OBJECT, getTile } from '../../lib/tiles/catalog';
import { renderTilePreview } from '../../lib/tiles/render';
import {
  emptyMap, repairMap, resizeMap, setCell, floodFill, rectFill, getCell, MIN_SIZE, MAX_SIZE
} from '../../lib/tiles/format';
import { buildMapPrompt, catalogText, parseMapResponse } from '../../lib/tiles/aiPrompt';

const HISTORY = 50;
const ZOOMS = [16, 24, 32, 40, 48, 64];
const TOOLS = [
  { id: 'brush', label: 'Pincel', icon: Paintbrush },
  { id: 'bucket', label: 'Balde', icon: PaintBucket },
  { id: 'rect', label: 'Retângulo', icon: Square },
  { id: 'eraser', label: 'Borracha', icon: Eraser },
  { id: 'picker', label: 'Conta-gotas', icon: Pipette },
  { id: 'pan', label: 'Mover a vista', icon: Hand }
];
const LAYER_LABEL = { ground: 'Chão', objects: 'Objetos' };
const emptyFor = (layer) => (layer === 'ground' ? DEFAULT_GROUND : EMPTY_OBJECT);

// Celulas entre dois pontos (Bresenham): arrasto rapido nao deixa buracos no traco.
function line(x0, y0, x1, y1) {
  const out = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) return out;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function is503(err) {
  const status = err?.response?.status ?? err?.status;
  return status === 503 || status === 501 || status === 404;
}

function TileButton({ tile, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${tile.name} — código "${tile.code}"${tile.solid ? ' (bloqueia passagem)' : ''}`}
      aria-pressed={active}
      className={`flex min-w-0 items-center gap-2 rounded-md border-2 border-lead px-1.5 py-1 text-left text-xs ${active ? 'lit' : 'bg-glass text-mist hover:text-bone'}`}
    >
      <img src={renderTilePreview(tile.code, 32)} alt="" width={32} height={32} className="shrink-0 bg-abyss" style={{ imageRendering: 'pixelated' }} />
      <span className="min-w-0 flex-1 truncate">{tile.name}</span>
      <code className="shrink-0 rounded-sm bg-abyss px-1 font-mono text-[11px] text-ember">{tile.code === ' ' ? '␠' : tile.code}</code>
    </button>
  );
}

export default function TileMapEditor({ initialMap, onSave, onCancel, generate }) {
  const [map, setMap] = useState(() => (initialMap ? repairMap(initialMap).map : emptyMap(20, 14)));
  const mapRef = useRef(map);
  mapRef.current = map;
  const history = useRef({ past: [], future: [] });
  const [, bump] = useState(0);

  const [layer, setLayer] = useState('ground');
  const [tool, setTool] = useState('brush');
  const [selected, setSelected] = useState({ ground: '#', objects: 'T' });
  const [zoom, setZoom] = useState(32);
  const [showGrid, setShowGrid] = useState(false);
  const [size, setSize] = useState({ cols: map.cols, rows: map.rows });
  const [rect, setRect] = useState(null);
  const stroke = useRef(null);

  const [description, setDescription] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiInfo, setAiInfo] = useState(null);
  const [promptOpen, setPromptOpen] = useState(!generate);
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState('');
  const [importMsg, setImportMsg] = useState(null);

  const code = selected[layer];
  const prompt = useMemo(() => buildMapPrompt({ description, cols: size.cols, rows: size.rows }), [description, size]);
  const groups = useMemo(() => CATEGORIES
    .map((cat) => [cat, TILES.filter((t) => t.category === cat && t.layer === layer)])
    .filter(([, list]) => list.length), [layer]);

  // Guarda a versao anterior para o desfazer (so quando algo mudou de fato).
  const commit = useCallback((next, before = mapRef.current) => {
    if (next === before) return;
    const h = history.current;
    h.past = [...h.past, before].slice(-HISTORY);
    h.future = [];
    setMap(next);
    bump((n) => n + 1);
  }, []);

  const undo = useCallback(() => {
    const h = history.current;
    if (!h.past.length) return;
    h.future = [mapRef.current, ...h.future];
    const prev = h.past[h.past.length - 1];
    h.past = h.past.slice(0, -1);
    setMap(prev);
    setSize({ cols: prev.cols, rows: prev.rows });
    bump((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    const h = history.current;
    if (!h.future.length) return;
    h.past = [...h.past, mapRef.current];
    const [next, ...rest] = h.future;
    h.future = rest;
    setMap(next);
    setSize({ cols: next.cols, rows: next.rows });
    bump((n) => n + 1);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.target.closest?.('input, textarea, select')) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      else if (k === 'z') { e.preventDefault(); undo(); }
      else if (k === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const cellAt = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const m = mapRef.current;
    const x = Math.floor(((e.clientX - r.left) / r.width) * m.cols);
    const y = Math.floor(((e.clientY - r.top) / r.height) * m.rows);
    return [Math.min(m.cols - 1, Math.max(0, x)), Math.min(m.rows - 1, Math.max(0, y))];
  };

  const paintTo = (x, y) => {
    const s = stroke.current;
    const value = tool === 'eraser' ? emptyFor(layer) : code;
    let next = mapRef.current;
    for (const [cx, cy] of line(s.last[0], s.last[1], x, y)) next = setCell(next, layer, cx, cy, value);
    s.last = [x, y];
    if (next !== mapRef.current) { mapRef.current = next; setMap(next); }
  };

  const onPointerDown = (e) => {
    if (tool === 'pan' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const [x, y] = cellAt(e);
    if (tool === 'picker') {
      const obj = getCell(map, 'objects', x, y);
      // objeto por cima ganha; celula sem objeto pega o chao
      const pickLayer = getTile(obj) ? 'objects' : 'ground';
      setSelected((s) => ({ ...s, [pickLayer]: getCell(map, pickLayer, x, y) }));
      setLayer(pickLayer);
      setTool('brush');
      return;
    }
    if (tool === 'bucket') { commit(floodFill(map, layer, x, y, code)); return; }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    stroke.current = { before: map, last: [x, y] };
    if (tool === 'rect') setRect({ x0: x, y0: y, x1: x, y1: y });
    else paintTo(x, y);
  };

  const onPointerMove = (e) => {
    if (!stroke.current) return;
    const [x, y] = cellAt(e);
    if (tool === 'rect') setRect((r) => (r && (r.x1 !== x || r.y1 !== y) ? { ...r, x1: x, y1: y } : r));
    else paintTo(x, y);
  };

  const onPointerUp = () => {
    const s = stroke.current;
    if (!s) return;
    stroke.current = null;
    if (tool === 'rect' && rect) {
      commit(rectFill(s.before, layer, rect.x0, rect.y0, rect.x1, rect.y1, code), s.before);
      setRect(null);
    } else commit(mapRef.current, s.before);
  };

  const applySize = () => {
    const next = resizeMap(map, size.cols, size.rows);
    setSize({ cols: next.cols, rows: next.rows });
    commit(next);
  };

  const loadMap = (next) => {
    commit(next);
    setSize({ cols: next.cols, rows: next.rows });
  };

  const runAi = async () => {
    setAiError('');
    setAiInfo(null);
    if (!generate) { setPromptOpen(true); return; }
    if (!description.trim()) { setAiError('Descreva o mapa antes de gerar.'); return; }
    setAiBusy(true);
    try {
      const res = await generate({ description, cols: size.cols, rows: size.rows, catalog: catalogText() });
      const src = res?.tiles ?? res;
      const { map: next, warnings } = repairMap(src?.layers ? src : { layers: src }, { cols: size.cols, rows: size.rows });
      loadMap(next);
      setAiInfo({ name: res?.name || '', notes: res?.notes || '', warnings });
    } catch (err) {
      if (is503(err)) {
        setAiError('A IA do servidor não está disponível agora. Use o caminho manual: copie o prompt abaixo.');
        setPromptOpen(true);
      } else {
        setAiError(err?.response?.data?.error || err?.message || 'Não deu para gerar o mapa. Tente de novo.');
      }
    } finally {
      setAiBusy(false);
    }
  };

  const copyPrompt = async () => {
    setPromptOpen(true);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setAiError('O navegador bloqueou a cópia. Selecione o texto do prompt e copie à mão.');
    }
  };

  const importPasted = () => {
    const res = parseMapResponse(pasted, size.cols, size.rows);
    if (res.ok) {
      loadMap(res.map);
      setImportMsg({ ok: true, text: [res.name && `"${res.name}" importado.`, res.notes, ...res.warnings].filter(Boolean) });
    } else setImportMsg({ ok: false, text: res.warnings });
  };

  const rectBox = rect && {
    left: Math.min(rect.x0, rect.x1) * zoom,
    top: Math.min(rect.y0, rect.y1) * zoom,
    width: (Math.abs(rect.x1 - rect.x0) + 1) * zoom,
    height: (Math.abs(rect.y1 - rect.y0) + 1) * zoom
  };
  const h = history.current;

  return (
    <div className="flex flex-col gap-4 text-bone">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Area do mapa */}
        <section className="gothic-panel flex min-w-0 flex-col gap-3 rounded-md p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-md border-[3px] border-lead" role="group" aria-label="Camada">
              {['ground', 'objects'].map((l) => (
                <button key={l} type="button" onClick={() => setLayer(l)} aria-pressed={layer === l}
                  className={`px-3 py-1.5 text-sm font-bold ${layer === l ? 'lit' : 'bg-glass text-mist hover:text-bone'}`}>
                  {LAYER_LABEL[l]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Ferramentas">
              {TOOLS.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setTool(id)} title={label} aria-label={label} aria-pressed={tool === id}
                  className={`grid h-10 w-10 place-items-center rounded-md border-2 border-lead ${tool === id ? 'lit' : 'bg-glass text-mist hover:text-bone'}`}>
                  <Icon size={18} />
                </button>
              ))}
            </div>
            <div className="ml-auto flex flex-wrap gap-1">
              <button type="button" className="btn btn-glass h-10 min-h-0 px-2" onClick={undo} disabled={!h.past.length} title="Desfazer (Ctrl+Z)" aria-label="Desfazer"><Undo2 size={18} /></button>
              <button type="button" className="btn btn-glass h-10 min-h-0 px-2" onClick={redo} disabled={!h.future.length} title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer"><Redo2 size={18} /></button>
              <button type="button" className="btn btn-glass h-10 min-h-0 px-2" onClick={() => setZoom(ZOOMS[Math.max(0, ZOOMS.indexOf(zoom) - 1)])} disabled={zoom === ZOOMS[0]} title="Diminuir" aria-label="Diminuir zoom"><ZoomOut size={18} /></button>
              <button type="button" className="btn btn-glass h-10 min-h-0 px-2" onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + 1)])} disabled={zoom === ZOOMS[ZOOMS.length - 1]} title="Aumentar" aria-label="Aumentar zoom"><ZoomIn size={18} /></button>
              <button type="button" className={`btn h-10 min-h-0 px-2 ${showGrid ? 'btn-glass lit' : 'btn-glass'}`} onClick={() => setShowGrid((v) => !v)} aria-pressed={showGrid} title="Mostrar grade" aria-label="Mostrar grade"><Grid3x3 size={18} /></button>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-auto rounded-md border-[3px] border-lead bg-abyss">
            <div className="relative w-max">
              <TileMapCanvas
                map={map}
                cellSize={zoom}
                showGrid={showGrid}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{ touchAction: tool === 'pan' ? 'auto' : 'none', cursor: tool === 'pan' ? 'grab' : 'crosshair' }}
              />
              {rectBox && <div className="pointer-events-none absolute border-2 border-ember" style={{ ...rectBox, background: 'rgb(var(--light) / .2)' }} />}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2 text-sm text-mist">
            <label className="w-24">Colunas
              <input type="number" min={MIN_SIZE} max={MAX_SIZE} className="field py-1.5" value={size.cols}
                onChange={(e) => setSize((s) => ({ ...s, cols: e.target.value }))} />
            </label>
            <label className="w-24">Linhas
              <input type="number" min={MIN_SIZE} max={MAX_SIZE} className="field py-1.5" value={size.rows}
                onChange={(e) => setSize((s) => ({ ...s, rows: e.target.value }))} />
            </label>
            <button type="button" className="btn btn-glass" onClick={applySize}
              disabled={Number(size.cols) === map.cols && Number(size.rows) === map.rows}>Aplicar tamanho</button>
            <span className="ml-auto">
              {LAYER_LABEL[layer]} · {getTile(code)?.name || '—'} <code className="text-ember">{code}</code>
            </span>
          </div>
        </section>

        {/* Lateral: paleta e IA */}
        <aside className="flex min-w-0 flex-col gap-4">
          <section className="gothic-panel rounded-md p-3">
            <h3 className="font-display text-xl">Blocos de {LAYER_LABEL[layer].toLowerCase()}</h3>
            <div className="mt-2 max-h-[22rem] overflow-y-auto pr-1">
              {groups.map(([cat, list]) => (
                <div key={cat} className="mb-3">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-mist">{cat}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {list.map((t) => (
                      <TileButton key={t.code} tile={t} active={code === t.code}
                        onClick={() => { setSelected((s) => ({ ...s, [layer]: t.code })); if (tool === 'eraser' || tool === 'picker' || tool === 'pan') setTool('brush'); }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="gothic-panel flex flex-col gap-2 rounded-md p-3">
            <h3 className="font-display text-xl">Mapa com IA</h3>
            <label className="text-sm text-mist">Descreva o mapa
              <textarea className="field min-h-[5.5rem]" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Uma taverna com dois andares de mesas, lareira ao norte e porta ao sul cercada por floresta" />
            </label>
            <p className="text-xs text-mist">Tamanho: {size.cols}×{size.rows}. O mapa atual será substituído (dá para desfazer).</p>
            <div className="flex flex-wrap gap-2">
              {generate && (
                <button type="button" className="btn btn-lit" onClick={runAi} disabled={aiBusy}>
                  {aiBusy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {aiBusy ? 'Gerando…' : 'Gerar com IA'}
                </button>
              )}
              <button type="button" className="btn btn-glass" onClick={copyPrompt}>
                {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Copiado!' : 'Copiar prompt'}
              </button>
            </div>
            {aiError && <p role="alert" className="text-sm text-ember">{aiError}</p>}
            {aiInfo && (
              <div className="text-sm text-mist">
                {aiInfo.name && <p className="text-bone">{aiInfo.name}</p>}
                {aiInfo.notes && <p>{aiInfo.notes}</p>}
                {aiInfo.warnings.map((w) => <p key={w} className="text-ember">{w}</p>)}
              </div>
            )}

            <details open={promptOpen} onToggle={(e) => setPromptOpen(e.currentTarget.open)} className="rounded-md border-2 border-lead bg-glass p-2">
              <summary className="cursor-pointer text-sm font-bold text-bone">Usar outra IA (copiar e colar)</summary>
              <p className="mt-2 text-sm text-mist">
                Como funciona: cole este texto no ChatGPT/Claude/Gemini, copie a resposta e cole abaixo.
              </p>
              <textarea readOnly className="field mt-2 h-40 font-mono text-[11px]" value={prompt} onFocus={(e) => e.target.select()} />
              <label className="mt-2 block text-sm text-mist">Colar resultado da IA
                <textarea className="field h-28 font-mono text-[11px]" value={pasted} onChange={(e) => setPasted(e.target.value)}
                  placeholder='{"name": "...", "layers": {"ground": [...], "objects": [...]}}' />
              </label>
              <button type="button" className="btn btn-glass mt-2" onClick={importPasted} disabled={!pasted.trim()}>
                <ClipboardPaste size={18} /> Importar
              </button>
              {importMsg && (
                <div role="status" className={`mt-2 text-sm ${importMsg.ok ? 'text-mist' : 'text-ember'}`}>
                  {importMsg.text.map((t) => <p key={t}>{t}</p>)}
                </div>
              )}
            </details>
          </section>
        </aside>
      </div>

      <details className="gothic-panel rounded-md p-3">
        <summary className="cursor-pointer font-display text-xl">Códigos dos blocos</summary>
        <div className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((t) => (
            <div key={t.code} className="flex items-center gap-2 text-sm">
              <img src={renderTilePreview(t.code, 24)} alt="" width={24} height={24} className="bg-abyss" style={{ imageRendering: 'pixelated' }} />
              <code className="w-6 text-center font-mono text-ember">{t.code}</code>
              <span className="truncate">{t.name}</span>
              <span className="ml-auto shrink-0 text-xs text-mist">{LAYER_LABEL[t.layer]}{t.solid ? ' · bloqueia' : ''}</span>
            </div>
          ))}
        </div>
      </details>

      <div className="lead-rule" />
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && <button type="button" className="btn btn-glass" onClick={onCancel}><X size={18} /> Cancelar</button>}
        <button type="button" className="btn btn-lit" onClick={() => onSave?.(map, aiInfo ? { name: aiInfo.name, notes: aiInfo.notes } : {})}>
          <Save size={18} /> Salvar mapa
        </button>
      </div>
    </div>
  );
}
