import { z } from 'zod';

export function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Converte erro em resposta pt-BR sem vazar mensagens internas do Postgres.
export function sendError(res, error, fallback = 'Não foi possível concluir a operação.') {
  if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 600) {
    return res.status(error.status).json({ message: error.message || fallback });
  }
  if (error?.issues) {
    return res.status(400).json({ message: 'Verifique os campos enviados.', issues: error.issues.map((issue) => issue.message) });
  }
  if (error?.code === '22P02') return res.status(404).json({ message: 'Registro não encontrado.' });
  if (typeof error?.code === 'string' && error.code.startsWith('23')) {
    return res.status(400).json({ message: fallback });
  }
  console.error('[erro]', error);
  return res.status(500).json({ message: fallback });
}

// z.coerce.boolean() transforma "false" em true; este aceita true/false, "true"/"false", 1/0.
export const boolish = z.preprocess((value) => {
  if (value === 'true' || value === '1' || value === 1 || value === 'on') return true;
  if (value === 'false' || value === '0' || value === 0 || value === '' || value === 'off') return false;
  return value;
}, z.boolean());

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value) => UUID_RE.test(String(value || ''));

// router.param: ids que nao sao UUID viram 404 em vez de erro 500 do Postgres.
export function uuidParam(req, res, next, value) {
  if (!isUuid(value)) return res.status(404).json({ message: 'Registro não encontrado.' });
  next();
}

export function requireDatabase() {
  if (!process.env.DATABASE_URL) {
    throw httpError('Este recurso precisa do banco de dados PostgreSQL configurado.', 503);
  }
}

export function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
