// ESLint 9 flat config (D-084): Next 16 dropped `next lint`, so `npm run lint` is `eslint .` with the same
// rule set the old .eslintrc.json had (next/core-web-vitals, <img> allowed — we serve our own WebP derivatives).
// The ignores keep the scope `next lint` had: app code only, not build output, the hand-written service worker
// or the brand build scripts.
import { defineConfig, globalIgnores } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  globalIgnores(['.next/**', 'node_modules/**', 'public/**', 'brand-src/**', 'next-env.d.ts']),
  {
    extends: [...nextCoreWebVitals],
    rules: {
      '@next/next/no-img-element': 'off',
      // New in eslint-config-next 16 and off for parity with the Next 14 lint: no-html-link-for-pages now also
      // reads app/ routes (26 plain <a> links, intentional full loads), and react-hooks 7 ships the React
      // Compiler rules (42 findings in existing components). Adopting either is its own task, not part of D-084.
      '@next/next/no-html-link-for-pages': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
    },
  },
]);
