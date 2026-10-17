import { Button } from './Button.jsx';

export default {
  title: 'Primitives/Button',
  component: Button,
  args: { children: 'Clock out', variant: 'primary', size: 'md' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'quiet', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export const Primary = {};
export const Secondary = { args: { variant: 'secondary', children: 'Take a break' } };
export const Quiet = { args: { variant: 'quiet', children: 'Not now' } };
export const Danger = { args: { variant: 'danger', children: 'Cancel request' } };
export const Loading = { args: { loading: true, children: 'Sending request' } };
export const Disabled = { args: { disabled: true, children: 'Clock in' } };
export const Small = { args: { size: 'sm', children: 'Approve' } };
export const LongLabelNepali = { args: { children: 'अनुरोध पठाउनुहोस्' } };
