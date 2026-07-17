import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const storage = new Map();
const localStorageMock = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

let api;
let useAuth;

beforeAll(async () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorageMock });
  ({ api } = await import('../lib/api'));
  ({ useAuth } = await import('./authStore'));
});

afterEach(() => {
  vi.restoreAllMocks();
  storage.clear();
  useAuth.setState({ user: null, token: null, authLoading: false, authInitialized: true });
});

function setSession() {
  const user = { id: 'user-1', name: 'Teste', role: 'user' };
  storage.set('lugubre-token', 'token-teste');
  storage.set('lugubre-user', JSON.stringify(user));
  useAuth.setState({ user, token: 'token-teste', authLoading: false, authInitialized: true });
}

describe('logout seguro', () => {
  it('mantem a sessao local quando a revogacao falha e permite tentar novamente', async () => {
    setSession();
    vi.spyOn(api, 'post').mockRejectedValueOnce({ response: { status: 500 } });

    await expect(useAuth.getState().logout()).rejects.toBeTruthy();
    expect(useAuth.getState().token).toBe('token-teste');
    expect(storage.get('lugubre-token')).toBe('token-teste');
  });

  it('limpa a sessao quando o backend informa que o token ja foi revogado', async () => {
    setSession();
    vi.spyOn(api, 'post').mockRejectedValueOnce({ response: { status: 401 } });

    await expect(useAuth.getState().logout()).resolves.toBeUndefined();
    expect(useAuth.getState().user).toBeNull();
    expect(useAuth.getState().token).toBeNull();
    expect(storage.has('lugubre-token')).toBe(false);
    expect(storage.has('lugubre-user')).toBe(false);
  });
});
