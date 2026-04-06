import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaCheckCircle } from 'react-icons/fa';
import { forgotPassword } from '../services/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email);
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Impossible d\'envoyer l\'email. Vérifiez l\'adresse saisie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-form-side">
        <div className="auth-logo">RSC</div>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 13, color: 'rgba(255,255,255,0.75)', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '6px 14px' }}>
          ← Retour à la connexion
        </Link>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <FaCheckCircle size={52} color="#22c55e" style={{ marginBottom: 16 }} />
            <h2 style={{ color: 'white', fontWeight: 800, fontSize: 20, marginBottom: 10 }}>Email envoyé !</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.<br />
              Vérifiez votre boîte de réception (et vos spams).
            </p>
            <Link to="/login" style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 8, padding: '10px 24px', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <h2 style={{ color: 'white', fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Mot de passe oublié ?</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div style={{ background: 'rgba(230,120,0,0.25)', border: '1px solid rgba(230,150,0,0.5)', borderRadius: 6, padding: '10px 14px', color: '#FFD580', fontSize: 13, fontWeight: 600 }}>
                  {error}
                </div>
              )}
              <div style={{ position: 'relative' }}>
                <FaEnvelope size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                <input
                  className="auth-input"
                  type="email"
                  placeholder="Votre adresse email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: 40 }}
                  required
                />
              </div>
              <button type="submit" className="btn-auth" disabled={loading}>
                {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
              </button>
            </form>
          </>
        )}
      </div>
      <div className="auth-image-side">
        <img src="/images/image-section1.png" alt="RSC"
          style={{ width: '100%', height: '100%', minHeight: '100vh', objectFit: 'cover' }} />
      </div>
    </div>
  );
}
