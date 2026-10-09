'use client';

import { useEffect, useSyncExternalStore } from 'react';

// Browser-only state without setState-in-effect (D-085, React Compiler lint rules of Next 16). Each hook
// returns the server value during server render and hydration, so markup matches, then the browser's value.

// One shared 30 s clock for everything that shows time-of-day or «منذ …» output.
let now = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const clockSubs = new Set<() => void>();
const subscribeClock = (cb: () => void) => {
  clockSubs.add(cb);
  if (!timer) timer = setInterval(() => { now = Date.now(); clockSubs.forEach((f) => f()); }, 30_000);
  return () => { clockSubs.delete(cb); if (!clockSubs.size && timer) { clearInterval(timer); timer = null; } };
};
/** Current time in ms, refreshed every 30 s; null on the server and during hydration. */
export const useNow = (): number | null => useSyncExternalStore(subscribeClock, () => (now ||= Date.now()), () => null);

const noSubscribe = () => () => {};
/** false on the server and during hydration, true afterwards. */
export const useHydrated = () => useSyncExternalStore(noSubscribe, () => true, () => false);

/**
 * A primitive read from the browser once per render (localStorage, matchMedia, a document attribute, feature
 * detection); `fallback` on the server. `read` must return the same primitive while nothing changes — parse
 * objects with useMemo on the returned string. Reads that throw (blocked storage) fall back too.
 */
export function useBrowserValue<T extends string | number | boolean | null>(read: () => T, fallback: T): T {
  return useSyncExternalStore(noSubscribe, () => { try { return read(); } catch { return fallback; } }, () => fallback);
}

/**
 * Runs `load` whenever `ready` is true and `load` changes — the dashboard's fetch-on-mount. The loader owns its
 * loading/error state; that is the external sync an effect is for (data from the API), not derived state.
 */
export function useLoadWhen(ready: boolean, load: () => unknown) {
  useEffect(() => { if (ready) load(); }, [ready, load]);
}

// One subscription function per attribute/event, so React does not resubscribe on every render.
const attrSubs = new Map<string, (cb: () => void) => () => void>();
/** An attribute of <html> (theme, dashboard sidebar — set by pre-paint scripts), kept in sync as it changes; null on the server. */
export function useHtmlAttr(name: string): string | null {
  let sub = attrSubs.get(name);
  if (!sub) {
    sub = (cb) => { const o = new MutationObserver(cb); o.observe(document.documentElement, { attributes: true, attributeFilter: [name] }); return () => o.disconnect(); };
    attrSubs.set(name, sub);
  }
  return useSyncExternalStore(sub, () => document.documentElement.getAttribute(name), () => null);
}

const eventSubs = new Map<string, (cb: () => void) => () => void>();
/** A primitive the browser updates through a window event (e.g. the install prompt); `fallback` on the server. */
export function useEventValue<T extends string | number | boolean | null>(event: string, read: () => T, fallback: T): T {
  let sub = eventSubs.get(event);
  if (!sub) { sub = (cb) => { addEventListener(event, cb); return () => removeEventListener(event, cb); }; eventSubs.set(event, sub); }
  return useSyncExternalStore(sub, read, () => fallback);
}
