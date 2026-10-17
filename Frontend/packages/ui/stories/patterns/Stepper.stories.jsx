import { Stepper } from '../../src/index.js';

export default {
  title: 'Patterns/Stepper',
  component: Stepper,
  parameters: { layout: 'centered' },
};

export const FirstStep = {
  args: { steps: ['Organization', 'Sites', 'Calendar', 'Review'], current: 1 },
};

export const Midway = {
  args: { steps: ['Organization', 'Sites', 'Calendar', 'Review'], current: 2 },
};

export const Review = {
  args: { steps: ['Organization', 'Sites', 'Calendar', 'Review'], current: 4 },
};

export const Nepali = {
  args: { steps: ['संस्था', 'कार्यस्थल', 'पात्रो', 'समीक्षा'], current: 3 },
};
