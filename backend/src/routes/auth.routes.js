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
       returning id, name, email, role`,
      [body.name, body.email.toLowerCase(), passwordHash, role]
    );
    const user = result?.rows?.[0] || await createLocalUser({ ...body, role });
    const publicUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.status(201).json({ user: publicUser, token: signToken(publicUser) });
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Não foi possível cadastrar.' });
  }
});

router.post('/login', async (req, res) => {
  const body = credentials.parse(req.body);
  const result = await tryQuery('select * from users where email = $1', [body.email.toLowerCase()]);
  const user = result?.rows?.[0] || await findLocalUserByEmail(body.email);
  if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
    return res.status(401).json({ message: 'Credenciais inválidas.' });
  }
  const publicUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ user: publicUser, token: signToken(publicUser) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
