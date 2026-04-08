import { useMemo, useCallback, useState } from 'react';
import {
  FaPlane, FaPlay, FaCheckCircle, FaTimesCircle,
  FaMapMarkerAlt, FaEdit, FaTimes,
} from 'react-icons/fa';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import {
  listByUser as listDossiersByUser,
  listDossiers,
  startDossier,
  finishDossier,
  cancelDossier,
  setVille,
  updateFlightInfo,
  dossiersStats,
  dossiersEnRetard,
} from '../services/dossiers';
import { useRealtimeResource } from '../hooks/useRealtimeResource';
import { REALTIME_INTERVALS } from '../config/realtime';

const STATUS_LABELS = {
  EN_PREPARATION: 'En préparation', EN_COURS: 'En cours', TERMINE: 'Terminé',
  ANNULE: 'Annulé', EN_ATTENTE: 'En attente',
};

const statusColor = (v) => {
  const n = v?.toUpperCase();
  if (n === 'TERMINE') return '#2e7d32';
  if (n === 'ANNULE') return '#c62828';
  if (n === 'EN_COURS') return '#1565c0';
  return '#f57c00';
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

/* Flight info form */
function FlightForm({ dossier, onSave, onCancel }) {
  const [compagnie, setCompagnie] = useState(dossier?.compagnieAerienne || '');
  const [numeroVol, setNumeroVol] = useState(dossier?.numeroVol || '');
  const [date, setDate] = useState(dossier?.dateRapatriement || '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const handleSave = async () => {
    setLoading(true); setErr(null);
    try {
      await updateFlightInfo(dossier.id, compagnie, numeroVol, date);
      onSave();
    } catch (e) {
      setErr(e?.response?.data?.message || 'Impossible de sauvegarder.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px', marginTop: 10 }}>
      <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 13 }}>Informations vol</p>
      <div style={{ display: 'grid', gap: 8 }}>
        <input className="form-input" placeholder="Compagnie aérienne" value={compagnie} onChange={(e) => setCompagnie(e.target.value)} />
        <input className="form-input" placeholder="N° de vol (ex: AF123)" value={numeroVol} onChange={(e) => setNumeroVol(e.target.value)} />
        <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {err && <p style={{ color: '#c62828', fontSize: 12, margin: '8px 0 0' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn-add" type="button" style={{ padding: '8px 16px' }} onClick={handleSave} disabled={loading}>
          {loading ? 'Sauvegarde…' : 'Enregistrer'}
        </button>
        <button className="btn-small" type="button" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}

/* Ville form */
function VilleForm({ dossier, onSave, onCancel }) {
  const [depart, setDepart] = useState(dossier?.villeDepart || '');
  const [arrivee, setArrivee] = useState(dossier?.villeArrivee || '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const handleSave = async () => {
    setLoading(true); setErr(null);
    try {
      await setVille(dossier.id, depart, arrivee);
      onSave();
    } catch (e) {
      setErr(e?.response?.data?.message || 'Impossible de sauvegarder.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px', marginTop: 10 }}>
      <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 13 }}>Villes départ / arrivée</p>
      <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input className="form-input" placeholder="Ville de départ" value={depart} onChange={(e) => setDepart(e.target.value)} />
        <input className="form-input" placeholder="Ville d'arrivée" value={arrivee} onChange={(e) => setArrivee(e.target.value)} />
      </div>
      {err && <p style={{ color: '#c62828', fontSize: 12, margin: '8px 0 0' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn-add" type="button" style={{ padding: '8px 16px' }} onClick={handleSave} disabled={loading}>
          {loading ? 'Sauvegarde…' : 'Enregistrer'}
        </button>
        <button className="btn-small" type="button" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}

function DossierCard({ dossier, isAdmin, onRefresh }) {
  const [actionStatus, setActionStatus] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [showVilleForm, setShowVilleForm] = useState(false);
  const [cancelMotif, setCancelMotif] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);

  const status = (dossier?.statut || 'EN_ATTENTE').toUpperCase();
  const canStart = isAdmin && ['EN_PREPARATION', 'EN_ATTENTE'].includes(status);
  const canFinish = isAdmin && status === 'EN_COURS';
  const canCancel = isAdmin && !['TERMINE', 'ANNULE'].includes(status);

  const doAction = async (fn, successMsg) => {
    setActionLoading(true); setActionStatus(null);
    try {
      await fn();
      setActionStatus({ type: 'success', message: successMsg });
      await onRefresh();
    } catch (err) {
      setActionStatus({ type: 'error', message: err?.response?.data?.message || 'Erreur.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Dossier #{dossier.id?.slice(-8) || '—'}</span>
            <span style={{ background: statusColor(status), color: 'white', borderRadius: 999, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
              {STATUS_LABELS[status] || status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, fontSize: 13, marginBottom: 8 }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-gray)', fontSize: 11 }}>Départ</p>
              <strong>{dossier.villeDepart || '—'}</strong>
            </div>
            <div>
              <p style={{ margin: 0, color: 'var(--text-gray)', fontSize: 11 }}>Arrivée</p>
              <strong>{dossier.villeArrivee || '—'}</strong>
            </div>
            <div>
              <p style={{ margin: 0, color: 'var(--text-gray)', fontSize: 11 }}>Date prévue</p>
              <strong>{formatDate(dossier.dateFinPrevue)}</strong>
            </div>
            <div>
              <p style={{ margin: 0, color: 'var(--text-gray)', fontSize: 11 }}>Rapatriement</p>
              <strong>{formatDate(dossier.dateRapatriement)}</strong>
            </div>
          </div>

          {(dossier.compagnieAerienne || dossier.numeroVol) && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-gray)' }}>
              <FaPlane size={11} />
              <span>{dossier.compagnieAerienne || '—'} · Vol {dossier.numeroVol || '—'}</span>
            </div>
          )}

          {/* Paiements */}
          {(dossier.totalPaiements !== undefined || dossier.montantRestant !== undefined) && (
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
              <span style={{ color: '#2e7d32' }}>Payé : <strong>{dossier.totalPaiements ?? 0} $</strong></span>
              <span style={{ color: '#f57c00' }}>Restant : <strong>{dossier.montantRestant ?? 0} $</strong></span>
            </div>
          )}
        </div>
      </div>

      {actionStatus && (
        <div style={{ margin: '10px 0', padding: '8px 12px', borderRadius: 8, fontSize: 12,
          background: actionStatus.type === 'success' ? 'rgba(46,125,50,0.12)' : 'rgba(198,40,40,0.12)',
          color: actionStatus.type === 'success' ? '#2e7d32' : '#c62828' }}>
          {actionStatus.message}
        </div>
      )}

      {/* Admin actions */}
      {isAdmin && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canStart && (
            <button className="btn-small" type="button"
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => doAction(() => startDossier(dossier.id), 'Dossier démarré.')}
              disabled={actionLoading}>
              <FaPlay size={10} /> Démarrer
            </button>
          )}
          {canFinish && (
            <button className="btn-small" type="button"
              style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#2e7d32', borderColor: 'rgba(46,125,50,0.4)' }}
              onClick={() => doAction(() => finishDossier(dossier.id), 'Dossier terminé.')}
              disabled={actionLoading}>
              <FaCheckCircle size={10} /> Terminer
            </button>
          )}
          {canCancel && (
            !showCancelForm ? (
              <button className="btn-small" type="button"
                style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#c62828', borderColor: 'rgba(198,40,40,0.4)' }}
                onClick={() => setShowCancelForm(true)} disabled={actionLoading}>
                <FaTimesCircle size={10} /> Annuler
              </button>
            ) : (
              <div style={{ width: '100%', marginTop: 4 }}>
                <input className="form-input" placeholder="Motif d'annulation…" value={cancelMotif} onChange={(e) => setCancelMotif(e.target.value)} />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button className="btn-small" type="button"
                    style={{ color: '#c62828', borderColor: 'rgba(198,40,40,0.4)' }}
                    onClick={() => { doAction(() => cancelDossier(dossier.id, cancelMotif), 'Dossier annulé.'); setShowCancelForm(false); }}
                    disabled={actionLoading}>
                    Confirmer l'annulation
                  </button>
                  <button className="btn-small" type="button" onClick={() => setShowCancelForm(false)}>Retour</button>
                </div>
              </div>
            )
          )}
          <button className="btn-small" type="button"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => { setShowVilleForm((v) => !v); setShowFlightForm(false); }}>
            <FaMapMarkerAlt size={10} /> Villes
          </button>
          <button className="btn-small" type="button"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => { setShowFlightForm((v) => !v); setShowVilleForm(false); }}>
            <FaEdit size={10} /> Info vol
          </button>
        </div>
      )}

      {showFlightForm && (
        <FlightForm dossier={dossier} onSave={async () => { setShowFlightForm(false); await onRefresh(); }} onCancel={() => setShowFlightForm(false)} />
      )}
      {showVilleForm && (
        <VilleForm dossier={dossier} onSave={async () => { setShowVilleForm(false); await onRefresh(); }} onCancel={() => setShowVilleForm(false)} />
      )}
    </div>
  );
}

function Suivi() {
  const { user, isAdmin } = useAuth();

  const fetcher = useCallback(() => {
    if (!user?.id) return Promise.resolve([]);
    if (isAdmin) return listDossiers({ page: 0, size: 20, sort: 'dateDebut,desc' });
    return listDossiersByUser(user.id, { page: 0, size: 10, sort: 'dateDebut,desc' });
  }, [user?.id, isAdmin]);

  const { data, loading, refresh, lastUpdated, error } = useRealtimeResource(
    `dossiers-${user?.id || 'guest'}-${isAdmin ? 'admin' : 'user'}`,
    fetcher,
    { enabled: Boolean(user?.id), immediate: Boolean(user?.id), interval: REALTIME_INTERVALS.dossiers },
  );

  /* Admin extras */
  const statsFetcher = useCallback(() => isAdmin ? dossiersStats() : Promise.resolve(null), [isAdmin]);
  const retardFetcher = useCallback(() => isAdmin ? dossiersEnRetard() : Promise.resolve([]), [isAdmin]);

  const statsRes = useRealtimeResource('dossiers-stats', statsFetcher, { enabled: isAdmin, immediate: isAdmin, interval: REALTIME_INTERVALS.dossiers });
  const retardRes = useRealtimeResource('dossiers-retard', retardFetcher, { enabled: isAdmin, immediate: isAdmin, interval: REALTIME_INTERVALS.dossiers });

  const dossiers = useMemo(() => normalizeList(data), [data]);
  const retardList = useMemo(() => normalizeList(retardRes.data), [retardRes.data]);

  return (
    <div>
      <StatsRow />

      {/* Admin stats */}
      {isAdmin && statsRes.data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total dossiers', value: statsRes.data.total ?? statsRes.data.totalDossiers ?? 0 },
            { label: 'En cours', value: statsRes.data.enCours ?? statsRes.data.EN_COURS ?? 0 },
            { label: 'Terminés', value: statsRes.data.termines ?? statsRes.data.TERMINE ?? 0 },
            { label: 'En retard', value: retardList.length },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{value}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-gray)' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 className="content-card-title" style={{ margin: 0 }}>
            {isAdmin ? 'Gestion des dossiers de rapatriement' : 'Suivi de mes dossiers'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdated && <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>Mis à jour {new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
            <button className="btn-small" type="button" onClick={refresh} disabled={loading}>{loading ? 'Chargement…' : 'Actualiser'}</button>
          </div>
        </div>

        {error && <div style={{ color: 'var(--red-primary)', marginBottom: 12, fontSize: 13 }}>Impossible de récupérer les dossiers.</div>}

        {dossiers.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-gray)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Aucun dossier{isAdmin ? '' : ' en cours'}</p>
            <p style={{ fontSize: 13 }}>{isAdmin ? 'Aucun dossier de rapatriement enregistré.' : 'Vos dossiers apparaîtront ici.'}</p>
          </div>
        )}

        {dossiers.map((dossier) => (
          <DossierCard key={dossier.id} dossier={dossier} isAdmin={isAdmin} onRefresh={refresh} />
        ))}
      </div>

      {/* En retard (admin only) */}
      {isAdmin && retardList.length > 0 && (
        <div className="content-card" style={{ marginTop: 20 }}>
          <h3 className="content-card-title" style={{ marginBottom: 14, color: '#c62828' }}>
            Dossiers en retard ({retardList.length})
          </h3>
          {retardList.map((dossier) => (
            <DossierCard key={dossier.id} dossier={dossier} isAdmin={isAdmin} onRefresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Suivi;
