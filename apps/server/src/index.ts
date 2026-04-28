// Server entry point — Express HTTP + Colyseus WebSocket transport.

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import { WorldRoom } from './rooms/WorldRoom.js';
import { ALL_MAP_IDS, STARTING_MAP } from 'shared';

const port = Number(process.env.PORT ?? 2567);
const app = express();
app.use(express.json());

// CORS — set ALLOWED_ORIGINS=https://your-app.vercel.app,https://classroom.example.com to lock down,
// otherwise wildcard for classroom convenience. WebSocket is unaffected by CORS.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '*').split(',').map(s => s.trim());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allow = allowedOrigins[0] === '*' ? '*'
    : (origin && allowedOrigins.includes(origin)) ? origin
    : allowedOrigins[0] ?? '*';
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const httpServer = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

// Register one WorldRoom per map id
for (const mapId of ALL_MAP_IDS) {
  gameServer.define(`world_${mapId}`, WorldRoom, { mapId });
}

// Health and monitoring — basic-auth in production (set MONITOR_USER + MONITOR_PASS).
// In dev (no env vars set), monitor is open at /colyseus.
const monUser = process.env.MONITOR_USER;
const monPass = process.env.MONITOR_PASS;
if (process.env.NODE_ENV === 'production' && monUser && monPass) {
  app.use('/colyseus', (req, res, next) => {
    const hdr = req.headers.authorization ?? '';
    const [scheme, b64] = hdr.split(' ');
    if (scheme !== 'Basic' || !b64) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Colyseus Monitor"');
      return res.status(401).send('Authentication required');
    }
    const [user, pass] = Buffer.from(b64, 'base64').toString().split(':');
    if (user !== monUser || pass !== monPass) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Colyseus Monitor"');
      return res.status(401).send('Bad credentials');
    }
    next();
  });
}
app.use('/colyseus', monitor());
app.get('/', (_req, res) => {
  res.send('🗡️ Runeword Chronicle Server — online. Open /colyseus for monitor.');
});
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    starting_map: STARTING_MAP,
    map_count: ALL_MAP_IDS.length,
    uptime_sec: Math.floor(process.uptime()),
    time: new Date().toISOString(),
  });
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════════');
  console.log(`  🗡️  Runeword Chronicle Server`);
  console.log(`  Listening on 0.0.0.0:${port}`);
  console.log(`  Monitor at http://localhost:${port}/colyseus`);
  console.log(`  Maps registered: ${ALL_MAP_IDS.length}`);
  console.log(`  Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log('═══════════════════════════════════════════════════');
});

process.on('unhandledRejection', (e) => {
  console.error('Unhandled rejection:', e);
});
