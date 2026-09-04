import React from 'react';
import { X, Clock, Award, Play, Wind } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TaskDetailsModal: React.FC = () => {
  const { activeTaskDetail, setActiveTaskDetail, setTaskToComplete, setIsCompletionModalOpen } = useApp();

  if (!activeTaskDetail) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-[#E8DCCE] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-[#1C1917] space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#E8DCCE] pb-4">
          <div className="space-y-1">
            <span className="badge-pill-peach">
              {activeTaskDetail.category} Activity
            </span>
            <h2 className="font-heading text-2xl font-bold text-[#1C1917] mt-1">{activeTaskDetail.title}</h2>
          </div>
          <button
            onClick={() => setActiveTaskDetail(null)}
            className="p-2 rounded-xl text-[#786F68] hover:text-[#1C1917] hover:bg-[#FDF6EE]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Info Specs */}
        <div className="flex items-center gap-4 text-xs font-bold text-[#1C1917] bg-[#FDF6EE] p-3.5 rounded-xl border border-[#E8DCCE]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#D96B27]" />
            <span>Duration: {activeTaskDetail.durationMinutes} mins</span>
          </div>
          <div className="w-px h-4 bg-[#E8DCCE]" />
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[#D96B27]" />
            <span>Reward: +{activeTaskDetail.xpReward} Recovery XP</span>
          </div>
        </div>

        {/* Description & Clinical Intent */}
        <div className="space-y-3">
          <div className="label-overline">ACTIVITY INSTRUCTIONS</div>
          <p className="text-xs text-[#786F68] leading-relaxed bg-[#FDF6EE] p-4 rounded-xl border border-[#E8DCCE]">
            {activeTaskDetail.description}
          </p>

          <div className="p-4 rounded-xl bg-[#FDF2E9] border border-[#F7DFCC] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8C4A1E]">
              <Wind className="w-4 h-4 text-[#D96B27]" />
              <span>Grounding & Mindfulness Tip</span>
            </div>
            <p className="text-[11px] text-[#786F68] leading-relaxed">
              Focus entirely on your immediate sensory surroundings (textures, sounds, breathing rhythm). If your mind wanders to stressful memories, gently anchor your attention back to your breath without self-judgment.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8DCCE]">
          <button
            onClick={() => setActiveTaskDetail(null)}
            className="px-4 py-2 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE] text-[#786F68] text-xs font-bold transition-colors"
          >
            Close
          </button>

          {activeTaskDetail.status !== 'completed' && (
            <button
              onClick={() => {
                const target = activeTaskDetail;
                setActiveTaskDetail(null);
                setTaskToComplete(target);
                setIsCompletionModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-rust transition-all font-heading tracking-wider"
            >
              <Play className="w-4 h-4 fill-current" /> Mark as Completed
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
