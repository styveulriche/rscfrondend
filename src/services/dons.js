import api from './api';

// ── Utilisateur ───────────────────────────────────────────────

/**
 * Effectuer un don — POST /dons
 * Débite le montant sur le solde du compte et enregistre le don.
 * { montant, message?, campagne? }
 */
export async function createDon({ montant, message, campagne }) {
  const r = await api.post('/dons', { montant, message, campagne });
  return r.data;
}

/**
 * Mes dons — GET /dons/mes-dons
 * Liste paginée du plus récent au plus ancien.
 */
export async function listMesDons(params = {}) {
  const r = await api.get('/dons/mes-dons', { params });
  return r.data;
}

/**
 * Résumé de mes dons — GET /dons/mes-dons/total
 * { totalDons, nombreDons, ... }
 */
export async function mesDonsTotal() {
  const r = await api.get('/dons/mes-dons/total');
  return r.data;
}

// ── Admin ─────────────────────────────────────────────────────

/**
 * Tous les dons — GET /dons/admin/tous
 * Filtre optionnel par statut, paginé.
 */
export async function listAllDons({ statut, page = 0, size = 20 } = {}) {
  const params = { page, size };
  if (statut) params.statut = statut;
  const r = await api.get('/dons/admin/tous', { params });
  return r.data;
}

/**
 * Statistiques globales des dons — GET /dons/admin/stats
 * { totalDons, nombreDons, donateurs, moyenneDon, ... }
 */
export async function donsStats() {
  const r = await api.get('/dons/admin/stats');
  return r.data;
}
