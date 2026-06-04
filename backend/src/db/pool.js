import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

export const query = (text, params) => pool.query(text, params);

export async function tryQuery(text, params) {
  try {
    return await query(text, params);
  } catch (error) {
    if (process.env.REQUIRE_POSTGRES === 'true') throw error;
    return null;
  }
}
