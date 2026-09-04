import React, { useState } from 'react';
import { CalendarCheck, CheckCircle2, ArrowRight, HeartHandshake } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const WeeklyCheckInModal: React.FC = () => {
  const { submitCheckIn, setActiveScreen } = useApp();

  const [overallFeeling, setOverallFeeling] = useState<'Good' | 'Okay' | 'Difficult' | 'Very difficult'>('Okay');
  const [sleepRating, setSleepRating] = useState<'Restful' | 'Interrupted' | 'Insomnia / Poor'>('Restful');
  const [socialConnectedness, setSocialConnectedness] = useState<'Connected' | 'Neutral' | 'Isolated'>('Connected');
  const [stressLevel, setStressLevel] = useState<'Low' | 'Moderate' | 'High' | 'Severe'>('Low');
  const [needsSupport, setNeedsSupport] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitCheckIn({
      overallFeeling,
      sleepRating,
      socialConnectedness,
      stressLevel,
      needsSupport,
      notes
    });
    setSubmitted(true);
  };

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel border border-[#E8DCCE] flex items-center justify-between gap-4 shadow-warm">
        <div>
          <span className="label-overline text-[10px] text-[#8C4A1E]">
            PERIODIC CHECK-IN
          </span>
          <h1 className="font-heading text-2xl font-bold text-[#1C1917] mt-1">
            WEEKLY CHECK-IN SURVEY
          </h1>
          <p className="text-xs text-[#786F68] mt-1">
            Short 2-minute evaluation to keep your clinical counselor updated on your trajectory.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold shrink-0">
          <CalendarCheck className="w-6 h-6" />
        </div>
      </div>

      {submitted ? (
        <div className="p-8 rounded-2xl glass-panel text-center space-y-4 animate-scaleUp shadow-warm">
          <div className="w-16 h-16 rounded-full bg-[#D96B27] text-white flex items-center justify-center mx-auto shadow-rust">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-[#1C1917]">Check-in Submitted</h2>
          <p className="text-xs text-[#786F68] max-w-md mx-auto leading-relaxed">
            Thank you for providing your update. Your counselor Dr. Ananya Nair has received your check-in notes.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setActiveScreen('home')}
              className="px-6 py-3 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-bold text-xs shadow-rust inline-flex items-center gap-2 font-heading tracking-wider"
            >
              <span>Return to Today's Journey</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl glass-panel space-y-6 shadow-warm">
          {/* Question 1: Feeling */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[#1C1917] block">
              1. How have you been feeling overall this week?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Good', emoji: '😊', value: 'Good' },
                { label: 'Okay', emoji: '🙂', value: 'Okay' },
                { label: 'Difficult', emoji: '😐', value: 'Difficult' },
                { label: 'Very difficult', emoji: '😟', value: 'Very difficult' }
              ].map(item => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setOverallFeeling(item.value as any)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    overallFeeling === item.value
                      ? 'bg-[#F7DFCC] border-[#D96B27] text-[#8C4A1E] shadow-sm'
                      : 'bg-white border-[#E8DCCE] text-[#1C1917]'
                  }`}
                >
                  <span className="text-xl">{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Question 2: Sleep */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1C1917] block">
              2. How has your sleep quality been?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Restful', 'Interrupted', 'Insomnia / Poor'].map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSleepRating(option as any)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    sleepRating === option
                      ? 'bg-[#F7DFCC] border-[#D96B27] text-[#8C4A1E]'
                      : 'bg-white border-[#E8DCCE] text-[#1C1917]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Question 3: Social */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1C1917] block">
              3. How connected have you felt to family or comrades?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Connected', 'Neutral', 'Isolated'].map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSocialConnectedness(option as any)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    socialConnectedness === option
                      ? 'bg-[#F7DFCC] border-[#D96B27] text-[#8C4A1E]'
                      : 'bg-white border-[#E8DCCE] text-[#1C1917]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Question 4: Stress */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1C1917] block">
              4. How stressful has this week been?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['Low', 'Moderate', 'High', 'Severe'].map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStressLevel(option as any)}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all text-center ${
                    stressLevel === option
                      ? 'bg-[#F7DFCC] border-[#D96B27] text-[#8C4A1E]'
                      : 'bg-white border-[#E8DCCE] text-[#1C1917]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Question 5: Additional Support Prompt */}
          <div className="p-4 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE] space-y-3">
            <label className="text-xs font-bold text-[#1C1917] block">
              5. Do you feel like you need additional support from your counselor right now?
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setNeedsSupport(true)}
                className={`px-5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                  needsSupport
                    ? 'bg-[#D96B27] text-white border-[#D96B27] shadow-rust'
                    : 'bg-white border-[#E8DCCE] text-[#1C1917]'
                }`}
              >
                <HeartHandshake className="w-4 h-4" /> Yes, Request Callback
              </button>

              <button
                type="button"
                onClick={() => setNeedsSupport(false)}
                className={`px-5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  !needsSupport
                    ? 'bg-[#1C1917] text-white border-[#1C1917]'
                    : 'bg-white border-[#E8DCCE] text-[#786F68]'
                }`}
              >
                No, I am managing okay
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-[#E8DCCE] flex justify-end">
            <button
              type="submit"
              className="px-8 py-3 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-extrabold text-xs shadow-rust flex items-center gap-2 font-heading tracking-wider"
            >
              <span>Submit Weekly Check-in</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
