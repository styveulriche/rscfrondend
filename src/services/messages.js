import api from './api';

// ── Endpoints utilisateur ────────────────────────────────────

export async function createSupportTicket(payload) {
  const res = await api.post('/messages-support', payload);
  return res.data;
}

export async function listMyTickets(params) {
  const res = await api.get('/messages-support', { params });
  return res.data;
}

export async function getMyTicketDetail(id) {
  const res = await api.get(`/messages-support/${id}`);
  return res.data;
}

export async function replyToMyTicket(id, contenu) {
  const res = await api.post(`/messages-support/${id}/repondre`, { contenu });
  return res.data;
}

// ── Endpoints admin ──────────────────────────────────────────

export async function listAllTickets(params) {
  const res = await api.get('/admin/messages-support', { params });
  return res.data;
}

export async function getTicketDetail(id) {
  const res = await api.get(`/admin/messages-support/${id}`);
  return res.data;
}

export async function updateTicketStatus(id, statut) {
  const res = await api.patch(`/admin/messages-support/${id}/statut`, { statut });
  return res.data;
}

export async function assignTicket(id, adminId) {
  const res = await api.patch(`/admin/messages-support/${id}/assigner`, { adminId });
  return res.data;
}

export async function adminReplyToTicket(id, contenu) {
  const res = await api.post(`/admin/messages-support/${id}/repondre`, { contenu });
  return res.data;
}
