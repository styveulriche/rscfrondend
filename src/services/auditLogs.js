import api from './api';

export async function listAuditLogs(params) {
  // params: { page, size, sort, ... }
  const r = await api.get('/admin/audit-logs', { params });
  return r.data;
}

export async function auditLogsByUser(userId, debut, fin, page = 0, size = 30) {
  const r = await api.get(`/admin/audit-logs/utilisateur/${userId}`, {
    params: { debut, fin, page, size, sort: 'dateAction,desc' },
  });
  return r.data;
}

export async function auditLogsByType(type) {
  // type: CONNEXION | PAIEMENT | ...
  const r = await api.get(`/admin/audit-logs/type/${type}`);
  return r.data;
}

export async function auditStatsTypes() {
  const r = await api.get('/admin/audit-logs/stats/types');
  return r.data;
}

export async function auditStatsJours(debut, fin) {
  const r = await api.get('/admin/audit-logs/stats/jours', {
    params: { debut, fin },
  });
  return r.data;
}
