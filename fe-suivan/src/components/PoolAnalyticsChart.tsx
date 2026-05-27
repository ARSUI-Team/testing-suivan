"use client";

import { useState } from "react";

interface DataPoint {
  date: string;
  apy: number;
  tvl: number;
}

function generateHistoricalData(days: number): DataPoint[] {
  const data: DataPoint[] = [];
  const baseApy = 8.5;
  const baseTvl = 50000;

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      apy: baseApy + (Math.random() - 0.5) * 3,
      tvl: baseTvl + Math.random() * 14000 + (days - i) * 420,
    });
  }

  return data;
}

interface PoolAnalyticsChartProps {
  poolAddress?: string;
  title?: string;
}

export default function PoolAnalyticsChart({
  title = "Pool Performance",
}: PoolAnalyticsChartProps) {
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(7);
  const [metric, setMetric] = useState<"apy" | "tvl">("apy");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [datasets] = useState<Record<7 | 14 | 30, DataPoint[]>>(() => ({
    7: generateHistoricalData(7),
    14: generateHistoricalData(14),
    30: generateHistoricalData(30),
  }));

  const data = datasets[timeRange];
  const values = data.map((d) => (metric === "apy" ? d.apy : d.tvl));
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = Math.max(maxValue - minValue, 1);
  const current = values[values.length - 1];
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const change = current - values[0];
  const isPositive = change >= 0;

  const paddingLeft = 8;
  const paddingRight = 4;
  const paddingTop = 6;
  const paddingBottom = 8;
  const chartWidth = 100 - paddingLeft - paddingRight;
  const chartHeight = 60 - paddingTop - paddingBottom;

  const pointFor = (value: number, index: number) => {
    const x = paddingLeft + (index / (data.length - 1)) * chartWidth;
    const y = paddingTop + (1 - (value - minValue) / range) * chartHeight;
    return { x, y };
  };

  const path = values
    .map((value, index) => {
      const { x, y } = pointFor(value, index);
      return `${index === 0 ? "M" : "L"} ${x},${y}`;
    })
    .join(" ");

  const areaPath = `${path} L ${paddingLeft + chartWidth},${paddingTop + chartHeight} L ${paddingLeft},${paddingTop + chartHeight} Z`;

  const formatValue = (value: number) =>
    metric === "apy" ? `${value.toFixed(2)}%` : `$${(value / 1000).toFixed(1)}K`;

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border-2 border-slate-950 bg-white p-5 shadow-[6px_6px_0_#06111f] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,17,31,0.06)_1px,transparent_1px),linear-gradient(rgba(6,17,31,0.06)_1px,transparent_1px)] bg-[size:34px_34px]" />
      <div className="relative">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="protocol-font text-xs font-black uppercase tracking-[0.2em] text-sky-700">
              yield_signal
            </p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">
              {title}
            </h3>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
              APY and TVL signals for pool-level yield visibility. The chart is structured for
              live Sui indexer data and already matches the production pool UI.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <div className="grid grid-cols-2 gap-2">
              {(["apy", "tvl"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setMetric(item)}
                  className={`protocol-font min-h-[42px] min-w-[72px] rounded-full border-2 border-slate-950 px-4 text-xs font-black uppercase tracking-[0.14em] transition hover:-translate-y-0.5 ${
                    metric === item ? "bg-slate-950 text-white" : "bg-white text-slate-950 hover:bg-[#dff8ff]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([7, 14, 30] as const).map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeRange(days)}
                  className={`protocol-font min-h-[42px] min-w-[72px] rounded-full border-2 border-slate-950 px-4 text-xs font-black uppercase tracking-[0.14em] transition hover:-translate-y-0.5 ${
                    timeRange === days ? "bg-sky-400 text-slate-950" : "bg-white text-slate-950 hover:bg-[#fff1c7]"
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border-2 border-slate-950 bg-[#dff8ff] p-4">
            <p className="protocol-font text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Current
            </p>
            <p className="protocol-font mt-2 text-3xl font-black text-slate-950">
              {formatValue(current)}
            </p>
          </div>
          <div className="rounded-2xl border-2 border-slate-950 bg-[#fbf7ed] p-4">
            <p className="protocol-font text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Average
            </p>
            <p className="protocol-font mt-2 text-3xl font-black text-slate-950">
              {formatValue(average)}
            </p>
          </div>
          <div className={`rounded-2xl border-2 border-slate-950 p-4 ${isPositive ? "bg-[#d9f8df]" : "bg-[#ffe0d8]"}`}>
            <p className="protocol-font text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Change
            </p>
            <p className="protocol-font mt-2 text-3xl font-black text-slate-950">
              {change >= 0 ? "+" : ""}
              {formatValue(change)}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[1.25rem] border-2 border-slate-950 bg-[#f8fbff] p-3 sm:p-5">
          <div className="relative h-72 w-full">
            <svg
              viewBox="0 0 100 60"
              preserveAspectRatio="none"
              className="h-full w-full"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {Array.from({ length: 6 }).map((_, index) => {
                const y = paddingTop + (index / 5) * chartHeight;
                return (
                  <line
                    key={`h-${index}`}
                    x1={paddingLeft}
                    y1={y}
                    x2={paddingLeft + chartWidth}
                    y2={y}
                    stroke="#06111f"
                    strokeWidth="0.25"
                    opacity="0.18"
                  />
                );
              })}
              {data.map((_, index) => {
                const x = paddingLeft + (index / (data.length - 1)) * chartWidth;
                return (
                  <line
                    key={`v-${index}`}
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={paddingTop + chartHeight}
                    stroke="#06111f"
                    strokeWidth="0.2"
                    opacity="0.12"
                  />
                );
              })}
              <path d={areaPath} fill={metric === "apy" ? "#5ec8ff" : "#54d6b6"} opacity="0.28" />
              <path
                d={path}
                fill="none"
                stroke="#06111f"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.4"
              />
              {values.map((value, index) => {
                const { x, y } = pointFor(value, index);
                const isHovered = hoveredIndex === index;

                return (
                  <g key={index}>
                    <rect
                      x={x - 3}
                      y="0"
                      width="6"
                      height="60"
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredIndex(index)}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? "1.8" : "1.15"}
                      fill={metric === "apy" ? "#5ec8ff" : "#54d6b6"}
                      stroke="#06111f"
                      strokeWidth="0.45"
                    />
                    {isHovered && (
                      <g>
                        <rect
                          x={Math.max(2, Math.min(x - 13, 74))}
                          y={Math.max(1, y - 12)}
                          width="24"
                          height="8"
                          rx="1.2"
                          fill="#06111f"
                        />
                        <text
                          x={Math.max(14, Math.min(x - 1, 86))}
                          y={Math.max(6, y - 6.8)}
                          textAnchor="middle"
                          fill="#fbf7ed"
                          fontSize="3"
                          fontWeight="800"
                        >
                          {formatValue(value)}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
            <div className="protocol-font absolute bottom-1 left-2 right-2 flex justify-between text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
              <span>{data[0].date}</span>
              <span>{data[Math.floor(data.length / 2)].date}</span>
              <span>{data[data.length - 1].date}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-slate-950 pt-4">
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full border-2 border-slate-950 ${metric === "apy" ? "bg-sky-400" : "bg-teal-300"}`} />
            <span className="text-sm font-bold text-slate-600">
              {metric === "apy" ? "Historical APY" : "Total value locked"}
            </span>
          </div>
          <span className="protocol-font text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            hover for detail
          </span>
        </div>
      </div>
    </div>
  );
}
