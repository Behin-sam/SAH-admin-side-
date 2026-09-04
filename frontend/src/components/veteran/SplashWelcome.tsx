import React from 'react';
import { Shield, Sparkles, UserCheck, Stethoscope, ArrowRight, Heart, Award, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SplashWelcome: React.FC = () => {
  const { setRole, setActiveScreen } = useApp();

  return (
    <div className="min-h-[calc(100vh-61px)] flex flex-col justify-center items-center p-4 lg:p-8 relative overflow-hidden">
      {/* Background Nude Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#F7DFCC]/40 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full text-center space-y-8 z-10">
        {/* Hackathon Badge Header */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F7DFCC] border border-[#E8DCCE] text-[#8C4A1E] text-xs font-bold font-mono">
          <Sparkles className="w-4 h-4" />
          Smart Amrita Hackathon / SIH 2026 Innovation Prototype
        </div>

        {/* Main Title & Tagline */}
        <div className="space-y-4">
          <h1 className="font-heading text-4xl sm:text-6xl font-extrabold tracking-tight text-[#1C1917] leading-none">
            Continuous Recovery Companion for <span className="text-[#D96B27]">War Veterans</span>
          </h1>
          <p className="max-w-2xl mx-auto text-[#786F68] text-sm sm:text-base leading-relaxed">
            Bridging periodic clinical surveys with daily gamified recovery tasks, physical & mental baseline tracking, and explainable AI risk detection for clinical caregivers.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left my-8">
          <div className="p-6 rounded-2xl glass-panel space-y-2 hover:border-[#D96B27] transition-all shadow-warm">
            <div className="w-10 h-10 rounded-xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-lg font-bold text-[#1C1917]">Gentle Gamification</h3>
            <p className="text-xs text-[#786F68] leading-relaxed">
              Progress rings, streak rewards, and micro-milestones designed with supportive, non-competitive tone.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-panel space-y-2 hover:border-[#D96B27] transition-all shadow-warm">
            <div className="w-10 h-10 rounded-xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-lg font-bold text-[#1C1917]">Physical vs Mental Views</h3>
            <p className="text-xs text-[#786F68] leading-relaxed">
              Visually distinct tracking for circadian sleep, daily routine adherence, mood scores, and social connectivity.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-panel space-y-2 hover:border-[#D96B27] transition-all shadow-warm">
            <div className="w-10 h-10 rounded-xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-lg font-bold text-[#1C1917]">Explainable AI Safety Layer</h3>
            <p className="text-xs text-[#786F68] leading-relaxed">
              Longitudinal baseline deviation detection alerts human counselors with clear natural-language rationale.
            </p>
          </div>
        </div>

        {/* Dual Role Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={() => {
              setRole('veteran');
              setActiveScreen('assessment');
            }}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-extrabold text-xs shadow-rust flex items-center justify-center gap-3 transition-all group font-heading tracking-wider"
          >
            <UserCheck className="w-5 h-5" />
            <span>Launch Veteran Companion App</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => {
              setRole('counselor');
              setActiveScreen('dashboard-overview');
            }}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#1C1917] hover:bg-black text-white font-extrabold text-xs shadow-warm flex items-center justify-center gap-3 transition-all font-heading tracking-wider"
          >
            <Stethoscope className="w-5 h-5 text-[#D96B27]" />
            <span>Launch Counselor Clinical Portal</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-[#786F68] pt-6 font-mono">
          <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-[#D96B27]" /> Non-diagnostic clinical safety</span>
          <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-[#D96B27]" /> 24/7 Helpline integration</span>
        </div>
      </div>
    </div>
  );
};
