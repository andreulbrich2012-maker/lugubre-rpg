import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import characterRoutes from './routes/character.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import monsterRoutes from './routes/monster.routes.js';
import adminRoutes from './routes/admin.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import friendRoutes from './routes/friend.routes.js';
import userRoutes from './routes/user.routes.js';
import powerRoutes from './routes/power.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_, res) => res.json({ ok: true, name: 'Lúgubre RPG API' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/catalog', catalogRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/characters', characterRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/monsters', monsterRoutes);
  app.use('/api/friends', friendRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/powers', powerRoutes);
  app.use('/api/feedbacks', feedbackRoutes);
  app.use('/api/admin', adminRoutes);

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Erro interno.' });
  });

  return app;
}
