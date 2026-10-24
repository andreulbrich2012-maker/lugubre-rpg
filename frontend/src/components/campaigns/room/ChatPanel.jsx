import { useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import CampaignMessageBubble from '../CampaignMessageBubble';
import { rollSummary } from './rolls';

// Chat da mesa: mensagens e rolagens no mesmo fio, rolagem como uma linha de vidro (nao bolha).
function RollLine({ message }) {
  const r = message.meta || {};
  const time = message.created_at ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.created_at)) : '';
  const first = r.dice?.[0];
  const crit = first?.sides === 20 && first?.value === 20;
  return (
    <article className="border-[3px] border-lead bg-black/40 px-3 py-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-bold" style={{ color: r.color || message.color || 'var(--color-ember)' }}>{r.characterName || message.user_name}</span>
        <span className="text-xs text-mist">{time}</span>
      </div>
      <p className="mt-0.5 text-mist">{r.label || 'Rolagem'}{r.targetName ? <> → <span className="text-bone">{r.targetName}</span></> : null}</p>
      <p className="mt-1 flex items-baseline justify-between gap-3">
        <span className="text-sm text-mist tabular">{rollSummary(r)}</span>
        <span className={`font-display text-3xl tabular ${crit ? 'text-[#ffe9b8]' : 'text-ember'}`}>{r.total}</span>
      </p>
    </article>
  );
}

export default function ChatPanel({ messages, currentUserId, isMaster, content, setContent, onSend, editing, onEdit, onDelete }) {
  const listRef = useRef(null);
  const stick = useRef(true);

  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div
        ref={listRef}
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3"
      >
        {messages.map((message) => (message.message_type === 'roll'
          ? <RollLine key={message.id} message={message} />
          : message.message_type === 'event'
            ? <p key={message.id} className="border-l-[3px] border-ember px-3 py-1 text-sm italic text-mist">{message.content}</p>
            : (
            <CampaignMessageBubble
              key={message.id}
              message={message}
              currentUserId={currentUserId}
              canDeleteAny={isMaster}
              editing={editing.id === message.id}
              editText={editing.text}
              onEditText={(text) => editing.set({ id: message.id, text })}
              onStartEdit={() => editing.set({ id: message.id, text: message.content })}
              onCancelEdit={() => editing.set({ id: null, text: '' })}
              onSaveEdit={() => onEdit(message.id, editing.text)}
              onDelete={() => onDelete(message)}
            />
          )))}
        {!messages.length && <p className="p-4 text-center text-mist">Nenhuma mensagem ainda. Diga algo para a mesa.</p>}
      </div>
      <form onSubmit={onSend} className="flex gap-2 border-t-[3px] border-lead p-3">
        <label className="sr-only" htmlFor="chat-input">Mensagem</label>
        <textarea
          id="chat-input"
          rows={1}
          className="field !mt-0 min-h-11 flex-1 resize-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(e); } }}
          placeholder="Escreva… (/ação para narrar)"
        />
        <button type="submit" className="btn btn-lit !min-h-11 !w-11 !p-0" aria-label="Enviar mensagem"><Send size={18} /></button>
      </form>
    </section>
  );
}
