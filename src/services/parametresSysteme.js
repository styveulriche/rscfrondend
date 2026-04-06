import api from './api';

// ── CRUD ─────────────────────────────────────────────────────────

export async function createParametre(modifiePar, payload) {
  // payload: { cle, valeur, description, categorie, type, publicAccess }
  const r = await api.post('/parametres', payload, { params: { modifiePar } });
  return r.data;
}

export async function updateParametre(id, modifiePar, payload) {
  const r = await api.put(`/parametres/${id}`, payload, { params: { modifiePar } });
  return r.data;
}

export async function getParametre(id) {
  const r = await api.get(`/parametres/${id}`);
  return r.data;
}

export async function getParametreByCle(cle) {
  const r = await api.get(`/parametres/cle/${cle}`);
  return r.data;
}

export async function listParametres() {
  const r = await api.get('/parametres');
  return r.data;
}

export async function listParametresByCategorie(categorie) {
  const r = await api.get(`/parametres/categorie/${categorie}`);
  return r.data;
}

export async function patchValeur(cle, valeur, modifiePar) {
  const r = await api.patch(`/parametres/cle/${cle}/valeur`, null, {
    params: { valeur, modifiePar },
  });
  return r.data;
}

export async function deleteParametre(id) {
  const r = await api.delete(`/parametres/${id}`);
  return r.data;
}
