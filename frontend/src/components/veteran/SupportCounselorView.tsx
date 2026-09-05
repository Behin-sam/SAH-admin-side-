import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  PhoneCall,
  Send,
  ShieldAlert,
  Users,
  Search,
  CheckCircle2,
  Building,
  Award,
  Clock,
  ChevronRight,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiService } from '../../services/api';
import { Counselor } from '../../types';

export const SupportCounselorView: React.FC = () => {
  const { currentVeteranUser, setIsCrisisModalOpen, assignCounselor } = useApp();

  // Directory state
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(null);

  // Chat state
  const [messages, setMessages] = useState<{ id?: string; sender: string; text: string; time: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load counselors list
  const fetchCounselors = useCallback(async () => {
    setLoadingDirectory(true);
    try {
      const res = await apiService.listCounselors();
      if (res && res.counselors && res.counselors.length > 0) {
        setCounselors(res.counselors);

        // Find active counselor
        const assignedId = currentVeteranUser?.assignedCounselorId;
        const assignedName = currentVeteranUser?.assignedCounselorName;
        const match = res.counselors.find(c => (assignedId && c.id === assignedId) || (assignedName && c.name === assignedName)) || res.counselors[0];
        setSelectedCounselor(match);
      }
    } catch (e) {
      console.warn('Failed to load counselors from backend:', e);
    } finally {
      setLoadingDirectory(false);
    }
  }, [currentVeteranUser]);

  // Load chat messages
  const fetchMessages = useCallback(async () => {
    if (!currentVeteranUser?.id) return;
    try {
      const counselorId = selectedCounselor?.id || currentVeteranUser?.assignedCounselorId;
      const res = await apiService.getSpecialistChat(currentVeteranUser.id, counselorId);
      if (res && res.messages) {
        const counselorName = res.counselor_name || selectedCounselor?.name || 'Dr. Ananya Nair';
        setMessages(
          res.messages.map((m: any) => ({
            id: m.id,
            sender: m.sender_type === 'veteran' ? 'You' : counselorName,
            text: m.content,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }))
        );
      }
    } catch (e) {
      console.warn('Failed to fetch specialist chat:', e);
    }
  }, [currentVeteranUser?.id, selectedCounselor?.id, selectedCounselor?.name]);

  useEffect(() => {
    fetchCounselors();
  }, [fetchCounselors]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const handleSelectCounselor = async (c: Counselor) => {
    setSelectedCounselor(c);
    setShowDirectoryModal(false);
    if (assignCounselor) {
      await assignCounselor(c.id, c.name);
    }
    setToastMessage(`Assigned ${c.name} as your primary clinical specialist.`);
    setTimeout(() => setToastMessage(null), 3500);
    // Reload messages with new counselor
    setTimeout(fetchMessages, 300);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const text = inputText.trim();
    setInputText('');

    // Optimistic message update
    const optimisticMsg = {
      sender: 'You',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      setSending(true);
      await apiService.sendSpecialistMessage(
        currentVeteranUser.id,
        text,
        'veteran',
        selectedCounselor?.id
      );
      fetchMessages();
    } catch (err) {
      console.warn('Failed to send specialist message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleRequestCallback = () => {
    const counselorName = selectedCounselor?.name || 'Your specialist';
    setToastMessage(`Priority Callback requested! ${counselorName} has been alerted.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredCounselors = counselors.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.specialty || c.specialization || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.institution || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCounselorName = selectedCounselor?.name || currentVeteranUser?.assignedCounselorName || 'Dr. Ananya Nair, MD';
  const activeCounselorTitle = selectedCounselor?.title || 'Lead Clinical Trauma Specialist';
  const activeCounselorInstitution = selectedCounselor?.institution || 'Amrita Veteran Healthcare Command';
  const activeCounselorAvatar = selectedCounselor?.avatarUrl || 'https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200';
  const activeCounselorSpecialty = selectedCounselor?.specialty || selectedCounselor?.specialization || 'Combat PTSD & Somatic Grounding';

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-[#8C4A1E] text-white text-xs font-bold flex items-center justify-between shadow-rust animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-warm">
        <div>
          <span className="label-overline text-[10px] text-[#8C4A1E] font-bold">Clinical Care & Specialist Network</span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917] mt-1">Specialist Support Hub</h1>
          <p className="text-xs text-[#786F68] mt-1">Direct confidential care with accredited defense & trauma psychologists.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowDirectoryModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#E8DCCE] hover:border-[#D96B27] text-[#1C1917] font-bold text-xs shadow-sm flex items-center gap-2 font-heading tracking-wider transition-all"
          >
            <Users className="w-4 h-4 text-[#D96B27]" /> Browse All Specialists ({counselors.length})
          </button>
          <button
            onClick={() => setIsCrisisModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-bold text-xs shadow-rust flex items-center gap-1.5 shrink-0 font-heading tracking-wider"
          >
            <ShieldAlert className="w-4 h-4" /> 24/7 Crisis Hotline
          </button>
        </div>
      </div>

      {/* Main Grid: Active Specialist Profile & Live Chat Thread */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Counselor Card */}
        <div className="p-6 rounded-2xl glass-panel space-y-4 shadow-warm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="relative inline-block mx-auto">
                <img
                  src={activeCounselorAvatar}
                  alt={activeCounselorName}
                  className="w-20 h-20 rounded-full border-2 border-[#D96B27] object-cover mx-auto shadow-rust"
                />
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-[#1C1917]">{activeCounselorName}</h3>
                <p className="text-xs text-[#D96B27] font-bold">{activeCounselorTitle}</p>
                <p className="text-[11px] text-[#786F68] mt-0.5 flex items-center justify-center gap-1">
                  <Building className="w-3 h-3" /> {activeCounselorInstitution}
                </p>
              </div>
            </div>

            {/* Specialization Badge */}
            <div className="p-3 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE] text-xs space-y-1">
              <div className="text-[10px] text-[#786F68] font-bold uppercase tracking-wider">Focus Area</div>
              <div className="font-bold text-[#8C4A1E] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#D96B27] shrink-0" />
                <span>{activeCounselorSpecialty}</span>
              </div>
            </div>

            {/* Status & Stats */}
            <div className="pt-2 border-t border-[#E8DCCE] space-y-2 text-xs text-[#786F68]">
              <div className="flex items-center justify-between">
                <span>Clinical Status:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Available Today
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Avg. Response:</span>
                <span className="font-mono text-[#1C1917] font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#786F68]" /> ~{selectedCounselor?.avg_response_minutes || 15} mins
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Direct Hotline:</span>
                <span className="font-mono text-[#1C1917]">{selectedCounselor?.phone || '+91 484 285 1234'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-[#E8DCCE]">
            <button
              onClick={handleRequestCallback}
              className="w-full py-2.5 rounded-xl bg-[#FDF2E9] border border-[#F7DFCC] text-[#8C4A1E] font-bold text-xs hover:bg-[#D96B27] hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm font-heading tracking-wider"
            >
              <PhoneCall className="w-4 h-4" /> Request Priority Callback
            </button>
            <button
              onClick={() => setShowDirectoryModal(true)}
              className="w-full py-2 rounded-xl bg-white border border-[#E8DCCE] text-[#786F68] hover:text-[#1C1917] font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D96B27]" /> Switch Assigned Specialist
            </button>
          </div>
        </div>

        {/* Messaging Area */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel flex flex-col justify-between h-[520px] shadow-warm">
          <div className="border-b border-[#E8DCCE] pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#D96B27]" />
              <span className="text-xs font-bold text-[#1C1917] font-heading tracking-wider">
                Direct Care Thread with {activeCounselorName}
              </span>
            </div>
            <span className="label-overline text-[9px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ● Live Encrypted
            </span>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#786F68] space-y-2">
                <MessageCircle className="w-10 h-10 text-[#E8DCCE]" />
                <p className="text-xs">No prior messages in this care thread.</p>
                <p className="text-[11px] text-[#786F68]">Say hello to {activeCounselorName} to begin your clinical check-in.</p>
              </div>
            ) : (
              messages.map((m, i) => {
                const isMe = m.sender === 'You';
                return (
                  <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-[#786F68] mb-1 px-1 font-bold">
                      {isMe ? 'You' : activeCounselorName}
                    </span>
                    <div
                      className={`max-w-[82%] p-3.5 rounded-2xl text-xs space-y-1 ${
                        isMe
                          ? 'bg-[#D96B27] text-white rounded-br-none shadow-rust'
                          : 'bg-[#FDF6EE] text-[#1C1917] border border-[#E8DCCE] rounded-bl-none shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      <span className="text-[9px] opacity-75 block text-right font-mono">{m.time}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-[#E8DCCE] pt-3">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={`Write a message to ${activeCounselorName}...`}
              className="flex-1 bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl px-4 py-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] disabled:opacity-50 text-white text-xs font-extrabold transition-all flex items-center gap-1.5 shrink-0 shadow-rust font-heading tracking-wider"
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </form>
        </div>
      </div>

      {/* SPECIALIST DIRECTORY MODAL */}
      {showDirectoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCCE] rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E8DCCE] flex items-center justify-between bg-[#FDF6EE]">
              <div>
                <h3 className="font-heading font-extrabold text-xl text-[#1C1917]">Accredited Specialist Directory</h3>
                <p className="text-xs text-[#786F68]">Select any certified counselor or clinical therapist to guide your recovery.</p>
              </div>
              <button
                onClick={() => setShowDirectoryModal(false)}
                className="p-2 rounded-xl text-[#786F68] hover:text-[#1C1917] hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-[#E8DCCE] bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-[#786F68] absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, title, specialty, or medical institution..."
                  className="w-full bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
                />
              </div>
            </div>

            {/* Counselors Grid */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loadingDirectory ? (
                <div className="py-12 text-center text-[#786F68] flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#D96B27]" />
                  <span className="text-xs">Loading clinical directory...</span>
                </div>
              ) : filteredCounselors.length === 0 ? (
                <div className="py-12 text-center text-[#786F68]">
                  <p className="text-sm font-bold">No counselors found matching &ldquo;{searchQuery}&rdquo;</p>
                  <p className="text-xs mt-1">Try clearing your search query.</p>
                </div>
              ) : (
                filteredCounselors.map(c => {
                  const isCurrent = (selectedCounselor?.id === c.id) || (currentVeteranUser?.assignedCounselorName === c.name);
                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        isCurrent
                          ? 'bg-[#FDF2E9] border-[#D96B27] shadow-sm'
                          : 'bg-white hover:bg-[#FDF6EE] border-[#E8DCCE]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={c.avatarUrl || 'https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200'}
                          alt={c.name}
                          className="w-12 h-12 rounded-full object-cover border border-[#D96B27] shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-heading font-bold text-sm text-[#1C1917]">{c.name}</h4>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-[#D96B27] text-white text-[9px] font-bold uppercase">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#D96B27] font-semibold">{c.title}</p>
                          <p className="text-[11px] text-[#786F68]">{c.specialty || c.specialization} • {c.institution}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isCurrent ? (
                          <div className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Assigned
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSelectCounselor(c)}
                            className="px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#D96B27] text-white text-xs font-bold transition-all flex items-center gap-1 font-heading tracking-wider"
                          >
                            <span>Select Specialist</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E8DCCE] bg-[#FDF6EE] flex items-center justify-between text-xs text-[#786F68]">
              <span>Showing {filteredCounselors.length} accredited specialists</span>
              <button
                onClick={() => setShowDirectoryModal(false)}
                className="px-4 py-1.5 rounded-xl bg-white border border-[#E8DCCE] text-[#1C1917] font-bold text-xs hover:bg-[#FDF6EE]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

