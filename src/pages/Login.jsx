import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const profile = await login({ email: form.email, motDePasse: form.password });
      const roles = profile?.roles || [];
      const isAdmin = roles.some((r) =>
        ['SUPER_ADMIN','ADMIN_FINANCIER','ADMIN_VALIDATEUR','ADMIN_SUPPORT','ADMIN_CONTENU','ADMIN','ADMINISTRATEUR'].includes(r)
      );
      navigate(isAdmin ? '/dashboard/statistiques' : '/dashboard');
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
            <div style={{ background: 'rgba(230,120,0,0.25)', border: '1px solid rgba(230,150,0,0.5)', borderRadius: 6, padding: '10px 14px', color: '#FFD580', fontSize: 13, fontWeight: 600 }}>
              {error}
            </div>
          )}
          <input className="auth-input" type="email" placeholder="Email"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <div style={{ position: 'relative' }}>
            <input className="auth-input" type={showPassword ? 'text' : 'password'} placeholder="Mot de passe"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{ width: '100%', paddingRight: 44 }} required />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 0 }}>
              {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
            </button>
          </div>
          <div style={{ textAlign: 'right', marginTop: -8 }}>
            <Link to="/mot-de-passe-oublie" style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', textDecoration: 'underline' }}>
              Mot de passe oublié ?
            </Link>
          </div>
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
