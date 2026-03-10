import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import { env } from './config/env';
import { globalLimiter } from './middleware/rateLimiter';
import authRouter from './routes/auth';
import ticketsRouter from './routes/tickets';
import jobberRouter from './routes/jobber';
import webhooksRouter from './routes/webhooks';
import settingsRouter from './routes/settings';
import ghlRouter from './routes/ghl';

export const app = express();

// ─── Security ─────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// ─── Webhooks need raw body (before express.json) ─────────────────
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

// ─── Middleware ───────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: env.JWT_ACCESS_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000, // 10 minutes — only for OAuth handshake
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(globalLimiter);

// ─── Routes ───────────────────────────────────────────────────────
app.use(authRouter);
app.use(ticketsRouter);
app.use(jobberRouter);
app.use(webhooksRouter);
app.use(settingsRouter);
app.use(ghlRouter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, env: env.NODE_ENV });
});

// ─── Global error handler ─────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.message);
  if (env.NODE_ENV === 'development') {
    res.status(500).json({ error: err.message, stack: err.stack });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
});
