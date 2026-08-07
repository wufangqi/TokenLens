import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useUsageStore } from '../stores/usageStore';

export function TrendChart() {
  const ref = useRef<HTMLDivElement>(null);
  const trend = useUsageStore((s) => s.payload?.data.trend ?? []);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'time' },
      yAxis: { type: 'value', name: 'Credits' },
      series: [
        { type: 'line', smooth: true, data: trend.map((p) => [p.ts, p.credits]), areaStyle: {} },
      ],
    });
    return () => chart.dispose();
  }, [trend]);
  return <div ref={ref} style={{ width: '100%', height: 280 }} />;
}