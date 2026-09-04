import React, { useState } from 'react';
import { X, CheckCircle2, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TaskCompletionModal: React.FC = () => {
  const {
    isCompletionModalOpen,
    setIsCompletionModalOpen,
    taskToComplete,
    setTaskToComplete,
    completeTask
  } = useApp();

  const [effortRating, setEffortRating] = useState<number>(3);
  const [moodImpact, setMoodImpact] = useState<string>('Calmer');
  const [notes, setNotes] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isCompletionModalOpen || !taskToComplete) return null;

  const moodOptions = ['Calmer', 'Energized', 'Neutral', 'Challenging'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    setTimeout(() => {
      completeTask(taskToComplete.id, effortRating, moodImpact, notes);
      setSubmitted(false);
      setIsCompletionModalOpen(false);
      setTaskToComplete(null);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-[#E8DCCE] rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-[#1C1917] space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E8DCCE] pb-3">
          <div>
            <span className="label-overline text-[10px] text-[#8C4A1E]">
              LOG ACTIVITY COMPLETION
            </span>
            <h2 className="font-heading text-xl font-bold text-[#1C1917] mt-0.5">{taskToComplete.title}</h2>
          </div>
          <button
            onClick={() => setIsCompletionModalOpen(false)}
            className="p-2 rounded-xl text-[#786F68] hover:text-[#1C1917] hover:bg-[#FDF6EE]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-4 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-[#D96B27] text-white flex items-center justify-center mx-auto shadow-rust">
              <Sparkles className="w-8 h-8 animate-spin-slow" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-extrabold text-[#1C1917] font-heading">Small Steps Count!</h3>
              <p className="text-xs text-[#D96B27] font-bold">
                +{taskToComplete.xpReward} Recovery XP Added to Profile
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Effort Rating 1-5 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#1C1917] block">
                How much effort did this activity take today? (1 = Light, 5 = Very High)
              </label>
              <div className="flex items-center justify-between gap-2">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setEffortRating(num)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      effortRating === num
                        ? 'bg-[#D96B27] text-white border-[#D96B27] shadow-rust'
                        : 'bg-[#FDF6EE] border-[#E8DCCE] text-[#1C1917] hover:border-[#D96B27]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood Impact */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#1C1917] block">
                How do you feel after completing this?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {moodOptions.map(mood => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => setMoodImpact(mood)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      moodImpact === mood
                        ? 'bg-[#F7DFCC] border-[#D96B27] text-[#8C4A1E] shadow-sm'
                        : 'bg-[#FDF6EE] border-[#E8DCCE] text-[#786F68]'
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            {/* Reflection / Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1C1917] block">
                Personal Reflection / Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g., Felt calmer during walking. Sunlight was helpful."
                rows={2}
                className="w-full bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl p-3 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8DCCE]">
              <button
                type="button"
                onClick={() => setIsCompletionModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#FDF6EE] text-[#786F68] text-xs font-bold border border-[#E8DCCE]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-extrabold text-xs shadow-rust flex items-center gap-1.5 font-heading tracking-wider"
              >
                <CheckCircle2 className="w-4 h-4" /> Save & Log +{taskToComplete.xpReward} XP
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
