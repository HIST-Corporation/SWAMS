import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from '../locales/en/common.json';
import enNav from '../locales/en/nav.json';
import enAttendance from '../locales/en/attendance.json';
import enDashboard from '../locales/en/dashboard.json';
import enMessages from '../locales/en/messages.json';
import enMeetings from '../locales/en/meetings.json';
import enTeam from '../locales/en/team.json';
import enVideo from '../locales/en/video.json';
import enLeave from '../locales/en/leave.json';
import enMarketing from '../locales/en/marketing.json';
import enNotifications from '../locales/en/notifications.json';
import enSettings from '../locales/en/settings.json';
import enAudit from '../locales/en/audit.json';
import enReports from '../locales/en/reports.json';
import enCalendar from '../locales/en/calendar.json';
import enTasks from '../locales/en/tasks.json';
import enConsole from '../locales/en/console.json';
import neCommon from '../locales/ne/common.json';
import neNav from '../locales/ne/nav.json';
import neAttendance from '../locales/ne/attendance.json';
import neDashboard from '../locales/ne/dashboard.json';
import neMessages from '../locales/ne/messages.json';
import neMeetings from '../locales/ne/meetings.json';
import neTeam from '../locales/ne/team.json';
import neVideo from '../locales/ne/video.json';
import neLeave from '../locales/ne/leave.json';
import neMarketing from '../locales/ne/marketing.json';
import neNotifications from '../locales/ne/notifications.json';
import neSettings from '../locales/ne/settings.json';
import neAudit from '../locales/ne/audit.json';
import neReports from '../locales/ne/reports.json';
import neCalendar from '../locales/ne/calendar.json';
import neTasks from '../locales/ne/tasks.json';
import neConsole from '../locales/ne/console.json';

export const LANGUAGES = ['en', 'ne'];
export const DEFAULT_LANGUAGE = 'en';

/** Per-feature namespaces live in `locales/{lng}/<feature>.json` (Section 8.10). */
export const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    attendance: enAttendance,
    dashboard: enDashboard,
    messages: enMessages,
    meetings: enMeetings,
    team: enTeam,
    video: enVideo,
    leave: enLeave,
    marketing: enMarketing,
    notifications: enNotifications,
    settings: enSettings,
    audit: enAudit,
    reports: enReports,
    tasks: enTasks,
    calendar: enCalendar,
    console: enConsole,
  },
  ne: {
    common: neCommon,
    nav: neNav,
    attendance: neAttendance,
    dashboard: neDashboard,
    messages: neMessages,
    meetings: neMeetings,
    team: neTeam,
    video: neVideo,
    leave: neLeave,
    marketing: neMarketing,
    notifications: neNotifications,
    settings: neSettings,
    audit: neAudit,
    reports: neReports,
    tasks: neTasks,
    calendar: neCalendar,
    console: neConsole,
  },
};

/**
 * Idempotent i18next bootstrap shared by web / marketing / console.
 * @param {{ lng?: string, fallbackLng?: string }} [options]
 */
export function initI18n(options = {}) {
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources,
      lng: options.lng ?? DEFAULT_LANGUAGE,
      fallbackLng: options.fallbackLng ?? DEFAULT_LANGUAGE,
      defaultNS: 'common',
      ns: [
        'common',
        'nav',
        'attendance',
        'dashboard',
        'messages',
        'meetings',
        'team',
        'video',
        'leave',
        'marketing',
        'notifications',
        'settings',
        'audit',
        'reports',
        'tasks',
        'calendar',
        'console',
      ],
      interpolation: {
        // React already escapes; ICU messages come from our own catalogs.
        escapeValue: false,
      },
      returnNull: false,
    });
  }
  return i18n;
}

export default i18n;
