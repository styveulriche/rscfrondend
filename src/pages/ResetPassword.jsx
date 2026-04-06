import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle } from 'react-icons/fa';
import { resetPassword } from '../services/auth';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await resetPassword({ token, newPassword });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Lien invalide ou expiré. Veuillez refaire la demande.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-form-side" style={{ textAlign: 'center' }}>
          <div className="auth-logo">RSC</div>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 20 }}>
            Lien de réinitialisation invalide ou manquant.
          </p>
          <Link to="/mot-de-passe-oublie" style={{ color: 'white', textDecoration: 'underline' }}>
            Refaire une demande
          </Link>
        </div>
        <div className="auth-image-side">
          <img src="/images/image-section1.png" alt="RSC" style={{ width: '100%', height: '100%', minHeight: '100vh', objectFit: 'cover' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-form-side">
        <div className="auth-logo">RSC</div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <FaCheckCircle size={52} color="#22c55e" style={{ marginBottom: 16 }} />
            <h2 style={{ color: 'white', fontWeight: 800, fontSize: 20, marginBottom: 10 }}>Mot de passe réinitialisé !</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.6 }}>
              Redirection vers la page de connexion…
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ color: 'white', fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Nouveau mot de passe</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
              Choisissez un mot de passe sécurisé d'au moins 6 caractères.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div style={{ background: 'rgba(230,120,0,0.25)', border: '1px solid rgba(230,150,0,0.5)', borderRadius: 6, padding: '10px 14px', color: '#FFD580', fontSize: 13, fontWeight: 600 }}>
                  {error}
                </div>
              )}

              {[
                { label: 'Nouveau mot de passe', val: newPassword, setVal: setNewPassword, show: showNew, toggle: () => setShowNew(v => !v) },
                { label: 'Confirmer le mot de passe', val: confirm, setVal: setConfirm, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
              ].map(({ label, val, setVal, show, toggle }) => (
                <div key={label} style={{ position: 'relative' }}>
                  <FaLock size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                  <input
                    className="auth-input"
                    type={show ? 'text' : 'password'}
                    placeholder={label}
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    style={{ paddingLeft: 40, paddingRight: 44 }}
                    required
                  />
                  <button type="button" onClick={toggle}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 0 }}>
                    {show ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              ))}

              <button type="submit" className="btn-auth" disabled={loading}>
                {loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
      <div className="auth-image-side">
        <img src="/images/image-section1.png" alt="RSC" style={{ width: '100%', height: '100%', minHeight: '100vh', objectFit: 'cover' }} />
      </div>
    </div>
  );
}
