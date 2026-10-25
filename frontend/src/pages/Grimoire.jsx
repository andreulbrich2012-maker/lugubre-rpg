import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Repeat, Search, Sparkles, X } from 'lucide-react';
import Button from '../components/Button';
import SpellIcon from '../components/icons/SpellIcon';
import SpellStage from '../components/fx/SpellStage';
import { SPELLS, SCHOOLS, SCHOOL_BY_ID, DOMAINS, TIERS, tierLabel } from '../lib/fx/spells/catalog.js';
import { ELEMENT_KEYS, ELEMENTS } from '../lib/fx/elements.js';
import { normalize } from '../lib/fx/text.js';

// Grimorio: catalogo visual de magias com animacao propria. Nao e regra do jogo:
// o livro ainda nao define escolas. Qualquer poder com o mesmo nome (ou com
// animation: { spell: id }) toca a animacao daqui na mesa.
const PAGE = 48;
const RESULTS = [
  { id: 'hit', label: 'Acerto' },
  { id: 'crit', label: 'Crítico' },
  { id: 'miss', label: 'Erro' },
  { id: 'fumble', label: 'Falha' },
  { id: 'downed', label: 'Caído' }
];
const TIER_STYLE = { 1: 'text-mist', 2: 'text-bone', 3: 'text-ember', 4: 'text-amber-200' };

// Registro "parecido com poder" para o icone automatico (spellicons).
function iconPower(spell) {
  return { name: spell.name, type: 'magia', element: spell.element, range: spell.range, description: `${spell.desc} ${spell.target}` };
}

const SEARCH_INDEX = SPELLS.map((s) => ({ s, text: normalize(`${s.name} ${s.desc} ${SCHOOL_BY_ID[s.school].label} ${SCHOOL_BY_ID[s.school].title} ${s.element}`) }));

export default function Grimoire() {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('');
  const [school, setSchool] = useState('');
  const [tier, setTier] = useState('');
  const [element, setElement] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState(null);

  const list = useMemo(() => {
    const q = normalize(query);
    return SEARCH_INDEX.filter(({ s, text }) => (
      (!q || text.includes(q))
      && (!domain || SCHOOL_BY_ID[s.school].domain === domain)
      && (!school || s.school === school)
      && (!tier || s.tier === Number(tier))
      && (!element || s.element === element)
    )).map(({ s }) => s);
  }, [query, domain, school, tier, element]);

  useEffect(() => { setLimit(PAGE); }, [query, domain, school, tier, element]);

  const schools = domain ? SCHOOLS.filter((s) => s.domain === domain) : SCHOOLS;

  return (
    <main className="mx-auto max-w-7xl px-3 pb-24 pt-6 sm:px-4 sm:py-10">
      <section className="gothic-panel p-4 sm:p-6">
        <h1 className="font-display text-4xl text-bone">Grimório</h1>
        <p className="mt-2 max-w-3xl text-sm text-mist">
          {SPELLS.length} magias em {SCHOOLS.length} escolas, da básica à lendária, cada uma com a sua animação. É um catálogo de inspiração e de efeitos visuais: as regras de magia continuam no Livro.
          Um poder com o mesmo nome de uma magia daqui toca esta animação na mesa.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_170px_190px_160px_150px]">
          <label className="relative block sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Buscar magia</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
            <input className="field !mt-0 !pl-9" placeholder="Buscar: bola de fogo, ilusão, cura..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <select className="field !mt-0" aria-label="Domínio" value={domain} onChange={(e) => { setDomain(e.target.value); setSchool(''); }}>
            <option value="">Todos os domínios</option>
            {DOMAINS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
          <select className="field !mt-0" aria-label="Escola" value={school} onChange={(e) => setSchool(e.target.value)}>
            <option value="">Todas as escolas</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.label} ({s.title})</option>)}
          </select>
          <select className="field !mt-0" aria-label="Nível" value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="">Todos os níveis</option>
            {TIERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select className="field !mt-0" aria-label="Elemento" value={element} onChange={(e) => setElement(e.target.value)}>
            <option value="">Todos elementos</option>
            {ELEMENT_KEYS.map((k) => <option key={k} value={ELEMENTS[k].name}>{ELEMENTS[k].name}</option>)}
          </select>
        </div>
        {school && <p className="mt-3 text-sm italic text-mist">{SCHOOL_BY_ID[school].hint}</p>}
        <p className="mt-3 text-xs text-mist" aria-live="polite">{list.length === SPELLS.length ? `${list.length} magias` : `${list.length} de ${SPELLS.length} magias`}</p>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.slice(0, limit).map((s) => <SpellCard key={s.id} spell={s} onPlay={() => setOpen(s)} />)}
      </section>
      {!list.length && <p className="mt-8 text-center text-mist">Nenhuma magia com esses filtros.</p>}
      {list.length > limit && (
        <div className="mt-5 flex justify-center">
          <Button type="button" variant="ghost" onClick={() => setLimit((n) => n + PAGE)}>Mostrar mais ({list.length - limit})</Button>
        </div>
      )}
      {open && <SpellViewer spell={open} onClose={() => setOpen(null)} />}
    </main>
  );
}

function SpellCard({ spell, onPlay }) {
  const sc = SCHOOL_BY_ID[spell.school];
  return (
    <article className="pane flex flex-col p-4">
      <div className="flex items-start gap-3">
        <SpellIcon power={iconPower(spell)} size={48} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-mist">{sc.label} · <span className={TIER_STYLE[spell.tier]}>{tierLabel(spell.tier)}</span> · {spell.element}</p>
          <h3 className="break-words font-display text-2xl leading-tight text-bone">{spell.name}</h3>
        </div>
      </div>
      <p className="mt-2 flex-1 text-sm text-mist">{spell.desc}</p>
      <p className="mt-2 text-xs text-mist"><span className="text-bone">Alvo:</span> {spell.target} · <span className="text-bone">Alcance:</span> {spell.range}</p>
      <Button type="button" className="mt-3 w-full sm:w-auto sm:self-start" onClick={onPlay}><Play size={15} /> Ver animação</Button>
    </article>
  );
}

function SpellViewer({ spell, onClose }) {
  const stage = useRef(null);
  const closeRef = useRef(null);
  const [result, setResult] = useState('hit');
  const [element, setElement] = useState('');
  const [loop, setLoop] = useState(false);
  const loopRef = useRef(false);
  loopRef.current = loop;
  const sc = SCHOOL_BY_ID[spell.school];

  const play = useCallback(() => stage.current?.play({ spell: spell.id, result, element }), [spell.id, result, element]);

  useEffect(() => { const id = setTimeout(play, 80); return () => clearTimeout(id); }, [play]);
  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const onDone = useCallback(() => {
    if (loopRef.current) setTimeout(() => { if (loopRef.current) play(); }, 420);
  }, [play]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/80 sm:place-items-center sm:p-3" role="dialog" aria-modal="true" aria-labelledby="grimorio-titulo" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="gothic-panel max-h-[94vh] w-full max-w-2xl overflow-auto p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <SpellIcon power={iconPower(spell)} size={72} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-mist">{sc.label} ({sc.title}) · <span className={TIER_STYLE[spell.tier]}>{tierLabel(spell.tier)}</span> · {spell.element}</p>
            <h2 id="grimorio-titulo" className="break-words font-display text-3xl text-bone">{spell.name}</h2>
          </div>
          <button ref={closeRef} type="button" className="btn btn-glass !min-h-11 !px-3" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <p className="mt-3 text-sm text-mist">{spell.desc}</p>
        <p className="mt-1 text-xs text-mist"><span className="text-bone">Alvo:</span> {spell.target} · <span className="text-bone">Alcance:</span> {spell.range}</p>

        <SpellStage ref={stage} onDone={onDone} className="mt-4" />

        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Resultado">
          {RESULTS.map((r) => (
            <button key={r.id} type="button" aria-pressed={result === r.id} className={`btn btn-glass !min-h-10 !px-3 text-sm ${result === r.id ? 'lit text-bone' : ''}`} onClick={() => setResult(r.id)}>{r.label}</button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs font-bold text-mist">Cor do elemento
            <select className="field !mt-1" value={element} onChange={(e) => setElement(e.target.value)}>
              <option value="">Própria da magia</option>
              {ELEMENT_KEYS.map((k) => <option key={k} value={ELEMENTS[k].name}>{ELEMENTS[k].name}</option>)}
            </select>
          </label>
          <Button type="button" onClick={play}><Play size={15} /> Tocar</Button>
          <Button type="button" variant="ghost" aria-pressed={loop} className={loop ? 'lit text-bone' : ''} onClick={() => { setLoop((v) => !v); if (!loop) play(); }}><Repeat size={15} /> {loop ? 'Repetindo' : 'Repetir'}</Button>
        </div>
        <div className="mt-4 pane p-3 text-xs text-mist">
          <p className="flex items-center gap-1 text-bone"><Sparkles size={14} /> Usar num poder</p>
          <p className="mt-1">Dê ao poder o nome <span className="text-bone">“{spell.name}”</span>, ou ponha no cadastro <code className="text-bone">{`"animation": { "spell": "${spell.id}" }`}</code>.</p>
        </div>
      </section>
    </div>
  );
}
