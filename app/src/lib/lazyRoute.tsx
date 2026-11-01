/* eslint-disable react-refresh/only-export-components -- route helpers and their error boundary intentionally live together */
import { Component, lazy, type ComponentType, type ReactNode } from 'react';

type PageModule = Record<string, unknown>;
type PageProps<M extends PageModule, K extends keyof M> = M[K] extends ComponentType<infer P> ? P : never;
export type LazyRouteComponent<P> = ComponentType<P> & { preload: () => Promise<unknown> };

// Prerender (Vite SSR + renderToString) cannot wait for React.lazy, so on the server each route
// module is imported up front and rendered synchronously. App.tsx awaits `ssrRoutesReady()` once.
// On the client this branch is removed at build time and React.lazy splits the route into a chunk.
const ssrLoads: Promise<unknown>[] = [];

export function ssrRoutesReady() {
  return Promise.all(ssrLoads);
}

export function lazyRoute<M extends PageModule, K extends keyof M & string>(
  loader: () => Promise<M>,
  exportName: K,
): LazyRouteComponent<PageProps<M, K>> {
  type Props = PageProps<M, K>;

  if (import.meta.env.SSR) {
    let Loaded: ComponentType<Props> | undefined;
    ssrLoads.push(loader().then((module) => { Loaded = module[exportName] as ComponentType<Props>; }));
    function SsrRoute(props: Props) {
      if (!Loaded) throw new Error(`Route module "${exportName}" was rendered before it finished loading.`);
      const Page = Loaded as ComponentType<Record<string, unknown>>;
      return <Page {...(props as Record<string, unknown>)} />;
    }
    return Object.assign(SsrRoute, { preload: () => Promise.resolve() });
  }

  let pending: Promise<{ default: ComponentType<Props> }> | undefined;
  const load = () => (pending ??= loader().then(
    (module) => ({ default: module[exportName] as ComponentType<Props> }),
    // Forget a failed load (for example an interrupted prefetch) so the next request can try again.
    (error: unknown) => { pending = undefined; throw error; },
  ));
  // preload() lets the entry script fetch the chunk of the route being hydrated before hydration starts.
  return Object.assign(lazy(load), { preload: load }) as unknown as LazyRouteComponent<Props>;
}

// Keeps the page height stable while a route chunk loads so the footer does not jump.
export function RouteFallback() {
  return <div className="min-h-[60vh]" role="status" aria-busy="true" />;
}

const CHUNK_LOAD_ERROR = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError/i;

// Only chunk-load failures are handled here; any other render error still propagates as before.
// There is deliberately no automatic reload: a reload could loop on a persistent failure and would
// discard what the visitor has on screen. The visitor decides when to reload.
export class RouteLoadErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(previous: { resetKey: string }) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (!CHUNK_LOAD_ERROR.test(`${error.name} ${error.message}`)) throw error;

    const english = typeof window !== 'undefined' && /^\/en(\/|$)/.test(window.location.pathname);
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-20 text-center text-white" role="alert">
        <h1 className="mb-4 text-2xl font-semibold">{english ? 'This page could not be loaded' : '頁面載入失敗'}</h1>
        <p className="mb-8 text-white/75">
          {english
            ? 'The site may have been updated or your connection was interrupted. Please reload to try again.'
            : '網站可能剛更新，或網路連線中斷。請重新整理頁面後再試一次。'}
        </p>
        <button
          type="button"
          className="rounded-full border border-white/30 px-6 py-2.5 font-semibold text-white hover:bg-white/10"
          onClick={() => window.location.reload()}
        >
          {english ? 'Reload page' : '重新整理'}
        </button>
      </main>
    );
  }
}
