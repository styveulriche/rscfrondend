import { useState, useEffect, useMemo } from 'react';
import {
  FaHandHoldingHeart, FaCheckCircle, FaTimes,
  FaSearch, FaMoneyBillWave, FaUsers, FaChartBar, FaWallet,
} from 'react-icons/fa';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import { useDonationFlow } from '../hooks/useDonationFlow';
import { useFinancesBoard } from '../hooks/useFinancesBoard';
import { listAllDons, donsStats, listMesDons, mesDonsTotal } from '../services/dons';

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

/* ─── badge statut ────────────────────────────────────────────── */

function StatutBadge({ statut, statutLibelle, statutCouleur }) {
  const label = statutLibelle || statut || '—';
  const color = statutCouleur || (statut === 'COMPLETE' ? '#2e7d32' : statut === 'ECHOUE' ? '#c62828' : '#f57c00');
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: `${color}18`, color, border: `1px solid ${color}40`,
    }}>
      {label}
    </span>
  );
}

/* ─── ligne don ───────────────────────────────────────────────── */

function DonRow({ don, showUser }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #f5f5f5', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {showUser && (
          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600 }}>
            {don.utilisateurNom || don.utilisateurEmail || '—'}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
          <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>{formatDate(don.dateDon || don.dateCreation)}</span>
          <StatutBadge statut={don.statut} statutLibelle={don.statutLibelle} statutCouleur={don.statutCouleur} />
          {don.campagne && (
            <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, background: 'rgba(139,28,28,0.08)', color: 'var(--red-primary)', fontWeight: 600 }}>
              {don.campagne}
            </span>
          )}
        </div>
        {don.message && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-gray)', fontStyle: 'italic' }}>« {don.message} »</p>
        )}
        {don.referenceTransaction && (
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-gray)' }}>Réf : {don.referenceTransaction}</p>
        )}
      </div>
      <span style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', color: '#2e7d32' }}>
        {formatAmount(don.montant)}
      </span>
    </div>
  );
}

/* ─── vue admin ───────────────────────────────────────────────── */

function AdminDonationView() {
  const [stats, setStats] = useState(null);
  const [dons, setDons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statutFilter, setStatutFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    donsStats().then(setStats).catch(() => setStats(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listAllDons({ statut: statutFilter || undefined, page, size: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setDons(normalizeList(data));
        setTotalPages(data?.totalPages ?? 1);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message || err?.message || 'Erreur de chargement.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [statutFilter, page]);

  const filtered = useMemo(() => {
    if (!search) return dons;
    const s = search.toLowerCase();
    return dons.filter((d) =>
      `${d.utilisateurNom || ''} ${d.utilisateurEmail || ''} ${d.campagne || ''} ${d.referenceTransaction || ''}`.toLowerCase().includes(s)
    );
  }, [dons, search]);

  const totalDons = stats?.totalDons ?? stats?.total ?? null;
  const nombreDons = stats?.nombreDons ?? stats?.count ?? null;
  const donateurs = stats?.donateurs ?? null;
  const moyenneDon = stats?.moyenneDon ?? null;

  return (
    <div>
      <StatsRow />

      {/* ── stats ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { icon: <FaMoneyBillWave size={18} color="white" />, label: 'Total des dons', value: totalDons !== null ? formatAmount(totalDons) : '—', bg: 'linear-gradient(135deg,#2e7d32,#43a047)' },
            { icon: <FaChartBar size={18} color="white" />, label: 'Nombre de dons', value: nombreDons ?? '—', bg: 'linear-gradient(135deg,#1565c0,#1976d2)' },
            { icon: <FaUsers size={18} color="white" />, label: 'Donateurs', value: donateurs ?? '—', bg: 'linear-gradient(135deg,#6a1b9a,#8e24aa)' },
            { icon: <FaWallet size={18} color="white" />, label: 'Don moyen', value: moyenneDon !== null ? formatAmount(moyenneDon) : '—', bg: 'linear-gradient(135deg,#e65100,#f57c00)' },
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
          <FaHandHoldingHeart size={16} color="var(--red-primary)" />
          Tous les dons
        </h3>

        {/* ── filtres ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <FaSearch size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-gray)' }} />
            <input
              className="form-input"
              placeholder="Rechercher par nom, email, campagne…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
          <select
            className="form-input"
            value={statutFilter}
            onChange={(e) => { setStatutFilter(e.target.value); setPage(0); }}
            style={{ flex: '0 0 180px' }}
          >
            <option value="">Tous les statuts</option>
            <option value="COMPLETE">Complété</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="ECHOUE">Échoué</option>
            <option value="ANNULE">Annulé</option>
          </select>
          {(search || statutFilter) && (
            <button onClick={() => { setSearch(''); setStatutFilter(''); setPage(0); }} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <FaTimes size={11} /> Réinitialiser
            </button>
          )}
        </div>

        {error && <div style={{ color: '#c62828', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {loading && <div style={{ color: 'var(--text-gray)', fontSize: 13, marginBottom: 12 }}>Chargement…</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-gray)' }}>Aucun don trouvé.</div>
        )}

        {filtered.map((don) => <DonRow key={don.id} don={don} showUser />)}

        {/* ── pagination ── */}
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

/* ─── modal confirmation portefeuille ────────────────────────── */

const SERVICE_FEE_RATE = 0.02; // 2% frais de service

function WalletDonationModal({ amount, message, campagne, balance, onConfirm, onClose }) {
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);
  const solde = Number(balance) || 0;
  const fraisService = Math.round(amount * SERVICE_FEE_RATE * 100) / 100;
  const totalDebite = amount + fraisService;
  const soldeApres = solde - totalDebite;
  // La validation du solde est gérée côté backend — on ne bloque pas côté frontend
  const insuffisant = false;

  const handleConfirm = async () => {
    if (insuffisant) return;
    setProcessing(true);
    setErrorMsg('');
    try {
      await onConfirm();
      setDone(true);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Impossible de finaliser le don.');
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
            <FaCheckCircle size={56} color="#2e7d32" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#2e7d32', marginBottom: 8 }}>Don effectué !</h3>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>
              {amount} $ ont été débités de votre portefeuille. Merci pour votre contribution.
            </p>
            <button onClick={onClose} className="btn-add" style={{ padding: '12px 32px' }}>Fermer</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#8B1C1C,#C44040)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaHandHoldingHeart size={22} color="white" />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 17, color: '#2C2C2C', margin: 0 }}>Confirmer le don</p>
                <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Débit depuis votre portefeuille RSC</p>
              </div>
            </div>

            <div style={{ background: 'var(--pink-ultra-light)', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
              {[
                { l: 'Montant du don', v: `${amount} $`, bold: true },
                { l: `Frais de service (${SERVICE_FEE_RATE * 100}%)`, v: `${fraisService.toFixed(2)} $`, color: '#888' },
                { l: 'Total débité', v: `${totalDebite.toFixed(2)} $`, bold: true },
                { l: 'Solde actuel', v: `${solde} $` },
                { l: 'Solde après don', v: `${soldeApres.toFixed(2)} $`, color: soldeApres < 0 ? '#c62828' : '#2e7d32' },
                ...(campagne ? [{ l: 'Campagne', v: campagne }] : []),
              ].map(({ l, v, bold, color }) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-gray)' }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: bold ? 800 : 600, color: color || 'var(--text-dark)' }}>{v}</span>
                </div>
              ))}
              {message && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-gray)', fontStyle: 'italic' }}>« {message} »</p>
              )}
            </div>

            {errorMsg && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(198,40,40,0.08)', border: '1px solid rgba(198,40,40,0.2)', fontSize: 13, color: '#c62828', marginBottom: 14 }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button onClick={onClose} style={{ padding: '13px', borderRadius: 8, border: '2px solid var(--pink-light)', background: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Annuler
              </button>
              <button onClick={handleConfirm} disabled={processing} className="btn-add"
                style={{ padding: '13px', opacity: processing ? 0.5 : 1 }}>
                {processing ? 'Traitement…' : 'Confirmer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── vue utilisateur ─────────────────────────────────────────── */

function UserDonationView() {
  const { user, balance, refreshBalance, addToBalance } = useAuth();
  const { refreshDossier } = useFinancesBoard(user?.id);
  const { status: feedback, submitting, submitDonation, resetStatus } = useDonationFlow(user?.id);

  const [selected, setSelected] = useState(null);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [campagne, setCampagne] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Historique des dons
  const [dons, setDons] = useState([]);
  const [donTotal, setDonTotal] = useState(null);
  const [histLoading, setHistLoading] = useState(true);
  const [histPage, setHistPage] = useState(0);
  const [histTotalPages, setHistTotalPages] = useState(1);

  const loadDons = () => {
    setHistLoading(true);
    Promise.allSettled([
      listMesDons({ page: histPage, size: 10, sort: 'dateDon,desc' }),
      mesDonsTotal(),
    ]).then(([donsRes, totalRes]) => {
      if (donsRes.status === 'fulfilled') {
        setDons(normalizeList(donsRes.value));
        setHistTotalPages(donsRes.value?.totalPages ?? 1);
      }
      if (totalRes.status === 'fulfilled') {
        setDonTotal(totalRes.value);
      }
    }).finally(() => setHistLoading(false));
  };

  useEffect(() => { loadDons(); }, [histPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const amount = custom ? Number(custom) : selected;

  const handleClose = () => {
    setShowModal(false);
    setSelected(null);
    setCustom('');
  };

  const [balanceLoading, setBalanceLoading] = useState(false);
  const handleOpenModal = async () => {
    if (!amount || amount <= 0 || submitting) return;
    setBalanceLoading(true);
    await refreshBalance();
    setBalanceLoading(false);
    setShowModal(true);
  };

  const totalDonne = donTotal?.totalDons ?? donTotal?.total
    ?? (donTotal ? Object.values(donTotal).find((v) => typeof v === 'number') : null);
  const nombreDons = donTotal?.nombreDons ?? donTotal?.count
    ?? (donTotal ? Object.values(donTotal).filter((v) => typeof v === 'number')[1] : null);

  return (
    <div>
      <StatsRow />

      {showModal && amount > 0 && (
        <WalletDonationModal
          amount={amount}
          message={message}
          campagne={campagne}
          balance={balance}
          onConfirm={async () => {
            await submitDonation({ amount, message, campagne, balance: Number(balance) || 0 });
            addToBalance(-amount);
            window.dispatchEvent(new CustomEvent('rsc:stats-refresh'));
            await refreshDossier();
            loadDons();
          }}
          onClose={handleClose}
        />
      )}

      {/* ── résumé dons ── */}
      {donTotal && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total donné', value: totalDonne !== null ? formatAmount(totalDonne) : '—', color: '#2e7d32' },
            { label: 'Nombre de dons', value: nombreDons ?? '—', color: '#1565c0' },
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

        <p className="donation-section-title" style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
          Saisir un montant
        </p>
        <input className="donation-input" type="number" placeholder="Montant du don ($)"
          value={custom} onChange={(e) => { setCustom(e.target.value); setSelected(null); resetStatus(); }} min="1"
          style={{ marginBottom: 12 }} />

        <input className="form-input" type="text" placeholder="Message (optionnel)"
          value={message} onChange={(e) => setMessage(e.target.value)}
          style={{ marginBottom: 12 }} />

        <input className="form-input" type="text" placeholder="Campagne (optionnel, ex : Noël 2025)"
          value={campagne} onChange={(e) => setCampagne(e.target.value)}
          style={{ marginBottom: 16 }} />

        <button className="btn-donate"
          onClick={handleOpenModal}
          disabled={!amount || amount <= 0 || submitting || balanceLoading}
          style={{ opacity: amount > 0 && !submitting && !balanceLoading ? 1 : 0.5 }}>
          <FaHandHoldingHeart size={15} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          {balanceLoading ? 'Vérification du solde…' : submitting ? 'Traitement…' : 'Effectuer le don depuis mon portefeuille'}
        </button>
      </div>

      {/* ── historique dons ── */}
      <div className="content-card">
        <h3 className="content-card-title" style={{ marginBottom: 12 }}>
          Historique de mes dons
        </h3>

        {histLoading && dons.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-gray)' }}>Chargement…</div>}
        {!histLoading && dons.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--text-gray)' }}>Aucun don effectué pour l'instant.</div>}

        {dons.map((don) => <DonRow key={don.id} don={don} showUser={false} />)}

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

function Donation() {
  const { hasRole } = useAuth();
  const showAdminView = hasRole(['SUPER_ADMIN', 'ADMIN_FINANCIER']);
  return showAdminView ? <AdminDonationView /> : <UserDonationView />;
}

export default Donation;
