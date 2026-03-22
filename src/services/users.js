import api from './api';

export async function getUser(id) {
	const r = await api.get(`/utilisateurs/${id}`);
	return r.data;
}

export async function getProfile(id) {
	const r = await api.get(`/utilisateurs/${id}`);
	return r.data;
}

export async function listUsers(pageable) {
	const r = await api.get('/utilisateurs', { params: pageable });
	return r.data;
}

export async function listAllUsers() {
	const r = await api.get('/utilisateurs/tous');
	return r.data;
}

export async function listByStatus(statut) {
	const r = await api.get(`/utilisateurs/statut/${statut}`);
	return r.data;
}

export async function listByDiasporaStatus(statut) {
	const r = await api.get(`/utilisateurs/diaspora/${statut}`);
	return r.data;
}

export async function listNewUsers(params) {
	const r = await api.get('/utilisateurs/inscrits', { params });
	return r.data;
}

export async function usersEvolution(params) {
	const r = await api.get('/utilisateurs/evolution', { params });
	return r.data;
}

export async function getEligibility(id) {
	const r = await api.get(`/utilisateurs/${id}/eligibilite`);
	return r.data;
}

export async function getProbationDays(id) {
	const r = await api.get(`/utilisateurs/${id}/probation-days`);
	return r.data;
}

export async function createUser(payload) {
	const r = await api.post('/utilisateurs', payload);
	return r.data;
}

export async function updateUser(id, payload) {
	const r = await api.put(`/utilisateurs/${id}`, payload);
	return r.data;
}

export async function updateUserStatus(id, statut) {
	const r = await api.put(`/utilisateurs/${id}/statut-compte`, null, { params: { statut } });
	return r.data;
}

export async function deleteUser(id) {
	const r = await api.delete(`/utilisateurs/${id}`);
	return r.data;
}

export async function userExistsByEmail(email) {
	const r = await api.get('/utilisateurs/exists/email', { params: { email } });
	return r.data;
}

export async function userExistsByPhone(telephone) {
	const r = await api.get('/utilisateurs/exists/telephone', { params: { telephone } });
	return r.data;
}

export async function searchUsers(params) {
	const r = await api.get('/utilisateurs/search', { params });
	return r.data;
}

export async function usersStats() {
	const r = await api.get('/utilisateurs/stats');
	return r.data;
}

export async function countUsersTotal() {
	const r = await api.get('/utilisateurs/count/total');
	return r.data;
}

export async function countUsersByStatus(statut) {
	const r = await api.get(`/utilisateurs/count/statut/${statut}`);
	return r.data;
}

export async function countUsersByDiaspora(statut) {
	const r = await api.get(`/utilisateurs/count/diaspora/${statut}`);
	return r.data;
}
