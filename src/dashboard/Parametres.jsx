import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaPhone, FaLock, FaEye, FaEyeSlash, FaShieldAlt, FaExclamationTriangle } from 'react-icons/fa';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import { updateUser as updateUserService } from '../services/users';
import { getStatutsDiaspora } from '../services/public';
import api from '../services/api';

const STATUT_DIASPORA_FALLBACK = [
  { value: 'RESIDENT_PERMANENT', label: 'Résident' },
  { value: 'CITOYEN_CANADIEN', label: 'Citoyen canadien' },
  { value: 'ETUDIANT_INTERNATIONAL', label: 'Étudiant international' },
  { value: 'TRAVAILLEUR_TEMPORAIRE', label: 'Travailleur temporaire' },
  { value: 'REFUGIE', label: 'Réfugié' },
];

const PAYS_OPTIONS = [
  'Cameroun', 'Côte d\'Ivoire', 'Sénégal', 'Mali', 'Guinée', 'Bénin',
  'Burkina Faso', 'Togo', 'Niger', 'Congo', 'RD Congo', 'Gabon',
  'Madagascar', 'Mauritanie', 'Haïti', 'Autre',
];

const CA_PHONE_PATTERN = '(\\+?1[\\s\\-]?)?\\(?[2-9][0-9]{2}\\)?[\\s\\-]?[0-9]{3}[\\s\\-]?[0-9]{4}';

function Parametres() {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const profileRequired = location.state?.profileRequired === true;

  const [profile, setProfile] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    paysOrigine: '',
    statutDiaspora: '',
    dateNaissance: '',
    sexe: '',
  });

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [showPass, setShowPass] = useState({ current: false, next: false, confirm: false });
  const [profileStatus, setProfileStatus] = useState(null);
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [statutOptions, setStatutOptions] = useState(STATUT_DIASPORA_FALLBACK);

  useEffect(() => {
    getStatutsDiaspora()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) {
          setStatutOptions(list.map((s) => ({
            value: s.value ?? s.code ?? s,
            label: s.label ?? s.libelle ?? s.description ?? s.nom ?? s.code ?? String(s),
          })));
        }
      })
      .catch(() => {});
  }, []);

  // Seed form from auth context when user loads
  useEffect(() => {
    if (user) {
      setProfile({
        nom: user.nom || user.name || '',
        prenom: user.prenom || '',
        email: user.email || '',
        telephone: user.telephone || '',
        paysOrigine: user.paysOrigine || '',
        statutDiaspora: user.statutDiaspora || '',
        dateNaissance: user.dateNaissance ? user.dateNaissance.split('T')[0] : '',
        sexe: user.sexe || '',
      });
    }
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setProfileLoading(true);
    setProfileStatus(null);
    try {
      const payload = {
        nom: profile.nom,
        prenom: profile.prenom,
        email: profile.email,
        telephone: profile.telephone,
        paysOrigine: profile.paysOrigine || null,
        statutDiaspora: profile.statutDiaspora || null,
        dateNaissance: profile.dateNaissance || null,
        sexe: profile.sexe || null,
      };
      const updated = await updateUserService(user.id, payload);
      // Fusionner : réponse backend + données du formulaire comme fallback garanti
      const mergedUser = { ...user, ...updated, ...payload };
      updateUser(mergedUser);
      // Vérifier la complétude sur les valeurs du formulaire (source fiable)
      const formComplete = !!(
        profile.telephone &&
        profile.paysOrigine &&
        profile.statutDiaspora &&
        profile.dateNaissance
      );
      if (formComplete) {
        // Marquer définitivement le profil comme complété pour les prochaines connexions
        localStorage.setItem('rsc_profile_completed', String(user.id));
      }
      if (formComplete && profileRequired) {
        navigate('/dashboard/statistiques', { replace: true, state: { profileJustCompleted: true } });
        return;
      }
      setProfileStatus({ type: 'success', message: 'Profil mis à jour avec succès.' });
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Erreur lors de la mise à jour.';
      setProfileStatus({ type: 'error', message });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    if (passwords.next !== passwords.confirm) {
      setPasswordStatus({ type: 'error', message: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    if (passwords.next.length < 6) {
      setPasswordStatus({ type: 'error', message: 'Le mot de passe doit contenir au moins 6 caractères.' });
      return;
    }
    setPasswordLoading(true);
    setPasswordStatus(null);
    try {
      await api.put(`/utilisateurs/${user.id}/mot-de-passe`, {
        motDePasseActuel: passwords.current,
        nouveauMotDePasse: passwords.next,
      });
      setPasswordStatus({ type: 'success', message: 'Mot de passe modifié avec succès.' });
      setPasswords({ current: '', next: '', confirm: '' });
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Impossible de modifier le mot de passe.';
      setPasswordStatus({ type: 'error', message });
    } finally {
      setPasswordLoading(false);
    }
  };

  const toggleShow = (field) => setShowPass((prev) => ({ ...prev, [field]: !prev[field] }));

  const initials = user
    ? `${(user.prenom || user.nom || '?')[0]}${(user.nom || '')[1] || ''}`.toUpperCase()
    : '?';

  return (
    <div>
      <StatsRow />

      {profileRequired && (
        <div style={{
          background: 'rgba(139,28,28,0.08)',
          border: '1px solid rgba(139,28,28,0.25)',
          borderRadius: 10,
          padding: '14px 18px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}>
          <FaExclamationTriangle size={16} color="var(--red-primary)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--red-primary)' }}>
              Complétez votre profil pour continuer
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-gray)' }}>
              Les champs <strong>téléphone</strong>, <strong>pays d'origine</strong>, <strong>statut diaspora</strong> et <strong>date de naissance</strong> sont requis pour accéder à toutes les fonctionnalités RSC.
            </p>
          </div>
        </div>
      )}

      <div className="content-card">
        {/* Avatar section */}
        <div className="settings-avatar-section">
          <div className="settings-avatar" style={{ fontSize: 22, fontWeight: 700, background: 'var(--red-primary)', color: 'white' }}>
            {initials}
          </div>
          <div>
            <p className="settings-name">{profile.prenom} {profile.nom}</p>
            <p style={{ fontSize: 12, color: 'var(--text-gray)', margin: 0 }}>{profile.email}</p>
          </div>
        </div>

        {/* Profile form */}
        <form onSubmit={handleProfileSave}>
          <div className="settings-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaUser size={13} color="var(--red-primary)" /> Informations personnelles
            </h3>
            <div className="settings-grid">
              <div>
                <p className="settings-label">Prénom</p>
                <input
                  className="form-input"
                  value={profile.prenom}
                  onChange={(e) => setProfile({ ...profile, prenom: e.target.value })}
                  placeholder="Prénom"
                />
              </div>
              <div>
                <p className="settings-label">Nom</p>
                <input
                  className="form-input"
                  value={profile.nom}
                  onChange={(e) => setProfile({ ...profile, nom: e.target.value })}
                  placeholder="Nom de famille"
                />
              </div>
              <div>
                <p className="settings-label">Email</p>
                <div style={{ position: 'relative' }}>
                  <FaEnvelope size={12} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-card)' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 32 }}
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="email@exemple.com"
                  />
                </div>
              </div>
              <div>
                <p className="settings-label">Téléphone</p>
                <div style={{ position: 'relative' }}>
                  <FaPhone size={12} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-card)' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 32 }}
                    type="tel"
                    value={profile.telephone}
                    onChange={(e) => setProfile({ ...profile, telephone: e.target.value })}
                    placeholder="+1 514 000 0000"
                    pattern={CA_PHONE_PATTERN}
                    title="Numéro canadien requis, ex : +1 514 000 0000"
                  />
                </div>
              </div>
              <div>
                <p className="settings-label">Date de naissance</p>
                <input
                  className="form-input"
                  type="date"
                  value={profile.dateNaissance}
                  onChange={(e) => setProfile({ ...profile, dateNaissance: e.target.value })}
                />
              </div>
              <div>
                <p className="settings-label">Sexe</p>
                <select
                  className="form-input"
                  value={profile.sexe}
                  onChange={(e) => setProfile({ ...profile, sexe: e.target.value })}
                >
                  <option value="">Sélectionner</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>
          </div>

          {/* Secondary info */}
          <div className="settings-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaShieldAlt size={13} color="var(--red-primary)" /> Informations secondaires
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-gray)', marginBottom: 14 }}>
              Ces informations sont nécessaires pour évaluer votre éligibilité aux services RSC.
            </p>
            <div className="settings-grid">
              <div>
                <p className="settings-label">Pays d'origine</p>
                <select
                  className="form-input"
                  value={profile.paysOrigine}
                  onChange={(e) => setProfile({ ...profile, paysOrigine: e.target.value })}
                >
                  <option value="">Sélectionner le pays</option>
                  {PAYS_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <p className="settings-label">Statut dans la diaspora</p>
                <select
                  className="form-input"
                  value={profile.statutDiaspora}
                  onChange={(e) => setProfile({ ...profile, statutDiaspora: e.target.value })}
                >
                  <option value="">Sélectionner votre statut</option>
                  {statutOptions.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {profileStatus && (
            <div style={{
              marginBottom: 14,
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 13,
              background: profileStatus.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
              color: profileStatus.type === 'success' ? '#2e7d32' : '#c62828',
            }}>
              {profileStatus.message}
            </div>
          )}

          <button type="submit" className="btn-add" style={{ padding: '13px 40px' }} disabled={profileLoading}>
            {profileLoading ? 'Enregistrement…' : 'Sauvegarder les modifications'}
          </button>
        </form>
      </div>

      {/* Password change card */}
      <div className="content-card" style={{ marginTop: 20 }}>
        <h3 className="content-card-title" style={{ marginBottom: 4 }}>
          <FaLock size={13} style={{ marginRight: 8, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
          Sécurité — Changer le mot de passe
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text-gray)', marginBottom: 20 }}>
          Utilisez un mot de passe fort d'au moins 8 caractères incluant lettres et chiffres.
        </p>

        <form onSubmit={handlePasswordChange}>
          <div className="settings-grid">
            {[
              { key: 'current', label: 'Mot de passe actuel', placeholder: '••••••••' },
              { key: 'next', label: 'Nouveau mot de passe', placeholder: '••••••••' },
              { key: 'confirm', label: 'Confirmer le nouveau mot de passe', placeholder: '••••••••' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={key === 'current' ? { gridColumn: 'span 2' } : {}}>
                <p className="settings-label">{label}</p>
                <div style={{ position: 'relative' }}>
                  <FaLock size={12} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-card)' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 32, paddingRight: 40 }}
                    type={showPass[key] ? 'text' : 'password'}
                    placeholder={placeholder}
                    value={passwords[key]}
                    onChange={(e) => setPasswords({ ...passwords, [key]: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow(key)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-gray)' }}
                  >
                    {showPass[key] ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {passwordStatus && (
            <div style={{
              margin: '12px 0',
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 13,
              background: passwordStatus.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
              color: passwordStatus.type === 'success' ? '#2e7d32' : '#c62828',
            }}>
              {passwordStatus.message}
            </div>
          )}

          <button type="submit" className="btn-small" style={{ marginTop: 8 }} disabled={passwordLoading}>
            {passwordLoading ? 'Modification…' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Parametres;
