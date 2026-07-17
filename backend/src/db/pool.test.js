import { describe, expect, it } from 'vitest';
import { normalizeDatabaseUrl } from './pool.js';

describe('normalizeDatabaseUrl', () => {
  it('usa verificacao SSL explicita nas URLs do Neon', () => {
    expect(normalizeDatabaseUrl('postgresql://user:pass@host/db?sslmode=require'))
      .toBe('postgresql://user:pass@host/db?sslmode=verify-full');
  });

  it('preserva outros parametros e modos ja seguros', () => {
    expect(normalizeDatabaseUrl('postgresql://host/db?channel_binding=require&sslmode=verify-ca'))
      .toBe('postgresql://host/db?channel_binding=require&sslmode=verify-full');
    expect(normalizeDatabaseUrl('postgresql://host/db?sslmode=verify-full'))
      .toBe('postgresql://host/db?sslmode=verify-full');
  });
});
