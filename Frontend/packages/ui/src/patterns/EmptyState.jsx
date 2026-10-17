/**
 * Empty state (Section 8.1.4, 8.8): invites the first action — never a dead end.
 * Copy comes from i18n at the call site.
 * @param {{ icon?: React.ReactNode, title: string, body?: string, action?: React.ReactNode }} props
 */
export function EmptyState({ icon, title, body, action, className = '' }) {
  return (
    <div
      className={`bg-surface border-border text-text mx-auto flex max-w-[420px] flex-col items-center gap-3 rounded-card border px-6 py-10 text-center ${className}`}
    >
      {icon ? (
        <div className="bg-primary-soft text-primary flex h-11 w-11 items-center justify-center rounded-pill">
          {icon}
        </div>
      ) : null}
      <div className="space-y-1">
        <h2 className="text-md">{title}</h2>
        {body ? <p className="text-text-muted text-sm">{body}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
