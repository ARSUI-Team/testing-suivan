"use client";

import { useState, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";

const BEBAS = { fontFamily: "'Bebas Neue', system-ui, sans-serif" };
const COURIER = { fontFamily: "'Courier New', monospace" };

export interface AnalyticsDataPoint {
  date: string;
  value: number;
}

interface PoolAnalyticsChartProps {
  title?: string;
  poolAddress: string;
  historyData?: AnalyticsDataPoint[];
  currentValue?: number;
}

function deriveData(poolAddress: string, days: number, metric: "apy" | "tvl", baseValue?: number): AnalyticsDataPoint[] {
  const data: AnalyticsDataPoint[] = [];
  const now = new Date();
  const base = baseValue ?? (metric === "apy" ? 7.2 : 25000);
  const poolHash = poolAddress.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const seed = poolHash * 0.01;
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const variance = (Math.sin((i + seed) * 0.5) * 0.3 + Math.cos((i + seed) * 0.2) * 0.2) * (metric === "apy" ? 1.2 : 3000);
    const drift = ((days - i) / days) * (metric === "apy" ? 0.8 : 2000);
    data.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Math.max(0, base + variance + drift),
    });
  }
  return data;
}

export default function PoolAnalyticsChart({
  title = "Pool Analytics",
  poolAddress,
  historyData,
  currentValue: externalValue,
}: PoolAnalyticsChartProps) {
  const { t } = useLanguage();
  const [metric, setMetric] = useState<"apy" | "tvl">("apy");
  const [timeRange, setTimeRange] = useState(14);

  const history = useMemo(() =>
    historyData ?? deriveData(poolAddress, timeRange, metric, externalValue),
    [historyData, poolAddress, timeRange, metric, externalValue]
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
    <div className="relative overflow-hidden border-[3px] border-[#0a0a0a] bg-[#fdfdfa] p-6 shadow-[12px_12px_0_#0a0a0a]">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.04 }} />
      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-3" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 2px, transparent 2px, transparent 4px, #0a0a0a 4px, #0a0a0a 6px, transparent 6px, transparent 10px)" }} />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#333333]" style={COURIER}>projected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex border-[3px] border-[#0a0a0a] overflow-hidden">
              {(["apy", "tvl"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`min-h-[42px] min-w-[72px] px-4 text-xs font-black uppercase tracking-[0.14em] transition ${metric === m ? "bg-[#0a0a0a] text-[#fbf7ed]" : "bg-[#fbf7ed] text-[#333333] hover:bg-[#e0f4ff]"}`}
                  style={COURIER}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex border-[3px] border-[#0a0a0a] overflow-hidden">
              {([7, 14, 30] as const).map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeRange(days)}
                  className={`min-h-[42px] min-w-[72px] px-4 text-xs font-black uppercase tracking-[0.14em] transition ${timeRange === days ? "bg-[#f8672d] text-[#0a0a0a]" : "bg-[#fbf7ed] text-[#333333] hover:bg-[#fef9c3]"}`}
                  style={COURIER}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>
        </div>

        <h3 className="mb-5 text-2xl font-black tracking-[-0.04em]" style={BEBAS}>{title}</h3>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Current", value: metric === "apy" ? `${currentValue.toFixed(1)}%` : `$${(currentValue / 1000).toFixed(1)}K`, bg: "#e0f4ff" },
            { label: "Average", value: metric === "apy" ? `${avgValue.toFixed(1)}%` : `$${(avgValue / 1000).toFixed(1)}K`, bg: "#fbf7ed" },
            { label: "Change", value: `${isPositive ? "+" : ""}${metric === "apy" ? `${change.toFixed(1)}%` : `$${change.toFixed(0)}`}`, bg: isPositive ? "#ccfbf1" : "#fee2e2", valueColor: isPositive ? "text-[#0d9488]" : "text-[#dc2626]" },
          ].map((stat) => (
            <div key={stat.label} className="border-[3px] border-[#0a0a0a] p-3 shadow-[3px_3px_0_#0a0a0a]" style={{ backgroundColor: stat.bg }}>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#333333]" style={COURIER}>{stat.label}</p>
              <p className={`mt-1 text-xl font-black ${("valueColor" in stat) ? stat.valueColor : ""}`} style={BEBAS}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="border-[3px] border-[#0a0a0a] bg-[#fbf7ed] p-4">
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1={padding.left} y1={yScale(minVal + range * f)} x2={svgW - padding.right} y2={yScale(minVal + range * f)} stroke="#0a0a0a" strokeOpacity="0.1" strokeWidth="1" strokeDasharray="4 4" />
            ))}
            <path d={areaPath} fill="url(#chartGrad)" />
            <path d={linePath} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {history.map((d, i) => (i === 0 || i === history.length - 1 || i === Math.floor(history.length / 2)) && (
              <circle key={i} cx={xScale(i)} cy={yScale(d.value)} r="4" fill="#38bdf8" stroke="#fdfdfa" strokeWidth="2" />
            ))}
            {history.map((d, i) => (i === 0 || i === Math.floor(history.length / 2) || i === history.length - 1) && (
              <text key={i} x={xScale(i)} y={svgH - 5} textAnchor="middle" fill="#a8a49a" fontSize="10" fontFamily="'JetBrains Mono', monospace">{d.date}</text>
            ))}
            {metric === "apy" && <text x={padding.left - 5} y={padding.top + 10} textAnchor="end" fill="#a8a49a" fontSize="10" fontFamily="'JetBrains Mono', monospace">{maxVal.toFixed(1)}%</text>}
            {metric === "apy" && <text x={padding.left - 5} y={svgH - padding.bottom + 5} textAnchor="end" fill="#a8a49a" fontSize="10" fontFamily="'JetBrains Mono', monospace">{minVal.toFixed(1)}%</text>}
            {history.length > 1 && (
              <g>
                <text x={xScale(history.length - 1) + 8} y={yScale(currentValue) + 4} fill="#38bdf8" fontSize="11" fontWeight="700" fontFamily="'JetBrains Mono', monospace">{metric === "apy" ? `${currentValue.toFixed(1)}%` : `$${currentValue.toFixed(0)}`}</text>
              </g>
            )}
          </svg>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-[#0a0a0a] pt-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-2" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 1px, transparent 1px, transparent 3px, #0a0a0a 3px, #0a0a0a 4px, transparent 4px, transparent 7px)" }} />
            <span className="text-xs font-bold text-[#333333]" style={COURIER}>{metric === "apy" ? "APY" : "TVL"}</span>
          </div>
          <p className="text-xs font-semibold text-[#333333]">{t("detail.chartDisclaimer")}</p>
        </div>
      </div>
    </div>
  );
}
