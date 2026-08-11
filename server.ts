import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes.js';

async function startServer() {
  const app = express();
  let port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS middleware for multi-device & multi-employee LAN network access
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API routes FIRST
  app.use('/api', apiRouter);

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const listen = (targetPort: number) => {
    const server = app.listen(targetPort, '0.0.0.0', () => {
      console.log(`[Zerrouki Sweets Server] Running on http://localhost:${targetPort}`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[Zerrouki Sweets Server] Port ${targetPort} is busy. Trying port ${targetPort + 1}...`);
        listen(targetPort + 1);
      } else {
        console.error('Failed to start server:', err);
      }
    });
  };

  listen(port);
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
