import { useState } from 'react';
import { LogOut, Settings } from 'lucide-react';
import Avatar from './Avatar';

export default function UserMenu({ user, onSettings, onLogout }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="flex items-center gap-3 rounded-md border border-ember/20 bg-black/25 px-3 py-2 text-left soft-motion"
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar user={user} size="sm" />
        <span className="hidden text-sm text-white sm:block">{user?.name}</span>
        <Settings size={17} className="text-ember" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-52 rounded-md border border-ember/20 bg-abyss/95 p-2 shadow-2xl backdrop-blur">
          <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-mist hover:bg-ember/10 hover:text-white" onClick={() => { setOpen(false); onSettings(); }}>
            <Settings size={16} />
            Configuracoes
          </button>
          <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-mist hover:bg-ember/10 hover:text-white" onClick={onLogout}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
