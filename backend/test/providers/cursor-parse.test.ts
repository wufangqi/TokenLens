import { describe, it, expect } from 'vitest';
import { parseCursorUsageSummary } from '../../src/providers/cursor-parse';

describe('parseCursorUsageSummary', () => {
  it('maps plan cents to USD KPIs', () => {
    const team = parseCursorUsageSummary(
      {
        membershipType: 'pro',
        billingCycleEnd: '2026-09-01T00:00:00.000Z',
        individualUsage: {
          plan: { enabled: true, used: 1207, limit: 2000, remaining: 793 },
        },
      },
      3,
    );
    expect(team.billAmount).toBeCloseTo(12.07);
    expect(team.balanceAmount).toBeCloseTo(7.93);
    expect(team.planLimit).toBeCloseTo(20);
    expect(team.currency).toBe('USD');
    expect(team.usedPct).toBeCloseTo(60.35, 1);
    expect(team.membershipType).toBe('pro');
    expect(team.generation).toBe(3);
  });

  it('derives remaining when only used/limit present', () => {
    const team = parseCursorUsageSummary(
      { individualUsage: { plan: { used: 500, limit: 1000 } } },
      1,
    );
    expect(team.balanceAmount).toBeCloseTo(5);
    expect(team.usedPct).toBeCloseTo(50);
  });
});
