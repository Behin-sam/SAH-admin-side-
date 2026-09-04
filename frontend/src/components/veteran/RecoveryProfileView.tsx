import React from 'react';
import { UserCheck, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, RefreshCw, Compass } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const RecoveryProfileView: React.FC = () => {
  const { currentVeteranUser, currentVeteranProfile, setActiveScreen, resetOnboarding } = useApp();

  const profileBaselines = [
    { label: 'Physical Activity', level: currentVeteranProfile.physicalActivityLevel, badge: 'badge-pill-peach' },
    { label: 'Social Interaction', level: currentVeteranProfile.socialInteractionLevel, badge: 'badge-pill-peach' },
    { label: 'Sleep Consistency', level: currentVeteranProfile.sleepConsistencyLevel, badge: 'badge-pill-peach' },
    { label: 'Outdoor Engagement', level: currentVeteranProfile.outdoorEngagementLevel, badge: 'badge-pill-peach' },
    { label: 'Routine Stability', level: currentVeteranProfile.routineStabilityLevel, badge: 'badge-pill-peach' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-[#E8DCCE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-warm">
        <div>
          <span className="badge-pill-peach mb-2 inline-block">
            AI PERSONALIZED PROFILE
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917]">
            {currentVeteranUser.name} — Recovery Baseline
          </h1>
          <p className="text-xs text-[#786F68] mt-1">
            {currentVeteranUser.rank} | {currentVeteranProfile.yearsOfService} Years Service | Counselor: {currentVeteranUser.assignedCounselorName}
          </p>
        </div>

        <button
          onClick={resetOnboarding}
          className="px-4 py-2 rounded-xl bg-white hover:bg-[#FDF6EE] text-[#1C1917] text-xs font-bold border border-[#E8DCCE] flex items-center gap-1.5 transition-colors shrink-0 shadow-warm"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retake Survey
        </button>
      </div>

      {/* Grid Layout: Baseline Indicators & Recommended Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Baseline Status Card */}
        <div className="p-6 rounded-2xl glass-panel space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E8DCCE] pb-3">
            <Compass className="w-4 h-4 text-[#D96B27]" />
            <span className="font-heading text-lg font-bold text-[#1C1917]">Assessed Baseline Parameters</span>
          </div>

          <div className="space-y-3">
            {profileBaselines.map(item => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE]">
                <span className="text-xs font-bold text-[#1C1917]">{item.label}</span>
                <span className={`${item.badge}`}>
                  {item.level}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-white border border-[#E8DCCE] text-[11px] text-[#786F68] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#D96B27] shrink-0 mt-0.5" />
            <span>
              These parameters serve as your baseline. Daily task recommendations adapt based on your actual interaction patterns.
            </span>
          </div>
        </div>

        {/* Recommended Focus Card */}
        <div className="p-6 rounded-2xl glass-panel space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E8DCCE] pb-3">
              <Sparkles className="w-4 h-4 text-[#D96B27]" />
              <span className="font-heading text-lg font-bold text-[#1C1917]">Recommended Recovery Focus Areas</span>
            </div>

            <div className="space-y-2.5">
              {currentVeteranProfile.recommendedFocus.map((focus, index) => (
                <div key={index} className="flex items-start gap-3 p-3.5 rounded-xl bg-[#FDF2E9] border border-[#F7DFCC]">
                  <CheckCircle2 className="w-4 h-4 text-[#D96B27] shrink-0 mt-0.5" />
                  <span className="text-xs font-bold text-[#1C1917] leading-relaxed">{focus}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8DCCE]">
            <button
              onClick={() => setActiveScreen('home')}
              className="w-full py-3.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-extrabold text-xs shadow-rust flex items-center justify-center gap-2 transition-all font-heading tracking-wider"
            >
              <span>View Today's Recovery Journey</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
