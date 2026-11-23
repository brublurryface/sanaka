const commitType =
  /^(?:feat|fix|refactor|test|perf|docs|style|ci|build|chore|revert)(?:\([a-z0-9][a-z0-9._/-]*\))?!?: \S/u;

/** Aceita mensagens convencionais e mensagens geradas pelo próprio Git. */
export function validCommitMessage(message) {
  const title = message.split(/\r?\n/u).find((line) => line.trim() && !line.startsWith('#')) ?? '';
  return commitType.test(title) || /^(?:Merge |Revert "|fixup! |squash! |amend! )\S/u.test(title);
}

/** O hook não pode validar outra revisão usando o checkout atual. */
export function validatePush(input, head, dirty) {
  const branches = input
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => line.split(' '))
    .filter(
      ([, localSha, remoteRef]) => remoteRef?.startsWith('refs/heads/') && !/^0+$/u.test(localSha),
    );

  if (branches.length === 0) return false;
  if (branches.some(([, localSha]) => localSha !== head)) {
    throw new Error('Faça checkout da revisão que será enviada antes de executar o push.');
  }
  if (dirty) {
    throw new Error('Finalize ou guarde as alterações locais antes de executar o push.');
  }
  return true;
}
