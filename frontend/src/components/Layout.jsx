import { Link, NavLink } from 'react-router-dom';
import { LogOut, Shield } from 'lucide-react';
import { useAuth } from '../store/authStore';
import Button from './Button';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#2a0d14_0,#07070a_42%)]">
      <nav className="sticky top-0 z-20 border-b border-ember/10 bg-abyss/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-2xl text-ember">Lúgubre RPG</Link>
          <div className="flex items-center gap-3 text-sm">
            {user && <NavLink to="/dashboard" className="text-mist hover:text-white">Dashboard</NavLink>}
            <NavLink to="/characters" className="text-mist hover:text-white">Personagens</NavLink>
            <NavLink to="/campaigns" className="text-mist hover:text-white">Campanhas</NavLink>
            {user?.role === 'admin' && <NavLink to="/admin" className="text-mist hover:text-white">Admin</NavLink>}
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
    </div>
  );
}
