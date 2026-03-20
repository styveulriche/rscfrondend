import api from './api';

export async function getAyant(id) {
	const r = await api.get(`/ayants-droit/${id}`);
	return r.data;
}

export async function listByUser(utilisateurId) {
	const r = await api.get(`/ayants-droit/utilisateur/${utilisateurId}`);
	return r.data;
}

export async function listPrincipal(utilisateurId) {
	const r = await api.get(`/ayants-droit/principal/${utilisateurId}`);
	return r.data;
}

export async function listMineurs(utilisateurId) {
	const r = await api.get(`/ayants-droit/mineurs/${utilisateurId}`);
	return r.data;
}

export async function listByLien(utilisateurId, lien) {
	const r = await api.get(`/ayants-droit/by-lien/${utilisateurId}`, { params: { lien } });
	return r.data;
}

export async function repartitionAyants() {
	const r = await api.get('/ayants-droit/repartition');
	return r.data;
}

export async function createAyant(utilisateurId, payload) {
	const r = await api.post('/ayants-droit', payload, { params: { utilisateurId } });
	return r.data;
}

export async function updateAyant(id, payload) {
	const r = await api.put(`/ayants-droit/${id}`, payload);
	return r.data;
}

export async function setAyantPrincipal(id) {
	const r = await api.put(`/ayants-droit/${id}/set-principal`);
	return r.data;
}

export async function deleteAyant(id) {
	const r = await api.delete(`/ayants-droit/${id}`);
	return r.data;
}

export async function verifyCode(id, code) {
	const r = await api.get(`/ayants-droit/${id}/verify-code`, { params: { code } });
	return r.data;
}

export async function getCode(id) {
	const r = await api.get(`/ayants-droit/${id}/code`);
	return r.data;
}

export async function resetCode(id) {
	const r = await api.post(`/ayants-droit/${id}/reset-code`);
	return r.data;
}

export async function statsByUser(utilisateurId) {
	const r = await api.get(`/ayants-droit/stats/${utilisateurId}`);
	return r.data;
}

export async function countByUser(utilisateurId) {
	const r = await api.get(`/ayants-droit/count/${utilisateurId}`);
	return r.data;
}
