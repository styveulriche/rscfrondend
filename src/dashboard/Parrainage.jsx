import { useState, useMemo, useCallback } from 'react';
import { FaUserFriends, FaUserPlus, FaPhone, FaIdCard, FaUser, FaTag } from 'react-icons/fa';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import {
  listParrainagesByParrain,
  createParrainage,
  validateParrainage,
  rejectParrainage,
  cancelParrainage,
  acceptParrainage,
} from '../services/parrainages';
import { useRealtimeResource } from '../hooks/useRealtimeResource';
import { REALTIME_INTERVALS } from '../config/realtime';

const MAX = 5;
const CATEGORIES = [
  { value: '',              label: '-- Catégorie (optionnel) --' },
  { value: 'mineur',        label: 'Mineur' },
  { value: 'troisieme_age', label: 'Personne du 3e âge' },
  { value: 'malade_infirme',label: 'Personne malade ou infirme' },
];

const categoryLabel = (val) => CATEGORIES.find((c) => c.value === val)?.label || '';

const EMPTY_FORM = { name: '', phone: '', idFile: null, categorie: '' };

const normalizeList = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const statusLabel = (value) => {
  const map = {
    EN_ATTENTE: 'En attente',
    PENDING: 'En attente',
    ACCEPTE: 'Accepté',
    ACCEPTED: 'Accepté',
    VALIDE: 'Validé',
    VALIDATED: 'Validé',
    REJETE: 'Rejeté',
    REJECTED: 'Rejeté',
    ANNULE: 'Annulé',
    CANCELLED: 'Annulé',
  };
  return map[value] || value || '—';
};

const statusTone = (value) => {
  const normalized = value?.toUpperCase();
  if (normalized === 'VALIDE' || normalized === 'VALIDATED') return '#2e7d32';
  if (normalized === 'ACCEPTE' || normalized === 'ACCEPTED') return '#1565c0';
  if (normalized === 'REJETE' || normalized === 'REJECTED') return '#c62828';
  if (normalized === 'ANNULE' || normalized === 'CANCELLED') return '#6d4c41';
  return '#f57c00';
};

const mapItem = (item, idx) => {
  const status = (item?.statut || item?.status || 'EN_ATTENTE').toUpperCase();
  return {
    key: item?.id ?? `row-${idx}`,
    id: item?.id ?? null,
    name: item?.nomComplet || item?.name || '—',
    phone: item?.telephone || item?.phone || '',
    categorie: item?.categorie || item?.category || '',
    idFileName: item?.pieceIdentiteNom || item?.documentNom || '',
    status,
    createdAt: item?.createdAt || item?.dateCreation || null,
  };
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result || '';
    const commaIndex = result.indexOf(',');
    resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
  };
  reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
  reader.readAsDataURL(file);
});

const buildPayload = (form) => {
  const payload = {
    nomComplet: form.name,
    telephone: form.phone,
    categorie: form.categorie || null,
  };
  if (form?.idFile?.content) {
    payload.pieceIdentite = form.idFile.content;
    payload.pieceIdentiteNom = form.idFile.name;
  }
  return payload;
};

function Parrainage() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [rowLoadingKey, setRowLoadingKey] = useState(null);

  const fetcher = useCallback(() => {
    if (!user?.id) return Promise.resolve([]);
    return listParrainagesByParrain(user.id, { page: 0, size: 20, sort: 'createdAt,desc' });
  }, [user?.id]);

  const { data, loading, refresh, lastUpdated, error } = useRealtimeResource(
    `parrainages-${user?.id || 'guest'}`,
    fetcher,
    {
      enabled: Boolean(user?.id),
      immediate: Boolean(user?.id),
      interval: REALTIME_INTERVALS.parrainages,
    },
  );

  const fiolles = useMemo(() => normalizeList(data).map((item, idx) => mapItem(item, idx)), [data]);

  const resetForm = () => setForm(EMPTY_FORM);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const content = await fileToBase64(file);
      setForm((prev) => ({ ...prev, idFile: { name: file.name, content } }));
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Lecture du fichier impossible.' });
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      setStatus({ type: 'error', message: 'Utilisateur non identifié.' });
      return;
    }
    if (fiolles.length >= MAX) return;
    setFormLoading(true);
    setStatus(null);
    try {
      const payload = buildPayload(form);
      await createParrainage(user.id, payload);
      setStatus({ type: 'success', message: 'Parrainage enregistré.' });
      resetForm();
      await refresh();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Erreur lors de la création.';
      setStatus({ type: 'error', message });
    } finally {
      setFormLoading(false);
    }
  };

  const mutateStatus = async (item, action) => {
    if (!item?.id) {
      setStatus({ type: 'error', message: 'Identifiant manquant.' });
      return;
    }
    setRowLoadingKey(item.key);
    setStatus(null);
    const labels = {
      validate: 'validé',
      accept: 'accepté',
      reject: 'rejeté',
      cancel: 'annulé',
    };
    try {
      if (action === 'validate') await validateParrainage(item.id);
      else if (action === 'accept') await acceptParrainage(item.id);
      else if (action === 'reject') await rejectParrainage(item.id);
      else if (action === 'cancel') await cancelParrainage(item.id);
      setStatus({ type: 'success', message: `Parrainage ${labels[action]} avec succès.` });
      await refresh();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Action impossible.';
      setStatus({ type: 'error', message });
    } finally {
      setRowLoadingKey(null);
    }
  };

  const canMutate = (statusValue) => {
    const normalized = statusValue?.toUpperCase();
    return !['VALIDE', 'VALIDATED', 'REJETE', 'REJECTED', 'ANNULE', 'CANCELLED'].includes(normalized);
  };

  return (
    <div>
      <StatsRow />

      <div className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              <FaUserFriends size={18} style={{ marginRight: 10, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
              Mes Fiolles
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-gray)', margin: 0 }}>
              {fiolles.length}/{MAX} fiolles enregistrées
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdated && (
              <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>
                Mise à jour {new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button className="btn-small" type="button" onClick={refresh} disabled={loading}>
              {loading ? '…' : 'Actualiser'}
            </button>
          </div>
        </div>

        {status && (
          <div style={{
            marginBottom: 16,
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: 13,
            background: status.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
            color: status.type === 'success' ? '#2e7d32' : '#c62828',
          }}>
            {status.message}
          </div>
        )}
        {error && (
          <div style={{ color: 'var(--red-primary)', fontSize: 13, marginBottom: 12 }}>
            Impossible de récupérer les parrainages.
          </div>
        )}

        <div className="fiolles-grid">
          {fiolles.length === 0 && !loading && (
            <div style={{ textAlign: 'center', color: 'var(--text-gray)', gridColumn: '1 / -1' }}>
              Aucun parrainage enregistré pour le moment.
            </div>
          )}
          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--text-gray)', gridColumn: '1 / -1' }}>
              Chargement…
            </div>
          )}
          {fiolles.map((f, i) => {
            const normalized = f.status;
            const isBusy = rowLoadingKey === f.key;
            const allowMutations = canMutate(normalized);
            const canValidate = normalized === 'ACCEPTE' || normalized === 'ACCEPTED';
            const canAccept = normalized === 'EN_ATTENTE' || normalized === 'PENDING';
            return (
              <div className={`fiolle-card ${i % 2 !== 0 ? 'light' : ''}`} key={f.key} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 10, right: 10, background: statusTone(normalized), color: 'white', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>
                  {statusLabel(normalized)}
                </div>
                <FaUser size={18} color="rgba(255,255,255,0.5)" style={{ marginBottom: 6 }} />
                <p className="beneficiary-name">{f.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <FaPhone size={11} color="rgba(255,255,255,0.7)" />
                  <p className="beneficiary-phone">{f.phone}</p>
                </div>
                {f.categorie && (
                  <span className="fiolle-badge">
                    <FaTag size={8} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {categoryLabel(f.categorie)}
                  </span>
                )}
                {f.idFileName && (
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                    📎 {f.idFileName}
                  </p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, justifyContent: 'center' }}>
                  <button className="btn-small" type="button" disabled={!canAccept || isBusy} onClick={() => mutateStatus(f, 'accept')}>
                    Accepter
                  </button>
                  <button className="btn-small" type="button" disabled={!canValidate || isBusy} onClick={() => mutateStatus(f, 'validate')}>
                    Valider
                  </button>
                  <button className="btn-small btn-danger" type="button" disabled={!allowMutations || isBusy} onClick={() => mutateStatus(f, 'reject')}>
                    Rejeter
                  </button>
                  <button className="btn-small" type="button" disabled={!allowMutations || isBusy} onClick={() => mutateStatus(f, 'cancel')}>
                    Annuler
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {fiolles.length < MAX ? (
          <>
            <h4 className="form-section-title" style={{ marginTop: 8 }}>Effectuer un parrainage</h4>
            <form onSubmit={handleAdd}>
              <div style={{ position: 'relative' }}>
                <FaUser size={13} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-card)' }} />
                <input className="form-input" style={{ paddingLeft: 36 }} type="text"
                  placeholder="Nom Complet" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div style={{ position: 'relative' }}>
                <FaPhone size={13} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-card)' }} />
                <input className="form-input" style={{ paddingLeft: 36 }} type="tel"
                  placeholder="Numéro de téléphone" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <select
                className="form-input"
                value={form.categorie}
                onChange={(e) => setForm({ ...form, categorie: e.target.value })}
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--pink-very-light)', border: '2px dashed var(--pink-light)',
                borderRadius: 8, padding: '12px 16px', cursor: 'pointer', marginBottom: 12,
              }}>
                <FaIdCard size={16} color="var(--pink-card)" />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: form?.idFile?.name ? 'var(--red-primary)' : 'var(--pink-card)', margin: 0 }}>
                    {form?.idFile?.name || 'Importer la pièce d\'identité'}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-gray)', margin: 0 }}>JPG, PNG, PDF</p>
                </div>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                  onChange={handleFile} />
              </label>
              <button type="submit" className="btn-add" disabled={formLoading}>
                <FaUserPlus size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                {formLoading ? 'Enregistrement…' : 'Ajouter'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px', background: 'var(--pink-ultra-light)', borderRadius: 8, marginTop: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--red-primary)', fontWeight: 600 }}>
              Maximum de {MAX} fiolles atteint.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-gray)', marginTop: 4 }}>
              Supprimez une fiolle pour en ajouter une nouvelle.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Parrainage;
