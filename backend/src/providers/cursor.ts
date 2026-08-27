import { TeamUsage, MemberUsage, ModelUsage, TrendPoint, ConsumptionRow, ProviderError } from '../models';
import { UsageProvider } from './index';
import { parseCursorUsageSummary } from './cursor-parse';

/**
 * 个人用量：未文档化的 dashboard Session API。
 * 鉴权使用浏览器 Cookie WorkosCursorSessionToken（CURSOR_SESSION_TOKEN）。
 */
export class CursorProvider implements UsageProvider {
  readonly name = 'cursor' as const;
  private generation = 0;
  private readonly sessionToken: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private cache: { at: number; team: TeamUsage } | null = null;
  private static readonly TTL_MS = 15_000;

  constructor(opts?: { sessionToken?: string; baseUrl?: string; fetchImpl?: typeof fetch }) {
    this.sessionToken = (opts?.sessionToken ?? process.env.CURSOR_SESSION_TOKEN ?? '').trim();
    // 用 cursor.com（非 www）：www 会 308，Node fetch 跟随跳转时可能丢掉 Cookie → 401
    this.baseUrl = (opts?.baseUrl ?? process.env.CURSOR_API_BASE ?? 'https://cursor.com').replace(
      /\/$/,
      '',
    );
    this.fetchImpl = opts?.fetchImpl ?? fetch;
  }

  /** Cookie 值可能是 URL 编码的 user_xxx%3A%3Ajwt */
  private cookieValue(): string {
    try {
      return decodeURIComponent(this.sessionToken);
    } catch {
      return this.sessionToken;
    }
  }

  async teamUsage(): Promise<TeamUsage> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < CursorProvider.TTL_MS) return this.cache.team;
    if (!this.sessionToken) {
      throw new ProviderError(
        '未配置 CURSOR_SESSION_TOKEN（从 cursor.com Cookie: WorkosCursorSessionToken 复制）',
        'auth',
      );
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/api/usage-summary`, {
        method: 'GET',
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
          Cookie: `WorkosCursorSessionToken=${this.cookieValue()}`,
          Origin: 'https://cursor.com',
          Referer: 'https://cursor.com/dashboard?tab=usage',
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: ctrl.signal,
      });
      if (res.status === 401 || res.status === 403) {
        throw new ProviderError('Cursor Session 已失效,请重新登录并更新 CURSOR_SESSION_TOKEN', 'auth');
      }
      if (!res.ok) {
        throw new ProviderError(`Cursor HTTP ${res.status}`, 'server');
      }
      const raw = await res.json();
      this.generation += 1;
      const team = parseCursorUsageSummary(raw, this.generation);
      this.cache = { at: now, team };
      return team;
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      const err = e as Error;
      if (err.name === 'AbortError') throw new ProviderError('Cursor 请求超时', 'server');
      throw new ProviderError(`Cursor 请求失败: ${err.message}`, 'server');
    } finally {
      clearTimeout(timer);
    }
  }

  async members(): Promise<MemberUsage[]> {
    return [];
  }

  async models(): Promise<ModelUsage[]> {
    return [];
  }

  async consumption(): Promise<ConsumptionRow[]> {
    return [];
  }

  async trend(_hours: number): Promise<TrendPoint[]> {
    return [];
  }
}
