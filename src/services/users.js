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

export async function getLienParrainage(id) {
	const r = await api.get(`/utilisateurs/${id}/lien-parrainage`);
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

/** Solde du portefeuille de l'utilisateur connecté — GET /utilisateurs/mon-solde */
export async function getMonSolde() {
	const r = await api.get('/utilisateurs/mon-solde');
	return r.data; // { solde: BigDecimal, devise: string }
}

// ── Photo de profil ──────────────────────────────────────────

/**
 * Mise à jour complète du profil (multipart) — PUT /utilisateurs/{id}/profil
 * Champs : nom?, prenom?, telephone?, dateNaissance?, sexe?, photo?
 * On passe également paysOrigine, statutDiaspora, email s'ils sont fournis.
 */
export async function updateProfil(id, fields = {}) {
	const form = new FormData();
	const append = (key, val) => { if (val !== undefined && val !== null) form.append(key, val); };
	append('nom',            fields.nom);
	append('prenom',         fields.prenom);
	append('email',          fields.email);
	append('telephone',      fields.telephone);
	append('dateNaissance',  fields.dateNaissance);
	append('sexe',           fields.sexe);
	append('paysOrigine',    fields.paysOrigine);
	append('statutDiaspora', fields.statutDiaspora);
	if (fields.photo) form.append('fichier', fields.photo); // File object
	const r = await api.put(`/utilisateurs/${id}/profil`, form, {
		headers: { 'Content-Type': 'multipart/form-data' },
	});
	return r.data;
}

/**
 * Upload / remplacement de la photo seule — PUT /utilisateurs/{id}/photo-profil
 * multipart : photo=<File>
 */
export async function uploadPhotoProfile(id, file) {
	const form = new FormData();
	form.append('fichier', file);
	const r = await api.put(`/utilisateurs/${id}/photo-profil`, form, {
		headers: { 'Content-Type': 'multipart/form-data' },
	});
	return r.data;
}

/** Supprime la photo de profil — DELETE /utilisateurs/{id}/photo-profil */
export async function deletePhotoProfile(id) {
	await api.delete(`/utilisateurs/${id}/photo-profil`);
}

// ── QR Code parrainage (accès public) ────────────────────────

/**
 * Retourne { base64: string, contentType?: string } — GET /utilisateurs/{id}/parrainage/qrcode/base64
 * Utiliser pour <img src={`data:image/png;base64,${data.base64}`} />
 */
export async function getQrCodeBase64(id) {
	const r = await api.get(`/utilisateurs/${id}/parrainage/qrcode/base64`);
	return r.data;
}

/** URL directe du QR code inline (image/png) — accès public, utilisable dans <img src> */
export function getQrCodeUrl(id) {
	const base = process.env.REACT_APP_API_BASE_URL?.trim()
		|| `http://localhost:${process.env.REACT_APP_API_PORT || '8080'}/api/v1`;
	return `${base}/utilisateurs/${id}/parrainage/qrcode`;
}

/** URL de téléchargement du QR code (attachment) — accès public */
export function getQrCodeDownloadUrl(id) {
	const base = process.env.REACT_APP_API_BASE_URL?.trim()
		|| `http://localhost:${process.env.REACT_APP_API_PORT || '8080'}/api/v1`;
	return `${base}/utilisateurs/${id}/parrainage/qrcode/download`;
}
