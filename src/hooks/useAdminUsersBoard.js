import { useCallback, useMemo, useState, useEffect } from 'react';
import { useRealtimeResource } from './useRealtimeResource';
import { REALTIME_INTERVALS } from '../config/realtime';
import {
  listUsers,
  usersStats,
  getEligibility,
  getProbationDays,
  updateUser,
  updateUserStatus,
} from '../services/users';

const DEFAULT_PAGE = Object.freeze({
  content: [],
  totalPages: 0,
  totalElements: 0,
  number: 0,
});

const DEFAULT_SUMMARY = Object.freeze({ total: 0, ELIGIBLE: 0, EN_ATTENTE: 0, NON_ELIGIBLE: 0 });

export const ELIGIBILITY_ORDER = ['ELIGIBLE', 'EN_ATTENTE', 'NON_ELIGIBLE'];

export const eligibilityBadge = {
  ELIGIBLE: { label: 'Éligible', color: '#2e7d32', bg: 'rgba(46,125,50,0.15)' },
  EN_ATTENTE: { label: 'En attente', color: '#f57c00', bg: 'rgba(245,124,0,0.15)' },
  NON_ELIGIBLE: { label: 'Non éligible', color: '#c62828', bg: 'rgba(198,40,40,0.15)' },
};

export const STATUS_LABELS = {
  ACTIF: 'Actif',
  EN_ATTENTE: 'En attente',
  SUSPENDU: 'Suspendu',
  INACTIF: 'Inactif',
};

const normalizePage = (payload) => {
  if (!payload) return DEFAULT_PAGE;
  if (Array.isArray(payload)) {
    return { content: payload, totalPages: 1, totalElements: payload.length, number: 0 };
  }
  return {
    content: Array.isArray(payload.content) ? payload.content : [],
    totalPages: payload.totalPages ?? 1,
    totalElements: payload.totalElements ?? payload.content?.length ?? 0,
    number: payload.number ?? 0,
  };
};

export const normalizeEligibility = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toUpperCase();
  return ELIGIBILITY_ORDER.includes(normalized) ? normalized : null;
};

const buildUserRecord = (user) => {
  const eligibilityExplicit = normalizeEligibility(
    user?.statutEligibilite || user?.eligibilite || user?.eligibilityStatus,
  );
  const secondaryScore = [
    user?.paysOrigine || user?.countryOfOrigin,
    user?.statutUtilisateur || user?.status,
    Array.isArray(user?.ayantsDroit) && user.ayantsDroit.length > 0,
    Array.isArray(user?.contactsSecondaires) && user.contactsSecondaires.length > 0,
    user?.adresse || user?.address,
  ].filter(Boolean).length;
  const computedEligibility = eligibilityExplicit
    || (secondaryScore >= 3 ? 'ELIGIBLE' : secondaryScore >= 1 ? 'EN_ATTENTE' : 'NON_ELIGIBLE');
  const ayantsCount = Array.isArray(user?.ayantsDroit) ? user.ayantsDroit.length : (user?.ayantsCount ?? 0);
  const parrainagesCount = user?.parrainagesCount ?? user?.nbParrainages ?? 0;
  const dossiersCount = Array.isArray(user?.dossiers) ? user.dossiers.length : (user?.dossiersCount ?? 0);
  const lastInteraction = user?.dernierAcces || user?.lastLogin || user?.updatedAt || null;
  const fullName = [user?.prenom || user?.firstName, user?.nom || user?.lastName || user?.name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    raw: user,
    id: user?.id,
    fullName: fullName || user?.email || 'Utilisateur',
    email: user?.email || '—',
    telephone: user?.telephone || user?.phone || '—',
    paysOrigine: user?.paysOrigine || user?.countryOfOrigin || '—',
    statutUtilisateur: user?.statutUtilisateur || user?.status || '—',
    statutCompte: user?.statutCompte || user?.statusCompte || 'ACTIF',
    eligibility: computedEligibility,
    secondaryComplete: secondaryScore >= 4,
    parrainagesCount,
    ayantsCount,
    dossiersCount,
    lastInteraction,
  };
};

const summarizeStats = (rows, statsPayload) => {
  if (statsPayload) {
    return {
      total: statsPayload.totalUtilisateurs ?? statsPayload.total ?? statsPayload.count ?? 0,
      ELIGIBLE: statsPayload.eligibles ?? statsPayload.totalEligibles ?? statsPayload.eligible ?? 0,
      EN_ATTENTE: statsPayload.enAttente ?? statsPayload.pending ?? 0,
      NON_ELIGIBLE: statsPayload.nonEligibles ?? statsPayload.ineligibles ?? 0,
    };
  }

  return rows.reduce((acc, row) => {
    acc.total += 1;
    acc[row.eligibility] = (acc[row.eligibility] || 0) + 1;
    return acc;
  }, { ...DEFAULT_SUMMARY });
};

export function useAdminUsersBoard({ page, size = 8, sort }) {
  const listFetcher = useCallback(() => listUsers({ page, size, sort }), [page, size, sort]);

  const listResource = useRealtimeResource(
    `admin-users-${page}-${size}-${sort}`,
    listFetcher,
    {
      enabled: true,
      immediate: true,
      interval: REALTIME_INTERVALS.default,
    },
  );

  const statsResource = useRealtimeResource(
    'admin-users-stats',
    usersStats,
    {
      enabled: true,
      immediate: true,
      interval: REALTIME_INTERVALS.dashboardStats,
    },
  );

  const pageData = useMemo(() => normalizePage(listResource.data), [listResource.data]);
  const rows = useMemo(() => pageData.content.map((user) => buildUserRecord(user)), [pageData.content]);
  const statsSummary = useMemo(
    () => summarizeStats(rows, statsResource.data),
    [rows, statsResource.data],
  );

  const refresh = useCallback(async () => {
    await Promise.all([listResource.refresh(), statsResource.refresh()]);
  }, [listResource.refresh, statsResource.refresh]);

  return {
    pageData,
    rows,
    loading: listResource.loading,
    error: listResource.error,
    lastUpdated: listResource.lastUpdated,
    refresh,
    statsSummary,
    rawStats: statsResource.data,
    statsError: statsResource.error,
  };
}

export function useEligibilityDetails(userId) {
  const [state, setState] = useState({
    loading: false,
    error: null,
    eligibility: null,
    probation: null,
    updatedAt: null,
  });

  const fetchDetails = useCallback(async () => {
    if (!userId) {
      setState({ loading: false, error: null, eligibility: null, probation: null, updatedAt: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [eligibilityResult, probationResult] = await Promise.allSettled([
        getEligibility(userId),
        getProbationDays(userId),
      ]);

      const eligibilityData = eligibilityResult.status === 'fulfilled' ? eligibilityResult.value : null;
      const probationData = probationResult.status === 'fulfilled' ? probationResult.value : null;

      setState({
        loading: false,
        error: null,
        eligibility: eligibilityData,
        probation: probationData,
        updatedAt: Date.now(),
      });
    } catch (err) {
      setState({ loading: false, error: err, eligibility: null, probation: null, updatedAt: Date.now() });
    }
  }, [userId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return { ...state, refresh: fetchDetails };
}

export async function applyEligibilityStatus(userId, nextStatus) {
  if (!userId) {
    throw new Error('Utilisateur introuvable.');
  }
  const payload = {
    statutEligibilite: nextStatus,
    eligibilite: nextStatus,
    statutCompte: nextStatus === 'ELIGIBLE'
      ? 'ACTIF'
      : nextStatus === 'EN_ATTENTE'
        ? 'EN_ATTENTE'
        : 'SUSPENDU',
  };
  return updateUser(userId, payload);
}

export async function suspendUserAccount(userId) {
  if (!userId) {
    throw new Error('Utilisateur introuvable.');
  }
  return updateUserStatus(userId, 'SUSPENDU');
}
