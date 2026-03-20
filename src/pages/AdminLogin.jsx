import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email || !form.password) {
      setError('Veuillez renseigner vos identifiants administrateur.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(
        { email: form.email, motDePasse: form.password },
        { requireAdmin: true },
      );
      navigate('/dashboard/gestion-utilisateurs', { replace: true });
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Impossible de vous authentifier en tant que gestionnaire.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-form-side">
        <div className="auth-logo">RSC</div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: 'rgba(255,80,80,0.2)', border: '1px solid rgba(255,100,100,0.4)', borderRadius: 6, padding: '10px 14px', color: 'white', fontSize: 13 }}>
              {error}
            </div>
          )}
          <input className="auth-input" type="email" placeholder="Email"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="auth-input" type="password" placeholder="Mot de passe"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <button type="submit" className="btn-auth" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
          <p className="auth-link">
            Pas encore de compte ? <Link to="/inscription">Créer</Link>
          </p>
        </form>
      </div>
      <div className="auth-image-side">
        <img src="/images/image-section1.png" alt="RSC"
          style={{ width: '100%', height: '100%', minHeight: '100vh', objectFit: 'cover' }} />
      </div>
    </div>
  );
}

export default AdminLogin;
