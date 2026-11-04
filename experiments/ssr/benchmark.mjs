import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { JSDOM } from 'jsdom';
import { createWordPressFixture } from '../wordpress-fixture.mjs';

// Exclusivamente loopback. Nunca aponta o benchmark ao site ou ao CMS publicado.
const fixture = createWordPressFixture();
fixture.server.listen(45931, '127.0.0.1');
await once(fixture.server, 'listening');

const output = {
  date: new Date().toISOString(),
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
let sampleSequence = 0;
function resources(child) {
  const sampleId = ++sampleSequence;
  return new Promise((resolveSample, reject) => {
    const timer = setTimeout(() => reject(new Error('Telemetry timeout')), 2000);
    const listener = (message) => {
      if (message.sampleId !== sampleId) return;
      child.off('message', listener);
      clearTimeout(timer);
      resolveSample(message);
    };
    child.on('message', listener);
    child.send({ sampleId });
  });
}

try {
  for (const [name, entry, port] of [
    ['csr', 'dist/sanaka/server/server.mjs', 45932],
    ['ssr', 'dist/ssr-spike/server/server.mjs', 45933],
  ]) {
    let log = '';
    const child = spawn(
      process.execPath,
      [
        '--max-old-space-size=384',
        '--import',
        resolve('experiments/ssr/telemetry.mjs'),
        resolve(entry),
      ],
      {
        env: {
          ...process.env,
          PORT: String(port),
          NG_ALLOWED_HOSTS: '127.0.0.1,localhost',
          SITE_NOINDEX: 'false',
        },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      },
    );
    child.stdout.on('data', (b) => {
      log += b;
    });
    child.stderr.on('data', (b) => {
      log += b;
    });
    const origin = `http://127.0.0.1:${port}`;
    try {
      let ready = false;
      for (let i = 0; i < 100; i++) {
        if (child.exitCode !== null) throw new Error(log);
        ready = await fetch(`${origin}/api/health`)
          .then((r) => r.ok)
          .catch(() => false);
        if (ready) break;
        await delay(100);
      }
      assert(ready, `Server did not start: ${log}`);
      const variant = { name, entry, scenarios: [], load: [] };
      for (const slug of [
        'audit-article',
        'optional-error',
        'does-not-exist',
        'cms-unavailable',
        'policy-unavailable',
      ]) {
        fixture.state.enrichmentFailure = slug === 'optional-error';
        fixture.state.policyFailure = slug === 'policy-unavailable';
        const started = performance.now(),
          response = await fetch(`${origin}/posts/${slug}`),
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
            ['audit-article', 'optional-error'].includes(slug)
              ? 200
              : slug === 'does-not-exist'
                ? 404
                : 503,
          );
          assert.equal(row.hasArticle, ['audit-article', 'optional-error'].includes(slug));
          assert.equal(row.canonical, `https://sanaka.com.br/posts/${slug}`);
          assert.equal(row.transferredCounter, false);
          if (['audit-article', 'optional-error'].includes(slug)) {
            assert.equal(row.ogTitle, 'Artigo de auditoria 1 | Sanaka');
            assert(row.transferredPaginationHeaders);
          } else assert.equal(row.cacheControl, 'no-store');
          if (['cms-unavailable', 'policy-unavailable'].includes(slug)) {
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
          fixtureRequests: fixture.calls.length - callsBefore,
        });
      }
      variant.stderrWarnings = log.split('\n').filter((line) => /NG\d+|Error|Warning/i.test(line));
      output.variants.push(variant);
    } finally {
      child.kill('SIGTERM');
      await once(child, 'exit');
    }
  }
  assert(fixture.calls.every((call) => call.method === 'GET'));
  await writeFile(
    resolve(process.argv[2] || '/tmp/sanaka-ssr-benchmark.json'),
    JSON.stringify(output, null, 2) + '\n',
  );
  console.log(JSON.stringify(output, null, 2));
} finally {
  fixture.server.closeAllConnections();
  await new Promise((resolveClose) => fixture.server.close(resolveClose));
}
