import React, { useState } from 'react';
import { X, PhoneCall, ShieldAlert, HeartHandshake, Wind, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CrisisModal: React.FC = () => {
  const { isCrisisModalOpen, setIsCrisisModalOpen, currentVeteranUser } = useApp();
  const [requestedCallback, setRequestedCallback] = useState(false);
  const [activeGrounding, setActiveGrounding] = useState(false);

  if (!isCrisisModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#FFFFFF] border border-[#E8DCCE] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative text-[#1C1917] space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E8DCCE] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D96B27] text-white flex items-center justify-center shadow-rust">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-heading text-2xl font-bold text-[#1C1917] flex items-center gap-2">
                24/7 Veteran Crisis & Support Network
              </h2>
              <p className="text-xs text-[#786F68] font-medium">
                Immediate confidential support is available 24 hours a day.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCrisisModalOpen(false)}
            className="p-2 rounded-xl text-[#786F68] hover:text-[#1C1917] hover:bg-[#FDF6EE]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Immediate Emergency Callouts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="tel:14416"
            className="flex items-center gap-3 p-4 rounded-2xl bg-[#FDF2E9] border border-[#F7DFCC] hover:border-[#D96B27] transition-all group shadow-warm"
          >
            <div className="w-10 h-10 rounded-xl bg-[#D96B27] text-white flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="label-overline text-[10px] text-[#8C4A1E]">Tele-MANAS (India Helpline)</div>
              <div className="text-xl font-extrabold text-[#1C1917] font-mono">14416</div>
              <div className="text-[10px] text-[#786F68]">Toll-free 24/7 Confidential</div>
            </div>
          </a>

          <a
            href="tel:988"
            className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-[#E8DCCE] hover:border-[#1C1917] transition-all group shadow-warm"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1C1917] text-white flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="label-overline text-[10px] text-[#786F68]">Veterans Crisis Line</div>
              <div className="text-xl font-extrabold text-[#1C1917] font-mono">Dial 988 (Press 1)</div>
              <div className="text-[10px] text-[#786F68]">Free, confidential support</div>
            </div>
          </a>
        </div>

        {/* Rapid Actions */}
        <div className="space-y-3">
          <span className="label-overline">IMMEDIATE SUPPORTIVE ACTIONS</span>

          <div className="p-4 rounded-2xl bg-[#FDF6EE] border border-[#E8DCCE] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-[#D96B27]" />
                <span className="text-xs font-bold text-[#1C1917]">Request Emergency Callback from Assigned Counselor</span>
              </div>
              {requestedCallback ? (
                <span className="text-xs font-bold text-[#D96B27] flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Alert Sent
                </span>
              ) : (
                <button
                  onClick={() => setRequestedCallback(true)}
                  className="px-4 py-2 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white text-xs font-bold transition-all shadow-rust"
                >
                  Notify Counselor
                </button>
              )}
            </div>
            {requestedCallback && (
              <p className="text-[11px] text-[#8C4A1E] bg-[#F7DFCC] p-2.5 rounded-xl border border-[#E8DCCE]">
                Dr. Ananya Nair has been alerted with top priority to call your registered number.
              </p>
            )}
          </div>

          {/* Quick Grounding Exercise */}
          <div className="p-4 rounded-2xl bg-[#FDF6EE] border border-[#E8DCCE] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wind className="w-5 h-5 text-[#1C1917] animate-pulse" />
                <div>
                  <div className="text-xs font-bold text-[#1C1917]">60-Second De-escalation Grounding</div>
                  <div className="text-[10px] text-[#786F68] font-mono">Box Breathing (4-4-4-4 technique)</div>
                </div>
              </div>
              <button
                onClick={() => setActiveGrounding(!activeGrounding)}
                className="px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-black text-white text-xs font-bold transition-colors"
              >
                {activeGrounding ? 'Pause' : 'Start Grounding'}
              </button>
            </div>

            {activeGrounding && (
              <div className="p-4 rounded-2xl bg-white border border-[#E8DCCE] text-center space-y-2 animate-fadeIn shadow-warm">
                <div className="w-12 h-12 rounded-full border-4 border-[#D96B27] border-t-transparent mx-auto animate-spin" />
                <div className="text-xs font-bold text-[#1C1917]">Inhale deeply (4s) ... Hold (4s) ... Exhale (4s)</div>
                <div className="text-[10px] text-[#786F68]">Feel your feet firmly on the ground. You are safe in this moment.</div>
              </div>
            )}
          </div>
        </div>

        {/* Safety Disclaimer */}
        <div className="text-[10px] text-[#786F68] leading-relaxed border-t border-[#E8DCCE] pt-3">
          <strong>Safety Notice:</strong> VALOR is a supportive monitoring tool and does not replace emergency clinical services. If you are in immediate danger, call 112 / 911 immediately.
        </div>
      </div>
    </div>
  );
};
