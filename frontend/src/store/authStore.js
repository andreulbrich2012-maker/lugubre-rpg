import { create } from 'zustand';
import { api } from '../lib/api';

export const useAuth = create((set) => ({
  user: JSON.parse(localStorage.getItem('lugubre-user') || 'null'),
  token: localStorage.getItem('lugubre-token'),
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('lugubre-token', data.token);
    localStorage.setItem('lugubre-user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
    return data;
  },
  async register(name, email, password) {
    const { data } = await api.post('/auth/register', { name, email, password });
    return data;
  },
  async refreshMe() {
    const { data } = await api.get('/auth/me');
    localStorage.setItem('lugubre-user', JSON.stringify(data.user));
    set({ user: data.user });
    return data.user;
  },
  logout() {
    localStorage.removeItem('lugubre-token');
    localStorage.removeItem('lugubre-user');
    set({ user: null, token: null });
  }
}));
