import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BookMarked, BookOpen, Sparkles, Home, MessageSquareText, Menu, MoreHorizontal, Palette, ScrollText, Settings, Shield, ShoppingBag, Skull, Swords, Users, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useAuth } from '../store/authStore';
import { useMenuTransition } from '../hooks/useMenuTransition';
import Button from './Button';

export default function Layout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const mobileMenu = useMenuTransition();
  const closeMenuButtonRef = useRef(null);
  const firstMenuItemRef = useRef(null);
  const previousFocusRef = useRef(null);
  const menuSheetRef = useRef(null);
  const inCampaignRoom = /^\/campaigns\/[^/]+/.test(location.pathname);
  const onDashboard = location.pathname === '/dashboard';

  const links = [
    user && { to: '/dashboard', label: 'Dashboard' },
    { to: '/characters', label: 'Personagens' },
    { to: '/campaigns', label: 'Campanhas' },
    { to: '/regras', label: 'Livro' },
    { to: '/grimorio', label: 'Grimório' },
    user && { to: '/powers', label: 'Biblioteca' },
    user && { to: '/feedback', label: 'Feedback' },
    user && { to: '/monsters', label: 'Monstros' },
    user?.role === 'admin' && { to: '/admin', label: 'Admin' }
  ].filter(Boolean);

  const bottomLinks = [
    user && { to: '/dashboard', label: 'Painel', icon: Home },
    { to: '/characters', label: 'Fichas', icon: ScrollText },
    { to: '/campaigns', label: 'Mesas', icon: Swords },
    user && { to: '/monsters', label: 'Monstros', icon: Skull }
  ].filter(Boolean);

  const menuLinks = [
    user && { to: '/dashboard', label: 'Painel', icon: Home },
    { to: '/characters', label: 'Personagens / Fichas', icon: ScrollText },
    { to: '/campaigns', label: 'Campanhas / Mesas', icon: Swords },
    { to: '/regras', label: 'Livro de regras', icon: BookMarked },
    { to: '/grimorio', label: 'Grimório de magias', icon: Sparkles },
    user && { to: '/dashboard?tab=friends', label: 'Amigos', icon: Users },
    user && { to: '/monsters', label: 'Monstros', icon: Skull },
    inCampaignRoom && { to: `${location.pathname}?tab=diary`, label: 'Diário', icon: ScrollText },
    inCampaignRoom && { to: `${location.pathname}?tab=shops`, label: 'Loja', icon: ShoppingBag },
    user && { to: '/powers', label: 'Biblioteca de Magias e Poderes', icon: BookOpen },
    user && { to: '/feedback', label: 'Feedback', icon: MessageSquareText },
    user && { to: '/dashboard?tab=settings', label: 'Configurações', icon: Settings },
    user && { to: '/dashboard?tab=personalization', label: 'Personalização', icon: Palette },
    user?.role === 'admin' && { to: '/admin', label: 'Admin', icon: Shield }
  ].filter(Boolean);

  useEffect(() => mobileMenu.forceClose(), [location.pathname, location.search, mobileMenu.forceClose]);

  useEffect(() => {
    document.body.style.overflow = mobileMenu.mounted ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenu.mounted]);

  useEffect(() => {
    if (!mobileMenu.mounted) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        mobileMenu.close();
        return;
      }
      if (event.key !== 'Tab' || !mobileMenu.interactive) return;
      const focusable = [...(menuSheetRef.current?.querySelectorAll('button:not([disabled]), a[href]:not([tabindex="-1"])') || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileMenu.close, mobileMenu.interactive, mobileMenu.mounted]);

  useEffect(() => {
    if (mobileMenu.interactive) firstMenuItemRef.current?.focus();
    if (!mobileMenu.mounted && previousFocusRef.current) {
      previousFocusRef.current.focus?.();
      previousFocusRef.current = null;
    }
  }, [mobileMenu.interactive, mobileMenu.mounted]);

  function activePath(to) {
    const [path, search] = to.split('?');
    if (search) return location.pathname === path && location.search === `?${search}`;
    return path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  }

  function closeMenu(afterClose) {
    mobileMenu.close(afterClose);
  }

  function openMenu() {
    if (mobileMenu.open()) previousFocusRef.current = document.activeElement;
  }

  function navigateFromMenu(event, to) {
    event.preventDefault();
    if (!mobileMenu.interactive) return;
    closeMenu(() => navigate(to));
  }

  return (
    <div className="min-h-screen overflow-x-hidden pb-20 lg:pb-0" style={{ background: 'var(--bg-radial)' }}>
      <nav className="sticky top-0 z-40 border-b-[4px] border-lead bg-abyss/95 shadow-[0_1px_0_rgb(var(--light)/.08)]">
        <div className={`mx-auto flex items-center justify-between gap-3 px-3 py-3 sm:px-4 ${onDashboard ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
          <Link to="/" className="font-display text-[1.75rem] leading-none text-ember">Lúgubre <span className="text-bone">RPG</span></Link>
          <button
            type="button"
            className="btn btn-glass !min-h-10 !w-10 !p-0 lg:hidden"
            onClick={openMenu}
            aria-label="Abrir menu"
            aria-expanded={mobileMenu.mounted}
            aria-controls="mobile-menu-sheet"
          >
            <Menu size={18} />
          </button>
          <div className="hidden min-w-0 items-center gap-1 lg:flex">
            {links.map((link) => <NavLink key={link.to} to={link.to} className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>{link.label}</NavLink>)}
            {!user && (
              <Link to="/login" className="ml-3"><Button className="!min-h-10"><Shield size={16} className="inline" /> Entrar</Button></Link>
            )}
          </div>
        </div>
      </nav>

      {children}

      {location.pathname !== '/' && !onDashboard && (
        <footer className="mt-10 border-t-[4px] border-lead px-4 py-8 text-center text-sm text-mist">
          <span className="font-display text-lg text-ember">Lúgubre RPG</span> · Livro de regras 0.5 Beta
        </footer>
      )}

      {mobileMenu.mounted && (
        <div className="fixed inset-0 z-[1000] lg:hidden" data-mobile-menu-root data-menu-phase={mobileMenu.phase}>
          <button
            type="button"
            aria-label="Fechar menu"
            className={`absolute inset-0 bg-black/75 backdrop-blur-sm menu-overlay-${mobileMenu.phase}`}
            onClick={() => closeMenu()}
          />
          <section
            ref={menuSheetRef}
            id="mobile-menu-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Menu mobile"
            aria-hidden={!mobileMenu.interactive}
            inert={mobileMenu.interactive ? undefined : ''}
            className={`absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto border-t-[6px] border-lead bg-abyss px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-2xl shadow-black mobile-sheet-${mobileMenu.phase} ${mobileMenu.interactive ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-3xl text-ember">Menu</h2>
              </div>
              <button ref={closeMenuButtonRef} type="button" className="btn btn-glass !min-h-11 !w-11 !p-0" onClick={() => closeMenu()} aria-label="Fechar menu">
                <X size={19} />
              </button>
            </div>
            <div className="grid gap-2">
              {menuLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    ref={index === 0 ? firstMenuItemRef : undefined}
                    key={link.to}
                    to={link.to}
                    onClick={(event) => navigateFromMenu(event, link.to)}
                    tabIndex={mobileMenu.interactive ? 0 : -1}
                    aria-disabled={!mobileMenu.interactive}
                    className={() => `flex min-h-12 items-center gap-3 rounded-md border-[3px] px-3 py-3 text-left text-sm font-semibold transition-colors ${activePath(link.to) ? 'lit border-lead' : 'border-lead bg-glass text-mist hover:text-bone'}`}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className="break-words leading-snug">{link.label}</span>
                  </NavLink>
                );
              })}
              {!user && (
                <Link to="/login" onClick={(event) => navigateFromMenu(event, '/login')} tabIndex={mobileMenu.interactive ? 0 : -1}><Button className="min-h-12 w-full py-3"><Shield size={16} className="inline" /> Entrar</Button></Link>
              )}
            </div>
          </section>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-[4px] border-lead bg-abyss/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-2xl shadow-black/70 backdrop-blur lg:hidden" aria-label="Navegação principal mobile">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {bottomLinks.map((link) => {
            const Icon = link.icon;
            const active = activePath(link.to);
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-semibold transition-colors ${active ? 'lit text-ember' : 'text-mist hover:text-bone'}`}
              >
                <Icon size={19} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-semibold transition-colors ${mobileMenu.mounted ? 'lit text-ember' : 'text-mist hover:text-bone'}`}
            onClick={openMenu}
            aria-label="Menu"
            aria-expanded={mobileMenu.mounted}
            aria-controls="mobile-menu-sheet"
          >
            <MoreHorizontal size={19} />
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
