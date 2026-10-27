import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { HardHat, LogOut, Globe, Mic, Volume2 } from 'lucide-react';
import { LanguageCode } from '../types/index.ts';

interface NavbarProps {
  onOpenVoice: () => void;
  onReadPageAloud: () => void;
  isSpeaking: boolean;
  activeView: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenVoice,
  onReadPageAloud,
  isSpeaking,
  activeView
}) => {
  const { user, logout, isSuperAdmin, isAdmin, isConstructor, isWorker } = useAuth();
  const { language, setLanguage, languages, t } = useLanguage();

  const getRoleLabel = () => {
    if (!user) return '';
    if (isSuperAdmin) return 'Super Admin';
    if (isAdmin) return 'Admin';
    if (isConstructor) return 'Constructor';
    if (isWorker) return 'Worker';
    return user.role;
  };

  const getRoleBadgeColor = () => {
    if (isSuperAdmin) return 'text-purple-700 bg-purple-50 border-purple-200';
    if (isAdmin) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (isConstructor) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 bg-white border-b border-slate-200 shadow-xs">
      {/* Brand & Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-700 text-white shadow-xs">
          <HardHat className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-slate-900">
              ConstructFlow
            </span>
            <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded border text-blue-800 bg-blue-50 border-blue-200">
              Site #7
            </span>
          </div>
          <p className="text-xs text-slate-500 hidden md:block">
            {t('appSubtitle')}
          </p>
        </div>
      </div>

      {/* Global Actions: Language Selector, Voice Buttons, and User Menu */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Multilingual Selector */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
          <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
            className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            aria-label="Select Language"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeLabel} ({l.label})
              </option>
            ))}
          </select>
        </div>

        {/* Read Page Aloud Quick Action */}
        <button
          onClick={onReadPageAloud}
          title={isSpeaking ? 'Stop Audio' : t('speakPage')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            isSpeaking
              ? 'bg-amber-500 text-white border-amber-600 animate-pulse'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          <span className="hidden sm:inline">{isSpeaking ? 'Playing...' : t('speakPage')}</span>
        </button>

        {/* Floating Voice Assistant Trigger */}
        <button
          onClick={onOpenVoice}
          title={t('voiceAssistant')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors"
        >
          <Mic className="w-4 h-4" />
          <span className="hidden sm:inline">{t('voiceAssistant')}</span>
        </button>

        {/* User Profile & Role Info */}
        {user && (
          <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="text-right hidden md:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {user.name}
              </div>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${getRoleBadgeColor()}`}>
                  {getRoleLabel()}
                </span>
                <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                  {user.team}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title={t('logout')}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
