import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '../..');
const projectRoot = path.resolve(backendRoot, '..');

for (const envPath of [
  path.join(projectRoot, '.env.production.local'),
  path.join(projectRoot, '.env.local'),
  path.join(projectRoot, '.env'),
  path.join(backendRoot, '.env.production.local'),
  path.join(backendRoot, '.env.local'),
  path.join(backendRoot, '.env')
]) {
  dotenv.config({ path: envPath, override: false });
}

const schemaPath = path.join(__dirname, 'schema.sql');
const sql = (await fs.readFile(schemaPath, 'utf8')).replace(/^\uFEFF/, '');

function splitStatements(source) {
  const statements = [];
  let statement = '';
  let quote = null;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    statement += char;

    if (quote === 'single' && char === "'" && next === "'") {
      statement += next;
      index += 1;
      continue;
    }

    if (!quote && char === '-' && next === '-') {
      while (index + 1 < source.length && source[index + 1] !== '\n') {
        index += 1;
        statement += source[index];
      }
      continue;
    }

    if (!quote && char === '/' && next === '*') {
      while (index + 1 < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        index += 1;
        statement += source[index];
      }
      if (index + 1 < source.length) {
        index += 1;
        statement += source[index];
      }
      continue;
    }

    if (char === "'" && quote !== 'double') quote = quote === 'single' ? null : 'single';
    if (char === '"' && quote !== 'single') quote = quote === 'double' ? null : 'double';

    if (!quote && char === ';') {
      const clean = statement.trim();
      if (clean) statements.push(clean);
      statement = '';
    }
  }

  const clean = statement.trim();
  if (clean) statements.push(clean);
  return statements;
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL nao encontrado. Rode `vercel env pull .env.production.local --environment=production` ou defina a variavel antes de inicializar o banco.');
}

const statements = splitStatements(sql);
const { pool } = await import('./pool.js');

try {
  for (const [index, statement] of statements.entries()) {
    try {
      await pool.query(statement);
    } catch (error) {
      const preview = statement.replace(/\s+/g, ' ').slice(0, 220);
      error.message = `Falha no SQL #${index + 1}: ${preview}\n${error.message}`;
      throw error;
    }
  }

  const adminEmails = (process.env.ADMIN_EMAILS || 'andreulbrich2012@gmail.com')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const seedUsers = [
    ...adminEmails.map((email) => ({ name: 'Administrador Lugubre', email, password: 'adm123', role: 'admin' })),
    { name: 'Demo Jogador', email: 'demo@lugubre.local', password: 'demo123', role: 'player' }
  ];

  for (const user of seedUsers) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await pool.query(
      `insert into users (name, email, password_hash, role)
       values ($1, $2, $3, $4)
       on conflict (email) do update set
         name = excluded.name,
         password_hash = excluded.password_hash,
         role = excluded.role,
         updated_at = now()`,
      [user.name, user.email, passwordHash, user.role]
    );
  }
} finally {
  await pool.end();
}

console.log(`Banco inicializado com sucesso. ${statements.length} comandos SQL executados e seeds aplicados.`);
