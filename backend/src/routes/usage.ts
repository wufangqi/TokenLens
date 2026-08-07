import { Router } from 'express';
import { UsageProvider, UsageSourceQuery } from '../providers';
import { ProviderError } from '../models';

export interface UsageProviderMap {
  qianwen: UsageProvider;
  deepseek: UsageProvider;
}

function resolveSource(raw: unknown): UsageSourceQuery {
  return raw === 'deepseek' ? 'deepseek' : 'qianwen';
}

export function createUsageRouter(providers: UsageProviderMap): Router {
  const r = Router();
  r.get('/usage', async (req, res) => {
    const source = resolveSource(req.query.source);
    const provider = providers[source];
    try {
      const [teamR, membersR, modelsR, trendR, consumptionR] = await Promise.allSettled([
        provider.teamUsage(),
        provider.members(),
        provider.models(),
        provider.trend(168),
        provider.consumption(),
      ]);

      if (teamR.status === 'rejected') {
        const e = teamR.reason;
        if (e instanceof ProviderError) {
          res.status(e.kind === 'auth' ? 401 : 502).json({ error: e.message, kind: e.kind });
          return;
        }
        res.status(500).json({ error: '内部错误', kind: 'unknown' });
        return;
      }

      const warn = (label: string, r: PromiseSettledResult<unknown>) => {
        if (r.status === 'rejected') {
          console.warn(`[TokenLens] ${label} 失败:`, (r.reason as Error)?.message ?? r.reason);
        }
      };
      warn('members', membersR);
      warn('models', modelsR);
      warn('trend', trendR);
      warn('consumption', consumptionR);

      res.json({
        source: provider.name,
        data: {
          team: teamR.value,
          members: membersR.status === 'fulfilled' ? membersR.value : [],
          models: modelsR.status === 'fulfilled' ? modelsR.value : [],
          trend: trendR.status === 'fulfilled' ? trendR.value : [],
          consumption: consumptionR.status === 'fulfilled' ? consumptionR.value : [],
        },
      });
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
