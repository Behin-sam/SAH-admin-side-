import React from 'react';
import { Activity, Heart, BrainCircuit, Calendar, Sliders, MessageCircle, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const VeteranDetailView: React.FC = () => {
  const { currentVeteranUser, currentVeteranProfile, metrics, aiInsights, checkIns, setActiveScreen } = useApp();

  const vetInsights = aiInsights.filter(i => i.veteranId === currentVeteranUser.id);
  const latestMetric = metrics[metrics.length - 1] || { physicalScore: 80, mentalScore: 75, stressLevel: 4, sleepHours: 7.5 };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Top Veteran Profile Header */}
      <div className="p-6 rounded-2xl glass-panel border border-[#E8DCCE] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-warm">
        <div className="flex items-center gap-4">
          <img
            src={currentVeteranUser.avatarUrl}
            alt={currentVeteranUser.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-[#D96B27] shadow-rust"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-[#1C1917]">{currentVeteranUser.name}</h1>
              <span className="badge-pill-rust">
                {currentVeteranProfile.currentRiskLevel}
              </span>
            </div>
            <p className="text-xs text-[#786F68] mt-1">
              {currentVeteranUser.rank} | {currentVeteranProfile.serviceBranch} ({currentVeteranProfile.yearsOfService} Yrs) | Unit: {currentVeteranUser.unit}
            </p>
          </div>
        </div>

        {/* Clinical Quick Action Bar */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={() => setActiveScreen('task-management')}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-extrabold text-xs shadow-rust flex items-center justify-center gap-1.5 transition-all font-heading tracking-wider"
          >
            <Sliders className="w-4 h-4" /> Adjust Recovery Tasks
          </button>

          <button
            onClick={() => setActiveScreen('counselor-comm')}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-[#1C1917] hover:bg-black text-white border border-[#E8DCCE] font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-warm font-heading tracking-wider"
          >
            <MessageCircle className="w-4 h-4 text-[#D96B27]" /> Send Clinical Note
          </button>
        </div>
      </div>

      {/* EXPLAINABLE AI OBSERVATION BOX */}
      {vetInsights.length > 0 ? (
        <div className="p-6 rounded-2xl bg-white border border-[#D96B27] space-y-4 shadow-warm">
          <div className="flex items-center justify-between border-b border-[#E8DCCE] pb-3">
            <div className="flex items-center gap-2 text-[#D96B27] font-extrabold text-sm font-heading tracking-wider">
              <BrainCircuit className="w-5 h-5 animate-pulse" />
              <span>AI LONGITUDINAL PATTERN OBSERVATION</span>
            </div>
            <span className="badge-pill-peach">
              Confidence: {vetInsights[0].confidence}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2 p-4 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE]">
              <div className="font-bold text-[#1C1917]">Compared with Veteran's 4-Week Baseline:</div>
              <ul className="space-y-1 text-[#786F68] font-medium">
                {vetInsights[0].detectedChanges.map((change, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-[#D96B27] font-bold">•</span> {change}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE]">
              <div className="font-bold text-[#1C1917]">Reason for Flag & Rationale:</div>
              <p className="text-[#786F68] leading-relaxed">
                {vetInsights[0].reasons.join(' ')}
              </p>
              <div className="pt-2 text-[#D96B27] font-bold">
                Human review & counselor intervention recommended promptly.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl glass-panel border border-[#E8DCCE] text-xs text-[#8C4A1E] flex items-center gap-2 shadow-warm">
          <ShieldCheck className="w-4 h-4 text-[#D96B27]" />
          <span>AI Insight: Baseline stable over past 30 days. No concerning deviation flags.</span>
        </div>
      )}

      {/* DUAL LONGITUDINAL TREND CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Physical Trend Chart */}
        <div className="p-6 rounded-2xl glass-panel space-y-4 shadow-warm">
          <div className="flex items-center justify-between border-b border-[#E8DCCE] pb-3">
            <h2 className="font-heading text-lg font-bold text-[#1C1917] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#D96B27]" /> Physical Longitudinal Trend (30 Days)
            </h2>
            <span className="label-overline text-[10px] text-[#D96B27]">{latestMetric.physicalScore}% Activity</span>
          </div>

          <div className="p-3 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE] h-40 flex items-end gap-1.5 pt-4">
            {metrics.map((m, i) => (
              <div key={i} className="flex-1 bg-[#D96B27] hover:bg-[#C55A1A] rounded-t transition-all" style={{ height: `${m.physicalScore}%` }} />
            ))}
          </div>
          <div className="flex justify-between label-overline text-[9px] text-[#786F68]">
            <span>30 Days Ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Mental Trend Chart */}
        <div className="p-6 rounded-2xl glass-panel space-y-4 shadow-warm">
          <div className="flex items-center justify-between border-b border-[#E8DCCE] pb-3">
            <h2 className="font-heading text-lg font-bold text-[#1C1917] flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#D96B27]" /> Mental & Stress Trend (30 Days)
            </h2>
            <span className="label-overline text-[10px] text-[#1C1917]">{latestMetric.mentalScore}% Mental Index</span>
          </div>

          <div className="p-3 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE] h-40 flex items-end gap-1.5 pt-4">
            {metrics.map((m, i) => (
              <div key={i} className="flex-1 bg-[#1C1917] hover:bg-black rounded-t transition-all" style={{ height: `${m.mentalScore}%` }} />
            ))}
          </div>
          <div className="flex justify-between label-overline text-[9px] text-[#786F68]">
            <span>30 Days Ago</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* CHECK-IN HISTORY */}
      <div className="p-6 rounded-2xl glass-panel space-y-4 shadow-warm">
        <div className="border-b border-[#E8DCCE] pb-3">
          <h2 className="font-heading text-xl font-bold text-[#1C1917]">Periodic Survey & Check-in History</h2>
        </div>

        <div className="space-y-3">
          {checkIns.map(survey => (
            <div key={survey.id} className="p-4 rounded-2xl bg-[#FDF6EE] border border-[#E8DCCE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div>
                <div className="flex items-center gap-2 font-bold text-[#1C1917]">
                  <Calendar className="w-4 h-4 text-[#D96B27]" />
                  <span>Check-in Date: {survey.date}</span>
                  <span className="text-[#D96B27]">({survey.overallFeeling})</span>
                </div>
                <p className="text-[#786F68] mt-1">
                  Sleep: {survey.sleepRating} | Social: {survey.socialConnectedness} | Stress: {survey.stressLevel}
                </p>
                {survey.notes && <p className="text-[#1C1917] italic mt-1 bg-white p-2.5 rounded-xl border border-[#E8DCCE]">"{survey.notes}"</p>}
              </div>

              <div className="text-right">
                <span className={`font-mono font-bold px-3 py-1 rounded text-[10px] ${survey.needsSupport ? 'bg-rose-100 text-rose-800' : 'bg-[#F7DFCC] text-[#8C4A1E]'}`}>
                  {survey.needsSupport ? 'Requested Support' : 'Self Managed'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
