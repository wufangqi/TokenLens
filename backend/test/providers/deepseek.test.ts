import { describe, it, expect, vi } from 'vitest';
import { DeepSeekProvider } from '../../src/providers/deepseek';
import { ProviderError } from '../../src/models';

describe('DeepSeekProvider', () => {
  it('throws auth when API key missing', async () => {
    const p = new DeepSeekProvider({ apiKey: '' });
    await expect(p.teamUsage()).rejects.toMatchObject({ kind: 'auth' });
  });

  it('caches balance within TTL to avoid redundant API calls', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        balance_infos: [{ currency: 'CNY', total_balance: '10', granted_balance: '0', topped_up_balance: '10' }],
      }),
    });
    const p = new DeepSeekProvider({ apiKey: 'k', fetchImpl: fetchImpl as unknown as typeof fetch });
    const a = await p.teamUsage();
    const b = await p.teamUsage();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(b.balanceAmount).toBe(a.balanceAmount);
    expect(b.generation).toBe(a.generation); // cached snapshot, no extra increment
  });

  it('maps 401 to auth error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    const p = new DeepSeekProvider({
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(p.teamUsage()).rejects.toBeInstanceOf(ProviderError);
    await expect(p.teamUsage()).rejects.toMatchObject({ kind: 'auth' });
  });
});
