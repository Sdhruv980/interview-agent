import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import connectDB from './config/db';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import interviewsRouter from './routes/interviews';
import usersRouter from './routes/users';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ?? 5000;

// ── Security & utility middleware ──────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/health',     healthRouter);
app.use('/api/auth',       authRouter);
app.use('/api/interviews', interviewsRouter);
app.use('/api/users',      usersRouter);

// ── 404 & global error handler ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────
const start = async (): Promise<void> => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV ?? 'development'} mode`);
  });
};

start();

export default app;
