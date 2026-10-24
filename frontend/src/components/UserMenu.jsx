import { useEffect, useRef } from 'react';
import { Settings } from 'lucide-react';
import { useMenuTransition } from '../hooks/useMenuTransition';
import Avatar from './Avatar';

export default function UserMenu({ user, onSettings }) {
  const menu = useMenuTransition();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const settingsRef = useRef(null);

  useEffect(() => {
    if (!menu.mounted) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        menu.close(() => triggerRef.current?.focus());
      }
    };
    const onPointerDown = (event) => {
      if (menu.interactive && !rootRef.current?.contains(event.target)) menu.close();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menu.close, menu.interactive, menu.mounted]);

  useEffect(() => {
    if (menu.interactive) settingsRef.current?.focus();
  }, [menu.interactive]);

  function toggleMenu() {
    if (menu.phase === 'closed') menu.open();
    else if (menu.phase === 'open') menu.close();
  }

  function openSettings() {
    if (!menu.interactive) return;
    menu.close(() => {
      onSettings();
      triggerRef.current?.focus();
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        className="flex items-center gap-3 min-h-11 border-[3px] border-lead bg-glass px-3 py-2 text-left outline outline-1 -outline-offset-4 outline-ember/15 hover:outline-ember/40 soft-motion"
        onClick={toggleMenu}
        aria-label="Abrir menu da conta"
        aria-expanded={menu.mounted}
        aria-controls="account-menu"
      >
        <Avatar user={user} size="sm" />
        <span className="hidden text-sm text-bone sm:block">{user?.name}</span>
        <Settings size={17} className="text-ember" />
      </button>
      {menu.mounted && (
        <div
          id="account-menu"
          role="menu"
          aria-label="Menu da conta"
          aria-hidden={!menu.interactive}
          inert={menu.interactive ? undefined : ''}
          data-menu-phase={menu.phase}
          className={`absolute right-0 z-30 mt-2 w-52 gothic-panel p-2 account-menu-${menu.phase} ${menu.interactive ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
          <button ref={settingsRef} role="menuitem" tabIndex={menu.interactive ? 0 : -1} className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-sm text-mist hover-lit" onClick={openSettings}>
            <Settings size={16} />
            Configurações
          </button>
        </div>
      )}
    </div>
  );
}
