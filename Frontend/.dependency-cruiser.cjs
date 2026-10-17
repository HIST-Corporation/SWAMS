/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: 'apps-dont-import-other-apps',
      severity: 'error',
      comment: 'Apps never import each other (Section 6.2 rule 1).',
      from: { path: '^apps/([^/]+)' },
      to: { pathNot: '^apps/\\$1/' },
    },
    {
      name: 'packages-never-import-apps',
      severity: 'error',
      comment: 'packages/* never import from apps/* (Section 6.2 rule 1).',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: ['\\.(d\\.)?ts$', '(^|/)index\\.(js|jsx)$', '\\.stories\\.jsx$'],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: false,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'browser'],
    },
    exclude: { path: ['node_modules', 'dist', '.next', 'storybook-static', 'design-prototype'] },
  },
};
