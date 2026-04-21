import api from './api';

// ── CRUD ─────────────────────────────────────────────────────────

export async function createAide(payload) {
  // payload: { dossierRapatriementId, montantAccorde, dateAccord, description, approuveParId }
  const r = await api.post('/aides-financieres', payload);
  return r.data;
}

export async function getAide(id) {
  const r = await api.get(`/aides-financieres/${id}`);
  return r.data;
}

export async function deleteAide(id) {
  const r = await api.delete(`/aides-financieres/${id}`);
  return r.data;
}

// ── Listes ───────────────────────────────────────────────────────

export async function getAidesByDossier(dossierId) {
  const r = await api.get(`/aides-financieres/dossier/${dossierId}`);
  return r.data;
}

export async function getAidesEnAttente() {
  const r = await api.get('/aides-financieres/en-attente');
  return r.data;
}

export async function getAidesByStatut(statut) {
  // statut: EN_ATTENTE | APPROUVE | REFUSE | VERSE
  const r = await api.get(`/aides-financieres/statut/${statut}`);
  return r.data;
}

// ── Workflow ─────────────────────────────────────────────────────

export async function approuverAide(id, commentaire) {
  const r = await api.put(`/aides-financieres/${id}/approuver`, commentaire ? { commentaire } : {});
  return r.data;
}

export async function refuserAide(id, motif) {
  const r = await api.put(`/aides-financieres/${id}/refuser`, null, {
    params: { motif },
  });
  return r.data;
}

export async function marquerVersee(id) {
  const r = await api.put(`/aides-financieres/${id}/marquer-versee`);
  return r.data;
}
