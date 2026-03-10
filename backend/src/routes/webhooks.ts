import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';

const router = Router();

router.post('/api/webhooks/jobber', (req: Request, res: Response) => {
  const sig = req.headers['x-jobber-hmac-sha256'] as string | undefined;

  if (env.JOBBER_WEBHOOK_SECRET && sig) {
    const expected = crypto
      .createHmac('sha256', env.JOBBER_WEBHOOK_SECRET)
      .update(req.body as Buffer)
      .digest('base64');

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse((req.body as Buffer).toString()) as Record<string, unknown>;
  } catch {
    res.status(400).json({ error: 'Invalid JSON payload' });
    return;
  }

  console.log('[Webhook] Jobber event:', payload?.webHookEvent);

  // TODO: Process webhook events (upsert shadow documents, update ticket status, etc.)

  res.status(200).json({ received: true });
});

export default router;
