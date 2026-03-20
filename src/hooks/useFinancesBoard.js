import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRealtimeResource } from './useRealtimeResource';
import { REALTIME_INTERVALS } from '../config/realtime';
import {
  listPaiementsByUser,
  totalByDossier,
  paiementByReference,
  initCheckoutSession,
  createPaiement,
} from '../services/paiements';
import { listByUser as listDossiersByUser } from '../services/dossiers';

const normalizeTransactions = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const extractDossier = (payload) => {
  if (!payload) return null;
  if (Array.isArray(payload) && payload.length > 0) return payload[0];
  if (Array.isArray(payload?.content) && payload.content.length > 0) return payload.content[0];
  if (payload?.id || payload?.dossierId || payload?.dossierRapatriementId) return payload;
  return null;
};

export function useFinancesBoard(userId) {
  const fetcher = useCallback(() => {
    if (!userId) return [];
    return listPaiementsByUser(userId);
  }, [userId]);

  const paymentsResource = useRealtimeResource(
    `paiements-${userId || 'guest'}`,
    fetcher,
    {
      enabled: Boolean(userId),
      immediate: Boolean(userId),
      interval: REALTIME_INTERVALS.paiements,
    },
  );

  const [dossierState, setDossierState] = useState({
    id: null,
    label: null,
    loading: false,
    error: null,
    total: null,
  });

  const resolveLatestDossier = useCallback(async () => {
    if (!userId) {
      setDossierState({ id: null, label: null, loading: false, error: null, total: null });
      return null;
    }
    setDossierState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await listDossiersByUser(userId, { size: 1, sort: 'updatedAt,desc' });
      const dossier = extractDossier(response);
      const id = dossier?.id || dossier?.dossierId || dossier?.dossierRapatriementId || null;
      const label = dossier?.code || dossier?.reference || id;
      let dossierTotal = null;
      if (id) {
        try {
          const totalResponse = await totalByDossier(id);
          dossierTotal = totalResponse?.montant ?? totalResponse?.total ?? totalResponse ?? null;
        } catch (err) {
          dossierTotal = null;
        }
      }
      setDossierState({
        id,
        label,
        loading: false,
        error: id ? null : 'Aucun dossier actif n\'a été trouvé.',
        total: dossierTotal,
      });
      return id;
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Impossible de récupérer votre dossier.';
      setDossierState({ id: null, label: null, loading: false, error: message, total: null });
      return null;
    }
  }, [userId]);

  useEffect(() => {
    resolveLatestDossier();
  }, [resolveLatestDossier]);

  const transactions = useMemo(
    () => normalizeTransactions(paymentsResource.data),
    [paymentsResource.data],
  );

  return {
    transactions,
    loading: paymentsResource.loading,
    error: paymentsResource.error,
    lastUpdated: paymentsResource.lastUpdated,
    refreshTransactions: paymentsResource.refresh,
    dossier: dossierState,
    refreshDossier: resolveLatestDossier,
  };
}

export async function submitStripeTopup({ utilisateurId, dossierId, amount, stripeToken }) {
  if (!utilisateurId) {
    throw new Error('Utilisateur non identifié.');
  }
  if (!dossierId) {
    throw new Error('Aucun dossier actif.');
  }
  if (!amount || amount <= 0) {
    throw new Error('Montant invalide.');
  }
  if (!stripeToken) {
    throw new Error('Jeton Stripe manquant.');
  }

  const checkoutMeta = await initCheckoutSession({ utilisateurId, dossierId, montant: amount });
  const derivedReference = checkoutMeta?.reference
    || checkoutMeta?.sessionId
    || checkoutMeta?.id
    || checkoutMeta?.code
    || `CHK-${Date.now().toString().slice(-6)}`;

  await createPaiement(
    { utilisateurId, dossierId, reference: derivedReference },
    {
      montant: amount,
      modePaiement: 'STRIPE',
      stripeToken,
      reference: derivedReference,
      metadata: {
        canal: 'STRIPE',
        checkout: checkoutMeta,
      },
    },
  );

  let verification = null;
  try {
    verification = await paiementByReference(derivedReference);
  } catch (err) {
    verification = null;
  }

  return {
    reference: derivedReference,
    checkout: checkoutMeta,
    verification,
  };
}
