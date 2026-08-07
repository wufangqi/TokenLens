import { describe, it, expect } from 'vitest';
import {
  parseCodeBuddyTeam,
  parseCodeBuddyModels,
  parseCodeBuddyConsumption,
  parseCodeBuddyTrend,
} from '../../src/providers/codebuddy-parse';

const fixture = {
  activeDays: 12,
  totalDays: 30,
  streaks: { currentStreak: 3, longestStreak: 7 },
  modelUsage: {
    'gpt-5': {
      displayName: 'GPT-5',
      inputTokens: 1000,
      outputTokens: 200,
      cacheReadInputTokens: 100,
      costUSD: 1.5,
    },
    'deepseek-v3': {
      inputTokens: 500,
      outputTokens: 100,
      cacheReadInputTokens: 0,
      costUSD: 0.2,
    },
  },
  dailyModelTokens: [
    { date: '2026-08-01', tokensByModel: { 'gpt-5': 100, 'deepseek-v3': 50 } },
    { date: '2026-08-02', tokensByModel: { 'gpt-5': 200 } },
  ],
};

describe('parseCodeBuddy*', () => {
  it('maps team KPIs from modelUsage and streaks', () => {
    const t = parseCodeBuddyTeam(fixture, 2);
    expect(t.generation).toBe(2);
    expect(t.totalCredits).toBe(1800);
    expect(t.activeDays).toBe(12);
    expect(t.currentStreak).toBe(3);
  });

  it('maps models with pct', () => {
    const m = parseCodeBuddyModels(fixture);
    expect(m[0].name).toBe('GPT-5');
    expect(m[0].credits).toBe(1200);
    expect(m[0].pct).toBeCloseTo(66.67, 1);
  });

  it('maps consumption with costUSD', () => {
    const c = parseCodeBuddyConsumption(fixture);
    expect(c[0].cost).toBeCloseTo(1.5);
  });

  it('maps daily trend', () => {
    const tr = parseCodeBuddyTrend(fixture, 48);
    expect(tr).toHaveLength(2);
    expect(tr[0].credits).toBe(150);
    expect(tr[1].credits).toBe(200);
  });
});
