import { describe, it, expect } from 'vitest';
import {
  parseTeamUsage,
  parseModelUsage,
  parseSeats,
  parseTrendDays,
  parseBillSummary,
  parseBalance,
  parseConsumption,
} from '../../src/cli/parse';

describe('parseTeamUsage', () => {
  it('maps token_plan credits for subscribed users', () => {
    const out = parseTeamUsage({
      token_plan: { subscribed: true, totalCredits: 250000, remainingCredits: 145000, usedPct: 42 },
    });
    expect(out.totalCredits).toBe(250000);
    expect(out.remainingCredits).toBe(145000);
    expect(out.usedPct).toBe(42);
  });

  it('returns zeros when not subscribed (free tier)', () => {
    const out = parseTeamUsage({ token_plan: { subscribed: false } });
    expect(out.totalCredits).toBe(0);
    expect(out.remainingCredits).toBe(0);
    expect(out.usedPct).toBe(0);
  });

  it('tolerates missing token_plan', () => {
    expect(parseTeamUsage({}).totalCredits).toBe(0);
  });
});

describe('parseModelUsage', () => {
  it('maps pay_as_you_go.models to ModelUsage using tokens', () => {
    const fixture = {
      pay_as_you_go: {
        models: [
          { model_id: 'qwen-max', usage: { tokens: 1000 }, cost: 2.0 },
          { model_id: 'deepseek-v3', usage: { tokens: 500 }, cost: 1.0 },
        ],
      },
    };
    const out = parseModelUsage(fixture);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe('qwen-max');
    expect(out[0].credits).toBe(1000);
    expect(out[0].pct).toBeCloseTo(66.67, 1);
  });

  it('returns empty when no models', () => {
    expect(parseModelUsage({})).toEqual([]);
  });
});

describe('parseSeats', () => {
  it('maps items array to MemberUsage', () => {
    const fixture = {
      items: [
        { user_name: 'Alice', spec_type: 'pro' },
        { user_name: 'Bob', spec_type: 'standard' },
      ],
    };
    const out = parseSeats(fixture);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe('Alice');
  });
});

describe('parseTrendDays', () => {
  it('merges per-model breakdown rows by day', () => {
    const breakdowns = [
      { model_id: 'a', rows: [{ period: '2026-08-01', tokens_in: 100 }, { period: '2026-08-02', tokens_in: 200 }] },
      { model_id: 'b', rows: [{ period: '2026-08-01', tokens_in: 50 }] },
    ];
    const out = parseTrendDays(breakdowns, 48);
    expect(out).toHaveLength(2);
    expect(out[0].ts).toBe('2026-08-01T00:00:00.000Z');
    expect(out[0].credits).toBe(150);
    expect(out[1].credits).toBe(200);
  });
});

describe('parseBillSummary', () => {
  it('maps totals.aftertaxAmount to amount', () => {
    const out = parseBillSummary({ totals: { aftertaxAmount: '499.000000' }, currency: 'CNY' });
    expect(out.amount).toBe(499);
    expect(out.currency).toBe('CNY');
  });

  it('returns 0 when totals missing', () => {
    expect(parseBillSummary({}).amount).toBe(0);
  });
});

describe('parseBalance', () => {
  it('maps availableAmount to amount', () => {
    const out = parseBalance({ availableAmount: '37.01', currency: 'CNY' });
    expect(out.amount).toBeCloseTo(37.01);
    expect(out.currency).toBe('CNY');
  });

  it('returns 0 when missing', () => {
    expect(parseBalance({}).amount).toBe(0);
  });
});

describe('parseConsumption', () => {
  it('merges model tokens with breakdown cost', () => {
    const summary = {
      pay_as_you_go: {
        models: [
          { model_id: 'qwen-max', usage: { tokens: 1000 } },
          { model_id: 'deepseek-v3', usage: { tokens: 500 } },
        ],
      },
    };
    const breakdown = {
      rows: [
        { groupKey: 'DIMENSION_FILTER_NULL_VALUE', groupLabel: '-', amount: '499' },
        { groupKey: 'qwen-max', groupLabel: 'qwen-max', amount: '0' },
      ],
    };
    const out = parseConsumption(summary, breakdown);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe('qwen-max');
    expect(out[0].credits).toBe(1000);
    expect(out[0].cost).toBe(0);
    expect(out[0].pct).toBeCloseTo(66.67, 1);
    expect(out[1].name).toBe('deepseek-v3');
    expect(out[1].cost).toBe(0);
  });

  it('returns empty when no models', () => {
    expect(parseConsumption({}, {})).toEqual([]);
  });
});