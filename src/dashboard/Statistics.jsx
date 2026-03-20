import { useState, useEffect } from 'react';
import { FaWallet, FaHandHoldingHeart, FaChartLine, FaClock } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useDashboardStats } from '../hooks/useDashboardStats';

// Fin de période probatoire : 2 mois 5 jours à partir d'aujourd'hui (simulé)
const PROBATION_END = new Date('2026-05-19T21:12:51');

function getTimeLeft() {
  const now = new Date();
  const diff = PROBATION_END - now;
  if (diff <= 0) return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const totalSeconds = Math.floor(diff / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const totalDays = Math.floor(totalHours / 24);
  const months = Math.floor(totalDays / 30);
  const days = totalDays % 30;
  return { months, days, hours, minutes, seconds };
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
  const [time, setTime] = useState(getTimeLeft);

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div>
      <StatsRow />
      <div className="probation-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
          <FaClock size={16} color="rgba(255,255,255,0.8)" />
          <p className="probation-label" style={{ margin: 0 }}>Durée restante de votre période probatoire</p>
        </div>
        <p className="probation-timer">
          {time.months}mois {time.days}jours {pad(time.hours)}h {pad(time.minutes)}min {pad(time.seconds)}sec
        </p>
      </div>
    </div>
  );
}

export default Statistics;
