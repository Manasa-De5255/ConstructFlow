import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileSpreadsheet,
  Award,
  MessageSquareWarning,
  FileCheck2,
  ShieldCheck,
  History,
  Settings,
  ShieldAlert,
  PhoneCall,
  HardHat
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onSelectView: (view: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  isOpenMobile,
  onCloseMobile
}) => {
  const { user, isSuperAdmin, isAdmin, isConstructor, isWorker } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }

  let navItems: NavItem[] = [];

  if (isWorker) {
    navItems = [
      { id: 'profile', label: 'My Profile & Work Details', icon: LayoutDashboard },
      { id: 'shifts', label: 'My Shifts & Attendance', icon: CalendarDays },
      { id: 'payslips', label: t('paymentSlips'), icon: FileSpreadsheet },
      { id: 'bonuses', label: t('bonusSalary'), icon: Award },
      { id: 'worker-voice', label: t('workerVoice'), icon: MessageSquareWarning },
      { id: 'my-requests', label: t('myRequests'), icon: FileCheck2 }
    ];
  } else if (isConstructor) {
    navItems = [
      { id: 'constructor-roster', label: 'Team Shift Roster', icon: CalendarDays },
      { id: 'constructor-team', label: 'Authorized Team Management', icon: Users },
      { id: 'constructor-safety', label: 'Site Safety Briefings', icon: ShieldAlert },
      { id: 'team-contacts', label: 'Craft Emergency Contacts', icon: PhoneCall }
    ];
  } else if (isAdmin) {
    navItems = [
      { id: 'admin-overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'team-members', label: t('teamMembers'), icon: Users },
      { id: 'admin-shifts', label: 'Daily Shift Scheduling', icon: CalendarDays },
      { id: 'payment-slips', label: t('paymentSlips'), icon: FileSpreadsheet },
      { id: 'bonus-salary', label: t('bonusSalary'), icon: Award },
      { id: 'worker-requests', label: 'Anonymous Voice Board', icon: MessageSquareWarning },
      { id: 'audit-logs', label: t('auditLogs'), icon: History },
      { id: 'settings', label: t('settings'), icon: Settings }
    ];

    if (isSuperAdmin) {
      navItems.unshift({
        id: 'super-admins',
        label: 'Admin Authorization & Control',
        icon: ShieldCheck,
        badge: 'SUPER'
      });
    }
  }

  const handleNavClick = (id: string) => {
    onSelectView(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between`}
      >
        <div className="p-4 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            {isSuperAdmin
              ? 'Super Admin Portal'
              : isAdmin
              ? 'Site Administration'
              : isConstructor
              ? 'Constructor Management'
              : 'Worker Self-Service'}
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info box */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 space-y-1">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <HardHat className="w-3.5 h-3.5 text-blue-700" />
            <span>Site #7 - Active Portal</span>
          </div>
          <p className="leading-tight text-slate-500">
            ConstructFlow v2026.1 Formal Edition. Role-based backend security enforced.
          </p>
        </div>
      </aside>
    </>
  );
};
