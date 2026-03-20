import api from './api';

export async function login(credentials) {
  const res = await api.post('/auth/login', credentials);
  return res.data;
}

export async function adminLogin(credentials) {
  const res = await api.post('/auth/admin/login', credentials);
  return res.data;
}

export async function register(payload) {
  const res = await api.post('/auth/register', payload, { skipAuth: true });
  return res.data;
}

export async function validateToken() {
  const res = await api.get('/auth/validate-token');
  return res.data;
}

export async function refreshToken(refreshTokenValue) {
  const res = await api.post('/auth/refresh', { refreshToken: refreshTokenValue });
  return res.data;
}

export async function logout() {
  const res = await api.post('/auth/logout');
  return res.data;
}

export async function verifyMfa({ email, code, xForwardedFor }) {
  const headers = xForwardedFor ? { 'X-Forwarded-For': xForwardedFor } : {};
  const res = await api.post('/auth/verify-mfa', null, { params: { email, code }, headers });
  return res.data;
}

export async function verifyEmailCode({ email, code }) {
  const res = await api.post('/auth/verify-email-code', null, { params: { email, code } });
  return res.data;
}

export async function resendVerificationEmail({ email }) {
  const res = await api.post('/auth/resend-verification-email', null, { params: { email } });
  return res.data;
}
