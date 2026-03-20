import { useRef, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaShieldAlt, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { verifyEmailCode, resendVerificationEmail } from '../services/auth';

/* ── Modal générique code à 6 chiffres ── */
const DIGITS_COUNT = 6;

function VerifyModal({ email, title, subtitle, onSubmitCode, onResend, onClose, verifying, resending, apiError }) {
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
        <h3 className="twofa-title">{title || "Vérification de l'email"}</h3>
        <p className="twofa-subtitle">{subtitle || 'Un code à 6 chiffres a été envoyé à'}</p>
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

/* ── Page Register ── */
const STEPS = ['Identité', 'Coordonnées', 'Titre de séjour', 'Sécurité'];

const STATUT_DIASPORA_OPTIONS = [
  { value: '', label: 'Sélectionner' },
  { value: 'RESIDENT_PERMANENT', label: 'Résident permanent' },
  { value: 'RESIDENT_TEMPORAIRE', label: 'Résident temporaire' },
  { value: 'DIASPORA', label: 'Diaspora' },
  { value: 'CITOYEN', label: 'Citoyen' },
];

const INITIAL = {
  nom: '',
  prenom: '',
  dateNaissance: '',
  sexe: '',
  telephone: '',
  email: '',
  motDePasse: '',
  confirmMotDePasse: '',
  statutDiaspora: '',
  numeroPermis: '',
  typePermis: '',
  dateExpirationPermis: '',
  codeParrainage: '',
};

function Register() {
  const navigate = useNavigate();
  const { register, login, completeLogin } = useAuth();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Email verification modal
  const [showModal, setShowModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpError, setOtpError] = useState('');


  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validateStep = (s) => {
    switch (s) {
      case 0:
        if (!form.nom.trim()) return 'Le nom est obligatoire.';
        if (!form.prenom.trim()) return 'Le prénom est obligatoire.';
        if (!form.dateNaissance) return 'La date de naissance est obligatoire.';
        if (!form.sexe) return 'Le sexe est obligatoire.';
        if (!form.statutDiaspora) return 'Le statut diaspora est obligatoire.';
        return null;
      case 1:
        if (!form.telephone.trim()) return 'Le numéro de téléphone est obligatoire.';
        if (!form.email.trim()) return 'L\'adresse email est obligatoire.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Adresse email invalide.';
        return null;
      case 2:
        if (!form.typePermis.trim()) return 'Le type de pièce d\'identité est obligatoire.';
        if (!form.numeroPermis.trim()) return 'Le numéro de pièce d\'identité est obligatoire.';
        if (!form.dateExpirationPermis) return 'La date d\'expiration est obligatoire.';
        return null;
      case 3:
        if (form.motDePasse.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
        if (!/[A-Z]/.test(form.motDePasse) || !/[a-z]/.test(form.motDePasse) || !/\d/.test(form.motDePasse)) {
          return 'Le mot de passe doit contenir majuscules, minuscules et un chiffre.';
        }
        if (form.motDePasse !== form.confirmMotDePasse) return 'Les mots de passe ne correspondent pas.';
        return null;
      default:
        return null;
    }
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError('');
    setStep((p) => p + 1);
  };

  const handlePrev = () => {
    setError('');
    setStep((p) => p - 1);
  };

  /* Payload exact selon la spec API */
  const buildPayload = useMemo(() => ({
    nom: form.nom.trim(),
    prenom: form.prenom.trim(),
    dateNaissance: form.dateNaissance,
    sexe: form.sexe,
    telephone: form.telephone.trim(),
    email: form.email.trim().toLowerCase(),
    motDePasse: form.motDePasse,
    statutDiaspora: form.statutDiaspora,
    numeroPermis: form.numeroPermis.trim(),
    typePermis: form.typePermis.trim(),
    dateExpirationPermis: form.dateExpirationPermis,
    ...(form.codeParrainage.trim() ? { codeParrainage: form.codeParrainage.trim() } : {}),
  }), [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    /* Valider toutes les étapes avant d'envoyer */
    for (let i = 0; i < STEPS.length; i++) {
      const err = validateStep(i);
      if (err) { setError(err); setStep(i); return; }
    }
    setError('');
    setSubmitting(true);
    try {
      await register(buildPayload);
      setPendingEmail(buildPayload.email);
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
      // Si la vérification email retourne directement un token, on s'en sert
      if (verified?.token || verified?.accessToken) {
        await completeLogin(verified);
        navigate('/dashboard');
        return;
      }
      // Sinon on tente la connexion automatique
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

          {/* Indicateur d'étapes */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {STEPS.map((title, i) => (
              <div key={title} style={{
                flex: 1, padding: '7px 6px', borderRadius: 6, textAlign: 'center', fontSize: 12,
                border: i === step ? '1px solid var(--red-primary)' : '1px solid rgba(255,255,255,0.2)',
                background: i < step ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: 'white',
              }}>
                {i + 1}. {title}
              </div>
            ))}
          </div>

          {/* Étape 0 — Identité */}
          {step === 0 && (
            <>
              <input className="auth-input" type="text" placeholder="Nom *"
                value={form.nom} onChange={set('nom')} required />
              <input className="auth-input" type="text" placeholder="Prénom *"
                value={form.prenom} onChange={set('prenom')} required />
              <input className="auth-input" type="date" placeholder="Date de naissance *"
                value={form.dateNaissance} onChange={set('dateNaissance')} required />
              <select className="auth-input" value={form.sexe} onChange={set('sexe')} required>
                <option value="">Sexe *</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
              <select className="auth-input" value={form.statutDiaspora} onChange={set('statutDiaspora')} required>
                {STATUT_DIASPORA_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </>
          )}

          {/* Étape 1 — Coordonnées */}
          {step === 1 && (
            <>
              <input className="auth-input" type="tel" placeholder="Téléphone * (ex: 6131704106)"
                value={form.telephone} onChange={set('telephone')} required />
              <input className="auth-input" type="email" placeholder="Email *"
                value={form.email} onChange={set('email')} required />
              <input className="auth-input" type="text" placeholder="Code de parrainage (optionnel)"
                value={form.codeParrainage} onChange={set('codeParrainage')} />
            </>
          )}

          {/* Étape 2 — Titre de séjour */}
          {step === 2 && (
            <>
              <input className="auth-input" type="text" placeholder="Type de pièce d'identité *"
                value={form.typePermis} onChange={set('typePermis')} required />
              <input className="auth-input" type="text" placeholder="Numéro de pièce d'identité *"
                value={form.numeroPermis} onChange={set('numeroPermis')} required />
              <input className="auth-input" type="date" placeholder="Date d'expiration *"
                value={form.dateExpirationPermis} onChange={set('dateExpirationPermis')} required />
            </>
          )}

          {/* Étape 3 — Sécurité */}
          {step === 3 && (
            <>
              <input className="auth-input" type="password" placeholder="Mot de passe *"
                value={form.motDePasse} onChange={set('motDePasse')} required />
              <input className="auth-input" type="password" placeholder="Confirmer le mot de passe *"
                value={form.confirmMotDePasse} onChange={set('confirmMotDePasse')} required />
            </>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            {step > 0 && (
              <button type="button" className="btn-auth" style={{ background: 'rgba(255,255,255,0.15)' }} onClick={handlePrev}>
                Précédent
              </button>
            )}
            {step < STEPS.length - 1 && (
              <button type="button" className="btn-auth" onClick={handleNext}>
                Continuer
              </button>
            )}
            {step === STEPS.length - 1 && (
              <button type="submit" className="btn-auth" disabled={submitting}>
                {submitting ? 'Création en cours…' : 'Créer mon compte'}
              </button>
            )}
          </div>

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
