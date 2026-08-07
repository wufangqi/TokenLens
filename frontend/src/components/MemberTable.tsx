import { useUsageStore } from '../stores/usageStore';

export function MemberTable() {
  const members = useUsageStore((s) => s.payload?.data.members ?? []);
  return (
    <table>
      <thead>
        <tr>
          <th>成员</th>
          <th>Credits</th>
          <th>会话数</th>
          <th>占比</th>
        </tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.name}>
            <td>{m.name}</td>
            <td>{Math.round(m.credits).toLocaleString()}</td>
            <td>{m.sessions}</td>
            <td>{Math.round(m.pct)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}