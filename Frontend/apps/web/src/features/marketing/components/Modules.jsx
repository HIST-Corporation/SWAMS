import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  CalendarOff,
  Fingerprint,
  Gauge,
  ListTodo,
  MessageSquare,
  Sparkles,
  Video,
} from 'lucide-react';
import { useReveal, revealClasses } from '../hooks/useReveal.js';

/**
 * Category tints carry the meaning (Section 9.3): attendance indigo, work
 * teal, time off marigold, comms violet, meetings rose — and no two neighbours
 * repeat. Attendance (first) and AI (last) span the full row so the eight read
 * as a hierarchy rather than an identical card kit (Section 9.2).
 */
const MODULES = [
  { key: 'attendance', Icon: Fingerprint, tone: 'bg-chip-indigo text-chip-indigo-fg' },
  { key: 'tasks', Icon: ListTodo, tone: 'bg-chip-teal text-chip-teal-fg' },
  { key: 'leave', Icon: CalendarOff, tone: 'bg-chip-marigold text-chip-marigold-fg' },
  { key: 'calendar', Icon: CalendarDays, tone: 'bg-chip-teal text-chip-teal-fg' },
  { key: 'messaging', Icon: MessageSquare, tone: 'bg-chip-violet text-chip-violet-fg' },
  { key: 'video', Icon: Video, tone: 'bg-chip-rose text-chip-rose-fg' },
  { key: 'dashboards', Icon: Gauge, tone: 'bg-chip-indigo text-chip-indigo-fg' },
  { key: 'ai', Icon: Sparkles, tone: 'bg-chip-teal text-chip-teal-fg' },
];

/** First and last rows take both columns (odd counts never leave a hole). */
const spansRow = (index) => index === 0 || index === MODULES.length - 1;

/**
 * The eight modules (Section 12 parity row) as a bento. Each card's icon chip
 * is decorative — the heading beside it names the module (§8.9).
 */
export function Modules() {
  const { t } = useTranslation('marketing');
  const [ref, shown] = useReveal();

  return (
    <section
      id="features"
      aria-labelledby="features-title"
      ref={ref}
      className={`mx-auto w-full max-w-[1180px] px-4 py-14 md:px-6 md:py-20 ${revealClasses(shown)}`}
    >
      <div className="max-w-[62ch]">
        <p className="text-primary text-sm font-semibold">{t('modules.kicker')}</p>
        <h2 id="features-title" className="font-display mt-3 text-xl font-bold md:text-2xl">
          {t('modules.title')}
        </h2>
        <p className="text-text-muted mt-3 text-md">{t('modules.lead')}</p>
      </div>

      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {MODULES.map(({ key, Icon, tone }, index) => (
          <li
            key={key}
            className={`border-border bg-surface hover:border-border-strong mkt-pop mkt-sheen mkt-pop-card rounded-card border p-5 ${
              spansRow(index) ? 'md:col-span-2' : ''
            }`}
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-input ${tone}`}
              >
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <div>
                <h3 className="text-base font-semibold">{t(`modules.items.${key}.title`)}</h3>
                <p className="text-text-muted mt-1 text-sm">{t(`modules.items.${key}.body`)}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
