import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FaWallet, FaHandHoldingHeart, FaChartLine, FaClock,
  FaMoneyBillWave, FaChartBar, FaUsers, FaSync,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { REALTIME_INTERVALS } from '../config/realtime';
import { paymentsStats, totalByUser, listPaiementsByUser } from '../services/paiements';
import { donsStats, donsByUser } from '../services/dons';
import { countUsersTotal, listAllUsers } from '../services/users';

/* ─── helpers ─────────────────────────────────────────────────── */

const PROBATION_MONTHS_BY_STATUS = Object.freeze({
  RESIDENT_PERMANENT: 6,
  CITOYEN_CANADIEN: 6,
  ETUDIANT_INTERNATIONAL: 3,
  TRAVAILLEUR_TEMPORAIRE: 2,
  VISITEUR_LONG_SEJOUR: 2,
  REFUGIE: 2,
});

const STATUS_LABELS = Object.freeze({
  RESIDENT_PERMANENT: 'Résident permanent',
  CITOYEN_CANADIEN: 'Citoyen canadien',
  ETUDIANT_INTERNATIONAL: 'Étudiant international',
  TRAVAILLEUR_TEMPORAIRE: 'Travailleur temporaire',
  VISITEUR_LONG_SEJOUR: 'Visiteur long séjour',
  REFUGIE: 'Réfugié',
});

const DEFAULT_PROBATION_MONTHS = 2;

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const addMonths = (date, months) => {
  const copy = new Date(date.getTime());
  copy.setMonth(copy.getMonth() + months);
  return copy;
};

const computeProbationInfo = (user) => {
  if (!user) return null;
  const status = (user.statutDiaspora || user.statutCompte || '').toUpperCase();
  const months = PROBATION_MONTHS_BY_STATUS[status] ?? DEFAULT_PROBATION_MONTHS;
  const startDate = parseDate(user.dateInscription)
    || parseDate(user.dateCreation)
    || parseDate(user.createdAt)
    || new Date();
  const endDate = addMonths(startDate, months);
  return {
    status,
    months,
    label: STATUS_LABELS[status] || 'Membre',
    start: startDate,
    end: endDate,
  };
};

function getTimeLeft(targetDate) {
  if (!targetDate) return null;
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  if (diff <= 0) {
    return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, completed: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const totalDays = Math.floor(totalHours / 24);
  const months = Math.floor(totalDays / 30);
  const days = totalDays % 30;
  return { months, days, hours, minutes, seconds, completed: false };
}

const formatCurrency = (value) => {
  const number = Number(value) || 0;
  return number.toLocaleString('fr-CA', { minimumFractionDigits: 0 }) + ' $';
};

const formatCurrencyFull = (value) => {
  const number = Number(value) || 0;
  return number.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
};

/* ─── extraction dynamique des clés du Map backend ────────────── */

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

/* ─── StatsRow (partagée entre toutes les pages) ──────────────── */

export function StatsRow() {
  const { user, isAdmin, balance: fallbackBalance } = useAuth();
  const { data, loading, lastUpdated, refresh } = useDashboardStats(user?.id);

  const stats = data || {};
  // fallbackBalance (AuthContext) est la source principale : il est mis à jour
  // immédiatement par addToBalance() après chaque débit ou crédit.
  // stats.balance sert uniquement si le contexte n'a pas encore chargé.
  const displayBalance = Number(fallbackBalance) > 0
    ? Number(fallbackBalance)
    : (Number(stats.balance) || 0);

  if (isAdmin) return null;

  return (
    <div className="stats-row" style={{ position: 'relative' }}>
      <div className="stat-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaWallet size={16} color="rgba(255,255,255,0.7)" />
          <span className="stat-label">Solde actuel</span>
        </div>
        <span className="stat-value">{formatCurrency(displayBalance)}</span>
      </div>
      <div className="stat-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaHandHoldingHeart size={16} color="rgba(255,255,255,0.7)" />
          <span className="stat-label">Dons déposés</span>
        </div>
        <span className="stat-value">{stats.donationsCount ?? 0}</span>
      </div>
      <div className="stat-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaChartLine size={16} color="rgba(255,255,255,0.7)" />
          <span className="stat-label">Montant total de dons actuel</span>
        </div>
        <span className="stat-value">{formatCurrency(stats.donationsTotal)}</span>
      </div>
      <div style={{ position: 'absolute', top: -22, right: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
        {lastUpdated && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
            Mise à jour {new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button className="btn-small" style={{ padding: '2px 10px' }} type="button" onClick={refresh} disabled={loading}>
          {loading ? '…' : 'Rafraîchir'}
        </button>
      </div>
    </div>
  );
}

/* ─── carte stat admin ────────────────────────────────────────── */

function StatCard({ icon, label, value, bg, sub }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '18px 20px', color: 'white', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 10, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{value}</p>
        {sub && <p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.75 }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ─── helpers fallback ────────────────────────────────────────── */

const toList = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.content)) return raw.content;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
};

const extractNum = (v) => {
  if (!v && v !== 0) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object') {
    const n = v.total ?? v.montant ?? v.montantTotal ?? v.totalPaiements ?? v.totalDons
      ?? Object.values(v).find((x) => typeof x === 'number');
    return Number.isFinite(Number(n)) ? Number(n) : 0;
  }
  return Number(v) || 0;
};

// Tente les endpoints par utilisateur — ne spam pas (une seule passe)
async function fallbackPayStats() {
  const users = toList(await listAllUsers());
  if (users.length === 0) return null;
  // Tenter totalByUser (GET /paiements/utilisateur/{id}/total)
  const totals = await Promise.allSettled(users.map((u) => totalByUser(u.id)));
  const anyTotalOk = totals.some((r) => r.status === 'fulfilled');
  if (anyTotalOk) {
    let total = 0; let payeurs = 0;
    totals.forEach((r) => {
      if (r.status === 'fulfilled') {
        const v = extractNum(r.value);
        total += v;
        if (v > 0) payeurs++;
      }
    });
    return { totalMontant: total, nombrePaiements: payeurs, utilisateursUniques: payeurs };
  }
  // Tenter listPaiementsByUser (GET /paiements/utilisateur/{id})
  const lists = await Promise.allSettled(users.map((u) => listPaiementsByUser(u.id)));
  const anyListOk = lists.some((r) => r.status === 'fulfilled');
  if (!anyListOk) return null;
  let total = 0; let nb = 0; const payeursSet = new Set();
  lists.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      const list = toList(r.value);
      list.forEach((p) => { total += Number(p.montant) || 0; nb++; });
      if (list.length > 0) payeursSet.add(users[i].id);
    }
  });
  return { totalMontant: total, nombrePaiements: nb, utilisateursUniques: payeursSet.size };
}

async function fallbackDonStats() {
  const users = toList(await listAllUsers());
  if (users.length === 0) return null;
  const lists = await Promise.allSettled(users.map((u) => donsByUser(u.id)));
  const anyOk = lists.some((r) => r.status === 'fulfilled');
  if (!anyOk) return null;
  let total = 0; let nb = 0; const donateursSet = new Set();
  lists.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      const list = toList(r.value);
      list.forEach((d) => { total += Number(d.montant) || 0; nb++; });
      if (list.length > 0) donateursSet.add(users[i].id);
    }
  });
  return { totalDons: total, nombreDons: nb, donateurs: donateursSet.size, moyenneDon: nb > 0 ? total / nb : 0 };
}

/* ─── dashboard statistiques admin ───────────────────────────── */

function AdminStatsDashboard() {
  const [payData, setPayData] = useState(null);
  const [donData, setDonData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiErrors, setApiErrors] = useState({ pay: null, don: null, user: null });
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [payRes, donRes, userRes] = await Promise.allSettled([
      paymentsStats(),
      donsStats(),
      countUsersTotal(),
    ]);
    const errs = {};

    if (payRes.status === 'fulfilled') {
      setPayData(payRes.value);
    } else {
      // Endpoint stats indisponible → fallback par utilisateur
      try {
        const fb = await fallbackPayStats();
        if (fb) { setPayData(fb); }
        else { errs.pay = `Paiements (${payRes.reason?.response?.status ?? '?'})`; }
      } catch {
        errs.pay = `Paiements (${payRes.reason?.response?.status ?? '?'})`;
      }
    }

    if (donRes.status === 'fulfilled') {
      setDonData(donRes.value);
    } else {
      try {
        const fb = await fallbackDonStats();
        if (fb) { setDonData(fb); }
        else { errs.don = `Dons (${donRes.reason?.response?.status ?? '?'})`; }
      } catch {
        errs.don = `Dons (${donRes.reason?.response?.status ?? '?'})`;
      }
    }

    if (userRes.status === 'fulfilled') {
      setUserData(userRes.value);
    } else {
      errs.user = userRes.reason?.response?.data?.message || userRes.reason?.message || 'Erreur utilisateurs';
    }

    setApiErrors(errs);
    setLastUpdated(Date.now());
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const id = setInterval(fetchAll, REALTIME_INTERVALS.paiements || 25000);
    return () => clearInterval(id);
  }, [fetchAll]);

  useEffect(() => {
    const handler = () => fetchAll();
    window.addEventListener('rsc:stats-refresh', handler);
    return () => window.removeEventListener('rsc:stats-refresh', handler);
  }, [fetchAll]);

  /* ── Extraction paiements (endpoint stats ou fallback) ── */
  const totalEncaisse = payData?.totalMontant
    ?? findByKeys(payData, 'montant', 'total', 'encaisse', 'amount', 'somme', 'revenu', 'chiffre')
    ?? 0;
  const nbTransactions = payData?.nombrePaiements
    ?? findByKeys(payData, 'transaction', 'paiement', 'nombre', 'count', 'nbr', 'nb', 'quantity')
    ?? 0;
  const nbPayeurs = payData?.utilisateursUniques
    ?? findByKeys(payData, 'utilisateur', 'user', 'payeur', 'client', 'membre', 'unique')
    ?? 0;
  const moyennePaiement = nbTransactions > 0 ? totalEncaisse / nbTransactions : 0;

  /* ── Stats dons (endpoint stats ou fallback) ── */
  const totalDons   = donData?.totalDons   ?? findByKeys(donData, 'totaldon', 'total') ?? 0;
  const nombreDons  = donData?.nombreDons  ?? findByKeys(donData, 'nombredon', 'nombre', 'count') ?? 0;
  const nbDonateurs = donData?.donateurs   ?? findByKeys(donData, 'donateur', 'unique', 'user') ?? 0;
  const moyenneDon  = donData?.moyenneDon  ?? (nombreDons > 0 ? totalDons / nombreDons : 0);

  /* ── Nombre d'utilisateurs ── */
  const nbUsers = typeof userData === 'number'
    ? userData
    : (userData?.total ?? userData?.count ?? userData?.nombre
       ?? (userData && typeof userData === 'object'
           ? (Object.values(userData).find((v) => typeof v === 'number') ?? 0)
           : 0));

  const errorEntries = Object.entries(apiErrors).filter(([, v]) => v);

  return (
    <div>
      {errorEntries.length > 0 && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.3)', fontSize: 13 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#e65100' }}>⚠ Certaines statistiques sont indisponibles (problème backend)</p>
          {errorEntries.map(([k, v]) => (
            <div key={k} style={{ color: '#bf360c', marginTop: 2 }}>
              {k === 'pay' ? 'Paiements' : k === 'don' ? 'Dons' : 'Utilisateurs'} : {v}
            </div>
          ))}
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#795548' }}>
            Ces endpoints retournent une erreur côté serveur. Contacter l'équipe backend pour corriger /paiements/stats et /dons/admin/stats.
          </p>
        </div>
      )}
      {/* En-tête avec heure de mise à jour et refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-dark)' }}>
          Tableau de bord — statistiques globales
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: 'var(--text-gray)' }}>
              Mis à jour à {new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            className="btn-small"
            onClick={fetchAll}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <FaSync size={10} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Chargement…' : 'Actualiser'}
          </button>
        </div>
      </div>

      {/* Section paiements */}
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Paiements &amp; Recharges
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard
          icon={<FaMoneyBillWave size={18} color="white" />}
          label="Total encaissé"
          value={apiErrors.pay ? '—' : formatCurrencyFull(totalEncaisse)}
          bg="linear-gradient(135deg,#1b5e20,#2e7d32)"
        />
        <StatCard
          icon={<FaChartBar size={18} color="white" />}
          label="Transactions"
          value={apiErrors.pay ? '—' : nbTransactions.toLocaleString('fr-CA')}
          bg="linear-gradient(135deg,#0d47a1,#1565c0)"
        />
        <StatCard
          icon={<FaUsers size={18} color="white" />}
          label="Utilisateurs payeurs"
          value={apiErrors.pay ? nbUsers.toLocaleString('fr-CA') : (nbPayeurs > 0 ? nbPayeurs.toLocaleString('fr-CA') : nbUsers.toLocaleString('fr-CA'))}
          bg="linear-gradient(135deg,#4a148c,#6a1b9a)"
        />
        <StatCard
          icon={<FaWallet size={18} color="white" />}
          label="Paiement moyen"
          value={apiErrors.pay ? '—' : formatCurrencyFull(moyennePaiement)}
          bg="linear-gradient(135deg,#bf360c,#e64a19)"
        />
      </div>

      {/* Section dons */}
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Dons
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard
          icon={<FaHandHoldingHeart size={18} color="white" />}
          label="Total des dons"
          value={apiErrors.don ? '—' : formatCurrencyFull(totalDons)}
          bg="linear-gradient(135deg,#880e4f,#ad1457)"
        />
        <StatCard
          icon={<FaChartBar size={18} color="white" />}
          label="Nombre de dons"
          value={apiErrors.don ? '—' : nombreDons.toLocaleString('fr-CA')}
          bg="linear-gradient(135deg,#e65100,#f57c00)"
        />
        <StatCard
          icon={<FaUsers size={18} color="white" />}
          label="Donateurs uniques"
          value={apiErrors.don ? '—' : nbDonateurs.toLocaleString('fr-CA')}
          bg="linear-gradient(135deg,#006064,#00838f)"
        />
        <StatCard
          icon={<FaWallet size={18} color="white" />}
          label="Don moyen"
          value={apiErrors.don ? '—' : formatCurrencyFull(moyenneDon)}
          bg="linear-gradient(135deg,#1a237e,#283593)"
        />
      </div>

      {/* Section utilisateurs */}
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Membres
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 8 }}>
        <StatCard
          icon={<FaUsers size={18} color="white" />}
          label="Utilisateurs inscrits"
          value={nbUsers.toLocaleString('fr-CA')}
          bg="linear-gradient(135deg,#37474f,#546e7a)"
        />
        <StatCard
          icon={<FaChartLine size={18} color="white" />}
          label="Taux de participation"
          value={nbUsers > 0 ? `${Math.min(100, Math.round((nbDonateurs / nbUsers) * 100))} %` : '—'}
          sub="donateurs / membres"
          bg="linear-gradient(135deg,#33691e,#558b2f)"
        />
      </div>
    </div>
  );
}

/* ─── composant principal Statistics ─────────────────────────── */

function Statistics() {
  const { user, isAdmin } = useAuth();
  const probationInfo = useMemo(() => computeProbationInfo(user), [user]);
  const [time, setTime] = useState(() => getTimeLeft(probationInfo?.end));

  useEffect(() => {
    setTime(getTimeLeft(probationInfo?.end));
    if (!probationInfo?.end) return undefined;
    const interval = setInterval(() => {
      setTime(getTimeLeft(probationInfo.end));
    }, 1000);
    return () => clearInterval(interval);
  }, [probationInfo?.end]);

  const pad = (n) => String(Math.max(0, n)).padStart(2, '0');
  const endLabel = probationInfo?.end
    ? probationInfo.end.toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const countdownActive = Boolean(probationInfo?.end) && time && !time.completed;
  const durationText = probationInfo ? `${probationInfo.months} mois` : 'Non définie';

  return (
    <div>
      <StatsRow />

      {isAdmin ? (
        <div className="content-card" style={{ marginTop: 20 }}>
          <AdminStatsDashboard />
        </div>
      ) : (
        <div className="probation-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
            <FaClock size={16} color="rgba(255,255,255,0.8)" />
            <p className="probation-label" style={{ margin: 0 }}>Durée restante de votre période probatoire</p>
          </div>
          <p className="probation-note">
            Statut : <strong>{probationInfo?.label || '—'}</strong> · Durée : <strong>{durationText}</strong>
            {endLabel ? ` · Fin estimée le ${endLabel}` : ''}
          </p>
          {countdownActive ? (
            <p className="probation-timer">
              {time.months}mois {time.days}jours {pad(time.hours)}h {pad(time.minutes)}min {pad(time.seconds)}sec
            </p>
          ) : (
            <p className="probation-timer">
              {probationInfo ? 'Votre période probatoire est terminée.' : 'Information indisponible.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default Statistics;
