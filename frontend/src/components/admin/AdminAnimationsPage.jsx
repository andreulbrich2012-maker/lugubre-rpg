import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Repeat, Sparkles, Wand2 } from 'lucide-react';
import FxLayer from '../fx/FxLayer';
import AdminWeaponMovesPanel from './AdminWeaponMovesPanel';
import { matchSpellName } from '../../lib/fx/spells/match.js';
import { SPELLS } from '../../lib/fx/spells/catalog.js';
import { FAMILIES, GROUPS, RESULTS, ELEMENTS, ELEMENT_KEYS, classify, drawGrass, drawActor, getFamily } from '../../lib/fx';

// Galeria de animacoes: escolhe familia/elemento/resultado e toca entre dois
// bonecos num gramado. Serve para o admin conferir o visual e para testar a
// classificacao automatica de um nome de arma/magia antes de cadastrar.
const CELL = 48;
const COLS = 8;
const ROWS = 3;
const W = CELL * COLS;
const H = CELL * ROWS;
const UNIT = CELL / 16;

const RANGE_OPTIONS = [
  { id: 'auto', label: 'Distância automática' },
  { id: '1', label: 'Lado a lado (1 célula)' },
  { id: '3', label: '3 células' },
  { id: '5', label: '5 células' }
];

const ACTION_TEXT = {
  slash: 'meia-lua de corte', thrust: 'estocada reta', smash: 'golpe de cima', spin: 'giro em volta do atacante', dash: 'avanço com poeira',
  whip: 'chicote ondulando', punch: 'soco curto', claw: 'três riscos de garra', shield: 'escudo + onda de choque', xslash: 'dois cortes em X',
  heavy: 'meia-lua pesada', pole: 'haste longa', arrow: 'flecha em arco', bolt: 'virote reto e rápido', throw: 'arremesso girando',
  stone: 'pedra em parábola', orb: 'orbe com rastro', beam: 'raio contínuo', lob: 'orbe lançado alto', touch: 'mão brilhando',
  rise: 'luzes subindo', ripple: 'chão ondulando', wisp: 'fumaça serpenteando', blink: 'rastros do corpo', bite: 'mandíbulas fechando',
  breath: 'jato em cone', sting: 'ferroada venenosa'
};

function gap(family, range) {
  if (range !== 'auto') return Number(range);
  return family.group === 'corpo' || family.group === 'monstro' ? (family.action === 'breath' || family.action === 'dash' ? 3 : 1) : 4;
}

function AdminFamilyAnimations() {
  const fx = useRef(null);
  const bg = useRef(null);
  const actors = useRef(null);
  const shaker = useRef(null);
  const wrap = useRef(null);
  const loopRef = useRef(false);
  const counter = useRef(0);
  const [family, setFamily] = useState('corte');
  const [element, setElement] = useState('');
  const [result, setResult] = useState('hit');
  const [range, setRange] = useState('auto');
  const [loop, setLoop] = useState(false);
  const [scale, setScale] = useState(2);
  const [probe, setProbe] = useState('');
  const [probeMonster, setProbeMonster] = useState(false);
  const [probeResult, setProbeResult] = useState(null);
  const [probeSpell, setProbeSpell] = useState(null);
  const [last, setLast] = useState(null);

  const fam = getFamily(family);
  const cells = gap(fam, range);
  const ax = Math.round((COLS - cells - 1) / 2);
  const from = { x: (ax + 0.5) * CELL, y: 1.6 * CELL };
  const to = { x: (ax + cells + 0.5) * CELL, y: 1.6 * CELL };
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
    if (!c) return;
    const ctx = c.getContext('2d');
    drawGrass(ctx, c.width, c.height, 'galeria');
  }, []);

  useEffect(() => { drawActors(); }, [drawActors, family, range]);

  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setScale(Math.max(0.5, Math.min(2.5, entry.contentRect.width / W))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const play = useCallback((override = {}) => {
    const opts = {
      kind: override.family || family,
      element: (override.element ?? element) || null,
      result: override.result || result,
      from: pos.current.from,
      to: pos.current.to,
      fromId: 'a',
      toId: 'b',
      seed: `galeria-${++counter.current}`
    };
    pos.current.down = false;
    fx.current?.clear();
    fx.current?.play(opts);
    setLast(opts);
  }, [family, element, result]);

  const onFrame = useCallback(({ shake, tokens }) => {
    if (shaker.current) shaker.current.style.transform = `translate(${shake.x}px, ${shake.y}px)`;
    drawActors(tokens);
  }, [drawActors]);

  const onImpact = useCallback((info) => {
    if (info.down) pos.current.down = true;
  }, []);

  const onDone = useCallback(() => {
    if (loopRef.current) setTimeout(() => { if (loopRef.current) play(); }, 380);
  }, [play]);

  useEffect(() => { loopRef.current = loop; if (loop) play(); }, [loop]); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(id) {
    setFamily(id);
    const f = getFamily(id);
    if (f.group === 'magia' && !element) setElement(f.id === 'bencao' ? 'Éter' : 'Caos');
    if (f.group !== 'magia' && f.id !== 'sopro' && f.id !== 'magia-fera') setElement('');
  }

  // Ao trocar familia/distancia o palco muda; toca de novo para mostrar.
  useEffect(() => { const id = setTimeout(() => play(), 60); return () => clearTimeout(id); }, [family, element, result, range]); // eslint-disable-line react-hooks/exhaustive-deps

  function runProbe(event) {
    event.preventDefault();
    if (!probe.trim()) return;
    const c = classify({ name: probe, type: /magia|feiti/i.test(probe) ? 'magia' : undefined }, { monster: probeMonster });
    setProbeResult(c);
    // Magia do grimorio com o mesmo nome: e ela que toca na mesa.
    setProbeSpell(probeMonster ? null : matchSpellName(probe));
    setFamily(c.family);
    setElement(c.element || '');
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="gothic-panel p-4 sm:p-5">
        <h2 className="font-display text-3xl text-bone">Animações</h2>
        <p className="mt-1 text-sm text-mist">Golpes e magias em pixel art. Toda arma, magia ou ataque de monstro novo cai sozinho numa família; o elemento pinta as partículas.</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-bold text-mist">Família
            <select className="field" value={family} onChange={(e) => choose(e.target.value)}>
              {GROUPS.map((g) => (
                <optgroup key={g.id} label={g.label}>
                  {FAMILIES.filter((f) => f.group === g.id).map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </optgroup>
              ))}
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
        </div>
        {last && (
          <p className="mt-3 text-xs text-mist">
            {fam.label} · {last.element || 'físico'} · {RESULTS.find((r) => r.id === last.result)?.label}. Ação: {ACTION_TEXT[fam.action] || fam.action}.
          </p>
        )}

        <div className="mt-6 pane flex flex-wrap items-center justify-between gap-2 p-3">
          <p className="text-sm text-mist"><span className="text-bone">Grimório:</span> {SPELLS.length} magias com animação própria (fogo, gelo, ilusão, necromancia, tempo...).</p>
          <Link to="/grimorio" className="btn btn-glass"><Sparkles size={16} /> Abrir Grimório</Link>
        </div>

        <form onSubmit={runProbe} className="mt-3 pane p-3">
          <p className="text-sm text-bone">Testar classificação automática</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <input className="field !mt-0" placeholder="Ex.: Raio Sombrio, Machado grande, Mordida" value={probe} onChange={(e) => setProbe(e.target.value)} />
            <label className="flex items-center gap-2 text-xs text-mist"><input type="checkbox" checked={probeMonster} onChange={(e) => setProbeMonster(e.target.checked)} /> Monstro</label>
            <button type="submit" className="btn btn-glass"><Wand2 size={16} /> Classificar</button>
          </div>
          {probeResult && (
            <p className="mt-2 text-sm text-mist">
              <span className="text-ember">{probeResult.label}</span> · {GROUPS.find((g) => g.id === probeResult.group)?.label} · {probeResult.form} · {probeResult.element || 'físico'}
            </p>
          )}
          {probeSpell && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-mist">
              Grimório: <span className="text-ember">{probeSpell.name}</span> (esta animação vence a família na mesa)
              <button type="button" className="btn btn-glass !min-h-9 !px-3 text-xs" onClick={() => { fx.current?.clear(); fx.current?.play({ spell: probeSpell.id, result, from: pos.current.from, to: pos.current.to, fromId: 'a', toId: 'b', seed: `galeria-${++counter.current}` }); }}><Play size={14} /> Tocar magia</button>
            </p>
          )}
        </form>
      </div>

      <aside className="gothic-panel max-h-[80vh] overflow-auto p-4">
        <h3 className="font-display text-2xl text-bone">Famílias</h3>
        {GROUPS.map((g) => (
          <div key={g.id} className="mt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-mist">{g.label} ({FAMILIES.filter((f) => f.group === g.id).length})</p>
            <ul className="mt-1 grid gap-1">
              {FAMILIES.filter((f) => f.group === g.id).map((f) => (
                <li key={f.id}>
                  <button type="button" onClick={() => choose(f.id)} className={`w-full px-2 py-1.5 text-left text-sm ${family === f.id ? 'lit text-bone' : 'text-mist hover:text-bone'}`}>
                    {f.label}<span className="block text-xs opacity-75">{ACTION_TEXT[f.action] || f.action}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-mist">Elementos</p>
        <ul className="mt-1 grid gap-1">
          {ELEMENT_KEYS.map((k) => (
            <li key={k}>
              <button type="button" onClick={() => setElement(ELEMENTS[k].name)} className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm ${element === ELEMENTS[k].name ? 'lit text-bone' : 'text-mist hover:text-bone'}`}>
                <span className="flex shrink-0">{ELEMENTS[k].ramp.slice(1).map((c) => <span key={c} className="h-3 w-2" style={{ background: c }} />)}</span>
                <span>{ELEMENTS[k].name}<span className="block text-xs opacity-75">{ELEMENTS[k].hint}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}

// Duas abas: golpes de arma (familia de movimento x arma x golpe) e as familias
// de efeito originais (inclui magias e ataques de monstro).
export default function AdminAnimationsPage() {
  const [tab, setTab] = useState('armas');
  const tabs = [['armas', 'Golpes de arma'], ['familias', 'Famílias, magias e monstros']];
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`min-h-11 px-3 py-2 text-sm ${tab === id ? 'lit text-bone' : 'text-mist hover:text-bone'}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'armas' ? <AdminWeaponMovesPanel /> : <AdminFamilyAnimations />}
    </div>
  );
}
