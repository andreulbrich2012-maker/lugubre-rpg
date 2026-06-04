import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { pool } from './pool.js';

dotenv.config();

const schemaPath = path.resolve('backend/src/db/schema.sql');
const sql = await fs.readFile(schemaPath, 'utf8');

await pool.query(sql);
await pool.end();

console.log('Banco inicializado com sucesso.');
