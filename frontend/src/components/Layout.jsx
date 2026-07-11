import { Link, NavLink, useLocation } from 'react-router-dom';
import { BookOpen, Home, LogOut, Menu, MoreHorizontal, Palette, ScrollText, Settings, Shield, Skull, Swords, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../store/authStore';
import Button from './Button';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
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
  const drawerLinks = [
    user && { to: '/dashboard?tab=friends', label: 'Amigos', icon: Users },
    user && { to: '/powers', label: 'Biblioteca', icon: BookOpen },
    user && { to: '/dashboard?tab=settings', label: 'Configurações', icon: Settings },
    user && { to: '/dashboard?tab=personalization', label: 'Personalização', icon: Palette },
    user?.role === 'admin' && { to: '/admin', label: 'Admin', icon: Shield }
  ].filter(Boolean);

  function activePath(to) {
    const path = to.split('?')[0];
    return path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  }

  return (
    <div className="min-h-screen overflow-x-hidden pb-20 md:pb-0" style={{ background: 'var(--bg-radial)' }}>
      <nav className="sticky top-0 z-20 border-b border-ember/10 bg-abyss/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <Link to="/" className="font-display text-2xl text-ember">Lúgubre RPG</Link>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-md border border-ember/25 text-ember md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Abrir menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="hidden min-w-0 items-center gap-3 text-sm md:flex">
            {links.map((link) => <NavLink key={link.to} to={link.to} className="text-mist hover:text-white">{link.label}</NavLink>)}
            {user ? (
              <Button variant="ghost" onClick={logout} title="Sair"><LogOut size={16} /></Button>
            ) : (
              <Link to="/login"><Button><Shield size={16} className="inline" /> Entrar</Button></Link>
            )}
          </div>
        </div>
        {open && (
          <div className="fixed inset-x-3 bottom-24 z-40 rounded-md border border-ember/20 bg-abyss/95 px-3 py-3 shadow-2xl shadow-black/60 backdrop-blur md:hidden">
            <div className="grid gap-2">
              {drawerLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)} className="rounded-md border border-white/10 bg-black/20 px-3 py-3 text-sm text-mist hover:text-white">
                    <span className="inline-flex items-center gap-2"><Icon size={17} /> {link.label}</span>
                  </NavLink>
                );
              })}
              {user ? (
                <Button variant="ghost" className="w-full justify-center py-3" onClick={() => { setOpen(false); logout(); }}><LogOut size={16} className="inline" /> Sair</Button>
              ) : (
                <Link to="/login" onClick={() => setOpen(false)}><Button className="w-full py-3"><Shield size={16} className="inline" /> Entrar</Button></Link>
              )}
            </div>
          </div>
        )}
      </nav>
      {children}
      <footer className="border-t border-ember/10 px-4 py-8 text-center text-sm text-mist">
        Lúgubre RPG, fichas, campanhas e sombras bem organizadas.
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ember/20 bg-abyss/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-2xl shadow-black/70 backdrop-blur md:hidden" aria-label="Navegação principal mobile">
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
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-semibold transition-colors ${open ? 'bg-ember/15 text-ember' : 'text-mist hover:bg-white/5 hover:text-white'}`}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={19} /> : <MoreHorizontal size={19} />}
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
