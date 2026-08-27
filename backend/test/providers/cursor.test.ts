import { describe, it, expect, vi } from 'vitest';
import { CursorProvider } from '../../src/providers/cursor';
import { ProviderError } from '../../src/models';

describe('CursorProvider', () => {
  it('throws auth when session token missing', async () => {
    const p = new CursorProvider({ sessionToken: '' });
    await expect(p.teamUsage()).rejects.toMatchObject({ kind: 'auth' });
  });

  it('fetches usage-summary with Workos cookie', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        membershipType: 'pro',
        individualUsage: { plan: { used: 100, limit: 2000, remaining: 1900 } },
      }),
    });
    const p = new CursorProvider({
      sessionToken: 'user_01%3A%3AeyJhbGciOiJ',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const team = await p.teamUsage();
    expect(team.billAmount).toBeCloseTo(1);
    expect(team.balanceAmount).toBeCloseTo(19);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://cursor.com/api/usage-summary',
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: 'WorkosCursorSessionToken=user_01::eyJhbGciOiJ',
        }),
      }),
    );
  });

  it('maps 401 to auth error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    const p = new CursorProvider({
      sessionToken: 'tok',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(p.teamUsage()).rejects.toBeInstanceOf(ProviderError);
    await expect(p.teamUsage()).rejects.toMatchObject({ kind: 'auth' });
  });

  it('caches team usage within TTL to avoid hammering the API', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ membershipType: 'pro', individualUsage: { plan: { used: 100, limit: 2000 } } }),
    });
    const p = new CursorProvider({
      sessionToken: 'tok',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await p.teamUsage();
    await p.teamUsage();
    expect(fetchImpl).toHaveBeenCalledTimes(1); // second call served from cache
  });
});
