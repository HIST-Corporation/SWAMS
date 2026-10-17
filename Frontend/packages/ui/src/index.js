// Theme system (Section 8.3)
export {
  ThemeProvider,
  useTheme,
  applyTheme,
  readStoredTheme,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
} from './theme/ThemeProvider.jsx';
export { ThemeToggle } from './theme/ThemeToggle.jsx';

// Primitives (Section 8.7)
export { Button, buttonVariants } from './primitives/Button.jsx';
export { IconButton } from './primitives/IconButton.jsx';
export { Input } from './primitives/Input.jsx';
export { Textarea } from './primitives/Textarea.jsx';
export { Checkbox } from './primitives/Checkbox.jsx';
export { Switch } from './primitives/Switch.jsx';
export { Badge, badgeVariants } from './primitives/Badge.jsx';
export { Avatar, AVATAR_SIZES, AVATAR_HUES } from './primitives/Avatar.jsx';
export { Skeleton } from './primitives/Skeleton.jsx';

// Patterns (Section 8.7)
export { FormField } from './patterns/FormField.jsx';
export { EmptyState } from './patterns/EmptyState.jsx';
export { PreviewNotice } from './patterns/PreviewNotice.jsx';
export { ErrorState } from './patterns/ErrorState.jsx';
export { StatTile } from './patterns/StatTile.jsx';
export { Card, CardTitle, PageHeader } from './patterns/Card.jsx';
export { CommandPalette } from './patterns/CommandPalette.jsx';
export { Stepper } from './patterns/Stepper.jsx';

// Feedback
export { ToastProvider, useToast } from './feedback/Toast.jsx';

// Utilities
export { cn } from './utils/cn.js';
