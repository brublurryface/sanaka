import { readFileSync } from 'node:fs';
import { evaluateDuplication } from './duplication-policy.mjs';

try {
  const target = process.argv[2];
  if (target !== 'app' && target !== 'styles') {
    throw new Error(`Escopo de duplicação desconhecido: ${target}`);
  }

  const report = JSON.parse(
    readFileSync(new URL(`../.jscpd/${target}/jscpd-report.json`, import.meta.url), 'utf8'),
  );
  for (const { format, current, baseline, passed } of evaluateDuplication(report, target)) {
    const lines = ((100 * current.duplicatedLines) / current.lines).toFixed(2);
    const tokens = ((100 * current.duplicatedTokens) / current.tokens).toFixed(2);
    console.log(`${target}/${format}: ${lines}% linhas; ${tokens}% tokens`);
    console.log(
      `  Linhas: ${current.duplicatedLines}/${baseline.duplicatedLines}; ` +
        `tokens: ${current.duplicatedTokens}/${baseline.duplicatedTokens}; ` +
        `clones: ${current.clones}/${baseline.clones} — ${passed ? 'OK' : 'REGRESSÃO'}`,
    );
    if (!passed) process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
