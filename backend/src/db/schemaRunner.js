import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Aplica o schema.sql (idempotente: so cria tabelas/colunas que faltam). Usado pelo init.js e pelo
// botao "Atualizar banco" do admin, que roda na Vercel onde a senha do banco ja esta (23/10).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

export function splitStatements(source) {
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

export async function applySchema(pool) {
  const sql = (await fs.readFile(SCHEMA_PATH, 'utf8')).replace(/^\uFEFF/, '');
  const statements = splitStatements(sql);
  // Lotes de 40 comandos por ida ao banco: um por vez estourava o limite de 60 s da Vercel (24/10).
  // Se um lote falhar, refaz um a um para dizer exatamente qual comando quebrou.
  for (let start = 0; start < statements.length; start += 40) {
    const batch = statements.slice(start, start + 40);
    try {
      await pool.query(batch.join(';\n'));
    } catch {
      for (const [offset, statement] of batch.entries()) {
        try {
          await pool.query(statement);
        } catch (error) {
          const preview = statement.replace(/\s+/g, ' ').slice(0, 160);
          error.message = `Falha no SQL #${start + offset + 1}: ${preview}\n${error.message}`;
          throw error;
        }
      }
    }
  }
  return statements.length;
}
