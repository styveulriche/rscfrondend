import axios from 'axios';

const DEFAULT_PORT = process.env.REACT_APP_API_PORT || '8080';
const LOCAL_BASE_URL = `http://localhost:${DEFAULT_PORT}/api/v1`;

// En production (Docker+nginx), REACT_APP_API_BASE_URL=/api/v1 est injecté au build.
// En dev local, on utilise localhost.
const baseURL = process.env.REACT_APP_API_BASE_URL?.trim() || LOCAL_BASE_URL;

const AUTH_EXCLUDED_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/verify-mfa',
  '/auth/verify-email-code',
  '/auth/resend-verification-email',
];

const isPublicRequest = (config) => {
  if (!config) return false;
  if (config.skipAuth) return true;
  const url = config.url || '';
  const normalizedUrl = url.startsWith('http') ? url.replace(baseURL, '') : url;
  return AUTH_EXCLUDED_PATHS.some((path) => normalizedUrl.startsWith(path));
};

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (isPublicRequest(config)) {
    if (config.headers?.Authorization) delete config.headers.Authorization;
    return config;
  }

  const token = localStorage.getItem('rsc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
  refreshSubscribers.push(callback);
};

const persistTokens = (token, refreshToken) => {
  if (token) localStorage.setItem('rsc_token', token);
  if (refreshToken) localStorage.setItem('rsc_refresh_token', refreshToken);
};

const requestNewToken = async () => {
  const storedRefreshToken = localStorage.getItem('rsc_refresh_token');
  if (!storedRefreshToken) {
    throw new Error('Missing refresh token');
  }

  const axiosInstance = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  });

  const res = await axiosInstance.post('/auth/refresh', { refreshToken: storedRefreshToken });
  return res.data;
};

const resetSession = () => {
  localStorage.removeItem('rsc_token');
  localStorage.removeItem('rsc_refresh_token');
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    if (isPublicRequest(originalRequest)) {
      return Promise.reject(error);
    }

    const status = error.response?.status || null;
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      isRefreshing = true;

      try {
        const data = await requestNewToken();
        const newToken = data?.token || data?.accessToken || null;
        const newRefreshToken = data?.refreshToken || null;

        if (!newToken) throw new Error('Unable to refresh token');

        persistTokens(newToken, newRefreshToken || localStorage.getItem('rsc_refresh_token'));
        onRefreshed(newToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        resetSession();
        onRefreshed(null);
        isRefreshing = false;
        window.location.assign('/login');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
