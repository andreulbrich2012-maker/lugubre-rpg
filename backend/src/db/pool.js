import pg from 'pg';
import '../config/env.js';

export function normalizeDatabaseUrl(connectionString) {
  if (!connectionString) return connectionString;

  return connectionString.replace(
    /([?&])sslmode=(?:prefer|require|verify-ca)(?=(&|$))/i,
    '$1sslmode=verify-full'
  );
}

export const pool = new pg.Pool({
  connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL)
});

export const query = (text, params) => pool.query(text, params);

export function hasDatabaseConnection() {
  return Boolean(process.env.DATABASE_URL);
}

export async function tryQuery(text, params) {
  if (!process.env.DATABASE_URL) return null;
  try {
    return await query(text, params);
  } catch (error) {
    if (process.env.ALLOW_LOCAL_FALLBACK === 'true' && !process.env.VERCEL && process.env.NODE_ENV !== 'production') return null;
    throw error;
  }
}
