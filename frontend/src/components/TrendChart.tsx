import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useShallow } from 'zustand/react/shallow';
import { useUsageStore } from '../stores/usageStore';

export function TrendChart() {
  const ref = useRef<HTMLDivElement>(null);
  const sourceQuery = useUsageStore((s) => s.sourceQuery);
  const trend = useUsageStore(useShallow((s) => s.payload?.data.trend ?? []));

  useEffect(() => {
    if (!ref.current || sourceQuery === 'deepseek') return;
    const chart = echarts.init(ref.current);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);

    chart.setOption({
      color: ['#2F5BFF'],
      grid: { left: 48, right: 16, top: 24, bottom: 32 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff',
        borderColor: '#E2E5EB',
        textStyle: { color: '#1A1D26', fontSize: 12 },
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#E2E5EB' } },
        axisLabel: { color: '#5C6370' },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'tokens',
        nameTextStyle: { color: '#5C6370', fontSize: 11 },
        axisLabel: { color: '#5C6370' },
        splitLine: { lineStyle: { color: '#EEF0F3' } },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2 },
          areaStyle: { color: 'rgba(47, 91, 255, 0.12)' },
          data: trend.map((p) => [p.ts, p.credits]),
        },
      ],
    });

    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [trend, sourceQuery]);

  if (sourceQuery === 'deepseek') {
    return <p className="empty">DeepSeek 官方 API 暂不提供用量趋势</p>;
  }

  return <div ref={ref} className="chart-host" />;
}
