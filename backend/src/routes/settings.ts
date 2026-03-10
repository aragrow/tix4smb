import { Router, Request, Response } from 'express';
import { loadAIConfig, saveAIConfig, PROVIDER_MODELS, type AIProvider } from '../services/aiConfig';
import { authenticate } from '../middleware/authenticate';

const router = Router();
router.use(authenticate);

router.get('/api/settings/ai', (_req: Request, res: Response) => {
  const config = loadAIConfig();
  res.json({ ...config, providers: PROVIDER_MODELS });
});

router.post('/api/settings/ai', (req: Request, res: Response) => {
  const { provider, model } = req.body as { provider: AIProvider; model: string };
  saveAIConfig({ provider, model });
  res.json({ ok: true });
});

export default router;
