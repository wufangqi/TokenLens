import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useShallow } from 'zustand/react/shallow';
import { useUsageStore } from '../stores/usageStore';
import type { TrendPoint } from '../types';

// Tree-shake ECharts: register only the chart/components we actually use,
// instead of pulling in the full ~1 MB bundle via `import * as echarts`.
echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const BASE_OPTION: echarts.EChartsCoreOption = {
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
};

function buildOption(trend: TrendPoint[]): echarts.EChartsCoreOption {
  return {
    ...BASE_OPTION,
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
  };
}

export function TrendChart() {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const sourceQuery = useUsageStore((s) => s.sourceQuery);
  const trend = useUsageStore(useShallow((s) => s.payload?.data.trend ?? []));

  const noTrend = sourceQuery === 'deepseek' || sourceQuery === 'cursor';

  // Create/dispose the chart instance when the host element is mounted.
  useEffect(() => {
    if (!ref.current || noTrend) return;
    const chart = echarts.init(ref.current);
    chartRef.current = chart;
    chart.setOption(buildOption(trend));

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      chart.dispose();
      chartRef.current = null;
    };
    // trend is applied via the dedicated effect below; only (re)create the
    // chart when the host element (un)mounts on a source switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noTrend]);

  // Push new data into the existing chart instance without re-initializing.
  useEffect(() => {
    chartRef.current?.setOption(buildOption(trend), { notMerge: false });
  }, [trend]);

  if (sourceQuery === 'deepseek') {
    return <p className="empty">DeepSeek 官方 API 暂不提供用量趋势</p>;
  }
  if (sourceQuery === 'cursor') {
    return <p className="empty">Cursor MVP 暂不提供用量趋势</p>;
  }

  return <div ref={ref} className="chart-host" />;
}
