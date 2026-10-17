import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Mail } from 'lucide-react';
import { Button, Input, cn } from '@swams/ui';
import { APP_URL } from '../links.js';

/** Button size → the height the field wears beside it, so the pair in the
 *  row never mismatches (an h-11 field under an h-12 button reads as broken). */
const FIELD_HEIGHT = { md: 'h-10', lg: 'h-12' };

/**
 * Inline sign-up form (GitHub-homepage pattern, SWAMS branding): an email field
 * and a single action that opens the demo sign-in page in a new tab. There is
 * no backend on the landing (§7.7) — submitting hands the visitor to the session
 * machine, which autofills the selected role's demo account (§12.1: the demo is
 * never passed off as the live product).
 *
 * The field and the button share one height per size, the mail icon marks the
 * field the way the login screen does, and the coloured hover glow lives on the
 * button alone (`mkt-btn-glow`) — the form itself never lifts, so the two
 * halves can't slide apart under the cursor.
 *
 * Used by both the hero and the closing CTA, so the id prefix keeps the label's
 * `htmlFor` unique when both render on one page.
 */
export function SignupForm({ size = 'md', idPrefix = 'signup' }) {
  const { t } = useTranslation('marketing');
  const [email, setEmail] = useState('');

  const emailId = `${idPrefix}-email`;

  return (
    <form
      action={APP_URL}
      method="get"
      target="_blank"
      rel="noopener noreferrer"
      onSubmit={(event) => {
        event.preventDefault();
        window.open(APP_URL, '_blank', 'noopener,noreferrer');
      }}
      className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
      noValidate
    >
      <label htmlFor={emailId} className="sr-only">
        {t('hero.emailLabel')}
      </label>
      <div className="relative min-w-0 flex-1">
        <Mail
          aria-hidden="true"
          size={15}
          strokeWidth={1.75}
          className="text-text-faint pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        />
        <Input
          id={emailId}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t('hero.emailPlaceholder')}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={cn('pl-9', FIELD_HEIGHT[size])}
        />
      </div>
      <Button
        type="submit"
        size={size}
        className={cn('mkt-btn-glow shrink-0 whitespace-nowrap')}
      >
        {t('hero.signup')}
        <ArrowRight aria-hidden="true" size={16} strokeWidth={1.75} />
      </Button>
    </form>
  );
}
