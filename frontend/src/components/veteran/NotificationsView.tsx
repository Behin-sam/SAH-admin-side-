import React from 'react';
import { Bell, MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const NotificationsView: React.FC = () => {
  const { notifications } = useApp();

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4 animate-fadeIn">
      <div className="p-6 rounded-2xl glass-panel flex items-center justify-between shadow-warm">
        <div>
          <span className="label-overline text-[10px] text-[#8C4A1E]">Activity Center</span>
          <h1 className="font-heading text-2xl font-bold text-[#1C1917] mt-1">Notifications & Counselor Messages</h1>
          <p className="text-xs text-[#786F68] mt-1">Timely task anchors and care team communications.</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold">
          <Bell className="w-5 h-5" />
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map(notif => (
          <div key={notif.id} className="p-4 rounded-2xl glass-panel flex items-start gap-3 shadow-warm">
            <div className="w-9 h-9 rounded-xl bg-[#FDF6EE] text-[#D96B27] border border-[#E8DCCE] flex items-center justify-center shrink-0 mt-0.5">
              {notif.type === 'counselor' ? <MessageCircle className="w-4 h-4 text-[#D96B27]" /> : <Bell className="w-4 h-4" />}
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1C1917]">{notif.title}</span>
                <span className="label-overline text-[9px] text-[#786F68]">{notif.timestamp}</span>
              </div>
              <p className="text-xs text-[#786F68] leading-relaxed">{notif.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
