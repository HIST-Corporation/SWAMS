import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, MessageSquareOff, Send, Video } from 'lucide-react';
import { Avatar, Button, EmptyState } from '@swams/ui';
import { formatClock } from '@swams/i18n';
import { StatusDot } from './StaffList.jsx';
import { usePresenceStore } from '../../../stores/presence.js';

/**
 * Thread view — the open message box. The thread is sample fixture data and
 * the composer appends to local state only: like the video room's notes
 * scratchpad, the copy underneath says out loud that nothing leaves this
 * browser (§12.1), so a message can never look like it was sent.
 *
 * @param {{ person: object|null, messages: Array<object>, onSend: (text: string) => void }} props
 */
export function ThreadHeader({ person }) {
  const { t } = useTranslation('messages');
  const { t: tteam } = useTranslation('team');

  return (
    <header className="border-border flex items-center justify-between border-b px-4 py-2.5 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative">
          <Avatar name={person?.name ?? '?'} size="sm" hue="teal" />
          <span className="absolute right-0 bottom-0">
            <StatusDot status={person?.status ?? 'offline'} />
          </span>
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{person?.name}</p>
          <p className="text-text-muted truncate text-xs">
            {person?.roleKey ? tteam(`roles.${person.roleKey}`) : ''}
            {' · '}
            {tteam(`status.${person?.status ?? 'offline'}`)}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="border-border text-text-muted hover:bg-surface-sunken rounded-input border p-2 transition"
          aria-label={t('videoCall')}
          disabled
        >
          <Video aria-hidden="true" size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="border-border text-text-muted hover:bg-surface-sunken rounded-input border p-2 transition"
          aria-label={t('scheduleMeeting')}
          disabled
        >
          <CalendarDays aria-hidden="true" size={16} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}

export function ThreadBubbles({ messages }) {
  const { t } = useTranslation('messages');
  const endRef = useRef(null);

  // Keep the newest message in view (standard chat behaviour): when the thread
  // grows or switches, scroll to the bottom so the latest 2–4 messages are
  // always shown rather than a clipped older one. Purely presentational — the
  // messages themselves are still the sample fixture (§12.1).
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquareOff aria-hidden="true" size={20} strokeWidth={1.75} />}
        title={t('emptyThreadTitle')}
        body={t('emptyThreadBody')}
      />
    );
  }

  return (
    <>
      {messages.map((msg) => (
        <div key={msg.id} className={`flex ${msg.self ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-1.5 text-sm ${
              msg.self
                ? 'bg-primary text-on-primary rounded-br-sm'
                : 'bg-surface-sunken border-border rounded-bl-sm border'
            }`}
          >
            <p>{msg.text}</p>
            <p
              className={`mt-0.5 text-right text-xs ${msg.self ? 'text-on-primary' : 'text-text-muted'}`}
            >
              {msg.time}
            </p>
          </div>
        </div>
      ))}
      {/* Scroll anchor: rides just past the last bubble so scrollIntoView lands
          on the newest message, not the composer. */}
      <div ref={endRef} aria-hidden="true" />
    </>
  );
}

/**
 * The working composer. Sending appends to the thread in this tab — the note
 * underneath names that scope, so a local draft can never read as delivered
 * (§12.1).
 */
export function ThreadComposer({ onSend }) {
  const { t } = useTranslation('messages');
  const [draft, setDraft] = useState('');
  // Do not disturb pauses the composer (§5): the field is disabled and a line
  // says why in words, so a paused composer is never a silent dead control (§8.9).
  const paused = usePresenceStore((state) => state.status === 'do_not_disturb');

  return (
    <form
      className="border-border grid gap-1.5 border-t px-4 py-2.5 md:px-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (paused) return;
        onSend(draft);
        setDraft('');
      }}
    >
      <div className="flex gap-3">
        <input
          type="text"
          aria-label={t('composePlaceholder')}
          placeholder={t('composePlaceholder')}
          value={draft}
          disabled={paused}
          onChange={(event) => setDraft(event.target.value)}
          className="border-border bg-surface-sunken w-full flex-1 rounded-input border px-4 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-55"
        />
        <Button type="submit" size="sm" disabled={paused || !draft.trim()}>
          <Send aria-hidden="true" size={14} strokeWidth={1.75} />
          {t('send')}
        </Button>
      </div>
      {paused ? (
        <p role="status" className="text-warning-text text-xs">
          {t('paused')}
        </p>
      ) : (
        <p className="text-text-faint text-xs">{t('localNote')}</p>
      )}
    </form>
  );
}

/** The current wall time, the way the fixture rows stamp theirs. */
export function nowTime() {
  return formatClock(new Date(), { hour12: true });
}
