/**
 * Dependency rules S1 and S3 to S7 from the playbook's structure module
 * (playbook/modules/structure/README.md). Run with `pnpm deps` (part of `pnpm check`).
 */
const CAP = 'apps/[^/]+/src/';

module.exports = {
  forbidden: [
    {
      name: 'S6-no-cycles',
      comment: 'No import cycles between modules or files.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'S1-packages-never-import-apps',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'S1-apps-never-import-each-other',
      severity: 'error',
      from: { path: '^apps/([^/]+)/' },
      to: { path: '^apps/', pathNot: '^apps/$1/' },
    },
    {
      name: 'S3-package-public-entry-only',
      comment: 'Other modules import a package through its src/index.ts only.',
      severity: 'error',
      from: { pathNot: '^packages/([^/]+)/' },
      to: { path: '^packages/[^/]+/src/', pathNot: '^packages/[^/]+/src/index\\.ts$' },
    },
    {
      name: 'S3-S5-capability-public-entry-only',
      comment: 'Inside an app, a capability imports another capability through its index.ts only.',
      severity: 'error',
      from: { path: `^(${CAP})([^/]+)/` },
      to: { path: `^${CAP}[^/]+/`, pathNot: [`^$1$2/`, `^${CAP}[^/]+/index\\.tsx?$`, `^${CAP}shared/`] },
    },
    {
      name: 'S4-packages-are-pure',
      comment: 'Packages hold pure logic: no file system, network, process or framework imports.',
      severity: 'error',
      from: { path: '^packages/' },
      to: {
        path: '^(node:)?(fs|net|http|https|child_process|worker_threads|os|dgram|tls)$|^(react|react-dom|hono|ws)$',
        dependencyTypes: ['core', 'npm', 'npm-no-pkg', 'npm-unknown'],
      },
    },
    {
      name: 'S7-shared-imports-no-capability',
      severity: 'error',
      from: { path: `^${CAP}shared/` },
      to: { path: `^${CAP}[^/]+/`, pathNot: `^${CAP}shared/` },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(node_modules|dist|\\.features|\\.features-gen|test-results)/' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'default'],
      extensions: ['.ts', '.tsx', '.js'],
    },
  },
};
