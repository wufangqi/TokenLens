import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createUsageRouter } from '../../src/routes/usage';
import { ProviderError } from '../../src/models';
import { DeepSeekProvider } from '../../src/providers/deepseek';

function makeApp(providers: { qianwen: any; deepseek: any; codebuddy?: any }) {
  const app = express();
  app.use(express.json());
  app.use(
    '/api',
    createUsageRouter({
      codebuddy: providers.codebuddy ?? { name: 'codebuddy', teamUsage: vi.fn(), ...emptyFns },
      ...providers,
    }),
  );
  return app;
}

const emptyFns = {
  members: vi.fn().mockResolvedValue([]),
  models: vi.fn().mockResolvedValue([]),
  trend: vi.fn().mockResolvedValue([]),
  consumption: vi.fn().mockResolvedValue([]),
};

describe('usage route', () => {
  it('returns provider data with source label', async () => {
    const qianwen = {
      name: 'mock',
      teamUsage: vi.fn().mockResolvedValue({
        totalCredits: 100,
        remainingCredits: 50,
        usedPct: 50,
        todayCredits: 1,
        generation: 1,
      }),
      ...emptyFns,
    };
    const deepseek = { name: 'deepseek', teamUsage: vi.fn(), ...emptyFns };
    const res = await request(makeApp({ qianwen, deepseek })).get('/api/usage');
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('mock');
    expect(res.body.data.team.totalCredits).toBe(100);
  });

  it('returns 401 when provider throws auth error', async () => {
    const qianwen = {
      name: 'cli',
      teamUsage: vi.fn().mockRejectedValue(new ProviderError('login needed', 'auth')),
      ...emptyFns,
    };
    const deepseek = { name: 'deepseek', teamUsage: vi.fn(), ...emptyFns };
    const res = await request(makeApp({ qianwen, deepseek })).get('/api/usage');
    expect(res.status).toBe(401);
    expect(res.body.kind).toBe('auth');
  });

  it('routes source=deepseek to DeepSeek provider', async () => {
    const qianwen = { name: 'mock', teamUsage: vi.fn(), ...emptyFns };
    const deepseek = {
      name: 'deepseek',
      teamUsage: vi.fn().mockResolvedValue({
        totalCredits: 0,
        remainingCredits: 0,
        usedPct: 0,
        todayCredits: 0,
        generation: 1,
        balanceAmount: 12.34,
        currency: 'CNY',
      }),
      ...emptyFns,
    };
    const res = await request(makeApp({ qianwen, deepseek })).get('/api/usage?source=deepseek');
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('deepseek');
    expect(res.body.data.team.balanceAmount).toBeCloseTo(12.34);
    expect(qianwen.teamUsage).not.toHaveBeenCalled();
    expect(deepseek.teamUsage).toHaveBeenCalled();
  });

  it('returns 401 when DeepSeek key missing', async () => {
    const qianwen = { name: 'mock', teamUsage: vi.fn(), ...emptyFns };
    const deepseek = new DeepSeekProvider({ apiKey: '' });
    const res = await request(makeApp({ qianwen, deepseek })).get('/api/usage?source=deepseek');
    expect(res.status).toBe(401);
    expect(res.body.kind).toBe('auth');
  });

  it('routes source=codebuddy to CodeBuddy provider', async () => {
    const qianwen = { name: 'mock', teamUsage: vi.fn(), ...emptyFns };
    const deepseek = { name: 'deepseek', teamUsage: vi.fn(), ...emptyFns };
    const codebuddy = {
      name: 'codebuddy',
      teamUsage: vi.fn().mockResolvedValue({
        totalCredits: 1800,
        remainingCredits: 0,
        usedPct: 0,
        todayCredits: 0,
        generation: 1,
        activeDays: 12,
        currentStreak: 3,
      }),
      ...emptyFns,
    };
    const res = await request(makeApp({ qianwen, deepseek, codebuddy })).get(
      '/api/usage?source=codebuddy',
    );
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('codebuddy');
    expect(res.body.data.team.totalCredits).toBe(1800);
    expect(res.body.data.team.activeDays).toBe(12);
  });
});
