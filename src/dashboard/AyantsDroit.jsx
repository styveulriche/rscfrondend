import { useState, useMemo, useCallback } from 'react';
import {
  FaUserPlus, FaPhone, FaIdCard, FaUser, FaTrash, FaEdit,
  FaCheck, FaTimes, FaStar,
} from 'react-icons/fa';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import {
  listByUser as listAyantsByUser,
  createAyant,
  updateAyant,
  deleteAyant,
  setAyantPrincipal,
} from '../services/ayantsDroit';
import { useRealtimeResource } from '../hooks/useRealtimeResource';
import { REALTIME_INTERVALS } from '../config/realtime';

const CA_PHONE_PATTERN = '(\\+?1[\\s\\-]?)?\\(?[2-9][0-9]{2}\\)?[\\s\\-]?[0-9]{3}[\\s\\-]?[0-9]{4}';

const MAX = 3;

const LIEN_FAMILIAL_OPTIONS = [
  { value: 'CONJOINT', label: 'Conjoint(e)' },
  { value: 'ENFANT', label: 'Enfant' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'FRERE_SOEUR', label: 'Frère / Sœur' },
  { value: 'GRAND_PARENT', label: 'Grand-parent' },
  { value: 'ONCLE_TANTE', label: 'Oncle / Tante' },
  { value: 'AUTRE', label: 'Autre' },
];

const lienLabel = (val) => LIEN_FAMILIAL_OPTIONS.find((o) => o.value === val)?.label || val || '—';

const EMPTY_FORM = {
  nom: '', prenom: '', telephone: '',
  dateNaissance: '', lienFamilial: '', sexe: '', idFile: null,
};

const normalizeList = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

const mapItem = (item, idx) => ({
  key: item?.id ?? `row-${idx}`,
  id: item?.id ?? null,
  nom: item?.nom || '',
  prenom: item?.prenom || '',
  fullName: [item?.prenom, item?.nom].filter(Boolean).join(' ') || item?.nomComplet || '—',
  telephone: item?.telephone || '',
  dateNaissance: item?.dateNaissance || null,
  lienFamilial: item?.lienFamilial || '',
  sexe: item?.sexe || '',
  estMineur: Boolean(item?.estMineur),
  estPrincipal: Boolean(item?.estPrincipal),
  idFileName: item?.pieceIdentiteNom || '',
});

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const r = reader.result || '';
    const i = r.indexOf(',');
    resolve(i >= 0 ? r.slice(i + 1) : r);
  };
  reader.onerror = () => reject(new Error('Lecture impossible.'));
  reader.readAsDataURL(file);
});

const buildPayload = (f) => {
  const p = {
    nom: f.nom,
    prenom: f.prenom,
    telephone: f.telephone,
    dateNaissance: f.dateNaissance || null,
    lienFamilial: f.lienFamilial || null,
    sexe: f.sexe || null,
  };
  if (f?.idFile?.content) {
    p.pieceIdentite = f.idFile.content;
    p.pieceIdentiteNom = f.idFile.name;
  }
  return p;
};

// FormFields est défini HORS du composant AyantsDroit pour éviter
// le bug de perte de focus (React démonte/remonte si le type du composant change à chaque render)
function FormFields({ data: fd, onChange, onFileChange }) {
  return (
    <>
      <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ position: 'relative' }}>
          <FaUser size={12} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-card)' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Prénom *" value={fd.prenom}
            onChange={(e) => onChange({ ...fd, prenom: e.target.value })} required />
        </div>
        <div style={{ position: 'relative' }}>
          <FaUser size={12} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-card)' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Nom *" value={fd.nom}
            onChange={(e) => onChange({ ...fd, nom: e.target.value })} required />
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <FaPhone size={12} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-card)' }} />
        <input className="form-input" style={{ paddingLeft: 32 }} type="tel"
          placeholder="+1 514 000 0000" value={fd.telephone}
          pattern={CA_PHONE_PATTERN} title="Numéro canadien requis, ex : +1 514 000 0000"
          onChange={(e) => onChange({ ...fd, telephone: e.target.value })} required />
      </div>
      <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <p className="settings-label" style={{ margin: '0 0 4px', fontSize: 11 }}>Date de naissance</p>
          <input className="form-input" type="date" value={fd.dateNaissance || ''}
            onChange={(e) => onChange({ ...fd, dateNaissance: e.target.value })} />
        </div>
        <div>
          <p className="settings-label" style={{ margin: '0 0 4px', fontSize: 11 }}>Sexe</p>
          <select className="form-input" value={fd.sexe} onChange={(e) => onChange({ ...fd, sexe: e.target.value })}>
            <option value="">—</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
      </div>
      <select className="form-input" value={fd.lienFamilial} onChange={(e) => onChange({ ...fd, lienFamilial: e.target.value })}>
        <option value="">Lien familial (optionnel)</option>
        {LIEN_FAMILIAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--pink-very-light)', border: '2px dashed var(--pink-light)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', marginBottom: 4 }}>
        <FaIdCard size={15} color="var(--pink-card)" />
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: fd?.idFile?.name ? 'var(--red-primary)' : 'var(--pink-card)', margin: 0 }}>
            {fd?.idFile?.name || 'Pièce d\'identité (optionnel)'}
          </p>
          <p style={{ fontSize: 10, color: 'var(--text-gray)', margin: 0 }}>JPG, PNG, PDF</p>
        </div>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={onFileChange} />
      </label>
    </>
  );
}

function AyantsDroit() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editKey, setEditKey] = useState(null);
  const [editData, setEditData] = useState(EMPTY_FORM);
  const [status, setStatus] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [rowLoadingKey, setRowLoadingKey] = useState(null);

  const fetcher = useCallback(() => {
    if (!user?.id) return Promise.resolve([]);
    return listAyantsByUser(user.id);
  }, [user?.id]);

  const { data, loading, refresh, lastUpdated, error } = useRealtimeResource(
    `ayants-${user?.id || 'guest'}`,
    fetcher,
    { enabled: Boolean(user?.id), immediate: Boolean(user?.id), interval: REALTIME_INTERVALS.ayantsDroit },
  );

  const list = useMemo(() => normalizeList(data).map((item, idx) => mapItem(item, idx)), [data]);
  const resetForm = () => setForm(EMPTY_FORM);
  const resetEdit = () => { setEditKey(null); setEditData(EMPTY_FORM); };

  const handleFile = async (e, mode) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const content = await fileToBase64(file);
      const fd = { name: file.name, content };
      if (mode === 'form') setForm((p) => ({ ...p, idFile: fd }));
      else setEditData((p) => ({ ...p, idFile: fd }));
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!user?.id) { setStatus({ type: 'error', message: 'Utilisateur non identifié.' }); return; }
    if (list.length >= MAX) return;
    setFormLoading(true);
    setStatus(null);
    try {
      await createAyant(user.id, buildPayload(form));
      setStatus({ type: 'success', message: 'Ayant droit ajouté.' });
      resetForm();
      await refresh();
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.message || err?.message || 'Erreur.' });
    } finally {
      setFormLoading(false);
    }
  };

  const startEdit = (item) => {
    setEditKey(item.key);
    setEditData({ id: item.id, nom: item.nom, prenom: item.prenom, telephone: item.telephone, dateNaissance: item.dateNaissance || '', lienFamilial: item.lienFamilial, sexe: item.sexe, idFile: null });
  };

  const saveEdit = async () => {
    if (!editData?.id) { setStatus({ type: 'error', message: 'ID manquant.' }); return; }
    setRowLoadingKey(editKey);
    setStatus(null);
    try {
      await updateAyant(editData.id, buildPayload(editData));
      setStatus({ type: 'success', message: 'Ayant droit mis à jour.' });
      resetEdit();
      await refresh();
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.message || err?.message || 'Erreur.' });
    } finally {
      setRowLoadingKey(null);
    }
  };

  const handleDelete = async (item) => {
    if (!item?.id || !window.confirm('Supprimer cet ayant droit ?')) return;
    setRowLoadingKey(item.key);
    setStatus(null);
    try {
      await deleteAyant(item.id);
      setStatus({ type: 'success', message: 'Supprimé.' });
      await refresh();
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.message || err?.message || 'Erreur.' });
    } finally {
      setRowLoadingKey(null);
    }
  };

  const handleSetPrincipal = async (item) => {
    if (!item?.id) return;
    setRowLoadingKey(item.key);
    setStatus(null);
    try {
      await setAyantPrincipal(item.id);
      setStatus({ type: 'success', message: `${item.fullName} défini comme ayant droit principal.` });
      await refresh();
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.message || err?.message || 'Erreur.' });
    } finally {
      setRowLoadingKey(null);
    }
  };

  return (
    <div>
      <StatsRow />
      <div className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 className="content-card-title" style={{ margin: 0 }}>Mes ayants droit</h3>
            <p style={{ fontSize: 13, color: 'var(--text-gray)', margin: 0 }}>{list.length}/{MAX} enregistrés</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdated && <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>Mis à jour {new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
            <button className="btn-small" type="button" onClick={refresh} disabled={loading}>{loading ? '…' : 'Actualiser'}</button>
          </div>
        </div>

        {status && (
          <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, fontSize: 13, background: status.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)', color: status.type === 'success' ? '#2e7d32' : '#c62828' }}>
            {status.message}
          </div>
        )}
        {error && <div style={{ color: 'var(--red-primary)', fontSize: 13, marginBottom: 12 }}>Impossible de récupérer les ayants droit.</div>}

        <div className="beneficiaries-grid">
          {list.length === 0 && !loading && <div style={{ color: 'var(--text-gray)', textAlign: 'center', gridColumn: '1 / -1', padding: '20px 0' }}>Aucun ayant droit enregistré.</div>}
          {loading && <div style={{ color: 'var(--text-gray)', textAlign: 'center', gridColumn: '1 / -1' }}>Chargement…</div>}

          {list.map((b, i) => {
            const isEditing = editKey === b.key;
            const isBusy = rowLoadingKey === b.key;
            return (
              <div key={b.key} className={`beneficiary-card ${i % 2 === 0 ? 'dark' : ''}`} style={{ position: 'relative' }}>
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                    <FormFields data={editData} onChange={setEditData} onFileChange={(e) => handleFile(e, 'edit')} />
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button onClick={saveEdit} disabled={isBusy} style={{ background: 'rgba(46,125,50,0.8)', border: 'none', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', color: 'white', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FaCheck size={10} /> Sauver
                      </button>
                      <button onClick={resetEdit} disabled={isBusy} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', color: 'white', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FaTimes size={10} /> Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header icons */}
                    <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                      {!b.estPrincipal && (
                        <button onClick={() => handleSetPrincipal(b)} disabled={isBusy} title="Définir comme principal"
                          style={{ background: 'rgba(255,200,0,0.3)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <FaStar size={9} color="gold" />
                        </button>
                      )}
                      <button onClick={() => startEdit(b)} disabled={isBusy}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <FaEdit size={9} color="white" />
                      </button>
                      <button onClick={() => handleDelete(b)} disabled={isBusy}
                        style={{ background: 'rgba(220,50,50,0.5)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <FaTrash size={9} color="white" />
                      </button>
                    </div>

                    {/* Principal badge */}
                    {b.estPrincipal && (
                      <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(255,200,0,0.35)', borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: 'gold', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FaStar size={8} /> Principal
                      </div>
                    )}

                    <FaUser size={20} color="rgba(255,255,255,0.5)" style={{ marginBottom: 6, marginTop: b.estPrincipal ? 18 : 0 }} />
                    <p className="beneficiary-name">{b.fullName}</p>

                    {b.lienFamilial && (
                      <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.15)', borderRadius: 999, padding: '2px 8px', marginBottom: 4 }}>
                        {lienLabel(b.lienFamilial)}
                        {b.estMineur && ' · Mineur'}
                      </span>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <FaPhone size={10} color="rgba(255,255,255,0.7)" />
                      <p className="beneficiary-phone">{b.telephone}</p>
                    </div>
                    {b.dateNaissance && (
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', margin: '2px 0 0' }}>
                        Né(e) le {new Date(b.dateNaissance).toLocaleDateString('fr-CA')}
                      </p>
                    )}
                    {b.idFileName && (
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>📎 {b.idFileName}</p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {list.length < MAX ? (
          <>
            <h4 className="form-section-title" style={{ marginTop: 16 }}>Ajouter un ayant droit</h4>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <FormFields data={form} onChange={setForm} onFileChange={(e) => handleFile(e, 'form')} />
              <button type="submit" className="btn-add" disabled={formLoading} style={{ marginTop: 4 }}>
                <FaUserPlus size={13} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                {formLoading ? 'Ajout en cours…' : 'Ajouter'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px', background: 'var(--pink-ultra-light)', borderRadius: 8, marginTop: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--red-primary)', fontWeight: 600 }}>Maximum de {MAX} ayants droit atteint.</p>
            <p style={{ fontSize: 12, color: 'var(--text-gray)', marginTop: 4 }}>Supprimez un ayant droit pour en ajouter un nouveau.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AyantsDroit;
