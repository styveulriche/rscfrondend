import api from './api';

export async function listMessagesByUser(utilisateurId, params) {
  const res = await api.get(`/messages/utilisateur/${utilisateurId}`, { params });
  return res.data;
}

export async function markMessageRead(id) {
  const res = await api.post(`/messages/${id}/read`);
  return res.data;
}
