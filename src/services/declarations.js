import api from './api';

export async function getDeclaration(id) {
	const r = await api.get(`/declarations/${id}`);
	return r.data;
}

export async function listDeclarations(pageable) {
	const r = await api.get('/declarations', { params: pageable });
	return r.data;
}

export async function declarationsByStatus(statut) {
	const r = await api.get(`/declarations/statut/${statut}`);
	return r.data;
}

export async function declarationsByPays(pays) {
	const r = await api.get(`/declarations/pays/${pays}`);
	return r.data;
}

export async function declarationsByUser(userId) {
	const r = await api.get(`/declarations/by-user/${userId}`);
	return r.data;
}

export async function declarationsPeriode({ debut, fin }) {
	const r = await api.get('/declarations/periode', { params: { debut, fin } });
	return r.data;
}

export async function declarationsStats(params) {
	const r = await api.get('/declarations/stats', { params });
	return r.data;
}

export async function declarationCountByStatus(statut) {
	const r = await api.get(`/declarations/count/statut/${statut}`);
	return r.data;
}

export async function declarationsParMois() {
	const r = await api.get('/declarations/par-mois');
	return r.data;
}

export async function declarationsParPays() {
	const r = await api.get('/declarations/par-pays');
	return r.data;
}

export async function declarationsSearch(params) {
	const r = await api.get('/declarations/search', { params });
	return r.data;
}

export async function createDeclaration(utilisateurId, payload) {
	const r = await api.post('/declarations', payload, { params: { utilisateurId } });
	return r.data;
}

export async function updateDeclaration(id, payload) {
	const r = await api.put(`/declarations/${id}`, payload);
	return r.data;
}

export async function validateDeclaration(id, commentaire) {
	const r = await api.put(`/declarations/${id}/valider`, commentaire ? { commentaire } : {});
	return r.data;
}

export async function rejectDeclaration(id, raison) {
	const r = await api.put(`/declarations/${id}/rejeter`, { raison });
	return r.data;
}

export async function deleteDeclaration(id) {
	const r = await api.delete(`/declarations/${id}`);
	return r.data;
}
