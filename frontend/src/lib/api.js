import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3333' : '');

export const api = axios.create({
  baseURL: `${API_URL}/api`
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lugubre-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('lugubre-token');
      localStorage.removeItem('lugubre-user');
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
