import React, { useState } from 'react';
import { MessageCircle, PhoneCall, Send, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SupportCounselorView: React.FC = () => {
  const { currentVeteranUser, setIsCrisisModalOpen } = useApp();
  const [messages, setMessages] = useState<{ sender: string; text: string; time: string }[]>([
    {
      sender: 'Dr. Ananya Nair',
      text: 'Good morning Col. Sharma. I reviewed your 14-day streak on morning walks. Outstanding progress! How is your sleep holding up?',
      time: 'Yesterday 09:15 AM'
    }
  ]);
  const [inputText, setInputText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setMessages(prev => [
      ...prev,
      { sender: 'You', text: inputText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setInputText('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-warm">
        <div>
          <span className="label-overline text-[10px] text-[#8C4A1E]">Clinical Support Hub</span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917] mt-1">Counselor Contact & Outreach</h1>
          <p className="text-xs text-[#786F68] mt-1">Direct confidential communication with your assigned clinical caregiver.</p>
        </div>
        <button
          onClick={() => setIsCrisisModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-bold text-xs shadow-rust flex items-center gap-1.5 shrink-0 font-heading tracking-wider"
        >
          <ShieldAlert className="w-4 h-4" /> 24/7 Crisis Hotline
        </button>
      </div>

      {/* Counselor Profile & Messaging Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Counselor Card */}
        <div className="p-6 rounded-2xl glass-panel space-y-4 shadow-warm">
          <div className="text-center space-y-2">
            <img
              src="https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200"
              alt="Counselor Avatar"
              className="w-20 h-20 rounded-full border-2 border-[#D96B27] object-cover mx-auto shadow-rust"
            />
            <div>
              <h3 className="font-heading font-bold text-xl text-[#1C1917]">Dr. Ananya Nair, MD</h3>
              <p className="text-xs text-[#D96B27] font-bold">Chief Clinical Supervisor</p>
              <p className="text-[10px] text-[#786F68] mt-0.5">Amrita Veteran Health Care</p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E8DCCE] space-y-2 text-xs text-[#786F68]">
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <span className="font-bold text-[#D96B27] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#D96B27] animate-pulse" /> Available
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Next Review:</span>
              <span className="font-mono text-[#1C1917]">Sep 08, 2026</span>
            </div>
          </div>

          <button
            onClick={() => alert('Priority Callback requested! Dr. Ananya Nair has been notified.')}
            className="w-full py-2.5 rounded-xl bg-[#FDF2E9] border border-[#F7DFCC] text-[#8C4A1E] font-bold text-xs hover:bg-[#D96B27] hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm font-heading tracking-wider"
          >
            <PhoneCall className="w-4 h-4" /> Request Phone Callback
          </button>
        </div>

        {/* Messaging Area */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel flex flex-col justify-between h-[420px] shadow-warm">
          <div className="border-b border-[#E8DCCE] pb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-[#1C1917] flex items-center gap-2 font-heading tracking-wider">
              <MessageCircle className="w-4 h-4 text-[#D96B27]" /> Clinical Conversation Thread
            </span>
            <span className="label-overline text-[9px] text-[#786F68]">Encrypted & Confidential</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${m.sender === 'You' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3.5 rounded-2xl text-xs space-y-1 ${
                    m.sender === 'You'
                      ? 'bg-[#D96B27] text-white rounded-br-none shadow-rust'
                      : 'bg-[#FDF6EE] text-[#1C1917] border border-[#E8DCCE] rounded-bl-none'
                  }`}
                >
                  <p>{m.text}</p>
                  <span className="text-[9px] opacity-75 block text-right font-mono">{m.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-[#E8DCCE] pt-3">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Write a message to Dr. Ananya Nair..."
              className="flex-1 bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl px-4 py-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white text-xs font-extrabold transition-all flex items-center gap-1.5 shrink-0 shadow-rust font-heading tracking-wider"
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
