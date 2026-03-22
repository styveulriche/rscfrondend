import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRealtimeResource } from './useRealtimeResource';
import { REALTIME_INTERVALS } from '../config/realtime';
import {
  listMyPaiements,
  totalByDossier,
  createPaymentIntent,
  confirmPayment,
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
  // Utilise GET /paiements/mes-paiements (pas besoin de l'userId en paramètre)
  const fetcher = useCallback(() => listMyPaiements(), []);

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
        } catch {
          dossierTotal = null;
        }
      }
      setDossierState({
        id,
        label,
        loading: false,
        error: null, // pas d'erreur si aucun dossier — c'est normal pour un nouvel utilisateur
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

/**
 * Flux Stripe PaymentIntent en deux étapes :
 *   Étape 1 — createPaymentIntent  → retourne { clientSecret, paymentIntentId }
 *   Étape 2 — confirmPayment       → enregistre le paiement en base
 *
 * Utilisation :
 *   const { paymentIntentId } = await initStripePayment({ amount, dossierId, description });
 *   // … Stripe.js confirme le paiement côté client avec le clientSecret …
 *   const receipt = await finalizeStripePayment({ paymentIntentId, dossierId });
 */
export async function initStripePayment({ amount, dossierId, description = 'Recharge RSC' }) {
  if (!amount || amount <= 0) throw new Error('Montant invalide.');

  const data = await createPaymentIntent({
    montant: Number(amount),
    dossierId,
    description,
  });

  return {
    clientSecret: data.clientSecret,
    paymentIntentId: data.paymentIntentId,
    montant: data.montant,
    devise: data.devise,
  };
}

export async function finalizeStripePayment({ paymentIntentId, dossierId }) {
  if (!paymentIntentId) throw new Error('paymentIntentId manquant.');

  const receipt = await confirmPayment({ paymentIntentId, dossierId });
  return receipt; // { id, montant, statut, reçuURL, referenceTransaction, … }
}
