import api from './api';

export async function getStatutsDiaspora() {
  const r = await api.get('/public/statuts-diaspora', { skipAuth: true });
  return r.data;
}

export async function getTypesParrainage() {
  const r = await api.get('/public/types-parrainage', { skipAuth: true });
  return r.data;
}

export async function getTypesCotisation() {
  const r = await api.get('/public/types-cotisation', { skipAuth: true });
  return r.data;
}

export async function getSocialLinks() {
  const r = await api.get('/public/social-links', { skipAuth: true });
  return r.data;
}

export async function getPublicConfig() {
  const r = await api.get('/public/config', { skipAuth: true });
  return r.data;
}
