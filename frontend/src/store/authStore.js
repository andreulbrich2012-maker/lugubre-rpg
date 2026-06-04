import { create } from 'zustand';
import { api } from '../lib/api';

export const useAuth = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('lugubre-user') || 'null'),
  token: localStorage.getItem('lugubre-token'),
  authLoading: true,
  authInitialized: false,
  setUser(user) {
    localStorage.setItem('lugubre-user', JSON.stringify(user));
    if (user?.theme) localStorage.setItem('lugubre-theme', user.theme);
    set({ user });
  },
  async initAuth() {
    if (get().authInitialized) return;
    const token = localStorage.getItem('lugubre-token');
    if (!token) {
      localStorage.removeItem('lugubre-user');
      set({ user: null, token: null, authLoading: false, authInitialized: true });
      return;
    }
    set({ token, authLoading: true });
    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('lugubre-user', JSON.stringify(data.user));
      localStorage.setItem('lugubre-theme', data.user.theme || 'lugubre');
      set({ user: data.user, token, authLoading: false, authInitialized: true });
    } catch {
      localStorage.removeItem('lugubre-token');
      localStorage.removeItem('lugubre-user');
      set({ user: null, token: null, authLoading: false, authInitialized: true });
    }
  },
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('lugubre-token', data.token);
    localStorage.setItem('lugubre-user', JSON.stringify(data.user));
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
    localStorage.setItem('lugubre-user', JSON.stringify(data.user));
    localStorage.setItem('lugubre-theme', data.user.theme || 'lugubre');
    set({ user: data.user, authLoading: false, authInitialized: true });
    return data.user;
  },
  async updateProfile(payload) {
    const { data } = await api.put('/users/profile', payload);
    localStorage.setItem('lugubre-user', JSON.stringify(data.user));
    set({ user: data.user });
    return data.user;
  },
  async updateTheme(theme) {
    const { data } = await api.put('/users/theme', { theme });
    localStorage.setItem('lugubre-user', JSON.stringify(data.user));
    localStorage.setItem('lugubre-theme', data.user.theme || theme);
    set({ user: data.user });
    return data.user;
  },
  logout() {
    localStorage.removeItem('lugubre-token');
    localStorage.removeItem('lugubre-user');
    set({ user: null, token: null, authLoading: false, authInitialized: true });
  }
}));
