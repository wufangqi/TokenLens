import { useUsage } from './hooks/useUsage';
import { OverviewCards } from './components/OverviewCards';
import { TrendChart } from './components/TrendChart';
import { MemberTable } from './components/MemberTable';
import { ModelList } from './components/ModelList';
import { StatusBar } from './components/StatusBar';

const INTERVAL_MS = 5000;

export default function App() {
  useUsage(INTERVAL_MS);
  return (
    <div className="app">
      <header>
        <h1>TokenLens</h1>
        <StatusBar />
      </header>
      <OverviewCards />
      <section className="trend">
        <TrendChart />
      </section>
      <section className="grid">
        <MemberTable />
        <ModelList />
      </section>
    </div>
  );
}