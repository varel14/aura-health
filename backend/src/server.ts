import { createServer } from 'node:http';
import { Server } from 'socket.io';
import app from './app.js';
import { pool } from './db.js';
import { config } from './config.js';
import { attachCallRelay } from './realtime/callRelay.js';
import { attachChatHub } from './realtime/chatHub.js';

const server = createServer(app);
// Socket.io : relais des consultations vidéo (callRelay) et poussage temps
// réel de la messagerie (chatHub). L'authentification du handshake est
// déclarée par callRelay et partagée par les deux modules.
const io = new Server(server, { cors: { origin: '*' } });
attachCallRelay(io);
attachChatHub(io);

server.listen(config.port, () => {
  console.log(`🩺 Aura Health API listening on http://localhost:${config.port}`);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received — closing server…`);
  io.close();
  server.close();
  await pool.end();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
