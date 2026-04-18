import api from './api';

// ── Public ────────────────────────────────────────────────────

/** Partenaires actifs (sans auth) — GET /admin/partenaires/public */
export async function listPartenairesPublic() {
  const r = await api.get('/admin/partenaires/public');
  return r.data;
}

// ── Admin (SUPER_ADMIN) ───────────────────────────────────────

/** Tous les partenaires — GET /admin/partenaires */
export async function listPartenaires() {
  const r = await api.get('/admin/partenaires');
  return r.data;
}

/** Détail d'un partenaire — GET /admin/partenaires/{id} */
export async function getPartenaire(id) {
  const r = await api.get(`/admin/partenaires/${id}`);
  return r.data;
}

/**
 * Créer un partenaire — POST /admin/partenaires
 * Multipart : nom (required), description (optional), logo (optional File)
 */
export async function createPartenaire({ nom, description, logo }) {
  const form = new FormData();
  form.append('nom', nom);
  if (description) form.append('description', description);
  if (logo) form.append('logo', logo);
  const r = await api.post('/admin/partenaires', form);
  return r.data;
}

/**
 * Modifier un partenaire — PUT /admin/partenaires/{id}
 * Multipart : nom? , description?, logo?
 */
export async function updatePartenaire(id, { nom, description, logo } = {}) {
  const form = new FormData();
  if (nom !== undefined) form.append('nom', nom);
  if (description !== undefined) form.append('description', description);
  if (logo) form.append('logo', logo);
  const r = await api.put(`/admin/partenaires/${id}`, form);
  return r.data;
}

/** Supprimer un partenaire — DELETE /admin/partenaires/{id} */
export async function deletePartenaire(id) {
  await api.delete(`/admin/partenaires/${id}`);
}
