import api from './api';

export async function listArticles(params) {
  const r = await api.get('/articles', { params });
  return r.data;
}

export async function getArticle(id) {
  const r = await api.get(`/articles/${id}`);
  return r.data;
}

export async function createArticle(payload) {
  const r = await api.post('/articles', payload);
  return r.data;
}

export async function updateArticle(id, payload) {
  const r = await api.put(`/articles/${id}`, payload);
  return r.data;
}

export async function deleteArticle(id) {
  const r = await api.delete(`/articles/${id}`);
  return r.data;
}

export async function publishArticle(id) {
  const r = await api.put(`/articles/${id}/publier`);
  return r.data;
}
