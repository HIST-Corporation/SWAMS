import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, ChevronRight, FileText, MessageSquare, Users } from 'lucide-react';
import { Avatar, Badge, Button, IconButton, cn } from '@swams/ui';
import { InvitePanel } from './InvitePanel.jsx';
import { AiPanel } from './AiPanel.jsx';

const TABS = [
  { id: 'participants', icon: Users },
  { id: 'chat', icon: MessageSquare },
  { id: 'notes', icon: FileText },
  { id: 'ai', icon: Bot },
];

/** Tab id → its visible label key (the tablist speaks in words, §8.9). */
const TAB_LABEL = {
  participants: 'participants',
  chat: 'inCallChat',
  notes: 'meetingNotes',
  ai: 'ai.tab',
};

/**
 * The room's side panel — participants (+ invite), in-call chat, notes and the
 * AI assistant — as real tabs (`role="tablist"` with `aria-selected`/
 * `aria-controls`) rather than stacked boxes, so the stage keeps its width on
 * a laptop. Each tab shows icon + word, and the hide button collapses the rail.
 *
 * Honesty per tab: the participant list and chat are sample data; the invite
 * section posts a real call request (§7.5); the notes tab is a local
 * scratchpad that nothing uploads; the AI tab is a labelled sample assistant.
 *
 * @param {{
 *   tab: string, onTab: (id: string) => void, onClose: () => void,
 *   participants: Array<{id: string, name: string, you?: boolean, speaking?: boolean}>,
 *   messages: Array<{id: string, self?: boolean, text: string}>,
 *   roster: Array<object>, micOn: boolean,
 * }} props
 */
export function RoomRail({ tab, onTab, onClose, participants, messages, roster, micOn }) {
  const { t } = useTranslation('video');

  return (
    <aside className="border-stage-border bg-stage-raised flex h-56 w-full shrink-0 flex-col overflow-hidden rounded-card border lg:h-auto lg:w-80">
      <div className="border-stage-border flex items-start gap-1 border-b p-1.5">
        <div
          role="tablist"
          aria-label={t('railLabel')}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-1"
        >
          {TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`rail-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`rail-panel-${id}`}
              onClick={() => onTab(id)}
              title={t(TAB_LABEL[id])}
              className={cn(
                'rounded-input inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors duration-feedback ease-standard',
                tab === id
                  ? 'bg-primary text-on-primary'
                  : 'text-stage-muted hover:text-stage-text',
              )}
            >
              <Icon aria-hidden="true" size={14} strokeWidth={1.75} />
              {t(TAB_LABEL[id])}
            </button>
          ))}
        </div>
        <IconButton
          label={t('railHide')}
          onClick={onClose}
          className="border-stage-border bg-stage text-stage-muted hover:bg-surface-sunken h-8 w-8 shrink-0 rounded-input"
        >
          <ChevronRight aria-hidden="true" size={15} strokeWidth={1.75} />
        </IconButton>
      </div>

      <div
        role="tabpanel"
        id={`rail-panel-${tab}`}
        aria-labelledby={`rail-tab-${tab}`}
        className="min-h-0 flex-1 overflow-y-auto p-3"
      >
        {tab === 'participants' ? (
          <div className="grid gap-4">
            <ParticipantList participants={participants} />
            <InvitePanel roster={roster} inRoomIds={participants.map((p) => p.id)} />
          </div>
        ) : null}
        {tab === 'chat' ? <ChatPanel messages={messages} /> : null}
        {tab === 'notes' ? <NotesPanel /> : null}
        {tab === 'ai' ? <AiPanel micOn={micOn} /> : null}
      </div>
    </aside>
  );
}

/** Who is in the room — the host is called out, and speaking is never colour-only. */
function ParticipantList({ participants }) {
  const { t } = useTranslation('video');
  return (
    <div className="grid gap-2">
      <ul className="grid gap-1">
        {participants.map((person) => (
          <li
            key={person.id}
            className="text-stage-text flex items-center gap-2.5 rounded-input px-1 py-1.5 text-sm"
          >
            <Avatar name={person.name} size="sm" />
            <span className="min-w-0 flex-1 truncate">{person.name}</span>
            {person.speaking ? <Badge tone="info">{t('speaking')}</Badge> : null}
            {person.you ? <Badge tone="neutral">{t('youHost')}</Badge> : null}
          </li>
        ))}
      </ul>
      <p className="text-stage-muted text-xs">
        {t('participantsCount', { count: participants.length })}
      </p>
    </div>
  );
}

/** Sample thread + a disabled composer: nothing here can actually be sent. */
function ChatPanel({ messages }) {
  const { t } = useTranslation('video');
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid flex-1 content-start gap-3 text-sm">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex', msg.self ? 'justify-end' : 'justify-start')}>
            <p
              className={cn(
                'max-w-[85%] rounded-2xl px-3 py-2',
                msg.self
                  ? 'bg-primary text-on-primary rounded-br-sm'
                  : 'bg-stage text-stage-text border-stage-border rounded-bl-sm border',
              )}
            >
              {msg.text}
            </p>
          </div>
        ))}
      </div>
      <form className="grid gap-2" onSubmit={(event) => event.preventDefault()}>
        <div className="flex gap-2">
          <input
            type="text"
            aria-label={t('chatPlaceholder')}
            placeholder={t('chatPlaceholder')}
            disabled
            className="border-stage-border bg-stage text-stage-muted w-full flex-1 rounded-input border px-3 py-2 text-sm outline-none"
          />
          <Button type="submit" size="sm" disabled>
            {t('send')}
          </Button>
        </div>
        <p className="text-stage-muted text-xs">{t('chatPreviewNote')}</p>
      </form>
    </div>
  );
}

/**
 * Notes are the one genuinely working control in the rail: a local textarea
 * whose value never leaves the tab, which is exactly what the copy promises.
 */
function NotesPanel() {
  const { t } = useTranslation('video');
  const [value, setValue] = useState('');
  return (
    <div className="flex h-full flex-col gap-2">
      <textarea
        aria-label={t('meetingNotes')}
        placeholder={t('notesPlaceholder')}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="border-stage-border bg-stage text-stage-text placeholder:text-stage-muted min-h-32 w-full flex-1 resize-none rounded-input border px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <p className="text-stage-muted text-xs">{t('notesLocalNote')}</p>
    </div>
  );
}
