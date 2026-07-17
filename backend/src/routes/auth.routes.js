import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, tryQuery } from '../db/pool.js';
import { createLocalUser, findLocalUserByEmail, repairLocalUserPasswordByEmail, revokeLocalUserTokens } from '../db/localStore.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

const emailSchema = z.preprocess((value) => String(value || '').trim().toLowerCase(), z.string().email());

const credentials = z.object({
  email: emailSchema,
  password: z.string().min(6)
});

const registration = credentials.extend({
  name: z.string().trim().min(2),
  password: z.string().min(8)
});

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profile_image_url: user.profile_image_url || '',
    theme: user.theme || 'sombrio'
  };
}

function authMessage(error, fallback, minimumPasswordLength = 6) {
  if (error?.issues?.some((issue) => issue.path.includes('email'))) return 'Informe um email valido.';
  if (error?.issues?.some((issue) => issue.path.includes('password'))) return `A senha deve ter pelo menos ${minimumPasswordLength} caracteres.`;
  return error?.message || fallback;
}

router.post('/register', async (req, res) => {
  try {
    const body = registration.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 10);
    const role = 'user';
    const result = await tryQuery(
      `insert into users (name, email, password_hash, role)
       values ($1, $2, $3, $4)
       returning id, name, email, role, profile_image_url, theme`,
      [body.name, body.email, passwordHash, role]
    );
    const user = result?.rows?.[0] || await createLocalUser({ ...body, role });
    const safeUser = publicUser(user);
    res.status(201).json({ success: true, user: safeUser, token: signToken(user) });
  } catch (error) {
    const status = error.status || (error.message?.toLowerCase().includes('duplicate') ? 409 : 400);
    const message = status === 409 ? 'Este email ja esta cadastrado.' : authMessage(error, 'Erro ao criar conta. Tente novamente.', 8);
    res.status(status).json({ message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const body = credentials.parse(req.body);
    const result = await tryQuery('select * from users where lower(trim(email)) = $1', [body.email]);
    const user = result?.rows?.[0] || await findLocalUserByEmail(body.email);
    if (!user) return res.status(401).json({ message: 'Email ou senha incorretos.' });
    let passwordOk = await bcrypt.compare(body.password, user.password_hash || '');
    if (!passwordOk && !user.password_hash && user.password && body.password === user.password) {
      const passwordHash = await bcrypt.hash(body.password, 10);
      if (result?.rows?.[0]) {
        await query('update users set email = $1, password_hash = $2, updated_at = now() where id = $3', [body.email, passwordHash, user.id]);
      } else {
        await repairLocalUserPasswordByEmail(body.email, body.password);
      }
      user.password_hash = passwordHash;
      passwordOk = true;
    }
    if (!passwordOk) {
      return res.status(401).json({ message: 'Email ou senha incorretos.' });
    }
    const safeUser = publicUser({ ...user, email: body.email });
    res.json({ success: true, user: safeUser, token: signToken({ ...user, email: body.email }) });
  } catch (error) {
    res.status(400).json({ message: authMessage(error, 'Email ou senha incorretos.') });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', requireAuth, async (req, res) => {
  const result = await tryQuery(
    'update users set token_version = token_version + 1, updated_at = now() where id = $1',
    [req.user.id]
  );
  if (!result) await revokeLocalUserTokens(req.user.id);
  res.status(204).end();
});

export default router;
