import pg from 'pg';
import '../config/env.js';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
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
