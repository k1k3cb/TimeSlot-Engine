import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Cargando...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}