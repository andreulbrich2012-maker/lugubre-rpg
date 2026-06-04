import { create } from 'zustand';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, api } from '../lib/api';

export const useAuth = create((set, get) => ({
  user: JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null'),
  token: localStorage.getItem(AUTH_TOKEN_KEY),
  authLoading: true,
  authInitialized: false,
  setUser(user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    if (user?.theme) localStorage.setItem('lugubre-theme', user.theme);
    set({ user });
  },
  async initAuth() {
    if (get().authInitialized) return;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      localStorage.removeItem(AUTH_USER_KEY);
      set({ user: null, token: null, authLoading: false, authInitialized: true });
      return;
    }
    set({ token, authLoading: true });
    try {
      const { data } = await api.get('/auth/me');
      if (localStorage.getItem(AUTH_TOKEN_KEY) !== token) return;
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      localStorage.setItem('lugubre-theme', data.user.theme || 'lugubre');
      set({ user: data.user, token, authLoading: false, authInitialized: true });
    } catch {
      if (localStorage.getItem(AUTH_TOKEN_KEY) === token) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        set({ user: null, token: null, authLoading: false, authInitialized: true });
      }
    }
  },
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    localStorage.setItem('lugubre-theme', data.user.theme || 'lugubre');
    set({ user: data.user, token: data.token, authLoading: false, authInitialized: true });
    return data;
  },
  async register(name, email, password) {
    const { data } = await api.post('/auth/register', { name, email, password });
    return data;
  },
  async refreshMe() {
    const { data } = await api.get('/auth/me');
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    localStorage.setItem('lugubre-theme', data.user.theme || 'lugubre');
    set({ user: data.user, authLoading: false, authInitialized: true });
    return data.user;
  },
  async updateProfile(payload) {
    const { data } = await api.put('/users/profile', payload);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    set({ user: data.user });
    return data.user;
  },
  async updateTheme(theme) {
    const { data } = await api.put('/users/theme', { theme });
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    localStorage.setItem('lugubre-theme', data.user.theme || theme);
    set({ user: data.user });
    return data.user;
  },
  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    set({ user: null, token: null, authLoading: false, authInitialized: true });
  }
}));
