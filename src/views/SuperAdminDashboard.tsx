import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  ShieldCheck,
  UserPlus,
  Shield,
  Edit,
  UserX,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Lock,
  Layers
} from 'lucide-react';
import { User } from '../types/index.ts';

export const SuperAdminDashboard: React.FC = () => {
  const { authFetch, user } = useAuth();
  const { t } = useLanguage();

  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formTeam, setFormTeam] = useState('Site Administration');
  const [formJobRole, setFormJobRole] = useState('Operations Admin');
  const [formPhone, setFormPhone] = useState('');
  const [permShifts, setPermShifts] = useState(true);
  const [permPayments, setPermPayments] = useState(true);
  const [permRequests, setPermRequests] = useState(true);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/admins');
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins || []);
      }
    } catch (e) {
      console.error('Error fetching admins:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/admins', {
        method: 'POST',
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          team: formTeam,
          jobRole: formJobRole,
          phone: formPhone,
          permissions: {
            canManageShifts: permShifts,
            canManagePayments: permPayments,
            canManageRequests: permRequests
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchAdmins();
        alert('New site admin successfully created and authorized.');
      } else {
        alert(data.error || 'Failed to create admin');
      }
    } catch {
      alert('Network error creating admin');
    }
  };

  const handleUpdatePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    try {
      const res = await authFetch(`/api/admins/${editingAdmin.id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({
          jobRole: formJobRole,
          team: formTeam,
          permissions: {
            canManageShifts: permShifts,
            canManagePayments: permPayments,
            canManageRequests: permRequests
          }
        })
      });

      if (res.ok) {
        setEditingAdmin(null);
        fetchAdmins();
        alert('Admin permissions updated successfully.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update permissions');
      }
    } catch {
      alert('Error updating permissions');
    }
  };

  const handleToggleStatus = async (targetAdmin: User) => {
    const nextStatus = targetAdmin.status === 'active' ? 'inactive' : 'active';
    const confirmMsg = `Are you sure you want to ${nextStatus === 'inactive' ? 'deactivate' : 'reactivate'} administrator ${targetAdmin.name} (${targetAdmin.email})?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await authFetch(`/api/admins/${targetAdmin.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setAdmins(prev =>
          prev.map(a => (a.id === targetAdmin.id ? { ...a, status: nextStatus } : a))
        );
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to toggle admin status');
      }
    } catch {
      alert('Error updating status');
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormTeam('Site Administration');
    setFormJobRole('Operations Admin');
    setFormPhone('');
    setPermShifts(true);
    setPermPayments(true);
    setPermRequests(true);
  };

  const openEditModal = (target: User) => {
    setEditingAdmin(target);
    setFormJobRole(target.jobRole);
    setFormTeam(target.team);
    setPermShifts(target.permissions?.canManageShifts ?? true);
    setPermPayments(target.permissions?.canManagePayments ?? true);
    setPermRequests(target.permissions?.canManageRequests ?? true);
  };

  return (
    <div className="space-y-6">
      {/* Super Admin Verification Banner */}
      <div className="p-5 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
        <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-purple-700" />
          <span>Super Administrator Security Terminal — manasadevi4077@gmail.com</span>
        </div>
        <p className="text-xs text-purple-950 leading-relaxed">
          Exclusive executive authorization console. Only the Super Admin account verified on the server has the authority to create administrators, configure operational permissions, or revoke administrative access. All authorization changes are logged immutably in the system audit trail.
        </p>
      </div>

      {/* Header with Create Admin button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Site Administrator Authorizations & Permissions
          </h2>
          <p className="text-xs text-slate-500">
            Control which site admins can assign shifts, modify salaries, or triage anonymous complaints.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Authorize New Admin</span>
        </button>
      </div>

      {/* Admins Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Administrator</th>
                <th className="py-3 px-4 font-semibold">Role Tier</th>
                <th className="py-3 px-4 font-semibold">Team & Function</th>
                <th className="py-3 px-4 font-semibold">Granted Permissions</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map((adm) => {
                const isSuper = adm.role === 'super_admin';
                return (
                  <tr key={adm.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSuper ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {adm.name.charAt(0)}
                        </div>
                        <div>
                          <span>{adm.name}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {adm.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          isSuper
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        {isSuper ? 'SUPER ADMIN' : 'SITE ADMIN'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <div>{adm.jobRole}</div>
                      <span className="text-[11px] text-slate-400">{adm.team}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      {isSuper ? (
                        <span className="text-purple-700 font-semibold text-[11px]">
                          Full Root Executive Access
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {adm.permissions?.canManageShifts && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                              Shifts
                            </span>
                          )}
                          {adm.permissions?.canManagePayments && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                              Payments
                            </span>
                          )}
                          {adm.permissions?.canManageRequests && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                              Worker Voice
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          adm.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {adm.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {!isSuper && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(adm)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                            title="Edit Permissions"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(adm)}
                            className={`p-1.5 rounded transition-colors ${
                              adm.status === 'active'
                                ? 'text-red-500 hover:bg-red-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={adm.status === 'active' ? 'Deactivate Admin' : 'Reactivate Admin'}
                          >
                            {adm.status === 'active' ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREATE ADMIN */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-purple-700 text-white">
              <h3 className="text-sm font-bold">Authorize New Site Administrator</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-purple-800 rounded text-purple-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="admin.name@constructflow.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Job Role Title</label>
                  <input
                    type="text"
                    value={formJobRole}
                    onChange={(e) => setFormJobRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Team</label>
                  <input
                    type="text"
                    value={formTeam}
                    onChange={(e) => setFormTeam(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Permission Checkboxes */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="text-xs font-bold text-slate-900 block">
                  Authorizations & Permissions
                </span>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permShifts}
                    onChange={(e) => setPermShifts(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>Can Assign Shifts & Manage Daily Schedules</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permPayments}
                    onChange={(e) => setPermPayments(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>Can Upload Payslips & Manage Bonuses</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permRequests}
                    onChange={(e) => setPermRequests(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>Can Triage Anonymous Worker Voice Reports</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-xs"
                >
                  Create & Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PERMISSIONS */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-purple-700 text-white">
              <h3 className="text-sm font-bold">
                Edit Permissions: {editingAdmin.name}
              </h3>
              <button
                onClick={() => setEditingAdmin(null)}
                className="p-1 hover:bg-purple-800 rounded text-purple-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdatePermissions} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Role Title</label>
                <input
                  type="text"
                  value={formJobRole}
                  onChange={(e) => setFormJobRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                <span className="text-xs font-bold text-slate-900 block">
                  Permissions Granted:
                </span>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permShifts}
                    onChange={(e) => setPermShifts(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>Shift Scheduling & Attendance</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permPayments}
                    onChange={(e) => setPermPayments(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>Payment Slips & Bonuses</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permRequests}
                    onChange={(e) => setPermRequests(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>Worker Voice Triage & Resolution</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-xs"
                >
                  Save Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
