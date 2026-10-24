import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { api } from '../../../lib/api';

// Pontos rapidos do mestre: soma ou tira vida, sanidade ou mana de um ou varios personagens
// de uma vez ("tira 5 de vida", "gastou 3 de mana"). A ficha completa fica na aba Fichas.
const VITALS = [
  { key: 'life', label: 'Vida', color: '#7a1630', cur: 'life_current', max: 'life_max' },
  { key: 'sanity', label: 'Sanidade', color: 'var(--p-eter)', cur: 'sanity_current', max: 'sanity_max' },
  { key: 'mana', label: 'Mana', color: 'var(--p-ponto)', cur: 'mana', max: 'mana_max' }
];
const AMOUNTS = [1, 2, 3, 5, 10];

export default function QuickPoints({ campaignId, reloadKey }) {
  const [list, setList] = useState(null);
  const [selected, setSelected] = useState([]);
  const [amount, setAmount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get(`/campaigns/${campaignId}/master/characters`)
      .then(({ data }) => {
        setList(data);
        // mantem a escolha; com um personagem so, ja vem marcado
        setSelected((cur) => {
          const kept = cur.filter((id) => data.some((c) => c.id === id));
          return kept.length || data.length !== 1 ? kept : [data[0].id];
        });
      })
      .catch(() => setList((cur) => cur || []));
  }, [campaignId, reloadKey]);

  const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const allOn = list?.length > 0 && selected.length === list.length;

  async function apply(vital, sign) {
    const delta = sign * Math.abs(Math.round(Number(amount) || 0));
    if (!delta || !selected.length) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/campaigns/${campaignId}/master/points`, { characterIds: selected, vital: vital.key, delta });
      setList((cur) => cur.map((c) => ({ ...c, ...(data.find((row) => row.id === c.id) || {}) })));
      const names = data.map((row) => `${row.character_name} ${row[vital.cur]}/${row[vital.max]}`).join(', ');
      setMessage({ text: `${delta > 0 ? '+' : ''}${delta} de ${vital.label.toLowerCase()}: ${names}`, error: false });
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Não deu para ajustar agora.', error: true });
    } finally {
      setBusy(false);
    }
  }

  if (list === null) return <p className="text-sm text-mist">Carregando personagens…</p>;
  if (!list.length) return <p className="text-sm text-mist">Nenhum jogador mostrou a ficha ainda.</p>;

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-mist">Em quem</span>
          <button type="button" className="text-ember underline" onClick={() => setSelected(allOn ? [] : list.map((c) => c.id))}>{allOn ? 'Nenhum' : 'Todos'}</button>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))' }}>
          {list.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button key={c.id} type="button" aria-pressed={on} onClick={() => toggle(c.id)}
                className={`border-[3px] border-lead px-2 py-1.5 text-left ${on ? 'lit' : 'bg-black/40 text-mist'}`}>
                <span className="block truncate font-display text-lg leading-tight">{c.character_name}</span>
                <span className="block truncate text-[11px] tabular">
                  V {c.life_current}/{c.life_max} · S {c.sanity_current}/{c.sanity_max} · M {c.mana}/{c.mana_max}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className="text-sm text-mist">Quanto</span>
        <div className="mt-1 flex items-center gap-1.5">
          <button type="button" className="btn btn-glass !min-h-11 !w-11 !p-0" onClick={() => setAmount((a) => Math.max(1, (Number(a) || 1) - 1))} aria-label="Diminuir quantidade"><Minus size={16} /></button>
          <input type="number" min="1" inputMode="numeric" aria-label="Quantidade de pontos" className="field !mt-0 min-h-11 !w-20 !px-1 text-center font-display text-2xl tabular"
            value={amount} onChange={(e) => setAmount(e.target.value)} onFocus={(e) => e.target.select()} />
          <button type="button" className="btn btn-glass !min-h-11 !w-11 !p-0" onClick={() => setAmount((a) => (Number(a) || 0) + 1)} aria-label="Aumentar quantidade"><Plus size={16} /></button>
          <div className="flex flex-1 flex-wrap justify-end gap-1">
            {AMOUNTS.map((n) => (
              <button key={n} type="button" className={`min-h-9 min-w-9 border-2 border-lead px-1.5 text-sm tabular ${Number(amount) === n ? 'lit' : 'bg-black/40 text-mist'}`} onClick={() => setAmount(n)}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {VITALS.map((vital) => (
          <div key={vital.key} className="grid grid-cols-[5.5rem_1fr_1fr] items-center gap-1.5">
            <span className="flex items-center gap-1.5 font-display text-xl text-bone"><span className="h-3 w-3 border border-lead" style={{ background: vital.color }} />{vital.label}</span>
            <button type="button" className="btn btn-glass !min-h-12 text-base" disabled={busy || !selected.length} onClick={() => apply(vital, -1)}>
              <Minus size={16} /> {Number(amount) || 0}
            </button>
            <button type="button" className="btn btn-lit !min-h-12 text-base" disabled={busy || !selected.length} onClick={() => apply(vital, 1)}>
              <Plus size={16} /> {Number(amount) || 0}
            </button>
          </div>
        ))}
      </div>
      {!selected.length && <p className="text-xs text-mist">Escolha pelo menos um personagem.</p>}
      {message && <p role="status" className={`text-sm ${message.error ? 'text-red-200' : 'text-bone'}`}>{message.text}</p>}
    </div>
  );
}
