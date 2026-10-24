import { useEffect, useState } from 'react';
import { Check, Hand, X } from 'lucide-react';

// Aviso do mestre: um jogador pediu para fazer algo (modo "Pedir" no Controle da mesa).
// Mostra o pedido mais antigo com Permitir / Negar grandes; o resto espera na fila.
const KIND_LABEL = { pickup: 'pegar itens', enter: 'portas', exit: 'portas', attack: 'atacar' };

export default function ActionRequests({ requests, onDecide, nameOf }) {
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!requests.length) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [requests.length]);
  const live = requests.filter((r) => new Date(r.expiresAt).getTime() > now);
  const first = live[0];
  if (!first) return null;
  const left = Math.max(0, Math.round((new Date(first.expiresAt).getTime() - now) / 1000));
  const who = nameOf?.(first.userId) || 'o jogador';

  async function decide(decision, always = false) {
    setBusy(true);
    try { await onDecide(first, decision, always); } finally { setBusy(false); }
  }

  return (
    <div role="alertdialog" aria-label="Pedido de jogador" className="gothic-panel !fixed right-3 top-20 z-[62] w-[min(360px,calc(100vw-1.5rem))] border-[4px] border-[#a4781a] p-3 shadow-2xl">
      <div className="flex items-start gap-2">
        <Hand size={22} className="mt-0.5 shrink-0 text-ember" />
        <p className="flex-1 text-lg font-bold leading-snug text-bone">{first.summary}</p>
        {live.length > 1 && <span className="shrink-0 bg-[#a3182f] px-2 py-0.5 text-xs font-bold text-white tabular" title="Pedidos esperando">+{live.length - 1} na fila</span>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-lit !min-h-12 text-base" disabled={busy} onClick={() => decide('approve')} autoFocus><Check size={18} /> Permitir</button>
        <button type="button" className="btn btn-glass !min-h-12 text-base text-red-200" disabled={busy} onClick={() => decide('deny')}><X size={18} /> Negar</button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-mist">
        <button type="button" className="underline hover:text-bone" disabled={busy} onClick={() => decide('approve', true)}>Permitir sempre {KIND_LABEL[first.kind]} para {who}</button>
        <span className="tabular">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
      </div>
    </div>
  );
}
