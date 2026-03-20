import api from './api';

export async function getDossier(id) {
	const r = await api.get(`/dossiers/${id}`);
	return r.data;
}

export async function deleteDossier(id) {
	const r = await api.delete(`/dossiers/${id}`);
	return r.data;
}

export async function listDossiers(pageable) {
	const r = await api.get('/dossiers', { params: pageable });
	return r.data;
}

export async function listByUser(utilisateurId, pageable) {
	const r = await api.get(`/dossiers/utilisateur/${utilisateurId}`, { params: pageable });
	return r.data;
}

export async function dossiersByStatus(statut) {
	const r = await api.get(`/dossiers/statut/${statut}`);
	return r.data;
}

export async function dossiersByResponsable(responsableId) {
	const r = await api.get(`/dossiers/responsable/${responsableId}`);
	return r.data;
}

export async function dossiersByDeclaration(declarationId) {
	const r = await api.get(`/dossiers/by-declaration/${declarationId}`);
	return r.data;
}

export async function dossiersStats() {
	const r = await api.get('/dossiers/stats');
	return r.data;
}

export async function dossiersParMois() {
	const r = await api.get('/dossiers/par-mois');
	return r.data;
}

export async function dossiersEnRetard() {
	const r = await api.get('/dossiers/en-retard');
	return r.data;
}

export async function dossiersCountByStatus(statut) {
	const r = await api.get(`/dossiers/count/statut/${statut}`);
	return r.data;
}

export async function createDossier(declarationId) {
	const r = await api.post('/dossiers', null, { params: { declarationId } });
	return r.data;
}

export async function setVille(id, depart, arrivee) {
	const r = await api.put(`/dossiers/${id}/ville`, null, { params: { depart, arrivee } });
	return r.data;
}

export async function startDossier(id) {
	const r = await api.put(`/dossiers/${id}/demarrer`);
	return r.data;
}

export async function finishDossier(id) {
	const r = await api.put(`/dossiers/${id}/terminer`);
	return r.data;
}

export async function cancelDossier(id, motif) {
	const r = await api.put(`/dossiers/${id}/annuler`, null, { params: { motif } });
	return r.data;
}

export async function setStatus(id, statut) {
	const r = await api.put(`/dossiers/${id}/statut`, null, { params: { statut } });
	return r.data;
}

export async function updateFlightInfo(id, compagnie, numeroVol, date) {
	const r = await api.put(`/dossiers/${id}/info-vol`, null, { params: { compagnie, numeroVol, date } });
	return r.data;
}
