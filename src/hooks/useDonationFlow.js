import { useCallback, useState } from 'react';
import { createDon } from '../services/dons';

export function useDonationFlow(userId) {
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submitDonation = useCallback(async ({ amount, message, campagne }) => {
    if (!userId) throw new Error('Veuillez vous authentifier à nouveau.');
    if (!amount || amount <= 0) throw new Error('Montant invalide.');

    setSubmitting(true);
    setStatus(null);
    try {
      const receipt = await createDon({
        montant: Number(amount),
        message: message || undefined,
        campagne: campagne || undefined,
      });

      const ref = receipt?.referenceTransaction || receipt?.id;
      setStatus({
        type: 'success',
        message: `Don de ${amount} $ effectué depuis votre portefeuille${ref ? ` (${ref})` : ''}.`,
      });
      return receipt;
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Impossible d\'effectuer le don.';
      setStatus({ type: 'error', message });
      throw new Error(message);
    } finally {
      setSubmitting(false);
    }
  }, [userId]);

  const resetStatus = useCallback(() => setStatus(null), []);

  return { status, submitting, submitDonation, resetStatus };
}
