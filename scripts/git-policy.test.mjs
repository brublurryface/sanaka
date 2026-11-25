import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validCommitMessage, validatePush } from './git-policy.mjs';

test('aceita os tipos de commit do Sanaka e mensagens geradas pelo Git', () => {
  for (const message of [
    'test(coverage): preserve baseline',
    'ci: isolate validation',
    'feat(home)!: change contract',
    'Merge branch main',
    'Revert "fix: previous behavior"',
    'fixup! test: add regression',
  ]) {
    assert.equal(validCommitMessage(message), true, message);
  }
});

test('rejeita mensagens sem tipo ou descrição', () => {
  for (const message of ['', 'update files', 'feature: change', 'test:', 'test: ']) {
    assert.equal(validCommitMessage(message), false, message);
  }
});

test('valida apenas envios de branches e exige a revisão limpa correspondente', () => {
  const push = 'refs/heads/work abc refs/heads/work def\n';
  assert.equal(validatePush(push, 'abc', false), true);
  assert.throws(() => validatePush(push, 'different', false), /checkout/u);
  assert.throws(() => validatePush(push, 'abc', true), /alterações/u);
});

test('não impede exclusões de refs ou envio exclusivo de tags', () => {
  assert.equal(validatePush('(delete) 000 refs/heads/old abc\n', 'abc', true), false);
  assert.equal(validatePush('refs/tags/v1 abc refs/tags/v1 000\n', 'abc', true), false);
});

test('não aceita um push de várias revisões com a validação de apenas uma', () => {
  const push = 'refs/heads/a abc refs/heads/a 000\nrefs/heads/b def refs/heads/b 000\n';
  assert.throws(() => validatePush(push, 'abc', false), /checkout/u);
});
