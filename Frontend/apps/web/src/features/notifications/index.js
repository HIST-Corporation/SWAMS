// PUBLIC API — the only file outside this feature may import (Section 6.2 rule 1).
export { NotificationBell } from './components/NotificationBell.jsx';
export {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from './hooks/useNotifications.js';
