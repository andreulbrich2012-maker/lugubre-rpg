import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, tryQuery } from '../db/pool.js';
import {
  updateLocalUserPassword,
  updateLocalUserProfile,
  updateLocalUserTheme
} from '../db/localStore.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const publicColumns = 'id, name, email, role, profile_image_url, theme, created_at, updated_at';
const themes = ['sombrio', 'lugubre', 'daltonismo'];

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    profile_image_url: row.profile_image_url || '',
    theme: row.theme || 'sombrio',
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

router.put('/profile', async (req, res) => {
  try {
    const body = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      profileImageUrl: z.string().max(1_500_000).optional().nullable()
    }).parse(req.body);

    const result = await tryQuery(
      `update users set name = coalesce($1, name), email = coalesce($2, email),
       profile_image_url = case when $3::text is null then profile_image_url else $3 end, updated_at = now()
       where id = $4 returning ${publicColumns}`,
      [body.name, body.email?.toLowerCase(), body.profileImageUrl ?? null, req.user.id]
    );
    const user = result?.rows?.[0] || await updateLocalUserProfile(req.user.id, body);
    if (!user) return res.status(404).json({ message: 'Usuario nao encontrado.' });
    res.json({ user: publicUser(user) });
  } catch (error) {
    const status = error.status || (error.message?.toLowerCase().includes('duplicate') ? 409 : 400);
    res.status(status).json({ message: status === 409 ? 'Este email ja esta cadastrado.' : 'Nao foi possivel salvar o perfil.' });
  }
});

router.put('/password', async (req, res) => {
  try {
    const body = z.object({
      currentPassword: z.string().min(6),
      newPassword: z.string().min(6)
    }).parse(req.body);

    const result = await tryQuery('select password_hash from users where id = $1', [req.user.id]);
    if (result?.rows?.[0]) {
      const ok = await bcrypt.compare(body.currentPassword, result.rows[0].password_hash);
      if (!ok) return res.status(401).json({ message: 'Senha atual incorreta.' });
      await query('update users set password_hash = $1, updated_at = now() where id = $2', [await bcrypt.hash(body.newPassword, 10), req.user.id]);
      return res.json({ message: 'Senha alterada com sucesso.' });
    }

    await updateLocalUserPassword(req.user.id, body.currentPassword, body.newPassword);
    res.json({ message: 'Senha alterada com sucesso.' });
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Erro ao alterar senha.' });
  }
});

router.put('/theme', async (req, res) => {
  try {
    const body = z.object({ theme: z.enum(themes) }).parse(req.body);
    const result = await tryQuery(
      `update users set theme = $1, updated_at = now() where id = $2 returning ${publicColumns}`,
      [body.theme, req.user.id]
    );
    const user = result?.rows?.[0] || await updateLocalUserTheme(req.user.id, body.theme);
    if (!user) return res.status(404).json({ message: 'Usuario nao encontrado.' });
    res.json({ user: publicUser(user), message: 'Tema alterado com sucesso.' });
  } catch {
    res.status(400).json({ message: 'Tema invalido.' });
  }
});

router.post('/profile-image', async (req, res) => {
  try {
    const body = z.object({
      image: z.string().startsWith('data:image/').max(1_500_000)
    }).parse(req.body);
    const result = await tryQuery(
      `update users set profile_image_url = $1, updated_at = now()
       where id = $2 returning ${publicColumns}`,
      [body.image, req.user.id]
    );
    const user = result?.rows?.[0] || await updateLocalUserProfile(req.user.id, { profileImageUrl: body.image });
    if (!user) return res.status(404).json({ message: 'Usuario nao encontrado.' });
    res.json({ user: publicUser(user) });
  } catch {
    res.status(400).json({ message: 'Imagem invalida ou muito grande.' });
  }
});

router.delete('/profile-image', async (req, res) => {
  const result = await tryQuery(
    `update users set profile_image_url = '', updated_at = now()
     where id = $1 returning ${publicColumns}`,
    [req.user.id]
  );
  const user = result?.rows?.[0] || await updateLocalUserProfile(req.user.id, { profileImageUrl: '' });
  if (!user) return res.status(404).json({ message: 'Usuario nao encontrado.' });
  res.json({ user: publicUser(user), message: 'Foto removida com sucesso.' });
});

export default router;
