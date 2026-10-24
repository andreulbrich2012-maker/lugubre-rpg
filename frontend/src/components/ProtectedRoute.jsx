import { Navigate, useLocation } from 'react-router-dom';
import { AUTH_TOKEN_KEY } from '../lib/api';
import { useAuth } from '../store/authStore';

export default function ProtectedRoute({ children, role }) {
  const { user, authLoading } = useAuth();
  const location = useLocation();
  const hasStoredToken = Boolean(localStorage.getItem(AUTH_TOKEN_KEY));

  if (!hasStoredToken) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (authLoading) {
    return (
      <main className="grid min-h-[calc(100vh-144px)] place-items-center px-4">
        <div className="gothic-panel p-6 text-center">
          <span className="spinner mx-auto" />
          <p className="mt-4 text-sm text-mist">Verificando sua sessão...</p>
        </div>
      </main>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return children;
}
