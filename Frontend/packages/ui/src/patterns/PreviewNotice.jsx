import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import { cn } from '../utils/cn.js';

/**
 * PreviewNotice (Section 12.1): a screen backed by sample data says so before
 * anyone can mistake a mock for production behavior. Copy comes from the
 * default `common` namespace; the component only lays it out.
 *
 * `badgeKey` / `bodyKey` let a surface name which scope is sample-backed when
 * only part of a screen is — a page whose main half is live should not claim
 * the whole screen is a preview. Both default to the generic `preview.*` copy,
 * so existing callers are unchanged.
 *
 * @param {{ className?: string, badgeKey?: string, bodyKey?: string }} props
 */
export function PreviewNotice({ className, badgeKey = 'preview.badge', bodyKey = 'preview.body' }) {
  const { t } = useTranslation();
  return (
    <aside
      className={cn(
        // A tinted panel needs one visible edge: `info-soft` over the page sits
        // at 1.07:1, so without the hairline the notice reads as stray text on
        // the page instead of a panel (worst in the light theme).
        'bg-info-soft text-info-text border-info/30 flex items-start gap-3 rounded-card border px-4 py-3 text-sm',
        className,
      )}
    >
      <Eye aria-hidden="true" className="mt-0.5 shrink-0" size={16} strokeWidth={1.75} />
      <p>
        <span className="font-semibold">{t(badgeKey)}</span>
        <span className="opacity-90"> — {t(bodyKey)}</span>
      </p>
    </aside>
  );
}
