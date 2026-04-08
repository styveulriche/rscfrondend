import { useState, useEffect, useCallback } from 'react';
import {
  FaShieldAlt, FaTimes, FaChartBar, FaCalendarAlt,
  FaUser, FaDesktop, FaChevronDown, FaChevronUp,
} from 'react-icons/fa';
import { StatsRow } from './Statistics';
import {
  listAuditLogs,
  auditLogsByType,
  auditStatsTypes,
  auditStatsJours,
} from '../services/auditLogs';

/* ── Types d'événements ─────────────────────────────────────────── */
const LOG_TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'CONNEXION', label: 'Connexion' },
  { value: 'PAIEMENT', label: 'Paiement' },
  { value: 'MODIFICATION', label: 'Modification' },
  { value: 'SUPPRESSION', label: 'Suppression' },
  { value: 'CREATION', label: 'Création' },
  { value: 'VALIDATION', label: 'Validation' },
  { value: 'REJET', label: 'Rejet' },
];

/* ── Helpers ────────────────────────────────────────────────────── */
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
  if (t === 'CONNEXION')   return '#1565c0';
  if (t === 'PAIEMENT')    return '#2e7d32';
  if (t === 'SUPPRESSION') return '#c62828';
  if (t === 'MODIFICATION') return '#f57c00';
  if (t === 'CREATION')    return '#6a1b9a';
  if (t === 'VALIDATION')  return '#00695c';
  if (t === 'REJET')       return '#b71c1c';
  return '#5d4037';
};

/* Normalise les stats : accepte Map<String,Long>, [[k,v]], [{type,count}] */
const normalizeStats = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    if (raw.length === 0) return [];
    const first = raw[0];
    // [[key, val], ...] — liste de paires Java
    if (Array.isArray(first)) {
      return raw.map(([k, v]) => ({ type: String(k), count: Number(v) }));
    }
    // [{type, count}, ...] ou [{typeEvenement, count}]
    if (typeof first === 'object') {
      return raw.map((e) => ({
        type: e.type ?? e.typeEvenement ?? e.key ?? String(Object.keys(e)[0]),
        count: e.count ?? e.nombre ?? e.value ?? Object.values(e)[0],
      }));
    }
  }
  // { CONNEXION: 5, PAIEMENT: 3, ... }
  if (typeof raw === 'object') {
    return Object.entries(raw).map(([k, v]) => ({ type: k, count: Number(v) }));
  }
  return [];
};

/* Normalise stats/jours : [[date, count]] ou [{date, count}] ou {date: count} */
const normalizeStatsJours = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    if (raw.length === 0) return [];
    const first = raw[0];
    if (Array.isArray(first)) return raw.map(([d, c]) => ({ date: String(d), count: Number(c) }));
    if (typeof first === 'object') {
      return raw.map((e) => ({
        date: e.date ?? e.jour ?? e.key ?? String(Object.keys(e)[0]),
        count: e.count ?? e.nombre ?? e.value ?? Object.values(e)[0],
      }));
    }
  }
  if (typeof raw === 'object') {
    return Object.entries(raw).map(([d, c]) => ({ date: d, count: Number(c) }));
  }
  return [];
};

/* ── Composants ─────────────────────────────────────────────────── */
function TypeBadge({ type }) {
  const color = typeBadgeColor(type);
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: `${color}18`, color, border: `1px solid ${color}40`,
      whiteSpace: 'nowrap',
    }}>
      {type || '—'}
    </span>
  );
}

function StatsTypePanel({ stats }) {
  const entries = normalizeStats(stats);
  if (entries.length === 0) return <p style={{ fontSize: 13, color: 'var(--text-gray)' }}>Aucune donnée.</p>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
      {entries.map(({ type, count }) => (
        <div key={type} style={{
          background: 'rgba(255,255,255,0.05)', border: `1px solid ${typeBadgeColor(type)}30`,
          borderRadius: 10, padding: '12px 18px', minWidth: 130,
        }}>
          <TypeBadge type={type} />
          <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 800, color: typeBadgeColor(type) }}>{count}</p>
        </div>
      ))}
    </div>
  );
}

function AuditLogRow({ log }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = log.ancienneValeur || log.nouvelleValeur || log.ipAddress || log.userAgent;

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', gap: 12, flexWrap: 'wrap', cursor: hasDetails ? 'pointer' : 'default' }}
        onClick={() => hasDetails && setExpanded((v) => !v)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Ligne 1 : badge + email utilisateur + nom admin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <TypeBadge type={log.typeEvenement} />
            {log.utilisateurEmail && (
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                <FaUser size={10} style={{ marginRight: 4, color: 'var(--text-gray)', verticalAlign: 'middle' }} />
                {log.utilisateurEmail}
              </span>
            )}
            {log.administrateurNom && (
              <span style={{ fontSize: 11, color: 'var(--text-gray)' }}>
                via <strong>{log.administrateurNom}</strong>
              </span>
            )}
          </div>

          {/* Ligne 2 : action */}
          {log.action && (
            <p style={{ margin: '0 0 2px', fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{log.action}</p>
          )}

          {/* Ligne 3 : entité */}
          {log.entite && (
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-gray)' }}>
              {log.entite}{log.entiteId ? ` · ${log.entiteId}` : ''}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--text-gray)', whiteSpace: 'nowrap' }}>
            {formatDate(log.dateAction)}
          </span>
          {hasDetails && (
            expanded ? <FaChevronUp size={10} color="var(--text-gray)" /> : <FaChevronDown size={10} color="var(--text-gray)" />
          )}
        </div>
      </div>

      {/* Détails expandables */}
      {expanded && hasDetails && (
        <div style={{ padding: '8px 12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 8, fontSize: 12, display: 'grid', gap: 8 }}>
          {log.ipAddress && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-gray)' }}>
              <FaDesktop size={10} />
              IP : <code style={{ fontSize: 11 }}>{log.ipAddress}</code>
              {log.userAgent && <span style={{ color: 'rgba(255,255,255,0.3)' }}>· {log.userAgent.substring(0, 60)}{log.userAgent.length > 60 ? '…' : ''}</span>}
            </div>
          )}
          {log.ancienneValeur && Object.keys(log.ancienneValeur).length > 0 && (
            <div>
              <p style={{ margin: '0 0 4px', color: 'var(--text-gray)', fontWeight: 600 }}>Ancienne valeur :</p>
              <pre style={{ margin: 0, fontSize: 11, color: '#ef9a9a', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(log.ancienneValeur, null, 2)}
              </pre>
            </div>
          )}
          {log.nouvelleValeur && Object.keys(log.nouvelleValeur).length > 0 && (
            <div>
              <p style={{ margin: '0 0 4px', color: 'var(--text-gray)', fontWeight: 600 }}>Nouvelle valeur :</p>
              <pre style={{ margin: 0, fontSize: 11, color: '#a5d6a7', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(log.nouvelleValeur, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Composant principal ────────────────────────────────────────── */
export default function AuditLogs() {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [page, setPage]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab]             = useState('logs');
  const [stats, setStats]         = useState(null);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin]     = useState('');
  const [statsJours, setStatsJours] = useState(null);
  const PAGE_SIZE = 30;

  /* Stats types chargées une seule fois */
  useEffect(() => {
    auditStatsTypes().then(setStats).catch(() => {});
  }, []);

  /* Chargement des logs */
  const loadLogs = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    let fetcher;
    if (typeFilter) {
      fetcher = auditLogsByType(typeFilter);
    } else {
      fetcher = listAuditLogs({ page, size: PAGE_SIZE, sort: 'dateAction,desc' });
    }

    fetcher
      .then((data) => {
        if (cancelled) return;
        setLogs(normalizeList(data));
        setTotalPages(data?.totalPages ?? 1);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message || 'Erreur de chargement.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [typeFilter, page]);

  useEffect(() => loadLogs(), [loadLogs]);

  /* Recherche par utilisateur (email contient) */
  const handleUserSearch = () => {
    if (!userFilter.trim()) return;
    setLoading(true);
    setError(null);
    // On passe l'email comme userId — le backend accepte un UUID,
    // mais on filtre côté client si le backend ne supporte pas l'email
    listAuditLogs({ page: 0, size: 200, sort: 'dateAction,desc' })
      .then((data) => {
        const all = normalizeList(data);
        const q = userFilter.toLowerCase();
        setLogs(all.filter((l) =>
          l.utilisateurEmail?.toLowerCase().includes(q) ||
          l.administrateurNom?.toLowerCase().includes(q)
        ));
        setTotalPages(1);
      })
      .catch((err) => setError(err?.response?.data?.message || 'Erreur.'))
      .finally(() => setLoading(false));
  };

  const loadStatsJours = () => {
    if (!dateDebut || !dateFin) return;
    auditStatsJours(`${dateDebut}T00:00:00`, `${dateFin}T23:59:59`)
      .then(setStatsJours)
      .catch(() => {});
  };

  const resetFilters = () => {
    setTypeFilter(''); setUserFilter(''); setPage(0);
    loadLogs();
  };

  return (
    <div>
      <StatsRow />

      <div className="content-card">
        <h3 className="content-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <FaShieldAlt size={16} color="var(--red-primary)" />
          Journal d'audit
        </h3>

        {/* Onglets */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { key: 'logs', label: 'Journal' },
            { key: 'stats', label: 'Statistiques' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{
                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 13,
                background: tab === key ? 'var(--red-primary)' : 'rgba(255,255,255,0.07)',
                color: tab === key ? 'white' : 'var(--text-gray)',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Onglet Statistiques ── */}
        {tab === 'stats' && (
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
              <FaChartBar size={13} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--red-primary)' }} />
              Répartition par type d'événement
            </h4>
            <StatsTypePanel stats={stats} />

            <h4 style={{ fontSize: 14, fontWeight: 700, margin: '24px 0 12px' }}>
              <FaCalendarAlt size={13} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--red-primary)' }} />
              Activité par période
            </h4>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-gray)', margin: '0 0 4px' }}>Date début</p>
                <input className="form-input" type="date" value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)} style={{ width: 170 }} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-gray)', margin: '0 0 4px' }}>Date fin</p>
                <input className="form-input" type="date" value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)} style={{ width: 170 }} />
              </div>
              <button className="btn-small" onClick={loadStatsJours} disabled={!dateDebut || !dateFin}>
                Afficher
              </button>
            </div>

            {statsJours && (() => {
              const entries = normalizeStatsJours(statsJours);
              if (entries.length === 0) return <p style={{ fontSize: 13, color: 'var(--text-gray)' }}>Aucune donnée pour cette période.</p>;
              const max = Math.max(...entries.map((e) => e.count), 1);
              return (
                <div style={{ display: 'grid', gap: 6 }}>
                  {entries.map(({ date, count }) => (
                    <div key={date} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 40px', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>{date}</span>
                      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--red-primary)', width: `${(count / max) * 100}%`, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'right' }}>{count}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Onglet Journal ── */}
        {tab === 'logs' && (
          <>
            {/* Filtres */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <select className="form-input" value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
                style={{ flex: '0 0 190px' }}>
                {LOG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>

              <div style={{ display: 'flex', gap: 6, flex: '1 1 260px', minWidth: 200 }}>
                <input className="form-input" style={{ flex: 1 }}
                  placeholder="Filtrer par email ou admin…"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUserSearch()}
                />
                <button className="btn-small" onClick={handleUserSearch} disabled={!userFilter.trim()}>
                  Chercher
                </button>
              </div>

              {(typeFilter || userFilter) && (
                <button onClick={resetFilters}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-gray)' }}>
                  <FaTimes size={11} /> Tout réinitialiser
                </button>
              )}
            </div>

            {error && <div style={{ color: '#ef5350', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            {loading && <div style={{ color: 'var(--text-gray)', fontSize: 13, padding: '12px 0' }}>Chargement…</div>}

            {!loading && logs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-gray)', fontSize: 13 }}>
                Aucun log trouvé.
              </div>
            )}

            {logs.map((log, i) => <AuditLogRow key={log.id ?? i} log={log} />)}

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <button className="btn-small" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>
                  Précédent
                </button>
                <span style={{ fontSize: 13, color: 'var(--text-gray)' }}>Page {page + 1} / {totalPages}</span>
                <button className="btn-small" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || loading}>
                  Suivant
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
