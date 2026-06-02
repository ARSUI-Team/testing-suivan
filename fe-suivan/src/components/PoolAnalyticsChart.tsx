"use client";

import { useState, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";

export interface AnalyticsDataPoint {
  date: string;
  value: number;
}

interface PoolAnalyticsChartProps {
  title?: string;
  poolAddress: string;
  historyData?: AnalyticsDataPoint[];
  metricLabel?: string;
  currentValue?: number;
}

function deriveData(poolAddress: string, days: number, metric: "apy" | "tvl"): AnalyticsDataPoint[] {
  const data: AnalyticsDataPoint[] = [];
  const now = new Date();
  const base = metric === "apy" ? 7.2 : 25000;
  const poolHash = poolAddress.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const noise = (Math.sin((i + poolHash) * 0.7) * 0.9 + Math.cos((i + poolHash) * 0.3) * 0.6) * (metric === "apy" ? 0.9 : 4000);
    const trend = Math.sin(((days - i) / days) * Math.PI) * (metric === "apy" ? 1.5 : 5000);
    data.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Math.max(0, base + noise + trend),
    });
  }
  return data;
}

export default function PoolAnalyticsChart({
  title = "Pool Analytics",
  poolAddress,
  historyData,
  metricLabel,
  currentValue: externalValue,
}: PoolAnalyticsChartProps) {
  const { t } = useLanguage();
  const [metric, setMetric] = useState<"apy" | "tvl">("apy");
  const [timeRange, setTimeRange] = useState(14);

  const history = useMemo(() =>
    historyData ?? deriveData(poolAddress, timeRange, metric),
    [historyData, poolAddress, timeRange, metric]
  );

  const currentValue = externalValue ?? (history.length > 0 ? history[history.length - 1].value : 0);
  const avgValue = history.length > 0 ? history.reduce((a, b) => a + b.value, 0) / history.length : 0;
  const firstValue = history.length > 0 ? history[0].value : 0;
  const change = currentValue - firstValue;
  const isPositive = change >= 0;

  if (history.length === 0) return null;

  const svgW = 700;
  const svgH = 240;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = svgW - padding.left - padding.right;
  const chartH = svgH - padding.top - padding.bottom;

  const values = history.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const xScale = (i: number) => padding.left + (i / (history.length - 1)) * chartW;
  const yScale = (v: number) => padding.top + chartH - ((v - minVal) / range) * chartH;

  const linePath = history
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(d.value).toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${xScale(history.length - 1).toFixed(1)} ${padding.top + chartH} L ${xScale(0).toFixed(1)} ${padding.top + chartH} Z`;

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border-2 border-[var(--border)] bg-[var(--surface)] p-5 shadow-[6px_6px_0_var(--border)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <p className="protocol-font text-xs font-black uppercase tracking-[0.2em] text-[var(--accent)]">analytics</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)] sm:text-3xl">
            {title}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border-2 border-[var(--border)] overflow-hidden">
            {(["apy", "tvl"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`protocol-font min-h-[42px] min-w-[72px] px-4 text-xs font-black uppercase tracking-[0.14em] transition ${
                  metric === m
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--accent-soft)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex rounded-full border-2 border-[var(--border)] overflow-hidden">
            {([7, 14, 30] as const).map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`protocol-font min-h-[42px] min-w-[72px] px-4 text-xs font-black uppercase tracking-[0.14em] transition ${
                  timeRange === days
                    ? "bg-[var(--accent)] text-[var(--foreground)]"
                    : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--warn-soft)]"
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--accent-soft)] p-4">
          <p className="protocol-font text-xs font-black text-[var(--muted)]">Current</p>
          <p className="protocol-font mt-2 text-3xl font-black text-[var(--foreground)]">
            {metric === "apy" ? `${currentValue.toFixed(1)}%` : `$${(currentValue / 1000).toFixed(1)}K`}
          </p>
        </div>
        <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-4">
          <p className="protocol-font text-xs font-black text-[var(--muted)]">Average</p>
          <p className="protocol-font mt-2 text-3xl font-black text-[var(--foreground)]">
            {metric === "apy" ? `${avgValue.toFixed(1)}%` : `$${(avgValue / 1000).toFixed(1)}K`}
          </p>
        </div>
        <div className={`rounded-2xl border-2 border-[var(--border)] p-4 ${isPositive ? "bg-[var(--success-soft)]" : "bg-[var(--danger-soft)]"}`}>
          <p className="protocol-font text-xs font-black text-[var(--muted)]">Change</p>
          <p className={`protocol-font mt-2 text-3xl font-black ${isPositive ? "text-[var(--success-deep)]" : "text-[var(--danger-deep)]"}`}>
            {isPositive ? "+" : ""}{metric === "apy" ? `${change.toFixed(1)}%` : `$${change.toFixed(0)}`}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[1.25rem] border-2 border-[var(--border)] bg-[var(--background)] p-3 sm:p-5">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={padding.left}
              y1={yScale(minVal + range * f)}
              x2={svgW - padding.right}
              y2={yScale(minVal + range * f)}
              stroke="var(--border)"
              strokeOpacity="0.15"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          <path d={areaPath} fill="url(#chartGrad)" />

          <path d={linePath} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {history.map(
            (d, i) =>
              (i === 0 || i === history.length - 1 || i === Math.floor(history.length / 2)) && (
                <circle key={i} cx={xScale(i)} cy={yScale(d.value)} r="4" fill="#38bdf8" stroke="var(--background)" strokeWidth="2" />
              )
          )}

          {history.map(
            (d, i) =>
              (i === 0 || i === Math.floor(history.length / 2) || i === history.length - 1) && (
                <text
                  key={i}
                  x={xScale(i)}
                  y={svgH - 5}
                  textAnchor="middle"
                  className="protocol-font"
                  fill="var(--muted)"
                  fontSize="10"
                >
                  {d.date}
                </text>
              )
          )}

          {metric === "apy" && (
            <text x={padding.left - 5} y={padding.top + 10} textAnchor="end" className="protocol-font" fill="var(--muted)" fontSize="10">
              {maxVal.toFixed(1)}%
            </text>
          )}
          {metric === "apy" && (
            <text x={padding.left - 5} y={svgH - padding.bottom + 5} textAnchor="end" className="protocol-font" fill="var(--muted)" fontSize="10">
              {minVal.toFixed(1)}%
            </text>
          )}

          {history.length > 1 && (
            <g>
              <text
                x={xScale(history.length - 1) + 8}
                y={yScale(currentValue) + 4}
                className="protocol-font"
                fill="#38bdf8"
                fontSize="11"
                fontWeight="700"
              >
                {metric === "apy" ? `${currentValue.toFixed(1)}%` : `$${currentValue.toFixed(0)}`}
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-[var(--border)] pt-4">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full border-2 border-[var(--border)] ${metric === "apy" ? "bg-[var(--accent)]" : "bg-[var(--accent)]"}`} />
          <span className="protocol-font text-xs font-black text-[var(--muted)]">{metric === "apy" ? "APY" : "TVL"}</span>
        </div>
        <p className="text-xs font-semibold text-[var(--muted)]">
          {t("detail.chartDisclaimer")}
        </p>
      </div>
    </div>
  );
}
