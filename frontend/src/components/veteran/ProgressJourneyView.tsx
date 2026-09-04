import React from 'react';
import { Trophy, Flame, Award, CheckCircle2, Trees, Wind, Star, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ProgressJourneyView: React.FC = () => {
  const { currentVeteranProfile } = useApp();

  const allBadges = [
    { id: 'b1', title: '7-Day Anchor', description: 'Completed morning stretch 7 days in a row', icon: Flame, unlocked: true },
    { id: 'b2', title: 'Nature Connection', description: 'Logged over 2 hours of outdoor garden time', icon: Trees, unlocked: true },
    { id: 'b3', title: 'Mindful Guardian', description: 'Completed 10 breathing exercises', icon: Wind, unlocked: true },
    { id: 'b4', title: 'Comrade Connection', description: 'Reached out to a fellow service member', icon: Trophy, unlocked: false },
    { id: 'b5', title: '30-Day Master', description: 'Sustained continuous recovery logging for 1 month', icon: Award, unlocked: false }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl glass-panel flex items-center justify-between gap-4 shadow-warm">
        <div>
          <span className="label-overline text-[10px] text-[#8C4A1E]">
            PERSONAL GROWTH & MILESTONES
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917] mt-1">
            Recovery Journey & Achievements
          </h1>
          <p className="text-xs text-[#786F68] mt-1">
            Celebrating consistent personal steps toward physical and mental resilience.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold shrink-0">
          <Trophy className="w-6 h-6" />
        </div>
      </div>

      {/* Gamification Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass-panel flex items-center gap-4 shadow-warm">
          <div className="w-12 h-12 rounded-2xl bg-[#F7DFCC] text-[#D96B27] flex items-center justify-center font-bold">
            <Flame className="w-6 h-6 fill-current" />
          </div>
          <div>
            <span className="label-overline text-[10px]">Current Streak</span>
            <div className="text-3xl font-extrabold text-[#1C1917] font-heading">{currentVeteranProfile.streakDays} Days</div>
            <div className="text-[10px] text-[#D96B27] font-bold">Active Daily Anchor</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel flex items-center gap-4 shadow-warm">
          <div className="w-12 h-12 rounded-2xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="label-overline text-[10px]">Recovery Level</span>
            <div className="text-3xl font-extrabold text-[#1C1917] font-heading">Level {currentVeteranProfile.level}</div>
            <div className="text-[10px] text-[#8C4A1E] font-bold">{currentVeteranProfile.totalXP} Total XP</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel flex items-center gap-4 shadow-warm">
          <div className="w-12 h-12 rounded-2xl bg-[#F7DFCC] text-[#1C1917] flex items-center justify-center font-bold">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <span className="label-overline text-[10px]">Unlocked Badges</span>
            <div className="text-3xl font-extrabold text-[#1C1917] font-heading">
              {currentVeteranProfile.badges.length} / {allBadges.length}
            </div>
            <div className="text-[10px] text-[#1C1917] font-bold">Milestones Achieved</div>
          </div>
        </div>
      </div>

      {/* TASK PERFORMANCE TRACKING */}
      <div className="p-6 rounded-2xl glass-panel space-y-4 shadow-warm">
        <div className="border-b border-[#E8DCCE] pb-3">
          <h2 className="font-heading text-xl font-bold text-[#1C1917]">Task Engagement Baseline Performance</h2>
          <p className="text-xs text-[#786F68] mt-0.5">
            Focuses on consistency relative to your own baseline (no public comparison or competition).
          </p>
        </div>

        <div className="space-y-4 text-xs font-bold">
          <div>
            <div className="flex items-center justify-between text-[#1C1917] mb-1">
              <span>Walking & Physical Routine</span>
              <span className="text-[#D96B27]">80%</span>
            </div>
            <div className="w-full bg-[#E8DCCE] rounded-full h-2 overflow-hidden">
              <div className="bg-[#D96B27] h-full w-[80%]" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[#1C1917] mb-1">
              <span>Breathing & Mindfulness Exercises</span>
              <span className="text-[#D96B27]">60%</span>
            </div>
            <div className="w-full bg-[#E8DCCE] rounded-full h-2 overflow-hidden">
              <div className="bg-[#D96B27] h-full w-[60%]" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[#1C1917] mb-1">
              <span>Social Activities & Outreach</span>
              <span className="text-[#1C1917]">40%</span>
            </div>
            <div className="w-full bg-[#E8DCCE] rounded-full h-2 overflow-hidden">
              <div className="bg-[#1C1917] h-full w-[40%]" />
            </div>
          </div>
        </div>
      </div>

      {/* UNLOCKED BADGES GRID */}
      <div className="p-6 rounded-2xl glass-panel space-y-4 shadow-warm">
        <div className="border-b border-[#E8DCCE] pb-3">
          <h2 className="font-heading text-xl font-bold text-[#1C1917]">Personal Recovery Badges</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allBadges.map(badge => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
                  badge.unlocked
                    ? 'bg-[#FDF2E9] border-[#F7DFCC] shadow-warm'
                    : 'bg-white border-[#E8DCCE] opacity-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    badge.unlocked
                      ? 'bg-[#D96B27] text-white shadow-rust'
                      : 'bg-[#E8DCCE] text-[#786F68]'
                  }`}
                >
                  {badge.unlocked ? <Icon className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-[#1C1917] flex items-center gap-1.5">
                    {badge.title}
                    {badge.unlocked && <CheckCircle2 className="w-4 h-4 text-[#D96B27]" />}
                  </h3>
                  <p className="text-[11px] text-[#786F68] mt-1 leading-relaxed">{badge.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
