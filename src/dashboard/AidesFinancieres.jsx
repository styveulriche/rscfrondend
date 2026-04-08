import { useState, useEffect, useCallback } from 'react';
import { FaHandHoldingUsd, FaPlus, FaCheck, FaTimes, FaMoneyBillWave } from 'react-icons/fa';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import {
  createAide,
  getAidesEnAttente,
  getAidesByStatut,
  approuverAide,
  refuserAide,
  marquerVersee,
  deleteAide,
} from '../services/aidesFinancieres';

const STATUTS = [
  { value: 'EN_ATTENTE', label: 'En attente',  color: '#f57c00' },
  { value: 'APPROUVE',   label: 'Approuvé',    color: '#1565c0' },
  { value: 'REFUSE',     label: 'Refusé',      color: '#c62828' },
  { value: 'VERSE',      label: 'Versé',        color: '#2e7d32' },
];

const statusColor = (v) => STATUTS.find((s) => s.value === v?.toUpperCase())?.color || '#888';
const statusLabel = (v) => STATUTS.find((s) => s.value === v?.toUpperCase())?.label || v || '—';

const formatAmount = (v) => {
  const n = Number(v) || 0;
  return n.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
};

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('fr-CA');
};

const normalizeList = (p) => {
  if (!p) return [];
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.content)) return p.content;
  return [];
};

const EMPTY_FORM = {
  dossierRapatriementId: '',
  montantAccorde: '',
  dateAccord: '',
  description: '',
  approuveParId: '',
};

function StatutBadge({ statut }) {
  const color = statusColor(statut);
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: `${color}18`, color, border: `1px solid ${color}40`,
    }}>
      {statusLabel(statut)}
    </span>
  );
}

function AideCard({ aide, onAction, actionLoading }) {
  const [motifRefus, setMotifRefus] = useState('');
  const [showRefus, setShowRefus] = useState(false);
  const statut = (aide.statut || 'EN_ATTENTE').toUpperCase();
  const isEnAttente = statut === 'EN_ATTENTE';
  const isApprouve = statut === 'APPROUVE';
  const isBusy = actionLoading === aide.id;

  return (
    <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <StatutBadge statut={statut} />
            <span style={{ fontSize: 13, color: 'var(--text-gray)' }}>
              Dossier #{aide.dossierRapatriementId || aide.dossierId || '—'}
            </span>
          </div>
          <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#2e7d32' }}>
            {formatAmount(aide.montantAccorde)}
          </p>
          {aide.description && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-gray)' }}>{aide.description}</p>
          )}
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-gray)' }}>
            Accord : {formatDate(aide.dateAccord)} · Créé : {formatDate(aide.dateCreation || aide.createdAt)}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 120 }}>
          {isEnAttente && (
            <button className="btn-add" style={{ fontSize: 12, padding: '7px 14px' }}
              disabled={isBusy} onClick={() => onAction('approuver', aide)}>
              <FaCheck size={11} style={{ marginRight: 4 }} />
              {isBusy ? '…' : 'Approuver'}
            </button>
          )}
          {isEnAttente && !showRefus && (
            <button className="btn-small btn-danger" style={{ fontSize: 12 }}
              disabled={isBusy} onClick={() => setShowRefus(true)}>
              <FaTimes size={11} style={{ marginRight: 4 }} />
              Refuser
            </button>
          )}
          {isApprouve && (
            <button className="btn-small" style={{ fontSize: 12, background: '#2e7d32', color: 'white', border: 'none' }}
              disabled={isBusy} onClick={() => onAction('verser', aide)}>
              <FaMoneyBillWave size={11} style={{ marginRight: 4 }} />
              {isBusy ? '…' : 'Marquer versée'}
            </button>
          )}
          <button onClick={() => onAction('supprimer', aide)}
            style={{ background: 'none', border: '1px solid rgba(198,40,40,0.3)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: '#c62828', fontSize: 12 }}>
            Supprimer
          </button>
        </div>
      </div>

      {showRefus && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <input className="form-input" placeholder="Motif du refus" value={motifRefus}
            onChange={(e) => setMotifRefus(e.target.value)} style={{ flex: 1 }} />
          <button className="btn-small btn-danger" disabled={isBusy || !motifRefus}
            onClick={() => { onAction('refuser', aide, motifRefus); setShowRefus(false); }}>
            Confirmer
          </button>
          <button className="btn-small" onClick={() => setShowRefus(false)}>Annuler</button>
        </div>
      )}
    </div>
  );
}

export default function AidesFinancieres() {
  const { user } = useAuth();
  const adminId = user?.id;

  const [aides, setAides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statutFilter, setStatutFilter] = useState('EN_ATTENTE');
  const [actionLoading, setActionLoading] = useState(null);
  const [status, setStatus] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const fetcher = statutFilter === 'EN_ATTENTE'
      ? getAidesEnAttente()
      : getAidesByStatut(statutFilter);
    fetcher
      .then((data) => setAides(normalizeList(data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statutFilter]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (action, aide, extra) => {
    setActionLoading(aide.id);
    setStatus(null);
    try {
      if (action === 'approuver') await approuverAide(aide.id, adminId);
      else if (action === 'refuser') await refuserAide(aide.id, extra);
      else if (action === 'verser') await marquerVersee(aide.id);
      else if (action === 'supprimer') {
        if (!window.confirm('Supprimer cette aide financière ?')) return;
        await deleteAide(aide.id);
      }
      setStatus({ type: 'success', message: 'Action effectuée avec succès.' });
      load();
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.message || err?.message || 'Erreur.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await createAide({
        ...form,
        montantAccorde: parseFloat(form.montantAccorde),
        approuveParId: adminId,
      });
      setStatus({ type: 'success', message: 'Aide financière créée.' });
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.message || err?.message || 'Erreur.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <StatsRow />

      <div className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h3 className="content-card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaHandHoldingUsd size={16} color="var(--red-primary)" />
            Aides financières
          </h3>
          <button className="btn-add" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FaPlus size={12} /> Nouvelle aide
          </button>
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {STATUTS.map(({ value, label, color }) => (
            <button key={value} onClick={() => setStatutFilter(value)}
              style={{ padding: '7px 16px', borderRadius: 20, border: `2px solid ${statutFilter === value ? color : '#eee'}`,
                background: statutFilter === value ? `${color}18` : 'white',
                color: statutFilter === value ? color : 'var(--text-gray)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        {status && (
          <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, fontSize: 13,
            background: status.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
            color: status.type === 'success' ? '#2e7d32' : '#c62828' }}>
            {status.message}
          </div>
        )}

        {loading && <div style={{ color: 'var(--text-gray)', fontSize: 13 }}>Chargement…</div>}
        {!loading && aides.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-gray)' }}>
            Aucune aide financière avec ce statut.
          </div>
        )}

        {aides.map((aide) => (
          <AideCard key={aide.id} aide={aide} onAction={handleAction} actionLoading={actionLoading} />
        ))}
      </div>

      {/* Modal nouvelle aide */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 480, position: 'relative' }}>
            <button onClick={() => setShowForm(false)}
              style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
              <FaTimes size={18} />
            </button>

            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Nouvelle aide financière</h3>

            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <p className="settings-label">ID du dossier de rapatriement *</p>
                  <input className="form-input" value={form.dossierRapatriementId}
                    onChange={(e) => setForm({ ...form, dossierRapatriementId: e.target.value })}
                    placeholder="UUID du dossier" required />
                </div>
                <div>
                  <p className="settings-label">Montant accordé ($) *</p>
                  <input className="form-input" type="number" step="0.01" min="0"
                    value={form.montantAccorde}
                    onChange={(e) => setForm({ ...form, montantAccorde: e.target.value })}
                    placeholder="1500.00" required />
                </div>
                <div>
                  <p className="settings-label">Date d'accord</p>
                  <input className="form-input" type="date" value={form.dateAccord}
                    onChange={(e) => setForm({ ...form, dateAccord: e.target.value })} />
                </div>
                <div>
                  <p className="settings-label">Description</p>
                  <input className="form-input" value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Description de l'aide…" />
                </div>
              </div>

              <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ padding: 12, borderRadius: 8, border: '2px solid var(--pink-light)', background: 'white', fontWeight: 600, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button type="submit" className="btn-add" disabled={saving}>
                  {saving ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
