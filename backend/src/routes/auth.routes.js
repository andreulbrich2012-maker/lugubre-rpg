import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { tryQuery } from '../db/pool.js';
import { createLocalUser, findLocalUserByEmail } from '../db/localStore.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

function authMessage(error, fallback) {
  if (error?.issues?.some((issue) => issue.path.includes('email'))) return 'Informe um email valido.';
  if (error?.issues?.some((issue) => issue.path.includes('password'))) return 'A senha deve ter pelo menos 6 caracteres.';
  return error?.message || fallback;
}

router.post('/register', async (req, res) => {
  try {
    const body = credentials.extend({ name: z.string().min(2) }).parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 10);
    const adminEmails = (process.env.ADMIN_EMAILS || 'andreulbrich2012@gmail.com')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const role = adminEmails.includes(body.email.toLowerCase()) ? 'admin' : 'player';
    const result = await tryQuery(
      `insert into users (name, email, password_hash, role)
       values ($1, $2, $3, $4)
       returning id, name, email, role, profile_image_url, theme`,
      [body.name, body.email.toLowerCase(), passwordHash, role]
    );
    const user = result?.rows?.[0] || await createLocalUser({ ...body, role });
    const publicUser = { id: user.id, name: user.name, email: user.email, role: user.role, profile_image_url: user.profile_image_url || '', theme: user.theme || 'lugubre' };
    res.status(201).json({ user: publicUser, token: signToken(publicUser) });
  } catch (error) {
    const status = error.status || (error.message?.toLowerCase().includes('duplicate') ? 409 : 400);
    const message = status === 409 ? 'Este email ja esta cadastrado.' : authMessage(error, 'Erro ao criar conta. Tente novamente.');
    res.status(status).json({ message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const body = credentials.parse(req.body);
    const result = await tryQuery('select * from users where email = $1', [body.email.toLowerCase()]);
    const user = result?.rows?.[0] || await findLocalUserByEmail(body.email);
    if (!user) return res.status(404).json({ message: 'Email nao encontrado.' });
    if (!(await bcrypt.compare(body.password, user.password_hash))) {
      return res.status(401).json({ message: 'Senha incorreta.' });
    }
    const publicUser = { id: user.id, name: user.name, email: user.email, role: user.role, profile_image_url: user.profile_image_url || '', theme: user.theme || 'lugubre' };
    res.json({ user: publicUser, token: signToken(publicUser) });
  } catch (error) {
    res.status(400).json({ message: authMessage(error, 'Email ou senha incorretos.') });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
