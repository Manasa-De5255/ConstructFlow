import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'super_admin' | 'admin' | 'constructor' | 'worker';
  team: string;
  jobRole: string;
  phone: string;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  status: 'active' | 'inactive';
  permissions: {
    canManageShifts: boolean;
    canManagePayments: boolean;
    canManageRequests: boolean;
  };
  languagePreference: 'en' | 'ta' | 'hi' | 'te' | 'kn';
  hourlyRate: number;
  monthlyLimitHours?: number;
}

export interface Shift {
  id: string;
  workerId: string;
  date: string; // YYYY-MM-DD
  shiftType: 'day' | 'night' | 'off' | 'unassigned';
  startTime: string; // e.g. "08:00"
  endTime: string; // e.g. "17:00" or "05:00" next day
  hours: number;
  isOvernight: boolean;
  notes?: string;
  assignedBy: string;
  updatedAt: string;
}

export interface PayslipItem {
  id: string;
  workerId: string;
  month: string; // "2026-10"
  monthName: string; // "October 2026"
  basicSalary: number;
  overtimeHours: number;
  overtimePay: number;
  allowances: number;
  deductions: {
    tax: number;
    epf: number;
    healthInsurance: number;
    advanceRecovery: number;
    total: number;
  };
  netSalary: number;
  paymentStatus: 'uploaded' | 'pending' | 'credited' | 'under_review';
  paymentDate?: string;
  slipFileName?: string;
  slipFileUrl?: string; // Data URL or storage path
  createdAt: string;
  updatedAt: string;
  auditTrail: Array<{
    timestamp: string;
    actorEmail: string;
    changes: string;
  }>;
}

export interface BonusSalaryItem {
  id: string;
  workerId: string;
  bonusAmount: number;
  period: string; // e.g. "Q3 2026 / Safety Excellence"
  reason: string;
  paymentStatus: 'pending' | 'credited' | 'under_review';
  documentUrl?: string;
  documentName?: string;
  date: string;
}

export interface AnonymousReport {
  id: string; // REQ-2026-XXXX
  claimTokenHash: string; // SHA-256 of worker's private claim key
  category: 'Salary problems' | 'Excessive shifts' | 'Safety concerns' | 'Facilities problems' | 'Unfair treatment' | 'Other';
  title: string;
  description: string;
  attachmentUrl?: string;
  attachmentName?: string;
  priority: 'urgent' | 'high' | 'normal';
  status: 'submitted' | 'under_review' | 'in_progress' | 'resolved' | 'reopened' | 'closed';
  voteCount: number;
  voterTokens: string[]; // Hashes of anonymous voter sessions
  assignedTeam?: string;
  adminUpdates: Array<{
    timestamp: string;
    updateText: string;
    updatedByRole: string;
  }>;
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

export interface DatabaseSchema {
  users: User[];
  shifts: Shift[];
  payslips: PayslipItem[];
  bonuses: BonusSalaryItem[];
  anonymousReports: AnonymousReport[];
  auditLogs: AuditLog[];
  settings: {
    maxMonthlyShiftHours: number; // default 208 hrs
    siteName: string;
  };
}

const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
const DATA_DIR = isVercel
  ? path.resolve('/tmp', 'constructflow_data')
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_constructflow_salt_2026').digest('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim().toLowerCase()).digest('hex');
}

function getSeedData(): DatabaseSchema {
  const superAdminEmail = 'manasadevi4077@gmail.com';

  const users: User[] = [
    {
      id: 'USR-SUPERADMIN-01',
      name: 'Manasa Devi (Super Admin)',
      email: superAdminEmail,
      passwordHash: hashPassword('SuperAdmin@2026'),
      role: 'super_admin',
      team: 'Executive Operations',
      jobRole: 'Workforce Director & Super Administrator',
      phone: '+91 98450 12345',
      emergencyContact: {
        name: 'Headquarters Dispatch',
        relation: 'Corporate HQ',
        phone: '+91 80 2345 6789'
      },
      status: 'active',
      permissions: {
        canManageShifts: true,
        canManagePayments: true,
        canManageRequests: true,
      },
      languagePreference: 'en',
      hourlyRate: 850
    },
    {
      id: 'USR-ADMIN-02',
      name: 'Rajesh Sharma',
      email: 'admin.rajesh@constructflow.com',
      passwordHash: hashPassword('Admin@2026'),
      role: 'admin',
      team: 'Site Operations',
      jobRole: 'Site Administration Manager',
      phone: '+91 98451 23456',
      emergencyContact: {
        name: 'Sunita Sharma',
        relation: 'Spouse',
        phone: '+91 98451 99999'
      },
      status: 'active',
      permissions: {
        canManageShifts: true,
        canManagePayments: true,
        canManageRequests: true,
      },
      languagePreference: 'hi',
      hourlyRate: 550
    },
    {
      id: 'USR-CONSTRUCTOR-01',
      name: 'Vikram Sethi',
      email: 'constructor.vikram@constructflow.com',
      passwordHash: hashPassword('Constructor@2026'),
      role: 'constructor',
      team: 'Structural Concrete & Civil',
      jobRole: 'Site Construction Lead & Engineer',
      phone: '+91 98452 34567',
      emergencyContact: {
        name: 'Meera Sethi',
        relation: 'Spouse',
        phone: '+91 98452 88888'
      },
      status: 'active',
      permissions: {
        canManageShifts: false,
        canManagePayments: false,
        canManageRequests: false,
      },
      languagePreference: 'en',
      hourlyRate: 480
    },
    {
      id: 'USR-WORKER-01',
      name: 'Suresh Murugan',
      email: 'worker.suresh@constructflow.com',
      passwordHash: hashPassword('Worker@2026'),
      role: 'worker',
      team: 'Structural Concrete & Civil',
      jobRole: 'Master Welder & Rigger',
      phone: '+91 98453 45678',
      emergencyContact: {
        name: 'Murugan (Father)',
        relation: 'Parent',
        phone: '+91 98453 77777'
      },
      status: 'active',
      permissions: {
        canManageShifts: false,
        canManagePayments: false,
        canManageRequests: false,
      },
      languagePreference: 'ta',
      hourlyRate: 260
    },
    {
      id: 'USR-WORKER-02',
      name: 'Anita Kumari',
      email: 'worker.anita@constructflow.com',
      passwordHash: hashPassword('Worker@2026'),
      role: 'worker',
      team: 'Electrical & Wiring',
      jobRole: 'Certified High-Voltage Electrician',
      phone: '+91 98454 56789',
      emergencyContact: {
        name: 'Ramesh Kumar',
        relation: 'Brother',
        phone: '+91 98454 66666'
      },
      status: 'active',
      permissions: {
        canManageShifts: false,
        canManagePayments: false,
        canManageRequests: false,
      },
      languagePreference: 'hi',
      hourlyRate: 275
    },
    {
      id: 'USR-WORKER-03',
      name: 'Kiran Gowda',
      email: 'worker.kiran@constructflow.com',
      passwordHash: hashPassword('Worker@2026'),
      role: 'worker',
      team: 'Masonry & Framing',
      jobRole: 'Formwork Specialist',
      phone: '+91 98455 67890',
      emergencyContact: {
        name: 'Shylaja Gowda',
        relation: 'Spouse',
        phone: '+91 98455 55555'
      },
      status: 'active',
      permissions: {
        canManageShifts: false,
        canManagePayments: false,
        canManageRequests: false,
      },
      languagePreference: 'kn',
      hourlyRate: 240
    },
    {
      id: 'USR-WORKER-04',
      name: 'Prasad Rao',
      email: 'worker.prasad@constructflow.com',
      passwordHash: hashPassword('Worker@2026'),
      role: 'worker',
      team: 'Site Operations',
      jobRole: 'Heavy Crane Operator',
      phone: '+91 98456 78901',
      emergencyContact: {
        name: 'Lakshmi Rao',
        relation: 'Mother',
        phone: '+91 98456 44444'
      },
      status: 'active',
      permissions: {
        canManageShifts: false,
        canManagePayments: false,
        canManageRequests: false,
      },
      languagePreference: 'te',
      hourlyRate: 290
    }
  ];

  const today = '2026-10-27';
  const shifts: Shift[] = [
    {
      id: 'SHF-1027-01',
      workerId: 'USR-WORKER-01',
      date: today,
      shiftType: 'day',
      startTime: '08:00',
      endTime: '17:00',
      hours: 9,
      isOvernight: false,
      notes: 'Tower A core reinforcement welding',
      assignedBy: 'admin.rajesh@constructflow.com',
      updatedAt: '2026-10-26T18:00:00Z'
    },
    {
      id: 'SHF-1027-02',
      workerId: 'USR-WORKER-02',
      date: today,
      shiftType: 'night',
      startTime: '20:00',
      endTime: '05:00',
      hours: 9,
      isOvernight: true,
      notes: 'Transformer vault cable pulling (Overnight)',
      assignedBy: 'admin.rajesh@constructflow.com',
      updatedAt: '2026-10-26T18:00:00Z'
    },
    {
      id: 'SHF-1027-03',
      workerId: 'USR-WORKER-03',
      date: today,
      shiftType: 'day',
      startTime: '08:00',
      endTime: '17:00',
      hours: 9,
      isOvernight: false,
      notes: 'Level 4 beam formwork assembly',
      assignedBy: 'admin.rajesh@constructflow.com',
      updatedAt: '2026-10-26T18:00:00Z'
    },
    {
      id: 'SHF-1027-04',
      workerId: 'USR-WORKER-04',
      date: today,
      shiftType: 'off',
      startTime: '00:00',
      endTime: '00:00',
      hours: 0,
      isOvernight: false,
      notes: 'Scheduled rest day after heavy shift block',
      assignedBy: 'admin.rajesh@constructflow.com',
      updatedAt: '2026-10-26T18:00:00Z'
    }
  ];

  // Populate realistic previous shift entries for October 2026 so workers have accumulated hours
  // to realistically demonstrate monthly shift-hour calculation and limit warnings (>200 hrs)
  for (let d = 1; d <= 26; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    const dateStr = `2026-10-${dayStr}`;
    // Suresh Murugan has done 22 days of 9-hour shifts = 198 hours already!
    if (d % 7 !== 0) {
      shifts.push({
        id: `SHF-SUR-${d}`,
        workerId: 'USR-WORKER-01',
        date: dateStr,
        shiftType: 'day',
        startTime: '08:00',
        endTime: '17:00',
        hours: 9,
        isOvernight: false,
        assignedBy: 'admin.rajesh@constructflow.com',
        updatedAt: '2026-10-01T00:00:00Z'
      });
    }
    // Anita Kumari has done regular shifts
    if (d % 6 !== 0) {
      shifts.push({
        id: `SHF-ANI-${d}`,
        workerId: 'USR-WORKER-02',
        date: dateStr,
        shiftType: d % 2 === 0 ? 'night' : 'day',
        startTime: d % 2 === 0 ? '20:00' : '08:00',
        endTime: d % 2 === 0 ? '05:00' : '17:00',
        hours: 9,
        isOvernight: d % 2 === 0,
        assignedBy: 'admin.rajesh@constructflow.com',
        updatedAt: '2026-10-01T00:00:00Z'
      });
    }
  }

  const payslips: PayslipItem[] = [
    {
      id: 'PAY-2026-09-SUR',
      workerId: 'USR-WORKER-01',
      month: '2026-09',
      monthName: 'September 2026',
      basicSalary: 45000,
      overtimeHours: 24,
      overtimePay: 7800,
      allowances: 3500,
      deductions: {
        tax: 2200,
        epf: 3600,
        healthInsurance: 950,
        advanceRecovery: 1000,
        total: 7750
      },
      netSalary: 48550,
      paymentStatus: 'credited',
      paymentDate: '2026-10-05',
      slipFileName: 'payslip_september_2026_suresh.pdf',
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-05T14:30:00Z',
      auditTrail: [
        {
          timestamp: '2026-10-01T10:00:00Z',
          actorEmail: 'admin.rajesh@constructflow.com',
          changes: 'Generated initial payslip draft and uploaded slip document'
        },
        {
          timestamp: '2026-10-05T14:30:00Z',
          actorEmail: 'admin.rajesh@constructflow.com',
          changes: 'Payment processed and status changed from Pending to Credited (Bank Ref: CF-982104)'
        }
      ]
    },
    {
      id: 'PAY-2026-10-SUR',
      workerId: 'USR-WORKER-01',
      month: '2026-10',
      monthName: 'October 2026',
      basicSalary: 45000,
      overtimeHours: 32,
      overtimePay: 10400,
      allowances: 4000,
      deductions: {
        tax: 2400,
        epf: 3600,
        healthInsurance: 950,
        advanceRecovery: 0,
        total: 6950
      },
      netSalary: 52450,
      paymentStatus: 'uploaded',
      slipFileName: 'payslip_october_2026_suresh.pdf',
      createdAt: '2026-10-25T11:00:00Z',
      updatedAt: '2026-10-25T11:00:00Z',
      auditTrail: [
        {
          timestamp: '2026-10-25T11:00:00Z',
          actorEmail: 'admin.rajesh@constructflow.com',
          changes: 'Payslip draft created and slip PDF uploaded. Payment Pending.'
        }
      ]
    },
    {
      id: 'PAY-2026-09-ANI',
      workerId: 'USR-WORKER-02',
      month: '2026-09',
      monthName: 'September 2026',
      basicSalary: 48000,
      overtimeHours: 18,
      overtimePay: 6187,
      allowances: 4200,
      deductions: {
        tax: 2600,
        epf: 3840,
        healthInsurance: 950,
        advanceRecovery: 0,
        total: 7390
      },
      netSalary: 50997,
      paymentStatus: 'credited',
      paymentDate: '2026-10-05',
      slipFileName: 'payslip_september_2026_anita.pdf',
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-05T14:30:00Z',
      auditTrail: [
        {
          timestamp: '2026-10-01T10:00:00Z',
          actorEmail: 'admin.rajesh@constructflow.com',
          changes: 'Initial payslip generated'
        }
      ]
    },
    {
      id: 'PAY-2026-10-ANI',
      workerId: 'USR-WORKER-02',
      month: '2026-10',
      monthName: 'October 2026',
      basicSalary: 48000,
      overtimeHours: 20,
      overtimePay: 6875,
      allowances: 4200,
      deductions: {
        tax: 2600,
        epf: 3840,
        healthInsurance: 950,
        advanceRecovery: 0,
        total: 7390
      },
      netSalary: 51685,
      paymentStatus: 'pending',
      slipFileName: 'payslip_october_2026_anita.pdf',
      createdAt: '2026-10-25T11:15:00Z',
      updatedAt: '2026-10-25T11:15:00Z',
      auditTrail: [
        {
          timestamp: '2026-10-25T11:15:00Z',
          actorEmail: 'admin.rajesh@constructflow.com',
          changes: 'Payslip created and submitted for finance department verification'
        }
      ]
    }
  ];

  const bonuses: BonusSalaryItem[] = [
    {
      id: 'BNS-2026-01',
      workerId: 'USR-WORKER-01',
      bonusAmount: 12000,
      period: 'Q3 2026 / Zero Safety Incidents',
      reason: 'Perfect safety compliance milestone and emergency shoring completion on Block B',
      paymentStatus: 'credited',
      date: '2026-10-15',
      documentName: 'safety_excellence_award_cert.pdf'
    },
    {
      id: 'BNS-2026-02',
      workerId: 'USR-WORKER-01',
      bonusAmount: 8500,
      period: 'Festival Bonus 2026',
      reason: 'Annual festive bonus authorization for certified riggers',
      paymentStatus: 'pending',
      date: '2026-10-24',
      documentName: 'festive_bonus_dispatch_schedule.pdf'
    },
    {
      id: 'BNS-2026-03',
      workerId: 'USR-WORKER-02',
      bonusAmount: 15000,
      period: 'Substation Commissioning Milestone',
      reason: 'Early completion of transformer energization and high voltage test pass',
      paymentStatus: 'credited',
      date: '2026-09-30',
      documentName: 'substation_energization_cert.pdf'
    }
  ];

  // Pre-seed anonymous reports without ANY worker ID, email, or name
  // Claim tokens:
  // Report 1: Claim Key "CLAIM-SAFE-8821", token hash = hashToken("CLAIM-SAFE-8821")
  // Report 2: Claim Key "CLAIM-REST-4019", token hash = hashToken("CLAIM-REST-4019")
  // Report 3: Claim Key "CLAIM-FACL-6372", token hash = hashToken("CLAIM-FACL-6372")
  const anonymousReports: AnonymousReport[] = [
    {
      id: 'REQ-2026-8821',
      claimTokenHash: hashToken('CLAIM-SAFE-8821'),
      category: 'Safety concerns',
      title: 'Scaffold toe-boards loose and missing safety net on Tower B level 6',
      description: 'The scaffolding outer bracket on the northwest face of Tower B has two missing toe-boards. Small concrete aggregate fell near the pedestrian transit walkway yesterday. Urgent safety inspection and netting is required.',
      priority: 'urgent',
      status: 'in_progress',
      voteCount: 18,
      voterTokens: ['seed_token_1', 'seed_token_2', 'seed_token_3'],
      assignedTeam: 'Site Safety Inspection Team',
      adminUpdates: [
        {
          timestamp: '2026-10-25T09:30:00Z',
          updateText: 'Safety Officer inspected Tower B Level 6. Section cordoned off immediately with warning barricades.',
          updatedByRole: 'Admin'
        },
        {
          timestamp: '2026-10-26T14:00:00Z',
          updateText: 'Scaffold technicians deployed with heavy nylon safety netting and new toe-board clips.',
          updatedByRole: 'Admin'
        }
      ],
      createdAt: '2026-10-24T18:20:00Z',
      updatedAt: '2026-10-26T14:00:00Z'
    },
    {
      id: 'REQ-2026-4019',
      claimTokenHash: hashToken('CLAIM-REST-4019'),
      category: 'Excessive shifts',
      title: 'Back-to-back night to day shift transition with only 6 hours rest',
      description: 'Certain concrete pouring crews were assigned to finish at 04:00 AM and report back for crane lifting at 10:00 AM. This fatigue creates serious crane rigging danger. Workers need mandatory 12 hours between consecutive shifts.',
      priority: 'high',
      status: 'under_review',
      voteCount: 24,
      voterTokens: ['seed_token_4', 'seed_token_5', 'seed_token_6'],
      assignedTeam: 'Shift Scheduling & HR',
      adminUpdates: [
        {
          timestamp: '2026-10-26T11:00:00Z',
          updateText: 'Reviewing shift schedule rotas. Minimum 12-hour buffer rule being strictly enforced in the automated portal with monthly hour warnings.',
          updatedByRole: 'Super Admin'
        }
      ],
      createdAt: '2026-10-25T08:15:00Z',
      updatedAt: '2026-10-26T11:00:00Z'
    },
    {
      id: 'REQ-2026-7290',
      claimTokenHash: hashToken('CLAIM-SAL-7290'),
      category: 'Salary problems',
      title: 'Night shift hazardous welding allowance omitted from September payslip',
      description: 'The enclosed basement welding on the storm water sump included an agreed hazardous environment allowance of ₹150/hour for 32 hours, but it was not credited in the September payment slip.',
      priority: 'high',
      status: 'under_review',
      voteCount: 12,
      voterTokens: ['seed_token_7', 'seed_token_8'],
      assignedTeam: 'Finance & Payroll Verification',
      adminUpdates: [
        {
          timestamp: '2026-10-26T16:00:00Z',
          updateText: 'Timesheets cross-verified with Site Constructor shift logs. Supplementary allowance adjustment approved for the upcoming October payment cycle.',
          updatedByRole: 'Admin'
        }
      ],
      createdAt: '2026-10-25T14:10:00Z',
      updatedAt: '2026-10-26T16:00:00Z'
    },
    {
      id: 'REQ-2026-6372',
      claimTokenHash: hashToken('CLAIM-FACL-6372'),
      category: 'Facilities problems',
      title: 'Drinking water dispenser filters choked near Ground Station 3',
      description: 'The drinking water cooler is dispensing muddy water after recent heavy rains. Over 60 workers in Sector C have to walk 450m to Station 1 in afternoon heat.',
      priority: 'normal',
      status: 'in_progress',
      voteCount: 15,
      voterTokens: ['seed_token_9', 'seed_token_10'],
      assignedTeam: 'Site Facilities & Maintenance',
      adminUpdates: [
        {
          timestamp: '2026-10-26T17:15:00Z',
          updateText: 'Plumbing contractor called. Temporary 500L purified water tankers delivered to Sector C rest area.',
          updatedByRole: 'Admin'
        }
      ],
      createdAt: '2026-10-26T10:45:00Z',
      updatedAt: '2026-10-26T17:15:00Z'
    },
    {
      id: 'REQ-2026-3115',
      claimTokenHash: hashToken('CLAIM-FAIR-3115'),
      category: 'Unfair treatment',
      title: 'Unequal overtime allocation and verbal hostility from subcontractor supervisor',
      description: 'Subcontractor crew supervisor repeatedly assigns high-paying weekend overtime only to his immediate relatives while dismissing other certified riggers and using abusive language when questioned.',
      priority: 'high',
      status: 'under_review',
      voteCount: 8,
      voterTokens: ['seed_token_11'],
      assignedTeam: 'Ethics & Subcontractor Compliance',
      adminUpdates: [
        {
          timestamp: '2026-10-26T19:00:00Z',
          updateText: 'Internal review opened. Subcontractor agency director summoned for meeting. Anonymous shift rotation policy will take effect.',
          updatedByRole: 'Super Admin'
        }
      ],
      createdAt: '2026-10-26T12:30:00Z',
      updatedAt: '2026-10-26T19:00:00Z'
    },
    {
      id: 'REQ-2026-9042',
      claimTokenHash: hashToken('CLAIM-OTHR-9042'),
      category: 'Other',
      title: 'Excessive road dust on south perimeter access gate affecting respiratory health',
      description: 'Gravel dump trucks moving through Gate 4 are not using water spray suppression. The dust plume is heavy near the worker muster point and lunch shade canopy.',
      priority: 'normal',
      status: 'resolved',
      voteCount: 11,
      voterTokens: ['seed_token_12'],
      assignedTeam: 'Environmental & Dust Control Unit',
      adminUpdates: [
        {
          timestamp: '2026-10-25T15:00:00Z',
          updateText: 'Dedicated water sprinkler bowser scheduled to spray Gate 4 every 90 minutes during truck hauling hours.',
          updatedByRole: 'Admin'
        }
      ],
      resolutionDetails: 'Permanent automated wheel-wash spray ramp installed at Gate 4 south perimeter.',
      createdAt: '2026-10-24T11:00:00Z',
      updatedAt: '2026-10-25T15:00:00Z'
    }
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'AUDIT-001',
      timestamp: '2026-10-25T11:00:00Z',
      actorEmail: 'admin.rajesh@constructflow.com',
      actorRole: 'admin',
      action: 'PAYSLIP_UPLOAD',
      targetType: 'Payslip',
      details: 'Uploaded October 2026 payslip draft for Suresh Murugan with 32h overtime'
    },
    {
      id: 'AUDIT-002',
      timestamp: '2026-10-26T11:00:00Z',
      actorEmail: 'manasadevi4077@gmail.com',
      actorRole: 'super_admin',
      action: 'ANONYMOUS_REPORT_STATUS_UPDATE',
      targetType: 'AnonymousReport',
      details: 'Updated status of report REQ-2026-4019 to Under Review with scheduling rota policy note'
    },
    {
      id: 'AUDIT-003',
      timestamp: '2026-10-26T18:00:00Z',
      actorEmail: 'admin.rajesh@constructflow.com',
      actorRole: 'admin',
      action: 'SHIFT_ASSIGNMENT',
      targetType: 'Shift',
      details: 'Assigned 9-hour day and overnight shifts for 2026-10-27 with overnight alerts verified'
    }
  ];

  return {
    users,
    shifts,
    payslips,
    bonuses,
    anonymousReports,
    auditLogs,
    settings: {
      maxMonthlyShiftHours: 208,
      siteName: 'ConstructFlow Grand Central Infrastructure Project #7'
    }
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error loading db.json, generating seed data:', e);
    }
    const seed = getSeedData();
    this.persist(seed);
    return seed;
  }

  private persist(dataToSave: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write db.json:', err);
    }
  }

  public get(): DatabaseSchema {
    return this.data;
  }

  public save() {
    this.persist(this.data);
  }

  public logAudit(actorEmail: string, actorRole: string, action: string, targetType: string, details: string) {
    const log: AuditLog = {
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      actorEmail,
      actorRole,
      action,
      targetType,
      details
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.save();
    return log;
  }
}

export const db = new Database();
