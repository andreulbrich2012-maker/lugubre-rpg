import { query } from './db/pool.js';
import { verifyToken } from './middleware/auth.js';

export async function requireSocketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    const payload = verifyToken(token);
    const result = await query(
      'select id, name, email, role, profile_image_url, token_version from users where id=$1',
      [payload.id]
    );
    const user = result.rows[0];
    if (!user || Number(payload.ver || 0) !== Number(user.token_version || 0)) {
      return next(new Error('Não autenticado.'));
    }
    socket.user = user;
    next();
  } catch {
    next(new Error('Não autenticado.'));
  }
}

export function registerChatHandlers(io, socket) {
  socket.on('campaign:join', async (campaignId) => {
    try {
      const membership = await query(
        'select 1 from campaign_members where campaign_id = $1 and user_id = $2',
        [campaignId, socket.user.id]
      );
      if (membership.rowCount) socket.join(`campaign:${campaignId}`);
    } catch {
      socket.emit('campaign:error', { message: 'Não foi possível entrar no chat.' });
    }
  });

  socket.on('message:send', async ({ campaignId, content }) => {
    try {
      const message = typeof content === 'string' ? content.trim() : '';
      if (!message || message.length > 4000) {
        socket.emit('campaign:error', { message: 'A mensagem deve ter entre 1 e 4000 caracteres.' });
        return;
      }
      const membership = await query(
        'select character_id, shared_character_id, color from campaign_members where campaign_id = $1 and user_id = $2',
        [campaignId, socket.user.id]
      );
      if (!membership.rowCount) return;

      const { rows } = await query(
        `insert into messages (campaign_id, user_id, character_id, content)
         values ($1, $2, $3, $4)
         returning id, campaign_id, user_id, character_id, content, edited_at, created_at, updated_at`,
        [campaignId, socket.user.id, membership.rows[0].shared_character_id || membership.rows[0].character_id || null, message]
      );
      io.to(`campaign:${campaignId}`).emit('campaign:message:new', {
        ...rows[0],
        user_name: socket.user.name,
        user_avatar: socket.user.profile_image_url || '',
        color: membership.rows[0].color || '#d6a65f'
      });
    } catch {
      socket.emit('campaign:error', { message: 'Não foi possível enviar a mensagem.' });
    }
  });
}
