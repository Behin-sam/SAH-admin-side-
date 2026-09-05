export type UserRole = 'veteran' | 'counselor';

export type RiskLevel = 'NORMAL' | 'MONITOR' | 'ATTENTION' | 'URGENT REVIEW';

export type TaskCategory = 'Physical' | 'Mental' | 'Social' | 'Nature' | 'Routine';

export type TaskStatus = 'pending' | 'completed' | 'skipped' | 'delayed' | 'partial';

export interface User {
  id: string;
  name: string;
  rank?: string;
  unit?: string;
  role: UserRole;
  avatarUrl: string;
  email: string;
  isEmailVerified: boolean;
  assignedCounselorId?: string;
  assignedCounselorName?: string;
  serviceBranch?: string;
  title?: string;
  specialization?: string;
  credentials?: string;
  institution?: string;
  phone?: string;
}

export interface Counselor {
  id: string;
  name: string;
  title?: string;
  specialty?: string;
  specialization?: string;
  credentials?: string;
  institution?: string;
  avatar?: string;
  avatarUrl?: string;
  phone?: string;
  email?: string;
  rating?: number;
  active_clients?: number;
  current_veterans?: number;
  max_veterans?: number;
  avg_response_minutes?: number;
  is_available?: boolean;
}

export interface VeteranProfile {
  veteranId: string;
  serviceBranch: string;
  yearsOfService: number;
  physicalActivityLevel: 'Low' | 'Moderate' | 'High';
  socialInteractionLevel: 'Low' | 'Moderate' | 'High';
  sleepConsistencyLevel: 'Low' | 'Moderate' | 'High';
  outdoorEngagementLevel: 'Low' | 'Moderate' | 'High';
  routineStabilityLevel: 'Low' | 'Moderate' | 'High';
  recommendedFocus: string[];
  checkInFrequencyDays: number;
  streakDays: number;
  totalXP: number;
  level: number;
  badges: Badge[];
  currentRiskLevel: RiskLevel;
  credibilityScore?: number;
  stabilityScore?: number;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlockedAt: string;
}

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  description: string;
  durationMinutes: number;
  xpReward: number;
  recommendedTime: string;
  status: TaskStatus;
  completedAt?: string;
  effortRating?: number;
  moodImpact?: string;
  notes?: string;
  isCustomCounselorAssigned?: boolean;
  gpsRequired?: boolean;
}

export interface DailyMetrics {
  date: string;
  physicalScore: number;
  mentalScore: number;
  sleepHours: number;
  sleepQuality: number;
  stressLevel: number;
  moodScore: number;
  socialMinutes: number;
  outdoorMinutes: number;
  tasksCompleted: number;
  tasksTotal: number;
}

export interface CheckInSurvey {
  id: string;
  date: string;
  overallFeeling: 'Good' | 'Okay' | 'Difficult' | 'Very difficult';
  sleepRating: 'Restful' | 'Interrupted' | 'Insomnia / Poor';
  socialConnectedness: 'Connected' | 'Neutral' | 'Isolated';
  stressLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
  needsSupport: boolean;
  notes?: string;
}

export interface AIInsight {
  id: string;
  veteranId: string;
  veteranName: string;
  timestamp: string;
  riskLevel: RiskLevel;
  confidence: 'High' | 'Moderate' | 'Low';
  detectedChanges: string[];
  reasons: string[];
  recommendedActions: string[];
  acknowledgedByCounselor: boolean;
  credibilityScore?: number;
  alertType?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'reminder' | 'milestone' | 'counselor' | 'checkin' | 'system';
  read: boolean;
}

export interface CounselorNote {
  id: string;
  veteranId: string;
  counselorId: string;
  authorName: string;
  date: string;
  text: string;
  isPrivate: boolean;
}
