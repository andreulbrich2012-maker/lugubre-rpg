import { useState } from 'react';
import { Hand, Lock, Plus, Trash2 } from 'lucide-react';
import ItemIcon from '../icons/ItemIcon';
import { addContent, MAX_CONTENTS, removeContent } from '../../lib/tiles/format';
import { formatKg, itemLoad } from '../../lib/itemWeight';

// Conteudo de um recipiente do mapa (mochila, bau, saco) no popover do Board.
// Jogador: tira um item de dentro. Mestre: tranca, poe e tira itens (PATCH do item do mapa).
export default function ContainerContents({ item, isMaster, reason, onTake, onPatch }) {
  const [draft, setDraft] = useState('');
  const contents = item.contents || [];
  const locked = Boolean(item.locked);

  function add() {
    const name = draft.trim();
    if (!name) return;
    onPatch?.({ container: true, contents: addContent(item, { name }).contents });
    setDraft('');
  }

  return (
    <div className="mt-1 border-2 border-lead bg-black/30 p-1.5">
      <p className="flex items-center justify-between gap-2 text-xs text-mist">
        <span>{locked ? <><Lock size={12} className="inline" /> Trancado</> : `Dentro (${contents.length})`}</span>
        <span className="tabular">{formatKg(itemLoad(item))}</span>
      </p>
      {locked && !isMaster ? (
        <p className="mt-1 text-xs text-mist">Está trancado. Ninguém abre sem o mestre deixar.</p>
      ) : (
        <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto">
          {contents.map((c) => (
            <li key={c.id} className="flex items-center gap-1.5 text-xs">
              <ItemIcon item={c} size={16} />
              <span className="min-w-0 flex-1 truncate text-bone">{c.name}{c.dracmas ? ` — ${c.dracmas} dracmas` : c.quantity > 1 ? ` ×${c.quantity}` : ''}</span>
              {!c.dracmas && <span className="tabular text-mist">{formatKg(itemLoad(c))}</span>}
              {!isMaster && (
                <button type="button" className="btn btn-glass !min-h-7 !px-1.5 text-xs" disabled={Boolean(reason)} onClick={() => onTake?.(c)} aria-label={`Pegar ${c.name}`}><Hand size={12} /></button>
              )}
              {isMaster && (
                <button type="button" className="btn btn-glass !min-h-7 !w-7 !p-0" onClick={() => onPatch?.({ contents: removeContent(item, c.id).contents })} aria-label={`Tirar ${c.name} do recipiente`}><Trash2 size={12} /></button>
              )}
            </li>
          ))}
          {!contents.length && <li className="text-xs text-mist">Vazio.</li>}
        </ul>
      )}
      {isMaster && contents.length < MAX_CONTENTS && (
        <div className="mt-1 flex gap-1">
          <input className="field !mt-0 !min-h-7 flex-1 !py-0.5 text-xs" placeholder="Pôr item dentro…" value={draft} maxLength={60}
            onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} aria-label={`Novo item dentro de ${item.name}`} />
          <button type="button" className="btn btn-glass !min-h-7 !w-7 !p-0" onClick={add} disabled={!draft.trim()} aria-label="Pôr dentro"><Plus size={12} /></button>
        </div>
      )}
    </div>
  );
}
