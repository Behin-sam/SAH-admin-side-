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
  Mail,
  Check,
  UserMinus,
  Clock,
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
  avatar_url?: string;
}

interface FriendRequest {
  id: string;
  request_id: string;
  rank: string;
  service_branch: string;
  total_points: number;
  current_streak: number;
  requested_at: string;
  avatar_url?: string;
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
  avatar_url?: string;
}

export const FriendsView: React.FC = () => {
  const { activeVeteranId, currentVeteranUser } = useApp();
  const vetId = activeVeteranId || '550e8400-e29b-41d4-a716-446655440001';

  const [tab, setTab] = useState<'friends' | 'requests' | 'discover'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [discover, setDiscover] = useState<DiscoverVet[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());

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

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await apiService.getFriendRequests(vetId);
      setRequests(res?.requests || []);
    } catch (err) {
      console.warn('Load requests failed:', err);
      setRequests([]);
    } finally {
      setLoadingRequests(false);
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

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, [loadFriends, loadRequests]);

  useEffect(() => {
    if (tab === 'discover') loadDiscover();
    if (tab === 'requests') loadRequests();
  }, [tab, loadDiscover, loadRequests]);

  // DM thread loading
  const loadDMThread = useCallback(async (silent = false) => {
    if (!activeDM) return;
    if (!silent) setLoadingDM(true);
    try {
      const res = await apiService.getDMThread(vetId, activeDM.id);
      const msgs = res?.messages || [];
      setDmMessages(prev => {
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

  const handleSendRequest = async (vet: DiscoverVet) => {
    if (actingId) return;
    setActingId(vet.id);
    try {
      await apiService.sendFriendRequest(vetId, vet.id);
      setSentRequestIds(prev => new Set([...prev, vet.id]));
      loadDiscover();
    } catch (err) {
      console.warn('Send request failed:', err);
    } finally {
      setActingId(null);
    }
  };

  const handleRespondRequest = async (req: FriendRequest, action: 'accept' | 'reject') => {
    if (actingId) return;
    setActingId(req.request_id);
    try {
      await apiService.respondToFriendRequest(vetId, req.request_id, action);
      loadRequests();
      loadFriends();
    } catch (err) {
      console.warn('Respond request failed:', err);
    } finally {
      setActingId(null);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!window.confirm('Disconnect from this comrade?')) return;
    try {
      await apiService.removeFriend(vetId, friendId);
      if (activeDM?.id === friendId) setActiveDM(null);
      loadFriends();
    } catch (err) {
      console.warn('Remove friend failed:', err);
    }
  };

  const handleSendDM = async () => {
    if (!dmInput.trim() || !activeDM || sendingDM) return;
    const content = dmInput.trim();
    setDmInput('');
    setSendingDM(true);

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
      setDmMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSendingDM(false);
    }
  };

  const filteredFriends = friends.filter(f => {
    const q = searchQuery.toLowerCase();
    return (f.rank?.toLowerCase().includes(q)) || (f.service_branch?.toLowerCase().includes(q));
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl glass-panel shadow-warm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="label-overline text-[10px] text-[#8C4A1E]">PEER NETWORK</span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917] mt-1">
            Comrades & Direct Messaging
          </h1>
          <p className="text-xs text-[#786F68] mt-1">
            Connect with fellow veterans, build your trusted circle, and send peer-to-peer messages.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#EFE8DE] p-1 rounded-xl gap-1 self-start sm:self-center">
          <button
            onClick={() => { setTab('friends'); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'friends'
                ? 'bg-[#8C4A1E] text-white shadow-sm'
                : 'text-[#786F68] hover:text-[#1C1917]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Comrades ({friends.length})
          </button>

          <button
            onClick={() => { setTab('requests'); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all relative ${
              tab === 'requests'
                ? 'bg-[#8C4A1E] text-white shadow-sm'
                : 'text-[#786F68] hover:text-[#1C1917]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Requests
            {requests.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                {requests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setTab('discover'); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'discover'
                ? 'bg-[#8C4A1E] text-white shadow-sm'
                : 'text-[#786F68] hover:text-[#1C1917]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Discover
          </button>
        </div>
      </div>

      {/* Main Grid: Left list / Right DM panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List */}
        <div className={`${activeDM ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-4`}>
          {/* Search bar */}
          {tab !== 'requests' && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#786F68]" />
              <input
                type="text"
                placeholder="Search by rank or service branch..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8DCCE] bg-white text-xs text-[#1C1917] placeholder-[#786F68] focus:outline-none focus:border-[#8C4A1E]"
              />
            </div>
          )}

          {/* TAB 1: COMRADES */}
          {tab === 'friends' && (
            <div className="space-y-3">
              {loadingFriends ? (
                <div className="p-8 text-center text-xs text-[#786F68]">Loading comrades...</div>
              ) : filteredFriends.length === 0 ? (
                <div className="p-8 rounded-2xl glass-panel text-center space-y-3">
                  <Shield className="w-10 h-10 mx-auto text-[#D96B27] opacity-60" />
                  <p className="text-sm font-bold text-[#1C1917]">No comrades linked yet</p>
                  <p className="text-xs text-[#786F68]">
                    Explore the Discover tab to connect with fellow veterans.
                  </p>
                  <button
                    onClick={() => setTab('discover')}
                    className="px-4 py-2 bg-[#8C4A1E] text-white rounded-xl text-xs font-bold hover:bg-[#723B17]"
                  >
                    Discover Veterans
                  </button>
                </div>
              ) : (
                filteredFriends.map(friend => (
                  <div
                    key={friend.id}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      activeDM?.id === friend.id
                        ? 'border-[#8C4A1E] bg-[#FAF3EC] shadow-sm'
                        : 'border-[#E8DCCE] bg-white hover:border-[#D96B27]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold font-heading text-sm shrink-0">
                        {friend.rank ? friend.rank.slice(0, 2).toUpperCase() : 'CO'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-[#1C1917] truncate">{friend.rank}</h3>
                        <p className="text-xs text-[#786F68] truncate">{friend.service_branch}</p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-[#786F68]">
                          <span className="flex items-center gap-1 font-bold text-[#D96B27]">
                            <Trophy className="w-3 h-3" /> {friend.total_points || 0} XP
                          </span>
                          <span className="flex items-center gap-1 font-bold text-[#8C4A1E]">
                            <Flame className="w-3 h-3" /> {friend.current_streak || 0}d streak
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setActiveDM(activeDM?.id === friend.id ? null : friend)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          activeDM?.id === friend.id
                            ? 'bg-[#8C4A1E] text-white'
                            : 'bg-[#F7DFCC] text-[#8C4A1E] hover:bg-[#EBD0B9]'
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {activeDM?.id === friend.id ? 'Close' : 'Message'}
                      </button>

                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                        title="Disconnect"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: REQUESTS */}
          {tab === 'requests' && (
            <div className="space-y-3">
              {loadingRequests ? (
                <div className="p-8 text-center text-xs text-[#786F68]">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="p-8 rounded-2xl glass-panel text-center space-y-2">
                  <Mail className="w-10 h-10 mx-auto text-[#786F68] opacity-50" />
                  <p className="text-sm font-bold text-[#1C1917]">No incoming friend requests</p>
                  <p className="text-xs text-[#786F68]">
                    When other veterans send you friend requests, you can accept or decline them here.
                  </p>
                </div>
              ) : (
                requests.map(req => (
                  <div
                    key={req.request_id}
                    className="p-4 rounded-xl border border-amber-200 bg-[#FFFDF9] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm shrink-0">
                        {req.rank ? req.rank.slice(0, 2).toUpperCase() : 'CO'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-[#1C1917] truncate">{req.rank}</h3>
                        <p className="text-xs text-[#786F68] truncate">{req.service_branch}</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">Invited you to connect</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRespondRequest(req, 'reject')}
                        disabled={actingId === req.request_id}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleRespondRequest(req, 'accept')}
                        disabled={actingId === req.request_id}
                        className="flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: DISCOVER */}
          {tab === 'discover' && (
            <div className="space-y-3">
              {loadingDiscover ? (
                <div className="p-8 text-center text-xs text-[#786F68]">Searching veterans...</div>
              ) : discover.length === 0 ? (
                <div className="p-8 rounded-2xl glass-panel text-center text-xs text-[#786F68]">
                  No other veterans found.
                </div>
              ) : (
                discover.map(vet => {
                  const isFriend = friends.some(f => f.id === vet.id);
                  const isSent = sentRequestIds.has(vet.id);
                  const isBusy = actingId === vet.id;

                  return (
                    <div
                      key={vet.id}
                      className="p-4 rounded-xl border border-[#E8DCCE] bg-white flex items-center justify-between gap-3 hover:border-[#D96B27] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-[#EFE8DE] text-[#1C1917] flex items-center justify-center font-bold text-sm shrink-0">
                          {vet.rank ? vet.rank.slice(0, 2).toUpperCase() : 'V'}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-[#1C1917] truncate">{vet.rank}</h3>
                          <p className="text-xs text-[#786F68] truncate">{vet.service_branch}</p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-[#786F68]">
                            <span className="flex items-center gap-1 font-bold text-[#D96B27]">
                              <Trophy className="w-3 h-3" /> {vet.total_points || 0} XP
                            </span>
                            <span className="flex items-center gap-1 font-bold text-[#8C4A1E]">
                              <Flame className="w-3 h-3" /> {vet.current_streak || 0}d streak
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isFriend ? (
                          <button
                            onClick={() => {
                              const found = friends.find(f => f.id === vet.id);
                              if (found) {
                                setActiveDM(found);
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#F7DFCC] text-[#8C4A1E] rounded-lg text-xs font-bold"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Chat
                          </button>
                        ) : isSent ? (
                          <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold">
                            <Clock className="w-3 h-3" />
                            Request Sent
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(vet)}
                            disabled={isBusy}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            {isBusy ? 'Sending...' : 'Send Request'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Column: Active DM Thread */}
        {activeDM && (
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E8DCCE] shadow-warm flex flex-col h-[600px]">
            {/* DM Header */}
            <div className="p-4 border-b border-[#E8DCCE] flex items-center justify-between bg-[#FAF3EC] rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#8C4A1E] text-white flex items-center justify-center font-bold text-xs">
                  {activeDM.rank.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1C1917]">{activeDM.rank}</h3>
                  <p className="text-[11px] text-[#786F68]">{activeDM.service_branch}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveDM(null)}
                className="p-1.5 rounded-lg text-[#786F68] hover:bg-[#EBD0B9]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FDFBF7]">
              {loadingDM ? (
                <div className="text-center text-xs text-[#786F68] py-8">Loading messages...</div>
              ) : dmMessages.length === 0 ? (
                <div className="text-center text-xs text-[#786F68] py-16">
                  <MessageCircle className="w-8 h-8 mx-auto text-[#D96B27] opacity-40 mb-2" />
                  Say hello to your comrade! Start your private encrypted discussion.
                </div>
              ) : (
                dmMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs ${
                        msg.is_mine
                          ? 'bg-[#8C4A1E] text-white rounded-br-none'
                          : 'bg-white border border-[#E8DCCE] text-[#1C1917] rounded-bl-none shadow-sm'
                      }`}
                    >
                      <p className="leading-relaxed">{msg.content}</p>
                      <span
                        className={`text-[10px] block mt-1 ${
                          msg.is_mine ? 'text-[#F7DFCC]' : 'text-[#786F68]'
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={dmBottomRef} />
            </div>

            {/* DM Input Bar */}
            <div className="p-3 border-t border-[#E8DCCE] flex items-center gap-2 bg-white rounded-b-2xl">
              <input
                type="text"
                placeholder={`Message ${activeDM.rank}...`}
                value={dmInput}
                onChange={e => setDmInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendDM();
                  }
                }}
                className="flex-1 px-4 py-2 rounded-xl border border-[#E8DCCE] text-xs text-[#1C1917] placeholder-[#786F68] focus:outline-none focus:border-[#8C4A1E]"
              />
              <button
                onClick={handleSendDM}
                disabled={!dmInput.trim() || sendingDM}
                className="p-2.5 bg-[#8C4A1E] hover:bg-[#723B17] text-white rounded-xl transition-all disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsView;
