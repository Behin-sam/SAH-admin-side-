import { User, VeteranProfile, Task, DailyMetrics, CheckInSurvey, AIInsight, NotificationItem, CounselorNote } from '../types';

export const CURRENT_COUNSELOR: User = {
  id: 'counselor-01',
  name: 'Dr. Ananya Nair, MD',
  rank: 'Chief Clinical Supervisor',
  role: 'counselor',
  avatarUrl: 'https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200',
  email: 'a.nair@amrita-health.org',
  isEmailVerified: true
};

export const DEMO_VETERANS: { user: User; profile: VeteranProfile }[] = [
  {
    user: {
      id: 'vet-01',
      name: 'Col. Rajesh Sharma',
      rank: 'Colonel (Retd.), 4th Gorkha Rifles',
      unit: 'Northern Command',
      role: 'veteran',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      email: 'rajesh.sharma@veterans.org',
      isEmailVerified: true,
      assignedCounselorId: 'counselor-01',
      assignedCounselorName: 'Dr. Ananya Nair'
    },
    profile: {
      veteranId: 'vet-01',
      serviceBranch: 'Indian Army',
      yearsOfService: 24,
      physicalActivityLevel: 'High',
      socialInteractionLevel: 'Moderate',
      sleepConsistencyLevel: 'High',
      outdoorEngagementLevel: 'High',
      routineStabilityLevel: 'High',
      recommendedFocus: [
        'Maintain daily mindfulness routine',
        'Sustain outdoor walking goals',
        'Lead peer support check-ins'
      ],
      checkInFrequencyDays: 7,
      streakDays: 14,
      totalXP: 1450,
      level: 5,
      currentRiskLevel: 'NORMAL',
      badges: [
        { id: 'b1', title: '7-Day Anchor', description: 'Completed morning stretch 7 days in a row', iconName: 'Flame', unlockedAt: '2026-08-25' },
        { id: 'b2', title: 'Nature Connection', description: 'Logged over 2 hours of outdoor garden time', iconName: 'Trees', unlockedAt: '2026-08-28' },
        { id: 'b3', title: 'Mindful Guardian', description: 'Completed 10 breathing exercises', iconName: 'Wind', unlockedAt: '2026-09-01' }
      ]
    }
  },
  {
    user: {
      id: 'vet-02',
      name: 'Capt. Arjun Singh',
      rank: 'Captain (Retd.), Armoured Corps',
      unit: 'Western Command',
      role: 'veteran',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
      email: 'arjun.singh@veterans.org',
      isEmailVerified: true,
      assignedCounselorId: 'counselor-01',
      assignedCounselorName: 'Dr. Ananya Nair'
    },
    profile: {
      veteranId: 'vet-02',
      serviceBranch: 'Indian Army',
      yearsOfService: 12,
      physicalActivityLevel: 'Moderate',
      socialInteractionLevel: 'Low',
      sleepConsistencyLevel: 'Low',
      outdoorEngagementLevel: 'Moderate',
      routineStabilityLevel: 'Moderate',
      recommendedFocus: [
        'Re-engage in low-pressure social check-ins',
        'Establish fixed sleep window',
        'Gradual physical stretching'
      ],
      checkInFrequencyDays: 7,
      streakDays: 3,
      totalXP: 820,
      level: 3,
      currentRiskLevel: 'MONITOR',
      badges: [
        { id: 'b4', title: 'First Step Forward', description: 'Completed initial onboarding & survey', iconName: 'Award', unlockedAt: '2026-08-10' },
        { id: 'b5', title: 'Breath Anchor', description: 'Completed 5 box breathing sessions', iconName: 'Wind', unlockedAt: '2026-08-18' }
      ]
    }
  },
  {
    user: {
      id: 'vet-03',
      name: 'Warrant Officer Vikram Verma',
      rank: 'Warrant Officer (Retd.), IAF Support',
      unit: 'Air Force Station Ambala',
      role: 'veteran',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
      email: 'vikram.verma@veterans.org',
      isEmailVerified: true,
      assignedCounselorId: 'counselor-01',
      assignedCounselorName: 'Dr. Ananya Nair'
    },
    profile: {
      veteranId: 'vet-03',
      serviceBranch: 'Indian Air Force',
      yearsOfService: 18,
      physicalActivityLevel: 'Low',
      socialInteractionLevel: 'Low',
      sleepConsistencyLevel: 'Low',
      outdoorEngagementLevel: 'Low',
      routineStabilityLevel: 'Low',
      recommendedFocus: [
        'Urgent counselor review required',
        'Supportive micro-grounding exercises',
        'Sleep stabilization plan'
      ],
      checkInFrequencyDays: 3,
      streakDays: 0,
      totalXP: 410,
      level: 2,
      currentRiskLevel: 'URGENT REVIEW',
      badges: [
        { id: 'b6', title: 'Community Welcome', description: 'Joined VALOR Veteran Network', iconName: 'Shield', unlockedAt: '2026-08-01' }
      ]
    }
  }
];

export const INITIAL_TASKS_VET_1: Task[] = [
  {
    id: 't-101',
    title: 'Morning Sun Walk (15 mins)',
    category: 'Nature',
    description: 'Take a gentle 15-minute walk in natural morning sunlight to regulate circadian rhythm.',
    durationMinutes: 15,
    xpReward: 30,
    recommendedTime: 'Morning',
    status: 'completed',
    completedAt: '08:30 AM',
    effortRating: 3,
    moodImpact: 'Energized',
    notes: 'Walked in the neighborhood park. Felt crisp air.'
  },
  {
    id: 't-102',
    title: '4-7-8 Tactical Breathing Session',
    category: 'Mental',
    description: 'Inhale for 4 seconds, hold for 7 seconds, exhale for 8 seconds. Repeat 4 cycles.',
    durationMinutes: 8,
    xpReward: 25,
    recommendedTime: 'Morning',
    status: 'completed',
    completedAt: '09:15 AM',
    effortRating: 2,
    moodImpact: 'Calmer'
  },
  {
    id: 't-103',
    title: 'Hydration Anchor (2 Liters)',
    category: 'Physical',
    description: 'Maintain steady water intake throughout the day to boost physical recovery.',
    durationMinutes: 5,
    xpReward: 20,
    recommendedTime: 'Afternoon',
    status: 'completed',
    completedAt: '01:45 PM',
    effortRating: 1,
    moodImpact: 'Neutral'
  },
  {
    id: 't-104',
    title: 'Connect with a Service Comrade',
    category: 'Social',
    description: 'Send a quick text message or 5-minute call to check in on a fellow veteran.',
    durationMinutes: 10,
    xpReward: 40,
    recommendedTime: 'Afternoon',
    status: 'pending'
  },
  {
    id: 't-105',
    title: 'Evening Gratitude Journaling',
    category: 'Routine',
    description: 'Write down 3 simple things that went well today before preparing for sleep.',
    durationMinutes: 10,
    xpReward: 30,
    recommendedTime: 'Evening',
    status: 'pending'
  }
];

export const INITIAL_TASKS_VET_3: Task[] = [
  {
    id: 't-301',
    title: 'Micro 2-Minute Window Breathing',
    category: 'Mental',
    description: 'Sit in a comfortable chair. Take 5 deep slow breaths focusing on feeling your feet grounded on the floor.',
    durationMinutes: 3,
    xpReward: 20,
    recommendedTime: 'Morning',
    status: 'skipped',
    notes: 'Felt too restless to focus.'
  },
  {
    id: 't-302',
    title: 'Light Shoulder & Neck Release',
    category: 'Physical',
    description: 'Gently roll shoulders backward 5 times and forward 5 times.',
    durationMinutes: 5,
    xpReward: 20,
    recommendedTime: 'Morning',
    status: 'skipped'
  },
  {
    id: 't-303',
    title: 'Sit Near Window / Garden (5 mins)',
    category: 'Nature',
    description: 'Spend 5 minutes quietly observing outside greenery or daylight without phone distraction.',
    durationMinutes: 5,
    xpReward: 25,
    recommendedTime: 'Afternoon',
    status: 'pending'
  },
  {
    id: 't-304',
    title: 'Reply to Counselor Check-in Message',
    category: 'Social',
    description: 'Acknowledge Dr. Ananya Nair’s message to confirm you are safe.',
    durationMinutes: 2,
    xpReward: 30,
    recommendedTime: 'Afternoon',
    status: 'pending',
    isCustomCounselorAssigned: true
  }
];

export const MOCK_AI_INSIGHTS: AIInsight[] = [
  {
    id: 'insight-101',
    veteranId: 'vet-03',
    veteranName: 'Warrant Officer Vikram Verma',
    timestamp: '2026-09-04 09:30 AM',
    riskLevel: 'URGENT REVIEW',
    confidence: 'High',
    detectedChanges: [
      'Physical activity score dropped by 45% over the past 7 days',
      'Social activities skipped for 5 consecutive days',
      'Self-reported stress increased from 4/10 to 9/10',
      'Sleep quality rated "Poor / Insomnia" in recent check-in'
    ],
    reasons: [
      'Multiple independent behavioral indicators deviated simultaneously from baseline.',
      'Significant change in weekly survey sentiment with positive request for urgent counselor support.'
    ],
    recommendedActions: [
      'Initiate direct phone callback or telehealth check-in',
      'Adjust daily task load to ultra-micro grounding activities',
      'Verify immediate safety status'
    ],
    acknowledgedByCounselor: false
  },
  {
    id: 'insight-102',
    veteranId: 'vet-02',
    veteranName: 'Capt. Arjun Singh',
    timestamp: '2026-09-03 04:15 PM',
    riskLevel: 'MONITOR',
    confidence: 'Moderate',
    detectedChanges: [
      'Social interaction tasks completed dropped from 80% to 30%',
      'Sleep consistency delayed by 2.5 hours on average'
    ],
    reasons: [
      'Gradual drop in social interaction over 14 days without overt crisis signals.',
      'Physical activity remains stable.'
    ],
    recommendedActions: [
      'Suggest low-pressure non-verbal nature tasks',
      'Send supportive check-in note during next review session'
    ],
    acknowledgedByCounselor: true
  }
];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Daily Journey Ready',
    message: 'Your 5 personalized recovery activities for today are ready. Take it one step at a time.',
    timestamp: '08:00 AM',
    type: 'reminder',
    read: false
  },
  {
    id: 'n2',
    title: 'Message from Dr. Ananya Nair',
    message: 'Good morning Col. Sharma. Excellent progress on your 14-day streak! Keep up the morning walk.',
    timestamp: 'Yesterday',
    type: 'counselor',
    read: true
  },
  {
    id: 'n3',
    title: 'Weekly Check-in Due',
    message: 'Your quick 2-minute weekly check-in is now available. Let us know how your week was.',
    timestamp: '2 days ago',
    type: 'checkin',
    read: false
  }
];

export const MOCK_COUNSELOR_NOTES: CounselorNote[] = [
  {
    id: 'cn-1',
    veteranId: 'vet-03',
    counselorId: 'counselor-01',
    authorName: 'Dr. Ananya Nair',
    date: '2026-09-02',
    text: 'Spoke with Warrant Officer Vikram during bi-weekly call. Reported persistent sleep disturbances and anxiety triggered by high noise environments. Suggested 4-7-8 breathing and low-stimulus nature walks.',
    isPrivate: false
  },
  {
    id: 'cn-2',
    veteranId: 'vet-02',
    counselorId: 'counselor-01',
    authorName: 'Dr. Ananya Nair',
    date: '2026-08-28',
    text: 'Capt. Arjun showing steady improvement in physical stretching, but continues to isolate socially. Keeping task focus on nature and physical routine before re-introducing group tasks.',
    isPrivate: false
  }
];

export const generate30DayMetrics = (veteranId: string): DailyMetrics[] => {
  const metrics: DailyMetrics[] = [];
  const today = new Date('2026-09-04');

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    if (veteranId === 'vet-01') {
      metrics.push({
        date: dateStr,
        physicalScore: Math.floor(75 + Math.sin(i * 0.3) * 15 + Math.random() * 5),
        mentalScore: Math.floor(80 + Math.cos(i * 0.2) * 10 + Math.random() * 5),
        sleepHours: 7.5 + Math.sin(i) * 0.5,
        sleepQuality: 8,
        stressLevel: Math.floor(3 + Math.random() * 2),
        moodScore: 8,
        socialMinutes: 45,
        outdoorMinutes: 35,
        tasksCompleted: 4,
        tasksTotal: 5
      });
    } else if (veteranId === 'vet-02') {
      const declineFactor = i / 30;
      metrics.push({
        date: dateStr,
        physicalScore: Math.floor(65 + Math.sin(i * 0.5) * 10),
        mentalScore: Math.floor(50 + declineFactor * 25),
        sleepHours: 6.0 + declineFactor * 1.5,
        sleepQuality: Math.floor(5 + declineFactor * 3),
        stressLevel: Math.floor(7 - declineFactor * 2),
        moodScore: Math.floor(5 + declineFactor * 3),
        socialMinutes: Math.floor(10 + declineFactor * 30),
        outdoorMinutes: 20,
        tasksCompleted: Math.floor(2 + declineFactor * 2),
        tasksTotal: 5
      });
    } else {
      const recentDrop = i < 7;
      metrics.push({
        date: dateStr,
        physicalScore: recentDrop ? Math.floor(25 + Math.random() * 10) : Math.floor(65 + Math.random() * 10),
        mentalScore: recentDrop ? Math.floor(20 + Math.random() * 10) : Math.floor(60 + Math.random() * 10),
        sleepHours: recentDrop ? 4.2 : 6.8,
        sleepQuality: recentDrop ? 3 : 7,
        stressLevel: recentDrop ? 9 : 4,
        moodScore: recentDrop ? 3 : 7,
        socialMinutes: recentDrop ? 5 : 30,
        outdoorMinutes: recentDrop ? 5 : 25,
        tasksCompleted: recentDrop ? 1 : 4,
        tasksTotal: 5
      });
    }
  }
  return metrics;
};
