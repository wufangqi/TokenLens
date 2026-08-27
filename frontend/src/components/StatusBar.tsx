import { useUsageStore } from '../stores/usageStore';
import type { DataSource } from '../types';

const SOURCE_META: Record<
  DataSource,
  { label: string; className: string }
> = {
  cli: { label: 'CLI', className: 'tag' },
  mock: { label: 'Mock', className: 'tag tag-muted' },
  deepseek: { label: 'DeepSeek', className: 'tag' },
  codebuddy: { label: 'CodeBuddy', className: 'tag' },
  cursor: { label: 'Cursor Session', className: 'tag' },
};

export function StatusBar() {
  const source = useUsageStore((s) => s.payload?.source);
  const loading = useUsageStore((s) => s.loading);
  const error = useUsageStore((s) => s.error);
  const updated = useUsageStore((s) => s.lastUpdated);

  const meta = source ? SOURCE_META[source] : { label: '—', className: 'tag tag-muted' };

  return (
    <div className="statusbar">
      <span className={meta.className}>{meta.label}</span>
      <span>
        {loading
          ? '刷新中…'
          : error
            ? null
            : updated
              ? `更新于 ${new Date(updated).toLocaleTimeString()}`
              : '等待数据…'}
      </span>
      {error ? <span className="tag tag-error">错误: {error}</span> : null}
    </div>
  );
}
