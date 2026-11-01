// Starts loading a lazy route's code shortly before a visitor is likely to open it, so following an internal
// link does not wait for the chunk download. The caller decides which routes may be prefetched.

type Preload = () => Promise<unknown>;
type NetworkInformationLike = { saveData?: boolean; effectiveType?: string };

const SLOW_CONNECTIONS = new Set(['slow-2g', '2g', '3g']);
const HOVER_DELAY_MS = 80;
const VISIBLE_DWELL_MS = 600;
// A failed prefetch may be retried by a later trigger, but only this many times per route chunk.
const MAX_ATTEMPTS = 2;

const loaded = new Set<Preload>();
const inFlight = new Set<Preload>();
const attempts = new Map<Preload, number>();

function networkInformation() {
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
}

function isConstrainedNetwork() {
  const connection = networkInformation();
  return !!connection && (connection.saveData === true || SLOW_CONNECTIONS.has(connection.effectiveType ?? ''));
}

// Background prefetching needs a known, unconstrained connection. Browsers without the Network Information API
// (for example iOS Safari) only prefetch on an explicit press.
function canPrefetchInBackground() {
  return !!networkInformation() && !isConstrainedNetwork()
    && typeof IntersectionObserver !== 'undefined'
    && window.matchMedia('(hover: none)').matches;
}

function run(preloads: Preload[]) {
  for (const preload of preloads) {
    if (loaded.has(preload) || inFlight.has(preload)) continue;
    const count = attempts.get(preload) ?? 0;
    if (count >= MAX_ATTEMPTS) continue;
    attempts.set(preload, count + 1);
    inFlight.add(preload);
    preload()
      .then(() => { loaded.add(preload); }, () => undefined)
      .finally(() => { inFlight.delete(preload); });
  }
}

function linkOf(target: EventTarget | null) {
  const anchor = target instanceof Element ? target.closest('a[href]') : null;
  return anchor instanceof HTMLAnchorElement ? anchor : null;
}

function internalPathOf(anchor: HTMLAnchorElement | null) {
  if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return null;
  return url.pathname;
}

type Options = {
  resolve: (pathname: string) => Preload[];
  // Also prefetch matching links that stay visible on screen (touch devices only, see canPrefetchInBackground).
  prefetchVisibleLinks: boolean;
};

export function startRoutePrefetch({ resolve, prefetchVisibleLinks }: Options) {
  const prefetchLink = (anchor: HTMLAnchorElement | null) => {
    const pathname = internalPathOf(anchor);
    if (pathname) run(resolve(pathname));
  };

  let hovered: HTMLAnchorElement | null = null;
  let hoverTimer: number | undefined;
  const onPointerOver = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || isConstrainedNetwork()) return;
    const anchor = linkOf(event.target);
    if (anchor === hovered) return;
    window.clearTimeout(hoverTimer);
    hovered = anchor;
    if (anchor) hoverTimer = window.setTimeout(() => prefetchLink(anchor), HOVER_DELAY_MS);
  };
  const onPointerOut = (event: PointerEvent) => {
    if (hovered && event.relatedTarget instanceof Node && hovered.contains(event.relatedTarget)) return;
    window.clearTimeout(hoverTimer);
    hovered = null;
  };
  const onFocusIn = (event: FocusEvent) => {
    if (!isConstrainedNetwork()) prefetchLink(linkOf(event.target));
  };
  // A press is followed by navigation, so the chunk is needed anyway, even with Save-Data.
  const onPointerDown = (event: PointerEvent) => prefetchLink(linkOf(event.target));

  const listenerOptions = { capture: true, passive: true } as const;
  document.addEventListener('pointerover', onPointerOver, listenerOptions);
  document.addEventListener('pointerout', onPointerOut, listenerOptions);
  document.addEventListener('focusin', onFocusIn, listenerOptions);
  document.addEventListener('pointerdown', onPointerDown, listenerOptions);

  const dwellTimers = new Map<Element, number>();
  const idleHandles: number[] = [];
  let observer: IntersectionObserver | undefined;
  if (prefetchVisibleLinks && canPrefetchInBackground()) {
    const requestIdle = (callback: () => void) => (
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(callback, { timeout: 2000 })
        : window.setTimeout(callback, 1)
    );
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const anchor = entry.target as HTMLAnchorElement;
        window.clearTimeout(dwellTimers.get(anchor));
        dwellTimers.delete(anchor);
        if (!entry.isIntersecting) continue;
        dwellTimers.set(anchor, window.setTimeout(() => {
          observer?.unobserve(anchor);
          idleHandles.push(requestIdle(() => prefetchLink(anchor)));
        }, VISIBLE_DWELL_MS));
      }
    }, { threshold: 0.5 });
    document.querySelectorAll<HTMLAnchorElement>('main a[href]').forEach((anchor) => {
      const pathname = internalPathOf(anchor);
      if (pathname && resolve(pathname).length > 0) observer?.observe(anchor);
    });
  }

  return () => {
    document.removeEventListener('pointerover', onPointerOver, listenerOptions);
    document.removeEventListener('pointerout', onPointerOut, listenerOptions);
    document.removeEventListener('focusin', onFocusIn, listenerOptions);
    document.removeEventListener('pointerdown', onPointerDown, listenerOptions);
    window.clearTimeout(hoverTimer);
    observer?.disconnect();
    dwellTimers.forEach((timer) => window.clearTimeout(timer));
    idleHandles.forEach((handle) => (
      typeof window.cancelIdleCallback === 'function' ? window.cancelIdleCallback(handle) : window.clearTimeout(handle)
    ));
  };
}
