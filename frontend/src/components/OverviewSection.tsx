import type { CSSProperties } from 'react';
import { useOverview } from '../hooks/useOverview';
import { useUsageStore } from '../stores/usageStore';
import type { SourceQuery, TeamUsage } from '../types';

const SOURCE_ORDER: SourceQuery[] = ['qianwen', 'deepseek', 'cursor', 'codebuddy'];

const SOURCE_CONFIG: Record<SourceQuery, { label: string; color: string }> = {
  qianwen: { label: '千问', color: '#7c5cfc' },
  deepseek: { label: 'DeepSeek', color: '#2f5bff' },
  cursor: { label: 'Cursor', color: '#0ea5a5' },
  codebuddy: { label: 'CodeBuddy', color: '#e67e22' },
};

function fmtMoney(n: number | undefined): string {
  return (n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtTokens(n: number | undefined): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.round(v));
}

interface Metric {
  primary: string;
  suffix?: string;
  secondary: string;
  pct: number;
}

function metric(src: SourceQuery, t: TeamUsage): Metric {
  switch (src) {
    case 'qianwen':
      return {
        primary: fmtTokens(t.totalCredits),
        suffix: 'tokens',
        secondary: `余额 ¥${fmtMoney(t.balanceAmount)}`,
        pct: t.usedPct,
      };
    case 'deepseek':
      return {
        primary: `¥${fmtMoney(t.balanceAmount)}`,
        secondary: `赠送 ¥${fmtMoney(t.grantedBalance)} · 充值 ¥${fmtMoney(t.toppedUpBalance)}`,
        pct: 0,
      };
    case 'cursor':
      return {
        primary: `$${fmtMoney(t.billAmount)}`,
        suffix: `/ $${fmtMoney(t.planLimit)}`,
        secondary: `剩余 $${fmtMoney(t.balanceAmount)} · ${t.membershipType ?? ''}`,
        pct: t.usedPct,
      };
    case 'codebuddy':
      return {
        primary: fmtTokens(t.totalCredits),
        suffix: 'tokens',
        secondary: `活跃 ${t.activeDays ?? 0} 天 · 连续 ${t.currentStreak ?? 0} 天`,
        pct: 0,
      };
  }
}

export function OverviewSection() {
  const overview = useOverview(30_000);
  const activeSource = useUsageStore((s) => s.sourceQuery);
  const setSourceQuery = useUsageStore((s) => s.setSourceQuery);

  // 连接失败的数据源不在总览看板显示；仍在加载中的先保留。
  const visible = SOURCE_ORDER.filter((src) => {
    const e = overview[src];
    return e.loading || !e.error;
  });
  const unavailable = SOURCE_ORDER.length - visible.length;

  return (
    <section className="overview-section">
      <div className="overview-header">
        <h2 className="overview-title">总览</h2>
        <span className="overview-hint">
          {unavailable > 0 ? `${unavailable} 个数据源不可用 · ` : ''}点击卡片查看详情
        </span>
      </div>
      {visible.length === 0 ? (
        <p className="empty">暂无可用数据源，请检查数据源配置与连接</p>
      ) : (
        <div className="overview-grid">
          {visible.map((src) => {
          const entry = overview[src];
          const cfg = SOURCE_CONFIG[src];
          const team = entry.team;
          const m = team ? metric(src, team) : null;
          const statusCls = entry.error ? 'err' : entry.loading || !team ? 'load' : 'ok';
          const statusText = entry.error ? '异常' : entry.loading || !team ? '加载中' : '正常';
          return (
            <button
              key={src}
              type="button"
              className={`ov-card${activeSource === src ? ' active' : ''}`}
              style={{ '--src-color': cfg.color } as CSSProperties}
              onClick={() => setSourceQuery(src)}
            >
              <div className="ov-card-top">
                <span className="ov-dot" style={{ background: cfg.color }} />
                <span className="ov-label">{cfg.label}</span>
                <span className={`ov-status ${statusCls}`}>
                  <span className="ov-status-dot" style={{ background: cfg.color }} />
                  {statusText}
                </span>
              </div>
              {m ? (
                <div className="ov-primary">
                  {m.primary}
                  {m.suffix ? <span className="ov-suffix">{m.suffix}</span> : null}
                </div>
              ) : entry.error ? (
                <div className="ov-error" title={entry.error}>{entry.error}</div>
              ) : (
                <div className="ov-primary muted">—</div>
              )}
              {m ? <div className="ov-secondary">{m.secondary}</div> : null}
              {m && m.pct > 0 ? (
                <div className="ov-bar">
                  <div className="ov-fill" style={{ width: `${Math.min(100, Math.max(0, m.pct))}%` }} />
                </div>
              ) : null}
            </button>
          );
        })}
        </div>
      )}
    </section>
  );
}
