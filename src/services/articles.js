import api from './api';

/* ── Public (sans auth) ──────────────────────────────────────── */

/** Liste paginée des articles publiés — GET /public/articles */
export async function listArticles(params) {
  const r = await api.get('/public/articles', { params });
  return r.data;
}

/** 5 derniers articles publiés — GET /public/articles/derniers */
export async function listDerniersArticles() {
  const r = await api.get('/public/articles/derniers');
  return r.data;
}

/** Détail d'un article (incrémente nbVues) — GET /public/articles/{id} */
export async function getArticle(id) {
  const r = await api.get(`/public/articles/${id}`);
  return r.data;
}

/* ── Admin (Bearer requis) ───────────────────────────────────── */

/** Tous les articles (brouillons + publiés + archivés) — GET /admin/articles */
export async function listAdminArticles(params) {
  const r = await api.get('/admin/articles', { params });
  return r.data;
}

/**
 * Créer un article — POST /admin/articles (multipart/form-data)
 * payload : { titre, contenu?, resume?, categorie?, image?: File }
 */
export async function createArticle(payload) {
  const form = new FormData();
  form.append('titre', payload.titre);
  if (payload.contenu)   form.append('contenu',   payload.contenu);
  if (payload.resume)    form.append('resume',     payload.resume);
  if (payload.categorie) form.append('categorie',  payload.categorie);
  if (payload.image instanceof File) form.append('image', payload.image);
  const r = await api.post('/admin/articles', form);
  return r.data;
}

/**
 * Modifier un article — PUT /admin/articles/{id} (multipart/form-data)
 * Tous les champs sont optionnels.
 */
export async function updateArticle(id, payload) {
  const form = new FormData();
  if (payload.titre     !== undefined) form.append('titre',     payload.titre);
  if (payload.contenu   !== undefined) form.append('contenu',   payload.contenu);
  if (payload.resume    !== undefined) form.append('resume',    payload.resume);
  if (payload.categorie !== undefined) form.append('categorie', payload.categorie);
  if (payload.image instanceof File)   form.append('image',     payload.image);
  const r = await api.put(`/admin/articles/${id}`, form);
  return r.data;
}

/** Publier un article — PATCH /admin/articles/{id}/publier */
export async function publishArticle(id) {
  const r = await api.patch(`/admin/articles/${id}/publier`);
  return r.data;
}

/** Archiver un article — PATCH /admin/articles/{id}/archiver */
export async function archiveArticle(id) {
  const r = await api.patch(`/admin/articles/${id}/archiver`);
  return r.data;
}

/** Supprimer un article + image — DELETE /admin/articles/{id} */
export async function deleteArticle(id) {
  const r = await api.delete(`/admin/articles/${id}`);
  return r.data;
}
