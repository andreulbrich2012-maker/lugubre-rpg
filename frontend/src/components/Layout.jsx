import { Link, NavLink, useLocation } from 'react-router-dom';
import { BookOpen, Home, LogOut, Menu, MoreHorizontal, Palette, ScrollText, Settings, Shield, ShoppingBag, Skull, Swords, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../store/authStore';
import Button from './Button';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const inCampaignRoom = /^\/campaigns\/[^/]+/.test(location.pathname);

  const links = [
    user && { to: '/dashboard', label: 'Dashboard' },
    { to: '/characters', label: 'Personagens' },
    { to: '/campaigns', label: 'Campanhas' },
    user && { to: '/powers', label: 'Biblioteca' },
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
    user && { to: '/dashboard?tab=friends', label: 'Amigos', icon: Users },
    user && { to: '/monsters', label: 'Monstros', icon: Skull },
    inCampaignRoom && { to: `${location.pathname}?tab=diary`, label: 'Diário', icon: ScrollText },
    inCampaignRoom && { to: `${location.pathname}?tab=shops`, label: 'Loja', icon: ShoppingBag },
    user && { to: '/powers', label: 'Biblioteca de Magias e Poderes', icon: BookOpen },
    user && { to: '/dashboard?tab=settings', label: 'Configurações', icon: Settings },
    user && { to: '/dashboard?tab=personalization', label: 'Personalização', icon: Palette },
    user?.role === 'admin' && { to: '/admin', label: 'Admin', icon: Shield }
  ].filter(Boolean);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  function activePath(to) {
    const [path, search] = to.split('?');
    if (search) return location.pathname === path && location.search === `?${search}`;
    return path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function signOut() {
    closeMenu();
    logout();
  }

  return (
    <div className="min-h-screen overflow-x-hidden pb-20 lg:pb-0" style={{ background: 'var(--bg-radial)' }}>
      <nav className="sticky top-0 z-20 border-b border-ember/10 bg-abyss/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <Link to="/" className="font-display text-2xl text-ember">Lúgubre RPG</Link>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md border border-ember/25 text-ember lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu-sheet"
          >
            <Menu size={18} />
          </button>
          <div className="hidden min-w-0 items-center gap-3 text-sm lg:flex">
            {links.map((link) => <NavLink key={link.to} to={link.to} className="text-mist hover:text-white">{link.label}</NavLink>)}
            {user ? (
              <Button variant="ghost" onClick={logout} title="Sair"><LogOut size={16} /></Button>
            ) : (
              <Link to="/login"><Button><Shield size={16} className="inline" /> Entrar</Button></Link>
            )}
          </div>
        </div>
      </nav>

      {children}

      <footer className="border-t border-ember/10 px-4 py-8 text-center text-sm text-mist">
        Lúgubre RPG, fichas, campanhas e sombras bem organizadas.
      </footer>

      {menuOpen && (
        <div className="fixed inset-0 z-[1000] lg:hidden" data-mobile-menu-root>
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={closeMenu}
          />
          <section
            id="mobile-menu-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Menu mobile"
            className="pointer-events-auto absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-2xl border-t border-ember/30 bg-abyss px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-2xl shadow-black"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[.24em] text-ember/70">Navegação</p>
                <h2 className="font-display text-2xl text-ember">Menu</h2>
              </div>
              <button type="button" className="grid h-11 w-11 place-items-center rounded-md border border-ember/25 text-ember" onClick={closeMenu} aria-label="Fechar menu">
                <X size={19} />
              </button>
            </div>
            <div className="grid gap-2">
              {menuLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={closeMenu}
                    className={() => `flex min-h-12 items-center gap-3 rounded-md border px-3 py-3 text-left text-sm font-semibold transition-colors ${activePath(link.to) ? 'border-ember/50 bg-ember/15 text-white' : 'border-white/10 bg-black/25 text-mist hover:border-ember/25 hover:text-white'}`}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className="break-words leading-snug">{link.label}</span>
                  </NavLink>
                );
              })}
              {user ? (
                <Button variant="ghost" className="min-h-12 w-full justify-center py-3 text-red-100" onClick={signOut}>
                  <LogOut size={16} className="inline" /> Sair
                </Button>
              ) : (
                <Link to="/login" onClick={closeMenu}><Button className="min-h-12 w-full py-3"><Shield size={16} className="inline" /> Entrar</Button></Link>
              )}
            </div>
          </section>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ember/20 bg-abyss/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-2xl shadow-black/70 backdrop-blur lg:hidden" aria-label="Navegação principal mobile">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {bottomLinks.map((link) => {
            const Icon = link.icon;
            const active = activePath(link.to);
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-semibold transition-colors ${active ? 'bg-ember/15 text-ember' : 'text-mist hover:bg-white/5 hover:text-white'}`}
              >
                <Icon size={19} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-semibold transition-colors ${menuOpen ? 'bg-ember/15 text-ember' : 'text-mist hover:bg-white/5 hover:text-white'}`}
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
            aria-expanded={menuOpen}
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
