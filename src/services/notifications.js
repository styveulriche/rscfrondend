import api from './api';

export async function listNotificationsByUser(utilisateurId, params) {
  const res = await api.get(`/notifications/utilisateur/${utilisateurId}`, { params });
  return res.data;
}

export async function markNotificationRead(id) {
  const res = await api.post(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsRead(utilisateurId) {
  const res = await api.post(`/notifications/utilisateur/${utilisateurId}/mark-all-read`);
  return res.data;
}
