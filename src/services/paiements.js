import api from './api';

// ── Lecture ──────────────────────────────────────────────────

/** Détail d'un paiement — GET /paiements/{id} */
export async function getPaiement(id) {
  const r = await api.get(`/paiements/${id}`);
  return r.data;
}

/** Paiements de l'utilisateur connecté — GET /paiements/mes-paiements */
export async function listMyPaiements() {
  const r = await api.get('/paiements/mes-paiements');
  return r.data;
}

/** Tous les paiements (admin) — GET /paiements/admin/tous */
export async function listAllPaiements({ page = 0, size = 1000 } = {}) {
  const r = await api.get('/paiements/admin/tous', { params: { page, size } });
  return r.data;
}

/** Total encaissé de l'utilisateur connecté — GET /paiements/mes-paiements/total */
export async function myTotal() {
  const r = await api.get('/paiements/mes-paiements/total');
  return r.data;
}

/** Paiements d'un dossier — GET /paiements/dossier/{dossierId} */
export async function listPaiementsByDossier(dossierId) {
  const r = await api.get(`/paiements/dossier/${dossierId}`);
  return r.data;
}

/** Paiements d'un utilisateur (admin) — GET /paiements/utilisateur/{utilisateurId} */
export async function listPaiementsByUser(utilisateurId) {
  const r = await api.get(`/paiements/utilisateur/${utilisateurId}`);
  return r.data;
}

/** Total encaissé par utilisateur (admin) — GET /paiements/utilisateur/{utilisateurId}/total */
export async function totalByUser(utilisateurId) {
  const r = await api.get(`/paiements/utilisateur/${utilisateurId}/total`);
  return r.data;
}

/** Total payé pour un dossier — GET /paiements/total/dossier/{dossierId} */
export async function totalByDossier(dossierId) {
  const r = await api.get(`/paiements/total/dossier/${dossierId}`);
  return r.data;
}

/** Statistiques globales — GET /paiements/stats */
export async function paymentsStats() {
  const r = await api.get('/paiements/stats');
  return r.data;
}

/** Statistiques par période — GET /paiements/stats/periode */
export async function paymentsStatsPeriod({ debut, fin }) {
  const r = await api.get('/paiements/stats/periode', { params: { debut, fin } });
  return r.data;
}

/** Recherche par référence — GET /paiements/reference */
export async function paiementByReference(reference) {
  const r = await api.get('/paiements/reference', { params: { reference } });
  return r.data;
}

// ── Paiement direct depuis le portefeuille ───────────────────

/**
 * Don / débit direct depuis le portefeuille de l'utilisateur
 * POST /paiements/portefeuille
 * { montant, dossierId?, description }
 */
export async function walletPayment({ montant, dossierId, description }) {
  const payload = { montant, description };
  if (dossierId) payload.dossierId = dossierId;
  const r = await api.post('/paiements/portefeuille', payload);
  return r.data;
}

// ── Flux Stripe PaymentIntent ────────────────────────────────

/**
 * Étape 1 — Créer un PaymentIntent
 * POST /paiements/payment-intent
 */
export async function createPaymentIntent({ montant, dossierId, description }) {
  const payload = { montant, description };
  if (dossierId) payload.dossierId = dossierId;
  const r = await api.post('/paiements/payment-intent', payload);
  return r.data;
}

/**
 * Étape 2 — Confirmer et enregistrer le paiement
 * POST /paiements/confirmer
 */
export async function confirmPayment({ paymentIntentId, dossierId }) {
  const payload = { paymentIntentId };
  if (dossierId) payload.dossierId = dossierId;
  const r = await api.post('/paiements/confirmer', payload);
  return r.data;
}

// ── Webhook ──────────────────────────────────────────────────

export async function webhook(payload) {
  const r = await api.post('/paiements/webhook', payload);
  return r.data;
}
