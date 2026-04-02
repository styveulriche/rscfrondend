import { useState, useCallback, useMemo } from 'react';
import {
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaCalendarAlt,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { StatsRow } from './Statistics';
import { createDeclaration, listDeclarations } from '../services/declarations';
import { useRealtimeResource } from '../hooks/useRealtimeResource';
import { REALTIME_INTERVALS } from '../config/realtime';

const PAYS_OPTIONS = [
  'Cameroun', 'Côte d\'Ivoire', 'Sénégal', 'Mali', 'Guinée', 'Bénin',
  'Burkina Faso', 'Togo', 'Niger', 'Congo', 'RD Congo', 'Gabon',
  'Madagascar', 'Mauritanie', 'Haïti', 'Autre',
];

const INITIAL_FORM = {
  pays: '',
  dateDeces: '',
  lieuDeces: '',
  causeDeces: '',
};

const normalizeList = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const STATUS_MAP = {
  DECLARE: 'Déclarée',
  EN_COURS: 'En cours',
  TRAITE: 'Traitée',
  CLOTURE: 'Clôturée',
  REJETE: 'Rejetée',
  ANNULE: 'Annulée',
};

const statusColor = (value) => {
  const n = value?.toUpperCase();
  if (n === 'TRAITE' || n === 'CLOTURE') return '#2e7d32';
  if (n === 'REJETE' || n === 'ANNULE') return '#c62828';
  if (n === 'EN_COURS') return '#1565c0';
  return '#f57c00';
};

const formatDate = (value) => {
  if (!value) return '--/--/----';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-CA', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function SignalerEvenement() {
  const { user } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetcher = useCallback(() => {
    if (!user?.id) return Promise.resolve([]);
    return listDeclarations({ page: 0, size: 5, sort: 'dateDeclaration,desc' });
  }, [user?.id]);

  const { data, loading, refresh, lastUpdated, error } = useRealtimeResource(
    `declarations-${user?.id || 'guest'}`,
    fetcher,
    {
      enabled: Boolean(user?.id),
      immediate: Boolean(user?.id),
      interval: REALTIME_INTERVALS.declarations,
    },
  );

  const declarations = useMemo(() => normalizeList(data).map((item) => ({
    id: item?.id,
    pays: item?.pays || '—',
    dateDeces: item?.dateDeces || null,
    lieuDeces: item?.lieuDeces || '—',
    causeDeces: item?.causeDeces || '',
    statut: (item?.statut || 'DECLARE').toUpperCase(),
    dateDeclaration: item?.dateDeclaration || null,
    declarant: item?.declarant || null,
  })), [data]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      setStatus({ type: 'error', message: 'Veuillez vous reconnecter pour effectuer une déclaration.' });
      return;
    }
    if (!form.pays || !form.dateDeces || !form.lieuDeces || !form.causeDeces) {
      setStatus({ type: 'error', message: 'Veuillez remplir tous les champs obligatoires du décès.' });
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      const payload = {
        pays: form.pays,
        dateDeces: form.dateDeces,
        lieuDeces: form.lieuDeces,
        causeDeces: form.causeDeces,
      };
      await createDeclaration(user.id, payload);
      setStatus({ type: 'success', message: 'Déclaration enregistrée. Notre équipe vous contactera dans les plus brefs délais.' });
      setForm(INITIAL_FORM);
      await refresh();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Impossible d\'envoyer la déclaration.';
      setStatus({ type: 'error', message });
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div>
      <StatsRow />

      {/* Déclaration form */}
      <div className="content-card">
        <h3 className="content-card-title">
          <FaExclamationTriangle size={15} style={{ marginRight: 8, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
          Déclarer un décès
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-gray)', marginBottom: 20 }}>
          Cette déclaration permet d'initier la prise en charge et, le cas échéant, les démarches de rapatriement du corps vers le pays d'origine.
        </p>

        {status && (
          <div style={{
            marginBottom: 16,
            padding: '12px 14px',
            borderRadius: 8,
            fontSize: 13,
            background: status.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
            color: status.type === 'success' ? '#2e7d32' : '#c62828',
          }}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1 — Décès */}
          <div className="settings-section">
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--red-primary)' }}>
              Informations sur le décès
            </h4>
            <div className="settings-grid">
              <div>
                <p className="settings-label">
                  Pays du décès <span style={{ color: '#c62828' }}>*</span>
                </p>
                <div style={{ position: 'relative' }}>
                  <FaMapMarkerAlt size={12} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-card)' }} />
                  <select
                    className="form-input"
                    style={{ paddingLeft: 32 }}
                    value={form.pays}
                    onChange={setField('pays')}
                    required
                  >
                    <option value="">Sélectionner le pays</option>
                    {PAYS_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <p className="settings-label">
                  Date du décès <span style={{ color: '#c62828' }}>*</span>
                </p>
                <div style={{ position: 'relative' }}>
                  <FaCalendarAlt size={12} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-card)' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 32 }}
                    type="date"
                    value={form.dateDeces}
                    onChange={setField('dateDeces')}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <p className="settings-label">
                  Lieu du décès <span style={{ color: '#c62828' }}>*</span>
                </p>
                <div style={{ position: 'relative' }}>
                  <FaMapMarkerAlt size={12} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-card)' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 32 }}
                    type="text"
                    placeholder="Ville, hôpital ou adresse précise"
                    value={form.lieuDeces}
                    onChange={setField('lieuDeces')}
                    required
                  />
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <p className="settings-label">
                  Cause du décès <span style={{ color: '#c62828' }}>*</span>
                </p>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Indiquez la cause ou les circonstances du décès..."
                  value={form.causeDeces}
                  onChange={setField('causeDeces')}
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 8, padding: '12px 14px', background: 'rgba(198,40,40,0.07)', borderRadius: 8, fontSize: 12, color: 'var(--text-gray)' }}>
            En soumettant cette déclaration, vous confirmez que les informations fournies sont exactes et complètes au meilleur de votre connaissance.
          </div>

          <button type="submit" className="btn-add" style={{ marginTop: 16, padding: '13px 40px' }} disabled={submitting}>
            {submitting ? 'Envoi en cours…' : 'Soumettre la déclaration'}
          </button>
        </form>
      </div>

      {/* Historique */}
      <div className="content-card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="content-card-title" style={{ margin: 0 }}>Historique des déclarations</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdated && (
              <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>
                Mise à jour {new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button className="btn-small" type="button" onClick={refresh} disabled={loading}>
              {loading ? 'Chargement…' : 'Actualiser'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ color: 'var(--red-primary)', marginBottom: 12, fontSize: 13 }}>
            Impossible de récupérer les déclarations.
          </div>
        )}

        {declarations.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-gray)', padding: '24px 0', fontSize: 13 }}>
            Aucune déclaration enregistrée.
          </div>
        )}

        {declarations.map((item) => (
          <div key={item.id} style={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{item.pays}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>
                    <FaCalendarAlt size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    Décès le {formatDate(item.dateDeces)}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-gray)' }}>
                  Lieu : {item.lieuDeces}
                </p>
                {item.causeDeces && (
                  <p style={{ margin: '4px 0 0', fontSize: 12 }}>{item.causeDeces}</p>
                )}
                {item.declarant && (
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-gray)' }}>
                    Déclaré par : {item.declarant.prenom} {item.declarant.nom}
                    {item.declarant.lienAvecAssocie ? ` (${item.declarant.lienAvecAssocie})` : ''}
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{
                  background: statusColor(item.statut),
                  color: 'white',
                  borderRadius: 999,
                  padding: '4px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'inline-block',
                  marginBottom: 4,
                }}>
                  {STATUS_MAP[item.statut] || item.statut}
                </span>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-gray)' }}>
                  {formatDate(item.dateDeclaration)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SignalerEvenement;
