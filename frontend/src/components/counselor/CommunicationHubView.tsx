import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiService } from '../../services/api';

export const CommunicationHubView: React.FC = () => {
  const { currentVeteranUser, counselorNotes, addCounselorNote, activeVeteranId } = useApp();
  const [noteText, setNoteText] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const vetNotes = counselorNotes.filter(n => n.veteranId === activeVeteranId);

  useEffect(() => {
    loadChat();
    const interval = setInterval(loadChat, 3500);
    return () => clearInterval(interval);
  }, [activeVeteranId]);

  const loadChat = async () => {
    try {
      const res = await apiService.getChatMessages(activeVeteranId);
      if (res?.messages) {
        setChatMessages(res.messages);
      }
    } catch {
      // Fallback
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    addCounselorNote(activeVeteranId, noteText);
    setNoteText('');
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    const content = replyText.trim();
    setReplyText('');
    setSendingReply(true);

    try {
      await apiService.sendChatMessage(activeVeteranId, content, 'counselor');
      await loadChat();
    } catch (err) {
      console.warn('Error sending reply:', err);
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel flex items-center justify-between gap-4 shadow-warm">
        <div>
          <span className="label-overline text-[10px] text-[#8C4A1E]">Clinical Outreach</span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917] mt-1">COUNSELOR NOTES & DIRECT OUTREACH</h1>
          <p className="text-xs text-[#786F68] mt-1">Real-time bi-directional direct messaging with {currentVeteranUser.name}.</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold shrink-0">
          <MessageCircle className="w-6 h-6" />
        </div>
      </div>

      {/* Live Direct Messaging Thread */}
      <div className="p-6 rounded-2xl glass-panel space-y-4 shadow-warm border border-[#E8DCCE]">
        <div className="flex items-center justify-between border-b border-[#E8DCCE] pb-3">
          <div>
            <h2 className="font-heading text-xl font-bold text-[#1C1917] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Direct Thread: {currentVeteranUser.name}
            </h2>
            <p className="text-[11px] text-[#786F68] mt-0.5">Direct messages synced with veteran's mobile app.</p>
          </div>
          <span className="label-overline text-[10px] text-[#8C4A1E] bg-[#F7DFCC] px-2.5 py-1 rounded-full font-bold">
            HIPAA-Protected
          </span>
        </div>

        <div className="h-64 overflow-y-auto space-y-3 p-4 bg-[#FDF6EE] rounded-xl border border-[#E8DCCE]">
          {chatMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-[#786F68]">
              No messages in this thread yet. Send a greeting below!
            </div>
          ) : (
            chatMessages.map((m, idx) => {
              const isCounselor = m.sender_type === 'counselor';
              const isAlert = m.message_type === 'alert' || m.content?.startsWith('🚨');

              return (
                <div key={m.id || idx} className={`flex flex-col ${isCounselor ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[80%] p-3.5 rounded-2xl text-xs space-y-1 ${
                      isAlert
                        ? 'bg-red-600 text-white shadow-md'
                        : isCounselor
                        ? 'bg-[#D96B27] text-white rounded-br-none shadow-rust'
                        : 'bg-white text-[#1C1917] border border-[#E8DCCE] rounded-bl-none shadow-sm'
                    }`}
                  >
                    {isAlert && (
                      <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-amber-200 uppercase mb-1">
                        <ShieldAlert className="w-3 h-3" /> Priority Emergency SOS
                      </div>
                    )}
                    <p className="leading-relaxed">{m.content}</p>
                    <span
                      className={`text-[9px] block text-right font-mono ${
                        isCounselor || isAlert ? 'text-white/75' : 'text-[#786F68]'
                      }`}
                    >
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reply form */}
        <form onSubmit={handleSendReply} className="flex gap-2">
          <input
            type="text"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder={`Reply to ${currentVeteranUser.name}...`}
            className="flex-1 bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl px-4 py-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
          />
          <button
            type="submit"
            disabled={!replyText.trim() || sendingReply}
            className="px-5 py-2.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] disabled:opacity-40 text-white font-extrabold text-xs shadow-rust flex items-center gap-1.5 font-heading tracking-wider"
          >
            <Send className="w-4 h-4" /> Reply
          </button>
        </form>
      </div>

      {/* Clinical Notes */}
      <div className="p-6 rounded-2xl glass-panel space-y-4 shadow-warm">
        <h2 className="font-heading text-xl font-bold text-[#1C1917]">Add New Clinical Log Entry</h2>
        <form onSubmit={handleAddNote} className="space-y-3">
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Type clinical progress notes, observations, or tele-consultation summary..."
            rows={3}
            className="w-full bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl p-3 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
            required
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-extrabold text-xs shadow-rust flex items-center gap-1.5 font-heading tracking-wider"
            >
              <Send className="w-4 h-4" /> Save Clinical Note
            </button>
          </div>
        </form>
      </div>

      <div className="p-6 rounded-2xl glass-panel space-y-4 shadow-warm">
        <h2 className="font-heading text-xl font-bold text-[#1C1917]">Historical Clinical Notes ({vetNotes.length})</h2>
        <div className="space-y-3">
          {vetNotes.map(n => (
            <div key={n.id} className="p-4 rounded-2xl bg-[#FDF6EE] border border-[#E8DCCE] space-y-1 text-xs">
              <div className="flex items-center justify-between font-bold text-[#1C1917]">
                <span>{n.authorName}</span>
                <span className="label-overline text-[9px]">{n.date}</span>
              </div>
              <p className="text-[#786F68] leading-relaxed">{n.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
