import React from 'react';
import { Shield, Bell, LifeBuoy, UserCheck, ChevronDown, Sparkles, LogOut, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC = () => {
  const {
    currentUser,
    currentRole,
    setRole,
    logout,
    currentVeteranUser,
    currentVeteranProfile,
    allVeterans,
    activeVeteranId,
    setActiveVeteranId,
    notifications,
    setIsCrisisModalOpen,
    setActiveScreen
  } = useApp();

  const unreadNotifs = notifications.filter(n => !n.read).length;
  const isVeteranUser = currentUser?.role === 'veteran';

  return (
    <header className="sticky top-0 z-30 bg-[#FDF6EE]/95 backdrop-blur-md border-b border-[#E8DCCE] px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveScreen(currentRole === 'veteran' ? 'home' : 'dashboard-overview')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#1C1917] flex items-center justify-center text-white shadow-warm group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 stroke-[2.2] text-[#D96B27]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-2xl tracking-wider text-[#1C1917]">VALOR</span>
              <span className="label-overline text-[10px] bg-[#F7DFCC] text-[#8C4A1E] px-2 py-0.5 rounded border border-[#E8DCCE]">
                SIH 2026
              </span>
            </div>
            <p className="text-[11px] text-[#786F68] font-medium hidden sm:block">
              Gamified Veteran Recovery & Clinical Companion
            </p>
          </div>
        </div>

        {/* Center: Counselor Demo Veteran Switcher */}
        {!isVeteranUser && currentRole === 'counselor' && (
          <div className="hidden md:flex items-center gap-2 bg-white border border-[#E8DCCE] rounded-xl px-3 py-1.5 text-xs shadow-warm">
            <span className="label-overline text-[10px] text-[#786F68]">Monitoring Veteran:</span>
            <div className="relative">
              <select
                value={activeVeteranId}
                onChange={(e) => setActiveVeteranId(e.target.value)}
                className="bg-[#FDF6EE] text-[#1C1917] font-bold rounded-lg px-2 py-1 pr-6 border border-[#E8DCCE] focus:outline-none focus:border-[#D96B27] appearance-none cursor-pointer text-xs"
              >
                {allVeterans.map(v => (
                  <option key={v.user.id} value={v.user.id}>
                    {v.user.name} ({v.profile.currentRiskLevel})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#786F68] absolute right-1.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          {/* Emergency SOS Button */}
          <button
            onClick={() => setIsCrisisModalOpen(true)}
            className="sos-pulse flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-bold text-xs shadow-rust transition-all"
            title="Immediate Crisis & Veteran Hotline Support"
          >
            <LifeBuoy className="w-4 h-4 animate-spin-slow" />
            <span className="hidden sm:inline font-heading tracking-wider">24/7 CRISIS HELP</span>
            <span className="sm:hidden font-heading">HELP</span>
          </button>

          {/* Role Switcher Toggle (HIDDEN IF LOGGED IN AS A VETERAN) */}
          {!isVeteranUser && (
            <div className="flex items-center bg-[#E8DCCE]/60 border border-[#E8DCCE] rounded-xl p-1 text-xs">
              <button
                onClick={() => setRole('veteran')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  currentRole === 'veteran'
                    ? 'bg-[#1C1917] text-white shadow-warm'
                    : 'text-[#786F68] hover:text-[#1C1917]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Veteran</span>
              </button>
              <button
                onClick={() => setRole('counselor')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  currentRole === 'counselor'
                    ? 'bg-[#D96B27] text-white shadow-warm'
                    : 'text-[#786F68] hover:text-[#1C1917]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Counselor</span>
              </button>
            </div>
          )}

          {/* Notification Icon */}
          <button
            onClick={() => setActiveScreen(currentRole === 'veteran' ? 'notifications' : 'ai-attention')}
            className="relative p-2 rounded-xl bg-white border border-[#E8DCCE] hover:border-[#D96B27] text-[#1C1917] transition-all shadow-warm"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D96B27] text-[10px] font-extrabold text-white flex items-center justify-center">
                {unreadNotifs}
              </span>
            )}
          </button>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#E8DCCE]">
            <img
              src={currentRole === 'veteran' ? currentVeteranUser.avatarUrl : (currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200')}
              alt="Avatar"
              className="w-8 h-8 rounded-full border border-[#E8DCCE] object-cover"
            />
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-[#1C1917] flex items-center gap-1">
                <span>{currentRole === 'veteran' ? currentVeteranUser.name : (currentUser?.name || 'Clinical Caregiver')}</span>
                {currentUser?.isEmailVerified && (
                  <span title="Email Verified" className="inline-flex">
                    <CheckCircle2 className="w-3 h-3 text-[#D96B27]" />
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#786F68] font-mono capitalize">
                {currentRole === 'veteran' ? `Level ${currentVeteranProfile.level} Veteran` : (currentUser?.title || 'Clinical Specialist')}
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-xl bg-white border border-[#E8DCCE] hover:bg-rose-50 text-[#786F68] hover:text-rose-600 transition-colors ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
