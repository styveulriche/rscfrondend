import { useCallback, useEffect, useMemo } from 'react';
import { useRealtimeResource } from './useRealtimeResource';
import { REALTIME_INTERVALS } from '../config/realtime';
import { myTotal } from '../services/paiements';
import { mesDonsTotal } from '../services/dons';
import { mesCotisationsTotal } from '../services/cotisations';
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

const extractNum = (obj) => {
  if (!obj) return 0;
  if (typeof obj === 'number') return obj;
  const v = obj.totalDons ?? obj.total ?? obj.montant ?? obj.montantTotal
    ?? obj.totalPaiements ?? obj.totalEncaisse
    ?? Object.values(obj).find((x) => typeof x === 'number');
  return Number.isFinite(Number(v)) ? Number(v) : 0;
};

const extractCount = (obj) => {
  if (!obj) return 0;
  if (typeof obj === 'number') return obj;
  const v = obj.nombreDons ?? obj.count ?? obj.nombre ?? obj.nbr
    ?? Object.values(obj).filter((x) => typeof x === 'number')[1];
  return Number.isFinite(Number(v)) ? Number(v) : 0;
};

export function useDashboardStats(userId) {
  const fetcher = useCallback(async () => {
    if (!userId) return DEFAULT_STATS;

    const [totalResult, donsResult, cotisationsResult, ayantsResult, parrainagesResult] = await Promise.allSettled([
      myTotal(),
      mesDonsTotal(),
      mesCotisationsTotal(),
      countAyantsByUser(userId),
      listParrainagesByParrain(userId, { page: 0, size: 1, sort: 'createdAt,desc' }),
    ]);

    const totalData      = totalResult.status      === 'fulfilled' ? totalResult.value      : null;
    const donsData       = donsResult.status       === 'fulfilled' ? donsResult.value       : null;
    const cotisData      = cotisationsResult.status === 'fulfilled' ? cotisationsResult.value : null;
    const ayants         = ayantsResult.status     === 'fulfilled' ? ayantsResult.value     : null;
    const parrainages    = parrainagesResult.status === 'fulfilled' ? parrainagesResult.value : null;

    const received       = extractNum(totalData);
    const donationsTotal = extractNum(donsData);
    const donationsCount = extractCount(donsData);
    const cotisations    = cotisData
      ? (cotisData.totalCotisations ?? extractNum(cotisData))
      : 0;

    // Solde net = total reçu − total dons − total cotisations (min 0)
    const balance = Math.max(0, received - donationsTotal - cotisations);

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

    return { balance, donationsTotal, donationsCount, ayantsCount, parrainagesCount };
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

  // Écoute l'événement global déclenché après chaque débit pour forcer un refresh immédiat
  useEffect(() => {
    const handler = () => resource.refresh();
    window.addEventListener('rsc:stats-refresh', handler);
    return () => window.removeEventListener('rsc:stats-refresh', handler);
  }, [resource.refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(() => ({
    ...resource,
    data: resource.data || DEFAULT_STATS,
  }), [resource]);
}
