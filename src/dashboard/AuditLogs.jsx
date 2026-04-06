import { useState, useEffect, useCallback } from 'react';
import { FaShieldAlt, FaSearch, FaTimes, FaChartBar, FaCalendarAlt } from 'react-icons/fa';
import { StatsRow } from './Statistics';
import {
  listAuditLogs,
  auditLogsByType,
  auditStatsTypes,
  auditStatsJours,
} from '../services/auditLogs';

const LOG_TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'CONNEXION', label: 'Connexion' },
  { value: 'PAIEMENT', label: 'Paiement' },
  { value: 'MODIFICATION', label: 'Modification' },
  { value: 'SUPPRESSION', label: 'Suppression' },
  { value: 'CREATION', label: 'Création' },
];

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString('fr-CA');
};

const normalizeList = (p) => {
  if (!p) return [];
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.content)) return p.content;
  return [];
};

const typeBadgeColor = (type) => {
  const t = type?.toUpperCase();
  if (t === 'CONNEXION') return '#1565c0';
  if (t === 'PAIEMENT') return '#2e7d32';
  if (t === 'SUPPRESSION') return '#c62828';
  if (t === 'MODIFICATION') return '#f57c00';
  return '#6d4c41';
};

function TypeBadge({ type }) {
  const color = typeBadgeColor(type);
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: `${color}18`, color, border: `1px solid ${color}40`,
    }}>
      {type || '—'}
    </span>
  );
}

function StatsPanel({ stats }) {
  if (!stats) return null;
  const entries = Array.isArray(stats)
    ? stats
    : Object.entries(stats).map(([k, v]) => ({ type: k, count: v }));

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
      {entries.map(({ type, count }) => (
        <div key={type} style={{
          background: 'white', border: '1px solid #f0f0f0', borderRadius: 10,
          padding: '12px 18px', minWidth: 120,
        }}>
          <TypeBadge type={type} />
          <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 800, color: typeBadgeColor(type) }}>{count}</p>
        </div>
      ))}
    </div>
  );
}

function AuditLogRow({ log }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f5f5f5', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <TypeBadge type={log.type || log.typeAction} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {log.utilisateurNom || log.utilisateurEmail || log.userId || '—'}
          </span>
        </div>
        {log.description && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-gray)' }}>{log.description}</p>
        )}
        {log.entite && (
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-gray)' }}>
            Entité : {log.entite} {log.entiteId ? `#${log.entiteId}` : ''}
          </p>
        )}
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-gray)', whiteSpace: 'nowrap' }}>
        {formatDate(log.dateAction || log.createdAt || log.date)}
      </span>
    </div>
  );
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('logs'); // 'logs' | 'stats'
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [statsJours, setStatsJours] = useState(null);
  const PAGE_SIZE = 30;

  useEffect(() => {
    auditStatsTypes().then(setStats).catch(() => {});
  }, []);

  const loadLogs = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const fetcher = typeFilter
      ? auditLogsByType(typeFilter)
      : listAuditLogs({ page, size: PAGE_SIZE, sort: 'dateAction,desc' });

    fetcher
      .then((data) => {
        if (cancelled) return;
        setLogs(normalizeList(data));
        setTotalPages(data?.totalPages ?? 1);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message || err?.message || 'Erreur de chargement.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [typeFilter, page]);

  useEffect(() => { return loadLogs(); }, [loadLogs]);

  const loadStatsJours = () => {
    if (!dateDebut || !dateFin) return;
    auditStatsJours(
      `${dateDebut}T00:00:00`,
      `${dateFin}T23:59:59`,
    ).then(setStatsJours).catch(() => {});
  };

  return (
    <div>
      <StatsRow />

      <div className="content-card">
        <h3 className="content-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <FaShieldAlt size={16} color="var(--red-primary)" />
          Audit Logs
        </h3>

        {/* Onglets */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { key: 'logs', label: 'Journal' },
            { key: 'stats', label: 'Statistiques' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                background: tab === key ? 'var(--red-primary)' : '#f5f5f5',
                color: tab === key ? 'white' : 'var(--text-gray)' }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'stats' && (
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
              <FaChartBar size={13} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--red-primary)' }} />
              Répartition par type
            </h4>
            <StatsPanel stats={stats} />

            <h4 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 12px' }}>
              <FaCalendarAlt size={13} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--red-primary)' }} />
              Activité par période
            </h4>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-gray)', margin: '0 0 4px' }}>Date début</p>
                <input className="form-input" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} style={{ width: 170 }} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-gray)', margin: '0 0 4px' }}>Date fin</p>
                <input className="form-input" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} style={{ width: 170 }} />
              </div>
              <button className="btn-small" onClick={loadStatsJours} disabled={!dateDebut || !dateFin}>
                Afficher
              </button>
            </div>
            {statsJours && (
              <div>
                {Array.isArray(statsJours)
                  ? statsJours.map((entry, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-gray)' }}>{entry.date || entry.jour || '—'}</span>
                      <span style={{ fontWeight: 700 }}>{entry.count ?? entry.nombre ?? '—'}</span>
                    </div>
                  ))
                  : Object.entries(statsJours).map(([date, count]) => (
                    <div key={date} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-gray)' }}>{date}</span>
                      <span style={{ fontWeight: 700 }}>{count}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}

        {tab === 'logs' && (
          <>
            {/* Filtres */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <select className="form-input" value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
                style={{ flex: '0 0 200px' }}>
                {LOG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {typeFilter && (
                <button onClick={() => { setTypeFilter(''); setPage(0); }}
                  style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <FaTimes size={11} /> Réinitialiser
                </button>
              )}
            </div>

            {error && <div style={{ color: '#c62828', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            {loading && <div style={{ color: 'var(--text-gray)', fontSize: 13 }}>Chargement…</div>}
            {!loading && logs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-gray)' }}>Aucun log trouvé.</div>
            )}

            {logs.map((log, i) => <AuditLogRow key={log.id ?? i} log={log} />)}

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <button className="btn-small" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>Précédent</button>
                <span style={{ fontSize: 13, color: 'var(--text-gray)' }}>Page {page + 1} / {totalPages}</span>
                <button className="btn-small" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || loading}>Suivant</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
