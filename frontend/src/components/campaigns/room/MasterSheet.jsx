import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, ArrowUpFromLine, Backpack, ChevronDown, History, Maximize2, Minimize2, Minus, PackagePlus, Pencil, Plus, Send, Trash2, X
} from 'lucide-react';
import Button from '../../Button';
import ItemIcon from '../../icons/ItemIcon';
import { api } from '../../../lib/api';
import { ITEM_ICONS } from '../../../lib/icons/items.js';
import { WEAPON_ICONS } from '../../../lib/icons/weapons.js';
import { formatKg, inventoryLimitError, itemLoad, suggestWeight, unitWeight } from '../../../lib/itemWeight';
import { inventoryLimits } from '../../../lib/tableRules';
import { InventoryLoad, VitalBar } from './SheetsPanel';

// Ficha editavel do mestre na sala da campanha: tudo muda na hora (rotas /master/characters).
// O mestre pode passar do limite de peso/itens da mesa; a ficha so avisa.

const ATTRS = [['forca', 'Força'], ['agilidade', 'Agilidade'], ['presenca', 'Presença'], ['intelecto', 'Intelecto'], ['vigor', 'Vigor']];
const VITALS = [
  { label: 'Vida', color: '#7a1630', cur: 'lifeCurrent', max: 'lifeMax', curKey: 'life_current', maxKey: 'life_max', minMax: 1 },
  { label: 'Sanidade', color: 'var(--p-eter)', cur: 'sanityCurrent', max: 'sanityMax', curKey: 'sanity_current', maxKey: 'sanity_max', minMax: 1 },
  { label: 'Mana', color: 'var(--p-ponto)', cur: 'mana', max: 'manaMax', curKey: 'mana', maxKey: 'mana_max', minMax: 0 }
];
const COINS = [['gold', 'Ouro', 500], ['platinum', 'Platina', 100], ['silver', 'Prata', 10], ['bronze', 'Bronze', 1]];
const CATEGORIES = ['Armas', 'Armaduras', 'Comida', 'Poções', 'Ferramentas', 'Achados', 'Carteira', 'Outros'];
const CONDITIONS = ['Caído', 'Envenenado', 'Atordoado', 'Sangrando', 'Amedrontado', 'Cego', 'Paralisado', 'Inconsciente'];
const ELEMENTS = ['Érebo', 'Nix', 'Tártaro', 'Ananque', 'Éter', 'Gaia', 'Caos', 'Hemera', 'Ponto'];
const TRAINING = [0, 5, 10, 15];

// Opcoes do seletor de icone, agrupadas por categoria (montado uma vez so).
const ICON_GROUPS = (() => {
  const groups = new Map();
  for (const [id, spec] of [...Object.entries(ITEM_ICONS), ...Object.entries(WEAPON_ICONS)]) {
    const cat = spec.cat || 'Armas';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push([id, spec.label || id]);
  }
  return [...groups.entries()];
})();

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;
const pct = (value, max) => (max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0);

// Numero editavel: salva ao sair do campo ou no Enter.
function NumField({ value, onCommit, min, max, className = '', label }) {
  const [draft, setDraft] = useState(String(value ?? 0));
  useEffect(() => { setDraft(String(value ?? 0)); }, [value]);
  const commit = () => {
    const n = Number(String(draft).replace(',', '.'));
    if (String(draft).trim() === '' || !Number.isFinite(n)) { setDraft(String(value ?? 0)); return; }
    const clamped = Math.round(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)));
    if (clamped !== Number(value)) onCommit(clamped);
    else setDraft(String(value ?? 0));
  };
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={label}
      className={`field !mt-0 !px-1 text-center tabular ${className}`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
    />
  );
}

function Stepper({ value, onChange, min, max, label, big }) {
  const v = Number(value ?? 0);
  const h = big ? '!min-h-11 !w-11' : '!min-h-9 !w-9';
  return (
    <div className="flex items-center gap-1">
      <button type="button" className={`btn btn-glass ${h} !p-0`} disabled={min != null && v <= min} onClick={() => onChange(v - 1)} aria-label={`Diminuir ${label}`}><Minus size={14} /></button>
      <NumField value={v} min={min} max={max} onCommit={onChange} label={label} className={`${big ? 'min-h-11 !w-14 text-lg' : 'min-h-9 !w-12'}`} />
      <button type="button" className={`btn btn-glass ${h} !p-0`} disabled={max != null && v >= max} onClick={() => onChange(v + 1)} aria-label={`Aumentar ${label}`}><Plus size={14} /></button>
    </div>
  );
}

function Section({ title, children, right, className = '' }) {
  return (
    <section className={`gothic-panel p-3 sm:p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="font-display text-2xl leading-none text-bone">{title}</h4>
        {right}
      </div>
      {children}
    </section>
  );
}

function VitalCard({ field, sheet, onSave }) {
  const current = Number(sheet[field.curKey] ?? 0);
  const max = Number(sheet[field.maxKey] ?? 0);
  const set = (value) => onSave({ [field.cur]: Math.max(0, Math.min(max, value)) }, { [field.curKey]: Math.max(0, Math.min(max, value)) });
  return (
    <div className="pane p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-2xl leading-none text-bone">{field.label}</span>
        <span className="tabular text-2xl text-bone">{current}<span className="text-base text-mist"> / {max}</span></span>
      </div>
      <div className="mt-2 h-4 border-2 border-lead bg-black/60">
        <div className="h-full transition-[width] duration-500" style={{ width: `${pct(current, max)}%`, background: field.color, boxShadow: 'inset 0 0 8px rgba(255,255,255,.25)' }} />
      </div>
      <div className="mt-2 flex items-center gap-1">
        {[-5, -1].map((d) => <button key={d} type="button" className="btn btn-glass !min-h-10 flex-1 !px-0 tabular" onClick={() => set(current + d)} aria-label={`${d} de ${field.label}`}>{d}</button>)}
        <NumField value={current} min={0} max={max} onCommit={set} label={`${field.label} atual`} className="min-h-10 !w-16 text-lg" />
        {[1, 5].map((d) => <button key={d} type="button" className="btn btn-glass !min-h-10 flex-1 !px-0 tabular" onClick={() => set(current + d)} aria-label={`+${d} de ${field.label}`}>+{d}</button>)}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-sm text-mist">
        <button type="button" className="underline decoration-dotted hover:text-bone disabled:opacity-40" disabled={current >= max} onClick={() => set(max)}>Encher</button>
        <label className="flex items-center gap-2">Máximo
          <NumField value={max} min={field.minMax} max={100000} onCommit={(v) => onSave({ [field.max]: v })} label={`${field.label} máxima`} className="min-h-9 !w-20" />
        </label>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 px-2 py-3 sm:px-4" role="dialog" aria-modal="true" aria-label={title}>
      <section className="max-h-[94vh] w-full max-w-lg overflow-y-auto gothic-panel p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-bone">{title}</h2>
          <button type="button" className="grid h-11 w-11 place-items-center border-[3px] border-lead bg-glass text-mist hover:text-ember" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>,
    document.body
  );
}

function ItemModal({ state, containers, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', quantity: 1, weight: 0, category: 'Outros', description: '', defenseBonus: 0, ...(state.item || {}) });
  const [containerId, setContainerId] = useState(state.containerId || '');
  const editing = state.mode === 'edit';
  const nested = Boolean(containerId) || state.nested;
  const suggested = suggestWeight(form);
  const canSave = String(form.name || '').trim().length > 0;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const categories = CATEGORIES.includes(form.category) || !form.category ? CATEGORIES : [form.category, ...CATEGORIES];

  function submit(e) {
    e.preventDefault();
    if (!canSave) return;
    const { contents, ...rest } = form;
    const body = { ...rest, name: form.name.trim(), quantity: Number(form.quantity) || 0, weight: Number(form.weight) || 0, defenseBonus: Number(form.defenseBonus) || 0 };
    if (!body.icon) delete body.icon;
    if (nested) delete body.container; else body.container = Boolean(form.container);
    onSave(body, editing ? null : containerId || null);
  }

  return (
    <Modal title={editing ? 'Editar item' : 'Dar item ao jogador'} onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <div className="flex items-end gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center border-[3px] border-lead bg-glass" title={form.icon ? 'Ícone escolhido' : 'Ícone automático'}>
            <ItemIcon item={form} size={32} />
          </span>
          <label className="block min-w-0 flex-1 text-sm text-mist">Nome do item
            <input className="field min-h-11" value={form.name || ''} onChange={(e) => set({ name: e.target.value })} autoFocus maxLength={120} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-mist">Quantidade
            <input type="number" min="0" step="any" className="field min-h-11" value={form.quantity ?? 1} onChange={(e) => set({ quantity: e.target.value })} />
          </label>
          <label className="block text-sm text-mist">Peso (kg cada)
            <input type="number" min="0" step="0.05" className="field min-h-11" placeholder={`sugerido ${suggested}`} value={Number(form.weight) > 0 ? form.weight : ''} onChange={(e) => set({ weight: e.target.value })} />
          </label>
        </div>
        <p className="-mt-1 text-xs text-mist">
          Vazio = peso sugerido ({formatKg(suggested)}).
          {' '}Total: {formatKg(unitWeight({ ...form, weight: Number(form.weight) || 0 }) * (Number(form.quantity) || 0))}
          {Number(form.weight) <= 0 && <button type="button" className="ml-2 text-ember underline" onClick={() => set({ weight: suggested })}>usar {suggested}</button>}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-mist">Categoria
            <select className="field min-h-11" value={form.category || 'Outros'} onChange={(e) => set({ category: e.target.value })}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block text-sm text-mist">Bônus de defesa
            <input type="number" className="field min-h-11" value={form.defenseBonus ?? 0} onChange={(e) => set({ defenseBonus: e.target.value })} />
          </label>
        </div>
        <label className="block text-sm text-mist">Ícone
          <select className="field min-h-11" value={form.icon || ''} onChange={(e) => set({ icon: e.target.value || undefined })}>
            <option value="">Automático (pelo nome)</option>
            {ICON_GROUPS.map(([cat, list]) => (
              <optgroup key={cat} label={cat}>
                {list.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        {!editing && containers.length > 0 && (
          <label className="block text-sm text-mist">Onde guardar
            <select className="field min-h-11" value={containerId} onChange={(e) => setContainerId(e.target.value)}>
              <option value="">Solto no inventário</option>
              {containers.map((c) => <option key={c.id} value={c.id}>Dentro de {c.name}</option>)}
            </select>
          </label>
        )}
        {!nested && (
          <label className="flex min-h-11 items-center gap-2 text-sm text-bone">
            <input type="checkbox" className="h-5 w-5 accent-[var(--color-ember)]" checked={Boolean(form.container)} disabled={editing && form.contents?.length > 0} onChange={(e) => set({ container: e.target.checked })} />
            É um recipiente (mochila, bolsa, baú): guarda outros itens
          </label>
        )}
        <label className="block text-sm text-mist">Descrição
          <textarea className="field min-h-20" value={form.description || ''} onChange={(e) => set({ description: e.target.value })} maxLength={2000} />
        </label>
        <div className="grid gap-2 pt-1 sm:flex sm:justify-end">
          <Button type="button" variant="ghost" className="min-h-11 w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={!canSave}>{editing ? 'Salvar' : 'Dar item'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function PowerModal({ state, skills, onClose, onSave }) {
  const [type, setType] = useState(state.type || 'attacks');
  const [form, setForm] = useState({ name: '', damage: '1d6', manaCost: 0, range: '-', criticalValue: 20, criticalMultiplier: 2, skill: 'Luta', element: 'Érebo', description: '', ...(state.power || {}) });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const canSave = form.name.trim() && String(form.damage).trim();
  return (
    <Modal title={state.power ? 'Editar poder' : 'Dar ataque ou magia'} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (canSave) onSave(type, { ...form, name: form.name.trim() }); }}>
        {!state.power && (
          <div className="grid grid-cols-2 gap-2">
            {[['attacks', 'Ataque'], ['spells', 'Magia']].map(([key, label]) => (
              <button key={key} type="button" className={`btn ${type === key ? 'btn-lit' : 'btn-glass'} min-h-11`} onClick={() => setType(key)}>{label}</button>
            ))}
          </div>
        )}
        <label className="block text-sm text-mist">Nome
          <input className="field min-h-11" value={form.name} onChange={(e) => set({ name: e.target.value })} autoFocus maxLength={120} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-mist">Dano
            <input className="field min-h-11" value={form.damage} onChange={(e) => set({ damage: e.target.value })} placeholder="1d8+2" />
          </label>
          <label className="block text-sm text-mist">Custo de mana
            <input type="number" min="0" className="field min-h-11" value={form.manaCost} onChange={(e) => set({ manaCost: e.target.value })} />
          </label>
          <label className="block text-sm text-mist">Alcance
            <input className="field min-h-11" value={form.range} onChange={(e) => set({ range: e.target.value })} />
          </label>
          <label className="block text-sm text-mist">Perícia
            <select className="field min-h-11" value={form.skill} onChange={(e) => set({ skill: e.target.value })}>
              {[...new Set([form.skill, 'Luta', 'Pontaria', 'Ocultismo', ...skills.map((s) => s.name)])].filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="block text-sm text-mist">Crítico em
            <input type="number" min="1" max="20" className="field min-h-11" value={form.criticalValue} onChange={(e) => set({ criticalValue: e.target.value })} />
          </label>
          <label className="block text-sm text-mist">Multiplicador
            <input type="number" min="1" max="10" className="field min-h-11" value={form.criticalMultiplier} onChange={(e) => set({ criticalMultiplier: e.target.value })} />
          </label>
        </div>
        {type === 'spells' && (
          <label className="block text-sm text-mist">Elemento
            <select className="field min-h-11" value={form.element} onChange={(e) => set({ element: e.target.value })}>
              {[...new Set([form.element, ...ELEMENTS])].map((el) => <option key={el} value={el}>{el}</option>)}
            </select>
          </label>
        )}
        <label className="block text-sm text-mist">Descrição
          <textarea className="field min-h-20" value={form.description} onChange={(e) => set({ description: e.target.value })} />
        </label>
        <div className="grid gap-2 pt-1 sm:flex sm:justify-end">
          <Button type="button" variant="ghost" className="min-h-11 w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={!canSave}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}

// Linha de item: quantidade sempre a mao; tocar no nome abre as acoes (editar, guardar, passar, remover).
function ItemRow({ item, parent, containers, others, actions }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [target, setTarget] = useState('');
  const [giveQty, setGiveQty] = useState('');
  const qty = Number(item.quantity ?? 1);
  const isContainer = Boolean(item.container);
  const targets = containers.filter((c) => c.id !== item.id && c.id !== parent?.id);

  return (
    <li className={`pane ${parent ? 'p-1.5' : 'p-2'}`}>
      <div className="flex items-center gap-2">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className={`grid shrink-0 place-items-center border-2 border-lead bg-black/40 ${parent ? 'h-9 w-9' : 'h-11 w-11'}`}><ItemIcon item={item} size={parent ? 16 : 32} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-bone">{item.name}</span>
            <span className="block truncate text-xs text-mist">
              {item.category || 'Outros'} · {formatKg(itemLoad(item))}
              {qty !== 1 ? ` (${formatKg(unitWeight(item))} cada)` : ''}
              {Number(item.defenseBonus) ? ` · defesa +${item.defenseBonus}` : ''}
              {isContainer ? ` · ${item.contents?.length || 0} dentro` : ''}
            </span>
          </span>
          <ChevronDown size={14} className={`shrink-0 text-mist transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" className="btn btn-glass !min-h-9 !w-9 !p-0" onClick={() => (qty <= 1 ? setOpen(true) || setConfirm(true) : actions.quantity(item, qty - 1))} aria-label={`Tirar 1 ${item.name}`}><Minus size={14} /></button>
          <span className="w-8 text-center tabular text-bone">{qty}</span>
          <button type="button" className="btn btn-glass !min-h-9 !w-9 !p-0" onClick={() => actions.quantity(item, qty + 1)} aria-label={`Dar mais 1 ${item.name}`}><Plus size={14} /></button>
        </div>
      </div>
      {open && (
        <div className="mt-2 space-y-2 border-t-2 border-lead pt-2 text-sm">
          {item.description && <p className="whitespace-pre-wrap text-mist">{item.description}</p>}
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="btn btn-glass !min-h-9 text-sm" onClick={() => actions.edit(item, parent)}><Pencil size={14} /> Editar</button>
            {isContainer && <button type="button" className="btn btn-glass !min-h-9 text-sm" onClick={() => actions.addInto(item)}><PackagePlus size={14} /> Pôr item dentro</button>}
            {parent && <button type="button" className="btn btn-glass !min-h-9 text-sm" onClick={() => actions.move(item, null)}><ArrowUpFromLine size={14} /> Tirar de {parent.name}</button>}
            {!confirm
              ? <button type="button" className="btn btn-glass !min-h-9 text-sm text-red-200" onClick={() => setConfirm(true)}><Trash2 size={14} /> Remover</button>
              : (
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-red-200">Remover {item.name}{isContainer && item.contents?.length ? ' e o que tem dentro' : ''}?</span>
                  <button type="button" className="btn btn-lit !min-h-9 text-sm" onClick={() => actions.remove(item)}>Sim</button>
                  <button type="button" className="btn btn-glass !min-h-9 text-sm" onClick={() => setConfirm(false)}>Não</button>
                </span>
              )}
          </div>
          {!isContainer && targets.length > 0 && (
            <label className="flex flex-wrap items-center gap-2 text-mist"><Backpack size={14} /> Guardar em
              <select className="field !mt-0 min-h-9 !w-auto flex-1" value="" onChange={(e) => e.target.value && actions.move(item, e.target.value)}>
                <option value="">Escolher recipiente…</option>
                {targets.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          {others.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-mist">
              <Send size={14} /> Passar para
              <select className="field !mt-0 min-h-9 !w-auto min-w-[8rem] flex-1" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Escolher personagem…</option>
                {others.map((o) => <option key={o.id} value={o.id}>{o.character_name}</option>)}
              </select>
              {qty > 1 && <input type="number" min="1" max={qty} placeholder={`${qty}`} aria-label="Quantidade a passar" className="field !mt-0 min-h-9 !w-16 text-center" value={giveQty} onChange={(e) => setGiveQty(e.target.value)} />}
              <button type="button" className="btn btn-lit !min-h-9 text-sm" disabled={!target} onClick={() => { actions.transfer(item, target, Number(giveQty) || null); setTarget(''); setGiveQty(''); }}>Passar</button>
            </div>
          )}
        </div>
      )}
      {isContainer && item.contents?.length > 0 && (
        <ul className="ml-4 mt-2 space-y-1.5 border-l-2 border-lead pl-2">
          {item.contents.map((inner) => <ItemRow key={inner.id} item={inner} parent={item} containers={containers} others={others} actions={actions} />)}
        </ul>
      )}
    </li>
  );
}

function MasterLog({ base, reloadKey }) {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState(null);
  useEffect(() => {
    if (!open) return;
    api.get(`${base}/log`).then(({ data }) => setLog(data)).catch(() => setLog([]));
  }, [open, base, reloadKey]);
  return (
    <details className="gothic-panel p-3 sm:p-4" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="flex cursor-pointer items-center gap-2 font-display text-2xl text-bone"><History size={18} /> Alterações do mestre</summary>
      {open && (
        <ul className="mt-3 space-y-1 text-sm">
          {log === null && <li className="text-mist">Carregando…</li>}
          {log?.map((entry) => (
            <li key={entry.id} className="flex gap-2 border-b border-lead py-1">
              <span className="shrink-0 tabular text-mist">{new Date(entry.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-bone">{entry.summary}</span>
            </li>
          ))}
          {log?.length === 0 && <li className="text-mist">Nada alterado nas últimas 24 horas.</li>}
        </ul>
      )}
    </details>
  );
}

export default function MasterSheet({ campaignId, characterId, onBack, reloadKey, rules, others = [] }) {
  const base = `/campaigns/${campaignId}/master/characters/${characterId}`;
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [wide, setWide] = useState(false);
  const [itemModal, setItemModal] = useState(null);
  const [powerModal, setPowerModal] = useState(null);
  const [newCondition, setNewCondition] = useState('');
  const seq = useRef(0);
  const flashTimer = useRef(null);

  const reload = useCallback(() => {
    const my = seq.current;
    return api.get(`/campaigns/${campaignId}/characters/${characterId}`)
      .then(({ data }) => { if (my === seq.current) setSheet(data); })
      .catch(() => setError('Não foi possível abrir a ficha.'));
  }, [campaignId, characterId]);
  useEffect(() => { reload(); }, [reload, reloadKey]);
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const showFlash = (text) => {
    setFlash(text);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(''), 3000);
  };

  // Toda alteracao passa aqui: so a resposta mais nova vale (cliques rapidos nao voltam valor velho).
  async function run(request, okText) {
    const my = ++seq.current;
    try {
      const { data } = await request();
      if (my === seq.current && data?.character) setSheet(data.character);
      setError('');
      if (okText) showFlash(okText);
      if (data?.target?.warning) showFlash(`Entregue. ${data.target.warning}`);
      return data;
    } catch (err) {
      setError(errMsg(err, 'Não foi possível salvar agora.'));
      reload();
      return null;
    }
  }
  const patch = (body, optimistic) => {
    if (optimistic) setSheet((s) => ({ ...s, ...optimistic }));
    return run(() => api.patch(base, body));
  };

  const inventory = useMemo(() => sheet?.inventory || [], [sheet]);
  const containers = useMemo(() => inventory.filter((it) => it.container), [inventory]);
  const limits = useMemo(() => inventoryLimits(rules, sheet?.owner_id), [rules, sheet?.owner_id]);
  const overLimit = useMemo(() => {
    const msg = inventoryLimitError([], inventory, limits);
    return msg ? msg.replace(/^Mochila cheia: passa/, 'Acima do limite da mesa: passa') : null;
  }, [inventory, limits]);
  const transferTargets = others.filter((o) => o.id !== characterId);

  const itemActions = {
    quantity: (item, quantity) => run(() => api.put(`${base}/inventory/${encodeURIComponent(item.id)}`, { quantity })),
    edit: (item, parent) => setItemModal({ mode: 'edit', item, nested: Boolean(parent) }),
    addInto: (container) => setItemModal({ mode: 'add', containerId: container.id }),
    move: (item, containerId) => run(() => api.post(`${base}/inventory/${encodeURIComponent(item.id)}/move`, { containerId }), containerId ? 'Guardado.' : 'Tirado do recipiente.'),
    remove: (item) => run(() => api.delete(`${base}/inventory/${encodeURIComponent(item.id)}`), `${item.name} removido.`),
    transfer: (item, toCharacterId, quantity) => run(
      () => api.post(`${base}/inventory/${encodeURIComponent(item.id)}/transfer`, { toCharacterId, ...(quantity ? { quantity } : {}) }),
      `${item.name} entregue a ${others.find((o) => o.id === toCharacterId)?.character_name || 'outro personagem'}.`
    )
  };

  async function saveItem(body, containerId) {
    const editing = itemModal?.mode === 'edit';
    const done = await run(
      () => (editing
        ? api.put(`${base}/inventory/${encodeURIComponent(itemModal.item.id)}`, body)
        : api.post(`${base}/inventory`, { ...body, ...(containerId ? { containerId } : {}) })),
      editing ? 'Item salvo.' : `${body.name} entregue.`
    );
    if (done) setItemModal(null);
  }

  async function savePower(type, body) {
    const editing = Boolean(powerModal?.power);
    const done = await run(() => (editing
      ? api.put(`${base}/powers/${powerModal.type}/${encodeURIComponent(powerModal.power.id)}`, body)
      : api.post(`${base}/powers`, { ...body, type })), 'Poder salvo.');
    if (done) setPowerModal(null);
  }

  const conditions = Array.isArray(sheet?.conditions) ? sheet.conditions : [];
  const setConditions = (list) => patch({ conditions: list }, { conditions: list });
  const addCondition = (name) => {
    const clean = String(name || '').trim().slice(0, 40);
    if (!clean || conditions.some((c) => c.toLowerCase() === clean.toLowerCase())) return;
    setConditions([...conditions, clean]);
    setNewCondition('');
  };

  if (error && !sheet) return <p className="p-4 text-mist">{error}</p>;
  if (!sheet) return <p className="p-4 text-mist">Abrindo ficha…</p>;

  const wallet = sheet.wallet || {};
  const skills = sheet.skills_catalog || [];
  const armorBonus = Number(sheet.total_defense ?? sheet.defense) - Number(sheet.defense ?? 0);
  const col = wide ? 'grid gap-4 lg:grid-cols-2 lg:items-start' : 'space-y-4';

  const content = (
    <div className={`space-y-4 ${wide ? 'mx-auto max-w-6xl' : 'p-3'}`}>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="flex min-h-10 items-center gap-1 text-sm text-mist hover:text-bone"><ArrowLeft size={14} /> Todas as fichas</button>
        <button type="button" className="btn btn-glass !min-h-10 text-sm" onClick={() => setWide((w) => !w)}>
          {wide ? <><Minimize2 size={14} /> Painel</> : <><Maximize2 size={14} /> Tela cheia</>}
        </button>
      </div>

      <header className="gothic-panel flex items-center gap-3 p-3">
        {sheet.photo
          ? <img src={sheet.photo} alt="" className="h-16 w-16 shrink-0 border-[3px] border-lead object-cover" />
          : <div className="grid h-16 w-16 shrink-0 place-items-center border-[3px] border-lead bg-glass font-display text-3xl text-ember">{sheet.character_name?.[0]}</div>}
        <div className="min-w-0 flex-1">
          <TextField value={sheet.character_name} label="Nome do personagem" className="font-display !text-2xl" onCommit={(characterName) => patch({ characterName }, { character_name: characterName })} />
          <p className="mt-1 truncate text-sm text-mist">{[sheet.race_name, sheet.class_name, sheet.origin_name || sheet.origin].filter(Boolean).join(' · ')} · jogador {sheet.player_name}</p>
        </div>
        <div className="shrink-0 text-center">
          <p className="text-xs text-mist">Nível</p>
          <Stepper value={sheet.level} min={1} max={20} label="nível" onChange={(level) => patch({ level }, { level })} />
        </div>
      </header>

      {(error || flash || overLimit) && (
        <div role="status" className="space-y-1 text-sm">
          {error && <p className="border-2 border-lead bg-[#2a0b12] px-3 py-2 text-red-100">{error}</p>}
          {flash && <p className="lit border-2 border-lead px-3 py-2">{flash}</p>}
          {overLimit && <p className="border-2 border-lead bg-black/50 px-3 py-2 text-ember">{overLimit} (o mestre pode passar; o jogador não consegue pegar mais nada).</p>}
        </div>
      )}

      <div className={col}>
        <div className="space-y-4">
          <Section title="Vitais">
            <div className="grid gap-2">
              {VITALS.map((field) => <VitalCard key={field.cur} field={field} sheet={sheet} onSave={patch} />)}
            </div>
          </Section>

          <Section title="Combate">
            <div className="grid grid-cols-2 gap-2">
              <div className="pane p-2 text-center">
                <p className="text-sm text-mist">Defesa base</p>
                <div className="mt-1 flex justify-center"><Stepper big value={sheet.defense} min={0} max={1000} label="defesa" onChange={(defense) => patch({ defense }, { defense, total_defense: defense + armorBonus })} /></div>
                <p className="mt-1 text-xs text-mist">Total {sheet.total_defense ?? sheet.defense}{armorBonus ? ` (itens +${armorBonus})` : ''}</p>
              </div>
              <div className="pane grid place-items-center p-2 text-center">
                <div><p className="text-sm text-mist">Esquiva</p><p className="font-display text-4xl leading-tight text-bone tabular">{sheet.dodge}</p><p className="text-xs text-mist">vem da Agilidade</p></div>
              </div>
            </div>
          </Section>

          <Section title="Atributos">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ATTRS.map(([key, label]) => (
                <div key={key} className="pane p-2 text-center">
                  <p className="text-sm text-mist">{label}</p>
                  <div className="mt-1 flex justify-center">
                    <Stepper value={sheet.attributes?.[key] ?? 2} min={-20} max={100} label={label} onChange={(v) => patch({ attributes: { [key]: v } }, { attributes: { ...sheet.attributes, [key]: v } })} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Condições">
            <div className="flex flex-wrap gap-1.5">
              {conditions.map((c) => (
                <span key={c} className="lit inline-flex items-center gap-1 border-2 border-lead px-2 py-1 text-sm">
                  {c}
                  <button type="button" className="text-mist hover:text-bone" onClick={() => setConditions(conditions.filter((x) => x !== c))} aria-label={`Tirar ${c}`}><X size={13} /></button>
                </span>
              ))}
              {!conditions.length && <span className="text-sm text-mist">Nenhuma condição.</span>}
            </div>
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); addCondition(newCondition); }}>
              <input className="field !mt-0 min-h-10 flex-1" placeholder="Nova condição" value={newCondition} maxLength={40} onChange={(e) => setNewCondition(e.target.value)} />
              <Button type="submit" variant="ghost" className="!min-h-10" disabled={!newCondition.trim()}><Plus size={14} /></Button>
            </form>
            <div className="mt-2 flex flex-wrap gap-1">
              {CONDITIONS.filter((c) => !conditions.includes(c)).map((c) => (
                <button key={c} type="button" className="border-2 border-lead bg-black/40 px-2 py-0.5 text-xs text-mist hover:text-bone" onClick={() => addCondition(c)}>+ {c}</button>
              ))}
            </div>
          </Section>

          <Section title="Dinheiro" right={<span className="tabular text-ember">{sheet.wallet_total_dracmas ?? 0} dracmas</span>}>
            <div className="grid grid-cols-2 gap-2">
              {COINS.map(([coin, label, value]) => (
                <div key={coin} className="pane p-2 text-center">
                  <p className="text-sm text-mist">{label} <span className="text-xs">({value})</span></p>
                  <div className="mt-1 flex justify-center">
                    <Stepper value={wallet[coin] ?? 0} min={0} max={1000000} label={label} onChange={(v) => {
                      const next = { ...wallet, [coin]: v };
                      const total = COINS.reduce((sum, [k, , mult]) => sum + Number(next[k] || 0) * mult, 0);
                      patch({ wallet: next }, { wallet: next, wallet_total_dracmas: total });
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <details className="gothic-panel p-3 sm:p-4">
            <summary className="cursor-pointer font-display text-2xl text-bone">Perícias</summary>
            <p className="mt-1 text-xs text-mist">Treino 0/5/10/15 e outros bônus.</p>
            <ul className="mt-2 space-y-1">
              {skills.map((s) => (
                <li key={s.key} className="flex items-center gap-2 border-b border-lead py-1 text-sm">
                  <span className="min-w-0 flex-1 truncate text-bone">{s.name}</span>
                  <select aria-label={`Treino em ${s.name}`} className="field !mt-0 min-h-9 !w-16 !px-1" value={Number(sheet.skills?.[s.key] ?? 0)} onChange={(e) => {
                    const v = Number(e.target.value);
                    patch({ skills: { [s.key]: v } }, { skills: { ...sheet.skills, [s.key]: v } });
                  }}>
                    {TRAINING.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <NumField value={Number(sheet.skill_bonuses?.[s.key] ?? 0)} min={-100} max={100} label={`Bônus em ${s.name}`} className="min-h-9 !w-14"
                    onCommit={(v) => patch({ skillBonuses: { [s.key]: v } }, { skill_bonuses: { ...sheet.skill_bonuses, [s.key]: v } })} />
                </li>
              ))}
            </ul>
          </details>
        </div>

        <div className="space-y-4">
          <Section title="Inventário" right={<Button className="!min-h-10 text-sm" onClick={() => setItemModal({ mode: 'add' })}><Plus size={14} /> Dar item</Button>}>
            <InventoryLoad inventory={inventory} limits={limits} />
            <ul className="mt-3 space-y-1.5">
              {inventory.map((item) => <ItemRow key={item.id} item={item} parent={null} containers={containers} others={transferTargets} actions={itemActions} />)}
              {!inventory.length && <li className="py-2 text-mist">Inventário vazio.</li>}
            </ul>
          </Section>

          <Section title="Ataques e magias" right={<Button variant="ghost" className="!min-h-10 text-sm" onClick={() => setPowerModal({ type: 'attacks' })}><Plus size={14} /> Dar</Button>}>
            {[['attacks', 'Ataques'], ['spells', 'Magias']].map(([type, title]) => (
              <div key={type} className="mb-2">
                <p className="text-sm text-mist">{title}</p>
                <ul className="mt-1 space-y-1">
                  {(sheet[type] || []).map((p) => (
                    <li key={p.id} className="pane flex items-center gap-2 p-2 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-bone">{p.name}</span>
                        <span className="block truncate text-xs text-mist">{p.damage} · crít {p.criticalValue}/×{p.criticalMultiplier}{p.manaCost ? ` · ${p.manaCost} mana` : ''}{p.range && p.range !== '-' ? ` · ${p.range}` : ''}</span>
                      </span>
                      <button type="button" className="btn btn-glass !min-h-9 !w-9 !p-0" onClick={() => setPowerModal({ type, power: p })} aria-label={`Editar ${p.name}`}><Pencil size={14} /></button>
                      <button type="button" className="btn btn-glass !min-h-9 !w-9 !p-0 text-red-200" onClick={() => run(() => api.delete(`${base}/powers/${type}/${encodeURIComponent(p.id)}`), `${p.name} removido.`)} aria-label={`Remover ${p.name}`}><Trash2 size={14} /></button>
                    </li>
                  ))}
                  {!sheet[type]?.length && <li className="text-sm text-mist">Nenhum.</li>}
                </ul>
              </div>
            ))}
          </Section>

          <Section title="Anotações">
            <NotesField value={sheet.notes || ''} onCommit={(notes) => patch({ notes }, { notes })} />
          </Section>

          <MasterLog base={base} reloadKey={reloadKey} />
        </div>
      </div>

      {itemModal && <ItemModal state={itemModal} containers={containers} onClose={() => setItemModal(null)} onSave={saveItem} />}
      {powerModal && <PowerModal state={powerModal} skills={skills} onClose={() => setPowerModal(null)} onSave={savePower} />}
    </div>
  );

  if (wide) {
    return createPortal(
      <div className="fixed inset-0 z-[65] overflow-y-auto px-3 py-4 sm:px-6" style={{ background: 'var(--color-abyss)' }}>{content}</div>,
      document.body
    );
  }
  return content;
}

function TextField({ value, onCommit, label, className = '' }) {
  const [draft, setDraft] = useState(value || '');
  useEffect(() => { setDraft(value || ''); }, [value]);
  return (
    <input
      aria-label={label}
      className={`field !mt-0 min-h-10 w-full !px-2 text-bone ${className}`}
      value={draft}
      maxLength={120}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { const clean = draft.trim(); if (clean && clean !== value) onCommit(clean); else setDraft(value || ''); }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
    />
  );
}

function NotesField({ value, onCommit }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  return (
    <>
      <textarea
        className="field min-h-28"
        placeholder="Anotações da ficha (o jogador também vê)."
        value={draft}
        maxLength={20000}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft !== value) onCommit(draft); }}
      />
      <p className="mt-1 text-xs text-mist">Salva ao sair do campo.</p>
    </>
  );
}

// Visao geral do mestre: todos os personagens com vitais, carga e condicoes; um toque abre a ficha.
export function MasterOverview({ campaignId, list, onOpen, onChanged }) {
  async function step(c, field, delta) {
    const max = Number(c[field.maxKey] ?? 0);
    const next = Math.max(0, Math.min(max, Number(c[field.curKey] ?? 0) + delta));
    try {
      await api.patch(`/campaigns/${campaignId}/master/characters/${c.id}`, { [field.cur]: next });
      onChanged?.();
    } catch { /* a lista recarrega no proximo evento */ }
  }
  if (list === null) return <p className="py-4 text-mist">Carregando fichas…</p>;
  if (!list.length) return <p className="py-4 text-mist">Nenhum jogador mostrou a ficha ainda.</p>;
  return (
    <ul className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' }}>
      {list.map((c) => {
        const weightPct = c.limits?.maxWeight ? (c.load?.weight || 0) / c.limits.maxWeight : 0;
        return (
          <li key={c.id} className="gothic-panel p-3">
            <button type="button" onClick={() => onOpen(c.id)} className="chapter-row flex w-full items-center gap-3 text-left">
              {c.photo
                ? <img src={c.photo} alt="" className="h-12 w-12 shrink-0 border-2 border-lead object-cover" />
                : <span className="grid h-12 w-12 shrink-0 place-items-center border-2 border-lead font-display text-2xl" style={{ background: c.member?.color || 'var(--glass-1)' }}>{c.character_name?.[0]}</span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-2xl leading-none text-bone">{c.character_name}</span>
                <span className="block truncate text-sm text-mist">{c.member?.name} · nível {c.level ?? 1}</span>
              </span>
              <span className="shrink-0 text-sm text-ember">Abrir</span>
            </button>
            <div className="mt-2 space-y-1.5">
              {VITALS.map((field) => (
                <VitalBar key={field.cur} compact label={field.label} color={field.color} current={Number(c[field.curKey] ?? 0)} max={Number(c[field.maxKey] ?? 0)} onStep={(d) => step(c, field, d)} />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-center text-xs">
              <span className="border-2 border-lead bg-black/40 py-1"><span className="block text-mist">Defesa</span><span className="tabular text-base text-bone">{c.total_defense}</span></span>
              <span className="border-2 border-lead bg-black/40 py-1"><span className="block text-mist">Esquiva</span><span className="tabular text-base text-bone">{c.dodge}</span></span>
              <span className="border-2 border-lead bg-black/40 py-1"><span className="block text-mist">Dracmas</span><span className="tabular text-base text-bone">{c.wallet_total_dracmas}</span></span>
            </div>
            <div className="mt-2 text-xs">
              <p className="flex justify-between gap-2">
                <span className="text-mist">Carga · {c.load?.count ?? 0} {c.load?.count === 1 ? 'item' : 'itens'}{c.limits?.maxItems != null ? ` / ${c.limits.maxItems}` : ''}</span>
                <span className={`tabular ${c.warning ? 'text-ember' : 'text-bone'}`}>{formatKg(c.load?.weight || 0)}{c.limits?.maxWeight != null ? ` / ${formatKg(c.limits.maxWeight)}` : ''}</span>
              </p>
              {c.limits?.maxWeight != null && (
                <div className="mt-1 h-1.5 border border-lead bg-black/60"><div className="h-full" style={{ width: `${Math.min(100, weightPct * 100)}%`, background: weightPct > 0.9 ? '#a3182f' : 'var(--color-ember)' }} /></div>
              )}
              {c.warning && <p className="mt-1 text-ember">{c.warning}</p>}
            </div>
            {c.conditions?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {c.conditions.map((x) => <span key={x} className="lit border-2 border-lead px-1.5 text-xs">{x}</span>)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

