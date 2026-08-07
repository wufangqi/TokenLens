import { useUsageStore } from '../stores/usageStore';

const currency = (n?: number, cur = 'CNY') =>
  `${cur === 'CNY' ? '¥' : ''}${(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function OverviewCards() {
  const team = useUsageStore((s) => s.payload?.data.team);
  if (!team) return null;
  const cards = [
    { label: '当月账单', value: currency(team.billAmount, team.currency), suffix: '' },
    { label: '可用余额', value: currency(team.balanceAmount, team.currency), suffix: '' },
    {
      label: '模型用量',
      value: Math.round(team.totalCredits).toLocaleString(),
      suffix: 'tokens',
    },
  ];
  return (
    <div className="overview">
      {cards.map((c) => (
        <div key={c.label} className="kpi-card">
          <div className="label">{c.label}</div>
          <div className="kpi-value">
            {c.value}
            {c.suffix ? <span className="kpi-suffix">{c.suffix}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
