import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const METRIC_PREFIX = 'SANAKA_BENCHMARK_METRIC ';
export const CAPACITY_IMAGE = 'node:24.22.1-bookworm-slim';

export async function startApplication(entry, port, { constrained = false } = {}) {
  const absoluteEntry = resolve(entry);
  assert(
    absoluteEntry.startsWith(`${process.cwd()}/dist/`),
    'Only local build entries are allowed',
  );
  const origin = `http://127.0.0.1:${port}`;
  const containerName = `sanaka-ssr-${process.pid}-${port}`;
  const nodeArguments = [
    '--max-old-space-size=384',
    '--import',
    resolve('experiments/ssr/telemetry.mjs'),
    absoluteEntry,
  ];
  const dockerArguments = [
    'run',
    '--rm',
    '--interactive',
    '--name',
    containerName,
    '--network',
    'host',
    '--cpus',
    '0.5',
    '--memory',
    '512m',
    '--memory-swap',
    '512m',
    '--read-only',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '--user',
    `${process.getuid()}:${process.getgid()}`,
    '--mount',
    `type=bind,source=${process.cwd()},target=${process.cwd()},readonly`,
    '--workdir',
    process.cwd(),
    '--env',
    `PORT=${port}`,
    '--env',
    'NG_ALLOWED_HOSTS=127.0.0.1,localhost',
    '--env',
    'TRUST_PROXY_HOPS=0',
    '--env',
    'SITE_NOINDEX=false',
    CAPACITY_IMAGE,
    'node',
    ...nodeArguments,
  ];
  const child = spawn(
    constrained ? 'docker' : process.execPath,
    constrained ? dockerArguments : nodeArguments,
    {
      env: {
        ...process.env,
        PORT: String(port),
        NG_ALLOWED_HOSTS: '127.0.0.1,localhost',
        TRUST_PROXY_HOPS: '0',
        SITE_NOINDEX: 'false',
      },
      stdio: constrained ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe', 'ipc'],
    },
  );
  let log = '';
  let pending = '';
  let spawnError;
  child.on('error', (error) => {
    spawnError = error;
  });
  child.stdout.on('data', (chunk) => {
    if (!constrained) {
      log = (log + chunk).slice(-32_000);
      return;
    }
    pending += chunk;
    const lines = pending.split('\n');
    pending = lines.pop();
    for (const line of lines) {
      if (line.startsWith(METRIC_PREFIX))
        child.emit('message', JSON.parse(line.slice(METRIC_PREFIX.length)));
      else log = `${log}${line}\n`.slice(-32_000);
    }
  });
  child.stderr.on('data', (chunk) => {
    log = (log + chunk).slice(-32_000);
  });
  if (constrained) child.send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`);

  async function stop() {
    if (constrained) {
      spawnSync('docker', ['rm', '--force', containerName], { stdio: 'ignore', timeout: 10_000 });
    } else if (child.exitCode === null) child.kill('SIGTERM');
    if (child.exitCode === null && child.signalCode === null) {
      await Promise.race([once(child, 'exit'), delay(10_000, undefined, { ref: false })]);
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }
  }

  try {
    for (let attempt = 0; attempt < 150; attempt++) {
      if (spawnError || child.exitCode !== null || child.signalCode !== null)
        throw spawnError ?? new Error(log);
      const ready = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(1500) })
        .then((r) => r.ok)
        .catch(() => false);
      if (ready)
        return {
          child,
          origin,
          stop,
          warnings: () =>
            log
              .split('\n')
              .filter(
                (line) =>
                  !line.includes('"event":"http_response_error"') &&
                  /NG\d+|Error|Warning/i.test(line),
              ),
        };
      await delay(100);
    }
    throw new Error(`Server did not start: ${log}`);
  } catch (error) {
    await stop();
    throw error;
  }
}

let sequence = 0;
export function sampleResources(child) {
  const sampleId = ++sequence;
  return new Promise((resolveSample, reject) => {
    const listener = (message) => {
      if (message.sampleId !== sampleId) return;
      clearTimeout(timer);
      child.off('message', listener);
      resolveSample(message);
    };
    const timer = setTimeout(() => {
      child.off('message', listener);
      reject(new Error('Telemetry timeout'));
    }, 4000);
    child.on('message', listener);
    child.send({ sampleId });
  });
}
