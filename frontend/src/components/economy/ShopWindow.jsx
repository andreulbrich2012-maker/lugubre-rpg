import { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, Hourglass, Lock, Minus, Plus, X } from 'lucide-react';
import AvatarSprite from '../avatar/AvatarSprite';
import ItemIcon from '../icons/ItemIcon';
import { api } from '../../lib/api';
import { formatKg } from '../../lib/itemWeight';
import { categoryLabel, coinsLabel, MAX_RENT_DAYS } from '../../lib/economy/pricing';
import './economy.css';

// Janela da loja (jeito Stardew): o mercador, a bolsa do personagem e as abas Comprar / Vender /
// Alugar. O jogador so ve o preco final; o servidor confere tudo de novo (alcance, dracmas,
// mochila, modo da mesa).

const TABS = [['buy', 'Comprar'], ['sell', 'Vender'], ['rent', 'Alugar']];

function Stepper({ value, min = 1, max, onChange, label }) {
  return (
    <span className="flex items-center gap-1" role="group" aria-label={label}>
      <button type="button" className="shop-step" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Menos"><Minus size={14} /></button>
      <span className="tabular w-8 text-center text-lg font-black text-[#fff1d0]" aria-live="polite">{value}</span>
      <button type="button" className="shop-step" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Mais"><Plus size={14} /></button>
    </span>
  );
}

export default function ShopWindow({ campaignId, merchantTokenId, reloadKey = 0, onClose, onDone, onAsked, notify }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('buy');
  const [pick, setPick] = useState(null);
  const [qty, setQty] = useState(1);
  const [days, setDays] = useState(1);
  const [busy, setBusy] = useState(false);
  const [say, setSay] = useState('');

  const load = useCallback(() => api.get(`/campaigns/${campaignId}/economy/merchant/${merchantTokenId}`)
    .then(({ data: d }) => { setData(d); setError(''); })
    .catch((err) => setError(err.response?.data?.message || 'Não deu para abrir a loja.')), [campaignId, merchantTokenId]);
  useEffect(() => { load(); }, [load, reloadKey]);
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  useEffect(() => { setPick(null); setQty(1); setDays(1); }, [tab]);

  const items = data?.items || [];
  const forSale = useMemo(() => items.filter((i) => i.price != null), [items]);
  const forRent = useMemo(() => items.filter((i) => i.rent != null), [items]);
  const inv = data?.character?.inventory || [];
  const sellable = useMemo(() => [...inv].sort((a, b) => (b.offer > 0) - (a.offer > 0)), [inv]);
  const tabs = TABS.filter(([k]) => (k === 'buy' ? forSale.length : k === 'rent' ? forRent.length : data?.shop?.buys));
  useEffect(() => { if (data && !tabs.some(([k]) => k === tab) && tabs[0]) setTab(tabs[0][0]); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const wallet = data?.character?.wallet ?? 0;
  const load0 = inv.reduce((s, it) => s + Number(it.weight || 0) * Number(it.quantity || 1), 0);
  const limits = data?.character?.limits || {};
  const mode = data?.mode || 'livre';
  const locked = mode === 'travado';
  const list = tab === 'buy' ? forSale : tab === 'rent' ? forRent : sellable;
  const sel = pick && list.find((x) => x.id === pick);
  const maxQty = tab === 'sell' ? Math.max(1, sel?.quantity || 1) : sel?.stock == null ? 20 : Math.max(1, Math.min(20, sel.stock));
  const total = !sel ? 0 : tab === 'buy' ? sel.price * qty : tab === 'rent' ? sel.rent * days : sel.offer * qty;
  const outOfStock = sel && tab !== 'sell' && sel.stock === 0;
  const tooPoor = sel && tab !== 'sell' && total > wallet;
  const noDeal = sel && tab === 'sell' && !(sel.offer > 0);
  const extraKg = sel && tab === 'buy' ? (sel.weight || 0) * qty : 0;
  const tooHeavy = limits.maxWeight != null && extraKg > 0 && load0 + extraKg > limits.maxWeight + 1e-9;

  async function deal() {
    if (!sel || busy) return;
    setBusy(true);
    try {
      const body = { op: tab, merchantTokenId, ...(tab === 'sell' ? { inventoryItemId: sel.id, quantity: qty } : { itemId: sel.id, quantity: qty, days }) };
      const { data: out, status } = await api.post(`/campaigns/${campaignId}/economy/trade`, body);
      if (status === 202 || out?.requested) { onAsked?.(out); setSay('Vou esperar o mestre deixar…'); return; }
      setSay(tab === 'sell' ? 'Negócio fechado.' : 'Obrigado! Volte sempre.');
      notify?.(out.message);
      onDone?.(out);
      setPick(null); setQty(1); setDays(1);
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || 'Não deu certo.';
      setSay(msg);
      notify?.(msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  const name = data?.merchant?.name || 'Mercador';
  return (
    <div className="shop-backdrop" role="presentation" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <section role="dialog" aria-modal="true" aria-label={`Loja de ${name}`} className="shop-window game-wood">
        <header className="flex items-start gap-3 p-3 pb-2">
          <div className="game-parchment grid h-24 w-20 shrink-0 place-items-end justify-center overflow-hidden" aria-hidden="true">
            {data?.merchant?.appearance ? <AvatarSprite appearance={data.merchant.appearance} scale={2} title={name} /> : <span className="game-title self-center text-4xl">{name[0]}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="game-title truncate text-3xl leading-none">{name}</p>
            <p className="text-xs uppercase tracking-wider text-[#e8c98e]">{data?.shop?.name}</p>
            <p className="shop-bubble mt-2">{say || data?.shop?.greeting || 'Pois não?'}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button type="button" autoFocus className="shop-step !h-9 !w-9" onClick={onClose} aria-label="Fechar loja"><X size={18} /></button>
            {data?.character && (
              <span className="game-inset flex items-center gap-1.5 px-2 py-1 text-sm font-black text-[#ffd27a]" title={coinsLabel(wallet)}>
                <Coins size={15} /> <span className="tabular">{wallet}</span> <span className="text-[11px] font-bold text-[#c9a979]">dracmas</span>
              </span>
            )}
          </div>
        </header>

        {error && <p className="mx-3 mb-2 border-2 border-[#5a1a1a] bg-[#2a0b12] px-3 py-2 text-sm text-red-100">{error}</p>}
        {data && !data.character && <p className="mx-3 mb-2 text-sm text-[#e8c98e]">Compartilhe um personagem na campanha para negociar.</p>}
        {locked && <p className="mx-3 mb-2 flex items-center gap-2 border-2 border-[#5a1a1a] bg-[#2a0b12] px-3 py-1.5 text-sm text-red-100"><Lock size={14} /> {data?.paused ? 'O mestre pausou a mesa.' : 'O mestre não liberou o comércio agora.'}</p>}
        {mode === 'pedir' && <p className="mx-3 mb-2 flex items-center gap-2 border-2 border-[#a4781a] bg-[#2a1d08] px-3 py-1.5 text-sm text-[#ffe3a3]"><Hourglass size={14} /> Cada negócio precisa do “sim” do mestre.</p>}

        <nav className="flex gap-1 px-3" role="tablist" aria-label="O que fazer">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={`shop-tab ${tab === k ? 'is-on' : ''}`} onClick={() => setTab(k)}>{label}</button>
          ))}
        </nav>

        <div className="shop-list game-inset mx-3" role="listbox" aria-label={tab === 'sell' ? 'Sua mochila' : 'Mercadorias'}>
          {!data && !error && <p className="p-4 text-center text-[#c9a979]">Abrindo a loja…</p>}
          {data && !list.length && <p className="p-4 text-center text-[#c9a979]">{tab === 'sell' ? 'Sua mochila está vazia.' : 'Nada por aqui agora.'}</p>}
          {list.map((it) => {
            const price = tab === 'buy' ? it.price : tab === 'rent' ? it.rent : it.offer;
            const off = tab === 'sell' ? !(it.offer > 0) : it.stock === 0;
            return (
              <button key={it.id} type="button" role="option" aria-selected={pick === it.id}
                className={`shop-row ${pick === it.id ? 'is-picked' : ''} ${off ? 'is-off' : ''}`}
                onClick={() => { setPick(it.id); setQty(1); }}>
                <span className="game-slot !h-11 !w-11 shrink-0"><ItemIcon item={{ name: it.name, category: it.category && categoryLabel(it.category) !== 'Outros' ? categoryLabel(it.category) : it.category, icon: it.icon }} size={32} /></span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-bold text-[#fff1d0]">{it.name}{tab === 'sell' && it.quantity > 1 ? ` ×${it.quantity}` : ''}</span>
                  <span className="block truncate text-xs text-[#c9a979]">
                    {tab === 'sell'
                      ? (it.rentalId ? 'alugado — devolva ao dono' : it.offer > 0 ? 'ele paga por unidade' : 'não compra isso')
                      : [it.description, it.weight ? formatKg(it.weight) : null, it.stock == null ? null : it.stock ? `${it.stock} em estoque` : 'esgotado'].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className={`shop-price ${off ? 'opacity-50' : ''}`}>
                  {price > 0 ? <><Coins size={13} /> <span className="tabular">{price}</span>{tab === 'rent' && <span className="text-[10px] font-bold text-[#c9a979]">/dia</span>}</> : '—'}
                </span>
              </button>
            );
          })}
        </div>

        <footer className="flex flex-wrap items-center gap-3 p-3">
          {sel ? (
            <>
              <span className="min-w-0 flex-1 text-sm text-[#e8c98e]">
                <b className="block truncate text-[#fff1d0]">{sel.name}</b>
                {tab === 'rent'
                  ? <>Aluguel de {days} {days === 1 ? 'dia' : 'dias'}{data.clockOn ? ' no relógio do mundo' : ` (cada dia = ${String(data.rentHoursPerDay).replace('.', ',')} h reais)`}; volta sozinho no fim.</>
                  : tab === 'sell' ? 'O mercador paga e revende.' : `Mochila: ${formatKg(load0)}${limits.maxWeight != null ? ` / ${formatKg(limits.maxWeight)}` : ''}`}
              </span>
              {tab === 'rent'
                ? <Stepper value={days} max={MAX_RENT_DAYS} onChange={setDays} label="Dias de aluguel" />
                : <Stepper value={qty} max={maxQty} onChange={setQty} label="Quantidade" />}
              <span className="shop-total tabular" aria-live="polite"><Coins size={16} /> {total}</span>
              <button type="button" className="shop-deal" disabled={busy || locked || !data?.character || outOfStock || tooPoor || noDeal || tooHeavy} onClick={deal}>
                {mode === 'pedir' ? 'Pedir ao mestre' : tab === 'buy' ? 'Comprar' : tab === 'rent' ? 'Alugar' : 'Vender'}
              </button>
              {(tooPoor || outOfStock || noDeal || tooHeavy) && (
                <p className="w-full text-xs font-bold text-[#ff9c8a]">{outOfStock ? 'Acabou o estoque.' : tooPoor ? `Faltam ${total - wallet} dracmas.` : tooHeavy ? 'Mochila cheia: passa do peso máximo.' : 'Ele não compra isso.'}</p>
              )}
            </>
          ) : <p className="text-sm text-[#c9a979]">Escolha um item. Esc fecha.</p>}
        </footer>
      </section>
    </div>
  );
}
