import { useState } from 'react';
import { Checkbox, Input, Switch, Textarea } from '../../src/index.js';

export default { title: 'Primitives/Form controls', parameters: { layout: 'centered' } };

export const InputStates = {
  render: () => (
    <div className="grid w-80 gap-4">
      <Input placeholder="you@himaldigital.com.np" aria-label="Default" />
      <Input defaultValue="sita@himaldigital.com.np" aria-label="Filled" />
      <Input defaultValue="not-an-email" invalid aria-label="Invalid" />
      <Input placeholder="Disabled" disabled aria-label="Disabled" />
    </div>
  ),
};

export const TextareaStates = {
  render: () => (
    <div className="grid w-80 gap-4">
      <Textarea placeholder="Reason for the request…" aria-label="Default" />
      <Textarea defaultValue="Family function in Pokhara." invalid aria-label="Invalid" />
    </div>
  ),
};

export const CheckboxStates = {
  render: () => <ControlledCheckboxDemo />,
};

function ControlledCheckboxDemo() {
  const [one, setOne] = useState(true);
  const [two, setTwo] = useState(false);
  return (
    <div className="grid w-72 gap-3">
      <div className="flex items-center gap-3">
        <Checkbox id="cb-notify" checked={one} onCheckedChange={setOne} />
        <label className="text-text text-sm" htmlFor="cb-notify">
          Notify my manager
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="cb-handover" checked={two} onCheckedChange={setTwo} />
        <label className="text-text text-sm" htmlFor="cb-handover">
          Add a handover note
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="cb-selall" checked="indeterminate" />
        <label className="text-text-muted text-sm" htmlFor="cb-selall">
          Select all (some selected)
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="cb-locked" disabled />
        <label className="text-text-faint text-sm" htmlFor="cb-locked">
          Locked by policy
        </label>
      </div>
    </div>
  );
}

export const SwitchStates = {
  render: () => <ControlledSwitchDemo />,
};

function ControlledSwitchDemo() {
  const [on, setOn] = useState(true);
  return (
    <div className="grid w-72 gap-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-text text-sm" htmlFor="sw-email">
          Email me approvals
        </label>
        <Switch id="sw-email" checked={on} onCheckedChange={setOn} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-text-muted text-sm" htmlFor="sw-digest">
          Weekly digest
        </label>
        <Switch id="sw-digest" defaultChecked={false} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-text-faint text-sm" htmlFor="sw-policy">
          Org-wide policy (locked)
        </label>
        <Switch id="sw-policy" checked disabled />
      </div>
    </div>
  );
}
