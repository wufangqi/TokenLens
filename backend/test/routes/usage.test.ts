import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createUsageRouter } from '../../src/routes/usage';
import { ProviderError } from '../../src/models';

function makeApp(provider: any) {
  const app = express();
  app.use(express.json());
  app.use('/api', createUsageRouter(provider));
  return app;
}

describe('usage route', () => {
  it('returns provider data with source label', async () => {
    const provider = {
      name: 'mock',
      teamUsage: vi.fn().mockResolvedValue({ totalCredits: 100, remainingCredits: 50, usedPct: 50, todayCredits: 1, generation: 1 }),
      members: vi.fn().mockResolvedValue([]),
      models: vi.fn().mockResolvedValue([]),
      trend: vi.fn().mockResolvedValue([]),
    };
    const res = await request(makeApp(provider)).get('/api/usage');
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('mock');
    expect(res.body.data.team.totalCredits).toBe(100);
  });

  it('returns 401 when provider throws auth error', async () => {
    const provider = {
      name: 'cli',
      teamUsage: vi.fn().mockRejectedValue(new ProviderError('login needed', 'auth')),
      members: vi.fn().mockResolvedValue([]),
      models: vi.fn().mockResolvedValue([]),
      trend: vi.fn().mockResolvedValue([]),
    };
    const res = await request(makeApp(provider)).get('/api/usage');
    expect(res.status).toBe(401);
    expect(res.body.kind).toBe('auth');
  });
});