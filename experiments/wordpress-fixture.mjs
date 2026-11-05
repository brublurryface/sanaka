import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

export function createWordPressFixture({
  delayMs = 20,
  archiveSize = 500,
  largeCovers = false,
} = {}) {
  const calls = [];
  const state = { enrichmentFailure: false, policyFailure: false };
  const categories = [
    { id: 43, name: 'Romance', slug: 'romance', parent: 0 },
    { id: 62, name: 'Sobre', slug: 'sobre', parent: 0 },
    { id: 97, name: 'Sanakaverse', slug: 'sanakaverse', parent: 0 },
    { id: 45, name: 'Estudos', slug: 'estudos', parent: 0 },
  ];
  const article = (id = 1, slug = 'audit-article') => ({
    id,
    slug,
    date: '2026-11-04T12:00:00',
    title: { rendered: `Artigo de auditoria ${id}` },
    excerpt: { rendered: '<p>Conteúdo público da fixture local.</p>' },
    content: {
      rendered: '<p>Leitura pública preservada para o teste de HTML inicial.</p>'.repeat(30),
    },
    featured_media: 0,
    categories: [45],
    tags: [9],
    sanaka_character_slug: 'nandini',
    sanaka_character_name: 'Nandinī',
    sanaka_obolo_front: '/images/posts/temple/hamsa.svg',
  });
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    calls.push({ method: req.method, path: url.pathname, query: url.search });
    if (req.method !== 'GET') {
      res.writeHead(405).end();
      return;
    }
    await delay(delayMs);
    let status = 200,
      body,
      total;
    if (
      state.policyFailure &&
      url.pathname.endsWith('/categories') &&
      url.searchParams.has('slug')
    ) {
      status = 503;
      body = { code: 'fixture_policy_unavailable' };
    } else if (
      state.enrichmentFailure &&
      (url.pathname.endsWith('/tags') ||
        (url.pathname.endsWith('/categories') && !url.searchParams.has('slug')) ||
        url.searchParams.has('before') ||
        url.searchParams.has('after'))
    ) {
      status = 503;
      body = { code: 'fixture_optional_unavailable' };
    } else if (url.pathname.endsWith('/categories')) {
      const slugs = url.searchParams.get('slug')?.split(',');
      body = slugs ? categories.filter((c) => slugs.includes(c.slug)) : categories;
      total = body.length;
    } else if (url.pathname.endsWith('/tags')) {
      body = [{ id: 9, name: 'Auditoria', slug: 'auditoria' }];
      total = 1;
    } else if (url.pathname.includes('/sanaka/v1/obolos/')) {
      body = { characterSlug: 'nandini', total: 913579 };
      res.setHeader('Cache-Control', 'no-store');
    } else if (url.pathname.endsWith('/posts')) {
      const slug = url.searchParams.get('slug');
      if (slug === 'cms-unavailable') {
        status = 503;
        body = { code: 'fixture_unavailable' };
      } else if (slug === 'does-not-exist') body = [];
      else if (slug) {
        const post = article(1, slug);
        if (largeCovers) {
          post.featured_media = 900;
          post._embedded = {
            'wp:featuredmedia': [
              {
                id: 900,
                source_url: '/images/samvit/presences/samvit-sesha-blink.png',
                alt_text: 'Arte animada canônica, sem alteração',
              },
            ],
          };
        }
        body = [post];
      } else if (
        url.searchParams.has('before') ||
        url.searchParams.has('after') ||
        url.searchParams.get('_fields') === 'tags,categories'
      )
        body = [];
      else {
        const page = Number(url.searchParams.get('page') || 1);
        const size = Number(url.searchParams.get('per_page') || 20);
        body = Array.from(
          { length: Math.max(0, Math.min(size, archiveSize - (page - 1) * size)) },
          (_, i) => article((page - 1) * size + i + 1, `audit-${(page - 1) * size + i + 1}`),
        );
        total = archiveSize;
        if (
          url.searchParams.get('categories') === '97' ||
          url.searchParams.get('categories[terms]') === '97'
        ) {
          total = 100;
          body = Array.from(
            { length: Math.max(0, Math.min(size, total - (page - 1) * size)) },
            (_, i) => ({
              id: 10000 + (page - 1) * size + i,
              slug: `volume-${(page - 1) * size + i + 1}`,
              title: { rendered: `Volume ${(page - 1) * size + i + 1}` },
              sanakaverse_cover: '/images/about/about-cycles-sketch-nine.webp',
            }),
          );
        }
      }
      total ??= Array.isArray(body) ? body.length : 0;
    } else {
      status = 404;
      body = { code: 'fixture_no_route' };
    }
    if (total !== undefined) {
      res.setHeader('X-WP-Total', total);
      res.setHeader(
        'X-WP-TotalPages',
        Math.ceil(total / Number(url.searchParams.get('per_page') || 100)),
      );
      res.setHeader('Access-Control-Expose-Headers', 'X-WP-Total,X-WP-TotalPages');
    }
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(status).end(JSON.stringify(body));
  });
  return { server, calls, state };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const { server } = createWordPressFixture();
  server.listen(45931, '127.0.0.1', () =>
    console.log('WordPress fixture listening on 127.0.0.1:45931'),
  );
}
