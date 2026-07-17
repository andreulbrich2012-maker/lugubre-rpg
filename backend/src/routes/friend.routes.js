import { Router } from 'express';
import { z } from 'zod';
import { query, tryQuery } from '../db/pool.js';
import {
  addLocalFriend,
  createLocalFriendMessage,
  listLocalFriendMessages,
  listLocalFriends,
  searchLocalUsers
} from '../db/localStore.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const result = await tryQuery(
    `select f.*, json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'role', u.role) as friend
     from friends f
     join users u on u.id = case when f.user_id = $1 then f.friend_id else f.user_id end
     where f.user_id = $1 or f.friend_id = $1
     order by f.created_at desc`,
    [req.user.id]
  );
  res.json(result?.rows || await listLocalFriends(req.user.id));
});

router.get('/search', async (req, res) => {
  const term = String(req.query.q || '').trim();
  if (term.length < 2) return res.json([]);
  const result = await tryQuery(
    `select id, name, email, role from users
     where id <> $1 and (name ilike $2 or email ilike $2)
     order by name limit 12`,
    [req.user.id, `%${term}%`]
  );
  res.json(result?.rows || await searchLocalUsers(term, req.user.id));
});

router.post('/add', async (req, res) => {
  const body = z.object({ email: z.string().trim().toLowerCase().email() }).parse(req.body);
  const user = await tryQuery('select id, name, email, role from users where email = $1', [body.email.toLowerCase()]);
  if (user?.rows?.[0]) {
    if (user.rows[0].id === req.user.id) return res.status(400).json({ message: 'Voce nao pode adicionar a si mesmo.' });
    const existing = await query(
      `select * from friends
       where (user_id=$1 and friend_id=$2) or (user_id=$2 and friend_id=$1)`,
      [req.user.id, user.rows[0].id]
    );
    if (existing.rowCount) {
      const result = await query("update friends set status='accepted' where id=$1 returning *", [existing.rows[0].id]);
      return res.status(200).json({ ...result.rows[0], friend: user.rows[0] });
    }
    const [userId, friendId] = [req.user.id, user.rows[0].id].sort();
    const result = await query(
      `insert into friends (user_id, friend_id, status)
       values ($1, $2, 'accepted')
       on conflict (user_id, friend_id) do update set status = 'accepted'
       returning *`,
      [userId, friendId]
    );
    return res.status(201).json({ ...result.rows[0], friend: user.rows[0] });
  }
  const friend = await addLocalFriend(req.user.id, body.email);
  if (!friend) return res.status(404).json({ message: 'Usuario nao encontrado.' });
  res.status(201).json(friend);
});

router.get('/messages/:friendId', async (req, res) => {
  const friendId = z.string().uuid().parse(req.params.friendId);
  const result = await tryQuery(
    `select * from friend_messages
     where (sender_id = $1 and receiver_id = $2) or (sender_id = $2 and receiver_id = $1)
     order by created_at asc limit 200`,
    [req.user.id, friendId]
  );
  res.json(result?.rows || await listLocalFriendMessages(req.user.id, friendId));
});

router.post('/messages', async (req, res) => {
  const body = z.object({ friendId: z.string().uuid(), message: z.string().trim().min(1).max(4000) }).parse(req.body);
  const friendship = await tryQuery(
    `select id from friends
     where status = 'accepted'
       and ((user_id = $1 and friend_id = $2) or (user_id = $2 and friend_id = $1))`,
    [req.user.id, body.friendId]
  );
  if (friendship?.rowCount) {
    const result = await query(
      'insert into friend_messages (sender_id, receiver_id, message) values ($1, $2, $3) returning *',
      [req.user.id, body.friendId, body.message]
    );
    return res.status(201).json(result.rows[0]);
  }
  const message = await createLocalFriendMessage(req.user.id, body.friendId, body.message);
  if (!message) return res.status(403).json({ message: 'Adicione este usuario antes de conversar.' });
  res.status(201).json(message);
});

export default router;
