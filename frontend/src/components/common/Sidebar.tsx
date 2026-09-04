import React from 'react';
import {
  Home,
  Activity,
  Heart,
  Trophy,
  CalendarCheck,
  Bell,
  MessageCircle,
  Settings,
  ClipboardList,
  UserCheck,
  LayoutDashboard,
  Users,
  BarChart3,
  TrendingUp,
  BrainCircuit,
  FileSpreadsheet,
  Sliders,
  Sparkles,
  Flame,
  Award
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { currentRole, activeScreen, setActiveScreen, currentVeteranProfile } = useApp();

  const veteranNav = [
    { id: 'home', label: "Today's Journey", icon: Home },
    { id: 'assessment', label: 'Initial Assessment', icon: ClipboardList },
    { id: 'profile-view', label: 'Recovery Profile', icon: UserCheck },
    { id: 'physical', label: 'Physical Well-being', icon: Activity },
    { id: 'mental', label: 'Mental Well-being', icon: Heart },
    { id: 'progress', label: 'Recovery Milestones', icon: Trophy },
    { id: 'weekly-checkin', label: 'Weekly Check-in', icon: CalendarCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'support', label: 'Support & Counselor', icon: MessageCircle },
    { id: 'settings', label: 'Profile & Settings', icon: Settings }
  ];

  const counselorNav = [
    { id: 'dashboard-overview', label: 'Caseload Overview', icon: LayoutDashboard },
    { id: 'veteran-list', label: 'Veterans Directory', icon: Users },
    { id: 'veteran-detail', label: 'Longitudinal Profile', icon: UserCheck },
    { id: 'counselor-physical', label: 'Physical Analytics', icon: BarChart3 },
    { id: 'counselor-mental', label: 'Mental Analytics', icon: TrendingUp },
    { id: 'counselor-engagement', label: 'Task Engagement', icon: Activity },
    { id: 'ai-attention', label: 'AI Alert Center', icon: BrainCircuit },
    { id: 'checkin-history', label: 'Check-in History', icon: FileSpreadsheet },
    { id: 'task-management', label: 'Task Adjuster Engine', icon: Sliders },
    { id: 'counselor-comm', label: 'Clinical Outreach', icon: MessageCircle },
    { id: 'counselor-settings', label: 'Care Settings', icon: Settings }
  ];

  const navItems = currentRole === 'veteran' ? veteranNav : counselorNav;

  return (
    <aside className="w-64 bg-[#FDF6EE] border-r border-[#E8DCCE] p-4 flex flex-col justify-between shrink-0 hidden md:flex min-h-[calc(100vh-61px)]">
      <div className="space-y-6">
        {/* Role Badge Indicator */}
        <div className="px-3 py-2.5 rounded-xl bg-white border border-[#E8DCCE] flex items-center justify-between shadow-warm">
          <div>
            <div className="label-overline text-[9px] text-[#786F68]">Current Mode</div>
            <div className="text-xs font-bold text-[#1C1917] capitalize flex items-center gap-1.5 mt-0.5 font-heading tracking-wider">
              <span className={`w-2 h-2 rounded-full ${currentRole === 'veteran' ? 'bg-[#D96B27] animate-pulse' : 'bg-[#1C1917] animate-pulse'}`} />
              {currentRole === 'veteran' ? 'Veteran Companion' : 'Clinical Caregiver'}
            </div>
          </div>
          {currentRole === 'veteran' && (
            <div className="flex items-center gap-1 text-xs font-extrabold text-[#D96B27] bg-[#F7DFCC] px-2 py-1 rounded-md border border-[#E8DCCE]">
              <Flame className="w-3.5 h-3.5 fill-[#D96B27]" />
              <span>{currentVeteranProfile.streakDays}d</span>
            </div>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="space-y-1">
          <div className="px-3 label-overline text-[10px] text-[#786F68] mb-2">
            {currentRole === 'veteran' ? 'Recovery Modules' : 'Clinical Portal'}
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  isActive
                    ? 'bg-[#1C1917] text-white shadow-warm'
                    : 'text-[#786F68] hover:text-[#1C1917] hover:bg-white/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#D96B27]' : 'text-[#786F68]'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Gamification Level Footer / Hackathon Safety Badge */}
      <div className="pt-4 border-t border-[#E8DCCE]">
        {currentRole === 'veteran' ? (
          <div className="p-3.5 rounded-xl bg-white border border-[#E8DCCE] shadow-warm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#1C1917]">
              <span className="flex items-center gap-1 text-[#D96B27] font-heading tracking-wide">
                <Award className="w-4 h-4" /> Level {currentVeteranProfile.level}
              </span>
              <span className="label-overline text-[10px] text-[#786F68]">{currentVeteranProfile.totalXP} XP</span>
            </div>
            <div className="w-full bg-[#FDF6EE] rounded-full h-2 overflow-hidden border border-[#E8DCCE]">
              <div
                className="bg-[#D96B27] h-full transition-all duration-500"
                style={{ width: `${(currentVeteranProfile.totalXP % 300) / 3}%` }}
              />
            </div>
            <p className="text-[11px] text-[#786F68] text-center italic mt-1 font-sans">
              "Small steps count."
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-white border border-[#E8DCCE] text-[11px] text-[#786F68] shadow-warm">
            <div className="flex items-center gap-1.5 text-[#D96B27] font-bold mb-1 font-heading">
              <Sparkles className="w-3.5 h-3.5" /> AI Clinical Assist
            </div>
            <p className="text-[10px] leading-relaxed text-[#786F68]">
              Pattern alerts provide supportive signals and never replace professional diagnostic judgment.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
