// Augment Express Request with our JWT auth user (separate from Passport's req.user)
declare global {
  namespace Express {
    interface Request {
      authUser?: { id: string; email: string };
    }
  }
}

export {};
