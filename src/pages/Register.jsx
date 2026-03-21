import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaShieldAlt, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { verifyEmailCode, resendVerificationEmail } from '../services/auth';

const DIGITS_COUNT = 6;

function VerifyModal({ email, onSubmitCode, onResend, onClose, verifying, resending, apiError }) {
  const [digits, setDigits] = useState(Array(DIGITS_COUNT).fill(''));
  const [inputError, setInputError] = useState('');
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const handleDigit = (val, i) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setInputError('');
    if (val && i < DIGITS_COUNT - 1) refs[i + 1].current.focus();
  };

  const handleKeyDown = (e, i) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS_COUNT);
    if (pasted.length === DIGITS_COUNT) {
      setDigits(pasted.split(''));
      refs[DIGITS_COUNT - 1].current.focus();
    }
    e.preventDefault();
  };

  const handleVerify = () => {
    const entered = digits.join('');
    if (entered.length < DIGITS_COUNT) {
      setInputError(`Veuillez entrer les ${DIGITS_COUNT} chiffres.`);
      return;
    }
    setInputError('');
    onSubmitCode(entered);
  };

  const closeDisabled = verifying || resending;

  return (
    <div className="twofa-overlay">
      <div className="twofa-modal">
        <button className="twofa-close" onClick={() => !closeDisabled && onClose()} disabled={closeDisabled}>
          <FaTimes size={16} />
        </button>
        <div className="twofa-icon-wrap">
          <FaShieldAlt size={26} color="white" />
        </div>
        <h3 className="twofa-title">Vérification de l'email</h3>
        <p className="twofa-subtitle">Un code à 6 chiffres a été envoyé à</p>
        <p className="twofa-email">
          <FaEnvelope size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {email}
        </p>
        <div className="twofa-digits" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              className={`twofa-digit ${(inputError || apiError) ? 'twofa-digit--error' : ''}`}
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
        {(inputError || apiError) && <p className="twofa-error">{inputError || apiError}</p>}
        <button className="twofa-btn" onClick={handleVerify} disabled={verifying}>
          {verifying ? 'Vérification...' : 'Confirmer le code'}
        </button>
        <p className="twofa-resend">
          Vous n'avez pas reçu le code ?{' '}
          <span
            style={{ color: 'var(--red-primary)', cursor: resending ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: resending ? 0.6 : 1 }}
            onClick={!resending ? onResend : undefined}
          >
            {resending ? 'Envoi...' : 'Renvoyer'}
          </span>
        </p>
      </div>
    </div>
  );
}

const INITIAL = {
  username: '',
  email: '',
  motDePasse: '',
};

function Register() {
  const navigate = useNavigate();
  const { register, login, completeLogin } = useAuth();

  const [form, setForm] = useState(INITIAL);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpError, setOtpError] = useState('');

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    if (!form.username.trim()) return "Le nom d'utilisateur est obligatoire.";
    if (!form.email.trim()) return "L'adresse email est obligatoire.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Adresse email invalide.';
    if (form.motDePasse.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        motDePasse: form.motDePasse,
      };
      await register(payload);
      setPendingEmail(payload.email);
      setPendingPassword(form.motDePasse);
      setOtpError('');
      setShowModal(true);
    } catch (err) {
      const data = err?.response?.data;
      const msg =
        data?.message ||
        data?.error ||
        (Array.isArray(data?.errors) ? data.errors.map((e) => e.defaultMessage || e.message || String(e)).join(' — ') : null) ||
        (typeof data === 'string' ? data : null) ||
        err?.message ||
        'Impossible de créer le compte. Vérifiez vos informations.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async (code) => {
    setVerifying(true);
    setOtpError('');
    try {
      const verified = await verifyEmailCode({ email: pendingEmail, code });
      setShowModal(false);
      if (verified?.token || verified?.accessToken) {
        await completeLogin(verified);
        navigate('/dashboard');
        return;
      }
      await login({ email: pendingEmail, motDePasse: pendingPassword });
      navigate('/dashboard');
    } catch {
      setOtpError('Code invalide ou expiré.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setOtpError('');
    try {
      await resendVerificationEmail({ email: pendingEmail });
    } catch {
      setOtpError("Impossible d'envoyer le code pour le moment.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      {showModal && (
        <VerifyModal
          email={pendingEmail}
          onSubmitCode={handleVerifyCode}
          onResend={handleResend}
          onClose={() => setShowModal(false)}
          verifying={verifying}
          resending={resending}
          apiError={otpError}
        />
      )}

      <div className="auth-form-side">
        <div className="auth-logo">RSC</div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: 'rgba(255,80,80,0.2)', border: '1px solid rgba(255,100,100,0.4)', borderRadius: 6, padding: '10px 14px', color: 'white', fontSize: 13 }}>
              {error}
            </div>
          )}

          <input
            className="auth-input"
            type="text"
            placeholder="Nom d'utilisateur *"
            value={form.username}
            onChange={set('username')}
            required
          />
          <input
            className="auth-input"
            type="email"
            placeholder="Email *"
            value={form.email}
            onChange={set('email')}
            required
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Mot de passe *"
            value={form.motDePasse}
            onChange={set('motDePasse')}
            required
          />

          <button type="submit" className="btn-auth" disabled={submitting} style={{ marginTop: 16 }}>
            {submitting ? 'Création en cours…' : 'Créer mon compte'}
          </button>

          <p className="auth-link">
            Déjà un compte ? <Link to="/login">Se connecter</Link>
          </p>
        </form>
      </div>

      <div className="auth-image-side">
        <img src="/images/image-section1.png" alt="RSC — Solidarité diaspora"
          style={{ width: '100%', height: '100%', minHeight: '100vh', objectFit: 'cover' }} />
      </div>
    </div>
  );
}

export default Register;
