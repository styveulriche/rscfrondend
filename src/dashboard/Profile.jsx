import { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { updateUser as updateUserService } from '../services/users';
import { StatsRow } from './Statistics';

const STATUT_DIASPORA_OPTIONS = [
  { value: 'RESIDENT_PERMANENT', label: 'Résident' },
  { value: 'CITOYEN_CANADIEN', label: 'Citoyen canadien' },
  { value: 'ETUDIANT_INTERNATIONAL', label: 'Étudiant international' },
  { value: 'TRAVAILLEUR_TEMPORAIRE', label: 'Travailleur temporaire' },
  { value: 'REFUGIE', label: 'Réfugié' },
];

const PAYS_OPTIONS = [
  'Cameroun', "Côte d'Ivoire", 'Sénégal', 'Mali', 'Guinée', 'Bénin',
  'Burkina Faso', 'Togo', 'Niger', 'Congo', 'RD Congo', 'Gabon',
  'Madagascar', 'Mauritanie', 'Haïti', 'Autre',
];

const CA_PHONE_PATTERN = '(\\+?1[\\s\\-]?)?\\(?[2-9][0-9]{2}\\)?[\\s\\-]?[0-9]{3}[\\s\\-]?[0-9]{4}';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });
};

const EligibilityBadge = ({ value }) => {
  const config = {
    ELIGIBLE: { icon: FaCheckCircle, color: '#2e7d32', bg: 'rgba(46,125,50,0.12)', label: 'Éligible' },
    EN_ATTENTE: { icon: FaClock, color: '#f57c00', bg: 'rgba(245,124,0,0.12)', label: 'En attente' },
    NON_ELIGIBLE: { icon: FaTimesCircle, color: '#c62828', bg: 'rgba(198,40,40,0.12)', label: 'Non éligible' },
  };
  const meta = config[value] || config.EN_ATTENTE;
  const Icon = meta.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: meta.bg, color: meta.color, borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
};

function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    paysOrigine: '',
    statutDiaspora: '',
    dateNaissance: '',
    sexe: '',
  });
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        telephone: form.telephone,
        paysOrigine: form.paysOrigine || null,
        statutDiaspora: form.statutDiaspora || null,
        dateNaissance: form.dateNaissance || null,
        sexe: form.sexe || null,
      };
      const updated = await updateUserService(user.id, payload);
      updateUser(updated);
      setStatus({ type: 'success', message: 'Profil mis à jour.' });
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Erreur lors de la mise à jour.';
      setStatus({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  const initials = user
    ? `${(user.prenom || '?')[0]}${(user.nom || '')[0] || ''}`.toUpperCase()
    : '?';

  return (
    <div>
      <StatsRow />

      {/* Info summary card */}
      <div className="content-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--red-primary), var(--red-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>{user?.prenom} {user?.nom}</p>
            <p style={{ margin: '2px 0 8px', fontSize: 13, color: 'var(--text-gray)' }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <EligibilityBadge value={user?.eligible === true ? 'ELIGIBLE' : user?.eligible === false ? 'NON_ELIGIBLE' : 'EN_ATTENTE'} />
              {user?.codeParrainage && (
                <span style={{ fontSize: 12, color: 'var(--text-gray)', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 999 }}>
                  Code parrainage : <strong>{user.codeParrainage}</strong>
                </span>
              )}
              {user?.codeParrainage && (
                <span style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(139,28,28,0.08)', border: '1px solid rgba(139,28,28,0.2)', padding: '4px 10px', borderRadius: 999, flexWrap: 'wrap' }}>
                  Lien de parrainage :&nbsp;
                  <a
                    href={`${window.location.origin}/inscription?parrain=${user.codeParrainage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--red-primary)', fontWeight: 600, wordBreak: 'break-all' }}
                  >
                    {`${window.location.origin}/inscription?parrain=${user.codeParrainage}`}
                  </a>
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-gray)', textAlign: 'right' }}>
            <p style={{ margin: 0 }}>Membre depuis</p>
            <strong style={{ fontSize: 13 }}>{formatDate(user?.dateInscription)}</strong>
            {user?.derniereConnexion && (
              <>
                <p style={{ margin: '6px 0 0' }}>Dernière connexion</p>
                <strong style={{ fontSize: 13 }}>{formatDate(user?.derniereConnexion)}</strong>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="content-card">
        <h3 className="content-card-title">
          <FaUser size={14} style={{ marginRight: 8, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
          Modifier mon profil
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="settings-section">
            <h3>Identité</h3>
            <div className="settings-grid">
              <div>
                <p className="settings-label">Prénom</p>
                <input
                  className="form-input"
                  placeholder="Prénom"
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                />
              </div>
              <div>
                <p className="settings-label">Nom</p>
                <input
                  className="form-input"
                  placeholder="Nom de famille"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
              </div>
              <div>
                <p className="settings-label">Date de naissance</p>
                <input
                  className="form-input"
                  type="date"
                  value={form.dateNaissance}
                  onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })}
                />
              </div>
              <div>
                <p className="settings-label">Sexe</p>
                <select
                  className="form-input"
                  value={form.sexe}
                  onChange={(e) => setForm({ ...form, sexe: e.target.value })}
                >
                  <option value="">Sélectionner</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Coordonnées</h3>
            <div className="settings-grid">
              <div>
                <p className="settings-label">Email</p>
                <div style={{ position: 'relative' }}>
                  <FaEnvelope size={12} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-card)' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 32 }}
                    type="email"
                    placeholder="email@exemple.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                    placeholder="+1 514 000 0000"
                    pattern={CA_PHONE_PATTERN}
                    title="Numéro canadien requis, ex : +1 514 000 0000"
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Informations diaspora</h3>
            <p style={{ fontSize: 12, color: 'var(--text-gray)', marginBottom: 14 }}>
              Ces informations contribuent à votre éligibilité aux services RSC.
            </p>
            <div className="settings-grid">
              <div>
                <p className="settings-label">Pays d'origine</p>
                <div style={{ position: 'relative' }}>
                  <FaMapMarkerAlt size={12} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-card)' }} />
                  <select
                    className="form-input"
                    style={{ paddingLeft: 32 }}
                    value={form.paysOrigine}
                    onChange={(e) => setForm({ ...form, paysOrigine: e.target.value })}
                  >
                    <option value="">Sélectionner</option>
                    {PAYS_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="settings-label">Statut dans la diaspora</p>
                <select
                  className="form-input"
                  value={form.statutDiaspora}
                  onChange={(e) => setForm({ ...form, statutDiaspora: e.target.value })}
                >
                  <option value="">Sélectionner votre statut</option>
                  {STATUT_DIASPORA_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {status && (
            <div style={{
              margin: '12px 0',
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 13,
              background: status.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
              color: status.type === 'success' ? '#2e7d32' : '#c62828',
            }}>
              {status.message}
            </div>
          )}

          <button type="submit" className="btn-add" style={{ padding: '13px 40px' }} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
