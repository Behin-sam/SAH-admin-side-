import React from 'react';
import { Heart, Brain, Users, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../common/MetricCard';

export const MentalWellbeingView: React.FC = () => {
  const { metrics, currentVeteranProfile } = useApp();
  const latest = metrics[metrics.length - 1] || { mentalScore: 75, stressLevel: 4, moodScore: 8 };
  const isAttentionNeeded = currentVeteranProfile.currentRiskLevel !== 'NORMAL';

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl glass-panel flex items-center justify-between gap-4 shadow-warm">
        <div>
          <span className="label-overline text-[10px] text-[#8C4A1E]">
            EMOTIONAL & PSYCHOLOGICAL TRACK
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917] mt-1">
            Mental Well-being & Social Connectedness
          </h1>
          <p className="text-xs text-[#786F68] mt-1">
            Tracks mood self-checkins, stress indices, social interaction patterns, and grounding exercises.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold shrink-0">
          <Heart className="w-6 h-6" />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Mood Check-in"
          value={`${latest.moodScore}/10`}
          subtitle="Self-reported state"
          icon={Heart}
          trend={latest.moodScore >= 7 ? 'up' : 'down'}
          trendText={latest.moodScore >= 7 ? 'Positive' : 'Fluctuating'}
        />

        <MetricCard
          title="Stress Index"
          value={`${latest.stressLevel}/10`}
          subtitle="Target: Below 5/10"
          icon={Brain}
          trend={latest.stressLevel <= 5 ? 'up' : 'down'}
          trendText={latest.stressLevel <= 5 ? 'Low Stress' : 'Elevated'}
        />

        <MetricCard
          title="Social Engagement"
          value={`${latest.socialMinutes} mins`}
          subtitle="Comrade & Family connect"
          icon={Users}
          trend="up"
          trendText="+15m baseline"
        />

        <MetricCard
          title="Mental Completion"
          value="80%"
          subtitle="Breathing & Grounding"
          icon={Sparkles}
          trend="up"
          trendText="Consistent"
        />
      </div>

      {/* MENTAL WELL-BEING VISUAL SUMMARY & CHART */}
      <div className="p-6 rounded-2xl glass-panel space-y-6 shadow-warm">
        <div className="flex items-center justify-between border-b border-[#E8DCCE] pb-3">
          <h2 className="font-heading text-xl font-bold text-[#1C1917] flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#D96B27]" />
            <span>30-Day Mental & Emotional Trend</span>
          </h2>
          <span className="label-overline text-[10px]">Longitudinal Analysis</span>
        </div>

        {/* Chart */}
        <div className="p-4 rounded-2xl bg-[#FDF6EE] border border-[#E8DCCE] space-y-4">
          <div className="h-44 w-full flex items-end gap-1.5 pt-4 px-2">
            {metrics.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className={`w-full rounded-t transition-all group-hover:brightness-110 ${
                    m.mentalScore > 60
                      ? 'bg-[#D96B27]'
                      : 'bg-rose-600'
                  }`}
                  style={{ height: `${m.mentalScore}%` }}
                />
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1C1917] text-white text-[10px] p-1.5 rounded-lg whitespace-nowrap z-20 pointer-events-none font-mono">
                  {m.date}: {m.mentalScore}% score (Stress {m.stressLevel}/10)
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between label-overline text-[9px] text-[#786F68] border-t border-[#E8DCCE] pt-2">
            <span>30 Days Ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Indicators */}
        <div className="space-y-3">
          <span className="label-overline">MENTAL WELL-BEING INDICATOR TRACK</span>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#1C1917]">
              <span>Mood Rating</span>
              <span className="font-mono text-[#D96B27]">60%</span>
            </div>
            <div className="w-full bg-[#E8DCCE] rounded-full h-2 overflow-hidden">
              <div className="bg-[#D96B27] h-full w-[60%]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#1C1917]">
              <span>Stress Index</span>
              <span className="font-mono text-[#D96B27]">40%</span>
            </div>
            <div className="w-full bg-[#E8DCCE] rounded-full h-2 overflow-hidden">
              <div className="bg-[#D96B27] h-full w-[40%]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#1C1917]">
              <span>Social Engagement</span>
              <span className="font-mono text-[#1C1917]">50%</span>
            </div>
            <div className="w-full bg-[#E8DCCE] rounded-full h-2 overflow-hidden">
              <div className="bg-[#1C1917] h-full w-[50%]" />
            </div>
          </div>
        </div>

        {/* Status Callout */}
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            isAttentionNeeded
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-[#FDF2E9] border-[#F7DFCC] text-[#8C4A1E]'
          }`}
        >
          <div className="flex items-center gap-2">
            {isAttentionNeeded ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-[#D96B27]" />
            )}
            <span className="font-heading tracking-wider">Status: {currentVeteranProfile.currentRiskLevel}</span>
          </div>
          <span className="text-[11px] font-normal text-[#786F68]">
            {isAttentionNeeded ? 'Counselor review in progress' : 'Baseline stable'}
          </span>
        </div>
      </div>
    </div>
  );
};
