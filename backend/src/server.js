import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { requireSocketAuth, registerChatHandlers } from './socket.js';

dotenv.config();

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' }
});

io.use(requireSocketAuth);
io.on('connection', (socket) => registerChatHandlers(io, socket));

const port = Number(process.env.PORT || 3333);
server.listen(port, () => {
  console.log(`Lúgubre RPG API em http://localhost:${port}`);
});
