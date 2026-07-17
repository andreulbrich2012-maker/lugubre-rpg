import { Trash2 } from 'lucide-react';

function MemberAvatar({ member }) {
  if (member.display_avatar) {
    return <img src={member.display_avatar} alt={`Avatar de ${member.display_name || member.name || 'participante'}`} className="h-10 w-10 rounded-full border border-white/15 object-cover" />;
  }

  const initial = member.display_name?.trim()?.[0]?.toUpperCase() || '?';
  return (
    <div
      className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-sm font-bold text-black"
      style={{ backgroundColor: member.color || '#d6a65f' }}
    >
      {initial}
    </div>
  );
}

export default function CampaignMembersList({ members, currentUserId, isMaster, onRemove, onColorChange }) {
  return (
    <div className="space-y-3">
      {members.map((member) => {
        const isSelf = member.user_id === currentUserId || member.id === currentUserId;
        return (
          <div key={member.user_id || member.id} className="rounded-md border border-white/10 bg-black/25 p-3">
            <div className="flex items-center gap-3">
              <MemberAvatar member={member} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: member.color || '#d6a65f' }} />
                  <p className="truncate font-semibold text-white">{member.display_name || member.name}</p>
                </div>
                <p className="text-xs text-mist">{member.role === 'master' ? 'GM' : 'Jogador'}</p>
                <p className="truncate text-xs text-ember/80">{member.character_name ? `Ficha: ${member.character_name}` : 'Sem personagem compartilhado'}</p>
              </div>
              {isMaster && !isSelf && member.role !== 'master' ? (
                <button
                  type="button"
                  onClick={() => onRemove(member)}
                  className="rounded-md border border-red-500/30 p-2 text-red-200 hover:bg-red-500/10"
                  title="Remover jogador"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {isMaster ? (
              <label className="mt-3 flex items-center justify-between gap-3 text-xs text-mist">
                Cor do jogador
                <input
                  type="color"
                  value={member.color || '#d6a65f'}
                  onChange={(event) => onColorChange(member, event.target.value)}
                  className="h-8 w-12 rounded border border-white/10 bg-black"
                />
              </label>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
