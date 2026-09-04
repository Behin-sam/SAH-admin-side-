import React from 'react';
import { Activity, Moon, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../common/MetricCard';

export const PhysicalWellbeingView: React.FC = () => {
  const { metrics } = useApp();
  const latest = metrics[metrics.length - 1] || { physicalScore: 80, sleepHours: 7.5, sleepQuality: 8 };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Module Title Header */}
      <div className="p-6 rounded-2xl glass-panel flex items-center justify-between gap-4 shadow-warm">
        <div>
          <span className="label-overline text-[10px] text-[#8C4A1E]">
            PHYSICAL RECOVERY TRACK
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917] mt-1">
            Physical Well-being & Routine Metrics
          </h1>
          <p className="text-xs text-[#786F68] mt-1">
            Monitors physical activity, circadian sleep consistency, hydration, and daily routine stability.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold shrink-0">
          <Activity className="w-6 h-6" />
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Physical Movement"
          value={`${latest.physicalScore}%`}
          subtitle="Baseline Target: 75%"
          icon={Activity}
          trend="up"
          trendText="+4% this week"
        />

        <MetricCard
          title="Sleep Duration"
          value={`${latest.sleepHours.toFixed(1)} hrs`}
          subtitle={`Quality: ${latest.sleepQuality}/10`}
          icon={Moon}
          trend={latest.sleepHours >= 7 ? 'up' : 'down'}
          trendText={latest.sleepHours >= 7 ? 'Restful' : 'Insomnia Alert'}
        />

        <MetricCard
          title="Routine Adherence"
          value="85%"
          subtitle="Fixed wake-up & meal times"
          icon={RefreshCw}
          trend="neutral"
          trendText="Stable Baseline"
        />

        <MetricCard
          title="Physical Energy"
          value="Moderate"
          subtitle="Self-reported physical state"
          icon={Zap}
          trend="up"
          trendText="Sustained"
        />
      </div>

      {/* PHYSICAL WELL-BEING VISUAL SUMMARY & CHART */}
      <div className="p-6 rounded-2xl glass-panel space-y-6 shadow-warm">
        <div className="flex items-center justify-between border-b border-[#E8DCCE] pb-3">
          <h2 className="font-heading text-xl font-bold text-[#1C1917] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#D96B27]" />
            <span>30-Day Physical Recovery Trend</span>
          </h2>
          <span className="label-overline text-[10px]">Updated Daily</span>
        </div>

        {/* Longitudinal Chart in Warm Palette */}
        <div className="p-4 rounded-2xl bg-[#FDF6EE] border border-[#E8DCCE] space-y-4">
          <div className="h-44 w-full flex items-end gap-1.5 pt-4 px-2">
            {metrics.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full bg-[#D96B27] rounded-t transition-all group-hover:bg-[#C55A1A]"
                  style={{ height: `${m.physicalScore}%` }}
                />
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1C1917] text-white text-[10px] p-1.5 rounded-lg whitespace-nowrap z-20 pointer-events-none font-mono">
                  {m.date}: {m.physicalScore}% physical
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between label-overline text-[9px] text-[#786F68] border-t border-[#E8DCCE] pt-2">
            <span>30 Days Ago ({metrics[0]?.date})</span>
            <span>Today ({metrics[metrics.length - 1]?.date})</span>
          </div>
        </div>

        {/* Breakdown Progress Bars */}
        <div className="space-y-3">
          <span className="label-overline">PHYSICAL WELL-BEING BREAKDOWN</span>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#1C1917]">
              <span>Activity Level</span>
              <span className="font-mono text-[#D96B27]">70%</span>
            </div>
            <div className="w-full bg-[#E8DCCE] rounded-full h-2 overflow-hidden">
              <div className="bg-[#D96B27] h-full w-[70%]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#1C1917]">
              <span>Sleep Consistency</span>
              <span className="font-mono text-[#D96B27]">80%</span>
            </div>
            <div className="w-full bg-[#E8DCCE] rounded-full h-2 overflow-hidden">
              <div className="bg-[#D96B27] h-full w-[80%]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#1C1917]">
              <span>Routine Adherence</span>
              <span className="font-mono text-[#D96B27]">90%</span>
            </div>
            <div className="w-full bg-[#E8DCCE] rounded-full h-2 overflow-hidden">
              <div className="bg-[#1C1917] h-full w-[90%]" />
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#FDF2E9] border border-[#F7DFCC] text-xs text-[#8C4A1E] font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-[#D96B27]" />
          <span>Overall Physical Status: <strong>STABLE & ALIGNED WITH BASELINE</strong></span>
        </div>
      </div>
    </div>
  );
};
