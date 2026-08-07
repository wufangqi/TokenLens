import { useUsageStore } from '../stores/usageStore';

export function ModelList() {
  const models = useUsageStore((s) => s.payload?.data.models ?? []);
  return (
    <ul>
      {models.map((m) => (
        <li key={m.name}>
          <span>{m.name}</span>
          <span>
            {Math.round(m.credits).toLocaleString()} ({Math.round(m.pct)}%)
          </span>
        </li>
      ))}
    </ul>
  );
}