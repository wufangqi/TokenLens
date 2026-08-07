import { TeamUsage, MemberUsage, ModelUsage, TrendPoint } from '../models';
import { UsageProvider } from './index';

const TOTAL = 250000; // 模拟标准席位 Credits 总量
const MEMBERS = ['Alice', 'Bob', 'Carol', 'Dave'];
const MODELS = ['qwen-max', 'deepseek-v3', 'kimi-k2'];

export class MockProvider implements UsageProvider {
  readonly name = 'mock' as const;
  private generation = 0;
  private base = TOTAL * 0.42;

  private drift(): number {
    return (Math.sin(Date.now() / 60000) + 1) * 50; // 平滑波动
  }

  async teamUsage(): Promise<TeamUsage> {
    this.generation += 1;
    const total = this.base + this.drift();
    return {
      totalCredits: total,
      remainingCredits: TOTAL - total,
      usedPct: (total / TOTAL) * 100,
      todayCredits: 120 + (Date.now() % 80),
      generation: this.generation,
    };
  }

  async members(): Promise<MemberUsage[]> {
    const team = await this.teamUsage();
    const weights = [0.4, 0.3, 0.2, 0.1];
    return MEMBERS.map((name, i) => {
      const credits = team.totalCredits * (weights[i] ?? 0);
      return { name, credits, sessions: 20 + i * 7, pct: (weights[i] ?? 0) * 100 };
    });
  }

  async models(): Promise<ModelUsage[]> {
    const team = await this.teamUsage();
    const weights = [0.5, 0.3, 0.2];
    return MODELS.map((name, i) => ({
      name,
      credits: team.totalCredits * (weights[i] ?? 0),
      pct: (weights[i] ?? 0) * 100,
    }));
  }

  async trend(hours: number): Promise<TrendPoint[]> {
    const now = Date.now();
    return Array.from({ length: hours }, (_, i) => {
      const ts = new Date(now - (hours - i) * 3600_000);
      return { ts: ts.toISOString(), credits: 40 + Math.sin(i) * 20 + i };
    });
  }
}