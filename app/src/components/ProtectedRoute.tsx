import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';
import { authUrlFor } from '../lib/authLocale';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      const target = location.pathname + location.search + location.hash;
      navigate(authUrlFor(location.pathname, 'login', target), { state: { returnState: location.state } });
    }
  }, [user, loading, navigate, location.pathname, location.search, location.hash, location.state]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-blue-100 flex items-center justify-center">
        <div className="text-blue-200 text-lg">載入中...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
