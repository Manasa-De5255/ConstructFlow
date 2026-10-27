import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  CalendarDays,
  Users,
  ShieldAlert,
  PhoneCall,
  Clock,
  HardHat,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Shift, User, ShiftType } from '../types/index.ts';

interface ConstructorDashboardProps {
  activeTab: string;
}

export const ConstructorDashboard: React.FC<ConstructorDashboardProps> = ({ activeTab }) => {
  const { authFetch } = useAuth();
  const { t } = useLanguage();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [members, setMembers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Toolbox Talk state
  const [toolboxDate, setToolboxDate] = useState(new Date().toISOString().split('T')[0]);
  const [toolboxTopic, setToolboxTopic] = useState('Scaffolding Safety & Harness Inspections');
  const [toolboxNotes, setToolboxNotes] = useState('All scaffolders on Block B briefed on wind velocity thresholds and mandatory 100% tie-off rules.');
  const [savedToolboxTalks, setSavedToolboxTalks] = useState([
    {
      date: '2026-10-26',
      topic: 'Excavation & Shoring Inspection',
      conductor: 'Vikram Sethi (Lead Constructor)',
      attendees: 18
    },
    {
      date: '2026-10-25',
      topic: 'Working at Heights & Fall Arrest Systems',
      conductor: 'Vikram Sethi (Lead Constructor)',
      attendees: 24
    }
  ]);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [membersRes, shiftsRes] = await Promise.all([
        authFetch('/api/team'),
        authFetch(`/api/shifts?date=${selectedDate}`)
      ]);

      if (membersRes.ok) {
        const mData = await membersRes.json();
        // Constructors only manage craft workers and site constructors
        setMembers(mData.members || []);
      }

      if (shiftsRes.ok) {
        const sData = await shiftsRes.json();
        setShifts(sData.shifts || []);
      }
    } catch (e) {
      console.error('Error fetching constructor data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToolboxTalk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolboxTopic.trim()) return;
    setSavedToolboxTalks([
      {
        date: toolboxDate,
        topic: toolboxTopic,
        conductor: 'Vikram Sethi (Lead Constructor)',
        attendees: filteredMembers.length
      },
      ...savedToolboxTalks
    ]);
    alert('Daily site toolbox talk successfully registered in safety log.');
  };

  // Filter members
  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    const isWorkerOrConstructor = m.role === 'worker' || m.role === 'constructor';
    const matchesQuery =
      m.name.toLowerCase().includes(q) ||
      m.team.toLowerCase().includes(q) ||
      m.jobRole.toLowerCase().includes(q);
    return isWorkerOrConstructor && matchesQuery;
  });

  const getShiftForMember = (workerId: string): Shift | undefined => {
    return shifts.find((s) => s.workerId === workerId);
  };

  const renderShiftBadge = (shift?: Shift) => {
    if (!shift || shift.shiftType === 'unassigned') {
      return (
        <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold">
          {t('notAssigned')}
        </span>
      );
    }
    if (shift.shiftType === 'day') {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-blue-200">
            {t('dayShift')}
          </span>
          <span className="text-[11px] text-slate-500">
            {shift.startTime} - {shift.endTime}
          </span>
        </div>
      );
    }
    if (shift.shiftType === 'night') {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-purple-800 bg-purple-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-purple-200">
            {t('nightShift')}
          </span>
          {shift.isOvernight && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
              OVERNIGHT
            </span>
          )}
          <span className="text-[11px] text-slate-500">
            {shift.startTime} - {shift.endTime}
          </span>
        </div>
      );
    }
    return (
      <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold">
        {t('dayOff')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice: Role Authorization */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-950">
          <span className="font-bold">Constructor Operational Clearance:</span> You have authorized access to team shift scheduling rosters, craft attendance, and site safety management. Sensitive financial compensation records are restricted to corporate administrators.
        </div>
      </div>

      {/* Date & Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Site Team Shift Roster & Attendance
          </h2>
          <p className="text-xs text-slate-500">
            Monitor daily shifts, overnight duties, and craft assignments on Site #7.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Select Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium text-xs focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member, role, or team..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 w-52"
            />
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Craft Workforce Roster ({filteredMembers.length} Members on Site)
          </span>
          <span className="text-xs text-slate-500">
            Date: <span className="font-semibold text-slate-700">{selectedDate}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/60 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Employee</th>
                <th className="py-3 px-4 font-semibold">Role & Trade</th>
                <th className="py-3 px-4 font-semibold">Assigned Team</th>
                <th className="py-3 px-4 font-semibold">Assigned Shift</th>
                <th className="py-3 px-4 font-semibold">Shift Notes</th>
                <th className="py-3 px-4 font-semibold text-right">Emergency Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((member) => {
                const shift = getShiftForMember(member.id);
                return (
                  <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <span>{member.name}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {member.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {member.jobRole}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {member.team}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderShiftBadge(shift)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 italic">
                      {shift?.notes || 'Standard sector duty'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="text-slate-800 font-medium">
                        {member.emergencyContact.name} ({member.emergencyContact.relation})
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {member.emergencyContact.phone}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Protocol & Tool Box Talk Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Register Tool Box Talk */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <ShieldAlert className="w-4 h-4 text-blue-700" />
            <span>Record Daily Site Safety Briefing (Toolbox Talk)</span>
          </div>

          <form onSubmit={handleSaveToolboxTalk} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Briefing Topic
              </label>
              <input
                type="text"
                required
                value={toolboxTopic}
                onChange={(e) => setToolboxTopic(e.target.value)}
                placeholder="e.g. Scaffolding Inspection / Crane Radius Blind Spots"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Specific Safety Precautions Discussed
              </label>
              <textarea
                rows={3}
                required
                value={toolboxNotes}
                onChange={(e) => setToolboxNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Sign & Save Safety Log
            </button>
          </form>
        </div>

        {/* Previous Safety Logs */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">
              Recent Site Safety Briefings
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="space-y-2.5">
            {savedToolboxTalks.map((log, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>{log.topic}</span>
                  <span className="text-[11px] text-slate-500 font-mono">{log.date}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Conducted by: {log.conductor}</span>
                  <span>{log.attendees} Workers Attended</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
