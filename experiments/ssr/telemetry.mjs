import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

// Somente no processo de benchmark, via --import. Não integra o servidor publicado.
function readLimit(name) {
  try {
    return readFileSync(`/sys/fs/cgroup/${name}`, 'utf8').trim();
  } catch {
    return 'unavailable';
  }
}
const limits = { cpuMax: readLimit('cpu.max'), memoryMax: readLimit('memory.max') };
function sample(sampleId) {
  const cpu = process.cpuUsage();
  const value = {
    sampleId,
    rssKiB: process.memoryUsage().rss / 1024,
    cpuSeconds: (cpu.user + cpu.system) / 1_000_000,
    cgroupMemoryPeak: readLimit('memory.peak'),
    limits,
  };
  if (process.send) process.send(value);
  else process.stdout.write(`SANAKA_BENCHMARK_METRIC ${JSON.stringify(value)}\n`);
}
setInterval(() => sample(), 25).unref();
process.on('message', (message) => sample(message.sampleId));
if (!process.send) {
  createInterface({ input: process.stdin }).on('line', (line) => sample(JSON.parse(line).sampleId));
}
