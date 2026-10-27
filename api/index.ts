import express from 'express';
import { apiRouter } from '../server/api.ts';

const app = express();

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Mount router under /api as well as root for Vercel Serverless Function rewrites
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
