import { useCallback, useState } from 'react';
import { createPaiement, paiementByReference } from '../services/paiements';

export function useDonationFlow(userId) {
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submitDonation = useCallback(async ({ amount, account, reference }) => {
    if (!userId) {
      throw new Error('Veuillez vous authentifier à nouveau.');
    }
    if (!amount || amount <= 0) {
      throw new Error('Montant invalide.');
    }
    if (!account) {
      throw new Error('Compte Skipe requis.');
    }

    const resolvedReference = reference || `DON-${Date.now().toString().slice(-6)}`;

    setSubmitting(true);
    setStatus(null);
    try {
      await createPaiement(
        { utilisateurId: userId, canal: 'SKIPE', reference: resolvedReference },
        {
          montant: Number(amount),
          modePaiement: 'SKIPE',
          reference: resolvedReference,
          compteSource: account,
          devise: 'CAD',
          description: 'Don via le tableau de bord',
          metadata: { source: 'dashboard', canal: 'SKIPE' },
        },
      );

      let verification = null;
      try {
        verification = await paiementByReference(resolvedReference);
      } catch (err) {
        verification = null;
      }

      const message = verification
        ? `Don de ${amount} $ confirmé (${resolvedReference}).`
        : `Don de ${amount} $ enregistré (${resolvedReference}).`;
      setStatus({ type: 'success', message });

      return { reference: resolvedReference, verification };
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Impossible de créer le paiement.';
      setStatus({ type: 'error', message });
      throw new Error(message);
    } finally {
      setSubmitting(false);
    }
  }, [userId]);

  const resetStatus = useCallback(() => setStatus(null), []);

  return {
    status,
    submitting,
    submitDonation,
    resetStatus,
  };
}
