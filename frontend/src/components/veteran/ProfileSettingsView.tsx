import React from 'react';
import { Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ProfileSettingsView: React.FC = () => {
  const { currentVeteranUser, currentVeteranProfile } = useApp();

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4 animate-fadeIn">
      <div className="p-6 rounded-2xl glass-panel flex items-center justify-between shadow-warm">
        <div>
          <span className="label-overline text-[10px] text-[#8C4A1E]">User Configuration</span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917] mt-1">Profile & Settings</h1>
          <p className="text-xs text-[#786F68] mt-1">Manage check-in frequencies, notification reminders, and privacy preferences.</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold">
          <Settings className="w-5 h-5" />
        </div>
      </div>

      <div className="p-6 rounded-2xl glass-panel space-y-6 shadow-warm">
        <div className="flex items-center gap-4 border-b border-[#E8DCCE] pb-4">
          <img
            src={currentVeteranUser.avatarUrl}
            alt="Avatar"
            className="w-16 h-16 rounded-full border-2 border-[#D96B27] object-cover shadow-rust"
          />
          <div>
            <h2 className="font-heading text-2xl font-bold text-[#1C1917]">{currentVeteranUser.name}</h2>
            <p className="text-xs text-[#786F68]">{currentVeteranUser.rank} | {currentVeteranProfile.serviceBranch}</p>
            <span className="badge-pill-peach mt-1.5 inline-block">
              {currentVeteranUser.email}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE] text-xs">
            <span className="font-bold text-[#1C1917]">Periodic Check-in Frequency</span>
            <span className="font-mono text-[#D96B27] font-bold">Every {currentVeteranProfile.checkInFrequencyDays} Days</span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE] text-xs">
            <span className="font-bold text-[#1C1917]">Daily Activity Push Reminders</span>
            <span className="font-bold text-[#D96B27]">Enabled (08:00 AM)</span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE] text-xs">
            <span className="font-bold text-[#1C1917]">Data Access & Counselor Scope</span>
            <span className="text-[#786F68] font-bold">Dr. Ananya Nair (Read/Write)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
