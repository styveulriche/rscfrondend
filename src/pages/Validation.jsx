import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUpload, FaUser } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { updateProfil, uploadPhotoProfile } from '../services/users';
import { buildMediaUrl } from '../utils/mediaUrl';

const inputStyle = {
  background: 'rgba(255,255,255,0.85)',
  border: 'none',
  borderRadius: 6,
  padding: '14px 18px',
  fontSize: 14,
  color: '#2C2C2C',
  outline: 'none',
  width: '100%',
  cursor: 'pointer',
};

function Validation() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);

  const [form1, setForm1] = useState({ phone: '', birthDate: '', gender: '' });
  const [form2, setForm2] = useState({ photo: null, photoPreview: null, hasLocal: '', status: '' });
  const [form3, setForm3] = useState({ docType: '', docFile: null });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm2((p) => ({ ...p, photo: file, photoPreview: reader.result }));
    reader.readAsDataURL(file);
  };

  const sexeMap = { masculin: 'M', feminin: 'F' };

  const handleFinish = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateProfil(user.id, {
        telephone:      form1.phone      || null,
        dateNaissance:  form1.birthDate  || null,
        sexe:           sexeMap[form1.gender] || null,
        statutDiaspora: form2.status     || null,
      });

      // Upload photo via l'endpoint dédié pour garantir la persistance en BD
      let photoProfile = null;
      if (form2.photo instanceof File) {
        try {
          const photoRes = await uploadPhotoProfile(user.id, form2.photo);
          const rawPhoto = photoRes?.photoProfile || photoRes?.photo || photoRes?.avatar || photoRes?.url;
          photoProfile = rawPhoto ? buildMediaUrl(rawPhoto) : form2.photoPreview;
        } catch {
          photoProfile = form2.photoPreview;
        }
      } else {
        const rawPhoto = updated?.photoProfile || updated?.photo || updated?.avatar;
        photoProfile = rawPhoto ? buildMediaUrl(rawPhoto) : null;
      }

      updateUser({ ...updated, photoProfile });
      navigate('/dashboard');
    } catch (err) {
      setSaveError(err?.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const Stepper = () => (
    <div className="stepper">
      <div className="step">
        <div className={`step-circle ${step === 1 ? 'active' : 'completed'}`}>{step > 1 ? '✓' : '1'}</div>
      </div>
      <div className={`step-line ${step > 1 ? 'completed' : ''}`} />
      <div className="step">
        <div className={`step-circle ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>{step > 2 ? '✓' : '2'}</div>
      </div>
      <div className={`step-line ${step > 2 ? 'completed' : ''}`} />
      <div className="step">
        <div className={`step-circle ${step === 3 ? 'active' : ''}`}>3</div>
      </div>
    </div>
  );

  return (
    <div className="validation-page">
      <div className="validation-card">
        <h2 className="validation-title">Processus de validation de compte</h2>
        <Stepper />

        {/* ── ÉTAPE 1 ── */}
        {step === 1 && (
          <form className="validation-form" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
            <input style={inputStyle} type="tel" placeholder="Numéro de téléphone"
              value={form1.phone} onChange={(e) => setForm1({ ...form1, phone: e.target.value })} required />
            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 6, display: 'block' }}>
                Date de naissance
              </label>
              <input style={inputStyle} type="date"
                value={form1.birthDate} onChange={(e) => setForm1({ ...form1, birthDate: e.target.value })} required />
            </div>
            <select style={inputStyle} value={form1.gender}
              onChange={(e) => setForm1({ ...form1, gender: e.target.value })} required>
              <option value="">-- Sexe --</option>
              <option value="masculin">Masculin</option>
              <option value="feminin">Féminin</option>
            </select>
            <button type="submit" className="btn-validation">Continuer</button>
          </form>
        )}

        {/* ── ÉTAPE 2 ── */}
        {step === 2 && (
          <form className="validation-form" onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)', border: '2px dashed rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, overflow: 'hidden',
              }}>
                {form2.photoPreview
                  ? <img src={form2.photoPreview} alt="profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <FaUser size={28} color="rgba(255,255,255,0.5)" />}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 6, display: 'block' }}>
                  Photo de profil
                </label>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 6, padding: '8px 16px', color: 'white', fontSize: 13, cursor: 'pointer',
                }}>
                  <FaUpload size={13} />
                  {form2.photo ? form2.photo.name : 'Choisir une photo'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                </label>
              </div>
            </div>

            <select style={inputStyle} value={form2.hasLocal}
              onChange={(e) => setForm2({ ...form2, hasLocal: e.target.value })} required>
              <option value="">-- Avez-vous des proches dans votre localité d'origine ? --</option>
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </select>

            <select style={inputStyle} value={form2.status}
              onChange={(e) => setForm2({ ...form2, status: e.target.value })} required>
              <option value="">-- Statut au Canada --</option>
              <option value="RESIDENT_PERMANENT">Résident permanent</option>
              <option value="TRAVAILLEUR_TEMPORAIRE">Travailleur temporaire</option>
              <option value="VISITEUR_LONG_SEJOUR">Visiteur long séjour</option>
              <option value="ETUDIANT_INTERNATIONAL">Étudiant international</option>
              <option value="CITOYEN_CANADIEN">Citoyen canadien</option>
              <option value="REFUGIE">Réfugié</option>
            </select>
            <button type="submit" className="btn-validation">Continuer</button>
          </form>
        )}

        {/* ── ÉTAPE 3 ── */}
        {step === 3 && (
          <form className="validation-form" onSubmit={handleFinish}>
            <select style={inputStyle} value={form3.docType}
              onChange={(e) => setForm3({ ...form3, docType: e.target.value })} required>
              <option value="">-- Choisir un document légal --</option>
              <option value="permis">Permis de conduire</option>
              <option value="sejour">Carte de séjour</option>
              <option value="passeport">Passeport</option>
              <option value="identite">Carte d'identité</option>
            </select>

            {form3.docType && (
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.12)', border: '2px dashed rgba(255,255,255,0.35)',
                borderRadius: 8, padding: '16px 20px', color: 'rgba(255,255,255,0.85)',
                fontSize: 14, cursor: 'pointer',
              }}>
                <FaUpload size={18} />
                <div>
                  <p style={{ fontWeight: 600, marginBottom: 2 }}>
                    {form3.docFile ? form3.docFile.name : 'Cliquez pour importer votre document'}
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>PDF, JPG, PNG — max 5 Mo</p>
                </div>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                  onChange={(e) => setForm3({ ...form3, docFile: e.target.files[0] })} required />
              </label>
            )}

            {saveError && (
              <p style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center', margin: 0 }}>{saveError}</p>
            )}
            <button type="submit" className="btn-validation" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Terminer'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Validation;
