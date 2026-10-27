import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  Users,
  CalendarDays,
  FileSpreadsheet,
  Award,
  MessageSquareWarning,
  History,
  Settings,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UploadCloud,
  FileText,
  Shield,
  Edit,
  UserX,
  UserCheck,
  Send,
  Eye,
  Phone
} from 'lucide-react';
import {
  User,
  Shift,
  Payslip,
  BonusSalary,
  AnonymousReport,
  AuditLog,
  ShiftType,
  PaymentStatus,
  RequestStatus,
  RequestPriority
} from '../types/index.ts';

interface AdminDashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  activeTab,
  onTabChange
}) => {
  const { user, authFetch, isSuperAdmin } = useAuth();
  const { t } = useLanguage();

  // Primary Data
  const [members, setMembers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [bonuses, setBonuses] = useState<BonusSalary[]>([]);
  const [reports, setReports] = useState<AnonymousReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState({ maxMonthlyShiftHours: 208, siteName: '' });
  const [loading, setLoading] = useState(false);

  // Shift Scheduling State
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shiftWorkerId, setShiftWorkerId] = useState('');
  const [shiftType, setShiftType] = useState<ShiftType>('day');
  const [shiftStartTime, setShiftStartTime] = useState('08:00');
  const [shiftEndTime, setShiftEndTime] = useState('17:00');
  const [shiftHours, setShiftHours] = useState(9);
  const [shiftOvernight, setShiftOvernight] = useState(false);
  const [shiftNotes, setShiftNotes] = useState('');
  const [shiftWarningMsg, setShiftWarningMsg] = useState<string | null>(null);

  // Team Member Add/Edit State
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [memberForm, setMemberForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'worker' as 'worker' | 'constructor',
    team: 'Structural Concrete & Civil',
    jobRole: '',
    phone: '',
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
    hourlyRate: 260
  });

  // Payslip Creation / Edit State
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [editingSlip, setEditingSlip] = useState<Payslip | null>(null);
  const [payslipForm, setPayslipForm] = useState({
    workerId: '',
    month: '2026-10',
    basicSalary: 45000,
    overtimeHours: 20,
    overtimePay: 6500,
    allowances: 3500,
    tax: 2200,
    epf: 3600,
    healthInsurance: 950,
    advanceRecovery: 0,
    paymentStatus: 'uploaded' as PaymentStatus,
    slipFileName: '',
    slipFileUrl: ''
  });

  // Bonus Salary Creation State
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusForm, setBonusForm] = useState({
    workerId: '',
    bonusAmount: 10000,
    period: 'Q3 2026 / Safety Award',
    reason: 'Zero incident record during structural crane lifting',
    paymentStatus: 'pending' as 'pending' | 'credited' | 'under_review',
    documentName: 'safety_award_authorization.pdf'
  });

  // Anonymous Report Triage Modal
  const [selectedReport, setSelectedReport] = useState<AnonymousReport | null>(null);
  const [triageStatus, setTriageStatus] = useState<RequestStatus>('in_progress');
  const [triagePriority, setTriagePriority] = useState<RequestPriority>('normal');
  const [triageTeam, setTriageTeam] = useState('');
  const [triageProgressNote, setTriageProgressNote] = useState('');
  const [triageResolution, setTriageResolution] = useState('');

  // Search & Filter
  const [searchMember, setSearchMember] = useState('');

  useEffect(() => {
    fetchAllAdminData();
  }, [selectedDate]);

  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      const [membersRes, shiftsRes, payslipsRes, bonusesRes, reportsRes, auditRes, settingsRes] =
        await Promise.all([
          authFetch('/api/team'),
          authFetch(`/api/shifts?date=${selectedDate}`),
          authFetch('/api/payslips'),
          authFetch('/api/bonuses'),
          authFetch('/api/anonymous-reports'),
          authFetch('/api/audit-logs'),
          authFetch('/api/settings')
        ]);

      if (membersRes.ok) setMembers((await membersRes.json()).members || []);
      if (shiftsRes.ok) setShifts((await shiftsRes.json()).shifts || []);
      if (payslipsRes.ok) setPayslips((await payslipsRes.json()).payslips || []);
      if (bonusesRes.ok) setBonuses((await bonusesRes.json()).bonuses || []);
      if (reportsRes.ok) setReports((await reportsRes.json()).reports || []);
      if (auditRes.ok) setAuditLogs((await auditRes.json()).logs || []);
      if (settingsRes.ok) setSettings(await settingsRes.json());
    } catch (e) {
      console.error('Error loading admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  // 1. Assign Shift Handler
  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftWorkerId) return;

    setShiftWarningMsg(null);
    try {
      const res = await authFetch('/api/shifts', {
        method: 'POST',
        body: JSON.stringify({
          workerId: shiftWorkerId,
          date: selectedDate,
          shiftType,
          startTime: shiftStartTime,
          endTime: shiftEndTime,
          hours: Number(shiftHours),
          isOvernight: shiftOvernight,
          notes: shiftNotes
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.warning) {
          setShiftWarningMsg(data.warning);
        } else {
          alert('Shift successfully assigned.');
        }
        // Refresh shifts
        const sRes = await authFetch(`/api/shifts?date=${selectedDate}`);
        if (sRes.ok) setShifts((await sRes.json()).shifts || []);
      } else {
        alert(data.error || 'Failed to assign shift');
      }
    } catch {
      alert('Network error assigning shift');
    }
  };

  // Quick Shift Preset change
  const handleShiftTypePreset = (type: ShiftType) => {
    setShiftType(type);
    if (type === 'day') {
      setShiftStartTime('08:00');
      setShiftEndTime('17:00');
      setShiftHours(9);
      setShiftOvernight(false);
    } else if (type === 'night') {
      setShiftStartTime('20:00');
      setShiftEndTime('05:00');
      setShiftHours(9);
      setShiftOvernight(true);
    } else {
      setShiftStartTime('00:00');
      setShiftEndTime('00:00');
      setShiftHours(0);
      setShiftOvernight(false);
    }
  };

  // 2. Member Add/Edit Handler
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: memberForm.name,
        email: memberForm.email,
        password: memberForm.password || 'Worker@2026',
        role: memberForm.role,
        team: memberForm.team,
        jobRole: memberForm.jobRole,
        phone: memberForm.phone,
        hourlyRate: memberForm.hourlyRate,
        emergencyContact: {
          name: memberForm.emergencyName,
          relation: memberForm.emergencyRelation,
          phone: memberForm.emergencyPhone
        }
      };

      let res;
      if (editingMember) {
        res = await authFetch(`/api/team/${editingMember.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        res = await authFetch('/api/team', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (res.ok) {
        setShowMemberModal(false);
        setEditingMember(null);
        // refresh members
        const mRes = await authFetch('/api/team');
        if (mRes.ok) setMembers((await mRes.json()).members || []);
      } else {
        alert(data.error || 'Failed to save member');
      }
    } catch {
      alert('Network error saving member');
    }
  };

  // Toggle Member Status (Deactivate / Activate)
  const handleToggleMemberStatus = async (member: User) => {
    const nextStatus = member.status === 'active' ? 'inactive' : 'active';
    const confirmMsg = `Are you sure you want to ${nextStatus === 'inactive' ? 'deactivate' : 'activate'} ${member.name}?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await authFetch(`/api/team/${member.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setMembers(prev =>
          prev.map(m => (m.id === member.id ? { ...m, status: nextStatus } : m))
        );
      }
    } catch {
      alert('Error changing status');
    }
  };

  // 3. Payslip Creation & Status Update
  const handleSavePayslip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payslipForm.workerId) return;

    try {
      const payload = {
        workerId: payslipForm.workerId,
        month: payslipForm.month,
        basicSalary: Number(payslipForm.basicSalary),
        overtimeHours: Number(payslipForm.overtimeHours),
        overtimePay: Number(payslipForm.overtimePay),
        allowances: Number(payslipForm.allowances),
        deductions: {
          tax: Number(payslipForm.tax),
          epf: Number(payslipForm.epf),
          healthInsurance: Number(payslipForm.healthInsurance),
          advanceRecovery: Number(payslipForm.advanceRecovery)
        },
        paymentStatus: payslipForm.paymentStatus,
        slipFileName: payslipForm.slipFileName || `payslip_${payslipForm.month}.pdf`
      };

      let res;
      if (editingSlip) {
        res = await authFetch(`/api/payslips/${editingSlip.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        res = await authFetch('/api/payslips', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setShowPayslipModal(false);
        setEditingSlip(null);
        // refresh slips
        const pRes = await authFetch('/api/payslips');
        if (pRes.ok) setPayslips((await pRes.json()).payslips || []);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save payslip');
      }
    } catch {
      alert('Network error saving payslip');
    }
  };

  // Change Payslip Status
  const handleUpdateSlipStatus = async (slipId: string, newStatus: PaymentStatus) => {
    const reasonNote = prompt(`Please enter a verification note for status change to "${newStatus}":`) || '';
    try {
      const res = await authFetch(`/api/payslips/${slipId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ paymentStatus: newStatus, reasonNote })
      });
      if (res.ok) {
        const data = await res.json();
        setPayslips(prev => prev.map(p => (p.id === slipId ? data.payslip : p)));
      } else {
        alert('Failed to update status');
      }
    } catch {
      alert('Error updating payslip status');
    }
  };

  // 4. Bonus Creation
  const handleSaveBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bonusForm.workerId) return;

    try {
      const res = await authFetch('/api/bonuses', {
        method: 'POST',
        body: JSON.stringify(bonusForm)
      });
      if (res.ok) {
        setShowBonusModal(false);
        const bRes = await authFetch('/api/bonuses');
        if (bRes.ok) setBonuses((await bRes.json()).bonuses || []);
      }
    } catch {
      alert('Failed to save bonus');
    }
  };

  // 5. Triage Anonymous Report
  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    try {
      const res = await authFetch(`/api/anonymous-reports/${selectedReport.id}/triage`, {
        method: 'PUT',
        body: JSON.stringify({
          status: triageStatus,
          priority: triagePriority,
          assignedTeam: triageTeam,
          progressNote: triageProgressNote,
          resolutionDetails: triageResolution
        })
      });

      if (res.ok) {
        const data = await res.json();
        setReports(prev => prev.map(r => (r.id === selectedReport.id ? data.report : r)));
        setSelectedReport(null);
        setTriageProgressNote('');
      } else {
        alert('Failed to triage report');
      }
    } catch {
      alert('Error triaging report');
    }
  };

  // 6. Update Monthly Shift Hour Limit in Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert('Monthly shift hour limit updated successfully.');
      }
    } catch {
      alert('Failed to update settings');
    }
  };

  // Filtered members for table
  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchMember.toLowerCase()) ||
    m.jobRole.toLowerCase().includes(searchMember.toLowerCase()) ||
    m.team.toLowerCase().includes(searchMember.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Overview Metrics Header */}
      {activeTab === 'admin-overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Active Workers on Site</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {members.filter(m => m.status === 'active' && m.role === 'worker').length}
              </div>
              <p className="text-[11px] text-slate-500">
                Total roster: {members.length} personnel
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Scheduled Today</span>
                <CalendarDays className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {shifts.filter(s => s.shiftType === 'day' || s.shiftType === 'night').length}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>Day: {shifts.filter(s => s.shiftType === 'day').length}</span>
                <span>·</span>
                <span>Night: {shifts.filter(s => s.shiftType === 'night').length}</span>
              </div>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Pending Payslips</span>
                <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-amber-700">
                {payslips.filter(p => p.paymentStatus === 'pending' || p.paymentStatus === 'uploaded').length}
              </div>
              <p className="text-[11px] text-slate-500">
                {payslips.filter(p => p.paymentStatus === 'credited').length} credited to bank
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Open Worker Reports</span>
                <MessageSquareWarning className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {reports.filter(r => r.status !== 'resolved' && r.status !== 'closed').length}
              </div>
              <p className="text-[11px] text-red-600 font-semibold">
                {reports.filter(r => r.priority === 'urgent').length} Urgent Safety Issues
              </p>
            </div>
          </div>

          {/* Quick Roster Snapshot */}
          <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Quick Administration Actions
                </h3>
                <p className="text-xs text-slate-500">
                  Direct navigation to key operational consoles.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => onTabChange('admin-shifts')}
                className="p-4 rounded-lg border border-slate-200 hover:border-blue-400 text-left bg-slate-50/50 hover:bg-blue-50/40 transition-colors"
              >
                <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-blue-700" />
                  Assign & Schedule Shifts
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Manage Day, Night, and Overnight shifts with monthly hour limit alerts.
                </div>
              </button>

              <button
                onClick={() => onTabChange('payment-slips')}
                className="p-4 rounded-lg border border-slate-200 hover:border-blue-400 text-left bg-slate-50/50 hover:bg-blue-50/40 transition-colors"
              >
                <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                  Upload & Review Payslips
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Itemized deductions, bonus salaries, and bank credit status updates.
                </div>
              </button>

              <button
                onClick={() => onTabChange('worker-requests')}
                className="p-4 rounded-lg border border-slate-200 hover:border-blue-400 text-left bg-slate-50/50 hover:bg-blue-50/40 transition-colors"
              >
                <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                  <MessageSquareWarning className="w-4 h-4 text-blue-700" />
                  Triage Anonymous Voice
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Review worker complaints, vote tallies, and post resolution updates.
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: DAILY SHIFT SCHEDULING WITH MONTHLY HOUR WARNINGS */}
      {activeTab === 'admin-shifts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Daily Shift Assignment & Scheduling
              </h3>
              <p className="text-xs text-slate-500">
                Assign Day, Night, and Overnight shifts. The engine calculates accumulated hours and warns against exceeding the {settings.maxMonthlyShiftHours}h monthly limit.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Select Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
              />
            </div>
          </div>

          {/* Shift Assignment Form */}
          <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Assign or Modify Shift for {selectedDate}
            </h4>

            {shiftWarningMsg && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{shiftWarningMsg}</span>
              </div>
            )}

            <form onSubmit={handleAssignShift} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Worker *
                  </label>
                  <select
                    required
                    value={shiftWorkerId}
                    onChange={(e) => setShiftWorkerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-medium"
                  >
                    <option value="">-- Choose Craftsman --</option>
                    {members
                      .filter(m => m.role === 'worker' && m.status === 'active')
                      .map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.jobRole} · {w.team})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shift Type *
                  </label>
                  <select
                    value={shiftType}
                    onChange={(e) => handleShiftTypePreset(e.target.value as ShiftType)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-medium"
                  >
                    <option value="day">{t('dayShift')} (08:00 - 17:00)</option>
                    <option value="night">{t('nightShift')} (20:00 - 05:00)</option>
                    <option value="off">{t('dayOff')}</option>
                    <option value="unassigned">{t('notAssigned')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shift Duration (Hours)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={shiftHours}
                    onChange={(e) => setShiftHours(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('startTime')}
                  </label>
                  <input
                    type="time"
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('endTime')}
                  </label>
                  <input
                    type="time"
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={shiftOvernight}
                      onChange={(e) => setShiftOvernight(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>Is Overnight Shift (Spans next day)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specific Site Task / Sector Notes
                </label>
                <input
                  type="text"
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="e.g. Tower B core reinforcement welding, Level 4 formwork assembly"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                Save Shift Assignment
              </button>
            </form>
          </div>

          {/* Current Shifts Roster Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Assigned Shifts on {selectedDate}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {shifts.length} Recorded Shifts
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/60 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Worker</th>
                    <th className="py-3 px-4 font-semibold">Assigned Shift</th>
                    <th className="py-3 px-4 font-semibold">Time Window</th>
                    <th className="py-3 px-4 font-semibold">Hours</th>
                    <th className="py-3 px-4 font-semibold">Sector Notes</th>
                    <th className="py-3 px-4 font-semibold">Assigned By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shifts.map((s) => {
                    const worker = members.find(m => m.id === s.workerId);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {worker ? worker.name : s.workerId}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {worker?.jobRole}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold text-[11px] border ${
                              s.shiftType === 'day'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : s.shiftType === 'night'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {s.shiftType.toUpperCase()}
                          </span>
                          {s.isOvernight && (
                            <span className="ml-1 text-[9px] font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded">
                              OVERNIGHT
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono">
                          {s.startTime} - {s.endTime}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono tabular-nums">
                          {s.hours}h
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 italic">
                          {s.notes || 'General site duty'}
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-400">
                          {s.assignedBy}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: TEAM MEMBERS MANAGEMENT */}
      {activeTab === 'team-members' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Workforce Members & Emergency Profiles
              </h3>
              <p className="text-xs text-slate-500">
                View, register, and manage constructors and craftsmen. Sensitive compensation details are protected.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  placeholder="Search members..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-48"
                />
              </div>

              <button
                onClick={() => {
                  setEditingMember(null);
                  setMemberForm({
                    name: '',
                    email: '',
                    password: '',
                    role: 'worker',
                    team: 'Structural Concrete & Civil',
                    jobRole: '',
                    phone: '',
                    emergencyName: '',
                    emergencyRelation: '',
                    emergencyPhone: '',
                    hourlyRate: 260
                  });
                  setShowMemberModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Member</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Team & Trade</th>
                    <th className="py-3 px-4 font-semibold">Phone Contact</th>
                    <th className="py-3 px-4 font-semibold">Emergency Contact</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {m.name}
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {m.email}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            m.role === 'super_admin'
                              ? 'bg-purple-100 text-purple-800'
                              : m.role === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : m.role === 'constructor'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div>{m.jobRole}</div>
                        <span className="text-[11px] text-slate-400">{m.team}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        {m.phone || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-medium text-slate-800">
                          {m.emergencyContact.name} ({m.emergencyContact.relation})
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {m.emergencyContact.phone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            m.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {m.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingMember(m);
                              setMemberForm({
                                name: m.name,
                                email: m.email,
                                password: '',
                                role: m.role as 'worker' | 'constructor',
                                team: m.team,
                                jobRole: m.jobRole,
                                phone: m.phone,
                                emergencyName: m.emergencyContact.name,
                                emergencyRelation: m.emergencyContact.relation,
                                emergencyPhone: m.emergencyContact.phone,
                                hourlyRate: m.hourlyRate || 260
                              });
                              setShowMemberModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                            title="Edit Profile"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {m.role !== 'super_admin' && (
                            <button
                              onClick={() => handleToggleMemberStatus(m)}
                              className={`p-1.5 rounded transition-colors ${
                                m.status === 'active'
                                  ? 'text-red-500 hover:bg-red-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={m.status === 'active' ? 'Deactivate Member' : 'Activate Member'}
                            >
                              {m.status === 'active' ? (
                                <UserX className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PAYMENT SLIPS & SALARIES */}
      {activeTab === 'payment-slips' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Payment Slips & Salary Management
              </h3>
              <p className="text-xs text-slate-500">
                Upload payslip files, configure itemized deductions, and track bank crediting statuses with audit trails.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingSlip(null);
                setPayslipForm({
                  workerId: '',
                  month: '2026-10',
                  basicSalary: 45000,
                  overtimeHours: 20,
                  overtimePay: 6500,
                  allowances: 3500,
                  tax: 2200,
                  epf: 3600,
                  healthInsurance: 950,
                  advanceRecovery: 0,
                  paymentStatus: 'uploaded',
                  slipFileName: 'payslip_october_2026.pdf',
                  slipFileUrl: ''
                });
                setShowPayslipModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Create & Upload Payslip</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Worker</th>
                    <th className="py-3 px-4 font-semibold">Month</th>
                    <th className="py-3 px-4 font-semibold text-right">Basic Wage</th>
                    <th className="py-3 px-4 font-semibold text-right">Overtime</th>
                    <th className="py-3 px-4 font-semibold text-right">Deductions</th>
                    <th className="py-3 px-4 font-semibold text-right">Net Payable</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Status Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payslips.map((slip) => {
                    const worker = members.find(m => m.id === slip.workerId);
                    return (
                      <tr key={slip.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {worker?.name || slip.workerId}
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {slip.id}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {slip.monthName}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                          ₹{slip.basicSalary.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                          ₹{slip.overtimePay.toLocaleString()} ({slip.overtimeHours}h)
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-red-600">
                          -₹{slip.deductions.total.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                          ₹{slip.netSalary.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              slip.paymentStatus === 'credited'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : slip.paymentStatus === 'pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : slip.paymentStatus === 'uploaded'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {slip.paymentStatus.toUpperCase()}
                          </span>
                          {slip.paymentDate && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {slip.paymentDate}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <select
                            value={slip.paymentStatus}
                            onChange={(e) => handleUpdateSlipStatus(slip.id, e.target.value as PaymentStatus)}
                            className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-800"
                          >
                            <option value="uploaded">Slip Uploaded</option>
                            <option value="pending">Payment Pending</option>
                            <option value="credited">Payment Credited</option>
                            <option value="under_review">Under Review</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: BONUS SALARY MANAGEMENT */}
      {activeTab === 'bonus-salary' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bonus Salary & Milestone Awards
              </h3>
              <p className="text-xs text-slate-500">
                Authorize safety bonuses, festival incentives, and site milestone disbursements.
              </p>
            </div>

            <button
              onClick={() => {
                setBonusForm({
                  workerId: '',
                  bonusAmount: 12000,
                  period: 'Q3 2026 / Safety Award',
                  reason: 'Zero safety violations during height operations',
                  paymentStatus: 'pending',
                  documentName: 'bonus_memo.pdf'
                });
                setShowBonusModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record New Bonus</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bonuses.map((b) => {
              const worker = members.find(m => m.id === b.workerId);
              return (
                <div
                  key={b.id}
                  className="p-5 border border-slate-200 rounded-xl bg-white shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                      {b.period}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        b.paymentStatus === 'credited'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {b.paymentStatus}
                    </span>
                  </div>

                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {worker?.name || b.workerId}
                    </div>
                    <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                      ₹{b.bonusAmount.toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{b.reason}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                    <span>Disbursed: {b.date}</span>
                    <span className="font-mono text-[10px]">{b.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: ANONYMOUS WORKER VOICE BOARD & TRIAGE */}
      {activeTab === 'worker-requests' && (
        <div className="space-y-6">
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <h3 className="text-base font-bold text-slate-900">
              Anonymous Worker Voice Triage Board
            </h3>
            <p className="text-xs text-slate-500">
              Confidential worker reports. Submitter identities are permanently unlinked and inaccessible to all administrators by design.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className={`p-5 border rounded-xl bg-white shadow-xs space-y-3.5 ${
                  report.priority === 'urgent'
                    ? 'border-red-300 ring-1 ring-red-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {report.category}
                    </span>
                    {report.priority === 'urgent' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200 uppercase animate-pulse">
                        URGENT SAFETY
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                      report.status === 'resolved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : report.status === 'reopened'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {report.status.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {report.title}
                  </h4>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    {report.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span>Assigned: <strong className="text-slate-800">{report.assignedTeam || 'Unassigned'}</strong></span>
                  <span>Community Votes: <strong className="text-slate-900 font-mono">{report.voteCount}</strong></span>
                </div>

                {report.adminUpdates.length > 0 && (
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-slate-700">Latest Action Note:</span>
                    <p className="text-slate-600 bg-blue-50/50 p-2 rounded border border-blue-100">
                      {report.adminUpdates[report.adminUpdates.length - 1].updateText}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="font-mono text-[11px] text-slate-400">
                    {report.id}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setTriageStatus(report.status);
                      setTriagePriority(report.priority);
                      setTriageTeam(report.assignedTeam || 'Site Safety Inspection Team');
                      setTriageResolution(report.resolutionDetails || '');
                    }}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Triage & Update Progress
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: AUDIT LOGS */}
      {activeTab === 'audit-logs' && (
        <div className="space-y-6">
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <h3 className="text-base font-bold text-slate-900">
              Administrative Audit Log History
            </h3>
            <p className="text-xs text-slate-500">
              Immutable chronological record of shift assignments, payslip revisions, and administrative status alterations.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Timestamp</th>
                    <th className="py-3 px-4 font-semibold">Actor Email</th>
                    <th className="py-3 px-4 font-semibold">Action</th>
                    <th className="py-3 px-4 font-semibold">Entity Type</th>
                    <th className="py-3 px-4 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {log.actorEmail}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-blue-700 font-bold">{log.action}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {log.targetType}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-sans text-xs">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-xl p-6 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Workforce Portal Settings
          </h3>
          <p className="text-xs text-slate-500">
            Configure site-wide parameters and safety thresholds.
          </p>

          <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Maximum Monthly Shift-Hour Threshold
              </label>
              <input
                type="number"
                min={100}
                max={300}
                value={settings.maxMonthlyShiftHours}
                onChange={(e) => setSettings({ ...settings, maxMonthlyShiftHours: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                When an assigned shift pushes a worker beyond this limit, an automated safety warning banner is displayed.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Construction Site Project Name
              </label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Update Settings
            </button>
          </form>
        </div>
      )}

      {/* MODAL: ADD / EDIT MEMBER */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-700 text-white">
              <h3 className="text-sm font-bold">
                {editingMember ? 'Edit Workforce Profile' : 'Register New Team Member'}
              </h3>
              <button
                onClick={() => setShowMemberModal(false)}
                className="p-1 hover:bg-blue-800 rounded text-blue-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={memberForm.name}
                    onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={!!editingMember}
                    value={memberForm.email}
                    onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg disabled:bg-slate-100"
                  />
                </div>
              </div>

              {!editingMember && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={memberForm.password}
                    onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={memberForm.role}
                    onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="worker">Craft Worker</option>
                    <option value="constructor">Constructor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Job Role Title *</label>
                  <input
                    type="text"
                    required
                    value={memberForm.jobRole}
                    onChange={(e) => setMemberForm({ ...memberForm, jobRole: e.target.value })}
                    placeholder="e.g. Master Welder, Formwork Lead"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Team</label>
                  <input
                    type="text"
                    value={memberForm.team}
                    onChange={(e) => setMemberForm({ ...memberForm, team: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={memberForm.phone}
                    onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                    placeholder="+91 98450 ..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="text-xs font-bold text-slate-800">Emergency Contact Details</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={memberForm.emergencyName}
                    onChange={(e) => setMemberForm({ ...memberForm, emergencyName: e.target.value })}
                    className="px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Relation (e.g. Spouse)"
                    value={memberForm.emergencyRelation}
                    onChange={(e) => setMemberForm({ ...memberForm, emergencyRelation: e.target.value })}
                    className="px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Emergency Phone"
                    value={memberForm.emergencyPhone}
                    onChange={(e) => setMemberForm({ ...memberForm, emergencyPhone: e.target.value })}
                    className="px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / UPLOAD PAYSLIP */}
      {showPayslipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-700 text-white">
              <h3 className="text-sm font-bold">
                Generate & Upload Monthly Payslip
              </h3>
              <button
                onClick={() => setShowPayslipModal(false)}
                className="p-1 hover:bg-blue-800 rounded text-blue-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePayslip} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Worker *</label>
                  <select
                    required
                    value={payslipForm.workerId}
                    onChange={(e) => setPayslipForm({ ...payslipForm, workerId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Choose Craftsman --</option>
                    {members
                      .filter(m => m.role === 'worker')
                      .map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.jobRole})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Month Period *</label>
                  <select
                    value={payslipForm.month}
                    onChange={(e) => setPayslipForm({ ...payslipForm, month: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="2026-10">October 2026</option>
                    <option value="2026-09">September 2026</option>
                    <option value="2026-08">August 2026</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Basic Wage (₹)</label>
                  <input
                    type="number"
                    value={payslipForm.basicSalary}
                    onChange={(e) => setPayslipForm({ ...payslipForm, basicSalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">OT Hours</label>
                  <input
                    type="number"
                    value={payslipForm.overtimeHours}
                    onChange={(e) => setPayslipForm({ ...payslipForm, overtimeHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">OT Pay (₹)</label>
                  <input
                    type="number"
                    value={payslipForm.overtimePay}
                    onChange={(e) => setPayslipForm({ ...payslipForm, overtimePay: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="text-xs font-bold text-slate-800">Itemized Deductions</span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500">Income Tax</label>
                    <input
                      type="number"
                      value={payslipForm.tax}
                      onChange={(e) => setPayslipForm({ ...payslipForm, tax: Number(e.target.value) })}
                      className="w-full px-2 py-1 text-xs border rounded bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">EPF</label>
                    <input
                      type="number"
                      value={payslipForm.epf}
                      onChange={(e) => setPayslipForm({ ...payslipForm, epf: Number(e.target.value) })}
                      className="w-full px-2 py-1 text-xs border rounded bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Medical Ins.</label>
                    <input
                      type="number"
                      value={payslipForm.healthInsurance}
                      onChange={(e) => setPayslipForm({ ...payslipForm, healthInsurance: Number(e.target.value) })}
                      className="w-full px-2 py-1 text-xs border rounded bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Advance Rec.</label>
                    <input
                      type="number"
                      value={payslipForm.advanceRecovery}
                      onChange={(e) => setPayslipForm({ ...payslipForm, advanceRecovery: Number(e.target.value) })}
                      className="w-full px-2 py-1 text-xs border rounded bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload Payslip Document (PDF / Scan Receipt)
                </label>
                <input
                  type="text"
                  value={payslipForm.slipFileName}
                  onChange={(e) => setPayslipForm({ ...payslipForm, slipFileName: e.target.value })}
                  placeholder="e.g. payslip_october_2026_suresh.pdf"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Payment Status
                </label>
                <select
                  value={payslipForm.paymentStatus}
                  onChange={(e) => setPayslipForm({ ...payslipForm, paymentStatus: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                >
                  <option value="uploaded">Slip Uploaded (Draft / Not yet approved)</option>
                  <option value="pending">Payment Pending (Finance batch queue)</option>
                  <option value="credited">Payment Credited (Direct bank transferred)</option>
                  <option value="under_review">Under Review</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Note: Uploading a payslip does NOT mark payment as credited until bank confirmation is recorded.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowPayslipModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs"
                >
                  Save & Publish Payslip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD BONUS */}
      {showBonusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-700 text-white">
              <h3 className="text-sm font-bold">Record Bonus / Incentive</h3>
              <button
                onClick={() => setShowBonusModal(false)}
                className="p-1 hover:bg-blue-800 rounded text-blue-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBonus} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Worker *</label>
                <select
                  required
                  value={bonusForm.workerId}
                  onChange={(e) => setBonusForm({ ...bonusForm, workerId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Choose Craftsman --</option>
                  {members.filter(m => m.role === 'worker').map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bonus Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={bonusForm.bonusAmount}
                  onChange={(e) => setBonusForm({ ...bonusForm, bonusAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Period / Milestone</label>
                <input
                  type="text"
                  value={bonusForm.period}
                  onChange={(e) => setBonusForm({ ...bonusForm, period: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Award *</label>
                <textarea
                  rows={2}
                  required
                  value={bonusForm.reason}
                  onChange={(e) => setBonusForm({ ...bonusForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowBonusModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs"
                >
                  Record Bonus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRIAGE ANONYMOUS REPORT */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-700 text-white">
              <h3 className="text-sm font-bold">
                Triage Report: {selectedReport.id}
              </h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 hover:bg-blue-800 rounded text-blue-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTriageSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="font-bold text-slate-900">{selectedReport.title}</div>
                <p className="text-slate-600">{selectedReport.description}</p>
                <div className="text-[11px] text-slate-400 pt-1">
                  Category: {selectedReport.category} · Community Votes: {selectedReport.voteCount}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={triageStatus}
                    onChange={(e) => setTriageStatus(e.target.value as RequestStatus)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="reopened">Reopened</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={triagePriority}
                    onChange={(e) => setTriagePriority(e.target.value as RequestPriority)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Response Team</label>
                <input
                  type="text"
                  value={triageTeam}
                  onChange={(e) => setTriageTeam(e.target.value)}
                  placeholder="e.g. Site Safety Inspection Team, Shift HR"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Add Official Progress Update Note (Visible to Submitter via Claim Key)
                </label>
                <textarea
                  rows={3}
                  value={triageProgressNote}
                  onChange={(e) => setTriageProgressNote(e.target.value)}
                  placeholder="e.g. Inspected scaffolding at 14:00. Safety nets installed and barricaded."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Final Resolution Details (if resolved)
                </label>
                <input
                  type="text"
                  value={triageResolution}
                  onChange={(e) => setTriageResolution(e.target.value)}
                  placeholder="Permanent fix description..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs"
                >
                  Update & Publish Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
