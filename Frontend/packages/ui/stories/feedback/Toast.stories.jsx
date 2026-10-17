import { Button } from '../../src/index.js';
import { ToastProvider, useToast } from '../../src/index.js';

export default {
  title: 'Feedback/Toast',
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};

function Demo() {
  const { toast } = useToast();
  const fire = (variant, withAction) => () => {
    toast({
      variant,
      title: 'Request sent',
      description: 'Ramesh will review your leave request.',
      action: withAction
        ? { label: 'Undo', altText: 'Undo sending the request', onAction: () => {} }
        : undefined,
    });
  };
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={fire('info', false)}>
        Info toast
      </Button>
      <Button onClick={fire('success', true)}>Success + undo</Button>
      <Button variant="danger" onClick={fire('danger', false)}>
        Error toast
      </Button>
    </div>
  );
}

export const AllVariants = { render: () => <Demo /> };
