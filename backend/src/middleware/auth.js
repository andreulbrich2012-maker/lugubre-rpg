import jwt from 'jsonwebtoken';
import { tryQuery } from '../db/pool.js';
import { findLocalUserById } from '../db/localStore.js';

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET precisa estar configurado em producao.');
  }
  return secret || 'lugubre-local-development-secret';
}

export function verifyToken(token) {
  return jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] });
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, ver: Number(user.token_version || 0) },
    jwtSecret(),
    { algorithm: 'HS256', expiresIn: '7d' }
  );
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Token ausente.' });

  try {
    const payload = verifyToken(token);
    if (!payload?.id || !payload?.email) {
      return res.status(401).json({ message: 'Sessao invalida. Faca login novamente.' });
    }

    const result = await tryQuery(
      'select id, name, email, role, profile_image_url, theme, token_version, created_at, updated_at from users where id = $1',
      [payload.id]
    );
    const user = result?.rows?.[0] || await findLocalUserById(payload.id);
    if (!user) {
      return res.status(401).json({ message: 'Nao foi possivel encontrar sua conta. Entre novamente.' });
    }
    if (Number(payload.ver || 0) !== Number(user.token_version || 0)) {
      return res.status(401).json({ message: 'Sua sessao foi encerrada. Faca login novamente.' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile_image_url: user.profile_image_url || '',
      theme: user.theme || 'sombrio'
    };
    return next();
  } catch (error) {
    const expired = error?.name === 'TokenExpiredError';
    return res.status(401).json({ message: expired ? 'Sua sessao expirou. Faca login novamente.' : 'Token invalido.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }
    return next();
  };
}
