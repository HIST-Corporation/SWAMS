import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, PreviewNotice } from '@swams/ui';
import { PAST_MEETUPS, POLL } from '../mocks/meetup-fixtures.js';

/**
 * `/meetup` — availability poll for group events (screen inventory R2).
 * SAMPLE DATA: choosing an option updates local state only; the vote is never
 * sent anywhere, so the page carries the preview notice and the confirm button
 * is honest about it (§12.1 — no control may fake a success).
 */
export function TeamMeetupPage() {
  const { t } = useTranslation('team');
  const [selected, setSelected] = useState('fri');

  return (
    <div className="mx-auto grid max-w-page gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl">{t('meetup.title')}</h1>
          <p className="text-text-muted mt-1 text-sm">{t('meetup.subtitle')}</p>
        </div>
        <Button size="sm" disabled>
          {t('meetup.createPoll')}
        </Button>
      </header>

      <PreviewNotice />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="border-border bg-surface rounded-card border p-6">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{t(`meetup.${POLL.titleKey}`)}</h2>
              <p className="text-text-muted mt-1 text-sm">{t(`meetup.${POLL.closesKey}`)}</p>
            </div>
            <span className="bg-warning-soft text-warning-text rounded-pill px-2 py-0.5 text-xs">
              {t(`meetup.${POLL.status}`)}
            </span>
          </div>

          <fieldset className="grid gap-3">
            <legend className="sr-only">{t('meetup.title')}</legend>
            {POLL.options.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center justify-between rounded-input border px-4 py-3 transition hover:bg-surface-sunken ${
                  selected === option.id
                    ? 'border-primary bg-primary-soft'
                    : 'border-border bg-surface-sunken'
                }`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="meetup"
                    checked={selected === option.id}
                    onChange={() => setSelected(option.id)}
                    className="accent-primary"
                  />
                  <span className="text-sm">{option.label}</span>
                </span>
                <span className="text-text-muted text-xs">
                  {t('meetup.votes', { count: option.votes })}
                </span>
              </label>
            ))}
          </fieldset>

          <Button className="mt-6 w-full justify-center" disabled>
            {t('meetup.confirmDate')}
          </Button>
        </section>

        <section className="border-border bg-surface rounded-card border p-6">
          <h2 className="text-text-muted mb-4 text-sm font-semibold">{t('meetup.pastTitle')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-left text-xs font-semibold">
                  <th className="pb-3">{t('meetup.column.event')}</th>
                  <th className="pb-3">{t('meetup.column.date')}</th>
                  <th className="pb-3">{t('meetup.column.attendees')}</th>
                  <th className="pb-3">{t('meetup.column.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PAST_MEETUPS.map((meetup) => (
                  <tr key={meetup.id}>
                    <td className="py-3 pr-4">{t(`meetup.${meetup.eventKey}`)}</td>
                    <td className="tabular text-text-muted py-3 pr-4">{meetup.date}</td>
                    <td className="tabular text-text-muted py-3 pr-4">{meetup.attendees}</td>
                    <td className="py-3">
                      <span className="bg-success-soft text-success-text rounded-pill px-2 py-0.5 text-xs">
                        {t(`meetup.${meetup.statusKey}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
