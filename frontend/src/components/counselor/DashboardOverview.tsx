import React from 'react';
import { LayoutDashboard, Users, ArrowRight, BrainCircuit, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DashboardOverview: React.FC = () => {
  const { assignedVeterans, setActiveVeteranId, setActiveScreen, aiInsights, currentUser } = useApp();

  const totalActive = assignedVeterans.length;
  const stableCount = assignedVeterans.filter(
    v => (v.profile.currentRiskLevel === 'NORMAL' || !v.profile.currentRiskLevel) && (v.profile.credibilityScore ?? 85) >= 70
  ).length;
  const monitorCount = assignedVeterans.filter(
    v => v.profile.currentRiskLevel === 'MONITOR' || ((v.profile.credibilityScore ?? 85) >= 50 && (v.profile.credibilityScore ?? 85) < 70)
  ).length;
  const attentionCount = assignedVeterans.filter(v => v.profile.currentRiskLevel === 'ATTENTION').length;
  const urgentReviewCount = assignedVeterans.filter(
    v => v.profile.currentRiskLevel === 'URGENT REVIEW' || (v.profile.credibilityScore ?? 85) < 50
  ).length;

  const assignedVetIds = new Set(assignedVeterans.map(v => v.user.id));
  const relevantInsights = aiInsights.filter(insight => assignedVetIds.has(insight.veteranId));

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Top Clinical Header */}
      <div className="p-6 rounded-2xl glass-panel flex items-center justify-between gap-4 shadow-warm">
        <div>
          <span className="label-overline text-[10px] text-[#8C4A1E]">
            CLINICAL SUPERVISOR PORTAL • CASELOAD ISOLATED
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917] mt-1">
            MY VETERANS CASELOAD OVERVIEW
          </h1>
          <p className="text-xs text-[#786F68] mt-1">
            Real-time longitudinal monitoring, AI credibility tracking, and explainable intervention alerts for assigned clients.
          </p>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold shrink-0">
          <LayoutDashboard className="w-6 h-6" />
        </div>
      </div>

      {/* CASELOAD OVERVIEW SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl glass-panel shadow-warm">
          <div className="label-overline text-[9px]">Total Assigned Veterans</div>
          <div className="text-3xl font-extrabold text-[#1C1917] font-heading mt-2">{totalActive}</div>
          <div className="text-[10px] text-[#786F68] mt-1">Assigned to {currentUser?.name || 'Accredited Specialist'}</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel bg-[#FDF2E9] border-[#F7DFCC] shadow-warm">
          <div className="flex items-center justify-between">
            <span className="label-overline text-[9px] text-[#8C4A1E]">🟢 Stable</span>
            <span className="badge-pill-peach">{stableCount}</span>
          </div>
          <div className="text-3xl font-extrabold text-[#1C1917] font-heading mt-2">{stableCount}</div>
          <div className="text-[10px] text-[#8C4A1E] mt-1 font-bold">Credibility &ge; 70%</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel bg-amber-50 border-amber-200 shadow-warm">
          <div className="flex items-center justify-between">
            <span className="label-overline text-[9px] text-amber-800">🟡 Monitor</span>
            <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold font-mono">{monitorCount}</span>
          </div>
          <div className="text-3xl font-extrabold text-[#1C1917] font-heading mt-2">{monitorCount}</div>
          <div className="text-[10px] text-amber-800 mt-1 font-bold">Credibility 50–69%</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel bg-rose-50 border-rose-200 shadow-warm">
          <div className="flex items-center justify-between">
            <span className="label-overline text-[9px] text-rose-800">🟠 Attention</span>
            <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-bold font-mono">{attentionCount}</span>
          </div>
          <div className="text-3xl font-extrabold text-[#1C1917] font-heading mt-2">{attentionCount}</div>
          <div className="text-[10px] text-rose-800 mt-1 font-bold">Meaningful change detected</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel bg-[#D96B27]/10 border-[#D96B27] shadow-warm">
          <div className="flex items-center justify-between">
            <span className="label-overline text-[9px] text-[#D96B27]">🔴 Urgent Review</span>
            <span className="badge-pill-rust">{urgentReviewCount}</span>
          </div>
          <div className="text-3xl font-extrabold text-[#1C1917] font-heading mt-2">{urgentReviewCount}</div>
          <div className="text-[10px] text-[#D96B27] mt-1 font-bold">Credibility &lt; 50 or Emergency</div>
        </div>
      </div>

      {/* RECENT AI ATTENTION ALERTS BANNER */}
      <div className="p-6 rounded-2xl glass-panel border-[#E8DCCE] space-y-4 shadow-warm">
        <div className="flex items-center justify-between border-b border-[#E8DCCE] pb-3">
          <div className="flex items-center gap-2 text-[#D96B27] font-bold text-sm font-heading tracking-wider">
            <BrainCircuit className="w-5 h-5 animate-pulse" />
            <span>AI Attention Alerts Requiring Counselor Review ({relevantInsights.length})</span>
          </div>
          <button
            onClick={() => setActiveScreen('ai-attention')}
            className="text-xs text-[#D96B27] font-bold hover:underline flex items-center gap-1"
          >
            Open Alert Center <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {relevantInsights.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE] text-center text-xs text-[#786F68]">
            No active AI alerts for your assigned caseload. All assigned veterans are currently stable.
          </div>
        ) : (
          <div className="space-y-3">
            {relevantInsights.map(insight => (
              <div key={insight.id} className="p-4 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge-pill-rust">
                      ⚠ {insight.riskLevel}
                    </span>
                    <span className="text-xs font-bold text-[#1C1917]">{insight.veteranName}</span>
                    <span className="text-[10px] text-[#786F68] font-mono">({insight.timestamp})</span>
                    {insight.credibilityScore !== undefined && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        insight.credibilityScore < 50 ? 'bg-rose-100 text-rose-800' : 'bg-[#F7DFCC] text-[#8C4A1E]'
                      }`}>
                        Credibility: {insight.credibilityScore}/100
                      </span>
                    )}
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
        )}
      </div>

      {/* QUICK VETERAN ROSTER */}
      <div className="p-6 rounded-2xl glass-panel space-y-4 shadow-warm">
        <div className="flex items-center justify-between border-b border-[#E8DCCE] pb-3">
          <h2 className="font-heading text-xl font-bold text-[#1C1917] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D96B27]" />
            <span>Assigned Veteran Caseload ({assignedVeterans.length})</span>
          </h2>
          <button
            onClick={() => setActiveScreen('veteran-list')}
            className="text-xs text-[#D96B27] font-bold hover:underline flex items-center gap-1"
          >
            Full Directory <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {assignedVeterans.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#FDF6EE] border border-[#E8DCCE] text-center space-y-2">
            <p className="text-sm font-bold text-[#1C1917]">No Veterans Currently Assigned</p>
            <p className="text-xs text-[#786F68]">
              When veterans select you as their counselor in the Specialist Directory, their profiles and AI health trajectories will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {assignedVeterans.map(v => (
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
                  <div>
                    <span className="text-[#786F68] text-[10px]">Credibility: </span>
                    <span className={`font-bold font-mono text-[11px] ${
                      (v.profile.credibilityScore ?? 85) < 50 ? 'text-rose-600' : 'text-[#8C4A1E]'
                    }`}>
                      {v.profile.credibilityScore ?? 85}/100
                    </span>
                  </div>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                      v.profile.currentRiskLevel === 'NORMAL' || !v.profile.currentRiskLevel
                        ? 'bg-[#F7DFCC] text-[#8C4A1E]'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {v.profile.currentRiskLevel || 'NORMAL'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
