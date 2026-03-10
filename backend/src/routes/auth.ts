import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { env } from '../config/env';
import { authLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/authenticate';

const router = Router();
const isProduction = env.NODE_ENV === 'production';

// ─── Passport Setup ────────────────────────────────────────────────

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${env.API_URL}/auth/google/callback`,
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: (error: Error | null, user?: IUser) => void
    ) => {
      try {
        const email = profile.emails?.[0]?.value ?? '';
        const user = await User.findOneAndUpdate(
          { google_id: profile.id },
          {
            google_id: profile.id,
            email,
            name: profile.displayName,
            avatar_url: profile.photos?.[0]?.value,
            last_login_at: new Date(),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        done(null, user);
      } catch (err) {
        done(err as Error);
      }
    }
  )
);

passport.serializeUser((user: Express.User, done) => {
  done(null, (user as IUser)._id.toString());
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// ─── Token helpers ─────────────────────────────────────────────────

function issueTokens(res: Response, userId: string, email: string): void {
  const accessToken = jwt.sign({ id: userId, email }, env.JWT_ACCESS_SECRET, {
    expiresIn: '2h',
  });
  const refreshToken = jwt.sign({ id: userId, email }, env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });

  const base = { httpOnly: true, secure: isProduction, sameSite: 'lax' as const };

  res.cookie('access_token', accessToken, { ...base, maxAge: 2 * 60 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, {
    ...base,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

// ─── Routes ────────────────────────────────────────────────────────

router.get(
  '/auth/google',
  authLimiter,
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${env.FRONTEND_URL}/login?error=auth_failed`,
  }),
  (req: Request, res: Response) => {
    const user = req.user as IUser;
    issueTokens(res, user._id.toString(), user.email);
    // Destroy OAuth session — JWT cookies take over from here
    req.session.destroy(() => {
      res.redirect(env.FRONTEND_URL);
    });
  }
);

router.post('/auth/refresh', (req: Request, res: Response) => {
  const token = req.cookies?.refresh_token as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string; email: string };
    issueTokens(res, payload.id, payload.email);
    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

router.post('/auth/logout', authenticate, (req: Request, res: Response) => {
  const base = { httpOnly: true, secure: isProduction, sameSite: 'lax' as const };
  res.clearCookie('access_token', base);
  res.clearCookie('refresh_token', { ...base, path: '/' });
  res.json({ ok: true });
});

export default router;
