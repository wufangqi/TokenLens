import { useUsageStore } from '../stores/usageStore';

export function StatusBar() {
  const source = useUsageStore((s) => s.payload?.source);
  const loading = useUsageStore((s) => s.loading);
  const error = useUsageStore((s) => s.error);
  const updated = useUsageStore((s) => s.lastUpdated);

  const sourceLabel =
    source === 'cli' ? 'CLI' : source === 'mock' ? 'Mock' : source === 'deepseek' ? 'DeepSeek' : '—';
  const sourceClass = source === 'cli' || source === 'deepseek' ? 'tag' : 'tag tag-muted';

  return (
    <div className="statusbar">
      <span className={sourceClass}>{sourceLabel}</span>
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
