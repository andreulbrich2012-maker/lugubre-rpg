import { useMemo, useRef, useState } from 'react';
import { Footprints, RotateCcw, RotateCw, Search, Shuffle, Undo2, UserRound } from 'lucide-react';
import AvatarSprite from './AvatarSprite';
import { frameDataUrl } from '../../lib/avatar/render';
import { SLOTS, ITEMS, HAIRS, getItem } from '../../lib/avatar/catalog';
import { SKINS, HAIR_COLORS, EYE_COLORS, COLORS } from '../../lib/avatar/palette';
import { BUILDS, HEIGHTS } from '../../lib/avatar/skeleton';
import { EYE_STYLES, BEARDS } from '../../lib/avatar/body';
import { TRAIT_GROUPS } from '../../lib/avatar/traits';
import { RACES, RACE_BY_ID, defaultAppearance, defaultColors, randomAppearance, repairAppearance } from '../../lib/avatar/appearance';

// Criador de aparencia (boneco de papel). Tudo e uma aparencia JSON versionada
// (appearance.js); o componente so edita esse objeto e devolve por onChange.
const TABS = [
  { id: 'corpo', label: 'Corpo' },
  { id: 'cabelo', label: 'Cabelo' },
  { id: 'rosto', label: 'Rosto' },
  { id: 'tracos', label: 'Traços' },
  { id: 'roupas', label: 'Roupas' },
  { id: 'acessorios', label: 'Acessórios' },
  { id: 'itens', label: 'Na mão' }
];
const DIRS = ['down', 'left', 'up', 'right'];
const DIR_LABEL = { down: 'de frente', left: 'de lado (esquerda)', up: 'de costas', right: 'de lado (direita)' };
const PAGE = 48;
const HEAD_CROP = [2, 0, 20, 20];
// Miniatura recortada na parte do corpo de cada encaixe (a peca aparece grande, nao o boneco todo).
const SLOT_CROP = {
  head: HEAD_CROP, face: [4, 2, 16, 14], ears: [2, 4, 20, 14],
  neck: [4, 10, 16, 14], torso: [2, 12, 20, 20], arms: [2, 12, 20, 16], hands: [2, 16, 20, 14], back: [0, 6, 24, 26], waist: [4, 18, 16, 10], held: [0, 8, 24, 24],
  legs: [4, 20, 16, 12], knees: [4, 20, 16, 12], feet: [4, 24, 16, 8]
};
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function Swatches({ list, value, onPick, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
      {list.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={value === c.id}
          title={c.name}
          aria-label={c.name}
          onClick={() => onPick(c.id)}
          className={`h-6 w-6 border-2 ${value === c.id ? 'border-ember outline outline-2 outline-ember' : 'border-lead'}`}
          style={{ background: c.hex }}
        />
      ))}
    </div>
  );
}

function Thumb({ src, label, active, onClick, wide = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-md border-2 border-lead p-1 text-[11px] leading-tight ${active ? 'lit text-bone' : 'bg-glass text-mist hover:text-bone'}`}
    >
      {src ? <img src={src} alt="" className={`${wide ? 'h-16' : 'h-12'} bg-abyss/60`} style={{ imageRendering: 'pixelated' }} /> : <span className={`${wide ? 'h-16' : 'h-12'} grid w-12 place-items-center text-mist`}>—</span>}
      <span className="line-clamp-2 w-full text-center">{label}</span>
    </button>
  );
}

// Lista com busca e filtro por grupo (para 100 pecas nao virarem uma rolagem sem fim).
function PickerGrid({ items, value, onPick, thumbOf, noneLabel, wide }) {
  const [query, setQuery] = useState('');
  const [sub, setSub] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const subs = useMemo(() => [...new Set(items.map((i) => i.sub).filter(Boolean))], [items]);
  const shown = useMemo(() => {
    const q = norm(query.trim());
    return items.filter((i) => (!sub || i.sub === sub) && (!q || norm(i.name).includes(q)));
  }, [items, query, sub]);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar</span>
          <Search size={15} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-mist" />
          <input className="field !mt-0 py-1.5 !pl-8 text-sm" placeholder="Buscar pelo nome" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }} />
        </label>
        {subs.length > 1 && (
          <select className="field !mt-0 w-auto py-1.5 text-sm" aria-label="Filtrar por grupo" value={sub} onChange={(e) => { setSub(e.target.value); setLimit(PAGE); }}>
            <option value="">Todos os grupos</option>
            {subs.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>
      <p className="text-xs text-mist">{shown.length} {shown.length === 1 ? 'opção' : 'opções'}</p>
      <div className="grid max-h-[26rem] grid-cols-3 gap-1 overflow-y-auto pr-1 sm:grid-cols-4 xl:grid-cols-5">
        {noneLabel && <Thumb label={noneLabel} active={!value} onClick={() => onPick(null)} wide={wide} />}
        {shown.slice(0, limit).map((it) => (
          <Thumb key={it.id} label={it.name} src={thumbOf(it)} active={value === it.id} onClick={() => onPick(it.id)} wide={wide} />
        ))}
      </div>
      {shown.length > limit && <button type="button" className="btn btn-glass" onClick={() => setLimit((n) => n + PAGE)}>Mostrar mais</button>}
    </div>
  );
}

export default function AvatarCreator({ value, onChange, raceId }) {
  const app = useMemo(() => repairAppearance(value || defaultAppearance(raceId || 'humano')), [value, raceId]);
  const history = useRef([]);
  const [, bump] = useState(0);
  const [tab, setTab] = useState('corpo');
  const [dir, setDir] = useState(0);
  const [walking, setWalking] = useState(true);
  const accessorySlots = SLOTS.filter((s) => s.tab === 'acessorios' || s.tab === 'cabeca');
  const clothSlots = SLOTS.filter((s) => s.tab === 'roupas');
  const [slot, setSlot] = useState({ roupas: 'torso', acessorios: 'head', itens: 'held' });

  function set(next) {
    history.current = [...history.current, app].slice(-40);
    bump((n) => n + 1);
    onChange?.(repairAppearance(next));
  }
  function undo() {
    const prev = history.current.pop();
    bump((n) => n + 1);
    if (prev) onChange?.(prev);
  }
  const patch = (p) => set({ ...app, ...p });
  const setLayer = (slotId, itemId) => {
    const layers = { ...app.layers };
    if (!itemId) delete layers[slotId];
    else {
      const item = getItem(slotId, itemId);
      const keep = layers[slotId]?.id === itemId ? layers[slotId].colors : defaultColors(item);
      layers[slotId] = { id: itemId, colors: keep };
    }
    set({ ...app, layers });
  };
  const setLayerColor = (slotId, k, color) => {
    const cur = app.layers[slotId];
    if (!cur) return;
    const colors = [...cur.colors];
    colors[k] = color;
    set({ ...app, layers: { ...app.layers, [slotId]: { ...cur, colors } } });
  };

  const race = RACE_BY_ID[app.race];
  const direction = DIRS[dir];

  function slotPanel(group) {
    const slots = group === 'roupas' ? clothSlots : group === 'itens' ? SLOTS.filter((s) => s.tab === 'itens') : accessorySlots;
    const current = slot[group];
    const items = ITEMS[current] || [];
    const sel = app.layers[current];
    const item = sel && getItem(current, sel.id);
    const thumbDir = current === 'back' ? 'up' : 'down';
    return (
      <div className="flex flex-col gap-3">
        {slots.length > 1 && (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Parte do corpo">
            {slots.map((s) => (
              <button key={s.id} type="button" onClick={() => setSlot((cur) => ({ ...cur, [group]: s.id }))} aria-pressed={current === s.id}
                className={`rounded-md border-2 border-lead px-2 py-1 text-xs font-bold ${current === s.id ? 'lit text-bone' : 'bg-glass text-mist hover:text-bone'}`}>
                {s.name}{app.layers[s.id] ? ' •' : ''}
              </button>
            ))}
          </div>
        )}
        <PickerGrid
          key={current}
          items={items}
          value={sel?.id || null}
          noneLabel="Nenhum"
          wide
          onPick={(id) => setLayer(current, id)}
          thumbOf={(it) => frameDataUrl({ ...app, layers: { ...app.layers, [current]: { id: it.id, colors: defaultColors(it) } } }, { dir: thumbDir, scale: 3, crop: SLOT_CROP[current] })}
        />
        {item && item.channels.length > 0 && (
          <div className="flex flex-col gap-2 rounded-md border-2 border-lead bg-glass p-2">
            <p className="text-sm font-bold text-bone">{item.name}</p>
            {item.channels.map((ch, k) => (
              <div key={ch.label + k}>
                <p className="mb-1 text-xs text-mist">{ch.label}</p>
                <Swatches label={`${item.name}: ${ch.label}`} list={COLORS} value={sel.colors[k]} onPick={(c) => setLayerColor(current, k, c)} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 text-bone lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Previa grande */}
      <section className="gothic-panel flex flex-col items-center gap-3 rounded-md p-3" aria-label="Prévia do personagem">
        <div className="grid place-items-center rounded-md border-[3px] border-lead p-2" style={{ background: 'repeating-conic-gradient(#3e5a2e 0% 25%, #45642f 0% 50%) 0 0 / 24px 24px' }}>
          <AvatarSprite appearance={app} direction={direction} moving={walking} scale={8} title={`Personagem ${DIR_LABEL[direction]}`} />
        </div>
        <p className="text-xs text-mist" aria-live="polite">{race?.name || 'Humano'}, {DIR_LABEL[direction]}</p>
        <div className="flex flex-wrap justify-center gap-1">
          <button type="button" className="btn btn-glass !min-h-10 !w-10 !p-0" onClick={() => setDir((d) => (d + 3) % 4)} aria-label="Girar para a esquerda" title="Girar"><RotateCcw size={18} /></button>
          <button type="button" className={`btn btn-glass !min-h-10 !p-2 ${walking ? 'lit' : ''}`} onClick={() => setWalking((w) => !w)} aria-pressed={walking}><Footprints size={18} /> {walking ? 'Andando' : 'Parado'}</button>
          <button type="button" className="btn btn-glass !min-h-10 !w-10 !p-0" onClick={() => setDir((d) => (d + 1) % 4)} aria-label="Girar para a direita" title="Girar"><RotateCw size={18} /></button>
        </div>
        <div className="flex w-full flex-wrap gap-2">
          <button type="button" className="btn btn-lit flex-1" onClick={() => set(randomAppearance(Math.random, app.race))}><Shuffle size={18} /> Aleatório</button>
          <button type="button" className="btn btn-glass flex-1" onClick={undo} disabled={!history.current.length}><Undo2 size={18} /> Desfazer</button>
        </div>
        <button type="button" className="btn btn-glass w-full" onClick={() => set(defaultAppearance(app.race))}><UserRound size={18} /> Personagem base de {race?.name || 'Humano'}</button>
      </section>

      {/* Abas */}
      <section className="gothic-panel flex min-w-0 flex-col gap-3 rounded-md p-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Partes da aparência">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`rounded-md border-[3px] border-lead px-3 py-1.5 text-sm font-bold ${tab === t.id ? 'lit text-bone' : 'bg-glass text-mist hover:text-bone'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="min-w-0">
          {tab === 'corpo' && (
            <div className="flex flex-col gap-4">
              <label className="text-sm text-mist">Raça do visual
                <select className="field py-1.5" value={app.race} onChange={(e) => set(defaultAppearance(e.target.value))}>
                  {RACES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <span className="mt-1 block text-xs">Trocar a raça aqui carrega o personagem base dela (roupa, cabelo e traços).</span>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-mist">Porte
                  <select className="field py-1.5" value={app.body} onChange={(e) => patch({ body: e.target.value })}>
                    {BUILDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </label>
                <label className="text-sm text-mist">Altura
                  <select className="field py-1.5" value={app.height} onChange={(e) => patch({ height: e.target.value })}>
                    {HEIGHTS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </label>
              </div>
              <div>
                <p className="mb-1 text-sm text-mist">Tom de pele</p>
                <Swatches label="Tom de pele" list={SKINS} value={app.skin} onPick={(skin) => patch({ skin })} />
              </div>
            </div>
          )}

          {tab === 'cabelo' && (
            <div className="flex flex-col gap-3">
              <div>
                <p className="mb-1 text-sm text-mist">Cor do cabelo</p>
                <Swatches label="Cor do cabelo" list={HAIR_COLORS} value={app.hair.color} onPick={(color) => patch({ hair: { ...app.hair, color } })} />
              </div>
              <PickerGrid items={HAIRS} value={app.hair.style} onPick={(style) => patch({ hair: { ...app.hair, style } })}
                thumbOf={(h) => frameDataUrl({ ...app, hair: { ...app.hair, style: h.id } }, { crop: HEAD_CROP, scale: 3 })} />
            </div>
          )}

          {tab === 'rosto' && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-1 text-sm text-mist">Cor dos olhos</p>
                <Swatches label="Cor dos olhos" list={EYE_COLORS} value={app.eyes.color} onPick={(color) => patch({ eyes: { ...app.eyes, color } })} />
              </div>
              <div>
                <p className="mb-1 text-sm text-mist">Olhos e expressão</p>
                <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 xl:grid-cols-6">
                  {EYE_STYLES.map((e) => (
                    <Thumb key={e.id} label={e.name} active={app.eyes.style === e.id} onClick={() => patch({ eyes: { ...app.eyes, style: e.id } })}
                      src={frameDataUrl({ ...app, eyes: { ...app.eyes, style: e.id } }, { crop: HEAD_CROP, scale: 3 })} />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm text-mist">Cor da barba</p>
                <Swatches label="Cor da barba" list={HAIR_COLORS} value={app.beard.color} onPick={(color) => patch({ beard: { ...app.beard, color } })} />
              </div>
              <div>
                <p className="mb-1 text-sm text-mist">Barba</p>
                <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 xl:grid-cols-6">
                  {BEARDS.map((b) => (
                    <Thumb key={b.id} label={b.name} active={app.beard.style === b.id} onClick={() => patch({ beard: { ...app.beard, style: b.id } })}
                      src={frameDataUrl({ ...app, beard: { ...app.beard, style: b.id } }, { crop: HEAD_CROP, scale: 3 })} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'tracos' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-mist">Traços de raça (qualquer raça pode usar qualquer traço).</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {TRAIT_GROUPS.map((g) => (
                  <label key={g.id} className="text-sm text-mist">{g.name}
                    <select className="field py-1.5" value={app.traits[g.id]} onChange={(e) => patch({ traits: { ...app.traits, [g.id]: e.target.value } })}>
                      {g.options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <div>
                <p className="mb-1 text-sm text-mist">Cor de chifres, bico e barbatanas</p>
                <Swatches label="Cor de chifres, bico e barbatanas" list={COLORS} value={app.traits.hornColor} onPick={(c) => patch({ traits: { ...app.traits, hornColor: c } })} />
              </div>
              <div>
                <p className="mb-1 text-sm text-mist">Cor das marcas</p>
                <Swatches label="Cor das marcas" list={COLORS} value={app.traits.markColor} onPick={(c) => patch({ traits: { ...app.traits, markColor: c } })} />
              </div>
              <div>
                <p className="mb-1 text-sm text-mist">Pelagem (centauro, sátiro)</p>
                <Swatches label="Pelagem" list={HAIR_COLORS} value={app.traits.coat} onPick={(c) => patch({ traits: { ...app.traits, coat: c } })} />
              </div>
            </div>
          )}

          {tab === 'roupas' && slotPanel('roupas')}
          {tab === 'acessorios' && slotPanel('acessorios')}
          {tab === 'itens' && slotPanel('itens')}
        </div>
      </section>
    </div>
  );
}
