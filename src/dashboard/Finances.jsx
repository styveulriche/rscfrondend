import { useState } from 'react';
import { FaArrowDown, FaCalendarAlt, FaCreditCard } from 'react-icons/fa';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import { useFinancesBoard, submitStripeTopup } from '../hooks/useFinancesBoard';

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

function Finances() {
  const { user, refreshBalance } = useAuth();
  const [topupAmount, setTopupAmount] = useState('');
  const [stripeToken, setStripeToken] = useState('');
  const [topupStatus, setTopupStatus] = useState(null);
  const [topupLoading, setTopupLoading] = useState(false);
  const {
    transactions: items,
    loading,
    error,
    lastUpdated,
    refreshTransactions,
    dossier,
    refreshDossier,
  } = useFinancesBoard(user?.id);

  const handleStripeTopup = async (event) => {
    event.preventDefault();
    if (!user?.id) {
      setTopupStatus({ type: 'error', message: 'Veuillez vous reconnecter pour recharger votre solde.' });
      return;
    }
    if (!dossier?.id) {
      setTopupStatus({ type: 'error', message: 'Aucun dossier actif. Veuillez contacter le support.' });
      return;
    }
    const amountValue = Number(topupAmount);
    if (!amountValue || amountValue <= 0) {
      setTopupStatus({ type: 'error', message: 'Veuillez saisir un montant valide supérieur à 0 $.' });
      return;
    }
    const trimmedToken = stripeToken.trim();
    if (!trimmedToken) {
      setTopupStatus({ type: 'error', message: 'Le jeton Stripe est requis pour finaliser la recharge.' });
      return;
    }
    setTopupLoading(true);
    setTopupStatus(null);
    try {
      const result = await submitStripeTopup({
        utilisateurId: user.id,
        dossierId: dossier.id,
        amount: amountValue,
        stripeToken: trimmedToken,
      });
      setTopupAmount('');
      setStripeToken('');
      setTopupStatus({
        type: 'success',
        message: result?.reference
          ? `Recharge enregistrée (${result.reference}). Votre solde sera mis à jour sous peu.`
          : 'Recharge enregistrée avec succès. Votre solde sera mis à jour sous peu.',
      });
      await refreshTransactions();
      await refreshDossier();
      if (refreshBalance) await refreshBalance();
    } catch (err) {
      console.error('Erreur lors de la création du paiement Stripe', err?.response || err);
      const responseData = err?.response?.data;
      const serverMessage = typeof responseData === 'string'
        ? responseData
        : responseData?.message || responseData?.error || responseData?.details;
      const message = serverMessage || err?.message || 'Impossible d\'enregistrer la recharge Stripe.';
      setTopupStatus({ type: 'error', message });
    } finally {
      setTopupLoading(false);
    }
  };

  return (
    <div>
      <StatsRow />

      <div className="content-card" style={{ marginBottom: 24 }}>
        <h3 className="content-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaCreditCard size={16} color="var(--red-primary)" />
          Recharger mon solde via Stripe
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-gray)', marginBottom: 16 }}>
          Utilisez un paiement sécurisé Stripe pour ajouter des fonds à votre portefeuille RSC.
        </p>
        <form onSubmit={handleStripeTopup} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="donation-input"
            type="number"
            min="1"
            step="1"
            placeholder="Montant en $"
            value={topupAmount}
            onChange={(e) => setTopupAmount(e.target.value)}
            style={{ flex: '1 1 220px' }}
          />
          <input
            className="donation-input"
            type="text"
            placeholder="Jeton Stripe (ex: tok_xxx)"
            value={stripeToken}
            onChange={(e) => setStripeToken(e.target.value)}
            style={{ flex: '1 1 260px' }}
          />
          <button className="btn-donate" type="submit" disabled={topupLoading} style={{ flex: '0 0 auto', minWidth: 220 }}>
            {topupLoading ? 'Initialisation…' : 'Payer avec Stripe'}
          </button>
        </form>
        {dossier?.loading && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-gray)' }}>
            Recherche du dossier en cours…
          </div>
        )}
        {dossier?.error && (
          <div style={{
            marginTop: 12,
            fontSize: 13,
            borderRadius: 8,
            padding: '10px 12px',
            color: '#c62828',
            background: 'rgba(198,40,40,0.08)',
            border: '1px solid rgba(198,40,40,0.2)',
          }}>
            {dossier.error}
          </div>
        )}
        {dossier?.id && !dossier?.error && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-gray)' }}>
            Dossier sélectionné : <strong>{dossier.label || dossier.id}</strong>
            {typeof dossier.total === 'number' && (
              <span style={{ marginLeft: 8, fontSize: 12 }}>
                (Total reçu : {formatAmount(dossier.total)})
              </span>
            )}
          </div>
        )}
        {topupStatus && (
          <div
            style={{
              marginTop: 14,
              fontSize: 13,
              borderRadius: 8,
              padding: '10px 12px',
              color: topupStatus.type === 'error' ? '#c62828' : topupStatus.type === 'success' ? '#2e7d32' : 'var(--text-gray)',
              background: topupStatus.type === 'error'
                ? 'rgba(198,40,40,0.08)'
                : topupStatus.type === 'success'
                  ? 'rgba(46,125,50,0.1)'
                  : 'rgba(255,255,255,0.08)',
              border: topupStatus.type === 'error'
                ? '1px solid rgba(198,40,40,0.2)'
                : topupStatus.type === 'success'
                  ? '1px solid rgba(46,125,50,0.2)'
                  : '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {topupStatus.message}
          </div>
        )}
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

        {error && (
          <div style={{ color: 'var(--red-primary)', marginBottom: 12 }}>
            Impossible de récupérer les transactions.
          </div>
        )}

        {items.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-gray)' }}>
            Aucune transaction trouvée.
          </div>
        )}

        {items.map((t) => {
          const key = t.id || `${t.reference || ''}-${t.createdAt || t.date || Math.random()}`;
          const desc = t.description || t.libelle || t.label || t.modePaiement || 'Transaction';
          const amount = t.amount ?? t.montant ?? t.total ?? 0;
          return (
            <div className="transaction-item" key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <FaCalendarAlt size={12} color="var(--red-primary)" />
                  <p className="transaction-date" style={{ margin: 0 }}>{formatDate(t.date || t.createdAt)}</p>
                </div>
                <p className="transaction-desc">{desc}</p>
                {t.reference && (
                  <p style={{ fontSize: 12, color: 'var(--text-gray)', margin: '4px 0 0' }}>Référence : {t.reference}</p>
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

export default Finances;
