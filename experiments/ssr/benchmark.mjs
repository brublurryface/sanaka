import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { createWordPressFixture } from '../wordpress-fixture.mjs';
import { CAPACITY_IMAGE, sampleResources, startApplication } from './runtime.mjs';

// Exclusivamente loopback. Nunca aponta o benchmark ao site ou ao CMS publicado.
const fixture = createWordPressFixture();
fixture.server.listen(45931, '127.0.0.1');
await once(fixture.server, 'listening');

const output = {
  date: new Date().toISOString(),
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
  capacityImageDigests: process.argv.includes('--constrained')
    ? JSON.parse(
        execFileSync(
          'docker',
          ['image', 'inspect', CAPACITY_IMAGE, '--format', '{{json .RepoDigests}}'],
          { encoding: 'utf8' },
        ),
      )
    : [],
  profile: process.argv.includes('--constrained')
    ? 'container-0.5cpu-512mib'
    : 'local-unconstrained',
  capacityImage: process.argv.includes('--constrained') ? CAPACITY_IMAGE : null,
  node: process.version,
  fixtureDelayMs: 20,
  heapLimitMiB: 384,
  environment: {},
  variants: [],
};
for (const [name, path] of Object.entries({
  cpuQuota: '/sys/fs/cgroup/cpu.max',
  memoryLimit: '/sys/fs/cgroup/memory.max',
})) {
  output.environment[name] = await readFile(path, 'utf8')
    .then((s) => s.trim())
    .catch(() => 'unavailable');
}
const percentile = (values, p) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
const resources = sampleResources;

try {
  for (const [name, entry, port] of [
    ['csr', 'dist/sanaka/server/server.mjs', 45932],
    ['ssr', 'dist/ssr-spike/server/server.mjs', 45933],
  ]) {
    const application = await startApplication(entry, port, {
      constrained: process.argv.includes('--constrained'),
    });
    const { child, origin } = application;
    try {
      const baseline = await resources(child);
      if (process.argv.includes('--constrained')) {
        assert.equal(baseline.limits.cpuMax, '50000 100000');
        assert.equal(baseline.limits.memoryMax, String(512 * 1024 * 1024));
      }
      const variant = { name, entry, limits: baseline.limits, scenarios: [], load: [] };
      for (const slug of [
        'audit-article',
        'optional-error',
        'does-not-exist',
        'cms-unavailable',
        'policy-unavailable',
        'malformed-article',
        'excluded-article',
        'slow-optional',
      ]) {
        fixture.state.enrichmentFailure = slug === 'optional-error';
        fixture.state.policyFailure = slug === 'policy-unavailable';
        fixture.state.enrichmentDelayMs = slug === 'slow-optional' ? 2500 : 0;
        const started = performance.now(),
          response = await fetch(`${origin}/posts/${slug}`, {
            signal: AbortSignal.timeout(15_000),
          }),
          html = await response.text();
        const dom = new JSDOM(html),
          doc = dom.window.document;
        const state = [...doc.querySelectorAll('script[type="application/json"]')]
          .map((s) => s.textContent)
          .join('');
        const row = {
          slug,
          status: response.status,
          cacheControl: response.headers.get('cache-control'),
          retryAfter: response.headers.get('retry-after'),
          milliseconds: performance.now() - started,
          bytes: Buffer.byteLength(html),
          title: doc.title,
          canonical: doc.querySelector('link[rel="canonical"]')?.href,
          ogTitle: doc.querySelector('meta[property="og:title"]')?.content,
          robots: doc.querySelector('meta[name="robots"]')?.content,
          hasArticle: !!doc.querySelector('.post-reader__article'),
          transferredCounter: state.includes('913579'),
          transferredPaginationHeaders: state.toLowerCase().includes('x-wp-total'),
        };
        if (name === 'ssr') {
          assert.equal(
            row.status,
            ['audit-article', 'optional-error', 'slow-optional'].includes(slug)
              ? 200
              : ['does-not-exist', 'excluded-article'].includes(slug)
                ? 404
                : 503,
          );
          assert.equal(
            row.hasArticle,
            ['audit-article', 'optional-error', 'slow-optional'].includes(slug),
          );
          assert.equal(row.canonical, `https://sanaka.com.br/posts/${slug}`);
          assert.equal(row.transferredCounter, false);
          if (slug === 'slow-optional')
            assert(
              row.milliseconds < 2000,
              'Optional reads must not wait for their full 2500ms delay',
            );
          if (['does-not-exist', 'excluded-article'].includes(slug))
            assert.equal(row.robots, 'noindex, nofollow');
          if (['audit-article', 'optional-error', 'slow-optional'].includes(slug)) {
            assert.equal(row.ogTitle, 'Artigo de auditoria 1 | Sanaka');
            assert(row.transferredPaginationHeaders);
          } else assert.equal(row.cacheControl, 'no-store');
          if (['cms-unavailable', 'policy-unavailable', 'malformed-article'].includes(slug)) {
            assert.equal(row.robots, 'index, follow');
            assert.equal(row.retryAfter, '60');
          }
        } else {
          assert.equal(row.status, 200);
          assert.equal(row.hasArticle, false);
        }
        variant.scenarios.push(row);
        dom.window.close();
      }
      fixture.state.enrichmentFailure = false;
      fixture.state.policyFailure = false;
      fixture.state.enrichmentDelayMs = 0;
      await fetch(`${origin}/posts/audit-article`).then((r) => r.arrayBuffer());
      for (const concurrency of [1, 5, 20]) {
        const durations = [],
          before = await resources(child),
          callsBefore = fixture.calls.length;
        let peakRssKiB = before.rssKiB;
        const collectSample = (message) => {
          peakRssKiB = Math.max(peakRssKiB, message.rssKiB);
        };
        child.on('message', collectSample);
        const started = performance.now();
        try {
          for (let batch = 0; batch < Math.ceil(100 / concurrency); batch++)
            await Promise.all(
              Array.from({ length: concurrency }, async () => {
                const start = performance.now(),
                  response = await fetch(`${origin}/posts/audit-article`);
                await response.arrayBuffer();
                assert.equal(response.status, 200);
                durations.push(performance.now() - start);
              }),
            );
        } finally {
          child.off('message', collectSample);
        }
        const elapsedMs = performance.now() - started,
          after = await resources(child);
        variant.load.push({
          concurrency,
          requests: durations.length,
          p50Ms: percentile(durations, 0.5),
          p95Ms: percentile(durations, 0.95),
          elapsedMs,
          cpuSeconds: after.cpuSeconds - before.cpuSeconds,
          peakRssMiB: Math.max(peakRssKiB, after.rssKiB) / 1024,
          cgroupPeakMiB:
            after.cgroupMemoryPeak === 'unavailable'
              ? null
              : Number(after.cgroupMemoryPeak) / 1024 / 1024,
          fixtureRequests: fixture.calls.length - callsBefore,
        });
      }
      variant.stderrWarnings = application.warnings();
      output.variants.push(variant);
    } finally {
      await application.stop();
    }
  }
  assert(fixture.calls.every((call) => call.method === 'GET'));
  await writeFile(
    resolve(
      process.argv.slice(2).find((argument) => !argument.startsWith('--')) ||
        '/tmp/sanaka-ssr-benchmark.json',
    ),
    JSON.stringify(output, null, 2) + '\n',
  );
  console.log(`SANAKA_SSR_RESULT ${JSON.stringify(output)}`);
} finally {
  fixture.server.closeAllConnections();
  await new Promise((resolveClose) => fixture.server.close(resolveClose));
}
