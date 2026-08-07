import { useUsage } from './hooks/useUsage';
import { OverviewCards } from './components/OverviewCards';
import { TrendChart } from './components/TrendChart';
import { ConsumptionTable } from './components/ConsumptionTable';
import { StatusBar } from './components/StatusBar';
import './App.css';

const INTERVAL_MS = 5000;

export default function App() {
  useUsage(INTERVAL_MS);
  return (
    <div className="app">
      <header className="app-header">
        <h1>TokenLens</h1>
        <StatusBar />
      </header>
      <OverviewCards />
      <section className="panel trend">
        <h2 className="panel-title">近 7 日用量</h2>
        <TrendChart />
      </section>
      <section className="panel">
        <h2 className="panel-title">模型用量</h2>
        <ConsumptionTable />
      </section>
    </div>
  );
}
