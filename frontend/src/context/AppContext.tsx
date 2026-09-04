import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, VeteranProfile, Task, DailyMetrics, CheckInSurvey, AIInsight, NotificationItem, CounselorNote, UserRole, TaskStatus } from '../types';
import { CURRENT_COUNSELOR, DEMO_VETERANS, INITIAL_TASKS_VET_1, INITIAL_TASKS_VET_3, NEW_USER_STARTER_TASKS, MOCK_AI_INSIGHTS, MOCK_NOTIFICATIONS, MOCK_COUNSELOR_NOTES, generate30DayMetrics } from '../data/mockData';
import { apiService } from '../services/api';

interface AppContextType {
  // Authentication & Role
  currentUser: User | null;
  isAuthenticated: boolean;
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
  loginWithCredentials: (email: string, role: UserRole) => void;
  registerNewUser: (userData: Omit<User, 'id' | 'avatarUrl' | 'isEmailVerified'>) => void;
  verifyEmailCode: (email: string, code: string) => boolean;
  logout: () => void;

  // Active Veteran
  activeVeteranId: string;
  setActiveVeteranId: (id: string) => void;
  activeScreen: string;
  setActiveScreen: (screen: string) => void;

  // Active Data
  currentVeteranUser: User;
  currentVeteranProfile: VeteranProfile;
  allVeterans: { user: User; profile: VeteranProfile }[];
  tasks: Task[];
  metrics: DailyMetrics[];
  aiInsights: AIInsight[];
  notifications: NotificationItem[];
  counselorNotes: CounselorNote[];
  checkIns: CheckInSurvey[];

  // Modals & Triggers
  isCrisisModalOpen: boolean;
  setIsCrisisModalOpen: (open: boolean) => void;
  activeTaskDetail: Task | null;
  setActiveTaskDetail: (task: Task | null) => void;
  isCompletionModalOpen: boolean;
  setIsCompletionModalOpen: (open: boolean) => void;
  taskToComplete: Task | null;
  setTaskToComplete: (task: Task | null) => void;
  isWeeklyCheckInOpen: boolean;
  setIsWeeklyCheckInOpen: (open: boolean) => void;

  // Actions
  completeTask: (taskId: string, effort: number, moodImpact: string, notes?: string) => void;
  skipTask: (taskId: string, reason?: string) => void;
  submitCheckIn: (survey: Omit<CheckInSurvey, 'id' | 'date'>) => void;
  assignCustomTask: (veteranId: string, task: Omit<Task, 'id' | 'status'>) => void;
  acknowledgeInsight: (insightId: string) => void;
  addCounselorNote: (veteranId: string, text: string) => void;
  resetOnboarding: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(DEMO_VETERANS[0].user);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [currentRole, setCurrentRole] = useState<UserRole>('veteran');

  // Navigation
  const [activeVeteranId, setActiveVeteranId] = useState<string>('vet-01');
  const [activeScreen, setActiveScreen] = useState<string>('home');
  const [isCrisisModalOpen, setIsCrisisModalOpen] = useState<boolean>(false);
  const [activeTaskDetail, setActiveTaskDetail] = useState<Task | null>(null);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState<boolean>(false);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [isWeeklyCheckInOpen, setIsWeeklyCheckInOpen] = useState<boolean>(false);

  // State holdings
  const [allVeterans, setAllVeterans] = useState(DEMO_VETERANS);
  const [tasksMap, setTasksMap] = useState<Record<string, Task[]>>({
    'vet-01': INITIAL_TASKS_VET_1,
    'vet-02': INITIAL_TASKS_VET_1.map(t => ({ ...t, id: `v2-${t.id}` })),
    'vet-03': INITIAL_TASKS_VET_3
  });
  const [aiInsights, setAiInsights] = useState<AIInsight[]>(MOCK_AI_INSIGHTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [counselorNotes, setCounselorNotes] = useState<CounselorNote[]>(MOCK_COUNSELOR_NOTES);
  const [checkIns, setCheckIns] = useState<CheckInSurvey[]>([
    {
      id: 'chk-01',
      date: '2026-08-28',
      overallFeeling: 'Good',
      sleepRating: 'Restful',
      socialConnectedness: 'Connected',
      stressLevel: 'Low',
      needsSupport: false,
      notes: 'Feeling steady and aligned with morning routine.'
    }
  ]);

  // Synchronize state with backend on startup
  useEffect(() => {
    async function syncFromBackend() {
      try {
        const demoData = await apiService.getDemoUsers();
        if (demoData?.veterans && demoData.veterans.length > 0) {
          const syncedVeterans = demoData.veterans.map((v: any, idx: number) => ({
            user: {
              id: v.id,
              name: v.name,
              rank: v.rank,
              unit: v.unit || 'Para Special Forces',
              role: 'veteran' as UserRole,
              avatarUrl: v.avatarUrl,
              email: v.email,
              isEmailVerified: true,
              assignedCounselorId: 'counselor-01',
              assignedCounselorName: 'Dr. Ananya Nair',
              serviceBranch: v.service_branch,
            },
            profile: {
              veteranId: v.id,
              serviceBranch: v.service_branch,
              yearsOfService: 10,
              physicalActivityLevel: 'Moderate' as const,
              socialInteractionLevel: 'Moderate' as const,
              sleepConsistencyLevel: 'Moderate' as const,
              outdoorEngagementLevel: 'High' as const,
              routineStabilityLevel: 'Moderate' as const,
              recommendedFocus: ['Grounding', 'Cardio walk', 'Peer group'],
              checkInFrequencyDays: 7,
              streakDays: v.current_streak || 5,
              totalXP: v.total_points || 250,
              level: Math.floor((v.total_points || 250) / 300) + 1,
              badges: DEMO_VETERANS[idx % DEMO_VETERANS.length]?.profile?.badges || [],
              currentRiskLevel: 'NORMAL' as const,
            },
          }));

          setAllVeterans(syncedVeterans);
          setActiveVeteranId(syncedVeterans[0].user.id);
          setCurrentUser(syncedVeterans[0].user);

          // Fetch dashboard for active veteran
          try {
            const dash = await apiService.getVeteranDashboard(syncedVeterans[0].user.id);
            if (dash?.today_tasks?.length) {
              const liveTasks: Task[] = dash.today_tasks.map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                category: t.type === 'physical' ? 'Physical' : t.type === 'social' ? 'Social' : 'Mental',
                difficulty: 'Moderate',
                xpReward: t.points,
                status: t.status === 'completed' ? 'completed' : 'pending',
                targetMetric: t.type,
                targetValue: 1,
                currentValue: t.status === 'completed' ? 1 : 0,
                unit: 'session',
                gpsRequired: t.gps_required,
              }));
              setTasksMap(prev => ({ ...prev, [syncedVeterans[0].user.id]: liveTasks }));
            }
          } catch (e) {
            console.warn('Dashboard fetch fallback:', e);
          }
        }
      } catch (e) {
        console.warn('Backend offline, using local mock data.');
      }
    }
    syncFromBackend();
  }, []);

  // Auth Methods
  const loginWithCredentials = async (email: string, role: UserRole) => {
    if (role === 'counselor') {
      try {
        const res = await apiService.login(email, 'counselor');
        if (res?.user) {
          setCurrentUser(res.user);
          setCurrentRole('counselor');
          setIsAuthenticated(true);
          setActiveScreen('dashboard-overview');
          return;
        }
      } catch (e) {
        console.warn('Counselor login fallback:', e);
      }
      setCurrentUser(CURRENT_COUNSELOR);
      setCurrentRole('counselor');
      setIsAuthenticated(true);
      setActiveScreen('dashboard-overview');
    } else {
      try {
        const res = await apiService.login(email, 'veteran');
        if (res?.user) {
          const u = res.user;
          const userObj: User = {
            id: u.id,
            name: u.name,
            rank: u.rank || 'Soldier',
            unit: u.unit || 'Infantry Division',
            role: 'veteran',
            avatarUrl: u.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
            email: u.email || email,
            isEmailVerified: true,
            assignedCounselorId: u.assignedCounselorId || 'counselor-01',
            assignedCounselorName: u.assignedCounselorName || 'Dr. Ananya Nair',
            serviceBranch: u.service_branch || 'Indian Army',
          };
          const profObj: VeteranProfile = {
            veteranId: u.id,
            serviceBranch: u.service_branch || 'Indian Army',
            yearsOfService: 10,
            physicalActivityLevel: 'Moderate',
            socialInteractionLevel: 'Moderate',
            sleepConsistencyLevel: 'Moderate',
            outdoorEngagementLevel: 'High',
            routineStabilityLevel: 'Moderate',
            recommendedFocus: ['Establish daily routine', 'Gradual outdoor walking', 'Connect with counselor'],
            checkInFrequencyDays: 7,
            streakDays: u.current_streak || 1,
            totalXP: u.total_points || 50,
            level: Math.floor((u.total_points || 50) / 300) + 1,
            badges: [{ id: 'b-member', title: 'Active Member', description: 'VALOR Veteran Recovery', iconName: 'Shield', unlockedAt: '2026-09-05' }],
            currentRiskLevel: 'NORMAL',
          };

          setAllVeterans(prev => {
            const exists = prev.some(v => v.user.id === u.id);
            return exists ? prev.map(v => v.user.id === u.id ? { user: userObj, profile: profObj } : v) : [...prev, { user: userObj, profile: profObj }];
          });

          setCurrentUser(userObj);
          setActiveVeteranId(u.id);
          setCurrentRole('veteran');
          setIsAuthenticated(true);
          setActiveScreen('home');

          // Load live tasks from backend
          try {
            const dash = await apiService.getVeteranDashboard(u.id);
            if (dash?.today_tasks?.length) {
              const liveTasks: Task[] = dash.today_tasks.map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                category: t.type === 'physical' ? 'Physical' : t.type === 'social' ? 'Social' : 'Mental',
                difficulty: 'Moderate',
                xpReward: t.points,
                status: t.status === 'completed' ? 'completed' : 'pending',
                targetMetric: t.type,
                targetValue: 1,
                currentValue: t.status === 'completed' ? 1 : 0,
                unit: 'session',
                gpsRequired: t.gps_required,
              }));
              setTasksMap(prev => ({ ...prev, [u.id]: liveTasks }));
            }
          } catch (e) {}
          return;
        }
      } catch (err) {
        console.warn('Backend login fallback:', err);
      }

      // Fallback to local match if backend offline
      const match = allVeterans.find(v => v.user.email.toLowerCase() === email.toLowerCase()) || allVeterans[0];
      setCurrentUser(match.user);
      setCurrentRole('veteran');
      setActiveVeteranId(match.user.id);
      setIsAuthenticated(true);
      setActiveScreen('home');
    }
  };

  const registerNewUser = async (userData: Omit<User, 'id' | 'avatarUrl' | 'isEmailVerified'>) => {
    let newId = `vet-${Date.now()}`;
    let registeredUser: any = null;

    try {
      const res = await apiService.register({
        name: userData.name,
        email: userData.email,
        role: userData.role,
        rank: userData.rank,
        unit: userData.unit,
        service_branch: userData.serviceBranch,
      });
      if (res?.user) {
        registeredUser = res.user;
        newId = res.user.id;
      }
    } catch (err) {
      console.warn('Backend register fallback:', err);
    }

    const newUser: User = {
      ...userData,
      id: newId,
      avatarUrl: registeredUser?.avatarUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200`,
      isEmailVerified: false,
      assignedCounselorId: 'counselor-01',
      assignedCounselorName: 'Dr. Ananya Nair'
    };

    const newProfile: VeteranProfile = {
      veteranId: newId,
      serviceBranch: userData.serviceBranch || 'Indian Army',
      yearsOfService: 10,
      physicalActivityLevel: 'Moderate',
      socialInteractionLevel: 'Low',
      sleepConsistencyLevel: 'Low',
      outdoorEngagementLevel: 'Moderate',
      routineStabilityLevel: 'Moderate',
      recommendedFocus: ['Establish daily routine', 'Gradual outdoor walking', 'Connect with counselor'],
      checkInFrequencyDays: 7,
      streakDays: 1,
      totalXP: registeredUser?.total_points || 50,
      level: 1,
      currentRiskLevel: 'NORMAL',
      badges: [{ id: 'b-new', title: 'Registered Member', description: 'Joined VALOR Recovery Network', iconName: 'Shield', unlockedAt: '2026-09-05' }]
    };

    setAllVeterans(prev => [...prev, { user: newUser, profile: newProfile }]);
    // Always assign fresh pending tasks (0 completed!)
    setTasksMap(prev => ({ ...prev, [newId]: NEW_USER_STARTER_TASKS }));
    setCurrentUser(newUser);
    setActiveVeteranId(newId);

    // If backend registered, sync backend tasks
    if (registeredUser) {
      try {
        const dash = await apiService.getVeteranDashboard(newId);
        if (dash?.today_tasks?.length) {
          const liveTasks: Task[] = dash.today_tasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            category: t.type === 'physical' ? 'Physical' : t.type === 'social' ? 'Social' : 'Mental',
            difficulty: 'Moderate',
            xpReward: t.points,
            status: t.status === 'completed' ? 'completed' : 'pending',
            targetMetric: t.type,
            targetValue: 1,
            currentValue: t.status === 'completed' ? 1 : 0,
            unit: 'session',
            gpsRequired: t.gps_required,
          }));
          setTasksMap(prev => ({ ...prev, [newId]: liveTasks }));
        }
      } catch (e) {}
    }
  };

  const verifyEmailCode = (email: string, code: string): boolean => {
    if (code === '123456' || code.length === 6) {
      if (currentUser) {
        setCurrentUser({ ...currentUser, isEmailVerified: true });
        setIsAuthenticated(true);
        setCurrentRole(currentUser.role);
        if (currentUser.role === 'veteran') {
          setActiveScreen('home');
        } else {
          setActiveScreen('dashboard-overview');
        }
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Role locking logic: if user is logged in as a veteran, prevent setting role to counselor!
  const setRole = (targetRole: UserRole) => {
    if (currentUser && currentUser.role === 'veteran' && targetRole === 'counselor') {
      alert('Access Denied: Veterans cannot access the Clinical Counselor Portal.');
      return;
    }
    setCurrentRole(targetRole);
    if (targetRole === 'counselor') {
      setActiveScreen('dashboard-overview');
    } else {
      setActiveScreen('home');
    }
  };

  // Active Veteran references
  const currentVetObj = allVeterans.find(v => v.user.id === activeVeteranId) || allVeterans[0];
  const currentVeteranUser = currentRole === 'veteran' && currentUser ? currentUser : currentVetObj.user;
  const currentVeteranProfile = currentVetObj.profile;
  const tasks = tasksMap[activeVeteranId] || [];
  const metrics = generate30DayMetrics(activeVeteranId);

  // Actions
  const completeTask = (taskId: string, effort: number, moodImpact: string, notes?: string) => {
    setTasksMap(prev => {
      const currentList = prev[activeVeteranId] || [];
      const updated = currentList.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            status: 'completed' as TaskStatus,
            completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            effortRating: effort,
            moodImpact,
            notes
          };
        }
        return t;
      });
      return { ...prev, [activeVeteranId]: updated };
    });

    setAllVeterans(prev =>
      prev.map(v => {
        if (v.user.id === activeVeteranId) {
          const taskObj = tasks.find(t => t.id === taskId);
          const xpGain = taskObj ? taskObj.xpReward : 25;
          const newXP = v.profile.totalXP + xpGain;
          const newLevel = Math.floor(newXP / 300) + 1;
          return {
            ...v,
            profile: {
              ...v.profile,
              totalXP: newXP,
              level: newLevel
            }
          };
        }
        return v;
      })
    );

    setNotifications(prev => [
      {
        id: `notif-${Date.now()}`,
        title: 'Activity Completed!',
        message: `You earned XP for completing task. Small steps count!`,
        timestamp: 'Just now',
        type: 'milestone',
        read: false
      },
      ...prev
    ]);

    // Async backend mutation
    apiService.completeTask(activeVeteranId, taskId).catch(() => {});
  };

  const skipTask = (taskId: string, reason?: string) => {
    setTasksMap(prev => {
      const currentList = prev[activeVeteranId] || [];
      const updated = currentList.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            status: 'skipped' as TaskStatus,
            notes: reason || 'Skipped by veteran'
          };
        }
        return t;
      });
      return { ...prev, [activeVeteranId]: updated };
    });

    // Async backend mutation
    apiService.skipTask(activeVeteranId, taskId, reason).catch(() => {});
  };

  const submitCheckIn = (surveyData: Omit<CheckInSurvey, 'id' | 'date'>) => {
    const newSurvey: CheckInSurvey = {
      ...surveyData,
      id: `survey-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]
    };
    setCheckIns(prev => [newSurvey, ...prev]);

    if (surveyData.needsSupport || surveyData.overallFeeling === 'Very difficult') {
      const newInsight: AIInsight = {
        id: `insight-${Date.now()}`,
        veteranId: activeVeteranId,
        veteranName: currentVeteranUser.name,
        timestamp: new Date().toLocaleString(),
        riskLevel: 'ATTENTION',
        confidence: 'High',
        detectedChanges: ['Veteran submitted check-in reporting high distress', 'Direct request for counselor support'],
        reasons: ['Subjective check-in rating triggered immediate human review threshold.'],
        recommendedActions: ['Reach out via phone call within 24 hours', 'Offer gentle grounding audio session'],
        acknowledgedByCounselor: false
      };
      setAiInsights(prev => [newInsight, ...prev]);

      setAllVeterans(prev =>
        prev.map(v =>
          v.user.id === activeVeteranId
            ? { ...v, profile: { ...v.profile, currentRiskLevel: 'ATTENTION' } }
            : v
        )
      );
    }
  };

  const assignCustomTask = (veteranId: string, newTaskData: Omit<Task, 'id' | 'status'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: `task-custom-${Date.now()}`,
      status: 'pending',
      isCustomCounselorAssigned: true
    };
    setTasksMap(prev => ({
      ...prev,
      [veteranId]: [...(prev[veteranId] || []), newTask]
    }));
  };

  const acknowledgeInsight = (insightId: string) => {
    setAiInsights(prev =>
      prev.map(ins => (ins.id === insightId ? { ...ins, acknowledgedByCounselor: true } : ins))
    );
  };

  const addCounselorNote = (veteranId: string, text: string) => {
    const newNote: CounselorNote = {
      id: `cn-${Date.now()}`,
      veteranId,
      counselorId: CURRENT_COUNSELOR.id,
      authorName: CURRENT_COUNSELOR.name,
      date: new Date().toISOString().split('T')[0],
      text,
      isPrivate: false
    };
    setCounselorNotes(prev => [newNote, ...prev]);
  };

  const resetOnboarding = () => {
    setActiveScreen('assessment');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        currentRole,
        setRole,
        loginWithCredentials,
        registerNewUser,
        verifyEmailCode,
        logout,
        activeVeteranId,
        setActiveVeteranId,
        activeScreen,
        setActiveScreen,
        currentVeteranUser,
        currentVeteranProfile,
        allVeterans,
        tasks,
        metrics,
        aiInsights,
        notifications,
        counselorNotes,
        checkIns,
        isCrisisModalOpen,
        setIsCrisisModalOpen,
        activeTaskDetail,
        setActiveTaskDetail,
        isCompletionModalOpen,
        setIsCompletionModalOpen,
        taskToComplete,
        setTaskToComplete,
        isWeeklyCheckInOpen,
        setIsWeeklyCheckInOpen,
        completeTask,
        skipTask,
        submitCheckIn,
        assignCustomTask,
        acknowledgeInsight,
        addCounselorNote,
        resetOnboarding
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
