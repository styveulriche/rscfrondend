import api from './api';

// ── Utilisateur ───────────────────────────────────────────────

/**
 * Mes cotisations — GET /cotisations/mes-cotisations
 * Liste paginée du plus récent au plus ancien.
 */
export async function mesCotisations(params = {}) {
  const r = await api.get('/cotisations/mes-cotisations', { params });
  return r.data;
}

/**
 * Résumé de mes cotisations — GET /cotisations/mes-cotisations/total
 * { totalCotisations, nombreCotisations, ... }
 */
export async function mesCotisationsTotal() {
  const r = await api.get('/cotisations/mes-cotisations/total');
  return r.data;
}

/**
 * Payer une cotisation — POST /cotisations/payer
 * Débite le montant sur le solde du portefeuille.
 * { montant, type, periodeCoverte?, notes? }
 */
export async function payerCotisation({ montant, type, periodeCoverte, notes }) {
  const payload = { montant, type };
  if (periodeCoverte) payload.periodeCoverte = periodeCoverte;
  if (notes) payload.notes = notes;
  const r = await api.post('/cotisations/payer', payload);
  return r.data;
}

// ── Admin ─────────────────────────────────────────────────────

/**
 * Toutes les cotisations — GET /cotisations/admin/toutes
 * Filtres optionnels statut/type, paginé.
 */
export async function allCotisations({ statut, type, page = 0, size = 20 } = {}) {
  const params = { page, size };
  if (statut) params.statut = statut;
  if (type) params.type = type;
  const r = await api.get('/cotisations/admin/toutes', { params });
  return r.data;
}

/**
 * Statistiques globales — GET /cotisations/admin/stats
 * { totalCotisations, nombreCotisations, cotisants, moyenneCotisation, ... }
 */
export async function cotisationsStats() {
  const r = await api.get('/cotisations/admin/stats');
  return r.data;
}

export async function getAbonnementAnnuel() {
  const r = await api.get('/cotisations/abonnement-annuel', {
    params: { _t: Date.now() },
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });
  return r.data;
}
