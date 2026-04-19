import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  FaUsersCog, FaSyncAlt, FaSearch, FaUserCheck, FaUserTimes,
  FaInfoCircle, FaClipboardList, FaUserShield, FaChartLine,
  FaIdCard, FaEye, FaFilePdf, FaTimes, FaUser, FaUsers,
  FaPhone, FaEnvelope, FaMapMarkerAlt, FaCalendarAlt,
} from 'react-icons/fa';
import { StatsRow } from './Statistics';
import {
  useAdminUsersBoard, useEligibilityDetails, eligibilityBadge,
  STATUS_LABELS, applyEligibilityStatus, suspendUserAccount,
} from '../hooks/useAdminUsersBoard';
import { usersEvolution, listNewUsers, getUser } from '../services/users';
import { listByUser as listAyantsByUser } from '../services/ayantsDroit';
import { useRealtimeResource } from '../hooks/useRealtimeResource';
import { REALTIME_INTERVALS } from '../config/realtime';

/* ── Helpers ─────────────────────────────────────────────────── */

const API_ORIGIN = (() => {
  const full = process.env.REACT_APP_API_BASE_URL?.trim()
    || `http://localhost:${process.env.REACT_APP_API_PORT || '8080'}/api/v1`;
  try { return new URL(full).origin; } catch { return ''; }
})();

const buildMediaUrl = (path) => {
  if (!path) return null;
  if (/^(https?:\/\/|blob:|data:)/.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const badgeStyle = (status) => {
  const meta = eligibilityBadge[status] || eligibilityBadge.NON_ELIGIBLE;
  return { background: meta.bg, color: meta.color, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' };
};

const statusBadgeStyle = (statut) => {
  const map = {
    ACTIF:      { bg: 'rgba(46,125,50,0.15)',   color: '#4caf50' },
    EN_ATTENTE: { bg: 'rgba(245,124,0,0.15)',   color: '#ff9800' },
    SUSPENDU:   { bg: 'rgba(198,40,40,0.15)',   color: '#ef5350' },
    INACTIF:    { bg: 'rgba(100,100,100,0.15)', color: '#9e9e9e' },
  };
  const s = map[statut] || map.INACTIF;
  return { background: s.bg, color: s.color, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' };
};

const formatProbation = (value) => {
  if (!value) return '—';
  if (typeof value === 'number') return `${value} jours restants`;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (typeof value.joursRestants === 'number') return `${value.joursRestants} jours restants`;
    if (typeof value.daysRemaining === 'number') return `${value.daysRemaining} jours restants`;
    if (value.dateFin) {
      const p = new Date(value.dateFin);
      if (!Number.isNaN(p.getTime())) return p.toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' });
    }
  }
  return '—';
};

const LIEN_LABELS = {
  CONJOINT: 'Conjoint(e)', ENFANT: 'Enfant', PARENT: 'Parent',
  FRERE_SOEUR: 'Frère/Sœur', GRAND_PARENT: 'Grand-parent',
  ONCLE_TANTE: 'Oncle/Tante', AUTRE: 'Autre',
};

const normalizeAyants = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

/* ── Lightbox document identité ──────────────────────────────── */

function DocLightbox({ url, name, onClose }) {
  const isPdf = name?.toLowerCase().endsWith('.pdf');
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#1e1e2e', borderRadius: 14, padding: 20,
        maxWidth: 720, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#fff' }}>
            <FaIdCard size={13} style={{ marginRight: 6, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
            {name || 'Pièce d\'identité'}
          </p>
          <button type="button" onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', borderRadius: 6, padding: '4px 8px' }}>
            <FaTimes size={14} />
          </button>
        </div>
        {isPdf ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <FaFilePdf size={56} color="#ef5350" style={{ marginBottom: 14 }} />
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Aperçu non disponible pour les PDF.</p>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--red-primary)', color: 'white',
              padding: '10px 22px', borderRadius: 8, textDecoration: 'none',
              fontSize: 13, fontWeight: 700,
            }}>
              <FaFilePdf size={13} /> Ouvrir le PDF
            </a>
          </div>
        ) : (
          <img src={url} alt={name || 'Pièce d\'identité'}
            style={{ width: '100%', maxHeight: 540, objectFit: 'contain', borderRadius: 8, background: '#111' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
      </div>
    </div>
  );
}

/* ── Skeleton ligne tableau ──────────────────────────────────── */

function TableSkeleton() {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {Array.from({ length: 6 }).map((__, j) => (
        <td key={j} style={{ padding: '12px 8px' }}>
          <div style={{
            height: j === 0 ? 34 : 14,
            width: j === 0 ? 160 : ['70%', '50%', '80%', '60%'][j % 4],
            borderRadius: j === 0 ? 8 : 4,
            background: 'rgba(255,255,255,0.07)',
            animation: 'pulse 1.4s ease-in-out infinite',
          }} />
        </td>
      ))}
    </tr>
  ));
}

/* ── Composant principal ─────────────────────────────────────── */

function AdminUsers() {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState('dateCreation,desc');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);
  const searchTimerRef = useRef(null);

  const [fullUserDetail, setFullUserDetail] = useState(null);
  const [fullUserLoading, setFullUserLoading] = useState(false);
  const [ayants, setAyants] = useState([]);
  const [ayantsLoading, setAyantsLoading] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const handleSearchChange = (value) => {
    setSearchInput(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(value);
      setPage(0);
    }, 400);
  };

  const handleEligibilityChange_filter = (v) => { setEligibilityFilter(v); setPage(0); };
  const handleStatusChange_filter = (v) => { setStatusFilter(v); setPage(0); };
  const handleSortChange = (v) => { setSort(v); setPage(0); };

  const {
    rows, pageData, loading, error, lastUpdated, refresh, statsSummary,
  } = useAdminUsersBoard({
    page, sort, search,
    statut: statusFilter,
    eligibilite: eligibilityFilter,
  });

  const eligibilityInfo = useEligibilityDetails(selectedUserId);

  const fetchEvolution = useCallback(() => usersEvolution(), []);
  const { data: evolutionData } = useRealtimeResource(
    'users-evolution', fetchEvolution,
    { interval: REALTIME_INTERVALS.adminUsers || 120000, immediate: true },
  );

  const fetchNewUsers = useCallback(() => listNewUsers(), []);
  const { data: newUsersData } = useRealtimeResource(
    'users-new', fetchNewUsers,
    { interval: REALTIME_INTERVALS.adminUsers || 120000, immediate: true },
  );

  useEffect(() => {
    if (!selectedUserId) { setFullUserDetail(null); setAyants([]); return; }
    let cancelled = false;
    const loadAll = async () => {
      setFullUserLoading(true);
      setAyantsLoading(true);
      try {
        const [userRes, ayantsRes] = await Promise.allSettled([
          getUser(selectedUserId),
          listAyantsByUser(selectedUserId),
        ]);
        if (!cancelled) {
          if (userRes.status === 'fulfilled') setFullUserDetail(userRes.value);
          if (ayantsRes.status === 'fulfilled') setAyants(normalizeAyants(ayantsRes.value));
          else setAyants([]);
        }
      } finally {
        if (!cancelled) { setFullUserLoading(false); setAyantsLoading(false); }
      }
    };
    loadAll();
    return () => { cancelled = true; };
  }, [selectedUserId]);

  useEffect(() => {
    if (!selectedUserId && rows.length > 0) setSelectedUserId(rows[0].id);
    if (selectedUserId && rows.length > 0 && !rows.some((r) => r.id === selectedUserId)) {
      setSelectedUserId(rows[0].id);
    }
  }, [rows, selectedUserId]);

  const displayRows = useMemo(() => {
    if (!eligibilityFilter) return rows;
    return rows.filter((r) => r.eligibility === eligibilityFilter);
  }, [rows, eligibilityFilter]);

  const selectedUser = useMemo(
    () => displayRows.find((r) => r.id === selectedUserId) || rows.find((r) => r.id === selectedUserId) || null,
    [displayRows, rows, selectedUserId],
  );

  const handleEligibilityChange = async (nextStatus) => {
    if (!selectedUser?.id) return;
    setActionStatus(null);
    try {
      await applyEligibilityStatus(selectedUser.id, nextStatus);
      setActionStatus({ type: 'success', message: `Éligibilité mise à jour : ${eligibilityBadge[nextStatus]?.label || nextStatus}.` });
      await refresh();
      eligibilityInfo.refresh?.();
      const fresh = await getUser(selectedUser.id);
      setFullUserDetail(fresh);
    } catch (err) {
      setActionStatus({ type: 'error', message: err?.response?.data?.message || err?.message || 'Impossible de mettre à jour.' });
    }
  };

  const handleSuspendAccount = async () => {
    if (!selectedUser?.id) return;
    setActionStatus(null);
    try {
      await suspendUserAccount(selectedUser.id);
      setActionStatus({ type: 'success', message: 'Compte suspendu.' });
      await refresh();
      eligibilityInfo.refresh?.();
    } catch (err) {
      setActionStatus({ type: 'error', message: err?.response?.data?.message || err?.message || 'Impossible de suspendre.' });
    }
  };

  const evolutionList = useMemo(() => (Array.isArray(evolutionData) ? evolutionData : []), [evolutionData]);
  const newUsersList = useMemo(() => (
    Array.isArray(newUsersData) ? newUsersData
    : Array.isArray(newUsersData?.content) ? newUsersData.content : []
  ), [newUsersData]);
  const summary = statsSummary;

  const profilePhotoUrl = buildMediaUrl(
    fullUserDetail?.photoProfile || fullUserDetail?.photo || fullUserDetail?.avatar
    || selectedUser?.raw?.photoProfile || selectedUser?.raw?.avatar,
  );

  const selectedInitials = selectedUser
    ? `${(selectedUser.fullName || '?')[0]}${(selectedUser.fullName || '').split(' ')[1]?.[0] || ''}`.toUpperCase()
    : '?';

  /* ── Styles partagés ── */
  const cardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' };
  const labelStyle = { margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const valueStyle = { margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <StatsRow />

      {lightbox && (
        <DocLightbox url={lightbox.url} name={lightbox.name} onClose={() => setLightbox(null)} />
      )}

      {/* Évolution + nouveaux inscrits */}
      {(evolutionList.length > 0 || newUsersList.length > 0) && (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {evolutionList.length > 0 && (
            <div className="content-card">
              <h3 className="content-card-title" style={{ marginBottom: 12 }}>
                <FaChartLine size={13} style={{ marginRight: 8, color: 'var(--red-primary)' }} />
                Évolution des inscriptions
              </h3>
              {evolutionList.slice(0, 6).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.55)' }}>{item.periode || item.mois || item.date || `Période ${i + 1}`}</span>
                  <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{item.total ?? item.count ?? item.nombre ?? '—'}</strong>
                </div>
              ))}
            </div>
          )}
          {newUsersList.length > 0 && (
            <div className="content-card">
              <h3 className="content-card-title" style={{ marginBottom: 12 }}>
                <FaUserCheck size={13} style={{ marginRight: 8, color: 'var(--red-primary)' }} />
                Nouveaux inscrits récents
              </h3>
              {newUsersList.slice(0, 6).map((u) => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.85)' }}>{[u.prenom, u.nom].filter(Boolean).join(' ') || u.email}</span>
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{formatDateTime(u.dateCreation)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Table utilisateurs ─────────────────────────────────── */}
      <div className="content-card">
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <h3 className="content-card-title" style={{ margin: 0 }}>
            <FaUsersCog size={16} color="var(--red-primary)" style={{ marginRight: 8 }} />
            Gestion des utilisateurs
            <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.45)' }}>
              {pageData.totalElements > 0 ? `${pageData.totalElements} membre${pageData.totalElements > 1 ? 's' : ''}` : ''}
            </span>
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdated && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                Mis à jour {new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button className="btn-small" type="button" onClick={refresh} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FaSyncAlt size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? 'Chargement…' : 'Actualiser'}
            </button>
          </div>
        </div>

        {/* Badges résumé */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { label: 'Total', value: summary.total,        bg: 'rgba(255,255,255,0.08)',   color: 'rgba(255,255,255,0.8)' },
            { label: 'Éligibles', value: summary.ELIGIBLE,     bg: 'rgba(46,125,50,0.2)',    color: '#66bb6a' },
            { label: 'En attente', value: summary.EN_ATTENTE,   bg: 'rgba(245,124,0,0.2)',    color: '#ffa726' },
            { label: 'Non éligibles', value: summary.NON_ELIGIBLE, bg: 'rgba(198,40,40,0.2)', color: '#ef5350' },
          ].map((s) => (
            <div key={s.label} style={{ padding: '6px 14px', borderRadius: 999, background: s.bg, fontSize: 12, color: s.color, display: 'flex', gap: 6, alignItems: 'center' }}>
              <strong>{s.value}</strong>
              <span style={{ opacity: 0.75 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: '1 1 220px', position: 'relative', minWidth: 0 }}>
            <FaSearch size={11} style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
            <input className="form-input" style={{ paddingLeft: 32, width: '100%', boxSizing: 'border-box' }}
              placeholder="Nom, email, téléphone…"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)} />
          </div>
          <select className="form-input" value={eligibilityFilter}
            onChange={(e) => handleEligibilityChange_filter(e.target.value)}
            style={{ flex: '0 0 160px', minWidth: 0 }}>
            <option value="">Éligibilité (tous)</option>
            <option value="ELIGIBLE">Éligible</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="NON_ELIGIBLE">Non éligible</option>
          </select>
          <select className="form-input" value={statusFilter}
            onChange={(e) => handleStatusChange_filter(e.target.value)}
            style={{ flex: '0 0 160px', minWidth: 0 }}>
            <option value="">Statut (tous)</option>
            <option value="ACTIF">Actif</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="SUSPENDU">Suspendu</option>
          </select>
          <select className="form-input" value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            style={{ flex: '0 0 150px', minWidth: 0 }}>
            <option value="dateCreation,desc">Plus récents</option>
            <option value="dateCreation,asc">Plus anciens</option>
            <option value="nom,asc">Nom A–Z</option>
          </select>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(198,40,40,0.15)', color: '#ef5350', fontSize: 13, marginBottom: 12 }}>
            Impossible de charger les utilisateurs. Vérifiez la connexion.
          </div>
        )}

        {/* Tableau */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                {['Utilisateur', 'Pays', 'Statut', 'Éligibilité', 'Interactions', 'Dernière activité'].map((h) => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && displayRows.length === 0
                ? <TableSkeleton />
                : displayRows.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                        Aucun utilisateur ne correspond aux filtres.
                      </td>
                    </tr>
                  )
                  : displayRows.map((row) => {
                    const rowPhoto = buildMediaUrl(row.raw?.photoProfile || row.raw?.avatar);
                    const isSelected = row.id === selectedUserId;
                    return (
                      <tr key={row.id}
                        onClick={() => setSelectedUserId(row.id)}
                        style={{
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                          background: isSelected ? 'rgba(139,28,28,0.15)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                        <td style={{ padding: '10px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                              background: 'linear-gradient(135deg, var(--red-primary), var(--red-dark))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden',
                              border: isSelected ? '2px solid var(--red-primary)' : '2px solid transparent',
                              position: 'relative',
                            }}>
                              {`${(row.fullName || '?')[0]}`.toUpperCase()}
                              {rowPhoto && (
                                <img src={rowPhoto} alt=""
                                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{row.fullName}</div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{row.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 10px', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>{row.paysOrigine}</td>
                        <td style={{ padding: '10px 10px' }}>
                          <span style={statusBadgeStyle(row.statutCompte)}>{STATUS_LABELS[row.statutCompte] || row.statutCompte}</span>
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <span style={badgeStyle(row.eligibility)}>{eligibilityBadge[row.eligibility]?.label}</span>
                        </td>
                        <td style={{ padding: '10px 10px', fontSize: 12, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>
                          Parr.&nbsp;{row.parrainagesCount} · Ayants&nbsp;{row.ayantsCount} · Doss.&nbsp;{row.dossiersCount}
                        </td>
                        <td style={{ padding: '10px 10px', fontSize: 11, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{formatDateTime(row.lastInteraction)}</td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageData.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 12 }}>
            <button className="btn-small" type="button" onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}>
              ← Précédent
            </button>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Page {page + 1} / {pageData.totalPages}</span>
            <button className="btn-small" type="button" onClick={() => setPage((p) => Math.min(p + 1, pageData.totalPages - 1))} disabled={page + 1 >= pageData.totalPages}>
              Suivant →
            </button>
          </div>
        )}
      </div>

      {/* ── Panneau de détail ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

        {/* Profil complet */}
        <div className="content-card">
          <h3 className="content-card-title" style={{ marginBottom: 16 }}>
            <FaInfoCircle size={13} style={{ marginRight: 8, color: 'var(--red-primary)' }} />
            Profil complet
          </h3>
          {!selectedUser
            ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Sélectionnez un utilisateur dans le tableau.</p>
            : (
              <>
                {/* Avatar + infos principales */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--red-primary), var(--red-dark))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 700, color: 'white', overflow: 'hidden',
                    border: '2px solid rgba(139,28,28,0.6)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    position: 'relative',
                  }}>
                    {fullUserLoading
                      ? <FaUser size={24} color="rgba(255,255,255,0.4)" />
                      : selectedInitials
                    }
                    {!fullUserLoading && profilePhotoUrl && (
                      <img src={profilePhotoUrl} alt="Photo de profil"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.95)' }}>{selectedUser.fullName}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                      <FaEnvelope size={10} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                      {selectedUser.email}
                    </p>
                    {selectedUser.telephone !== '—' && (
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                        <FaPhone size={10} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                        {selectedUser.telephone}
                      </p>
                    )}
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={badgeStyle(selectedUser.eligibility)}>{eligibilityBadge[selectedUser.eligibility]?.label}</span>
                      <span style={statusBadgeStyle(selectedUser.statutCompte)}>{STATUS_LABELS[selectedUser.statutCompte] || selectedUser.statutCompte}</span>
                    </div>
                  </div>
                </div>

                {/* Grille de champs */}
                {fullUserLoading
                  ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} style={{ ...cardStyle, height: 46 }} />
                      ))}
                    </div>
                  )
                  : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Date de naissance', icon: FaCalendarAlt, value: formatDate(fullUserDetail?.dateNaissance) },
                        { label: 'Sexe', icon: FaUser, value: fullUserDetail?.sexe === 'M' ? 'Masculin' : fullUserDetail?.sexe === 'F' ? 'Féminin' : fullUserDetail?.sexe || '—' },
                        { label: 'Pays d\'origine', icon: FaMapMarkerAlt, value: fullUserDetail?.paysOrigine || selectedUser.paysOrigine },
                        { label: 'Statut diaspora', icon: FaUsers, value: fullUserDetail?.statutDiaspora || '—' },
                        { label: 'Code parrainage', icon: null, value: fullUserDetail?.codeParrainage || '—' },
                        { label: 'Membre depuis', icon: FaCalendarAlt, value: formatDate(fullUserDetail?.dateInscription || fullUserDetail?.dateCreation) },
                        { label: 'Dernière connexion', icon: null, value: formatDate(fullUserDetail?.derniereConnexion || fullUserDetail?.lastLogin) },
                        { label: 'Probatoire', icon: null, value: formatProbation(eligibilityInfo.probation) },
                      ].map(({ label, value }) => (
                        <div key={label} style={cardStyle}>
                          <p style={labelStyle}>{label}</p>
                          <p style={valueStyle}>{value || '—'}</p>
                        </div>
                      ))}
                    </div>
                  )
                }
              </>
            )
          }
        </div>

        {/* Actions éligibilité */}
        <div className="content-card">
          <h3 className="content-card-title" style={{ marginBottom: 14 }}>
            <FaClipboardList size={13} style={{ marginRight: 8, color: 'var(--red-primary)' }} />
            Validation de l'éligibilité
          </h3>

          {actionStatus && (
            <div style={{
              marginBottom: 14, padding: '10px 14px', borderRadius: 8, fontSize: 13,
              background: actionStatus.type === 'success' ? 'rgba(46,125,50,0.2)' : 'rgba(198,40,40,0.2)',
              color: actionStatus.type === 'success' ? '#66bb6a' : '#ef5350',
              border: `1px solid ${actionStatus.type === 'success' ? 'rgba(46,125,50,0.3)' : 'rgba(198,40,40,0.3)'}`,
            }}>
              {actionStatus.message}
            </div>
          )}

          {!selectedUser
            ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Sélectionnez un utilisateur.</p>
            : (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Statut actuel</span>
                  <span style={badgeStyle(selectedUser.eligibility)}>{eligibilityBadge[selectedUser.eligibility]?.label || '—'}</span>
                </div>

                {eligibilityInfo.loading && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '8px 0' }}>Analyse en cours…</p>
                )}
                {!eligibilityInfo.loading && eligibilityInfo.eligibility && (
                  <div style={{ ...cardStyle, fontSize: 12 }}>
                    {eligibilityInfo.eligibility?.criteres
                      ? Object.entries(eligibilityInfo.eligibility.criteres).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: 'rgba(255,255,255,0.6)' }}>
                          <span>{k}</span>
                          <span style={{ color: v ? '#66bb6a' : '#ef5350', fontWeight: 700 }}>{v ? '✓' : '✗'}</span>
                        </div>
                      ))
                      : <span style={{ color: 'rgba(255,255,255,0.5)' }}>{eligibilityInfo.eligibility?.statut || eligibilityInfo.eligibility?.status || 'Aucun détail'}</span>
                    }
                  </div>
                )}

                <button type="button" className="btn-add"
                  onClick={() => handleEligibilityChange('ELIGIBLE')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <FaUserCheck size={13} /> Valider comme éligible
                </button>
                <button type="button" className="btn-small" onClick={() => handleEligibilityChange('EN_ATTENTE')}
                  style={{ color: '#ffa726', borderColor: 'rgba(245,124,0,0.4)' }}>
                  Mettre en attente
                </button>
                <button type="button" className="btn-small" onClick={() => handleEligibilityChange('NON_ELIGIBLE')}
                  style={{ color: '#ef5350', borderColor: 'rgba(198,40,40,0.4)' }}>
                  Marquer non éligible
                </button>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, display: 'grid', gap: 8 }}>
                  <button type="button" className="btn-small"
                    onClick={handleSuspendAccount}
                    style={{ color: '#ef5350', borderColor: 'rgba(198,40,40,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <FaUserTimes size={12} /> Suspendre le compte
                  </button>
                  <button type="button" className="btn-small" onClick={eligibilityInfo.refresh} disabled={eligibilityInfo.loading}
                    style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    Rafraîchir l'analyse
                  </button>
                </div>
              </div>
            )
          }
        </div>

        {/* Synthèse interactions */}
        <div className="content-card">
          <h3 className="content-card-title" style={{ marginBottom: 14 }}>
            <FaUserShield size={13} style={{ marginRight: 8, color: 'var(--red-primary)' }} />
            Synthèse interactions
          </h3>
          {!selectedUser
            ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Sélectionnez un utilisateur.</p>
            : (
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { label: 'Parrainages envoyés', value: selectedUser.parrainagesCount, color: '#42a5f5' },
                  { label: 'Ayants droit déclarés', value: selectedUser.ayantsCount,     color: '#66bb6a' },
                  { label: 'Dossiers en cours',     value: selectedUser.dossiersCount,   color: '#ffa726' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{label}</span>
                    <strong style={{ fontSize: 18, color }}>{value}</strong>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* ── Ayants droit + pièces d'identité ─────────────────────── */}
      {selectedUser && (
        <div className="content-card">
          <h3 className="content-card-title" style={{ marginBottom: 16 }}>
            <FaUsers size={13} style={{ marginRight: 8, color: 'var(--red-primary)' }} />
            Ayants droit & pièces d'identité
            <span style={{ marginLeft: 8, background: 'rgba(139,28,28,0.3)', color: 'var(--pink-light)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
              {ayants.length}
            </span>
          </h3>

          {ayantsLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ height: 160, borderRadius: 12, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.4s ease-in-out infinite' }} />
              ))}
            </div>
          )}

          {!ayantsLoading && ayants.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
              <FaUsers size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
              Aucun ayant droit enregistré pour cet utilisateur.
            </div>
          )}

          {!ayantsLoading && ayants.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {ayants.map((a) => {
                const idUrl = buildMediaUrl(a.pieceIdentiteUrl);
                const isPdf = a.pieceIdentiteNom?.toLowerCase().endsWith('.pdf');
                const fullName = [a.prenom, a.nom].filter(Boolean).join(' ') || a.nomComplet || '—';
                return (
                  <div key={a.id} style={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, overflow: 'hidden',
                    background: 'rgba(255,255,255,0.04)',
                  }}>
                    {/* En-tête */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--red-primary), var(--red-dark))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, fontWeight: 700, color: 'white',
                      }}>
                        {fullName[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                          {LIEN_LABELS[a.lienFamilial] || a.lienFamilial || '—'}
                          {a.estMineur && <span style={{ marginLeft: 6, color: '#ffa726' }}>Mineur</span>}
                          {a.estPrincipal && <span style={{ marginLeft: 6, color: '#42a5f5' }}>Principal</span>}
                        </p>
                      </div>
                    </div>

                    {/* Infos */}
                    <div style={{ padding: '10px 16px', fontSize: 12, display: 'grid', gap: 5 }}>
                      {a.telephone && (
                        <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                          <FaPhone size={10} style={{ marginRight: 6, color: 'rgba(255,255,255,0.3)' }} />
                          {a.telephone}
                        </div>
                      )}
                      {a.dateNaissance && (
                        <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                          <FaCalendarAlt size={10} style={{ marginRight: 6, color: 'rgba(255,255,255,0.3)' }} />
                          Né(e) le {formatDate(a.dateNaissance)}
                        </div>
                      )}
                      {a.sexe && (
                        <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                          <FaUser size={10} style={{ marginRight: 6, color: 'rgba(255,255,255,0.3)' }} />
                          {a.sexe === 'M' ? 'Masculin' : a.sexe === 'F' ? 'Féminin' : a.sexe}
                        </div>
                      )}
                    </div>

                    {/* Pièce d'identité */}
                    <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {idUrl ? (
                        <button type="button"
                          onClick={() => setLightbox({ url: idUrl, name: a.pieceIdentiteNom })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                            background: 'rgba(139,28,28,0.2)', border: '1px solid rgba(139,28,28,0.4)',
                            borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                            color: 'var(--pink-light)', fontSize: 12, fontWeight: 600,
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,28,28,0.35)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(139,28,28,0.2)'; }}>
                          {isPdf ? <FaFilePdf size={13} /> : <FaEye size={13} />}
                          {a.pieceIdentiteNom || 'Voir la pièce d\'identité'}
                        </button>
                      ) : (
                        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                          <FaIdCard size={11} style={{ marginRight: 6 }} />
                          {a.pieceIdentiteNom ? `📎 ${a.pieceIdentiteNom}` : 'Aucune pièce d\'identité'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default AdminUsers;
