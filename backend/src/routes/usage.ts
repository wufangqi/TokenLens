import { Router } from 'express';
import { UsageProvider } from '../providers';
import { ProviderError } from '../models';

export function createUsageRouter(provider: UsageProvider): Router {
  const r = Router();
  r.get('/usage', async (_req, res) => {
    try {
      const [team, members, models, trend] = await Promise.all([
        provider.teamUsage(),
        provider.members(),
        provider.models(),
        provider.trend(24),
      ]);
      res.json({ source: provider.name, data: { team, members, models, trend } });
    } catch (e) {
      if (e instanceof ProviderError) {
        res.status(e.kind === 'auth' ? 401 : 502).json({ error: e.message, kind: e.kind });
      } else {
        res.status(500).json({ error: '内部错误', kind: 'unknown' });
      }
    }
  });
  return r;
}