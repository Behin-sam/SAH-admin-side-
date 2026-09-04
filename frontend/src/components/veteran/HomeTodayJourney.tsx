import React from 'react';
import { Sparkles, CheckCircle2, Circle, Flame, Award, Calendar, ArrowRight, Play, Info, Heart, Shield, RefreshCw, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const HomeTodayJourney: React.FC = () => {
  const {
    currentVeteranUser,
    currentVeteranProfile,
    tasks,
    setActiveTaskDetail,
    setTaskToComplete,
    setIsCompletionModalOpen,
    setActiveScreen,
    skipTask
  } = useApp();

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;
  const totalXPEarned = tasks
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.xpReward, 0);

  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* TOP DUAL HERO SECTION (Matches Screenshot exactly) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Hero Card: TODAY'S BRIEF */}
        <div className="lg:col-span-2 p-6 sm:p-8 rounded-2xl glass-panel relative overflow-hidden flex flex-col justify-between space-y-6">
          {/* Ambient Nude Circle in top right */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#F7DFCC]/60 rounded-full blur-xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <span className="label-overline">TODAY'S BRIEF</span>
            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-[#1C1917] leading-[0.95] tracking-tight">
              Three things, done at your own pace.
            </h1>
            <p className="text-xs sm:text-sm text-[#786F68] max-w-xl leading-relaxed">
              One for the mind, one for the body, one with other people. Everything is optional to skip — the record is yours, not a score.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative z-10 pt-2">
            <button
              onClick={() => {
                const firstPending = tasks.find(t => t.status === 'pending');
                if (firstPending) {
                  setTaskToComplete(firstPending);
                  setIsCompletionModalOpen(true);
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-black text-white font-bold text-xs shadow-warm transition-all"
            >
              Begin day
            </button>
            <button
              onClick={() => setActiveScreen('profile-view')}
              className="px-5 py-2.5 rounded-xl border border-[#E8DCCE] hover:bg-white text-[#1C1917] font-bold text-xs transition-colors bg-white/60"
            >
              Edit my brief
            </button>
          </div>
        </div>

        {/* Right Hero Card: SETUP */}
        <div className="p-6 rounded-2xl glass-panel flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="label-overline">SETUP</span>
              <span className="label-overline">0 / 5</span>
            </div>

            {/* Segmented Progress bar */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map(step => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full ${step === 1 ? 'bg-[#D96B27]' : 'bg-[#E8DCCE]'}`}
                />
              ))}
            </div>

            <div className="space-y-1">
              <h2 className="font-heading text-xl font-bold text-[#1C1917]">
                Finish your five-question setup.
              </h2>
              <p className="text-xs text-[#786F68] leading-relaxed">
                A few answers help keep each day personal and practical.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveScreen('assessment')}
            className="w-full py-3 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-rust transition-all"
          >
            <span>Continue setup</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* LOWER SECTION: TODAY'S MISSIONS + SIDEBAR PROGRESS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Missions List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-heading text-xl font-bold text-[#1C1917]">Today's missions</h2>
            <span className="label-overline text-[11px] text-[#786F68]">
              {completedCount} of {totalCount} complete
            </span>
          </div>

          <div className="space-y-3">
            {tasks.map((task, idx) => {
              const isCompleted = task.status === 'completed';
              const isSkipped = task.status === 'skipped';
              const isRustButton = idx % 2 === 1;

              return (
                <div
                  key={task.id}
                  className={`p-5 rounded-2xl glass-panel transition-all space-y-3 ${
                    isCompleted
                      ? 'bg-emerald-50/50 border-emerald-200 opacity-90'
                      : isSkipped
                      ? 'opacity-60 bg-stone-50/50'
                      : 'hover:border-[#D96B27]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {/* Nude Peach Pill Tag */}
                      <span className="badge-pill-peach shrink-0 mt-0.5">
                        {task.category}
                      </span>
                      <span className="label-overline text-[10px] text-[#786F68] shrink-0 mt-0.5">
                        {String.fromCharCode(65 + idx)} • ~{task.durationMinutes} min
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="label-overline text-[11px] text-[#786F68]">
                        +{task.xpReward} pts
                      </span>
                      {!isCompleted && !isSkipped && (
                        <button
                          onClick={() => {
                            setTaskToComplete(task);
                            setIsCompletionModalOpen(true);
                          }}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm ${
                            isRustButton
                              ? 'bg-[#D96B27] hover:bg-[#C55A1A]'
                              : 'bg-[#1C1917] hover:bg-black'
                          }`}
                        >
                          {isRustButton ? 'Check in' : 'Start'}
                        </button>
                      )}
                      {isCompleted && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Completed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 pl-1">
                    <h3 className={`font-heading text-lg font-bold ${isCompleted ? 'line-through text-[#786F68]' : 'text-[#1C1917]'}`}>
                      {task.title}
                    </h3>
                    <p className="text-xs text-[#786F68] leading-relaxed">
                      {task.description}
                    </p>
                  </div>

                  {/* Micro Location Pill example if applicable */}
                  {task.category === 'Nature' && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F7DFCC]/60 border border-[#E8DCCE] text-[11px] font-medium text-[#8C4A1E]">
                      <span className="w-2 h-2 rounded-full bg-[#D96B27]" />
                      <span>Location ready • only for this check-in</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Progress Sidebar Card (Matches Screenshot Right Panel) */}
        <div className="p-6 rounded-2xl glass-panel space-y-6 h-fit">
          {/* PROGRESS */}
          <div className="space-y-3">
            <span className="label-overline">PROGRESS</span>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-4xl sm:text-5xl font-extrabold text-[#1C1917]">
                {(currentVeteranProfile.totalXP).toLocaleString()}
              </span>
              <span className="label-overline text-[10px] text-[#786F68]">POINTS TODAY +{totalXPEarned}</span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="w-full bg-[#E8DCCE] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#D96B27] h-full transition-all duration-500"
                  style={{ width: `${(currentVeteranProfile.totalXP % 1000) / 10}%` }}
                />
              </div>
              <div className="flex justify-between label-overline text-[9px] text-[#786F68] pt-0.5">
                <span>{currentVeteranProfile.totalXP % 1000} / 1000</span>
                <span>to next patch</span>
              </div>
            </div>
          </div>

          <hr className="border-[#E8DCCE]" />

          {/* STREAK */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="label-overline">STREAK</span>
              <span className="label-overline text-[11px] text-[#786F68]">{currentVeteranProfile.streakDays} days</span>
            </div>

            {/* Day squares M T W T F S S */}
            <div className="grid grid-cols-7 gap-1.5">
              {daysOfWeek.map((day, i) => {
                const isActive = i < 5;
                return (
                  <div
                    key={i}
                    className={`h-7 rounded-md flex items-center justify-center font-mono font-bold text-xs ${
                      isActive
                        ? 'bg-[#D96B27] text-white shadow-sm'
                        : 'bg-[#F7DFCC] text-[#8C4A1E]'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-[#786F68] leading-relaxed italic">
              Streaks are yours to keep. Missing a day never resets the record.
            </p>
          </div>

          <hr className="border-[#E8DCCE]" />

          {/* Stats List */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-[#E8DCCE]/60">
              <span className="text-[#786F68]">Missions done</span>
              <span className="font-mono font-bold text-[#1C1917]">{completedCount} / {totalCount}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#E8DCCE]/60">
              <span className="text-[#786F68]">Groups joined</span>
              <span className="font-mono font-bold text-[#1C1917]">2</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[#786F68]">Walks verified</span>
              <span className="font-mono font-bold text-[#1C1917]">18</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
