import { useUsageStore } from '../stores/usageStore';

export function OverviewCards() {
  const team = useUsageStore((s) => s.payload?.data.team);
  if (!team) return null;
  const cards = [
    { label: '总 Credits 消耗', value: Math.round(team.totalCredits).toLocaleString(), suffix: '' },
    { label: '剩余额度', value: Math.round(team.remainingCredits).toLocaleString(), suffix: '' },
    { label: '今日消耗', value: Math.round(team.todayCredits).toLocaleString(), suffix: '' },
  ];
  return (
    <div className="overview">
      {cards.map((c) => (
        <div key={c.label} className="card">
          <div className="label">{c.label}</div>
          <div className="value">
            {c.value}
            {c.suffix}
          </div>
        </div>
      ))}
      <div className="card">
        <div className="label">已用占比</div>
        <div className="bar">
          <div className="fill" style={{ width: `${team.usedPct}%` }} />
        </div>
        <div className="pct">{Math.round(team.usedPct)}%</div>
      </div>
    </div>
  );
}