import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import type { Role } from '@/types/domain';

// Route to the correct role's UI (DEVELOPMENT.md §9). Redirects to /login when signed out,
// and blocks the wrong role from another role's routes.
export function RoleGate({ allow, children }: { allow: Role; children: React.ReactNode }) {
  const { role, loading } = useAuth();

  if (loading) {
    return <div className="stage" style={{ alignItems: 'center' }} />;
  }
  if (!role) {
    return <Navigate to="/login" replace />;
  }
  if (role !== allow) {
    return <Navigate to={role === 'teacher' ? '/t' : '/p'} replace />;
  }
  return <>{children}</>;
}
