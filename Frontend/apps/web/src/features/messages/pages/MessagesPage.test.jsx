// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { MessagesPage } from './MessagesPage.jsx';

const i18n = initI18n({ lng: 'en' });

function renderMessages() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MessagesPage />
    </I18nextProvider>,
  );
}

describe('MessagesPage', () => {
  it('lists only the people you have a DM thread with, with availability in words', async () => {
    renderMessages();

    // Ramesh's roster status is busy — the word is there, never colour alone.
    // His name shows twice: the list and the open thread header.
    expect(await screen.findAllByText('Ramesh Adhikari')).toHaveLength(2);
    // The word appears in the list row AND the open thread header.
    expect(screen.getAllByText(/Busy/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Offline · All tests passing/)).toBeInTheDocument();
    // Direct Messages is not the whole company: a teammate with no thread
    // (Aarav, the CEO) never appears in the DM list. He DOES appear in the
    // Team rail above — but by first name only ("Aarav"), never as a seeded
    // DM row, so his full name is still absent from the list.
    expect(screen.queryByText('Aarav Khadka')).not.toBeInTheDocument();
  });

  it('shows the whole team in the top rail, online first, and opens any thread', async () => {
    const user = userEvent.setup();
    renderMessages();

    // Every colleague is in the rail — including the CEO, who has no DM thread.
    // The rail labels each tile by full name for assistive tech ("Message …"),
    // distinct from the list's own "Chat with …" rows.
    expect(screen.getByRole('button', { name: 'Message Aarav Khadka' })).toBeInTheDocument();

    // Opening someone with no seeded conversation shows their header and an
    // honest empty thread — not a dead control.
    await user.click(screen.getByRole('button', { name: 'Message Aarav Khadka' }));
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    // Aarav now heads the open thread (full name in the header).
    expect(screen.getByText('Aarav Khadka')).toBeInTheDocument();
  });

  it('opens a clicked staff member in the message box', async () => {
    const user = userEvent.setup();
    renderMessages();

    await user.click(screen.getByRole('button', { name: 'Chat with Anita Thapa' }));
    expect(screen.getByText('Thanks for the feedback!')).toBeInTheDocument();
  });

  it('sends a message into the open thread and says it stays local', async () => {
    const user = userEvent.setup();
    renderMessages();

    await screen.findByText('Can we review the API contracts today?');
    await user.type(screen.getByLabelText('Type a message…'), 'Standup at two?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByText('Standup at two?')).toBeInTheDocument();
    expect(screen.getByText(/messages stay in this browser/i)).toBeInTheDocument();
  });
});
