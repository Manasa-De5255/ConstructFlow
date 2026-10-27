import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LanguageProvider, useLanguage } from './context/LanguageContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { VoiceAssistantWidget } from './components/VoiceAssistantWidget.tsx';
import { LoginView } from './views/LoginView.tsx';
import { WorkerDashboard } from './views/WorkerDashboard.tsx';
import { ConstructorDashboard } from './views/ConstructorDashboard.tsx';
import { AdminDashboard } from './views/AdminDashboard.tsx';
import { SuperAdminDashboard } from './views/SuperAdminDashboard.tsx';
import { useVoiceAssistant } from './hooks/useVoiceAssistant.ts';
import { Menu } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, loading, isSuperAdmin, isAdmin, isConstructor, isWorker } = useAuth();
  const { t, currentLanguageOption } = useLanguage();

  // Active view state
  const [activeView, setActiveView] = useState<string>(() => {
    return 'dashboard';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Initialize Voice Assistant with navigation capability
  const voice = useVoiceAssistant((targetView: string) => {
    if (isWorker) {
      if (targetView === 'payslips' || targetView === 'bonuses' || targetView === 'worker-voice') {
        setActiveView(targetView);
      } else {
        setActiveView('profile');
      }
    } else if (isAdmin) {
      if (targetView === 'payslips') setActiveView('payment-slips');
      else if (targetView === 'shifts') setActiveView('admin-shifts');
      else if (targetView === 'worker-voice') setActiveView('worker-requests');
      else setActiveView('admin-overview');
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-700 border-t-transparent rounded-full animate-spin" />
          <span>Connecting to ConstructFlow portal...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  // Handle "Read Page Aloud" based on current active view
  const handleReadCurrentPageAloud = () => {
    if (voice.isSpeaking) {
      voice.stopSpeaking();
      return;
    }

    let summary = '';
    if (isWorker) {
      summary = `Welcome ${user.name}. You are on the craft worker portal. Here you can check your assigned shift for today, review your monthly salary payslip and itemized deductions, view bonus milestones, and submit confidential reports to the anonymous voice box.`;
    } else if (isConstructor) {
      summary = `Constructor operations console for ${user.name}. Currently monitoring site team attendance, shift rosters for Day and Overnight duties, and site safety toolbox briefings.`;
    } else if (isAdmin) {
      summary = `Site administration portal. Overview displays active workforce on site, scheduled day and night shifts, pending payment slips for verification, and open anonymous worker complaints.`;
    } else {
      summary = `ConstructFlow site management portal.`;
    }

    voice.readDashboardSummary(summary);
  };

  // Determine active view to render
  const renderViewContent = () => {
    // 1. Worker
    if (isWorker) {
      return (
        <WorkerDashboard
          activeTab={
            activeView === 'shifts' || activeView === 'bonuses' || activeView === 'worker-voice' || activeView === 'my-requests'
              ? activeView
              : 'payslips'
          }
          onTabChange={(tab) => setActiveView(tab)}
        />
      );
    }

    // 2. Constructor
    if (isConstructor) {
      return (
        <ConstructorDashboard
          activeTab={activeView}
        />
      );
    }

    // 3. Super Admin specific tab
    if (isSuperAdmin && activeView === 'super-admins') {
      return <SuperAdminDashboard />;
    }

    // 4. Admin (and Super Admin general tabs)
    return (
      <AdminDashboard
        activeTab={activeView === 'dashboard' ? 'admin-overview' : activeView}
        onTabChange={(tab) => setActiveView(tab)}
      />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        onOpenVoice={() => setIsVoiceModalOpen(true)}
        onReadPageAloud={handleReadCurrentPageAloud}
        isSpeaking={voice.isSpeaking}
        activeView={activeView}
      />

      <div className="flex flex-1">
        {/* Left Sidebar */}
        <Sidebar
          activeView={activeView === 'dashboard' ? (isWorker ? 'payslips' : 'admin-overview') : activeView}
          onSelectView={(v) => setActiveView(v)}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 md:pl-64 flex flex-col min-h-[calc(100vh-4rem)]">
          {/* Mobile Top Bar Toggler */}
          <div className="md:hidden flex items-center justify-between p-3 bg-white border-b border-slate-200">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-700 p-1.5 rounded-lg border border-slate-200"
            >
              <Menu className="w-4 h-4 text-blue-700" />
              <span>Menu Navigation</span>
            </button>
            <span className="text-xs font-bold text-slate-600">
              Site #7
            </span>
          </div>

          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
            {renderViewContent()}
          </div>
        </main>
      </div>

      {/* Voice Assistant Modal */}
      <VoiceAssistantWidget
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        isListening={voice.isListening}
        isSpeaking={voice.isSpeaking}
        transcript={voice.transcript}
        assistantMessage={voice.assistantMessage}
        onStartListening={voice.startListening}
        onStopListening={voice.stopListening}
        onSpeak={voice.speakText}
        onStopSpeaking={voice.stopSpeaking}
        onRunCommand={voice.processVoiceCommand}
        recognitionSupported={voice.recognitionSupported}
      />
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </LanguageProvider>
  );
}
