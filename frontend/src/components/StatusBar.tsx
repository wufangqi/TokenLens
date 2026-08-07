import { useUsageStore } from '../stores/usageStore';

export function StatusBar() {
  const source = useUsageStore((s) => s.payload?.source);
  const loading = useUsageStore((s) => s.loading);
  const error = useUsageStore((s) => s.error);
  const updated = useUsageStore((s) => s.lastUpdated);
  return (
    <div className="statusbar">
      <span>数据源:{source === 'cli' ? 'CLI(真实)' : 'Mock(演示)'}</span>
      <span>
        {loading
          ? '刷新中…'
          : error
            ? `错误:${error}`
            : updated
              ? `更新于 ${new Date(updated).toLocaleTimeString()}`
              : ''}
      </span>
    </div>
  );
}