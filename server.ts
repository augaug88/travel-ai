import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import flightsHandler from './api/flights';
import hotelsHandler from './api/hotels';
import changiHandler from './api/changi';
import fxHandler from './api/fx';
import weatherSgHandler from './api/weather/sg';
import weatherAbroadHandler from './api/weather/abroad';
import attractionsHandler from './api/attractions';
import chatHandler from './api/chat';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Mount API route handlers directly from api/ (never copies code)
  app.get('/api/flights', flightsHandler);
  app.get('/api/hotels', hotelsHandler);
  app.get('/api/changi', changiHandler);
  app.get('/api/fx', fxHandler);
  app.get('/api/weather/sg', weatherSgHandler);
  app.get('/api/weather/abroad', weatherAbroadHandler);
  app.get('/api/attractions', attractionsHandler);
  app.post('/api/chat', chatHandler);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'SG Trip Planner',
      mcp_configured: Boolean(process.env.SMITHERY_MCP_URL),
      gemini_configured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SG Trip Planner server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
