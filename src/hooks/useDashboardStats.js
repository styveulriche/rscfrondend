import { useCallback, useMemo } from 'react';
import { useRealtimeResource } from './useRealtimeResource';
import { REALTIME_INTERVALS } from '../config/realtime';
import { paymentsStats } from '../services/paiements';
import { countByUser as countAyantsByUser } from '../services/ayantsDroit';
import { listParrainagesByParrain } from '../services/parrainages';

const DEFAULT_STATS = Object.freeze({
  balance: 0,
  donationsTotal: 0,
  donationsCount: 0,
  ayantsCount: 0,
  parrainagesCount: 0,
});

const normalizeNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
};

export function useDashboardStats(userId) {
  const fetcher = useCallback(async () => {
    if (!userId) return DEFAULT_STATS;

    const [paymentsResult, ayantsResult, parrainagesResult] = await Promise.allSettled([
      paymentsStats({ utilisateurId: userId }),
      countAyantsByUser(userId),
      listParrainagesByParrain(userId, { page: 0, size: 1, sort: 'createdAt,desc' }),
    ]);

    const payments = paymentsResult.status === 'fulfilled' ? paymentsResult.value : null;
    const ayants = ayantsResult.status === 'fulfilled' ? ayantsResult.value : null;
    const parrainages = parrainagesResult.status === 'fulfilled' ? parrainagesResult.value : null;

    const balance = normalizeNumber(
      payments?.soldeActuel ?? payments?.currentBalance ?? payments?.balance ?? payments?.solde,
      0,
    );
    const donationsTotal = normalizeNumber(
      payments?.montantTotal ?? payments?.totalAmount ?? payments?.montant ?? payments?.total,
      0,
    );
    const donationsCount = normalizeNumber(
      payments?.nombreTransactions ?? payments?.transactions ?? payments?.count ?? payments?.totalTransactions,
      0,
    );

    const ayantsCount = normalizeNumber(
      ayants?.count ?? ayants?.total ?? ayants,
      0,
    );

    let parrainagesCount = 0;
    if (parrainages) {
      if (Array.isArray(parrainages)) {
        parrainagesCount = parrainages.length;
      } else if (typeof parrainages === 'object') {
        parrainagesCount = normalizeNumber(
          parrainages.totalElements ?? parrainages.total ?? parrainages.count ?? parrainages.size,
          Array.isArray(parrainages.content) ? parrainages.content.length : 0,
        );
      } else {
        parrainagesCount = normalizeNumber(parrainages, 0);
      }
    }

    return {
      balance,
      donationsTotal,
      donationsCount,
      ayantsCount,
      parrainagesCount,
    };
  }, [userId]);

  const resource = useRealtimeResource(
    `dashboard-stats-${userId || 'guest'}`,
    fetcher,
    {
      enabled: Boolean(userId),
      immediate: Boolean(userId),
      interval: REALTIME_INTERVALS.dashboardStats,
    },
  );

  return useMemo(() => ({
    ...resource,
    data: resource.data || DEFAULT_STATS,
  }), [resource]);
}
