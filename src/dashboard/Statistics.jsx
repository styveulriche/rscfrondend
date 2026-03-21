import { useState, useEffect, useMemo } from 'react';
import { FaWallet, FaHandHoldingHeart, FaChartLine, FaClock } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useDashboardStats } from '../hooks/useDashboardStats';

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

export function StatsRow() {
  const { user, balance: fallbackBalance } = useAuth();
  const { data, loading, lastUpdated, refresh } = useDashboardStats(user?.id);

  const stats = data || {};
  const displayBalance = stats.balance ?? fallbackBalance ?? 0;

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

function Statistics() {
  const { user } = useAuth();
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
    </div>
  );
}

export default Statistics;
