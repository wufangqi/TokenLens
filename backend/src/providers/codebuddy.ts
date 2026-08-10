import { TeamUsage, MemberUsage, ModelUsage, TrendPoint, ConsumptionRow, ProviderError } from '../models';
import { UsageProvider } from './index';
import {
  CodeBuddyStats,
  parseCodeBuddyTeam,
  parseCodeBuddyModels,
  parseCodeBuddyConsumption,
  parseCodeBuddyTrend,
} from './codebuddy-parse';

export class CodeBuddyProvider implements UsageProvider {
  readonly name = 'codebuddy' as const;
  private generation = 0;
  private cache: { at: number; stats: CodeBuddyStats } | null = null;
  private static TTL_MS = 15_000;
  private readonly baseUrl: string;
  private readonly password: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts?: { baseUrl?: string; password?: string; fetchImpl?: typeof fetch }) {
    this.baseUrl = (
      opts?.baseUrl ??
      process.env.CODEBUDDY_API_BASE ??
      'http://127.0.0.1:8080'
    ).replace(/\/$/, '');
    this.password = opts?.password ?? process.env.CODEBUDDY_API_PASSWORD ?? '';
    this.fetchImpl = opts?.fetchImpl ?? fetch;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      'X-CodeBuddy-Request': '1',
      Accept: 'application/json',
    };
    if (this.password) h.Authorization = `Bearer ${this.password}`;
    return h;
  }

  private async getJson(path: string): Promise<any> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: this.headers(),
        signal: ctrl.signal,
      });
      if (res.status === 401 || res.status === 403) {
        throw new ProviderError(
          'CodeBuddy API 需要认证,请设置 CODEBUDDY_API_PASSWORD 或关闭网关密码',
          'auth',
        );
      }
      if (!res.ok) {
        throw new ProviderError(`CodeBuddy HTTP ${res.status}`, 'server');
      }
      const body = await res.json();
      // CLI 响应常包一层 { data: ... }
      return body?.data !== undefined ? body.data : body;
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      const err = e as Error;
      if (err.name === 'AbortError') {
        throw new ProviderError('CodeBuddy 请求超时', 'server');
      }
      throw new ProviderError(
        `无法连接 CodeBuddy(${this.baseUrl}),请先启动 CLI HTTP 服务: ${err.message}`,
        'cli-missing',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private async stats(): Promise<CodeBuddyStats> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < CodeBuddyProvider.TTL_MS) return this.cache.stats;
    const stats = (await this.getJson('/api/v1/stats')) as CodeBuddyStats;
    this.cache = { at: now, stats };
    return stats;
  }

  async teamUsage(): Promise<TeamUsage> {
    const stats = await this.stats();
    this.generation += 1;
    return parseCodeBuddyTeam(stats, this.generation);
  }

  async members(): Promise<MemberUsage[]> {
    return [];
  }

  async models(): Promise<ModelUsage[]> {
    return parseCodeBuddyModels(await this.stats());
  }

  async consumption(): Promise<ConsumptionRow[]> {
    return parseCodeBuddyConsumption(await this.stats());
  }

  async trend(hours: number): Promise<TrendPoint[]> {
    return parseCodeBuddyTrend(await this.stats(), hours);
  }
}
