export type UserRole = 'super_admin' | 'admin' | 'constructor' | 'worker';

export type LanguageCode = 'en' | 'ta' | 'hi' | 'te' | 'kn';

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team: string;
  jobRole: string;
  phone: string;
  emergencyContact: EmergencyContact;
  status: 'active' | 'inactive';
  permissions: {
    canManageShifts: boolean;
    canManagePayments: boolean;
    canManageRequests: boolean;
  };
  languagePreference: LanguageCode;
  hourlyRate?: number;
}

export type ShiftType = 'day' | 'night' | 'off' | 'unassigned';

export interface Shift {
  id: string;
  workerId: string;
  date: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  hours: number;
  isOvernight: boolean;
  notes?: string;
  assignedBy: string;
  updatedAt: string;
}

export interface MonthlyHoursSummary {
  workerId: string;
  month: string;
  totalHours: number;
  maxLimit: number;
  isOverLimit: boolean;
  isWarning: boolean;
  shiftCount: number;
}

export type PaymentStatus = 'uploaded' | 'pending' | 'credited' | 'under_review';

export interface DeductionsBreakdown {
  tax: number;
  epf: number;
  healthInsurance: number;
  advanceRecovery: number;
  total: number;
}

export interface Payslip {
  id: string;
  workerId: string;
  month: string; // YYYY-MM
  monthName: string;
  basicSalary: number;
  overtimeHours: number;
  overtimePay: number;
  allowances: number;
  deductions: DeductionsBreakdown;
  netSalary: number;
  paymentStatus: PaymentStatus;
  paymentDate?: string;
  slipFileName?: string;
  slipFileUrl?: string;
  createdAt: string;
  updatedAt: string;
  auditTrail: Array<{
    timestamp: string;
    actorEmail: string;
    changes: string;
  }>;
}

export interface BonusSalary {
  id: string;
  workerId: string;
  bonusAmount: number;
  period: string;
  reason: string;
  paymentStatus: 'pending' | 'credited' | 'under_review';
  documentUrl?: string;
  documentName?: string;
  date: string;
}

export type RequestCategory =
  | 'Salary problems'
  | 'Excessive shifts'
  | 'Safety concerns'
  | 'Facilities problems'
  | 'Unfair treatment'
  | 'Other';

export type RequestStatus =
  | 'submitted'
  | 'under_review'
  | 'in_progress'
  | 'resolved'
  | 'reopened'
  | 'closed';

export type RequestPriority = 'urgent' | 'high' | 'normal';

export interface AdminUpdate {
  timestamp: string;
  updateText: string;
  updatedByRole: string;
}

export interface AnonymousReport {
  id: string;
  category: RequestCategory;
  title: string;
  description: string;
  attachmentUrl?: string;
  attachmentName?: string;
  priority: RequestPriority;
  status: RequestStatus;
  voteCount: number;
  assignedTeam?: string;
  adminUpdates: AdminUpdate[];
  resolutionDetails?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  details: string;
}
