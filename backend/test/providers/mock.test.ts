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

  it('members and team share one snapshot within a poll (exactly consistent)', async () => {
    const p = new MockProvider();
    const [team, members, models, consumption] = await Promise.all([
      p.teamUsage(),
      p.members(),
      p.models(),
      p.consumption(),
    ]);
    // members / models / consumption all derive from the same cached total,
    // so they must add up exactly (no generation drift between calls).
    const memberSum = members.reduce((a: number, m) => a + m.credits, 0);
    const modelSum = models.reduce((a: number, m) => a + m.credits, 0);
    const consumptionSum = consumption.reduce((a: number, c) => a + c.credits, 0);
    expect(memberSum).toBeCloseTo(team.totalCredits); // weights sum to 1.0
    expect(modelSum).toBeCloseTo(team.totalCredits);
    expect(consumptionSum).toBeCloseTo(team.totalCredits);
    expect(team.generation).toBe(1); // incremented once, not 4×
  });
});