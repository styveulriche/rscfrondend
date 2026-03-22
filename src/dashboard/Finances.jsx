import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FaArrowDown, FaCalendarAlt, FaCreditCard, FaUsers,
  FaChevronDown, FaChevronUp, FaSearch, FaTimes, FaLock,
  FaMoneyBillWave, FaChartBar, FaWallet,
} from 'react-icons/fa';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import { useFinancesBoard, initStripePayment, finalizeStripePayment } from '../hooks/useFinancesBoard';
import { useRealtimeResource } from '../hooks/useRealtimeResource';
import { REALTIME_INTERVALS } from '../config/realtime';
import { listAllUsers } from '../services/users';
import { listPaiementsByUser, totalByUser, paymentsStats } from '../services/paiements';
import { stripePromise } from '../config/stripe';

/* ─── helpers ─────────────────────────────────────────────────── */

const formatAmount = (value) => {
  const amount = Number(value) || 0;
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}${Math.abs(amount).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
};

const formatDate = (value) => {
  if (!value) return '--/--/----';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-CA');
};

const normalizeList = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

const displayName = (u) =>
  [u?.prenom, u?.nom].filter(Boolean).join(' ') || u?.username || u?.email || u?.id || '—';

/* ─── options de filtre ───────────────────────────────────────── */

const STATUT_COMPTE_OPTIONS = [
  { value: '', label: 'Tous les statuts de compte' },
  { value: 'ACTIF', label: 'Actif' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'EN_VERIFICATION', label: 'En vérification' },
  { value: 'SUSPENDU', label: 'Suspendu' },
  { value: 'INACTIF', label: 'Inactif' },
];

const STATUT_DIASPORA_OPTIONS = [
  { value: '', label: 'Tous les statuts diaspora' },
  { value: 'RESIDENT_PERMANENT', label: 'Résident permanent' },
  { value: 'CITOYEN_CANADIEN', label: 'Citoyen canadien' },
  { value: 'ETUDIANT_INTERNATIONAL', label: 'Étudiant international' },
  { value: 'TRAVAILLEUR_TEMPORAIRE', label: 'Travailleur temporaire' },
  { value: 'VISITEUR_LONG_SEJOUR', label: 'Visiteur long séjour' },
  { value: 'REFUGIE', label: 'Réfugié' },
];

/* ─── composant transactions inline ──────────────────────────── */

function UserTransactionsPanel({ userId }) {
  const [transactions, setTransactions] = useState([]);
  const [serverTotal, setServerTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [txData, totalData] = await Promise.allSettled([
          listPaiementsByUser(userId),
          totalByUser(userId),
        ]);

        if (cancelled) return;

        if (txData.status === 'fulfilled') {
          setTransactions(normalizeList(txData.value));
        } else {
          setError(txData.reason?.response?.data?.message || txData.reason?.message || 'Erreur de chargement.');
        }

        if (totalData.status === 'fulfilled') {
          const res = totalData.value;
          const val = typeof res === 'number'
            ? res
            : Object.values(res || {}).find((v) => typeof v === 'number') ?? null;
          setServerTotal(val);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const timer = setInterval(load, REALTIME_INTERVALS.paiements);
    return () => { cancelled = true; clearInterval(timer); };
  }, [userId]);

  if (loading && transactions.length === 0) return <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-gray)' }}>Chargement…</div>;
  if (error && transactions.length === 0) return <div style={{ padding: '12px 0', fontSize: 13, color: '#c62828' }}>{error}</div>;
  if (transactions.length === 0) return <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-gray)' }}>Aucune transaction.</div>;

  const displayTotal = serverTotal ?? transactions.reduce((sum, t) => sum + (Number(t.montant) || 0), 0);

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#2e7d32' }}>
          Total encaissé : {formatAmount(displayTotal)}
        </span>
      </div>
      {transactions.map((t) => {
        const key = t.id || `${t.referenceTransaction || ''}-${t.datePaiement || t.dateCreation || Math.random()}`;
        const desc = t.description || t.methodePaiement || 'Transaction';
        const amount = Number(t.montant) || 0;
        const statut = t.statut;
        return (
          <div key={key} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: '1px solid #f5f5f5',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <FaCalendarAlt size={11} color="var(--red-primary)" />
                <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>{formatDate(t.datePaiement || t.dateCreation)}</span>
                {statut && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20,
                    color: statut === 'SUCCES' ? '#2e7d32' : statut === 'ECHEC' ? '#c62828' : '#f57c00',
                    background: statut === 'SUCCES' ? 'rgba(46,125,50,0.1)' : statut === 'ECHEC' ? 'rgba(198,40,40,0.1)' : 'rgba(245,124,0,0.1)',
                  }}>{statut}</span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{desc}</p>
              {t.referenceTransaction && (
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-gray)' }}>Réf : {t.referenceTransaction}</p>
              )}
              {t.reçuURL && (
                <a href={t.reçuURL} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--red-primary)', display: 'block', marginTop: 2 }}>
                  Voir le reçu
                </a>
              )}
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', marginLeft: 12, color: amount >= 0 ? '#2e7d32' : '#c62828' }}>
              {formatAmount(amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── stats globales admin ────────────────────────────────────── */

function AdminGlobalStats() {
  const fetcher = useCallback(() => paymentsStats(), []);
  const { data: stats, loading } = useRealtimeResource(
    'admin-global-stats',
    fetcher,
    { enabled: true, immediate: true, interval: REALTIME_INTERVALS.paiements },
  );

  if (loading) return <div style={{ fontSize: 13, color: 'var(--text-gray)', marginBottom: 16 }}>Chargement des statistiques…</div>;
  if (!stats) return null;

  // Extraction dynamique : le backend renvoie un Map<String, Object> aux clés variables
  const findByKeys = (obj, ...patterns) => {
    if (!obj || typeof obj !== 'object') return null;
    for (const key of Object.keys(obj)) {
      const k = key.toLowerCase();
      if (patterns.some((p) => k.includes(p))) {
        const v = Number(obj[key]);
        if (Number.isFinite(v)) return v;
      }
    }
    return null;
  };

  const totalEncaisse = findByKeys(stats, 'montant', 'total', 'amount', 'somme', 'encaisse', 'revenu') ?? 0;
  const nbTransactions = findByKeys(stats, 'transaction', 'paiement', 'count', 'nombre', 'nbr') ?? 0;
  const nbUtilisateurs = findByKeys(stats, 'utilisateur', 'user', 'client', 'membre') ?? 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
      {[
        { icon: <FaMoneyBillWave size={18} color="white" />, label: 'Total encaissé', value: formatAmount(totalEncaisse), bg: 'linear-gradient(135deg,#2e7d32,#43a047)' },
        { icon: <FaChartBar size={18} color="white" />, label: 'Transactions', value: nbTransactions, bg: 'linear-gradient(135deg,#1565c0,#1976d2)' },
        { icon: <FaUsers size={18} color="white" />, label: 'Utilisateurs actifs', value: nbUtilisateurs || '—', bg: 'linear-gradient(135deg,#6a1b9a,#8e24aa)' },
        { icon: <FaWallet size={18} color="white" />, label: 'Solde moyen', value: nbUtilisateurs > 0 ? formatAmount(totalEncaisse / nbUtilisateurs) : '—', bg: 'linear-gradient(135deg,#e65100,#f57c00)' },
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
  );
}

/* ─── vue admin ───────────────────────────────────────────────── */

function AdminFinancesView() {
  const [filters, setFilters] = useState({ search: '', statutCompte: '', statutDiaspora: '' });
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  useEffect(() => {
    setLoading(true);
    setError(null);
    listAllUsers()
      .then((data) => setAllUsers(normalizeList(data)))
      .catch((err) => setError(err?.response?.data?.message || err?.message || 'Impossible de charger les utilisateurs.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const s = filters.search.toLowerCase();
    return allUsers.filter((u) => {
      if (filters.statutCompte && (u.statutCompte || u.statut) !== filters.statutCompte) return false;
      if (filters.statutDiaspora && u.statutDiaspora !== filters.statutDiaspora) return false;
      if (s) {
        const name = `${u.prenom || ''} ${u.nom || ''} ${u.email || ''} ${u.nomComplet || ''}`.toLowerCase();
        if (!name.includes(s)) return false;
      }
      return true;
    });
  }, [allUsers, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const users = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleReset = () => {
    setFilters({ search: '', statutCompte: '', statutDiaspora: '' });
    setPage(0);
    setExpandedId(null);
  };

  const toggleUser = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div>
      <AdminGlobalStats />

      <div className="content-card">
        <h3 className="content-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <FaUsers size={16} color="var(--red-primary)" />
          Transactions de tous les utilisateurs
        </h3>

        {/* ── filtres ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'flex-end' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <FaSearch size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-gray)' }} />
            <input
              className="form-input"
              placeholder="Rechercher par nom / email"
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && setPage(0)}
              style={{ paddingLeft: 30 }}
            />
          </div>

          <select
            className="form-input"
            value={filters.statutCompte}
            onChange={(e) => setFilters((p) => ({ ...p, statutCompte: e.target.value }))}
            style={{ flex: '1 1 180px' }}
          >
            {STATUT_COMPTE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            className="form-input"
            value={filters.statutDiaspora}
            onChange={(e) => setFilters((p) => ({ ...p, statutDiaspora: e.target.value }))}
            style={{ flex: '1 1 180px' }}
          >
            {STATUT_DIASPORA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button className="btn-add" onClick={() => { setPage(0); setExpandedId(null); }} style={{ flex: '0 0 auto' }}>
            <FaSearch size={12} style={{ marginRight: 6 }} /> Filtrer
          </button>
          {(filters.search || filters.statutCompte || filters.statutDiaspora) && (
            <button onClick={handleReset} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <FaTimes size={11} /> Réinitialiser
            </button>
          )}
        </div>

        {/* ── état ── */}
        {error && <div style={{ color: '#c62828', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {loading && <div style={{ color: 'var(--text-gray)', fontSize: 13, marginBottom: 12 }}>Chargement…</div>}

        {!loading && users.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-gray)' }}>
            Aucun utilisateur trouvé.
          </div>
        )}

        {/* ── liste utilisateurs ── */}
        {users.map((u) => {
          const uid = u.id || u.utilisateurId;
          const expanded = expandedId === uid;
          const statut = u.statutCompte || u.statut || '—';
          const diaspora = u.statutDiaspora || '—';
          return (
            <div key={uid} style={{ border: '1px solid #f0f0f0', borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => toggleUser(uid)}
                style={{
                  width: '100%', background: expanded ? 'var(--pink-ultra-light)' : 'white',
                  border: 'none', cursor: 'pointer', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{displayName(u)}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-gray)' }}>{u.email || '—'}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                    background: statut === 'ACTIF' ? 'rgba(46,125,50,0.12)' : statut === 'SUSPENDU' ? 'rgba(198,40,40,0.12)' : 'rgba(100,100,100,0.1)',
                    color: statut === 'ACTIF' ? '#2e7d32' : statut === 'SUSPENDU' ? '#c62828' : '#555',
                  }}>
                    {statut}
                  </span>
                  {diaspora !== '—' && (
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'rgba(25,118,210,0.1)', color: '#1565c0', fontWeight: 500 }}>
                      {diaspora.replace(/_/g, ' ')}
                    </span>
                  )}
                  {expanded ? <FaChevronUp size={12} color="var(--text-gray)" /> : <FaChevronDown size={12} color="var(--text-gray)" />}
                </div>
              </button>

              {expanded && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f5f5f5' }}>
                  <UserTransactionsPanel userId={uid} />
                </div>
              )}
            </div>
          );
        })}

        {/* ── pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button
              className="btn-small"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              Précédent
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-gray)' }}>Page {page + 1} / {totalPages}</span>
            <button
              className="btn-small"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── formulaire carte Stripe (nécessite le contexte Elements) ── */

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '15px',
      color: '#2C2C2C',
      fontFamily: 'inherit',
      '::placeholder': { color: '#aab7c4' },
    },
    invalid: { color: '#c62828' },
  },
};

function StripeCardForm({ amount, dossierId, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    try {
      // Étape 1 — créer le PaymentIntent côté backend
      const intent = await initStripePayment({
        amount,
        dossierId: dossierId || null,
        description: 'Recharge RSC',
      });

      // Étape 2 — confirmer le paiement avec la carte via Stripe.js
      const cardElement = elements.getElement(CardElement);
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        intent.clientSecret,
        { payment_method: { card: cardElement } },
      );

      if (stripeError) {
        setError(stripeError.message);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        // Étape 3 — enregistrer le paiement côté backend
        const receipt = await finalizeStripePayment({
          paymentIntentId: intent.paymentIntentId,
          dossierId: dossierId || null,
        });
        onSuccess(receipt, intent);
      } else {
        setError(`Statut inattendu : ${paymentIntent.status}`);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Paiement échoué.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        border: '1px solid #dde3ea', borderRadius: 10, padding: '14px 16px',
        background: '#fafbfc', marginBottom: 16,
      }}>
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>

      {error && (
        <div style={{ fontSize: 13, color: '#c62828', background: 'rgba(198,40,40,0.07)', border: '1px solid rgba(198,40,40,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className="btn-donate"
          type="submit"
          disabled={!stripe || loading}
          style={{ flex: 1 }}
        >
          <FaLock size={12} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          {loading ? 'Traitement…' : `Payer ${formatAmount(amount)}`}
        </button>
        <button
          className="btn-small"
          type="button"
          onClick={onCancel}
          disabled={loading}
        >
          Annuler
        </button>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-gray)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
        <FaLock size={10} /> Paiement sécurisé par Stripe — vos données bancaires ne transitent jamais par nos serveurs.
      </p>
    </form>
  );
}

/* ─── vue utilisateur ────────────────────────────────────────── */

function UserFinancesView() {
  const { user, addToBalance } = useAuth();
  const [topupAmount, setTopupAmount] = useState('');
  const [showCardForm, setShowCardForm] = useState(false);
  const [topupStatus, setTopupStatus] = useState(null);

  const {
    transactions: items,
    loading,
    error,
    lastUpdated,
    refreshTransactions,
    dossier,
    refreshDossier,
  } = useFinancesBoard(user?.id);

  const amountValue = Number(topupAmount);

  const handleAmountSubmit = (e) => {
    e.preventDefault();
    if (!amountValue || amountValue <= 0) {
      setTopupStatus({ type: 'error', message: 'Veuillez saisir un montant valide supérieur à 0 $.' });
      return;
    }
    setTopupStatus(null);
    setShowCardForm(true);
  };

  const handlePaymentSuccess = async (receipt, intent) => {
    // Capturer le montant avant de vider le formulaire
    const paid = Number(receipt?.montant ?? intent?.montant ?? amountValue);
    setShowCardForm(false);
    setTopupAmount('');
    setTopupStatus({
      type: 'success',
      message: receipt?.referenceTransaction
        ? `Paiement de ${formatAmount(paid)} confirmé (${receipt.referenceTransaction}).${receipt.reçuURL ? ' Reçu disponible.' : ''}`
        : `Paiement de ${formatAmount(paid)} confirmé. Votre solde a été mis à jour.`,
    });
    // Mise à jour immédiate du solde affiché (optimiste)
    addToBalance(paid);
    window.dispatchEvent(new CustomEvent('rsc:stats-refresh'));
    // Synchronisation avec le serveur en arrière-plan
    refreshTransactions();
    refreshDossier();
  };

  const statusColors = {
    error:   { color: '#c62828', bg: 'rgba(198,40,40,0.08)',  border: '1px solid rgba(198,40,40,0.2)' },
    success: { color: '#2e7d32', bg: 'rgba(46,125,50,0.1)',   border: '1px solid rgba(46,125,50,0.2)' },
    info:    { color: '#1565c0', bg: 'rgba(21,101,192,0.08)', border: '1px solid rgba(21,101,192,0.2)' },
  };

  return (
    <div>
      <StatsRow />

      <div className="content-card" style={{ marginBottom: 24 }}>
        <h3 className="content-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaCreditCard size={16} color="var(--red-primary)" />
          Recharger mon solde par carte bancaire
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-gray)', marginBottom: 16 }}>
          Paiement sécurisé par carte Visa, Mastercard ou American Express via Stripe.
        </p>

        {stripePromise ? (
          /* Elements toujours monté — CardElement ne doit JAMAIS être démonté conditionnellement */
          <Elements stripe={stripePromise}>
            {/* Étape 1 — saisie du montant (cachée via CSS quand le formulaire carte est actif) */}
            <form
              onSubmit={handleAmountSubmit}
              style={{ display: showCardForm ? 'none' : 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}
            >
              <input
                className="donation-input"
                type="number"
                min="1"
                step="1"
                placeholder="Montant en $"
                value={topupAmount}
                onChange={(e) => { setTopupAmount(e.target.value); setTopupStatus(null); }}
                style={{ flex: '1 1 220px' }}
              />
              <button className="btn-donate" type="submit" style={{ flex: '0 0 auto', minWidth: 200 }}>
                <FaCreditCard size={13} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Payer par carte
              </button>
            </form>

            {/* Étape 2 — formulaire carte TOUJOURS dans le DOM, affiché via CSS uniquement */}
            <div style={{ display: showCardForm ? 'block' : 'none', marginTop: 8 }}>
              <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(21,101,192,0.06)', border: '1px solid rgba(21,101,192,0.18)' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#1565c0', fontWeight: 600 }}>
                  Montant à débiter : {formatAmount(amountValue || 0)}
                </p>
                {dossier?.id && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-gray)' }}>
                    Dossier : {dossier.label || dossier.id}
                  </p>
                )}
              </div>
              <StripeCardForm
                amount={amountValue || 0}
                dossierId={dossier?.id || null}
                onSuccess={handlePaymentSuccess}
                onCancel={() => { setShowCardForm(false); setTopupStatus(null); }}
              />
            </div>
          </Elements>
        ) : (
          <>
            {/* Étape 1 sans Stripe (clé non configurée) */}
            <form
              onSubmit={handleAmountSubmit}
              style={{ display: showCardForm ? 'none' : 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}
            >
              <input
                className="donation-input"
                type="number" min="1" step="1" placeholder="Montant en $"
                value={topupAmount}
                onChange={(e) => { setTopupAmount(e.target.value); setTopupStatus(null); }}
                style={{ flex: '1 1 220px' }}
              />
              <button className="btn-donate" type="submit" style={{ flex: '0 0 auto', minWidth: 200 }}>
                <FaCreditCard size={13} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Payer par carte
              </button>
            </form>
            {showCardForm && (
              <div style={{ padding: '14px 16px', borderRadius: 8, background: 'rgba(245,124,0,0.08)', border: '1px solid rgba(245,124,0,0.25)', fontSize: 13, color: '#e65100' }}>
                <strong>Stripe non configuré.</strong> Ajoutez <code>REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_…</code> dans <code>.env</code> puis redémarrez.
              </div>
            )}
          </>
        )}

        {topupStatus && (() => {
          const s = statusColors[topupStatus.type] || statusColors.info;
          return (
            <div style={{ marginTop: 14, fontSize: 13, borderRadius: 8, padding: '10px 12px', color: s.color, background: s.bg, border: s.border }}>
              {topupStatus.message}
            </div>
          );
        })()}
      </div>

      <div className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 className="content-card-title" style={{ margin: 0 }}>
            <FaArrowDown size={14} style={{ marginRight: 8, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
            Historique de vos transactions
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdated && (
              <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>
                Mise à jour {new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button className="btn-small" type="button" onClick={refreshTransactions} disabled={loading}>
              {loading ? 'Chargement…' : 'Actualiser'}
            </button>
          </div>
        </div>

        {error && <div style={{ color: 'var(--red-primary)', marginBottom: 12 }}>Impossible de récupérer les transactions.</div>}

        {items.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-gray)' }}>Aucune transaction trouvée.</div>
        )}

        {items.map((t) => {
          const key = t.id || `${t.referenceTransaction || ''}-${t.datePaiement || t.dateCreation || Math.random()}`;
          const desc = t.description || t.methodePaiement || 'Transaction';
          const amount = t.montant ?? 0;
          const statut = t.statut;
          return (
            <div className="transaction-item" key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <FaCalendarAlt size={12} color="var(--red-primary)" />
                  <p className="transaction-date" style={{ margin: 0 }}>{formatDate(t.datePaiement || t.dateCreation)}</p>
                  {statut && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20,
                      color: statut === 'SUCCES' ? '#2e7d32' : statut === 'ECHEC' ? '#c62828' : '#f57c00',
                      background: statut === 'SUCCES' ? 'rgba(46,125,50,0.1)' : statut === 'ECHEC' ? 'rgba(198,40,40,0.1)' : 'rgba(245,124,0,0.1)',
                    }}>
                      {statut}
                    </span>
                  )}
                </div>
                <p className="transaction-desc">{desc}</p>
                {t.referenceTransaction && (
                  <p style={{ fontSize: 12, color: 'var(--text-gray)', margin: '4px 0 0' }}>Réf : {t.referenceTransaction}</p>
                )}
                {t.reçuURL && (
                  <a href={t.reçuURL} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--red-primary)', margin: '4px 0 0', display: 'block' }}>
                    Voir le reçu
                  </a>
                )}
              </div>
              <span style={{ fontWeight: 700, color: amount >= 0 ? '#2e7d32' : '#c62828', fontSize: '15px', whiteSpace: 'nowrap', marginLeft: 16 }}>
                {formatAmount(amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── composant principal ─────────────────────────────────────── */

function Finances() {
  const { hasRole } = useAuth();
  const showAdminView = hasRole(['SUPER_ADMIN', 'ADMIN_FINANCIER']);
  return showAdminView ? <AdminFinancesView /> : <UserFinancesView />;
}

export default Finances;
