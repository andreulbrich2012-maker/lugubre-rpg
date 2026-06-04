import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool } from './pool.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');
const sql = await fs.readFile(schemaPath, 'utf8');

await pool.query(sql);
await pool.end();

console.log('Banco inicializado com sucesso.');
