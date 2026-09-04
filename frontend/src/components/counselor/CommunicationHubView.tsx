import React, { useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CommunicationHubView: React.FC = () => {
  const { currentVeteranUser, counselorNotes, addCounselorNote, activeVeteranId } = useApp();
  const [noteText, setNoteText] = useState('');

  const vetNotes = counselorNotes.filter(n => n.veteranId === activeVeteranId);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    addCounselorNote(activeVeteranId, noteText);
    setNoteText('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 animate-fadeIn">
      <div className="p-6 rounded-2xl glass-panel flex items-center justify-between gap-4 shadow-warm">
        <div>
          <span className="label-overline text-[10px] text-[#8C4A1E]">Clinical Outreach</span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917] mt-1">COUNSELOR NOTES & OUTREACH HUB</h1>
          <p className="text-xs text-[#786F68] mt-1">Record clinical observations and log direct veteran contacts for {currentVeteranUser.name}.</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold shrink-0">
          <MessageCircle className="w-6 h-6" />
        </div>
      </div>

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
