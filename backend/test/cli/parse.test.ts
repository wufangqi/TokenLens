import { describe, it, expect } from 'vitest';
import { parseTeamUsage, parseModelUsage, parseSeats } from '../../src/cli/parse';

const usageSummaryFixture = {
  token_plan: {
    subscribed: true,
    planName: '团队版',
    totalCredits: 250000,
    remainingCredits: 145000,
    usedPct: 42,
    resetDate: '2026-09-01',
  },
};

describe('parseTeamUsage', () => {
  it('maps token_plan fields to TeamUsage', () => {
    const out = parseTeamUsage(usageSummaryFixture);
    expect(out.totalCredits).toBe(250000);
    expect(out.remainingCredits).toBe(145000);
    expect(out.usedPct).toBe(42);
  });
});

describe('parseModelUsage', () => {
  it('maps breakdown models to ModelUsage', () => {
    const fixture = {
      items: [
        { model_id: 'qwen-max', usage: { tokens: 1000 }, cost: 2.0 },
        { model_id: 'deepseek-v3', usage: { tokens: 500 }, cost: 1.0 },
      ],
    };
    const out = parseModelUsage(fixture);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe('qwen-max');
    expect(out[0].pct).toBeCloseTo(66.67, 1);
  });
});

describe('parseSeats', () => {
  it('maps seats to MemberUsage', () => {
    const fixture = {
      seats: [
        { user_name: 'Alice', spec_type: 'pro' },
        { user_name: 'Bob', spec_type: 'standard' },
      ],
    };
    const out = parseSeats(fixture);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe('Alice');
  });
});