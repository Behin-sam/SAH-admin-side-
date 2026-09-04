import React from 'react';
import { Activity, BarChart3, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TaskEngagementView: React.FC = () => {
  const { currentVeteranUser, tasks } = useApp();

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 animate-fadeIn">
      <div className="p-6 rounded-2xl glass-panel border border-teal-500/30 flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-teal-400">Clinical Analytics</span>
          <h1 className="font-heading text-2xl font-bold text-white mt-1">TASK ENGAGEMENT & BEHAVIOR ANALYSIS</h1>
          <p className="text-xs text-slate-400 mt-1">Completion, skipped, and delayed task performance breakdown for {currentVeteranUser.name}.</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold shrink-0">
          <BarChart3 className="w-6 h-6" />
        </div>
      </div>

      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <h2 className="font-heading text-lg font-bold text-white">Engagement by Task Category</h2>
        <div className="space-y-4 font-mono text-xs">
          <div>
            <div className="flex items-center justify-between text-slate-200 mb-1 font-sans font-bold">
              <span>Physical Activities</span>
              <span className="text-emerald-400">80% Completion Rate</span>
            </div>
            <div className="text-emerald-400 tracking-wider">████████░░ 80%</div>
          </div>

          <div>
            <div className="flex items-center justify-between text-slate-200 mb-1 font-sans font-bold">
              <span>Mental & Mindfulness Tasks</span>
              <span className="text-teal-400">60% Completion Rate</span>
            </div>
            <div className="text-teal-400 tracking-wider">██████░░░░ 60%</div>
          </div>

          <div>
            <div className="flex items-center justify-between text-slate-200 mb-1 font-sans font-bold">
              <span>Social & Family Outreach</span>
              <span className="text-amber-400">40% Completion Rate</span>
            </div>
            <div className="text-amber-400 tracking-wider">████░░░░░░ 40%</div>
          </div>
        </div>
      </div>
    </div>
  );
};
