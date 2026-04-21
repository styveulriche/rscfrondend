import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { safeStorage } from '../utils/safeStorage';

const PROFILE_REQUIRED_FIELDS = ['telephone', 'paysOrigine', 'statutDiaspora', 'dateNaissance'];

export const isProfileIncomplete = (user) => {
  if (!user) return false;
  // Si l'utilisateur a déjà complété son profil une fois, ne plus bloquer
  if (safeStorage.getItem('rsc_profile_completed') === String(user.id)) return false;
  return PROFILE_REQUIRED_FIELDS.some((field) => !user[field]);
};

const ALLOWED_WHEN_INCOMPLETE = ['/dashboard/parametres'];

export default function PrivateRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-gray)', fontSize: 16 }}>Chargement…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const profileJustCompleted = location.state?.profileJustCompleted === true;

  const blocked =
    !isAdmin &&
    !profileJustCompleted &&
    isProfileIncomplete(user) &&
    !ALLOWED_WHEN_INCOMPLETE.some((p) => location.pathname.startsWith(p));

  if (blocked) {
    return <Navigate to="/dashboard/parametres" replace state={{ profileRequired: true }} />;
  }

  return children;
}
