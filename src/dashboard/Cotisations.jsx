import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FaFileInvoiceDollar, FaCheckCircle, FaTimes,
  FaSearch, FaMoneyBillWave, FaChartBar, FaUsers, FaWallet,
} from 'react-icons/fa';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import {
  mesCotisations, mesCotisationsTotal,
  payerCotisation, allCotisations, cotisationsStats,
} from '../services/cotisations';

/* ─── helpers ─────────────────────────────────────────────────── */

const formatAmount = (value) => {
  const n = Number(value) || 0;
  return `${n.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('fr-CA');
};

const normalizeList = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

const extractNum = (obj, ...keys) => {
  if (!obj) return 0;
  if (typeof obj === 'number') return obj;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) {
      const v = Number(obj[k]);
      if (Number.isFinite(v)) return v;
    }
  }
  const first = Object.values(obj).find((v) => typeof v === 'number' && Number.isFinite(v));
  return first ?? 0;
};

const TYPES = [
  { value: 'COTISATION_MENSUELLE', label: 'Cotisation mensuelle' },
  { value: 'COTISATION_ANNUELLE',  label: 'Cotisation annuelle' },
  { value: 'FRAIS_ENTRETIEN',      label: 'Frais d\'entretien' },
  { value: 'COTISATION_UNIQUE',    label: 'Cotisation ponctuelle' },
];

const STATUTS = [
  { value: 'COMPLETE',   label: 'Complétée' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'ECHOUE',     label: 'Échouée' },
  { value: 'ANNULE',     label: 'Annulée' },
];

/* ─── badge statut/type ───────────────────────────────────────── */

function Badge({ label, couleur, fallbackColor }) {
  const color = couleur || fallbackColor || '#607d8b';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: `${color}18`, color, border: `1px solid ${color}40`,
    }}>
      {label || '—'}
    </span>
  );
}

/* ─── ligne cotisation ────────────────────────────────────────── */

function CotisationRow({ c, showUser }) {
  const statutColor = c.statut === 'COMPLETE' ? '#2e7d32' : c.statut === 'ECHOUE' ? '#c62828' : '#f57c00';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #f5f5f5', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {showUser && (
          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600 }}>
            {c.utilisateurNom || c.utilisateurEmail || '—'}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
          <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>{formatDate(c.datePaiement || c.dateCreation)}</span>
          <Badge label={c.statutLibelle || c.statut} couleur={c.typeCouleur} fallbackColor={statutColor} />
          <Badge label={c.typeLibelle || c.type} couleur={c.typeCouleur} fallbackColor="#1565c0" />
          {c.periodeCoverte && (
            <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, background: 'rgba(21,101,192,0.08)', color: '#1565c0', fontWeight: 600 }}>
              {c.periodeCoverte}
            </span>
          )}
        </div>
        {c.notes && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-gray)', fontStyle: 'italic' }}>« {c.notes} »</p>
        )}
        {c.referenceTransaction && (
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-gray)' }}>Réf : {c.referenceTransaction}</p>
        )}
      </div>
      <span style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', color: '#1565c0' }}>
        {formatAmount(c.montant)}
      </span>
    </div>
  );
}

/* ─── modal confirmation ──────────────────────────────────────── */

function CotisationModal({ form, balance, onConfirm, onClose }) {
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);
  const typeLabel = TYPES.find((t) => t.value === form.type)?.label || form.type;

  const handleConfirm = async () => {
    setProcessing(true);
    setErrorMsg('');
    try {
      await onConfirm();
      setDone(true);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Paiement impossible.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: '32px 28px', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
          <FaTimes size={18} />
        </button>

        {done ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <FaCheckCircle size={56} color="#1565c0" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1565c0', marginBottom: 8 }}>Paiement effectué !</h3>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>
              {formatAmount(form.montant)} ont été débités de votre portefeuille.
            </p>
            <button onClick={onClose} className="btn-add" style={{ padding: '12px 32px' }}>Fermer</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#1565c0,#1976d2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaFileInvoiceDollar size={22} color="white" />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 17, color: '#2C2C2C', margin: 0 }}>Confirmer le paiement</p>
                <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Débit depuis votre portefeuille RSC</p>
              </div>
            </div>

            <div style={{ background: '#f0f4ff', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              {[
                { l: 'Type', v: typeLabel },
                { l: 'Montant', v: formatAmount(form.montant), bold: true },
                { l: 'Solde actuel', v: formatAmount(balance) },
                { l: 'Solde après paiement', v: formatAmount(Number(balance) - Number(form.montant)), color: (Number(balance) - Number(form.montant)) < 0 ? '#c62828' : '#2e7d32' },
                ...(form.periodeCoverte ? [{ l: 'Période', v: form.periodeCoverte }] : []),
              ].map(({ l, v, bold, color }) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-gray)' }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: bold ? 800 : 600, color: color || 'var(--text-dark)' }}>{v}</span>
                </div>
              ))}
              {form.notes && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-gray)', fontStyle: 'italic' }}>« {form.notes} »</p>
              )}
            </div>

            {errorMsg && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(198,40,40,0.08)', border: '1px solid rgba(198,40,40,0.2)', fontSize: 13, color: '#c62828', marginBottom: 14 }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button onClick={onClose} style={{ padding: 13, borderRadius: 8, border: '2px solid #dde3ea', background: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Annuler
              </button>
              <button onClick={handleConfirm} disabled={processing} className="btn-add" style={{ padding: 13, opacity: processing ? 0.5 : 1 }}>
                {processing ? 'Traitement…' : 'Confirmer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── vue admin ───────────────────────────────────────────────── */

function AdminCotisationsView() {
  const [stats, setStats]           = useState(null);
  const [cotisations, setCotisations] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [statutFilter, setStatutFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    cotisationsStats().then(setStats).catch(() => setStats(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    allCotisations({ statut: statutFilter || undefined, type: typeFilter || undefined, page, size: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setCotisations(normalizeList(data));
        setTotalPages(data?.totalPages ?? 1);
      })
      .catch((err) => { if (!cancelled) setError(err?.response?.data?.message || err?.message || 'Erreur de chargement.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [statutFilter, typeFilter, page]);

  const filtered = useMemo(() => {
    if (!search) return cotisations;
    const s = search.toLowerCase();
    return cotisations.filter((c) =>
      `${c.utilisateurNom || ''} ${c.utilisateurEmail || ''} ${c.type || ''} ${c.referenceTransaction || ''}`.toLowerCase().includes(s)
    );
  }, [cotisations, search]);

  const totalCotisations = extractNum(stats, 'totalCotisations', 'total');
  const nombreCotisations = extractNum(stats, 'nombreCotisations', 'nombre', 'count');
  const cotisants = extractNum(stats, 'cotisants', 'utilisateurs', 'membres');
  const moyenneCotisation = extractNum(stats, 'moyenneCotisation', 'moyenne');

  return (
    <div>
      <StatsRow />

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { icon: <FaMoneyBillWave size={18} color="white" />, label: 'Total cotisations', value: formatAmount(totalCotisations), bg: 'linear-gradient(135deg,#1565c0,#1976d2)' },
            { icon: <FaChartBar size={18} color="white" />,      label: 'Nombre de paiements', value: nombreCotisations, bg: 'linear-gradient(135deg,#2e7d32,#43a047)' },
            { icon: <FaUsers size={18} color="white" />,         label: 'Cotisants', value: cotisants, bg: 'linear-gradient(135deg,#6a1b9a,#8e24aa)' },
            { icon: <FaWallet size={18} color="white" />,        label: 'Paiement moyen', value: formatAmount(moyenneCotisation), bg: 'linear-gradient(135deg,#e65100,#f57c00)' },
          ].map(({ icon, label, value, bg }) => (
            <div key={label} style={{ background: bg, borderRadius: 12, padding: '16px 20px', color: 'white', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 10, flexShrink: 0 }}>{icon}</div>
              <div>
                <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>{label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800 }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="content-card">
        <h3 className="content-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <FaFileInvoiceDollar size={16} color="var(--red-primary)" />
          Toutes les cotisations
        </h3>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <FaSearch size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-gray)' }} />
            <input className="form-input" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
          </div>
          <select className="form-input" value={statutFilter} onChange={(e) => { setStatutFilter(e.target.value); setPage(0); }} style={{ flex: '0 0 160px' }}>
            <option value="">Tous les statuts</option>
            {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="form-input" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }} style={{ flex: '0 0 200px' }}>
            <option value="">Tous les types</option>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {(search || statutFilter || typeFilter) && (
            <button onClick={() => { setSearch(''); setStatutFilter(''); setTypeFilter(''); setPage(0); }} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <FaTimes size={11} /> Réinitialiser
            </button>
          )}
        </div>

        {error && <div style={{ color: '#c62828', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {loading && <div style={{ color: 'var(--text-gray)', fontSize: 13, marginBottom: 12 }}>Chargement…</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-gray)' }}>Aucune cotisation trouvée.</div>
        )}

        {filtered.map((c) => <CotisationRow key={c.id} c={c} showUser />)}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button className="btn-small" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>Précédent</button>
            <span style={{ fontSize: 13, color: 'var(--text-gray)' }}>Page {page + 1} / {totalPages}</span>
            <button className="btn-small" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || loading}>Suivant</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── vue utilisateur ─────────────────────────────────────────── */

const DEFAULT_FORM = { type: 'COTISATION_MENSUELLE', montant: '', periodeCoverte: '', notes: '' };

function UserCotisationsView() {
  const { user, balance, refreshBalance, addToBalance } = useAuth();
  const [form, setForm] = useState(DEFAULT_FORM);
  // snapshot capture les valeurs au moment de l'ouverture de la modal — évite
  // que setForm(DEFAULT_FORM) dans handleConfirm démonte la modal prématurément
  const [snapshot, setSnapshot] = useState(null); // null = modal fermée, objet = modal ouverte
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [cotisations, setCotisations] = useState([]);
  const [total, setTotal] = useState(null);
  const [histLoading, setHistLoading] = useState(true);
  const [histPage, setHistPage] = useState(0);
  const [histTotalPages, setHistTotalPages] = useState(1);

  const loadHistory = useCallback(() => {
    setHistLoading(true);
    Promise.allSettled([
      mesCotisations({ page: histPage, size: 10, sort: 'datePaiement,desc' }),
      mesCotisationsTotal(),
    ]).then(([listRes, totalRes]) => {
      if (listRes.status === 'fulfilled') {
        setCotisations(normalizeList(listRes.value));
        setHistTotalPages(listRes.value?.totalPages ?? 1);
      }
      if (totalRes.status === 'fulfilled') setTotal(totalRes.value);
    }).finally(() => setHistLoading(false));
  }, [histPage]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleOpenModal = async () => {
    if (!form.montant || Number(form.montant) <= 0) return;
    setBalanceLoading(true);
    await refreshBalance();
    setBalanceLoading(false);
    // Capturer les valeurs du formulaire — le form peut être réinitialisé sans fermer la modal
    setSnapshot({ ...form, montant: Number(form.montant) });
  };

  const handleCloseModal = () => {
    setSnapshot(null);
    setForm(DEFAULT_FORM);
  };

  const handleConfirm = async () => {
    const paid = snapshot?.montant || Number(form.montant);
    const receipt = await payerCotisation({
      montant: paid,
      type: snapshot?.type || form.type,
      periodeCoverte: snapshot?.periodeCoverte || form.periodeCoverte || undefined,
      notes: snapshot?.notes || form.notes || undefined,
    });
    // Débit immédiat du solde affiché (mise à jour optimiste)
    addToBalance(-paid);
    window.dispatchEvent(new CustomEvent('rsc:stats-refresh'));
    loadHistory();
    setFeedback({
      type: 'success',
      message: `Paiement de ${formatAmount(paid)} débité de votre portefeuille${receipt?.referenceTransaction ? ` (réf : ${receipt.referenceTransaction})` : ''}.`,
    });
    return receipt;
  };

  const totalMontant = extractNum(total, 'totalCotisations', 'total', 'montant');
  const totalNombre = extractNum(total, 'nombreCotisations', 'nombre', 'count');

  // Afficher le champ période seulement pour les types périodiques
  const showPeriode = ['COTISATION_MENSUELLE', 'COTISATION_ANNUELLE'].includes(form.type);
  const periodePlaceholder = form.type === 'COTISATION_MENSUELLE' ? 'ex. 2026-03' : 'ex. 2026';

  return (
    <div>
      <StatsRow />

      {snapshot && (
        <CotisationModal
          form={snapshot}
          balance={balance}
          onConfirm={handleConfirm}
          onClose={handleCloseModal}
        />
      )}

      {total && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total cotisé', value: formatAmount(totalMontant), color: '#1565c0' },
            { label: 'Nombre de paiements', value: totalNombre, color: '#2e7d32' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, padding: '14px 18px' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-gray)' }}>{label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="content-card" style={{ marginBottom: 20 }}>
        {feedback && (
          <div style={{
            background: feedback.type === 'success' ? 'rgba(46,125,50,0.1)' : 'rgba(198,40,40,0.1)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(46,125,50,0.3)' : 'rgba(198,40,40,0.3)'}`,
            color: feedback.type === 'success' ? '#2e7d32' : '#c62828',
            padding: '10px 12px', borderRadius: 8, marginBottom: 16, fontSize: 13,
          }}>
            {feedback.message}
          </div>
        )}

        <h3 className="content-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <FaFileInvoiceDollar size={16} color="var(--red-primary)" />
          Payer une cotisation
        </h3>

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: 6 }}>Type de cotisation</label>
            <select className="form-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: 6 }}>Montant ($)</label>
            <input
              className="donation-input"
              type="number"
              min="1"
              placeholder="Montant en $"
              value={form.montant}
              onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
            />
          </div>

          {showPeriode && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: 6 }}>
                Période couverte <span style={{ fontWeight: 400, color: 'var(--text-gray)' }}>(recommandé)</span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder={periodePlaceholder}
                value={form.periodeCoverte}
                onChange={(e) => setForm((f) => ({ ...f, periodeCoverte: e.target.value }))}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: 6 }}>Notes <span style={{ fontWeight: 400, color: 'var(--text-gray)' }}>(optionnel)</span></label>
            <input
              className="form-input"
              type="text"
              placeholder="Informations complémentaires…"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <button
          className="btn-donate"
          onClick={handleOpenModal}
          disabled={!form.montant || Number(form.montant) <= 0 || balanceLoading}
          style={{ marginTop: 16, opacity: form.montant && Number(form.montant) > 0 && !balanceLoading ? 1 : 0.5 }}
        >
          <FaFileInvoiceDollar size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          {balanceLoading ? 'Vérification du solde…' : 'Payer depuis mon portefeuille'}
        </button>
      </div>

      <div className="content-card">
        <h3 className="content-card-title" style={{ marginBottom: 12 }}>Historique de mes cotisations</h3>

        {histLoading && cotisations.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-gray)' }}>Chargement…</div>}
        {!histLoading && cotisations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--text-gray)' }}>Aucune cotisation pour l'instant.</div>
        )}

        {cotisations.map((c) => <CotisationRow key={c.id} c={c} showUser={false} />)}

        {histTotalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16, alignItems: 'center' }}>
            <button className="btn-small" onClick={() => setHistPage((p) => Math.max(0, p - 1))} disabled={histPage === 0}>Précédent</button>
            <span style={{ fontSize: 13, color: 'var(--text-gray)' }}>{histPage + 1} / {histTotalPages}</span>
            <button className="btn-small" onClick={() => setHistPage((p) => Math.min(histTotalPages - 1, p + 1))} disabled={histPage >= histTotalPages - 1}>Suivant</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── composant principal ─────────────────────────────────────── */

function Cotisations() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(['SUPER_ADMIN', 'ADMIN_FINANCIER']);
  return isAdmin ? <AdminCotisationsView /> : <UserCotisationsView />;
}

export default Cotisations;
