import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Repeat, Shuffle } from 'lucide-react';
import FxLayer from '../fx/FxLayer';
import { RESULTS, ELEMENTS, ELEMENT_KEYS, drawGrass, drawActor, WEAPON_FAMILIES, WEAPON_FAMILY_OF, movesOf, weaponsOf, createEffect } from '../../lib/fx';

// Galeria dos golpes de arma: familia de movimento x arma x golpe x elemento x
// resultado. O golpe toca entre dois bonecos num gramado, igual a mesa.
const CELL = 48;
const COLS = 9;
const ROWS = 3;
const W = CELL * COLS;
const H = CELL * ROWS;
const UNIT = CELL / 16;

const RANGE_OPTIONS = [
  { id: 'auto', label: 'Distância automática' },
  { id: '1', label: 'Lado a lado (1 célula)' },
  { id: '2', label: '2 células' },
  { id: '4', label: '4 células' },
  { id: '6', label: '6 células' }
];

const TAG_LABEL = { elemento: 'elemento', montaria: 'montaria', dupla: 'em dupla' };

export default function AdminWeaponMovesPanel() {
  const fx = useRef(null);
  const bg = useRef(null);
  const actors = useRef(null);
  const shaker = useRef(null);
  const wrap = useRef(null);
  const loopRef = useRef(false);
  const counter = useRef(0);
  const [famId, setFamId] = useState('leves');
  const [weaponId, setWeaponId] = useState('espada-longa');
  const [moveId, setMoveId] = useState('corte-horizontal');
  const [element, setElement] = useState('');
  const [result, setResult] = useState('hit');
  const [range, setRange] = useState('auto');
  const [loop, setLoop] = useState(false);
  const [scale, setScale] = useState(2);
  const [picked, setPicked] = useState(null);

  const fam = WEAPON_FAMILY_OF[famId];
  const weapons = useMemo(() => weaponsOf(famId), [famId]);
  const moves = useMemo(() => movesOf(weaponId), [weaponId]);
  const baseCount = fam.moves.length;
  const move = moves.find((m) => m.id === moveId) || moves[0];

  const cells = range === 'auto' ? (fam.ranged ? 5 : 2) : Number(range);
  const ax = Math.max(0, Math.round((COLS - cells - 2) / 2));
  const from = { x: (ax + 0.5) * CELL, y: 1.7 * CELL };
  const to = { x: (ax + cells + 0.5) * CELL, y: 1.7 * CELL };
  const pos = useRef({ from, to, down: false });
  pos.current = { ...pos.current, from, to };

  const drawActors = useCallback((tokens = {}) => {
    const c = actors.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    const { from: f, to: t, down } = pos.current;
    const a = tokens.a || { x: 0, y: 0, flash: 0 };
    const b = tokens.b || { x: 0, y: 0, flash: 0 };
    drawActor(ctx, 'hero', (f.x + a.x) / UNIT, (f.y + a.y) / UNIT, { flash: a.flash });
    drawActor(ctx, 'dummy', (t.x + b.x) / UNIT, (t.y + b.y) / UNIT, { flash: b.flash, down });
  }, []);

  useEffect(() => {
    const c = bg.current;
    if (c) drawGrass(c.getContext('2d'), c.width, c.height, 'galeria-armas');
  }, []);

  useEffect(() => { drawActors(); }, [drawActors, famId, range]);

  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setScale(Math.max(0.5, Math.min(2.5, entry.contentRect.width / W))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const play = useCallback((random = false) => {
    const seed = `galeria-arma-${++counter.current}`;
    const opts = {
      weapon: weaponId,
      weaponFamily: famId,
      move: random ? undefined : move?.id,
      element: element || null,
      result,
      from: pos.current.from,
      to: pos.current.to,
      fromId: 'a',
      toId: 'b',
      seed
    };
    if (random) {
      // Mesmo sorteio que a mesa faz pelo rollId: mostra qual golpe saiu.
      const eff = createEffect({ ...opts, unit: UNIT, cell: CELL });
      setPicked(eff.mv?.move || null);
      opts.move = eff.mv?.move.id;
    } else setPicked(null);
    pos.current.down = false;
    fx.current?.clear();
    fx.current?.play(opts);
  }, [weaponId, famId, move, element, result]);

  const onFrame = useCallback(({ shake, tokens }) => {
    if (shaker.current) shaker.current.style.transform = `translate(${shake.x}px, ${shake.y}px)`;
    drawActors(tokens);
  }, [drawActors]);

  const onImpact = useCallback((info) => { if (info.down) pos.current.down = true; }, []);
  const onDone = useCallback(() => {
    if (loopRef.current) setTimeout(() => { if (loopRef.current) play(); }, 420);
  }, [play]);

  useEffect(() => { loopRef.current = loop; if (loop) play(); }, [loop]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const id = setTimeout(() => play(), 60); return () => clearTimeout(id); }, [weaponId, moveId, element, result, range]); // eslint-disable-line react-hooks/exhaustive-deps

  function chooseFamily(id) {
    const f = WEAPON_FAMILY_OF[id];
    setFamId(id);
    setWeaponId(f.tool);
    setMoveId(f.moves[0].id);
  }

  function chooseWeapon(id) {
    setWeaponId(id);
    const list = movesOf(id);
    if (!list.some((m) => m.id === moveId)) setMoveId(list[0].id);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="gothic-panel p-4 sm:p-5">
        <h2 className="font-display text-3xl text-bone">Golpes de arma</h2>
        <p className="mt-1 text-sm text-mist">Cada família de movimento tem seus golpes base; a arma é a ferramenta desenhada no golpe e pode trazer técnicas exclusivas. Sem golpe nomeado, a mesa sorteia um pelo rollId.</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <label className="text-xs font-bold text-mist">Família de movimento
            <select className="field" value={famId} onChange={(e) => chooseFamily(e.target.value)}>
              {WEAPON_FAMILIES.map((f) => <option key={f.id} value={f.id}>{f.label} ({f.moves.length})</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-mist">Arma (ferramenta)
            <select className="field" value={weaponId} onChange={(e) => chooseWeapon(e.target.value)}>
              {weapons.map((w) => <option key={w.id} value={w.id}>{w.name}{w.extra?.length ? ` (+${w.extra.length})` : ''}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-mist">Golpe
            <select className="field" value={move?.id} onChange={(e) => setMoveId(e.target.value)}>
              <optgroup label="Golpes base">
                {moves.slice(0, baseCount).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </optgroup>
              {moves.length > baseCount && (
                <optgroup label="Exclusivos da arma">
                  {moves.slice(baseCount).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </optgroup>
              )}
            </select>
          </label>
          <label className="text-xs font-bold text-mist">Elemento
            <select className="field" value={element} onChange={(e) => setElement(e.target.value)}>
              <option value="">Nenhum (físico)</option>
              {ELEMENT_KEYS.map((k) => <option key={k} value={ELEMENTS[k].name}>{ELEMENTS[k].name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-mist">Resultado
            <select className="field" value={result} onChange={(e) => setResult(e.target.value)}>
              {RESULTS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-mist">Distância
            <select className="field" value={range} onChange={(e) => setRange(e.target.value)}>
              {RANGE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
        </div>

        <div ref={wrap} className="mt-4 w-full">
          <div className="relative overflow-hidden border-[3px] border-lead" style={{ width: W * scale, height: H * scale }}>
            <div ref={shaker} className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, scale: String(scale) }}>
              <canvas ref={bg} width={W / UNIT} height={H / UNIT} className="absolute left-0 top-0" style={{ width: W, height: H, imageRendering: 'pixelated' }} aria-hidden="true" />
              <canvas ref={actors} width={W / UNIT} height={H / UNIT} className="absolute left-0 top-0" style={{ width: W, height: H, imageRendering: 'pixelated' }} aria-hidden="true" />
              <FxLayer ref={fx} width={W} height={H} cell={CELL} onFrame={onFrame} onImpact={onImpact} onDone={onDone} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-lit" onClick={() => play()}><Play size={16} /> Tocar</button>
          <button type="button" className={`btn btn-glass ${loop ? 'lit text-bone' : ''}`} aria-pressed={loop} onClick={() => setLoop((v) => !v)}><Repeat size={16} /> {loop ? 'Repetindo' : 'Repetir'}</button>
          <button type="button" className="btn btn-glass" onClick={() => play(true)}><Shuffle size={16} /> Sortear pelo rollId</button>
        </div>
        {move && (
          <div className="mt-3 text-sm text-mist">
            <p><span className="text-ember">{(picked || move).name}</span> · {(picked || move).tipo}{((picked || move).tags || []).map((t) => ` · ${TAG_LABEL[t] || t}`).join('')}</p>
            <p className="mt-1">{(picked || move).desc}</p>
            {picked && <p className="mt-1 text-xs">Sorteado entre os golpes da arma (sem montaria nem dupla).</p>}
          </div>
        )}
      </div>

      <aside className="gothic-panel max-h-[80vh] overflow-auto p-4">
        <h3 className="font-display text-2xl text-bone">{fam.label}</h3>
        <p className="mt-1 text-xs text-mist">{fam.desc}</p>
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-mist">Golpes base ({baseCount})</p>
        <ul className="mt-1 grid gap-1">
          {moves.slice(0, baseCount).map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => setMoveId(m.id)} className={`w-full px-2 py-1.5 text-left text-sm ${move?.id === m.id ? 'lit text-bone' : 'text-mist hover:text-bone'}`}>
                {m.name} <span className="text-xs opacity-75">· {m.tipo}</span>
                <span className="block text-xs opacity-75">{m.desc}</span>
              </button>
            </li>
          ))}
        </ul>
        {moves.length > baseCount && (
          <>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-mist">Exclusivos: {weapons.find((w) => w.id === weaponId)?.name}</p>
            <ul className="mt-1 grid gap-1">
              {moves.slice(baseCount).map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setMoveId(m.id)} className={`w-full px-2 py-1.5 text-left text-sm ${move?.id === m.id ? 'lit text-bone' : 'text-mist hover:text-bone'}`}>
                    {m.name} <span className="text-xs opacity-75">· {m.tipo}</span>
                    <span className="block text-xs opacity-75">{m.desc}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </section>
  );
}
