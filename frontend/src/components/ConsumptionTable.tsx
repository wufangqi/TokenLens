import { useShallow } from 'zustand/react/shallow';
import { useUsageStore } from '../stores/usageStore';

export function ConsumptionTable() {
  const rows = useUsageStore(useShallow((s) => s.payload?.data.consumption ?? []));
  if (rows.length === 0) return <p className="empty">暂无模型用量</p>;

  const sorted = [...rows].sort((a, b) => b.credits - a.credits);
  const showCost = sorted.some((r) => r.cost > 0);

  return (
    <>
      <table className="model-table">
        <thead>
          <tr>
            <th>模型</th>
            <th>用量</th>
            {showCost ? <th>金额</th> : null}
            <th>占比</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.name}>
              <td className="mono">{r.name}</td>
              <td className="mono">{Math.round(r.credits).toLocaleString()}</td>
              {showCost ? (
                <td className="mono">
                  ¥
                  {r.cost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              ) : null}
              <td className="pct-cell">
                <div className="pct-row">
                  <span className="pct-num">{Math.round(r.pct)}%</span>
                  <div className="bar">
                    <div className="fill" style={{ width: `${Math.min(100, Math.max(0, r.pct))}%` }} />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!showCost ? <p className="footnote">套餐抵扣，按量金额为 0</p> : null}
    </>
  );
}
