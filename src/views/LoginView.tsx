import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { HardHat, Lock, Mail, Globe, Shield, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { LanguageCode } from '../types/index.ts';
import { PasswordResetModal } from '../components/PasswordResetModal.tsx';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { language, setLanguage, languages, t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const result = await login(email, password);
    if (!result.success) {
      setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      {/* Top Language Bar */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs text-xs">
        <Globe className="w-4 h-4 text-blue-700" />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as LanguageCode)}
          className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.nativeLabel} ({l.label})
            </option>
          ))}
        </select>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-blue-700 text-white shadow-md">
            <HardHat className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          ConstructFlow
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Construction Workforce & Operations Portal
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Workforce Email Address
              </label>
              <div className="mt-1 relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@constructflow.com"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="mt-1 relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Persona Switcher */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase text-center mb-3">
              One-Click Quick Access (Pre-Configured Accounts)
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('manasadevi4077@gmail.com', 'SuperAdmin@2026')}
                className="w-full flex items-center justify-between p-2 rounded-lg border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-left transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-700" />
                    Super Admin: Manasa Devi
                  </div>
                  <div className="text-[11px] text-purple-700">
                    manasadevi4077@gmail.com · Full admin creator privileges
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-900">
                  Select
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('admin.rajesh@constructflow.com', 'Admin@2026')}
                className="w-full flex items-center justify-between p-2 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-left transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-blue-900">
                    Site Admin: Rajesh Sharma
                  </div>
                  <div className="text-[11px] text-blue-700">
                    admin.rajesh@constructflow.com · Shift & salary management
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-900">
                  Select
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('constructor.vikram@constructflow.com', 'Constructor@2026')}
                className="w-full flex items-center justify-between p-2 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-left transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-amber-900">
                    Constructor Lead: Vikram Sethi
                  </div>
                  <div className="text-[11px] text-amber-700">
                    constructor.vikram@constructflow.com · Site team operations
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                  Select
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('worker.suresh@constructflow.com', 'Worker@2026')}
                className="w-full flex items-center justify-between p-2 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-left transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-emerald-900">
                    Craft Worker: Suresh Murugan (Tamil)
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    worker.suresh@constructflow.com · Welder, payslips & voice box
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                  Select
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <PasswordResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        initialEmail={email}
      />
    </div>
  );
};
