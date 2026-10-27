import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  CalendarDays,
  FileSpreadsheet,
  Award,
  MessageSquareWarning,
  FileCheck2,
  Download,
  AlertTriangle,
  Clock,
  Phone,
  ThumbsUp,
  RotateCcw,
  Send,
  Eye,
  CheckCircle2,
  HelpCircle,
  FileText
} from 'lucide-react';
import {
  Shift,
  Payslip,
  BonusSalary,
  AnonymousReport,
  RequestCategory,
  MonthlyHoursSummary
} from '../types/index.ts';

interface WorkerDashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({
  activeTab,
  onTabChange
}) => {
  const { user, authFetch } = useAuth();
  const { t, language } = useLanguage();

  // State
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [todayShift, setTodayShift] = useState<Shift | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlyHoursSummary | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [bonuses, setBonuses] = useState<BonusSalary[]>([]);
  const [publicReports, setPublicReports] = useState<AnonymousReport[]>([]);
  const [loading, setLoading] = useState(false);

  // Payslip Filter
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [activePayslipModal, setActivePayslipModal] = useState<Payslip | null>(null);

  // Anonymous Voice Form
  const [reportCategory, setReportCategory] = useState<RequestCategory>('Safety concerns');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportAttachment, setReportAttachment] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [lastSubmissionReceipt, setLastSubmissionReceipt] = useState<{
    requestId: string;
    claimKey: string;
  } | null>(null);

  // Private Claim Tracker
  const [claimLookupId, setClaimLookupId] = useState('');
  const [claimLookupKey, setClaimLookupKey] = useState('');
  const [trackedReport, setTrackedReport] = useState<AnonymousReport | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [reopenNote, setReopenNote] = useState('');
  const [reopening, setReopening] = useState(false);
  const [reopenSuccess, setReopenSuccess] = useState(false);

  // Local storage of user's own claim keys for easy convenience
  const [savedClaims, setSavedClaims] = useState<Array<{ id: string; key: string; date: string }>>(() => {
    try {
      const stored = localStorage.getItem('cf_saved_claims');
      return stored ? JSON.parse(stored) : [
        { id: 'REQ-2026-8821', key: 'CLAIM-SAFE-8821', date: '2026-10-24' },
        { id: 'REQ-2026-7290', key: 'CLAIM-SAL-7290', date: '2026-10-25' }
      ];
    } catch {
      return [];
    }
  });

  const saveClaimReceipt = (id: string, key: string) => {
    const updated = [{ id, key, date: new Date().toISOString().split('T')[0] }, ...savedClaims];
    setSavedClaims(updated);
    localStorage.setItem('cf_saved_claims', JSON.stringify(updated));
  };

  // Fetch Worker Data
  useEffect(() => {
    if (!user) return;
    fetchWorkerData();
  }, [user, selectedMonth]);

  const fetchWorkerData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Shifts for today and monthly summary
      const [shiftRes, summaryRes, payRes, bonusRes, reportRes] = await Promise.all([
        authFetch(`/api/shifts?date=${today}`),
        authFetch(`/api/shifts/monthly-summary?workerId=${user?.id}&month=${selectedMonth}`),
        authFetch(`/api/payslips`),
        authFetch(`/api/bonuses`),
        authFetch(`/api/anonymous-reports`)
      ]);

      if (shiftRes.ok) {
        const sData = await shiftRes.json();
        const mine = (sData.shifts || []).find((s: Shift) => s.workerId === user?.id);
        setTodayShift(mine || null);
        setShifts(sData.shifts || []);
      }

      if (summaryRes.ok) {
        const smData = await summaryRes.json();
        setMonthlySummary(smData);
      }

      if (payRes.ok) {
        const pData = await payRes.json();
        setPayslips(pData.payslips || []);
      }

      if (bonusRes.ok) {
        const bData = await bonusRes.json();
        setBonuses(bData.bonuses || []);
      }

      if (reportRes.ok) {
        const rData = await reportRes.json();
        setPublicReports(rData.reports || []);
      }
    } catch (e) {
      console.error('Error fetching worker data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Submit Anonymous Report
  const handleAnonymousSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle.trim() || !reportDescription.trim()) return;

    setSubmittingReport(true);
    try {
      const res = await fetch('/api/anonymous-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: reportCategory,
          title: reportTitle.trim(),
          description: reportDescription.trim(),
          attachmentUrl: reportAttachment
        })
      });

      const data = await res.json();
      if (res.ok) {
        setLastSubmissionReceipt({
          requestId: data.requestId,
          claimKey: data.claimKey
        });
        saveClaimReceipt(data.requestId, data.claimKey);
        setReportTitle('');
        setReportDescription('');
        setReportAttachment('');
        // refresh public reports
        const rRes = await authFetch('/api/anonymous-reports');
        if (rRes.ok) {
          const rData = await rRes.json();
          setPublicReports(rData.reports || []);
        }
      } else {
        alert(data.error || 'Failed to submit report');
      }
    } catch {
      alert('Network error submitting anonymous report');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Vote on Community Report ("I face this problem too")
  const handleVote = async (reportId: string) => {
    try {
      const res = await authFetch(`/api/anonymous-reports/${reportId}/vote`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setPublicReports(prev =>
          prev.map(r => (r.id === reportId ? { ...r, voteCount: data.voteCount } : r))
        );
      } else {
        alert(data.error || 'Could not register vote');
      }
    } catch {
      alert('Failed to register vote');
    }
  };

  // Look up Private Report Status
  const handleLookupReport = async (reqId: string, cKey: string) => {
    setLookupError('');
    setReopenSuccess(false);
    try {
      const res = await fetch('/api/anonymous-reports/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: reqId, claimKey: cKey })
      });
      const data = await res.json();
      if (res.ok) {
        setTrackedReport(data.report);
      } else {
        setTrackedReport(null);
        setLookupError(data.error || 'Invalid Request ID or Secret Claim Key');
      }
    } catch {
      setLookupError('Network error checking report status');
    }
  };

  // Reopen Report ("Still happening — reopen request")
  const handleReopenReport = async () => {
    if (!trackedReport || !claimLookupKey) return;
    setReopening(true);
    try {
      const res = await fetch(`/api/anonymous-reports/${trackedReport.id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimKey: claimLookupKey,
          reopenReason: reopenNote
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTrackedReport(data.report);
        setReopenSuccess(true);
        setReopenNote('');
      } else {
        alert(data.error || 'Failed to reopen report');
      }
    } catch {
      alert('Error reopening report');
    } finally {
      setReopening(false);
    }
  };

  // Status Styling Helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'credited':
        return <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">Credited to Bank</span>;
      case 'pending':
        return <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200">Payment Pending</span>;
      case 'uploaded':
        return <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-blue-200">Slip Uploaded</span>;
      case 'under_review':
        return <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-purple-200">Under Review</span>;
      case 'resolved':
        return <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">Resolved</span>;
      case 'in_progress':
        return <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-blue-200">In Progress</span>;
      case 'reopened':
        return <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-red-200">Reopened</span>;
      default:
        return <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP PROFILE & TODAY'S SHIFT BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Worker Profile Card */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Worker Profile
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Active Craftsman
            </span>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{user?.name}</h2>
            <p className="text-xs text-slate-500 font-medium">{user?.jobRole} · {user?.team}</p>
          </div>
          <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Contact: {user?.phone || 'Not recorded'}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Emergency: {user?.emergencyContact.name} ({user?.emergencyContact.relation}) - {user?.emergencyContact.phone}</span>
            </div>
          </div>
        </div>

        {/* Today's Shift Card */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Today's Scheduled Shift
            </span>
            <CalendarDays className="w-4 h-4 text-blue-600" />
          </div>

          {todayShift ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900">
                  {todayShift.shiftType === 'day'
                    ? t('dayShift')
                    : todayShift.shiftType === 'night'
                    ? t('nightShift')
                    : todayShift.shiftType === 'off'
                    ? t('dayOff')
                    : t('notAssigned')}
                </span>
                {todayShift.isOvernight && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                    OVERNIGHT
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {todayShift.startTime} - {todayShift.endTime} ({todayShift.hours} hrs)
                </span>
              </div>
              {todayShift.notes && (
                <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="font-semibold text-slate-700">Site Assignment:</span> {todayShift.notes}
                </p>
              )}
            </div>
          ) : (
            <div className="py-2">
              <p className="text-sm font-semibold text-slate-700">No shift assigned for today</p>
              <p className="text-xs text-slate-400 mt-0.5">Please check with your Site Constructor lead.</p>
            </div>
          )}
        </div>

        {/* Monthly Hours & Limit Warnings */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Monthly Shift Hours
            </span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {monthlySummary?.totalHours || 0}
              </span>
              <span className="text-xs text-slate-500">
                / {monthlySummary?.maxLimit || 208} maximum limit
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled shifts in {selectedMonth}: {monthlySummary?.shiftCount || 0} shifts
            </p>
          </div>

          {/* Warning Banner if exceeded or near limit */}
          {monthlySummary?.isOverLimit ? (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Over Limit:</span> Exceeds 208 monthly hours. Admin notified to restrict overtime for safety.
              </div>
            </div>
          ) : monthlySummary?.isWarning ? (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Warning:</span> Approaching maximum shift cap (within 16 hours).
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-100 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Shift schedule within comfortable legal compliance limits.</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. TABBED CONTENT: PAYSLIPS, BONUSES, ANONYMOUS VOICE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => onTabChange('payslips')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'payslips'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('paymentSlips')}</span>
          </button>

          <button
            onClick={() => onTabChange('bonuses')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'bonuses'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>{t('bonusSalary')}</span>
          </button>

          <button
            onClick={() => onTabChange('worker-voice')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'worker-voice'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageSquareWarning className="w-4 h-4" />
            <span>{t('workerVoice')}</span>
          </button>

          <button
            onClick={() => onTabChange('my-requests')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'my-requests'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>{t('myRequests')}</span>
          </button>
        </div>

        {/* TAB 1: MONTHLY PAYMENT SLIPS */}
        {activeTab === 'payslips' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Monthly Payment Slips & History
                </h3>
                <p className="text-xs text-slate-500">
                  Review itemized earnings, allowances, deductions, and payment statuses.
                </p>
              </div>

              {/* Month selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600">Filter Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                >
                  <option value="2026-10">October 2026</option>
                  <option value="2026-09">September 2026</option>
                  <option value="2026-08">August 2026</option>
                </select>
              </div>
            </div>

            {payslips.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No payslip records found for this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">{t('salaryMonth')}</th>
                      <th className="py-3 px-4 font-semibold text-right">{t('basicSalary')}</th>
                      <th className="py-3 px-4 font-semibold text-right">{t('overtimePay')}</th>
                      <th className="py-3 px-4 font-semibold text-right">{t('allowances')}</th>
                      <th className="py-3 px-4 font-semibold text-right">{t('deductions')}</th>
                      <th className="py-3 px-4 font-semibold text-right">{t('netSalary')}</th>
                      <th className="py-3 px-4 font-semibold text-center">{t('status')}</th>
                      <th className="py-3 px-4 font-semibold text-center">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payslips.map((slip) => (
                      <tr key={slip.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {slip.monthName}
                          <div className="text-[11px] font-normal text-slate-400 font-mono">
                            {slip.id}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                          ₹{slip.basicSalary.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                          ₹{slip.overtimePay.toLocaleString()}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            ({slip.overtimeHours}h OT)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                          ₹{slip.allowances.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-red-600">
                          -₹{slip.deductions.total.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900 text-sm">
                          ₹{slip.netSalary.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {getStatusBadge(slip.paymentStatus)}
                          {slip.paymentDate && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Credited: {slip.paymentDate}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setActivePayslipModal(slip)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-semibold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View / Download</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BONUS SALARY */}
        {activeTab === 'bonuses' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bonus Salary & Performance Awards
              </h3>
              <p className="text-xs text-slate-500">
                Official bonus disbursements, festive incentives, and safety milestone awards.
              </p>
            </div>

            {bonuses.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No bonus records for your account yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bonuses.map((b) => (
                  <div
                    key={b.id}
                    className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                        {b.period}
                      </span>
                      {getStatusBadge(b.paymentStatus)}
                    </div>
                    <div>
                      <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
                        ₹{b.bonusAmount.toLocaleString()}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        {b.reason}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-200">
                      <span>Date: {b.date}</span>
                      {b.documentName && (
                        <span className="flex items-center gap-1 text-blue-700 font-semibold cursor-pointer hover:underline">
                          <FileText className="w-3.5 h-3.5" />
                          {b.documentName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ANONYMOUS WORKER VOICE BOX */}
        {activeTab === 'worker-voice' && (
          <div className="p-6 space-y-8">
            {/* Anonymity Banner */}
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <MessageSquareWarning className="w-4 h-4 text-blue-700" />
                <span>{t('anonymousBoxTitle')}</span>
              </div>
              <p className="text-xs text-blue-950 leading-relaxed">
                {t('anonymousNotice')}
              </p>
            </div>

            {/* Submission Form */}
            <form onSubmit={handleAnonymousSubmit} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('category')} *
                  </label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value as RequestCategory)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-medium"
                  >
                    <option value="Salary problems">Salary problems</option>
                    <option value="Excessive shifts">Excessive shifts</option>
                    <option value="Safety concerns">Safety concerns (Urgent Priority)</option>
                    <option value="Facilities problems">Facilities problems</option>
                    <option value="Unfair treatment">Unfair treatment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('title')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="e.g. Scaffolding loose on Level 4 or Missing overtime pay"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('description')} *
                </label>
                <textarea
                  required
                  rows={4}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Provide objective facts, specific location on site, and what needs fixing. Do not mention your own name or badge number."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Optional Photo or Document Description URL
                </label>
                <input
                  type="text"
                  value={reportAttachment}
                  onChange={(e) => setReportAttachment(e.target.value)}
                  placeholder="e.g. photo_scaffold_junction_sector4.jpg or leave blank"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReport}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>{submittingReport ? 'Submitting Anonymously...' : t('submitReport')}</span>
              </button>
            </form>

            {/* Success Receipt Modal Banner */}
            {lastSubmissionReceipt && (
              <div className="p-5 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Report Successfully Submitted 100% Anonymously!</span>
                </div>
                <p className="text-xs text-emerald-800">
                  {t('claimSecretInfo')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white border border-emerald-200 rounded-lg">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Random Request ID
                    </span>
                    <div className="font-mono text-sm font-bold text-slate-900">
                      {lastSubmissionReceipt.requestId}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Secret Claim Code
                    </span>
                    <div className="font-mono text-sm font-bold text-emerald-700">
                      {lastSubmissionReceipt.claimKey}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Community Issues & "I Face This Problem Too" Voting */}
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Community Workplace Issues & Voting
                  </h4>
                  <p className="text-xs text-slate-500">
                    Vote to elevate collective site concerns. Voter identity is never recorded.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {publicReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {report.category}
                      </span>
                      {getStatusBadge(report.status)}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">
                        {report.title}
                      </h5>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-3">
                        {report.description}
                      </p>
                    </div>

                    {report.adminUpdates.length > 0 && (
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-700 space-y-1">
                        <span className="font-bold text-blue-800">Latest Action:</span>
                        <p>{report.adminUpdates[report.adminUpdates.length - 1].updateText}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleVote(report.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{t('voteProblem')}</span>
                        <span className="ml-1 px-1.5 py-0.2 bg-white rounded font-mono tabular-nums font-bold">
                          {report.voteCount}
                        </span>
                      </button>

                      <span className="text-[11px] text-slate-400 font-mono">
                        {report.id}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MY ANONYMOUS REQUESTS & CLAIM TRACKER */}
        {activeTab === 'my-requests' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Track My Anonymous Report by Claim Key
              </h3>
              <p className="text-xs text-slate-500">
                Enter your Request ID and Secret Claim Key to securely check triage status, review administrative progress notes, or reopen an unresolved issue.
              </p>
            </div>

            {/* Quick saved receipts helper */}
            {savedClaims.length > 0 && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700">
                  Quick Access: Your Saved Claim Receipts on this Device
                </span>
                <div className="flex flex-wrap gap-2">
                  {savedClaims.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setClaimLookupId(c.id);
                        setClaimLookupKey(c.key);
                        handleLookupReport(c.id, c.key);
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 rounded-lg text-xs font-mono text-slate-800 transition-colors shadow-2xs"
                    >
                      {c.id} ({c.key})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lookup Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Request ID
                </label>
                <input
                  type="text"
                  value={claimLookupId}
                  onChange={(e) => setClaimLookupId(e.target.value)}
                  placeholder="e.g. REQ-2026-8821"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Secret Claim Key
                </label>
                <input
                  type="text"
                  value={claimLookupKey}
                  onChange={(e) => setClaimLookupKey(e.target.value)}
                  placeholder="e.g. CLAIM-SAFE-8821"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  onClick={() => handleLookupReport(claimLookupId, claimLookupKey)}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs"
                >
                  Verify Key & Check Status
                </button>
              </div>
            </div>

            {lookupError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {lookupError}
              </div>
            )}

            {/* Tracked Report Detail */}
            {trackedReport && (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {trackedReport.id}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                      {trackedReport.category}
                    </span>
                  </div>
                  {getStatusBadge(trackedReport.status)}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {trackedReport.title}
                  </h4>
                  <p className="text-xs text-slate-700 mt-1">
                    {trackedReport.description}
                  </p>
                </div>

                {/* Administrative Progress Updates */}
                <div className="space-y-2 pt-3 border-t border-slate-200">
                  <h5 className="text-xs font-bold text-slate-900">
                    Administrative Actions & Timeline
                  </h5>
                  {trackedReport.adminUpdates.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Report is queued for site management triage.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {trackedReport.adminUpdates.map((u, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                            <span className="font-semibold text-blue-700">{u.updatedByRole}</span>
                            <span>{new Date(u.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-800">{u.updateText}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reopen Action */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">
                        {t('stillHappening')}
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        If the issue has recurred or was not resolved properly, reopen it for priority action.
                      </p>
                    </div>
                  </div>

                  {reopenSuccess ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                      {t('reopenSuccess')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={reopenNote}
                        onChange={(e) => setReopenNote(e.target.value)}
                        placeholder="Explain why the problem is still occurring..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                      <button
                        onClick={handleReopenReport}
                        disabled={reopening}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{reopening ? 'Reopening...' : t('stillHappening')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. FORMAL PAYSLIP MODAL / RECEIPT PRINT PREVIEW */}
      {activePayslipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-700 text-white">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-200" />
                <h3 className="text-sm font-bold">
                  Official Salary Payslip — {activePayslipModal.monthName}
                </h3>
              </div>
              <button
                onClick={() => setActivePayslipModal(null)}
                className="p-1 hover:bg-blue-800 rounded text-blue-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto print:p-0">
              {/* Employer / Worker Header */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-200">
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    ConstructFlow Infrastructure Pvt Ltd
                  </h4>
                  <p className="text-xs text-slate-500">Grand Central Construction Project #7</p>
                  <p className="text-xs text-slate-500">Site Registration: CF-BLR-2026-SITE7</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-700">
                    ID: {activePayslipModal.id}
                  </div>
                  <div className="mt-1">
                    {getStatusBadge(activePayslipModal.paymentStatus)}
                  </div>
                  {activePayslipModal.paymentDate && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      Credited: {activePayslipModal.paymentDate}
                    </div>
                  )}
                </div>
              </div>

              {/* Employee Summary */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Employee Name</span>
                  <div className="font-semibold text-slate-900">{user?.name}</div>
                  <div className="text-slate-500">{user?.jobRole} ({user?.team})</div>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Worker ID</span>
                  <div className="font-mono text-slate-800">{user?.id}</div>
                  <div className="text-slate-500">Pay Period: {activePayslipModal.monthName}</div>
                </div>
              </div>

              {/* Itemized Salary Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Earnings */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-1">
                    Earnings & Allowances
                  </h5>
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-slate-600">Basic Monthly Wage</span>
                    <span className="font-mono font-semibold">₹{activePayslipModal.basicSalary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-slate-600">Overtime Pay ({activePayslipModal.overtimeHours} hrs)</span>
                    <span className="font-mono font-semibold">₹{activePayslipModal.overtimePay.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-slate-600">Site & Tool Allowances</span>
                    <span className="font-mono font-semibold">₹{activePayslipModal.allowances.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 font-bold border-t pt-2 text-slate-900">
                    <span>Total Gross Earnings</span>
                    <span className="font-mono">
                      ₹{(activePayslipModal.basicSalary + activePayslipModal.overtimePay + activePayslipModal.allowances).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Itemized Deductions */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-1">
                    Itemized Deductions
                  </h5>
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-slate-600">Income Tax (TDS)</span>
                    <span className="font-mono text-red-600">₹{activePayslipModal.deductions.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-slate-600">Provident Fund (EPF)</span>
                    <span className="font-mono text-red-600">₹{activePayslipModal.deductions.epf.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-slate-600">Site Medical & Insurance</span>
                    <span className="font-mono text-red-600">₹{activePayslipModal.deductions.healthInsurance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-slate-600">Advance Salary Recovery</span>
                    <span className="font-mono text-red-600">₹{activePayslipModal.deductions.advanceRecovery.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 font-bold border-t pt-2 text-slate-900">
                    <span>Total Deductions</span>
                    <span className="font-mono text-red-600">
                      -₹{activePayslipModal.deductions.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Payable Salary Highlight */}
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                    Net Take-Home Salary
                  </span>
                  <p className="text-[11px] text-blue-700">Bank direct electronic transfer</p>
                </div>
                <div className="text-xl font-bold font-mono text-blue-900">
                  ₹{activePayslipModal.netSalary.toLocaleString()}
                </div>
              </div>

              {/* Audit trail snippet */}
              <div className="text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-slate-600">Audit Verification:</span>
                {activePayslipModal.auditTrail.map((a, idx) => (
                  <div key={idx}>
                    {new Date(a.timestamp).toLocaleDateString()}: {a.changes}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 px-6 py-3 bg-slate-100 border-t border-slate-200">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print / Save as PDF</span>
              </button>
              <button
                onClick={() => setActivePayslipModal(null)}
                className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-200 text-xs font-medium rounded-lg border border-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
