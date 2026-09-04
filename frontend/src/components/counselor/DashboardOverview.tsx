import React from 'react';
import { LayoutDashboard, Users, ArrowRight, BrainCircuit } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DashboardOverview: React.FC = () => {
  const { allVeterans, setActiveVeteranId, setActiveScreen, aiInsights } = useApp();

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Top Clinical Header */}
      <div className="p-6 rounded-2xl glass-panel flex items-center justify-between gap-4 shadow-warm">
        <div>
          <span className="label-overline text-[10px] text-[#8C4A1E]">
            CLINICAL SUPERVISOR PORTAL
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917] mt-1">
            MY VETERANS CASELOAD OVERVIEW
          </h1>
          <p className="text-xs text-[#786F68] mt-1">
            Real-time longitudinal monitoring, explainable AI change indicators, and personalized intervention hub.
          </p>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold shrink-0">
          <LayoutDashboard className="w-6 h-6" />
        </div>
      </div>

      {/* CASELOAD OVERVIEW SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl glass-panel shadow-warm">
          <div className="label-overline text-[9px]">Total Active Veterans</div>
          <div className="text-3xl font-extrabold text-[#1C1917] font-heading mt-2">24</div>
          <div className="text-[10px] text-[#786F68] mt-1">Assigned to Dr. Ananya Nair</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel bg-[#FDF2E9] border-[#F7DFCC] shadow-warm">
          <div className="flex items-center justify-between">
            <span className="label-overline text-[9px] text-[#8C4A1E]">🟢 Stable</span>
            <span className="badge-pill-peach">17</span>
          </div>
          <div className="text-3xl font-extrabold text-[#1C1917] font-heading mt-2">17</div>
          <div className="text-[10px] text-[#8C4A1E] mt-1 font-bold">Consistent baselines</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel bg-amber-50 border-amber-200 shadow-warm">
          <div className="flex items-center justify-between">
            <span className="label-overline text-[9px] text-amber-800">🟡 Monitor</span>
            <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold font-mono">5</span>
          </div>
          <div className="text-3xl font-extrabold text-[#1C1917] font-heading mt-2">5</div>
          <div className="text-[10px] text-amber-800 mt-1 font-bold">Minor trend drift</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel bg-rose-50 border-rose-200 shadow-warm">
          <div className="flex items-center justify-between">
            <span className="label-overline text-[9px] text-rose-800">🟠 Attention</span>
            <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-bold font-mono">2</span>
          </div>
          <div className="text-3xl font-extrabold text-[#1C1917] font-heading mt-2">2</div>
          <div className="text-[10px] text-rose-800 mt-1 font-bold">Meaningful change detected</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel bg-[#D96B27]/10 border-[#D96B27] sos-pulse shadow-warm">
          <div className="flex items-center justify-between">
            <span className="label-overline text-[9px] text-[#D96B27]">🔴 Urgent Review</span>
            <span className="badge-pill-rust">1</span>
          </div>
          <div className="text-3xl font-extrabold text-[#1C1917] font-heading mt-2">1</div>
          <div className="text-[10px] text-[#D96B27] mt-1 font-bold">Immediate outreach needed</div>
        </div>
      </div>

      {/* RECENT AI ATTENTION ALERTS BANNER */}
      <div className="p-6 rounded-2xl glass-panel border-[#E8DCCE] space-y-4 shadow-warm">
        <div className="flex items-center justify-between border-b border-[#E8DCCE] pb-3">
          <div className="flex items-center gap-2 text-[#D96B27] font-bold text-sm font-heading tracking-wider">
            <BrainCircuit className="w-5 h-5 animate-pulse" />
            <span>AI Attention Alerts Requiring Counselor Review</span>
          </div>
          <button
            onClick={() => setActiveScreen('ai-attention')}
            className="text-xs text-[#D96B27] font-bold hover:underline flex items-center gap-1"
          >
            Open Alert Center <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {aiInsights.map(insight => (
            <div key={insight.id} className="p-4 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="badge-pill-rust">
                    ⚠ {insight.riskLevel}
                  </span>
                  <span className="text-xs font-bold text-[#1C1917]">{insight.veteranName}</span>
                  <span className="text-[10px] text-[#786F68] font-mono">({insight.timestamp})</span>
                </div>
                <p className="text-xs text-[#786F68]">
                  {insight.detectedChanges.join(' • ')}
                </p>
              </div>

              <button
                onClick={() => {
                  setActiveVeteranId(insight.veteranId);
                  setActiveScreen('veteran-detail');
                }}
                className="px-4 py-2 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-bold text-xs shrink-0 flex items-center gap-1 shadow-rust transition-all"
              >
                <span>Review Profile</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* QUICK VETERAN ROSTER */}
      <div className="p-6 rounded-2xl glass-panel space-y-4 shadow-warm">
        <div className="flex items-center justify-between border-b border-[#E8DCCE] pb-3">
          <h2 className="font-heading text-xl font-bold text-[#1C1917] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D96B27]" />
            <span>Active Veteran Caseload Roster</span>
          </h2>
          <button
            onClick={() => setActiveScreen('veteran-list')}
            className="text-xs text-[#D96B27] font-bold hover:underline flex items-center gap-1"
          >
            Full Directory <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {allVeterans.map(v => (
            <div
              key={v.user.id}
              onClick={() => {
                setActiveVeteranId(v.user.id);
                setActiveScreen('veteran-detail');
              }}
              className="p-4 rounded-2xl glass-panel border border-[#E8DCCE] hover:border-[#D96B27] cursor-pointer transition-all space-y-3 shadow-warm"
            >
              <div className="flex items-center gap-3">
                <img
                  src={v.user.avatarUrl}
                  alt={v.user.name}
                  className="w-12 h-12 rounded-full object-cover border border-[#E8DCCE]"
                />
                <div>
                  <h3 className="font-heading font-bold text-base text-[#1C1917]">{v.user.name}</h3>
                  <p className="text-[11px] text-[#786F68] line-clamp-1">{v.user.rank}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E8DCCE]">
                <span className="text-[#786F68]">Risk Level:</span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                    v.profile.currentRiskLevel === 'NORMAL'
                      ? 'bg-[#F7DFCC] text-[#8C4A1E]'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {v.profile.currentRiskLevel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
