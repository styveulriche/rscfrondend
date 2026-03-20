import api from './api';

export async function getAddress(id) { const r = await api.get(`/adresses/${id}`); return r.data; }
export async function listAddresses(params) { const r = await api.get('/adresses', { params }); return r.data; }
export async function listByUser(utilisateurId) { const r = await api.get(`/adresses/utilisateur/${utilisateurId}`); return r.data; }
export async function searchByCity(ville) { const r = await api.get('/adresses/search/ville', { params: { ville } }); return r.data; }
export async function searchByPostal(codePostal) { const r = await api.get('/adresses/search/codepostal', { params: { codePostal } }); return r.data; }
export async function nearby({ latitude, longitude, rayonMetres }) { const r = await api.get('/adresses/proches', { params: { latitude, longitude, rayonMetres } }); return r.data; }
export async function getPrincipal(utilisateurId) { const r = await api.get(`/adresses/principale/${utilisateurId}`); return r.data; }
export async function createAddress(utilisateurId, payload) { const r = await api.post('/adresses', payload, { params: { utilisateurId } }); return r.data; }
export async function validateAddress(payload) { const r = await api.post('/adresses/validate', payload); return r.data; }
export async function geocodeAddress(payload) { const r = await api.post('/adresses/geocode', payload); return r.data; }
export async function updateAddress(id, payload) { const r = await api.put(`/adresses/${id}`, payload); return r.data; }
export async function setPrincipal(id) { const r = await api.put(`/adresses/${id}/set-principale`); return r.data; }
export async function deleteAddress(id) { const r = await api.delete(`/adresses/${id}`); return r.data; }
