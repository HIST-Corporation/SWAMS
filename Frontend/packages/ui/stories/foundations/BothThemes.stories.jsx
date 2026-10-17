import { MiniDashboard } from './MiniDashboard.jsx';

export default { title: 'Foundations/Both themes', parameters: { layout: 'padded' } };

/**
 * Section 8.3 / DoD: every surface must be reviewed in light and dark.
 * The two panels below are independently themed (scoped `data-theme`),
 * so both are visible regardless of the toolbar selection.
 */
export const StaffHome = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 'var(--space-6)',
      }}
    >
      <MiniDashboard theme="light" />
      <MiniDashboard theme="dark" />
    </div>
  ),
};
