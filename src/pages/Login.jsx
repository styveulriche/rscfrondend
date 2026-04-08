import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaShieldAlt, FaTimes, FaEnvelope } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { verifyMfa, resendVerificationEmail } from '../services/auth';

/* ── Modal MFA ──────────────────────────────────────────────────── */
const DIGITS_COUNT = 6;

function MfaModal({ email, onVerify, onClose, verifying, error }) {
  const [digits, setDigits] = useState(Array(DIGITS_COUNT).fill(''));
  const [inputError, setInputError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const r0 = useRef(); const r1 = useRef(); const r2 = useRef();
  const r3 = useRef(); const r4 = useRef(); const r5 = useRef();
  const refs = [r0, r1, r2, r3, r4, r5];

  const handleDigit = (val, i) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setInputError('');
    if (val && i < DIGITS_COUNT - 1) refs[i + 1].current?.focus();
  };

  const handleKeyDown = (e, i) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS_COUNT);
    if (pasted.length === DIGITS_COUNT) {
      setDigits(pasted.split(''));
      refs[DIGITS_COUNT - 1].current?.focus();
    }
    e.preventDefault();
  };

  const handleVerify = () => {
    const code = digits.join('');
    if (code.length < DIGITS_COUNT) { setInputError(`Entrez les ${DIGITS_COUNT} chiffres.`); return; }
    setInputError('');
    onVerify(code);
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
    try {
      await resendVerificationEmail({ email });
      setResendMsg('Code renvoyé !');
    } catch {
      setResendMsg('Impossible de renvoyer le code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="twofa-overlay">
      <div className="twofa-modal">
        <button className="twofa-close" onClick={onClose} disabled={verifying}>
          <FaTimes size={16} />
        </button>
        <div className="twofa-icon-wrap">
          <FaShieldAlt size={26} color="white" />
        </div>
        <h3 className="twofa-title">Authentification à deux facteurs</h3>
        <p className="twofa-subtitle">Entrez le code envoyé à</p>
        <p className="twofa-email">
          <FaEnvelope size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {email}
        </p>
        <div className="twofa-digits" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              className={`twofa-digit ${(inputError || error) ? 'twofa-digit--error' : ''}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(e.target.value, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              autoFocus={i === 0}
            />
          ))}
        </div>
        {(inputError || error) && <p className="twofa-error">{inputError || error}</p>}
        {resendMsg && <p style={{ fontSize: 12, color: resendMsg.includes('!') ? '#22c55e' : '#ef5350', textAlign: 'center', margin: '4px 0' }}>{resendMsg}</p>}
        <button className="twofa-btn" onClick={handleVerify} disabled={verifying}>
          {verifying ? 'Vérification…' : 'Confirmer'}
        </button>
        <p className="twofa-resend">
          Pas reçu ?{' '}
          <span
            style={{ color: 'var(--red-primary)', cursor: resending ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: resending ? 0.6 : 1 }}
            onClick={!resending ? handleResend : undefined}
          >
            {resending ? 'Envoi…' : 'Renvoyer'}
          </span>
        </p>
      </div>
    </div>
  );
}

/* ── Page Login ─────────────────────────────────────────────────── */
function Login() {
  const navigate = useNavigate();
  const { login, completeLogin } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /* MFA state */
  const [mfaPending, setMfaPending] = useState(false);
  const [mfaEmail, setMfaEmail] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaError, setMfaError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Veuillez remplir tous les champs.'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await login({ email: form.email, motDePasse: form.password });

      // Cas MFA requis — le serveur renvoie mfaRequired: true sans token
      if (result?.mfaRequired) {
        setMfaEmail(result.email || form.email);
        setMfaPending(true);
        return;
      }

      // Connexion directe réussie
      const roles = result?.roles || [];
      const isAdmin = roles.some((r) =>
        ['SUPER_ADMIN', 'ADMIN_FINANCIER', 'ADMIN_VALIDATEUR', 'ADMIN_SUPPORT', 'ADMIN_CONTENU', 'ADMIN', 'ADMINISTRATEUR'].includes(r)
      );
      navigate(isAdmin ? '/dashboard/statistiques' : '/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Échec de l\'authentification — vérifiez vos identifiants.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (code) => {
    setMfaVerifying(true);
    setMfaError('');
    try {
      const result = await verifyMfa({ email: mfaEmail, code });
      setMfaPending(false);
      const profile = await completeLogin(result);
      const roles = profile?.roles || [];
      const isAdmin = roles.some((r) =>
        ['SUPER_ADMIN', 'ADMIN_FINANCIER', 'ADMIN_VALIDATEUR', 'ADMIN_SUPPORT', 'ADMIN_CONTENU', 'ADMIN', 'ADMINISTRATEUR'].includes(r)
      );
      navigate(isAdmin ? '/dashboard/statistiques' : '/dashboard');
    } catch {
      setMfaError('Code MFA invalide ou expiré.');
    } finally {
      setMfaVerifying(false);
    }
  };

  return (
    <div className="auth-page">
      {mfaPending && (
        <MfaModal
          email={mfaEmail}
          onVerify={handleMfaVerify}
          onClose={() => { setMfaPending(false); setMfaError(''); }}
          verifying={mfaVerifying}
          error={mfaError}
        />
      )}

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
