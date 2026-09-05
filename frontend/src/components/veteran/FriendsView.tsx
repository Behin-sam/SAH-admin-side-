import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  UserPlus,
  MessageCircle,
  Send,
  Search,
  ChevronLeft,
  Shield,
  Flame,
  Trophy,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiService } from '../../services/api';

interface Friend {
  id: string;
  rank: string;
  service_branch: string;
  total_points: number;
  current_streak: number;
  added_at?: string;
}

interface DMMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_mine: boolean;
}

interface DiscoverVet {
  id: string;
  rank: string;
  service_branch: string;
  total_points: number;
  current_streak: number;
}

export const FriendsView: React.FC = () => {
  const { activeVeteranId, currentVeteranUser, awardXP } = useApp();
  const vetId = activeVeteranId || 'vet-01';

  const [tab, setTab] = useState<'friends' | 'discover'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [discover, setDiscover] = useState<DiscoverVet[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // DM Panel state
  const [activeDM, setActiveDM] = useState<Friend | null>(null);
  const [dmMessages, setDmMessages] = useState<DMMessage[]>([]);
  const [dmInput, setDmInput] = useState('');
  const [sendingDM, setSendingDM] = useState(false);
  const [loadingDM, setLoadingDM] = useState(false);
  const dmBottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadFriends = useCallback(async () => {
    setLoadingFriends(true);
    try {
      const res = await apiService.getFriends(vetId);
      setFriends(res?.friends || []);
    } catch (err) {
      console.warn('Load friends failed:', err);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  }, [vetId]);

  const loadDiscover = useCallback(async () => {
    setLoadingDiscover(true);
    try {
      const res = await apiService.discoverVeterans(vetId, searchQuery);
      setDiscover(res?.veterans || []);
    } catch (err) {
      setDiscover([]);
    } finally {
      setLoadingDiscover(false);
    }
  }, [vetId, searchQuery]);

  useEffect(() => { loadFriends(); }, [loadFriends]);
  useEffect(() => { if (tab === 'discover') loadDiscover(); }, [tab, loadDiscover]);

  // DM thread loading
  const loadDMThread = useCallback(async (silent = false) => {
    if (!activeDM) return;
    if (!silent) setLoadingDM(true);
    try {
      const res = await apiService.getDMThread(vetId, activeDM.id);
      const msgs = res?.messages || [];
      setDmMessages(prev => {
        // Merge: keep optimistic messages not yet confirmed
        const serverIds = new Set(msgs.map((m: DMMessage) => m.id));
        const optimistic = prev.filter(m => m.id.startsWith('opt-') && !serverIds.has(m.id));
        return [...msgs, ...optimistic].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
    } catch (err) {
      console.warn('Load DM thread failed:', err);
    } finally {
      setLoadingDM(false);
    }
  }, [activeDM, vetId]);

  useEffect(() => {
    if (!activeDM) return;
    loadDMThread();
    pollRef.current = setInterval(() => loadDMThread(true), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeDM, loadDMThread]);

  useEffect(() => {
    dmBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages]);

  const handleAddFriend = async (vet: DiscoverVet) => {
    if (addingId) return;
    setAddingId(vet.id);
    try {
      const res = await apiService.addFriend(vetId, vet.id);
      if (res.points_earned > 0) {
        awardXP(res.points_earned, 'Added a comrade as friend');
      }
      setAddedIds(prev => new Set([...prev, vet.id]));
      loadFriends();
    } catch (err) {
      console.warn('Add friend failed:', err);
    } finally {
      setAddingId(null);
    }
  };

  const handleSendDM = async () => {
    if (!dmInput.trim() || !activeDM || sendingDM) return;
    const content = dmInput.trim();
    setDmInput('');
    setSendingDM(true);

    // Optimistic message
    const optimistic: DMMessage = {
      id: `opt-${Date.now()}`,
      sender_id: vetId,
      content,
      created_at: new Date().toISOString(),
      is_mine: true,
    };
    setDmMessages(prev => [...prev, optimistic]);

    try {
      await apiService.sendDM(vetId, activeDM.id, content);
      loadDMThread(true);
    } catch (err) {
      console.warn('Send DM failed:', err);
    } finally {
      setSendingDM(false);
    }
  };

  const getInitials = (rank: string) => rank.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // ─── DM PANEL ─────────────────────────────────────────────────────────────
  if (activeDM) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] bg-white border border-[#E8DCCE] rounded-2xl overflow-hidden shadow-sm">
        {/* DM Header */}
        <div className="px-4 py-3 bg-[#FDF6EE] border-b border-[#E8DCCE] flex items-center gap-3">
          <button onClick={() => { setActiveDM(null); setDmMessages([]); }} className="p-1.5 rounded-lg hover:bg-[#E8DCCE] text-[#786F68]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-full bg-[#D96B27] flex items-center justify-center text-white font-bold text-xs">
            {getInitials(activeDM.rank)}
          </div>
          <div>
            <p className="text-sm font-extrabold text-[#1C1917]">{activeDM.rank}</p>
            <p className="text-xs text-[#786F68]">{activeDM.service_branch}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FDF6EE]/30">
          {loadingDM && dmMessages.length === 0 ? (
            <p className="text-center text-xs text-[#786F68] pt-8">Loading messages...</p>
          ) : dmMessages.length === 0 ? (
            <div className="text-center pt-12 space-y-2">
              <MessageCircle className="w-10 h-10 text-[#E8DCCE] mx-auto" />
              <p className="text-xs text-[#786F68]">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            dmMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  msg.is_mine
                    ? 'bg-[#D96B27] text-white rounded-br-sm'
                    : 'bg-white border border-[#E8DCCE] text-[#1C1917] rounded-bl-sm shadow-sm'
                }`}>
                  <p>{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${msg.is_mine ? 'text-white/70 text-right' : 'text-[#786F68]'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={dmBottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t border-[#E8DCCE] flex items-center gap-2">
          <input
            type="text"
            value={dmInput}
            onChange={e => setDmInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendDM()}
            placeholder={`Message ${activeDM.rank}...`}
            className="flex-1 px-3 py-2 text-xs bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#D96B27]/40"
          />
          <button
            onClick={handleSendDM}
            disabled={!dmInput.trim() || sendingDM}
            className="p-2 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] disabled:bg-[#E8DCCE] text-white transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── MAIN FRIENDS VIEW ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E8DCCE] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FDF2E9] text-[#D96B27] text-xs font-bold uppercase tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5" /> Brotherhood Network
            </div>
            <h1 className="text-2xl font-extrabold text-[#1C1917] tracking-tight">Comrades & Allies</h1>
            <p className="text-sm text-[#786F68] mt-1">Connect with fellow veterans. Send encouragement, share progress, and keep each other accountable.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-[#786F68] bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl px-3 py-2">
            <Users className="w-4 h-4 text-[#D96B27]" />
            <span><strong className="text-[#1C1917]">{friends.length}</strong> Comrades</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl p-1">
          {(['friends', 'discover'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === t ? 'bg-white shadow-sm text-[#D96B27] border border-[#E8DCCE]' : 'text-[#786F68] hover:text-[#1C1917]'
              }`}
            >
              {t === 'friends' ? `My Comrades (${friends.length})` : 'Discover Veterans'}
            </button>
          ))}
        </div>
      </div>

      {/* FRIENDS TAB */}
      {tab === 'friends' && (
        <div className="space-y-3">
          {loadingFriends ? (
            <div className="text-center py-12 text-sm text-[#786F68]">Loading comrades...</div>
          ) : friends.length === 0 ? (
            <div className="bg-white border border-[#E8DCCE] rounded-2xl p-10 text-center shadow-sm space-y-3">
              <Users className="w-12 h-12 text-[#E8DCCE] mx-auto" />
              <p className="text-sm font-bold text-[#1C1917]">No comrades yet</p>
              <p className="text-xs text-[#786F68]">Go to Discover to add fellow veterans as friends.</p>
              <button onClick={() => setTab('discover')} className="px-4 py-2 rounded-xl bg-[#D96B27] text-white text-xs font-bold hover:bg-[#C55A1A]">
                Discover Veterans
              </button>
            </div>
          ) : (
            friends.map(friend => (
              <div key={friend.id} className="bg-white border border-[#E8DCCE] rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#D96B27] flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                    {getInitials(friend.rank)}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-[#1C1917]">{friend.rank}</p>
                    <p className="text-xs text-[#786F68]">{friend.service_branch}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[11px] text-[#D96B27] font-bold">
                        <Trophy className="w-3 h-3" /> {friend.total_points} XP
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-[#786F68]">
                        <Flame className="w-3 h-3" /> {friend.current_streak}d streak
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveDM(friend)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FDF2E9] hover:bg-[#D96B27] hover:text-white text-[#D96B27] text-xs font-bold transition-all border border-[#EEBD9B]"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Message
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* DISCOVER TAB */}
      {tab === 'discover' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#786F68]" />
            <input
              type="text"
              placeholder="Search by rank or service branch..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-[#E8DCCE] rounded-xl text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#D96B27]/40"
            />
          </div>

          {loadingDiscover ? (
            <div className="text-center py-12 text-sm text-[#786F68]">Finding veterans...</div>
          ) : discover.length === 0 ? (
            <div className="bg-white border border-[#E8DCCE] rounded-2xl p-10 text-center shadow-sm">
              <p className="text-xs text-[#786F68]">No veterans found. Try a different search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {discover.map(vet => {
                const isFriend = friends.some(f => f.id === vet.id) || addedIds.has(vet.id);
                const isAdding = addingId === vet.id;
                return (
                  <div key={vet.id} className="bg-white border border-[#E8DCCE] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#F5EBE0] border border-[#E8DCCE] flex items-center justify-center text-[#D96B27] font-extrabold text-sm">
                        {getInitials(vet.rank)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1C1917]">{vet.rank}</p>
                        <p className="text-xs text-[#786F68]">{vet.service_branch}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[11px] text-[#D96B27] font-bold">{vet.total_points} XP</span>
                          <span className="text-[11px] text-[#786F68]">{vet.current_streak}d</span>
                        </div>
                      </div>
                    </div>
                    {isFriend ? (
                      <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                        <UserCheck className="w-3.5 h-3.5" /> Comrade
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAddFriend(vet)}
                        disabled={isAdding}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] disabled:bg-[#E8DCCE] text-white text-xs font-bold transition-all"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        {isAdding ? '...' : '+5 XP Add'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
