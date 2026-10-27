import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, User, PayslipItem, BonusSalaryItem, hashPassword, hashToken } from './db.ts';

export const apiRouter = Router();

// In-memory token sessions
interface Session {
  userId: string;
  email: string;
  role: string;
  createdAt: number;
}
const activeSessions = new Map<string, Session>();

// Seed initial super admin session for convenience if needed
const SUPER_ADMIN_EMAIL = 'manasadevi4077@gmail.com';

function createSession(user: User): string {
  const token = 'CF_SESSION_' + crypto.randomBytes(24).toString('hex');
  activeSessions.set(token, {
    userId: user.id,
    email: user.email,
    role: user.role,
    createdAt: Date.now()
  });
  return token;
}

// Authentication Middleware
function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  const session = activeSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const user = db.get().users.find(u => u.id === session.userId);
  if (!user || user.status === 'inactive') {
    return res.status(403).json({ error: 'User account is inactive or not found' });
  }

  (req as any).user = user;
  (req as any).session = session;
  next();
}

function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as User;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Strict Super Admin Verification on Backend
    if (allowedRoles.includes('super_admin')) {
      if (user.role !== 'super_admin' || user.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({ error: 'Super Admin privileges required' });
      }
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: `Access denied. Role '${user.role}' is not authorized.` });
    }
    next();
  };
}

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const data = db.get();
  const user = data.users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (user.status === 'inactive') {
    return res.status(403).json({ error: 'Account has been deactivated. Please contact the administrator.' });
  }

  const hashedInput = hashPassword(password);
  if (user.passwordHash !== hashedInput) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Super Admin security check on backend
  if (user.role === 'super_admin' && normalizedEmail !== SUPER_ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: 'Unauthorized Super Admin credential' });
  }

  const token = createSession(user);
  const { passwordHash: _, ...safeUser } = user;

  res.json({
    token,
    user: safeUser
  });
});

apiRouter.get('/auth/me', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

apiRouter.post('/auth/reset-password', (req: Request, res: Response) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Valid email and new password (min 6 chars) required' });
  }

  const data = db.get();
  const user = data.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    // For privacy, respond generic success
    return res.json({ success: true, message: 'If an account exists, password has been reset.' });
  }

  user.passwordHash = hashPassword(newPassword);
  db.save();

  db.logAudit(user.email, user.role, 'PASSWORD_RESET', 'User', `Password was reset successfully`);
  res.json({ success: true, message: 'Password reset successfully. You may now log in.' });
});

apiRouter.put('/auth/profile', authenticate, (req: Request, res: Response) => {
  const currentUser = (req as any).user as User;
  const { phone, emergencyContact, languagePreference } = req.body;

  const data = db.get();
  const user = data.users.find(u => u.id === currentUser.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (phone) user.phone = phone;
  if (emergencyContact) user.emergencyContact = emergencyContact;
  if (languagePreference) user.languagePreference = languagePreference;

  db.save();
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

// ==========================================
// 2. SUPER ADMIN MANAGEMENT ROUTES
// ==========================================

apiRouter.get('/admins', authenticate, requireRole(['super_admin']), (req: Request, res: Response) => {
  const data = db.get();
  const admins = data.users
    .filter(u => u.role === 'admin' || u.role === 'super_admin')
    .map(({ passwordHash: _, ...u }) => u);
  res.json({ admins });
});

apiRouter.post('/admins', authenticate, requireRole(['super_admin']), (req: Request, res: Response) => {
  const actor = (req as any).user as User;
  const { name, email, password, team, jobRole, phone, permissions, languagePreference } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const data = db.get();
  if (data.users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const newAdmin: User = {
    id: `USR-ADMIN-${Date.now().toString().slice(-4)}`,
    name,
    email: email.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    role: 'admin',
    team: team || 'Site Administration',
    jobRole: jobRole || 'Operations Admin',
    phone: phone || '',
    emergencyContact: {
      name: 'Site Management',
      relation: 'Office',
      phone: phone || ''
    },
    status: 'active',
    permissions: permissions || {
      canManageShifts: true,
      canManagePayments: true,
      canManageRequests: true,
    },
    languagePreference: languagePreference || 'en',
    hourlyRate: 500
  };

  data.users.push(newAdmin);
  db.save();

  db.logAudit(actor.email, actor.role, 'CREATE_ADMIN', 'User', `Created new Admin ${newAdmin.name} (${newAdmin.email})`);

  const { passwordHash: _, ...safeAdmin } = newAdmin;
  res.status(201).json({ admin: safeAdmin });
});

apiRouter.put('/admins/:id/permissions', authenticate, requireRole(['super_admin']), (req: Request, res: Response) => {
  const actor = (req as any).user as User;
  const { permissions, status, jobRole, team } = req.body;
  const adminId = req.params.id;

  const data = db.get();
  const target = data.users.find(u => u.id === adminId && u.role === 'admin');
  if (!target) {
    return res.status(404).json({ error: 'Admin not found or cannot modify Super Admin' });
  }

  if (permissions) target.permissions = permissions;
  if (status) target.status = status;
  if (jobRole) target.jobRole = jobRole;
  if (team) target.team = team;

  db.save();
  db.logAudit(actor.email, actor.role, 'UPDATE_ADMIN_PERMISSIONS', 'User', `Updated permissions/status for ${target.email}`);

  const { passwordHash: _, ...safeAdmin } = target;
  res.json({ admin: safeAdmin });
});

apiRouter.put('/admins/:id/status', authenticate, requireRole(['super_admin']), (req: Request, res: Response) => {
  const actor = (req as any).user as User;
  const { status } = req.body;
  const adminId = req.params.id;

  if (status !== 'active' && status !== 'inactive') {
    return res.status(400).json({ error: 'Status must be active or inactive' });
  }

  const data = db.get();
  const target = data.users.find(u => u.id === adminId && u.role === 'admin');
  if (!target) {
    return res.status(404).json({ error: 'Admin not found' });
  }

  target.status = status;
  db.save();
  db.logAudit(actor.email, actor.role, 'TOGGLE_ADMIN_STATUS', 'User', `Set admin ${target.email} status to ${status}`);

  res.json({ success: true, status: target.status });
});

// ==========================================
// 3. TEAM MEMBERS & SHIFTS
// ==========================================

apiRouter.get('/team', authenticate, (req: Request, res: Response) => {
  const currentUser = (req as any).user as User;
  const data = db.get();

  // Strip sensitive salary / hourlyRate for non-admins and non-super-admins
  const canSeeSalary = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  const members = data.users.map(u => {
    const { passwordHash: _, hourlyRate, ...safeUser } = u;
    return canSeeSalary ? { ...safeUser, hourlyRate } : safeUser;
  });

  res.json({ members });
});

apiRouter.post('/team', authenticate, requireRole(['admin', 'super_admin']), (req: Request, res: Response) => {
  const actor = (req as any).user as User;
  const { name, email, password, role, team, jobRole, phone, emergencyContact, hourlyRate, languagePreference } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  if (role !== 'worker' && role !== 'constructor') {
    return res.status(400).json({ error: 'Use Admin Management to create Admins' });
  }

  const data = db.get();
  if (data.users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
    return res.status(400).json({ error: 'User already exists with this email' });
  }

  const newUser: User = {
    id: `USR-${role.toUpperCase()}-${Date.now().toString().slice(-4)}`,
    name,
    email: email.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    role,
    team: team || 'General Construction',
    jobRole: jobRole || (role === 'constructor' ? 'Site Constructor' : 'Site Craftsman'),
    phone: phone || '',
    emergencyContact: emergencyContact || { name: 'Emergency Dispatch', relation: 'Site Desk', phone: phone || '' },
    status: 'active',
    permissions: {
      canManageShifts: false,
      canManagePayments: false,
      canManageRequests: false,
    },
    languagePreference: languagePreference || 'en',
    hourlyRate: Number(hourlyRate) || 250
  };

  data.users.push(newUser);
  db.save();

  db.logAudit(actor.email, actor.role, 'CREATE_TEAM_MEMBER', 'User', `Added member ${newUser.name} as ${newUser.role}`);
  const { passwordHash: _, ...safeUser } = newUser;
  res.status(201).json({ member: safeUser });
});

apiRouter.put('/team/:id', authenticate, requireRole(['admin', 'super_admin']), (req: Request, res: Response) => {
  const actor = (req as any).user as User;
  const memberId = req.params.id;
  const { name, team, jobRole, phone, emergencyContact, hourlyRate, status, languagePreference } = req.body;

  const data = db.get();
  const target = data.users.find(u => u.id === memberId);
  if (!target) return res.status(404).json({ error: 'Member not found' });

  // Prevent modifying Super Admin through team route
  if (target.role === 'super_admin' && actor.role !== 'super_admin') {
    return res.status(403).json({ error: 'Cannot modify Super Admin' });
  }

  if (name) target.name = name;
  if (team) target.team = team;
  if (jobRole) target.jobRole = jobRole;
  if (phone) target.phone = phone;
  if (emergencyContact) target.emergencyContact = emergencyContact;
  if (hourlyRate !== undefined) target.hourlyRate = Number(hourlyRate);
  if (status) target.status = status;
  if (languagePreference) target.languagePreference = languagePreference;

  db.save();
  db.logAudit(actor.email, actor.role, 'UPDATE_TEAM_MEMBER', 'User', `Updated profile of ${target.email}`);

  const { passwordHash: _, ...safeUser } = target;
  res.json({ member: safeUser });
});

// Shift routes
apiRouter.get('/shifts', authenticate, (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const data = db.get();
  const shiftsForDate = data.shifts.filter(s => s.date === date);
  res.json({ date, shifts: shiftsForDate, maxMonthlyShiftHours: data.settings.maxMonthlyShiftHours });
});

// Calculate worker monthly hours and alert
apiRouter.get('/shifts/monthly-summary', authenticate, (req: Request, res: Response) => {
  const workerId = req.query.workerId as string;
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7); // e.g. "2026-10"

  const data = db.get();
  const workerShifts = data.shifts.filter(s => s.workerId === workerId && s.date.startsWith(month));
  const totalHours = workerShifts.reduce((acc, curr) => acc + (curr.hours || 0), 0);
  const maxLimit = data.settings.maxMonthlyShiftHours || 208;
  const isOverLimit = totalHours >= maxLimit;
  const isWarning = totalHours >= maxLimit - 16; // within 2 shifts of limit

  res.json({
    workerId,
    month,
    totalHours,
    maxLimit,
    isOverLimit,
    isWarning,
    shiftCount: workerShifts.length
  });
});

apiRouter.post('/shifts', authenticate, requireRole(['admin', 'super_admin']), (req: Request, res: Response) => {
  const actor = (req as any).user as User;
  const { workerId, date, shiftType, startTime, endTime, hours, isOvernight, notes } = req.body;

  if (!workerId || !date || !shiftType) {
    return res.status(400).json({ error: 'Worker ID, date, and shiftType are required' });
  }

  const data = db.get();
  const worker = data.users.find(u => u.id === workerId);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  // Calculate projected monthly hours including this shift
  const month = date.slice(0, 7);
  const currentMonthShifts = data.shifts.filter(s => s.workerId === workerId && s.date.startsWith(month) && s.date !== date);
  const shiftHours = Number(hours) || (shiftType === 'day' || shiftType === 'night' ? 9 : 0);
  const projectedTotal = currentMonthShifts.reduce((acc, curr) => acc + curr.hours, 0) + shiftHours;
  const maxLimit = data.settings.maxMonthlyShiftHours || 208;
  const exceededWarning = projectedTotal > maxLimit;

  // Existing shift on this date?
  let shift = data.shifts.find(s => s.workerId === workerId && s.date === date);
  if (shift) {
    shift.shiftType = shiftType;
    shift.startTime = startTime || (shiftType === 'day' ? '08:00' : shiftType === 'night' ? '20:00' : '00:00');
    shift.endTime = endTime || (shiftType === 'day' ? '17:00' : shiftType === 'night' ? '05:00' : '00:00');
    shift.hours = shiftHours;
    shift.isOvernight = isOvernight ?? (shiftType === 'night');
    shift.notes = notes || '';
    shift.assignedBy = actor.email;
    shift.updatedAt = new Date().toISOString();
  } else {
    shift = {
      id: `SHF-${Date.now().toString().slice(-6)}`,
      workerId,
      date,
      shiftType,
      startTime: startTime || (shiftType === 'day' ? '08:00' : shiftType === 'night' ? '20:00' : '00:00'),
      endTime: endTime || (shiftType === 'day' ? '17:00' : shiftType === 'night' ? '05:00' : '00:00'),
      hours: shiftHours,
      isOvernight: isOvernight ?? (shiftType === 'night'),
      notes: notes || '',
      assignedBy: actor.email,
      updatedAt: new Date().toISOString()
    };
    data.shifts.push(shift);
  }

  db.save();
  db.logAudit(actor.email, actor.role, 'ASSIGN_SHIFT', 'Shift', `Assigned ${shiftType} shift to ${worker.name} on ${date} (${shiftHours}h). Projected month: ${projectedTotal}h`);

  res.json({
    shift,
    projectedTotalHours: projectedTotal,
    maxLimit,
    warning: exceededWarning ? `Warning: Shift pushes ${worker.name} to ${projectedTotal} hours, exceeding the ${maxLimit}h monthly limit!` : null
  });
});

// Settings (Monthly limit configuration)
apiRouter.get('/settings', authenticate, (req: Request, res: Response) => {
  res.json(db.get().settings);
});

apiRouter.put('/settings', authenticate, requireRole(['admin', 'super_admin']), (req: Request, res: Response) => {
  const actor = (req as any).user as User;
  const { maxMonthlyShiftHours, siteName } = req.body;
  const data = db.get();

  if (maxMonthlyShiftHours) data.settings.maxMonthlyShiftHours = Number(maxMonthlyShiftHours);
  if (siteName) data.settings.siteName = siteName;

  db.save();
  db.logAudit(actor.email, actor.role, 'UPDATE_SETTINGS', 'Settings', `Updated maxMonthlyShiftHours to ${data.settings.maxMonthlyShiftHours}`);
  res.json(data.settings);
});

// ==========================================
// 4. PAYSLIPS & BONUSES
// ==========================================

apiRouter.get('/payslips', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const data = db.get();

  let slips: PayslipItem[];
  // Workers can access ONLY their own payment records.
  // Constructors do NOT automatically have salary access unless authorized as admin.
  if (user.role === 'worker') {
    slips = data.payslips.filter(p => p.workerId === user.id);
  } else if (user.role === 'admin' || user.role === 'super_admin') {
    const workerId = req.query.workerId as string;
    slips = workerId ? data.payslips.filter(p => p.workerId === workerId) : data.payslips;
  } else {
    // Constructor or unauthorized
    return res.status(403).json({ error: 'Access denied. Constructors do not have salary access.' });
  }

  // Filter by month/year if provided
  const month = req.query.month as string;
  const year = req.query.year as string;
  if (month) {
    slips = slips.filter(s => s.month === month);
  } else if (year) {
    slips = slips.filter(s => s.month.startsWith(year));
  }

  res.json({ payslips: slips });
});

apiRouter.post('/payslips', authenticate, requireRole(['admin', 'super_admin']), (req: Request, res: Response) => {
  const actor = (req as any).user as User;
  const {
    workerId,
    month,
    basicSalary,
    overtimeHours,
    overtimePay,
    allowances,
    deductions,
    paymentStatus,
    paymentDate,
    slipFileName,
    slipFileUrl
  } = req.body;

  if (!workerId || !month || basicSalary === undefined) {
    return res.status(400).json({ error: 'Worker, month, and basic salary are required' });
  }

  const data = db.get();
  const worker = data.users.find(u => u.id === workerId);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const basic = Number(basicSalary) || 0;
  const otHours = Number(overtimeHours) || 0;
  const otPay = Number(overtimePay) || (otHours * (worker.hourlyRate || 250) * 1.5);
  const allow = Number(allowances) || 0;
  const rawDeductions = deductions || {};
  const tax = Number(rawDeductions.tax) || Math.round(basic * 0.05);
  const epf = Number(rawDeductions.epf) || Math.round(basic * 0.08);
  const healthInsurance = Number(rawDeductions.healthInsurance) || 950;
  const advanceRecovery = Number(rawDeductions.advanceRecovery) || 0;
  const totalDeductions = tax + epf + healthInsurance + advanceRecovery;
  const net = (basic + otPay + allow) - totalDeductions;

  // Format month name
  const [yearStr, monthNum] = month.split('-');
  const dateObj = new Date(Number(yearStr), Number(monthNum) - 1, 1);
  const monthName = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Statuses: 'uploaded' | 'pending' | 'credited' | 'under_review'
  const validStatus = ['uploaded', 'pending', 'credited', 'under_review'].includes(paymentStatus)
    ? paymentStatus
    : 'uploaded';

  const newSlip: PayslipItem = {
    id: `PAY-${month.replace('-', '')}-${worker.id.slice(-4)}`,
    workerId,
    month,
    monthName,
    basicSalary: basic,
    overtimeHours: otHours,
    overtimePay: otPay,
    allowances: allow,
    deductions: {
      tax,
      epf,
      healthInsurance,
      advanceRecovery,
      total: totalDeductions
    },
    netSalary: net,
    paymentStatus: validStatus,
    paymentDate: validStatus === 'credited' ? (paymentDate || new Date().toISOString().split('T')[0]) : undefined,
    slipFileName: slipFileName || `payslip_${month}_${worker.name.toLowerCase().replace(/\s+/g, '_')}.pdf`,
    slipFileUrl: slipFileUrl || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    auditTrail: [
      {
        timestamp: new Date().toISOString(),
        actorEmail: actor.email,
        changes: `Created initial payslip draft for ${worker.name} (Net: ₹${net}, Status: ${validStatus})`
      }
    ]
  };

  data.payslips.push(newSlip);
  db.save();

  db.logAudit(actor.email, actor.role, 'CREATE_PAYSLIP', 'Payslip', `Created payslip ${newSlip.id} for ${worker.name}`);
  res.status(201).json({ payslip: newSlip });
});

apiRouter.put('/payslips/:id/status', authenticate, requireRole(['admin', 'super_admin']), (req: Request, res: Response) => {
  const actor = (req as any).user as User;
  const { paymentStatus, paymentDate, reasonNote } = req.body;
  const slipId = req.params.id;

  if (!['uploaded', 'pending', 'credited', 'under_review'].includes(paymentStatus)) {
    return res.status(400).json({ error: 'Invalid payment status' });
  }

  const data = db.get();
  const slip = data.payslips.find(p => p.id === slipId);
  if (!slip) return res.status(404).json({ error: 'Payslip not found' });

  const oldStatus = slip.paymentStatus;
  slip.paymentStatus = paymentStatus;
  slip.updatedAt = new Date().toISOString();
  if (paymentStatus === 'credited') {
    slip.paymentDate = paymentDate || new Date().toISOString().split('T')[0];
  }

  const changeText = `Status changed from '${oldStatus}' to '${paymentStatus}'${reasonNote ? ` (${reasonNote})` : ''}`;
  slip.auditTrail.push({
    timestamp: new Date().toISOString(),
    actorEmail: actor.email,
    changes: changeText
  });

  db.save();
  db.logAudit(actor.email, actor.role, 'UPDATE_PAYSLIP_STATUS', 'Payslip', `${slip.id}: ${changeText}`);

  res.json({ payslip: slip });
});

apiRouter.put('/payslips/:id', authenticate, requireRole(['admin', 'super_admin']), (req: Request, res: Response) => {
  const actor = (req as any).user as User;
  const slipId = req.params.id;
  const { basicSalary, overtimeHours, overtimePay, allowances, deductions, paymentStatus, correctionNote } = req.body;

  const data = db.get();
  const slip = data.payslips.find(p => p.id === slipId);
  if (!slip) return res.status(404).json({ error: 'Payslip not found' });

  if (basicSalary !== undefined) slip.basicSalary = Number(basicSalary);
  if (overtimeHours !== undefined) slip.overtimeHours = Number(overtimeHours);
  if (overtimePay !== undefined) slip.overtimePay = Number(overtimePay);
  if (allowances !== undefined) slip.allowances = Number(allowances);
  if (deductions) {
    slip.deductions = {
      tax: Number(deductions.tax) || 0,
      epf: Number(deductions.epf) || 0,
      healthInsurance: Number(deductions.healthInsurance) || 0,
      advanceRecovery: Number(deductions.advanceRecovery) || 0,
      total: (Number(deductions.tax) || 0) + (Number(deductions.epf) || 0) + (Number(deductions.healthInsurance) || 0) + (Number(deductions.advanceRecovery) || 0)
    };
  }
  if (paymentStatus) slip.paymentStatus = paymentStatus;

  slip.netSalary = (slip.basicSalary + slip.overtimePay + slip.allowances) - slip.deductions.total;
  slip.updatedAt = new Date().toISOString();

  const auditNote = `Corrected payslip values. New Net: ₹${slip.netSalary}. Note: ${correctionNote || 'Salary re-calculation'}`;
  slip.auditTrail.push({
    timestamp: new Date().toISOString(),
    actorEmail: actor.email,
    changes: auditNote
  });

  db.save();
  db.logAudit(actor.email, actor.role, 'EDIT_PAYSLIP', 'Payslip', `${slip.id}: ${auditNote}`);

  res.json({ payslip: slip });
});

// Bonus Routes
apiRouter.get('/bonuses', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const data = db.get();

  if (user.role === 'worker') {
    return res.json({ bonuses: data.bonuses.filter(b => b.workerId === user.id) });
  } else if (user.role === 'admin' || user.role === 'super_admin') {
    const workerId = req.query.workerId as string;
    const filtered = workerId ? data.bonuses.filter(b => b.workerId === workerId) : data.bonuses;
    return res.json({ bonuses: filtered });
  } else {
    return res.status(403).json({ error: 'Access denied' });
  }
});

apiRouter.post('/bonuses', authenticate, requireRole(['admin', 'super_admin']), (req: Request, res: Response) => {
  const actor = (req as any).user as User;
  const { workerId, bonusAmount, period, reason, paymentStatus, documentName, documentUrl, date } = req.body;

  if (!workerId || !bonusAmount || !reason) {
    return res.status(400).json({ error: 'Worker, amount, and reason are required' });
  }

  const data = db.get();
  const worker = data.users.find(u => u.id === workerId);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const newBonus: BonusSalaryItem = {
    id: `BNS-${Date.now().toString().slice(-6)}`,
    workerId,
    bonusAmount: Number(bonusAmount),
    period: period || 'Performance & Safety',
    reason,
    paymentStatus: paymentStatus || 'pending',
    documentName: documentName || 'bonus_approval_memo.pdf',
    documentUrl: documentUrl || '',
    date: date || new Date().toISOString().split('T')[0]
  };

  data.bonuses.push(newBonus);
  db.save();
  db.logAudit(actor.email, actor.role, 'CREATE_BONUS', 'Bonus', `Recorded ₹${newBonus.bonusAmount} bonus for ${worker.name}`);

  res.status(201).json({ bonus: newBonus });
});

apiRouter.put('/bonuses/:id/status', authenticate, requireRole(['admin', 'super_admin']), (req: Request, res: Response) => {
  const actor = (req as any).user as User;
  const { paymentStatus } = req.body;
  const bonusId = req.params.id;

  const data = db.get();
  const bonus = data.bonuses.find(b => b.id === bonusId);
  if (!bonus) return res.status(404).json({ error: 'Bonus not found' });

  bonus.paymentStatus = paymentStatus;
  db.save();
  db.logAudit(actor.email, actor.role, 'UPDATE_BONUS_STATUS', 'Bonus', `Updated bonus ${bonus.id} status to ${paymentStatus}`);

  res.json({ bonus });
});

// ==========================================
// 5. ANONYMOUS WORKER VOICE & REQUEST BOX
// ==========================================

// Critical: Truly Anonymous - ZERO workerId or userId saved!
apiRouter.post('/anonymous-reports', (req: Request, res: Response) => {
  const { category, title, description, attachmentUrl, attachmentName } = req.body;

  if (!category || !title || !description) {
    return res.status(400).json({ error: 'Category, title, and description are required' });
  }

  const validCategories = [
    'Salary problems',
    'Excessive shifts',
    'Safety concerns',
    'Facilities problems',
    'Unfair treatment',
    'Other'
  ];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  // Generate cryptographically random Request ID and Secret Claim Key
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const requestId = `REQ-${new Date().getFullYear()}-${randomSuffix}`;
  const claimKey = `CLAIM-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const claimTokenHash = hashToken(claimKey);

  // Auto-flag priority: urgent for Safety concerns
  const isSafety = category === 'Safety concerns';
  const priority = isSafety ? 'urgent' : 'normal';

  const report = {
    id: requestId,
    claimTokenHash,
    category: category as any,
    title: title.trim(),
    description: description.trim(),
    attachmentUrl: attachmentUrl || '',
    attachmentName: attachmentName || '',
    priority: priority as any,
    status: 'submitted' as const,
    voteCount: 1, // Submitter initial count
    voterTokens: [hashToken(claimKey)], // Submitter vote
    assignedTeam: isSafety ? 'Site Safety Inspection Team' : 'Workforce Relations Committee',
    adminUpdates: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const data = db.get();
  data.anonymousReports.unshift(report);
  db.save();

  // Return the secret claimKey once to the worker! No worker info in DB.
  res.status(201).json({
    requestId: report.id,
    claimKey,
    category: report.category,
    status: report.status,
    priority: report.priority,
    message: 'Report submitted completely anonymously. Save your Secret Claim Key to check status and reopen later!'
  });
});

// Public anonymized feed of reports (for browsing and voting)
apiRouter.get('/anonymous-reports', authenticate, (req: Request, res: Response) => {
  const data = db.get();
  // Strip claimTokenHash and voterTokens for public view!
  const sanitized = data.anonymousReports.map(({ claimTokenHash: _, voterTokens: __, ...r }) => r);
  res.json({ reports: sanitized });
});

// Community Voting: "I face this problem too"
apiRouter.post('/anonymous-reports/:id/vote', authenticate, (req: Request, res: Response) => {
  const reportId = req.params.id;
  const user = (req as any).user as User;

  const data = db.get();
  const report = data.anonymousReports.find(r => r.id === reportId);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  // Hash user's ID + a constant salt to prevent duplicate voting WITHOUT storing voter's email or identity in report
  const voterHash = crypto.createHash('sha256').update(user.id + '_anon_vote_salt').digest('hex');

  if (report.voterTokens.includes(voterHash)) {
    return res.status(400).json({ error: 'You have already voted for this issue' });
  }

  report.voterTokens.push(voterHash);
  report.voteCount += 1;
  report.updatedAt = new Date().toISOString();

  // If vote count reaches 10+ and not urgent, elevate priority to high
  if (report.voteCount >= 10 && report.priority === 'normal') {
    report.priority = 'high';
  }

  db.save();
  res.json({ success: true, voteCount: report.voteCount, message: 'Vote registered anonymously' });
});

// Worker private status lookup using Request ID and Claim Key
apiRouter.post('/anonymous-reports/lookup', (req: Request, res: Response) => {
  const { requestId, claimKey } = req.body;
  if (!requestId || !claimKey) {
    return res.status(400).json({ error: 'Both Request ID and Claim Key are required' });
  }

  const tokenHash = hashToken(claimKey);
  const data = db.get();
  const report = data.anonymousReports.find(r => r.id === requestId.trim().toUpperCase() && r.claimTokenHash === tokenHash);

  if (!report) {
    return res.status(404).json({ error: 'Invalid Request ID or Claim Key. Please verify your receipt.' });
  }

  const { claimTokenHash: _, voterTokens: __, ...safeReport } = report;
  res.json({ report: safeReport });
});

// Worker Reopen Request ("Still happening — reopen request")
apiRouter.post('/anonymous-reports/:id/reopen', (req: Request, res: Response) => {
  const reportId = req.params.id;
  const { claimKey, reopenReason } = req.body;

  if (!claimKey) {
    return res.status(400).json({ error: 'Claim Key required to verify ownership' });
  }

  const tokenHash = hashToken(claimKey);
  const data = db.get();
  const report = data.anonymousReports.find(r => r.id === reportId && r.claimTokenHash === tokenHash);

  if (!report) {
    return res.status(403).json({ error: 'Invalid Claim Key for this report' });
  }

  report.status = 'reopened';
  report.updatedAt = new Date().toISOString();
  report.adminUpdates.push({
    timestamp: new Date().toISOString(),
    updateText: `Worker flagged: Still happening — request reopened.${reopenReason ? ` Note: ${reopenReason}` : ''}`,
    updatedByRole: 'Worker (Anonymous)'
  });

  db.save();
  const { claimTokenHash: _, voterTokens: __, ...safeReport } = report;
  res.json({ success: true, report: safeReport });
});

// Admin Triage & Management of Anonymous Reports
apiRouter.put('/anonymous-reports/:id/triage', authenticate, requireRole(['admin', 'super_admin']), (req: Request, res: Response) => {
  const actor = (req as any).user as User;
  const reportId = req.params.id;
  const { status, priority, assignedTeam, progressNote, resolutionDetails } = req.body;

  const data = db.get();
  const report = data.anonymousReports.find(r => r.id === reportId);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  const validStatuses = ['submitted', 'under_review', 'in_progress', 'resolved', 'reopened', 'closed'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  if (status) report.status = status;
  if (priority) report.priority = priority;
  if (assignedTeam) report.assignedTeam = assignedTeam;
  if (resolutionDetails) report.resolutionDetails = resolutionDetails;

  if (progressNote) {
    report.adminUpdates.push({
      timestamp: new Date().toISOString(),
      updateText: progressNote,
      updatedByRole: actor.role === 'super_admin' ? 'Super Admin' : 'Admin'
    });
  }

  report.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(actor.email, actor.role, 'TRIAGE_ANON_REPORT', 'AnonymousReport', `Updated report ${report.id} to ${report.status} (${report.priority})`);

  const { claimTokenHash: _, voterTokens: __, ...safeReport } = report;
  res.json({ report: safeReport });
});

// ==========================================
// 6. AUDIT LOGS
// ==========================================

apiRouter.get('/audit-logs', authenticate, requireRole(['admin', 'super_admin']), (req: Request, res: Response) => {
  const data = db.get();
  res.json({ logs: data.auditLogs });
});
