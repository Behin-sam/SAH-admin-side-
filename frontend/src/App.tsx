import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { CrisisModal } from './components/common/CrisisModal';
import { TaskDetailsModal } from './components/veteran/TaskDetailsModal';
import { TaskCompletionModal } from './components/veteran/TaskCompletionModal';
import { AuthView } from './components/auth/AuthView';

// Veteran Views
import { SplashWelcome } from './components/veteran/SplashWelcome';
import { InitialAssessment } from './components/veteran/InitialAssessment';
import { RecoveryProfileView } from './components/veteran/RecoveryProfileView';
import { HomeTodayJourney } from './components/veteran/HomeTodayJourney';
import { PhysicalWellbeingView } from './components/veteran/PhysicalWellbeingView';
import { MentalWellbeingView } from './components/veteran/MentalWellbeingView';
import { ProgressJourneyView } from './components/veteran/ProgressJourneyView';
import { WeeklyCheckInModal } from './components/veteran/WeeklyCheckInModal';
import { NotificationsView } from './components/veteran/NotificationsView';
import { SupportCounselorView } from './components/veteran/SupportCounselorView';
import { ProfileSettingsView } from './components/veteran/ProfileSettingsView';

// Counselor Views
import { DashboardOverview } from './components/counselor/DashboardOverview';
import { VeteranListView } from './components/counselor/VeteranListView';
import { VeteranDetailView } from './components/counselor/VeteranDetailView';
import { AIAttentionCenterView } from './components/counselor/AIAttentionCenterView';
import { TaskManagementView } from './components/counselor/TaskManagementView';
import { CommunicationHubView } from './components/counselor/CommunicationHubView';
import { TaskEngagementView } from './components/counselor/TaskEngagementView';

const MainContent: React.FC = () => {
  const { isAuthenticated, currentUser, currentRole, activeScreen } = useApp();

  // 1. If not authenticated, render Auth System (Login, Registration, OTP Verification)
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-[#FDF6EE] text-[#1C1917] flex flex-col justify-center">
        <AuthView />
      </div>
    );
  }

  // 2. Strict Role-Based View Guard
  const renderScreen = () => {
    if (currentUser.role === 'veteran' || currentRole === 'veteran') {
      switch (activeScreen) {
        case 'splash': return <SplashWelcome />;
        case 'assessment': return <InitialAssessment />;
        case 'profile-view': return <RecoveryProfileView />;
        case 'home': return <HomeTodayJourney />;
        case 'physical': return <PhysicalWellbeingView />;
        case 'mental': return <MentalWellbeingView />;
        case 'progress': return <ProgressJourneyView />;
        case 'weekly-checkin': return <WeeklyCheckInModal />;
        case 'notifications': return <NotificationsView />;
        case 'support': return <SupportCounselorView />;
        case 'settings': return <ProfileSettingsView />;
        default: return <HomeTodayJourney />;
      }
    }

    switch (activeScreen) {
      case 'dashboard-overview': return <DashboardOverview />;
      case 'veteran-list': return <VeteranListView />;
      case 'veteran-detail': return <VeteranDetailView />;
      case 'counselor-physical': return <PhysicalWellbeingView />;
      case 'counselor-mental': return <MentalWellbeingView />;
      case 'counselor-engagement': return <TaskEngagementView />;
      case 'ai-attention': return <AIAttentionCenterView />;
      case 'checkin-history': return <VeteranDetailView />;
      case 'task-management': return <TaskManagementView />;
      case 'counselor-comm': return <CommunicationHubView />;
      case 'counselor-settings': return <ProfileSettingsView />;
      default: return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDF6EE] text-[#1C1917]">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {renderScreen()}
        </main>
      </div>

      {/* Global Overlays */}
      <CrisisModal />
      <TaskDetailsModal />
      <TaskCompletionModal />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default App;
