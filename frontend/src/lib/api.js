import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3333' : '');
export const AUTH_TOKEN_KEY = 'lugubre-token';
export const AUTH_USER_KEY = 'lugubre-user';

export const api = axios.create({
  baseURL: `${API_URL}/api`
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.__lugubreToken = token;
  }
  return config;
});

function shouldClearSession(error) {
  if (error?.response?.status !== 401) return false;

  const requestToken = error.config?.__lugubreToken;
  const currentToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (requestToken && currentToken && requestToken !== currentToken) return false;

  const url = error.config?.url || '';
  const message = error.response?.data?.message || '';
  return (
    url.includes('/auth/me') ||
    message.includes('Token') ||
    message.includes('Sessao') ||
    message.includes('sessao') ||
    message.includes('encontrar sua conta')
  );
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (shouldClearSession(error)) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      if (window.location.pathname !== '/login') {
        window.dispatchEvent(new CustomEvent('lugubre:auth-error', {
          detail: error.response.data?.message || 'Sua sessao expirou. Faca login novamente.'
        }));
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);
