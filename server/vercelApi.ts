import express from 'express';
import { apiRouter } from './routes';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global Error Handler for Vercel Serverless Function
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Vercel Serverless Function Error:', err);
  res.status(500).json({
    error: err?.message || 'خطأ في خادم السيرفر',
    success: false
  });
});

export default app;
