import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt,
  FaCheckCircle, FaTimesCircle, FaClock, FaCamera,
  FaTrash, FaDownload, FaQrcode,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import {
  updateProfil, deletePhotoProfile,
  getQrCodeBase64, getQrCodeDownloadUrl, getLienParrainage, getProfile,
} from '../services/users';
import { getStatutsDiaspora } from '../services/public';
import { StatsRow } from './Statistics';

import { buildMediaUrl } from '../utils/mediaUrl';

/**
 * Normalise la réponse de /qrcode/base64 en une chaîne base64 pure.
 * Le backend peut retourner :
 *   - un objet  { base64: "...", contentType: "image/png" }
 *   - un objet  { qrCode: "...", image: "...", content: "...", data: "..." }
 *   - une chaîne déjà encodée (avec ou sans préfixe data:…)
 */
const extractBase64 = (data) => {
  if (!data) return null;
  let raw = null;
  if (typeof data === 'string') {
    raw = data;
  } else {
    raw = data.base64 ?? data.qrCode ?? data.image ?? data.content ?? data.data ?? null;
  }
  if (!raw) return null;
  // Supprimer le préfixe "data:image/...;base64," si présent
  if (raw.startsWith('data:')) return raw.split(',')[1] ?? null;
  return raw;
};

const STATUT_DIASPORA_FALLBACK = [
  { value: 'RESIDENT_PERMANENT',    label: 'Résident permanent' },
  { value: 'CITOYEN_CANADIEN',      label: 'Citoyen canadien' },
  { value: 'ETUDIANT_INTERNATIONAL',label: 'Étudiant international' },
  { value: 'TRAVAILLEUR_TEMPORAIRE',label: 'Travailleur temporaire' },
  { value: 'REFUGIE',               label: 'Réfugié' },
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
    ELIGIBLE:     { icon: FaCheckCircle, color: '#2e7d32', bg: 'rgba(46,125,50,0.12)',  label: 'Éligible' },
    EN_ATTENTE:   { icon: FaClock,       color: '#f57c00', bg: 'rgba(245,124,0,0.12)',  label: 'En attente' },
    NON_ELIGIBLE: { icon: FaTimesCircle, color: '#c62828', bg: 'rgba(198,40,40,0.12)', label: 'Non éligible' },
  };
  const meta = config[value] || config.EN_ATTENTE;
  const Icon = meta.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: meta.bg, color: meta.color, borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}>
      <Icon size={11} /> {meta.label}
    </span>
  );
};

function Profile() {
  const { user, updateUser } = useAuth();
  const photoInputRef = useRef(null);

  /* ── Formulaire texte ───────────────────────────────────────── */
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '',
    paysOrigine: '', statutDiaspora: '', dateNaissance: '', sexe: '',
  });

  /* ── Photo ──────────────────────────────────────────────────── */
  const [photoPreview, setPhotoPreview]   = useState(null);  // URL affichée
  const [photoFile,    setPhotoFile]      = useState(null);  // File objet à envoyer
  const [photoChanged, setPhotoChanged]   = useState(false); // nouvelle photo choisie
  const [deletingPhoto, setDeletingPhoto] = useState(false);

  /* ── QR code ────────────────────────────────────────────────── */
  const [qrBase64, setQrBase64]   = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  /* ── Status/saving ──────────────────────────────────────────── */
  const [status,  setStatus]  = useState(null);
  const [saving,  setSaving]  = useState(false);

  /* ── Options statut diaspora ────────────────────────────────── */
  const [statutOptions, setStatutOptions] = useState(STATUT_DIASPORA_FALLBACK);

  /* ── Lien parrainage ────────────────────────────────────────── */
  const [parrainageLink, setParrainageLink] = useState(null);

  /* Chargement statuts diaspora */
  useEffect(() => {
    getStatutsDiaspora()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) {
          setStatutOptions(list.map((s) => ({
            value: s.value ?? s.code ?? String(s),
            label: s.label ?? s.libelle ?? s.description ?? s.nom ?? s.code ?? String(s),
          })));
        }
      })
      .catch(() => {});
  }, []);

  /* Lien de parrainage */
  useEffect(() => {
    if (!user?.id) return;
    getLienParrainage(user.id)
      .then((d) => setParrainageLink(d?.lienParrainage || null))
      .catch(() => {});
  }, [user?.id]);

  /* Initialisation du formulaire depuis le contexte user */
  useEffect(() => {
    if (!user) return;
    setForm({
      nom:            user.nom  || user.name || '',
      prenom:         user.prenom  || '',
      email:          user.email   || '',
      telephone:      user.telephone || '',
      paysOrigine:    user.paysOrigine    || '',
      statutDiaspora: user.statutDiaspora || '',
      dateNaissance:  user.dateNaissance ? user.dateNaissance.split('T')[0] : '',
      sexe:           user.sexe || '',
    });
    const rawPhoto = user.photoProfile || user.photo || user.avatar || null;
    // Debug : affiche la valeur brute retournée par l'API
    if (rawPhoto) console.debug('[Profile] photoProfile brut :', rawPhoto);
    setPhotoPreview(buildMediaUrl(rawPhoto));
    setPhotoFile(null);
    setPhotoChanged(false);
  }, [user]);

  /* Chargement du QR code base64 */
  const loadQrCode = useCallback(async () => {
    if (!user?.id) return;
    setQrLoading(true);
    try {
      const data = await getQrCodeBase64(user.id);
      setQrBase64(extractBase64(data));
    } catch {
      setQrBase64(null);
    } finally {
      setQrLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadQrCode(); }, [loadQrCode]);

  /* Sélection d'une nouvelle photo */
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoFile(file);
    setPhotoChanged(true);
  };

  /* Suppression de la photo */
  const handleDeletePhoto = async () => {
    if (!user?.id || !window.confirm('Supprimer la photo de profil ?')) return;
    setDeletingPhoto(true);
    setStatus(null);
    try {
      await deletePhotoProfile(user.id);
      setPhotoPreview(null);
      setPhotoFile(null);
      setPhotoChanged(false);
      updateUser({ photoProfile: null, avatar: null });
      setStatus({ type: 'success', message: 'Photo supprimée.' });
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.message || 'Suppression impossible.' });
    } finally {
      setDeletingPhoto(false);
    }
  };

  /* Soumission du formulaire — PUT /utilisateurs/{id}/profil (multipart) */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    setStatus(null);
    try {
      await updateProfil(user.id, {
        nom:            form.nom            || null,
        prenom:         form.prenom         || null,
        email:          form.email          || null,
        telephone:      form.telephone      || null,
        dateNaissance:  form.dateNaissance  || null,
        sexe:           form.sexe           || null,
        paysOrigine:    form.paysOrigine    || null,
        statutDiaspora: form.statutDiaspora || null,
        photo:          photoChanged ? photoFile : undefined,
      });

      /* Refetch du profil complet pour récupérer la vraie URL de la photo */
      const fresh = await getProfile(user.id);
      console.debug('[Profile] profil frais après update :', fresh?.photoProfile, fresh?.photo, fresh?.avatar);
      updateUser(fresh);

      setPhotoChanged(false);
      setPhotoFile(null);
      setStatus({ type: 'success', message: 'Profil mis à jour.' });
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.message || err?.message || 'Erreur lors de la mise à jour.' });
    } finally {
      setSaving(false);
    }
  };

  const initials = user
    ? `${(user.prenom || '?')[0]}${(user.nom || '')[0] || ''}`.toUpperCase()
    : '?';

  const qrDownloadUrl = user?.id ? getQrCodeDownloadUrl(user.id) : null;

  return (
    <div>
      <StatsRow />

      {/* ── Carte résumé ─────────────────────────────────────────── */}
      <div className="content-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>

          {/* Avatar cliquable */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              onClick={() => photoInputRef.current?.click()}
              title="Changer la photo de profil"
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--red-primary), var(--red-dark))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 700, color: 'white',
                cursor: 'pointer', overflow: 'hidden',
                border: '3px solid var(--pink-light)', flexShrink: 0,
                position: 'relative',
              }}
            >
              {initials}
              {photoPreview && (
                <img src={photoPreview} alt="Photo de profil"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
            </div>
            {/* Bouton caméra */}
            <button type="button" onClick={() => photoInputRef.current?.click()}
              title="Changer la photo"
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 24, height: 24, borderRadius: '50%',
                background: 'var(--red-primary)', border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0,
              }}>
              <FaCamera size={10} color="white" />
            </button>
            <input ref={photoInputRef} type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }} onChange={handlePhotoChange} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>{user?.prenom} {user?.nom}</p>
            <p style={{ margin: '2px 0 8px', fontSize: 13, color: 'var(--text-gray)' }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <EligibilityBadge value={user?.eligible === true ? 'ELIGIBLE' : user?.eligible === false ? 'NON_ELIGIBLE' : 'EN_ATTENTE'} />
              {user?.codeParrainage && (
                <span style={{ fontSize: 12, color: 'var(--text-gray)', background: 'rgba(0,0,0,0.04)', padding: '4px 10px', borderRadius: 999 }}>
                  Code : <strong>{user.codeParrainage}</strong>
                </span>
              )}
              {parrainageLink && (
                <span style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(139,28,28,0.08)', border: '1px solid rgba(139,28,28,0.2)', padding: '4px 10px', borderRadius: 999, flexWrap: 'wrap' }}>
                  Lien :&nbsp;
                  <a href={parrainageLink} target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--red-primary)', fontWeight: 600, wordBreak: 'break-all' }}>
                    {parrainageLink}
                  </a>
                </span>
              )}
            </div>
            {photoChanged && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#f57c00', fontWeight: 600 }}>
                <FaCamera size={10} style={{ marginRight: 4 }} />
                Nouvelle photo — cliquez sur "Enregistrer" pour sauvegarder.
              </p>
            )}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-gray)', textAlign: 'right', flexShrink: 0 }}>
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

      {/* ── QR Code parrainage ────────────────────────────────────── */}
      {user?.id && (
        <div className="content-card" style={{ marginBottom: 20 }}>
          <h3 className="content-card-title">
            <FaQrcode size={14} style={{ marginRight: 8, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
            QR Code de parrainage
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            <div style={{
              width: 140, height: 140, borderRadius: 10,
              border: '2px solid var(--pink-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'white', flexShrink: 0, overflow: 'hidden',
            }}>
              {qrLoading ? (
                <p style={{ fontSize: 12, color: 'var(--text-gray)' }}>Chargement…</p>
              ) : qrBase64 ? (
                <img
                  src={`data:image/png;base64,${qrBase64}`}
                  alt="QR code parrainage"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <FaQrcode size={48} color="var(--pink-card)" />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text-gray)' }}>
                Partagez ce QR code pour inviter vos proches à rejoindre RSC.
                Chaque inscription via votre code vous est attribuée.
              </p>
              {user?.codeParrainage && (
                <p style={{ margin: '0 0 12px', fontSize: 13 }}>
                  Code : <strong style={{ color: 'var(--red-primary)' }}>{user.codeParrainage}</strong>
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {qrDownloadUrl && (
                  <a
                    href={qrDownloadUrl}
                    download="qrcode-parrainage.png"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: 'var(--red-primary)', color: 'white', textDecoration: 'none',
                    }}
                  >
                    <FaDownload size={12} /> Télécharger
                  </a>
                )}
                <button type="button" className="btn-small" onClick={loadQrCode} disabled={qrLoading}>
                  Actualiser
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Formulaire de modification ────────────────────────────── */}
      <div className="content-card">
        <h3 className="content-card-title">
          <FaUser size={14} style={{ marginRight: 8, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
          Modifier mon profil
        </h3>

        <form onSubmit={handleSubmit}>

          {/* Section photo */}
          <div className="settings-section">
            <h3>Photo de profil</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--red-primary), var(--red-dark))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, fontWeight: 700, color: 'white', overflow: 'hidden',
                border: '3px solid var(--pink-light)', flexShrink: 0,
                position: 'relative',
              }}>
                {initials}
                {photoPreview && (
                  <img src={photoPreview} alt="Aperçu"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  background: 'var(--pink-very-light)', border: '1px dashed var(--pink-light)',
                  borderRadius: 8, padding: '10px 16px', fontSize: 13, color: 'var(--text-gray)',
                }}>
                  <FaCamera size={13} />
                  {photoFile ? photoFile.name : 'Choisir une photo…'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }} onChange={handlePhotoChange} />
                </label>
                {(photoPreview && !photoChanged) && (
                  <button
                    type="button"
                    onClick={handleDeletePhoto}
                    disabled={deletingPhoto}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'none', border: '1px solid #c62828',
                      color: '#c62828', borderRadius: 8, padding: '7px 14px',
                      fontSize: 12, cursor: 'pointer', fontWeight: 500,
                    }}
                  >
                    <FaTrash size={11} />
                    {deletingPhoto ? 'Suppression…' : 'Supprimer la photo'}
                  </button>
                )}
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-gray)' }}>
                  JPG, PNG, WebP — max recommandé 2 Mo
                </p>
              </div>
            </div>
          </div>

          {/* Identité */}
          <div className="settings-section">
            <h3>Identité</h3>
            <div className="settings-grid">
              <div>
                <p className="settings-label">Prénom</p>
                <input className="form-input" placeholder="Prénom"
                  value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
              </div>
              <div>
                <p className="settings-label">Nom</p>
                <input className="form-input" placeholder="Nom de famille"
                  value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
              </div>
              <div>
                <p className="settings-label">Date de naissance</p>
                <input className="form-input" type="date"
                  value={form.dateNaissance} onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })} />
              </div>
              <div>
                <p className="settings-label">Sexe</p>
                <select className="form-input" value={form.sexe}
                  onChange={(e) => setForm({ ...form, sexe: e.target.value })}>
                  <option value="">Sélectionner</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>
          </div>

          {/* Coordonnées */}
          <div className="settings-section">
            <h3>Coordonnées</h3>
            <div className="settings-grid">
              <div>
                <p className="settings-label">Email</p>
                <div style={{ position: 'relative' }}>
                  <FaEnvelope size={12} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-card)' }} />
                  <input className="form-input" style={{ paddingLeft: 32 }} type="email"
                    placeholder="email@exemple.com" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div>
                <p className="settings-label">Téléphone</p>
                <div style={{ position: 'relative' }}>
                  <FaPhone size={12} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-card)' }} />
                  <input className="form-input" style={{ paddingLeft: 32 }} type="tel"
                    placeholder="+1 514 000 0000" value={form.telephone}
                    pattern={CA_PHONE_PATTERN}
                    title="Numéro canadien requis, ex : +1 514 000 0000"
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          {/* Informations diaspora */}
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
                  <select className="form-input" style={{ paddingLeft: 32 }}
                    value={form.paysOrigine} onChange={(e) => setForm({ ...form, paysOrigine: e.target.value })}>
                    <option value="">Sélectionner</option>
                    {PAYS_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="settings-label">Statut dans la diaspora</p>
                <select className="form-input" value={form.statutDiaspora}
                  onChange={(e) => setForm({ ...form, statutDiaspora: e.target.value })}>
                  <option value="">Sélectionner votre statut</option>
                  {statutOptions.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {status && (
            <div style={{
              margin: '12px 0', padding: '10px 12px', borderRadius: 8, fontSize: 13,
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
