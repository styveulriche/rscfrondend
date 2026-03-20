import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminRoute({ children, allowedRoles }) {
  const { user, loading, isAdmin, hasRole } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-gray)', fontSize: 16 }}>Chargement…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  const allowed = allowedRoles && allowedRoles.length > 0
    ? hasRole(allowedRoles)
    : isAdmin;

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default AdminRoute;
