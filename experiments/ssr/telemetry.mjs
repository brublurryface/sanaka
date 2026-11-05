// Somente no processo de benchmark, via --import. Não integra o servidor publicado.
function sample(sampleId) {
  const cpu = process.cpuUsage();
  process.send?.({
    sampleId,
    rssKiB: process.memoryUsage().rss / 1024,
    cpuSeconds: (cpu.user + cpu.system) / 1_000_000,
  });
}
setInterval(() => sample(), 10).unref();
process.on('message', (message) => sample(message.sampleId));
