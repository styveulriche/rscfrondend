import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  FaFileAlt, FaSyncAlt, FaSearch, FaCheckCircle, FaTimesCircle,
  FaTrash, FaNewspaper, FaEye, FaFilePdf,
  FaGlobe, FaEyeSlash, FaPaperPlane, FaQuestionCircle,
} from 'react-icons/fa';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import {
  listDeclarations,
  declarationsSearch,
  declarationsStats,
  validateDeclaration,
  rejectDeclaration,
  deleteDeclaration,
} from '../services/declarations';
import {
  listDocuments,
  addDocument,
  deleteDocument,
  soumettre,
  demanderComplements,
} from '../services/declarationDocuments';
import {
  getAvis,
  createAvis,
  updateAvis,
  getAvisPdf,
  publierAvis,
  depublierAvis,
  deleteAvis,
} from '../services/avisDecès';
import { useRealtimeResource } from '../hooks/useRealtimeResource';
import { REALTIME_INTERVALS } from '../config/realtime';

const STATUTS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'DECLARE', label: 'Déclarée' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TRAITE', label: 'Traitée' },
  { value: 'CLOTURE', label: 'Clôturée' },
  { value: 'REJETE', label: 'Rejetée' },
];

const STATUT_LABELS = {
  DECLARE: 'Déclarée', EN_COURS: 'En cours', TRAITE: 'Traitée',
  CLOTURE: 'Clôturée', REJETE: 'Rejetée', ANNULE: 'Annulée',
};

const statusColor = (v) => {
  const n = v?.toUpperCase();
  if (n === 'TRAITE' || n === 'CLOTURE') return '#2e7d32';
  if (n === 'REJETE' || n === 'ANNULE') return '#c62828';
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

const normalizeStats = (s) => ({
  total: s?.total ?? s?.totalDeclarations ?? 0,
  declares: s?.declares ?? s?.declared ?? s?.DECLARE ?? 0,
  enCours: s?.enCours ?? s?.EN_COURS ?? 0,
  traites: s?.traites ?? s?.TRAITE ?? 0,
  rejetes: s?.rejetes ?? s?.REJETE ?? 0,
});

export default function DeclarationsAdmin() {
  const [page, setPage] = useState(0);
  const [statutFilter, setStatutFilter] = useState('');
  const [paysFilter, setPaysFilter] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);
  const [rejectMotif, setRejectMotif] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  /* ── Documents panel ─────────────────── */
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docStatus, setDocStatus] = useState(null);
  const [docForm, setDocForm] = useState({ type: 'CERTIFICAT_DECES', nomFichier: '', urlDocument: '', description: '' });
  const [complementMsg, setComplementMsg] = useState('');

  /* ── Avis de décès panel ─────────────── */
  const [avis, setAvis] = useState(null);
  const [avisLoading, setAvisLoading] = useState(false);
  const [avisStatus, setAvisStatus] = useState(null);
  const [avisForm, setAvisForm] = useState({
    nomDefunt: '', prenomDefunt: '', dateNaissance: '', dateDeces: '',
    lieuDeces: '', pays: '', photoUrl: '', contenuHtml: '', estPublic: false,
  });
  const [showAvisForm, setShowAvisForm] = useState(false);

  const { user } = useAuth();
  const adminId = user?.id;

  /* ── Auto-load docs + avis when selection changes ── */
  useEffect(() => {
    if (!selectedId) {
      setDocuments([]);
      setAvis(null);
      setDocStatus(null);
      setAvisStatus(null);
      return;
    }
    setDocsLoading(true);
    listDocuments(selectedId)
      .then((res) => setDocuments(Array.isArray(res) ? res : res?.content ?? []))
      .catch(() => {})
      .finally(() => setDocsLoading(false));

    setAvisLoading(true);
    getAvis(selectedId)
      .then((res) => {
        if (res) {
          setAvis(res);
          setAvisForm({
            nomDefunt: res.nomDefunt || '',
            prenomDefunt: res.prenomDefunt || '',
            dateNaissance: res.dateNaissance ? res.dateNaissance.split('T')[0] : '',
            dateDeces: res.dateDeces ? res.dateDeces.split('T')[0] : '',
            lieuDeces: res.lieuDeces || '',
            pays: res.pays || '',
            photoUrl: res.photoUrl || '',
            contenuHtml: res.contenuHtml || '',
            estPublic: res.estPublic ?? false,
          });
        } else {
          setAvis(null);
        }
      })
      .catch(() => setAvis(null))
      .finally(() => setAvisLoading(false));
  }, [selectedId]);

  /* ── Stats ─────────────────────────── */
  const statsFetcher = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const firstOfYear = `${new Date().getFullYear()}-01-01`;
    return declarationsStats({ debut: firstOfYear, fin: today });
  }, []);

  const statsResource = useRealtimeResource('declarations-stats', statsFetcher, {
    enabled: true, immediate: true, interval: REALTIME_INTERVALS.declarations,
  });

  const stats = useMemo(() => normalizeStats(statsResource.data || {}), [statsResource.data]);

  /* ── List ───────────────────────────── */
  const listFetcher = useCallback(() => {
    const hasFilter = statutFilter || paysFilter || dateDebut || dateFin;
    if (hasFilter) {
      return declarationsSearch({
        statut: statutFilter || undefined,
        pays: paysFilter || undefined,
        debut: dateDebut || undefined,
        fin: dateFin || undefined,
        page, size: 10, sort: 'dateDeclaration,desc',
      });
    }
    return listDeclarations({ page, size: 10, sort: 'dateDeclaration,desc' });
  }, [page, statutFilter, paysFilter, dateDebut, dateFin]);

  const { data, loading, error, lastUpdated, refresh } = useRealtimeResource(
    `declarations-admin-${page}-${statutFilter}-${paysFilter}-${dateDebut}-${dateFin}`,
    listFetcher,
    { enabled: true, immediate: true, interval: REALTIME_INTERVALS.declarations },
  );

  const declarations = useMemo(() => normalizeList(data), [data]);
  const totalPages = data?.totalPages ?? 1;

  const filteredDeclarations = useMemo(() => {
    if (!search) return declarations;
    const q = search.toLowerCase();
    return declarations.filter((d) => {
      const nom = [d.utilisateur?.prenom, d.utilisateur?.nom].join(' ').toLowerCase();
      return nom.includes(q) || d.pays?.toLowerCase().includes(q) || d.lieuDeces?.toLowerCase().includes(q);
    });
  }, [declarations, search]);

  const selected = useMemo(() => filteredDeclarations.find((d) => d.id === selectedId) || null, [filteredDeclarations, selectedId]);

  /* ── Actions ────────────────────────── */
  const handleValidate = async (id) => {
    setActionLoading(true);
    setActionStatus(null);
    try {
      await validateDeclaration(id);
      setActionStatus({ type: 'success', message: 'Déclaration validée.' });
      await refresh();
    } catch (err) {
      setActionStatus({ type: 'error', message: err?.response?.data?.message || 'Impossible de valider.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selected?.id) return;
    setActionLoading(true);
    setActionStatus(null);
    try {
      await rejectDeclaration(selected.id, rejectMotif || 'Rejeté par l\'administration');
      setActionStatus({ type: 'success', message: 'Déclaration rejetée.' });
      setShowRejectForm(false);
      setRejectMotif('');
      await refresh();
    } catch (err) {
      setActionStatus({ type: 'error', message: err?.response?.data?.message || 'Impossible de rejeter.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer définitivement cette déclaration ?')) return;
    setActionLoading(true);
    try {
      await deleteDeclaration(id);
      setActionStatus({ type: 'success', message: 'Déclaration supprimée.' });
      if (selectedId === id) setSelectedId(null);
      await refresh();
    } catch (err) {
      setActionStatus({ type: 'error', message: err?.response?.data?.message || 'Impossible de supprimer.' });
    } finally {
      setActionLoading(false);
    }
  };

  const resetFilters = () => {
    setStatutFilter(''); setPaysFilter(''); setDateDebut(''); setDateFin(''); setSearch(''); setPage(0);
  };

  return (
    <div>
      <StatsRow />

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: stats.total, color: 'rgba(255,255,255,0.08)' },
          { label: 'Déclarées', value: stats.declares, color: 'rgba(245,124,0,0.12)' },
          { label: 'En cours', value: stats.enCours, color: 'rgba(21,101,192,0.12)' },
          { label: 'Traitées', value: stats.traites, color: 'rgba(46,125,50,0.12)' },
          { label: 'Rejetées', value: stats.rejetes, color: 'rgba(198,40,40,0.12)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: color, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{value}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-gray)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Main list card */}
      <div className="content-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h3 className="content-card-title" style={{ margin: 0 }}>
            <FaFileAlt size={14} style={{ marginRight: 8, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
            Gestion des déclarations de décès
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdated && <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>Mis à jour {new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
            <button className="btn-small" type="button" onClick={refresh} disabled={loading}>
              <FaSyncAlt size={11} style={{ marginRight: 4 }} />{loading ? 'Chargement…' : 'Actualiser'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: '1 1 200px', position: 'relative' }}>
            <FaSearch size={11} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-gray)' }} />
            <input className="form-input" style={{ paddingLeft: 28 }} placeholder="Rechercher nom, pays, lieu…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-input" style={{ flex: '0 0 160px' }} value={statutFilter}
            onChange={(e) => { setStatutFilter(e.target.value); setPage(0); }}>
            {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <input className="form-input" style={{ flex: '0 0 140px' }} placeholder="Pays…"
            value={paysFilter} onChange={(e) => { setPaysFilter(e.target.value); setPage(0); }} />
          <input className="form-input" type="date" style={{ flex: '0 0 140px' }}
            value={dateDebut} onChange={(e) => { setDateDebut(e.target.value); setPage(0); }} title="Date début" />
          <input className="form-input" type="date" style={{ flex: '0 0 140px' }}
            value={dateFin} onChange={(e) => { setDateFin(e.target.value); setPage(0); }} title="Date fin" />
          <button className="btn-small" type="button" onClick={resetFilters}>Réinitialiser</button>
        </div>

        {error && <div style={{ color: 'var(--red-primary)', marginBottom: 12, fontSize: 13 }}>Impossible de charger les déclarations.</div>}

        {filteredDeclarations.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-gray)' }}>Aucune déclaration trouvée.</div>
        )}

        {/* Table */}
        {filteredDeclarations.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'var(--text-gray)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px' }}>Défunt / Déclarant</th>
                  <th style={{ padding: '8px 6px' }}>Pays</th>
                  <th style={{ padding: '8px 6px' }}>Date décès</th>
                  <th style={{ padding: '8px 6px' }}>Lieu</th>
                  <th style={{ padding: '8px 6px' }}>Statut</th>
                  <th style={{ padding: '8px 6px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeclarations.map((d) => (
                  <tr key={d.id}
                    onClick={() => setSelectedId(d.id === selectedId ? null : d.id)}
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: d.id === selectedId ? 'rgba(255,255,255,0.04)' : 'transparent', cursor: 'pointer' }}>
                    <td style={{ padding: '10px 6px' }}>
                      <div style={{ fontWeight: 600 }}>{d.utilisateur ? `${d.utilisateur.prenom || ''} ${d.utilisateur.nom || ''}`.trim() || d.utilisateur.email : '—'}</div>
                      {d.declarant && <div style={{ fontSize: 11, color: 'var(--text-gray)' }}>Décl. : {d.declarant.prenom} {d.declarant.nom}</div>}
                    </td>
                    <td style={{ padding: '10px 6px' }}>{d.pays || '—'}</td>
                    <td style={{ padding: '10px 6px' }}>{formatDate(d.dateDeces)}</td>
                    <td style={{ padding: '10px 6px', fontSize: 12 }}>{d.lieuDeces || '—'}</td>
                    <td style={{ padding: '10px 6px' }}>
                      <span style={{ background: statusColor(d.statut), color: 'white', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                        {STATUT_LABELS[d.statut] || d.statut}
                      </span>
                    </td>
                    <td style={{ padding: '10px 6px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {d.statut !== 'TRAITE' && d.statut !== 'CLOTURE' && d.statut !== 'REJETE' && (
                          <button className="btn-small" type="button"
                            style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 }}
                            onClick={(e) => { e.stopPropagation(); handleValidate(d.id); }}
                            disabled={actionLoading}>
                            <FaCheckCircle size={10} /> Valider
                          </button>
                        )}
                        <button className="btn-small" type="button"
                          style={{ borderColor: 'rgba(198,40,40,0.4)', color: '#c62828', fontSize: 11 }}
                          onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                          disabled={actionLoading}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 12 }}>
            <button className="btn-small" type="button" onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}>Précédent</button>
            <span>Page {page + 1} / {totalPages}</span>
            <button className="btn-small" type="button" onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))} disabled={page + 1 >= totalPages}>Suivant</button>
          </div>
        )}
      </div>

      {/* Detail + actions panel */}
      {selected && (
        <>
        <div className="content-grid" style={{ display: 'grid', gap: 20, marginTop: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {/* Detail */}
          <div className="content-card">
            <h3 className="content-card-title" style={{ marginBottom: 14 }}>
              <FaFileAlt size={13} style={{ marginRight: 8, color: 'var(--red-primary)' }} />
              Détail de la déclaration
            </h3>
            <div style={{ fontSize: 13, display: 'grid', gap: 10 }}>
              <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-gray)', fontSize: 11 }}>Pays</p>
                  <strong>{selected.pays || '—'}</strong>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-gray)', fontSize: 11 }}>Date décès</p>
                  <strong>{formatDate(selected.dateDeces)}</strong>
                </div>
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--text-gray)', fontSize: 11 }}>Lieu du décès</p>
                <strong>{selected.lieuDeces || '—'}</strong>
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--text-gray)', fontSize: 11 }}>Cause</p>
                <p style={{ margin: 0 }}>{selected.causeDeces || '—'}</p>
              </div>
              {selected.utilisateur && (
                <div>
                  <p style={{ margin: 0, color: 'var(--text-gray)', fontSize: 11 }}>Membre concerné</p>
                  <strong>{[selected.utilisateur.prenom, selected.utilisateur.nom].filter(Boolean).join(' ') || selected.utilisateur.email}</strong>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-gray)' }}>{selected.utilisateur.email}</p>
                </div>
              )}
              {selected.declarant && (
                <div>
                  <p style={{ margin: 0, color: 'var(--text-gray)', fontSize: 11 }}>Déclarant</p>
                  <strong>{selected.declarant.prenom} {selected.declarant.nom}</strong>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-gray)' }}>
                    {selected.declarant.telephone} {selected.declarant.email ? `· ${selected.declarant.email}` : ''}
                    {selected.declarant.lienAvecAssocie ? ` · ${selected.declarant.lienAvecAssocie}` : ''}
                  </p>
                </div>
              )}
              <div>
                <p style={{ margin: 0, color: 'var(--text-gray)', fontSize: 11 }}>Date de déclaration</p>
                <strong>{formatDate(selected.dateDeclaration)}</strong>
              </div>
              {selected.documents?.length > 0 && (
                <div>
                  <p style={{ margin: 0, color: 'var(--text-gray)', fontSize: 11 }}>Documents ({selected.documents.length})</p>
                  {selected.documents.map((doc) => (
                    <div key={doc.id} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <FaFileAlt size={10} color="var(--red-primary)" />
                      {doc.urlDocument
                        ? <a href={doc.urlDocument} target="_blank" rel="noreferrer" style={{ color: 'var(--red-primary)' }}>{doc.nomFichier || doc.type}</a>
                        : <span>{doc.nomFichier || doc.type}</span>}
                      {doc.tailleKb ? <span style={{ color: 'var(--text-gray)', fontSize: 10 }}>({doc.tailleKb} Ko)</span> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="content-card">
            <h3 className="content-card-title" style={{ marginBottom: 14 }}>Actions administratives</h3>

            {actionStatus && (
              <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, fontSize: 13,
                background: actionStatus.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
                color: actionStatus.type === 'success' ? '#2e7d32' : '#c62828' }}>
                {actionStatus.message}
              </div>
            )}

            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-gray)' }}>Statut actuel</p>
                <span style={{ background: statusColor(selected.statut), color: 'white', borderRadius: 999, padding: '5px 14px', fontSize: 12, fontWeight: 600 }}>
                  {STATUT_LABELS[selected.statut] || selected.statut}
                </span>
              </div>

              {selected.statut !== 'TRAITE' && selected.statut !== 'CLOTURE' && selected.statut !== 'REJETE' && (
                <button className="btn-add" type="button"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onClick={() => handleValidate(selected.id)} disabled={actionLoading}>
                  <FaCheckCircle size={13} /> Valider la déclaration
                </button>
              )}

              {selected.statut !== 'REJETE' && selected.statut !== 'TRAITE' && selected.statut !== 'CLOTURE' && (
                !showRejectForm ? (
                  <button className="btn-small" type="button"
                    style={{ borderColor: 'rgba(198,40,40,0.4)', color: '#c62828', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => setShowRejectForm(true)} disabled={actionLoading}>
                    <FaTimesCircle size={12} /> Rejeter la déclaration
                  </button>
                ) : (
                  <div>
                    <textarea className="form-input" rows={3} placeholder="Motif du rejet…"
                      value={rejectMotif} onChange={(e) => setRejectMotif(e.target.value)} style={{ resize: 'vertical', marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-small" type="button"
                        style={{ borderColor: 'rgba(198,40,40,0.4)', color: '#c62828' }}
                        onClick={handleReject} disabled={actionLoading}>
                        Confirmer le rejet
                      </button>
                      <button className="btn-small" type="button" onClick={() => { setShowRejectForm(false); setRejectMotif(''); }}>
                        Annuler
                      </button>
                    </div>
                  </div>
                )
              )}

              {selected.dossierRapatriement && (
                <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, fontSize: 12 }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 600 }}>Dossier rapatriement</p>
                  <p style={{ margin: 0, color: 'var(--text-gray)' }}>
                    Statut : <strong>{selected.dossierRapatriement.statut}</strong>
                  </p>
                  {selected.dossierRapatriement.villeDepart && (
                    <p style={{ margin: '4px 0 0', color: 'var(--text-gray)' }}>
                      {selected.dossierRapatriement.villeDepart} → {selected.dossierRapatriement.villeArrivee}
                    </p>
                  )}
                  <p style={{ margin: '4px 0 0', color: 'var(--text-gray)' }}>
                    Total payé : <strong>{selected.dossierRapatriement.totalPaiements ?? 0} $</strong>
                    {' · '}Restant : <strong>{selected.dossierRapatriement.montantRestant ?? 0} $</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Panel Documents ── */}
        <div className="content-card" style={{ marginTop: 20 }}>
          <h3 className="content-card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaFileAlt size={14} color="var(--red-primary)" />
            Documents de la déclaration
          </h3>

          {/* Liste documents existants */}
          {docsLoading && <div style={{ fontSize: 13, color: 'var(--text-gray)' }}>Chargement…</div>}
          {documents.length === 0 && !docsLoading && (
            <p style={{ fontSize: 13, color: 'var(--text-gray)', marginBottom: 12 }}>Aucun document attaché.</p>
          )}
          {documents.map((doc) => (
            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
              <FaFilePdf size={13} color="var(--red-primary)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{doc.nomFichier || doc.type}</p>
                {doc.description && <p style={{ margin: 0, fontSize: 11, color: 'var(--text-gray)' }}>{doc.description}</p>}
              </div>
              {doc.urlDocument && (
                <a href={doc.urlDocument} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: 'var(--red-primary)', textDecoration: 'none' }}>
                  <FaEye size={13} />
                </a>
              )}
              <button onClick={async () => {
                if (!window.confirm('Supprimer ce document ?')) return;
                await deleteDocument(selected.id, doc.id);
                setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
              }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c62828', padding: 4 }}>
                <FaTrash size={12} />
              </button>
            </div>
          ))}

          {/* Formulaire ajout document */}
          <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Ajouter un document</p>
            <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <p className="settings-label">Type</p>
                <select className="form-input" value={docForm.type}
                  onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}>
                  <option value="CERTIFICAT_DECES">Certificat de décès</option>
                  <option value="ACTE_DECES">Acte de décès</option>
                  <option value="PIECE_IDENTITE">Pièce d'identité</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>
              <div>
                <p className="settings-label">Nom du fichier</p>
                <input className="form-input" value={docForm.nomFichier}
                  onChange={(e) => setDocForm({ ...docForm, nomFichier: e.target.value })}
                  placeholder="cert.pdf" />
              </div>
            </div>
            <div>
              <p className="settings-label">URL du document</p>
              <input className="form-input" value={docForm.urlDocument}
                onChange={(e) => setDocForm({ ...docForm, urlDocument: e.target.value })}
                placeholder="https://..." />
            </div>
            <div>
              <p className="settings-label">Description</p>
              <input className="form-input" value={docForm.description}
                onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                placeholder="Description (optionnel)" />
            </div>
            {docStatus && (
              <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13,
                background: docStatus.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
                color: docStatus.type === 'success' ? '#2e7d32' : '#c62828' }}>
                {docStatus.message}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-add" style={{ flex: 1 }}
                disabled={!docForm.urlDocument || !docForm.nomFichier}
                onClick={async () => {
                  try {
                    setDocStatus(null);
                    const doc = await addDocument(selected.id, docForm);
                    setDocuments((prev) => [...prev, doc]);
                    setDocForm({ type: 'CERTIFICAT_DECES', nomFichier: '', urlDocument: '', description: '' });
                    setDocStatus({ type: 'success', message: 'Document ajouté.' });
                  } catch (err) {
                    setDocStatus({ type: 'error', message: err?.response?.data?.message || 'Erreur.' });
                  }
                }}>
                Ajouter le document
              </button>
              <button className="btn-small" title="Demander des compléments"
                onClick={async () => {
                  if (!complementMsg.trim()) return;
                  try {
                    await demanderComplements(selected.id, complementMsg);
                    setDocStatus({ type: 'success', message: 'Demande de compléments envoyée.' });
                    setComplementMsg('');
                  } catch (err) {
                    setDocStatus({ type: 'error', message: err?.response?.data?.message || 'Erreur.' });
                  }
                }}>
                <FaQuestionCircle size={12} style={{ marginRight: 4 }} />
                Compléments
              </button>
              <button className="btn-small" title="Soumettre la déclaration"
                onClick={async () => {
                  try {
                    await soumettre(selected.id);
                    setDocStatus({ type: 'success', message: 'Déclaration soumise.' });
                  } catch (err) {
                    setDocStatus({ type: 'error', message: err?.response?.data?.message || 'Erreur.' });
                  }
                }}>
                <FaPaperPlane size={12} style={{ marginRight: 4 }} />
                Soumettre
              </button>
            </div>
            {/* Champ message compléments */}
            <input className="form-input" value={complementMsg}
              onChange={(e) => setComplementMsg(e.target.value)}
              placeholder="Message pour demander des compléments…" />
          </div>
        </div>

        {/* ── Panel Avis de Décès ── */}
        <div className="content-card" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h3 className="content-card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaNewspaper size={14} color="var(--red-primary)" />
              Avis de décès
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {avis && (
                <>
                  <button className="btn-small" onClick={async () => {
                    try {
                      const blob = await getAvisPdf(selected.id);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `avis-deces-${selected.id}.pdf`; a.click();
                      URL.revokeObjectURL(url);
                    } catch {
                      setAvisStatus({ type: 'error', message: 'Impossible de télécharger le PDF.' });
                    }
                  }}>
                    <FaFilePdf size={11} style={{ marginRight: 4 }} />
                    PDF
                  </button>
                  {avis.estPublic ? (
                    <button className="btn-small" onClick={async () => {
                      try {
                        const updated = await depublierAvis(selected.id);
                        setAvis(updated || { ...avis, estPublic: false });
                        setAvisStatus({ type: 'success', message: 'Avis dépublié.' });
                      } catch (err) {
                        setAvisStatus({ type: 'error', message: err?.response?.data?.message || 'Erreur.' });
                      }
                    }}>
                      <FaEyeSlash size={11} style={{ marginRight: 4 }} />
                      Dépublier
                    </button>
                  ) : (
                    <button className="btn-add" style={{ padding: '7px 14px', fontSize: 12 }}
                      onClick={async () => {
                        try {
                          const updated = await publierAvis(selected.id);
                          setAvis(updated || { ...avis, estPublic: true });
                          setAvisStatus({ type: 'success', message: 'Avis publié.' });
                        } catch (err) {
                          setAvisStatus({ type: 'error', message: err?.response?.data?.message || 'Erreur.' });
                        }
                      }}>
                      <FaGlobe size={11} style={{ marginRight: 4 }} />
                      Publier
                    </button>
                  )}
                  <button className="btn-small" onClick={async () => {
                    if (!window.confirm('Supprimer cet avis de décès ?')) return;
                    try {
                      await deleteAvis(selected.id);
                      setAvis(null);
                      setShowAvisForm(false);
                      setAvisStatus({ type: 'success', message: 'Avis supprimé.' });
                    } catch (err) {
                      setAvisStatus({ type: 'error', message: err?.response?.data?.message || 'Erreur.' });
                    }
                  }}>
                    <FaTrash size={11} />
                  </button>
                </>
              )}
              <button className="btn-small" onClick={() => setShowAvisForm((v) => !v)}>
                {showAvisForm ? 'Fermer' : avis ? 'Modifier' : 'Créer un avis'}
              </button>
            </div>
          </div>

          {avisLoading && <div style={{ fontSize: 13, color: 'var(--text-gray)' }}>Chargement…</div>}

          {avis && !showAvisForm && (
            <div style={{ fontSize: 13, display: 'grid', gap: 8 }}>
              <p style={{ margin: 0 }}>
                <strong>{avis.prenomDefunt} {avis.nomDefunt}</strong>
                {' · '}né(e) {formatDate(avis.dateNaissance)}
                {' · '}décédé(e) {formatDate(avis.dateDeces)}
              </p>
              <p style={{ margin: 0, color: 'var(--text-gray)' }}>{avis.lieuDeces}{avis.pays ? `, ${avis.pays}` : ''}</p>
              {avis.creeParNom && (
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-gray)' }}>Créé par : {avis.creeParNom}</p>
              )}
              {avis.estPublic ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#2e7d32', fontWeight: 700 }}>
                    <FaGlobe size={10} /> Publié
                  </span>
                  {avis.lienPartage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                      <a href={avis.lienPartage} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, color: 'var(--red-primary)', wordBreak: 'break-all' }}>
                        {avis.lienPartage}
                      </a>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-gray)', padding: 2, flexShrink: 0 }}
                        title="Copier le lien"
                        onClick={() => {
                          navigator.clipboard.writeText(avis.lienPartage);
                          setAvisStatus({ type: 'success', message: 'Lien copié !' });
                          setTimeout(() => setAvisStatus(null), 2000);
                        }}>
                        <FaEye size={11} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text-gray)' }}>Non publié — le lien de partage sera disponible après publication.</span>
              )}
              {avis.contenuHtml && (
                <div style={{ marginTop: 8, padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 13, border: '1px solid rgba(255,255,255,0.08)' }}
                  dangerouslySetInnerHTML={{ __html: avis.contenuHtml }} />
              )}
            </div>
          )}

          {avisStatus && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, fontSize: 13,
              background: avisStatus.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
              color: avisStatus.type === 'success' ? '#2e7d32' : '#c62828' }}>
              {avisStatus.message}
            </div>
          )}

          {showAvisForm && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <p className="settings-label">Prénom du défunt</p>
                  <input className="form-input" value={avisForm.prenomDefunt}
                    onChange={(e) => setAvisForm({ ...avisForm, prenomDefunt: e.target.value })} />
                </div>
                <div>
                  <p className="settings-label">Nom du défunt</p>
                  <input className="form-input" value={avisForm.nomDefunt}
                    onChange={(e) => setAvisForm({ ...avisForm, nomDefunt: e.target.value })} />
                </div>
                <div>
                  <p className="settings-label">Date de naissance</p>
                  <input className="form-input" type="date" value={avisForm.dateNaissance}
                    onChange={(e) => setAvisForm({ ...avisForm, dateNaissance: e.target.value })} />
                </div>
                <div>
                  <p className="settings-label">Date de décès</p>
                  <input className="form-input" type="date" value={avisForm.dateDeces}
                    onChange={(e) => setAvisForm({ ...avisForm, dateDeces: e.target.value })} />
                </div>
                <div>
                  <p className="settings-label">Lieu de décès</p>
                  <input className="form-input" value={avisForm.lieuDeces}
                    onChange={(e) => setAvisForm({ ...avisForm, lieuDeces: e.target.value })} />
                </div>
                <div>
                  <p className="settings-label">Pays</p>
                  <input className="form-input" value={avisForm.pays}
                    onChange={(e) => setAvisForm({ ...avisForm, pays: e.target.value })} />
                </div>
              </div>
              <div>
                <p className="settings-label">URL photo du défunt</p>
                <input className="form-input" value={avisForm.photoUrl}
                  onChange={(e) => setAvisForm({ ...avisForm, photoUrl: e.target.value })}
                  placeholder="https://..." />
              </div>
              <div>
                <p className="settings-label">Contenu HTML de l'avis</p>
                <textarea
                  className="form-input"
                  rows={8}
                  placeholder="<p>Contenu de l'avis de décès...</p>"
                  value={avisForm.contenuHtml}
                  onChange={(e) => setAvisForm({ ...avisForm, contenuHtml: e.target.value })}
                  style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={avisForm.estPublic}
                  onChange={(e) => setAvisForm({ ...avisForm, estPublic: e.target.checked })} />
                Publier immédiatement
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-add" style={{ flex: 1 }}
                  onClick={async () => {
                    setAvisStatus(null);
                    try {
                      const saved = avis
                        ? await updateAvis(selected.id, adminId, avisForm)
                        : await createAvis(selected.id, adminId, avisForm);
                      setAvis(saved);
                      setShowAvisForm(false);
                      setAvisStatus({ type: 'success', message: avis ? 'Avis mis à jour.' : 'Avis créé.' });
                    } catch (err) {
                      setAvisStatus({ type: 'error', message: err?.response?.data?.message || 'Erreur.' });
                    }
                  }}>
                  {avis ? 'Mettre à jour' : 'Créer l\'avis'}
                </button>
                <button className="btn-small" onClick={() => setShowAvisForm(false)}>Annuler</button>
              </div>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
