import { mergeApplicationConfig } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from '../../src/app/app';
import { appConfig } from '../../src/app/app.config';
import { WORDPRESS_REST_URL } from '../../src/app/core/wordpress/wordpress-api';

let lcpMs: number | null = null;
let cls = 0;
let shiftWindowStart = 0;
let shiftWindowLast = 0;
let shiftWindowValue = 0;
const interactions: number[] = [];
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) lcpMs = entry.startTime;
}).observe({ type: 'largest-contentful-paint', buffered: true });
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
    if (!shift.hadRecentInput) {
      if (
        shiftWindowValue &&
        entry.startTime - shiftWindowLast < 1000 &&
        entry.startTime - shiftWindowStart < 5000
      )
        shiftWindowValue += shift.value;
      else {
        shiftWindowValue = shift.value;
        shiftWindowStart = entry.startTime;
      }
      shiftWindowLast = entry.startTime;
      cls = Math.max(cls, shiftWindowValue);
    }
  }
}).observe({ type: 'layout-shift', buffered: true });
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if ((entry as PerformanceEntry & { interactionId: number }).interactionId)
      interactions.push(entry.duration);
  }
}).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);

bootstrapApplication(
  App,
  mergeApplicationConfig(appConfig, {
    providers: [{ provide: WORDPRESS_REST_URL, useValue: `${location.origin}/__audit/wp-json` }],
  }),
)
  .then(() => {
    const panel = document.createElement('aside');
    panel.id = 'sanaka-audit-panel';
    panel.style.cssText =
      'position:fixed;z-index:10000;bottom:0;left:0;max-width:100%;background:#fff;color:#111;font:12px monospace;max-height:180px;overflow:auto;border:1px solid #555';
    const button = document.createElement('button');
    button.textContent = 'Capturar métricas';
    const output = document.createElement('output');
    output.id = 'sanaka-audit-metrics';
    button.onclick = () => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const navigation = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      output.textContent = JSON.stringify({
        capturedAt: new Date().toISOString(),
        path: location.pathname,
        viewport: { width: innerWidth, height: innerHeight },
        posts: document.querySelectorAll('app-post-card').length,
        books: document.querySelectorAll('.sanakaverse-book').length,
        elements: document.querySelectorAll('*').length,
        usedHeapMiB: heap ? heap.usedJSHeapSize / 1024 / 1024 : null,
        lcpMs,
        cls,
        maxObservedInteractionMs: interactions.length ? Math.max(...interactions) : null,
        navigationTtfbMs: navigation.responseStart - navigation.requestStart,
        transferBytes: resources.reduce((sum, r) => sum + r.transferSize, navigation.transferSize),
        resourceCount: resources.length,
        images: [...document.images].map((img) => ({
          src: img.currentSrc || img.src,
          width: img.naturalWidth,
          renderedWidth: img.getBoundingClientRect().width,
          complete: img.complete,
        })),
        imageResources: resources
          .filter((r) => r.initiatorType === 'img' || /\.(png|webp|jpg)(?:$|\?)/.test(r.name))
          .map((r) => ({
            url: r.name,
            transferBytes: r.transferSize,
            encodedBytes: r.encodedBodySize,
            durationMs: r.duration,
          })),
      });
    };
    panel.append(button, output);
    document.body.append(panel);
  })
  .catch((error) => console.error(error));
