import api from './api';

export async function getPaiement(id) {
	const r = await api.get(`/paiements/${id}`);
	return r.data;
}

export async function listPaiementsByUser(utilisateurId) {
	const r = await api.get(`/paiements/utilisateur/${utilisateurId}`);
	return r.data;
}

export async function listPaiementsByDossier(dossierId) {
	const r = await api.get(`/paiements/dossier/${dossierId}`);
	return r.data;
}

export async function totalByDossier(dossierId) {
	const r = await api.get(`/paiements/total/dossier/${dossierId}`);
	return r.data;
}

export async function paymentsStats(params = {}) {
	const r = await api.get('/paiements/stats', { params });
	return r.data;
}

export async function paymentsStatsPeriod({ debut, fin }) {
	const r = await api.get('/paiements/stats/period', { params: { debut, fin } });
	return r.data;
}

export async function paiementByReference(reference) {
	const r = await api.get('/paiements/reference', { params: { reference } });
	return r.data;
}

export async function initCheckoutSession({ utilisateurId, dossierId, montant }) {
	const r = await api.get('/paiements/checkout', { params: { utilisateurId, dossierId, montant } });
	return r.data;
}

export async function checkout(payload) {
	const r = await api.post('/paiements/checkout', payload);
	return r.data;
}

export async function createPaiement(params, payload) {
	const r = await api.post('/paiements', payload, { params });
	return r.data;
}

export async function webhook(payload) {
	const r = await api.post('/paiements/webhook', payload);
	return r.data;
}
