import React, { createContext, useContext, useState } from 'react';
import { User, VeteranProfile, Task, DailyMetrics, CheckInSurvey, AIInsight, NotificationItem, CounselorNote, UserRole, TaskStatus } from '../types';
import { CURRENT_COUNSELOR, DEMO_VETERANS, INITIAL_TASKS_VET_1, INITIAL_TASKS_VET_3, MOCK_AI_INSIGHTS, MOCK_NOTIFICATIONS, MOCK_COUNSELOR_NOTES, generate30DayMetrics } from '../data/mockData';

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

  // Auth Methods
  const loginWithCredentials = (email: string, role: UserRole) => {
    if (role === 'counselor') {
      setCurrentUser(CURRENT_COUNSELOR);
      setCurrentRole('counselor');
      setIsAuthenticated(true);
      setActiveScreen('dashboard-overview');
    } else {
      const match = allVeterans.find(v => v.user.email.toLowerCase() === email.toLowerCase()) || allVeterans[0];
      setCurrentUser(match.user);
      setCurrentRole('veteran');
      setActiveVeteranId(match.user.id);
      setIsAuthenticated(true);
      setActiveScreen('home');
    }
  };

  const registerNewUser = (userData: Omit<User, 'id' | 'avatarUrl' | 'isEmailVerified'>) => {
    const newId = `vet-${Date.now()}`;
    const newUser: User = {
      ...userData,
      id: newId,
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200`,
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
      totalXP: 100,
      level: 1,
      currentRiskLevel: 'NORMAL',
      badges: [{ id: 'b-new', title: 'Registered Member', description: 'Joined VALOR Recovery Network', iconName: 'Shield', unlockedAt: '2026-09-04' }]
    };

    setAllVeterans(prev => [...prev, { user: newUser, profile: newProfile }]);
    setTasksMap(prev => ({ ...prev, [newId]: INITIAL_TASKS_VET_1 }));
    setCurrentUser(newUser);
    setActiveVeteranId(newId);
  };

  const verifyEmailCode = (email: string, code: string): boolean => {
    if (code === '123456' || code.length === 6) {
      if (currentUser) {
        setCurrentUser({ ...currentUser, isEmailVerified: true });
        setIsAuthenticated(true);
        setCurrentRole(currentUser.role);
        if (currentUser.role === 'veteran') {
          setActiveScreen('assessment');
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
