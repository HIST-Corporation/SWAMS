// @ts-check
/**
 * Seed — Himal Digital Pvt. Ltd. with the frontend's demo accounts so the
 * web app signs in without changes. Password for every demo account is
 * `password` (matches the login screen's DEMO CREDENTIALS card).
 *
 * Ids are FIXED strings (not cuids) so fixtures across apps agree.
 * Run: pnpm db:seed  (idempotent — upserts on stable keys)
 */
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const ORG_ID = 'org_himal';
const PASSWORD = 'password';

/** Roster mirrors Frontend/apps/web/src/mocks/roster.js exactly (§8.8). */
const ROSTER = [
  { id: 'u_aarav', name: 'Aarav Khadka', email: 'aarav@swams.com', jobKey: 'ceo', jobTitle: 'CEO', dept: 'Executive', site: 'Baneshwor', role: 'owner', staffRole: null },
  { id: 'u_sarah', name: 'Sarah Mitchell', email: 'sarah@swams.com', jobKey: 'hrManager', jobTitle: 'HR Manager', dept: 'HR', site: 'Baneshwor', role: 'hr', staffRole: null },
  { id: 'u_sita', name: 'Sita Shrestha', email: 'sita@swams.com', jobKey: 'hrOfficer', jobTitle: 'HR Officer', dept: 'HR', site: 'Baneshwor', role: 'hr', staffRole: null },
  { id: 'u_ramesh', name: 'Ramesh Adhikari', email: 'ramesh@swams.com', jobKey: 'engineeringManager', jobTitle: 'Engineering Manager', dept: 'Engineering', site: 'Baneshwor', role: 'manager', staffRole: null },
  { id: 'u_anita', name: 'Anita Thapa', email: 'anita@swams.com', jobKey: 'frontendLead', jobTitle: 'Frontend Lead', dept: 'Engineering', site: 'Lalitpur', role: 'team_lead', staffRole: null },
  { id: 'u_priya', name: 'Priya Sharma', email: 'priya@swams.com', jobKey: 'frontend', jobTitle: 'Frontend Engineer', dept: 'Engineering', site: 'Baneshwor', role: 'staff', staffRole: 'fe' },
  { id: 'u_james', name: 'James Wilson', email: 'james@swams.com', jobKey: 'backend', jobTitle: 'Backend Engineer', dept: 'Engineering', site: 'Lalitpur', role: 'staff', staffRole: 'be' },
  { id: 'u_prakash', name: 'Prakash Gurung', email: 'prakash@swams.com', jobKey: 'backend', jobTitle: 'Backend Engineer', dept: 'Engineering', site: 'Pokhara', role: 'staff', staffRole: 'be' },
  { id: 'u_tina', name: 'Tina Nguyen', email: 'tina@swams.com', jobKey: 'qa', jobTitle: 'QA Engineer', dept: 'Engineering', site: 'Baneshwor', role: 'staff', staffRole: 'qa' },
  { id: 'u_sunita', name: 'Sunita Rai', email: 'sunita@swams.com', jobKey: 'qa', jobTitle: 'QA Engineer', dept: 'Engineering', site: 'Baneshwor', role: 'staff', staffRole: 'qa' },
  { id: 'u_raj', name: 'Raj Kumar', email: 'raj@swams.com', jobKey: 'devops', jobTitle: 'DevOps Engineer', dept: 'Engineering', site: 'Pokhara', role: 'staff', staffRole: 'devops' },
  { id: 'u_bibek', name: 'Bibek Karki', email: 'bibek@swams.com', jobKey: 'devops', jobTitle: 'DevOps Engineer', dept: 'Engineering', site: 'Lalitpur', role: 'staff', staffRole: 'devops' },
  { id: 'u_aarati', name: 'Aarati Bhandari', email: 'aarati@swams.com', jobKey: 'design', jobTitle: 'Product Designer', dept: 'Design', site: 'Baneshwor', role: 'staff', staffRole: null },
  { id: 'u_nabin', name: 'Nabin Shrestha', email: 'nabin@swams.com', jobKey: 'marketing', jobTitle: 'Marketing Lead', dept: 'Marketing', site: 'Lalitpur', role: 'staff', staffRole: null },
  { id: 'u_kiran', name: 'Kiran Lama', email: 'kiran@swams.com', jobKey: 'finance', jobTitle: 'Finance Officer', dept: 'Finance', site: 'Baneshwor', role: 'staff', staffRole: null },
  { id: 'u_anisha', name: 'Anisha Gurung', email: 'anisha@swams.com', jobKey: 'support', jobTitle: 'Support Specialist', dept: 'Support', site: 'Pokhara', role: 'staff', staffRole: null },
  { id: 'u_admin', name: 'Admin Demo', email: 'admin@swams.com', jobKey: 'hrManager', jobTitle: 'HR Manager', dept: 'HR', site: 'Baneshwor', role: 'hr', staffRole: null },
  { id: 'u_hrdemo', name: 'HR Demo', email: 'hr@swams.com', jobKey: 'hrManager', jobTitle: 'HR Manager', dept: 'HR', site: 'Baneshwor', role: 'hr', staffRole: null },
  { id: 'u_staffdemo', name: 'Staff Demo', email: 'staff@swams.com', jobKey: 'frontend', jobTitle: 'Frontend Engineer', dept: 'Engineering', site: 'Baneshwor', role: 'staff', staffRole: 'fe' },
  { id: 'u_mfa', name: 'Mingma Demo', email: 'mfa@himaldigital.com.np', jobKey: 'backend', jobTitle: 'Backend Engineer', dept: 'Engineering', site: 'Baneshwor', role: 'staff', staffRole: 'be', mfa: true },
];

const initialsOf = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

const SITES = [
  { name: 'Baneshwor', lat: 27.6895, lng: 85.3415, radiusM: 150 },
  { name: 'Lalitpur', lat: 27.6588, lng: 85.3247, radiusM: 120 },
  { name: 'Pokhara', lat: 28.2096, lng: 83.9856, radiusM: 200 },
];

const HOLIDAYS = [
  { date: '2026-10-20', title: 'Dashain begins' },
  { date: '2026-10-24', title: 'Vijaya Dashami' },
  { date: '2026-11-09', title: 'Tihar begins' },
  { date: '2026-11-12', title: 'Bhai Tika' },
];

const LANES = [
  { key: 'todo', name: null, wipLimit: 4, position: 0 },
  { key: 'in_progress', name: null, wipLimit: 3, position: 1 },
  { key: 'review', name: null, wipLimit: 3, position: 2 },
  { key: 'revision', name: null, wipLimit: null, position: 3 },
  { key: 'done', name: null, wipLimit: null, position: 4 },
];

async function main() {
  const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });

  const org = await prisma.org.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      name: 'Himal Digital Pvt. Ltd.',
      slug: 'himal-digital',
      timezone: 'Asia/Kathmandu',
      fiscalYearStart: '07-16',
      plan: 'Growth',
      seats: 42,
      status: 'active',
      requiresLocation: true,
      allowOverride: false,
    },
  });

  const deptNames = [...new Set(ROSTER.map((r) => r.dept))];
  const departments = new Map();
  for (const name of deptNames) {
    const existing = await prisma.department.findFirst({ where: { orgId: org.id, name } });
    const dept = existing ?? (await prisma.department.create({ data: { orgId: org.id, name } }));
    departments.set(name, dept.id);
  }

  for (const site of SITES) {
    const existing = await prisma.site.findFirst({ where: { orgId: org.id, name: site.name } });
    if (!existing) await prisma.site.create({ data: { orgId: org.id, ...site } });
  }

  const shift = await prisma.shift.findFirst({ where: { orgId: org.id } });
  if (!shift) {
    await prisma.shift.create({
      data: { orgId: org.id, name: 'General', startTime: '09:00', endTime: '17:30', workdayMinutes: 480 },
    });
  }

  for (const person of ROSTER) {
    const user = await prisma.user.upsert({
      where: { id: person.id },
      update: { role: person.role, active: true },
      create: {
        id: person.id,
        orgId: org.id,
        email: person.email,
        passwordHash,
        name: person.name,
        initials: initialsOf(person.name),
        jobTitle: person.jobTitle,
        jobKey: person.jobKey,
        staffRole: person.staffRole,
        role: person.role,
        departmentId: departments.get(person.dept) ?? null,
        site: person.site,
        mfaEnabled: Boolean(person.mfa),
        mfaSecret: person.mfa ? '123456' : null,
      },
    });
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, theme: 'system', language: 'en', calendar: 'bs' },
    });
    const entitlements =
      person.role === 'staff'
        ? ['attendance', 'leave', 'tasks']
        : ['attendance', 'leave', 'tasks', 'calendar'];
    for (const key of entitlements) {
      await prisma.userEntitlement.upsert({
        where: { userId_key: { userId: user.id, key } },
        update: {},
        create: { userId: user.id, key },
      });
    }
  }

  const teams = [
    { name: 'Frontend', leadId: 'u_anita', members: ['u_priya', 'u_tina', 'u_sunita'] },
    { name: 'Backend', leadId: 'u_james', members: ['u_prakash'] },
    { name: 'DevOps', leadId: 'u_raj', members: ['u_bibek'] },
  ];
  for (const team of teams) {
    const existing = await prisma.team.findFirst({ where: { orgId: org.id, name: team.name } });
    const record =
      existing ??
      (await prisma.team.create({
        data: {
          orgId: org.id,
          name: team.name,
          leadId: team.leadId,
          departmentId: departments.get('Engineering') ?? null,
        },
      }));
    for (const memberId of team.members) {
      await prisma.user.update({
        where: { id: memberId },
        data: { memberTeams: { connect: { id: record.id } } },
      });
    }
  }

  for (const holiday of HOLIDAYS) {
    const existing = await prisma.holiday.findFirst({
      where: { orgId: org.id, date: holiday.date, title: holiday.title },
    });
    if (!existing) await prisma.holiday.create({ data: { orgId: org.id, ...holiday } });
  }

  for (const lane of LANES) {
    await prisma.taskLane.upsert({
      where: { orgId_key: { orgId: org.id, key: lane.key } },
      update: { wipLimit: lane.wipLimit, position: lane.position },
      create: { orgId: org.id, ...lane },
    });
  }

  const LEAVE_TYPES = [
    { key: 'annual', name: 'Annual leave', entitled: 15 },
    { key: 'sick', name: 'Sick leave', entitled: 10 },
    { key: 'unpaid', name: 'Unpaid leave', entitled: 0 },
    { key: 'special', name: 'Special leave', entitled: 3 },
  ];
  for (const type of LEAVE_TYPES) {
    await prisma.leaveType.upsert({
      where: { orgId_key: { orgId: org.id, key: type.key } },
      update: { entitled: type.entitled },
      create: { orgId: org.id, ...type },
    });
  }
  // Anita's demo balance matches the leave fixture exactly (15/2/1/12).
  await prisma.leaveBalance.upsert({
    where: { orgId_userId_typeKey: { orgId: org.id, userId: 'u_anita', typeKey: 'annual' } },
    update: { entitled: 15, used: 2, pending: 1 },
    create: { orgId: org.id, userId: 'u_anita', typeKey: 'annual', entitled: 15, used: 2, pending: 1 },
  });

  // Demo requests so both sides of the leave queue render on first login.
  const pendingExists = await prisma.leaveRequest.findFirst({
    where: { orgId: org.id, requesterId: 'u_prakash', status: 'pending' },
  });
  if (!pendingExists) {
    await prisma.leaveRequest.create({
      data: {
        orgId: org.id,
        requesterId: 'u_prakash',
        typeKey: 'annual',
        from: '2026-10-27',
        to: '2026-10-29',
        days: 3,
        reason: 'Family function in Chitwan.',
        status: 'pending',
      },
    });
  }
  const anitaPending = await prisma.leaveRequest.findFirst({
    where: { orgId: org.id, requesterId: 'u_anita', status: 'pending' },
  });
  if (!anitaPending) {
    await prisma.leaveRequest.create({
      data: {
        orgId: org.id,
        requesterId: 'u_anita',
        typeKey: 'annual',
        from: '2026-10-20',
        to: '2026-10-22',
        days: 3,
        reason: 'Dashain travel to Pokhara.',
        status: 'pending',
      },
    });
  }

  const sampleTasks = [
    { id: 'tsk_seed_1', title: 'Prepare the monthly payroll export', description: 'Finance needs the CSV before the 15th.', lane: 'todo', priority: 'high', assigneeId: 'u_anita', reviewerId: null, due: null, kind: 'doc', meta: 'payroll' },
    { id: 'tsk_seed_2', title: 'Draft the onboarding checklist for new hires', description: 'Cover laptop, accounts and the first-week plan.', lane: 'todo', priority: 'normal', assigneeId: 'u_sita', reviewerId: null, due: null, kind: 'doc', meta: 'onboarding' },
    { id: 'tsk_seed_3', title: 'Review the punch-policy PR before the 2.4.1 cut', description: '', lane: 'review', priority: 'high', assigneeId: 'u_priya', reviewerId: 'u_anita', due: null, kind: 'review', meta: 'swams-api #412' },
    { id: 'tsk_seed_4', title: 'Regression pass: punch offline queue and retry', description: '', lane: 'in_progress', priority: 'high', assigneeId: 'u_tina', reviewerId: null, due: null, kind: 'test', meta: 'run sheet R2' },
    { id: 'tsk_seed_5', title: 'Rotate the staging database credentials', description: '', lane: 'todo', priority: 'high', assigneeId: 'u_raj', reviewerId: null, due: null, kind: 'ops', meta: 'quarterly rotation' },
    { id: 'tsk_seed_6', title: 'Handbook update — festival holiday list', description: '', lane: 'revision', priority: 'normal', assigneeId: 'u_priya', reviewerId: 'u_anita', due: null, note: 'Legal wants the leave-year wording clarified.', kind: 'doc', meta: 'handbook' },
  ];
  for (const task of sampleTasks) {
    const exists = await prisma.task.findUnique({ where: { id: task.id } });
    if (!exists) await prisma.task.create({ data: { orgId: org.id, ...task } });
  }
  const revisionExists = await prisma.taskRevision.findFirst({
    where: { orgId: org.id, taskId: 'tsk_seed_6' },
  });
  if (!revisionExists) {
    await prisma.taskRevision.create({
      data: {
        orgId: org.id,
        taskId: 'tsk_seed_6',
        taskTitle: 'Handbook update — festival holiday list',
        issue: 'Legal wants the leave-year wording clarified.',
        suggestion: 'Quote the FY start date (07-16) explicitly.',
        severity: 'minor',
        reviewer: 'Anita Thapa',
        date: '2026-10-12',
      },
    });
  }

  const corrExists = await prisma.attendanceCorrection.findFirst({
    where: { orgId: org.id, requesterId: 'u_prakash' },
  });
  if (!corrExists) {
    await prisma.attendanceCorrection.create({
      data: {
        orgId: org.id,
        requesterId: 'u_prakash',
        date: '2026-10-04',
        payload: {
          original: { id: 'punch_seed_1', clockIn: '09:38', clockOut: '16:20', date: '2026-10-04' },
          proposed: { clockIn: '09:02', clockOut: '16:20' },
        },
        reason: 'Bus strike in Pokhara — the punch registered late at the gate.',
        status: 'in_review',
      },
    });
  }

  const seedNotifications = [
    { userId: 'u_sarah', kind: 'leave', key: 'leaveRequested', params: { name: 'Anita Thapa' }, link: '/leave', read: false, minutesAgo: 35 },
    { userId: 'u_sarah', kind: 'attendance', key: 'correctionNeedsReview', params: {}, link: '/attendance/corrections', read: false, minutesAgo: 95 },
    { userId: 'u_priya', kind: 'meeting', key: 'meetingReminder', params: { title: 'Design sync' }, link: '/meetings', read: false, minutesAgo: 12 },
    { userId: 'u_priya', kind: 'leave', key: 'leaveApproved', params: {}, link: '/leave', read: true, minutesAgo: 1500 },
    { userId: 'u_priya', kind: 'system', key: 'passwordChanged', params: {}, link: null, read: true, minutesAgo: 2900 },
  ];
  for (const n of seedNotifications) {
    const exists = await prisma.notification.findFirst({
      where: { orgId: org.id, userId: n.userId, key: n.key },
    });
    if (!exists) {
      await prisma.notification.create({
        data: {
          orgId: org.id,
          userId: n.userId,
          kind: n.kind,
          key: n.key,
          params: n.params,
          link: n.link,
          audience: 'all',
          read: n.read,
          createdAt: new Date(Date.now() - n.minutesAgo * 60_000),
        },
      });
    }
  }

  // Platform console admins — a SEPARATE realm (contract row 31). The
  // console's demo credentials (admin@swams.com / password) live here; the
  // workforce `admin@swams.com` HR account is a different table entirely.
  const consoleAdmins = [
    { id: 'pa_1', name: 'Aashish Rana', email: 'admin@swams.com', level: 'owner' },
    { id: 'pa_2', name: 'Mingmar Sherpa', email: 'support@swams.com', level: 'support' },
  ];
  for (const admin of consoleAdmins) {
    const existing = await prisma.platformAdmin.findUnique({ where: { id: admin.id } });
    if (!existing) {
      await prisma.platformAdmin.create({ data: { ...admin, passwordHash, lastSeenAt: new Date() } });
    }
  }

  // Extra tenants so the console's org list is not a single row.
  const extraOrgs = [
    { id: 'org_annapurna', name: 'Annapurna Retail Pvt. Ltd.', slug: 'annapurna-retail', plan: 'Growth', seats: 128, status: 'active' },
    { id: 'org_kathmanduCraft', name: 'Kathmandu Craft Cooperative', slug: 'kathmandu-craft', plan: 'Starter', seats: 17, status: 'trial' },
  ];
  for (const extra of extraOrgs) {
    const existing = await prisma.org.findUnique({ where: { id: extra.id } });
    if (!existing) await prisma.org.create({ data: extra });
  }



  console.log(`Seeded ${ROSTER.length} users, ${SITES.length} sites, org "${org.name}".`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

