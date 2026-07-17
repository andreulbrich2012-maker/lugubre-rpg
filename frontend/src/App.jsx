import { Link, Route, Routes } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import { useAuth } from './store/authStore';
import { AUTH_TOKEN_KEY } from './lib/api';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Characters = lazy(() => import('./pages/Characters'));
const CharacterBuilder = lazy(() => import('./pages/CharacterBuilder'));
const CharacterSheet = lazy(() => import('./pages/CharacterSheet'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const CampaignRoom = lazy(() => import('./pages/CampaignRoom'));
const Monsters = lazy(() => import('./pages/Monsters'));
const PowerLibrary = lazy(() => import('./pages/PowerLibrary'));
const Feedback = lazy(() => import('./pages/Feedback'));
const Admin = lazy(() => import('./pages/Admin'));

function RouteLoading() {
  return <main className="grid min-h-[60vh] place-items-center" aria-label="Carregando página"><span className="h-9 w-9 animate-spin rounded-full border-2 border-ember/30 border-t-ember" /></main>;
}

function isProtectedPath(pathname) {
  return ['/dashboard', '/characters', '/campaigns', '/monsters', '/powers', '/feedback', '/admin']
    .some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function App() {
  const { user, initAuth } = useAuth();

  useEffect(() => {
    const theme = user?.theme || localStorage.getItem('lugubre-theme') || 'sombrio';
    document.documentElement.dataset.theme = theme;
  }, [user?.theme]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    const enforceLoggedOutHistory = () => {
      if (isProtectedPath(window.location.pathname) && !localStorage.getItem(AUTH_TOKEN_KEY)) {
        window.location.replace('/login');
      }
    };
    window.addEventListener('pageshow', enforceLoggedOutHistory);
    window.addEventListener('popstate', enforceLoggedOutHistory);
    return () => {
      window.removeEventListener('pageshow', enforceLoggedOutHistory);
      window.removeEventListener('popstate', enforceLoggedOutHistory);
    };
  }, []);

  return (
    <Layout>
      <Suspense fallback={<RouteLoading />}><Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/characters" element={<ProtectedRoute><Characters /></ProtectedRoute>} />
        <Route path="/characters/new" element={<ProtectedRoute><CharacterBuilder /></ProtectedRoute>} />
        <Route path="/characters/:id" element={<ProtectedRoute><CharacterSheet /></ProtectedRoute>} />
        <Route path="/characters/:id/edit" element={<ProtectedRoute><CharacterBuilder /></ProtectedRoute>} />
        <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
        <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignRoom /></ProtectedRoute>} />
        <Route path="/monsters" element={<ProtectedRoute><Monsters /></ProtectedRoute>} />
        <Route path="/powers" element={<ProtectedRoute><PowerLibrary /></ProtectedRoute>} />
        <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
        <Route path="*" element={<main className="mx-auto grid min-h-[65vh] max-w-xl place-items-center px-4 text-center"><div><p className="text-xs uppercase tracking-[.24em] text-ember">404</p><h1 className="mt-2 font-display text-4xl text-white">Caminho não encontrado</h1><p className="mt-3 text-mist">Esta passagem não existe ou foi removida.</p><Link to="/" className="mt-6 inline-flex min-h-11 items-center rounded-md border border-ember/35 px-4 text-ember">Voltar ao início</Link></div></main>} />
      </Routes></Suspense>
    </Layout>
  );
}
