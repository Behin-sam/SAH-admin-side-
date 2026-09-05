import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Shield,
  Award,
  Calendar,
  Flame,
  Plus,
  Heart,
  Send,
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  Activity,
  UserCheck,
  Search,
  Filter,
  X,
  Clock,
  Sparkles,
  Trophy
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiService } from '../../services/api';

interface GroupItem {
  id: string;
  name: string;
  description: string;
  member_count: number;
  max_members: number;
  total_points: number;
  activities_completed: number;
  created_at?: string;
  activity_schedule?: { days?: string[]; time?: string };
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  activity_type: string;
  scheduled_at: string;
  duration_minutes: number;
  points_per_participant: number;
  status: string;
  participants_count: number;
  completed_count: number;
}

interface MessageItem {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_rank: string;
  message: string;
  cheer_type: string;
  likes_count: number;
  created_at: string;
}

interface MemberItem {
  veteran_id: string;
  name: string;
  rank: string;
  service_branch: string;
  role: string;
  total_points: number;
  current_streak: number;
  completed_tasks_count?: number;
  has_finished_task?: boolean;
}

export const SquadsView: React.FC = () => {
  const {
    activeVeteranId,
    currentUser,
    currentVeteranUser,
    joinedGroups,
    setJoinedGroups,
    awardXP
  } = useApp();

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'my-squads'>('discover');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Selected squad detail modal / hub
  const [selectedSquad, setSelectedSquad] = useState<GroupItem | null>(null);
  const [squadTab, setSquadTab] = useState<'activities' | 'cheer' | 'roster'>('activities');
  const [squadActivities, setSquadActivities] = useState<ActivityItem[]>([]);
  const [squadMessages, setSquadMessages] = useState<MessageItem[]>([]);
  const [squadMembers, setSquadMembers] = useState<MemberItem[]>([]);
  const [loadingSquadDetails, setLoadingSquadDetails] = useState<boolean>(false);

  // Cheer Board Input
  const [cheerInput, setCheerInput] = useState<string>('');
  const [postingCheer, setPostingCheer] = useState<boolean>(false);

  // New Squad Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newSquadName, setNewSquadName] = useState<string>('');
  const [newSquadDesc, setNewSquadDesc] = useState<string>('');
  const [newSquadCategory, setNewSquadCategory] = useState<string>('Physical');
  const [creatingSquad, setCreatingSquad] = useState<boolean>(false);

  // Squad Leader: Create Task for Members
  const [showCreateTaskModal, setShowCreateTaskModal] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskDesc, setNewTaskDesc] = useState<string>('');
  const [newTaskType, setNewTaskType] = useState<string>('Physical');
  const [newTaskPoints, setNewTaskPoints] = useState<number>(20);
  const [creatingTask, setCreatingTask] = useState<boolean>(false);

  // Local actions tracking
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [joinedActivities, setJoinedActivities] = useState<Record<string, boolean>>({});
  const [completedActivities, setCompletedActivities] = useState<Record<string, boolean>>({});
  const [awardingMemberId, setAwardingMemberId] = useState<string | null>(null);

  const vetId = activeVeteranId || (currentUser?.id && currentUser.id.includes('-') ? currentUser.id : '550e8400-e29b-41d4-a716-446655440001');

  // Fetch groups list
  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.getGroups(searchQuery);
      if (res?.groups) {
        setGroups(res.groups);
      }
    } catch (err) {
      console.warn('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Load detailed squad data when modal opens
  const openSquadHub = async (squad: GroupItem) => {
    setSelectedSquad(squad);
    setSquadTab('activities');
    setLoadingSquadDetails(true);

    try {
      const [actRes, msgRes, memRes] = await Promise.all([
        apiService.getGroupActivities(squad.id).catch(() => ({ activities: [] })),
        apiService.getGroupMessages(squad.id).catch(() => ({ messages: [] })),
        apiService.getGroupMembers(squad.id).catch(() => ({ members: [] }))
      ]);

      setSquadActivities(actRes?.activities || []);
      setSquadMessages(msgRes?.messages || []);
      setSquadMembers(memRes?.members || []);
    } catch (err) {
      console.warn('Error loading squad hub data:', err);
    } finally {
      setLoadingSquadDetails(false);
    }
  };

  const isEnlisted = (groupId: string) => {
    return joinedGroups.some(g => g.id === groupId);
  };

  // Join or Leave Squad
  const handleToggleJoin = async (squad: GroupItem) => {
    if (actionLoadingId) return;
    setActionLoadingId(squad.id);

    const enlisted = isEnlisted(squad.id);

    try {
      if (enlisted) {
        // Leave
        await apiService.leaveGroup(squad.id, vetId);
        const updated = joinedGroups.filter(g => g.id !== squad.id);
        setJoinedGroups(updated);
        localStorage.setItem(`sah_my_groups_${vetId}`, JSON.stringify(updated));

        setGroups(prev =>
          prev.map(g => (g.id === squad.id ? { ...g, member_count: Math.max(0, g.member_count - 1) } : g))
        );
        if (selectedSquad?.id === squad.id) {
          setSelectedSquad(prev => prev ? { ...prev, member_count: Math.max(0, prev.member_count - 1) } : null);
        }
      } else {
        // Join (or rejoin)
        const res = await apiService.joinGroup(squad.id, vetId);
        const updated = [...joinedGroups.filter(g => g.id !== squad.id), squad];
        setJoinedGroups(updated);
        localStorage.setItem(`sah_my_groups_${vetId}`, JSON.stringify(updated));

        // Only award XP if backend says points_earned > 0 (first join only, not rejoin)
        const earned = res?.points_earned || 0;
        if (earned > 0) {
          awardXP(earned, `Enlisted with ${squad.name}`);
        }

        setGroups(prev =>
          prev.map(g => (g.id === squad.id ? { ...g, member_count: g.member_count + 1 } : g))
        );
        if (selectedSquad?.id === squad.id) {
          setSelectedSquad(prev => prev ? { ...prev, member_count: prev.member_count + 1 } : null);
        }
      }
    } catch (err) {
      console.warn('Join/leave error:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Join a challenge/activity
  const handleJoinActivity = async (act: ActivityItem) => {
    if (!selectedSquad) return;
    try {
      await apiService.joinGroupActivity(selectedSquad.id, act.id, vetId);
      setJoinedActivities(prev => ({ ...prev, [act.id]: true }));
      setSquadActivities(prev =>
        prev.map(a => (a.id === act.id ? { ...a, participants_count: a.participants_count + 1 } : a))
      );
    } catch (e) {
      setJoinedActivities(prev => ({ ...prev, [act.id]: true }));
    }
  };

  // Complete a challenge/activity
  const handleCompleteActivity = async (act: ActivityItem) => {
    if (!selectedSquad) return;
    try {
      await apiService.completeGroupActivity(selectedSquad.id, act.id, vetId);
      setCompletedActivities(prev => ({ ...prev, [act.id]: true }));
      const pts = act.points_per_participant || 20;
      awardXP(pts, `Completed drill: ${act.title}`);
    } catch (e) {
      // Do NOT award points on API failure — show error instead
      console.warn('Activity complete error:', e);
      alert('Could not log completion. Please check your connection and try again.');
    }
  };

  // Squad Leader: Award points to member who completed a task
  const handleAwardPoints = async (member: MemberItem) => {
    if (!selectedSquad || awardingMemberId) return;
    if (!member.has_finished_task) {
      alert(`Cannot award points to ${member.name}: Comrade must finish a squad drill or daily task first.`);
      return;
    }

    setAwardingMemberId(member.veteran_id);
    try {
      const res = await apiService.awardMemberPoints(selectedSquad.id, member.veteran_id, {
        leader_id: vetId,
        points: 15,
        reason: `Squad Leader Commendation for drill completion`,
      });
      alert(res?.message || `Successfully awarded 15 XP to ${member.name}! 🎖️`);
      setSquadMembers(prev =>
        prev.map(m => (m.veteran_id === member.veteran_id ? { ...m, total_points: (m.total_points || 0) + 15 } : m))
      );
    } catch (err: any) {
      const detail = err?.message || 'Failed to award points. Member must finish a task first.';
      alert(`Notice: ${detail}`);
    } finally {
      setAwardingMemberId(null);
    }
  };

  // Post squad cheer
  const handlePostCheer = async () => {
    if (!cheerInput.trim() || !selectedSquad || postingCheer) return;
    setPostingCheer(true);

    const messageText = cheerInput.trim();
    const senderName = currentVeteranUser.name || currentUser?.name || 'Comrade';
    const senderRank = currentVeteranUser.rank || currentUser?.rank || 'Soldier';

    try {
      await apiService.postGroupMessage(selectedSquad.id, {
        sender_id: vetId,
        message: messageText,
        sender_name: senderName,
        sender_rank: senderRank,
        cheer_type: 'cheer'
      });

      awardXP(5, 'Posted squad cheer dispatch');

      const newMsg: MessageItem = {
        id: `msg-${Date.now()}`,
        sender_id: vetId,
        sender_name: senderName,
        sender_rank: senderRank,
        message: messageText,
        cheer_type: 'cheer',
        likes_count: 0,
        created_at: new Date().toISOString()
      };

      setSquadMessages(prev => [newMsg, ...prev]);
      setCheerInput('');
    } catch (err) {
      console.warn('Failed to post cheer:', err);
    } finally {
      setPostingCheer(false);
    }
  };

  // Like a cheer
  const handleLikeMessage = async (msgId: string) => {
    if (!selectedSquad) return;
    try {
      setSquadMessages(prev =>
        prev.map(m => (m.id === msgId ? { ...m, likes_count: (m.likes_count || 0) + 1 } : m))
      );
      await apiService.likeGroupMessage(selectedSquad.id, msgId);
    } catch (err) {
      console.warn('Like cheer error:', err);
    }
  };

  // Commission new squad
  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSquadName.trim() || creatingSquad) return;

    setCreatingSquad(true);
    try {
      const res = await apiService.createGroup({
        name: newSquadName.trim(),
        created_by: vetId,
        description: newSquadDesc.trim() || 'Veteran peer support circle focused on resilience.',
        max_members: 50,
        is_public: true
      });

      awardXP(25, `Founded squad: ${newSquadName.trim()}`);

      const newSquad: GroupItem = {
        id: res.id || `squad-${Date.now()}`,
        name: newSquadName.trim(),
        description: newSquadDesc.trim() || 'Veteran peer support circle.',
        member_count: 1,
        max_members: 50,
        total_points: 0,
        activities_completed: 0,
        created_at: new Date().toISOString()
      };

      setGroups(prev => [newSquad, ...prev]);
      const updated = [...joinedGroups, newSquad];
      setJoinedGroups(updated);
      localStorage.setItem(`sah_my_groups_${vetId}`, JSON.stringify(updated));

      setShowCreateModal(false);
      setNewSquadName('');
      setNewSquadDesc('');
    } catch (err) {
      console.warn('Create squad error:', err);
    } finally {
      setCreatingSquad(false);
    }
  };

  // Squad Leader: Create a task/activity for squad members
  const handleCreateSquadTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedSquad || creatingTask) return;
    setCreatingTask(true);
    try {
      await apiService.createGroupActivity(selectedSquad.id, {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || 'Squad drill assigned by squad leader.',
        activity_type: newTaskType.toLowerCase(),
        points_per_participant: newTaskPoints,
        created_by: vetId,
        scheduled_at: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        duration_minutes: 30,
      });
      // Refresh activities
      const actRes = await apiService.getGroupActivities(selectedSquad.id).catch(() => ({ activities: [] }));
      setSquadActivities(actRes?.activities || []);
      setShowCreateTaskModal(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
    } catch (err) {
      console.warn('Create squad task error:', err);
      alert('Could not create task. Make sure you are the squad admin.');
    } finally {
      setCreatingTask(false);
    }
  };

  const displayedGroups = (activeTab === 'my-squads' ? joinedGroups : groups).filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-[#E8DCCE] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FDF2E9] text-[#D96B27] text-xs font-bold uppercase tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5" />
              Cohort Brotherhood
            </div>
            <h1 className="text-2xl font-extrabold text-[#1C1917] tracking-tight">
              Squads & Peer Support Groups
            </h1>
            <p className="text-sm text-[#786F68] mt-1">
              Enlist with fellow veterans for group walking drills, mindfulness circles, and daily encouragement.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-bold text-sm shadow-sm transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Commission Squad
            </button>
          </div>
        </div>

        {/* Tab & Search Bar */}
        <div className="mt-6 pt-4 border-t border-[#E8DCCE]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-[#F5EBE0]/60 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'discover'
                  ? 'bg-white text-[#D96B27] shadow-sm'
                  : 'text-[#786F68] hover:text-[#1C1917]'
              }`}
            >
              Discover Squads ({groups.length})
            </button>
            <button
              onClick={() => setActiveTab('my-squads')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'my-squads'
                  ? 'bg-white text-[#D96B27] shadow-sm'
                  : 'text-[#786F68] hover:text-[#1C1917]'
              }`}
            >
              Enlisted Squads ({joinedGroups.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#786F68] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search squads by callsign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl text-[#1C1917] placeholder-[#786F68] focus:outline-none focus:ring-2 focus:ring-[#D96B27]/40"
            />
          </div>
        </div>
      </div>

      {/* Squad Cards Grid */}
      {loading ? (
        <div className="bg-white border border-[#E8DCCE] rounded-2xl p-12 text-center">
          <div className="w-8 h-8 border-3 border-[#D96B27] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-[#786F68]">Mobilizing squad rosters from command...</p>
        </div>
      ) : displayedGroups.length === 0 ? (
        <div className="bg-white border border-[#E8DCCE] rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-[#D96B27] mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-[#1C1917]">No squads found</h3>
          <p className="text-xs text-[#786F68] mt-1 max-w-md mx-auto">
            {activeTab === 'my-squads'
              ? 'You have not joined any squads yet. Switch to "Discover Squads" to enlist with a cohort!'
              : 'Try adjusting your search criteria or commission a new squad for your comrades.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedGroups.map((squad) => {
            const enlisted = isEnlisted(squad.id);
            const isActing = actionLoadingId === squad.id;

            return (
              <div
                key={squad.id}
                className="bg-white border border-[#E8DCCE] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-[#FDF2E9] border border-[#EEBD9B]/50 flex items-center justify-center text-[#D96B27]">
                      <Users className="w-6 h-6" />
                    </div>
                    {enlisted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Enlisted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5EBE0] text-[#786F68] text-xs font-semibold">
                        Open Squad
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-[#1C1917] line-clamp-1">{squad.name}</h3>
                  <p className="text-xs text-[#786F68] mt-1 line-clamp-2 leading-relaxed">
                    {squad.description || 'Veteran peer group supporting recovery and daily activity.'}
                  </p>

                  <div className="grid grid-cols-3 gap-2 bg-[#FDF6EE] rounded-xl p-2.5 mt-4 border border-[#E8DCCE]/60 text-center">
                    <div>
                      <span className="block text-xs font-bold text-[#1C1917]">{squad.member_count || 1}</span>
                      <span className="text-[10px] text-[#786F68]">Comrades</span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-[#D96B27]">{squad.total_points || 340}</span>
                      <span className="text-[10px] text-[#786F68]">Squad XP</span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-[#1C1917]">3</span>
                      <span className="text-[10px] text-[#786F68]">Drills</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[#E8DCCE]/70 flex items-center gap-2">
                  <button
                    onClick={() => handleToggleJoin(squad)}
                    disabled={isActing}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      enlisted
                        ? 'bg-[#FDF6EE] hover:bg-rose-50 text-rose-700 border border-[#E8DCCE] hover:border-rose-200'
                        : 'bg-[#D96B27] hover:bg-[#C55A1A] text-white shadow-sm'
                    }`}
                  >
                    {isActing ? 'Updating...' : enlisted ? 'Stand Down' : 'Enlist (+15 XP)'}
                  </button>

                  <button
                    onClick={() => openSquadHub(squad)}
                    className="p-2 rounded-xl bg-[#F5EBE0] hover:bg-[#E8DCCE] text-[#1C1917] transition-all"
                    title="Open Squad Hub"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SQUAD HUB MODAL (Activities, Cheer Board, Roster) */}
      {selectedSquad && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCCE] rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-[#FDF6EE] border-b border-[#E8DCCE] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8DCCE] flex items-center justify-center text-[#D96B27] shadow-sm">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-[#1C1917]">{selectedSquad.name}</h2>
                    {isEnlisted(selectedSquad.id) && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Enlisted
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#786F68] mt-0.5 line-clamp-1">{selectedSquad.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleJoin(selectedSquad)}
                  disabled={actionLoadingId === selectedSquad.id}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isEnlisted(selectedSquad.id)
                      ? 'bg-white hover:bg-rose-50 text-rose-700 border border-[#E8DCCE]'
                      : 'bg-[#D96B27] hover:bg-[#C55A1A] text-white shadow-sm'
                  }`}
                >
                  {isEnlisted(selectedSquad.id) ? 'Leave Squad' : 'Enlist (+15 XP)'}
                </button>
                <button
                  onClick={() => setSelectedSquad(null)}
                  className="p-2 rounded-xl text-[#786F68] hover:text-[#1C1917] hover:bg-white/80 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 pt-3 bg-[#FDF6EE] border-b border-[#E8DCCE] flex items-center gap-6">
              <button
                onClick={() => setSquadTab('activities')}
                className={`pb-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                  squadTab === 'activities'
                    ? 'border-[#D96B27] text-[#D96B27]'
                    : 'border-transparent text-[#786F68] hover:text-[#1C1917]'
                }`}
              >
                <Activity className="w-4 h-4" />
                Drills & Challenges ({squadActivities.length})
              </button>
              <button
                onClick={() => setSquadTab('cheer')}
                className={`pb-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                  squadTab === 'cheer'
                    ? 'border-[#D96B27] text-[#D96B27]'
                    : 'border-transparent text-[#786F68] hover:text-[#1C1917]'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                Cheer Board ({squadMessages.length})
              </button>
              <button
                onClick={() => setSquadTab('roster')}
                className={`pb-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                  squadTab === 'roster'
                    ? 'border-[#D96B27] text-[#D96B27]'
                    : 'border-transparent text-[#786F68] hover:text-[#1C1917]'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Comrades Roster ({squadMembers.length})
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-white space-y-4">
              {loadingSquadDetails ? (
                <div className="py-12 text-center text-sm text-[#786F68]">Loading squad dispatch...</div>
              ) : squadTab === 'activities' ? (
                /* TAB 1: DRILLS & CHALLENGES */
                <div className="space-y-3">
                  {/* Squad Leader: Create Drill button */}
                  {(() => {
                    const myMembership = squadMembers.find(m => m.veteran_id === vetId);
                    const isAdmin = myMembership?.role === 'admin' || myMembership?.role === 'leader';
                    return isAdmin ? (
                      <button
                        onClick={() => setShowCreateTaskModal(true)}
                        className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-[#D96B27]/50 text-[#D96B27] text-xs font-bold hover:bg-[#FDF2E9] transition-all flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Create New Squad Drill / Task
                      </button>
                    ) : null;
                  })()}
                  {squadActivities.length === 0 ? (
                    <div className="py-10 text-center text-xs text-[#786F68]">
                      No active drills scheduled for this squad. Check back soon!
                    </div>
                  ) : (
                    squadActivities.map((act) => {
                      const isJoined = joinedActivities[act.id];
                      const isCompleted = completedActivities[act.id] || act.status === 'completed';

                      return (
                        <div
                          key={act.id}
                          className="border border-[#E8DCCE] rounded-2xl p-4 bg-[#FDF6EE]/40 hover:bg-[#FDF6EE] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#FDF2E9] text-[#D96B27] text-[10px] font-bold uppercase">
                                {act.activity_type || 'DRILL'}
                              </span>
                              <span className="text-xs font-extrabold text-[#D96B27]">
                                +{act.points_per_participant || 20} XP
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-[#1C1917]">{act.title}</h4>
                            <p className="text-xs text-[#786F68]">{act.description}</p>
                            <div className="flex items-center gap-4 text-[11px] text-[#786F68] pt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {act.duration_minutes || 30} min
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {act.participants_count || 4} joined
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                                <CheckCircle2 className="w-4 h-4" />
                                Completed 🎖️
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleJoinActivity(act)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                    isJoined
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                      : 'bg-white border-[#E8DCCE] text-[#1C1917] hover:bg-[#F5EBE0]'
                                  }`}
                                >
                                  {isJoined ? 'Enrolled' : 'Join Drill'}
                                </button>
                                <button
                                  onClick={() => handleCompleteActivity(act)}
                                  className="px-3.5 py-1.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white text-xs font-bold shadow-sm transition-all"
                                >
                                  Claim XP
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : squadTab === 'cheer' ? (
                /* TAB 2: CHEER BOARD */
                <div className="space-y-4">
                  {/* Cheer Input */}
                  <div className="bg-[#FDF6EE] border border-[#E8DCCE] rounded-2xl p-3 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Dispatch a word of strength to your comrades..."
                      value={cheerInput}
                      onChange={(e) => setCheerInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePostCheer()}
                      className="flex-1 bg-white border border-[#E8DCCE] rounded-xl px-3 py-2 text-xs text-[#1C1917] placeholder-[#786F68] focus:outline-none focus:ring-2 focus:ring-[#D96B27]/40"
                    />
                    <button
                      onClick={handlePostCheer}
                      disabled={!cheerInput.trim() || postingCheer}
                      className="px-4 py-2 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] disabled:bg-[#E8DCCE] text-white text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Post (+5 XP)
                    </button>
                  </div>

                  {/* Messages Stream */}
                  <div className="space-y-3">
                    {squadMessages.length === 0 ? (
                      <div className="py-10 text-center text-xs text-[#786F68]">
                        Be the first to post an encouraging dispatch on this squad board!
                      </div>
                    ) : (
                      squadMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="border border-[#E8DCCE] rounded-2xl p-4 bg-white hover:bg-[#FDF6EE]/30 transition-all"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full bg-[#FDF2E9] text-[#D96B27] font-bold text-xs flex items-center justify-center">
                                {(msg.sender_name || 'C').charAt(0)}
                              </span>
                              <span className="text-xs font-bold text-[#1C1917]">{msg.sender_name}</span>
                              <span className="px-1.5 py-0.5 rounded bg-[#F5EBE0] text-[#786F68] text-[10px] font-semibold">
                                {msg.sender_rank || 'Soldier'}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#786F68]">
                              {new Date(msg.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <p className="text-xs text-[#1C1917] leading-relaxed pl-9">{msg.message}</p>

                          <div className="flex justify-end pt-2">
                            <button
                              onClick={() => handleLikeMessage(msg.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FDF2E9] text-[#D96B27] text-xs font-bold hover:bg-[#FBE4D6] transition-all"
                            >
                              <Heart className="w-3.5 h-3.5 fill-current" />
                              {msg.likes_count || 0} Applauds
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* TAB 3: ROSTER */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {squadMembers.length === 0 ? (
                    <div className="col-span-2 py-10 text-center text-xs text-[#786F68]">
                      Loading comrade roster...
                    </div>
                  ) : (
                    squadMembers.map((member, idx) => {
                      const isSquadLeader =
                        (selectedSquad as any)?.created_by === vetId ||
                        squadMembers.some((m) => m.veteran_id === vetId && (m.role === 'admin' || m.role === 'leader'));
                      const isSelf = member.veteran_id === vetId;

                      return (
                        <div
                          key={member.veteran_id || idx}
                          className="border border-[#E8DCCE] rounded-2xl p-3 bg-white flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#F5EBE0] flex items-center justify-center font-bold text-xs text-[#1C1917]">
                                {(member.name || 'V').charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-[#1C1917]">{member.name}</span>
                                  {member.role === 'admin' && (
                                    <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                      Lead
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-[#786F68] block">
                                  {member.rank || 'Soldier'} • {member.service_branch || 'Veteran'}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-xs font-extrabold text-[#D96B27] block">
                                {member.total_points || 0} XP
                              </span>
                              {member.current_streak ? (
                                <span className="text-[10px] text-[#786F68] flex items-center justify-end gap-0.5">
                                  <Flame className="w-3 h-3 text-[#D96B27]" />
                                  {member.current_streak}d
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Leader Task Points Award Action */}
                          {isSquadLeader && !isSelf && (
                            <div className="mt-2.5 pt-2 border-t border-[#F5EBE0] flex items-center justify-between">
                              <span className="text-[10px] text-[#786F68]">
                                {member.has_finished_task ? (
                                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Drill Finished ({member.completed_tasks_count || 1})
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-medium">Task required to award points</span>
                                )}
                              </span>

                              <button
                                onClick={() => handleAwardPoints(member)}
                                disabled={!member.has_finished_task || awardingMemberId === member.veteran_id}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  member.has_finished_task
                                    ? 'bg-[#D96B27] hover:bg-[#C55A1A] text-white shadow-xs'
                                    : 'bg-[#F5EBE0] text-[#786F68] cursor-not-allowed opacity-70'
                                }`}
                                title={
                                  member.has_finished_task
                                    ? 'Award squad points for task completion'
                                    : 'Comrade must finish a drill or task before leader can award points'
                                }
                              >
                                <Trophy className="w-3 h-3" />
                                {awardingMemberId === member.veteran_id ? 'Awarding...' : 'Award +15 XP'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMMISSION SQUAD MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCCE] rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#D96B27]">
                <Shield className="w-5 h-5" />
                <h3 className="text-lg font-bold text-[#1C1917]">Commission a New Squad</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#786F68] hover:text-[#1C1917]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSquad} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Squad Callsign / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Siachen Strollers, Mountain Battalion..."
                  value={newSquadName}
                  onChange={(e) => setNewSquadName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#D96B27]/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Squad Focus</label>
                <select
                  value={newSquadCategory}
                  onChange={(e) => setNewSquadCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#D96B27]/40"
                >
                  <option value="Physical">Physical & Daily Walking Drills</option>
                  <option value="Mental">Mindfulness & Mental Recovery</option>
                  <option value="Social">Social Fellowship & Coffee Chats</option>
                  <option value="Nature">Nature Exploration & Hiking</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Squad Mission / Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe your squad's goals and meetup routines..."
                  value={newSquadDesc}
                  onChange={(e) => setNewSquadDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#D96B27]/40 resize-none"
                />
              </div>

              <div className="bg-[#FDF2E9] border border-[#EEBD9B]/60 rounded-xl p-3 text-xs text-[#8C4A1E]">
                🎖️ Founding a new squad earns you <strong>+25 XP</strong> and installs you as Squad Leader.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#786F68] hover:bg-[#F5EBE0] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newSquadName.trim() || creatingSquad}
                  className="px-5 py-2 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] disabled:bg-[#E8DCCE] text-white text-xs font-bold shadow-sm transition-all"
                >
                  {creatingSquad ? 'Commissioning...' : 'Commission Squad (+25 XP)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SQUAD DRILL / TASK MODAL (Squad Leaders Only) */}
      {showCreateTaskModal && selectedSquad && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCCE] rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-5 border-b border-[#E8DCCE] flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#1C1917]">Create Squad Drill / Task</h3>
              <button onClick={() => setShowCreateTaskModal(false)} className="text-[#786F68] hover:text-[#1C1917]">✕</button>
            </div>
            <form onSubmit={handleCreateSquadTask} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Drill / Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2km Morning Walk, Meditation Session..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#D96B27]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Task Type</label>
                <select
                  value={newTaskType}
                  onChange={(e) => setNewTaskType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#D96B27]/40"
                >
                  <option value="Physical">Physical Fitness</option>
                  <option value="Mental">Mental Wellness</option>
                  <option value="Social">Social Activity</option>
                  <option value="Nature">Nature / Outdoors</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">XP Reward per Member</label>
                <select
                  value={newTaskPoints}
                  onChange={(e) => setNewTaskPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#D96B27]/40"
                >
                  <option value={10}>10 XP (Easy)</option>
                  <option value={20}>20 XP (Standard)</option>
                  <option value={30}>30 XP (Challenge)</option>
                  <option value={50}>50 XP (Mission)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Description (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Instructions or goals for this drill..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#D96B27]/40 resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setShowCreateTaskModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-[#786F68] hover:bg-[#F5EBE0]">Cancel</button>
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim() || creatingTask}
                  className="px-5 py-2 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] disabled:bg-[#E8DCCE] text-white text-xs font-bold shadow-sm"
                >
                  {creatingTask ? 'Creating...' : 'Deploy Drill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
