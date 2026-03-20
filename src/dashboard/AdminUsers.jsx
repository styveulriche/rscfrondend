import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  FaUsersCog, FaSyncAlt, FaSearch, FaUserCheck, FaUserTimes,
  FaInfoCircle, FaClipboardList, FaUserShield, FaChartLine,
} from 'react-icons/fa';
import { StatsRow } from './Statistics';
import {
  useAdminUsersBoard, useEligibilityDetails, eligibilityBadge,
  STATUS_LABELS, applyEligibilityStatus, suspendUserAccount,
} from '../hooks/useAdminUsersBoard';
import { searchUsers, usersEvolution, listNewUsers } from '../services/users';
import { useRealtimeResource } from '../hooks/useRealtimeResource';
import { REALTIME_INTERVALS } from '../config/realtime';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const badgeStyle = (status) => {
  const meta = eligibilityBadge[status] || eligibilityBadge.NON_ELIGIBLE;
  return {
    background: meta.bg,
    color: meta.color,
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
  };
};

const formatProbation = (value) => {
  if (!value) return '—';
  if (typeof value === 'number') return `${value} jours restants`;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (typeof value.joursRestants === 'number') {
      return `${value.joursRestants} jours restants`;
    }
    if (typeof value.daysRemaining === 'number') {
      return `${value.daysRemaining} jours restants`;
    }
    if (value.dateFin) {
      const parsed = new Date(value.dateFin);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' });
      }
    }
  }
  return '—';
};

function AdminUsers() {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState('dateCreation,desc');
  const [search, setSearch] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);
  const [apiSearchQuery, setApiSearchQuery] = useState('');
  const [apiSearchResults, setApiSearchResults] = useState(null);
  const [apiSearchLoading, setApiSearchLoading] = useState(false);
  const {
    rows,
    pageData,
    loading,
    error,
    lastUpdated,
    refresh,
    statsSummary,
  } = useAdminUsersBoard({ page, sort });
  const eligibilityInfo = useEligibilityDetails(selectedUserId);

  const fetchEvolution = useCallback(() => usersEvolution(), []);
  const { data: evolutionData } = useRealtimeResource(
    'users-evolution',
    fetchEvolution,
    { interval: REALTIME_INTERVALS.adminUsers || 120000, immediate: true },
  );

  const fetchNewUsers = useCallback(() => listNewUsers(), []);
  const { data: newUsersData } = useRealtimeResource(
    'users-new',
    fetchNewUsers,
    { interval: REALTIME_INTERVALS.adminUsers || 120000, immediate: true },
  );

  const handleApiSearch = useCallback(async () => {
    const q = apiSearchQuery.trim();
    if (!q) return;
    setApiSearchLoading(true);
    setApiSearchResults(null);
    try {
      const res = await searchUsers({ query: q });
      setApiSearchResults(Array.isArray(res) ? res : (res?.content ?? []));
    } catch {
      setApiSearchResults([]);
    } finally {
      setApiSearchLoading(false);
    }
  }, [apiSearchQuery]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesSearch = search
      ? row.fullName.toLowerCase().includes(search.toLowerCase())
        || row.email.toLowerCase().includes(search.toLowerCase())
        || row.telephone.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesEligibility = eligibilityFilter ? row.eligibility === eligibilityFilter : true;
    const matchesStatus = statusFilter ? row.statutCompte === statusFilter : true;
    return matchesSearch && matchesEligibility && matchesStatus;
  }), [rows, search, eligibilityFilter, statusFilter]);

  useEffect(() => {
    if (!selectedUserId && filteredRows.length > 0) {
      setSelectedUserId(filteredRows[0].id);
    }
    if (selectedUserId && !filteredRows.some((row) => row.id === selectedUserId)) {
      setSelectedUserId(filteredRows[0]?.id ?? null);
    }
  }, [filteredRows, selectedUserId]);

  const selectedUser = useMemo(() => filteredRows.find((row) => row.id === selectedUserId) || null,
    [filteredRows, selectedUserId]);

  const summary = statsSummary;

  const handleEligibilityChange = async (nextStatus) => {
    if (!selectedUser?.id) return;
    setActionStatus(null);
    try {
      await applyEligibilityStatus(selectedUser.id, nextStatus);
      setActionStatus({ type: 'success', message: `Statut mis à jour (${nextStatus}).` });
      await refresh();
      if (eligibilityInfo?.refresh) {
        eligibilityInfo.refresh();
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Impossible de mettre à jour le statut.';
      setActionStatus({ type: 'error', message });
    }
  };

  const handleSuspendAccount = async () => {
    if (!selectedUser?.id) return;
    setActionStatus(null);
    try {
      await suspendUserAccount(selectedUser.id);
      setActionStatus({ type: 'success', message: 'Compte suspendu.' });
      await refresh();
      if (eligibilityInfo?.refresh) {
        eligibilityInfo.refresh();
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Impossible de suspendre le compte.';
      setActionStatus({ type: 'error', message });
    }
  };

  const evolutionList = useMemo(() => (Array.isArray(evolutionData) ? evolutionData : []), [evolutionData]);
  const newUsersList = useMemo(() => (Array.isArray(newUsersData) ? newUsersData : (Array.isArray(newUsersData?.content) ? newUsersData.content : [])), [newUsersData]);

  return (
    <div>
      <StatsRow />

      {/* Evolution + new users stats */}
      {(evolutionList.length > 0 || newUsersList.length > 0) && (
        <div className="content-grid" style={{ display: 'grid', gap: 20, marginTop: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {evolutionList.length > 0 && (
            <div className="content-card">
              <h3 className="content-card-title" style={{ marginBottom: 12 }}>
                <FaChartLine size={14} style={{ marginRight: 8, color: 'var(--red-primary)' }} />
                Évolution des inscriptions
              </h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {evolutionList.slice(0, 6).map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: 'var(--text-gray)' }}>{item.periode || item.mois || item.date || `Période ${i + 1}`}</span>
                    <strong>{item.total ?? item.count ?? item.nombre ?? '—'}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
          {newUsersList.length > 0 && (
            <div className="content-card">
              <h3 className="content-card-title" style={{ marginBottom: 12 }}>
                <FaUserCheck size={14} style={{ marginRight: 8, color: 'var(--red-primary)' }} />
                Nouveaux inscrits récents
              </h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {newUsersList.slice(0, 6).map((u) => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span>{[u.prenom, u.nom].filter(Boolean).join(' ') || u.email}</span>
                    <span style={{ color: 'var(--text-gray)', fontSize: 12 }}>{formatDate(u.dateCreation)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* API-level user search */}
      <div className="content-card" style={{ marginTop: 20 }}>
        <h3 className="content-card-title" style={{ marginBottom: 12 }}>
          <FaSearch size={14} style={{ marginRight: 8, color: 'var(--red-primary)' }} />
          Recherche avancée (API)
        </h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            placeholder="Rechercher un utilisateur (nom, email, téléphone…)"
            value={apiSearchQuery}
            onChange={(e) => setApiSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApiSearch()}
          />
          <button className="btn-add" type="button" onClick={handleApiSearch} disabled={apiSearchLoading} style={{ padding: '8px 16px' }}>
            {apiSearchLoading ? 'Recherche…' : 'Rechercher'}
          </button>
        </div>
        {apiSearchResults !== null && (
          <div style={{ marginTop: 12 }}>
            {apiSearchResults.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-gray)' }}>Aucun résultat trouvé.</p>
            )}
            {apiSearchResults.length > 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                {apiSearchResults.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', cursor: 'pointer', fontSize: 13 }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{[u.prenom, u.nom].filter(Boolean).join(' ') || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-gray)' }}>{u.email}</div>
                    </div>
                    <span style={badgeStyle(u.statutEligibilite || u.eligibility)}>{eligibilityBadge[u.statutEligibilite || u.eligibility]?.label || u.statutEligibilite}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="content-card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 className="content-card-title" style={{ marginBottom: 4 }}>
              <FaUsersCog size={16} color="var(--red-primary)" style={{ marginRight: 8 }} />
              Gestion des utilisateurs
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-gray)' }}>
              Analyse de l'éligibilité des membres, complétude des profils et interactions clés.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdated && (
              <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>
                Mise à jour {new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button className="btn-small" type="button" onClick={refresh} disabled={loading}>
              <FaSyncAlt size={12} style={{ marginRight: 6 }} />
              {loading ? 'Chargement…' : 'Actualiser'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '18px 0' }}>
          <div style={{ padding: '8px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', fontSize: 12 }}>
            Total membres: <strong>{summary.total}</strong>
          </div>
          <div style={{ padding: '8px 14px', borderRadius: 999, background: 'rgba(46,125,50,0.15)', fontSize: 12, color: '#2e7d32' }}>
            Éligibles: <strong>{summary.ELIGIBLE}</strong>
          </div>
          <div style={{ padding: '8px 14px', borderRadius: 999, background: 'rgba(245,124,0,0.15)', fontSize: 12, color: '#f57c00' }}>
            En attente: <strong>{summary.EN_ATTENTE}</strong>
          </div>
          <div style={{ padding: '8px 14px', borderRadius: 999, background: 'rgba(198,40,40,0.15)', fontSize: 12, color: '#c62828' }}>
            Non éligibles: <strong>{summary.NON_ELIGIBLE}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <FaSearch size={12} style={{ position: 'absolute', top: 14, left: 12, color: 'var(--text-gray)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 32 }}
              placeholder="Rechercher par nom, email ou téléphone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-input"
            value={eligibilityFilter}
            onChange={(e) => { setEligibilityFilter(e.target.value); setPage(0); }}
            style={{ flex: '0 0 180px' }}
          >
            <option value="">Éligibilité (toutes)</option>
            <option value="ELIGIBLE">Éligible</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="NON_ELIGIBLE">Non éligible</option>
          </select>
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            style={{ flex: '0 0 180px' }}
          >
            <option value="">Statut compte</option>
            <option value="ACTIF">Actif</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="SUSPENDU">Suspendu</option>
          </select>
          <select
            className="form-input"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(0); }}
            style={{ flex: '0 0 180px' }}
          >
            <option value="dateCreation,desc">Plus récents</option>
            <option value="dateCreation,asc">Plus anciens</option>
            <option value="nom,asc">Nom A-Z</option>
          </select>
        </div>

        {error && (
          <div style={{ color: 'var(--red-primary)', marginBottom: 12 }}>
            Impossible de récupérer les utilisateurs.
          </div>
        )}

        {filteredRows.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-gray)' }}>
            Aucun utilisateur ne correspond aux filtres.
          </div>
        )}

        {filteredRows.length > 0 && (
          <div className="table" style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-gray)' }}>
                  <th style={{ padding: '8px 6px' }}>Utilisateur</th>
                  <th style={{ padding: '8px 6px' }}>Pays d'origine</th>
                  <th style={{ padding: '8px 6px' }}>Statut</th>
                  <th style={{ padding: '8px 6px' }}>Éligibilité</th>
                  <th style={{ padding: '8px 6px' }}>Interactions</th>
                  <th style={{ padding: '8px 6px' }}>Dernière activité</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedUserId(row.id)}
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      background: row.id === selectedUserId ? 'rgba(255,255,255,0.04)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '10px 6px' }}>
                      <div style={{ fontWeight: 600 }}>{row.fullName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-gray)' }}>{row.email}</div>
                    </td>
                    <td style={{ padding: '10px 6px' }}>{row.paysOrigine}</td>
                    <td style={{ padding: '10px 6px' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>
                        {STATUS_LABELS[row.statutCompte] || row.statutCompte}
                      </span>
                    </td>
                    <td style={{ padding: '10px 6px' }}>
                      <span style={badgeStyle(row.eligibility)}>{eligibilityBadge[row.eligibility]?.label}</span>
                    </td>
                    <td style={{ padding: '10px 6px', fontSize: 12 }}>
                      <div>Parrainages: {row.parrainagesCount}</div>
                      <div>Ayants droit: {row.ayantsCount}</div>
                      <div>Dossiers: {row.dossiersCount}</div>
                    </td>
                    <td style={{ padding: '10px 6px', fontSize: 12 }}>{formatDate(row.lastInteraction)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pageData.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 12 }}>
            <button
              className="btn-small"
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
            >
              Page précédente
            </button>
            <span>Page {page + 1} / {pageData.totalPages}</span>
            <button
              className="btn-small"
              type="button"
              onClick={() => setPage((prev) => Math.min(prev + 1, pageData.totalPages - 1))}
              disabled={page + 1 >= pageData.totalPages}
            >
              Page suivante
            </button>
          </div>
        )}
      </div>

      <div className="content-grid" style={{ display: 'grid', gap: 20, marginTop: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div className="content-card">
          <h3 className="content-card-title" style={{ marginBottom: 12 }}>
            <FaInfoCircle size={14} style={{ marginRight: 8, color: 'var(--red-primary)' }} />
            Profil détaillé
          </h3>
          {!selectedUser && (
            <p style={{ color: 'var(--text-gray)', fontSize: 13 }}>Sélectionnez un utilisateur pour afficher ses informations.</p>
          )}
          {selectedUser && (
            <div style={{ fontSize: 13, display: 'grid', gap: 10 }}>
              <div>
                <p style={{ margin: 0, color: 'var(--text-gray)' }}>Identité</p>
                <strong>{selectedUser.fullName}</strong>
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--text-gray)' }}>Coordonnées</p>
                <span>{selectedUser.email}</span><br />
                <span>{selectedUser.telephone}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-gray)' }}>Pays d'origine</p>
                  <strong>{selectedUser.paysOrigine}</strong>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-gray)' }}>Statut</p>
                  <strong>{selectedUser.statutUtilisateur}</strong>
                </div>
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--text-gray)' }}>Complétude informations secondaires</p>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontWeight: 600,
                  fontSize: 11,
                  background: selectedUser.secondaryComplete ? 'rgba(46,125,50,0.15)' : 'rgba(245,124,0,0.15)',
                  color: selectedUser.secondaryComplete ? '#2e7d32' : '#f57c00',
                }}>
                  {selectedUser.secondaryComplete ? 'Complète' : 'Incomplète'}
                </span>
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--text-gray)' }}>Dernière activité</p>
                <strong>{formatDate(selectedUser.lastInteraction)}</strong>
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--text-gray)' }}>Éligibilité (API)</p>
                {eligibilityInfo.loading && <span>Analyse en cours…</span>}
                {!eligibilityInfo.loading && !eligibilityInfo.error && (
                  <strong>{eligibilityInfo.eligibility?.statut || eligibilityInfo.eligibility?.status || selectedUser.eligibility}</strong>
                )}
                {eligibilityInfo.error && (
                  <span style={{ color: 'var(--red-primary)', fontSize: 12 }}>Impossible de récupérer le détail.</span>
                )}
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--text-gray)' }}>Jours restants probatoire</p>
                <strong>{formatProbation(eligibilityInfo.probation)}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="content-card">
          <h3 className="content-card-title" style={{ marginBottom: 12 }}>
            <FaClipboardList size={14} style={{ marginRight: 8, color: 'var(--red-primary)' }} />
            Actions d'éligibilité
          </h3>
          {actionStatus && (
            <div style={{
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 12,
              background: actionStatus.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
              color: actionStatus.type === 'success' ? '#2e7d32' : '#c62828',
            }}>
              {actionStatus.message}
            </div>
          )}
          {!selectedUser && (
            <p style={{ color: 'var(--text-gray)', fontSize: 13 }}>Sélectionnez un utilisateur pour effectuer une action.</p>
          )}
          {selectedUser && (
            <div style={{ display: 'grid', gap: 10 }}>
              <button
                type="button"
                className="btn-small"
                onClick={eligibilityInfo.refresh}
                disabled={eligibilityInfo.loading}
              >
                Rafraîchir les statuts détaillés
              </button>
              <button
                type="button"
                className="btn-add"
                onClick={() => handleEligibilityChange('ELIGIBLE')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <FaUserCheck size={14} /> Marquer comme éligible
              </button>
              <button
                type="button"
                className="btn-small"
                onClick={() => handleEligibilityChange('EN_ATTENTE')}
              >
                Mettre en attente
              </button>
              <button
                type="button"
                className="btn-small"
                onClick={() => handleEligibilityChange('NON_ELIGIBLE')}
              >
                Marquer non éligible
              </button>
              <button
                type="button"
                className="btn-small"
                onClick={handleSuspendAccount}
                style={{ borderColor: 'rgba(198,40,40,0.5)', color: '#c62828' }}
              >
                <FaUserTimes size={12} style={{ marginRight: 6 }} /> Suspendre le compte
              </button>
            </div>
          )}
        </div>

        <div className="content-card">
          <h3 className="content-card-title" style={{ marginBottom: 12 }}>
            <FaUserShield size={14} style={{ marginRight: 8, color: 'var(--red-primary)' }} />
            Synthèse interactions
          </h3>
          {!selectedUser && (
            <p style={{ color: 'var(--text-gray)', fontSize: 13 }}>Sélectionnez un utilisateur pour consulter ses interactions.</p>
          )}
          {selectedUser && (
            <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Parrainages envoyés</span>
                <strong>{selectedUser.parrainagesCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Ayants droit déclarés</span>
                <strong>{selectedUser.ayantsCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Dossiers en cours</span>
                <strong>{selectedUser.dossiersCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Statut éligibilité</span>
                <strong>{eligibilityBadge[selectedUser.eligibility]?.label}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Probatoire</span>
                <strong>{formatProbation(eligibilityInfo.probation)}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminUsers;
