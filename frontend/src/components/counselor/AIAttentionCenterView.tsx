import React from 'react';
import { BrainCircuit, CheckCircle2, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AIAttentionCenterView: React.FC = () => {
  const { aiInsights, acknowledgeInsight, setActiveVeteranId, setActiveScreen, assignedVeterans } = useApp();

  const assignedVetIds = new Set(assignedVeterans.map(v => v.user.id));
  const caseloadInsights = aiInsights.filter(insight => assignedVetIds.has(insight.veteranId));

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel flex items-center justify-between gap-4 shadow-warm">
        <div>
          <span className="label-overline text-[10px] text-[#8C4A1E]">
            EXPLAINABLE AI SAFETY LAYER • CASELOAD ISOLATED
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917] mt-1">
            AI ATTENTION & RISK DETECTOR
          </h1>
          <p className="text-xs text-[#786F68] mt-1">
            Longitudinal pattern drift and credibility drops for veterans assigned directly to you. AI assists professional oversight.
          </p>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold shrink-0">
          <BrainCircuit className="w-6 h-6 animate-pulse" />
        </div>
      </div>

      {/* AI Insights List */}
      <div className="space-y-4">
        {caseloadInsights.length === 0 ? (
          <div className="p-12 rounded-2xl glass-panel border border-[#E8DCCE] text-center space-y-3 shadow-warm">
            <ShieldCheck className="w-12 h-12 text-[#8C4A1E] mx-auto opacity-75" />
            <h3 className="font-heading text-xl font-bold text-[#1C1917]">No Active Caseload Risk Alerts</h3>
            <p className="text-xs text-[#786F68] max-w-md mx-auto">
              All veterans in your assigned caseload are maintaining steady recovery trajectories and stable credibility metrics.
            </p>
          </div>
        ) : (
          caseloadInsights.map(insight => (
            <div
              key={insight.id}
              className="p-6 rounded-2xl glass-panel space-y-4 shadow-warm border-[#D96B27]"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8DCCE] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge-pill-rust flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> ATTENTION: {insight.riskLevel}
                    </span>
                    <span className="label-overline text-[10px]">Confidence: {insight.confidence}</span>
                    {insight.credibilityScore !== undefined && (
                      <span className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full ${
                        insight.credibilityScore < 50 ? 'bg-rose-100 text-rose-800' : 'bg-[#F7DFCC] text-[#8C4A1E]'
                      }`}>
                        Credibility Score: {insight.credibilityScore}/100
                      </span>
                    )}
                  </div>
                  <h2 className="font-heading text-2xl font-bold text-[#1C1917] mt-1">
                    {insight.veteranName}
                  </h2>
                  <p className="text-[11px] text-[#786F68] font-mono">Timestamp Flagged: {insight.timestamp}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!insight.acknowledgedByCounselor ? (
                    <button
                      onClick={() => acknowledgeInsight(insight.id)}
                      className="px-4 py-2.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-extrabold text-xs shadow-rust flex items-center gap-1.5 font-heading tracking-wider"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Acknowledge Alert
                    </button>
                  ) : (
                    <span className="badge-pill-peach flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Acknowledged
                    </span>
                  )}

                  <button
                    onClick={() => {
                      setActiveVeteranId(insight.veteranId);
                      setActiveScreen('veteran-detail');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#1C1917] hover:bg-black text-white text-xs font-bold border border-[#E8DCCE] flex items-center gap-1 shadow-warm font-heading tracking-wider"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* DETECTED CHANGES & EXPLANATION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs">
                <div className="space-y-2 bg-[#FDF6EE] p-4 rounded-2xl border border-[#E8DCCE]">
                  <div className="label-overline text-[#8C4A1E]">
                    Detected Longitudinal Changes:
                  </div>
                  <ul className="space-y-1.5 text-[#1C1917] font-medium">
                    {insight.detectedChanges.map((change, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#D96B27] font-bold">•</span>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 bg-[#FDF6EE] p-4 rounded-2xl border border-[#E8DCCE]">
                  <div className="label-overline text-[#8C4A1E]">
                    Recommended Counselor Actions:
                  </div>
                  <ul className="space-y-1.5 text-[#1C1917] font-medium">
                    {insight.recommendedActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#D96B27] font-bold">→</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
