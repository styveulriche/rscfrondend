import api from './api';

// GET /notifications
export async function listNotifications(params) {
  const res = await api.get('/notifications', { params });
  return res.data;
}

// GET /notifications/{id}
export async function getNotification(id) {
  const res = await api.get(`/notifications/${id}`);
  return res.data;
}

// GET /notifications/non-lues/compte
export async function getUnreadCount() {
  const res = await api.get('/notifications/non-lues/compte');
  return res.data;
}

// PATCH /notifications/{id}/lire
export async function markNotificationRead(id) {
  await api.patch(`/notifications/${id}/lire`);
}

// PATCH /notifications/tout-lire
export async function markAllNotificationsRead() {
  await api.patch('/notifications/tout-lire');
}

// DELETE /notifications/{id}
export async function deleteNotification(id) {
  await api.delete(`/notifications/${id}`);
}

// POST /admin/notifications/previsualiser-destinataires
export async function previewNotificationRecipients(filters) {
  const res = await api.post('/admin/notifications/previsualiser-destinataires', filters);
  return res.data;
}

// POST /admin/notifications/envoyer
export async function sendNotification(payload) {
  const res = await api.post('/admin/notifications/envoyer', payload);
  return res.data;
}
