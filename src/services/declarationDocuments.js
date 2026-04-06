import api from './api';

// ── Documents d'une déclaration ──────────────────────────────────

export async function addDocument(declarationId, payload) {
  // payload: { type, nomFichier, urlDocument, description }
  const r = await api.post(`/declarations/${declarationId}/documents`, payload);
  return r.data;
}

export async function listDocuments(declarationId) {
  const r = await api.get(`/declarations/${declarationId}/documents`);
  return r.data;
}

export async function deleteDocument(declarationId, documentId) {
  const r = await api.delete(`/declarations/${declarationId}/documents/${documentId}`);
  return r.data;
}

// ── Déclarant ────────────────────────────────────────────────────

export async function updateDeclarant(declarationId, payload) {
  // payload: { nom, prenom, email, lienAvecAssocie }
  const r = await api.put(`/declarations/${declarationId}/documents/declarant`, payload);
  return r.data;
}

export async function deleteDeclarant(declarationId) {
  const r = await api.delete(`/declarations/${declarationId}/documents/declarant`);
  return r.data;
}

// ── Workflow ─────────────────────────────────────────────────────

export async function soumettre(declarationId) {
  const r = await api.put(`/declarations/${declarationId}/documents/soumettre`);
  return r.data;
}

export async function demanderComplements(declarationId, message) {
  const r = await api.put(`/declarations/${declarationId}/documents/demander-complements`, null, {
    params: { message },
  });
  return r.data;
}
