import { Link, NavLink } from 'react-router-dom';
import { LogOut, Menu, Shield, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../store/authStore';
import Button from './Button';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const links = [
    user && { to: '/dashboard', label: 'Dashboard' },
    { to: '/characters', label: 'Personagens' },
    { to: '/campaigns', label: 'Campanhas' },
    user && { to: '/monsters', label: 'Monstros' },
    user?.role === 'admin' && { to: '/admin', label: 'Admin' }
  ].filter(Boolean);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg-radial)' }}>
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
          <div className="border-t border-ember/10 bg-black/45 px-3 py-3 md:hidden">
            <div className="grid gap-2">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)} className="rounded-md border border-white/10 bg-black/20 px-3 py-3 text-sm text-mist hover:text-white">
                  {link.label}
                </NavLink>
              ))}
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
    </div>
  );
}
