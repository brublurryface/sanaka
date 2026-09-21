import { readFile } from 'node:fs/promises';

const minimumCoverage = 85;
const summaryPath = new URL('../coverage/sanaka/coverage-summary.json', import.meta.url);
const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
const metrics = ['lines', 'statements', 'functions', 'branches'];
const failures = metrics.filter((metric) => summary.total[metric].pct < minimumCoverage);

if (failures.length > 0) {
  const details = failures.map((metric) => `${metric}: ${summary.total[metric].pct}%`).join(', ');

  throw new Error(`Cobertura abaixo de ${minimumCoverage}%: ${details}.`);
}

console.log(`Cobertura mínima de ${minimumCoverage}% atendida em todas as métricas.`);
