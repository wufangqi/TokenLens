import { useUsage } from './hooks/useUsage';
import { useUsageStore } from './stores/usageStore';
import { OverviewSection } from './components/OverviewSection';
import { OverviewCards } from './components/OverviewCards';
import { TrendChart } from './components/TrendChart';
import { ConsumptionTable } from './components/ConsumptionTable';
import { StatusBar } from './components/StatusBar';
import { SourceSwitch } from './components/SourceSwitch';
import type { SourceQuery } from './types';
import './App.css';

const INTERVAL_MS = 30_000;

const SOURCE_LABEL: Record<SourceQuery, string> = {
  qianwen: '千问',
  deepseek: 'DeepSeek',
  cursor: 'Cursor',
  codebuddy: 'CodeBuddy',
};

export default function App() {
  useUsage(INTERVAL_MS);
  const sourceQuery = useUsageStore((s) => s.sourceQuery);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>TokenLens</h1>
          <span className="tagline">AI 用量与成本统一看板</span>
        </div>
        <div className="header-right">
          <SourceSwitch />
          <StatusBar />
        </div>
      </header>
      <OverviewSection />
      <section className="detail-section">
        <h2 className="section-title">
          详情 <span className="section-sub">{SOURCE_LABEL[sourceQuery]}</span>
        </h2>
        <OverviewCards />
        <section className="panel trend">
          <h3 className="panel-title">近 7 日用量</h3>
          <TrendChart />
        </section>
        <section className="panel">
          <h3 className="panel-title">模型用量</h3>
          <ConsumptionTable />
        </section>
      </section>
    </div>
  );
}
