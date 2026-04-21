import api from './api';

export async function getAdmin(id) {
	const r = await api.get(`/administrateurs/${id}`);
	return r.data;
}

export async function listAdmins(pageable) {
	const r = await api.get('/administrateurs', { params: pageable });
	return r.data;
}

export async function createAdmin(payload) {
	const r = await api.post('/administrateurs', payload);
	return r.data;
}

export async function updateAdmin(id, payload) {
	const r = await api.put(`/administrateurs/${id}`, payload);
	return r.data;
}

export async function deleteAdmin(id) {
	const r = await api.delete(`/administrateurs/${id}`);
	return r.data;
}

export async function hasPermission(id, permission) {
	const r = await api.get(`/administrateurs/${id}/has-permission`, { params: { permission } });
	return r.data;
}

export async function adminsByRole(role) {
	const r = await api.get(`/administrateurs/role/${role}`);
	return r.data;
}

export async function adminExists(email) {
	const r = await api.get('/administrateurs/exists', { params: { email } });
	return r.data;
}

export async function activeAdmins() {
	const r = await api.get('/administrateurs/actifs');
	return r.data;
}

export async function updateLastAccess(id) {
	const r = await api.post(`/administrateurs/${id}/update-dernier-acces`);
	return r.data;
}

export async function deactivateAdmin(id) {
	const r = await api.post(`/administrateurs/${id}/deactivate`);
	return r.data;
}

export async function activateAdmin(id) {
	const r = await api.post(`/administrateurs/${id}/activate`);
	return r.data;
}

export async function activeAdmin(id) {
	return activateAdmin(id);
}

export async function desactiveAdmin(id) {
	return deactivateAdmin(id);
}

export const disableAdmin = desactiveAdmin;

export async function updatePermissions(id, permissions) {
	const role = typeof permissions === 'string' ? permissions : permissions?.role;
	const r = await api.put(`/administrateurs/${id}/permissions`, { role });
	return r.data;
}
