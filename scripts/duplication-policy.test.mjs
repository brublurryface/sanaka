import assert from 'node:assert/strict';
import { test } from 'node:test';
import { duplicationPolicy, evaluateDuplication } from './duplication-policy.mjs';

function report(target) {
  return {
    statistics: {
      formats: Object.fromEntries(
        Object.entries(duplicationPolicy[target]).map(([format, baseline]) => [
          format,
          { ...baseline, sources: 1 },
        ]),
      ),
    },
  };
}

for (const target of ['app', 'styles']) {
  test(`${target}: accepts the observed baseline`, () => {
    assert.ok(evaluateDuplication(report(target), target).every((result) => result.passed));
  });
}

test('rejects a style regression even if TypeScript improves', () => {
  const input = report('app');
  input.statistics.formats.typescript.duplicatedLines = 0;
  input.statistics.formats.scss.duplicatedLines++;
  const results = evaluateDuplication(input, 'app');
  assert.equal(results.find((result) => result.format === 'scss').passed, false);
});

test('rejects more duplicated tokens even if the line percentage is unchanged', () => {
  const input = report('styles');
  input.statistics.formats.scss.duplicatedTokens++;
  assert.equal(evaluateDuplication(input, 'styles')[0].passed, false);
});

test('rejects an additional clone even if the file grows', () => {
  const input = report('styles');
  input.statistics.formats.scss.lines *= 2;
  input.statistics.formats.scss.tokens *= 2;
  input.statistics.formats.scss.clones++;
  assert.equal(evaluateDuplication(input, 'styles')[0].passed, false);
});

test('accepts removing nonduplicated lines without raising the baseline', () => {
  const input = report('styles');
  input.statistics.formats.scss.lines--;
  assert.ok(evaluateDuplication(input, 'styles')[0].passed);
});

test('rejects more duplicated lines even if the source grows', () => {
  const input = report('styles');
  input.statistics.formats.scss.lines *= 2;
  input.statistics.formats.scss.duplicatedLines++;
  assert.equal(evaluateDuplication(input, 'styles')[0].passed, false);
});

test('accepts improvements', () => {
  const input = report('styles');
  const style = input.statistics.formats.scss;
  style.duplicatedLines--;
  style.duplicatedTokens--;
  style.clones--;
  assert.ok(evaluateDuplication(input, 'styles')[0].passed);
});

test('rejects missing formats, empty scans and invalid counters', () => {
  const input = report('styles');
  assert.throws(() => evaluateDuplication({}, 'styles'), /inválido/);
  input.statistics.formats.scss.sources = 0;
  assert.throws(() => evaluateDuplication(input, 'styles'), /inválido/);
  input.statistics.formats.scss.sources = 1;
  input.statistics.formats.scss.duplicatedTokens = -1;
  assert.throws(() => evaluateDuplication(input, 'styles'), /inválido/);
  assert.throws(() => evaluateDuplication(input, 'unknown'), /desconhecido/);
});
