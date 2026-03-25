import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login({ email: form.email, motDePasse: form.password });
      navigate('/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message || "Échec de l'authentification — vérifiez vos identifiants.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-form-side">
        <div className="auth-logo">RSC</div>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 13, color: 'rgba(255,255,255,0.75)', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '6px 14px', transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          ← Accueil
        </Link>
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

export default Login;
