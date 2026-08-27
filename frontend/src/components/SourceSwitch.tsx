import { useUsageStore } from '../stores/usageStore';
import type { SourceQuery } from '../types';

const OPTIONS: { id: SourceQuery; label: string }[] = [
  { id: 'qianwen', label: '千问' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'codebuddy', label: 'CodeBuddy' },
  { id: 'cursor', label: 'Cursor' },
];

export function SourceSwitch() {
  const sourceQuery = useUsageStore((s) => s.sourceQuery);
  const setSourceQuery = useUsageStore((s) => s.setSourceQuery);
  return (
    <div className="source-switch" role="tablist" aria-label="数据源">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={sourceQuery === o.id}
          className={sourceQuery === o.id ? 'source-btn active' : 'source-btn'}
          onClick={() => setSourceQuery(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
