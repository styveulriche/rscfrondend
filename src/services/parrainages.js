import api from './api';

export async function getParrainage(id) {
	const r = await api.get(`/parrainages/${id}`);
	return r.data;
}

export async function validateCode(code) {
	const r = await api.get('/parrainages/validate-code', { params: { code } });
	return r.data;
}

export async function getParrainIdByCode(code) {
	const r = await api.get('/parrainages/parrain-id', { params: { code } });
	return r.data;
}

export async function listParrainagesByParrain(parrainId, pageable) {
	const r = await api.get(`/parrainages/parrain/${parrainId}`, { params: pageable });
	return r.data;
}

export async function listParrainagesByFilleul(filleulId, pageable) {
	const r = await api.get(`/parrainages/filleul/${filleulId}`, { params: pageable });
	return r.data;
}

export async function listParrainagesPending() {
	const r = await api.get('/parrainages/en-attente');
	return r.data;
}

export async function countParrainagesByParrain(parrainId) {
	const r = await api.get(`/parrainages/count/parrain/${parrainId}`);
	return r.data;
}

export async function countFilleuls(parrainId) {
	const r = await api.get(`/parrainages/count/filleuls/${parrainId}`);
	return r.data;
}

export async function applyParrainBenefits(filleulId) {
	const r = await api.put(`/parrainages/apply-benefits/${filleulId}`);
	return r.data;
}

export async function createParrainage(parrainId, payload) {
	const r = await api.post('/parrainages', payload, { params: { parrainId } });
	return r.data;
}

export async function validateParrainage(id) {
	const r = await api.put(`/parrainages/${id}/validate`);
	return r.data;
}

export async function rejectParrainage(id) {
	const r = await api.put(`/parrainages/${id}/reject`);
	return r.data;
}

export async function cancelParrainage(id) {
	const r = await api.put(`/parrainages/${id}/cancel`);
	return r.data;
}

export async function acceptParrainage(id) {
	const r = await api.put(`/parrainages/${id}/accept`);
	return r.data;
}
