import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

/**
 * Send signed-in users to their role home; otherwise to /login.
 * Used for `/` (PWA start_url) and unknown paths so reopening the app
 * does not force a fresh password entry when the session is still valid.
 */
export function AuthEntryRedirect() {
  const { loading, session, profile, role } = useAuth();

  if (loading || (session && !profile)) {
    return <div className="stage" style={{ alignItems: 'center' }} />;
  }
  if (role === 'teacher') return <Navigate to="/t" replace />;
  if (role === 'parent') return <Navigate to="/p" replace />;
  return <Navigate to="/login" replace />;
}
