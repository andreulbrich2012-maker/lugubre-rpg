import { Check, Pencil, Trash2 } from 'lucide-react';
import MessageFormatter from './MessageFormatter';

function MessageAvatar({ message }) {
  if (message.user_avatar) {
    return <img src={message.user_avatar} alt={`Avatar de ${message.user_name || 'participante'}`} className="h-8 w-8 rounded-full border border-white/15 object-cover" />;
  }

  const initial = message.user_name?.trim()?.[0]?.toUpperCase() || '?';
  return (
    <div
      className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-xs font-bold text-black"
      style={{ backgroundColor: message.color || '#d6a65f' }}
    >
      {initial}
    </div>
  );
}

function messageTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default function CampaignMessageBubble({ message, currentUserId, canDeleteAny, editing, editText, onEditText, onStartEdit, onCancelEdit, onSaveEdit, onDelete }) {
  const isMine = message.user_id === currentUserId;
  const canDelete = isMine || canDeleteAny;
  const isAction = String(message.content || '').trim().toLowerCase().startsWith('/ação ') || String(message.content || '').trim().toLowerCase().startsWith('/acao ');

  return (
    <article className={`flex w-full gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {!isMine ? <MessageAvatar message={message} /> : null}
      <div className={`group max-w-[82%] sm:max-w-[68%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`mb-1 flex items-center gap-2 text-[11px] ${isMine ? 'justify-end' : 'justify-start'}`}>
          <span className="font-semibold" style={{ color: message.color || '#d6a65f' }}>{message.user_name || 'Jogador'}</span>
          <span className="text-mist/70">{messageTime(message.created_at)}</span>
          {message.edited_at ? <span className="text-ember/80">editado</span> : null}
        </div>
        <div
          className={`rounded-2xl border px-3 py-2 shadow-lg ${
            isMine
              ? 'rounded-br-sm border-ember/25 bg-ember/15'
              : 'rounded-bl-sm border-white/10 bg-black/45'
          } ${isAction ? 'border-ember/40 bg-ember/10' : ''}`}
          style={{ borderLeftColor: !isMine ? message.color || '#d6a65f' : undefined }}
        >
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(event) => onEditText(event.target.value)}
                className="min-h-24 w-full rounded-md border border-ember/20 bg-black/40 px-3 py-2 text-sm outline-none focus:border-ember/60"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancelEdit} className="rounded-md border border-white/10 px-3 py-1 text-xs text-mist hover:bg-white/5">
                  Cancelar
                </button>
                <button type="button" onClick={onSaveEdit} className="inline-flex items-center gap-1 rounded-md border border-ember/50 bg-ember/15 px-3 py-1 text-xs text-ember hover:bg-ember/25">
                  <Check className="h-3.5 w-3.5" />
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <MessageFormatter content={message.content} />
          )}
        </div>
        {!editing ? (
          <div className={`mt-1 flex gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100 ${isMine ? 'justify-end' : 'justify-start'}`}>
            {isMine ? (
              <button type="button" onClick={onStartEdit} className="rounded border border-white/10 p-1 text-mist hover:text-ember" title="Editar">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {canDelete ? (
              <button type="button" onClick={onDelete} className="rounded border border-red-500/25 p-1 text-red-200 hover:bg-red-500/10" title="Excluir">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {isMine ? <MessageAvatar message={message} /> : null}
    </article>
  );
}
