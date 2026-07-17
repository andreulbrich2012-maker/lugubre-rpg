import rateLimit from 'express-rate-limit';

function vercelOrigin(value) {
  if (!value) return null;
  return value.startsWith('http') ? value : `https://${value}`;
}

export function allowedOrigins() {
  return new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...String(process.env.CLIENT_URL || '').split(',').map((value) => value.trim()),
    vercelOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    vercelOrigin(process.env.VERCEL_URL)
  ].filter(Boolean));
}

export function corsOrigin(origin, callback) {
  if (!origin || allowedOrigins().has(origin)) return callback(null, true);
  const error = new Error('Origem nao permitida.');
  error.status = 403;
  return callback(error);
}

const skipInTests = () => process.env.NODE_ENV === 'test';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: skipInTests,
  message: { message: 'Muitas requisicoes. Aguarde um pouco e tente novamente.' }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: skipInTests,
  message: { message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }
});
