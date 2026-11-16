import { test as base, expect, type BrowserContext, type Route } from '@playwright/test';

import { article, books, categories, cycles } from '../fixtures/wordpress';

type Reply = Parameters<Route['fulfill']>[0];
export type RequestKind =
  | 'policy'
  | 'categories'
  | 'archive'
  | 'article'
  | 'cycles'
  | 'books'
  | 'related'
  | 'tags'
  | 'newsletter';
interface QueuedReply {
  readonly response: () => Promise<Reply | undefined>;
  readonly finished?: () => void;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function collection(records: readonly unknown[], total = records.length): Reply {
  return {
    json: records,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'X-WP-Total, X-WP-TotalPages',
      'X-WP-Total': String(total),
      'X-WP-TotalPages': total ? '1' : '0',
    },
  };
}

/** Controls responses, not application state. Every context gets its own queues and cache. */
class Site {
  readonly unexpectedRequests: string[] = [];
  private readonly counts = new Map<RequestKind, number>();
  private readonly responses = new Map<RequestKind, QueuedReply[]>();
  private readonly pending: (() => void)[] = [];

  count(kind: RequestKind): number {
    return this.counts.get(kind) ?? 0;
  }

  holdNext(kind: RequestKind) {
    const requested = deferred<void>();
    const response = deferred<Reply | undefined>();
    const finished = deferred<void>();
    this.enqueue(
      kind,
      async () => {
        requested.resolve();
        return response.promise;
      },
      () => finished.resolve(),
    );
    this.pending.push(() => response.resolve(undefined));
    return {
      requested: requested.promise,
      release: async (reply?: Reply) => {
        response.resolve(reply);
        await finished.promise;
      },
    };
  }

  failNext(kind: RequestKind): void {
    this.enqueue(kind, async () => ({ status: 503, json: { code: 'fixture_unavailable' } }));
  }

  emptyNext(kind: RequestKind): void {
    this.enqueue(kind, async () => collection([]));
  }

  releasePending(): void {
    this.pending.forEach((release) => release());
  }

  private enqueue(
    kind: RequestKind,
    response: () => Promise<Reply | undefined>,
    finished?: () => void,
  ): void {
    const queue = this.responses.get(kind) ?? [];
    // Store completion separately from resolution so cancellation tests can await the late response.
    queue.push({ response, finished });
    this.responses.set(kind, queue);
  }

  async install(context: BrowserContext, baseURL: string): Promise<void> {
    const origin = new URL(baseURL).origin;
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() !== 'GET') {
        this.unexpectedRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
        await route.abort('blockedbyclient');
        return;
      }
      if (
        url.origin === 'https://fonts.googleapis.com' ||
        url.origin === 'https://fonts.gstatic.com'
      ) {
        await route.fulfill({ status: 200, contentType: 'text/css', body: '' });
        return;
      }
      if (url.origin === origin && !url.pathname.startsWith('/api/')) {
        await route.continue();
        return;
      }

      const query = url.searchParams;
      let kind: RequestKind | undefined;
      let reply: Reply | undefined;
      if (url.origin === origin && url.pathname === '/api/newsletter/status') {
        kind = 'newsletter';
        reply = { json: { available: false } };
      } else if (
        url.origin === 'https://cms.sanaka.com.br' &&
        url.pathname.startsWith('/wp-json/wp/v2/')
      ) {
        if (url.pathname.endsWith('/categories')) {
          const slugs = query.get('slug')?.split(',');
          kind = slugs ? 'policy' : 'categories';
          reply = collection(
            slugs ? categories.filter((item) => slugs.includes(item.slug)) : categories,
          );
        } else if (url.pathname.endsWith('/tags')) {
          kind = 'tags';
          reply = collection([]);
        } else if (url.pathname.endsWith('/posts')) {
          if (query.has('slug')) {
            kind = 'article';
            reply = collection(query.get('slug') === article.slug ? [article] : []);
          } else if (
            query.has('before') ||
            query.has('after') ||
            query.get('_fields') === 'tags,categories'
          ) {
            kind = 'related';
            reply = collection([]);
          } else if (query.get('categories') === '91') {
            kind = 'cycles';
            reply = collection(cycles);
          } else if (query.get('categories[terms]') === '92') {
            kind = 'books';
            reply = collection(books);
          } else {
            kind = 'archive';
            reply = collection([article]);
          }
        }
      }
      if (!kind || !reply) {
        this.unexpectedRequests.push(`GET ${url.origin}${url.pathname}`);
        await route.abort('blockedbyclient');
        return;
      }
      this.counts.set(kind, this.count(kind) + 1);
      const next = this.responses.get(kind)?.shift();
      try {
        await route.fulfill({ ...reply, ...(await next?.response()) });
      } finally {
        next?.finished?.();
      }
    });
  }
}

declare global {
  interface Window {
    sanakaBrowserProbe: {
      loadingFrames: number;
      exposedShell: string[];
      scrollPositions: number[];
      navigationEvents: { type: string; y: number; navigationId?: number }[];
    };
  }
}

export const test = base.extend<{ site: Site }>({
  site: [
    async ({ context, page, baseURL }, use, testInfo) => {
      const site = new Site();
      const errors: string[] = [];
      const consoleMessages: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
      await site.install(context, baseURL!);
      await context.addInitScript(() => {
        const probe = {
          loadingFrames: 0,
          exposedShell: [] as string[],
          scrollPositions: [] as number[],
          navigationEvents: [] as { type: string; y: number; navigationId?: number }[],
        };
        window.sanakaBrowserProbe = probe;
        const inspect = () => {
          const app = document.querySelector('app-root');
          if (app?.querySelector(':scope > app-loading-indicator')) {
            probe.loadingFrames += 1;
            for (const element of app.children) {
              if (!['HEADER', 'MAIN', 'FOOTER'].includes(element.tagName)) continue;
              const style = getComputedStyle(element);
              if (
                style.visibility !== 'hidden' &&
                style.display !== 'none' &&
                element.getBoundingClientRect().height > 0 &&
                !probe.exposedShell.includes(element.tagName)
              ) {
                probe.exposedShell.push(element.tagName);
              }
            }
          }
          requestAnimationFrame(inspect);
        };
        requestAnimationFrame(inspect);
        window.addEventListener('scroll', () => {
          if (probe.scrollPositions.length < 500) probe.scrollPositions.push(window.scrollY);
        });
        for (const type of ['popstate', 'hashchange', 'scrollend']) {
          window.addEventListener(type, () => {
            if (probe.navigationEvents.length < 30)
              probe.navigationEvents.push({
                type,
                y: window.scrollY,
                navigationId: window.history.state?.navigationId,
              });
          });
        }
      });
      try {
        await use(site);
        expect(
          site.unexpectedRequests,
          'All external services must be mocked; writes are forbidden.',
        ).toEqual([]);
        expect(errors, 'The production application must not throw browser exceptions.').toEqual([]);
      } finally {
        site.releasePending();
        if (testInfo.status !== testInfo.expectedStatus) {
          await testInfo.attach('browser-console', {
            body: consoleMessages.join('\n'),
            contentType: 'text/plain',
          });
        }
      }
    },
    { auto: true },
  ],
});

export { expect };
