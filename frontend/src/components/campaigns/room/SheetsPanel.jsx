import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Minus, Plus } from 'lucide-react';
import Button from '../../Button';
import { api } from '../../../lib/api';
import ItemIcon from '../../icons/ItemIcon';
import { formatKg, inventoryLoad, itemLoad } from '../../../lib/itemWeight';
import { inventoryLimits } from '../../../lib/tableRules';

// Fichas na campanha: o jogador escolhe qual ficha o mestre ve; o mestre abre a ficha inteira e mexe nos vitais.
const VITALS = [
  ['life', 'Vida', '#7a1630'],
  ['sanity', 'Sanidade', 'var(--p-eter)'],
  ['mana', 'Mana', 'var(--p-ponto)']
];

export function VitalBar({ label, current = 0, max = 0, color, onStep, compact }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-mist">{label}</span>
        <span className="tabular text-bone">{current}<span className="text-mist"> / {max}</span></span>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        {onStep && <button type="button" className="btn btn-glass !min-h-8 !w-8 !p-0" onClick={() => onStep(-1)} aria-label={`Tirar 1 de ${label}`}><Minus size={14} /></button>}
        <div className={`relative flex-1 border-2 border-lead bg-black/60 ${compact ? 'h-2.5' : 'h-3.5'}`}>
          <div className="h-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color, boxShadow: 'inset 0 0 8px rgba(255,255,255,.25)' }} />
        </div>
        {onStep && <button type="button" className="btn btn-glass !min-h-8 !w-8 !p-0" onClick={() => onStep(1)} aria-label={`Somar 1 de ${label}`}><Plus size={14} /></button>}
      </div>
    </div>
  );
}

export function vitalOf(sheet, kind) {
  const current = sheet?.[`${kind}_current`] ?? (kind === 'mana' ? sheet?.mana : 0);
  return { current: Number(current ?? 0), max: Number(sheet?.[`${kind}_max`] ?? 0) };
}

// Carga do inventario contra o limite do mestre (peso e quantidade de itens; sem limite = so o total).
export function InventoryLoad({ inventory, limits }) {
  const load = inventoryLoad(inventory);
  const rows = [
    ['Peso', formatKg(load.weight), limits.maxWeight != null ? formatKg(limits.maxWeight) : null, limits.maxWeight ? load.weight / limits.maxWeight : 0],
    ['Itens', String(load.count), limits.maxItems != null ? String(limits.maxItems) : null, limits.maxItems ? load.count / limits.maxItems : 0]
  ];
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
      {rows.map(([label, value, max, pct]) => (
        <div key={label} className="border-2 border-lead bg-black/40 px-2 py-1">
          <p className="flex justify-between gap-1"><span className="text-mist">{label}</span><span className={`tabular ${pct > 1 ? 'text-ember' : 'text-bone'}`}>{value}{max ? <span className="text-mist"> / {max}</span> : <span className="text-mist"> · sem limite</span>}</span></p>
          {max && <div className="mt-1 h-1.5 border border-lead bg-black/60"><div className="h-full" style={{ width: `${Math.min(100, pct * 100)}%`, background: pct > 0.9 ? '#a3182f' : 'var(--color-ember)' }} /></div>}
        </div>
      ))}
    </div>
  );
}

function FullSheet({ campaignId, characterId, isMaster, onBack, reloadKey, rules }) {
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/campaigns/${campaignId}/characters/${characterId}`)
      .then(({ data }) => setSheet(data))
      .catch(() => setError('Não foi possível abrir a ficha.'));
  }, [campaignId, characterId, reloadKey]);

  async function step(kind, delta) {
    const key = `${kind}_current`;
    const { current, max } = vitalOf(sheet, kind);
    const next = Math.max(0, Math.min(max, current + delta));
    setSheet((s) => ({ ...s, [key]: next, ...(kind === 'mana' ? { mana: next } : {}) }));
    try {
      const { data } = await api.patch(`/campaigns/${campaignId}/characters/${characterId}/vitals`, { [key]: next });
      setSheet((s) => ({ ...s, ...data }));
    } catch {
      setError('Não foi possível ajustar agora.');
    }
  }

  if (error) return <p className="p-4 text-mist">{error}</p>;
  if (!sheet) return <p className="p-4 text-mist">Abrindo ficha…</p>;
  const vital = (kind) => vitalOf(sheet, kind);
  const skills = (sheet.skills_catalog || []).map((s) => ({ ...s, training: Number(sheet.skills?.[s.key] ?? 0), other: Number(sheet.skill_bonuses?.[s.key] ?? 0) }))
    .filter((s) => s.training || s.other);

  return (
    <div className="space-y-5 p-3">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-mist hover:text-bone"><ArrowLeft size={14} /> Todas as fichas</button>
      <header className="flex items-center gap-3">
        {sheet.photo ? <img src={sheet.photo} alt="" className="h-16 w-16 border-[3px] border-lead object-cover" /> : <div className="grid h-16 w-16 place-items-center border-[3px] border-lead bg-glass font-display text-3xl text-ember">{sheet.character_name?.[0]}</div>}
        <div className="min-w-0">
          <h3 className="font-display text-3xl leading-none text-bone">{sheet.character_name}</h3>
          <p className="mt-1 text-sm text-mist">{[sheet.race_name, sheet.class_name, sheet.origin_name || sheet.origin].filter(Boolean).join(' · ')} · nível {sheet.level}</p>
          <p className="text-sm text-mist">Jogador: {sheet.player_name}</p>
        </div>
      </header>
      <div className="space-y-3">
        {VITALS.map(([kind, label, color]) => <VitalBar key={kind} label={label} color={color} {...vital(kind)} onStep={(d) => step(kind, d)} />)}
      </div>
      <dl className="grid grid-cols-5 gap-1 text-center">
        {[['forca', 'For'], ['agilidade', 'Agi'], ['presenca', 'Pre'], ['intelecto', 'Int'], ['vigor', 'Vig']].map(([k, l]) => (
          <div key={k} className="border-2 border-lead bg-black/40 py-1.5">
            <dt className="text-[11px] text-mist">{l}</dt>
            <dd className="font-display text-2xl text-bone tabular">{sheet.attributes?.[k] ?? 2}</dd>
          </div>
        ))}
      </dl>
      <dl className="grid grid-cols-3 gap-1 text-center text-sm">
        <div className="border-2 border-lead bg-black/40 py-2"><dt className="text-mist">Defesa</dt><dd className="font-display text-2xl text-bone tabular">{sheet.total_defense ?? sheet.defense}</dd></div>
        <div className="border-2 border-lead bg-black/40 py-2"><dt className="text-mist">Esquiva</dt><dd className="font-display text-2xl text-bone tabular">{sheet.dodge}</dd></div>
        <div className="border-2 border-lead bg-black/40 py-2"><dt className="text-mist">Dracmas</dt><dd className="font-display text-2xl text-bone tabular">{sheet.wallet_total_dracmas ?? 0}</dd></div>
      </dl>
      {skills.length > 0 && (
        <section>
          <h4 className="font-display text-xl text-bone">Perícias treinadas</h4>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {skills.map((s) => <li key={s.key} className="flex justify-between border-b border-lead py-1"><span className="text-mist">{s.name}</span><span className="tabular text-bone">+{s.training + s.other}</span></li>)}
          </ul>
        </section>
      )}
      {[['Ataques', sheet.attacks], ['Magias', sheet.spells]].map(([title, list]) => (list?.length ? (
        <section key={title}>
          <h4 className="font-display text-xl text-bone">{title}</h4>
          <ul className="mt-2 space-y-1 text-sm">
            {list.map((p) => <li key={p.id || p.name} className="flex justify-between gap-2 border-b border-lead py-1"><span className="text-bone">{p.name}</span><span className="tabular text-mist">{p.damage}{p.manaCost ? ` · ${p.manaCost} mana` : ''}</span></li>)}
          </ul>
        </section>
      ) : null))}
      <section>
        <h4 className="font-display text-xl text-bone">Inventário</h4>
        <InventoryLoad inventory={sheet.inventory || []} limits={inventoryLimits(rules, sheet.owner_id)} />
        <ul className="mt-2 space-y-1 text-sm">
          {(sheet.inventory || []).map((it) => (
            <li key={it.id || it.name} className="border-b border-lead py-1">
              <p className="flex items-center gap-2"><ItemIcon item={it} size={16} /><span className="min-w-0 flex-1 truncate text-bone">{it.name}</span><span className="tabular text-mist">×{it.quantity ?? 1} · {formatKg(itemLoad(it))}</span></p>
              {it.contents?.length > 0 && (
                <ul className="ml-6 mt-1 space-y-0.5 border-l-2 border-lead pl-2 text-xs">
                  {it.contents.map((c) => <li key={c.id || c.name} className="flex justify-between gap-2"><span className="truncate text-mist">{c.name}</span><span className="tabular text-mist">×{c.quantity ?? 1} · {formatKg(itemLoad(c))}</span></li>)}
                </ul>
              )}
            </li>
          ))}
          {!sheet.inventory?.length && <li className="py-1 text-mist">Inventário vazio.</li>}
        </ul>
      </section>
      {!isMaster && <Link to={`/characters/${characterId}`} className="inline-flex items-center gap-1 text-ember underline">Abrir ficha completa <ExternalLink size={14} /></Link>}
    </div>
  );
}

export default function SheetsPanel({ campaignId, members, myCharacters, myMember, isMaster, onShare, sharing, reloadKey, rules }) {
  const [open, setOpen] = useState(null);
  const [choice, setChoice] = useState(myMember?.shared_character_id || '');
  useEffect(() => { setChoice(myMember?.shared_character_id || ''); }, [myMember?.shared_character_id]);

  if (open) return <div className="h-full overflow-y-auto"><FullSheet campaignId={campaignId} characterId={open} isMaster={isMaster} onBack={() => setOpen(null)} reloadKey={reloadKey} rules={rules} /></div>;

  const shared = members.filter((m) => m.shared_character_id);
  return (
    <div className="h-full space-y-5 overflow-y-auto p-3">
      {!isMaster && (
        <section className="gothic-panel p-4">
          <h3 className="font-display text-2xl text-bone">Sua ficha nesta campanha</h3>
          <p className="mt-1 text-sm text-mist">O mestre vê a ficha escolhida inteira, e ela vira seu token, seu nome e sua foto na mesa.</p>
          <label className="mt-3 block text-sm text-mist" htmlFor="share-select">Personagem</label>
          <select id="share-select" className="field" value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">Nenhum (não compartilhar)</option>
            {myCharacters.map((c) => <option key={c.id} value={c.id}>{c.character_name}</option>)}
          </select>
          {!myCharacters.length && <p className="mt-2 text-sm text-mist">Você ainda não tem fichas. <Link to="/characters/new" className="text-ember underline">Criar ficha</Link></p>}
          <Button className="mt-3 w-full" disabled={sharing || choice === (myMember?.shared_character_id || '')} onClick={() => onShare(choice || null)}>
            {sharing ? 'Salvando…' : choice ? 'Mostrar esta ficha ao mestre' : 'Parar de compartilhar'}
          </Button>
        </section>
      )}
      <section>
        <h3 className="font-display text-2xl text-bone">{isMaster ? 'Fichas dos jogadores' : 'Fichas na mesa'}</h3>
        <ul className="mt-2 border-t-[3px] border-lead">
          {shared.map((m) => {
            const c = m.shared_character || {};
            const canOpen = isMaster || m.user_id === myMember?.user_id;
            return (
              <li key={m.user_id} className="border-b-[3px] border-lead">
                <button type="button" disabled={!canOpen} onClick={() => setOpen(m.shared_character_id)} className="chapter-row flex w-full items-center gap-3 px-1 py-3 text-left disabled:cursor-default">
                  {c.photo ? <img src={c.photo} alt="" className="h-11 w-11 border-2 border-lead object-cover" /> : <span className="grid h-11 w-11 place-items-center border-2 border-lead font-display text-xl" style={{ background: m.color || 'var(--glass-1)' }}>{(c.character_name || m.name)?.[0]}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl text-bone">{c.character_name || m.display_name}</span>
                    <span className="block text-sm text-mist">{m.name} · nível {c.level ?? 1}</span>
                  </span>
                  {canOpen && <span className="text-sm text-ember">Abrir</span>}
                </button>
              </li>
            );
          })}
          {!shared.length && <li className="py-4 text-mist">Nenhum jogador mostrou a ficha ainda.</li>}
        </ul>
      </section>
    </div>
  );
}
