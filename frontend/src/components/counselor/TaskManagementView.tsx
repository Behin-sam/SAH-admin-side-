import React, { useState } from 'react';
import { Sliders, Plus, CheckCircle2, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TaskCategory } from '../../types';

export const TaskManagementView: React.FC = () => {
  const { currentVeteranUser, tasks, assignCustomTask, activeVeteranId } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Mental');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [xpReward, setXpReward] = useState(25);
  const [recommendedTime, setRecommendedTime] = useState('Afternoon');
  const [addedSuccess, setAddedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    assignCustomTask(activeVeteranId, {
      title,
      category,
      description,
      durationMinutes,
      xpReward,
      recommendedTime
    });

    setAddedSuccess(true);
    setTitle('');
    setDescription('');
    setTimeout(() => setAddedSuccess(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel flex items-center justify-between gap-4 shadow-warm">
        <div>
          <span className="label-overline text-[10px] text-[#8C4A1E]">Personalization Engine</span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917] mt-1">TASK ADJUSTMENT TOOL</h1>
          <p className="text-xs text-[#786F68] mt-1">
            Adapting task difficulty for {currentVeteranUser.name}. System adjusts load without creating pressure.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold shrink-0">
          <Sliders className="w-6 h-6" />
        </div>
      </div>

      {/* Guidance Banner */}
      <div className="p-4 rounded-2xl bg-[#FDF2E9] border border-[#F7DFCC] text-xs text-[#8C4A1E] space-y-1">
        <div className="font-bold flex items-center gap-1.5 font-heading text-sm">
          <Sparkles className="w-4 h-4 text-[#D96B27]" /> AI Adaptation Advice:
        </div>
        <p className="leading-relaxed text-[#786F68]">
          If a veteran repeatedly skips high-intensity tasks, consider assigning smaller 2-to-5 minute micro-grounding activities (e.g. "Sit near window" instead of "30-min walk").
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="p-6 rounded-2xl glass-panel space-y-4 shadow-warm">
          <div className="border-b border-[#E8DCCE] pb-3">
            <h2 className="font-heading text-xl font-bold text-[#1C1917] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#D96B27]" /> Assign Custom Micro-Intervention
            </h2>
          </div>

          {addedSuccess && (
            <div className="p-3 rounded-xl bg-[#F7DFCC] text-[#8C4A1E] text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#D96B27]" /> Activity successfully pushed to veteran's daily journey!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1C1917]">Activity Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. 5-Min Quiet Garden Reflection"
                className="w-full bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl p-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1C1917]">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as TaskCategory)}
                  className="w-full bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl p-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
                >
                  <option value="Physical">Physical</option>
                  <option value="Mental">Mental</option>
                  <option value="Social">Social</option>
                  <option value="Nature">Nature</option>
                  <option value="Routine">Routine</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1C1917]">Time of Day</label>
                <select
                  value={recommendedTime}
                  onChange={e => setRecommendedTime(e.target.value)}
                  className="w-full bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl p-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1C1917]">Instructions & Clinical Intent</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Clear, non-pressuring instructions..."
                rows={3}
                className="w-full bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl p-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-extrabold text-xs shadow-rust flex items-center gap-1.5 font-heading tracking-wider"
              >
                <Plus className="w-4 h-4" /> Push Task to Veteran
              </button>
            </div>
          </form>
        </div>

        {/* Current Active Tasks List */}
        <div className="p-6 rounded-2xl glass-panel space-y-4 shadow-warm">
          <div className="border-b border-[#E8DCCE] pb-3">
            <h2 className="font-heading text-xl font-bold text-[#1C1917]">Current Daily Tasks for {currentVeteranUser.name}</h2>
          </div>

          <div className="space-y-2.5">
            {tasks.map(t => (
              <div key={t.id} className="p-3.5 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE] text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#1C1917] flex items-center gap-2">
                    <span>{t.title}</span>
                    <span className="badge-pill-peach">
                      {t.category}
                    </span>
                  </div>
                  <div className="text-[#786F68] text-[11px] font-mono mt-0.5">{t.durationMinutes} mins | +{t.xpReward} XP</div>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded capitalize ${t.status === 'completed' ? 'bg-[#F7DFCC] text-[#8C4A1E]' : 'bg-white text-[#786F68]'}`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
