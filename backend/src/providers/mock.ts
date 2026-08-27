import { TeamUsage, MemberUsage, ModelUsage, TrendPoint, ConsumptionRow } from '../models';
import { UsageProvider } from './index';

const TOTAL = 250000; // 模拟标准席位 Credits 总量
const MEMBERS = ['Alice', 'Bob', 'Carol', 'Dave'];
const MEMBER_WEIGHTS = [0.4, 0.3, 0.2, 0.1];
const MODELS = ['qwen-max', 'deepseek-v3', 'kimi-k2'];
const MODEL_WEIGHTS = [0.5, 0.3, 0.2];

export class MockProvider implements UsageProvider {
  readonly name = 'mock' as const;
  private generation = 0;
  private readonly base = TOTAL * 0.42;
  private cache: { at: number; team: TeamUsage } | null = null;
  private static readonly TTL_MS = 5_000;

  private drift(): number {
    return (Math.sin(Date.now() / 60000) + 1) * 50; // 平滑波动
  }

  /** 单次轮询内复用同一快照,保证 members/models/consumption 数值一致。 */
  private snapshot(): TeamUsage {
    const now = Date.now();
    if (this.cache && now - this.cache.at < MockProvider.TTL_MS) return this.cache.team;
    const total = this.base + this.drift();
    const team: TeamUsage = {
      totalCredits: total,
      remainingCredits: TOTAL - total,
      usedPct: (total / TOTAL) * 100,
      todayCredits: 120 + (now % 80),
      generation: this.generation,
      billAmount: 499,
      balanceAmount: 37.01,
      currency: 'CNY',
    };
    this.cache = { at: now, team };
    return team;
  }

  async teamUsage(): Promise<TeamUsage> {
    this.generation += 1;
    return { ...this.snapshot(), generation: this.generation };
  }

  async members(): Promise<MemberUsage[]> {
    const team = this.snapshot();
    return MEMBERS.map((name, i) => ({
      name,
      credits: team.totalCredits * (MEMBER_WEIGHTS[i] ?? 0),
      sessions: 20 + i * 7,
      pct: (MEMBER_WEIGHTS[i] ?? 0) * 100,
    }));
  }

  async models(): Promise<ModelUsage[]> {
    const team = this.snapshot();
    return MODELS.map((name, i) => ({
      name,
      credits: team.totalCredits * (MODEL_WEIGHTS[i] ?? 0),
      pct: (MODEL_WEIGHTS[i] ?? 0) * 100,
    }));
  }

  async consumption(): Promise<ConsumptionRow[]> {
    const team = this.snapshot();
    return MODELS.map((name, i) => ({
      name,
      credits: team.totalCredits * (MODEL_WEIGHTS[i] ?? 0),
      cost: (team.billAmount ?? 0) * (MODEL_WEIGHTS[i] ?? 0),
      pct: (MODEL_WEIGHTS[i] ?? 0) * 100,
    }));
  }

  async trend(hours: number): Promise<TrendPoint[]> {
    const now = Date.now();
    return Array.from({ length: hours }, (_, i) => ({
      ts: new Date(now - (hours - i) * 3600_000).toISOString(),
      credits: 40 + Math.sin(i) * 20 + i,
    }));
  }
}
