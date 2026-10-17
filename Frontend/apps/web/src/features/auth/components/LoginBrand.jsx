import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  ChartLine,
  Fingerprint,
  LayoutGrid,
  MessageSquare,
  Video,
} from 'lucide-react';

/** Literal class names so Tailwind's content scan generates them. */
const FEATURES = [
  { key: 'attendance', Icon: Fingerprint, tone: 'text-primary' },
  { key: 'tasks', Icon: LayoutGrid, tone: 'text-success' },
  { key: 'messaging', Icon: MessageSquare, tone: 'text-violet' },
  { key: 'insights', Icon: ChartLine, tone: 'text-warning' },
  { key: 'leave', Icon: CalendarDays, tone: 'text-info' },
  { key: 'video', Icon: Video, tone: 'text-rose' },
];

/**
 * The left brand panel of the prototype's `#login-screen`
 * (SWAMS_Unified.html): a deep gradient with a faint grid, two floating orbs,
 * the wordmark, a headline whose last word is a gradient, a 2×3 feature grid,
 * and a three-up stats strip.
 *
 * The whole panel is scoped to `data-theme="dark"` so every token inside it
 * resolves to its dark value regardless of the page theme — the prototype's
 * panel is always dark, and without the scope its `text-*` tokens would pick
 * up the light theme's ink and vanish (this shipped broken and was caught on
 * screen, 2026-10-11).
 *
 * The grid and orbs are pure decoration (`aria-hidden`), and the stats strip
 * carries no claim about *this* organization — it is the product's own
 * marketing figures (Section 9.6).
 */
export function LoginBrand() {
  const { t } = useTranslation();

  return (
    <div
      data-theme="dark"
      className="bg-surface relative hidden w-[44%] shrink-0 overflow-hidden border-r border-border p-12 lg:flex lg:flex-col lg:justify-between"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(79,110,247,1)_1px,transparent_1px),linear-gradient(90deg,rgba(79,110,247,1)_1px,transparent_1px)] [background-size:40px_40px]"
      />
      <div
        aria-hidden="true"
        className="bg-primary/15 absolute -top-24 -left-24 h-[400px] w-[400px] rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="bg-violet/10 absolute -right-20 -bottom-20 h-[300px] w-[300px] rounded-full blur-3xl"
      />

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <span className="bg-[linear-gradient(135deg,var(--primary),var(--panel-dot2))] grid h-[38px] w-[38px] place-items-center rounded-input">
            <Fingerprint aria-hidden="true" size={17} strokeWidth={2} className="text-white" />
          </span>
          <span className="font-display text-text text-[21px] font-extrabold tracking-tight">
            {t('app.name')}
          </span>
          <span className="border-primary/25 bg-primary/15 text-primary rounded-pill border px-2 py-0.5 text-[10px] font-semibold">
            {t('login.version')}
          </span>
        </div>
        <p className="text-text-faint mt-1.5 text-[11px] tracking-wide">
          {t('login.brandTagline')}
        </p>

        <h2 className="font-display text-text mt-11 text-[38px] leading-[1.15] font-extrabold">
          {t('login.brandHeadline')}
          <br />
          <span className="bg-[linear-gradient(90deg,var(--primary),var(--panel-dot2))] bg-clip-text text-transparent">
            {t('login.brandHeadlineAccent')}
          </span>
        </h2>
        <p className="text-text-muted mt-4 max-w-[280px] text-sm leading-relaxed">
          {t('login.brandBody')}
        </p>
      </div>

      <div className="relative">
        <p className="text-text-faint mb-2.5 text-[11px] tracking-widest uppercase">
          {t('login.featuresLabel')}
        </p>
        <ul className="mb-4 grid grid-cols-2 gap-[7px]">
          {FEATURES.map(({ key, Icon, tone }) => (
            <li
              key={key}
              className="border-border bg-surface-sunken/60 text-text-muted flex items-center gap-2 rounded-input border px-3 py-2.5 text-xs"
            >
              <Icon aria-hidden="true" size={14} strokeWidth={2} className={tone} />
              {t(`login.features.${key}`)}
            </li>
          ))}
        </ul>

        <dl className="border-border flex border-t">
          {[
            { key: 'employees', value: '142', tone: 'text-primary' },
            { key: 'attendance', value: '89.4%', tone: 'text-success' },
            { key: 'departments', value: '12', tone: 'text-violet' },
          ].map((item, index) => (
            <div
              key={item.key}
              className={`flex-1 py-3 text-center ${index < 2 ? 'border-border border-r' : ''}`}
            >
              <dd className={`font-display text-[20px] font-extrabold ${item.tone}`}>
                {item.value}
              </dd>
              <dt className="text-text-faint mt-0.5 text-[10px]">{t(`login.stats.${item.key}`)}</dt>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
