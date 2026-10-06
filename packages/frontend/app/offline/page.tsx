import type { Metadata } from 'next';
import SavedList from './SavedList';

// Shown by the service worker (public/sw.js) when a page that was never opened is
// requested without a connection. Precached at install together with its assets.
export const metadata: Metadata = {
  title: 'لا يوجد اتصال | المتابع',
  robots: { index: false, follow: false },
};

export default function Offline() {
  return (
    <main className="offline">
      <a className="logo" href="/"><img src="/logo.svg" alt="المتابع" width="200" height="79" /></a>
      <h1>لا يوجد اتصال بالإنترنت</h1>
      <p>هذه الصفحة غير محفوظة على جهازك. يمكنك قراءة ما فتحته سابقاً من المتابع:</p>
      <SavedList />
    </main>
  );
}
