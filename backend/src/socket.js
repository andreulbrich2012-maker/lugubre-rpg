import jwt from 'jsonwebtoken';
import { query } from './db/pool.js';

export function requireSocketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    socket.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    next();
  } catch {
    next(new Error('Não autenticado.'));
  }
}

export function registerChatHandlers(io, socket) {
  socket.on('campaign:join', async (campaignId) => {
    const membership = await query(
      'select 1 from campaign_members where campaign_id = $1 and user_id = $2',
      [campaignId, socket.user.id]
    );
    if (membership.rowCount) socket.join(`campaign:${campaignId}`);
  });

  socket.on('message:send', async ({ campaignId, content }) => {
    if (!content?.trim()) return;
    const membership = await query(
      'select 1 from campaign_members where campaign_id = $1 and user_id = $2',
      [campaignId, socket.user.id]
    );
    if (!membership.rowCount) return;

    const { rows } = await query(
      `insert into messages (campaign_id, user_id, content)
       values ($1, $2, $3)
       returning id, campaign_id, user_id, content, created_at`,
      [campaignId, socket.user.id, content.trim()]
    );
    io.to(`campaign:${campaignId}`).emit('message:new', {
      ...rows[0],
      user_name: socket.user.name
    });
  });
}
