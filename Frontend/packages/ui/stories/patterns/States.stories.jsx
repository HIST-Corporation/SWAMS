import { Inbox } from 'lucide-react';
import { Button, EmptyState, ErrorState, FormField, Input, StatTile } from '../../src/index.js';

export default { title: 'Patterns/States', parameters: { layout: 'centered' } };

export const Empty = {
  render: () => (
    <EmptyState
      icon={<Inbox aria-hidden="true" size={18} strokeWidth={1.75} />}
      title="No requests yet"
      body="When your team sends leave requests, they appear here."
      action={<Button size="sm">Request leave</Button>}
    />
  ),
};

export const Error = {
  render: () => (
    <ErrorState
      title="Couldn't load approvals"
      message="The approvals service didn't respond in time."
      requestId="req_9f2c81"
      onRetry={() => {}}
    />
  ),
};

export const StatTiles = {
  render: () => (
    <div className="grid w-[560px] grid-cols-3 gap-4">
      <StatTile label="This week" value="31h 40m" hint="+2h OT" tone="primary" />
      <StatTile label="Leave left" value="11 days" tone="accent" />
      <StatTile label="Late arrivals" value="3" hint="this month" tone="warning" />
      <StatTile label="Attendance" value="89.4%" tone="success" />
      <StatTile label="Missed punches" value="2" tone="danger" />
      <StatTile label="Headcount" value="142" />
    </div>
  ),
};

export const FormFieldStates = {
  render: () => (
    <div className="grid w-80 gap-5">
      <FormField label="Work email" required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            placeholder="sita@himaldigital.com.np"
          />
        )}
      </FormField>
      <FormField label="Work email" required hint="We only use this inside your org.">
        {({ id, describedBy, invalid }) => (
          <Input id={id} aria-describedby={describedBy} invalid={invalid} />
        )}
      </FormField>
      <FormField label="Work email" error="That email is already in use.">
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            defaultValue="sita@himaldigital.com.np"
            aria-describedby={describedBy}
            invalid={invalid}
          />
        )}
      </FormField>
    </div>
  ),
};
