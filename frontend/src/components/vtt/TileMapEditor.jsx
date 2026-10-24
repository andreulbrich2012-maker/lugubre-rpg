import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check, Copy, Eraser, Gem, Grid3x3, Hand, Home, PaintBucket, Paintbrush,
  Building2, ChevronDown, ChevronUp, MapPin, Pipette, Redo2, RotateCcw, Save, Sparkles, Square, Trash2, Undo2, Wrench, X, ZoomIn, ZoomOut
} from 'lucide-react';
import TileMapCanvas from './TileMapCanvas';
import useScrollView from './useScrollView';
import ContainerContents from './ContainerContents';
import { TILES, CATEGORIES, DEFAULT_GROUND, EMPTY_OBJECT, getTile } from '../../lib/tiles/catalog';
import { renderTilePreview } from '../../lib/tiles/render';
import {
  emptyMap, repairMap, resizeMap, setCell, floodFill, rectFill, getCell, MIN_SIZE, MAX_SIZE,
  addItem, updateItem, removeItem, placeBuilding, updateBuilding, removeBuilding, itemAt, ITEM_CATEGORIES, MAX_ITEMS,
  setAmbience, placeDesign
} from '../../lib/tiles/format';
import { DESIGN_BY_ID } from '../../lib/buildings';
import BuildingSprite from '../buildings/BuildingSprite';
import DesignPicker from '../buildings/DesignPicker';
import MapPreview from '../buildings/MapPreview';
import { generateVillage, VILLAGE_SIZES } from '../../lib/buildings/village';
import { ROOFS, ROOF_LABEL } from '../../lib/tiles/roofs';
import { STYLES } from '../../lib/tiles/styles';
import { parseMapResponse } from '../../lib/tiles/aiPrompt';
import { buildPlanPrompt } from '../../lib/tiles/planPrompt';

const HISTORY = 50;
// 2-12: mapa grande (ate 1000x1000) inteiro na tela; de longe vira miniatura (cor media por celula)
const ZOOMS = [2, 4, 8, 12, 16, 24, 32, 40, 48, 64];
const TOOLS = [
  { id: 'brush', label: 'Pincel', icon: Paintbrush },
  { id: 'bucket', label: 'Balde', icon: PaintBucket },
  { id: 'rect', label: 'Retângulo', icon: Square },
  { id: 'eraser', label: 'Borracha', icon: Eraser },
  { id: 'picker', label: 'Conta-gotas', icon: Pipette },
  { id: 'design', label: 'Construção pronta (catálogo)', icon: Building2 },
  { id: 'building', label: 'Construção (arraste um retângulo)', icon: Home },
  { id: 'item', label: 'Colocar item', icon: Gem },
  { id: 'poi', label: 'Marcar ponto principal', icon: MapPin },
  { id: 'pan', label: 'Mover a vista', icon: Hand }
];
const TABS = [['pintar', 'Pintar'], ['construcoes', 'Construções'], ['itens', 'Itens'], ['pontos', 'Pontos'], ['ambiente', 'Ambiente']];
const TAB_TOOLS = {
  pintar: ['brush', 'bucket', 'rect', 'eraser', 'picker', 'pan'],
  construcoes: ['design', 'building', 'pan'],
  itens: ['item', 'pan'],
  pontos: ['poi', 'pan'],
  ambiente: ['pan']
};

// Pergunta de sim/nao com dois botoes grandes.
function YesNo({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label={label}>
      <span className="text-sm text-mist">{label}</span>
      {[[true, 'Sim'], [false, 'Não']].map(([v, l]) => (
        <button key={l} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`rounded-md border-[3px] border-lead px-3 py-1 text-sm font-bold ${value === v ? 'lit' : 'bg-glass text-mist hover:text-bone'}`}>{l}</button>
      ))}
    </div>
  );
}

// o plano da IA vem em porcentagem: o tamanho so decide quantas celulas (vila cabe bem do medio para cima)
const SIZES = [
  { id: 'p', label: 'Pequeno', cols: 32, rows: 24 },
  { id: 'm', label: 'Médio', cols: 64, rows: 48 },
  { id: 'g', label: 'Grande', cols: 100, rows: 80 },
  { id: 'e', label: 'Enorme', cols: 140, rows: 120 }
];
const EXAMPLES = [
  'Taverna à beira da estrada',
  'Cripta com altar e armadilhas',
  'Floresta com ruínas e um rio',
  'Masmorra com três salas e um tesouro',
  'Vila pequena com poço e mercado',
  'Caverna de cristais com lago subterrâneo'
];
const WALLS = [['#', 'Pedra'], ['B', 'Tijolo'], ['M', 'Madeira']];
const FLOORS = [['=', 'Assoalho'], ['_', 'Pedra'], ['Q', 'Templo']];
const LAYER_LABEL = { ground: 'Chão', objects: 'Objetos' };
const LIGHT_OPTIONS = [['dia', 'Dia'], ['entardecer', 'Entardecer'], ['noite', 'Noite']];
const DECOR_OPTIONS = [['nenhuma', 'Nenhuma'], ['pouca', 'Pouca'], ['normal', 'Normal'], ['muita', 'Muita']];
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

export default function TileMapEditor({ initialMap, onSave, onCancel }) {
  // 23/10: o site so monta o prompt; o mestre cola na IA que quiser e cola a resposta de volta.
  const [mode, setMode] = useState(initialMap ? 'manual' : 'ai');
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
  // parte visivel da area com rolagem: o mapa grande so desenha (e so monta casas/itens) ali
  const [scrollRef, scrollView] = useScrollView();

  const [description, setDescription] = useState('');
  const [aiSize, setAiSize] = useState('m');
  const [fromImage, setFromImage] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiInfo, setAiInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState('');
  const [result, setResult] = useState(null);
  const [build, setBuild] = useState({ wall: '#', floor: '=', roof: 'telha' });
  const [design, setDesign] = useState('casa-frente-media');
  const [tab, setTab] = useState('pintar');
  const [aiItems, setAiItems] = useState(true);
  const [aiMonsters, setAiMonsters] = useState(false);
  const [monsters, setMonsters] = useState([]);
  const [vopt, setVopt] = useState({ size: 'vila', seed: 1, river: true, lake: true, farm: true, cemetery: true, style: 'padrao' });
  const village = useMemo(() => (mode === 'vila' ? generateVillage(vopt) : null), [mode, vopt]);
  // cada aba liga a ferramenta certa: menos botoes na tela
  const goTab = (t) => { setTab(t); setTool(t === 'construcoes' ? 'design' : t === 'itens' ? 'item' : t === 'pontos' ? 'poi' : 'brush'); };

  const code = selected[layer];
  const aiDims = SIZES.find((x) => x.id === aiSize);
  const prompt = useMemo(() => buildPlanPrompt({ description, fromImage, items: aiItems, monsters: aiMonsters }), [description, fromImage, aiItems, aiMonsters]);
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
    if (tool === 'design') {
      const d = DESIGN_BY_ID[design];
      if (d) commit(placeDesign(map, x, y, d));
      return;
    }
    if (tool === 'poi') {
      const list = map.pois || [];
      if (list.length >= 99 || list.some((p) => p.x === x && p.y === y)) return;
      commit({ ...map, pois: [...list, { id: `p${Date.now().toString(36)}`, x, y, name: `Ponto ${list.length + 1}` }] });
      return;
    }
    if (tool === 'item') {
      if (itemAt(map, x, y)) return;
      commit(addItem(map, x, y, { name: 'Item achado' }));
      return;
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    stroke.current = { before: map, last: [x, y] };
    if (tool === 'rect' || tool === 'building') setRect({ x0: x, y0: y, x1: x, y1: y });
    else paintTo(x, y);
  };

  const onPointerMove = (e) => {
    if (!stroke.current) return;
    const [x, y] = cellAt(e);
    if (tool === 'rect' || tool === 'building') setRect((r) => (r && (r.x1 !== x || r.y1 !== y) ? { ...r, x1: x, y1: y } : r));
    else paintTo(x, y);
  };

  const onPointerUp = () => {
    const s = stroke.current;
    if (!s) return;
    stroke.current = null;
    if (tool === 'rect' && rect) {
      commit(rectFill(s.before, layer, rect.x0, rect.y0, rect.x1, rect.y1, code), s.before);
      setRect(null);
    } else if (tool === 'building' && rect) {
      const n = (s.before.buildings || []).length + 1;
      commit(placeBuilding(s.before, rect.x0, rect.y0, rect.x1, rect.y1, { ...build, name: `Construção ${n}` }), s.before);
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

  const copyPrompt = async () => {
    setAiError('');
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setAiError('O navegador bloqueou a cópia. Abra "Ver o prompt", selecione o texto e copie à mão.');
    }
  };

  // Importa sozinho ao colar: nada de botao extra.
  const readPasted = (text) => {
    setPasted(text);
    if (!text.trim()) { setResult(null); return; }
    setResult(parseMapResponse(text, aiDims.cols, aiDims.rows));
  };

  const applyResult = (andSave) => {
    if (!result?.ok) return;
    loadMap(result.map);
    const info = { name: result.name, notes: result.notes, warnings: result.warnings };
    setAiInfo(info);
    const found = aiMonsters ? result.monsters || [] : [];
    setMonsters(found);
    if (andSave) onSave?.(result.map, { name: result.name, notes: result.notes, monsters: found });
    else setMode('manual');
  };

  const rectBox = rect && {
    left: Math.min(rect.x0, rect.x1) * zoom,
    top: Math.min(rect.y0, rect.y1) * zoom,
    width: (Math.abs(rect.x1 - rect.x0) + 1) * zoom,
    height: (Math.abs(rect.y1 - rect.y0) + 1) * zoom
  };
  const h = history.current;

  if (mode === 'vila' && village) {
    const toggle = (k, label) => (
      <label key={k} className="flex items-center gap-2 text-sm text-mist">
        <input type="checkbox" checked={vopt[k]} onChange={(e) => setVopt((o) => ({ ...o, [k]: e.target.checked }))} /> {label}
      </label>
    );
    const vmap = { ...village.map, ...(vopt.style !== 'padrao' ? { style: vopt.style } : {}) };
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-3 text-bone sm:p-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl">Gerar vila pronta</h2>
            <p className="text-mist">Escolha o tamanho e o que ela tem; cada “Outra vila” sorteia um arranjo novo. Depois dá para ajustar tudo à mão.</p>
          </div>
          {onCancel && <button type="button" className="btn btn-glass" onClick={onCancel}><X size={18} /> Fechar</button>}
        </header>
        <section className="gothic-panel flex flex-col gap-3 rounded-md p-4">
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Tamanho da vila">
            {VILLAGE_SIZES.map((v) => (
              <button key={v.id} type="button" role="radio" aria-checked={vopt.size === v.id} onClick={() => setVopt((o) => ({ ...o, size: v.id }))}
                className={`rounded-md border-[3px] border-lead px-3 py-1.5 text-sm font-bold ${vopt.size === v.id ? 'lit' : 'bg-glass text-mist hover:text-bone'}`}>
                {v.name} <span className="font-normal opacity-75">{v.cols}×{v.rows}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            {toggle('river', 'Rio com ponte')}{toggle('lake', 'Lago')}{toggle('farm', 'Fazenda')}{toggle('cemetery', 'Cemitério')}
            <label className="text-sm text-mist">Estilo
              <select className="field ml-2 inline-block w-auto py-1 text-sm" value={vopt.style} onChange={(e) => setVopt((o) => ({ ...o, style: e.target.value }))}>
                {STYLES.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
              </select>
            </label>
          </div>
          <p className="text-sm text-mist">{village.map.buildings.length} construções · {village.notes}</p>
          <div className="max-h-[60vh] overflow-auto rounded-md border-[3px] border-lead bg-abyss">
            <MapPreview map={vmap} cellSize={Math.max(6, Math.min(16, Math.floor(900 / vmap.cols)))} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-lit" onClick={() => { loadMap(vmap); setAiInfo({ name: village.name, notes: village.notes }); onSave?.(vmap, { name: village.name, notes: village.notes }); }}><Save size={18} /> Usar esta vila</button>
            <button type="button" className="btn btn-glass" onClick={() => setVopt((o) => ({ ...o, seed: o.seed + 1 }))}><RotateCcw size={18} /> Outra vila</button>
            <button type="button" className="btn btn-glass" onClick={() => { loadMap(vmap); setMode('manual'); }}><Wrench size={18} /> Ajustar à mão</button>
          </div>
        </section>
        <div className="flex flex-wrap gap-4 text-sm">
          <button type="button" className="text-mist underline hover:text-bone" onClick={() => setMode('ai')}>Prefiro descrever para uma IA</button>
          <button type="button" className="text-mist underline hover:text-bone" onClick={() => setMode('manual')}>Prefiro desenhar à mão</button>
        </div>
      </div>
    );
  }

  if (mode === 'ai') {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-3 text-bone sm:p-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl">Criar mapa com IA</h2>
            <p className="text-mist">Três passos: descreva, copie o pedido para a sua IA e cole a resposta aqui.</p>
          </div>
          {onCancel && <button type="button" className="btn btn-glass" onClick={onCancel}><X size={18} /> Fechar</button>}
        </header>

        <section className="gothic-panel flex flex-col gap-3 rounded-md p-4">
          <label className="font-display text-xl" htmlFor="map-desc">1. Descreva o mapa</label>
          <textarea id="map-desc" className="field min-h-[7rem] text-base" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: uma taverna com lareira ao norte, porta ao sul e uma estrada cortando a floresta" />
          <div className="flex flex-wrap gap-2" aria-label="Exemplos">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setDescription(ex)} aria-pressed={description === ex}
                className={`rounded-md border-2 border-lead px-3 py-1.5 text-sm ${description === ex ? 'lit' : 'bg-glass text-mist hover:text-bone'}`}>{ex}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Tamanho">
            <span className="text-sm text-mist">Tamanho:</span>
            {SIZES.map((x) => (
              <button key={x.id} type="button" role="radio" aria-checked={aiSize === x.id} onClick={() => { setAiSize(x.id); setResult(null); setPasted(''); }}
                className={`rounded-md border-[3px] border-lead px-3 py-1.5 text-sm font-bold ${aiSize === x.id ? 'lit' : 'bg-glass text-mist hover:text-bone'}`}>
                {x.label} <span className="font-normal opacity-75">{x.cols}×{x.rows}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-4">
            <YesNo label="Tenho uma foto/desenho de mapa" value={fromImage} onChange={(v) => { setFromImage(v); setResult(null); setPasted(''); }} />
            <YesNo label="Itens para pegar?" value={aiItems} onChange={(v) => { setAiItems(v); setResult(null); setPasted(''); }} />
            <YesNo label="Monstros no mapa?" value={aiMonsters} onChange={(v) => { setAiMonsters(v); setResult(null); setPasted(''); }} />
          </div>
        </section>

        <section className="gothic-panel flex flex-col gap-3 rounded-md p-4">
          <h3 className="font-display text-xl">2. Copie o pedido</h3>
          <button type="button" className="btn btn-lit min-h-14 text-lg" onClick={copyPrompt}>
            {copied ? <Check size={22} /> : <Copy size={22} />} {copied ? 'Copiado! Agora cole na IA' : 'Copiar prompt'}
          </button>
          <p className="text-mist">{fromImage ? 'Cole no ChatGPT, Gemini ou Claude JUNTO com a imagem do mapa (anexe a foto) e copie a resposta inteira.' : 'Cole no ChatGPT, Gemini ou Claude e copie a resposta inteira.'}</p>
          {aiError && <p role="alert" className="text-sm text-ember">{aiError}</p>}
          <details className="text-sm">
            <summary className="cursor-pointer text-mist hover:text-bone">Ver o prompt</summary>
            <textarea readOnly className="field mt-2 h-40 font-mono text-[11px]" value={prompt} onFocus={(e) => e.target.select()} />
          </details>
        </section>

        <section className="gothic-panel flex flex-col gap-3 rounded-md p-4">
          <label className="font-display text-xl" htmlFor="map-paste">3. Cole aqui a resposta da IA</label>
          <textarea id="map-paste" className="field h-28 font-mono text-[11px]" value={pasted} onChange={(e) => readPasted(e.target.value)}
            placeholder='{"name": "...", "layers": {...}, "buildings": [...], "items": [...]}' />
          {result && !result.ok && <p role="alert" className="text-ember">{result.warnings[0]}</p>}
          {result?.ok && (
            <div className="flex flex-col gap-3" role="status">
              <div>
                <p className="font-display text-2xl">{result.name || 'Mapa importado'}</p>
                {result.notes && <p className="text-mist">{result.notes}</p>}
                <p className="text-sm text-mist">{result.map.items.length} item(ns) pegável(is) · {result.map.buildings.length} construção(ões) com telhado{aiMonsters ? ` · ${(result.monsters || []).length} monstro(s)` : ''}</p>
                {result.warnings.map((w) => <p key={w} className="text-sm text-ember">{w}</p>)}
              </div>
              <div className="max-h-[55vh] overflow-auto rounded-md border-[3px] border-lead bg-abyss">
                <MapPreview map={result.map} cellSize={Math.max(6, Math.min(28, Math.floor(860 / result.map.cols)))} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-lit" onClick={() => applyResult(true)}><Save size={18} /> Usar este mapa</button>
                <button type="button" className="btn btn-glass" onClick={() => readPasted('')}><RotateCcw size={18} /> Tentar de novo</button>
                <button type="button" className="btn btn-glass" onClick={() => applyResult(false)}><Wrench size={18} /> Ajustar à mão</button>
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-wrap gap-4 text-sm">
          <button type="button" className="text-mist underline hover:text-bone" onClick={() => setMode('vila')}>Gerar uma vila pronta (sem IA)</button>
          <button type="button" className="text-mist underline hover:text-bone" onClick={() => setMode('manual')}>Prefiro desenhar à mão</button>
        </div>
      </div>
    );
  }

  const items = map.items || [];
  const buildings = map.buildings || [];
  // recorte pela vista (com folga); de muito longe as casas viram blocos no canvas
  const sv = scrollView || { x: 0, y: 0, w: 1600, h: 1000 };
  const pad = Math.max(zoom * 6, 400);
  const near = (x0, y0, x1, y1) => x1 * zoom > sv.x - pad && x0 * zoom < sv.x + sv.w + pad && y1 * zoom > sv.y - pad && y0 * zoom < sv.y + sv.h + pad;
  const far = zoom < 6;
  const shownBuildings = far ? [] : buildings.filter((b) => near(b.x, b.y - 6, b.x + b.w, b.y + b.h));
  const shownItems = items.filter((it) => near(it.x, it.y, it.x + 1, it.y + 1));

  return (
    <div className="flex flex-col gap-4 text-bone">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Area do mapa */}
        <section className="gothic-panel flex min-w-0 flex-col gap-3 rounded-md p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-md border-[3px] border-lead" role="tablist" aria-label="O que editar">
              {TABS.map(([t, label]) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => goTab(t)}
                  className={`px-3 py-1.5 text-sm font-bold ${tab === t ? 'lit' : 'bg-glass text-mist hover:text-bone'}`}>{label}</button>
              ))}
            </div>
            {tab === 'pintar' && <div className="flex overflow-hidden rounded-md border-[3px] border-lead" role="group" aria-label="Camada">
              {['ground', 'objects'].map((l) => (
                <button key={l} type="button" onClick={() => setLayer(l)} aria-pressed={layer === l}
                  className={`px-3 py-1.5 text-sm font-bold ${layer === l ? 'lit' : 'bg-glass text-mist hover:text-bone'}`}>
                  {LAYER_LABEL[l]}
                </button>
              ))}
            </div>}
            <div className="flex flex-wrap gap-1" role="group" aria-label="Ferramentas">
              {TOOLS.filter((t) => TAB_TOOLS[tab].includes(t.id)).map(({ id, label, icon: Icon }) => (
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

          <div ref={scrollRef} className="max-h-[70vh] overflow-auto rounded-md border-[3px] border-lead bg-abyss">
            <div className="relative w-max">
              <TileMapCanvas
                map={map}
                cellSize={zoom}
                showGrid={showGrid}
                viewport={scrollView || undefined}
                buildingBlocks={far}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{ touchAction: tool === 'pan' ? 'auto' : 'none', cursor: tool === 'pan' ? 'grab' : 'crosshair' }}
              />
              {shownBuildings.filter((b) => b.design).sort((a, b) => a.y + a.h - b.y - b.h).map((b) => (
                <BuildingSprite key={`s-${b.id}`} building={b} tiles={map} scale={zoom / 16} placed className="pointer-events-none" />
              ))}
              {shownBuildings.map((b) => (
                <div key={b.id} className={`pointer-events-none absolute ${b.design ? '' : 'border-2 border-dashed border-ember/70'}`} style={{ left: b.x * zoom, top: b.y * zoom, width: b.w * zoom, height: b.h * zoom }}>
                  <span className="absolute left-0 top-0 bg-abyss/85 px-1 text-[10px] font-bold text-ember">{b.name}</span>
                </div>
              ))}
              {(map.pois || []).map((p, i) => (
                <span key={p.id} className="worldmap-pin pointer-events-none" style={{ left: (p.x + 0.5) * zoom, top: (p.y + 0.5) * zoom, opacity: p.hidden ? 0.55 : 1 }}>{i + 1}</span>
              ))}
              {shownItems.map((it) => (
                <span key={it.id} className="vtt-loot pointer-events-none" title={it.name} style={{ left: it.x * zoom, top: it.y * zoom, width: zoom, height: zoom }} />
              ))}
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
          {tab === 'pintar' && <section className="gothic-panel rounded-md p-3">
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
          </section>}

          {tab === 'pontos' && (
            <section className="gothic-panel flex flex-col gap-2 rounded-md p-3">
              <h3 className="font-display text-xl">Pontos principais <span className="text-sm text-mist">({(map.pois || []).length}/99)</span></h3>
              <p className="text-sm text-mist">Clique no mapa para marcar. Eles aparecem numerados no mapa que os jogadores recebem (item “Mapa de…”), com esta legenda.</p>
              <ol className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto pr-1">
                {(map.pois || []).map((p, i, list) => {
                  const set = (patch) => commit({ ...map, pois: list.map((q) => (q.id === p.id ? { ...q, ...patch } : q)) });
                  const move = (d) => { const next = [...list]; const j = i + d; if (j < 0 || j >= next.length) return; [next[i], next[j]] = [next[j], next[i]]; commit({ ...map, pois: next }); };
                  return (
                    <li key={p.id} className="rounded-md border-2 border-lead bg-glass p-2">
                      <div className="flex items-center gap-1">
                        <span className="worldmap-num">{i + 1}</span>
                        <input className="field min-w-0 py-1 text-sm" aria-label="Nome do ponto" value={p.name} maxLength={60} onChange={(e) => set({ name: e.target.value || ' ' })} />
                        <button type="button" className="btn btn-glass !min-h-8 !w-8 !p-0" onClick={() => move(-1)} aria-label="Subir"><ChevronUp size={14} /></button>
                        <button type="button" className="btn btn-glass !min-h-8 !w-8 !p-0" onClick={() => move(1)} aria-label="Descer"><ChevronDown size={14} /></button>
                        <button type="button" className="btn btn-glass !min-h-8 !w-8 !p-0" onClick={() => commit({ ...map, pois: list.filter((q) => q.id !== p.id) })} aria-label={`Apagar ${p.name}`}><Trash2 size={14} /></button>
                      </div>
                      <input className="field mt-1 py-1 text-xs" placeholder="Descrição curta (aparece na legenda)" value={p.note || ''} maxLength={300} onChange={(e) => set({ note: e.target.value })} />
                      <label className="mt-1 flex items-center gap-2 text-xs text-mist"><input type="checkbox" checked={Boolean(p.hidden)} onChange={(e) => set({ hidden: e.target.checked })} /> Só o mestre vê</label>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {tab === 'ambiente' && <section className="gothic-panel flex flex-col gap-2 rounded-md p-3">
            <h3 className="font-display text-xl">Ambiente</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-mist">Luz da cena
                <select className="field py-1.5" value={map.light || 'dia'} onChange={(e) => commit(setAmbience(map, { light: e.target.value }))}>
                  {LIGHT_OPTIONS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                </select>
              </label>
              <label className="text-sm text-mist">Decoração
                <select className="field py-1.5" value={map.decor || 'normal'} onChange={(e) => commit(setAmbience(map, { decor: e.target.value }))}>
                  {DECOR_OPTIONS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                </select>
              </label>
              <label className="col-span-2 text-sm text-mist">Estilo do mapa
                <select className="field py-1.5" value={map.style || 'padrao'} title={STYLES.find((st) => st.id === (map.style || 'padrao'))?.description}
                  onChange={(e) => commit(setAmbience(map, { style: e.target.value }))}>
                  {STYLES.map((st) => <option key={st.id} value={st.id} title={st.description}>{st.name}</option>)}
                </select>
              </label>
            </div>
            <p className="text-xs text-mist">À noite, tochas, fogueiras, janelas e cristais brilham. A decoração (grama, flores, pedrinhas) é espalhada sozinha, sem cobrir caminhos, portas ou objetos. O estilo muda as cores do mapa inteiro (ex.: Outono, Inverno, Sépia).</p>
          </section>}

          {tab === 'construcoes' && (
            <section className="gothic-panel flex flex-col gap-2 rounded-md p-3">
              <h3 className="font-display text-xl">Construção pronta</h3>
              <p className="text-sm text-mist">Escolha e clique no mapa (canto de cima-esquerda). Casas já vêm com interior pronto quando o mestre abrir a porta.</p>
              <DesignPicker value={design} onChange={setDesign} />
            </section>
          )}

          {tab === 'construcoes' && (
            <details className="gothic-panel flex flex-col gap-2 rounded-md p-3" open={tool === 'building'} onToggle={(e) => setTool(e.currentTarget.open ? 'building' : 'design')}>
              <summary className="cursor-pointer font-display text-xl">Desenhar com paredes (avançado)</summary>
              <p className="text-sm text-mist">Arraste um retângulo no mapa: paredes em volta, piso dentro, porta embaixo e telhado.</p>
              <label className="text-sm text-mist">Parede
                <select className="field py-1.5" value={build.wall} onChange={(e) => setBuild((b) => ({ ...b, wall: e.target.value }))}>
                  {WALLS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>
              </label>
              <label className="text-sm text-mist">Piso
                <select className="field py-1.5" value={build.floor} onChange={(e) => setBuild((b) => ({ ...b, floor: e.target.value }))}>
                  {FLOORS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>
              </label>
              <label className="text-sm text-mist">Telhado
                <select className="field py-1.5" value={build.roof} onChange={(e) => setBuild((b) => ({ ...b, roof: e.target.value }))}>
                  {ROOFS.map((r) => <option key={r} value={r}>{ROOF_LABEL[r]}</option>)}
                </select>
              </label>
            </details>
          )}

          {tab === 'itens' && <section className="gothic-panel flex flex-col gap-2 rounded-md p-3">
            <h3 className="font-display text-xl">Itens pegáveis <span className="text-sm text-mist">({items.length}/{MAX_ITEMS})</span></h3>
            {!items.length && <p className="text-sm text-mist">Use a ferramenta “Colocar item” e clique numa célula (de preferência num baú, prateleira ou corpo caído).</p>}
            <ul className="flex max-h-[20rem] flex-col gap-2 overflow-y-auto pr-1">
              {items.map((it) => (
                <li key={it.id} className="rounded-md border-2 border-lead bg-glass p-2">
                  <div className="flex items-center gap-1">
                    <input className="field py-1 text-sm" aria-label="Nome do item" value={it.name} maxLength={60}
                      onChange={(e) => commit(updateItem(map, it.id, { name: e.target.value || ' ' }))} />
                    <button type="button" className="btn btn-glass !min-h-9 !w-9 !p-0" onClick={() => commit(removeItem(map, it.id))} aria-label={`Apagar ${it.name}`}><Trash2 size={15} /></button>
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-1 text-xs text-mist">
                    <label>Qtd.<input type="number" min={1} max={999} className="field py-1" value={it.quantity} onChange={(e) => commit(updateItem(map, it.id, { quantity: e.target.value }))} /></label>
                    <label>Peso<input type="number" min={0} step={0.1} className="field py-1" value={it.weight} onChange={(e) => commit(updateItem(map, it.id, { weight: e.target.value }))} /></label>
                    <label>Dracmas<input type="number" min={0} className="field py-1" value={it.dracmas || 0} onChange={(e) => commit(updateItem(map, it.id, { dracmas: e.target.value }))} /></label>
                  </div>
                  <label className="mt-1 block text-xs text-mist">Categoria
                    <select className="field py-1 text-sm" value={it.category} onChange={(e) => commit(updateItem(map, it.id, { category: e.target.value }))}>
                      {ITEM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </label>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-mist">
                    <span className="text-[11px]">Célula {it.x},{it.y}</span>
                    {/* recipiente (mochila, bau, saco): itens dentro, opcionalmente trancado */}
                    <label className="flex items-center gap-1"><input type="checkbox" checked={Boolean(it.container)} disabled={it.contents?.length > 0} onChange={(e) => commit(updateItem(map, it.id, { container: e.target.checked, contents: e.target.checked ? it.contents || [] : undefined, locked: e.target.checked ? it.locked : undefined }))} /> Recipiente</label>
                    {it.container && <label className="flex items-center gap-1"><input type="checkbox" checked={Boolean(it.locked)} onChange={(e) => commit(updateItem(map, it.id, { locked: e.target.checked }))} /> Trancado</label>}
                  </div>
                  {it.container && <ContainerContents item={it} isMaster onPatch={(patch) => commit(updateItem(map, it.id, patch))} />}
                </li>
              ))}
            </ul>
          </section>}

          {tab === 'construcoes' && <section className="gothic-panel flex flex-col gap-2 rounded-md p-3">
            <h3 className="font-display text-xl">Construções no mapa <span className="text-sm text-mist">({buildings.length})</span></h3>
            {!buildings.length && <p className="text-sm text-mist">Use a ferramenta “Construção” e arraste um retângulo.</p>}
            <ul className="flex max-h-[16rem] flex-col gap-2 overflow-y-auto pr-1">
              {buildings.map((b) => (
                <li key={b.id} className="flex items-center gap-1 rounded-md border-2 border-lead bg-glass p-2">
                  <input className="field min-w-0 py-1 text-sm" aria-label="Nome da construção" value={b.name} maxLength={60}
                    onChange={(e) => commit(updateBuilding(map, b.id, { name: e.target.value || ' ' }))} />
                  <select className="field w-28 py-1 text-sm" aria-label="Telhado" value={b.roof} onChange={(e) => commit(updateBuilding(map, b.id, { roof: e.target.value }))}>
                    {ROOFS.map((r) => <option key={r} value={r}>{ROOF_LABEL[r]}</option>)}
                  </select>
                  <button type="button" className="btn btn-glass !min-h-9 !w-9 shrink-0 !p-0" onClick={() => commit(removeBuilding(map, b.id))} aria-label={`Apagar ${b.name}`}><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
          </section>}

          <section className="gothic-panel flex flex-col gap-2 rounded-md p-3">
            <button type="button" className="btn btn-glass" onClick={() => setMode('ai')}><Sparkles size={18} /> Criar com IA</button>
            <button type="button" className="btn btn-glass" onClick={() => setMode('vila')}><Building2 size={18} /> Gerar vila pronta</button>
            {aiInfo && (
              <div className="text-sm text-mist">
                {aiInfo.name && <p className="text-bone">{aiInfo.name}</p>}
                {aiInfo.notes && <p>{aiInfo.notes}</p>}
              </div>
            )}
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
        <button type="button" className="btn btn-lit" onClick={() => onSave?.(map, { ...(aiInfo ? { name: aiInfo.name, notes: aiInfo.notes } : {}), monsters })}>
          <Save size={18} /> Salvar mapa
        </button>
      </div>
    </div>
  );
}
