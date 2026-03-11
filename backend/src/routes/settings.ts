import { Router, Request, Response } from 'express';
import { loadAIConfig, saveAIConfig, PROVIDER_MODELS, type AIProvider, type AIConfig } from '../services/aiConfig';
import { saveGHLConfig, clearGHLConfig, hasGHLConfig, getGHLConfig } from '../services/ghlClient';
import { authenticate } from '../middleware/authenticate';

const router = Router();
router.use(authenticate);

router.get('/api/settings/ai', (_req: Request, res: Response) => {
  const config = loadAIConfig();
  res.json({ ...config, providers: PROVIDER_MODELS });
});

router.post('/api/settings/ai', (req: Request, res: Response) => {
  const { provider, model, rfp_message_grouping } = req.body as Partial<AIConfig>;
  const current = loadAIConfig();
  saveAIConfig({
    provider: (provider ?? current.provider) as AIProvider,
    model: model ?? current.model,
    rfp_message_grouping: rfp_message_grouping ?? current.rfp_message_grouping,
  });
  res.json({ ok: true });
});

// ─── GHL settings ──────────────────────────────────────────────────

router.get('/api/settings/ghl', (_req: Request, res: Response) => {
  const cfg = getGHLConfig();
  res.json({ connected: hasGHLConfig(), location_id: cfg?.location_id ?? '' });
});

router.post('/api/settings/ghl', (req: Request, res: Response) => {
  const { api_key, location_id } = req.body as { api_key?: string; location_id?: string };
  if (!api_key || !location_id) {
    res.status(400).json({ error: 'api_key and location_id are required' });
    return;
  }
  saveGHLConfig({ api_key, location_id });
  res.json({ ok: true });
});

router.delete('/api/settings/ghl', (_req: Request, res: Response) => {
  clearGHLConfig();
  res.json({ ok: true });
});

export default router;
