import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/authStore';

export default function ProtectedRoute({ children, role }) {
  const { user, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <main className="grid min-h-[calc(100vh-144px)] place-items-center px-4">
        <div className="gothic-panel rounded-md p-6 text-center">
          <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-ember/30 border-t-ember" />
          <p className="mt-4 text-sm text-mist">Verificando sua sessao...</p>
        </div>
      </main>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return children;
}
