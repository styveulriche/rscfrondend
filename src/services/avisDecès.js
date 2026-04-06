import api from './api';

// ── Avis de décès (admin) ────────────────────────────────────────

export async function createAvis(declarationId, adminId, payload) {
  // payload: { nomDefunt, prenomDefunt, dateNaissance, dateDeces, lieuDeces, pays, photoUrl, contenuHtml, estPublic }
  const r = await api.post(`/declarations/${declarationId}/affichage`, payload, {
    params: { adminId },
  });
  return r.data;
}

export async function updateAvis(declarationId, adminId, payload) {
  const r = await api.put(`/declarations/${declarationId}/affichage`, payload, {
    params: { adminId },
  });
  return r.data;
}

export async function getAvis(declarationId) {
  const r = await api.get(`/declarations/${declarationId}/affichage`);
  return r.data;
}

export async function getAvisPdf(declarationId) {
  const r = await api.get(`/declarations/${declarationId}/affichage/pdf`, {
    responseType: 'blob',
  });
  return r.data; // Blob
}

export async function publierAvis(declarationId) {
  const r = await api.put(`/declarations/${declarationId}/affichage/publier`);
  return r.data;
}

export async function depublierAvis(declarationId) {
  const r = await api.put(`/declarations/${declarationId}/affichage/depublier`);
  return r.data;
}

export async function deleteAvis(declarationId) {
  const r = await api.delete(`/declarations/${declarationId}/affichage`);
  return r.data;
}

// ── Liens publics (sans auth) ────────────────────────────────────

export async function getAvisPublic(token) {
  const r = await api.get(`/public/avis/${token}`, { skipAuth: true });
  return r.data;
}

export async function getAvisPublicPdf(token) {
  const r = await api.get(`/public/avis/${token}/pdf`, {
    skipAuth: true,
    responseType: 'blob',
  });
  return r.data; // Blob
}
