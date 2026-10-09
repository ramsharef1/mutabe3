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
      // Plain <a> for internal pages is the site's design, not an oversight (D-085): every navigation is a full
      // load, which is what counts a GA4 page_view (D-074), a first-party read (D-069) and fresh ad slots. <Link>
      // would make those navigations client-side and drop all three. The React Compiler rules of react-hooks 7
      // (set-state-in-effect, static-components, immutability, purity, refs) are on since D-085.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
]);
