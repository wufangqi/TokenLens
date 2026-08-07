import { describe, it, expect } from 'vitest';
import { MockProvider } from '../../src/providers/mock';

describe('MockProvider', () => {
  it('generates monotonically increasing generation', async () => {
    const p = new MockProvider();
    const t1 = await p.teamUsage();
    const t2 = await p.teamUsage();
    expect(t2.generation).toBeGreaterThan(t1.generation);
  });

  it('usedPct is between 0 and 100', async () => {
    const p = new MockProvider();
    const t = await p.teamUsage();
    expect(t.usedPct).toBeGreaterThanOrEqual(0);
    expect(t.usedPct).toBeLessThanOrEqual(100);
  });

  it('members sum to roughly team total', async () => {
    const p = new MockProvider();
    const [team, members] = await Promise.all([p.teamUsage(), p.members()]);
    const sum = members.reduce((a, m) => a + m.credits, 0);
    expect(Math.abs(sum - team.totalCredits)).toBeLessThan(team.totalCredits * 0.2);
  });
});